// 備えの読みもの5本：地震の前に足すもの（/sonae/jishin/）・在宅避難（/sonae/zaitaku-hinan/）・赤ちゃんと高齢の家族（/sonae/akachan-koureisha/）
// 街とつながる2本（10/27 #18）：ひとり暮らし（/sonae/hitorigurashi/）・マンション（/sonae/mansion/）。市区町村ページ「この街の備え」の行から
// 作りは冬の停電（sonae-fuyu.mjs）と同じ：起きること → 前に足すものの表。発生中の行動・避難の判断は書かず、1行で気象庁・自治体・ハザードマップへ
// 数字はすべて data/items.yml（days・mizu・shushoku・keitai-toilet・yohairyo_days）から。出典は items.yml の jishin・zaitaku・akachan・hitori・mansion の sources
import { esc, h2, fit } from '../layout.mjs';
import { need } from '../calc.mjs';
import { sourceList } from './sonae.mjs';
import { SOTO } from './sonae-soto.mjs';
import { FUYU } from './sonae-fuyu.mjs';

// group は /sonae/ の棚の見出し（sonae.mjs の YOMI_GROUPS のどれか）。末尾の「ほかの読みもの」も同じ group から
export const YOMIMONO = [
  { key: 'jishin', path: '/sonae/jishin/', name: '地震の前に足すもの', group: '災害の前に' },
  { key: 'zaitaku', path: '/sonae/zaitaku-hinan/', name: '在宅避難の備え', group: '家族と住まい' },
  { key: 'akachan', path: '/sonae/akachan-koureisha/', name: '赤ちゃん・高齢の家族がいる家の備え', group: '家族と住まい' },
  { key: 'hitori', path: '/sonae/hitorigurashi/', name: 'ひとり暮らしの備え', group: '家族と住まい' },
  { key: 'mansion', path: '/sonae/mansion/', name: 'マンション（共同住宅）の備え', group: '家族と住まい' },
  { key: 'minaoshi', path: '/sonae/minaoshi/', name: '年に2回の備えの見直し', group: '量と品目' },
];

// 読みものの全部（YOMIMONO・家の外 SOTO・冬の停電）。/sonae/ の棚と末尾はここから
export const allYomimono = () => [...YOMIMONO, FUYU, ...SOTO];

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
export const CSS = `.tei{width:100%;border-collapse:collapse;margin:8px 0 6px}
.tei th{font:700 13px/1.4 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;color:var(--h2);text-align:left;padding:2px 0 6px;border-bottom:1.5px solid var(--ink)}
.tei td{padding:9px 0;border-bottom:1px dotted var(--line);vertical-align:top;font-size:14px;line-height:1.45}
.tei td small{display:block;font-size:11px;line-height:1.5;color:var(--sub);font-weight:400}
.tei td:first-child{width:36%;color:var(--sub)}.tei td:last-child{font-weight:700}
.tei .rv{width:30px;padding:13px 0 0}.tei .rv svg{display:block;margin:0 auto}`.replace(/\n/g, '');

const RIVER_MARK = '<svg viewBox="0 0 24 10" width="24" height="10" aria-hidden="true"><path d="M1 5C5 1 9 1 12 5S19 9 23 5" fill="none" stroke="#3f8fbf" stroke-width="1.5"/></svg>';

export function table(head, rows) {
  const cell = (a, b) => `${esc(a)}${b ? `<small>${esc(b)}</small>` : ''}`;
  return `<table class="tei"><thead><tr><th scope="col">${esc(head[0])}</th><td></td><th scope="col">${esc(head[1])}</th></tr></thead><tbody>${rows
    .map(([a, b, c, d]) => `<tr><td>${cell(a, b)}</td><td class="rv">${RIVER_MARK}</td><td>${cell(c, d)}</td></tr>`)
    .join('')}</tbody></table>`;
}

const CALC = '<p><a class="go" href="/dougu/keisan/">わが家の人数で量を計算する</a></p>';

// 末尾：今ある品目ページ6つ（商品は置かない）とチェックリスト、同じ group のほかの読みもの（4つまで）
// 家の外の備え2本（sonae-soto.mjs）も同じ末尾を使う
export function tail(items, self) {
  const hinmoku = items.items.filter((it) => it.hinmoku);
  const all = allYomimono();
  const me = all.find((y) => y.key === self);
  if (!me) throw new Error(`tail：読みもの ${self} がない`);
  const others = all.filter((y) => y.key !== self && y.group === me.group).slice(0, 4);
  return `${h2('品目と道具')}
<ul class="list">${hinmoku.map((it) => `<li><a href="/hinmoku/${it.id}/">${esc(it.name)}</a></li>`).join('')}<li><a href="/dougu/check/">チェックリスト</a></li></ul>
${others.length ? `<p>${others.map((y) => `<a href="${y.path}">${esc(y.name)}</a>`).join('・')}</p>` : ''}`;
}

export function yomimonoPages({ cc, items, sources }) {
  const err = checkYomimono(items, sources);
  if (err.length) throw new Error(err.map((e) => `データ：${e}`).join('\n'));
  const { by, days } = cc;
  const w = by.mizu.per_day;
  const t = by['keitai-toilet'].per_day;
  const m = by.shushoku.per_day;
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
<p>棚や冷蔵庫は、転倒防止の金具で壁や天井に固定します。窓や食器棚のガラスには飛散防止フィルムを張ります。割れたガラスでけがをしないように、ライトとスリッパやスニーカーも用意します。</p>
<p>家の耐震診断を受けて、必要なら補強します。ブロック塀も同じです。</p>
${h2('火事を防ぐ')}
<p>感震ブレーカーは、大きな揺れを感じると家の電気を自動で止める器具です。停電のあと電気が戻ったときに起きる通電火災を防ぎます。分電盤につけるもの、コンセントにつけるもの、簡易なものがあります。</p>
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
<p>水洗トイレは、断水や停電、配管の被害で使えなくなることがあります。携帯トイレは1人1日${t}回で数えます。マンションなどでは、配管の状態がわかるまで携帯トイレを使います。くわしくは<a href="/sonae/keitai-toilet/">携帯トイレの備え</a>と<a href="/sonae/mansion/">マンション（共同住宅）の備え</a>に。</p>
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
  // ---------- ひとり暮らし ----------
  out.push({
    path: '/sonae/hitorigurashi/',
    title: 'ひとり暮らしの備え（1人分の水・食事・携帯トイレ）',
    description: fit(
      [`ひとり暮らしの備えは1人分の量で考えます。水は1日${w}L、食事は${m}食、携帯トイレは${t}回で、1人の${days.better}日分は水${need(w, 1, days.better)}L・主食${need(m, 1, days.better)}食・携帯トイレ${need(t, 1, days.better)}回分。`],
      [['せまい部屋での置き方と、期限のメモへのつなぎも。', '置き方も。']],
    ),
    head: `<style>${CSS}</style>`,
    body: `${crumb}
<h1 class="city">ひとり暮らしの備え</h1>
<p class="lead">1人分の量と、せまい部屋での置き方</p>
<p><a class="go" href="/dougu/keisan/?n=1">1人分の量を計算する</a></p>
${table(['もの', `1人${days.better}日分`], [
  ['水', '飲み水・調理の水', `${need(w, 1, days.better)}L`, `${days.min}日分なら${need(w, 1, days.min)}L`],
  ['主食', `1日${m}食`, `${need(m, 1, days.better)}食`, `${days.min}日分なら${need(m, 1, days.min)}食`],
  ['携帯トイレ', `1日${t}回`, `${need(t, 1, days.better)}回分`, `${days.min}日分なら${need(t, 1, days.min)}回分`],
  ['ガス・IH', '調理', 'カセットコンロとボンベ', '同じ場所に置く'],
  ['電気', '明かりと充電', 'ライト', 'モバイルバッテリー'],
])}
<div class="prose">
${h2('1人分の量')}
<p>水は1人1日${w}L、食事は1日${m}食、携帯トイレは1日${t}回がめやすです。備蓄は最低${days.min}日分、できれば${days.better}日分。1人の${days.better}日分は、水${need(w, 1, days.better)}L・主食${need(m, 1, days.better)}食・携帯トイレ${need(t, 1, days.better)}回分になります。</p>
${h2('せまい部屋に置く')}
<p>食品は台所に置かなくてもかまいません。クローゼットのすき間やベッドの下など、入りきらない分は家のすき間に分けて置きます。重いものは下に置きます。</p>
<p>カセットコンロはケースに入れて立てると場所をとりません。ボンベはコンロと同じ場所に。</p>
${h2('ふだんの食品で回す')}
<p>置ける量が少ないときは、ふだん食べている食品を少し多めに買い、食べたら買い足す<a href="/sonae/rolling-stock/">ローリングストック</a>で備えます。中身が見える箱に入れて側面に期限を書いておくと、古いものから使えます。</p>
${h2('期限と置き場所のメモ')}
<p>賞味期限は<a href="/dougu/kigen/">期限メモ</a>に。家に置くものと期限の欄は、<a href="/dougu/print/">冷蔵庫に貼る紙</a>に印刷できます。</p>
</div>
${tail(items, 'hitori')}
<p class="why">災害のときの動き方や避難は、市区町村の案内と<a href="${esc(hazard.url)}" rel="noopener">ハザードマップ</a>で確かめます。</p>
${h2('出典')}
${sourceList(items.hitori.sources, sources)}`,
  });

  // ---------- マンション（共同住宅） ----------
  out.push({
    path: '/sonae/mansion/',
    title: 'マンション（共同住宅）の備え（エレベーター・水・トイレ）',
    description: fit(
      [`マンションでは停電でエレベーターや水のポンプが止まり、排水管の無事がわかるまでトイレを流せないことがあります。水は1人1日${w}L・携帯トイレは${t}回で、4人家族の${days.better}日分は水${need(w, 4, days.better)}L・${need(t, 4, days.better)}回分。`],
      [],
    ),
    head: `<style>${CSS}</style>`,
    body: `${crumb}
<h1 class="city">マンションの備え</h1>
<p class="lead">共同住宅で、停電で止まるものと前に足すもの</p>
${CALC}
${table(['止まるもの', '前に足すもの'], [
  ['エレベーター', '点検まで使えない', '水と食事を家に', `最低${days.min}日分、できれば${days.better}日分`],
  ['水道', 'ポンプの給水が止まる', '水', `1人1日${w}L`],
  ['トイレ', '配管を確かめるまで', '携帯トイレ', `1人1日${t}回`],
  ['揺れ', '長周期地震動', '家具の固定', '感震ブレーカー・消火器'],
  ['電気', '明かりと充電', 'ライト', 'モバイルバッテリー'],
])}
<div class="prose">
${h2('エレベーターと水')}
<p>地震や停電でエレベーターが止まると、点検が終わるまで使えません。高い階では、水や食料を運び上げるのがむずかしくなります。ポンプで水を上げている建物は、停電でポンプが止まると断水します。</p>
<p>建物が無事でも、停電で水道やトイレが使えず、家で過ごすのがむずかしくなった例があります。水と食事は家に置いておきます。水は1人1日${w}L、備蓄は最低${days.min}日分・できれば${days.better}日分で、4人家族の${days.better}日分は${need(w, 4, days.better)}Lです。</p>
${h2('トイレは流す前に')}
<p>排水管が傷んでいるのに気づかずに流すと、下の階で汚水があふれるおそれがあります。排水管の無事がわかるまでは流さず、携帯トイレを使います。1人1日${t}回で、4人家族の${days.better}日分は${need(t, 4, days.better)}回分です。くわしくは<a href="/sonae/keitai-toilet/">携帯トイレの備え</a>に。</p>
${h2('揺れと火事')}
<p>長周期地震動の揺れに備えて、家具を固定します。消火器の場所を確かめ、感震ブレーカーをつけます。くわしくは<a href="/sonae/jishin/">地震の前に足すもの</a>に。</p>
${h2('建物の備え')}
<p>防災倉庫や発電機など、建物全体の備えは、管理組合や管理会社に確かめます。家で過ごすための明かりや電気の備えは<a href="/sonae/zaitaku-hinan/">在宅避難の備え</a>に。</p>
</div>
${tail(items, 'mansion')}
<p class="why">揺れたあとに家にいてよいかは、市区町村の案内と<a href="${esc(hazard.url)}" rel="noopener">ハザードマップ</a>で確かめます。</p>
${h2('出典')}
${sourceList(items.mansion.sources, sources)}`,
  });

  // ---------- 年に2回の備えの見直し（11/7） ----------
  //   見直しの日は 9/1 防災の日（bousai-week）と 11/19 東京都の備蓄の日（tokyo-bichiku-toilet）。備えのごよみ（data/koyomi.yml）の2つのテーマと同じ割りふり
  //   数字は days・mizu・keitai-toilet の per_day・yohairyo_days と、そこから計算した量だけ。日付は items.yml の minaoshi.hi
  const hi = items.minaoshi.hi;
  out.push({
    path: '/sonae/minaoshi/',
    title: '年に2回の備えの見直し（9月1日と11月19日・期限と人数と季節）',
    description: fit(
      [`${hi.bousai}の防災の日に量を、${hi.bichiku}の東京都の備蓄の日に期限を見直す例。水は1人1日${w}L・携帯トイレは${t}回で、1人${days.better}日分は水${need(w, 1, days.better)}L・${need(t, 1, days.better)}回分。`],
      [[`4人家族なら水${need(w, 4, days.better)}L。`, '']],
    ),
    head: `<style>${CSS}</style>`,
    body: `${crumb}
<h1 class="city">年に2回の備えの見直し</h1>
<p class="lead">見直す日を2つ決めて、量と期限を確かめる</p>
${CALC}
${table(['変わること', '見直すこと'], [
  ['期限が近づく', '置いてある食品', '期限の近い順に使う', '使った分を買い足す'],
  ['家族の人数', '生まれた・同居・ひとり立ち', '水と携帯トイレの量', `1人1日${w}L・${t}回`],
  ['配慮のいる家族', '赤ちゃん・高齢の家族・持病', `少なくとも${y}日分`, 'ミルク・介護食品など'],
  ['置き場所', '引っ越し・模様替え', '中身が見える箱', '側面に期限、重いものは下'],
  ['季節', '冬の前', '寒さの備え', '冬の停電と寒さの備えの表で'],
])}
<div class="prose">
${h2('見直す日を決める')}
<p>備えは、置いたままにすると期限が切れたり、家族の人数と合わなくなったりします。そこで、見る日を先に決めておきます。</p>
<p>${hi.bousai}は防災の日で、${hi.week}までが防災週間です。東京都は、家族で備蓄を確認するきっかけになるように、${hi.bichiku}を「備蓄の日」としています。このページでは、${hi.bousai}に量を、${hi.bichiku}に期限を見る例で書きます。</p>
${h2(`${hi.bousai}に量を数える`)}
<p>家族の人数をもとに、水と携帯トイレの数を数え直します。水は1人1日${w}L、携帯トイレは1人1日${t}回がめやすです。備蓄は最低${days.min}日分、できれば${days.better}日分で、1人の${days.better}日分は水${need(w, 1, days.better)}L・携帯トイレ${need(t, 1, days.better)}回分になります。</p>
<p>この1年で赤ちゃんが生まれた、親と暮らしはじめた、子どもがひとり立ちした家は、人数を入れ直して計算します。乳幼児や高齢の家族、持病のある人がいる家は、少なくとも${y}日分がめやすです。必要な品と量は家族の形や住まいでちがうので、<a href="/sonae/akachan-koureisha/">赤ちゃん・高齢の家族がいる家の備え</a>もあわせて見ます。</p>
${h2(`${hi.bichiku}に期限を見る`)}
<p>食品の箱を開けて、期限の近いものから並べ直します。期限が近いものはふだんの食事で使い、使った分を買い足します。この回し方をローリングストック（使いながら備える方法）といいます。</p>
<p>毎日使う食品は台所に、たまにしか使わないものは押し入れなどに置き、中身の見える箱に入れて、側面に期限を書いておきます。重いものは下の段にします。期限は<a href="/dougu/kigen/">期限メモ</a>に入れておくと、近い順に並びます。</p>
${h2('季節の入れかえ')}
<p>${hi.bichiku}は冬の前にあたります。期限を見るついでに、寒さの備えを<a href="/sonae/fuyu-teiden/">冬の停電と寒さの備え</a>の表と照らし合わせます。</p>
</div>
${tail(items, 'minaoshi')}
<p class="why">災害が起きたときの動き方や避難は、<a href="https://www.jma.go.jp/bosai/">気象庁</a>の情報、市区町村の案内、<a href="${esc(hazard.url)}" rel="noopener">ハザードマップ</a>で確かめます。</p>
${h2('出典')}
${sourceList(items.minaoshi.sources, sources)}`,
  });
  return out;
}
