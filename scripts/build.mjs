// まちの社会科のビルド：data/ と src/ から dist/ を作る（依存パッケージなし）
// 同じ入力からは同じ出力になるようにする（ビルドした時刻を入れない）。前回の本番と同じなら公開しないため
import { rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { SITE } from '../src/site.mjs';
import { readYaml, checkSources, checkItems, checkShogo } from '../src/data.mjs';
import { page, esc } from '../src/layout.mjs';
import { readMunis, checkMunis } from '../src/munis.mjs';
import { PREFS, resolveCities } from '../src/areas.mjs';
import { derive, muniList, prefOf } from '../src/stats.mjs';
import { calcConf } from '../src/calc.mjs';
import { topPage } from '../src/pages/top.mjs';
import { prefPage } from '../src/pages/pref.mjs';
import { cityPage } from '../src/pages/city.mjs';
import { sonaePages } from '../src/pages/sonae.mjs';
import { infoPages } from '../src/pages/info.mjs';
import { douguPages } from '../src/pages/dougu.mjs';
import { rankingPages } from '../src/pages/ranking.mjs';
import { hinmokuPages } from '../src/pages/hinmoku.mjs';
import { quizPages } from '../src/pages/quiz.mjs';
import { machiData } from '../src/quiz.mjs';
import { PRODUCTS_PATH } from '../src/rakuten.mjs';
import { ARTS } from '../src/art.mjs';

const DIST = 'dist';
const stop = (msg) => {
  console.error(msg);
  process.exit(1);
};

// データの形を先に確かめる（おかしければビルドを止める＝公開しない）
const sources = readYaml('sources.yml');
const items = readYaml('items.yml');
const shogo = readYaml('shogo.yml');
const errors = [...checkSources(sources), ...checkItems(items, sources), ...checkShogo(shogo, sources)];
const munis = readMunis();
if (!munis) errors.push('data/estat/munis.json がない');
else errors.push(...checkMunis(munis, shogo));
const { cities, errors: cityErr } = munis ? resolveCities(munis.areas) : { cities: [], errors: [] };
errors.push(...cityErr);
if (errors.length) stop(errors.map((e) => `データ：${e}`).join('\n'));
const estatMeta = JSON.parse(readFileSync('data/estat/meta.json', 'utf8'));
const hinan = JSON.parse(readFileSync('data/hinan/counts.json', 'utf8'));
const hinanMeta = JSON.parse(readFileSync('data/hinan/meta.json', 'utf8'));
// 楽天の商品（Actions がビルドの前に取る。コミットしない）。キーのある Actions では無ければ止める
const products = existsSync(PRODUCTS_PATH) ? JSON.parse(readFileSync(PRODUCTS_PATH, 'utf8')) : null;
if (!products && process.env.REQUIRE_RAKUTEN === '1') stop('楽天の商品（data/rakuten/products.json）がありません');

rmSync(DIST, { recursive: true, force: true });
const pages = [];
const out = (path, text) => {
  const file = `${DIST}${path.endsWith('/') ? `${path}index.html` : path}`;
  mkdirSync(dirname(file), { recursive: true });
  writeFileSync(file, text);
};
const add = (p) => {
  pages.push(p);
  out(p.path ?? '/404.html', page(p));
};

const cc = calcConf(items);
const list = muniList(munis.areas);
const z = derive(munis.areas['00000']);
const cityUrl = new Map(cities.map((c) => [c.code, `/${c.pref}/${c.slug}/`]));
const urlOf = (code) => cityUrl.get(code) ?? null;

add(topPage({ cc, munis, hinanMeta, nMunis: list.length }));
for (const pref of PREFS) add(prefPage({ pref, munis, list, z, cc, urlOf }));
for (const city of cities) add(cityPage({ city, munis, list, z, cc, hinan, hinanMeta, urlOf }));
for (const p of sonaePages({ cc, items, sources })) add(p);
for (const p of douguPages({ cc, items, sources })) add(p);
for (const p of rankingPages({ munis, list, urlOf })) add(p);
for (const p of hinmokuPages({ items, sources, products })) add(p);
const machi = machiData(munis.areas, urlOf);
for (const p of quizPages({ munis, items, sources, machi })) add(p);
for (const p of infoPages({ munis, estatMeta, hinanMeta })) add(p);
// デザインの見本（専用の絵・10/26）：しょーくんにくらべてもらうためだけ。このPRはマージしない
for (const v of Object.keys(ARTS)) {
  const t = topPage({ cc, munis, hinanMeta, nMunis: list.length, art: v });
  add({ ...t, path: `/mihon/${v}/`, title: `見本${v} ${ARTS[v]}`, head: '', noindex: true, noAds: true, art: v, topLike: true });
}
add({ path: '/mihon/', title: '専用の絵の見本', description: '専用の絵の見本（3案）。', noindex: true, noAds: true, body: `<h1 class="city">専用の絵の見本</h1><ul class="list">${Object.entries(ARTS).map(([v, n]) => `<li><a href="/mihon/${v}/">${v} ${n}</a></li>`).join('')}</ul>` });
add({ path: null, title: 'ページが見つかりません', description: 'ページが見つかりません。', noindex: true, noAds: true, body: '<h1 class="city">ページが見つかりません</h1><p><a href="/">トップへ</a></p>' });

// クイズの数字（どっちが多い・ドボンクイズを開いたときだけ読む）：都道府県47と全国の市区町村
writeFileSync(`${DIST}/quiz/machi.json`, JSON.stringify(machi));

// ファビコン（A 森と川。10/23 しょーくんが3案から選んだ）。static/ の中をそのまま置く
for (const f of readdirSync('static')) copyFileSync(`static/${f}`, `${DIST}/${f}`);

// 避難場所の一覧（市区町村ページで「開く」を押したときだけ読み込む）
mkdirSync(`${DIST}/hinan`, { recursive: true });
for (const c of cities) {
  const f = `data/hinan/list/${c.code}.json`;
  if (existsSync(f)) copyFileSync(f, `${DIST}/hinan/${c.code}.json`);
}

// 市区町村さがし（トップで入力したときだけ読み込む）：[名前, 都道府県, URL]
const search = [
  ...PREFS.map((p) => [p.name, '', `/${p.slug}/`]),
  ...[...list]
    .sort((a, b) => b.pop - a.pop)
    .map((a) => {
      const pref = prefOf(a.code);
      return [a.name, pref.name, urlOf(a.code) ?? `/${pref.slug}/#m${a.code}`];
    }),
];
writeFileSync(`${DIST}/search.json`, JSON.stringify(search));

// サイトマップ（公開してから）
const indexable = pages.filter((p) => p.path && !p.noindex);
if (SITE.launched) {
  writeFileSync(
    `${DIST}/sitemap.xml`,
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${indexable.map((p) => `<url><loc>${SITE.url}${esc(p.path)}</loc></url>`).join('\n')}\n</urlset>\n`,
  );
}
out('/robots.txt', SITE.launched ? `User-agent: *\nAllow: /\n\nSitemap: ${SITE.url}/sitemap.xml\n` : 'User-agent: *\nDisallow: /\n');
if (SITE.adsense) writeFileSync(`${DIST}/ads.txt`, `google.com, ${SITE.adsense.replace(/^ca-/, '')}, DIRECT, f08c47fec0942fa0\n`);

// pages.dev（本番の別名・プレビュー）は検索に出さない。公開までは全部出さない
out(
  '/_headers',
  [
    '/*',
    '  X-Content-Type-Options: nosniff',
    '  Referrer-Policy: strict-origin-when-cross-origin',
    ...(SITE.launched ? [] : ['  X-Robots-Tag: noindex']),
    '/hinan/*',
    '  Cache-Control: public, max-age=86400',
    '/quiz/machi.json',
    '  Cache-Control: public, max-age=86400',
    '/favicon.*',
    '  Cache-Control: public, max-age=604800',
    '/apple-touch-icon.png',
    '  Cache-Control: public, max-age=604800',
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
console.log(`ビルド：${pages.length} ページ・${files.length} ファイル・指紋 ${hash.slice(0, 12)}`);
