// 品目ページ（/hinmoku/ と /hinmoku/<id>/）：量のめやす（items.yml）と、楽天市場の商品（毎日とりなおす）
// 楽天の商品を出すページは、AdSense を置かない・楽天以外へのリンクを置かない（楽天ウェブサービス規約 第8条4項・第10条1項4号）
//   出典はリンクにせず名前と確認日だけ（リンクは備えの知識のページにある）。フッターに楽天のクレジット（layout.mjs）
import { esc, fmt, h2, jpDate, fit, priceBand, srcName } from '../layout.mjs';
import { need } from '../calc.mjs';
import { SHOW, cleanName } from '../rakuten.mjs';
import { SAIGAI } from '../mode.mjs';
import { KIGEN_NOTICE_DAYS } from './kigen.mjs';

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
  const kigen = `<p>期限は<a href="/dougu/kigen/">期限メモ</a>に入れると、近い順に並びます。期限の${KIGEN_NOTICE_DAYS}日前に知らせる予定を、カレンダーに入れることもできます。</p>`;
  const nocount = '<p>目安の数は公的な資料で確かめていないので、このページでは数を出していません。';
  const T = {
    mizu: {
      src: ['nerima-yohairyo', 'kantei-sonae', 'bousai-teiden', 'maff-tanshin', 'maff-shuno', 'maff-guide'],
      html: `${h2('人数と日数の早見表')}
<p>1人1日${it.per_day}${esc(it.unit)}に、人数と日数をかけた量です。${min}日分は最低のめやす、${better}日分は大きな災害に備える量です。</p>
${hayami(it, cols)}
<p>${y}日分は、乳幼児や高齢の人などがいる家のめやすです。乳児がいる家は、ミルクを作る水もあわせて用意します。</p>
${h2('量にふくまれる水')}
<p>早見表の量は、飲み水と調理の水です。トイレを流したり体をふいたりする生活用水は、別に要ります。</p>
<p>${pub('miyagi-mizu')}と${pub('kantei-sonae')}の備えの例でも、生活用水は飲み水と分けて書かれています。</p>
<p>マンションなどでは、停電で建物の給水ポンプが止まり、断水になることがあります。建物ごとの備えは<a href="/sonae/mansion/">マンション（共同住宅）の備え</a>に。</p>
${h2('置き場所と入れかえ')}
<p>水は重く、場所もとります。${pub('maff-tanshin')}の単身者向けのガイドは、食品を台所に置かなくてもよいとしています。クローゼットのすき間やベッドの下も使えます。</p>
<p>ふだん飲む水を多めに買い、古いものから飲んで買い足すと、期限の近いものが残りにくくなります。この備え方を<a href="/sonae/rolling-stock/">ローリングストック</a>といいます。</p>
${kigen}`,
    },
    shushoku: {
      src: ['nerima-yohairyo', 'maff-guide', 'maff-shuno'],
      html: `${h2('人数と日数の早見表')}
<p>1人1日${it.per_day}${esc(it.unit)}に、人数と日数をかけた数です。${pub('maff-sonae')}は、食品の備えを最低${min}日分から${better}日分、人数分そろえるよう勧めています。</p>
${hayami(it, cols)}
<p>${y}日分は、ふだんの食事や薬が手に入りにくくなると困りやすい人がいる家のめやすです。</p>
${h2('そろえ方')}
<p>主食は、米やパックごはんなどです。缶詰やレトルトのおかず、野菜の缶詰や乾物と組み合わせて、ふだんの食事に近い形でそろえます。</p>
<p>かむ力や飲みこむ力が弱い家族には、やわらかい介護食品やとろみ調整食品を用意します。食物アレルギーのある家族の食品も、ふだんから回しながら置いておきます。</p>
<p>ごはんを温めたり湯をわかしたりするには、<a href="/hinmoku/gas/">カセットコンロとボンベ</a>も要ります。</p>
${h2('置き場所と入れかえ')}
<p>${pub('maff-shuno')}のストックガイドは、置き場所を分ける方法を紹介しています。毎日使う食品は台所で回し、たまに使うものは押し入れなどに置きます。</p>
<p>中身が見える箱に入れ、箱の横に期限を書いておきます。重いものは下に置き、入りきらない分は家のすき間に分けて置きます。</p>
${kigen}`,
    },
    'keitai-toilet': {
      src: ['miyagi-mizu', 'nagasaki-mochidashi', 'kantei-sonae'],
      html: `${h2('人数と日数の早見表')}
<p>1人1日${it.per_day}回に、人数と日数をかけた回数です。${pub('hiroshima-toilet')}は、${it.per_day}回×家族の人数×${min}日分、できれば${better}日分をめやすにしています。</p>
${hayami(it, cols)}
<p>${y}日分の列は、高齢の家族や小さな子どもがいる家の備えの日数に合わせています。</p>
${h2('使えなくなるとき')}
<p>水が止まったり配管が傷んだりすると、水洗トイレが使えなくなることがあります。</p>
<p>マンションなどの集合住宅で、配管が傷んだまま流すと、下の階で汚水があふれるおそれがあります。${pub('kanagawa-toilet')}が注意をよびかけていることです。</p>
<p>配管の状態がわかるまでは、携帯トイレを使います。断水のあいだ、トイレを流す生活用水は飲み水とは別に要ります。</p>
${h2('置き場所と入れかえ')}
<p>携帯トイレは、家に置く備えと持ち出す袋の両方に入る品目です。${pub('nagasaki-mochidashi')}の非常持出品の例にも入っています。</p>
<p>トイレットペーパーやティッシュペーパーも、${pub('kantei-sonae')}の備えの例にあります。<a href="/dougu/check/">チェックリスト</a>で、ほかの品目とあわせて確かめられます。</p>
${kigen.replace('期限は', '使用期限は')}`,
    },
    gas: {
      src: ['hepco-saigai', 'hokkaido-gas-teiden', 'caa-hakkaden', 'maff-shuno', 'maff-tanshin'],
      html: `${h2('出典の例')}
<p>上の数は、${pub('maff-sonae')}が示す大人1人の例です。家族の人数での数え方は出典で確かめていないので、このページは例の数だけを出しています。何本要るかは、家で何に使うかで変わります。</p>
${h2('使う場面')}
<p>停電するとIHは使えません。${pub('hepco-saigai')}は、停電のときにカセットコンロを使うなら換気に気をつけるよう書いています。</p>
<p>ガスの給湯器や暖房機の中にも、電気がないと動かないものがあります。${pub('hokkaido-gas-teiden')}のページにある注意です。冬の停電は<a href="/sonae/fuyu-teiden/">冬の停電と寒さの備え</a>に。</p>
<p>主食やレトルトを温めたり、湯をわかしたりするのに使います。主食の量は<a href="/hinmoku/shushoku/">備蓄の主食</a>に。</p>
${h2('使うときの注意')}
<p>${pub('caa-hakkaden')}は、コンロを並べて使わないことと、大きな調理器具をのせないことを注意しています。ボンベは正しくつけます。</p>
${h2('置き場所と入れかえ')}
<p>${pub('maff-shuno')}のストックガイドは、コンロとボンベを同じ場所に置くよう紹介しています。単身者向けのガイドには、コンロをケースに入れて立てて置く方法もあります。</p>
${kigen.replace('期限は', 'ボンベの期限は')}`,
    },
    light: {
      src: ['osaka-bichiku', 'bousai-teiden', 'tfd-jishin', 'bousai-kitaku', 'cbr-mie-fuyu'],
      html: `${h2('出典の例')}
${nocount}${pub('osaka-bichiku')}の備蓄品のリスト例では、懐中電灯と予備の電池が生活用品に入っています。</p>
${h2('使う場面')}
<p>${pub('bousai-teiden')}は、停電に備えて足元灯や懐中電灯を用意するよう書いています。</p>
<p>${pub('tfd-jishin')}は、割れたガラスでけがをしないように、懐中電灯とスリッパやスニーカーを用意するよう勧めています。地震の前の備えは<a href="/sonae/jishin/">地震の前に足すもの</a>に。</p>
<p>職場の備蓄の例にも、懐中電灯が入っています。内閣府の帰宅困難者のガイドラインにあるもので、<a href="/sonae/kitaku-konnan/">職場と通勤の備え</a>にまとめました。</p>
<p>雪道を走る車に積むものの例にもあります。<a href="/sonae/kuruma-taisetsu/">車の大雪の備え</a>に。</p>
${h2('置き場所と入れかえ')}
<p>${pub('nagasaki-mochidashi')}の例では持ち出す袋に、${pub('osaka-bichiku')}の例では家に置く備えに入っています。</p>
<p>電池で動くライトは、予備の乾電池もあわせて置きます。乾電池の期限は<a href="/dougu/kigen/">期限メモ</a>に入れられます。</p>`,
    },
    battery: {
      src: ['osaka-bichiku', 'hepco-saigai', 'chiba-zaitaku', 'bousai-teiden', 'bousai-kitaku'],
      html: `${h2('出典の例')}
${nocount}${pub('osaka-bichiku')}の備蓄品のリスト例では、携帯電話の充電器とモバイルバッテリーが生活用品に入っています。</p>
${h2('使う場面')}
<p>${pub('hepco-saigai')}は、長い停電に備えて予備のバッテリーを用意するよう書いています。${pub('chiba-zaitaku')}の在宅避難の備えにも、ポータブル電源やモバイルバッテリーがあります。</p>
<p>電気で動く医療機器を使う家は、予備のバッテリーや代わりの手段も考えます。${pub('bousai-teiden')}の停電対策のページにある項目です。</p>
<p>スマホは家族との連絡にも使います。内閣府の帰宅困難者のガイドラインは、連絡の手段をいくつか決めておくよう書いています。災害用伝言ダイヤルは${esc(items.kitaku.dengon)}です。</p>
${h2('置き場所と入れかえ')}
<p>${pub('nagasaki-mochidashi')}の例では持ち出す袋に、${pub('osaka-bichiku')}の例では家に置く備えに入っています。家で過ごすときの備えは<a href="/sonae/zaitaku-hinan/">在宅避難の備え</a>に。</p>`,
    },
  };
  const t = T[it.id];
  if (!t) return { html: '', src: [] };
  return { html: `<div class="prose">${t.html}</div>`, src: t.src };
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
<p>品目のページには、人数と日数の早見表と、置き場所や入れかえのことをまとめました。${saigai ? '' : '楽天市場の商品も、毎朝えらび直して並べています。'}</p>
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
      body: `<p class="crumb"><a href="/">トップ</a> / <a href="/hinmoku/">備えの品目</a></p>
<h1 class="city">${esc(it.page)}</h1>
<p class="feat">${esc(amount(it, days))}</p>
${it.calc ? '<p><a class="go" href="/dougu/keisan/">わが家の人数で計算</a></p>' : ''}
${own.html}
${shopList(shop, products?.fetchedAt)}
${h2('あわせて')}
<ul class="list"><li><a href="/dougu/check/">チェックリスト</a></li>${rel ? `<li><a href="${rel[0]}">${esc(rel[1])}</a></li>` : ''}<li><a href="/hinmoku/">ほかの品目</a></li></ul>
${h2('出典')}
${sourceText([...new Set([...it.sources, ...own.src])], sources)}`,
      script: shop?.length ? SHOP_JS : '',
    });
  }
  return out;
}
