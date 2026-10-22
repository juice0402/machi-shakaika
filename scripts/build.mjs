// まちの社会科のビルド：data/ と src/ から dist/ を作る（依存パッケージなし）
// 同じ入力からは同じ出力になるようにする（ビルドした時刻を入れない）。前回の本番と同じなら公開しないため
import { rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { SITE } from '../src/site.mjs';
import { readYaml, checkSources, checkItems, checkShogo } from '../src/data.mjs';
import { page, esc } from '../src/layout.mjs';
import { mihonPages } from '../src/mihon.mjs';

const DIST = 'dist';

// データの形を先に確かめる（おかしければビルドを止める）
const sources = readYaml('sources.yml');
const items = readYaml('items.yml');
const shogo = readYaml('shogo.yml');
const errors = [...checkSources(sources), ...checkItems(items, sources), ...checkShogo(shogo, sources)];
if (errors.length) {
  for (const e of errors) console.error(`データ：${e}`);
  process.exit(1);
}

rmSync(DIST, { recursive: true, force: true });
const out = (path, text) => {
  const file = `${DIST}${path.endsWith('/') ? `${path}index.html` : path}`;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};

// トップ（第1弾までは準備中の1枚）
out(
  '/',
  page({
    path: '/',
    title: SITE.name,
    description: '市区町村の人口や世帯の数字と、家の備えの量。準備中です。',
    body: `<h1>${esc(SITE.name)}</h1>
<p>市区町村の数字と、家の備え。準備中です。</p>`,
  }),
);

out(
  '/404.html',
  page({
    path: null,
    title: 'ページが見つかりません',
    description: 'ページが見つかりません。',
    noindex: true,
    body: `<h1>ページが見つかりません</h1>
<p><a href="/">トップへ</a></p>`,
  }),
);

// デザイン3案の見本（決まったら消す）
for (const p of mihonPages(items)) out(p.path, p.html);

out(
  '/robots.txt',
  SITE.launched ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n',
);

// pages.dev（本番の別名・プレビュー）は検索に出さない。第1弾までは全部出さない
out(
  '/_headers',
  [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    ...(SITE.launched ? [] : ['  X-Robots-Tag: noindex']),
    `https://:project.pages.dev/*`,
    '  X-Robots-Tag: noindex',
    `https://:version.:project.pages.dev/*`,
    '  X-Robots-Tag: noindex',
    '',
  ].join('\n'),
);

// 指紋（前回の本番とくらべて、変わっていなければ公開しない。scripts/changed.mjs）
const walk = (d) => readdirSync(d).flatMap((x) => (statSync(`${d}/${x}`).isDirectory() ? walk(`${d}/${x}`) : [`${d}/${x}`]));
const files = walk(DIST).map((f) => f.slice(DIST.length)).sort();
const h = createHash('sha256');
for (const f of files) h.update(`${f}\0`).update(readFileSync(`${DIST}${f}`)).update('\0');
const hash = h.digest('hex');
writeFileSync(`${DIST}/fingerprint.json`, JSON.stringify({ hash, files: files.length }) + '\n');
console.log(`ビルド：${files.length} ファイル・指紋 ${hash.slice(0, 12)}`);
