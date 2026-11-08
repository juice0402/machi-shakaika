// 家の外の備え2本（10/28 #19）：車の大雪の備え（/sonae/kuruma-taisetsu/）・職場と通勤の備え（/sonae/kitaku-konnan/）
// 作りは読みもの（sonae-yomimono.mjs）と同じ表と末尾。中身は「前に積むもの・置くもの」だけ
// 立ち往生したときの動き（エンジン・換気）と、帰るか職場にとどまるかの判断は書かず、1行で公式の案内へ
// 数字は data/items.yml の kitaku と mizu・shushoku の per_day から。車のページは数字を出さない。出典は items.yml の kuruma・kitaku の sources
import { esc, h2, fit } from '../layout.mjs';
import { need } from '../calc.mjs';
import { sourceList } from './sonae.mjs';
import { CSS, table, tail } from './sonae-yomimono.mjs';

export const SOTO = [
  { key: 'kuruma', path: '/sonae/kuruma-taisetsu/', name: '車の大雪の備え', group: '家の外' },
  { key: 'kitaku', path: '/sonae/kitaku-konnan/', name: '職場と通勤の備え', group: '家の外' },
];

// items.yml の kuruma・kitaku と出典の形を確かめる（問題があれば文のリスト。空なら OK）
export function checkSoto(items, src) {
  const errors = [];
  const by = new Map((src?.sources ?? []).map((s) => [s.id, s]));
  for (const { key } of SOTO) {
    const list = items?.[key]?.sources;
    if (!list?.length) errors.push(`${key}: 出典がありません`);
    for (const id of list ?? []) {
      const s = by.get(id);
      if (!s) errors.push(`${key}: 出典 ${id} が sources.yml にありません`);
      else if (!s.title || !s.url || !s.checked) errors.push(`${key}: ${id} は題・URL・確認日を確かめてからページに出す`);
    }
  }
  const k = items?.kitaku ?? {};
  if (!(k.days > 0)) errors.push('kitaku.days がありません');
  if (!(k.moufu > 0)) errors.push('kitaku.moufu がありません');
  if (!/^\d{3}$/.test(String(k.dengon ?? ''))) errors.push('kitaku.dengon は3けたの番号');
  return errors;
}

export function sotoPages({ cc, items, sources }) {
  const err = checkSoto(items, sources);
  if (err.length) throw new Error(err.map((e) => `データ：${e}`).join('\n'));
  const { by } = cc;
  const w = by.mizu.per_day;
  const m = by.shushoku.per_day;
  const k = items.kitaku;
  const src = (id) => sources.sources.find((s) => s.id === id);
  const crumb = '<p class="crumb"><a href="/">トップ</a> / <a href="/sonae/">備えの知識</a></p>';
  const nKuruma = items.kuruma.sources.length;

  // ---------- 車の大雪の備え ----------
  const fukushima = src('fukushima-ooyuki');
  const kuruma = {
    path: '/sonae/kuruma-taisetsu/',
    title: '車の大雪の備え（立ち往生に備えて積んでおくもの）',
    description: fit(
      [`大雪で車が長く動けなくなるときに備えて、前に積んでおくもの。スコップや砂、冬用タイヤとチェーン、毛布と防寒着、水と食べ物、携帯トイレ。燃料は満タンにして出かけます。`],
      [[`国土交通省や福島県など${nKuruma}つの公的な資料から。`, '']],
    ),
    head: `<style>${CSS}</style>`,
    body: `${crumb}
<h1 class="city">車の大雪の備え</h1>
<p class="lead">立ち往生に備えて、車に積んでおくもの</p>
${table(['困ること', '積んでおくもの'], [
  ['雪で動けない', 'タイヤが空回りする', 'スコップ・砂', 'けん引ロープ・ブースターケーブル'],
  ['すべる', '雪道・凍った道', '冬用タイヤとチェーン', 'つけ方を前に確かめる'],
  ['寒さ', '長く動けないとき', '毛布・防寒着', '長靴・軍手'],
  ['水と食事', '', '水・非常用の食べ物', ''],
  ['トイレ', '', '携帯トイレ', ''],
  ['燃料', '雪道は燃費が悪い', '満タンにして出る', '早めに入れておく'],
  ['暗さ・窓の氷', '', '懐中電灯', 'アイスクレーパー・解氷剤'],
])}
<div class="prose">
${h2('いつ積むか')}
<p>雪の多い地域では、冬のあいだ車に積んでおきます。雪の少ない地域でも、大雪の予報が出た日にやむを得ず車で出るときは、同じものを積みます。</p>
${h2('雪で動けないとき')}
<p>雪かき用のスコップと、タイヤの下にまく砂を積みます。スコップは、空回りするタイヤのまわりの雪をどけるのにも使います。けん引ロープとブースターケーブルも積んでおきます。</p>
<p>冬用タイヤでも、雪が深いと進めなくなります。チェーンを積み、つけ方を前に確かめておきます。</p>
${h2('寒さと水・食べ物・トイレ')}
<p>長い時間動けなくなったときのために、毛布と防寒着、長靴と軍手を積みます。毛布と防寒着は、三重河川国道事務所の一覧にも入っています。水と非常用の食べ物、携帯トイレも車に置きます。</p>
<p>車に積む携帯トイレは、家に置く分とは別に数えます。家の分の数え方は<a href="/sonae/keitai-toilet/">携帯トイレの備え</a>に。冬に車で通勤する人は、職場に置くものを<a href="/sonae/kitaku-konnan/">職場と通勤の備え</a>で確かめます。</p>
${h2('燃料')}
<p>雪道は燃費が悪くなります。燃料は満タンにして出かけ、早めに入れておきます。ディーゼル車は軽油の凍結にも気をつけます。</p>
${h2('出かける前に')}
<p>国土交通省の発表は、やむを得ず運転するときは冬用タイヤをつけ、スコップや砂などの冬用装備を積むよう呼びかけています。中国運輸局も、外出のときの備えに水や食料を挙げ、燃料を満タンにして出るよう案内しています。</p>
<p>朝の凍った窓には、アイスクレーパーと解氷剤を使います。暗い時間に備えて、懐中電灯も積んでおきます。</p>
${h2('チェーンと道具')}
<p>飯田国道事務所は、スタッドレスタイヤでもチェーンを備えるよう案内しています。国土交通省も、チェーンはつけ方を前に確かめて車に積み、早めにつけるよう呼びかけています。三重河川国道事務所の一覧には、チェーンのほかにジャッキやけん引ロープ、ブースターケーブルも入っています。</p>
${h2('家の備えとのちがい')}
<p>家に置く備えは、家族が何日か家で過ごすための量です。車に積むものは、雪で動けなくなったときに、その場で寒さをしのいで過ごすためのものです。福島県は、車が長い時間動けなくなるときに備えて、除雪の道具と防寒具、非常用の食料と水、携帯トイレを挙げています。</p>
<p>車に積む水や食べ物の量のめやすは、公的な資料で確かめられなかったので、このページには数を書いていません。家に置く量は<a href="/sonae/bichiku/">備蓄の量のめやす</a>に。</p>
<p>家の停電と寒さの備えは<a href="/sonae/fuyu-teiden/">冬の停電と寒さの備え</a>に。</p>
</div>
${tail(items, 'kuruma')}
<p class="why">立ち往生したときのエンジンや換気のことは、<a href="${esc(fukushima.url)}" rel="noopener">福島県</a>など都道府県の案内で、大雪の見通しは<a href="https://www.jma.go.jp/bosai/">気象庁</a>で確かめます。</p>
${h2('出典')}
${sourceList(items.kuruma.sources, sources)}`,
  };

  // ---------- 職場と通勤の備え ----------
  const guide = src('bousai-kitaku');
  const kitaku = {
    path: '/sonae/kitaku-konnan/',
    title: `職場と通勤の備え（帰宅困難に備えて職場の${k.days}日分・通勤のバッグ）`,
    description: fit(
      [`帰れない日に備えて、職場に置くもの・通勤のバッグに入れるもの・家族との連絡の決めごと。職場の備蓄は1人${k.days}日分がめやすで、水${need(w, 1, k.days)}L・主食${need(m, 1, k.days)}食・毛布${k.moufu}枚。`],
      [[`災害用伝言ダイヤル${k.dengon}の使い方も前に確かめます。`, `伝言ダイヤル${k.dengon}も。`]],
    ),
    head: `<style>${CSS}</style>`,
    body: `${crumb}
<h1 class="city">職場と通勤の備え</h1>
<p class="lead">帰れない日に備えて、職場とバッグに足すもの</p>
${table(['置く場所', '足すもの'], [
  ['職場', '勤め先の備蓄', '水・主食・毛布', `1人${k.days}日分`],
  ['職場', '机・ロッカー', '運動靴', 'チョコやキャラメル'],
  ['通勤のバッグ', '連絡と情報', '携帯電話の電源', '携帯ラジオ'],
  ['通勤のバッグ', '季節に合わせて', '携帯カイロ・タオル', ''],
  ['通勤のバッグ', '', '飲み水・常備薬', ''],
  ['家族と', '連絡の決めごと', '連絡の手段と集まる場所', `災害用伝言ダイヤル${k.dengon}・伝言板`],
])}
<div class="prose">
${h2('職場に置くもの')}
<p>大きな災害で電車やバスが止まると、職場で過ごすことがあります。勤め先の備蓄は、従業員1人${k.days}日分がめやすです。水は1人1日${w}L・主食は1日${m}食・毛布は1人${k.moufu}枚で、${k.days}日分は水${need(w, 1, k.days)}L・主食${need(m, 1, k.days)}食になります。</p>
<p>東京都では、帰宅困難者対策条例で事業者にこの備蓄を求めています。勤め先の備蓄があるかは、総務の担当に確かめます。</p>
<p>内閣府のガイドラインは、勤め先の備蓄として、水と主食、毛布のほかに、簡易トイレや携帯ラジオ、懐中電灯なども挙げています。勤め先にあるかどうかは、置き場所といっしょに確かめておきます。</p>
<p>職場の備蓄は勤め先がそろえるもので、家の備蓄とは別のものです。家の分は家族の人数で数え、職場の分は従業員の数で数えます。</p>
<p>神奈川県は、断水や停電、配管の被害でトイレが使えなくなることがあると注意しています。職場の建物でも同じことが起きるので、勤め先の備蓄に簡易トイレがあるかも、あわせて確かめておきます。</p>
<p>自分の机やロッカーには、歩きやすい運動靴と、チョコやキャラメルのような食べ物を置きます。</p>
${h2('通勤のバッグに入れるもの')}
<p>携帯電話の予備の電源と携帯ラジオ、飲み水、ふだん飲んでいる薬を入れます。携帯カイロやタオルなど、季節に合わせたものも足します。冬に車で通勤する人は、<a href="/sonae/kuruma-taisetsu/">車の大雪の備え</a>も見ておきます。</p>
<p>内閣府のガイドラインの個人の備えの例には、非常用の食品と飲料水、運動靴、常備薬、携帯電話用の電源が入っています。警視庁の案内にも、ロッカーのスニーカーと携帯電話が出てきます。どちらの資料にも出てくるものから入れていくと、バッグの中身を決めやすくなります。大阪府の備蓄品の例にも、携帯電話の充電器とモバイルバッテリーが入っています。</p>
${h2('家族との連絡の決めごと')}
<p>災害のあとは電話がつながりにくくなります。家族で、連絡の手段と集まる場所を前に話し合っておきます。災害用伝言ダイヤル${k.dengon}や災害用伝言板、SNS、遠くの親戚など、手段は2つ以上決めて、使い方を確かめます。</p>
${h2('家族の形でちがうこと')}
<p>小さな子どもや高齢の家族が家にいる人は、自分が帰れない日に家族がどう過ごすかも、連絡の決めごとといっしょに話し合っておきます。配慮が要る家族の分は、家に長めに置くのがめやすです。くわしくは<a href="/sonae/akachan-koureisha/">赤ちゃん・高齢の家族がいる家の備え</a>に。</p>
<p>家の備えは<a href="/sonae/bichiku/">備蓄の量のめやす</a>に。</p>
</div>
${tail(items, 'kitaku')}
<p class="why">帰るか職場にとどまるかは、<a href="${esc(guide.url)}" rel="noopener">内閣府のガイドライン</a>や都道府県、勤め先の案内で確かめます。</p>
${h2('出典')}
${sourceList(items.kitaku.sources, sources)}`,
  };

  return [kuruma, kitaku];
}
