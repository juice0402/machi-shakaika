// e-Stat の確認（2回目。データの土台づくりの最初だけ使う。PRのときに .github/workflows/probe.yml が動かす）
// 1回目でわかったこと：令和7年国勢調査の表は1278。「－全国、都道府県、市区町村」の表は原数値と不詳補完値の2組ある。
//   0004050417 は速報集計（人口は速報値）なので使わない。「21大都市、特別区、人口50万以上の市」までの表は全市区町村にない
// 2回目・3回目：使う候補の表をIDで決めて（3回目は 1-1-3 の2020年の人口と5年の増減を足した）、原数値か不詳補完値か・地域の数・分類を見て、data/shogo.yml の公式の数字と照らし合わせる
// 出力：probe-out/estat.json・probe-out/estat.md。アプリケーションIDは出さない
import { mkdirSync, writeFileSync } from 'node:fs';
import { estat, arr, tableInfo, classMap, readValues, rowLabel } from '../src/lib/estat.mjs';
import * as E from '../src/lib/estat.mjs';
import { readYaml } from '../src/data.mjs';

const OUT = 'probe-out';
mkdirSync(OUT, { recursive: true });
const checks = readYaml('shogo.yml').checks;
const CHECK_AREAS = [...new Set(checks.map((c) => String(c.area)))];
const AREAS = ['00000', '27000', ...CHECK_AREAS];
const MAIN = CHECK_AREAS[0];

// 候補（表番号は e-Stat の表の番号。左が原数値、右が不詳補完値とみられる組）
const TABLES = [
  ['1-1-1 男女別人口', '0004065881', '0004066121'],
  ['1-1-3 2020年の人口（組替）・5年間の人口増減', '0004065882', '0004066141'],
  ['1-1-2 世帯の種類別世帯数及び世帯人員', '0004065901', '0004066122'],
  ['6-3-2 一般世帯人員及び一般世帯の1世帯当たり人員', '0004066088', '0004066344'],
  ['2-7-1 男女、年齢（5歳階級）別人口', '0004065920', '0004066183'],
  ['32-4 世帯の家族類型、65歳以上世帯員の有無別一般世帯数', '0004065985', '0004066237'],
  ['31-1 65歳以上世帯員の有無、世帯人員の人数別一般世帯数', '0004065983', '0004066235'],
  ['24-4 住宅の所有の関係、住宅の建て方別一般世帯数', '0004065940', '0004066210'],
];

const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const esc = (s) => String(s).replaceAll('|', '｜').replaceAll('\n', ' ');

// 年齢（5歳階級）を3つにまとめる（ほかの分類は先頭の「総数」などにそろえる）
const AGE = [
  ['0〜14歳', /^(0～4|5～9|10～14)歳$/],
  ['15〜64歳', /^(15～19|20～24|25～29|30～34|35～39|40～44|45～49|50～54|55～59|60～64)歳$/],
  ['65歳以上', /^(65～69|70～74|75～79|80～84|85～89|90～94|95～99|100歳以上)(歳)?$/],
];

const detail = [];
for (const [what, ...ids] of TABLES) {
  for (const id of ids) {
    const d = { what, id };
    try {
      const meta = await estat('getMetaInfo', { statsDataId: id });
      d.table = tableInfo(meta?.METADATA_INF?.TABLE_INF ?? {});
      const classes = classMap(meta?.METADATA_INF?.CLASS_INF);
      const area = classes.area?.codes ?? new Map();
      const byLevel = {};
      for (const [code, c] of area) (byLevel[c.level ?? '?'] ??= []).push(`${code}:${c.name}`);
      d.area = {
        count: area.size,
        levels: Object.fromEntries(Object.entries(byLevel).map(([k, v]) => [k, { n: v.length, sample: v.slice(0, 4).concat(v.filter((x) => /^2714/.test(x)).slice(0, 9)) }])),
        has: Object.fromEntries(AREAS.map((a) => [a, area.has(a)])),
      };
      d.classes = Object.values(classes)
        .filter((c) => c.id !== 'area')
        .map((c) => ({ id: c.id, name: c.name, codes: [...c.codes.entries()].map(([code, v]) => `${code}:${v.name}${v.unit ? `(${v.unit})` : ''}`) }));
      const data = await estat('getStatsData', { statsDataId: id, cdArea: AREAS.join(','), metaGetFlg: 'N', cntGetFlg: 'N', limit: 100000 });
      const rows = readValues(data).map((r) => ({ ...r, label: rowLabel(r, classes, ['area']) }));
      d.rowCount = rows.length;
      const first = Object.fromEntries(Object.values(classes).map((c) => [c.id, [...c.codes.keys()][0]]));
      const name = (k, code) => classes[k]?.codes.get(code)?.name ?? '';
      // 堺市の主な行：分類が先頭（総数など）の行と、ひとつだけ先頭でない行
      d.main = rows
        .filter((r) => r.keys.area === MAIN)
        .filter((r) => Object.entries(r.keys).filter(([k, c]) => k !== 'area' && k !== 'time' && k !== 'tab' && c !== first[k]).length <= 1)
        .slice(0, 60)
        .map((r) => ({ label: r.label, raw: r.raw, unit: r.unit }));
      // 年齢の3区分
      const ageKey = Object.values(classes).find((c) => /年齢/.test(c.name) && [...c.codes.values()].some((v) => /^5～9歳$/.test(v.name)))?.id;
      if (ageKey) {
        d.ageGroups = {};
        for (const a of CHECK_AREAS) {
          for (const [label, re] of AGE) {
            const vs = rows.filter(
              (r) =>
                r.keys.area === a &&
                re.test(name(ageKey, r.keys[ageKey])) &&
                Object.entries(r.keys).every(([k, c]) => k === 'area' || k === 'time' || k === ageKey || c === first[k]),
            );
            d.ageGroups[`${a} ${label}`] = { sum: vs.reduce((s, r) => s + (r.value ?? 0), 0), parts: vs.length };
          }
          const nd = rows.find(
            (r) => r.keys.area === a && /不詳/.test(name(ageKey, r.keys[ageKey])) && Object.entries(r.keys).every(([k, c]) => k === 'area' || k === 'time' || k === ageKey || c === first[k]),
          );
          d.ageGroups[`${a} 年齢「不詳」`] = { sum: nd?.value ?? null, parts: nd ? 1 : 0 };
        }
      }
      d.rows = rows.filter((r) => r.keys.area !== '00000' && r.keys.area !== '27000');
      d.national = rows.filter((r) => r.keys.area === '00000' && Object.entries(r.keys).every(([k, c]) => k === 'area' || k === 'time' || k === 'tab' || c === first[k])).map((r) => ({ label: r.label, raw: r.raw }));
      console.log(`${id} ${cut(d.table.statisticsName, 40)}：地域 ${area.size}・値 ${rows.length}`);
    } catch (e) {
      d.error = e.message;
      console.log(`${id}：${e.message}`);
    }
    detail.push(d);
  }
}

// 公式の数字と照らし合わせる
const shogo = checks.map((c) => {
  const found = [];
  for (const d of detail) {
    for (const r of d.rows ?? []) {
      if (r.keys.area !== String(c.area) || r.value == null) continue;
      const ok = c.digits ? !Number.isInteger(r.value) && Math.round(r.value * 10 ** c.digits) / 10 ** c.digits === c.value : r.value === c.value;
      if (ok) found.push(`${d.id} ${r.label}`);
    }
    for (const [k, g] of Object.entries(d.ageGroups ?? {})) if (k.startsWith(`${c.area} `) && g.sum === c.value) found.push(`${d.id} 年齢5歳階級の合計 ${k.split(' ')[1]}`);
  }
  return { ...c, found };
});

writeFileSync(`${OUT}/estat.json`, JSON.stringify({ detail: detail.map(({ rows, ...d }) => d), shogo }, null, 1));

const md = ['## e-Stat の確認（2回目・表をIDで指定）', ''];
md.push(`- APIの呼び出し ${E.callCount} 回`);
md.push('');
md.push('### 公式の数字との照らし合わせ');
md.push('');
md.push('| 市 | 何 | 公式 | 結果 | 見つかった表と行 |');
md.push('| --- | --- | --- | --- | --- |');
for (const s of shogo) {
  md.push(`| ${esc(s.name)} | ${esc(s.what)} | ${s.value} | ${s.found.length ? '一致' : '見つからない'} | ${esc(cut(s.found.slice(0, 3).join(' ／ '), 300))}${s.found.length > 3 ? `（ほか${s.found.length - 3}）` : ''} |`);
}
md.push('');
for (const d of detail) {
  md.push(`### ${d.id} ${esc(d.what)}`);
  if (d.error) {
    md.push(`- エラー：${esc(d.error)}`, '');
    continue;
  }
  const t = d.table;
  md.push(`- ${esc(t.statisticsName)}`);
  md.push(`- ${esc(t.no)} ${esc(cut(t.title, 200))}`);
  md.push(`- 値 ${t.total}・調査 ${t.surveyDate}・公開 ${t.openDate}・更新 ${t.updatedDate}・この取得で ${d.rowCount} 行`);
  md.push(`- 地域 ${d.area.count}：${Object.entries(d.area.levels).map(([k, v]) => `レベル${k} ${v.n}（${esc(v.sample.join('、'))}）`).join('／')}`);
  md.push(`- ${AREAS.map((a) => `${a}${d.area.has[a] ? 'あり' : 'なし'}`).join(' ')}`);
  for (const c of d.classes) md.push(`- ${c.id}「${esc(c.name)}」${c.codes.length}：${esc(cut(c.codes.join('、'), 900))}`);
  if (d.ageGroups) md.push(`- 年齢の3区分（5歳階級の合計）：${Object.entries(d.ageGroups).map(([k, g]) => `${k} ${g.sum}（${g.parts}）`).join('、')}`);
  md.push(`- 全国：${esc(cut(d.national.map((r) => `${r.label}=${r.raw}`).join('、'), 500))}`);
  md.push('');
  md.push(`<details><summary>${MAIN} の主な行（${d.main.length}）</summary>`);
  md.push('');
  for (const r of d.main) md.push(`- ${esc(cut(r.label, 120))}：${esc(r.raw)}${r.unit ? ` ${esc(r.unit)}` : ''}`);
  md.push('');
  md.push('</details>');
  md.push('');
}
writeFileSync(`${OUT}/estat.md`, md.join('\n') + '\n');
console.log(`照らし合わせ：${shogo.filter((s) => s.found.length).length}/${shogo.length} 一致`);
