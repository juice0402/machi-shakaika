// 期限メモ（/dougu/kigen/）：家の備えの賞味期限・使用期限を入れると、期限の近い順に並ぶ
// メモはブラウザの中（localStorage）と、URL の # より後ろ（ブラウザがサーバーに送らない部分）にだけ入れる。どこにも送らない
//   iPhone の Safari はしばらく開かないサイトの localStorage を消すので、URL・カレンダー（.ics）・文字の書き出しでも残せる
//   開いた URL と localStorage がちがえば、どちらを使うかをたずねる（勝手に上書きしない）
// えらべる品目は items.yml の checklists の kigen（記号と短い名前）。記号は URL に入るので変えない
// AdSense は置かない：広告のスクリプトはページの URL を読むので、# より後ろのメモが広告配信の側に渡るおそれがあるため
// 部品（URL の文字・.ics・並べ方・残り）は src/kigen-core.mjs（toString でページに入れ、テストでも同じ関数を使う）
import { esc, h2, fit } from '../layout.mjs';
import { KIGEN_JS } from '../kigen-core.mjs';

// カレンダーの通知を期限の何日前にするか（品目に関係なく1つ）。期限が近い印もこの日数から
// 入れかえの時期の公的な目安ではない（公的な目安が見つからないので、入れかえの数字は書かない）
export const KIGEN_NOTICE_DAYS = 30;

// えらべる品目：[記号, 名前, 品目ページ（ないものは ''）]
export function kigenChoices(items) {
  const out = [];
  for (const cl of items.checklists) {
    for (const e of cl.entries) {
      if (!e.kigen) continue;
      const it = e.item ? items.items.find((x) => x.id === e.item) : null;
      out.push([e.kigen[0], e.kigen[1], it?.hinmoku ? `/hinmoku/${it.id}/` : '']);
    }
  }
  return out;
}

// ものさしの目盛り（1年を12か月。3・6・9か月は少し長く）
const RULER = (() => {
  const d = Array.from({ length: 13 }, (_, i) => `M${i * 10} 12V${i % 12 === 0 ? 1 : i % 3 === 0 ? 5 : 8}`).join('');
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 120 12' preserveAspectRatio='none'><path d='${d}M0 11.5H120' stroke='%239fb3a6' stroke-width='1' fill='none' vector-effect='non-scaling-stroke'/></svg>`;
  return `url("data:image/svg+xml,${svg.replace(/</g, '%3C').replace(/>/g, '%3E')}")`;
})();

const CSS = `<style>
.ask{margin:8px 0;padding:8px 0;border-top:1px solid var(--line);border-bottom:1px solid var(--line);font-size:14px;line-height:1.6}
.ask button{font:inherit;font-size:15px;font-weight:700;background:none;border:0;padding:6px 0;margin-right:18px;color:var(--ink);text-decoration:underline;cursor:pointer}
.kf .k{flex:none}
.kf input,.kf select{font:inherit;font-size:16px;color:var(--ink);background:none;border:0;border-bottom:1.5px solid var(--ink);border-radius:0;padding:6px 2px;min-width:0}
.kf #kn{flex:1}.kf #kq{width:3em;text-align:right}.kf .qk{font-size:13px;color:var(--sub)}
.kf .row .add{min-width:0;margin-left:auto;padding:0 2px;font-size:17px;font-weight:700;text-decoration:underline;text-underline-offset:4px}
.kf .row .add:disabled{color:var(--sub);text-decoration:none}
.kw{margin:0;padding:2px 0 4px;line-height:1.2;border-bottom:1px dotted var(--line);white-space:nowrap;overflow-x:auto}
.kw button{position:relative;font:inherit;font-size:14px;background:none;border:0;padding:8px 5px;margin:0 1px;min-height:36px;color:var(--ink);text-decoration:underline dotted var(--sub);text-underline-offset:4px;cursor:pointer}
.kw button[aria-pressed=true]{color:var(--accent);font-weight:700;text-decoration:none}
.kw button[aria-pressed=true]::after{content:"";position:absolute;inset:4px -1px;border:2px solid var(--accent);border-radius:50%;transform:rotate(-4deg);pointer-events:none}
.kmsg{margin:6px 0 0;font-size:13px;color:var(--sub);min-height:0}.kmsg:empty{display:none}
.kmsg button{font:inherit;font-weight:700;background:none;border:0;padding:4px 0;margin-left:10px;color:var(--ink);text-decoration:underline;cursor:pointer}
.kh,.kl li{display:grid;grid-template-columns:30px 1fr 112px;column-gap:8px;align-items:center}
.kh{margin:12px 0 0;height:15px;font-size:10px;color:var(--sub)}
.kh .kr{grid-column:2;position:relative;height:15px}.kh .kr span{position:absolute;top:0;transform:translateX(-50%);white-space:nowrap}
.kh .kr span:first-child{left:0;transform:none}.kh .kr span:last-child{transform:translateX(-100%)}
.kl{list-style:none;margin:0;padding:0}
.kl li{row-gap:3px;padding:7px 0;border-bottom:1px dotted var(--line)}
.kx{grid-column:1;grid-row:1/3;width:28px;height:28px;padding:0;border:1.5px solid #9fb3a6;border-radius:50%;background:none;font:700 11px/1 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;color:#c3cfc7;cursor:pointer}
.kx:focus-visible{outline:2px solid var(--water);outline-offset:2px}
.kn{grid-column:2;grid-row:1;font-size:15px;line-height:1.4;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
a.kn{text-decoration:underline dotted var(--sub);text-underline-offset:3px}.kn small{display:inline-block;font-size:12px;color:var(--sub);margin-left:6px}
.kt{grid-column:3;grid-row:1;justify-self:end;font-size:14px;font-weight:700;color:var(--num);white-space:nowrap;font-variant-numeric:tabular-nums}
.kg{grid-column:2;grid-row:2;position:relative;height:12px;background:${RULER} 0 0/100% 100% no-repeat}
.kg i{position:absolute;left:0;bottom:0;height:4px;background:var(--bar)}
.kd{grid-column:3;grid-row:2;justify-self:end;font-size:11px;color:var(--sub);white-space:nowrap;font-variant-numeric:tabular-nums}
.near .kt{color:var(--accent);padding:1px 5px;border:1.5px solid var(--accent);border-radius:3px;box-shadow:inset 0 0 0 1.5px #fff,inset 0 0 0 2.5px var(--accent);transform:rotate(-3deg)}
.k0{margin:0;padding:12px 0;font-size:13px;color:var(--sub);border-bottom:1px dotted var(--line)}
.kk{list-style:none;margin:0;padding:0}.kk li{padding:4px 0;border-bottom:1px dotted var(--line)}.kk small{display:block;font-size:12px;color:var(--sub);margin:-2px 0 4px}
.kk .go{margin:2px 0 0}
#kout{width:100%;height:9em;font:13px/1.5 inherit;border:1px solid var(--line);border-radius:0;padding:6px;color:var(--ink);background:none}
</style>`;

const kigenJs = (C, notice) => `(()=>{${KIGEN_JS}
const C=${JSON.stringify(C).replace(/</g, '\\u003c')},K='machi-kigen-v1',NEAR=${notice},$=s=>document.querySelector(s);
const now=new Date(),T=[now.getFullYear(),now.getMonth()+1,now.getDate()];
const ls={get(){try{return localStorage.getItem(K)||''}catch(e){return ''}},set(v){try{if(v)localStorage.setItem(K,v);else localStorage.removeItem(K)}catch(e){}}};
const nm=$('#kn'),qt=$('#kq'),yy=$('#ky'),mm=$('#km'),dd=$('#kd'),add=$('#kadd'),ul=$('#kl'),msg=$('#kmsg'),ask=$('#kask'),keep=$('#kp'),out=$('#kout'),words=[...document.querySelectorAll('#kw button')];
const hp={};C.forEach(c=>{hp[c[1]]=c[2]});
let L=[],asking=false;
for(let y=T[0];y<=T[0]+15;y++)yy.add(new Option(y+'年',y));yy.value=T[0]+1;
for(let m=1;m<=12;m++)mm.add(new Option(m+'月',m));mm.value=T[1];
for(let d=1;d<=31;d++)dd.add(new Option(d+'日',d));
const link=()=>location.origin+location.pathname+(kStr(L,C)?'#'+kStr(L,C):'');
function say(t,act){msg.textContent=t;if(act){const b=document.createElement('button');b.type='button';b.textContent=act[0];b.addEventListener('click',act[1]);msg.append(b)}}
function save(){ls.set(kStr(L,C))}
function clean(){if(location.hash)history.replaceState(null,'',location.pathname+location.search)}
function draw(){ul.textContent='';
L.forEach((e,i)=>{const r=kLeft(e,T),li=document.createElement('li');if(r.days<=NEAR)li.className='near';
const x=document.createElement('button');x.type='button';x.className='kx';x.textContent='済';x.setAttribute('aria-label',e.n+' '+kDate(e)+' を使った・入れかえたので消す');
x.addEventListener('click',()=>{if(asking)return;const g=L.splice(i,1)[0];save();draw();say(g.n+'（'+kDate(g)+'）を消しました',['もとに戻す',()=>{L=kSort(L.concat([g]));save();draw();say('')}])});
const n=document.createElement(hp[e.n]?'a':'span');n.className='kn';if(hp[e.n])n.href=hp[e.n];n.textContent=e.n;if(e.q){const s=document.createElement('small');s.textContent='×'+e.q;n.append(s)}
const t=document.createElement('span');t.className='kt';t.textContent=r.text;
const g=document.createElement('span');g.className='kg';g.setAttribute('aria-hidden','true');const bar=document.createElement('i');bar.style.width=(r.frac*100).toFixed(1)+'%';g.append(bar);
const d=document.createElement('span');d.className='kd';d.textContent=kDate(e);
li.append(x,n,t,g,d);ul.append(li)});
$('#k0').hidden=L.length>0;keep.hidden=!L.length;$('#kn2').textContent=L.length;out.hidden=true;add.disabled=asking}
function pick(){words.forEach(b=>b.setAttribute('aria-pressed',b.textContent===nm.value))}
words.forEach(b=>b.addEventListener('click',()=>{nm.value=b.textContent;pick()}));nm.addEventListener('input',pick);
$('#kf').addEventListener('submit',ev=>{ev.preventDefault();if(asking)return;const n=kName(nm.value),y=+yy.value,m=+mm.value,d=+dd.value||0,q=Math.min(999,Math.max(0,Math.floor(+qt.value)||0));
if(!n){say('品目の名前を入れてください');nm.focus();return}
if(d>kMonthEnd(y,m)){say(y+'年'+m+'月は'+kMonthEnd(y,m)+'日までです');return}
if(L.length>=50){say('入れられるのは50件までです');return}
L=kSort(L.concat([{n,y,m,d,q}]));save();draw();qt.value='';say(n+'（'+y+'年'+m+'月'+(d?d+'日':'')+'）を入れました')});
function load(){ask.hidden=true;asking=false;say('');const h=location.hash;clean();const mine=kRead(ls.get(),C).list,r=kRead(h,C);
if(!r.ok||!r.list.length){L=mine;save();draw();if(!r.ok||r.bad)say('URLのメモは読めませんでした');return}
if(!mine.length||kStr(mine,C)===kStr(r.list,C)){L=r.list;save();draw();if(r.bad)say('読めない'+r.bad+'件を外しました');return}
L=r.list;asking=true;draw();$('#kau').textContent=r.list.length;$('#kam').textContent=mine.length;ask.hidden=false;if(r.bad)say('読めない'+r.bad+'件を外しました');
$('#kuse').onclick=()=>{asking=false;ask.hidden=true;save();draw();say('URLのメモを使います')};
$('#kmine').onclick=()=>{asking=false;ask.hidden=true;L=mine;save();draw();say('この端末のメモを使います')}}
window.addEventListener('hashchange',load);load();
const ad=document.body.dataset.adsLate;if(ad){const s=document.createElement('script');s.async=true;s.crossOrigin='anonymous';s.src=ad;document.head.append(s)}
async function copy(t,ok){try{await navigator.clipboard.writeText(t);say(ok)}catch(e){out.value=t;out.hidden=false;out.select();say('下の文字をコピーしてください')}}
$('#kshare').addEventListener('click',async()=>{const u=link();if(navigator.share){try{await navigator.share({title:'期限メモ',url:u});return}catch(e){if(e&&e.name==='AbortError')return}}copy(u,'URLをコピーしました')});
$('#kics').addEventListener('click',()=>{const b=new Blob([kIcs(L,{now:new Date(),url:link(),before:NEAR})],{type:'text/calendar;charset=utf-8'}),a=document.createElement('a');
a.href=URL.createObjectURL(b);a.download='kigen-memo.ics';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(a.href),60000);say('カレンダーのファイルを作りました')});
$('#ktext').addEventListener('click',()=>copy(kText(L,T,link()),'コピーしました'));
$('#kclr').addEventListener('click',()=>{if(asking||!L.length)return;const g=L;L=[];save();draw();say('すべて消しました',['もとに戻す',()=>{L=g;save();draw();say('')}])})})();`;

// ページの下の説明（夜 #47）：しくみ・えらべる品目・よくある問い。日数は KIGEN_NOTICE_DAYS、品目は items.yml の checklists から
const qa = (q, a) => `<h3>${q}</h3>\n<p>${a}</p>`;
function more(C, n) {
  const withPage = C.filter((c) => c[2]);
  return `<div class="prose">
${h2('しくみ')}
<p>入れた期限は、近い順に並びます。横の目盛りは今日から1年先までで、短いほど期限が近いことを表します。</p>
<p>期限まで${n}日以内になると、残りの日数に朱のはんこがつきます。日を入れずに月までにしたときは、その月の終わりの日を期限として数えます。</p>
${h2('えらべる品目')}
<p>品目の欄の下には、${C.map((c) => esc(c[1])).join('・')}の${C.length}つが並んでいます。チェックリストの家に置く備えのうち、期限があるものです。</p>
${withPage.length ? `<p>${withPage.map((c) => `<a href="${c[2]}">${esc(c[1])}</a>`).join('と')}は、品目のページに量のめやすがあります。</p>` : ''}
<p>薬やミルクなど、並んでいないものは名前を書いて入れられます。</p>
${h2('よくある問い')}
${qa('メモはどこに残りますか', 'この端末のブラウザの中と、「URLを送る」で作ったURLの中だけです。当サイトには送りません。しばらく開かないと、ブラウザの中のメモが消えることがあります。送ったURLを開けば、同じメモに戻せます。')}
${qa('カレンダーには何が入りますか', `期限の日に、品目の名前を入れた1日の予定が入ります。通知は、期限の${n}日前の朝です。`)}
${qa('入れかえの時期のめやすは', `公的な資料にめやすが見つからないので、このページでは書いていません。${n}日前の通知は、買い足しを思い出すためのものです。期限の近いものから使って買い足す<a href="/sonae/rolling-stock/">ローリングストック</a>もあります。`)}
</div>`;
}

export function kigenPages({ items }) {
  const C = kigenChoices(items);
  const names = C.map((c) => c[1]);
  const n = KIGEN_NOTICE_DAYS;
  return [
    {
      path: '/dougu/kigen/',
      title: '期限メモ（備えの賞味期限・使用期限）',
      description: fit(
        [`${names.join('・')}など家の備えの賞味期限や使用期限を入れると、期限の近い順に並び、あと何か月かを目盛りで見られます。`],
        [
          [`期限ごとの予定を${n}日前の通知つきでカレンダーに入れられ、メモはブラウザとURLの中だけに残ります。`, `期限ごとに${n}日前の通知つきでカレンダーに入れられます。`],
        ],
      ),
      adsLate: true,
      head: CSS,
      body: `<p class="crumb"><a href="/">トップ</a> / <a href="/sonae/">備えの知識</a></p>
<h1 class="city">期限メモ</h1>
<p class="lead">家の備えの期限を入れると、近い順に並びます</p>
<p class="ask" id="kask" hidden aria-live="polite">URLとこの端末で、メモがちがいます。どちらを使いますか<br><button type="button" id="kuse">URLの<span id="kau">0</span>件</button><button type="button" id="kmine">この端末の<span id="kam">0</span>件</button></p>
<form class="kf" id="kf" autocomplete="off">
<div class="row"><label class="k" for="kn">品目</label><input id="kn" type="text" maxlength="20" placeholder="薬など" enterkeyhint="done"><label class="qk" for="kq">数</label><input id="kq" type="number" inputmode="numeric" min="1" max="999" placeholder="-"></div>
<p class="kw" id="kw">${names.map((x) => `<button type="button" aria-pressed="false">${esc(x)}</button>`).join('')}</p>
<div class="row"><span class="k">期限</span><select id="ky" aria-label="年"></select><select id="km" aria-label="月"></select><select id="kd" aria-label="日（なくてもよい）"><option value="">日</option></select><button class="add" id="kadd" type="submit">入れる</button></div>
</form>
<p class="kmsg" id="kmsg" aria-live="polite"></p>
<div class="kh" aria-hidden="true"><span class="kr"><span>今日</span><span style="left:25%">3か月</span><span style="left:50%">半年</span><span style="left:100%">1年</span></span></div>
<ul class="kl" id="kl"></ul>
<p class="k0" id="k0">まだ何も入っていません</p>
<noscript><p>期限メモはスクリプトで動きます。</p></noscript>
<section id="kp" hidden>
${h2('このメモを残す')}
<p class="src">この端末の中のメモは、しばらく開かないと消えることがあります</p>
<ul class="kk">
<li><button class="go" type="button" id="kshare">URLを送る・コピーする</button><small>送ったURLを開くと、同じメモが出ます</small></li>
<li><button class="go" type="button" id="kics">カレンダーに入れる</button><small><span id="kn2">0</span>件の期限の日に予定、${n}日前に通知</small></li>
<li><button class="go" type="button" id="ktext">文字で書き出す</button></li>
</ul>
<textarea id="kout" readonly hidden aria-label="書き出した文字"></textarea>
<p class="note">メモはこの端末と、送ったURLの中だけに入り、当サイトには送りません</p>
<p><button class="clr" type="button" id="kclr">すべて消す</button></p>
</section>
${more(C, n)}
${h2('あわせて')}
<ul class="list"><li><a href="/dougu/keisan/">備蓄の量を計算する</a></li><li><a href="/dougu/check/">チェックリスト</a></li><li><a href="/dougu/print/">冷蔵庫に貼る紙（A4）</a></li><li><a href="/sonae/rolling-stock/">ローリングストック</a></li><li><a href="/hinmoku/">品目ごとのめやす</a></li></ul>`,
      script: kigenJs(C, n),
    },
  ];
}
