// 備えの知識（/sonae/）と計算のページ（/dougu/keisan/）
// 数字はすべて data/items.yml から。出典は data/sources.yml の id で書き、ページの下に確認日つきで出す
import { esc, h2, jpDate, fit, srcName } from '../layout.mjs';
import { calcHtml, CALC_JS, need } from '../calc.mjs';

export function sourceList(ids, sources) {
  const by = new Map(sources.sources.map((s) => [s.id, s]));
  return `<ul class="notes">${ids
    .map((id) => {
      const s = by.get(id);
      if (!s) throw new Error(`出典 ${id} が sources.yml にない`);
      return `<li>${s.url ? `<a href="${esc(s.url)}" rel="noopener">${srcName(s)}</a>` : srcName(s)}（${jpDate(s.checked)}確認）</li>`;
    })
    .join('')}</ul>`;
}

function hayami(cc, id, unit) {
  const per = cc.by[id].per_day;
  const rows = [1, 2, 3, 4, 5, 6]
    .map((n) => `<tr><td>${n}人</td>${cc.days.choices.map((d) => `<td>${need(per, n, d).toLocaleString('ja-JP')}${unit}</td>`).join('')}</tr>`)
    .join('');
  return `<table class="tbl"><thead><tr><th>人数</th>${cc.days.choices.map((d) => `<th>${d}日分</th>`).join('')}</tr></thead><tbody>${rows}</tbody></table>`;
}

export function sonaePages({ cc, items, sources }) {
  const { by, days } = cc;
  const w = by.mizu.per_day;
  const m = by.shushoku.per_day;
  const t = by['keitai-toilet'].per_day;
  const y = items.yohairyo_days;
  const out = [];

  out.push({
    path: '/sonae/',
    title: '備えの知識',
    description: fit(
      [`家の備えを人数と日数で考える知識のページ。備蓄は最低${days.min}日分・できれば${days.better}日分、水は1人1日${w}L、携帯トイレは1人1日${t}回がめやす。`],
      [['量の計算、チェックリスト、品目ごとのめやす、備えの数字クイズへ。', '量の計算とチェックリストへ。']],
    ),
    body: `<p class="crumb"><a href="/">トップ</a></p>
<h1 class="city">備えの知識</h1>
<p class="lead">公的な資料の数字をもとに、家の備えを人数と日数で考える</p>
<ul class="list"><li><a href="/sonae/bichiku/">備蓄の量のめやす</a></li><li><a href="/sonae/rolling-stock/">ローリングストック</a></li><li><a href="/sonae/keitai-toilet/">携帯トイレの備え</a></li><li><a href="/dougu/keisan/">備蓄の量を計算する</a></li><li><a href="/dougu/check/">チェックリスト</a></li><li><a href="/hinmoku/">品目ごとのめやす</a></li><li><a href="/quiz/sonae/">備えの数字クイズ</a></li></ul>
<p class="note">発生したときの行動や避難の判断は、お住まいの自治体の案内とハザードマップを優先してください。</p>`,
  });

  out.push({
    path: '/sonae/bichiku/',
    title: '家の備蓄の量のめやす（水・食事・携帯トイレ）',
    description: fit(
      [`家の備蓄は最低${days.min}日分、できれば${days.better}日分。水は1人1日${w}L、食事は${m}食、携帯トイレは${t}回がめやすで、4人家族の${days.better}日分なら水${need(w, 4, days.better)}L・携帯トイレ${need(t, 4, days.better)}回分。`],
      [[`人数ごとの早見表と、高齢の家族がいる家の${y}日分のめやすつき。`, '人数ごとの早見表つき。']],
    ),
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/sonae/">備えの知識</a></p>
<h1 class="city">備蓄の量のめやす</h1>
<div class="prose">
<p>大きな災害のあとは、支援の物資が届くまで数日かかったり、店に品物が並ばない日が続いたりします。農林水産省は、家の食品の備えを最低${days.min}日分から1週間分、家族の人数分そろえることを勧めています。</p>
${h2('1人1日の量')}
<p>水は1人1日およそ${w}L。飲む水と、調理に使う水を合わせた量です。トイレを流したり体をふいたりする生活用水は、これとは別に要ります。</p>
<p>食事は1人1日${m}食で数えます。携帯トイレは1人1日${t}回がめやすで、くわしくは<a href="/sonae/keitai-toilet/">携帯トイレの備え</a>にまとめました。</p>
${h2('人数と日数の早見表')}
<h3>水</h3>${hayami(cc, 'mizu', 'L')}
<h3>食事</h3>${hayami(cc, 'shushoku', '食')}
<h3>携帯トイレ</h3>${hayami(cc, 'keitai-toilet', '回分')}
<p><a class="go" href="/dougu/keisan/">わが家の人数で計算する</a></p>
${h2('高齢の家族や小さな子どもがいる家', 'yohairyo')}
<p>乳幼児、妊娠中の人、高齢の人、持病や食物アレルギーのある人は、ふだんの食事や薬が手に入りにくくなると困りやすい人です。こうした家族がいる家では、少なくとも${y}日分の備えが勧められています。</p>
<p>${y}日分は、${w}L×人数×${y}日。2人なら水は${need(w, 2, y)}Lです。</p>
<p><a href="/hinmoku/mizu/">備蓄の水</a>・<a href="/hinmoku/shushoku/">備蓄の主食</a>・<a href="/hinmoku/keitai-toilet/">携帯トイレ</a></p>
</div>
${h2('出典')}
${sourceList([...new Set([...days.sources, ...by.mizu.sources, ...by.shushoku.sources, ...items.yohairyo_sources])], sources)}`,
  });

  out.push({
    path: '/sonae/rolling-stock/',
    title: 'ローリングストック（ふだんの食品で備える）',
    description: fit(
      [`ふだん食べている食品を少し多めに買い置きして、使った分を買い足す備え方。めやすは最低${days.min}日分・できれば${days.better}日分で、4人家族の${days.better}日分は主食${need(m, 4, days.better)}食・水${need(w, 4, days.better)}L。`],
      ['回し方と、カセットコンロとボンベの話も。'],
    ),
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/sonae/">備えの知識</a></p>
<h1 class="city">ローリングストック</h1>
<div class="prose">
<p>ふだん食べている食品を少し多めに買っておき、食べたらその分を買い足す。これをくり返して、家にいつも一定の量がある状態にしておく備え方です。農林水産省の食品ストックガイドでも紹介されています。</p>
${h2('災害用の食品とのちがい')}
<p>しまいこむ非常食とちがって、ふだんの買い物の中で回すので、期限の近いものから食べていけば、むだになりにくくなります。災害のあとも、食べ慣れた味のものを食べられます。</p>
${h2('どれだけ置いておくか')}
<p>めやすは最低${days.min}日分、できれば${days.better}日分。1人1日${m}食で数えると、4人家族の${days.better}日分は${need(m, 4, days.better)}食です。水は1人1日${w}Lなので、同じ4人の${days.better}日分は${need(w, 4, days.better)}Lになります。</p>
<p>主食（米、パックごはん、めん）、主菜になるもの（缶詰、レトルト）、野菜や果物の缶詰や乾物などを、ふだんの食事に近い形で組み合わせます。</p>
${h2('回し方')}
<p>買ってきたものは奥に入れて、手前の古いものから使う。使ったら、次の買い物で同じものを買い足す。このくり返しで、置いてある量が保たれます。</p>
<p>停電やガスが止まったときのために、<a href="/hinmoku/gas/">カセットコンロとボンベ</a>もあわせて用意しておくと、温かい食事が作れます。</p>
<p><a class="go" href="/dougu/keisan/">わが家の人数で計算する</a></p>
</div>
${h2('出典')}
${sourceList(['maff-guide', 'maff-sonae', 'maff-stock'], sources)}`,
  });

  out.push({
    path: '/sonae/keitai-toilet/',
    title: '携帯トイレの備え（1人1日5回のめやす）',
    description: fit(
      [`断水や停電、配管の被害で水洗トイレが使えなくなることがあります。携帯トイレは1人1日${t}回、最低${days.min}日・できれば${days.better}日分で、4人家族の1週間は${need(t, 4, 7)}回分。`],
      [['マンションなど集合住宅で、配管の状態がわかるまで使う理由も。', '人数ごとの早見表つき。']],
    ),
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/sonae/">備えの知識</a></p>
<h1 class="city">携帯トイレの備え</h1>
<div class="prose">
<p>大きな地震のあとは、断水や停電、配管や下水道の被害で、家の水洗トイレが使えなくなることがあります。食べ物や水と同じように、トイレも人数と日数で数えて備えます。</p>
${h2('どれだけ要るか')}
<p>内閣府の避難所のトイレのガイドラインでは、1人1日${t}回をめやすにしています。家の備えも同じ数で考えると、4人家族の${days.better}日分は${need(t, 4, days.better)}回分です。自治体の多くは、最低${days.min}日分、できれば${days.better}日分の備えを勧めています。</p>
${hayami(cc, 'keitai-toilet', '回分')}
${h2('マンションなど集合住宅の場合')}
<p>建物の配管が傷んでいるのに気づかずに流すと、下の階で汚水があふれるおそれがあると、神奈川県は注意をよびかけています。配管の状態がわかるまでは、携帯トイレを使います。</p>
<p><a href="/hinmoku/keitai-toilet/">携帯トイレの品目と商品</a></p>
<p><a class="go" href="/dougu/keisan/">わが家の人数で計算する</a></p>
</div>
${h2('出典')}
${sourceList(by['keitai-toilet'].sources, sources)}`,
  });

  out.push({
    path: '/dougu/keisan/',
    title: '備蓄の量の計算（水・食事・携帯トイレ）',
    description: fit(
      [`家族の人数と日数（${days.choices.join('日か')}日）から、水・食事・携帯トイレの備えの量をその場で計算します。1人1日 水${w}L・${m}食・トイレ${t}回のめやすで、4人家族の${days.min}日分は水${need(w, 4, days.min)}L・食事${need(m, 4, days.min)}食・携帯トイレ${need(t, 4, days.min)}回分。`],
      [],
    ),
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="/sonae/">備えの知識</a></p>
<h1 class="city">備蓄の量の計算</h1>
${calcHtml(cc)}
<p class="src">${cc.perText}。最低${days.min}日分、できれば${days.better}日分</p>
<p><a class="go" data-keep href="/dougu/check/">この人数でチェックリストを見る</a><br><a class="go" href="/dougu/kigen/">賞味期限をメモする</a></p>
${h2('量のめやすのもと')}
<div class="prose"><p>水は飲む水と調理の水の合計で、トイレや体をふく生活用水は別です。高齢の家族や小さな子どもがいる家は、<a href="/sonae/bichiku/#yohairyo">少なくとも${y}日分</a>がめやすです。</p></div>
${h2('出典')}
${sourceList([...new Set([...days.sources, ...by.mizu.sources, ...by.shushoku.sources, ...by['keitai-toilet'].sources])], sources)}`,
    script: CALC_JS,
  });
  return out;
}
