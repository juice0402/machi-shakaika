// ページの外側（head・ヘッダー・フッター）と共通の部品。見た目は「G 森と川」（10/22 しょーくんが決定）
//   木の帯（杉と丸い木）のふち・明朝の見出しに小さな木の印・森の緑と川の青・えらんだものに朱の印
//   「この街の備え」は細い川の線で区切る
import { SITE, ESTAT_CREDIT } from './site.mjs';
import { townHtml, ART_CSS } from './art.mjs';
import { SAIGAI, SAIGAI_BAR } from './mode.mjs';

export const esc = (s) =>
  String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
// 説明文（meta description）：決まった文のあとに、120文字をこえない分だけ足す文をつなぐ（10/26 検索結果での見え方）
//   opt の1つずつは文か、文の配列（入る中でいちばん前の1つだけ使う。長い言い方・短い言い方の順に書く）
export const DESC_MAX = 120;
export function fit(req, opt = []) {
  let s = req.join('');
  for (const o of opt) {
    const alt = (Array.isArray(o) ? o : [o]).find((x) => x && [...(s + x)].length <= DESC_MAX);
    if (alt) s += alt;
  }
  return s;
}
// 値段は幅で（検索結果に古い値段が残るため）：698 → 600円台から、1,980 → 1,000円台から、12,800 → 1万円台から
export function priceBand(p) {
  if (p < 1000) return `${Math.floor(p / 100) * 100}円台から`;
  if (p < 10000) return `${Math.floor(p / 1000).toLocaleString('ja-JP')},000円台から`;
  return `${Math.floor(p / 10000)}万円台から`;
}
// 出典の題（相手のページの題そのまま）：「題」。題の中の「」は『』にする。<cite> に入れて、使わない言葉の点検から外す（verify-dist.mjs）
export const srcTitle = (s) => (s.title ? `「${String(s.title).replace(/「/g, '『').replace(/」/g, '』')}」` : '');
export const srcName = (s) => `${esc(s.publisher)}${s.title ? `<cite>${esc(srcTitle(s))}</cite>` : ''}`;
export const fmt = (n) => (n == null ? '-' : Number(n).toLocaleString('ja-JP'));

const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif';
const GOTHIC = '"Hiragino Sans","Hiragino Kaku Gothic ProN","Noto Sans JP",system-ui,sans-serif';

const CSS = `
:root{--bg:#fff;--ink:#23312a;--sub:#5f6e66;--line:#d3dfd5;--accent:#c53d43;--num:#2f6b45;--h2:#2f5d3e;--bar:#4f8d5e;--bar2:#b5cfbb;--track:#e6efe8;--soft:#eef5ef;--water:#3f8fbf}
*{box-sizing:border-box}[hidden]{display:none!important}body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.7 ${GOTHIC};-webkit-text-size-adjust:100%}
a{color:inherit}.pg{max-width:430px;margin:0 auto;padding:0 16px 24px}
.deco{display:block;margin:0 -16px;line-height:0}.deco svg{display:block;width:100%}
.bar{display:flex;justify-content:space-between;align-items:baseline;gap:8px;padding:6px 0;border-bottom:1px solid var(--line)}
.logo{font:700 20px/1.3 ${MINCHO};margin:0;text-decoration:none;letter-spacing:.08em;color:var(--ink);white-space:nowrap}
.nav{display:flex;gap:14px;font-size:13px}.nav a{text-decoration:none;color:var(--sub);padding:6px 0}
.lead{margin:10px 0 12px;font:15px/1.6 ${MINCHO};color:var(--sub)}
.find{display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:10px;margin:0 0 16px;position:relative}
.find label{font-size:13px;color:var(--sub);padding-bottom:9px}
.find input{font:inherit;font-size:18px;border:0;border-bottom:1.5px solid var(--ink);padding:8px 2px;background:none;width:100%;border-radius:0;color:var(--ink)}
.find button{font:inherit;font-size:15px;background:none;border:0;border-bottom:1.5px solid var(--ink);padding:8px 2px;color:var(--ink)}
.hits{grid-column:1/-1;margin:0;padding:0;list-style:none;font-size:15px}.hits li a{display:block;padding:7px 0;border-bottom:1px dotted var(--line)}.hits small{color:var(--sub);margin-left:6px}
.msg{grid-column:1/-1;margin:0;font-size:13px;color:var(--sub)}
.q{font:700 17px/1.4 ${MINCHO};margin:0 0 4px}
.row{display:flex;align-items:center;gap:6px;min-height:54px;border-bottom:1px dotted var(--line)}
.k{width:3.2em;font-size:13px;color:var(--sub)}
.row button{font:inherit;background:none;border:0;color:var(--ink);min-width:44px;height:44px;font-size:24px;line-height:1;cursor:pointer}
.row b{font-size:27px;min-width:1.4em;text-align:center;font-variant-numeric:tabular-nums;color:var(--num)}
.day{position:relative;font-size:20px!important;padding:0 16px!important}.day span{position:relative;z-index:1}
.day .han{position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border:2.5px solid var(--accent);border-radius:50%;box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3.5px var(--accent);transform:rotate(-8deg);opacity:0;pointer-events:none}
.day.on .han{opacity:1}.day.on span{color:var(--accent);font-weight:700}
.ans{margin:12px 0 4px;font-size:15px;line-height:2}
.ans b{font-size:25px;color:var(--num);font-variant-numeric:tabular-nums;margin:0 1px 0 4px}
.src{font-size:11px;color:var(--sub);margin:6px 0 0;line-height:1.5}
h2{font:700 17px/1.4 ${MINCHO};margin:28px 0 10px;display:flex;align-items:center;gap:8px;color:var(--h2)}
.hm{width:18px;height:14px;color:var(--h2);flex:none}
h3{font:700 15px/1.5 ${MINCHO};margin:18px 0 6px}
p{margin:0 0 10px}
.tiles{display:grid;grid-template-columns:repeat(13,1fr);gap:2px}
.tile{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:9px;text-decoration:none;color:var(--ink);background:#eef5e8;border:1px solid #c9dcc0}
.tile.here{background:#2f6b45;border-color:#2f6b45;color:#fff;font-weight:700}
.list{margin:0;padding:0;list-style:none}.list li{border-bottom:1px dotted var(--line)}.list a{display:block;padding:8px 0;font-size:15px}
.cols{columns:2;column-gap:16px}.cols li{break-inside:avoid}
.crumb{font-size:12px;color:var(--sub);margin:10px 0 0}.crumb a{color:var(--sub)}
.city{font:700 32px/1.25 ${MINCHO};margin:0 0 4px;letter-spacing:.04em}
.big{margin:0;font-size:15px}.big b{font-size:36px;font-variant-numeric:tabular-nums;margin-right:2px;color:var(--num)}
.chg,.hh{margin:0;font-size:15px}.chg b,.hh b{font-variant-numeric:tabular-nums}
.feat{margin:10px 0;font:16px/1.6 ${MINCHO}}
.s1{margin:12px 0 4px;font-size:14px;line-height:1.75;padding:10px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line)}
.s1 b{color:var(--accent);font-size:18px;white-space:nowrap}
.go{display:inline-block;margin:6px 0 2px;font-size:15px;font-weight:700}
.g{margin:0 0 16px}.g>p{margin:0 0 4px;font-size:13px}.g>p b{font-size:15px}
.scale{position:relative;height:42px;margin:2px 0 0}
.scale .ln{position:absolute;left:0;right:0;top:16px;border-top:1px solid var(--ink)}
.scale .tk{position:absolute;top:12px;height:9px;border-left:1px solid var(--ink)}
.scale .me,.scale .zk{position:absolute;transform:translateX(-50%);font-size:10px;line-height:1.2;white-space:nowrap;text-align:center}
.scale .me{top:22px;color:var(--accent);font-weight:700}.scale .me::before{content:"";display:block;width:0;height:0;margin:0 auto;border:5px solid transparent;border-bottom:7px solid var(--accent);border-top:0}
.scale .zk{top:0;color:var(--sub)}.scale .zk::after{content:"";display:block;width:0;height:0;margin:0 auto;border:4px solid transparent;border-top:6px solid var(--sub);border-bottom:0}
.scale .lo,.scale .hi{position:absolute;top:24px;font-size:10px;color:var(--sub)}.scale .lo{left:0}.scale .hi{right:0}
.bars{display:grid;grid-template-columns:6.5em 1fr 3.4em;align-items:center;gap:6px 8px;font-size:12px}.bars span{white-space:nowrap}
.share{height:14px;background:var(--track);position:relative}.share i{position:absolute;inset:0 auto 0 0;background:var(--bar)}
.num{text-align:right;font-variant-numeric:tabular-nums}
.tbl{width:100%;border-collapse:collapse;font-size:13px}.tbl th,.tbl td{padding:6px 4px;border-bottom:1px dotted var(--line);text-align:right;font-variant-numeric:tabular-nums}
.tbl th{font-weight:400;color:var(--sub);font-size:12px}.tbl td:first-child,.tbl th:first-child{text-align:left}
.tbl tr.me td{color:var(--num);font-weight:700}
.note{font-size:12px;color:var(--sub)}
.sonae{background:var(--soft);margin:24px -16px 0;padding:0 16px 18px}
.edge{display:block;margin:0 -16px;line-height:0;background:#fff}.edge svg{display:block;width:100%}
.why{margin:0 0 10px;font-size:14px}.why a{font-weight:700}
.cnt{display:flex;gap:18px;margin:12px 0 8px}.cnt p{margin:0;font-size:12px;color:var(--sub)}.cnt b{display:block;font-size:27px;color:var(--num);font-variant-numeric:tabular-nums}
.kinds{display:grid;grid-template-columns:7.5em 1fr 2.5em;gap:3px 8px;align-items:center;font-size:12px;margin:4px 0 12px}.kinds i{display:block;height:8px;background:var(--bar)}
.notes{margin:0 0 10px;padding:0;list-style:none;font-size:12px;color:var(--sub)}.notes li{margin:0 0 3px}
.links{display:flex;flex-direction:column;font-size:14px;margin:0 0 8px}.links a{padding:6px 0}
details{border-top:1px dotted var(--line);border-bottom:1px dotted var(--line);font-size:14px}
summary{padding:10px 0;cursor:pointer}.hl{margin:0 0 10px;padding:0;list-style:none;font-size:13px;max-height:420px;overflow:auto}
.hl li{padding:5px 0;border-bottom:1px dotted var(--line)}.hl small{display:block;color:var(--sub);font-size:11px}
.prose{font-size:15px;line-height:1.85}.prose p{margin:0 0 14px}
.kz{margin-left:auto;font:400 13px/1 ${GOTHIC};color:var(--sub);font-variant-numeric:tabular-nums}
.ckl{list-style:none;margin:0;padding:0}
.ckl label{display:grid;grid-template-columns:32px 1fr auto;align-items:center;gap:4px 8px;min-height:50px;padding:6px 0;border-bottom:1px dotted var(--line);cursor:pointer;position:relative;font-size:15px;line-height:1.45}
.ckl input{position:absolute;left:2px;top:50%;width:28px;height:28px;margin:-14px 0 0;opacity:0}
.ckl .bx{position:relative;width:26px;height:26px;border:1.5px solid #9fb3a6;border-radius:50%;margin-left:2px}
.ckl input:checked+.bx{border:2.5px solid var(--accent);box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3.5px var(--accent);transform:rotate(-8deg)}
.ckl input:checked+.bx::after{content:"済";position:absolute;inset:0;display:flex;align-items:center;justify-content:center;font:700 11px/1 ${MINCHO};color:var(--accent)}
.ckl input:focus-visible+.bx{outline:2px solid var(--water);outline-offset:2px}
.ckl input:checked~.t{color:var(--sub)}
.ckl .t small{display:block;font-size:11px;color:var(--sub)}
.qn{font-size:13px;white-space:nowrap}.qn b{font-size:20px;color:var(--num);font-variant-numeric:tabular-nums;margin-right:1px}
.clr{font:inherit;font-size:13px;background:none;border:0;border-bottom:1px solid var(--sub);color:var(--sub);padding:6px 0;margin-top:12px;cursor:pointer}
.masu{display:grid;grid-template-columns:repeat(20,1fr);gap:2px;margin:10px 0 4px}.masu i{aspect-ratio:1;background:var(--track)}.masu i.on{background:var(--num)}
.rk{list-style:none;margin:0 0 8px;padding:0}.rk li{display:grid;grid-template-columns:1.5em 1fr 4em 5.4em;align-items:center;gap:8px;padding:6px 0;border-bottom:1px dotted var(--line);font-size:14px;line-height:1.35}
.rk .no{color:var(--sub);font-variant-numeric:tabular-nums;text-align:right;font-size:12px}
.rk .nm small{display:block;font-size:11px;color:var(--sub)}
.rk .bv{height:8px;background:var(--track);position:relative}.rk .bv i{position:absolute;inset:0 auto 0 0;background:var(--bar)}
.rk .num{font-size:13px}
.list small.sub{display:block;font-size:12px;color:var(--sub);margin:-6px 0 8px}
.pr{margin:18px 0 4px;font-size:13px}.pr b{font-size:14px;letter-spacing:.08em}
.shop{list-style:none;margin:0;padding:0}.shop li[hidden]{display:none}
.shop a{display:grid;grid-template-columns:128px 1fr;grid-auto-rows:min-content;column-gap:12px;padding:10px 0;border-bottom:1px dotted var(--line);text-decoration:none;color:var(--ink)}
.shop img{grid-row:1/span 6;width:128px;height:128px}
.shop .nm{font-size:13px;line-height:1.5;display:-webkit-box;-webkit-line-clamp:3;-webkit-box-orient:vertical;overflow:hidden}
.shop .pz{font-size:17px;font-weight:700;color:var(--num);margin-top:2px;font-variant-numeric:tabular-nums}
.shop .rv{font-size:11px;color:var(--sub);line-height:1.5}.shop .to{font-size:13px;color:var(--h2);text-decoration:underline;margin-top:4px}
.qz{margin:6px 0 12px}.qz .meta{font-size:12px;color:var(--sub);margin:8px 0 0}
.qz .qq{font:700 18px/1.55 ${MINCHO};margin:4px 0 6px}.mq .qq{font-size:16px}
.qz .ch{list-style:none;margin:0 0 6px;padding:0}
.qz .ch button{position:relative;display:flex;align-items:center;gap:12px;width:100%;min-height:52px;padding:8px 2px 8px 8px;background:none;border:0;border-bottom:1px dotted var(--line);font:inherit;font-size:17px;line-height:1.4;color:var(--ink);text-align:left;cursor:pointer}
.qz .ch button:disabled{cursor:default;color:var(--ink)}
.qz .ch .k{position:relative;flex:none;display:flex;align-items:center;justify-content:center;width:24px;height:24px;font:700 15px/1 ${MINCHO};color:var(--sub)}
.qz .ch .t small{display:block;font-size:11px;color:var(--sub)}
.qz .ch .v{margin-left:auto;font-size:13px;color:var(--sub);white-space:nowrap;visibility:hidden}.qz .ch[data-done] .v{visibility:visible}
.qz .ch .ok .k{color:var(--accent)}.qz .ch .ok .k::after{content:"";position:absolute;left:50%;top:50%;width:34px;height:30px;margin:-15px 0 0 -17px;border:2.5px solid var(--accent);border-radius:50%;transform:rotate(-10deg);box-sizing:border-box}
.qz .ch .ok .t{font-weight:700}
.qz .ch .ng .k::before,.qz .ch .ng .k::after{content:"";position:absolute;left:50%;top:50%;width:22px;height:2.5px;margin:-1px 0 0 -11px;background:var(--accent);transform:rotate(40deg)}.qz .ch .ng .k::after{transform:rotate(-40deg)}
.qz .ex{font-size:14px;margin:6px 0 4px}.qz .ex p{margin:0 0 4px}
.qz .score{margin:14px 0 6px;font:700 20px/1 ${MINCHO};color:var(--accent)}.qz .score b{font-size:56px;margin-right:4px}
button.go{font:inherit;font-size:15px;font-weight:700;background:none;border:0;padding:6px 0;color:var(--ink);text-decoration:underline;cursor:pointer}button.go:disabled{color:var(--sub);text-decoration:none;cursor:default}
.t5 .tile{font:inherit;font-size:9px;padding:0;cursor:pointer;position:relative}
.t5 .tile.pick::after,.t5 .tile.hit::after,.t5 .tile.ans5::after{content:"";position:absolute;inset:-3px;border:2px solid var(--accent);border-radius:50%;pointer-events:none}
.t5 .tile.hit{color:var(--accent);font-weight:700}.t5 .tile.ans5::after{border-style:dashed}
.t5 .tile.miss::before,.t5 .tile.miss::after{content:"";position:absolute;left:50%;top:50%;width:80%;height:2px;margin:-1px 0 0 -40%;background:var(--accent);transform:rotate(40deg)}.t5 .tile.miss::after{transform:rotate(-40deg)}
.sc{margin:6px 0 4px;font-size:13px;color:var(--sub)}.sc select{font:inherit;font-size:15px;color:var(--ink);background:none;border:0;border-bottom:1.5px solid var(--ink);padding:4px 2px;border-radius:0;max-width:70%}
.gogun{border:1px solid var(--line);padding:8px 6px;margin:6px 0;line-height:1.2}
.gogun .w{position:relative;display:inline-block;margin:3px 2px;padding:8px 9px;min-height:40px;background:none;border:0;font:inherit;font-size:15px;color:var(--ink);cursor:pointer;text-decoration:underline dotted var(--sub);text-underline-offset:4px}
.gogun .w small{display:block;font-size:10px;color:var(--sub);text-decoration:none}.gogun .w:disabled{cursor:default;color:var(--ink)}
.gogun .w.hit{color:var(--accent);font-weight:700;text-decoration:none}
.gogun .w.hit::after,.gogun .w.ans5::after{content:"";position:absolute;inset:1px -2px;border:2px solid var(--accent);border-radius:50%;transform:rotate(-4deg);pointer-events:none}.gogun .w.ans5::after{border-style:dashed}
.gogun .w.miss::before,.gogun .w.miss::after{content:"";position:absolute;left:15%;right:15%;top:50%;height:2px;background:var(--accent);transform:rotate(18deg)}.gogun .w.miss::after{transform:rotate(-18deg)}
.t5l{margin:10px 0 6px;padding-left:2.2em;font-size:14px;line-height:1.5}.t5l li{padding:4px 0;border-bottom:1px dotted var(--line)}.t5l li.got{color:var(--accent);font-weight:700}.t5l li.rest{color:var(--sub)}
.dbr .score{margin:10px 0 2px}.dbm{font:700 17px/1.5 ${MINCHO};color:var(--accent);margin:0 0 4px}
.sg{margin:0;padding:8px 16px;background:#e8ebe9;color:var(--ink);font-size:13px;line-height:1.5;text-align:center}.sg a{color:inherit;font-weight:700}cite{font-style:normal}
.ft{max-width:430px;margin:0 auto;padding:16px 16px 28px;font-size:11px;color:var(--sub);border-top:1px solid var(--line)}.ft p{margin:0 0 6px}
.ft .fl{display:flex;flex-wrap:wrap;gap:4px 16px;font-size:13px;margin:0 0 12px}.ft .fl a{padding:4px 0;color:var(--ink)}
`.replace(/\n/g, '');

export const TREES = (id) =>
  `<svg viewBox="0 0 390 24" preserveAspectRatio="none" height="24" aria-hidden="true"><defs><pattern id="${id}" width="28" height="24" patternUnits="userSpaceOnUse"><rect y="21" width="28" height="3" fill="#b9d3a3"/><path d="M3 21l6-16 6 16z" fill="#356b44"/><rect x="8.4" y="20" width="1.2" height="2" fill="#5a4636"/><circle cx="21" cy="14" r="5" fill="#76a95a"/><rect x="20.4" y="18" width="1.2" height="4" fill="#5a4636"/></pattern></defs><rect width="390" height="24" fill="url(#${id})"/></svg>`;
export const RIVER = `<svg viewBox="0 0 390 10" preserveAspectRatio="none" height="10" aria-hidden="true"><path d="M0 5C16 1 32 1 48 5S80 9 96 5 128 1 144 5 176 9 192 5 224 1 240 5 272 9 288 5 320 1 336 5 368 9 390 4" fill="none" stroke="#3f8fbf" stroke-width="1.5"/></svg>`;
const HM = `<svg class="hm" viewBox="0 0 18 14" aria-hidden="true"><path d="M2 13l5-11 5 11z" fill="currentColor"/><circle cx="13" cy="7" r="4" fill="currentColor" opacity=".55"/></svg>`;
export const h2 = (t, id) => `<h2${id ? ` id="${id}"` : ''}>${HM}${t}</h2>`;
export const HAN = `<span class="han" aria-hidden="true"></span>`;

const NAV = `<nav class="nav" aria-label="サイト内"><a href="/#map">都道府県</a><a href="/sonae/">備えの知識</a><a href="/dougu/keisan/">計算</a></nav>`;

// 楽天ウェブサービスのクレジット（楽天の指定のまま。1文字も変えない）
export const RAKUTEN_CREDIT = `<!-- Rakuten Web Services Attribution Snippet FROM HERE -->
<a href="https://developers.rakuten.com/" target="_blank">Supported by Rakuten Developers</a>
<!-- Rakuten Web Services Attribution Snippet TO HERE -->`;

export const FOOT_LINKS = [
  ['/about/', 'このサイトについて'],
  ['/privacy/', 'プライバシーポリシー'],
];

/**
 * @param {object} p
 * @param {string} p.path      /から始まるURL（null は 404）
 * @param {string} p.title     ページの題（トップ以外は「｜まちの社会科」がつく）
 * @param {string} p.description
 * @param {string} p.body
 * @param {boolean}[p.noindex]
 * @param {boolean}[p.noAds]   AdSense を置かない
 * @param {boolean}[p.gsi]     国土地理院のデータを使うページ（フッターに出典）
 * @param {string} [p.script]  ページの最後に入れるスクリプト
 * @param {string} [p.head]    head に足すもの（構造化データなど）
 * @param {boolean}[p.rakuten] 楽天の商品を出すページ（AdSense を置かない・フッターに楽天のクレジット）
 * @param {boolean}[p.saigai]  災害時モード（ふだんは data/mode.yml のとおり。テスト用に変えられる）：上に案内の帯・AdSense なし
 */
export function page(p) {
  const full = p.path === '/' ? SITE.name : `${p.title}｜${SITE.name}`;
  const robots = !SITE.launched || p.noindex ? '<meta name="robots" content="noindex">' : '';
  const canonical = p.path ? `<link rel="canonical" href="${SITE.url}${p.path}">` : '';
  const saigai = p.saigai ?? SAIGAI;
  const ads = Boolean(SITE.adsense) && SITE.launched && !p.noAds && !p.noindex && !p.rakuten && !saigai;
  const isTop = p.path === '/';
  // adsLate：ページのスクリプトが準備できてから広告を読む（期限メモ：URL の # のメモを消してから）
  const adsSrc = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${SITE.adsense}`;
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<link rel="icon" href="/favicon.ico" sizes="48x48"><link rel="icon" href="/favicon.svg" type="image/svg+xml"><link rel="apple-touch-icon" href="/apple-touch-icon.png">
<title>${esc(full)}</title>
<meta name="description" content="${esc(p.description)}">
${robots}${canonical}
<meta property="og:site_name" content="${esc(SITE.name)}"><meta property="og:title" content="${esc(full)}"><meta property="og:description" content="${esc(p.description)}"><meta property="og:type" content="${isTop ? 'website' : 'article'}">${p.path ? `<meta property="og:url" content="${SITE.url}${p.path}">` : ''}
${ads && !p.adsLate ? `<script async src="${adsSrc}" crossorigin="anonymous"></script>\n` : ''}<style>${CSS}${ART_CSS}</style>${p.head ?? ''}
</head>
<body${ads ? (p.adsLate ? ` data-ads-late="${adsSrc}"` : '') : ' data-ads="off"'}>
${saigai ? `${SAIGAI_BAR}\n` : ''}<div class="pg">
<header><span class="deco">${TREES('trh')}</span><div class="bar">${isTop ? `<h1 class="logo">${esc(SITE.name)}</h1>` : `<a class="logo" href="/">${esc(SITE.name)}</a>`}${NAV}</div></header>
<main>
${p.body}
</main>
</div>
${townHtml()}<footer class="ft">
<div class="fl">${FOOT_LINKS.map(([h, t]) => `<a href="${h}">${t}</a>`).join('')}</div>
<p>${esc(ESTAT_CREDIT)}</p>
${p.gsi ? '<p>出典：<a href="https://www.gsi.go.jp/bousaichiri/hinanbasho.html">国土地理院ウェブサイト</a>（指定緊急避難場所・指定避難所データ）</p>' : ''}
${p.rakuten ? `<p>${RAKUTEN_CREDIT}</p>` : ''}
</footer>
${p.script ? `<script>${p.script}</script>` : ''}
</body>
</html>
`;
}

// 目盛り：全国の市区町村の中での位置（lo〜hi）。me がこの街、zk が全国の値
export function scale({ lo, hi, me, zk, unit, ticks = 4, meLabel, zkLabel }) {
  const pos = (v) => `${Math.max(0, Math.min(100, ((v - lo) / (hi - lo)) * 100)).toFixed(1)}%`;
  const tk = Array.from({ length: ticks + 1 }, (_, i) => `<span class="tk" style="left:${((i / ticks) * 100).toFixed(1)}%"></span>`).join('');
  return `<div class="scale"><span class="ln"></span>${tk}${zk == null ? '' : `<span class="zk" style="left:${pos(zk)}">${zkLabel}</span>`}<span class="me" style="left:${pos(me)}">${meLabel}</span><span class="lo">${lo}${unit}</span><span class="hi">${hi}${unit}</span></div>`;
}

export const srcKokusei = (m) =>
  `<p class="src">出典：総務省「${esc(m.statName)}」を加工して作成（${jpDate(m.survey)}現在・${jpDate(m.published)}公表）</p>`;

export function jpDate(iso) {
  const [y, mo, d] = String(iso).split('-').map(Number);
  return `${y}年${mo}月${d}日`;
}
