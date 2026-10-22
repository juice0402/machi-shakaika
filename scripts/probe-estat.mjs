// e-Stat の確認（データの土台づくりの最初だけ使う。PRのときに .github/workflows/probe.yml が動かす）
// 令和7年国勢調査（政府統計コード 00200521）の統計表を一覧にし、テーマごとに市区町村の表を探して、
// 堺市・名古屋市などの値を data/shogo.yml の公式の数字と照らし合わせる。
// 出力：probe-out/estat.json（全部）・probe-out/estat.md（PRのコメント用）。アプリケーションIDは出さない
import { mkdirSync, writeFileSync } from 'node:fs';
import { estat, arr, tableInfo, classMap, readValues, rowLabel } from '../src/lib/estat.mjs';
import * as E from '../src/lib/estat.mjs';
import { readYaml } from '../src/data.mjs';

const OUT = 'probe-out';
mkdirSync(OUT, { recursive: true });
const checks = readYaml('shogo.yml').checks;
const CHECK_AREAS = [...new Set(checks.map((c) => String(c.area)))];
const AREAS = ['00000', ...CHECK_AREAS];
const MAX_PER_TOPIC = 3;

const TOPICS = [
  { key: 'jinko', label: '人口と5年の増減', re: /人口/, prefer: /増減/, rows: /人口|増減|面積|密度|総数/ },
  { key: 'setai', label: '世帯数・1世帯の平均人数', re: /世帯人員|1世帯当たり人員|世帯数/, prefer: /1世帯当たり人員/, rows: /世帯|人員|総数/ },
  { key: 'nenrei', label: '年齢（0〜14・15〜64・65歳以上）', re: /年齢/, prefer: /3区分|５歳階級|5歳階級/, rows: /総数|0～14|15～64|65歳以上|15歳未満|不詳/ },
  { key: 'tandoku', label: 'ひとり暮らし（単独世帯）', re: /家族類型|単独世帯/, prefer: /家族類型/, rows: /総数|単独/ },
  { key: 'korei', label: '65歳以上のいる世帯', re: /65歳以上/, prefer: /世帯/, rows: /総数|65歳以上|単独/ },
  { key: 'tatekata', label: '住宅の建て方', re: /建て方/, prefer: /一般世帯/, rows: /総数|一戸建|長屋|共同住宅|その他|住宅/ },
];

const log = (s) => console.log(s);
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const esc = (s) => String(s).replaceAll('|', '｜').replaceAll('\n', ' ');

// 1. 統計表の一覧
let list = await estat('getStatsList', { statsCode: '00200521', surveyYears: '2025', limit: 100000 });
let tables = arr(list?.DATALIST_INF?.TABLE_INF).map(tableInfo);
let how = '政府統計コード 00200521・調査年 2025';
if (tables.length === 0) {
  list = await estat('getStatsList', { searchWord: '令和7年国勢調査', limit: 100000 });
  tables = arr(list?.DATALIST_INF?.TABLE_INF).map(tableInfo).filter((t) => /国勢調査/.test(t.statName));
  how = 'ことば「令和7年国勢調査」';
}
log(`統計表：${tables.length}（${how}）`);
const muni = tables.filter((t) => /市区町村/.test(t.title) || t.collectArea === '市区町村');
log(`市区町村の表：${muni.length}`);

// 2. テーマごとに市区町村の表をえらぶ
const chosen = new Map();
const topicOut = [];
for (const tp of TOPICS) {
  const cands = muni
    .filter((t) => tp.re.test(t.title))
    .sort((a, b) => Number(tp.prefer.test(b.title)) - Number(tp.prefer.test(a.title)) || a.total - b.total);
  const others = tables.filter((t) => tp.re.test(t.title) && !muni.includes(t)).slice(0, 5);
  const pick = cands.slice(0, MAX_PER_TOPIC);
  for (const t of pick) chosen.set(t.id, t);
  topicOut.push({ ...tp, cands: cands.map((t) => t.id), pick: pick.map((t) => t.id), others: others.map((t) => t.id) });
}

// 3. えらんだ表のメタ情報と、照らし合わせる市の値
const detail = {};
for (const t of chosen.values()) {
  const d = { table: t };
  try {
    const meta = await estat('getMetaInfo', { statsDataId: t.id });
    const classes = classMap(meta?.METADATA_INF?.CLASS_INF);
    const area = classes.area?.codes ?? new Map();
    const levels = {};
    for (const c of area.values()) levels[c.level ?? '?'] = (levels[c.level ?? '?'] ?? 0) + 1;
    d.classes = Object.values(classes).map((c) => ({
      id: c.id,
      name: c.name,
      count: c.codes.size,
      sample: [...c.codes.entries()].slice(0, c.id === 'area' ? 6 : 40).map(([code, v]) => `${code}:${v.name}${v.unit ? `(${v.unit})` : ''}`),
    }));
    d.area = { count: area.size, levels, has: Object.fromEntries(AREAS.map((a) => [a, area.has(a)])) };
    const data = await estat('getStatsData', { statsDataId: t.id, cdArea: AREAS.join(','), metaGetFlg: 'N', cntGetFlg: 'N', limit: 50000 });
    const rows = readValues(data);
    d.rows = rows.map((r) => ({ ...r, label: rowLabel(r, classes) }));
    d.firstCodes = Object.fromEntries(Object.values(classes).map((c) => [c.id, [...c.codes.keys()][0]]));
    d.names = Object.fromEntries(
      Object.values(classes)
        .filter((c) => c.id !== 'area')
        .map((c) => [c.id, Object.fromEntries([...c.codes.entries()].map(([code, v]) => [code, v.name]))]),
    );
    log(`${t.id} ${cut(t.title, 60)}：地域 ${area.size}・値 ${rows.length}`);
  } catch (e) {
    d.error = e.message;
    log(`${t.id}：${e.message}`);
  }
  detail[t.id] = d;
}

// 4. 公式の数字と照らし合わせる（同じ値の行を、えらんだ表の中からさがす）
const shogo = checks.map((c) => {
  const found = [];
  for (const d of Object.values(detail)) {
    for (const r of d.rows ?? []) {
      if (r.keys.area !== String(c.area) || r.value == null) continue;
      const ok = c.digits ? Math.round(r.value * 10 ** c.digits) / 10 ** c.digits === c.value && !Number.isInteger(r.value) : r.value === c.value;
      if (ok) found.push({ table: d.table.id, label: r.label, raw: r.raw });
    }
  }
  return { ...c, found };
});

writeFileSync(`${OUT}/estat.json`, JSON.stringify({ how, tables, muni: muni.map((t) => t.id), topics: topicOut, detail, shogo }, null, 1));

// 5. PRのコメント用
const md = [];
md.push('## e-Stat の確認（令和7年国勢調査）');
md.push('');
md.push(`- 統計表 ${tables.length}（${how}）のうち、市区町村の表 ${muni.length}。APIの呼び出し ${E.callCount} 回`);
const opens = [...new Set(tables.map((t) => t.openDate))].sort();
md.push(`- 公開日：${opens.slice(0, 3).join('、')}${opens.length > 3 ? ` ほか（最新 ${opens.at(-1)}）` : ''}`);
md.push('');
md.push('### 公式の数字との照らし合わせ');
md.push('');
md.push('| 市 | 何 | 公式 | e-Stat | 見つかった表と行 |');
md.push('| --- | --- | --- | --- | --- |');
for (const s of shogo) {
  const f = s.found[0];
  md.push(
    `| ${esc(s.name)} | ${esc(s.what)} | ${s.value} | ${s.found.length ? '一致' : '見つからない'} | ${f ? `${f.table} ${esc(cut(f.label, 70))}${s.found.length > 1 ? `（ほか${s.found.length - 1}）` : ''}` : ''} |`,
  );
}
md.push('');
for (const tp of topicOut) {
  md.push(`### ${tp.label}`);
  md.push('');
  if (!tp.pick.length) {
    md.push('- 市区町村の表は見つからなかった');
    for (const id of tp.others) {
      const t = tables.find((x) => x.id === id);
      md.push(`- 市区町村でない表：${id} ${esc(cut(t.title, 90))}（${t.collectArea || '-'}）`);
    }
    md.push('');
    continue;
  }
  md.push(`- 市区町村の表の候補 ${tp.cands.length}：${tp.cands.slice(0, 10).join('、')}${tp.cands.length > 10 ? ' ほか' : ''}`);
  for (const id of tp.pick) {
    const d = detail[id];
    const t = d.table;
    md.push('');
    md.push(`**${t.id}** ${esc(t.no)} ${esc(t.title)}`);
    md.push(`- ${esc(t.statisticsName)}${t.tabulation ? `（${esc(t.tabulation)}）` : ''}・値 ${t.total}・公開 ${t.openDate}・更新 ${t.updatedDate}`);
    if (d.error) {
      md.push(`- エラー：${esc(d.error)}`);
      continue;
    }
    md.push(`- 地域 ${d.area.count}（レベル別 ${Object.entries(d.area.levels).map(([k, v]) => `${k}:${v}`).join(' ')}）・${AREAS.map((a) => `${a}${d.area.has[a] ? 'あり' : 'なし'}`).join(' ')}`);
    for (const c of d.classes.filter((c) => c.id !== 'area')) {
      md.push(`- ${c.id}「${esc(c.name)}」${c.count}：${esc(cut(c.sample.join('、'), 600))}`);
    }
    const area = CHECK_AREAS[0];
    const keep = d.rows.filter(
      (r) =>
        r.keys.area === area &&
        Object.entries(r.keys).every(([k, code]) => k === 'area' || k === 'time' || code === d.firstCodes[k] || tp.rows.test(d.names[k]?.[code] ?? '')),
    );
    md.push('');
    md.push('<details><summary>' + `${area} の値（${keep.length}行のうち先頭30）` + '</summary>');
    md.push('');
    for (const r of keep.slice(0, 30)) md.push(`- ${esc(cut(r.label, 110))}：${esc(r.raw)}${r.unit ? ` ${esc(r.unit)}` : ''}`);
    md.push('');
    md.push('</details>');
  }
  md.push('');
}
md.push('<details><summary>市区町村の表の一覧</summary>');
md.push('');
for (const t of muni) md.push(`- ${t.id} ${esc(t.no)} ${esc(cut(t.title, 110))}（${t.total}）`);
md.push('');
md.push('</details>');
writeFileSync(`${OUT}/estat.md`, md.join('\n') + '\n');
log(`照らし合わせ：${shogo.filter((s) => s.found.length).length}/${shogo.length} 一致`);
