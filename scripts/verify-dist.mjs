// dist/ の全ページ点検（ビルドのあと・公開の前に毎回）
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { SITE, ESTAT_CREDIT } from '../src/site.mjs';
import { RAKUTEN_CREDIT } from '../src/layout.mjs';

const DIST = 'dist';
const walk = (d) => readdirSync(d).flatMap((x) => (statSync(`${d}/${x}`).isDirectory() ? walk(`${d}/${x}`) : [`${d}/${x}`]));
const files = walk(DIST);
const html = files.filter((f) => f.endsWith('.html'));
let bad = 0;
const fail = (f, msg) => {
  bad++;
  console.error(`NG ${f.slice(DIST.length)}：${msg}`);
};

// あおる言葉・AIによく出る言葉（site-principles.md）
const BANNED = ['今すぐ', '手遅れ', 'しましょう', 'ぜひ', '便利', '簡単', '安心', 'おすすめ', 'ポイント', 'コツ', '——'];

for (const f of html) {
  const s = readFileSync(f, 'utf8');
  // 楽天の商品を出すページ（クレジットがある）。商品名は楽天のものなので、言葉と絵文字の点検からは外す
  const rakuten = s.includes(RAKUTEN_CREDIT);
  const shown = s
    .replace(/<ul class="shop"[\s\S]*?<\/ul>/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');
  if (!/<html lang="ja">/.test(s)) fail(f, 'lang="ja" がない');
  const titles = s.match(/<title>([^<]*)<\/title>/g) ?? [];
  if (titles.length !== 1 || /<title>\s*<\/title>/.test(s)) fail(f, 'title が1つでない・空');
  if (!/<meta name="description" content="[^"]+">/.test(s)) fail(f, 'description がない');
  if ((s.match(/<h1[\s>]/g) ?? []).length !== 1) fail(f, 'h1 が1つでない');
  if (!f.endsWith('404.html') && !/<link rel="canonical" href="https:\/\/[^"]+">/.test(s)) fail(f, 'canonical がない');
  if (!SITE.launched && !/<meta name="robots" content="noindex">/.test(s)) fail(f, '公開前なのに noindex がない');
  if (!s.includes(ESTAT_CREDIT)) fail(f, 'e-Stat のクレジット表示がない');
  const emoji = [...shown.matchAll(/\p{Extended_Pictographic}/gu)].map((m) => m[0]).filter((c) => !'©®™'.includes(c));
  if (emoji.length) fail(f, `絵文字がある：${[...new Set(emoji)].join(' ')}`);
  for (const w of BANNED) if (shown.includes(w)) fail(f, `使わない言葉「${w}」`);
  // 外のファイルの読み込みは AdSense のスクリプトだけ（公開後・運営者IDがあるとき）
  const adsTag = `<script async src="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsense}" crossorigin="anonymous"></script>`;
  for (const m of s.matchAll(/<(script|link|img|iframe)\b[^>]*(?:src|href)="(https?:)?\/\/[^"]+"[^>]*>/gi)) {
    if (/rel="canonical"/.test(m[0])) continue;
    // 楽天の商品画像（APIのURLのまま）は、楽天のページだけ
    if (rakuten && /^<img src="https:\/\/thumbnail\.image\.rakuten\.co\.jp\//.test(m[0])) continue;
    if (SITE.adsense && SITE.launched && m[0] === adsTag.replace('</script>', '')) continue;
    fail(f, `外のファイルを読み込んでいる：${m[0].slice(0, 80)}`);
  }
  if (SITE.adsense && SITE.launched && !f.endsWith('404.html') && !rakuten && !s.includes('<body data-ads="off">') && !s.includes(adsTag)) fail(f, 'AdSense のスクリプトがない');
  // クイズは AdSense なし（答えのボタンの近くに自動広告が入ると誤クリックをまねくため。設計：広告は結果の下だけ）
  if (/\/quiz\//.test(f) && s.includes('adsbygoogle')) fail(f, 'クイズのページに AdSense がある');
  if (rakuten) {
    // 楽天の商品を出すページ：AdSense なし・楽天以外へのリンクなし（規約 第8条4項）・商品のリンクに sponsored と「PR」
    if (s.includes('adsbygoogle')) fail(f, '楽天のページに AdSense がある');
    for (const m of s.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (!m[1].startsWith(`${SITE.url}/`) && !/^https:\/\/([a-z0-9-]+\.)*rakuten\.(co\.jp|com)\//.test(m[1])) fail(f, `楽天のページに楽天以外へのリンク：${m[1].slice(0, 60)}`);
    }
    if (s.includes('class="shop"')) {
      if (!s.includes('<b>PR</b>')) fail(f, '商品の上に PR の表示がない');
      for (const m of s.matchAll(/<a href="https:\/\/[^"]*rakuten[^"]*"([^>]*)>/g)) {
        if (!m[0].includes('developers.rakuten.com') && !/rel="nofollow sponsored noopener"/.test(m[1])) fail(f, '商品のリンクに rel="nofollow sponsored noopener" がない');
      }
    }
  } else if (/hinmoku\/[a-z-]+\/index\.html$/.test(f)) fail(f, '品目ページに楽天のクレジットがない');
  for (const m of s.matchAll(/href="(\/[^"#?]*)/g)) {
    const p = m[1];
    const ok = existsSync(`${DIST}${p}`) && statSync(`${DIST}${p}`).isFile() ? true : existsSync(`${DIST}${p.replace(/\/?$/, '/')}index.html`);
    if (!ok) fail(f, `リンク切れ：${p}`);
  }
  const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) fail(f, `id の重複：${[...new Set(dup)].join(' ')}`);
}
for (const need of ['robots.txt', '_headers', 'fingerprint.json', 'index.html', '404.html', 'favicon.ico', 'favicon.svg', 'apple-touch-icon.png']) {
  if (!existsSync(`${DIST}/${need}`)) fail(`${DIST}/${need}`, 'ない');
}
if (!SITE.launched && !/Disallow: \/\n/.test(readFileSync(`${DIST}/robots.txt`, 'utf8'))) fail(`${DIST}/robots.txt`, '公開前なのに Disallow: / でない');
if (SITE.launched) {
  const robots = readFileSync(`${DIST}/robots.txt`, 'utf8');
  if (/Disallow: \/\n/.test(robots)) fail(`${DIST}/robots.txt`, '公開したのに全部おことわり');
  if (!existsSync(`${DIST}/sitemap.xml`)) fail(`${DIST}/sitemap.xml`, 'ない');
  if (SITE.adsense && !existsSync(`${DIST}/ads.txt`)) fail(`${DIST}/ads.txt`, 'ない');
}

console.log(`点検：${html.length} ページ${bad ? `・NG ${bad}` : '・OK'}`);
if (bad) process.exit(1);
