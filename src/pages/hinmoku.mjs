// 品目ページ（/hinmoku/ と /hinmoku/<id>/）：量のめやす（items.yml）と、楽天市場の商品（毎日とりなおす）
// 楽天の商品を出すページは、AdSense を置かない・楽天以外へのリンクを置かない（楽天ウェブサービス規約 第8条4項・第10条1項4号）
//   出典はリンクにせず名前と確認日だけ（リンクは備えの知識のページにある）。フッターに楽天のクレジット（layout.mjs）
import { esc, fmt, h2, jpDate } from '../layout.mjs';
import { need } from '../calc.mjs';
import { SHOW, cleanName } from '../rakuten.mjs';

const SONAE = { mizu: ['/sonae/bichiku/', '備蓄の量のめやす'], shushoku: ['/sonae/rolling-stock/', 'ローリングストック'], 'keitai-toilet': ['/sonae/keitai-toilet/', '携帯トイレの備え'] };

// 商品を見るたびに入れかえる（持っている KEEP 件から SHOW 件。スクリプトが動かなければ最初の SHOW 件）
export const SHOP_JS = `(()=>{document.querySelectorAll('ul.shop').forEach(u=>{const li=[...u.children],k=+u.dataset.show||3;if(li.length<=k)return;for(let i=li.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[li[i],li[j]]=[li[j],li[i]]}li.forEach((x,i)=>{x.hidden=i>=k;u.append(x)})})})();`;

const jstDay = (iso) => {
  const d = new Intl.DateTimeFormat('ja-JP', { timeZone: 'Asia/Tokyo', year: 'numeric', month: 'numeric', day: 'numeric' }).formatToParts(new Date(iso));
  const g = (t) => d.find((x) => x.type === t).value;
  return `${g('year')}年${g('month')}月${g('day')}日`;
};

function amount(it, days) {
  if (it.calc) {
    const u = it.unit === '回分' ? '回' : it.unit;
    return `1人1日${it.per_day}${u}。4人家族の${days.min}日分は${need(it.per_day, 4, days.min)}${it.unit}、${days.better}日分は${need(it.per_day, 4, days.better)}${it.unit}`;
  }
  if (it.example_qty) return `${it.example_text}${it.example_qty}${it.unit}`;
  return it.page_note ?? '';
}

function sourceText(ids, sources) {
  const by = new Map(sources.sources.map((s) => [s.id, s]));
  return `<ul class="notes">${ids
    .map((id) => {
      const s = by.get(id);
      return `<li>${esc(s.title ? `${s.publisher}「${s.title}」` : s.publisher)}（${jpDate(s.checked)}確認）</li>`;
    })
    .join('')}</ul>`;
}

function shopList(list, fetchedAt) {
  if (!list?.length) return '';
  return `<section class="shopb" aria-label="楽天市場の商品">
<p class="pr"><b>PR</b>　楽天市場の商品（楽天アフィリエイト）</p>
<ul class="shop" data-show="${SHOW}">${list
    .map(
      (x, i) => `<li${i >= SHOW ? ' hidden' : ''}><a href="${esc(x.url)}" rel="nofollow sponsored noopener"><img src="${esc(x.img)}" width="128" height="128" loading="lazy" alt="${esc(cleanName(x.name))}"><span class="nm">${esc(cleanName(x.name))}</span><span class="pz">${fmt(x.price)}円</span><span class="rv">レビュー ${fmt(x.reviews)}件・平均${x.rating.toFixed(2)}</span>${x.rank ? `<span class="rv">楽天ランキング ${x.rank}位（ジャンル別）</span>` : ''}<span class="to">楽天市場で見る</span></a></li>`,
    )
    .join('')}</ul>
<p class="src">楽天市場のランキングとレビューの数からえらび、開くたびに入れかわります。価格は${jstDay(fetchedAt)}時点</p>
</section>`;
}

export function hinmokuPages({ items, sources, products }) {
  const days = items.days;
  const list = items.items.filter((it) => it.hinmoku);
  const out = [];
  out.push({
    path: '/hinmoku/',
    title: '備えの品目（水・主食・携帯トイレ・カセットコンロなど）',
    description: `家に置く備えの品目ごとの量のめやす。${list.map((it) => it.name).join('・')}。`,
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/sonae/">備えの知識</a></p>
<h1 class="city">備えの品目</h1>
<ul class="list">${list.map((it) => `<li><a href="/hinmoku/${it.id}/">${esc(it.name)}</a><small class="sub">${esc(amount(it, days))}</small></li>`).join('')}</ul>
<p><a class="go" href="/dougu/check/">チェックリスト</a></p>`,
  });
  for (const it of list) {
    const shop = products?.items?.[it.id];
    const rel = SONAE[it.id];
    out.push({
      path: `/hinmoku/${it.id}/`,
      title: `${it.page}の量のめやすと楽天市場の売れ筋`,
      description: `${it.page}の備え。${amount(it, days)}。楽天市場のランキングとレビューの数からえらんだ商品を毎日更新しています。`,
      rakuten: true,
      body: `<p class="crumb"><a href="/">トップ</a> / <a href="/hinmoku/">備えの品目</a></p>
<h1 class="city">${esc(it.page)}</h1>
<p class="feat">${esc(amount(it, days))}</p>
${it.calc ? '<p><a class="go" href="/dougu/keisan/">わが家の人数で計算</a></p>' : ''}
${shopList(shop, products?.fetchedAt)}
${h2('あわせて')}
<ul class="list"><li><a href="/dougu/check/">チェックリスト</a></li>${rel ? `<li><a href="${rel[0]}">${esc(rel[1])}</a></li>` : ''}<li><a href="/hinmoku/">ほかの品目</a></li></ul>
${h2('出典')}
${sourceText(it.sources, sources)}`,
      script: shop?.length ? SHOP_JS : '',
    });
  }
  return out;
}
