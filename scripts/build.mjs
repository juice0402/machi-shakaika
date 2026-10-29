// まちの社会科のビルド：data/ と src/ から dist/ を作る（依存パッケージなし）
// 同じ入力からは同じ出力になるようにする（ビルドした時刻を入れない）。前回の本番と同じなら公開しないため
import { rmSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, copyFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { dirname } from 'node:path';
import { SITE } from '../src/site.mjs';
import { readYaml, checkSources, checkItems, checkShogo, readBichiku, bichikuMap, checkBichiku } from '../src/data.mjs';
import { page, esc } from '../src/layout.mjs';
import { readMunis, checkMunis } from '../src/munis.mjs';
import { PREFS, resolveCities } from '../src/areas.mjs';
import { derive, muniList, prefOf, nationalRates } from '../src/stats.mjs';
import { calcConf } from '../src/calc.mjs';
import { topPage } from '../src/pages/top.mjs';
import { prefPage } from '../src/pages/pref.mjs';
import { cityPage } from '../src/pages/city.mjs';
import { sonaePages } from '../src/pages/sonae.mjs';
import { fuyuTeidenPages } from '../src/pages/sonae-fuyu.mjs';
import { yomimonoPages } from '../src/pages/sonae-yomimono.mjs';
import { sotoPages } from '../src/pages/sonae-soto.mjs';
import { infoPages } from '../src/pages/info.mjs';
import { douguPages } from '../src/pages/dougu.mjs';
import { kigenPages } from '../src/pages/kigen.mjs';
import { printPages } from '../src/pages/print.mjs';
import { kartePages } from '../src/pages/karte.mjs';
import { rankingPages } from '../src/pages/ranking.mjs';
import { hinmokuPages } from '../src/pages/hinmoku.mjs';
import { quizPages } from '../src/pages/quiz.mjs';
import { machiData } from '../src/quiz.mjs';
import { kyouPage } from '../src/pages/kyou.mjs';
import { jstDate } from '../src/kyou.mjs';
import { PRODUCTS_PATH } from '../src/rakuten.mjs';
import { TOWN_SVG } from '../src/art.mjs';
import { SAIGAI } from '../src/mode.mjs';
import { readYomi } from '../src/yomi.mjs';
import { kazuData } from '../src/machi-tools.mjs';
import { toolPages, cardScript } from '../src/pages/kurabe.mjs';

const DIST = 'dist';
const stop = (msg) => {
  console.error(msg);
  process.exit(1);
};

// データの形を先に確かめる（おかしければビルドを止める＝公開しない）
const sources = readYaml('sources.yml');
const items = readYaml('items.yml');
const shogo = readYaml('shogo.yml');
const bichiku = readBichiku();
const errors = [...checkSources(sources), ...checkItems(items, sources), ...checkShogo(shogo, sources), ...checkBichiku(bichiku)];
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
// 災害時モード（data/mode.yml）のあいだは商品を出さない（取ってもいない）
const products = !SAIGAI && existsSync(PRODUCTS_PATH) ? JSON.parse(readFileSync(PRODUCTS_PATH, 'utf8')) : null;
if (!products && !SAIGAI && process.env.REQUIRE_RAKUTEN === '1') stop('楽天の商品（data/rakuten/products.json）がありません');
if (SAIGAI) console.log('災害時モード：オン（案内の帯を出し、楽天の商品と AdSense を外す）');

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
// 似てる街さがし・2つの街をくらべる の数字（/kurabe/kazu.json。市区町村ページの似ている街もこれから作る）
const kazu = kazuData(munis.areas, urlOf);

add(topPage({ cc, munis, hinanMeta, nMunis: list.length }));
for (const pref of PREFS) add(prefPage({ pref, munis, list, z, cc, urlOf }));
const bichikuOf = bichikuMap(bichiku);
for (const city of cities) add(cityPage({ city, munis, list, z, cc, hinan, hinanMeta, urlOf, kazu, bichiku: bichikuOf.get(`${city.pref}/${city.slug}`) ?? null }));
for (const p of sonaePages({ cc, items, sources })) add(p);
for (const p of fuyuTeidenPages({ cc, items, sources })) add(p);
for (const p of yomimonoPages({ cc, items, sources })) add(p);
for (const p of sotoPages({ cc, items, sources })) add(p);
for (const p of douguPages({ cc, items, sources })) add(p);
for (const p of kigenPages({ items })) add(p);
for (const p of printPages({ cc, items, sources })) add(p);
for (const p of kartePages({ cc, items, sources, munis, nat: nationalRates(list), z })) add(p);
for (const p of rankingPages({ munis, list, urlOf })) add(p);
for (const p of toolPages({ munis, kazu })) add(p);
for (const p of hinmokuPages({ items, sources, products })) add(p);
const machi = machiData(munis.areas, urlOf);
for (const p of quizPages({ munis, items, sources, machi })) add(p);
// 今日の1問：ビルドの日（日本時間）から14日分の問題をページに入れる（毎朝のビルドで入れかわる）
add(kyouPage({ munis, machi, start: jstDate(), urlOfRow: (r) => r[2] || `/${PREFS.find((p) => p.code === r[0].slice(0, 2)).slug}/#m${r[0]}` }));
for (const p of infoPages({ munis, estatMeta, hinanMeta })) add(p);
add({ path: null, title: 'ページが見つかりません', description: 'ページが見つかりません。', noindex: true, noAds: true, body: '<h1 class="city">ページが見つかりません</h1><p><a href="/">トップへ</a></p>' });

// クイズの数字（どっちが多い・ドボンクイズを開いたときだけ読む）：都道府県47と全国の市区町村
writeFileSync(`${DIST}/quiz/machi.json`, JSON.stringify(machi));
// 似てる街さがし・くらべるの数字（街をえらぶ欄にさわったときだけ読む）
writeFileSync(`${DIST}/kurabe/kazu.json`, JSON.stringify(kazu));
// 街くらべカードの部品と地方の絵（2つの街をえらんだときだけ読む。夜のメモ #28）
writeFileSync(`${DIST}/kurabe/card.js`, cardScript({ munis }).js);
mkdirSync(`${DIST}/kurabe/e`, { recursive: true });
for (const f of readdirSync('static/card')) copyFileSync(`static/card/${f}`, `${DIST}/kurabe/e/${f}`);

// ファビコン（A 森と川。10/23 しょーくんが3案から選んだ）。static/ の中をそのまま置く
for (const f of readdirSync('static')) if (statSync(`static/${f}`).isFile()) copyFileSync(`static/${f}`, `${DIST}/${f}`);
// いちばん下の街並み（全ページで同じ絵を遅れて読み込む。src/art.mjs で描く）
writeFileSync(`${DIST}/town.svg`, TOWN_SVG);

// 避難場所の一覧（市区町村ページで「開く」を押したときだけ読み込む）
mkdirSync(`${DIST}/hinan`, { recursive: true });
for (const c of cities) {
  const f = `data/hinan/list/${c.code}.json`;
  if (existsSync(f)) copyFileSync(f, `${DIST}/hinan/${c.code}.json`);
}

// 市区町村さがし（トップで入力したときだけ読み込む）：[名前, 都道府県, URL, 読みがな]
//   読みがなは data/yomi.json（日本郵便の郵便番号データから。src/yomi.mjs）。ないときは漢字だけでさがす
const yomi = readYomi();
const search = [
  ...PREFS.map((p) => [p.name, '', `/${p.slug}/`, yomi?.prefs?.[p.code] ?? '']),
  ...[...list]
    .sort((a, b) => b.pop - a.pop)
    .map((a) => {
      const pref = prefOf(a.code);
      return [a.name, pref.name, urlOf(a.code) ?? `/${pref.slug}/#m${a.code}`, yomi?.munis?.[a.code] ?? ''];
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
    '/kurabe/kazu.json',
    '  Cache-Control: public, max-age=86400',
    '/kurabe/card.js',
    '  Cache-Control: public, max-age=604800',
    '/kurabe/e/*',
    '  Cache-Control: public, max-age=86400',
    '/favicon.*',
    '  Cache-Control: public, max-age=604800',
    '/apple-touch-icon.png',
    '  Cache-Control: public, max-age=604800',
    '/og.jpg',
    '  Cache-Control: public, max-age=86400',
    '/og-ranking-jinko.jpg',
    '  Cache-Control: public, max-age=86400',
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
