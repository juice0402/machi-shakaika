// dist/ の全ページ点検（ビルドのあと・公開の前に毎回）
import { readdirSync, readFileSync, statSync, existsSync } from 'node:fs';
import { SITE, ESTAT_CREDIT } from '../src/site.mjs';
import { RAKUTEN_CREDIT } from '../src/layout.mjs';
import { SAIGAI, SAIGAI_BAR } from '../src/mode.mjs';

const DIST = 'dist';
const walk = (d) => readdirSync(d).flatMap((x) => (statSync(`${d}/${x}`).isDirectory() ? walk(`${d}/${x}`) : [`${d}/${x}`]));
const files = walk(DIST);
const html = files.filter((f) => f.endsWith('.html'));
let bad = 0;
const descs = new Map(); // 説明文 → ページ（同じ説明文を量産しない）
const missingHinan = []; // ALLOW_MISSING_HINAN_LIST=1 のとき、ない一覧
// 逃げ道はローカルだけ（GitHub Actions の中では、設定されていても使わない）
const allowMissingHinan = process.env.ALLOW_MISSING_HINAN_LIST === '1' && !process.env.GITHUB_ACTIONS;
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
  // A8.net の広告（連絡 C-014）：1ページ1つまで・「広告」の表示つき・子どもも使うページと印刷のページには置かない
  const a8 = (s.match(/href="https:\/\/px\.a8\.net\//g) ?? []).length;
  if (a8) {
    const p = f.slice(DIST.length).replace(/index\.html$/, '');
    if (a8 > 1) fail(f, 'A8 の広告が1ページに2つ以上ある');
    if (!s.includes('<p class="pr"><b>広告</b>')) fail(f, 'A8 の広告に「広告」の表示がない');
    if (rakuten || /^\/(quiz|dougu\/karte|dougu\/manabi|dougu\/print|hinmoku)\//.test(p)) fail(f, 'A8 の広告を置かないページにある');
  }
  const shown = s
    .replace(/<ul class="shop"[\s\S]*?<\/ul>/g, '')
    // 出典の題（相手のページの題そのまま）は点検から外す
    .replace(/<cite>[\s\S]*?<\/cite>/g, '')
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<style[\s\S]*?<\/style>/gi, '')
    .replace(/<[^>]+>/g, ' ');
  if (!/<html lang="ja">/.test(s)) fail(f, 'lang="ja" がない');
  const titles = s.match(/<title>([^<]*)<\/title>/g) ?? [];
  if (titles.length !== 1 || /<title>\s*<\/title>/.test(s)) fail(f, 'title が1つでない・空');
  if (!/<meta name="description" content="[^"]+">/.test(s)) fail(f, 'description がない');
  // 検索結果での見え方（10/26）：説明文は全角80〜120文字・ページごとにちがう。サイト名は og:site_name
  const desc = (s.match(/<meta name="description" content="([^"]*)">/) ?? [])[1] ?? '';
  const indexable = !/<meta name="robots" content="noindex/.test(s) && !f.endsWith('404.html');
  if (indexable) {
    const n = [...desc.replace(/&amp;/g, '&')].length;
    if (n < 80 || n > 120) fail(f, `説明文が${n}文字（80〜120文字にする）`);
    if (descs.has(desc)) fail(f, `説明文が ${descs.get(desc)} と同じ`);
    descs.set(desc, f.slice(DIST.length));
  }
  if (!s.includes(`<meta property="og:site_name" content="${SITE.name}">`)) fail(f, 'og:site_name がない');
  // 共有画像（10/27）：どのページにも1つ、置いてある画像を指す
  const og = [...s.matchAll(/<meta property="og:image" content="([^"]+)">/g)].map((m) => m[1]);
  if (og.length !== 1 || !og[0].startsWith(`${SITE.url}/`) || !existsSync(`${DIST}${og[0].slice(SITE.url.length)}`)) fail(f, `共有画像（og:image）がない・置いていない：${og.join(' ')}`);
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
    // A8.net の広告リンクの数え用の1px の画像（A8 のコードのまま。src/a8.mjs）
    if (!rakuten && /^<img border="0" width="1" height="1" src="https:\/\/www\d*\.a8\.net\/0\.gif\?a8mat=[0-9A-Z+]+" alt="">$/.test(m[0])) continue;
    // 楽天の商品を出すページは、楽天から取った情報（画像のURLなど）をログに出さない（楽天ウェブサービス規約 第10条9号。公開リポジトリのログは誰でも見られる）
    fail(f, rakuten ? '外のファイルを読み込んでいる（楽天のページなので中身はログに出さない）' : `外のファイルを読み込んでいる：${m[0].slice(0, 80)}`);
  }
  if (SITE.adsense && SITE.launched && !f.endsWith('404.html') && !rakuten && !s.includes('<body data-ads="off">') && !s.includes(adsTag) && !s.includes(`<body data-ads-late="https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsense}">`)) fail(f, 'AdSense のスクリプトがない');
  // クイズは AdSense なし（答えのボタンの近くに自動広告が入ると誤クリックをまねくため。設計：広告は結果の下だけ）
  if (/\/quiz\//.test(f) && s.includes('adsbygoogle')) fail(f, 'クイズのページに AdSense がある');
  if (rakuten) {
    // 楽天の商品を出すページ：AdSense なし・楽天以外へのリンクなし（規約 第8条4項）・商品のリンクに sponsored と「PR」
    if (s.includes('adsbygoogle')) fail(f, '楽天のページに AdSense がある');
    for (const m of s.matchAll(/href="(https?:\/\/[^"]+)"/g)) {
      if (!m[1].startsWith(`${SITE.url}/`) && !/^https:\/\/([a-z0-9-]+\.)*rakuten\.(co\.jp|com)\//.test(m[1])) fail(f, '楽天のページに楽天以外へのリンクがある（中身はログに出さない）');
    }
    if (s.includes('class="shop"')) {
      if (!s.includes('<b>PR</b>')) fail(f, '商品の上に PR の表示がない');
      for (const m of s.matchAll(/<a href="https:\/\/[^"]*rakuten[^"]*"([^>]*)>/g)) {
        if (!m[0].includes('developers.rakuten.com') && !/rel="nofollow sponsored noopener"/.test(m[1])) fail(f, '商品のリンクに rel="nofollow sponsored noopener" がない');
      }
    }
  } else if (!SAIGAI && /hinmoku\/[a-z-]+\/index\.html$/.test(f)) fail(f, '品目ページに楽天のクレジットがない');
  // 災害時モード（data/mode.yml）：全ページに案内の帯・AdSense なし・楽天の商品なし。ふだんは帯を出さない
  if (SAIGAI) {
    if (!s.includes(SAIGAI_BAR)) fail(f, '災害時モードなのに案内の帯がない');
    if (s.includes('adsbygoogle')) fail(f, '災害時モードなのに AdSense がある');
    if (rakuten || /(afl|item|thumbnail\.image)\.rakuten\.co\.jp/.test(s)) fail(f, '災害時モードなのに楽天の商品がある');
  } else if (s.includes('<p class="sg"')) fail(f, '災害時モードでないのに案内の帯がある');
  for (const m of s.matchAll(/href="(\/[^"#?]*)/g)) {
    const p = m[1];
    const ok = existsSync(`${DIST}${p}`) && statSync(`${DIST}${p}`).isFile() ? true : existsSync(`${DIST}${p.replace(/\/?$/, '/')}index.html`);
    if (!ok) fail(f, `リンク切れ：${p}`);
  }
  // 避難場所の一覧（「開く」で読む data-src）がないと 404 になる。CI では止める
  //   ローカルでは一覧を作れない（国土地理院に届かない）ので、ALLOW_MISSING_HINAN_LIST=1 のときだけ注記にする（deploy.yml では使わない）
  for (const m of s.matchAll(/data-src="(\/hinan\/\d{5}\.json)"/g)) {
    if (existsSync(`${DIST}${m[1]}`)) continue;
    if (allowMissingHinan) missingHinan.push(m[1]);
    else fail(f, `避難場所の一覧がない：${m[1]}（update.yml が作る。data/hinan/list）`);
  }
  const ids = [...s.matchAll(/\sid="([^"]+)"/g)].map((m) => m[1]);
  const dup = ids.filter((x, i) => ids.indexOf(x) !== i);
  if (dup.length) fail(f, `id の重複：${[...new Set(dup)].join(' ')}`);
}
// トップ：WebSite の構造化データ（name・url）と、title がサイト名
{
  const top = readFileSync(`${DIST}/index.html`, 'utf8');
  const ld = [...top.matchAll(/<script type="application\/ld\+json">([\s\S]*?)<\/script>/g)].map((m) => JSON.parse(m[1]));
  const ws = ld.find((x) => x['@type'] === 'WebSite');
  if (!ws || ws.name !== SITE.name || ws.url !== `${SITE.url}/`) fail(`${DIST}/index.html`, 'WebSite の構造化データ（name・url）がない・ちがう');
  if (!top.includes(`<title>${SITE.name}</title>`)) fail(`${DIST}/index.html`, 'トップの title がサイト名とちがう');
  if (/pages\.dev/.test(top.replace(/<script[\s\S]*?<\/script>/g, ''))) fail(`${DIST}/index.html`, 'pages.dev のURLが残っている');
}
for (const need of ['robots.txt', '_headers', 'fingerprint.json', 'index.html', '404.html', 'favicon.ico', 'favicon.svg', 'apple-touch-icon.png', 'quiz/machi.json']) {
  if (!existsSync(`${DIST}/${need}`)) fail(`${DIST}/${need}`, 'ない');
}
if (!SITE.launched && !/Disallow: \/\n/.test(readFileSync(`${DIST}/robots.txt`, 'utf8'))) fail(`${DIST}/robots.txt`, '公開前なのに Disallow: / でない');
if (SITE.launched) {
  const robots = readFileSync(`${DIST}/robots.txt`, 'utf8');
  if (/Disallow: \/\n/.test(robots)) fail(`${DIST}/robots.txt`, '公開したのに全部おことわり');
  if (!existsSync(`${DIST}/sitemap.xml`)) fail(`${DIST}/sitemap.xml`, 'ない');
  if (SITE.adsense && !existsSync(`${DIST}/ads.txt`)) fail(`${DIST}/ads.txt`, 'ない');
}

if (missingHinan.length) console.log(`注記：避難場所の一覧がない ${missingHinan.length}（ALLOW_MISSING_HINAN_LIST=1・ローカルなので止めない。公開の前に update.yml で作る）`);
console.log(`点検：${html.length} ページ${bad ? `・NG ${bad}` : '・OK'}`);
if (bad) process.exit(1);
