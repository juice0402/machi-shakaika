// まなびプリント（/dougu/manabi/、夜のメモ #34）：街の数字を読む A4縦のプリント
//   A「1つの街を読む」を3段階（小学生・中学生・高校生以上）。「答えもつける」で2枚目に答えと考え方
//   作り方は /dougu/karte/ と同じ：紙はページを作るときとブラウザで同じ関数（src/manabi-core.mjs を toString で入れる）、
//   街の数字は /kurabe/kazu.json を街をえらんだときだけ読む、入れたものは URL の ? とこの端末におぼえるだけ。印刷は /dougu/print/ と同じ。AdSense なし
//   B「2つの街をくらべる」（#35）も、街のえらび方・段階・答えの2枚目・印刷は同じ。B の人口密度と一戸建ての割合は
//   kazu.json に入れず（100KBまで）、/dougu/manabi/b.json を B をえらんだときだけ読む。小学生のカードは /kurabe/card.js を読む
import { esc, h2, fit, srcKokusei, srcName, jpDate, TREES, RIVER, HAN, MINCHO, GOTHIC } from '../layout.mjs';
import { SITE, ESTAT_CREDIT } from '../site.mjs';
import * as MB from '../manabi-core.mjs';
import { findForm, PICK_JS, cardScript } from './kurabe.mjs';

export const MANABI_PATH = '/dougu/manabi/';
const CORE = Object.values(MB)
  .filter((f) => typeof f === 'function')
  .map((f) => f.toString())
  .join('\n');

const W = 635; // 木の帯：/dougu/print/ と同じ（A4 の幅へ）
const band = (id) => TREES(id).replace('viewBox="0 0 390 24"', `viewBox="0 0 ${W} 24"`).replace('<rect width="390"', `<rect width="${W}"`);
const HM = h2('x').match(/<svg[^]*?<\/svg>/)[0];
export const GRADES = [
  ['s', '小学生'],
  ['c', '中学生'],
  ['h', '高校生以上'],
];
const DEF = '40130'; // えらぶ前に見せる街（福岡市）
export const KINDS = [
  ['a', '1つの街'],
  ['b', '2つの街'],
];
export const MANABI_B_PATH = '/dougu/manabi/b.json';

// B の数字（/dougu/manabi/b.json）：{ 市区町村コード: [人口密度×10, 一戸建てに住む世帯の割合×10] }
export function manabiBData(list) {
  return Object.fromEntries(list.map((a) => [a.code, [Math.round(a.density * 10), a.housed ? Math.round((a.ikkodate / a.housed) * 1000) : 0]]));
}

// B の中学生の「家の備え」の問いの1文と出典（data/sources.yml の千葉県のマンション防災のページ）
const MANSION_SRC = 'chiba-pref-mansion';

export function manabiConf({ munis, list, nat, sources }) {
  const ms = sources.sources.find((s) => s.id === MANSION_SRC);
  if (!ms) throw new Error(`まなびプリントの出典 ${MANSION_SRC} が data/sources.yml にない`);
  const pops = list.map((a) => a.pop).sort((a, b) => a - b);
  const z = munis.areas['00000'];
  const sum = (k) => list.reduce((s, a) => s + (a[k] || 0), 0);
  return {
    kinds: KINDS.map((k) => k[0]),
    // ikko は市区町村の合計から、dens は全国の行（全国の人口と面積から）
    nat: { ...nat, pop: z.pop, popMid: pops[Math.floor(pops.length / 2)], count: list.length, ikko: Math.round((sum('ikkodate') / sum('housed')) * 1000) / 10, dens: z.density },
    // 横顔の物差し（全国のどの街も入る、きりのいい数）
    prof: { popLo: 2, popHi: 7, p014Hi: 30, perLo: 1, perHi: 4 },
    col: { ink: '#23312a', sub: '#5f6e66', bar: '#4f8d5e', water: '#3f8fbf', track: '#e6efe8', num: '#2f6b45', num2: '#2b6f99' },
    mansion: { why: 'マンションは停電でポンプの給水が止まることがあります。', src: `出典：${srcName(ms)}` },
    bUrl: MANABI_B_PATH,
    cardUrl: `/kurabe/card.js?v=${cardScript({ munis }).v}`,
    year: Number(String(munis.survey).slice(0, 4)),
    statName: `${munis.statName}`,
    survey: jpDate(munis.survey),
    src: `出典：総務省「${esc(munis.statName)}」を加工して作成（${jpDate(munis.survey)}現在・${jpDate(munis.published)}公表）`,
    credit: esc(ESTAT_CREDIT),
    host: SITE.url.replace('https://', ''),
    site: SITE.name,
    band: band('mb1'),
    band2: band('mb2'),
    river: RIVER,
    hm: HM,
  };
}

// 紙の中の見た目（.sheet の中だけ。クラスは mb- から始めてサイトの CSS とぶつけない）。A4 は 794×1123px
const S = '.sheet';
const SHEET_CSS = `.sheetwrap{margin:12px 0 4px;border:1px solid var(--line);overflow:hidden;background:#fff}
.sheets{width:210mm;transform-origin:0 0}
${S}{width:210mm;height:297mm;padding:5mm 14mm 0;display:flex;flex-direction:column;overflow:hidden;background:#fff;color:var(--ink);font:14.5px/1.55 ${GOTHIC};-webkit-print-color-adjust:exact;print-color-adjust:exact}
${S}+${S}{border-top:1px solid var(--line)}
${S}>*{flex-shrink:0}${S} p{margin:0}${S} svg text{font-family:${GOTHIC}}
${S} .mb-band{display:block;margin:0 -14mm;line-height:0}${S} .mb-band svg{display:block;width:100%;height:30px}
${S} .mb-ttl{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:14px 0 0}
${S} .mb-h1{font:700 31px/1.2 ${MINCHO};letter-spacing:.04em;white-space:nowrap;overflow:hidden;text-overflow:clip}
${S} .mb-nmf{font-size:15px;white-space:nowrap;padding-bottom:4px}
${S} .mb-wr{display:inline-block;border-bottom:1.3px solid var(--ink);height:1.3em;vertical-align:-.35em;margin:0 4px}
${S} .mb-ld{font:14px/1.5 ${MINCHO};color:var(--sub);margin-top:4px}
${S} .mb-qh{font:700 17.5px/1.35 ${MINCHO};color:var(--h2);display:flex;align-items:center;gap:7px;margin:12px 0 5px}
${S} .mb-qh svg{width:20px;height:16px;flex:none}
${S} .mb-n{font:700 21px/1 ${MINCHO};color:var(--ink);margin-right:2px}
${S} .mb-qh small{margin-left:auto;font:400 11.5px/1 ${GOTHIC};color:var(--sub)}
${S} .mb-two{display:grid;grid-template-columns:1fr 1fr;gap:0 28px}
${S} .mb-svg{display:block;flex:none}
${S} .mb-qt{font-size:15px;line-height:1.6;margin-top:6px}${S} .mb-sm2{font-size:14px;margin-top:4px}${S} .mb-sm{font-size:12px;color:var(--sub);margin-top:2px;line-height:1.45}
${S} .mb-qq{margin-top:9px}${S} .mb-qq b{font:700 16px/1 ${MINCHO};margin-right:8px}
${S} .mb-an{font-size:15px;margin-top:4px}
${S} .mb-kn{display:inline-block;font:700 15px/1 ${MINCHO};color:var(--sub);margin:0 3px 0 6px}
${S} .mb-hint{display:block;font-size:12.5px;color:var(--sub)}
${S} .mb-lines p{height:34px;border-bottom:1px solid #9fb3a6}
${S} .mb-ops{margin:2px 0 0 1.2em;font-size:14.5px;line-height:1.7}${S} .mb-ops .mb-kn{margin:0 8px 0 0}
${S} .mb-lg{display:flex;flex-wrap:wrap;gap:6px 20px;font-size:13px;margin:12px 0 4px}${S} .mb-lg span{display:inline-flex;align-items:center;gap:6px}${S} .mb-lg i{display:inline-block;width:22px;height:11px}
${S} .mb-cards{display:flex;justify-content:center;gap:40px;margin:18px 0 6px}
${S} .mb-bs .mb-qh{margin:20px 0 8px}${S} .mb-bs .mb-cq{font-size:16px;padding:8px 0}${S} .mb-bs .mb-or{font-size:16px}
${S} .mb-bs .mb-qt{font-size:16px;line-height:1.7}${S} .mb-bs .mb-hint{font-size:13px;margin-top:2px}${S} .mb-bs .mb-lines p{height:46px}
${S} .mb-cq{display:grid;grid-template-columns:1.6em 1fr auto;align-items:baseline;gap:0 10px;font-size:15px;line-height:1.5;padding:4px 0;border-bottom:1px dotted #9fb3a6}${S} .mb-cq .mb-kn{margin:0}
${S} .mb-or{font:700 15px/1.5 ${MINCHO};white-space:nowrap}${S} .mb-or i,${S} .mb-wds i{font-style:normal;color:var(--sub);margin:0 .7em}
${S} .mb-wds{margin:4px 0 0 1.2em}
${S} .mb-prs{display:grid;gap:4px}${S} .mb-pr{display:grid;grid-template-columns:1fr 430px;align-items:center;gap:14px;border-bottom:1px dotted #9fb3a6;padding:2px 0 4px}
${S} .mb-prl{display:flex;justify-content:space-between;align-items:baseline;font-size:14.5px}${S} .mb-prl b{font:700 21px/1.2 ${GOTHIC};color:var(--num);font-variant-numeric:tabular-nums}
${S} .mb-river{display:block;line-height:0;margin:14px 0 0}${S} .mb-river svg{display:block;width:100%;height:10px}
${S} .mb-ak{margin-top:6px}${S} .mb-ah{display:flex;align-items:baseline;gap:14px;margin-top:12px}${S} .mb-ah b{font:700 17px/1 ${MINCHO};min-width:2.2em}
${S} .mb-ar{font:700 21px/1.25 ${MINCHO};color:var(--num)}
${S} .mb-kt{font-size:13px;line-height:1.6;margin-top:2px}
${S} .mb-tbl{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:4px}${S} .mb-tbl th,${S} .mb-tbl td{padding:5px 4px;border-bottom:1px dotted #9fb3a6;text-align:right;font-variant-numeric:tabular-nums}
${S} .mb-tbl th{font-weight:400;font-size:12px;color:var(--sub);border-bottom:1.3px solid var(--ink)}${S} .mb-tbl td:first-child{text-align:left}
${S} .mb-nt{font-size:11px;color:var(--sub);margin-top:6px}
${S} .mb-foot{margin-top:auto;padding:8px 0 6mm;font-size:9px;line-height:1.5;color:var(--sub)}
${S} .mb-site{font:700 12px/1 ${MINCHO};color:var(--ink);margin-right:10px;letter-spacing:.06em}`;

const FORM_CSS = `.day.sm{font-size:16px!important;padding:0 14px!important}.day.sm .han{left:0;right:0;width:auto;height:46px;margin:-23px 0 0;transform:rotate(-3deg)}
[data-pick] .hits:empty,[data-pick] .msg:empty{display:none}
.yk{display:flex;align-items:center;gap:10px;min-height:54px;border-bottom:1px dotted var(--line);font-size:14px;cursor:pointer}.yk input{width:22px;height:22px;flex:none;accent-color:var(--num)}`;

const PRINT_CSS = `@page{size:A4;margin:0}
@media print{
header,footer,.ft,.town,.sg,main>:not(.sheetwrap){display:none!important}
html,body{background:#fff}.pg{max-width:none;margin:0;padding:0}
.sheetwrap{margin:0!important;border:0!important;height:auto!important;overflow:visible!important}
.sheets{transform:none!important}${S}{height:296mm;break-after:page}${S}:last-child{break-after:auto}${S}+${S}{border-top:0}
}`;

// ブラウザの中の動き：入れたもの → 紙を作り直す → URL の ? とこの端末におぼえる
const MANABI_JS = String.raw`(()=>{const mf=document.getElementById('mf'),ss=document.querySelector('.sheets'),fs=document.querySelectorAll('[data-pick]'),f=fs[0],f2=document.getElementById('f2');if(!mf||!ss)return;
let d=C.def,d2=null,moved=false,B=null,cp=null,seq=0;
const KS=['k','m','n','g','a'];let o={};if(KS.some(k=>mtQ.has(k))){KS.forEach(k=>{if(mtQ.has(k))o[k]=mtQ.get(k)});moved=true}else{try{o=Object.fromEntries(new URLSearchParams(localStorage.getItem('manabi')||''))}catch(e){}}
const st=mbState(o,C.kinds);
const qs=()=>'k='+st.k+(st.m?'&m='+st.m:'')+(st.k==='b'&&st.n?'&n='+st.n:'')+'&g='+st.g+'&a='+st.a;
// B の数字とカードの部品は、B をえらんだときだけ読む
const bLoad=()=>B?Promise.resolve(B):fetch(C.bUrl).then(r=>r.json()).then(j=>B=j);
const cLoad=()=>typeof MC!=='undefined'?Promise.resolve():cp||(cp=new Promise((ok,ng)=>{const e=document.createElement('script');e.src=C.cardUrl;e.onload=ok;e.onerror=()=>{cp=null;ng()};document.head.append(e)}));
const prep=()=>st.k!=='b'?Promise.resolve():Promise.all([MT.load(),bLoad(),st.g==='s'?cLoad():0]).then(([K])=>{if(typeof MC!=='undefined')C.M=MC;
if(!d2){const c=st.n&&st.n!==d.code?st.n:d.code==='01100'?'40130':'01100';const r=K.r.find(x=>x[0]===c)||K.r.find(x=>x[0]!==d.code);d2=mbCity(r,K.p[r[0].slice(0,2)]);st.n=d2.code;if(fs[1])fs[1].querySelector('input').value=d2.name}});
const wrap=document.querySelector('.sheetwrap');const fit=()=>{const k=Math.min(1,wrap.clientWidth/ss.offsetWidth);ss.style.transform='scale('+k+')';wrap.style.height=Math.ceil(ss.offsetHeight*k)+'px'};
function draw(){['g','k'].forEach(k=>mf.querySelectorAll('[data-'+k+']').forEach(b=>{const on=b.dataset[k]===st[k];b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)}));
if(f2)f2.hidden=st.k!=='b';mf.querySelector('[data-a]').checked=!!st.a;const n=++seq;
prep().then(()=>{if(n!==seq)return;ss.innerHTML=st.k==='b'?mbSheets(C,st,mbAddB(d,B[d.code]),mbAddB(d2,B[d2.code])):mbSheets(C,st,d);fit();
if(moved){history.replaceState(null,'','?'+qs());try{localStorage.setItem('manabi',qs())}catch(e){}}}).catch(()=>{if(n===seq&&fs[1])fs[1].querySelector('.msg').textContent='読みこめませんでした。もう一度えらんでください'})}
const set=f?mtPick(f,r=>MT.load().then(K=>{d=mbCity(r,K.p[r[0].slice(0,2)]);st.m=r[0];if(d2&&d2.code===d.code){d2=null;st.n=''}moved=true;draw()})):null;
if(fs[1])mtPick(fs[1],r=>{if(r[0]===d.code){fs[1].querySelector('.msg').textContent='ちがう街をえらんでください';return}MT.load().then(K=>{d2=mbCity(r,K.p[r[0].slice(0,2)]);st.n=r[0];moved=true;draw()})});
mf.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||!(b.dataset.g||b.dataset.k))return;moved=true;if(b.dataset.g)st.g=b.dataset.g;else st.k=b.dataset.k;draw()});
mf.querySelector('[data-a]').addEventListener('change',e=>{moved=true;st.a=e.target.checked?1:0;draw()});
addEventListener('resize',fit);const p=document.querySelector('[data-print]');if(p)p.addEventListener('click',()=>print());
// おぼえた街は、読みこんでから描く（先に見本の街で描くと、くらべる街が見本の街と同じときに入れかわってしまう）
if(st.m&&set)MT.load().then(K=>{const r=K.r.find(x=>x[0]===st.m);if(r)set(r);else{st.m='';draw()}}).catch(draw);else draw()})();`;

export function manabiPages({ munis, list, nat, kazu, sources }) {
  const conf = manabiConf({ munis, list, nat, sources });
  const row = kazu.r.find((r) => r[0] === DEF);
  if (!row) throw new Error(`まなびプリントの見本の街 ${DEF} が kazu にない`);
  const d = MB.mbCity(row, kazu.p[DEF.slice(0, 2)]);
  conf.def = d;
  const st = MB.mbState({}, conf.kinds);
  const q = MB.mbQuizA(conf, 's', d);
  const kd = KINDS.map(([k, t]) => `<button class="day sm${k === st.k ? ' on' : ''}" type="button" data-k="${k}" aria-pressed="${k === st.k}"><span>${t}</span>${HAN}</button>`).join('');
  const gr = GRADES.map(([g, t]) => `<button class="day sm${g === st.g ? ' on' : ''}" type="button" data-g="${g}" aria-pressed="${g === st.g}"><span>${t}</span>${HAN}</button>`).join('');
  const form = `<section id="mf" class="calc">
<div class="row"><span class="k">種類</span>${kd}</div>
<div class="row"><span class="k">段階</span>${gr}</div>
<label class="yk"><input type="checkbox" data-a>答えもつける（2枚目に答えと考え方）</label>
</section>`;
  const body = `<p class="crumb"><a href="/">トップ</a> / <a href="/kurabe/">2つの街をくらべる</a></p>
<h1 class="city">まなびプリント</h1>
<p class="src">街と段階をえらぶと、数字を読む問題がA4の1枚に</p>
${findForm('qm', '街', '例 札幌市・さっぽろ')}
<div id="f2" hidden>${findForm('qm2', 'くらべる街', '例 枚方市・ひらかた')}</div>
${form}
<p><button class="go" type="button" data-print>印刷する・PDFにする</button></p>
<div class="sheetwrap"><div class="sheets">${MB.mbSheets(conf, st, d)}</div></div>
<p class="note">入れたものは送りません。この端末のブラウザにだけおぼえます。</p>
<p><a class="go" href="/dougu/karte/">わが家の防災カルテ（A4）</a></p>
${h2('出典')}
${srcKokusei(munis)}`;
  return [
    {
      path: MANABI_PATH,
      title: 'まなびプリント（街の数字を読む・印刷用）',
      description: fit(
        [`全国の市区町村から1つの街か2つの街をえらび、国勢調査の数字を読む・くらべる問題をA4の1枚に。小学生・中学生・高校生以上の3段階で、答えの2枚目もつけられます。`],
        [[`見本の${d.name}は共同住宅に住む世帯が100世帯のうち約${q.grids[0].v}世帯。`, '']],
      ),
      noAds: true,
      head: `<style>${SHEET_CSS}\n${FORM_CSS}\n${PRINT_CSS}</style>`,
      body,
      script: `${PICK_JS}\n${CORE}\nconst C=${JSON.stringify(conf).replace(/</g, '\\u003c')};\n${MANABI_JS}`,
    },
  ];
}
