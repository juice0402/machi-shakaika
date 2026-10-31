// トップ（/）：パソコンの広い画面では、街さがし・計算・出典が右の柱（.side）。上に街さがし（漢字・ひらがな・カタカナ。読みがなは data/yomi.json）、すぐ下に計算。その下に都道府県の地図と備えの知識
import { esc, h2, jpDate, fmt, fit } from '../layout.mjs';
import { SITE } from '../site.mjs';
import { heroHtml } from '../art.mjs';
import { japanMap, JMAP_CSS } from '../japan-map.mjs';
import { calcHtml, CALC_JS, need } from '../calc.mjs';
import { muniList } from '../stats.mjs';
import { resolveCities, PREFS } from '../areas.mjs';
import { kazuData } from '../machi-tools.mjs';
import { mtNear } from '../machi-core.mjs';
import { rankingData, rateText, MIN_POP } from './ranking.mjs';

export const FIND_JS = `(()=>{const f=document.querySelector('[data-find]');if(!f)return;const i=f.querySelector('input'),ul=f.querySelector('.hits'),msg=f.querySelector('.msg');let all=null;
const load=()=>all?Promise.resolve(all):fetch('/search.json').then(r=>r.json()).then(j=>all=j);
const norm=s=>s.normalize('NFKC').replace(/[\\s　]/g,'').replace(/[ァ-ヶ]/g,c=>String.fromCharCode(c.charCodeAt(0)-96));
const score=(x,v)=>{const n=norm(x[0]),y=x[3]||'';return n.startsWith(v)||y.startsWith(v)?2:n.includes(v)||y.includes(v)?1:0};
function show(){const v=norm(i.value);ul.textContent='';msg.textContent='';if(!v)return;load().then(a=>{const hit=a.map(x=>[score(x,v),x]).filter(e=>e[0]).sort((p,q)=>q[0]-p[0]).slice(0,8).map(e=>e[1]);if(!hit.length){msg.textContent='見つかりません。市区町村の名前か読みがなで入れてください';return}
hit.forEach(([n,p,u])=>{const li=document.createElement('li'),a=document.createElement('a');a.href=u;a.textContent=n;const s=document.createElement('small');s.textContent=p;a.append(s);li.append(a);ul.append(li)})})}
i.addEventListener('focus',load,{once:true});i.addEventListener('input',show);f.addEventListener('submit',e=>{e.preventDefault();show();const a=ul.querySelector('a');if(a&&ul.children.length===1)location.href=a.href})})();`;

// 1画面めより下の2節（夜 #47）：街の数字と家の備えを、本物の街と items.yml の数字で。例の街は、さがす欄の例と同じ堺市
const PREF_NAME = new Map(PREFS.map((p) => [p.code, p.name]));
function moreHtml({ cc, munis }) {
  const list = muniList(munis.areas);
  const { cities } = resolveCities(munis.areas);
  const url = new Map(cities.map((c) => [c.code, `/${c.pref}/${c.slug}/`]));
  const withPage = list.filter((a) => url.has(a.code)).sort((a, b) => b.pop - a.pop);
  const a = withPage.find((x) => x.name === '堺市') ?? withPage[0];
  const out = [];
  if (a) {
    const per = Math.round(a.per * 10) / 10;
    const pn = esc(PREF_NAME.get(a.code.slice(0, 2)) ?? '');
    const K = kazuData(munis.areas, (c) => url.get(c) ?? null);
    const near = mtNear(K.r, K.s, a.code, 2);
    const nm = (r) => (r[2] ? `<a href="${r[2]}">${esc(r[1])}</a>` : esc(r[1]));
    const { up, byRate } = rankingData({ munis, list });
    const top1 = byRate[0];
    const prevYear = Number(munis.survey.slice(0, 4)) - 5; // 国勢調査は5年ごと。くらべるのは前の回の人口
    out.push(`<section class="prose">${h2('街の数字')}
<p>市区町村のページには、国勢調査の人口と世帯の数、年齢と世帯の割合を、全国の中の位置といっしょに出しています。数字は${jpDate(munis.survey)}のもので、${jpDate(munis.published)}に公表されました。</p>
<p>たとえば${pn}の<a href="${url.get(a.code)}">${esc(a.name)}</a>は、人口${fmt(a.pop)}人、世帯の数は${fmt(a.hh)}です。一般世帯の1世帯の人数は${per.toFixed(1)}人で、この人数で${cc.days.better}日分を計算すると、水は約${need(cc.per.mizu, per, cc.days.better)}Lです。</p>
${near.length === 2 ? `<p><a href="/niteru/">数字が似ている街</a>で${esc(a.name)}を入れると、いちばん近いのは${nm(near[0])}で、次が${nm(near[1])}です。人口や年齢の割合などの近さで、住みやすさの近さではありません。</p>` : ''}
${top1 ? `<p>${prevYear}年から<a href="/ranking/jinko/">人口が増えた市区町村</a>は、全国で${fmt(up.length)}あります。人口${fmt(MIN_POP / 10000)}万人以上の街で増えた割合がいちばん大きいのは、${esc(PREF_NAME.get(top1.code.slice(0, 2)) ?? '')}の${esc(top1.name)}の${rateText(top1)}です。</p>` : ''}
</section>`);
  }
  const { by, days } = cc;
  const q = (id, n, d) => `${fmt(need(by[id].per_day, n, d))}${esc(by[id].unit)}`;
  out.push(`<section class="prose">${h2('家の備え')}
<p>このページの計算は、${esc(cc.perText)}に、人数と日数をかけています。2人で${days.better}日分なら、水は${q('mizu', 2, days.better)}、食事は${q('shushoku', 2, days.better)}です。携帯トイレは${q('keitai-toilet', 2, days.better)}になります。</p>
<p><a href="/hinmoku/">備えの品目</a>のページでは、量を出せる品目の早見表を見られます。</p>
</section>`);
  return out.join('\n');
}

export function topPage({ cc, munis, hinanMeta, nMunis }) {
  const body = `${heroHtml()}
<div class="side"><form class="find" data-find role="search"><label for="q">市区町村</label><input id="q" type="search" placeholder="例 堺市・さかい" autocomplete="off" enterkeyhint="search"><button>さがす</button><ul class="hits"></ul><p class="msg" aria-live="polite"></p></form>
${calcHtml(cc)}
<p class="src">${cc.perText}（農林水産省・内閣府のガイドラインほか）<br>${esc(munis.statName)}（${jpDate(munis.published)}公表）・避難場所データ ${jpDate(hinanMeta.checked)}取得</p></div>
<section id="map">${h2('都道府県から')}${japanMap()}<ul class="list"><li><a href="/ranking/jinko/">人口が増えた市区町村</a></li><li><a href="/niteru/">数字が似ている街をさがす</a></li><li><a href="/kurabe/">2つの街の数字をくらべる</a></li></ul></section>
<section>${h2('備えの知識')}<ul class="list"><li><a href="/sonae/bichiku/">備蓄の量のめやす</a></li><li><a href="/sonae/rolling-stock/">ローリングストック</a></li><li><a href="/sonae/keitai-toilet/">携帯トイレの備え</a></li><li><a href="/sonae/fuyu-teiden/">冬の停電と寒さの備え</a></li><li><a href="/dougu/check/">チェックリスト</a></li><li><a href="/dougu/kigen/">期限メモ</a></li><li><a href="/dougu/karte/">わが家の防災カルテ</a></li><li><a href="/hinmoku/">品目ごとのめやす</a></li></ul></section>
<section>${h2('クイズ')}<ul class="list"><li><a href="/quiz/kyou/">今日の1問</a></li><li><a href="/quiz/docchi/">どっちが多い？</a></li><li><a href="/quiz/dobon/">ドボンクイズ</a></li><li><a href="/quiz/sonae/">備えの数字クイズ</a></li></ul></section>
${moreHtml({ cc, munis })}`;
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
    hashira: true,
    script: CALC_JS + FIND_JS,
  };
}
