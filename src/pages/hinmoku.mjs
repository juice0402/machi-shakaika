// 品目ページ（/hinmoku/ と /hinmoku/<id>/）：量のめやす（items.yml）と、楽天市場の商品（毎日とりなおす）
// 楽天の商品を出すページは、AdSense を置かない・楽天以外へのリンクを置かない（楽天ウェブサービス規約 第8条4項・第10条1項4号）
//   出典はリンクにせず名前と確認日だけ（リンクは備えの知識のページにある）。フッターに楽天のクレジット（layout.mjs）
import { esc, fmt, h2, jpDate, fit, priceBand, srcName } from '../layout.mjs';
import { need } from '../calc.mjs';
import { SHOW, cleanName } from '../rakuten.mjs';
import { SAIGAI } from '../mode.mjs';
import { KIGEN_NOTICE_DAYS } from './kigen.mjs';
import { KOYOMI_CSS } from '../koyomi.mjs';

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

// 品目ページの自前の中身（楽天の商品より上。夜 #47）：早見表・量の中身・置き場所と入れかえ
//   数字は items.yml から（per_day・days・yohairyo_days・example・kitaku.dengon）。出典は sources.yml の id で書き、ページの下に並べる
//   早見表は per_day のある品目だけ。家族の人数での数え方を確かめていない品目は、出典の例だけ
//   リンクはサイトの中だけ（楽天以外へのリンクを置かない）
const PEOPLE = [1, 2, 3, 4, 5, 6];
function hayami(it, cols) {
  const rows = PEOPLE.map((n) => `<tr><td>${n}人</td>${cols.map((d) => `<td>${fmt(need(it.per_day, n, d))}${esc(it.unit)}</td>`).join('')}</tr>`).join('');
  return `<table class="tbl"><thead><tr><th>人数</th>${cols.map((d) => `<th>${d}日分</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

// 品目ごとの文。返すのは { html, src: ページの下に足す出典の id }
function jimae(it, items, sources) {
  const by = new Map(sources.sources.map((s) => [s.id, s]));
  const pub = (id) => {
    if (!by.has(id)) throw new Error(`出典 ${id} が sources.yml にない`);
    return esc(by.get(id).publisher);
  };
  const { min, better } = items.days;
  const y = items.yohairyo_days;
  const cols = [...new Set([...items.days.choices, y])];
  // 期限メモの1行（品目ごとに言い方を変える。同じ文を4ページに並べない）
  // 商品の一覧のあとの節（夜 #74）：えらび方の目安・置き場所と入れかえ・まちがえやすいところ。出典の about にあることだけ
  const q = (n, d) => `${fmt(need(it.per_day ?? 0, n, d))}${esc(it.unit)}`;
  const bt = it.bottle;
  const km = it.kumioki;
  const hon = (n, d) => Math.ceil(need(it.per_day ?? 0, n, d) / (bt?.liters ?? 1));
  const kigen = (what, tail) => `<p>${what}は<a href="/dougu/kigen/">期限メモ</a>に入れると、近い順に並びます。${tail}</p>`;
  const T = {
    mizu: {
      src: ['nerima-yohairyo', 'kantei-sonae', 'bousai-teiden', 'chiba-pref-mansion', 'suginami-mansion', 'maff-tanshin', 'maff-guide'],
      html: `${h2('人数と日数の早見表')}
<p>1人1日${it.per_day}${esc(it.unit)}に、人数と日数をかけた量です。${min}日分は最低のめやす、${better}日分は大きな災害に備える量です。</p>
${hayami(it, cols)}
<p>${y}日分は、乳幼児や高齢の人などがいる家のめやすです。乳児がいる家は、ミルクを作る水もあわせて用意します。</p>
${h2('量にふくまれる水')}
<p>早見表の量は、飲み水と調理の水です。トイレを流したり体をふいたりする生活用水は、別に要ります。</p>
<p>${pub('miyagi-mizu')}と${pub('kantei-sonae')}の備えの例でも、生活用水は飲み水と分けて書かれています。</p>
<p>マンションなどでは、停電で建物の給水ポンプが止まり、断水になることがあります。建物ごとの備えは<a href="/sonae/mansion/">マンション（共同住宅）の備え</a>に。</p>
${h2('置き場所と入れかえ')}
<p>${pub('maff-tanshin')}の単身者向けのガイドは、食品について、台所に置かなくてもよいと紹介しています。クローゼットのすき間やベッドの下も使えるとしています。</p>
<p>ふだん使いながら買い足していく備え方は、<a href="/sonae/rolling-stock/">ローリングストック</a>のページにまとめました。</p>
${kigen('ボトルの期限', `期限の${KIGEN_NOTICE_DAYS}日前に知らせる予定を、カレンダーに入れることもできます。`)}`,
      after: bt && km ? `${h2('えらび方の目安')}
<p>${pub('maff-sonae')}の大人1人1週間の例は、${bt.liters}Lのボトルが${bt.per_case}本入った箱を${bt.cases}箱です。</p>
<p>1人1日${it.per_day}Lの${better}日分は${q(1, better)}なので、例の${fmt(bt.liters * bt.per_case * bt.cases)}Lはそれより少し多い量です。</p>
<p>家族の分を${bt.liters}Lのボトルで数えると、4人で${better}日分は${q(4, better)}、${hon(4, better)}本です。${bt.per_case}本入りの箱なら${Math.ceil(hon(4, better) / bt.per_case)}箱になります。</p>
<p>${y}日分をそろえる家は、3人で${q(3, y)}、ボトルは${hon(3, y)}本です。</p>
<p>${pub('miyagi-mizu')}も、飲み水を1人1日${it.per_day}Lの${min}日分、大きな災害では${better}日分としています。早見表の${min}日と${better}日の列は、この2つに合います。</p>
<p>${pub('chiba-pref-mansion')}は、マンションでも家ごとに水と食料をそろえるよう書いています。</p>
<p>持ち出す袋にも、飲料水を入れる例が${pub('nagasaki-mochidashi')}にあります。家に置く箱とは別に数えます。</p>
${h2('まちがえやすいところ')}
<p>早見表の量に、トイレを流す水は入っていません。${pub('tfd-jishin')}は、地震への備えとして風呂の水のくみ置きを挙げています。</p>
<p>水道水を容器にくみ置きした水は、備蓄用のボトルほど長くはもちません。${pub('nerima-kumioki')}は、飲み水に使える日数のめやすを出しています。</p>
<p>日の当たらない涼しい所なら約${km.suzushii}日、冷蔵庫なら約${km.reizouko}日です。清潔でふたのできる容器に、口元まで入れます。</p>
<p>その日数を過ぎた水は、掃除や洗濯に回せます。期限メモに入れるのは、期限の書かれたボトルの水だけで足ります。</p>
<p>ボトルの水も、期限の近いものから飲んで買い足していけば、<a href="/sonae/rolling-stock/">ローリングストック</a>で回せます。</p>` : '',
      afterSrc: ['tfd-jishin', 'nerima-kumioki', 'nagasaki-mochidashi', 'miyagi-mizu', 'chiba-pref-mansion'],
    },
    shushoku: {
      src: ['nerima-yohairyo', 'kantei-sonae', 'maff-guide', 'maff-shuno'],
      html: `${h2('人数と日数の早見表')}
<p>1人1日${it.per_day}${esc(it.unit)}に、人数と日数をかけた数です。${pub('maff-sonae')}は、食品の備えを最低${min}日分から${better}日分、人数分そろえるよう勧めています。</p>
${hayami(it, cols)}
<p>${y}日分は、乳幼児・妊産婦・高齢者・慢性疾患や食物アレルギーのある人などがいる家のめやすです。</p>
${h2('そろえ方')}
<p>${pub('kantei-sonae')}の備えの例には、非常食として、ご飯や缶詰、乾パンなどが入っています。</p>
<p>かむ力や飲みこむ力が弱い家族には、やわらかい介護食品やとろみ調整食品を用意します。食物アレルギーのある家族の食品も、ふだんから回しながら置いておきます。</p>
<p>${pub('maff-sonae')}の大人1人1週間の例には、食品と水のほかに<a href="/hinmoku/gas/">カセットコンロとボンベ</a>も入っています。</p>
${h2('置き場所と入れかえ')}
<p>${pub('maff-shuno')}のストックガイドは、置き場所を分ける方法を紹介しています。毎日使う食品は台所で回し、たまに使うものは押し入れなどに置きます。</p>
<p>中身が見える箱に入れ、箱の横に期限を書いておきます。重いものは下に置き、入りきらない分は家のすき間に分けて置きます。</p>
${kigen('賞味期限', '箱の横に書いた期限と、同じ日を入れておけます。')}`,
      after: `${h2('えらび方の目安')}
<p>4人家族の${better}日分は${q(4, better)}です。1日の3食をどれも主食で数えるので、朝と昼と夜の分がそろいます。</p>
<p>高齢の家族や小さな子どもがいる家は、少なくとも${y}日分がめやすです。3人なら${q(3, y)}になります。</p>
<p>主食を1人1日${it.per_day}食で数えるのは、${pub('bousai-kitaku')}のガイドラインにある職場の備蓄のめやすと同じです。職場の分は<a href="/sonae/kitaku-konnan/">職場と通勤の備え</a>に。</p>
<p>${pub('maff-guide')}のストックガイドには、食品のえらび方と、ふだん使いながら備える考え方がまとめてあります。乳幼児や高齢の人などに向けた版もあります。</p>
<p>乳児のいる家は、粉ミルクや液体ミルク、ほ乳びん、ミルクを作る水を用意します。離乳食には、瓶詰めやレトルトのものがあります。</p>
<p>食事療法をしている家族の分は、何をそろえるかを主治医に相談します。どちらも${pub('nerima-yohairyo')}のページにあることです。</p>
${h2('まちがえやすいところ')}
<p>主食の数がそろっても、それだけで食事が足りるわけではありません。おかずの缶詰などは、<a href="/dougu/check/">チェックリスト</a>の別の行で確かめます。</p>
<p>水やお湯をそそいで作る主食は、その分の水が要ります。<a href="/hinmoku/mizu/">備蓄の水</a>の量は、飲み水と調理の水を合わせたものです。</p>
<p>停電するとIHや電子レンジが使えません。火を使う調理の手段は<a href="/hinmoku/gas/">カセットコンロとボンベ</a>のページに書いています。</p>`,
      afterSrc: ['nerima-yohairyo', 'bousai-teiden', 'bousai-kitaku'],
    },
    'keitai-toilet': {
      src: ['chiba-pref-mansion', 'miyagi-mizu', 'nagasaki-mochidashi', 'kantei-sonae'],
      html: `${h2('人数と日数の早見表')}
<p>1人1日${it.per_day}回に、人数と日数をかけた回数です。${pub('hiroshima-toilet')}は、${it.per_day}回×家族の人数×${min}日分、できれば${better}日分をめやすにしています。</p>
${hayami(it, cols)}
<p>${y}日分の列は、高齢の家族や小さな子どもがいる家の備えの日数に合わせています。</p>
${h2('使えなくなるとき')}
<p>水が止まったり配管が傷んだりすると、水洗トイレが使えなくなることがあります。</p>
<p>マンションなどの集合住宅で、配管が傷んだまま流すと、下の階で汚水があふれるおそれがあります。${pub('kanagawa-toilet')}が注意をよびかけていることです。</p>
<p>配管の状態がわかるまでは、携帯トイレを使います。断水のあいだ、トイレを流す生活用水は飲み水とは別に要ります。</p>
${h2('置き場所と入れかえ')}
<p>このサイトのチェックリストでは、携帯トイレは家に置く備えと持ち出す袋の両方に入っています。${pub('nagasaki-mochidashi')}の非常持出品の例にもあります。</p>
<p>トイレットペーパーやティッシュペーパーも、${pub('kantei-sonae')}の備えの例にあります。<a href="/dougu/check/">チェックリスト</a>で、ほかの品目とあわせて確かめられます。</p>
${kigen('使用期限', `${KIGEN_NOTICE_DAYS}日前に通知が来るように、カレンダーにも入れられます。`)}`,
      after: `${h2('えらび方の目安')}
<p>数は袋の枚数ではなく、トイレに行く回数で数えます。1人1日${it.per_day}回で、4人家族の${better}日分は${q(4, better)}です。4人の家では、1日だけで${q(4, 1)}を使う計算です。</p>
<p>${y}日分を用意する家は、3人で${q(3, y)}になります。${pub('chiba-zaitaku')}の在宅避難の備えにも、1人1日${it.per_day}個とあります。</p>
<p>${pub('shinagawa-toilet')}の手順の案内では、汚物を入れる袋は使うたびに替えます。固める薬は、便器の中に直接入れません。</p>
<p>便器の中に入れると、トイレがつまる原因になるためです。手順は、携帯トイレの袋や説明書で確かめます。</p>
${h2('まちがえやすいところ')}
<p>使ったあとの袋は口を結び、別の袋に入れて置いておきます。捨て方は、住んでいる自治体の方法に従います。</p>
<p>${pub('chiba-pref-mansion')}のページは、排水管の無事がわかるまで、トイレを流さないよう書いています。水が出るようになっても、すぐに流してよいとは限りません。</p>
<p>持ち出す袋の携帯トイレは、家に置く分とは別です。チェックリストでも、2つの備えに分けて並べています。</p>
<p>そろえる数は家族の人数や住まいでちがうと、${pub('tokyo-bichiku-toilet')}のちらしにも書かれています。</p>
<p>車で出かけるときの備えにも入ります。大雪で車が長く動けなくなるときに備え、${pub('fukushima-ooyuki')}は携帯トイレを挙げています。</p>
<p>職場の備蓄の例にも簡易トイレがあり、<a href="/sonae/kitaku-konnan/">職場と通勤の備え</a>にまとめました。</p>`,
      afterSrc: ['chiba-zaitaku', 'shinagawa-toilet', 'tokyo-bichiku-toilet', 'fukushima-ooyuki', 'bousai-kitaku'],
    },
    gas: {
      src: ['hepco-saigai', 'hokkaido-gas-teiden', 'caa-hakkaden', 'maff-shuno', 'maff-tanshin'],
      html: `${h2('出典の例')}
<p>上の数は、${pub('maff-sonae')}が示す大人1人の例です。家族の人数での数え方は出典で確かめていないので、このページは例の数だけを出しています。何本要るかは、家で何に使うかで変わります。</p>
${h2('使う場面')}
<p>停電するとIHは使えません。カセットコンロを使うときの換気の注意は、${pub('hepco-saigai')}の災害の備えのページにあります。</p>
<p>ガスの給湯器や暖房機の中にも、電気がないと動かないものがあります。${pub('hokkaido-gas-teiden')}のページにある注意です。冬の停電は<a href="/sonae/fuyu-teiden/">冬の停電と寒さの備え</a>に。</p>
<p>${pub('maff-sonae')}の大人1人1週間の例では、食品や水と同じ例の中にコンロとボンベがあります。主食の量は<a href="/hinmoku/shushoku/">備蓄の主食</a>に。</p>
${h2('使うときの注意')}
<p>コンロを並べて使わないこと、大きな調理器具をのせないことは、${pub('caa-hakkaden')}の注意です。ボンベは正しくつけます。</p>
${h2('置き場所と入れかえ')}
<p>${pub('maff-shuno')}のストックガイドには、コンロとボンベを同じ場所に置く例があります。単身者向けのガイドには、コンロをケースに入れて立てて置く方法もあります。</p>
${kigen('ボンベの期限', '水や主食の期限とあわせて、1つの一覧で見られます。')}`,
      after: `${h2('えらび方の目安')}
<p>ボンベの本数は、何に使うかで変わります。例の${it.example_qty}本は、大人1人の1週間分の例です。</p>
<p>コンロとボンベは同じ場所に置く例があります。見直しの日に、本数とコンロの具合を一度に確かめられます。</p>
<p>${pub('kantei-sonae')}と${pub('miyagi-mizu')}の備えの例にも、カセットコンロが入っています。</p>
<p>停電でIHが使えない家では、調理とお湯をわかす手段になります。ガスの給湯器も、停電では動かないものがあります。家で使う場面を数えてから、本数を決めます。</p>
${h2('まちがえやすいところ')}
<p>${pub('nite-bombe')}の資料には、IH調理器の上に置かれたボンベが熱せられ、破裂した例があります。</p>
<p>ボンベは室内に置き、熱くなるあつかいはしません。機器には正しくつけ、最後まで使い切ってから捨てます。</p>
<p>古くなったコンロは、部品の傷みや破損、ゆるみに気をつけます。長くしまっていたものは、使う前に確かめます。</p>
<p>室内で使うときは、窓をあけるなどして換気します。${pub('hokkaido-gas-teiden')}のページにもある注意です。</p>
<p>冬の停電では、調理のほかに暖をとる手段も要ります。${pub('bousai-teiden')}は、冷暖房が使えなくても暖をとる手段を、停電に備える項目に入れています。</p>
<p>ストーブを使うときも、あつかいを確かめて定期的に換気します。${pub('asahikawa-sonae')}の冬の備えにある注意です。</p>
<p>停電のときに発電機を使う家は、屋内では使いません。${pub('caa-hakkaden')}の同じ注意喚起にあることです。</p>`,
      afterSrc: ['nite-bombe', 'bousai-teiden', 'kantei-sonae', 'miyagi-mizu', 'asahikawa-sonae', 'caa-hakkaden'],
    },
    light: {
      src: ['osaka-bichiku', 'bousai-teiden', 'tfd-jishin', 'bousai-kitaku', 'cbr-mie-fuyu'],
      html: `${h2('出典の例')}
<p>ライトを何個そろえるかの目安は、公的な資料で確かめていません。${pub('osaka-bichiku')}の備蓄品のリスト例では、懐中電灯と予備の電池が生活用品に入っています。</p>
${h2('使う場面')}
<p>停電に備える項目として、足元灯や懐中電灯が${pub('bousai-teiden')}のページにあります。</p>
<p>${pub('tfd-jishin')}の地震に対する備えには、懐中電灯とスリッパやスニーカーが入っています。地震の前の備えは<a href="/sonae/jishin/">地震の前に足すもの</a>に。</p>
<p>職場の備蓄の例にも、懐中電灯が入っています。内閣府の帰宅困難者のガイドラインにあるもので、<a href="/sonae/kitaku-konnan/">職場と通勤の備え</a>にまとめました。</p>
<p>雪道を走る前に準備しておきたいものの例にもあります。<a href="/sonae/kuruma-taisetsu/">車の大雪の備え</a>に。</p>
${h2('どの備えに入るか')}
<p>${pub('nagasaki-mochidashi')}の例では持ち出す袋に、${pub('osaka-bichiku')}の例では家に置く備えに入っています。</p>
<p>電池で動くライトは、予備の乾電池もあわせて置きます。乾電池の期限は<a href="/dougu/kigen/">期限メモ</a>に入れられます。</p>`,
      after: `${h2('えらび方の目安')}
<p>数の目安は確かめていないので、使う場所から考えます。停電に備える項目として、${pub('bousai-teiden')}は足元灯も挙げています。</p>
<p>持ち出す袋と家に置く備えの、どちらの例にも入っています。袋の中に1つ、家の中に1つと、分けて置くこともできます。</p>
<p>${pub('sapporo-yukigai')}は、停電の備えとして懐中電灯と携帯ラジオを挙げています。${pub('kantei-sonae')}の備えの例には、マッチやろうそくも入っています。</p>
<p>このサイトのチェックリストでは、予備の乾電池を家に置く備えの行に、懐中電灯を持ち出す袋の行に入れています。</p>
${h2('置き場所と入れかえ')}
<p>予備の電池を、むき出しのままほかの電池とまぜて置くと、事故のもとになります。${pub('tokyo-denchi')}の注意にあることです。</p>
<p>使う直前まで包装のままにするか、ケースに入れて置きます。予備の電池の期限も、ライトとあわせて見直します。</p>
${h2('まちがえやすいところ')}
<p>電池を替えるときは、同じ種類の新しい電池にそろえます。種類や新しさのちがう電池をまぜると、発熱や液もれ、破裂のおそれがあります。</p>
<p>外側に傷のある電池は使いません。電池を入れるときに、ばねなどで外側を傷つけてショートした事故があります。</p>
<p>使い終わった電池を捨てるときは、プラスとマイナスの端にテープをはって絶縁します。これも同じ資料にある注意です。</p>
<p>在宅避難の備えとして、${pub('chiba-zaitaku')}も照明を挙げています。</p>
<p>停電が長くなるほど、電池の減りも進みます。予備の電池の数は、毎晩どのくらい明かりを使うかを考えて決めます。</p>
<p>停電の備えの全体は、ストーブや毛布とあわせて<a href="/sonae/fuyu-teiden/">冬の停電と寒さの備え</a>にまとめています。</p>`,
      afterSrc: ['sapporo-yukigai', 'tokyo-denchi', 'chiba-zaitaku', 'kantei-sonae'],
    },
    battery: {
      src: ['osaka-bichiku', 'hepco-saigai', 'chiba-zaitaku', 'bousai-teiden', 'bousai-kitaku'],
      html: `${h2('出典の例')}
<p>何個あればよいかは公的な資料で確かめていないので、数は書いていません。${pub('osaka-bichiku')}の備蓄品のリスト例では、携帯電話の充電器とモバイルバッテリーが生活用品に入っています。</p>
${h2('使う場面')}
<p>長い停電への備えとして、予備のバッテリーが${pub('hepco-saigai')}のページにあります。${pub('chiba-zaitaku')}の在宅避難の備えにも、ポータブル電源やモバイルバッテリーがあります。</p>
<p>電気で動く医療機器を使う家は、予備のバッテリーを用意します。${pub('bousai-teiden')}の停電対策のページにある項目です。</p>
<p>家族との連絡について、内閣府の帰宅困難者のガイドラインは、いくつかの手段を決めておくよう書いています。災害用伝言ダイヤルは${esc(items.kitaku.dengon)}です。</p>
${h2('どの備えに入るか')}
<p>持ち出す袋に入れる例は${pub('nagasaki-mochidashi')}に、家に置く備蓄品の例は${pub('osaka-bichiku')}にあります。家で過ごすときの備えは<a href="/sonae/zaitaku-hinan/">在宅避難の備え</a>に。</p>`,
      after: `${h2('えらび方の目安')}
<p>何個要るかの目安は確かめていないので、家族が連絡に使う電話の台数から考えます。持ち出す袋に入れる分と、家に置く分を分けて数えます。</p>
<p>${pub('nishinomiya-battery')}の注意では、丸い形のPSEマークがついたものをえらびます。このマークのないものは、国内で売ることができません。</p>
<p>買ったら取扱説明書を読み、充電のしかたを確かめます。</p>
<p>職場に置く個人の備えの例にも、携帯電話用の電源があります。${pub('bousai-kitaku')}のガイドラインにあるもので、<a href="/sonae/kitaku-konnan/">職場と通勤の備え</a>にまとめました。</p>
${h2('置き場所と入れかえ')}
<p>車の中など、熱くなる所には置きません。バッテリーを入れた持ち出す袋も、車の中など高温になる所での保管は避けます。満充電になったあとも充電を続けないこと、合った充電器を使うことも、同じページにある注意です。</p>
<p>持ち出す袋に入れたものも、<a href="/sonae/minaoshi/">年に2回の見直し</a>のときに充電の残りを確かめます。</p>
${h2('まちがえやすいところ')}
<p>古くなってふくらんだものは、火事のおそれがあるので、すぐに使うのをやめます。</p>
<p>使えなくなったものは、ふつうのごみとして捨てません。回収の場所や出し方は、住んでいる自治体で確かめます。</p>
<p>電気で動く医療機器の予備のバッテリーは、${pub('bousai-teiden')}の停電対策の項目にあります。ここで数える電話用のものとは別に用意します。</p>
<p>停電のときに知らせを聞く手段は、電話のほかに携帯ラジオもあります。${pub('nagasaki-mochidashi')}の非常持出品の例にも、携帯ラジオが入っています。${pub('sapporo-yukigai')}も、停電の備えに携帯ラジオを挙げています。</p>
<p>電気を使わない暖のとり方は、<a href="/sonae/fuyu-teiden/">冬の停電と寒さの備え</a>にまとめています。</p>`,
      afterSrc: ['nishinomiya-battery', 'bousai-kitaku', 'bousai-teiden', 'sapporo-yukigai'],
    },
  };
  const t = T[it.id];
  if (!t) return { html: '', after: '', src: [] };
  return { html: `<div class="prose">${t.html}</div>`, after: t.after ? `<div class="prose">${t.after}</div>` : '', src: [...t.src, ...(t.after ? t.afterSrc ?? [] : [])] };
}

// 入口（/hinmoku/）の文：棚の品目の数え方と、items.yml の数字での例
function shelfText(list, items, saigai) {
  const calc = list.filter((it) => it.calc);
  const ex = list.filter((it) => !it.calc && it.example_qty);
  const none = list.filter((it) => !it.calc && !it.example_qty);
  const by = Object.fromEntries(list.map((it) => [it.id, it]));
  const { better } = items.days;
  const y = items.yohairyo_days;
  const q = (id, n, d) => `${fmt(need(by[id].per_day, n, d))}${esc(by[id].unit)}`;
  const nm = (a) => a.map((it) => esc(it.name)).join('と');
  return `<div class="prose">
${h2('しくみ')}
<p>品目は${list.length}つです。${calc.map((it) => esc(it.name)).join('・')}の${calc.length}品目は、1人1日の量に人数と日数をかけて量を出します。</p>
${ex.length ? `<p>${nm(ex)}は、家族の人数での数え方を出典で確かめていません。そのため、出典にある大人1人の例だけを出しています。</p>` : ''}
${none.length ? `<p>${nm(none)}は、目安の数を公的な資料で確かめていないので、数を出していません。どの資料の備えの例に入っているかを書いています。</p>` : ''}
${h2('例')}
${by.mizu && by.shushoku && by['keitai-toilet'] ? `<p>4人家族が${better}日分をそろえると、水は${q('mizu', 4, better)}、主食は${q('shushoku', 4, better)}です。携帯トイレは${q('keitai-toilet', 4, better)}になります。</p>
<p>高齢の家族や小さな子どもがいる家は、少なくとも${y}日分がめやすです。3人の家なら、水は${q('mizu', 3, y)}、携帯トイレは${q('keitai-toilet', 3, y)}です。</p>` : ''}
${h2('そろえる順')}
<p>量を出せる${calc.length}品目は、人数と日数で数が決まります。先に早見表で家の数を出してから、置き場所を考えると、買いすぎや置き場所の不足に気づけます。</p>
<p>品目のページには、えらび方の目安と、まちがえやすいところも書いています。水のくみ置きの日数や、電池やボンベのあつかいの注意です。</p>
<p>${calc.map((it) => esc(it.name)).join('・')}のページには、人数と日数の早見表があります。ほかの品目のページには、どの資料の例に入っているかをまとめました。${saigai ? '' : '楽天市場の商品も、毎朝えらび直して並べています。'}</p>
</div>`;
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
// ima：備えのごよみの今の期間 { item, html }（#64）。その品目のページだけ、量のめやすの下に1行
export function hinmokuPages({ items, sources, products, saigai = SAIGAI, ima = null }) {
  if (saigai) ima = null;
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
<p><a class="go" href="/dougu/check/">チェックリスト</a></p>
${shelfText(list, items, saigai)}
${h2('出典')}
${sourceText([...new Set([...days.sources, ...items.yohairyo_sources, ...list.flatMap((it) => it.sources)])], sources)}`,
  });
  for (const it of list) {
    const shop = products?.items?.[it.id];
    const rel = SONAE[it.id];
    const own = jimae(it, items, sources);
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
      head: ima?.item === it.id ? `<style>${KOYOMI_CSS}</style>` : undefined,
      body: `<p class="crumb"><a href="/">トップ</a> / <a href="/hinmoku/">備えの品目</a></p>
<h1 class="city">${esc(it.page)}</h1>
<p class="feat">${esc(amount(it, days))}</p>
${ima?.item === it.id ? ima.html : ''}${it.calc ? '<p><a class="go" href="/dougu/keisan/">わが家の人数で計算</a></p>' : ''}
${own.html}
${shopList(shop, products?.fetchedAt)}
${own.after}
${h2('あわせて')}
<ul class="list"><li><a href="/dougu/check/">チェックリスト</a></li>${rel ? `<li><a href="${rel[0]}">${esc(rel[1])}</a></li>` : ''}<li><a href="/hinmoku/">ほかの品目</a></li></ul>
${h2('出典')}
${sourceText([...new Set([...it.sources, ...own.src])], sources)}`,
      script: shop?.length ? SHOP_JS : '',
    });
  }
  return out;
}
