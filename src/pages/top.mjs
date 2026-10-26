// トップ（/）：上に街さがし、すぐ下に計算。その下に都道府県の地図と備えの知識
import { esc, h2, jpDate, fmt, fit } from '../layout.mjs';
import { SITE } from '../site.mjs';
import { calcHtml, CALC_JS } from '../calc.mjs';
import { PREFS } from '../areas.mjs';

// 47都道府県のタイル地図（列, 行）
export const TILES = {
  hokkaido: [12, 0], aomori: [12, 2], akita: [11, 3], iwate: [12, 3],
  ishikawa: [8, 4], toyama: [9, 4], niigata: [10, 4], yamagata: [11, 4], miyagi: [12, 4],
  shimane: [3, 5], tottori: [4, 5], hyogo: [5, 5], kyoto: [6, 5], fukui: [7, 5], gifu: [8, 5], nagano: [9, 5], gunma: [10, 5], tochigi: [11, 5], fukushima: [12, 5],
  yamaguchi: [2, 6], hiroshima: [3, 6], okayama: [4, 6], osaka: [5, 6], nara: [6, 6], shiga: [7, 6], aichi: [8, 6], yamanashi: [9, 6], saitama: [10, 6], ibaraki: [11, 6],
  saga: [0, 7], fukuoka: [1, 7], oita: [2, 7], ehime: [3, 7], kagawa: [4, 7], wakayama: [5, 7], mie: [6, 7], shizuoka: [8, 7], kanagawa: [9, 7], tokyo: [10, 7], chiba: [11, 7],
  nagasaki: [0, 8], kumamoto: [1, 8], miyazaki: [2, 8], kochi: [3, 8], tokushima: [4, 8],
  kagoshima: [1, 9], okinawa: [0, 11],
};
export const short = (n) => (n === '北海道' ? '北海' : n.replace(/[都府県]$/, '').slice(0, 2));

export const FIND_JS = `(()=>{const f=document.querySelector('[data-find]');if(!f)return;const i=f.querySelector('input'),ul=f.querySelector('.hits'),msg=f.querySelector('.msg');let all=null;
const load=()=>all?Promise.resolve(all):fetch('/search.json').then(r=>r.json()).then(j=>all=j);
const norm=s=>s.normalize('NFKC').replace(/[\\s　]/g,'');
function show(){const v=norm(i.value);ul.textContent='';msg.textContent='';if(!v)return;load().then(a=>{const hit=a.filter(x=>norm(x[0]).includes(v)).slice(0,8);if(!hit.length){msg.textContent='見つかりません。市区町村の名前で入れてください';return}
hit.forEach(([n,p,u])=>{const li=document.createElement('li'),a=document.createElement('a');a.href=u;a.textContent=n;const s=document.createElement('small');s.textContent=p;a.append(s);li.append(a);ul.append(li)})})}
i.addEventListener('focus',load,{once:true});i.addEventListener('input',show);f.addEventListener('submit',e=>{e.preventDefault();show();const a=ul.querySelector('a');if(a&&ul.children.length===1)location.href=a.href})})();`;

export function topPage({ cc, munis, hinanMeta, nMunis }) {
  const tiles = PREFS.map((p) => {
    const [x, y] = TILES[p.slug];
    return `<a class="tile" href="/${p.slug}/" style="grid-column:${x + 1};grid-row:${y + 1}" aria-label="${esc(p.name)}">${short(p.name)}</a>`;
  }).join('');
  const body = `<p class="lead">街の数字を調べて、わが家の備えの量を出す</p>
<form class="find" data-find role="search"><label for="q">市区町村</label><input id="q" type="search" placeholder="例 堺市" autocomplete="off" enterkeyhint="search"><button>さがす</button><ul class="hits"></ul><p class="msg" aria-live="polite"></p></form>
${calcHtml(cc)}
<p class="src">${cc.perText}（農林水産省・内閣府のガイドラインほか）<br>${esc(munis.statName)}（${jpDate(munis.published)}公表）・避難場所データ ${jpDate(hinanMeta.checked)}取得</p>
<section id="map">${h2('都道府県から')}<div class="tiles">${tiles}</div><ul class="list"><li><a href="/ranking/jinko/">人口が増えた市区町村</a></li></ul></section>
<section>${h2('備えの知識')}<ul class="list"><li><a href="/sonae/bichiku/">備蓄の量のめやす</a></li><li><a href="/sonae/rolling-stock/">ローリングストック</a></li><li><a href="/sonae/keitai-toilet/">携帯トイレの備え</a></li><li><a href="/dougu/check/">チェックリスト</a></li><li><a href="/hinmoku/">品目ごとのめやす</a></li></ul></section>
<section>${h2('クイズ')}<ul class="list"><li><a href="/quiz/docchi/">どっちが多い？</a></li><li><a href="/quiz/dobon/">ドボンクイズ</a></li><li><a href="/quiz/sonae/">備えの数字クイズ</a></li></ul></section>`;
  return {
    path: '/',
    title: 'まちの社会科',
    description: fit(
      [`全国${fmt(nMunis)}市区町村の人口と世帯の数（${munis.survey.slice(0, 4)}年国勢調査・${jpDate(munis.published)}公表）と、家族の人数で出す水・食事・携帯トイレの備えの量。`],
      [[`全国${fmt(hinanMeta.total.basho)}か所の指定緊急避難場所の数や、街の数字のクイズも。`, '街の数字のクイズも。']],
    ),
    // Google の「サイト名」がドメインのまま出ないように（WebSite の構造化データ）
    head: `<script type="application/ld+json">${JSON.stringify({ '@context': 'https://schema.org', '@type': 'WebSite', name: SITE.name, alternateName: SITE.project, url: `${SITE.url}/` })}</script>`,
    body,
    script: CALC_JS + FIND_JS,
  };
}
