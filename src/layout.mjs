// ページの外側（head・ヘッダー・フッター）
// デザインはまだ決めていない（3案を本物の画面でくらべてから）。いまは文字と余白だけの仮の見た目
import { SITE, ESTAT_CREDIT } from './site.mjs';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);

const CSS = `
:root{--paper:#fff;--ink:#1f2328;--sub:#5b636b;--line:#d7dbe0}
@media (prefers-color-scheme:dark){:root{--paper:#16181b;--ink:#e6e8eb;--sub:#a0a8b0;--line:#33383e}}
*{box-sizing:border-box}
html{-webkit-text-size-adjust:100%}
body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.7 system-ui,-apple-system,"Hiragino Sans","Noto Sans JP",sans-serif}
.wrap{max-width:40rem;margin:0 auto;padding:0 16px}
header{border-bottom:1px solid var(--line)}
header .wrap{display:flex;align-items:center;min-height:48px}
header a{color:inherit;text-decoration:none;font-weight:700}
main{padding:24px 0 40px}
h1{font-size:1.5rem;line-height:1.4;margin:0 0 8px}
p{margin:0 0 12px}
footer{border-top:1px solid var(--line);color:var(--sub);font-size:.75rem;padding:16px 0 32px}
footer p{margin:0 0 6px}
`
  .replace(/\n/g, '')
  .replace(/\s*([{}:;,])\s*/g, '$1');

export function page({ path, title, description, body, noindex = false }) {
  const full = path === '/' ? title : `${title}｜${SITE.name}`;
  const robots = !SITE.launched || noindex ? '<meta name="robots" content="noindex">' : '';
  const canonical = path ? `<link rel="canonical" href="${SITE.url}${path}">` : '';
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(full)}</title>
<meta name="description" content="${esc(description)}">
${robots}${canonical}
<style>${CSS}</style>
</head>
<body>
<header><div class="wrap"><a href="/">${esc(SITE.name)}</a></div></header>
<main><div class="wrap">
${body}
</div></main>
<footer><div class="wrap">
<p>${esc(ESTAT_CREDIT)}</p>
</div></footer>
</body>
</html>
`;
}
