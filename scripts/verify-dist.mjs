// dist/ の全ページ点検（ビルドのあと・公開の前に毎回）
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { SITE, ESTAT_CREDIT } from '../src/site.mjs';

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
  const shown = s
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
    if (SITE.adsense && SITE.launched && m[0] === adsTag.replace('</script>', '')) continue;
    fail(f, `外のファイルを読み込んでいる：${m[0].slice(0, 80)}`);
  }
  if (SITE.adsense && SITE.launched && !f.endsWith('404.html') && !s.includes(adsTag)) fail(f, 'AdSense のスクリプトがない');
  for (const m of s.matchAll(/href="(\/[^"#?]*)/g)) {
    const p = m[1];
    const ok = existsSync(`${DIST}${p}`) && statSync(`${DIST}${p}`).isFile() ? true : existsSync(`${DIST}${p.replace(/\/?$/, '/')}index.html`);
    if (!ok) fail(f, `リンク切れ：${p}`);
  }
  const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) fail(f, `id の重複：${[...new Set(dup)].join(' ')}`);
}
for (const need of ['robots.txt', '_headers', 'fingerprint.json', 'index.html', '404.html']) {
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
