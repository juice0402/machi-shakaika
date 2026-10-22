// 備蓄量の計算（トップ・計算のページ・市区町村ページへのリンク先で共通）
// 数字は data/items.yml から（本文に直接書かない）
import { HAN, esc } from './layout.mjs';

export function calcConf(items) {
  const by = Object.fromEntries(items.items.map((it) => [it.id, it]));
  return {
    by,
    days: items.days,
    per: { mizu: by.mizu.per_day, shoku: by.shushoku.per_day, toilet: by['keitai-toilet'].per_day },
    perText: `1人1日 水${by.mizu.per_day}L・${by.shushoku.per_day}食・トイレ${by['keitai-toilet'].per_day}回のめやす`,
  };
}

export const need = (per, n, d) => Math.round(per * n * d);

export function calcHtml(cc, { n = 4, d = cc.days.min, q = 'わが家の備えは、どれだけ？', id = 'calc' } = {}) {
  const days = cc.days.choices
    .map((x) => `<button class="day${x === d ? ' on' : ''}" data-day="${x}" aria-pressed="${x === d}"><span>${x}日</span>${HAN}</button>`)
    .join('');
  return `<section id="${id}" class="calc" data-per='${JSON.stringify(cc.per)}' data-n="${n}" data-d="${d}">
<p class="q">${esc(q)}</p>
<div class="row"><span class="k">人数</span><button data-step="-1" aria-label="1人へらす">−</button><b data-num>${n}</b><span>人</span><button data-step="1" aria-label="1人ふやす">＋</button></div>
<div class="row"><span class="k">日数</span>${days}</div>
<p class="ans">水<b data-out="mizu">${need(cc.per.mizu, n, d)}</b>L　食事<b data-out="shoku">${need(cc.per.shoku, n, d)}</b>食　携帯トイレ<b data-out="toilet">${need(cc.per.toilet, n, d)}</b>回分</p>
</section>`;
}

// ?n=1&d=7 で人数と日数を入れて開ける（市区町村ページの「1人分」など）
export const CALC_JS = `(()=>{const c=document.getElementById('calc');if(!c)return;const per=JSON.parse(c.dataset.per);let n=+c.dataset.n,d=+c.dataset.d;
const u=new URLSearchParams(location.search);if(+u.get('n')>=1)n=Math.min(10,+u.get('n')|0);if(u.get('d')==='3'||u.get('d')==='7')d=+u.get('d');
const f=v=>Math.round(v).toLocaleString('ja-JP');
function draw(){c.querySelectorAll('[data-num]').forEach(e=>e.textContent=n);c.querySelectorAll('[data-day]').forEach(b=>{const on=+b.dataset.day===d;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
for(const k in per)c.querySelectorAll('[data-out="'+k+'"]').forEach(e=>e.textContent=f(per[k]*n*d))}
c.addEventListener('click',e=>{const s=e.target.closest('[data-step]'),y=e.target.closest('[data-day]');if(s){n=Math.min(10,Math.max(1,n+ +s.dataset.step));draw()}else if(y){d=+y.dataset.day;draw()}});draw()})();`;
