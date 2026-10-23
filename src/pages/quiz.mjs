// クイズの棚（/quiz/）と、どっちが多い（/quiz/docchi/）・ドボンクイズ（/quiz/dobon/）・備えの数字クイズ（/quiz/sonae/）
// 見た目は小テスト：選択肢は「ア・イ・ウ」、正解に赤ペンの丸、まちがえた所にバツ。紙吹雪や絵文字は使わない
// 回答はどこにも送らない。結果を送るのは「◯問中◯問」の文とURLだけ（見る人がえらんだときだけ）
// AdSense は置かない（答えのボタンの近くに自動広告が入ると誤クリックをまねくため）
// どっちが多い・ドボンクイズは、開いたときに /quiz/machi.json（都道府県47と全国の市区町村の数字）を読み、問題を毎回ブラウザで作る
import { esc, h2, srcKokusei } from '../layout.mjs';
import { PREFS } from '../areas.mjs';
import { TILES, short } from './top.mjs';
import { sonaeData } from '../quiz.mjs';
import { CORE_JS } from '../quiz-core.mjs';

const KANA = 'アイウ';
const data = (obj) => `<script type="application/json" id="qd">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

// 共通：選択肢を作る・答える・結果を送る・データを読む・範囲をおぼえる（この端末の中だけ）
const COMMON = `const KANA='${KANA}';const $=(s,e=document)=>e.querySelector(s);const R=n=>Math.floor(Math.random()*n);
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=R(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
function choices(ul,labels,subs,vals,ans,done){ul.textContent='';labels.forEach((t,i)=>{const li=document.createElement('li'),b=document.createElement('button');b.type='button';
const k=document.createElement('span');k.className='k';k.textContent=KANA[i];const s=document.createElement('span');s.className='t';s.textContent=t;
if(subs&&subs[i]){const m=document.createElement('small');m.textContent=subs[i];s.append(m)}b.append(k,s);
if(vals){const v=document.createElement('span');v.className='v';v.textContent=vals[i];b.append(v)}
b.addEventListener('click',()=>{if(ul.dataset.done)return;ul.dataset.done=1;ul.querySelectorAll('button').forEach((x,j)=>{x.disabled=true;if(j===ans)x.classList.add('ok')});if(i!==ans)b.classList.add('ng');done(i===ans)});li.append(b);ul.append(li)})}
function share(btn,get){btn.addEventListener('click',async()=>{const url=location.origin+location.pathname,text=get(),msg=document.getElementById('sent');
try{if(navigator.share){await navigator.share({text,url});return}await navigator.clipboard.writeText(text+' '+url);msg.textContent='コピーしました'}catch(e){if(e&&e.name==='AbortError')return;msg.textContent=text+' '+url}})}
const load=()=>fetch('/quiz/machi.json').then(r=>{if(!r.ok)throw 0;return r.json()});
function scope(sel,key){try{const v=localStorage.getItem(key);if(v!=null&&[...sel.options].some(o=>o.value===v))sel.value=v}catch(e){}return()=>{try{localStorage.setItem(key,sel.value)}catch(e){}}}`;

// 出題の範囲（<select>）
const scopeSelect = (id, withBig) => `<p class="sc"><label for="${id}">出題の範囲</label> <select id="${id}"><option value="">おまかせ</option><option value="p">都道府県</option>${withBig ? '<option value="big">人口10万人以上の市区町村</option>' : ''}<option value="all">全国の市区町村</option><optgroup label="県の中の市区町村">${PREFS.map((p) => `<option value="${p.code}">${esc(p.name)}</option>`).join('')}</optgroup></select></p>`;

const DOCCHI_JS = `(()=>{${COMMON}
${CORE_JS}
const box=$('#quiz'),meta=$('.meta',box),qq=$('.qq',box),ul=$('.ch',box),ex=$('.ex',box),next=$('.next',box),res=$('#res'),sel=$('#sc');const save=scope(sel,'machi-docchi');let D,PN={},qs,i,score,N=10;
const sub=(r,k)=>k==='m'?PN[r[0].slice(0,2)][1]:'',url=(r,k)=>k==='p'?'/'+r[2]+'/':(r[2]||'/'+PN[r[0].slice(0,2)][2]+'/#m'+r[0]);
function show(){const q=qs[i],m=D.m[q.mi];meta.textContent=(i+1)+'／'+qs.length;qq.textContent=m[0];ex.hidden=true;next.hidden=true;delete ul.dataset.done;
const vals=q.p.map(r=>r[3+q.mi]),ans=vals[0]>vals[1]?0:1;choices(ul,q.p.map(r=>r[1]),q.p.map(r=>sub(r,q.kind)),vals.map(v=>qFmt(m,v)+m[2]),ans,ok=>{if(ok)score++;
ex.textContent='';q.p.forEach((r,j)=>{const l=document.createElement('a');l.href=url(r,q.kind);l.textContent=r[1];ex.append(l,' '+qFmt(m,vals[j])+m[2]+(j?'':'　'))});ex.hidden=false;next.textContent=i<qs.length-1?'次の問題':'結果を見る';next.hidden=false})}
function start(){qs=qDocchi(D,sel.value,Math.random,N);i=0;score=0;res.hidden=true;box.hidden=false;if(!qs.length){qq.textContent='この範囲では問題が作れませんでした';return}show()}
next.addEventListener('click',()=>{if(i<qs.length-1){i++;show()}else{box.hidden=true;res.hidden=false;$('.score b',res).textContent=score;$('.score span',res).textContent='／'+qs.length;
const s=sel.value,where=s===''?'':'（'+sel.options[sel.selectedIndex].text+'）';res.dataset.text='まちの社会科「どっちが多い？」'+where+qs.length+'問中'+score+'問正解';$('#sent').textContent='';window.scrollTo(0,0)}});
sel.addEventListener('change',()=>{save();if(D)start()});$('.again',res).addEventListener('click',start);share($('.send',res),()=>res.dataset.text);
qq.textContent='読み込み中';load().then(d=>{D=d;D.prefs.forEach(p=>PN[p[0]]=p);start()}).catch(()=>{qq.textContent='読み込めませんでした'})})();`;

const DOBON_JS = `(()=>{${COMMON}
${CORE_JS}
const box=$('#db'),map=$('.t5',box),words=$('.gogun',box),tiles=[...map.querySelectorAll('.tile')],ol=$('.t5l',box),res=$('.dbr',box),nav=$('.dbn',box),sel=$('#sc');const save=scope(sel,'machi-dobon');
let D,PN={},TP,t,order,found,over,last='',btns=[];
const url=r=>t.scope==='p'?'/'+r[2]+'/':(r[2]||'/'+PN[r[0].slice(0,2)][2]+'/#m'+r[0]);
const fm=v=>{const m=D.m[t.mi];return qFmt([m[0],m[1],m[2],t.digits],v)+m[2]};
function pick(){const s=sel.value;let list=TP.filter(x=>s===''||x.scope===s);if(s===''){const r=Math.random(),k=r<.3?'p':r<.5?'all':'pref';list=TP.filter(x=>k==='pref'?x.scope.length===2&&x.scope!=='p':x.scope===k)}return list[R(list.length)]}
function slot(i,r,cls){const li=ol.children[i];li.textContent='';const a=document.createElement('a');a.href=url(r);a.textContent=r[1];li.append(a,'　'+fm(r[3+t.mi]));li.className=cls}
function topic(){t=pick();if(!t)return;const b=qDobonBoard(D,t,Math.random);order=b.order;found=new Set();over=false;const m=D.m[t.mi],N=t.N;
$('.qq',box).textContent=t.scope==='p'?m[1]+'都道府県トップ'+N:(t.scope==='all'?'全国で':PN[t.scope][1]+'で')+m[1]+'市区町村トップ'+N;
map.hidden=t.board!=='map';words.hidden=t.board!=='words';tiles.forEach(x=>{x.className='tile';x.disabled=false});words.textContent='';btns=[];
if(t.board==='words')b.board.forEach(r=>{const w=document.createElement('button');w.type='button';w.className='w';w.dataset.c=r[0];w.textContent=r[1];if(t.scope==='all'){const s=document.createElement('small');s.textContent=PN[r[0].slice(0,2)][1];w.append(s)}w.addEventListener('click',()=>tap(w));words.append(w);btns.push(w)});
ol.textContent='';for(let i=0;i<N;i++){const li=document.createElement('li');li.className='blank';li.textContent='　';ol.append(li)}res.hidden=true;nav.hidden=true;$('#sent').textContent='';info()}
const all=()=>t.board==='map'?tiles:btns;
function info(){$('.meta',box).textContent=over?'':found.size?'見つけた '+found.size+'／'+t.N:'トップ'+t.N+'に入る'+(t.scope==='p'?'都道府県':'市区町村')+'を1つずつ。'+(t.N+1)+'位より下はドボン'}
function end(win,r,rank){over=true;order.slice(0,t.N).forEach((x,i)=>{if(!found.has(x[0])){slot(i,x,'rest');const el=all().find(e=>e.dataset.c===x[0]);if(el)el.classList.add('ans5')}});all().forEach(e=>e.disabled=true);
$('.score b',res).textContent=found.size;$('.score span',res).textContent='／'+t.N;$('.dbm',res).textContent=win?'パーフェクト':'ドボン　'+r[1]+'は'+(rank+1)+'位';res.hidden=false;nav.hidden=false;
last='まちの社会科「ドボンクイズ」'+$('.qq',box).textContent+' '+t.N+'個中'+found.size+'個'+(win?'（パーフェクト）':'');info()}
function tap(el){if(over||el.classList.contains('hit'))return;const c=el.dataset.c,rank=order.findIndex(r=>r[0]===c),r=order[rank];
if(rank>=0&&rank<t.N){el.classList.add('hit');found.add(c);slot(rank,r,'got');info();if(found.size===t.N)end(true)}else{el.classList.add('miss');end(false,r,rank)}}
tiles.forEach(x=>x.addEventListener('click',()=>tap(x)));
$('.next',nav).addEventListener('click',()=>{topic();box.scrollIntoView()});sel.addEventListener('change',()=>{save();if(D)topic()});share($('.send',nav),()=>last);
$('.qq',box).textContent='読み込み中';load().then(d=>{D=d;D.prefs.forEach(p=>PN[p[0]]=p);TP=qDobonTopics(D);topic()}).catch(()=>{$('.qq',box).textContent='読み込めませんでした'})})();`;

export function quizPages({ munis, items, sources }) {
  const out = [];
  const src = srcKokusei(munis);

  out.push({
    path: '/quiz/',
    title: 'クイズ（街の数字・備えの数字）',
    description: '2025年国勢調査の数字でくらべる「どっちが多い？」「ドボンクイズ」と、家の備えの量の「備えの数字クイズ」。全国の市区町村から毎回ちがう問題、答えはその場で出典つき。',
    noAds: true,
    body: `<p class="crumb"><a href="/">トップ</a></p>
<h1 class="city">クイズ</h1>
${h2('街の数字クイズ')}
<ul class="list"><li><a href="/quiz/docchi/">どっちが多い？</a><small class="sub">都道府県・全国の市区町村・県の中から、2択を10問</small></li><li><a href="/quiz/dobon/">ドボンクイズ</a><small class="sub">トップ10を1つずつ当てる。外れたらドボン</small></li></ul>
<p class="note">市区町村のページの中にも、その街のクイズがあります（例：<a href="/osaka/sakai/">堺市</a>）。</p>
${h2('備えの数字クイズ')}
<ul class="list"><li><a href="/quiz/sonae/">備えの数字クイズ</a><small class="sub">水・食事・携帯トイレの量のめやす5問</small></li></ul>
<p class="note">答えはこの端末の中だけで決まり、どこにも送りません。</p>`,
  });

  out.push({
    path: '/quiz/docchi/',
    title: 'どっちが多い？ 街と都道府県の数字クイズ',
    description: '2つの市区町村・都道府県の人口や面積、1世帯の人数、一戸建ての割合などをくらべる2択クイズ。全国の市区町村から毎回ちがう10問、2025年国勢調査の数字です。',
    noAds: true,
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/quiz/">クイズ</a></p>
<h1 class="city">どっちが多い？</h1>
${scopeSelect('sc', true)}
<section id="quiz" class="qz"><p class="meta"></p><p class="qq"></p><ul class="ch"></ul><p class="ex" hidden></p><p><button class="go next" type="button" hidden>次の問題</button></p></section>
<section id="res" class="qz" hidden aria-live="polite"><p class="score"><b>0</b><span>／10</span></p><p><button class="go send" type="button">結果を送る</button>　<button class="go again" type="button">もう一度</button></p><p class="note" id="sent"></p>
<p><a href="/ranking/jinko/">人口が増えた市区町村</a>・<a href="/quiz/dobon/">ドボンクイズ</a></p></section>
<noscript><p>このクイズはスクリプトで動きます。</p></noscript>
${src}`,
    script: DOCCHI_JS,
  });

  const tiles = PREFS.map((p) => {
    const [x, y] = TILES[p.slug];
    return `<button type="button" class="tile" data-c="${p.code}" style="grid-column:${x + 1};grid-row:${y + 1}" aria-label="${esc(p.name)}">${short(p.name)}</button>`;
  }).join('');
  out.push({
    path: '/quiz/dobon/',
    title: 'ドボンクイズ（都道府県・市区町村のトップ10を当てる）',
    description: '人口が多い・面積が広い・一戸建ての割合が高いなど、トップ10に入る都道府県や市区町村を1つずつえらぶクイズ。11位より下をえらんだらドボン。全国と47都道府県それぞれのお題、2025年国勢調査の数字です。',
    noAds: true,
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/quiz/">クイズ</a></p>
<h1 class="city">ドボンクイズ</h1>
${scopeSelect('sc', false)}
<section id="db" class="qz"><p class="qq"></p><p class="meta"></p>
<div class="tiles t5">${tiles}</div><div class="gogun" hidden></div>
<div class="dbr" hidden aria-live="polite"><p class="score"><b>0</b><span>／10</span></p><p class="dbm"></p></div>
<ol class="t5l"></ol>
<p class="dbn" hidden><button class="go next" type="button">次のお題</button>　<button class="go send" type="button">結果を送る</button></p><p class="note" id="sent"></p></section>
<noscript><p>このクイズはスクリプトで動きます。</p></noscript>
${src}`,
    script: DOBON_JS,
  });

  // 備えの数字クイズ（items.yml の数字だけ。人数と日数は毎回えらぶ）
  const sd = sonaeData(items, sources);
  out.push({
    path: '/quiz/sonae/',
    title: '備えの数字クイズ（水・食事・携帯トイレの量）',
    description: `家族の人数と日数で、水・食事・携帯トイレはどれだけ？ 公的な資料の数字（水は1人1日${sd.w}L、携帯トイレは${sd.t}回など）から毎回ちがう5問。答えに出典つき。`,
    noAds: true,
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/quiz/">クイズ</a></p>
<h1 class="city">備えの数字クイズ</h1>
<section id="quiz" class="qz"><p class="meta"></p><p class="qq"></p><ul class="ch"></ul><div class="ex" hidden></div><p><button class="go next" type="button" hidden>次の問題</button></p></section>
<section id="res" class="qz" hidden aria-live="polite"><p class="score"><b>0</b><span>／5</span></p><p><a class="go" href="/dougu/keisan/">わが家の人数で計算する</a></p><p><button class="go send" type="button">結果を送る</button>　<button class="go again" type="button">もう一度</button></p><p class="note" id="sent"></p></section>
<noscript><p>このクイズはスクリプトで動きます。</p></noscript>
<p class="src">数字は公的な資料のめやすです。家の備えは人数分、最低${sd.min}日分、できれば${sd.better}日分</p>`,
    head: data(sd),
    script: `(()=>{${COMMON}
const D=JSON.parse($('#qd').textContent),N=5,f=v=>v.toLocaleString('ja-JP');const nd=()=>[1+R(6),Math.random()<.5?D.min:D.better];
const dist=(c,x=[Math.max(1,Math.round(c/2)),c*2])=>{const s=[...new Set(x.filter(v=>v>0&&v!==c))];return s.length>=2?s.slice(0,2):[c+1,c+2]};
const three=(c,unit,o)=>{const ch=[c,...dist(c,o)];return{ch:ch.map(v=>f(v)+unit),a:0}};
const U=u=>u==='回分'?'回':u;
function calc(per,unit,what,src,extra,link){const [n,d]=nd(),c=per*n*d;return{q:n+'人家族の'+d+'日分、'+what+'は？',...three(c,unit),ex:'1人1日'+per+U(unit)+'×'+n+'人×'+d+'日＝'+f(c)+unit+'。'+extra,src,link:link||['/dougu/keisan/?n='+n+'&d='+d,'計算で確かめる']}}
const T=[()=>calc(D.w,'L','水','mizu','飲み水と調理に使う水の量です'),()=>calc(D.m,'食','主食','shoku','1人1日'+D.m+'食で数えます'),()=>calc(D.t,'回分','携帯トイレ','toilet','断水や停電で水洗トイレが使えないときの量です'),
()=>{const [n,d]=nd(),l=D.w*n*d,c=Math.ceil(l/2);return{q:n+'人家族の'+d+'日分の水を、2Lのペットボトルでそろえると何本？',...three(c,'本'),ex:D.w+'L×'+n+'人×'+d+'日＝'+f(l)+'L。2Lずつで'+f(c)+'本です',src:'bottle',link:['/hinmoku/mizu/','備蓄の水']}},
()=>{const [n,d]=nd(),l=D.w*n*d,c=Math.ceil(l/12);return{q:n+'人家族の'+d+'日分の水を、2L×6本入りの箱でそろえると何箱？',...three(c,'箱',[c+1,c*2,Math.max(1,c-1)]),ex:D.w+'L×'+n+'人×'+d+'日＝'+f(l)+'L。1箱は12Lなので'+f(c)+'箱です',src:'bottle',link:['/hinmoku/mizu/','備蓄の水']}},
()=>{const [n,d]=nd(),l=D.w*n*d,ch=[D.min,D.better,D.y];return{q:n+'人家族で、水を'+f(l)+'L用意しました。何日分？',ch:ch.map(v=>v+'日分'),a:ch.indexOf(d),ex:f(l)+'L ÷（1人1日'+D.w+'L×'+n+'人）＝'+d+'日分です',src:'mizu',link:['/dougu/keisan/?n='+n+'&d='+d,'計算で確かめる']}},
()=>{const [n,d]=nd(),c=D.t*n*d;return{q:'携帯トイレ'+f(c)+'回分は、'+d+'日分なら何人分？',...three(n,'人分',[n+1,n+2,n>1?n-1:n+3]),ex:f(c)+'回 ÷（1人1日'+D.t+'回×'+d+'日）＝'+n+'人分です',src:'toilet',link:['/sonae/keitai-toilet/','携帯トイレの備え']}},
()=>{const n=1+R(4),c=D.w*n*D.y;return{q:'高齢の家族がいる'+n+'人家族。少なくとも'+D.y+'日分の水は？',...three(c,'L'),ex:'1人1日'+D.w+'L×'+n+'人×'+D.y+'日＝'+f(c)+'Lです',src:'y',link:['/sonae/bichiku/#yohairyo','高齢の家族や小さな子どもがいる家']}},
()=>{const n=1+R(4),c=D.t*n*D.y;return{q:'小さな子どもがいる'+n+'人家族。少なくとも'+D.y+'日分の携帯トイレは？',...three(c,'回分'),ex:'1人1日'+D.t+'回×'+n+'人×'+D.y+'日＝'+f(c)+'回分です',src:'y',link:['/sonae/bichiku/#yohairyo','高齢の家族や小さな子どもがいる家']}},
()=>({q:'水は1人1日どれだけがめやす？（飲み水と調理の水）',ch:[D.w,Math.max(1,D.w-2),D.w*2].map(v=>v+'L'),a:0,ex:'1人1日'+D.w+'L。トイレを流す水などは別に要ります',src:'mizu',link:['/sonae/bichiku/','備蓄の量のめやす']}),
()=>({q:'携帯トイレは1人1日何回分がめやす？',ch:[D.t,1,D.t*2].map(v=>v+'回'),a:0,ex:'1人1日'+D.t+'回。4人家族の1週間なら'+f(D.t*4*7)+'回分です',src:'toilet',link:['/sonae/keitai-toilet/','携帯トイレの備え']}),
()=>({q:'主食（ご飯など）は、1人1日何食で数える？',ch:[D.m,1,D.m+2].map(v=>v+'食'),a:0,ex:'1人1日'+D.m+'食で数えます',src:'shoku',link:['/sonae/bichiku/','備蓄の量のめやす']}),
()=>({q:'家の備蓄は、最低何日分がめやす？',ch:[D.min,1,30].map(v=>v+'日分'),a:0,ex:'最低'+D.min+'日分、できれば'+D.better+'日分です',src:'days',link:['/sonae/bichiku/','備蓄の量のめやす']}),
()=>({q:'家の備蓄は、できれば何日分あるとよい？',ch:[D.better,2,30].map(v=>v+'日分'),a:0,ex:'最低'+D.min+'日分、できれば'+D.better+'日分です',src:'days',link:['/sonae/bichiku/','備蓄の量のめやす']}),
()=>({q:'高齢の家族や小さな子どもがいる家は、少なくとも何日分？',ch:[D.y,D.min,60].map(v=>v+'日分'),a:0,ex:'少なくとも'+D.y+'日分がめやすです。ふだんの食事や薬が手に入りにくくなると困りやすいためです',src:'y',link:['/sonae/bichiku/#yohairyo','高齢の家族や小さな子どもがいる家']}),
()=>({q:'農林水産省の「大人1人1週間」の例で、カセットボンベは何本？',ch:[D.gas,1,20].map(v=>v+'本'),a:0,ex:D.gas+'本です。家族の人数での数え方は家の使い方で変わります',src:'gas',link:['/hinmoku/gas/','カセットコンロとボンベ']}),
()=>({q:'飲み水とは別に要る、トイレを流したりするための水は？',ch:['生活用水','保存水','雨水'],a:0,ex:'生活用水です。飲み水の量（1人1日'+D.w+'L）とは別に考えます',src:'seikatsu',link:['/dougu/check/','チェックリスト']}),
()=>({q:'「1人1日'+D.w+'L」の水にふくまれるのは？',ch:['飲み水と調理の水','トイレを流す水','お風呂の水'],a:0,ex:'飲み水と調理の水です。トイレを流す水などの生活用水は別に要ります',src:'mizu',link:['/sonae/bichiku/','備蓄の量のめやす']}),
()=>({q:'ふだん食べている食品を少し多めに買い、食べた分を買い足して備える方法は？',ch:['ローリングストック','フードバンク','まとめ買い'],a:0,ex:'ローリングストックです。期限の近いものから食べていけば、むだになりにくくなります',src:'rolling',link:['/sonae/rolling-stock/','ローリングストック']})];
const box=$('#quiz'),meta=$('.meta',box),qq=$('.qq',box),ul=$('.ch',box),ex=$('.ex',box),next=$('.next',box),res=$('#res');let qs,i,score,last='';
function show(){const q=qs[i];meta.textContent=(i+1)+'／'+N;qq.textContent=q.q;ex.hidden=true;next.hidden=true;delete ul.dataset.done;const idx=shuffle([0,1,2]);
choices(ul,idx.map(j=>q.ch[j]),null,null,idx.indexOf(q.a),ok=>{if(ok)score++;ex.textContent='';const p=document.createElement('p');p.textContent=q.ex;const s=document.createElement('p');s.className='src';s.textContent='出典：'+D.src[q.src];ex.append(p,s);
if(q.link){const l=document.createElement('a');l.href=q.link[0];l.textContent=q.link[1];ex.append(l)}ex.hidden=false;next.textContent=i<N-1?'次の問題':'結果を見る';next.hidden=false})}
function start(){qs=shuffle(T.slice()).slice(0,N).map(t=>t());i=0;score=0;res.hidden=true;box.hidden=false;show()}
next.addEventListener('click',()=>{if(i<N-1){i++;show()}else{box.hidden=true;res.hidden=false;$('.score b',res).textContent=score;last='まちの社会科「備えの数字クイズ」'+N+'問中'+score+'問正解';$('#sent').textContent='';window.scrollTo(0,0)}});
$('.again',res).addEventListener('click',start);share($('.send',res),()=>last);start()})();`,
  });
  return out;
}

// わたしの街クイズ（市区町村ページの「くらべる」側）：作れる問題を全部入れ、3問ずつ見せて「ほかの問題」で入れかえ
export function machiQuizHtml(name, qs) {
  if (!qs.length) return '';
  return `${h2(`${esc(name)}クイズ`)}
<div class="mqs">${qs
    .map(
      (q, i) => `<div class="qz mq" data-a="${q.a}"${i >= 3 ? ' hidden' : ''}><p class="qq">${esc(q.q)}</p><ul class="ch">${q.ch
        .map((c, j) => `<li><button type="button"><span class="k">${KANA[j]}</span><span class="t">${esc(c)}</span></button></li>`)
        .join('')}</ul><p class="ex" hidden>${esc(q.ex)}</p></div>`,
    )
    .join('\n')}</div>
<p class="note">${qs.length > 3 ? `<button class="go mqn" type="button">ほかの問題</button>　` : ''}<a href="/quiz/">ほかのクイズ</a></p>`;
}

export const MACHI_JS = `(()=>{document.querySelectorAll('.mq').forEach(q=>{const a=+q.dataset.a,bs=[...q.querySelectorAll('button')];bs.forEach((b,i)=>b.addEventListener('click',()=>{if(q.dataset.done)return;q.dataset.done=1;bs.forEach((x,j)=>{x.disabled=true;if(j===a)x.classList.add('ok')});if(i!==a)b.classList.add('ng');q.querySelector('.ex').hidden=false}))});
const n=document.querySelector('.mqn');if(n){const qs=[...document.querySelectorAll('.mq')];let at=0;n.addEventListener('click',()=>{at=(at+3)%qs.length;qs.forEach((q,i)=>{q.hidden=!((i-at+qs.length)%qs.length<3)});qs[at].scrollIntoView({block:'nearest'})})}})();`;
