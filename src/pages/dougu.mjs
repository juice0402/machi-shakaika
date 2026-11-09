// チェックリスト（/dougu/check/）：家に置く備えと持ち出す袋。品目と出典は data/items.yml の checklists から
// チェックはこの端末のブラウザの中だけ（localStorage）。どこにも送らない
import { esc, h2, fit } from '../layout.mjs';
import { calcHtml, CALC_JS, need } from '../calc.mjs';
import { checkEntries } from '../data.mjs';
import { sourceList } from './sonae.mjs';
import { a8Ad } from '../a8.mjs';

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
  // 下の説明（夜 #74）：しくみと使う場面の例。品目の数・日付・量はデータから
  const [home, bag] = lists;
  const q = (id, nn, dd) => `${need(cc.by[id].per_day, nn, dd).toLocaleString('ja-JP')}${esc(cc.by[id].unit)}`;
  const hi = items.minaoshi.hi;
  const more = `<div class="prose">
${h2('しくみ')}
<p>${esc(home.cl.name)}は${home.entries.length}品目、${esc(bag.cl.name)}は${bag.entries.length}品目です。品目は、国や自治体の資料にある備えの例から集め、ページの下に出典を並べています。</p>
<p>水と主食と携帯トイレの3つは、上の欄の人数と日数で量が変わります。量は1人1日の量に人数と日数をかけたもので、はじめは${n}人の${d}日分です。</p>
<p>${esc(bag.cl.name)}の携帯トイレには、量を出していません。家に置く分の量は、${esc(home.cl.name)}の行で数えます。</p>
<p>チェックした行は、この端末のブラウザの中だけに残ります。当サイトには送りません。「チェックをすべて消す」をおすと、はじめの状態に戻ります。</p>
${h2('使う場面の例')}
<p>日を決めて見直すときに使えます。${esc(hi.bousai)}の防災の日や、東京都が備蓄の日としている${esc(hi.bichiku)}などです。見直しの流れは<a href="/sonae/minaoshi/">年に2回の備えの見直し</a>に。</p>
<p>家族の人数が変わったら、人数を入れ直します。3人から4人になると、${days.better}日分の水は${q('mizu', 3, days.better)}から${q('mizu', 4, days.better)}にふえます。</p>
<p>赤ちゃんが生まれた家は、${esc(bag.cl.name)}にある乳児がいる家の行も見ます。ミルクや紙おむつ、ほ乳びんの行です。</p>
<p>期限のある品目は、<a href="/dougu/kigen/">期限メモ</a>に入れると近い順に並びます。紙に印刷して、冷蔵庫に貼っておく形もあります。</p>
${h2('まちがえやすいところ')}
<p>水の量は、飲み水と調理の水です。トイレを流す水などの生活用水は、別の行にしてあります。</p>
<p>主食の数は、ご飯や乾パンなど主食だけの数です。おかずになる缶詰などは、すぐ下の行で確かめます。</p>
<p>${esc(bag.cl.name)}は、${esc(home.cl.name)}とは別にそろえます。携帯トイレが両方に出てくるのは、そのためです。</p>
<p>チェックはこの端末だけに残るので、家族のほかの端末で開くと、何もついていない状態に見えます。家族で見るときは、1台にまとめてつけます。</p>
</div>`;
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
<p><a class="go" href="/hinmoku/">品目ごとのめやす</a><br><a class="go" href="/dougu/keisan/">備蓄の量を計算する</a><br><a class="go" href="/dougu/kigen/">賞味期限をメモする</a><br><a class="go" href="/dougu/print/">冷蔵庫に貼る紙（A4）</a><br><a class="go" href="/dougu/karte/">わが家の防災カルテ（A4）</a><br><a class="go" href="/dougu/manabi/">まなびプリント（街の数字を読む・A4）</a></p>
${a8Ad('bousaiset')}
${more}
${h2('出典')}
${sourceList(allSources, sources)}`,
      script: CALC_JS + CHECK_JS,
    },
  ];
}
