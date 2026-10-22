// 国土地理院の「指定緊急避難場所・指定避難所データ」の確認（3回目）
// （データの土台づくりの最初だけ使う。PRのときに .github/workflows/probe.yml が動かす）
// 1・2回目でわかったこと：www.gsi.go.jp は Actions からつながらない。hinanmap.gsi.go.jp はつながり、
//   同意のページ（koukaidate.html）のスクリプトが使う全国CSVと公開・更新情報CSVを、そのまま取れる
// 3回目：全国CSVを取って src/lib/hinan.mjs で市区町村ごとに数え、堺市・名古屋市の数と、一覧との食いちがいを見る
// 出力：probe-out/hinan.json・probe-out/hinan.md
import { mkdirSync, writeFileSync } from 'node:fs';
import { decodeText, parseCsv } from '../src/lib/csv.mjs';
import { HINAN_FILES, DISASTERS, countBasho, countHinanjo, readHistory } from '../src/lib/hinan.mjs';
import { readYaml } from '../src/data.mjs';

const OUT = 'probe-out';
mkdirSync(OUT, { recursive: true });
const UA = 'machi-shakaika-data-check (+https://github.com/juice0402/machi-shakaika)';
const esc = (s) => String(s ?? '').replaceAll('|', '｜').replaceAll('\n', ' ');
const areas = [...new Set(readYaml('shogo.yml').checks.map((c) => String(c.area)))];

async function get(url) {
  const t0 = Date.now();
  const res = await fetch(url, { headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(180_000) });
  const buf = new Uint8Array(await res.arrayBuffer());
  await new Promise((r) => setTimeout(r, 1000));
  return { status: res.status, length: buf.length, ms: Date.now() - t0, lastModified: res.headers.get('last-modified'), etag: res.headers.get('etag'), type: res.headers.get('content-type'), buf };
}

const files = {};
for (const [k, url] of Object.entries(HINAN_FILES)) {
  const r = await get(url);
  const { text, encoding } = decodeText(r.buf);
  files[k] = { url, status: r.status, length: r.length, ms: r.ms, lastModified: r.lastModified, etag: r.etag, type: r.type, encoding, rows: r.status === 200 ? parseCsv(text) : [] };
  console.log(`${k}：HTTP ${r.status}・${r.length} バイト・${r.ms} ms`);
}

const basho = countBasho(files.basho.rows);
const hinanjo = countHinanjo(files.hinanjo.rows);
const hist = readHistory(files.history.rows);
const ids = (rows) => {
  const i = (rows[0] ?? []).indexOf('共通ID');
  const all = rows.slice(1).map((r) => r[i]);
  return { rows: all.length, dup: all.length - new Set(all).size };
};
const notInHist = [...new Set([...basho.keys(), ...hinanjo.keys()])].filter((c) => !hist.has(c));
const histWithDate = [...hist.entries()].filter(([, h]) => h.updated);
const histNoRows = histWithDate.filter(([c]) => !basho.has(c) && !hinanjo.has(c)).map(([c, h]) => `${c} ${h.name}`);
const notes = {};
for (const [, h] of hist) if (h.note) notes[h.note] = (notes[h.note] ?? 0) + 1;
const nameMismatch = [...basho.entries()].filter(([c, m]) => hist.has(c) && hist.get(c).name !== m.name).map(([c, m]) => `${c} ${m.name}／${hist.get(c).name}`);

const pick = (c) => ({
  code: c,
  name: hist.get(c)?.name ?? basho.get(c)?.name,
  history: hist.get(c) ?? null,
  basho: basho.get(c) ?? null,
  hinanjo: hinanjo.get(c)?.total ?? 0,
});
const sample = areas.map(pick);
const report = {
  files: Object.fromEntries(Object.entries(files).map(([k, f]) => [k, { ...f, rows: f.rows.length, head: f.rows[0] }])),
  bashoIds: ids(files.basho.rows),
  hinanjoIds: ids(files.hinanjo.rows),
  munis: { basho: basho.size, hinanjo: hinanjo.size, history: hist.size, historyWithDate: histWithDate.length },
  notInHist,
  histNoRows,
  notes,
  nameMismatch,
  sample,
};
writeFileSync(`${OUT}/hinan.json`, JSON.stringify(report, null, 1));

const md = ['## 国土地理院の避難場所データの確認（3回目・全国CSV）', ''];
md.push('| ファイル | HTTP | 大きさ | 時間 | 行 | Last-Modified | ETag |');
md.push('| --- | --- | --- | --- | --- | --- | --- |');
for (const [k, f] of Object.entries(report.files)) md.push(`| ${k} | ${f.status} | ${f.length} | ${f.ms} ms | ${f.rows} | ${esc(f.lastModified)} | ${esc(f.etag)} |`);
md.push('');
md.push(`- 指定緊急避難場所：${report.bashoIds.rows} か所（共通IDの重複 ${report.bashoIds.dup}）・${basho.size} 市区町村`);
md.push(`- 指定避難所：${report.hinanjoIds.rows} か所（共通IDの重複 ${report.hinanjoIds.dup}）・${hinanjo.size} 市区町村`);
md.push(`- 公開・更新情報：${hist.size} 市区町村（最終更新日あり ${histWithDate.length}）・特記 ${esc(Object.entries(notes).map(([k, v]) => `${k} ${v}`).join('、'))}`);
md.push(`- 共通IDのコードが一覧にない：${notInHist.length}${notInHist.length ? `（${esc(notInHist.slice(0, 20).join('、'))}）` : ''}`);
md.push(`- 一覧に日付があるのにCSVに1件もない：${histNoRows.length}${histNoRows.length ? `（${esc(histNoRows.slice(0, 20).join('、'))}）` : ''}`);
md.push(`- 名前の食いちがい：${nameMismatch.length}${nameMismatch.length ? `（${esc(nameMismatch.slice(0, 10).join('、'))}）` : ''}`);
md.push(`- 列（指定緊急避難場所）：${esc((report.files.basho.head ?? []).join('｜'))}`);
md.push(`- 列（指定避難所）：${esc((report.files.hinanjo.head ?? []).join('｜'))}`);
md.push('');
md.push('| 市 | 公開日 | 最終更新日 | 指定緊急避難場所 | うち ' + DISASTERS.map(([, , n]) => n).join('・') + ' | 指定避難所 |');
md.push('| --- | --- | --- | --- | --- | --- |');
for (const s of sample) {
  md.push(`| ${esc(s.name)} | ${esc(s.history?.opened)} | ${esc(s.history?.updated)} | ${s.basho?.total ?? 0} | ${s.basho ? DISASTERS.map(([k]) => s.basho.kinds[k]).join('・') : '-'} | ${s.hinanjo} |`);
}
writeFileSync(`${OUT}/hinan.md`, md.join('\n') + '\n');
