// 品目ページ（/hinmoku/ と /hinmoku/<id>/）：量のめやす（items.yml）と、楽天市場の商品（毎日とりなおす）
// 楽天の商品を出すページは、AdSense を置かない・楽天以外へのリンクを置かない（楽天ウェブサービス規約 第8条4項・第10条1項4号）
//   出典はリンクにせず名前と確認日だけ（リンクは備えの知識のページにある）。フッターに楽天のクレジット（layout.mjs）
import { esc, fmt, h2, jpDate, fit, priceBand, srcName } from '../layout.mjs';
import { need } from '../calc.mjs';
import { SHOW, cleanName } from '../rakuten.mjs';
import { SAIGAI } from '../mode.mjs';

const SONAE = { mizu: ['/sonae/bichiku/', '備蓄の量のめやす'], shushoku: ['/sonae/rolling-stock/', 'ローリングストック'], 'keitai-toilet': ['/sonae/keitai-toilet/', '携帯トイレの備え'], gas: ['/sonae/fuyu-teiden/', '冬の停電と寒さの備え'], light: ['/sonae/fuyu-teiden/', '冬の停電と寒さの備え'], battery: ['/sonae/fuyu-teiden/', '冬の停電と寒さの備え'] };

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
      return `<li>${srcName(s)}（${jpDate(s.checked)}確認）</li>`;
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

// 説明文の量の文（出典の発行元つき）
function amountDesc(it, days, sources) {
  const name = it.calc ? it.page.replace(/（[^）]*）/g, '') : it.page;
  const pub = sources.sources.find((s) => s.id === it.sources[0])?.publisher ?? '';
  if (it.calc) {
    const u = it.unit === '回分' ? '回' : it.unit;
    return `${name}は1人1日${it.per_day}${u}、4人家族なら${days.min}日分${need(it.per_day, 4, days.min)}${it.unit}・${days.better}日分${need(it.per_day, 4, days.better)}${it.unit}（${pub}のめやす）。`;
  }
  if (it.example_qty) return `${it.page}は、${it.example_text}${it.example_qty}${it.unit}。`;
  return `${it.page}。${it.page_note}。`;
}

// 災害時モード（saigai）のときは、楽天の商品を出さない（題・説明文からも楽天を外す）。AdSense も置かない（layout.mjs）
export function hinmokuPages({ items, sources, products, saigai = SAIGAI }) {
  if (saigai) products = null;
  const days = items.days;
  const list = items.items.filter((it) => it.hinmoku);
  const out = [];
  out.push({
    path: '/hinmoku/',
    title: '備えの品目（水・主食・携帯トイレ・カセットコンロなど）',
    description: fit(
      [
        `${list.map((it) => it.name).join('・')}の${list.length}品目。`,
        `水は1人1日${list.find((x) => x.id === 'mizu').per_day}L、携帯トイレは1人1日${list.find((x) => x.id === 'keitai-toilet').per_day}回、主食は${list.find((x) => x.id === 'shushoku').per_day}食がめやす。`,
      ],
      saigai ? ['チェックリストや計算のページからもつながります。'] : ['楽天市場の商品を毎朝入れかえて紹介しています。', 'チェックリストからもつながります。'],
    ),
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
      title: saigai ? `${it.page}の量のめやす` : `${it.page}の量のめやすと楽天市場の売れ筋`,
      description: fit(
        [amountDesc(it, days, sources)],
        saigai
          ? ['チェックリストや計算のページにもつながります。', '量は出典のページで確かめた日を下に書いています。']
          : shop?.length
          ? [`楽天市場のランキングとレビューの数からえらんだ商品${shop.length}点を、${priceBand(Math.min(...shop.map((x) => x.price)))}並べています。`, '商品と価格は毎朝6時ごろに入れかわります。']
          : ['楽天市場の商品は、ランキングとレビューの数から毎朝6時ごろにえらび直します。', 'チェックリストや計算のページにもつながります。'],
      ),
      rakuten: !saigai,
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
