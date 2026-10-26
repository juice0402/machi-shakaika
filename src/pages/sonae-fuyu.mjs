// 備えの知識「冬の停電と寒さの備え」（/sonae/fuyu-teiden/）
// 停電で止まるもの → 前に足すもの。発生中の行動は書かない（命に関わる火と発電機の注意だけ、出典つきで短く）
// 数字はすべて data/items.yml から（days・gas の例・mizu・fuyu）。出典は data/sources.yml の id で書き、ページの下に確認日つきで出す
import { esc, h2, fit } from '../layout.mjs';
import { sourceList } from './sonae.mjs';

// items.yml の fuyu と、そこから指す出典の形を確かめる（問題があれば文のリスト。空なら OK）
export function checkFuyu(items, src) {
  const errors = [];
  const by = new Map((src?.sources ?? []).map((s) => [s.id, s]));
  const f = items?.fuyu;
  if (!f) return ['fuyu がありません'];
  if (!(typeof f.toketsu?.celsius === 'number' && f.toketsu.celsius < 0)) errors.push('fuyu.toketsu.celsius は0より小さい数（度）');
  for (const [at, list] of [['fuyu.toketsu', f.toketsu?.sources], ['fuyu', f.sources]]) {
    if (!list?.length) errors.push(`${at}: 出典がありません`);
    for (const id of list ?? []) {
      const s = by.get(id);
      if (!s) errors.push(`${at}: 出典 ${id} が sources.yml にありません`);
      else if (!s.title || !s.url || !s.checked) errors.push(`${at}: ${id} は題・URL・確認日を確かめてからページに出す`);
    }
  }
  for (const id of f.toketsu?.sources ?? []) if (!(f.sources ?? []).includes(id)) errors.push(`fuyu.toketsu の出典 ${id} がページの出典（fuyu.sources）にありません`);
  if (!by.get('mlit-lifeline')?.url) errors.push('mlit-lifeline（停電情報のまとめ）が sources.yml にありません');
  const gas = (items?.items ?? []).find((x) => x.id === 'gas');
  if (!(gas?.example_qty > 0 && gas?.example_text)) errors.push('gas の example_qty と example_text がありません');
  return errors;
}

// このページだけの見た目（ほかのページに読み込ませない）。色と字は layout.mjs の変数・明朝にそろえる
const CSS = `.tei{width:100%;border-collapse:collapse;margin:8px 0 6px}
.tei th{font:700 13px/1.4 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;color:var(--h2);text-align:left;padding:2px 0 6px;border-bottom:1.5px solid var(--ink)}
.tei td{padding:9px 0;border-bottom:1px dotted var(--line);vertical-align:top;font-size:14px;line-height:1.45}
.tei td small{display:block;font-size:11px;line-height:1.5;color:var(--sub);font-weight:400}
.tei td:first-child{width:36%;color:var(--sub)}.tei td:last-child{font-weight:700}
.tei .rv{width:30px;padding:13px 0 0}.tei .rv svg{display:block;margin:0 auto}
.cau{margin:0 0 10px;padding:0;list-style:none;font-size:15px;line-height:1.75}.cau li{padding:8px 0;border-bottom:1px dotted var(--line)}`.replace(/\n/g, '');

// 止まるものから代わりに足すものへ、川の線でつなぐ
const RIVER_MARK = '<svg viewBox="0 0 24 10" width="24" height="10" aria-hidden="true"><path d="M1 5C5 1 9 1 12 5S19 9 23 5" fill="none" stroke="#3f8fbf" stroke-width="1.5"/></svg>';

export function fuyuTeidenPages({ cc, items, sources }) {
  const err = checkFuyu(items, sources);
  if (err.length) throw new Error(err.map((e) => `データ：${e}`).join('\n'));
  const { by, days } = cc;
  const { gas, light, battery, mizu, shushoku } = by;
  const cold = -items.fuyu.toketsu.celsius;
  const lifeline = sources.sources.find((s) => s.id === 'mlit-lifeline');

  // [止まるもの, その中身, 代わりに足すもの, その中身]
  const rows = [
    ['暖房', 'エアコン・FF暖房機など', '毛布・寝袋・使い捨てカイロ', '電気を使わないストーブ'],
    ['調理と給湯', 'IH・エコキュートなど', gas.name, ''],
    ['照明', '部屋の明かり・足元灯', light.name, '懐中電灯・ランタン'],
    ['スマホ', '充電', battery.name, ''],
    ['水道', '建物の給水ポンプ', mizu.name, `1人1日${mizu.per_day}L`],
  ];
  const cell = (a, b) => `${esc(a)}${b ? `<small>${esc(b)}</small>` : ''}`;
  const table = `<table class="tei"><thead><tr><th scope="col">止まるもの</th><td></td><th scope="col">代わりに足すもの</th></tr></thead><tbody>${rows
    .map(([a, b, c, d]) => `<tr><td>${cell(a, b)}</td><td class="rv">${RIVER_MARK}</td><td>${cell(c, d)}</td></tr>`)
    .join('')}</tbody></table>`;

  const hinmoku = [gas, light, battery, mizu, shushoku].filter((it) => it.hinmoku);

  return [
    {
      path: '/sonae/fuyu-teiden/',
      title: '冬の停電と寒さの備え（暖房・給湯・調理の代わり）',
      description: fit(
        [`冬の停電で止まる暖房・給湯・IH調理の代わりに足すもの。備蓄は最低${days.min}日分、できれば${days.better}日分。`],
        [
          [`ボンベは大人1人1週間の例で${gas.example_qty}本、水道管は最低気温マイナス${cold}度以下で凍るおそれ。`, `ボンベは大人1人1週間の例で${gas.example_qty}本。`],
          ['火や発電機の注意つき。', '一酸化炭素の注意つき。'],
        ],
      ),
      head: `<style>${CSS}</style>`,
      body: `<p class="crumb"><a href="/">トップ</a> / <a href="/sonae/">備えの知識</a></p>
<h1 class="city">冬の停電と寒さの備え</h1>
<p class="lead">停電で止まるものと、代わりに足すもの</p>
${table}
<p class="note">ガスの給湯器や暖房にも、電気が要るものがあります。</p>
<div class="prose">
${h2('暖房')}
<p>毛布、寝袋、使い捨てカイロ、防寒着を用意します。電気を使わないストーブを使う家は、使い方を前もって確かめます。</p>
<p>冷え込む夜は水道管が凍ることがあります。最低気温がマイナス${cold}度以下が目安で、水抜きの方法も前もって確かめます。</p>
${h2('調理・給湯・明かり・充電')}
<p>IHは停電で使えないので、カセットコンロとボンベを用意します。${esc(gas.example_text)}${gas.example_qty}${esc(gas.unit)}です。</p>
<p>エコキュートは、停電中に新たに湯をわかせません。タンクに残った湯が使えるかは、機種で変わります。</p>
<p>停電で動く足元灯や懐中電灯を用意します。スマホの予備バッテリーや電池パックは、長い停電に備えて足します。電気で動く医療機器を使う家は、予備のバッテリーや代わりの手段も。</p>
${h2('水と日数')}
<p>停電で建物の給水ポンプが止まると、断水になることがあります。飲み水は1人1日${mizu.per_day}Lがめやすです。</p>
<p>大雪は、停電のほかに交通やライフラインにも影響が出ます。備蓄は最低${days.min}日分、できれば${days.better}日分です。</p>
${h2('火と発電機の注意')}
<ul class="cau">
<li>発電機は、短い時間でも室内では使いません。屋外でも風通しのよい所で使います。</li>
<li>木炭や練炭を、室内で暖房や調理に使いません。</li>
<li>ストーブやガス機器は、定期的に窓をあけて換気します。給排気筒が雪でふさがらないようにもします。</li>
<li>カセットコンロは1台で使い、ボンベを正しくつけ、大きな鍋や鉄板をのせません。</li>
</ul>
</div>
${h2('計算と品目')}
<p><a class="go" href="/dougu/keisan/">わが家の人数で量を計算する</a></p>
<ul class="list">${hinmoku.map((it) => `<li><a href="/hinmoku/${it.id}/">${esc(it.name)}</a></li>`).join('')}<li><a href="/dougu/check/">チェックリスト</a></li></ul>
<p class="why">大雪や寒波は<a href="https://www.jma.go.jp/bosai/">気象庁</a>、停電は<a href="${esc(lifeline.url)}" rel="noopener">電力会社の停電情報（国土交通省のまとめ）</a>と市区町村の発表で確かめます。</p>
${h2('出典')}
${sourceList(items.fuyu.sources, sources)}`,
    },
  ];
}
