// デザイン3案の見本（/mihon/）。しょーくんにくらべてもらうためだけのページで、決まったら消す
// A 社会科の資料集と白地図／B ものさしの目盛り／C 冷蔵庫に貼る家族の防災メモ
// 中身は3案とも同じ：トップ（街さがし＋すぐ下に計算）と、堺市のページ
// 堺市の数字は 2026-10-22 に e-Stat（令和7年国勢調査・確定値）から取り、公式の発表と照らし合わせたもの（PR #1 のデータの確認）
// 避難場所の数は 2026-10-22 に国土地理院の全国CSVから数えたもの。全国の位置・県内順位はデータの仕組みができたら入れる
import { SITE, ESTAT_CREDIT } from './site.mjs';
import { esc } from './layout.mjs';

const SAKAI = {
  name: '堺市',
  pref: '大阪府',
  pop: 802648,
  pop2020: 826161,
  households: 371987,
  general: 371244,
  perHousehold: 2.10345,
  age65: 232846,
  single: 150949,
  with65: 153806,
  housed: 367704,
  kyodo: 193169,
  basho: 294,
  hinanjo: 258,
  kinds: [
    ['地震', 162],
    ['津波', 151],
    ['高潮', 107],
    ['洪水', 68],
    ['内水氾濫', 53],
    ['土砂災害', 23],
    ['大規模な火事', 16],
  ],
  updated: '2026年9月8日',
};
const ZENKOKU = { pop: 122972528, pop2020: 126146099, perHousehold: 2.09573 };
const FETCHED = '2026年10月22日';

const fmt = (n) => n.toLocaleString('ja-JP');
const pct = (a, b) => (Math.round((a / b) * 1000) / 10).toFixed(1);
const change = (now, before) => Math.round(((now - before) / before) * 1000) / 10;

// 47都道府県のタイル地図（列, 行）
const TILES = [
  ['北海', 12, 0], ['青森', 12, 2], ['秋田', 11, 3], ['岩手', 12, 3],
  ['石川', 8, 4], ['富山', 9, 4], ['新潟', 10, 4], ['山形', 11, 4], ['宮城', 12, 4],
  ['島根', 3, 5], ['鳥取', 4, 5], ['兵庫', 5, 5], ['京都', 6, 5], ['福井', 7, 5], ['岐阜', 8, 5], ['長野', 9, 5], ['群馬', 10, 5], ['栃木', 11, 5], ['福島', 12, 5],
  ['山口', 2, 6], ['広島', 3, 6], ['岡山', 4, 6], ['大阪', 5, 6], ['奈良', 6, 6], ['滋賀', 7, 6], ['愛知', 8, 6], ['山梨', 9, 6], ['埼玉', 10, 6], ['茨城', 11, 6],
  ['佐賀', 0, 7], ['福岡', 1, 7], ['大分', 2, 7], ['愛媛', 3, 7], ['香川', 4, 7], ['和歌', 5, 7], ['三重', 6, 7], ['静岡', 8, 7], ['神奈', 9, 7], ['東京', 10, 7], ['千葉', 11, 7],
  ['長崎', 0, 8], ['熊本', 1, 8], ['宮崎', 2, 8], ['高知', 3, 8], ['徳島', 4, 8],
  ['鹿児', 1, 9], ['沖縄', 0, 11],
];
const tiles = (theme) =>
  TILES.map(([n, x, y]) =>
    n === '大阪'
      ? `<a class="tile here" href="/mihon/${theme}/sakai/" style="grid-column:${x + 1};grid-row:${y + 1}">${n}</a>`
      : `<span class="tile" style="grid-column:${x + 1};grid-row:${y + 1}">${n}</span>`,
  ).join('');

// 計算の動き（3案で共通。見た目は案ごとの CSS）
const CALC_JS = `(()=>{const c=document.getElementById('calc');if(!c)return;const per=JSON.parse(c.dataset.per);let n=+c.dataset.n,d=+c.dataset.d;const f=v=>Math.round(v).toLocaleString('ja-JP');
function draw(){c.querySelectorAll('[data-num]').forEach(e=>e.textContent=n);c.querySelectorAll('[data-day]').forEach(b=>{const on=+b.dataset.day===d;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
for(const k in per){c.querySelectorAll('[data-out="'+k+'"]').forEach(e=>e.textContent=f(per[k]*n*d));c.querySelectorAll('[data-max="'+k+'"]').forEach(e=>e.textContent=f(per[k]*n*7));c.querySelectorAll('[data-min="'+k+'"]').forEach(e=>e.textContent=f(per[k]*n*3))}
c.style.setProperty('--n',(n-1)/9);c.style.setProperty('--d',d/7)}
c.addEventListener('click',e=>{const s=e.target.closest('[data-step]'),y=e.target.closest('[data-day]'),r=e.target.closest('[data-nruler]');
if(s){n=Math.min(10,Math.max(1,n+ +s.dataset.step));draw()}else if(y){d=+y.dataset.day;draw()}else if(r){const b=r.getBoundingClientRect();n=Math.min(10,Math.max(1,Math.round((e.clientX-b.left)/b.width*9)+1));draw()}});draw();
const q=document.querySelector('[data-find]');if(q)q.addEventListener('submit',e=>{e.preventDefault();const v=q.querySelector('input').value;if(/堺/.test(v))location.href=q.dataset.to;else q.querySelector('[data-msg]').textContent='見本では堺市だけ見られます'})})();`;

function wrap(theme, { path, title, description, css, body }) {
  return `<!doctype html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(title)}｜${esc(SITE.name)}</title>
<meta name="description" content="${esc(description)}">
<meta name="robots" content="noindex">
<link rel="canonical" href="${SITE.url}${path}">
<style>${css.replace(/\n\s*/g, '')}</style>
</head>
<body class="${theme}">
${body}
<script>${CALC_JS}</script>
</body>
</html>
`;
}

// 共通の文
const T = {
  lead: '街の数字を調べて、わが家の備えの量を出す',
  src: '2025年国勢調査（2026年9月29日公表）・避難場所 10月22日取得',
  kokusei: '出典：総務省「令和7年国勢調査」を加工して作成（2025年10月1日現在・2026年9月29日公表）',
  hinanSrc: `「指定緊急避難場所データ」「指定避難所データ」（国土地理院）をもとにまちの社会科作成。堺市の更新 ${SAKAI.updated}・取得 ${FETCHED}`,
  notes: [
    '指定緊急避難場所は危険が迫ったときに逃げる所、指定避難所は家に戻れないときに過ごす所です。',
    'ここに載っていない場所が、無いとはかぎりません。',
    '最新は堺市の情報とハザードマップで確かめてください。',
  ],
  mihonNote: '見本の注：全国の中の位置・県内順位・となりの街は、データの仕組みができたら入ります',
};

function calcData(items) {
  const by = Object.fromEntries(items.items.map((it) => [it.id, it]));
  return {
    per: JSON.stringify({ mizu: by.mizu.per_day, shoku: by.shushoku.per_day, toilet: by['keitai-toilet'].per_day }),
    perText: `1人1日 水${by.mizu.per_day}L・${by.shushoku.per_day}食・トイレ${by['keitai-toilet'].per_day}回のめやす（農林水産省・内閣府）`,
    week: (id) => Math.round(by[id].per_day * Math.round(SAKAI.perHousehold * 10) / 10 * 7),
  };
}

function footer() {
  return `<footer class="ft"><p>${esc(ESTAT_CREDIT)}</p><p>出典：<a href="https://www.gsi.go.jp/bousaichiri/hinanbasho.html">国土地理院ウェブサイト</a></p><p><a href="/mihon/">3案のならび</a></p></footer>`;
}

const LINKS = `<a href="https://maps.gsi.go.jp/#13/34.573/135.483/&amp;base=std&amp;ls=std%7Cskhb04">地理院地図で避難場所を見る</a><a href="https://disaportal.gsi.go.jp/">ハザードマップポータルサイト</a><a href="https://www.city.sakai.lg.jp/">堺市のホームページ</a>`;

const S = (() => {
  const s = SAKAI;
  const ch = change(s.pop, s.pop2020);
  const chZ = change(ZENKOKU.pop, ZENKOKU.pop2020);
  return {
    ch,
    chZ,
    per: (Math.round(s.perHousehold * 10) / 10).toFixed(1),
    perZ: (Math.round(ZENKOKU.perHousehold * 10) / 10).toFixed(1),
    age65: pct(s.age65, s.pop),
    single: pct(s.single, s.general),
    kyodo: pct(s.kyodo, s.housed),
    with65: pct(s.with65, s.general),
    diff: s.pop2020 - s.pop,
  };
})();

// ===================== A 社会科の資料集と白地図 =====================
const CSS_A = `
:root{--ink:#22201e;--sub:#6d6863;--line:#d4cfc8;--red:#cf3328;--map:#e9eee6;--note:#f3f5f1;--bar:#3f6f62}
*{box-sizing:border-box}body{margin:0;background:#fff;color:var(--ink);font:16px/1.65 "Hiragino Kaku Gothic ProN","Hiragino Sans","Noto Sans JP",system-ui,sans-serif;-webkit-text-size-adjust:100%}
a{color:inherit}.pg{max-width:430px;margin:0 auto;padding:0 16px 24px;position:relative}
.hd{display:flex;align-items:baseline;justify-content:space-between;padding:10px 0 6px;border-bottom:2px solid var(--ink)}
.logo{font:700 19px/1.3 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;margin:0;text-decoration:none;letter-spacing:.06em}
.hd small{font-size:12px;color:var(--sub)}
.lead{margin:10px 0 12px;font-size:14px;color:var(--sub)}
.find{display:grid;grid-template-columns:auto 1fr auto;align-items:end;gap:10px;margin:0 0 18px}
.find label{font-size:13px;color:var(--sub);padding-bottom:9px}
.find input{font:inherit;font-size:18px;border:0;border-bottom:1.5px solid var(--ink);padding:8px 2px;background:none;width:100%;border-radius:0}
.find button{font:inherit;font-size:15px;background:none;border:0;border-bottom:1.5px solid var(--ink);padding:8px 2px;color:var(--ink)}
.msg{grid-column:1/-1;margin:0;font-size:13px;color:var(--red);min-height:0}
.calc{border-top:1px solid var(--ink);padding-top:10px}
.q{font:700 16px/1.4 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;margin:0 0 8px}
.q span{display:inline-block;border:1.5px solid var(--ink);padding:0 6px;margin-right:8px;font-size:13px}
.row{display:flex;align-items:center;gap:6px;min-height:52px;border-bottom:1px dotted var(--line)}
.k{width:3.2em;font-size:13px;color:var(--sub)}
.row button{font:inherit;background:none;border:0;color:var(--ink);min-width:44px;height:44px;font-size:24px;line-height:1}
.row b{font-size:26px;min-width:1.4em;text-align:center;font-variant-numeric:tabular-nums}
.day{position:relative;font-size:20px!important;padding:0 14px}
.day svg{position:absolute;inset:-4px -2px;width:calc(100% + 4px);height:calc(100% + 8px);opacity:0}
.day.on svg{opacity:1}.day.on{color:var(--red)!important}
.ans{margin:12px 0 4px;font-size:15px;line-height:2}
.ans b{font-size:24px;color:var(--red);font-variant-numeric:tabular-nums;margin:0 1px 0 4px}
.src{font-size:11px;color:var(--sub);margin:6px 0 0;line-height:1.5}
h2{font:700 15px/1.4 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;margin:26px 0 10px;display:flex;align-items:center;gap:8px}
h2 i{font-style:normal;font:700 22px/1 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;color:var(--bar);padding-right:2px}
.tiles{display:grid;grid-template-columns:repeat(13,1fr);gap:2px}
.tile{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:9px;border:1px solid #b9b3ab;background:#fff;text-decoration:none;color:var(--ink)}
.tile.here{background:var(--map);border-color:var(--ink);font-weight:700}
.shelf ul{margin:0;padding:0;list-style:none;columns:2;column-gap:16px}.shelf li{padding:6px 0;border-bottom:1px dotted var(--line);font-size:15px}
.tsume{position:absolute;right:0;top:62px;z-index:1;width:22px;background:var(--ink);color:#fff;font-size:12px;line-height:1.35;text-align:center;padding:8px 0}
.city{font:700 30px/1.2 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;margin:14px 0 6px}
.city small{font:400 13px system-ui,sans-serif;color:var(--sub);margin-left:10px}
.big{margin:0;font-size:15px}.big b{font-size:36px;letter-spacing:.01em;font-variant-numeric:tabular-nums;margin-right:2px}
.chg,.hh{margin:0;font-size:15px}.chg b,.hh b{font-variant-numeric:tabular-nums}
.feat{margin:10px 0;font-size:15px}.feat span{border-bottom:2px solid var(--red)}
.s1{margin:12px 0 4px;font-size:14px;line-height:1.7;padding:10px 0;border-top:1px solid var(--ink);border-bottom:1px solid var(--ink)}
.s1 b{color:var(--red);font-size:18px;white-space:nowrap}
.go{display:inline-block;margin:6px 0 2px;font-size:15px;font-weight:700}
.g{margin:0 0 14px}.g p{margin:0 0 4px;font-size:13px}.g p b{font-size:15px}
.bars{display:grid;grid-template-columns:3.5em 1fr 3.4em;align-items:center;gap:2px 8px;font-size:12px}.bars.w{grid-template-columns:6.5em 1fr 3.4em;gap:6px 8px}.bars.w span{white-space:nowrap}
.axis{position:relative;height:14px;border-left:1px solid var(--ink)}
.axis.mid{border-left:0}.axis.mid::before{content:"";position:absolute;left:50%;top:0;bottom:0;border-left:1px solid var(--ink)}
.axis span{position:absolute;top:2px;height:10px;background:var(--bar)}.axis span.z{background:#b8c4bf}
.num{text-align:right;font-variant-numeric:tabular-nums}
.share{height:14px;background:#e6e3de;position:relative}.share span{position:absolute;inset:0 auto 0 0;background:var(--bar)}
.mnote{font-size:11px;color:var(--sub);margin:4px 0 0}
.sonae{background:var(--note);margin:22px -16px 0;padding:2px 16px 18px}
.sonae h2{margin-top:18px}
.why{margin:0 0 10px;font-size:14px}.why a{font-weight:700}
.cnt{display:flex;gap:18px;margin:12px 0 8px}.cnt p{margin:0;font-size:12px;color:var(--sub)}.cnt b{display:block;font-size:26px;color:var(--ink);font-variant-numeric:tabular-nums}
.kinds{display:grid;grid-template-columns:7.5em 1fr 2.5em;gap:3px 8px;align-items:center;font-size:12px;margin:4px 0 12px}
.kinds i{display:block;height:8px;background:var(--bar)}
.notes{margin:0 0 10px;padding:0;list-style:none;font-size:12px;color:var(--sub)}.notes li{margin:0 0 3px}
.links{display:flex;flex-direction:column;gap:2px;font-size:14px;margin:0 0 8px}.links a{padding:6px 0}
details{border-top:1px dotted var(--line);border-bottom:1px dotted var(--line);font-size:14px}
summary{padding:10px 0;cursor:pointer}details p{margin:0 0 10px;font-size:12px;color:var(--sub)}
.ft{max-width:430px;margin:0 auto;padding:16px;font-size:11px;color:var(--sub);border-top:1px solid var(--line)}.ft p{margin:0 0 6px}
`;

const RED_CIRCLE = `<svg viewBox="0 0 100 50" preserveAspectRatio="none" aria-hidden="true"><path d="M8 27C6 12 40 4 64 6S97 18 93 30 60 47 36 45 4 38 10 22" fill="none" stroke="#cf3328" stroke-width="3" stroke-linecap="round" vector-effect="non-scaling-stroke"/></svg>`;

function topA(cd) {
  return `<div class="pg">
<header class="hd"><h1 class="logo">まちの社会科</h1><small>A 資料集と白地図</small></header>
<p class="lead">${T.lead}</p>
<form class="find" data-find data-to="/mihon/a/sakai/"><label for="q">市区町村</label><input id="q" type="search" placeholder="例 堺市" autocomplete="off"><button>さがす</button><p class="msg" data-msg></p></form>
<section id="calc" class="calc" data-per='${cd.per}' data-n="4" data-d="3">
<p class="q"><span>問</span>わが家の備えは、どれだけ？</p>
<div class="row"><span class="k">人数</span><button data-step="-1" aria-label="1人へらす">−</button><b data-num>4</b><span>人</span><button data-step="1" aria-label="1人ふやす">＋</button></div>
<div class="row"><span class="k">日数</span><button class="day on" data-day="3">3日${RED_CIRCLE}</button><button class="day" data-day="7">7日${RED_CIRCLE}</button></div>
<p class="ans">水<b data-out="mizu">36</b>L　食事<b data-out="shoku">36</b>食　携帯トイレ<b data-out="toilet">60</b>回分</p>
</section>
<p class="src">${cd.perText}<br>${T.src}</p>
<section class="map"><h2><i>1</i>都道府県から</h2><div class="tiles">${tiles('a')}</div></section>
<section class="shelf"><h2><i>2</i>備えの知識</h2><ul><li><a href="#calc">備蓄の量</a></li><li><a href="#calc">ローリングストック</a></li><li><a href="#calc">携帯トイレ</a></li><li><a href="#calc">家の外の備え</a></li></ul></section>
</div>
${footer()}`;
}

function sakaiA(cd) {
  const s = SAKAI;
  const w = (v, max) => `${Math.min(50, (Math.abs(v) / max) * 50)}%`;
  return `<div class="pg">
<header class="hd"><a class="logo" href="/mihon/a/">まちの社会科</a><small>A 資料集と白地図</small></header>
<div class="tsume">${[...s.pref].join('<br>')}</div>
<h1 class="city">${s.name}<small>${s.pref}</small></h1>
<p class="big"><b>${fmt(s.pop)}</b>人</p>
<p class="chg">2020年から <b>${fmt(S.diff)}</b>人へった（${S.ch}%）</p>
<p class="hh">世帯 <b>${fmt(s.households)}</b>・1世帯 <b>${S.per}</b>人</p>
<p class="feat"><span>世帯の4割がひとり暮らし</span></p>
<p class="s1">1世帯の平均人数（${S.per}人）で計算すると、1週間に 水 <b>約${cd.week('mizu')}L</b>・携帯トイレ <b>約${cd.week('keitai-toilet')}回分</b><br><a class="go" href="/mihon/a/#calc">わが家の人数で計算</a></p>
<p class="src">${T.kokusei}</p>
<h2><i>1</i>この街の数字</h2>
<div class="g"><p><b>人口の増減</b>　2020年から2025年</p><div class="bars">
<span>${s.name}</span><div class="axis mid"><span style="right:50%;width:${w(S.ch, 5)}"></span></div><span class="num">${S.ch}%</span>
<span>全国</span><div class="axis mid"><span class="z" style="right:50%;width:${w(S.chZ, 5)}"></span></div><span class="num">${S.chZ}%</span></div></div>
<div class="g"><p><b>1世帯の人数</b></p><div class="bars">
<span>${s.name}</span><div class="axis"><span style="left:0;width:${(S.per / 3) * 100}%"></span></div><span class="num">${S.per}人</span>
<span>全国</span><div class="axis"><span class="z" style="left:0;width:${(S.perZ / 3) * 100}%"></span></div><span class="num">${S.perZ}人</span></div></div>
<div class="g"><div class="bars w">
<span>65歳以上</span><div class="share"><span style="width:${S.age65}%"></span></div><span class="num">${S.age65}%</span>
<span>ひとり暮らし</span><div class="share"><span style="width:${S.single}%"></span></div><span class="num">${S.single}%</span>
<span>共同住宅</span><div class="share"><span style="width:${S.kyodo}%"></span></div><span class="num">${S.kyodo}%</span></div>
<p class="mnote">65歳以上は人口のうち、ひとり暮らしと共同住宅は世帯のうち</p></div>
<p class="src">${T.kokusei}</p>
<p class="mnote">${T.mihonNote}</p>
<section class="sonae"><h2><i>2</i>この街の備え</h2>
<p class="why">世帯の4割がひとり暮らし。<a href="#">ひとり暮らしの備え</a></p>
<p class="why">世帯の半分が共同住宅。<a href="#">マンションのトイレ</a></p>
<div class="cnt"><p>指定緊急避難場所<b>${s.basho}</b></p><p>指定避難所<b>${s.hinanjo}</b></p></div>
<div class="kinds">${s.kinds.map(([k, v]) => `<span>${k}</span><i style="width:${(v / s.basho) * 100}%"></i><span class="num">${v}</span>`).join('')}</div>
<ul class="notes">${T.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
<div class="links">${LINKS}</div>
<details><summary>${s.basho}か所の一覧を開く</summary><p>見本：開いたときに、この街の一覧を読み込みます</p></details>
<p class="src">${T.hinanSrc}</p>
</section>
</div>
${footer()}`;
}

// ===================== B ものさしの目盛り =====================
const CSS_B = `
:root{--ink:#111;--sub:#666;--red:#d7261e;--paper:#fff;--soft:#f2f2f0}
*{box-sizing:border-box}body{margin:0;background:var(--paper);color:var(--ink);font:16px/1.6 "Helvetica Neue","Hiragino Sans","Noto Sans JP",system-ui,sans-serif;-webkit-text-size-adjust:100%}
a{color:inherit}.pg{max-width:430px;margin:0 auto;padding:0 16px 24px}
.hd{display:flex;justify-content:space-between;align-items:center;padding:10px 0 12px;background:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='10'%3E%3Cpath d='M0.5 10V6' stroke='%23111'/%3E%3C/svg%3E") repeat-x 0 100%/10px 10px,url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='50' height='10'%3E%3Cpath d='M0.5 10V1' stroke='%23111'/%3E%3C/svg%3E") repeat-x 0 100%/50px 10px;border-bottom:1px solid var(--ink)}
.logo{font-weight:800;font-size:18px;margin:0;text-decoration:none;letter-spacing:.04em}.hd small{font-size:12px;color:var(--sub)}
.lead{margin:10px 0 12px;font-size:14px;color:var(--sub)}
.find{display:flex;gap:8px;align-items:center;margin:0 0 4px;flex-wrap:wrap}
.find label{font-size:12px;color:var(--sub);width:100%}
.find input{flex:1;font:inherit;font-size:18px;border:1px solid var(--ink);border-radius:0;padding:9px 10px;background:#fff;min-width:0}
.find button{font:inherit;font-size:15px;font-weight:700;background:var(--ink);color:#fff;border:0;padding:11px 14px;border-radius:0}
.msg{margin:0;width:100%;font-size:13px;color:var(--red)}
.calc{margin-top:12px}
.lab{display:flex;justify-content:space-between;align-items:baseline;font-size:12px;color:var(--sub);margin-top:10px}
.lab b{font-size:24px;color:var(--ink);font-variant-numeric:tabular-nums}
.rl{display:flex;align-items:center;gap:4px}
.rl button.st{font:inherit;font-size:22px;background:none;border:0;width:44px;height:44px;color:var(--ink);flex:none}
.ruler{position:relative;flex:1;height:44px;cursor:pointer}
.ruler svg{position:absolute;inset:0;width:100%;height:30px}
.mk{position:absolute;bottom:0;width:0;height:0;border:7px solid transparent;border-bottom:11px solid var(--red);transform:translateX(-7px);transition:left .15s}
.days{position:relative;height:56px;margin:0 48px}.days .day.end{transform:translateX(-80%)}
.days svg{position:absolute;left:0;right:0;top:0;width:100%;height:24px}
.day{position:absolute;top:18px;transform:translateX(-50%);white-space:nowrap;font:inherit;font-size:17px;background:none;border:0;padding:6px 8px 16px;color:var(--sub)}
.day.on{color:var(--ink);font-weight:700}.day.on::after{content:"";position:absolute;left:50%;bottom:0;border:6px solid transparent;border-bottom:10px solid var(--red);transform:translateX(-6px)}
.res{margin:10px 0 0;border-top:1px solid var(--ink)}
.r{display:grid;grid-template-columns:5.5em 1fr;align-items:end;gap:0 10px;padding:8px 0 2px}
.r span{font-size:13px}.r b{font-size:24px;font-variant-numeric:tabular-nums;color:var(--red)}
.need{grid-column:1/-1;position:relative;height:24px;margin-top:2px}
.need svg{position:absolute;inset:0;width:100%;height:14px}
.need i{position:absolute;top:0;height:3px;left:0;width:calc(var(--d)*100%);background:var(--red);transition:width .15s}
.need .t{position:absolute;top:13px;font-size:10px;color:var(--sub);transform:translateX(-50%);white-space:nowrap}.need .t.end{transform:translateX(-100%)}
.src{font-size:11px;color:var(--sub);margin:8px 0 0;line-height:1.5}
h2{font-size:14px;font-weight:800;margin:28px 0 8px;letter-spacing:.04em;display:flex;align-items:center;gap:8px}h2::after{content:"";flex:1;border-top:1px solid var(--ink)}
.tiles{display:grid;grid-template-columns:repeat(13,1fr);gap:0;border-top:1px solid var(--ink);border-left:1px solid var(--ink);width:max-content;max-width:100%}
.tile{width:26px;height:26px;display:flex;align-items:center;justify-content:center;font-size:9px;border-right:1px solid var(--ink);border-bottom:1px solid var(--ink);text-decoration:none;color:var(--ink);background:#fff}
.tile.here{background:var(--red);color:#fff;font-weight:700}
.shelf ul{margin:0;padding:0;list-style:none}.shelf li{border-bottom:1px solid #ddd;padding:7px 0;font-size:15px}
.crumb{font-size:12px;color:var(--sub);margin:10px 0 0}
.city{font-size:30px;font-weight:800;margin:0;letter-spacing:.02em}
.big{margin:2px 0 0;font-size:14px}.big b{font-size:38px;font-variant-numeric:tabular-nums;letter-spacing:-.01em;margin-right:2px}
.chg,.hh{margin:0;font-size:14px}.chg b,.hh b{font-variant-numeric:tabular-nums}
.feat{margin:10px 0 0;font-size:15px;font-weight:700}
.s1{margin:10px 0 0;padding:10px 0;border-top:1px solid var(--ink);font-size:14px}.s1 b{font-size:19px;color:var(--red);white-space:nowrap}
.go{display:inline-block;margin-top:4px;font-weight:700}
.m{margin:0 0 14px}.m p{margin:0;display:flex;justify-content:space-between;font-size:13px}.m p b{font-variant-numeric:tabular-nums}
.gauge{position:relative;height:60px}.gauge svg{position:absolute;left:0;right:0;top:18px;width:100%;height:20px}
.sl,.sr{position:absolute;top:40px;font-size:10px;color:var(--sub)}.sl{left:0}.sr{right:0}
.pin{position:absolute;top:36px;transform:translateX(-50%);font-size:10px;white-space:nowrap;text-align:center;line-height:1.2}
.pin.up{top:0}.pin.up::before{display:none}.pin.up::after{content:"";display:block;margin:1px auto 0;width:0;height:0;border:5px solid transparent;border-top:7px solid var(--ink);border-bottom:0}
.pin::before{content:"";display:block;margin:0 auto 1px;width:0;height:0;border:5px solid transparent;border-bottom:8px solid var(--ink);border-top:0}
.pin.me{color:var(--red);font-weight:700}.pin.me::before{border-bottom-color:var(--red)}
.mnote{font-size:11px;color:var(--sub);margin:4px 0 0}
.sonae{background:var(--soft);margin:24px -16px 0;padding:2px 16px 18px}
.why{margin:0 0 8px;font-size:14px}.why a{font-weight:700}
.cnt{display:flex;gap:24px;margin:10px 0 6px}.cnt p{margin:0;font-size:12px}.cnt b{display:block;font-size:28px;font-variant-numeric:tabular-nums}
.kinds{margin:0 0 12px;font-size:12px}.kinds div{display:grid;grid-template-columns:6.5em 1fr 2.5em;align-items:center;gap:8px;height:20px}
.kinds i{height:9px;background:repeating-linear-gradient(90deg,var(--ink) 0 1px,transparent 1px 4px)}.kinds .num{text-align:right;font-variant-numeric:tabular-nums}
.notes{margin:0 0 10px;padding:0;list-style:none;font-size:12px;color:var(--sub)}.notes li{margin:0 0 3px}
.links{display:flex;flex-direction:column;font-size:14px;margin:0 0 8px}.links a{padding:6px 0}
details{border-top:1px solid var(--ink);border-bottom:1px solid var(--ink);font-size:14px}summary{padding:10px 0;cursor:pointer}details p{margin:0 0 10px;font-size:12px;color:var(--sub)}
.ft{max-width:430px;margin:0 auto;padding:16px;font-size:11px;color:var(--sub);border-top:1px solid var(--ink)}.ft p{margin:0 0 6px}
`;

// 目盛りの SVG（幅360で描いて、横いっぱいに伸ばす。文字は入れない）
function ticks(n, majorEvery, h = 24) {
  let p = '';
  for (let i = 0; i <= n; i++) {
    const x = (i / n) * 359 + 0.5;
    const major = i % majorEvery === 0;
    p += `M${x.toFixed(1)} 0V${major ? h * 0.6 : h * 0.3}`;
  }
  return `<svg viewBox="0 0 360 ${h}" preserveAspectRatio="none" aria-hidden="true"><path d="M0 0.5H360${p}" stroke="#111" stroke-width="1" fill="none" vector-effect="non-scaling-stroke"/></svg>`;
}

function gauge({ min, max, step, major, marks, ends }) {
  const n = Math.round((max - min) / step);
  const pos = (v) => `${((v - min) / (max - min)) * 100}%`;
  return `<div class="gauge">${ticks(n, major, 20)}<span class="sl">${ends[0]}</span><span class="sr">${ends[1]}</span>${marks.map((m) => `<span class="pin${m.me ? ' me' : ' up'}" style="left:${pos(m.v)}">${m.label}</span>`).join('')}</div>`;
}

function topB(cd) {
  const nt = (i) => `<span class="t${i === 7 ? ' end' : ''}" style="left:${(i / 7) * 100}%">${i === 3 ? '3日' : '7日'}</span>`;
  return `<div class="pg">
<header class="hd"><h1 class="logo">まちの社会科</h1><small>B ものさし</small></header>
<p class="lead">${T.lead}</p>
<form class="find" data-find data-to="/mihon/b/sakai/"><label for="q">市区町村</label><input id="q" type="search" placeholder="例 堺市" autocomplete="off"><button>さがす</button><p class="msg" data-msg></p></form>
<section id="calc" class="calc" data-per='${cd.per}' data-n="4" data-d="3">
<p class="lab">人数<b><span data-num>4</span>人</b></p>
<div class="rl"><button class="st" data-step="-1" aria-label="1人へらす">−</button><div class="ruler" data-nruler>${ticks(9, 1, 30)}<span class="mk" style="left:calc(var(--n)*100%)"></span></div><button class="st" data-step="1" aria-label="1人ふやす">＋</button></div>
<p class="lab">日数</p>
<div class="days">${ticks(7, 7)}<button class="day on" data-day="3" style="left:${(3 / 7) * 100}%">3日</button><button class="day end" data-day="7" style="left:100%">7日</button></div>
<div class="res">
<div class="r"><span>水</span><span><b data-out="mizu">36</b> L</span><div class="need">${ticks(7, 7, 14)}<i></i>${nt(3)}${nt(7)}</div></div>
<div class="r"><span>食事</span><span><b data-out="shoku">36</b> 食</span><div class="need">${ticks(7, 7, 14)}<i></i>${nt(3)}${nt(7)}</div></div>
<div class="r"><span>携帯トイレ</span><span><b data-out="toilet">60</b> 回分</span><div class="need">${ticks(7, 7, 14)}<i></i>${nt(3)}${nt(7)}</div></div>
</div>
</section>
<p class="src">${cd.perText}<br>${T.src}</p>
<section class="map"><h2>都道府県から</h2><div class="tiles">${tiles('b')}</div></section>
<section class="shelf"><h2>備えの知識</h2><ul><li><a href="#calc">備蓄の量</a></li><li><a href="#calc">ローリングストック</a></li><li><a href="#calc">携帯トイレ</a></li><li><a href="#calc">家の外の備え</a></li></ul></section>
</div>
${footer()}`;
}

function sakaiB(cd) {
  const s = SAKAI;
  return `<div class="pg">
<header class="hd"><a class="logo" href="/mihon/b/">まちの社会科</a><small>B ものさし</small></header>
<p class="crumb">${s.pref}</p>
<h1 class="city">${s.name}</h1>
<p class="big"><b>${fmt(s.pop)}</b>人</p>
<p class="chg">2020年から <b>${fmt(S.diff)}</b>人へった（${S.ch}%）</p>
<p class="hh">世帯 <b>${fmt(s.households)}</b>・1世帯 <b>${S.per}</b>人</p>
<p class="feat">世帯の4割がひとり暮らし</p>
<p class="s1">1世帯の平均人数（${S.per}人）で計算すると、1週間に 水 <b>約${cd.week('mizu')}L</b>・携帯トイレ <b>約${cd.week('keitai-toilet')}回分</b><br><a class="go" href="/mihon/b/#calc">わが家の人数で計算</a></p>
<p class="src">${T.kokusei}</p>
<h2>この街の数字</h2>
<div class="m"><p><span>人口の増減　2020年から2025年</span></p>${gauge({ min: -10, max: 10, step: 1, major: 5, ends: ['-10%', '+10%'], marks: [{ v: S.chZ, label: `全国 ${S.chZ}%` }, { v: S.ch, label: `${s.name} ${S.ch}%`, me: true }] })}</div>
<div class="m"><p><span>1世帯の人数</span></p>${gauge({ min: 1.5, max: 3, step: 0.1, major: 5, ends: ['1.5人', '3.0人'], marks: [{ v: S.perZ, label: `全国 ${S.perZ}人` }, { v: S.per, label: `${s.name} ${S.per}人`, me: true }] })}</div>
<div class="m"><p><span>65歳以上の人</span><b>${S.age65}%</b></p>${gauge({ min: 0, max: 100, step: 5, major: 2, ends: ['0%', '100%'], marks: [{ v: S.age65, label: `${S.age65}%`, me: true }] })}</div>
<div class="m"><p><span>ひとり暮らしの世帯</span><b>${S.single}%</b></p>${gauge({ min: 0, max: 100, step: 5, major: 2, ends: ['0%', '100%'], marks: [{ v: S.single, label: `${S.single}%`, me: true }] })}</div>
<div class="m"><p><span>共同住宅に住む世帯</span><b>${S.kyodo}%</b></p>${gauge({ min: 0, max: 100, step: 5, major: 2, ends: ['0%', '100%'], marks: [{ v: S.kyodo, label: `${S.kyodo}%`, me: true }] })}</div>
<p class="src">${T.kokusei}</p>
<p class="mnote">${T.mihonNote}</p>
<section class="sonae"><h2>この街の備え</h2>
<p class="why">世帯の4割がひとり暮らし。<a href="#">ひとり暮らしの備え</a></p>
<p class="why">世帯の半分が共同住宅。<a href="#">マンションのトイレ</a></p>
<div class="cnt"><p>指定緊急避難場所<b>${s.basho}</b></p><p>指定避難所<b>${s.hinanjo}</b></p></div>
<div class="kinds">${s.kinds.map(([k, v]) => `<div><span>${k}</span><i style="width:${(v / s.basho) * 100}%"></i><span class="num">${v}</span></div>`).join('')}</div>
<ul class="notes">${T.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
<div class="links">${LINKS}</div>
<details><summary>${s.basho}か所の一覧を開く</summary><p>見本：開いたときに、この街の一覧を読み込みます</p></details>
<p class="src">${T.hinanSrc}</p>
</section>
</div>
${footer()}`;
}

// ===================== C 冷蔵庫に貼る家族の防災メモ =====================
const CSS_C = `
:root{--door:#e4e8ea;--ink:#2a2a2a;--sub:#6c7275;--red:#c9372c;--blue:#2a5aa8;--rule:#dbe4ee;--tag:#fdf1a6}
*{box-sizing:border-box}body{margin:0;background:var(--door);color:var(--ink);font:16px/1.7 "Hiragino Maru Gothic ProN","Hiragino Maru Gothic Pro","BIZ UDPGothic","Noto Sans JP",system-ui,sans-serif;-webkit-text-size-adjust:100%}
a{color:var(--blue)}.pg{max-width:430px;margin:0 auto;padding:0 14px 24px}
.hd{display:flex;justify-content:space-between;align-items:center;padding:10px 2px 6px}
.logo{font-size:18px;font-weight:700;margin:0;color:var(--ink);text-decoration:none}.hd small{font-size:12px;color:var(--sub)}
.paper{position:relative;background:#fff;padding:22px 16px 14px;margin:14px 0;background-image:repeating-linear-gradient(transparent 0 31px,var(--rule) 31px 32px);background-position:0 18px}
.paper.tilt{transform:rotate(-.6deg)}.paper.tilt2{transform:rotate(.5deg)}
.mg{position:absolute;top:-9px;left:50%;width:22px;height:22px;margin-left:-11px;border-radius:50%;background:var(--red);box-shadow:0 2px 2px rgba(0,0,0,.3),inset 0 -3px 0 rgba(0,0,0,.15)}
.mg.b{background:var(--blue)}.mg.g{background:#3d8a5c}.mg.y{background:#e3b52e}
.ttl{font-size:17px;font-weight:700;margin:0 0 4px}
.lead{margin:0 0 4px;font-size:13px;color:var(--sub)}
.find{display:flex;align-items:flex-end;gap:8px;flex-wrap:wrap}
.find label{font-size:15px}
.find input{flex:1;min-width:0;font:inherit;font-size:19px;border:0;border-bottom:2px solid var(--ink);background:none;padding:2px 4px;border-radius:0;color:var(--blue)}
.find button{font:inherit;font-size:15px;background:none;border:0;color:var(--blue);text-decoration:underline;padding:4px}
.msg{margin:0;width:100%;font-size:13px;color:var(--red)}
.row{display:flex;align-items:center;gap:4px;min-height:52px;font-size:17px}
.row .k{width:3em}
.row button{font:inherit;background:none;border:0;color:var(--ink);min-width:44px;height:44px;font-size:26px;line-height:1}
.row b{font-size:28px;color:var(--blue);min-width:1.2em;text-align:center}
.day{position:relative;font-size:19px!important;padding:0 16px}
.day.on::before{content:"";position:absolute;left:50%;top:50%;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:var(--red);opacity:.9;box-shadow:0 2px 2px rgba(0,0,0,.3),inset 0 -3px 0 rgba(0,0,0,.15);z-index:0}
.day span{position:relative;z-index:1}.day.on span{color:#fff;font-weight:700}
.list{margin:6px 0 0;padding:0;list-style:none;font-size:17px}
.list li{height:32px;display:flex;align-items:baseline;gap:6px}
.list b{font-size:24px;color:var(--blue)}
.src{font-size:11px;color:var(--sub);margin:6px 2px 0;line-height:1.5}
.sheet{background:#fff;margin:16px 0;padding:14px 14px 12px;position:relative}
.sheet h2{font-size:15px;margin:0 0 8px}
.tiles{display:grid;grid-template-columns:repeat(13,1fr);gap:2px}
.tile{aspect-ratio:1;display:flex;align-items:center;justify-content:center;font-size:9px;border:1px solid #c5ccd0;color:var(--ink);text-decoration:none}
.tile.here{background:var(--tag);border-color:var(--ink);font-weight:700}
.shelf ul{margin:0;padding:0;list-style:none}.shelf li{font-size:15px;padding:5px 0}
.shelf li::before{content:"";display:inline-block;width:14px;height:14px;border:2px solid var(--ink);margin-right:8px;vertical-align:-2px}
.city{font-size:30px;margin:0;line-height:1.3}.city small{font-size:13px;color:var(--sub);margin-left:8px}
.big{margin:0;font-size:15px}.big b{font-size:36px;color:var(--blue)}
.chg,.hh{margin:0;font-size:15px}
.tag{position:absolute;right:-6px;top:58px;width:118px;background:var(--tag);padding:10px 10px;font-size:14px;line-height:1.5;transform:rotate(3deg)}
.s1{font-size:15px;margin:10px 0 0;line-height:2}.s1 b{color:var(--red);font-size:19px;white-space:nowrap}
.go{font-weight:700}
.m{margin:0 0 10px;font-size:13px}.m p{margin:0;display:flex;justify-content:space-between}
.mk{height:12px;background:#eef1f3;position:relative;margin-top:2px}.mk span{position:absolute;inset:0 auto 0 0;background:var(--blue);opacity:.8}
.mk.z span{background:#9aa6ad}
.mnote{font-size:11px;color:var(--sub);margin:4px 0 0}
.why{margin:0 0 6px;font-size:15px}
.why::before{content:"";display:inline-block;width:14px;height:14px;border:2px solid var(--ink);margin-right:8px;vertical-align:-2px}
.cnt{display:flex;gap:22px;margin:10px 0 4px}.cnt p{margin:0;font-size:13px}.cnt b{display:block;font-size:28px;color:var(--blue)}
.kinds{font-size:13px;margin:4px 0 10px;display:flex;flex-wrap:wrap;gap:2px 14px}.kinds b{color:var(--blue)}
.notes{margin:0 0 8px;padding:0;list-style:none;font-size:12px;color:var(--sub)}
.links{display:flex;flex-direction:column;font-size:14px}.links a{padding:6px 0}
details{font-size:14px;border-top:1px dashed #b7c0c5;margin-top:8px}summary{padding:10px 0;cursor:pointer}details p{margin:0 0 10px;font-size:12px;color:var(--sub)}
.ft{max-width:430px;margin:0 auto;padding:16px;font-size:11px;color:var(--sub)}.ft p{margin:0 0 6px}.ft a{color:var(--sub)}
`;

function topC(cd) {
  return `<div class="pg">
<header class="hd"><h1 class="logo">まちの社会科</h1><small>C 冷蔵庫のメモ</small></header>
<div class="paper tilt"><span class="mg b"></span>
<form class="find" data-find data-to="/mihon/c/sakai/"><label for="q">うちの街</label><input id="q" type="search" placeholder="例 堺市" autocomplete="off"><button>さがす</button><p class="msg" data-msg></p></form>
</div>
<div class="paper tilt2" id="calc" data-per='${cd.per}' data-n="4" data-d="3"><span class="mg"></span>
<p class="ttl">うちの備え</p>
<div class="row"><span class="k">人数</span><button data-step="-1" aria-label="1人へらす">−</button><b data-num>4</b><span>人</span><button data-step="1" aria-label="1人ふやす">＋</button></div>
<div class="row"><span class="k">日数</span><button class="day on" data-day="3"><span>3日</span></button><button class="day" data-day="7"><span>7日</span></button></div>
<ul class="list"><li>水<b data-out="mizu">36</b>L</li><li>食事<b data-out="shoku">36</b>食</li><li>携帯トイレ<b data-out="toilet">60</b>回分</li></ul>
</div>
<p class="src">${cd.perText}<br>${T.src}</p>
<section class="sheet map"><span class="mg g"></span><h2>都道府県から</h2><div class="tiles">${tiles('c')}</div></section>
<section class="sheet shelf"><span class="mg y"></span><h2>備えの知識</h2><ul><li><a href="#calc">備蓄の量</a></li><li><a href="#calc">ローリングストック</a></li><li><a href="#calc">携帯トイレ</a></li><li><a href="#calc">家の外の備え</a></li></ul></section>
</div>
${footer()}`;
}

function sakaiC(cd) {
  const s = SAKAI;
  const bar = (v, max, z) => `<div class="mk${z ? ' z' : ''}"><span style="width:${(v / max) * 100}%"></span></div>`;
  return `<div class="pg">
<header class="hd"><a class="logo" href="/mihon/c/">まちの社会科</a><small>C 冷蔵庫のメモ</small></header>
<div class="paper tilt2"><span class="mg b"></span>
<h1 class="city">${s.name}<small>${s.pref}</small></h1>
<p class="big"><b>${fmt(s.pop)}</b>人</p>
<p class="chg">2020年から${fmt(S.diff)}人へった（${S.ch}%）</p>
<p class="hh">世帯 ${fmt(s.households)}・1世帯 ${S.per}人</p>
<div class="tag">世帯の4割が<br>ひとり暮らし</div>
<p class="s1">1世帯の平均人数（${S.per}人）で計算すると、1週間に 水 <b>約${cd.week('mizu')}L</b>・携帯トイレ <b>約${cd.week('keitai-toilet')}回分</b><br><a class="go" href="/mihon/c/#calc">わが家の人数で計算</a></p>
</div>
<p class="src">${T.kokusei}</p>
<section class="sheet"><span class="mg g"></span><h2>この街の数字</h2>
<div class="m"><p><span>人口の増減（2020年から2025年）</span></p><p><span>${s.name} ${S.ch}%</span><span>全国 ${S.chZ}%</span></p></div>
<div class="m"><p><span>1世帯の人数</span><span>${s.name} ${S.per}人・全国 ${S.perZ}人</span></p></div>
<div class="m"><p><span>65歳以上の人</span><b>${S.age65}%</b></p>${bar(S.age65, 100)}</div>
<div class="m"><p><span>ひとり暮らしの世帯</span><b>${S.single}%</b></p>${bar(S.single, 100)}</div>
<div class="m"><p><span>共同住宅に住む世帯</span><b>${S.kyodo}%</b></p>${bar(S.kyodo, 100)}</div>
<p class="mnote">${T.mihonNote}</p>
</section>
<div class="paper tilt"><span class="mg"></span>
<h2 class="ttl">この街の備え</h2>
<p class="why">ひとり暮らしが4割　<a href="#">ひとり暮らしの備え</a></p>
<p class="why">共同住宅が半分　<a href="#">マンションのトイレ</a></p>
<div class="cnt"><p>指定緊急避難場所<b>${s.basho}</b></p><p>指定避難所<b>${s.hinanjo}</b></p></div>
<div class="kinds">${s.kinds.map(([k, v]) => `<span>${k} <b>${v}</b></span>`).join('')}</div>
<ul class="notes">${T.notes.map((n) => `<li>${n}</li>`).join('')}</ul>
<div class="links">${LINKS}</div>
<details><summary>${s.basho}か所の一覧を開く</summary><p>見本：開いたときに、この街の一覧を読み込みます</p></details>
</div>
<p class="src">${T.hinanSrc}</p>
</div>
${footer()}`;
}

// ===================== ならび =====================
const CSS_I = `
*{box-sizing:border-box}body{margin:0;background:#fff;color:#222;font:16px/1.7 system-ui,"Hiragino Sans","Noto Sans JP",sans-serif}
.pg{max-width:430px;margin:0 auto;padding:16px}h1{font-size:20px;margin:0 0 4px}p{margin:0 0 12px;font-size:14px;color:#555}
ol{margin:0;padding:0 0 0 1.4em}li{margin:0 0 16px}li b{display:block;font-size:17px;color:#222}li a{display:inline-block;margin-right:18px;padding:6px 0;color:#222}
.ft{max-width:430px;margin:0 auto;padding:16px;font-size:11px;color:#777;border-top:1px solid #ddd}.ft p{margin:0 0 6px}.ft a{color:#777}
`;

export function mihonPages(items) {
  const cd = calcData(items);
  const desc = '見本のページ（デザインの案くらべ用）';
  const out = [];
  const themes = [
    ['a', 'A 社会科の資料集と白地図', CSS_A, topA, sakaiA],
    ['b', 'B ものさしの目盛り', CSS_B, topB, sakaiB],
    ['c', 'C 冷蔵庫に貼る家族の防災メモ', CSS_C, topC, sakaiC],
  ];
  for (const [t, name, css, top, sakai] of themes) {
    out.push({ path: `/mihon/${t}/`, html: wrap(t, { path: `/mihon/${t}/`, title: `見本 ${name}`, description: desc, css, body: top(cd) }) });
    out.push({ path: `/mihon/${t}/sakai/`, html: wrap(t, { path: `/mihon/${t}/sakai/`, title: `見本 ${name} 堺市`, description: desc, css, body: sakai(cd) }) });
  }
  const list = themes
    .map(([t, name]) => `<li><b>${name}</b><a href="/mihon/${t}/">トップ</a><a href="/mihon/${t}/sakai/">堺市のページ</a></li>`)
    .join('');
  out.push({
    path: '/mihon/',
    html: wrap('i', {
      path: '/mihon/',
      title: '見本 デザインの3案',
      description: desc,
      css: CSS_I,
      body: `<div class="pg"><h1>デザインの3案</h1><p>中身は3案とも同じです。堺市の数字は国勢調査から取って、公式の発表と照らし合わせたもの。</p><ol>${list}</ol></div>${footer()}`,
    }),
  });
  return out;
}
