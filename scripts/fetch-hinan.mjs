// 国土地理院「指定緊急避難場所・指定避難所データ」の全国CSVを取り、
//   data/hinan/counts.json（全市区町村の数・災害の種類ごとの数・市区町村の最終更新日）
//   data/hinan/list/<コード>.json（ページを作る市区町村の一覧。「開く」を押したときだけ読み込む）
//   data/hinan/meta.json（取得日・ファイルの ETag）
// を作る。ETag が前回と同じなら中身は作り直さず、確かめた日（checked）だけ書きかえる
// 数が前回から大きく変わったとき・少なすぎるときは、書きかえずに止める（見張り）
import { mkdirSync, writeFileSync, readFileSync, existsSync, appendFileSync, rmSync, readdirSync } from 'node:fs';
import { decodeText, parseCsv } from '../src/lib/csv.mjs';
import { HINAN_FILES, DISASTERS, countBasho, countHinanjo, readHistory, muniCode } from '../src/lib/hinan.mjs';
import { readMunis } from '../src/munis.mjs';
import { resolveCities } from '../src/areas.mjs';

const DIR = 'data/hinan';
const UA = 'machi-shakaika (+https://machi-shakaika.com/about/)';
const note = (level, msg) => {
  console.log(msg);
  if (process.env.GITHUB_ACTIONS) console.log(`::${level} title=避難場所データ::${msg}`);
};
const stop = (msg) => {
  note('error', msg);
  if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 避難場所データで止めた\n- ${msg}\n`);
  process.exit(1);
};
const today = new Intl.DateTimeFormat('sv-SE', { timeZone: 'Asia/Tokyo' }).format(new Date());

const prev = existsSync(`${DIR}/meta.json`) ? JSON.parse(readFileSync(`${DIR}/meta.json`, 'utf8')) : {};
const files = {};
let same = true;
for (const [k, url] of Object.entries(HINAN_FILES)) {
  const headers = { 'User-Agent': UA };
  const res = await fetch(url, { headers, signal: AbortSignal.timeout(180_000) });
  if (res.status !== 200) stop(`${k}：HTTP ${res.status}`);
  const etag = res.headers.get('etag');
  const buf = new Uint8Array(await res.arrayBuffer());
  files[k] = { etag, lastModified: res.headers.get('last-modified'), rows: parseCsv(decodeText(buf).text), bytes: buf.length };
  if (!etag || etag !== prev.files?.[k]?.etag) same = false;
  await new Promise((r) => setTimeout(r, 1000));
}

if (same && existsSync(`${DIR}/counts.json`) && process.env.FORCE !== '1') {
  writeFileSync(`${DIR}/meta.json`, JSON.stringify({ ...prev, checked: today }, null, 1) + '\n');
  note('notice', `ファイルの更新なし（確かめた日 ${today}）`);
  process.exit(0);
}

const basho = countBasho(files.basho.rows);
const hinanjo = countHinanjo(files.hinanjo.rows);
const hist = readHistory(files.history.rows);
const totalB = files.basho.rows.length - 1;
const totalH = files.hinanjo.rows.length - 1;
if (totalB < 90000 || totalH < 60000) stop(`件数が少なすぎる（指定緊急避難場所 ${totalB}・指定避難所 ${totalH}）`);
if (prev.total) {
  const ratio = (a, b) => Math.abs(a - b) / b;
  if (ratio(totalB, prev.total.basho) > 0.1 || ratio(totalH, prev.total.hinanjo) > 0.1) {
    stop(`件数が前回から1割より大きく変わった（指定緊急避難場所 ${prev.total.basho}→${totalB}・指定避難所 ${prev.total.hinanjo}→${totalH}）`);
  }
}

// 全市区町村の数：[指定緊急避難場所, 指定避難所, 最終更新日, 災害の種類ごとの数...]
mkdirSync(`${DIR}/list`, { recursive: true });
const codes = [...new Set([...basho.keys(), ...hinanjo.keys(), ...hist.keys()])].sort();
const lines = codes.map((c) => {
  const b = basho.get(c);
  const row = [b?.total ?? 0, hinanjo.get(c)?.total ?? 0, hist.get(c)?.updated ?? null, ...DISASTERS.map(([k]) => b?.kinds[k] ?? 0)];
  return `  ${JSON.stringify(c)}: ${JSON.stringify(row)}`;
});
writeFileSync(
  `${DIR}/counts.json`,
  `${JSON.stringify({ kinds: DISASTERS.map(([k, , n]) => [k, n]) }).slice(0, -1)},"areas":{\n${lines.join(',\n')}\n}}\n`,
);

// ページを作る市区町村の一覧（施設・場所名と、住所の市区町村より後ろ。災害の種類はビットで）
const munis = readMunis();
if (!munis) stop('data/estat/munis.json がない（先に fetch-estat を動かす）');
const { cities, errors } = resolveCities(munis.areas);
if (errors.length) stop(errors.join(' / '));
const want = new Map(cities.map((c) => [c.code, c]));
const lists = new Map();
const col = (rows, re) => (rows[0] ?? []).findIndex((h) => re.test(h));
const bh = files.basho.rows[0];
const bi = { id: col(files.basho.rows, /^共通ID$/), name: col(files.basho.rows, /施設・場所名/), addr: col(files.basho.rows, /^住所$/) };
const kindIdx = DISASTERS.map(([, re]) => bh.findIndex((h) => re.test(h)));
const hi = { id: col(files.hinanjo.rows, /^共通ID$/), name: col(files.hinanjo.rows, /施設・場所名/), addr: col(files.hinanjo.rows, /^住所$/) };
const shortAddr = (addr, city) => {
  const i = addr.indexOf(city.name);
  return i >= 0 ? addr.slice(i + city.name.length) : addr;
};
for (const r of files.basho.rows.slice(1)) {
  const c = want.get(muniCode(r[bi.id]));
  if (!c) continue;
  const mask = kindIdx.reduce((m, i, bit) => (String(r[i]).trim() === '1' ? m | (1 << bit) : m), 0);
  const l = lists.get(c.code) ?? { b: [], h: [] };
  l.b.push([r[bi.name], shortAddr(r[bi.addr], c), mask]);
  lists.set(c.code, l);
}
for (const r of files.hinanjo.rows.slice(1)) {
  const c = want.get(muniCode(r[hi.id]));
  if (!c) continue;
  const l = lists.get(c.code) ?? { b: [], h: [] };
  l.h.push([r[hi.name], shortAddr(r[hi.addr], c)]);
  lists.set(c.code, l);
}
for (const f of readdirSync(`${DIR}/list`)) rmSync(`${DIR}/list/${f}`);
for (const [code, l] of lists) writeFileSync(`${DIR}/list/${code}.json`, JSON.stringify(l) + '\n');

writeFileSync(
  `${DIR}/meta.json`,
  JSON.stringify(
    {
      fetched: today,
      checked: today,
      total: { basho: totalB, hinanjo: totalH },
      files: Object.fromEntries(Object.entries(files).map(([k, f]) => [k, { etag: f.etag, lastModified: f.lastModified, bytes: f.bytes }])),
    },
    null,
    1,
  ) + '\n',
);
note('notice', `指定緊急避難場所 ${totalB}・指定避難所 ${totalH}・${codes.length} 市区町村・一覧 ${lists.size} 市区町村`);
