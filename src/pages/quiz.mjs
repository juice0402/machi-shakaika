// クイズの棚（/quiz/）と、どっちが多い（/quiz/docchi/）・ドボンクイズ（/quiz/dobon/）・備えの数字クイズ（/quiz/sonae/）
// 見た目は小テスト：選択肢は「ア・イ・ウ」、正解に赤ペンの丸、まちがえた所にバツ。紙吹雪や絵文字は使わない
// 回答はどこにも送らない。結果を送るのは「◯問中◯問」の文とURLだけ（見る人がえらんだときだけ）
// AdSense は置かない（答えのボタンの近くに自動広告が入ると誤クリックをまねくため）
// どっちが多い・ドボンクイズは、開いたときに /quiz/machi.json（都道府県47と全国の市区町村の数字）を読み、問題を毎回ブラウザで作る
import { esc, h2, srcKokusei, srcName, jpDate, fmt } from '../layout.mjs';
import { PREFS } from '../areas.mjs';
import { japanMap, JMAP_CSS } from '../japan-map.mjs';
import { sonaeData, rng } from '../quiz.mjs';
import { CORE_JS, qFair, qFmt, qDocchi, qDobonTopics, qDobonBoard } from '../quiz-core.mjs';
import { kyouPool, KYOU_MIN_POP } from '../kyou.mjs';
import { need } from '../calc.mjs';
import { fit } from '../layout.mjs';

// 1回の問題の数（ページのスクリプトもこの数を使う。tests/honbun-pages.test.mjs で照らし合わせる）
export const DOCCHI_N = 10;
export const SONAE_N = 5;

// どっちが多いの組み合わせの数（都道府県どうし・人口10万人以上どうし・県の中どうし）
function docchiPairs(D) {
  const groups = [D.prefs, D.munis.filter((r) => r[3] >= 100000), ...D.prefs.map((p) => D.munis.filter((r) => r[0].slice(0, 2) === p[0]))];
  let n = 0;
  for (const g of groups) D.m.forEach((m, mi) => {
    for (let i = 0; i < g.length; i++) for (let j = i + 1; j < g.length; j++) if (qFair(m, g[i][3 + mi], g[j][3 + mi])) n++;
  });
  return n;
}

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
const box=$('#quiz'),meta=$('.meta',box),qq=$('.qq',box),ul=$('.ch',box),ex=$('.ex',box),next=$('.next',box),res=$('#res'),sel=$('#sc');const save=scope(sel,'machi-docchi');let D,PN={},qs,i,score,N=${DOCCHI_N};
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
const box=$('#db'),map=$('.t5',box),words=$('.gogun',box),tiles=[...map.querySelectorAll('.pf')],ol=$('.t5l',box),res=$('.dbr',box),nav=$('.dbn',box),sel=$('#sc');const save=scope(sel,'machi-dobon');
let D,PN={},TP,t,order,found,over,last='',btns=[];
const url=r=>t.scope==='p'?'/'+r[2]+'/':(r[2]||'/'+PN[r[0].slice(0,2)][2]+'/#m'+r[0]);
const fm=v=>{const m=D.m[t.mi];return qFmt([m[0],m[1],m[2],t.digits],v)+m[2]};
function pick(){const s=sel.value;let list=TP.filter(x=>s===''||x.scope===s);if(s===''){const r=Math.random(),k=r<.3?'p':r<.5?'all':'pref';list=TP.filter(x=>k==='pref'?x.scope.length===2&&x.scope!=='p':x.scope===k)}return list[R(list.length)]}
function slot(i,r,cls){const li=ol.children[i];li.textContent='';const a=document.createElement('a');a.href=url(r);a.textContent=r[1];li.append(a,'　'+fm(r[3+t.mi]));li.className=cls}
function topic(){t=pick();if(!t)return;const b=qDobonBoard(D,t,Math.random);order=b.order;found=new Set();over=false;const m=D.m[t.mi],N=t.N;
$('.qq',box).textContent=t.scope==='p'?m[1]+'都道府県トップ'+N:(t.scope==='all'?'全国で':PN[t.scope][1]+'で')+m[1]+'市区町村トップ'+N;
map.hidden=t.board!=='map';words.hidden=t.board!=='words';tiles.forEach(x=>{x.setAttribute('class','pf');x.removeAttribute('aria-disabled')});words.textContent='';btns=[];
if(t.board==='words')b.board.forEach(r=>{const w=document.createElement('button');w.type='button';w.className='w';w.dataset.c=r[0];w.textContent=r[1];if(t.scope==='all'){const s=document.createElement('small');s.textContent=PN[r[0].slice(0,2)][1];w.append(s)}w.addEventListener('click',()=>tap(w));words.append(w);btns.push(w)});
ol.textContent='';for(let i=0;i<N;i++){const li=document.createElement('li');li.className='blank';li.textContent='　';ol.append(li)}res.hidden=true;nav.hidden=true;$('#sent').textContent='';info()}
const all=()=>t.board==='map'?tiles:btns;
function info(){$('.meta',box).textContent=over?'':found.size?'見つけた '+found.size+'／'+t.N:'トップ'+t.N+'に入る'+(t.scope==='p'?'都道府県':'市区町村')+'を1つずつ。'+(t.N+1)+'位より下はドボン'}
function end(win,r,rank){over=true;order.slice(0,t.N).forEach((x,i)=>{if(!found.has(x[0])){slot(i,x,'rest');const el=all().find(e=>e.dataset.c===x[0]);if(el)el.classList.add('ans5')}});all().forEach(e=>e.tagName==='BUTTON'?e.disabled=true:e.setAttribute('aria-disabled','true'));
$('.score b',res).textContent=found.size;$('.score span',res).textContent='／'+t.N;$('.dbm',res).textContent=win?'パーフェクト':'ドボン　'+r[1]+'は'+(rank+1)+'位';res.hidden=false;nav.hidden=false;
last='まちの社会科「ドボンクイズ」'+$('.qq',box).textContent+' '+t.N+'個中'+found.size+'個'+(win?'（パーフェクト）':'');info()}
function tap(el){if(over||el.classList.contains('hit'))return;const c=el.dataset.c,rank=order.findIndex(r=>r[0]===c),r=order[rank];
if(rank>=0&&rank<t.N){el.classList.add('hit');found.add(c);slot(rank,r,'got');info();if(found.size===t.N)end(true)}else{el.classList.add('miss');end(false,r,rank)}}
const pc={};tiles.forEach(x=>{pc[x.dataset.c]=x;x.addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();tap(x)}})});map.addEventListener('click',e=>{const g=e.target.closest('[data-c]');if(g)tap(pc[g.dataset.c])});
$('.next',nav).addEventListener('click',()=>{topic();box.scrollIntoView()});sel.addEventListener('change',()=>{save();if(D)topic()});share($('.send',nav),()=>last);
$('.qq',box).textContent='読み込み中';load().then(d=>{D=d;D.prefs.forEach(p=>PN[p[0]]=p);TP=qDobonTopics(D);topic()}).catch(()=>{$('.qq',box).textContent='読み込めませんでした'})})();`;

// 備えの数字クイズのひな形（1つが1種類の問題。人数と日数は毎回えらぶ）
const SONAE_T = `[()=>calc(D.w,'L','水','mizu','飲み水と調理に使う水の量です'),()=>calc(D.m,'食','主食','shoku','1人1日'+D.m+'食で数えます'),()=>calc(D.t,'回分','携帯トイレ','toilet','断水や停電で水洗トイレが使えないときの量です'),
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
()=>({q:'高齢の家族や小さな子どもがいる家は、少なくとも何日分？',ch:[D.y,D.min,60].map(v=>v+'日分'),a:0,ex:'少なくとも'+D.y+'日分がめやすです。乳幼児・妊産婦・高齢者や、慢性疾患・食物アレルギーのある人などがいる家のめやすです',src:'y',link:['/sonae/bichiku/#yohairyo','高齢の家族や小さな子どもがいる家']}),
()=>({q:'農林水産省の「大人1人1週間」の例で、カセットボンベは何本？',ch:[D.gas,1,20].map(v=>v+'本'),a:0,ex:D.gas+'本です。家族の人数での数え方は家の使い方で変わります',src:'gas',link:['/hinmoku/gas/','カセットコンロとボンベ']}),
()=>({q:'飲み水とは別に要る、トイレを流したりするための水は？',ch:['生活用水','保存水','雨水'],a:0,ex:'生活用水です。飲み水の量（1人1日'+D.w+'L）とは別に考えます',src:'seikatsu',link:['/dougu/check/','チェックリスト']}),
()=>({q:'「1人1日'+D.w+'L」の水にふくまれるのは？',ch:['飲み水と調理の水','トイレを流す水','お風呂の水'],a:0,ex:'飲み水と調理の水です。トイレを流す水などの生活用水は別に要ります',src:'mizu',link:['/sonae/bichiku/','備蓄の量のめやす']}),
()=>({q:'ふだん食べている食品を少し多めに買い、食べた分を買い足して備える方法は？',ch:['ローリングストック','フードバンク','まとめ買い'],a:0,ex:'ローリングストックです。期限の近いものから食べていけば、むだになりにくくなります',src:'rolling',link:['/sonae/rolling-stock/','ローリングストック']})]`;
export const SONAE_KINDS = (SONAE_T.match(/\(\)=>/g) ?? []).length;

// ---- クイズの下の説明（夜 #47）：数字のもと・1問の読み方の例・よくある問い。数字はデータとページの定数から ----
const qa = (q, a) => `<h3>${q}</h3>\n<p>${a}</p>`;
const label = (m) => m[0].replace(/(が多い|が高い|が広い)のは？$/, '');
const prefName = (r) => PREFS.find((p) => p.code === r[0].slice(0, 2))?.name ?? '';

function shelfMore({ munis, machi, docchiMan, dobonN, sd }) {
  const nPool = kyouPool(machi).length;
  return `<div class="prose">
${h2('数字のもと')}
<p>街の数字クイズの数字は、総務省の「${esc(munis.statName)}」です。${jpDate(munis.survey)}の数字で、${jpDate(munis.published)}に発表されました。</p>
<p>くらべる数字は、人口や面積など${machi.m.length}種類です。全国${fmt(machi.munis.length)}の市区町村と、${machi.prefs.length}都道府県の数字を使います。</p>
<p>備えの数字クイズは、農林水産省などが出している備えのめやすから作っています。水は1人1日${sd.w}L、携帯トイレは1人1日${sd.t}回といった数字です。</p>
</div>
${h2('問題の数')}
<table class="tbl"><thead><tr><th>クイズ</th><th>1回の問題</th><th>問題のもと</th></tr></thead><tbody>
<tr><td>今日の1問</td><td>1日1問</td><td>人口${fmt(KYOU_MIN_POP / 10000)}万人以上の${fmt(nPool)}市区町村</td></tr>
<tr><td>どっちが多い？</td><td>${DOCCHI_N}問</td><td>組み合わせ${fmt(docchiMan)}万通り以上</td></tr>
<tr><td>ドボンクイズ</td><td>お題1つ</td><td>お題${fmt(dobonN)}</td></tr>
<tr><td>備えの数字クイズ</td><td>${SONAE_N}問</td><td>${SONAE_KINDS}種類の問題の型</td></tr>
</tbody></table>
<div class="prose">
${h2('よくある問い')}
${qa('「結果を送る」で何が送られますか', '点数の文と、そのクイズのページのURLです。送る相手は、おした人が自分でえらびます。おさなければ、何も送られません。')}
${qa('同じ問題ばかり出ませんか', 'どっちが多い？とドボンクイズは、開くたびに問題を作り直します。今日の1問は日付で決まるので、同じ日ならだれが開いても同じ問題です。')}
${qa('出ない数字はありますか', '人口の減り方と、65歳以上の人の割合は、クイズの題にしていません。住んでいる人が気にする数字だからです。')}
${qa('広告は出ますか', 'このページと、上にならんだクイズのページには、広告を置いていません。答えのボタンの近くに広告があると、まちがえておしてしまうことがあるためです。市区町村のページの中のクイズは、その街のページの一部なので、広告が出ることがあります。')}
</div>`;
}

function docchiMore({ munis, machi, docchiMan }) {
  const rows = machi.m
    .map((m) => `<tr><td>${esc(label(m))}</td><td>${m[4] ? `${m[4]}${esc(m[2])}未満` : `大きいほうの${Math.round(m[5] * 100)}%未満`}</td></tr>`)
    .join('');
  // 1問の例：データの公表日から作る乱数で、人口10万人以上の組を1つ（データが同じなら毎回同じ例）
  const ex = qDocchi(machi, 'big', rng(Number(String(munis.published).replace(/-/g, ''))), 1)[0];
  let exText = '';
  if (ex) {
    const m = machi.m[ex.mi];
    const v = ex.p.map((r) => r[3 + ex.mi]);
    const ans = v[0] > v[1] ? 0 : 1;
    const nm = (r) => `${esc(prefName(r))}の${esc(r[1])}`;
    exText = `${h2('1問の例')}
<p>たとえば${esc(label(m).replace(/（[^）]*）/g, ''))}をくらべる問題で、アに${nm(ex.p[0])}、イに${nm(ex.p[1])}が出たとします。</p>
<p>答えをえらぶと、2つの数字が出ます。${esc(ex.p[0][1])}は${qFmt(m, v[0])}${esc(m[2])}、${esc(ex.p[1][1])}は${qFmt(m, v[1])}${esc(m[2])}なので、正解は${'アイ'[ans]}です。</p>
<p>正解には赤い丸がつき、まちがえたときは、えらんだ所にバツがつきます。</p>
<p>答えのあとに出る名前をおすと、その街や県のページが開きます。街のページがない市区町村は、県のページの中の、その街の行が開きます。</p>`;
  }
  return `<div class="prose">
${h2('しくみ')}
<p>2つの街や都道府県から、数字が大きいほうをえらびます。問題は1回${DOCCHI_N}問で、ページを開くたびに新しく作ります。</p>
<p>数字は、総務省が${jpDate(munis.published)}に発表した「${esc(munis.statName)}」から取っています。${jpDate(munis.survey)}の時点の数字です。</p>
<p>差が小さすぎる組は出しません。差が下の表より小さい組と、表示した数字が同じになる組は外します。人口や面積のように数の大きい数字では、開きすぎている組も外します。</p>
</div>
<table class="tbl"><thead><tr><th>くらべる数字</th><th>出さない組の差</th></tr></thead><tbody>${rows}</tbody></table>
<div class="prose">
${exText}
${h2('よくある問い')}
${qa('出題の範囲は変えられますか', '上の「出題の範囲」で、都道府県だけや、1つの県の中の市区町村だけにしぼれます。えらんだ範囲はあなたのスマホやパソコンにおぼえておくので、次に開いたときも同じ範囲で始まります。')}
${qa('問題は何通りありますか', `出せる組み合わせは${fmt(docchiMan)}万通り以上あります。1回の${DOCCHI_N}問は、その中から毎回えらび直します。`)}
${qa(`${DOCCHI_N}問の答えは送られますか`, `送りません。${DOCCHI_N}問の答え合わせは、いま開いている画面の中で終わります。点数を人に見せたいときだけ、「結果を送る」で相手を自分でえらべます。`)}
</div>`;
}

function dobonMore({ munis, machi }) {
  const T = qDobonTopics(machi);
  const nP = T.filter((t) => t.scope === 'p').length;
  const nAll = T.filter((t) => t.scope === 'all').length;
  const nPref = T.length - nP - nAll;
  const big = Math.max(...T.map((t) => t.N));
  const small = Math.min(...T.map((t) => t.N));
  // 例：県ごとのお題で、トップ5になる人口のお題のうち最初のもの
  const t5 = T.find((t) => t.scope !== 'p' && t.scope !== 'all' && t.N < big && t.mi === 0);
  let exText = '';
  if (t5) {
    const m = machi.m[t5.mi];
    const { order, board } = qDobonBoard(machi, t5, rng(1));
    const pn = PREFS.find((p) => p.code === t5.scope)?.name ?? '';
    const v = (r) => `${esc(r[1])}の${qFmt([m[0], m[1], m[2], t5.digits], r[3 + t5.mi])}${esc(m[2])}`;
    exText = `${h2('例')}
<p>${esc(pn)}の${esc(m[1])}市区町村トップ${t5.N}なら、1位は${v(order[0])}、${t5.N}位は${v(order[t5.N - 1])}です。</p>
<p>${t5.N + 1}位は${v(order[t5.N])}で、これをえらぶとドボンです。</p>
<p>${esc(pn)}は市区町村が${order.length}と少ないので、トップ${t5.N}のお題です。このお題では、${board.length}の市区町村の名前がならんだ一覧からえらびます。</p>`;
  }
  return `<div class="prose">
${h2('しくみ')}
<p>お題の数字が大きい順に、トップ${big}に入る都道府県や市区町村を1つずつえらびます。トップ${big}の外をえらぶとドボンで、そこでおしまいです。</p>
<p>お題は全部で${fmt(T.length)}あります。都道府県が${nP}、全国の市区町村が${nAll}、県ごとの市区町村が${fmt(nPref)}です。</p>
<p>都道府県は地図から、市区町村は名前がならんだ一覧からえらびます。一覧には、トップの街と、その下の順位の街がまざっています。市区町村の数が少ない県では、トップ${small}を当てます。</p>
<p>どのお題も、総務省の「${esc(munis.statName)}」の数字で順位をつけています。${jpDate(munis.published)}に発表された、${jpDate(munis.survey)}の数字です。</p>
${exText}
${h2('よくある問い')}
${qa('順位の数字が同じになったら', `トップ${big}の最後の順位と、そのすぐ下の順位が同じ数字に見えるお題は出しません。トップ${small}のお題も同じです。割合のお題は、まず小数のけたを1つふやして見分けます。それでも同じなら、そのお題は出しません。`)}
${qa('人口の減り方のお題はありますか', 'ありません。人口がどれだけ減ったかや、65歳以上の人の割合の順位は、住んでいる人が気にするので作っていません。')}
${qa('当てた数はどこで数えていますか', '当てた数も、ドボンになった所も、いま開いている画面の中だけで数えています。どこにも送りません。')}
</div>`;
}

function sonaeMore({ items, sources, sd }) {
  const by = Object.fromEntries(items.items.map((it) => [it.id, it]));
  const src = new Map(sources.sources.map((s) => [s.id, s]));
  const n = 4;
  const d = sd.min;
  const c = need(sd.w, n, d);
  const lo = Math.max(1, Math.round(c / 2));
  const ids = [...new Set([by.mizu.sources[0], by.shushoku.sources[0], by['keitai-toilet'].sources[0], items.days.sources[0], items.yohairyo_sources[0], by.gas.sources[0], 'kantei-sonae', 'maff-guide'])];
  return `${h2('数字のもと')}
<table class="tbl"><thead><tr><th>数字</th><th>めやす</th></tr></thead><tbody>
<tr><td>水（飲み水と調理の水）</td><td>1人1日${sd.w}L</td></tr>
<tr><td>主食</td><td>1人1日${sd.m}食</td></tr>
<tr><td>携帯トイレ</td><td>1人1日${sd.t}回</td></tr>
<tr><td>家の備蓄の日数</td><td>最低${sd.min}日分・できれば${sd.better}日分</td></tr>
<tr><td>高齢の家族や小さな子どもがいる家</td><td>少なくとも${sd.y}日分</td></tr>
<tr><td>カセットボンベ</td><td>大人1人1週間の例で${sd.gas}本</td></tr>
</tbody></table>
<div class="prose">
<p>問題は、おもにこの表の数字から作ります。水の量をペットボトルの本数や箱の数に直す問題もあります。答えのあとに、どの資料の数字かと、その資料を確かめた日が出ます。</p>
${h2('1問の例')}
<p>たとえば「${n}人家族の${d}日分、水は？」という問題なら、1人1日${sd.w}L×${n}人×${d}日で、${fmt(c)}Lが正解です。</p>
<p>ほかの2つの答えは、正解の半分の${fmt(lo)}Lと、2倍の${fmt(c * 2)}Lです。答えたあとは、計算の式と出典が出ます。</p>
${h2('よくある問い')}
${qa('問題は何問ありますか', `1回${SONAE_N}問です。${SONAE_KINDS}種類の問題の型から、毎回ちがう${SONAE_N}つをえらびます。人数と日数も、問題ごとに変わります。`)}
${qa('わが家の量を知りたいときは', '<a href="/dougu/keisan/">備蓄の量の計算</a>で、家族の人数と日数を入れると、わが家の量が出ます。')}
${qa('丸とバツはどこでつけていますか', `${SONAE_N}問の丸とバツは、あなたのスマホやパソコンの中でつけています。答えはどこにも送りません。`)}
</div>
${h2('出典')}
<ul class="notes">${ids.map((id) => `<li>${srcName(src.get(id))}（${jpDate(src.get(id).checked)}確認）</li>`).join('')}</ul>`;
}

export function quizPages({ munis, items, sources, machi }) {
  const nMunis = machi.munis.length;
  const docchiMan = Math.floor(docchiPairs(machi) / 10000);
  const dobonN = qDobonTopics(machi).length;
  const out = [];
  const src = srcKokusei(munis);

  out.push({
    path: '/quiz/',
    title: 'クイズ（街の数字・備えの数字）',
    description: fit(
      [`${munis.survey.slice(0, 4)}年国勢調査の数字でくらべる「どっちが多い？」は組み合わせ${docchiMan}万通り以上、「ドボンクイズ」はお題${dobonN}。家の備えの量の「備えの数字クイズ」もあります。`],
      ['答えはその場で、出典つき。'],
    ),
    noAds: true,
    body: `<p class="crumb"><a href="/">トップ</a></p>
<h1 class="city">クイズ</h1>
${h2('街の数字クイズ')}
<ul class="list"><li><a href="/quiz/kyou/">今日の1問</a><small class="sub">日本時間の0時に入れかわる2択。答えた県が地図にたまる</small></li><li><a href="/quiz/docchi/">どっちが多い？</a><small class="sub">都道府県・全国の市区町村・県の中から、2択を10問</small></li><li><a href="/quiz/dobon/">ドボンクイズ</a><small class="sub">トップ10を1つずつ当てる。外れたらドボン</small></li></ul>
<p class="note">市区町村のページの中にも、その街のクイズがあります（例：<a href="/osaka/sakai/">堺市</a>）。</p>
${h2('備えの数字クイズ')}
<ul class="list"><li><a href="/quiz/sonae/">備えの数字クイズ</a><small class="sub">水・食事・携帯トイレの量のめやす5問</small></li></ul>
<p class="note">答えはこの端末の中だけで決まり、どこにも送りません。</p>
${shelfMore({ munis, machi, docchiMan, dobonN, sd: sonaeData(items, sources) })}`,
  });

  out.push({
    path: '/quiz/docchi/',
    title: 'どっちが多い？ 街と都道府県の数字クイズ',
    description: fit(
      [`全国${nMunis.toLocaleString('ja-JP')}市区町村と47都道府県の人口・面積・一戸建ての割合など${machi.m.length}の数字をくらべる2択クイズ。都道府県・人口10万人以上・県の中から毎回ちがう10問で、組み合わせは${docchiMan}万通り以上。`],
      [`${munis.survey.slice(0, 4)}年国勢調査の数字です。`],
    ),
    noAds: true,
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/quiz/">クイズ</a></p>
<h1 class="city">どっちが多い？</h1>
${scopeSelect('sc', true)}
<section id="quiz" class="qz"><p class="meta"></p><p class="qq"></p><ul class="ch"></ul><p class="ex" hidden></p><p><button class="go next" type="button" hidden>次の問題</button></p></section>
<section id="res" class="qz" hidden aria-live="polite"><p class="score"><b>0</b><span>／10</span></p><p><button class="go send" type="button">結果を送る</button>　<button class="go again" type="button">もう一度</button></p><p class="note" id="sent"></p>
<p><a href="/ranking/jinko/">人口が増えた市区町村</a>・<a href="/quiz/dobon/">ドボンクイズ</a></p></section>
<noscript><p>このクイズはスクリプトで動きます。</p></noscript>
${src}
${docchiMore({ munis, machi, docchiMan })}`,
    script: DOCCHI_JS,
  });

  out.push({
    path: '/quiz/dobon/',
    title: 'ドボンクイズ（都道府県・市区町村のトップ10を当てる）',
    description: fit(
      [`人口・面積・一戸建ての割合など${machi.m.length}の数字で、トップ10に入る都道府県や市区町村を1つずつ当てるクイズ。全国と47都道府県それぞれのお題が${dobonN}あり、11位より下をえらぶとドボン。`],
      [`${munis.survey.slice(0, 4)}年国勢調査の数字です。`],
    ),
    noAds: true,
    head: `<style>${JMAP_CSS}</style>`,
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/quiz/">クイズ</a></p>
<h1 class="city">ドボンクイズ</h1>
${scopeSelect('sc', false)}
<section id="db" class="qz"><p class="qq"></p><p class="meta"></p>
<div class="t5">${japanMap({ quiz: true })}</div><div class="gogun" hidden></div>
<div class="dbr" hidden aria-live="polite"><p class="score"><b>0</b><span>／10</span></p><p class="dbm"></p></div>
<ol class="t5l"></ol>
<p class="dbn" hidden><button class="go next" type="button">次のお題</button>　<button class="go send" type="button">結果を送る</button></p><p class="note" id="sent"></p></section>
<noscript><p>このクイズはスクリプトで動きます。</p></noscript>
${src}
${dobonMore({ munis, machi })}`,
    script: DOBON_JS,
  });

  // 備えの数字クイズ（items.yml の数字だけ。人数と日数は毎回えらぶ）
  const sd = sonaeData(items, sources);
  out.push({
    path: '/quiz/sonae/',
    title: '備えの数字クイズ（水・食事・携帯トイレの量）',
    description: fit(
      [`家族の人数と日数で、水・食事・携帯トイレはどれだけ？ 水は1人1日${sd.w}L、携帯トイレは${sd.t}回などの公的なめやすから、${SONAE_KINDS}種類の問題で毎回ちがう5問。`],
      ['答えに出典と確かめた日つき。'],
    ),
    noAds: true,
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/quiz/">クイズ</a></p>
<h1 class="city">備えの数字クイズ</h1>
<section id="quiz" class="qz"><p class="meta"></p><p class="qq"></p><ul class="ch"></ul><div class="ex" hidden></div><p><button class="go next" type="button" hidden>次の問題</button></p></section>
<section id="res" class="qz" hidden aria-live="polite"><p class="score"><b>0</b><span>／5</span></p><p><a class="go" href="/dougu/keisan/">わが家の人数で計算する</a></p><p><button class="go send" type="button">結果を送る</button>　<button class="go again" type="button">もう一度</button></p><p class="note" id="sent"></p></section>
<noscript><p>このクイズはスクリプトで動きます。</p></noscript>
<p class="src">数字は公的な資料のめやすです。家の備えは人数分、最低${sd.min}日分、できれば${sd.better}日分</p>
${sonaeMore({ items, sources, sd })}`,
    head: data(sd),
    script: `(()=>{${COMMON}
const D=JSON.parse($('#qd').textContent),N=${SONAE_N},f=v=>v.toLocaleString('ja-JP');const nd=()=>[1+R(6),Math.random()<.5?D.min:D.better];
const dist=(c,x=[Math.max(1,Math.round(c/2)),c*2])=>{const s=[...new Set(x.filter(v=>v>0&&v!==c))];return s.length>=2?s.slice(0,2):[c+1,c+2]};
const three=(c,unit,o)=>{const ch=[c,...dist(c,o)];return{ch:ch.map(v=>f(v)+unit),a:0}};
const U=u=>u==='回分'?'回':u;
function calc(per,unit,what,src,extra,link){const [n,d]=nd(),c=per*n*d;return{q:n+'人家族の'+d+'日分、'+what+'は？',...three(c,unit),ex:'1人1日'+per+U(unit)+'×'+n+'人×'+d+'日＝'+f(c)+unit+'。'+extra,src,link:link||['/dougu/keisan/?n='+n+'&d='+d,'計算で確かめる']}}
const T=${SONAE_T};;
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
