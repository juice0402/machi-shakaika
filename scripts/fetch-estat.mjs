// e-Stat から data/estat.yml の表を取り、data/estat/munis.json（全国・都道府県・市区町村・政令市の区の数字）を作る
// 使っている表の更新日（getMetaInfo の UPDATED_DATE）だけを先に見て、どれも前回と同じなら何もしない（FORCE=1 で取り直す）
// 照らし合わせ（data/shogo.yml の公式の数字）に1つでも合わなければ、書きかえずに止める
// 呼び出しは src/lib/estat.mjs が1秒ずつあける。アプリケーションIDはログ・ファイルに出さない
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync } from 'node:fs';
import { estat, arr, classMap, readValues, text, callCount } from '../src/lib/estat.mjs';
import { readYaml } from '../src/data.mjs';
import { checkMunis, MUNIS_PATH, writeMunis } from '../src/munis.mjs';

const conf = readYaml('estat.yml');
const shogo = readYaml('shogo.yml');
const META_PATH = 'data/estat/meta.json';
const note = (level, msg) => {
  console.log(msg);
  if (process.env.GITHUB_ACTIONS) console.log(`::${level} title=e-Stat::${msg}`);
};

const prev = existsSync(META_PATH) ? JSON.parse(readFileSync(META_PATH, 'utf8')) : { tables: {} };
const metas = {};
for (const t of conf.tables) {
  const m = await estat('getMetaInfo', { statsDataId: t.id });
  const inf = m?.METADATA_INF?.TABLE_INF ?? {};
  metas[t.id] = { m, updated: text(inf.UPDATED_DATE), opened: text(inf.OPEN_DATE), survey: text(inf.SURVEY_DATE) };
}
const changed = conf.tables.filter((t) => prev.tables?.[t.id]?.updated !== metas[t.id].updated);
if (!changed.length && existsSync(MUNIS_PATH) && process.env.FORCE !== '1') {
  note('notice', `表の更新なし（${conf.tables.length}表・呼び出し ${callCount} 回）`);
  process.exit(0);
}
note('notice', `更新を取る：${(changed.length ? changed : conf.tables).map((t) => t.id).join(' ')}`);

// 今の市区町村の一覧
const areaClass = classMap(metas[conf.areasFrom].m?.METADATA_INF?.CLASS_INF).area;
const areas = {};
for (const [code, c] of areaClass.codes) areas[code] = { name: c.name, level: c.level, parent: c.parent };

for (const t of conf.tables) {
  const classes = classMap(metas[t.id].m?.METADATA_INF?.CLASS_INF);
  const ids = Object.keys(classes).filter((k) => k !== 'area');
  // take の名前 → コード。書いていない分類は先頭のコード
  const want = {};
  for (const [field, spec] of Object.entries(t.take)) {
    want[field] = {};
    for (const k of ids) {
      const codes = classes[k].codes;
      if (spec[k] != null) {
        const hit = [...codes.entries()].filter(([, v]) => v.name === spec[k]);
        if (hit.length !== 1) throw new Error(`${t.id} ${field}：${k}「${spec[k]}」が ${hit.length} 件`);
        want[field][k] = hit[0][0];
      } else want[field][k] = [...codes.keys()][0];
    }
    for (const k of Object.keys(spec)) if (!ids.includes(k)) throw new Error(`${t.id} ${field}：分類 ${k} がない`);
  }
  const params = { statsDataId: t.id, metaGetFlg: 'N', cntGetFlg: 'N', limit: 100000 };
  for (const k of ids) {
    const p = `cd${k[0].toUpperCase()}${k.slice(1)}`;
    params[p] = [...new Set(Object.values(want).map((w) => w[k]))].join(',');
  }
  let start = 1;
  let n = 0;
  for (let page = 0; page < 20; page++) {
    const d = await estat('getStatsData', { ...params, startPosition: start });
    for (const r of readValues(d)) {
      const a = areas[r.keys.area];
      if (!a) continue;
      for (const [field, w] of Object.entries(want)) {
        if (ids.every((k) => r.keys[k] === w[k])) {
          // 「-」は該当なし（0）。「…」「X」などは null
          a[field] = r.raw === '-' ? 0 : r.value;
          n++;
        }
      }
    }
    const next = d?.STATISTICAL_DATA?.RESULT_INF?.NEXT_KEY;
    if (!next) break;
    start = next;
  }
  note('notice', `${t.id} ${t.name}：${n} 値`);
}

const result = { survey: conf.survey, published: conf.published, statName: conf.statName, areas };
const errors = checkMunis(result, shogo);
if (errors.length) {
  for (const e of errors) note('error', e);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### e-Stat の照らし合わせで止めた\n${errors.map((e) => `- ${e}`).join('\n')}\n`);
  process.exit(1);
}
mkdirSync('data/estat', { recursive: true });
writeMunis(result);
const tables = {};
for (const t of conf.tables) tables[t.id] = { name: t.name, updated: metas[t.id].updated, opened: metas[t.id].opened };
writeFileSync(META_PATH, JSON.stringify({ tables }, null, 1) + '\n');
note('notice', `munis.json：${Object.keys(areas).length} 地域・呼び出し ${callCount} 回`);
