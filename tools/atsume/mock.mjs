// 街あつめ帳の見本（夜 #42・10/31 昼に作った）。案1「地図に色がたまる」と案2「御朱印帳ふう」
// 使い方：node tools/atsume/mock.mjs <ビルドした dist> <出力先>  → 出力先/atsume1/・atsume2/index.html
// 今のページ（/quiz/）の外側と CSS をそのまま使う。集めた街は見本用の作りもの（決まった種で毎回同じ）。パソコンは #41 の「柱のないページは1列640px」に合わせた
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { JMAP } from '../../src/japan-map-data.mjs';
import { PREFS } from '../../src/areas.mjs';
import { short, JMAP_CSS } from '../../src/japan-map.mjs';
import { mapDeco } from '../../src/art.mjs';
import { mcRegion } from '../../src/card-core.mjs';
import { h2, esc } from '../../src/layout.mjs';

const [dist, out] = process.argv.slice(2);
const shell = readFileSync(join(dist, 'quiz/index.html'), 'utf8');
const machi = JSON.parse(readFileSync(join(dist, 'quiz/machi.json'), 'utf8'));

// ---- 見本の記録（作りもの） ----
let seed = 20261031;
const rnd = () => { seed |= 0; seed = (seed + 0x6d2b79f5) | 0; let t = Math.imul(seed ^ (seed >>> 15), 1 | seed); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
const PS = Object.fromEntries(PREFS.map((p) => [p.code, { n: 0, got: 0, towns: [] }]));
for (const m of machi.munis) {
  const pc = m[0].slice(0, 2);
  const got = rnd() < Math.min(0.85, 0.004 + m[3] / 700000) || (pc === '27' && rnd() < 0.12);
  const day = 10 + Math.floor(rnd() * 22);
  PS[pc].n++;
  PS[pc].towns.push([m[1], got ? day : 0]);
  if (got) PS[pc].got++;
}
const TOTAL = machi.munis.length;
const GOT = Object.values(PS).reduce((a, s) => a + s.got, 0);
const KEN = new Set(machi.prefs.map((p) => [p[0], p[3] / 1e7 + rnd() * 0.5]).sort((a, b) => b[1] - a[1]).slice(0, 21).map((x) => x[0]));
const STREAK = 12;
const PN = Object.fromEntries(PREFS.map((p) => [p.code, p]));
const num = (n) => n.toLocaleString('ja-JP');

// ---- 共通の部品 ----
const MINCHO = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP","Noto Serif CJK JP",serif';
const INK = '#33413a';
const CSS = `${JMAP_CSS}
@media(min-width:1100px){.pg{max-width:672px}}
.lead{margin:2px 0 10px;font-size:14px;color:var(--sub)}
.ac{display:flex;align-items:center;gap:14px;margin:4px 0 6px}.ac .a0{flex:1}
.a1{margin:0;display:flex;align-items:baseline;gap:6px;font-size:13px;color:var(--sub)}.a1 b{font:700 30px/1 system-ui,sans-serif;color:var(--num);font-variant-numeric:tabular-nums}
.gg{position:relative;height:8px;background:var(--track);margin:6px 0 6px}.gg i{position:absolute;left:0;top:0;bottom:0;background:var(--bar)}
.a2{margin:0;font-size:13px;color:var(--sub)}.a2 b{font-size:16px;color:var(--num);margin:0 1px 0 3px}
.han2{flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;width:62px;height:62px;border:2.5px solid var(--accent);border-radius:50%;box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3.5px var(--accent);transform:rotate(-8deg);color:var(--accent);font:700 11px/1.15 ${MINCHO};text-align:center}.han2 b{font-size:20px;line-height:1}
.note{font-size:13px;color:var(--sub)}`;

const stats = `<div class="ac"><div class="a0"><p class="a1">集めた街<b>${GOT}</b>／${num(TOTAL)}</p><div class="gg" role="img" aria-label="${GOT}／${num(TOTAL)}"><i style="width:${((GOT / TOTAL) * 100).toFixed(1)}%"></i></div><p class="a2">県のはんこ<b>${KEN.size}</b>／47</p></div><div class="han2" role="img" aria-label="続けて${STREAK}日">続けて<b>${STREAK}</b>日</div></div>`;

const tail = `${h2('はんこを集める')}<ul class="list"><li><a href="/quiz/kyou/">今日の1問</a><small class="sub">答えた2つの街に、はんこ</small></li><li><a href="/quiz/docchi/">どっちが多い？</a><small class="sub">10問に出た街ぜんぶに、はんこ</small></li><li><a href="/quiz/dobon/">ドボンクイズ</a><small class="sub">当てた街と、ドボンの街に、はんこ</small></li></ul>
<p class="note">記録はこの端末の中だけです。どこにも送りません。</p>`;

function page(slug, css, body, js = '') {
  const s = shell.replace(/<title>[^<]*<\/title>/, '<title>街あつめ帳 | まちの社会科</title>').replace('</style>', `${css.replace(/\n/g, '')}</style>`);
  const i = s.indexOf('<main>');
  const j = s.indexOf('</main>');
  const html = `${s.slice(0, i)}<main>
<p class="crumb"><a href="/">トップ</a> / <a href="/quiz/">クイズ</a></p>
<h1 class="city">街あつめ帳</h1>
${body}
${tail}
${s.slice(j)}`.replace('</body>', `${js}</body>`);
  mkdirSync(join(out, slug), { recursive: true });
  writeFileSync(join(out, slug, 'index.html'), html);
}

// ---- 案1：地図に色がたまる ----
const STEPS = [[0.5, '#2f6b45'], [0.3, '#4f8d5e'], [0.15, '#86b391'], [0.05, '#b5cfbb'], [0.000001, '#dcebd9'], [0, '#f6f9f1']];
const shade = (r) => STEPS.find(([t]) => r >= t)[1];
function map1(sel) {
  const { w, h, frame, prefs } = JMAP;
  const shapes = [];
  const labels = [];
  for (const p of PREFS) {
    const m = prefs[p.code];
    const st = PS[p.code];
    shapes.push(`<path d="${m.d}" fill="${shade(st.got / st.n)}" data-c="${p.code}"/>`);
    const lead = m.a ? `<path class="ld" d="M${m.a[0]} ${m.a[1]}L${m.x} ${m.y}"/><circle cx="${m.a[0]}" cy="${m.a[1]}" r="1.1"/>` : '';
    labels.push(`<g class="pf${p.code === sel ? ' on' : ''}" data-c="${p.code}" role="button" tabindex="0" aria-label="${esc(p.name)} ${st.got}／${st.n}"><rect class="hz" x="${(m.x - 12).toFixed(1)}" y="${(m.y - 8).toFixed(1)}" width="24" height="16"/>${lead}<text x="${m.x}" y="${(m.y + 3.2).toFixed(1)}">${short(p.name)}</text></g>`);
  }
  return `<svg class="jm am" viewBox="0 0 ${w} ${h}" role="group" aria-label="集めた割合の地図"><g stroke="${INK}" stroke-width=".7" stroke-linejoin="round">${shapes.join('')}<path d="${frame}" fill="none" stroke-width=".8"/></g><path class="selo" d="${prefs[sel].d}"/>${mapDeco(w, h)}<g class="lb">${labels.join('')}</g></svg>`;
}
const legend = `<div class="lg" aria-hidden="true"><span>集めた割合</span>${STEPS.slice().reverse().map(([t, c]) => `<i style="background:${c}"></i>`).join('')}<span>半分より上</span></div>`;
const D1 = Object.fromEntries(PREFS.map((p) => [p.code, [p.name, PS[p.code].got, PS[p.code].n, KEN.has(p.code) ? 1 : 0, PS[p.code].towns]]));
const CSS1 = `${CSS}
.am .selo{fill:none;stroke:var(--accent);stroke-width:1.8;stroke-linejoin:round;pointer-events:none}.am .pf.on text{fill:var(--accent);font-weight:700}.am path[data-c]{cursor:pointer}
.lg{display:flex;align-items:center;gap:3px;margin:6px 0 0;font-size:11.5px;color:var(--sub)}.lg i{width:22px;height:10px;border:.5px solid ${INK}}.lg span:first-child{margin-right:4px}.lg span:last-child{margin-left:4px}
.pt{margin:0 0 2px;font-size:13px;color:var(--sub)}.pt b{font-size:18px;color:var(--num);margin:0 1px 0 4px}
.tw{list-style:none;margin:12px 0 4px;padding:0;display:grid;grid-template-columns:repeat(auto-fill,minmax(66px,1fr));gap:12px 4px}
.tw li{display:flex;flex-direction:column;align-items:center;gap:3px;min-width:0}
.tw .st{box-sizing:border-box;width:60px;height:60px;border-radius:50%;display:flex;align-items:center;justify-content:center;text-align:center;padding:6px;font:400 11px/1.2 ${MINCHO};color:var(--sub);border:1px dashed var(--line);overflow-wrap:anywhere}
.tw .g .st{border:2.5px solid var(--accent);box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3.5px var(--accent);color:var(--accent);font-weight:700}
.tw small{font-size:10.5px;color:var(--sub);min-height:13px}`;
const JS1 = `<script type="application/json" id="ad">${JSON.stringify(D1)}</script><script>
(()=>{const D=JSON.parse(document.getElementById('ad').textContent),J=${JSON.stringify(Object.fromEntries(PREFS.map((p) => [p.code, JMAP.prefs[p.code].d])))},$=(s)=>document.querySelector(s);
const show=(c)=>{const [n,g,t,k,tw]=D[c];$('.selo').setAttribute('d',J[c]);document.querySelectorAll('.am .pf').forEach(e=>e.classList.toggle('on',e.dataset.c===c));
$('#pl h2').lastChild.textContent=n+'の街';$('#pl .pt').innerHTML='集めた<b>'+g+'</b>／'+t+'　県のはんこ'+(k?'<b>あり</b>':'<b>まだ</b>');
$('#pl .tw').innerHTML=tw.map(([a,d])=>'<li'+(d?' class="g"':'')+'><span class="st">'+a+'</span><small>'+(d?'10/'+d:'')+'</small></li>').join('')};
document.querySelector('.am').addEventListener('click',e=>{const g=e.target.closest('[data-c]');if(g)show(g.dataset.c)});show('27')})();</script>`;
page('atsume1', CSS1, `<p class="lead">クイズに出た街に、はんこがたまります</p>
${stats}
${map1('27')}${legend}
<p class="note">県を押すと、その県の街が下に出ます。</p>
<section id="pl">${h2('の街')}<p class="pt"></p><ul class="tw"></ul></section>`, JS1);

// ---- 案2：御朱印帳ふう ----
const RN = { hokkaido: '北海道', tohoku: '東北', kanto: '関東', chubu: '中部', kinki: '近畿', chugoku: '中国', shikoku: '四国', kyushu: '九州', okinawa: '沖縄' };
const SEL = 'kinki';
const NUDGE = { kanto: [20, 12], chubu: [-16, -10], tohoku: [8, 0], chugoku: [-4, -8], shikoku: [2, 8], kinki: [-2, 10] }; // 地方の名前が重ならないように
function map2() {
  const { w, h, frame, prefs } = JMAP;
  const pos = {};
  const shapes = PREFS.map((p) => {
    const r = mcRegion(p.code);
    (pos[r] ||= []).push([prefs[p.code].x, prefs[p.code].y]);
    const has = PS[p.code].got > 0;
    return `<path d="${prefs[p.code].d}" fill="${r === SEL ? '#b5cfbb' : has ? '#e1edd6' : '#f6f9f1'}"/>`;
  });
  const lab = Object.entries(pos).map(([r, a]) => {
    const x = a.reduce((s, v) => s + v[0], 0) / a.length;
    const y = a.reduce((s, v) => s + v[1], 0) / a.length;
    const [dx, dy] = NUDGE[r] || [0, 0];
    return `<text x="${(x + dx).toFixed(0)}" y="${(y + 6 + dy).toFixed(0)}"${r === SEL ? ' class="on"' : ''}>${RN[r]}</text>`;
  });
  return `<svg class="rm" viewBox="0 0 ${w} ${h}" role="group" aria-label="地方の地図"><g stroke="${INK}" stroke-width=".6" stroke-linejoin="round">${shapes.join('')}<path d="${frame}" fill="none" stroke-width=".8"/></g><g class="rl">${lab.join('')}</g></svg>`;
}
const kp = PREFS.filter((p) => mcRegion(p.code) === SEL);
const towns = kp.flatMap((p) => PS[p.code].towns.filter((t) => t[1]).map((t) => [t[0], t[1], p.code])).sort((a, b) => a[1] - b[1]);
const rgot = towns.length;
const rn = kp.reduce((s, p) => s + PS[p.code].n, 0);
const half = Math.ceil((rgot + 1) / 2);
// 縦書きのはんこ：3字までは1列、4字は小さめの1列、5字からは2列に分ける
const sealName = (n) => (n.length <= 3 ? esc(n) : n.length === 4 ? `<i class="s4">${esc(n)}</i>` : `<i class="s5">${esc(n.slice(0, Math.ceil(n.length / 2)))}<br>${esc(n.slice(Math.ceil(n.length / 2)))}</i>`);
const seal = ([n, d]) => `<li><span class="in">${sealName(n)}</span><small>10/${d}</small></li>`;
const slots = [...towns.map(seal), '<li class="em"><span class="in"></span><small>&nbsp;</small></li>'];
const kenRow = kp.map((p) => `<li${KEN.has(p.code) ? ' class="g"' : ''}><span>${short(p.name)}</span></li>`).join('');
const CSS2 = `${CSS}
.rw{display:flex;align-items:center;gap:10px;margin:8px 0 4px}.rm{display:block;width:54%;height:auto;flex:none;-webkit-tap-highlight-color:transparent}
.rl text{font:700 19px ${MINCHO};fill:${INK};stroke:#fff;stroke-width:4px;paint-order:stroke;text-anchor:middle;cursor:pointer}.rl text.on{fill:var(--accent)}
.ri .rn{margin:0;font:700 26px/1.2 ${MINCHO};color:var(--h2)}.ri .a1 b{font-size:24px}.ri .note{margin:6px 0 0}
.kr{list-style:none;margin:12px 0 0;padding:0;display:flex;flex-wrap:wrap;gap:6px;align-items:center}.kr::before{content:"県のはんこ";font-size:12.5px;color:var(--sub);margin-right:4px}
.kr{gap:4px}.kr li span{box-sizing:border-box;display:flex;align-items:center;justify-content:center;width:34px;height:34px;border-radius:50%;border:1px dashed var(--line);font:400 11px ${MINCHO};color:var(--sub)}
.kr li.g span{border:2px solid var(--accent);box-shadow:inset 0 0 0 1.5px #fff,inset 0 0 0 2.5px var(--accent);color:var(--accent);font-weight:700}
.chou{margin:10px 0 6px;border:7px solid var(--h2);border-radius:4px;background:#fff}
.chou .hd{display:flex;justify-content:space-between;align-items:baseline;padding:8px 12px 0;font:700 15px ${MINCHO};color:var(--ink)}.chou .hd small{font:400 12px system-ui,sans-serif;color:var(--sub)}
.pgs{display:grid;grid-template-columns:1fr 1fr}.pgs>ul+ul{border-left:1px solid var(--line)}
.ks{list-style:none;margin:0;padding:14px 5px 16px;display:grid;grid-template-columns:repeat(3,1fr);gap:14px 5px;align-content:start}@media(min-width:600px){.ks{grid-template-columns:repeat(5,1fr)}}
.ks li{display:flex;flex-direction:column;align-items:center;gap:5px}
.ks .in{box-sizing:border-box;width:50px;height:50px;border:2.5px solid var(--accent);box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3.5px var(--accent);border-radius:3px;writing-mode:vertical-rl;display:flex;align-items:center;justify-content:center;padding:2px;font:700 12.5px/1.05 ${MINCHO};color:var(--accent)}.ks .in i{font-style:normal}.ks .s4{font-size:10px;line-height:1}.ks .s5{font-size:11px;line-height:1.05}
.ks small{font:400 10px ${MINCHO};color:var(--ink);white-space:nowrap}.ks .em .in{border:1px dashed var(--line);box-shadow:none}`;
page('atsume2', CSS2, `<p class="lead">クイズに出た街の、はんこの帳面です</p>
${stats}
<div class="rw">${map2()}<div class="ri"><p class="rn">${RN[SEL]}</p><p class="a1">集めた<b>${rgot}</b>／${rn}</p><p class="note">地方を押すと、その帳面が開きます。</p></div></div>
<ul class="kr">${kenRow}</ul>
<div class="chou" aria-label="${RN[SEL]}の帳面"><p class="hd">${RN[SEL]}の帳面<small>集めた順</small></p><div class="pgs"><ul class="ks">${slots.slice(0, half).join('')}</ul><ul class="ks">${slots.slice(half).join('')}</ul></div></div>`);

console.log(`見本：集めた街 ${GOT}／${TOTAL}・県のはんこ ${KEN.size}・大阪 ${PS['27'].got}／${PS['27'].n}・近畿 ${rgot}／${rn}`);
