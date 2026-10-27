// 街の道具のページ（10/27 #17）：似てる街さがし /niteru/・2つの街をくらべる /kurabe/
//   数字は /kurabe/kazu.json を、街をえらぶ欄にさわったときだけ読む。えらんだ街は送らない（URL の ?a= だけ）
//   街のえらび方はトップの市区町村さがしと同じ部品（.find）
import { h2, srcKokusei, fmt, fit } from '../layout.mjs';
import { mtVec, mtCand, mtNear, mtDiff, mtEsc, mtDiffHtml, mtNearHtml } from '../machi-core.mjs';

const CORE = [mtVec, mtCand, mtNear, mtDiff, mtEsc, mtDiffHtml, mtNearHtml].map((f) => f.toString()).join('\n');

export const TOOLS_CSS = `.hits button{display:block;width:100%;padding:7px 0;border:0;border-bottom:1px dotted var(--line);background:none;font:inherit;color:var(--ink);text-align:left;text-decoration:underline;cursor:pointer}.hits button small{color:var(--sub);margin-left:6px}
.kh{margin:14px 0 2px;font:700 17px/1.5 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif}.kh small{font:400 12px/1 sans-serif;color:var(--sub)}
.kd{margin:12px 0 0;padding:0 0 10px;border-bottom:1px dotted var(--line)}.kt{margin:0 0 4px;font-size:14px}.kt b{margin-left:8px;font-size:20px;color:var(--accent);font-variant-numeric:tabular-nums}
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

const NITERU_JS = String.raw`(()=>{const f=document.querySelector('[data-pick]'),out=document.getElementById('nr');if(!f)return;
const set=mtPick(f,r=>MT.load().then(K=>{out.innerHTML=mtNearHtml(r,mtNear(K.r,K.s,r[0],3),K.p)+'<p><a class="go" href="/kurabe/?a='+r[0]+'">'+mtEsc(r[1])+'とほかの街をくらべる</a></p>';history.replaceState(null,'','?a='+r[0])}));
const a=mtQ.get('a');if(a)MT.load().then(K=>{const r=K.r.find(x=>x[0]===a);if(r)set(r)})})();`;

const KURABE_JS = String.raw`(()=>{const fs=document.querySelectorAll('[data-pick]'),out=document.getElementById('kr');if(fs.length<2)return;const s=[null,null];
const draw=()=>{const[a,b]=s;if(!a||!b)return;history.replaceState(null,'','?a='+a[0]+'&b='+b[0]);if(a[0]===b[0]){out.innerHTML='<p class="kd0">ちがう街をえらんでください。</p>';return}
MT.load().then(K=>{out.innerHTML='<p class="kh">'+mtEsc(a[1])+' <small>'+mtEsc(K.p[a[0].slice(0,2)])+'</small> から '+mtEsc(b[1])+' <small>'+mtEsc(K.p[b[0].slice(0,2)])+'</small></p><p class="note">赤い字は、'+mtEsc(b[1])+'の数字を'+mtEsc(a[1])+'とくらべたちがいです。</p>'+mtDiffHtml(mtDiff(a,b),a[1],b[1])})};
const sets=[...fs].map((f,i)=>mtPick(f,r=>{s[i]=r;draw()}));
const q=[mtQ.get('a'),mtQ.get('b')];if(q[0]||q[1])MT.load().then(K=>q.forEach((c,i)=>{const r=c&&K.r.find(x=>x[0]===c);if(r)sets[i](r)}))})();`;

export function toolPages({ munis, kazu }) {
  const year = munis.survey.slice(0, 4);
  const nCand = kazu.r.filter(mtCand).length;
  const niteru = `<p class="crumb"><a href="/">トップ</a></p>
<h1 class="city">数字が似ている街</h1>
<p class="lead">数字が似ている街を全国から3つ出します。</p>
${findForm('qn', '市区町村', '例 堺市・さかい')}
<div id="nr" aria-live="polite"></div>
<p class="note">人口・子どもと65歳以上の割合・5年の人口の増減・ひとり暮らしと共同住宅の世帯の割合の近さで、人口1万人以上の${fmt(nCand)}市区町村からえらびます。住みやすさの近さではありません。</p>
${srcKokusei(munis)}
${h2('ほかの道具')}<ul class="list"><li><a href="/kurabe/">2つの街の数字をくらべる</a></li><li><a href="/ranking/jinko/">人口が増えた市区町村</a></li></ul>`;

  const kurabe = `<p class="crumb"><a href="/">トップ</a></p>
<h1 class="city">2つの街をくらべる</h1>
<p class="lead">今の街と引っ越し先の、ちがいだけを出します。</p>
${findForm('qa', '今の街', '例 堺市・さかい')}
${findForm('qb', '引っ越し先', '例 岡山市・おかやま')}
<div id="kr" aria-live="polite"></div>
<p class="note">割合は5%以上か1.3倍以上、人口の増減は2%以上、人口は1.3倍以上のちがいだけを出します。</p>
${srcKokusei(munis)}
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
