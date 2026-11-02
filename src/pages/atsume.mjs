// 街あつめ帳（/atsume/）：クイズで問題に出た街に、はんこがたまる自分だけの帳面（#42・10/31 しょーくん 案1「地図に色がたまる」）
// 上：集めた街 ◯／全国の市区町村・県のはんこ ◯／47・続けた日数の朱のはんこ（今日の1問の .han2 と同じ形）
// 地図：県ごとに集めた割合で6段の森の緑。県を押すと輪郭が朱になり、下にその県の街を丸いはんこで（集めた街は朱の二重の丸と日付）
// 記録は localStorage の machi-atsume だけ（src/atsume-core.mjs）。今日の1問の記録 machi-kyou は、開いたときに引きつぐ
// AdSense なし。動くのは、帳面で見ていない新しいはんこが小さく押される所だけ（開いたら n を空にするので1回だけ）
import { esc, h2, fit, fmt, MINCHO } from '../layout.mjs';
import { PREFS } from '../areas.mjs';
import { JMAP } from '../japan-map-data.mjs';
import { short, JMAP_CSS } from '../japan-map.mjs';
import { mapDeco } from '../art.mjs';
import { kyouQ, kyouPool, addDays } from '../kyou.mjs';
import { ATSUME_JS } from '../atsume-core.mjs';

const INK = '#33413a';
// 集めた割合の6段（0・少し・5%・15%・30%・半分より上）
export const ATSUME_STEPS = [[0.5, '#2f6b45'], [0.3, '#4f8d5e'], [0.15, '#86b391'], [0.05, '#b5cfbb'], [0.000001, '#dcebd9'], [0, '#f6f9f1']];
// 今日の1問の記録（machi-kyou）を引きつぐ日の範囲：今日の1問を始めた日から。この PR のあとは今日の1問が直接はんこを押す
export const KYOU_FROM = '2026-10-29';
const KYOU_TO = '2026-12-31';

const CSS = `${JMAP_CSS}
.alead{margin:2px 0 10px;font-size:14px;color:var(--sub)}
.ac{display:flex;align-items:center;gap:14px;margin:4px 0 6px}.ac .a0{flex:1}
.a1{margin:0;display:flex;align-items:baseline;gap:6px;font-size:13px;color:var(--sub)}.a1 b{font:700 30px/1 system-ui,sans-serif;color:var(--num);font-variant-numeric:tabular-nums}
.gg{position:relative;height:8px;background:var(--track);margin:6px 0}.gg i{position:absolute;left:0;top:0;bottom:0;background:var(--bar)}
.a2{margin:0;font-size:13px;color:var(--sub)}.a2 b{font-size:16px;color:var(--num);margin:0 1px 0 3px}
.han2{flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;width:62px;height:62px;border:2.5px solid var(--accent);border-radius:50%;box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3.5px var(--accent);transform:rotate(-8deg);color:var(--accent);font:700 11px/1.15 ${MINCHO};text-align:center}.han2 b{font-size:20px;line-height:1}.han2.z{opacity:.35}
.am path[data-c]{cursor:pointer}.am .selo{fill:none;stroke:var(--accent);stroke-width:1.8;stroke-linejoin:round;pointer-events:none}.am .pf.on text{fill:var(--accent);font-weight:700}
.lg{display:flex;align-items:center;gap:3px;margin:6px 0 0;font-size:11.5px;color:var(--sub)}.lg i{width:22px;height:10px;border:.5px solid ${INK}}.lg span:first-child{margin-right:4px}.lg span:last-child{margin-left:4px}
.pt{margin:0 0 2px;font-size:13px;color:var(--sub)}.pt b{font-size:18px;color:var(--num);margin:0 1px 0 4px}
.tw{list-style:none;margin:12px 0 4px;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:12px 4px}
.tw li{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}
.tw .st{box-sizing:border-box;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;padding:6px;font:400 11px/1.2 ${MINCHO};color:var(--sub);border:1px dashed var(--line);overflow-wrap:anywhere}
.tw .g .st{border:2.5px solid var(--accent);box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3.5px var(--accent);color:var(--accent);font-weight:700}
.tw .n .st{animation:osu .28s ease-out both}@keyframes osu{from{transform:scale(1.18) rotate(-6deg)}to{transform:none}}
@media (prefers-reduced-motion:reduce){.tw .n .st{animation:none}}
.tw small{font-size:10.5px;color:var(--sub);min-height:13px}`.replace(/\n/g, '');

// 地図（はじめはどの県も 0 の色。ぬるのはブラウザ）
function mapSvg(sel) {
  const { w, h, frame, prefs } = JMAP;
  const shapes = [];
  const labels = [];
  for (const p of PREFS) {
    const m = prefs[p.code];
    shapes.push(`<path d="${m.d}" fill="${ATSUME_STEPS[5][1]}" data-c="${p.code}"/>`);
    const lead = m.a ? `<path class="ld" d="M${m.a[0]} ${m.a[1]}L${m.x} ${m.y}"/><circle cx="${m.a[0]}" cy="${m.a[1]}" r="1.1"/>` : '';
    labels.push(`<g class="pf${p.code === sel ? ' on' : ''}" data-c="${p.code}" role="button" tabindex="0" aria-label="${esc(p.name)}"><rect class="hz" x="${(m.x - 12).toFixed(1)}" y="${(m.y - 8).toFixed(1)}" width="24" height="16"/>${lead}<text x="${m.x}" y="${(m.y + 3.2).toFixed(1)}">${short(p.name)}</text></g>`);
  }
  return `<svg class="jm am" viewBox="0 0 ${w} ${h}" role="group" aria-label="集めた割合の地図"><g stroke="${INK}" stroke-width=".7" stroke-linejoin="round">${shapes.join('')}<path d="${frame}" fill="none" stroke-width=".8"/></g><path class="selo" d="${prefs[sel].d}"/>${mapDeco(w, h)}<g class="lb">${labels.join('')}</g></svg>`;
}

// 今日の1問の引きつぎ：日付 → [アの街, イの街, アの県, イの県]（今日の1問の記録は県しかないので、日付から問題を作り直す）
export function kyouCarry(machi, start) {
  const pool = kyouPool(machi);
  const end = start < KYOU_TO ? start : KYOU_TO;
  const out = {};
  for (let d = KYOU_FROM; d <= end; d = addDays(d, 1)) {
    const q = kyouQ(machi, d, pool);
    if (q) out[d] = [q.p[0][0], q.p[1][0], q.p[0][0].slice(0, 2), q.p[1][0].slice(0, 2)];
  }
  return out;
}

// ブラウザ：記録を読む・今日の1問を引きつぐ・数と地図をぬる・県を押すとその県の街
const JS = `(()=>{${ATSUME_JS}
const $=(s,e=document)=>e.querySelector(s),D=JSON.parse($('#ad').textContent),P=D.p,ST=D.s;
const A=atsumeLoad(),L=A.l;let ch=false;
try{const R=JSON.parse(localStorage.getItem('machi-kyou')||'{}')||{};Object.keys(R).forEach(d=>{const k=D.k[d],r=R[d];if(k&&r&&r[2]===k[2]&&r[3]===k[3]){const m=A.m||{},had=m[k[0]]&&m[k[1]]&&(A.d||[]).includes(d);if(!had){atsumeAdd(A,[k[0],k[1]],d);ch=true}}})}catch(e){}
if(L)A.l=L;const NW=new Set(A.n||[]);if(ch||NW.size){delete A.n;try{localStorage.setItem('machi-atsume',JSON.stringify(A))}catch(e){}}
const M=A.m||{},K=A.p||{},today=new Date(Date.now()+9*3600e3).toISOString().slice(0,10);
let got=0;const per={};Object.keys(P).forEach(c=>{const g=P[c][1].filter(t=>M[c+t[0]]).length;per[c]=g;got+=g});
const kn=Object.keys(P).filter(c=>K[c]).length,s=atsumeStreak(A.d,today),tot=D.n;
$('.a1 b').textContent=got.toLocaleString('ja-JP');$('.gg i').style.width=(got/tot*100).toFixed(1)+'%';$('.gg').setAttribute('aria-label',got+'／'+tot.toLocaleString('ja-JP'));$('.a2 b').textContent=kn;
const h=$('.han2');$('b',h).textContent=s;h.setAttribute('aria-label','続けて'+s+'日');h.classList.toggle('z',!s);
const shade=r=>ST.find(x=>r>=x[0])[1],svg=$('.am');
svg.querySelectorAll('path[data-c]').forEach(e=>{const c=e.dataset.c;e.setAttribute('fill',shade(per[c]/P[c][1].length))});
svg.querySelectorAll('.pf').forEach(e=>{const c=e.dataset.c;e.setAttribute('aria-label',P[c][0]+' '+per[c]+'／'+P[c][1].length)});
const md=d=>+d.slice(5,7)+'/'+ +d.slice(8);
const show=c=>{const [n,tw]=P[c];$('.selo').setAttribute('d',$('path[data-c="'+c+'"]',svg).getAttribute('d'));svg.querySelectorAll('.pf').forEach(e=>e.classList.toggle('on',e.dataset.c===c));
$('#pl h2').lastChild.textContent=n+'の街';const pt=$('#pl .pt');pt.textContent='集めた';const b1=document.createElement('b');b1.textContent=per[c];const b2=document.createElement('b');b2.textContent=K[c]?'あり':'まだ';pt.append(b1,'／'+tw.length+'　県のはんこ',b2);
const ul=$('#pl .tw');ul.textContent='';tw.forEach(([t,a])=>{const d=M[c+t],li=document.createElement('li'),st=document.createElement('span'),sm=document.createElement('small');st.className='st';st.textContent=a;if(d){li.className=NW.delete(c+t)?'g n':'g';sm.textContent=md(d)}li.append(st,sm);ul.append(li)})};
svg.addEventListener('click',e=>{const g=e.target.closest('[data-c]');if(g)show(g.dataset.c)});
svg.querySelectorAll('.pf').forEach(e=>e.addEventListener('keydown',k=>{if(k.key==='Enter'||k.key===' '){k.preventDefault();show(e.dataset.c)}}));
show(P[A.l]?A.l:'13')})();`;

const qa = (q, a) => `<h3>${q}</h3>\n<p>${a}</p>`;

export function atsumePage({ machi, start }) {
  const towns = {};
  for (const p of PREFS) towns[p.code] = [p.name, []];
  for (const r of [...machi.munis].sort((a, b) => (a[0] < b[0] ? -1 : 1))) towns[r[0].slice(0, 2)][1].push([r[0].slice(2), r[1]]);
  const total = machi.munis.length;
  const most = PREFS.map((p) => [p, towns[p.code][1].length]).sort((a, b) => b[1] - a[1])[0];
  const fewest = PREFS.map((p) => [p, towns[p.code][1].length]).sort((a, b) => a[1] - b[1])[0];
  const data = { n: total, s: ATSUME_STEPS, p: towns, k: kyouCarry(machi, start) };
  const legend = `<div class="lg" aria-hidden="true"><span>集めた割合</span>${ATSUME_STEPS.slice().reverse().map(([, c]) => `<i style="background:${c}"></i>`).join('')}<span>半分より上</span></div>`;
  const sel = '13';
  return {
    path: '/atsume/',
    title: '街あつめ帳（クイズに出た街のはんこ）',
    description: fit(
      [`今日の1問やどっちが多い？など街の数字クイズで問題に出た街に、はんこがたまる帳面。全国${fmt(total)}市区町村のうち集めた数と、47都道府県ごとの集まり具合を地図の色で見られます。`],
      ['記録はこの端末の中だけです。'],
    ),
    noAds: true,
    head: `<style>${CSS}</style><script type="application/json" id="ad">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`,
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/quiz/">クイズ</a></p>
<h1 class="city">街あつめ帳</h1>
<p class="alead">クイズに出た街に、はんこがたまります</p>
<div class="ac"><div class="a0"><p class="a1">集めた街<b>0</b>／${fmt(total)}</p><div class="gg" role="img" aria-label="0／${fmt(total)}"><i style="width:0"></i></div><p class="a2">県のはんこ<b>0</b>／47</p></div><div class="han2 z" role="img" aria-label="続けて0日">続けて<b>0</b>日</div></div>
${mapSvg(sel)}${legend}
<p class="note">県を押すと、その県の街が下に出ます。</p>
<section id="pl">${h2(`${esc(PREFS.find((p) => p.code === sel).name)}の街`)}<p class="pt"></p><ul class="tw"></ul></section>
<noscript><p>街あつめ帳はスクリプトで動きます。</p></noscript>
${h2('はんこを集める')}<ul class="list"><li><a href="/quiz/kyou/">今日の1問</a><small class="sub">答えた2つの街に、はんこ</small></li><li><a href="/quiz/docchi/">どっちが多い？</a><small class="sub">10問に出た街ぜんぶに、はんこ</small></li><li><a href="/quiz/dobon/">ドボンクイズ</a><small class="sub">当てた街と、ドボンの街に、はんこ</small></li></ul>
<p class="note">記録はこの端末の中だけです。どこにも送りません。</p>
<div class="prose">
${h2('はんこがたまるとき')}
<p>はんこは、クイズで問題に出た街に押します。正解でもまちがいでも、問題に出た街にはすべて押します。どっちが多い？とならべるでは、くらべた街ぜんぶ、ヒントで街あてでは選択肢の3つの街、この街はどこ？ではその1つの街です。ドボンクイズは、おした街や県に押します。市区町村のページの街のクイズに答えると、その街にも押します。</p>
<p>街のページを開いただけや、街くらべカードを作っただけでは押しません。日付は、その街にはじめて押した日です。同じ街が何度出ても、はんこは1つです。</p>
${h2('県のはんこと地図の色')}
<p>都道府県どうしをくらべる問題に出た県には、街とは別に「県のはんこ」を押します。県のはんこは47までで、${fmt(total)}の数には入れません。</p>
<p>地図の色は、その県の市区町村のうち、はんこを集めた割合です。まだ0のときがいちばん薄く、少し、5%、15%、30%、半分より上の6段で濃くなります。市区町村がいちばん多い${esc(most[0].name)}は${fmt(most[1])}、いちばん少ない${esc(fewest[0].name)}は${fmt(fewest[1])}なので、同じ数を集めても県によって色の濃さがちがいます。</p>
${h2('よくある問い')}
${qa('記録はどこに残りますか', '集めたはんこと日付は、あなたのスマホやパソコンのブラウザの中にだけ残ります。どこにも送りません。べつの端末やブラウザで開くと、0から始まります。')}
${qa('続けた日数はどう数えますか', 'はんこが押されるクイズで遊んだ日が、今日まで何日続いているかです。今日まだ遊んでいないときは、きのうまでの日数を出します。')}
${qa('今日の1問の記録はどうなりますか', '今日の1問で答えた日の2つの街は、この帳面にも入ります。街あつめ帳ができる前に答えた日の分も、このページを開いたときに引きつぎます。')}
${qa('数字はどこから来ていますか', `市区町村の数と名前は、クイズと同じ国勢調査の${fmt(total)}市区町村です。政令指定都市は区に分けず、1つの市として数えます。東京の23区は、1つずつ数えます。`)}
</div>`,
    script: JS,
  };
}
