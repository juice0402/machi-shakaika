// 国土地理院の「指定緊急避難場所・指定避難所データ」を GitHub Actions で自動で取れるかの確認
// （データの土台づくりの最初だけ使う。PRのときに .github/workflows/probe.yml が動かす）
// 1. 公式ページのリンクから、全国データ・公開更新情報CSVのURLをさがす
// 2. ダウンロードサイト（同意の画面）のHTMLとスクリプトから、データのURLの形をさがす
// 3. 見つかったファイルを取ってみて、大きさ・更新日・中身の列・市町村の数・堺市の件数を見る
// 4. 地理院タイル（skhb01〜08）も1枚ずつ見る（ファイルが取れないときの予備）
// 出力：probe-out/hinan.json・probe-out/hinan.md。取ったファイルは probe-out/hinan-files/（ランナーの中だけ）
import { mkdirSync, writeFileSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { decodeText, parseCsv } from '../src/lib/csv.mjs';

const OUT = 'probe-out';
const FILES = `${OUT}/hinan-files`;
mkdirSync(FILES, { recursive: true });
const UA = 'machi-shakaika-data-check (+https://github.com/juice0402/machi-shakaika)';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const cut = (s, n) => (s.length > n ? `${s.slice(0, n - 1)}…` : s);
const esc = (s) => String(s).replaceAll('|', '｜').replaceAll('\n', ' ');
const report = { links: [], site: {}, files: [], tiles: [], robots: {} };

async function get(url, max = 30_000_000) {
  await sleep(700);
  try {
    const res = await fetch(url, { headers: { 'User-Agent': UA }, redirect: 'follow', signal: AbortSignal.timeout(120_000) });
    const h = (k) => res.headers.get(k);
    const buf = new Uint8Array(await res.arrayBuffer());
    return {
      url,
      finalUrl: res.url,
      status: res.status,
      type: h('content-type'),
      length: buf.length,
      lastModified: h('last-modified'),
      etag: h('etag'),
      buf: buf.length > max ? buf.subarray(0, max) : buf,
    };
  } catch (e) {
    return { url, status: 0, error: e?.name === 'TimeoutError' ? 'タイムアウト' : String(e?.cause?.code ?? e?.message ?? e) };
  }
}

const abs = (href, base) => {
  try {
    return new URL(href, base).href;
  } catch {
    return null;
  }
};
const stripTags = (s) => s.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();

function links(html, base) {
  const out = [];
  for (const m of html.matchAll(/<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const u = abs(m[1], base);
    if (u) out.push({ url: u, text: stripTags(m[2]) });
  }
  return out;
}

// 1. 公式ページ
const PAGE = 'https://www.gsi.go.jp/bousaichiri/hinanbasho.html';
const page = await get(PAGE);
report.page = { status: page.status, lastModified: page.lastModified };
if (page.status === 200) {
  const html = decodeText(page.buf).text;
  const all = links(html, PAGE);
  report.links = all.filter(
    (l) => /\.(csv|zip|geojson|json|xlsx?)(\?|$)/i.test(l.url) || /hinanmap|skhb/i.test(l.url) || /CSV|ダウンロード|更新|全国|GeoJSON|データ/i.test(l.text),
  );
  const near = html.match(/[^<>]{0,80}(更新リスト|公開・更新情報|最終更新日)[^<>]{0,120}/g) ?? [];
  report.pageNotes = [...new Set(near.map((s) => s.replace(/\s+/g, ' ').trim()))].slice(0, 10);
}

// 2. ダウンロードサイト（同意の画面）
const SITE = 'https://hinanmap.gsi.go.jp/index.html';
const site = await get(SITE);
report.site.status = site.status;
const found = new Set();
if (site.status === 200) {
  const html = decodeText(site.buf).text;
  const scripts = [...html.matchAll(/<script\b[^>]*src\s*=\s*["']([^"']+)["']/gi)].map((m) => abs(m[1], SITE)).filter(Boolean);
  report.site.scripts = scripts;
  report.site.links = links(html, SITE).slice(0, 40);
  report.site.forms = [...html.matchAll(/<form\b[^>]*>/gi)].map((m) => m[0]).slice(0, 5);
  report.site.onclick = [...html.matchAll(/on(?:click|submit)\s*=\s*["']([^"']+)["']/gi)].map((m) => m[1]).slice(0, 10);
  const texts = [html];
  for (const s of scripts.filter((u) => new URL(u).host.endsWith('gsi.go.jp')).slice(0, 12)) {
    const r = await get(s, 3_000_000);
    report.site[`script ${s}`] = r.status;
    if (r.status === 200) texts.push(decodeText(r.buf).text);
  }
  report.site.inlinePaths = [];
  const nav = new Set();
  for (const t of texts) {
    for (const m of t.matchAll(/["'`]([^"'`\s<>]{2,200}?\.(?:csv|zip|geojson|json|html?))(?:\?[^"'`\s]*)?["'`]/gi)) {
      report.site.inlinePaths.push(m[1]);
      const u = abs(m[1], SITE);
      if (u && /\.(csv|zip|geojson)$/i.test(u)) found.add(u);
    }
    for (const m of t.matchAll(/(location\.href|window\.open|href)\s*[=(]\s*["'`]([^"'`]+)["'`]/gi)) {
      report.site.inlinePaths.push(`${m[1]} → ${m[2]}`);
      nav.add(m[2]);
    }
  }
  report.site.inlinePaths = [...new Set(report.site.inlinePaths)].slice(0, 80);
  // 同意のあとに開くページ（よくある名前）も見てみる
  const pages = [...nav, ...report.site.inlinePaths.filter((x) => !x.includes(' → '))];
  for (const p of [...new Set(pages)].filter((x) => /\.html?$/i.test(x) && !/index\.html?$/i.test(x)).slice(0, 4)) {
    const u = abs(p, SITE);
    const r = await get(u, 3_000_000);
    report.site[`page ${u}`] = r.status;
    if (r.status === 200) {
      const h = decodeText(r.buf).text;
      for (const l of links(h, u)) if (/\.(csv|zip|geojson)(\?|$)/i.test(l.url)) found.add(l.url);
      for (const m of h.matchAll(/["'`]([^"'`\s<>]{2,200}?\.(?:csv|zip|geojson))["'`]/gi)) {
        const x = abs(m[1], u);
        if (x) found.add(x);
      }
    }
  }
}
for (const l of report.links) if (/\.(csv|zip|geojson)(\?|$)/i.test(l.url)) found.add(l.url);

// 3. 見つかったファイルを取ってみる（多すぎるときは、全国・更新の名前のものを先に）
const order = [...found].sort((a, b) => Number(/全国|all|zenkoku|update|koushin|list/i.test(b)) - Number(/全国|all|zenkoku|update|koushin|list/i.test(a)));
let n = 0;
for (const url of order.slice(0, 8)) {
  const r = await get(url);
  const f = { url, status: r.status, type: r.type, length: r.length, lastModified: r.lastModified, etag: r.etag, error: r.error };
  if (r.status === 200 && r.length > 0) {
    const name = `${FILES}/f${n++}${/\.zip$/i.test(url) ? '.zip' : /\.geojson$/i.test(url) ? '.geojson' : '.csv'}`;
    writeFileSync(name, r.buf);
    if (name.endsWith('.zip')) {
      const dir = `${name}-x`;
      mkdirSync(dir, { recursive: true });
      try {
        execFileSync('unzip', ['-qq', '-o', name, '-d', dir], { stdio: 'pipe' });
        const walk = (d) => readdirSync(d).flatMap((x) => (statSync(`${d}/${x}`).isDirectory() ? walk(`${d}/${x}`) : [`${d}/${x}`]));
        f.inside = walk(dir).map((p) => ({ path: p.slice(dir.length + 1), size: statSync(p).size, ...(/\.csv$/i.test(p) ? csvSummary(readFileSync(p)) : {}) }));
      } catch (e) {
        f.unzipError = String(e.message).slice(0, 200);
      }
    } else if (name.endsWith('.csv')) Object.assign(f, csvSummary(r.buf));
    else if (name.endsWith('.geojson')) {
      try {
        const g = JSON.parse(decodeText(r.buf).text);
        f.features = g.features?.length;
        f.props = Object.keys(g.features?.[0]?.properties ?? {});
        f.sample = g.features?.[0]?.properties;
      } catch {
        f.parseError = true;
      }
    }
  }
  report.files.push(f);
}

function csvSummary(buf) {
  const { text, encoding } = decodeText(buf);
  const rows = parseCsv(text);
  const head = rows[0] ?? [];
  const body = rows.slice(1);
  const codeCol = head.findIndex((h) => /市町村コード|市区町村コード|団体コード|自治体コード/.test(h));
  const cityCol = head.findIndex((h) => /^市町村名$|市区町村名|自治体名/.test(h));
  const dateCols = head.map((h, i) => [h, i]).filter(([h]) => /日/.test(h));
  const codes = codeCol >= 0 ? new Set(body.map((r) => r[codeCol])) : null;
  const sakai = body.filter((r) => r.some((v) => /堺市/.test(v)) || (codeCol >= 0 && /^2714/.test(r[codeCol] ?? ''))).length;
  return {
    encoding,
    columns: head,
    rows: body.length,
    sample: body.slice(0, 2),
    municipalities: codes?.size ?? null,
    sakaiRows: sakai,
    dates: dateCols.map(([h, i]) => {
      const vals = body.map((r) => r[i]).filter(Boolean).sort();
      return { column: h, min: vals[0], max: vals.at(-1) };
    }),
    cityColumn: cityCol >= 0 ? head[cityCol] : null,
  };
}

// 4. 地理院タイル（堺市のあたり、ズーム10）
const [z, x, y] = [10, 897, 407];
for (let i = 1; i <= 8; i++) {
  const id = `skhb0${i}`;
  const r = await get(`https://cyberjapandata.gsi.go.jp/xyz/${id}/${z}/${x}/${y}.geojson`, 5_000_000);
  const t = { id, status: r.status, lastModified: r.lastModified };
  if (r.status === 200) {
    try {
      const g = JSON.parse(decodeText(r.buf).text);
      t.features = g.features?.length ?? 0;
      t.props = Object.keys(g.features?.[0]?.properties ?? {});
      t.sample = g.features?.[0]?.properties ?? null;
    } catch {
      t.parseError = true;
    }
  }
  report.tiles.push(t);
}

// robots.txt
for (const h of ['https://www.gsi.go.jp/robots.txt', 'https://hinanmap.gsi.go.jp/robots.txt', 'https://cyberjapandata.gsi.go.jp/robots.txt']) {
  const r = await get(h, 20_000);
  report.robots[h] = r.status === 200 ? cut(decodeText(r.buf).text.trim(), 400) : `HTTP ${r.status}${r.error ? ` ${r.error}` : ''}`;
}

writeFileSync(`${OUT}/hinan.json`, JSON.stringify(report, null, 1));

// PRのコメント用
const md = [];
md.push('## 国土地理院の避難場所データの確認');
md.push('');
md.push(`- 公式ページ：HTTP ${report.page.status}${report.page.lastModified ? `・Last-Modified ${report.page.lastModified}` : ''}`);
for (const l of report.links) md.push(`  - ${esc(cut(l.text || '(文字なし)', 50))} → ${l.url}`);
for (const s of report.pageNotes ?? []) md.push(`  - ページの文：${esc(cut(s, 160))}`);
md.push(`- ダウンロードサイト：HTTP ${report.site.status}`);
for (const [k, v] of Object.entries(report.site)) {
  if (k === 'status') continue;
  if (Array.isArray(v)) {
    if (!v.length) continue;
    md.push(`  - ${k}：`);
    for (const x of v.slice(0, 40)) md.push(`    - ${esc(cut(typeof x === 'string' ? x : `${x.text} → ${x.url}`, 160))}`);
  } else md.push(`  - ${esc(k)}：${esc(v)}`);
}
md.push('');
md.push('### ファイル');
if (!report.files.length) md.push('- データのファイルのURLは見つからなかった');
for (const f of report.files) {
  md.push(`- ${f.url}`);
  md.push(`  - HTTP ${f.status}・${f.type ?? '-'}・${f.length ?? 0} バイト・Last-Modified ${f.lastModified ?? 'なし'}・ETag ${f.etag ?? 'なし'}${f.error ? `・${esc(f.error)}` : ''}`);
  const one = (c, pad) => {
    md.push(`${pad}- ${c.encoding}・${c.rows} 行・市町村 ${c.municipalities ?? '?'}・堺市 ${c.sakaiRows} 行`);
    md.push(`${pad}- 列：${esc(c.columns.join('、'))}`);
    for (const d of c.dates) md.push(`${pad}- ${esc(d.column)}：${d.min} 〜 ${d.max}`);
    for (const s of c.sample) md.push(`${pad}- 例：${esc(cut(s.join('、'), 300))}`);
  };
  if (f.columns) one(f, '  ');
  for (const i of f.inside ?? []) {
    md.push(`  - 中身 ${esc(i.path)}（${i.size} バイト）`);
    if (i.columns) one(i, '    ');
  }
  if (f.unzipError) md.push(`  - 展開できない：${esc(f.unzipError)}`);
  if (f.features != null) md.push(`  - GeoJSON ${f.features} 件・項目 ${esc(f.props.join('、'))}`);
}
md.push('');
md.push(`### 地理院タイル（z${z}/${x}/${y}、堺市のあたり）`);
for (const t of report.tiles) {
  md.push(`- ${t.id}：HTTP ${t.status}${t.features != null ? `・${t.features} 件・項目 ${esc(t.props.join('、'))}` : ''}${t.lastModified ? `・Last-Modified ${t.lastModified}` : ''}`);
  if (t.sample) md.push(`  - 例：${esc(cut(JSON.stringify(t.sample), 300))}`);
}
md.push('');
md.push('<details><summary>robots.txt</summary>');
md.push('');
for (const [k, v] of Object.entries(report.robots)) md.push(`- ${k}：${esc(v)}`);
md.push('');
md.push('</details>');
writeFileSync(`${OUT}/hinan.md`, md.join('\n') + '\n');
console.log(`ファイル候補 ${found.size}・取ったもの ${report.files.filter((f) => f.status === 200).length}・タイル ${report.tiles.filter((t) => t.status === 200).length}/8`);
