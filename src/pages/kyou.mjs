// 今日の1問（/quiz/kyou/）：日本時間の0時に入れかわる「どっちが多い？」の1問（10/29 しょーくん 案C＋案Aの答え合わせ）
// 答える前：地図で2つの街の県をぬり分ける（緑と青）。答えたあと：地図に数字と正解の赤ペンの丸、その下に2本の棒と目盛り・差
// 連続正解は朱のはんこ・7日の丸とバツ・いままでの最高。わたしの地図（答えた県がたまる）・あしたの題・結果を送る
// 問題はビルドの日から14日分をページに入れる（machi.json は読まない）。記録はこの端末の localStorage だけ。回答は送らない。AdSense なし
import { esc, fit, srcKokusei, h2 } from '../layout.mjs';
import { PREFS } from '../areas.mjs';
import { JMAP } from '../japan-map-data.mjs';
import { kyouDays, kyouPool, KYOU_JS } from '../kyou.mjs';

const PN = Object.fromEntries(PREFS.map((p) => [p.code, p]));
const KA = '#b5cfbb'; // アの県（緑）
const KB = '#bcd8ea'; // イの県（青）
const WD = '日月火水木金土';
const md = (iso) => {
  const [, mo, d] = iso.split('-').map(Number);
  return `${mo}月${d}日（${WD[new Date(`${iso}T00:00:00Z`).getUTCDay()]}）`;
};

const CSS = `.kd{font-size:13px;color:var(--sub);margin:4px 0 0;font-variant-numeric:tabular-nums}
#ky .qq{min-height:3.1em}
.km,.mm{display:block;width:calc(100% + 32px);height:auto;margin:2px -16px 0;-webkit-tap-highlight-color:transparent}
.km{aspect-ratio:390/190}.km use,.mm use{fill:#f6f9f1}.km use.a{fill:${KA}}.km use.b{fill:${KB}}.mm use.on{fill:${KA}}
.km text{font-family:"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;font-weight:700;fill:var(--ink);stroke:#fff;stroke-width:.22em;paint-order:stroke;stroke-linejoin:round;text-anchor:middle}
.km text.v{font-family:inherit;font-weight:400;fill:var(--sub)}.km text.ok{fill:var(--accent)}.km ellipse{fill:none;stroke:var(--accent)}
.qz .ch .sw{flex:none;width:14px;height:14px;margin-left:-4px;border:1px solid #9fb3a6}
.qz .ch li{border-bottom:1px dotted var(--line)}.qz .ch button{border-bottom:0}.qz .ch[data-done] button{min-height:40px;padding-top:4px;padding-bottom:4px}
.qz .ch .v{font-size:15px;font-weight:700;color:var(--ink);font-variant-numeric:tabular-nums}
.bt{height:14px;margin:0 0 6px 8px;background:var(--track);position:relative}.bt i{position:absolute;inset:0 auto 0 0;background:var(--num)}.bt i.w{background:var(--water)}
.ax{position:relative;height:18px;margin:0 0 0 8px;border-top:1px solid var(--ink);font-size:10px;color:var(--sub)}
.ax span{position:absolute;top:0;transform:translateX(-50%);padding-top:4px;white-space:nowrap}
.ax span::before{content:"";position:absolute;left:50%;top:-1px;height:5px;border-left:1px solid var(--ink)}
.ax span:first-child{transform:none}.ax span:first-child::before{left:0}.ax span:last-child{transform:translateX(-100%)}.ax span:last-child::before{left:auto;right:0}
.kr{display:flex;align-items:center;gap:12px;margin:4px 0 0}.kr>div:first-child{flex:1}.dif{margin:0;font-size:14px}.dif b{font-size:18px;color:var(--num);font-variant-numeric:tabular-nums;margin:0 1px 0 4px}
.han2{flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;width:62px;height:62px;border:2.5px solid var(--accent);border-radius:50%;box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3.5px var(--accent);transform:rotate(-8deg);color:var(--accent);font:700 11px/1.15 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;text-align:center}.han2 b{font-size:22px;line-height:1}
.wk{margin:6px 0 0;display:grid;grid-template-columns:repeat(7,1fr);text-align:center;font-size:11px;line-height:1.2;color:var(--sub)}.wk p{margin:0}
.wk i{position:relative;display:block;width:30px;height:30px;margin:3px auto 0;font:400 13px/30px "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;font-style:normal;font-variant-numeric:tabular-nums;color:var(--ink)}
.wk .o i{color:var(--accent);font-weight:700}.wk .o i::after{content:"";position:absolute;inset:1px;border:2.2px solid var(--accent);border-radius:50%;transform:rotate(-12deg)}
.wk .x i::before,.wk .x i::after{content:"";position:absolute;left:5px;right:5px;top:50%;height:2px;margin-top:-1px;background:var(--accent);transform:rotate(40deg)}.wk .x i::after{transform:rotate(-40deg)}
.wk .t i{font-weight:700}.wk .t:not(.o):not(.x) i::after{content:"";position:absolute;inset:1px;border:1.5px dashed #9fb3a6;border-radius:50%}
.best{margin:2px 0 0;font-size:13px;color:var(--sub)}.best b{font-size:15px;color:var(--ink);margin:0 1px 0 4px}
.nx{display:flex;flex-wrap:wrap;align-items:baseline;gap:2px 16px;margin:6px 0 0;font-size:13px;color:var(--sub)}.nx .go{margin:0}
.mmc{margin:0;font-size:13px;color:var(--sub)}.mmc b{font-size:18px;color:var(--num);margin:0 1px 0 4px}`.replace(/\n/g, '');

// 地図：県の形は1回だけ（defs）。今日の地図とわたしの地図は <use> で同じ形を使う
function mapSvg(q) {
  const defs = PREFS.map((p) => `<path id="kp${p.code}" d="${JMAP.prefs[p.code].d}"/>`).join('');
  const uses = (cls) => PREFS.map((p) => `<use href="#kp${p.code}" data-c="${p.code}"${cls(p.code)}/>`).join('');
  const [ca, cb] = q.p.map((r) => r[2]);
  const frame = `<path d="${JMAP.frame}" fill="none" stroke-width=".8"/>`;
  const today = `<svg class="km" viewBox="${q.v.vb.join(' ')}" role="img" aria-label="${esc(`${q.p[0][1]}（${PN[ca].name}）と${q.p[1][1]}（${PN[cb].name}）の場所`)}"><defs>${defs}</defs><g stroke="#33413a" stroke-width=".45" stroke-linejoin="round">${uses((c) => (c === ca ? ' class="a"' : c === cb ? ' class="b"' : ''))}${frame}</g><g class="kl" font-size="${q.v.fs}">${q.p.map((r, i) => `<text x="${q.v.lab[i][0]}" y="${q.v.lab[i][1]}">${'アイ'[i]} ${esc(r[1])}</text>`).join('')}</g></svg>`;
  const mine = `<svg class="mm" viewBox="0 0 ${JMAP.w} ${JMAP.h}" role="img" aria-label="答えた県の地図"><g stroke="#33413a" stroke-width=".7" stroke-linejoin="round">${uses(() => '')}${frame}</g></svg>`;
  return { today, mine };
}

const choice = (r, i) =>
  `<li><button type="button"><span class="k">${'アイ'[i]}</span><span class="sw" style="background:${i ? KB : KA}" aria-hidden="true"></span><span class="t">${esc(r[1])}<small>${esc(PN[r[2]].name)}</small></span><span class="v"></span></button><div class="bt" hidden><i${i ? ' class="w"' : ''}></i></div></li>`;

// ブラウザ：今日の問題を出す・答える・記録（localStorage）・連続正解・7日・わたしの地図・結果を送る
const JS = `(()=>{${KYOU_JS}
const $=(s,e=document)=>e.querySelector(s);const K=JSON.parse($('#kq').textContent),M=K.m,WD='${WD}',KEY='machi-kyou';
const add=addDays,today=jstDate();
const md=d=>{const[,m,x]=d.split('-').map(Number);return m+'月'+x+'日（'+WD[new Date(d+'T00:00:00Z').getUTCDay()]+'）'};
const fmt=(m,v)=>m[3]?Number(v).toFixed(m[3]):Math.round(v).toLocaleString('ja-JP');
let R={};try{R=JSON.parse(localStorage.getItem(KEY)||'{}')||{}}catch(e){}
const save=()=>{try{localStorage.setItem(KEY,JSON.stringify(R))}catch(e){}};
const box=$('#ky'),{q,next:nx}=kyouPick(K.q,today),kd=$('#kd');
if(!q){kd.textContent=md(today);box.textContent='';const p=document.createElement('p');p.innerHTML='今日の問題を読み込めませんでした。<a href="/quiz/docchi/">どっちが多い？</a>で遊べます';box.append(p);return}
kd.textContent=md(today)+'・日本時間の0時に入れかわります';const m=M[q.mi],svg=$('.km',box),ul=$('.ch',box),bs=[...ul.querySelectorAll('button')],ans=q.p[0][3]>q.p[1][3]?0:1;
$('.qq',box).textContent=m[0];svg.setAttribute('viewBox',q.v.vb.join(' '));
svg.querySelectorAll('use').forEach(u=>{const c=u.dataset.c;u.setAttribute('class',c===q.p[0][2]?'a':c===q.p[1][2]?'b':'')});
const kl=$('.kl',svg);kl.setAttribute('font-size',q.v.fs);kl.textContent='';const NS='http://www.w3.org/2000/svg';
const tx=(x,y,t,c)=>{const e=document.createElementNS(NS,'text');e.setAttribute('x',x);e.setAttribute('y',y);if(c)e.setAttribute('class',c);e.textContent=t;kl.append(e);return e};
const names=q.p.map((r,i)=>tx(q.v.lab[i][0],q.v.lab[i][1],'アイ'[i]+' '+r[1]));
svg.setAttribute('aria-label',q.p.map(r=>r[1]+'（'+K.pn[r[2]]+'）').join('と')+'の場所');
q.p.forEach((r,i)=>{const t=$('.t',bs[i]);t.firstChild.textContent=r[1];$('small',t).textContent=K.pn[r[2]]});
const unit=m[2],dif=Math.abs(Number(Number(q.p[0][3]).toFixed(m[3]))-Number(Number(q.p[1][3]).toFixed(m[3]))),adj=(m[0].match(/が(多い|高い|広い)のは/)||[,'多い'])[1];
function shown(pick){const ok=pick===ans;ul.dataset.done=1;bs.forEach((b,i)=>{b.disabled=true;$('.v',b).textContent=fmt(m,q.p[i][3])+unit;if(i===ans)b.classList.add('ok')});if(!ok)bs[pick].classList.add('ng');
const fs=+q.v.fs;q.p.forEach((r,i)=>{tx(q.v.lab[i][0],+q.v.lab[i][1]+fs*1.15,fmt(m,r[3])+unit,'v').setAttribute('font-size',fs*.8)});
names[ans].setAttribute('class','ok');const b=names[ans].getBBox(),e=document.createElementNS(NS,'ellipse');e.setAttribute('cx',b.x+b.width/2);e.setAttribute('cy',b.y+b.height/2);e.setAttribute('rx',b.width/2+fs*.6);e.setAttribute('ry',b.height/2+fs*.25);e.setAttribute('stroke-width',fs*.1);e.setAttribute('transform','rotate(-6 '+(b.x+b.width/2)+' '+(b.y+b.height/2)+')');kl.append(e);
const mx=Math.max(q.p[0][3],q.p[1][3]),p10=Math.pow(10,Math.floor(Math.log10(mx/4))),st=[1,2,2.5,5,10].map(x=>x*p10).find(x=>x*4>=mx),top=st*4;
q.p.forEach((r,i)=>{const bt=bs[i].nextElementSibling;bt.hidden=false;$('i',bt).style.width=(r[3]/top*100).toFixed(1)+'%'});
const short=v=>unit==='人'&&!m[3]||unit==='世帯'?(v>=1e4?(v/1e4).toLocaleString('ja-JP')+'万':String(v)):(Math.round(v*100)/100).toLocaleString('ja-JP');
const ax=$('.ax',box);ax.textContent='';for(let k=0;k<=4;k++){const s=document.createElement('span');s.style.left=k*25+'%';s.textContent=k?short(st*k)+(k===4?unit:''):'0';ax.append(s)}ax.hidden=false;
const dp=$('.dif',box);dp.textContent='';const a=document.createElement('a');a.href=q.p[ans][4];a.textContent=q.p[ans][1];const bb=document.createElement('b');bb.textContent=fmt(m,dif);dp.append(a,'のほうが',bb,(unit==='%'?'ポイント':unit)+adj);dp.hidden=false;
kd.textContent=md(today)+'・つぎは'+md(add(today,1)).replace(/^\\d+月/,'')+'0時';record()}
function record(){const [s,best]=kyouStreak(R,today),h=$('.han2',box);h.hidden=!s;$('b',h).textContent=s+'日';h.setAttribute('aria-label','連続正解'+s+'日');
const wk=$('.wk',box);wk.textContent='';for(let k=-6;k<=0;k++){const d=add(today,k),x=R[d],p=document.createElement('p'),i=document.createElement('i');p.className=(k?'':'t ')+(x?x[1]?'o':'x':'');p.append(WD[new Date(d+'T00:00:00Z').getUTCDay()]);i.textContent=+d.slice(8);p.append(i);wk.append(p)}
$('.best b',box).textContent=best+'日';wk.hidden=false;$('.best',box).hidden=!best;
const nt=$('.ntt',box);if(nx){nt.textContent='あしたの題　'+M[nx.mi][0];nt.hidden=false}
const res=R[today];$('.nx',box).hidden=false;$('.send',box).onclick=async()=>{const text='まちの社会科「今日の1問」'+md(today).replace(/（.）/,'')+' '+(res[1]?'○':'×')+(s?' 連続正解'+s+'日':''),url=location.origin+location.pathname,msg=$('#sent');msg.textContent='';
try{if(navigator.share){await navigator.share({text,url});return}await navigator.clipboard.writeText(text+' '+url);msg.textContent='コピーしました'}catch(e){if(e&&e.name==='AbortError')return;msg.textContent=text+' '+url}};
const got=new Set();Object.values(R).forEach(x=>{if(x[2])got.add(x[2]);if(x[3])got.add(x[3])});const mm=$('#mymap');mm.querySelectorAll('use').forEach(u=>u.setAttribute('class',got.has(u.dataset.c)?'on':''));$('.mmc b',mm).textContent=got.size;mm.hidden=false}
bs.forEach((b,i)=>b.addEventListener('click',()=>{if(ul.dataset.done)return;R[today]=[i,i===ans?1:0,q.p[0][2],q.p[1][2]];save();shown(i)}));
const kp=kyouKeep(R,today,q);if(kp.changed)save();if(kp.done)shown(R[today][0]);else{if(Object.keys(R).length)record(),['.wk','.best','.han2','.nx','.ntt'].forEach(c=>$(c,box).hidden=true)}})();`;

export function kyouPage({ munis, machi, start, urlOfRow }) {
  const days = kyouDays(machi, start, urlOfRow);
  if (!days.length) throw new Error('今日の1問：問題が作れません');
  const q = days[0];
  const { today, mine } = mapSvg(q);
  const data = { m: machi.m.map((m) => [m[0], m[1], m[2], m[3]]), pn: Object.fromEntries(PREFS.map((p) => [p.code, p.name])), q: days };
  const nPool = kyouPool(machi).length;
  const year = munis.survey.slice(0, 4);
  return {
    path: '/quiz/kyou/',
    title: '今日の1問（どっちが多い？ 街の数字クイズ）',
    description: fit(
      [`日本時間の0時に入れかわる「どっちが多い？」の1問。人口10万人以上の${nPool}市区町村から、県のちがう2つの街を人口や面積など${machi.m.length}の数字でくらべます。`],
      [`${year}年国勢調査の数字です。`, '答えた県が地図にたまります。'],
    ),
    noAds: true,
    head: `<style>${CSS}</style><script type="application/json" id="kq">${JSON.stringify(data).replace(/</g, '\\u003c')}</script>`,
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/quiz/">クイズ</a></p>
<h1 class="city">今日の1問</h1>
<p class="kd" id="kd">${md(q.d)}・日本時間の0時に入れかわります</p>
<section id="ky" class="qz" aria-live="polite"><p class="qq">${esc(machi.m[q.mi][0])}</p>
${today}
<ul class="ch">${q.p.map(choice).join('')}</ul>
<div class="ax" hidden></div>
<div class="kr"><div><p class="dif" hidden></p><p class="best" hidden>いままでの最高<b></b></p></div><div class="han2" role="img" aria-label="連続正解" hidden>連続正解<b></b></div></div>
<div class="wk" aria-label="この7日の記録" hidden></div>
<p class="nx" hidden><button class="go send" type="button">結果を送る</button><span class="ntt" hidden></span><a href="/quiz/docchi/">どっちが多い？を10問</a></p><p class="note" id="sent"></p>
</section>
<noscript><p>このクイズはスクリプトで動きます。</p></noscript>
<section id="mymap" hidden>${h2('わたしの地図')}<p class="mmc">答えた県<b>0</b>／47</p>${mine}</section>
${srcKokusei(munis)}`,
    script: JS,
  };
}
