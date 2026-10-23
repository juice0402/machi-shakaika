// クイズの棚（/quiz/）と、どっちが多い（/quiz/docchi/）・ドボンクイズ（/quiz/dobon/）・備えの数字クイズ（/quiz/sonae/）
// 見た目は小テスト：選択肢は「ア・イ・ウ」、正解に赤ペンの丸、まちがえた所にバツ。紙吹雪や絵文字は使わない
// 回答はどこにも送らない。結果を送るのは「◯問中◯問」の文とURLだけ（見る人がえらんだときだけ）
// AdSense は置かない（答えのボタンの近くに自動広告が入ると誤クリックをまねくため）
import { esc, h2, srcKokusei } from '../layout.mjs';
import { PREFS } from '../areas.mjs';
import { TILES, short } from './top.mjs';
import { dobonTopics, docchiData, sonaeData, DOBON } from '../quiz.mjs';

const KANA = 'アイウ';
const data = (obj) => `<script type="application/json" id="qd">${JSON.stringify(obj).replace(/</g, '\\u003c')}</script>`;

// 共通：選択肢を作る・答える・結果を送る
const COMMON = `const KANA='${KANA}';const $=(s,e=document)=>e.querySelector(s);const R=n=>Math.floor(Math.random()*n);
const shuffle=a=>{for(let i=a.length-1;i>0;i--){const j=R(i+1);[a[i],a[j]]=[a[j],a[i]]}return a};
function choices(ul,labels,subs,vals,ans,done){ul.textContent='';labels.forEach((t,i)=>{const li=document.createElement('li'),b=document.createElement('button');b.type='button';
const k=document.createElement('span');k.className='k';k.textContent=KANA[i];const s=document.createElement('span');s.className='t';s.textContent=t;
if(subs&&subs[i]){const m=document.createElement('small');m.textContent=subs[i];s.append(m)}b.append(k,s);
if(vals){const v=document.createElement('span');v.className='v';v.textContent=vals[i];b.append(v)}
b.addEventListener('click',()=>{if(ul.dataset.done)return;ul.dataset.done=1;ul.querySelectorAll('button').forEach((x,j)=>{x.disabled=true;if(j===ans)x.classList.add('ok')});if(i!==ans)b.classList.add('ng');done(i===ans)});li.append(b);ul.append(li)})}
function share(btn,get){btn.addEventListener('click',async()=>{const url=location.origin+location.pathname,text=get(),msg=document.getElementById('sent');
try{if(navigator.share){await navigator.share({text,url});return}await navigator.clipboard.writeText(text+' '+url);msg.textContent='コピーしました'}catch(e){if(e&&e.name==='AbortError')return;msg.textContent=text+' '+url}})}`;

const DOCCHI_JS = `(()=>{${COMMON}
const D=JSON.parse($('#qd').textContent),M=D.m,A=D.a,N=10;const fmt=(m,v)=>m[2]?v.toFixed(m[2]):Math.round(v).toLocaleString('ja-JP');
function fair(m,x,y){if(x==null||y==null||x===y)return false;if(m[3]&&Math.abs(x-y)<m[3])return false;if(m[4]&&(Math.abs(x-y)/Math.max(x,y)<m[4]||Math.max(x,y)/Math.min(x,y)>3))return false;return fmt(m,x)!==fmt(m,y)}
function make(){const qs=[],seen=new Set();let tries=0;while(qs.length<N&&tries++<2000){const mi=R(M.length),g=Math.random()<.6?'c':'p',pool=A.filter(a=>a[3]===g);const x=pool[R(pool.length)],y=pool[R(pool.length)];
const key=[x[0],y[0]].sort().join()+mi;if(x===y||seen.has(key)||!fair(M[mi],x[4+mi],y[4+mi]))continue;seen.add(key);qs.push({mi,p:[x,y]})}return qs}
const box=$('#quiz'),meta=$('.meta',box),qq=$('.qq',box),ul=$('.ch',box),ex=$('.ex',box),next=$('.next',box),res=$('#res');let qs,i,score;
function show(){const q=qs[i],m=M[q.mi];meta.textContent=(i+1)+'／'+N;qq.textContent=m[0];ex.hidden=true;next.hidden=true;delete ul.dataset.done;
const vals=q.p.map(a=>a[4+q.mi]);const ans=vals[0]>vals[1]?0:1;choices(ul,q.p.map(a=>a[0]),q.p.map(a=>a[1]),vals.map(v=>fmt(m,v)+m[1]),ans,ok=>{if(ok)score++;
ex.textContent='';q.p.forEach((a,j)=>{const l=document.createElement('a');l.href=a[2];l.textContent=a[0];ex.append(l,' '+fmt(m,vals[j])+m[1]+(j?'':'　'))});ex.hidden=false;next.textContent=i<N-1?'次の問題':'結果を見る';next.hidden=false})}
function start(){qs=make();i=0;score=0;res.hidden=true;box.hidden=false;show()}
next.addEventListener('click',()=>{if(i<N-1){i++;show()}else{box.hidden=true;res.hidden=false;$('.score b',res).textContent=score;$('.score span',res).textContent='／'+N;res.dataset.text='まちの社会科「どっちが多い？」'+N+'問中'+score+'問正解';$('#sent').textContent='';window.scrollTo(0,0)}});
$('.again',res).addEventListener('click',start);share($('.send',res),()=>res.dataset.text);start()})();`;

export function quizPages({ munis, cities, urlOf, items, sources }) {
  const out = [];
  const src = srcKokusei(munis);

  out.push({
    path: '/quiz/',
    title: 'クイズ（街の数字・備えの数字）',
    description: '2025年国勢調査の数字でくらべる「どっちが多い？」「ドボンクイズ」と、家の備えの量の「備えの数字クイズ」。答えはその場で、出典つき。',
    noAds: true,
    body: `<p class="crumb"><a href="/">トップ</a></p>
<h1 class="city">クイズ</h1>
${h2('街の数字クイズ')}
<ul class="list"><li><a href="/quiz/docchi/">どっちが多い？</a><small class="sub">2つの街・都道府県の数字をくらべる10問</small></li><li><a href="/quiz/dobon/">ドボンクイズ</a><small class="sub">トップ10の都道府県を1つずつ。外れたらドボン</small></li></ul>
<p class="note">市区町村のページの中にも、その街のクイズが3問あります（例：<a href="/osaka/sakai/">堺市</a>）。</p>
${h2('備えの数字クイズ')}
<ul class="list"><li><a href="/quiz/sonae/">備えの数字クイズ</a><small class="sub">水・食事・携帯トイレの量のめやす5問</small></li></ul>
<p class="note">答えはこの端末の中だけで決まり、どこにも送りません。</p>`,
  });

  out.push({
    path: '/quiz/docchi/',
    title: 'どっちが多い？ 街と都道府県の数字クイズ',
    description: '2つの市区町村・都道府県の人口や面積、1世帯の人数などをくらべる2択クイズ10問。2025年国勢調査の数字で、答えのあとに両方の数字が出ます。',
    noAds: true,
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/quiz/">クイズ</a></p>
<h1 class="city">どっちが多い？</h1>
<section id="quiz" class="qz"><p class="meta"></p><p class="qq"></p><ul class="ch"></ul><p class="ex" hidden></p><p><button class="go next" type="button" hidden>次の問題</button></p></section>
<section id="res" class="qz" hidden aria-live="polite"><p class="score"><b>0</b><span>／10</span></p><p><button class="go send" type="button">結果を送る</button>　<button class="go again" type="button">もう一度</button></p><p class="note" id="sent"></p>
<p><a href="/ranking/jinko/">人口が増えた市区町村</a>・<a href="/quiz/dobon/">ドボンクイズ</a></p></section>
<noscript><p>このクイズはスクリプトで動きます。</p></noscript>
${src}`,
    script: DOCCHI_JS,
    head: data(docchiData(munis.areas, cities, urlOf)),
  });

  // ドボンクイズ（都道府県トップ10）：1つずつえらび、11位より下をえらんだらドボン（10/23 しょーくんの案）
  const topics = dobonTopics(munis.areas, DOBON);
  const tiles = PREFS.map((p) => {
    const [x, y] = TILES[p.slug];
    return `<button type="button" class="tile" data-c="${p.code}" style="grid-column:${x + 1};grid-row:${y + 1}" aria-label="${esc(p.name)}">${short(p.name)}</button>`;
  }).join('');
  const prefInfo = Object.fromEntries(PREFS.map((p) => [p.code, [p.name, p.slug]]));
  out.push({
    path: '/quiz/dobon/',
    title: `都道府県ドボンクイズ（トップ${DOBON}を当てる）`,
    description: `人口が多い・面積が広いなど、トップ${DOBON}に入る都道府県を地図から1つずつえらぶクイズ。${DOBON + 1}位より下をえらんだらドボン。お題は${topics.length}つ、2025年国勢調査の数字です。`,
    noAds: true,
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/quiz/">クイズ</a></p>
<h1 class="city">ドボンクイズ</h1>
<section id="db" class="qz"><p class="qq"></p><p class="meta"></p>
<div class="tiles t5">${tiles}</div>
<div class="dbr" hidden aria-live="polite"><p class="score"><b>0</b><span>／${DOBON}</span></p><p class="dbm"></p></div>
<ol class="t5l"></ol>
<p class="dbn" hidden><button class="go next" type="button">次のお題</button>　<button class="go send" type="button">結果を送る</button></p><p class="note" id="sent"></p></section>
<noscript><p>このクイズはスクリプトで動きます。</p></noscript>
${src}`,
    head: data({ n: DOBON, t: topics.map((t) => [t.title, t.unit, t.order, t.vals]), p: prefInfo }),
    script: `(()=>{${COMMON}
const D=JSON.parse($('#qd').textContent),N=D.n,box=$('#db'),tiles=[...box.querySelectorAll('.tile')],ol=$('.t5l',box),res=$('.dbr',box),nav=$('.dbn',box);let ti,found,over,order=shuffle([...D.t.keys()]),oi=0,last='';
const slot=(i,c,cls)=>{const li=ol.children[i],[,unit,,vals]=D.t[ti];li.textContent='';const a=document.createElement('a');a.href='/'+D.p[c][1]+'/';a.textContent=D.p[c][0];li.append(a,'　'+vals[i]+unit);li.className=cls};
function topic(){ti=order[oi++%order.length];found=new Set();over=false;$('.qq',box).textContent=D.t[ti][0]+'都道府県トップ'+N;tiles.forEach(t=>{t.className='tile';t.disabled=false});
ol.textContent='';for(let i=0;i<N;i++){const li=document.createElement('li');li.className='blank';li.textContent='　';ol.append(li)}res.hidden=true;nav.hidden=true;$('#sent').textContent='';meta()}
function meta(){$('.meta',box).textContent=over?'':found.size?'見つけた '+found.size+'／'+N:'トップ'+N+'に入る都道府県を1つずつ。'+(N+1)+'位より下はドボン'}
function end(win,c,r){over=true;const [title,,ord]=D.t[ti];ord.slice(0,N).forEach((x,i)=>{if(!found.has(x)){slot(i,x,'rest');tiles.find(t=>t.dataset.c===x).classList.add('ans5')}});tiles.forEach(t=>t.disabled=true);
$('.score b',res).textContent=found.size;$('.dbm',res).textContent=win?'パーフェクト':'ドボン　'+D.p[c][0]+'は'+(r+1)+'位';res.hidden=false;nav.hidden=false;
last='まちの社会科「ドボンクイズ」'+title+'都道府県 '+N+'個中'+found.size+'個'+(win?'（パーフェクト）':'');meta()}
tiles.forEach(t=>t.addEventListener('click',()=>{if(over||t.classList.contains('hit'))return;const c=t.dataset.c,ord=D.t[ti][2],r=ord.indexOf(c);
if(r<N){t.classList.add('hit');found.add(c);slot(r,c,'got');meta();if(found.size===N)end(true)}else{t.classList.add('miss');end(false,c,r)}}));
$('.next',nav).addEventListener('click',()=>{topic();box.scrollIntoView()});share($('.send',nav),()=>last);topic()})();`,
  });

  // 備えの数字クイズ
  const sd = sonaeData(items, sources);
  out.push({
    path: '/quiz/sonae/',
    title: '備えの数字クイズ（水・食事・携帯トイレの量）',
    description: `家族の人数と日数で、水・食事・携帯トイレはどれだけ？ 公的な資料の数字（水は1人1日${sd.w}L、携帯トイレは${sd.t}回など）から作る5問。答えに出典つき。`,
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
function calc(per,unit,what,src,extra){const [n,d]=nd(),c=per*n*d,lo=Math.max(1,Math.round(c/2));return{q:n+'人家族の'+d+'日分、'+what+'は？',ch:[lo,c,c*2].map(v=>f(v)+unit),a:1,ex:'1人1日'+per+(unit==='回分'?'回':unit)+'×'+n+'人×'+d+'日＝'+f(c)+unit+'。'+extra,src,link:['/dougu/keisan/?n='+n+'&d='+d,'計算で確かめる']}}
const T=[()=>calc(D.w,'L','水','mizu','飲み水と調理に使う水の量です'),()=>calc(D.m,'食','主食','shoku','1人1日'+D.m+'食で数えます'),()=>calc(D.t,'回分','携帯トイレ','toilet','断水や停電で水洗トイレが使えないときの量です'),
()=>({q:'水は1人1日どれだけがめやす？（飲み水と調理の水）',ch:[Math.max(1,D.w-2),D.w,D.w*2].map(v=>v+'L'),a:1,ex:'1人1日'+D.w+'L。トイレを流す水などは別に要ります',src:'mizu',link:['/sonae/bichiku/','備蓄の量のめやす']}),
()=>({q:'携帯トイレは1人1日何回分がめやす？',ch:[1,D.t,D.t*2].map(v=>v+'回'),a:1,ex:'1人1日'+D.t+'回。4人家族の1週間なら'+f(D.t*4*7)+'回分です',src:'toilet',link:['/sonae/keitai-toilet/','携帯トイレの備え']}),
()=>({q:'家の備蓄は、最低何日分がめやす？',ch:[1,D.min,30].map(v=>v+'日分'),a:1,ex:'最低'+D.min+'日分、できれば'+D.better+'日分です',src:'days',link:['/sonae/bichiku/','備蓄の量のめやす']}),
()=>({q:'高齢の家族や小さな子どもがいる家は、少なくとも何日分？',ch:[D.min,D.y,60].map(v=>v+'日分'),a:1,ex:'少なくとも'+D.y+'日分がめやすです。ふだんの食事や薬が手に入りにくくなると困りやすいためです',src:'y',link:['/sonae/bichiku/#yohairyo','高齢の家族や小さな子どもがいる家']}),
()=>({q:'農林水産省の「大人1人1週間」の例で、カセットボンベは何本？',ch:[1,D.gas,20].map(v=>v+'本'),a:1,ex:D.gas+'本です。家族の人数での数え方は家の使い方で変わります',src:'gas',link:['/hinmoku/gas/','カセットコンロとボンベ']}),
()=>({q:'飲み水とは別に要る、トイレを流したりするための水は？',ch:['生活用水','保存水','雨水'],a:0,ex:'生活用水です。飲み水の量（1人1日'+D.w+'L）とは別に考えます',src:'seikatsu',link:['/dougu/check/','チェックリスト']})];
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

// わたしの街クイズ（市区町村ページの「くらべる」側。答えはページに書いてあり、押すと出る）
export function machiQuizHtml(name, qs) {
  if (!qs.length) return '';
  return `${h2(`${esc(name)}クイズ`)}
${qs
  .map(
    (q) => `<div class="qz mq" data-a="${q.a}"><p class="qq">${esc(q.q)}</p><ul class="ch">${q.ch
      .map((c, i) => `<li><button type="button"><span class="k">${KANA[i]}</span><span class="t">${esc(c)}</span></button></li>`)
      .join('')}</ul><p class="ex" hidden>${esc(q.ex)}</p></div>`,
  )
  .join('\n')}
<p class="note"><a href="/quiz/">ほかのクイズ</a></p>`;
}

export const MACHI_JS = `(()=>{document.querySelectorAll('.mq').forEach(q=>{const a=+q.dataset.a,bs=[...q.querySelectorAll('button')];bs.forEach((b,i)=>b.addEventListener('click',()=>{if(q.dataset.done)return;q.dataset.done=1;bs.forEach((x,j)=>{x.disabled=true;if(j===a)x.classList.add('ok')});if(i!==a)b.classList.add('ng');q.querySelector('.ex').hidden=false}))})})();`;

