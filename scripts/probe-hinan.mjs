// 国土地理院の「指定緊急避難場所・指定避難所データ」を GitHub Actions で自動で取れるかの確認（2回目）
// （データの土台づくりの最初だけ使う。PRのときに .github/workflows/probe.yml が動かす）
// 1回目でわかったこと：www.gsi.go.jp は Actions からつながらない。hinanmap.gsi.go.jp と地理院タイルはつながる。
//   同意のあとのページ koukaidate.html が、defaultFtpData/publicHistoryCSV/ の一覧CSVからダウンロードの表をスクリプトで作っている
// 2回目：koukaidate.html のスクリプトから、ファイルのURLの作り方を読む → 堺市・全国・大阪府のファイルを取ってみる
// 出力：probe-out/hinan.json・probe-out/hinan.md。取ったファイルは probe-out/hinan-files/（ランナーの中だけ）
import { mkdirSync, writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { decodeText, parseCsv } from '../src/lib/csv.mjs';

const OUT = 'probe-out';
const FILES = `${OUT}/hinan-files`;
mkdirSync(FILES, { recursive: true });
const UA = 'machi-shakaika-data-check (+https://github.com/juice0402/machi-shakaika)';
const BASE = 'https://hinanmap.gsi.go.jp/hinanjocp/hinanbasho/koukaidate.html';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const esc = (s) => String(s).replaceAll('|', '｜').replaceAll('\n', ' ').replaceAll('`', "'");
const report = { contexts: [], lists: [], tries: [] };

async function get(url, max = 60_000_000) {
  await sleep(600);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(120_000) });
    const buf = new Uint8Array(await res.arrayBuffer());
    const h = (k) => res.headers.get(k);
    return { url, status: res.status, type: h('content-type'), length: buf.length, lastModified: h('last-modified'), etag: h('etag'), buf: buf.subarray(0, max) };
  } catch (e) {
    return { url, status: 0, error: e?.name === 'TimeoutError' ? 'タイムアウト' : String(e?.cause?.code ?? e?.message ?? e) };
  }
}
const abs = (p, base) => {
  try {
    return new URL(p, base).href;
  } catch {
    return null;
  }
};

// 1. koukaidate.html とスクリプト
const page = await get(BASE);
report.page = { status: page.status, lastModified: page.lastModified };
const texts = [];
if (page.status === 200) {
  const html = decodeText(page.buf).text;
  texts.push({ from: 'koukaidate.html', text: html });
  const srcs = [...html.matchAll(/<script\b[^>]*src\s*=\s*["']([^"']+)["']/gi)].map((m) => abs(m[1], BASE)).filter(Boolean);
  report.scripts = srcs;
  for (const s of srcs.filter((u) => new URL(u).host === 'hinanmap.gsi.go.jp' && !/jquery|tablesorter/i.test(u)).slice(0, 10)) {
    const r = await get(s, 3_000_000);
    if (r.status === 200) texts.push({ from: s, text: decodeText(r.buf).text });
    else report.scripts.push(`${s} → HTTP ${r.status}`);
  }
}
const literals = new Set();
for (const { from, text } of texts) {
  for (const m of text.matchAll(/defaultFtpData|mergeFrom|\.csv|\.zip|geojson|download|Ftp/gi)) {
    const a = Math.max(0, m.index - 260);
    const ctx = text.slice(a, m.index + 260).replace(/\s+/g, ' ');
    if (!report.contexts.some((c) => c.ctx.includes(ctx.slice(200, 320)))) report.contexts.push({ from, ctx });
  }
  for (const m of text.matchAll(/["'`]([^"'`\s<>]*(?:defaultFtpData|mergeFrom)[^"'`\s<>]*)["'`]/gi)) literals.add(m[1]);
}
report.literals = [...literals];

// 2. 一覧のCSV
for (const name of ['publicHistoryListData', 'prefectureListData', 'countrySetData']) {
  const r = await get(`https://hinanmap.gsi.go.jp/hinanjocp/defaultFtpData/publicHistoryCSV/${name}.csv`, 5_000_000);
  const L = { name, status: r.status, length: r.length, lastModified: r.lastModified };
  if (r.status === 200) {
    const { text, encoding } = decodeText(r.buf);
    const rows = parseCsv(text);
    L.encoding = encoding;
    L.rows = rows.length;
    L.head = rows.slice(0, 6);
    L.cols = Array.from({ length: Math.max(...rows.map((x) => x.length)) }, (_, i) => {
      const v = rows.map((x) => x[i] ?? '').filter((x) => x !== '');
      const s = [...v].sort();
      return { i, filled: v.length, min: s[0], max: s.at(-1), sample: [...new Set(v)].slice(0, 4) };
    });
    L.sakai = rows.filter((x) => x.some((v) => /堺市/.test(v)));
    L.osaka = rows.filter((x) => /^27/.test(x[0] ?? '')).length;
    writeFileSync(`${FILES}/${name}.csv`, r.buf);
  }
  report.lists.push(L);
}

// 3. ファイルのURLを試す：スクリプトの中の文字そのまま＋よくある形（堺市 27140・大阪府 27000・全国）
const tries = new Set();
for (const l of literals) {
  const u = abs(l, BASE);
  if (u && /\.(csv|zip|geojson)$/i.test(u)) tries.add(u);
}
const F = 'https://hinanmap.gsi.go.jp/hinanjocp/defaultFtpData';
for (const kind of ['mergeFromCity', 'mergeFromCity_1', 'mergeFromCity_2']) {
  for (const p of [`${F}/csv/${kind}.csv`, `${F}/csv/27140/${kind}.csv`, `${F}/csv/27/27140/${kind}.csv`, `${F}/csv/27140_${kind}.csv`]) tries.add(p);
}
for (const p of [`${F}/csv/27140.csv`, `${F}/csv/27000.csv`, `${F}/csv/00000.csv`, `${F}/zip/all.zip`, `${F}/csv/all.csv`]) tries.add(p);
for (const url of [...tries].slice(0, 30)) {
  const r = await get(url, 40_000_000);
  const t = { url, status: r.status, type: r.type, length: r.length, lastModified: r.lastModified, error: r.error };
  if (r.status === 200 && r.length > 0 && !/text\/html/i.test(r.type ?? '')) {
    if (/\.zip$/i.test(url)) {
      const f = `${FILES}/t${report.tries.length}.zip`;
      writeFileSync(f, r.buf);
      try {
        t.inside = execFileSync('unzip', ['-l', f], { encoding: 'utf8' }).split('\n').slice(0, 30);
      } catch (e) {
        t.unzipError = String(e.message).slice(0, 200);
      }
    } else {
      const { text, encoding } = decodeText(r.buf);
      const rows = parseCsv(text);
      t.encoding = encoding;
      t.rows = rows.length;
      t.head = rows.slice(0, 3);
    }
  }
  report.tries.push(t);
}

writeFileSync(`${OUT}/hinan.json`, JSON.stringify(report, null, 1));

const md = ['## 国土地理院の避難場所データの確認（2回目）', ''];
md.push(`- koukaidate.html：HTTP ${report.page.status}${report.page.lastModified ? `・Last-Modified ${report.page.lastModified}` : ''}`);
md.push(`- スクリプト：${esc((report.scripts ?? []).join('、') || 'なし')}`);
md.push(`- スクリプトの中の defaultFtpData・mergeFrom の文字：${esc(report.literals.join('、') || 'なし')}`);
md.push('');
md.push('<details><summary>スクリプトの前後（URLの作り方）</summary>');
md.push('');
for (const c of report.contexts.slice(0, 40)) md.push(`- ${esc(c.from.split('/').pop())}：\`${esc(c.ctx)}\``);
md.push('');
md.push('</details>');
md.push('');
md.push('### 一覧のCSV');
for (const L of report.lists) {
  md.push(`- ${L.name}.csv：HTTP ${L.status}・${L.length} バイト・Last-Modified ${L.lastModified ?? 'なし'}${L.rows != null ? `・${L.encoding}・${L.rows} 行・大阪府 ${L.osaka} 行` : ''}`);
  for (const r of L.head ?? []) md.push(`  - 行：${esc(r.join('、'))}`);
  for (const c of L.cols ?? []) md.push(`  - ${c.i}列目：${c.filled} 行・${esc(c.min ?? '')} 〜 ${esc(c.max ?? '')}・例 ${esc(c.sample.join('、'))}`);
  for (const r of L.sakai ?? []) md.push(`  - 堺市：${esc(r.join('、'))}`);
}
md.push('');
md.push('### ファイルのURLを試した結果');
for (const t of report.tries) {
  md.push(`- ${t.url}：HTTP ${t.status}${t.type ? `・${t.type}` : ''}${t.length ? `・${t.length} バイト` : ''}${t.lastModified ? `・Last-Modified ${t.lastModified}` : ''}${t.error ? `・${esc(t.error)}` : ''}`);
  if (t.rows != null) {
    md.push(`  - ${t.encoding}・${t.rows} 行`);
    for (const r of t.head) md.push(`  - 行：${esc(cut(r.join('、'), 400))}`);
  }
  for (const x of t.inside ?? []) md.push(`  - ${esc(x)}`);
}
writeFileSync(`${OUT}/hinan.md`, md.join('\n') + '\n');
console.log(`スクリプト ${texts.length}・文字 ${literals.size}・試したURL ${report.tries.length}（取れた ${report.tries.filter((t) => t.status === 200).length}）`);
