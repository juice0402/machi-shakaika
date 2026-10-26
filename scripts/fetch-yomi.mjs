// 市区町村と都道府県の読みがなを、日本郵便の郵便番号データ（ken_all.zip）から作る → data/yomi.json
// 週1回のデータの更新（update.yml）で動く。ETag が前回と同じなら何もしない（読みは市町村の合併くらいでしか変わらない）
// 取れない・形が変わって読みが足りないときは、前の data/yomi.json のまま（さがすのは漢字でもできるので、更新は止めない）
import { writeFileSync, appendFileSync } from 'node:fs';
import { decodeText, parseCsv } from '../src/lib/csv.mjs';
import { readZipEntry } from '../src/lib/zip.mjs';
import { readMunis } from '../src/munis.mjs';
import { YOMI_URL, YOMI_PATH, buildYomi, readYomi } from '../src/yomi.mjs';

const UA = 'machi-shakaika (+https://machi-shakaika.com/about/)';
const note = (level, msg) => {
  console.log(msg);
  if (process.env.GITHUB_ACTIONS) console.log(`::${level} title=読みがな::${msg}`);
  if (level !== 'notice' && process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 読みがな\n- ${msg}\n`);
};
const keep = (msg) => {
  note('warning', `${msg}。読みがなは前のまま`);
  process.exit(0);
};

const prev = readYomi();
let res;
try {
  res = await fetch(YOMI_URL, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(120_000) });
} catch (e) {
  keep(`日本郵便につながらない（${e.message}）`);
}
if (res.status !== 200) keep(`日本郵便から HTTP ${res.status}`);
const etag = res.headers.get('etag') ?? res.headers.get('last-modified') ?? null;
if (prev && etag && prev.etag === etag) {
  await res.body?.cancel();
  note('notice', '郵便番号データは前回と同じ');
  process.exit(0);
}

let rows;
try {
  const zip = new Uint8Array(await res.arrayBuffer());
  rows = parseCsv(decodeText(readZipEntry(zip, /KEN_ALL\.CSV$/i)).text);
} catch (e) {
  keep(`郵便番号データが読めない（${e.message}）`);
}
const munis = readMunis();
if (!munis) keep('data/estat/munis.json がない');
const { prefs, munis: yomi, missing } = buildYomi(rows, munis.areas);
const total = Object.keys(yomi).length + missing.length;
// 見張り：都道府県が47そろわない・読みのない市区町村が2%をこえる → 形が変わったと考えて書きかえない
if (Object.keys(prefs).length !== 47) keep(`都道府県の読みが ${Object.keys(prefs).length} しかない`);
if (missing.length > total * 0.02) keep(`読みのない市区町村が ${missing.length} / ${total}`);
if (missing.length) note('notice', `読みのない市区町村（合併したばかりなど）：${missing.join('、')}`);

const sorted = (o) => Object.fromEntries(Object.entries(o).sort(([a], [b]) => a.localeCompare(b)));
writeFileSync(YOMI_PATH, JSON.stringify({ etag, prefs: sorted(prefs), munis: sorted(yomi) }, null, 1) + '\n');
console.log(`読みがな：都道府県 ${Object.keys(prefs).length}・市区町村 ${Object.keys(yomi).length}（${rows.length} 行から）`);
