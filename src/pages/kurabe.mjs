// 街の道具のページ（10/27 #17）：似てる街さがし /niteru/・2つの街をくらべる /kurabe/
//   数字は /kurabe/kazu.json を、街をえらぶ欄にさわったときだけ読む。えらんだ街は送らない（URL の ?a= だけ）
//   街のえらび方はトップの市区町村さがしと同じ部品（.find）
import { h2, srcKokusei, fmt, fit, esc, jpDate } from '../layout.mjs';
import { createHash } from 'node:crypto';
import { mtVec, mtCand, mtNear, mtDiff, mtEsc, mtDiffHtml, mtNearHtml } from '../machi-core.mjs';
import { mcRegion, mcMan, mcEsc, mcWidth, mcCard, mcPaper, mcStyle, mcCardSvg, mcShareSvg } from '../card-core.mjs';
import { JMAP } from '../japan-map-data.mjs';
import { muniList, nationalRates } from '../stats.mjs';

const CORE = [mtVec, mtCand, mtNear, mtDiff, mtEsc, mtDiffHtml, mtNearHtml].map((f) => f.toString()).join('\n');

export const TOOLS_CSS = `.hits button{display:block;width:100%;padding:7px 0;border:0;border-bottom:1px dotted var(--line);background:none;font:inherit;color:var(--ink);text-align:left;text-decoration:underline;cursor:pointer}.hits button small{color:var(--sub);margin-left:6px}
.kh{margin:14px 0 2px;font:700 17px/1.5 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif}.kh small{font:400 12px/1 sans-serif;color:var(--sub)}
.kd{margin:12px 0 0;padding:0 0 10px;border-bottom:1px dotted var(--line)}.kt{margin:0 0 4px;font-size:14px}.kt b{margin-left:8px;font-size:20px;color:var(--accent);font-variant-numeric:tabular-nums}
.mcs{display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin:14px 0 4px}.mcs .mc{display:block;width:100%;max-width:340px;height:auto}.mcs+p{text-align:center;margin:4px 0 8px}@media(min-width:760px){.mcs{flex-wrap:nowrap;width:700px;margin-left:calc(50% - 350px)}.mcs .mc{width:calc(50% - 6px);max-width:none}}
.kb{grid-template-columns:7em 1fr 6.4em}.kb .kn{overflow:hidden;text-overflow:ellipsis}.kb .ka i{background:var(--bar2)}.kd0{margin:12px 0}`.replace(/\n/g, '');

// 街をえらぶ欄（トップの市区町村さがしと同じ見た目）
const findForm = (id, label, ph) =>
  `<form class="find" data-pick="${id}" role="search"><label for="${id}">${label}</label><input id="${id}" type="search" placeholder="${ph}" autocomplete="off" enterkeyhint="search"><button>さがす</button><ul class="hits"></ul><p class="msg" aria-live="polite"></p></form>`;

const PICK_JS = String.raw`const MT={K:null,Y:null,load(){return MT.K?Promise.resolve(MT.K):fetch('/kurabe/kazu.json').then(r=>r.json()).then(j=>MT.K=j)},
// 読みがな：トップの市区町村さがしと同じ /search.json から（取れなくても漢字でさがせる）
yomi(){return MT.Y?Promise.resolve(MT.Y):fetch('/search.json').then(r=>r.json()).then(a=>{const m=new Map();a.forEach(x=>{if(x[1])m.set(x[1]+'|'+x[0],x[3]||'')});return MT.Y=m}).catch(()=>MT.Y=new Map())}};
const mtNorm=s=>s.normalize('NFKC').replace(/[\s　]/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
function mtPick(f,cb){const i=f.querySelector('input'),ul=f.querySelector('.hits'),msg=f.querySelector('.msg');
const set=r=>{i.value=r[1];ul.textContent='';msg.textContent='';cb(r)};
const show=()=>{const v=mtNorm(i.value);ul.textContent='';msg.textContent='';if(!v)return Promise.resolve();return Promise.all([MT.load(),MT.yomi()]).then(([K,Y])=>{const sc=r=>{const n=mtNorm(r[1]),y=Y.get(K.p[r[0].slice(0,2)]+'|'+r[1])||'';return n.startsWith(v)||y.startsWith(v)?2:n.includes(v)||y.includes(v)?1:0};
const hit=K.r.map(r=>[sc(r),r]).filter(e=>e[0]).sort((p,q)=>q[0]-p[0]).slice(0,8).map(e=>e[1]);if(!hit.length){msg.textContent='見つかりません。市区町村の名前か読みがなで入れてください';return}
hit.forEach(r=>{const li=document.createElement('li'),b=document.createElement('button');b.type='button';b.textContent=r[1];const s=document.createElement('small');s.textContent=K.p[r[0].slice(0,2)];b.append(s);b.addEventListener('click',()=>set(r));li.append(b);ul.append(li)})})};
i.addEventListener('focus',()=>{MT.load();MT.yomi()},{once:true});i.addEventListener('input',show);
f.addEventListener('submit',e=>{e.preventDefault();show().then(()=>{const b=ul.querySelectorAll('button');if(b.length===1)b[0].click()})});return set}
const mtQ=new URLSearchParams(location.search);`;
// わが家の防災カルテ（/dougu/karte/）も、街のえらび方はこの部品
export { findForm, PICK_JS };

const NITERU_JS = String.raw`(()=>{const f=document.querySelector('[data-pick]'),out=document.getElementById('nr');if(!f)return;
const set=mtPick(f,r=>MT.load().then(K=>{out.innerHTML=mtNearHtml(r,mtNear(K.r,K.s,r[0],3),K.p)+'<p><a class="go" href="/kurabe/?a='+r[0]+'">'+mtEsc(r[1])+'とほかの街をくらべる</a></p>';history.replaceState(null,'','?a='+r[0])}));
const a=mtQ.get('a');if(a)MT.load().then(K=>{const r=K.r.find(x=>x[0]===a);if(r)set(r)})})();`;

const KURABE_JS = String.raw`(()=>{const fs=document.querySelectorAll('[data-pick]'),out=document.getElementById('kr');if(fs.length<2)return;const s=[null,null];
const draw=()=>{const[a,b]=s;if(!a||!b)return;history.replaceState(null,'','?a='+a[0]+'&b='+b[0]);if(a[0]===b[0]){out.innerHTML='<p class="kd0">ちがう街をえらんでください。</p>';return}
MT.load().then(K=>{out.innerHTML='<div id="kc"></div><p class="kh">'+mtEsc(a[1])+' <small>'+mtEsc(K.p[a[0].slice(0,2)])+'</small> から '+mtEsc(b[1])+' <small>'+mtEsc(K.p[b[0].slice(0,2)])+'</small></p><p class="note">赤い字は、'+mtEsc(b[1])+'の数字を'+mtEsc(a[1])+'とくらべたちがいです。</p>'+mtDiffHtml(mtDiff(a,b),a[1],b[1])+'<p><a class="go" href="/dougu/manabi/?k=b&amp;m='+a[0]+'&amp;n='+b[0]+'">この2つの街でプリントを作る</a></p>';const kc=document.getElementById('kc');mtCard().then(()=>{if(kc.isConnected)MCX.show(a,b,K.p,kc)}).catch(()=>{})})};
// カードの絵と部品は、2つの街をえらんだときだけ読む
const mtCard=()=>window.MCX?Promise.resolve():new Promise((ok,ng)=>{const e=document.createElement('script');e.src=document.getElementById('kr').dataset.card;e.onload=ok;e.onerror=ng;document.head.append(e)});
const sets=[...fs].map((f,i)=>mtPick(f,r=>{s[i]=r;draw()}));
const q=[mtQ.get('a'),mtQ.get('b')];if(q[0]||q[1])MT.load().then(K=>q.forEach((c,i)=>{const r=c&&K.r.find(x=>x[0]===c);if(r)sets[i](r)}))})();`;

// 送る画像の部品（/kurabe/card.js）。カードの数字は kazu.json の行のまま、全国の値はデータの合計から
const CARD_FN = [mcRegion, mcMan, mcEsc, mcWidth, mcCard, mcPaper, mcStyle, mcCardSvg, mcShareSvg].map((f) => f.toString()).join('\n');
const CARD_JS = String.raw`(()=>{const img=s=>new Promise((ok,ng)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=ng;i.src=s});
const svg=s=>'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(s);const ei=r=>'/kurabe/e/'+mcRegion(r[0])+'.webp';
// 1200×900 の PNG：下地の SVG → 絵の窓に地方の絵 → 窓の枠と地図の小窓
function make(a,b,pa,pb){return Promise.all([img(svg(mcShareSvg(a,b,pa,pb,MC,'base'))),img(svg(mcShareSvg(a,b,pa,pb,MC,'over'))),img(ei(a)),img(ei(b))]).then(([bs,ov,ea,eb])=>{
const c=document.createElement('canvas');c.width=1200;c.height=900;const x=c.getContext('2d');x.drawImage(bs,0,0);
[[ea,76],[eb,656]].forEach(([e,dx])=>{x.save();x.beginPath();if(x.roundRect)x.roundRect(dx,164,468,200,4);else x.rect(dx,164,468,200);x.clip();x.drawImage(e,dx,164,468,200);x.restore()});
x.drawImage(ov,0,0);return new Promise(ok=>c.toBlob(ok,'image/png'))})}
window.MCX={show(a,b,P,el){const pa=P[a[0].slice(0,2)],pb=P[b[0].slice(0,2)];
el.innerHTML='<div class="mcs">'+mcCardSvg(a,0,pa,MC,ei(a))+mcCardSvg(b,1,pb,MC,ei(b))+'</div><p><button class="go" type="button">カードを画像で送る</button></p><p class="msg" aria-live="polite"></p>';
const bt=el.querySelector('button'),msg=el.querySelector('.msg'),name='machi-card-'+a[0]+'-'+b[0]+'.png';let job=null;
// 押したその場で共有の画面を出せるように、画像は先に作っておく
const go=()=>job||(job=make(a,b,pa,pb).catch(e=>{job=null;throw e}));setTimeout(go,300);
bt.addEventListener('click',()=>{go().then(bl=>{const f=new File([bl],name,{type:'image/png'});
if(navigator.canShare&&navigator.canShare({files:[f]}))return navigator.share({files:[f]}).catch(()=>{});
const u=URL.createObjectURL(bl),l=document.createElement('a');l.href=u;l.download=name;document.body.append(l);l.click();l.remove();setTimeout(()=>URL.revokeObjectURL(u),3000)}).catch(()=>{msg.textContent='画像を作れませんでした。もう一度おしてください'})})}}})();`;

// カードの全国の値・出典・地図の形（card.js の MC。まなびプリントの B もこれで紙のカードを作る）
export function cardData({ munis }) {
  const { w, h, frame, prefs } = JMAP;
  return {
    nat: nationalRates(muniList(munis.areas)),
    src: `▲は全国　出典：総務省「${munis.statName}」を加工して作成`,
    map: { w, h, frame, d: Object.fromEntries(Object.entries(prefs).map(([c, m]) => [c, m.d])) },
  };
}

export function cardScript({ munis }) {
  const MC = cardData({ munis });
  const js = `const MC=${JSON.stringify(MC)};\n${CARD_FN}\n${CARD_JS}\n`;
  return { js, v: createHash('sha256').update(js).digest('hex').slice(0, 10) };
}

// ---- ページの下の説明（夜 #47）：しくみ・本物の街での例（kazu.json と同じ行から、ビルドのときに作る）・よくある問い ----
//   例の街：くらべるは入力欄の例と同じ堺市と岡山市（なければ人口の多い2つ）。似ているは、ページのある街のうち人口がまん中の街
const qa = (q, a) => `<h3>${q}</h3>\n<p>${a}</p>`;
const p1 = (v) => `${(v / 10).toFixed(1)}%`;
const sg1 = (v) => `${v > 0 ? '+' : ''}${(v / 10).toFixed(1)}%`;
// kazu.json の行の数字（6つ。似ているの計算と、くらべるのちがいに使うもの）
const ROWS = [
  ['人口', (r) => `${fmt(r[3])}人`, 'pop'],
  ['15歳未満の割合', (r) => p1(r[4]), 'p014'],
  ['65歳以上の割合', (r) => p1(r[5]), 'p65'],
  ['5年の人口の増減', (r) => sg1(r[6]), 'rate'],
  ['ひとり暮らしの世帯', (r) => p1(r[7]), 'pSingle'],
  ['共同住宅に住む世帯', (r) => p1(r[8]), 'pKyodo'],
];
const prefN = (kazu, r) => esc(kazu.p[r[0].slice(0, 2)]);
const link = (r) => (r[2] ? `<a href="${r[2]}">${esc(r[1])}</a>` : esc(r[1]));

function kurabeMore({ munis, kazu }) {
  const by = (n) => kazu.r.find((r) => r[1] === n && mtCand(r));
  let [a, b] = [by('堺市'), by('岡山市')];
  if (!a || !b) [a, b] = kazu.r.slice(0, 2);
  const d = mtDiff(a, b);
  const shown = new Map(d.map((x) => [x.k, x.text]));
  const tr = ROWS.map(([t, f, k]) => `<tr><td>${t}</td><td>${f(a)}</td><td>${f(b)}</td><td>${shown.get(k) ?? '-'}</td></tr>`).join('');
  const hit = d.map((x) => x.label);
  return `<div class="prose">
${h2('しくみ')}
<p>くらべる数字は${ROWS.length}つです。人口、15歳未満と65歳以上の人の割合、5年の人口の増減、ひとり暮らしの世帯と共同住宅に住む世帯の割合です。</p>
<p>数字は、総務省「${esc(munis.statName)}」の${jpDate(munis.survey)}の数字です。全国${fmt(kazu.r.length)}の市区町村からえらべます。</p>
<p>出すちがいを上の幅にしぼっているのは、小さなちがいまで並べると、どこがちがうのかが見えにくくなるためです。</p>
${h2('例')}
<p>今の街に${prefN(kazu, a)}の${link(a)}、引っ越し先に${prefN(kazu, b)}の${link(b)}を入れたときの数字です。右の列が、ページに出るちがいです。</p>
</div>
<table class="tbl"><thead><tr><th>数字</th><th>${esc(a[1])}</th><th>${esc(b[1])}</th><th>ちがい</th></tr></thead><tbody>${tr}</tbody></table>
<div class="prose">
<p>${hit.length ? `この2つの街で、決まりの幅をこえるのは${hit.join('と')}${hit.length > 1 ? 'です' : 'だけです'}。そのほかの数字は、表の上では差があっても出しません。` : 'この2つの街は、どの数字も決まりの幅に入らないので、ちがいは出ません。'}</p>
<p>2つの街は、全国の値の印がついた2枚のカードにもなります。カードは画像にして送れます。</p>
${h2('よくある問い')}
${qa('住みやすさのくらべですか', 'ちがいます。国勢調査の数字のちがいを出すだけで、どちらがよいかは決めていません。家賃や避難場所の数は、くらべていません。')}
${qa('えらんだ街は送られますか', '送りません。数字は、街をえらぶ欄にさわったときに、まとめて1回だけ読みます。えらんだ街は、ページのURLの後ろにだけ入ります。')}
${qa('2つの街でプリントを作れますか', 'えらんだあとに出る「この2つの街でプリントを作る」から、<a href="/dougu/manabi/">まなびプリント</a>を作れます。')}
</div>`;
}

function niteruMore({ munis, kazu }) {
  const cand = kazu.r.filter(mtCand);
  const withPage = cand.filter((r) => r[2]);
  const pool = withPage.length ? withPage : cand;
  const me = pool[pool.length >> 1];
  const near = mtNear(kazu.r, kazu.s, me[0], 3);
  const cols = [me, ...near];
  const tr = ROWS.map(([t, f]) => `<tr><td>${t}</td>${cols.map((r) => `<td>${f(r)}</td>`).join('')}</tr>`).join('');
  return `<div class="prose">
${h2('しくみ')}
<p>上に書いた${ROWS.length}つの数字を、数字ごとに全国の市区町村の散らばりで割ってならします。そのうえで同じ重みで合わせ、近い順に${near.length}つえらびます。</p>
<p>人口は、差ではなく何倍ちがうかで近さを見ます。人口の大きい街どうしで、差が大きく見えすぎないようにするためです。</p>
<p>政令市は区に分けず、市でまとめています。数字は、総務省「${esc(munis.statName)}」の${jpDate(munis.survey)}の数字です。</p>
${h2('例')}
<p>${prefN(kazu, me)}の${link(me)}を入れると、${near.map((r) => `${prefN(kazu, r)}の${link(r)}`).join('、')}が出ます。</p>
</div>
<table class="tbl"><thead><tr><th>数字</th>${cols.map((r) => `<th>${esc(r[1])}</th>`).join('')}</tr></thead><tbody>${tr}</tbody></table>
<div class="prose">
<p>どの数字もぴったり同じではありませんが、${ROWS.length}つを合わせた近さで見ると、この${near.length}つがいちばん近くなります。</p>
${h2('よくある問い')}
${qa('住みやすさが似ているのですか', 'ちがいます。国勢調査の数字が近いというだけです。家賃や気候は入っていません。')}
${qa('小さな町村は出ませんか', '人口の少ない町村は、似ている街の候補に入れていません。数十人の動きで割合が大きく変わるためです。')}
${qa('2つの街をくらべるには', '出てきた街の下の「ほかの街とくらべる」から、<a href="/kurabe/">2つの街をくらべる</a>に進めます。')}
</div>`;
}

export function toolPages({ munis, kazu }) {
  const card = cardScript({ munis });
  const year = munis.survey.slice(0, 4);
  const nCand = kazu.r.filter(mtCand).length;
  const niteru = `<p class="crumb"><a href="/">トップ</a></p>
<h1 class="city">数字が似ている街</h1>
<p class="lead">数字が似ている街を全国から3つ出します。</p>
${findForm('qn', '市区町村', '例 堺市・さかい')}
<div id="nr" aria-live="polite"></div>
<p class="note">人口・子どもと65歳以上の割合・5年の人口の増減・ひとり暮らしと共同住宅の世帯の割合の近さで、人口1万人以上の${fmt(nCand)}市区町村からえらびます。住みやすさの近さではありません。</p>
${srcKokusei(munis)}
${niteruMore({ munis, kazu })}
${h2('ほかの道具')}<ul class="list"><li><a href="/kurabe/">2つの街の数字をくらべる</a></li><li><a href="/ranking/jinko/">人口が増えた市区町村</a></li></ul>`;

  const kurabe = `<p class="crumb"><a href="/">トップ</a></p>
<h1 class="city">2つの街をくらべる</h1>
<p class="lead">2つの街をカードにして、ちがいも出します。</p>
${findForm('qa', '今の街', '例 堺市・さかい')}
${findForm('qb', '引っ越し先', '例 岡山市・おかやま')}
<div id="kr" aria-live="polite" data-card="/kurabe/card.js?v=${card.v}"></div>
<p class="note">割合は5%以上か1.3倍以上、人口の増減は2%以上、人口は1.3倍以上のちがいだけを出します。</p>
${srcKokusei(munis)}
${kurabeMore({ munis, kazu })}
${h2('ほかの道具')}<ul class="list"><li><a href="/niteru/">数字が似ている街をさがす</a></li><li><a href="/ranking/jinko/">人口が増えた市区町村</a></li></ul>`;

  const head = `<style>${TOOLS_CSS}</style>`;
  const script = `${CORE}\n${PICK_JS}\n`;
  return [
    {
      path: '/niteru/',
      title: '数字が似ている街さがし',
      description: fit(
        [`人口1万人以上の全国${fmt(nCand)}市区町村から、人口・子どもと65歳以上の割合・5年の人口の増減・ひとり暮らしと共同住宅の世帯の割合が近い街を3つさがします。`],
        [[`${year}年国勢調査の数字です。`, '']],
      ),
      head,
      body: niteru,
      script: script + NITERU_JS,
    },
    {
      path: '/kurabe/',
      title: '2つの街の数字をくらべる',
      description: fit(
        [`全国${fmt(kazu.r.length)}市区町村から2つをえらぶと、人口・子どもと65歳以上の割合・5年の人口の増減・ひとり暮らしと共同住宅の世帯の割合のちがいだけを出します。`],
        [[`${year}年国勢調査の数字です。`, '']],
      ),
      head,
      body: kurabe,
      script: script + KURABE_JS,
    },
  ];
}
