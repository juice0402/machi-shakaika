// 備えの読みもの3本：地震の前に足すもの（/sonae/jishin/）・在宅避難（/sonae/zaitaku-hinan/）・赤ちゃんと高齢の家族（/sonae/akachan-koureisha/）
// 作りは冬の停電（sonae-fuyu.mjs）と同じ：起きること → 前に足すものの表。発生中の行動・避難の判断は書かず、1行で気象庁・自治体・ハザードマップへ
// 数字はすべて data/items.yml（days・mizu・keitai-toilet・yohairyo_days）から。出典は items.yml の jishin・zaitaku・akachan の sources
import { esc, h2, fit } from '../layout.mjs';
import { need } from '../calc.mjs';
import { sourceList } from './sonae.mjs';

export const YOMIMONO = [
  { key: 'jishin', path: '/sonae/jishin/', name: '地震の前に足すもの' },
  { key: 'zaitaku', path: '/sonae/zaitaku-hinan/', name: '在宅避難の備え' },
  { key: 'akachan', path: '/sonae/akachan-koureisha/', name: '赤ちゃん・高齢の家族がいる家の備え' },
];

// items.yml の3本の出典の形を確かめる（問題があれば文のリスト。空なら OK）
export function checkYomimono(items, src) {
  const errors = [];
  const by = new Map((src?.sources ?? []).map((s) => [s.id, s]));
  for (const { key } of YOMIMONO) {
    const list = items?.[key]?.sources;
    if (!list?.length) errors.push(`${key}: 出典がありません`);
    for (const id of list ?? []) {
      const s = by.get(id);
      if (!s) errors.push(`${key}: 出典 ${id} が sources.yml にありません`);
      else if (!s.title || !s.url || !s.checked) errors.push(`${key}: ${id} は題・URL・確認日を確かめてからページに出す`);
    }
  }
  if (!(items?.yohairyo_days > 0)) errors.push('yohairyo_days がありません');
  if (!by.get('disaportal')?.url) errors.push('disaportal（ハザードマップポータル）が sources.yml にありません');
  return errors;
}

// このページだけの見た目。冬の停電と同じ表（色と字は layout.mjs の変数・明朝）
const CSS = `.tei{width:100%;border-collapse:collapse;margin:8px 0 6px}
.tei th{font:700 13px/1.4 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;color:var(--h2);text-align:left;padding:2px 0 6px;border-bottom:1.5px solid var(--ink)}
.tei td{padding:9px 0;border-bottom:1px dotted var(--line);vertical-align:top;font-size:14px;line-height:1.45}
.tei td small{display:block;font-size:11px;line-height:1.5;color:var(--sub);font-weight:400}
.tei td:first-child{width:36%;color:var(--sub)}.tei td:last-child{font-weight:700}
.tei .rv{width:30px;padding:13px 0 0}.tei .rv svg{display:block;margin:0 auto}`.replace(/\n/g, '');

const RIVER_MARK = '<svg viewBox="0 0 24 10" width="24" height="10" aria-hidden="true"><path d="M1 5C5 1 9 1 12 5S19 9 23 5" fill="none" stroke="#3f8fbf" stroke-width="1.5"/></svg>';

function table(head, rows) {
  const cell = (a, b) => `${esc(a)}${b ? `<small>${esc(b)}</small>` : ''}`;
  return `<table class="tei"><thead><tr><th scope="col">${esc(head[0])}</th><td></td><th scope="col">${esc(head[1])}</th></tr></thead><tbody>${rows
    .map(([a, b, c, d]) => `<tr><td>${cell(a, b)}</td><td class="rv">${RIVER_MARK}</td><td>${cell(c, d)}</td></tr>`)
    .join('')}</tbody></table>`;
}

const CALC = '<p><a class="go" href="/dougu/keisan/">わが家の人数で量を計算する</a></p>';

// 末尾：今ある品目ページ6つ（商品は置かない）とチェックリスト、ほかの読みもの
function tail(items, self) {
  const hinmoku = items.items.filter((it) => it.hinmoku);
  const others = YOMIMONO.filter((y) => y.key !== self);
  return `${h2('品目と道具')}
<ul class="list">${hinmoku.map((it) => `<li><a href="/hinmoku/${it.id}/">${esc(it.name)}</a></li>`).join('')}<li><a href="/dougu/check/">チェックリスト</a></li></ul>
<p>${others.map((y) => `<a href="${y.path}">${esc(y.name)}</a>`).join('・')}</p>`;
}

export function yomimonoPages({ cc, items, sources }) {
  const err = checkYomimono(items, sources);
  if (err.length) throw new Error(err.map((e) => `データ：${e}`).join('\n'));
  const { by, days } = cc;
  const w = by.mizu.per_day;
  const t = by['keitai-toilet'].per_day;
  const y = items.yohairyo_days;
  const hazard = sources.sources.find((s) => s.id === 'disaportal');
  const crumb = '<p class="crumb"><a href="/">トップ</a> / <a href="/sonae/">備えの知識</a></p>';
  const out = [];

  // ---------- 地震の前に足すもの ----------
  out.push({
    path: '/sonae/jishin/',
    title: '地震の前に足すもの（家具の固定・感震ブレーカー・備蓄）',
    description: fit(
      [`大きな地震の前に家に足すもの。家具の固定、ガラスの飛散防止フィルム、感震ブレーカー、消火器。水は1人1日${w}L、携帯トイレは${t}回で、備蓄は最低${days.min}日分、できれば${days.better}日分。`],
      [[`4人家族の${days.better}日分なら水${need(w, 4, days.better)}L。`, '']],
    ),
    head: `<style>${CSS}</style>`,
    body: `${crumb}
<h1 class="city">地震の前に足すもの</h1>
<p class="lead">揺れで起きることと、前に足しておくもの</p>
${CALC}
${table(['起きること', '前に足すもの'], [
  ['家具が倒れる・動く', '棚・冷蔵庫・テレビ', '転倒防止の金具', '壁や天井に固定する'],
  ['ガラスが割れて飛ぶ', '窓・食器棚', '飛散防止フィルム', 'スリッパやスニーカーも'],
  ['通電火災', '電気が戻ったときの火事', '感震ブレーカー', '揺れで電気を止める'],
  ['火が出る', '', '消火器', '住宅用火災警報器'],
  ['停電・断水', '', 'ライト・水・携帯トイレ', `水は1人1日${w}L`],
])}
<div class="prose">
${h2('家具とガラス')}
<p>棚や冷蔵庫は、転倒防止の金具で壁や天井に固定します。窓や食器棚のガラスには飛散防止フィルムを張ります。割れたガラスでけがをしないように、寝る所の近くにライトとスリッパやスニーカーを置きます。</p>
<p>家の耐震診断を受けて、必要なら補強します。ブロック塀も同じです。</p>
${h2('火事を防ぐ')}
<p>感震ブレーカーは、大きな揺れを感じると家の電気を自動で止める器具です。停電のあと電気が戻ったときに、倒れた電気器具から火が出る通電火災を防ぎます。分電盤につけるもの、コンセントにつけるもの、簡易なものがあります。</p>
<p>消火器を用意し、住宅用火災警報器をつけます。</p>
${h2('水・食事・トイレ')}
<p>地震のあとは、停電や断水、配管の被害で水洗トイレが使えなくなることがあります。水は1人1日${w}L、携帯トイレは1人1日${t}回がめやすです。備蓄は最低${days.min}日分、できれば${days.better}日分で、4人家族の${days.better}日分は水${need(w, 4, days.better)}L・携帯トイレ${need(t, 4, days.better)}回分です。</p>
<p>家が無事なときに家で過ごすための備えは、<a href="/sonae/zaitaku-hinan/">在宅避難の備え</a>にまとめました。</p>
</div>
${tail(items, 'jishin')}
<p class="why">揺れたときの動き方や避難は、<a href="https://www.jma.go.jp/bosai/">気象庁</a>の情報、市区町村の案内、<a href="${esc(hazard.url)}" rel="noopener">ハザードマップ</a>で確かめます。</p>
${h2('出典')}
${sourceList(items.jishin.sources, sources)}`,
  });

  // ---------- 在宅避難 ----------
  out.push({
    path: '/sonae/zaitaku-hinan/',
    title: '在宅避難の備え（水・トイレ・食事・明かり・電気）',
    description: fit(
      [`家が無事で安全に住めるとき、家で過ごすための備え。水は1人1日${w}L、携帯トイレは${t}回、備蓄は最低${days.min}日分・できれば${days.better}日分。4人家族の${days.better}日分は水${need(w, 4, days.better)}L・携帯トイレ${need(t, 4, days.better)}回分。`],
      [['明かりと電気の備えも。', '']],
    ),
    head: `<style>${CSS}</style>`,
    body: `${crumb}
<h1 class="city">在宅避難の備え</h1>
<p class="lead">家が無事なとき、家で過ごすための備え</p>
${CALC}
${table(['止まるもの', '代わりに足すもの'], [
  ['水道', '飲み水・調理の水', '水', `1人1日${w}L`],
  ['トイレ', '断水・配管の被害', '携帯トイレ', `1人1日${t}回`],
  ['ガス・IH', '調理', 'カセットコンロとボンベ', '主食とおかずの備蓄'],
  ['電気', '明かり', 'ライト', '懐中電灯・ランタン'],
  ['電気', 'スマホの充電', 'モバイルバッテリー', 'ポータブル電源'],
])}
<div class="prose">
${h2('水とトイレ')}
<p>飲み水と調理の水は1人1日${w}L。トイレを流したり体をふいたりする生活用水は、これとは別に要ります。</p>
<p>水洗トイレは、断水や停電、配管の被害で使えなくなることがあります。携帯トイレは1人1日${t}回で数えます。マンションなどでは、配管の状態がわかるまで携帯トイレを使います。くわしくは<a href="/sonae/keitai-toilet/">携帯トイレの備え</a>に。</p>
${h2('食事')}
<p>ふだん食べている食品を多めに置き、使ったら買い足す<a href="/sonae/rolling-stock/">ローリングストック</a>で備えます。ガスやIHが使えないときのために、カセットコンロとボンベも用意します。</p>
${h2('明かりと電気')}
<p>停電に備えて、懐中電灯やランタン、スマホの予備バッテリーを用意します。電気で動く医療機器を使う家は、予備のバッテリーや代わりの手段も。冬は<a href="/sonae/fuyu-teiden/">冬の停電と寒さの備え</a>も見てください。</p>
${h2('何日分か')}
<p>備蓄は最低${days.min}日分、できれば${days.better}日分です。4人家族の${days.better}日分は、水${need(w, 4, days.better)}L・携帯トイレ${need(t, 4, days.better)}回分になります。</p>
</div>
${tail(items, 'zaitaku')}
<p class="why">家にいてよいかは、市区町村の案内と<a href="${esc(hazard.url)}" rel="noopener">ハザードマップ</a>で確かめます。</p>
${h2('出典')}
${sourceList(items.zaitaku.sources, sources)}`,
  });

  // ---------- 赤ちゃん・高齢の家族 ----------
  out.push({
    path: '/sonae/akachan-koureisha/',
    title: `赤ちゃん・高齢の家族がいる家の備え（少なくとも${y}日分）`,
    description: fit(
      [`乳幼児や高齢の人、持病や食物アレルギーのある人がいる家は、少なくとも${y}日分の備えがめやす。ミルクと離乳食、やわらかい介護食品、とろみ調整食品。水は1人1日${w}Lで、2人の${y}日分は${need(w, 2, y)}L。`],
      [],
    ),
    head: `<style>${CSS}</style>`,
    body: `${crumb}
<h1 class="city">赤ちゃん・高齢の家族がいる家の備え</h1>
<p class="lead">食事に配慮が要る家族の分は、少なくとも${y}日分</p>
${CALC}
${table(['家族', '足すもの'], [
  ['赤ちゃん', 'ミルク', '粉ミルク・液体ミルク', 'ほ乳びん・調乳の水'],
  ['赤ちゃん', '離乳食', '瓶詰めやレトルトの離乳食', '紙おむつ'],
  ['高齢の家族', 'かむ力・飲みこむ力', 'やわらかい介護食品', 'とろみ調整食品'],
  ['食物アレルギー', '', 'アレルギー対応の食品', 'ふだんから回して置く'],
  ['持病のある人', '食事療法', '続けられる食品', '主治医に相談'],
])}
<div class="prose">
${h2('なぜ長めに')}
<p>乳幼児、妊娠中の人、高齢の人、持病や食物アレルギーのある人の食品は、災害のあとに手に入りにくくなります。こうした家族の分は、少なくとも${y}日分の備えが勧められています。</p>
<p>水は1人1日${w}L。2人の${y}日分なら${need(w, 2, y)}Lです。</p>
${h2('赤ちゃん')}
<p>母乳が足りないときに備えて、粉ミルクや液体ミルク、ほ乳びんを用意します。粉ミルクを作る水も多めに。調理ができないときのために、瓶詰めやレトルトの離乳食を置きます。紙おむつも用意します。</p>
${h2('高齢の家族')}
<p>缶詰やレトルトは、ふだんから食べて好みのものを見つけておきます。かむ力や飲みこむ力が弱い人には、やわらかい介護食品と、お茶やスープにとろみをつける食品を用意します。入れ歯の手入れも忘れずに。</p>
${h2('食物アレルギー・持病')}
<p>アレルギーに対応した食品は、災害のあとに手に入りにくくなります。ローリングストックで回しながら置き、期限を見ます。</p>
<p>薬や食事療法は家族ごとにちがうので、かかりつけの医師に相談して決めます。</p>
</div>
${tail(items, 'akachan')}
<p class="why">避難するかどうかや、支援の窓口は市区町村の案内で確かめます。</p>
${h2('出典')}
${sourceList(items.akachan.sources, sources)}`,
  });
  return out;
}
