// チェックリスト（/dougu/check/）：家に置く備えと持ち出す袋。品目と出典は data/items.yml の checklists から
// チェックはこの端末のブラウザの中だけ（localStorage）。どこにも送らない
import { esc, h2, fit } from '../layout.mjs';
import { calcHtml, CALC_JS, need } from '../calc.mjs';
import { checkEntries } from '../data.mjs';
import { sourceList } from './sonae.mjs';

const CHECK_JS = `(()=>{const K='machi-check-v1';let s={};try{s=JSON.parse(localStorage.getItem(K)||'{}')||{}}catch(e){}
const bx=[...document.querySelectorAll('.ckl input[data-k]')];
const cnt=()=>document.querySelectorAll('[data-count]').forEach(e=>{const l=bx.filter(b=>b.dataset.l===e.dataset.count);e.textContent=l.filter(b=>b.checked).length+'/'+l.length});
const save=()=>{try{localStorage.setItem(K,JSON.stringify(s))}catch(e){}};
bx.forEach(b=>{b.checked=!!s[b.dataset.k];b.addEventListener('change',()=>{if(b.checked)s[b.dataset.k]=1;else delete s[b.dataset.k];save();cnt()})});
const r=document.querySelector('[data-reset]');if(r)r.addEventListener('click',()=>{s={};try{localStorage.removeItem(K)}catch(e){}bx.forEach(b=>b.checked=false);cnt()});cnt()})();`;

export function douguPages({ cc, items, sources }) {
  const { days } = cc;
  const n = 4;
  const d = days.min;
  const lists = items.checklists.map((cl) => ({ cl, entries: checkEntries(items, cl) }));
  const section = ({ cl, entries }) => `<section id="${cl.id}">${h2(`${esc(cl.name)}<span class="kz" data-count="${cl.id}">0/${entries.length}</span>`)}
<ul class="ckl">${entries
    .map((e) => {
      const key = e.qty ? cc.out[e.item.id] : null;
      const per = e.qty ? e.item.per_day : null;
      const sub = e.sub ?? (e.qty ? `1人1日${per}${e.item.unit === '回分' ? '回' : e.item.unit}` : '');
      const qty = e.qty ? `<span class="qn"><b data-out="${key}">${need(per, n, d).toLocaleString('ja-JP')}</b>${esc(e.item.unit)}</span>` : '<span></span>';
      return `<li><label><input type="checkbox" data-l="${cl.id}" data-k="${esc(e.key)}"><span class="bx" aria-hidden="true"></span><span class="t">${esc(e.name)}${sub ? `<small>${esc(sub)}</small>` : ''}</span>${qty}</label></li>`;
    })
    .join('')}</ul></section>`;
  const allSources = [...new Set(lists.flatMap(({ entries }) => entries.flatMap((e) => e.sources)).concat(days.sources))];

  return [
    {
      path: '/dougu/check/',
      title: '備えのチェックリスト（家に置く備え・持ち出す袋）',
      description: fit(
        [`${lists.map(({ cl, entries }) => `${cl.name}${entries.length}品目`).join('と')}のチェックリスト。家族の人数と日数（${days.choices.join('日か')}日）で、水・主食・携帯トイレの量が出ます。`],
        [['チェックはこの端末の中だけに残り、どこにも送りません。', 'チェックはこの端末の中だけに残ります。']],
      ),
      body: `<p class="crumb"><a href="/">トップ</a> / <a href="/sonae/">備えの知識</a></p>
<h1 class="city">チェックリスト</h1>
${calcHtml(cc, { n, d, q: '人数と日数', ans: false })}
<p class="src">量は人数分。最低${days.min}日分、できれば${days.better}日分。チェックはこの端末の中だけに残ります</p>
${lists.map(section).join('\n')}
<p><button class="clr" type="button" data-reset>チェックをすべて消す</button></p>
<p><a class="go" href="/hinmoku/">品目ごとのめやす</a><br><a class="go" href="/dougu/keisan/">備蓄の量を計算する</a></p>
${h2('出典')}
${sourceList(allSources, sources)}`,
      script: CALC_JS + CHECK_JS,
    },
  ];
}
