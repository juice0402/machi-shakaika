// トップ（/）：上に街さがし（漢字・ひらがな・カタカナ。読みがなは data/yomi.json）、すぐ下に計算。その下に都道府県の地図と備えの知識
import { esc, h2, jpDate, fmt, fit } from '../layout.mjs';
import { SITE } from '../site.mjs';
import { calcHtml, CALC_JS } from '../calc.mjs';
import { heroHtml } from '../art.mjs';
import { japanMap, JMAP_CSS } from '../japan-map.mjs';

export const FIND_JS = `(()=>{const f=document.querySelector('[data-find]');if(!f)return;const i=f.querySelector('input'),ul=f.querySelector('.hits'),msg=f.querySelector('.msg');let all=null;
const load=()=>all?Promise.resolve(all):fetch('/search.json').then(r=>r.json()).then(j=>all=j);
const norm=s=>s.normalize('NFKC').replace(/[\\s　]/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const score=(x,v)=>{const n=norm(x[0]),y=x[3]||'';return n.startsWith(v)||y.startsWith(v)?2:n.includes(v)||y.includes(v)?1:0};
function show(){const v=norm(i.value);ul.textContent='';msg.textContent='';if(!v)return;load().then(a=>{const hit=a.map(x=>[score(x,v),x]).filter(e=>e[0]).sort((p,q)=>q[0]-p[0]).slice(0,8).map(e=>e[1]);if(!hit.length){msg.textContent='見つかりません。市区町村の名前か読みがなで入れてください';return}
hit.forEach(([n,p,u])=>{const li=document.createElement('li'),a=document.createElement('a');a.href=u;a.textContent=n;const s=document.createElement('small');s.textContent=p;a.append(s);li.append(a);ul.append(li)})})}
i.addEventListener('focus',load,{once:true});i.addEventListener('input',show);f.addEventListener('submit',e=>{e.preventDefault();show();const a=ul.querySelector('a');if(a&&ul.children.length===1)location.href=a.href})})();`;

export function topPage({ cc, munis, hinanMeta, nMunis }) {
  const body = `${heroHtml()}
<form class="find" data-find role="search"><label for="q">市区町村</label><input id="q" type="search" placeholder="例 堺市・さかい" autocomplete="off" enterkeyhint="search"><button>さがす</button><ul class="hits"></ul><p class="msg" aria-live="polite"></p></form>
${calcHtml(cc)}
<p class="src">${cc.perText}（農林水産省・内閣府のガイドラインほか）<br>${esc(munis.statName)}（${jpDate(munis.published)}公表）・避難場所データ ${jpDate(hinanMeta.checked)}取得</p>
<section id="map">${h2('都道府県から')}${japanMap()}<ul class="list"><li><a href="/ranking/jinko/">人口が増えた市区町村</a></li><li><a href="/niteru/">数字が似ている街をさがす</a></li><li><a href="/kurabe/">2つの街の数字をくらべる</a></li></ul></section>
<section>${h2('備えの知識')}<ul class="list"><li><a href="/sonae/bichiku/">備蓄の量のめやす</a></li><li><a href="/sonae/rolling-stock/">ローリングストック</a></li><li><a href="/sonae/keitai-toilet/">携帯トイレの備え</a></li><li><a href="/sonae/fuyu-teiden/">冬の停電と寒さの備え</a></li><li><a href="/dougu/check/">チェックリスト</a></li><li><a href="/dougu/kigen/">期限メモ</a></li><li><a href="/dougu/karte/">わが家の防災カルテ</a></li><li><a href="/hinmoku/">品目ごとのめやす</a></li></ul></section>
<section>${h2('クイズ')}<ul class="list"><li><a href="/quiz/docchi/">どっちが多い？</a></li><li><a href="/quiz/dobon/">ドボンクイズ</a></li><li><a href="/quiz/sonae/">備えの数字クイズ</a></li></ul></section>`;
  return {
    path: '/',
    title: 'まちの社会科',
    description: fit(
      [`全国${fmt(nMunis)}市区町村の人口と世帯の数（${munis.survey.slice(0, 4)}年国勢調査・${jpDate(munis.published)}公表）と、家族の人数で出す水・食事・携帯トイレの備えの量。`],
      [[`全国${fmt(hinanMeta.total.basho)}か所の指定緊急避難場所の数や、街の数字のクイズも。`, '街の数字のクイズも。']],
    ),
    // Google の「サイト名」がドメインのまま出ないように（WebSite の構造化データ）
    head: `<style>${JMAP_CSS}</style><script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, alternateName: SITE.project, url: `${SITE.url}/` })}</script>`,
    body,
    script: CALC_JS + FIND_JS,
  };
}
