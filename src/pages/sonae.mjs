// 備えの知識（/sonae/）と計算のページ（/dougu/keisan/）
// 数字はすべて data/items.yml から。出典は data/sources.yml の id で書き、ページの下に確認日つきで出す
import { esc, h2, jpDate, fit, srcName, srcKokusei } from '../layout.mjs';
import { calcHtml, CALC_JS, need } from '../calc.mjs';
import { a8Ad } from '../a8.mjs';
import { readMunis } from '../munis.mjs';
import { resolveCities } from '../areas.mjs';
import { derive, r1 } from '../stats.mjs';

// 備えのページに出す街の例（国勢調査の数字から。データがなければ null で、例の文を出さない）
//   くわしく見られる街（市区町村ページのある街）だけから、1世帯の人数がいちばん多い・少ない街と、共同住宅・ひとり暮らしの割合がいちばん高い街
export function machiRei(munis) {
  if (!munis?.areas?.['00000']) return null;
  const { cities } = resolveCities(munis.areas);
  const cs = cities.map((c) => ({ ...derive(munis.areas[c.code]), url: `/${c.pref}/${c.slug}/` })).filter((x) => x.per > 0);
  if (cs.length < 2) return null;
  const by = (k) => [...cs].sort((x, y) => y[k] - x[k] || (x.code < y.code ? -1 : 1));
  const kyodo = by('pKyodo')[0];
  return {
    munis,
    z: derive(munis.areas['00000']),
    n: cs.length,
    perMax: by('per')[0],
    perMin: by('per').at(-1),
    kyodo,
    kyodoHalf: cs.filter((x) => x.pKyodo > 50).length,
    single: by('pSingle').find((x) => x.code !== kyodo.code),
  };
}
const pct1 = (v) => `${r1(v).toFixed(1)}%`;
const per1 = (v) => r1(v).toFixed(1);

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

export function sonaePages({ cc, items, sources, munis = readMunis() }) {
  const { by, days } = cc;
  const rei = machiRei(munis);
  const gas = by.gas;
  const link = (c) => `<a href="${c.url}">${esc(c.name)}</a>`;
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
<ul class="list"><li><a href="/sonae/bichiku/">備蓄の量のめやす</a></li><li><a href="/sonae/rolling-stock/">ローリングストック</a></li><li><a href="/sonae/keitai-toilet/">携帯トイレの備え</a></li><li><a href="/sonae/fuyu-teiden/">冬の停電と寒さの備え</a></li><li><a href="/sonae/jishin/">地震の前に足すもの</a></li><li><a href="/sonae/zaitaku-hinan/">在宅避難の備え</a></li><li><a href="/sonae/akachan-koureisha/">赤ちゃん・高齢の家族がいる家の備え</a></li><li><a href="/sonae/hitorigurashi/">ひとり暮らしの備え</a></li><li><a href="/sonae/mansion/">マンション（共同住宅）の備え</a></li><li><a href="/sonae/kuruma-taisetsu/">車の大雪の備え</a></li><li><a href="/sonae/kitaku-konnan/">職場と通勤の備え</a></li><li><a href="/dougu/keisan/">備蓄の量を計算する</a></li><li><a href="/dougu/check/">チェックリスト</a></li><li><a href="/hinmoku/">品目ごとのめやす</a></li><li><a href="/quiz/sonae/">備えの数字クイズ</a></li></ul>
<p class="note">発生したときの行動や避難の判断は、お住まいの自治体の案内とハザードマップを優先してください。</p>
<div class="prose">
${
  rei
    ? `${h2('街の数字で見る')}
<p>市区町村のページでは、その街の1世帯の平均人数で、1週間分の水と携帯トイレの量を出しています。</p>
<p>くわしく見られる${rei.n}の街で1世帯の人数がいちばん多いのは${link(rei.perMax)}の${per1(rei.perMax.per)}人で、1週間分の水は約${need(w, r1(rei.perMax.per), 7)}Lです。いちばん少ない${link(rei.perMin)}は${per1(rei.perMin.per)}人で、約${need(w, r1(rei.perMin.per), 7)}Lです。</p>
<p>共同住宅に住む世帯が${pct1(rei.kyodo.pKyodo)}の${link(rei.kyodo)}のページからは、<a href="/sonae/mansion/">マンション（共同住宅）の備え</a>につながります。ひとり暮らしの世帯が${pct1(rei.single.pSingle)}の${link(rei.single)}からは、<a href="/sonae/hitorigurashi/">ひとり暮らしの備え</a>につながります。</p>`
    : ''
}
${h2('人数と日数の例')}
<p>1人1日の量は、水${w}L、携帯トイレ${t}回がめやすです。4人家族の${days.better}日分なら、水は${need(w, 4, days.better)}L、携帯トイレは${need(t, 4, days.better)}回分になります。</p>
<p>ひとり暮らしの${days.better}日分は、水${need(w, 1, days.better)}Lと主食${need(m, 1, days.better)}食です。高齢の家族や小さな子どもがいる家は${y}日分がめやすで、2人なら水は${need(w, 2, y)}Lです。</p>
<p>カセットコンロの燃料は、<a href="/hinmoku/gas/">カセットコンロとボンベ</a>に。${esc(gas.example_text)}${gas.example_qty}${esc(gas.unit)}です。</p>
</div>
${h2('出典')}
${sourceList([...new Set([...days.sources, ...by.mizu.sources, ...by.shushoku.sources, ...by['keitai-toilet'].sources, ...items.yohairyo_sources, ...gas.sources])], sources)}
${rei ? srcKokusei(rei.munis) : ''}`,
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
<p>ミルクや介護食品などは<a href="/sonae/akachan-koureisha/">赤ちゃん・高齢の家族がいる家の備え</a>に。</p>
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
<p>ひとり暮らしなら、${days.better}日分は主食${need(m, 1, days.better)}食と水${need(w, 1, days.better)}Lです。</p>
<p>主食は米、パックごはん、めん。主菜になるものは缶詰やレトルトです。野菜や果物の缶詰や乾物も足して、ふだんの食事に近い形で組み合わせます。</p>
${h2('回し方')}
<p>買ってきたものは奥に入れて、手前の古いものから使う。使ったら、次の買い物で同じものを買い足す。このくり返しで、置いてある量が保たれます。</p>
<p>どれの期限が近いかは、<a href="/dougu/kigen/">賞味期限のメモ</a>に書いておくと、買い足す順番がわかります。</p>
<p>停電やガスが止まったときのために、<a href="/hinmoku/gas/">カセットコンロとボンベ</a>もあわせて用意しておくと、温かい食事が作れます。${esc(gas.example_text)}${gas.example_qty}${esc(gas.unit)}です。</p>
<p>ひとり暮らしで置き場所がせまいときは<a href="/sonae/hitorigurashi/">ひとり暮らしの備え</a>に。</p>
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
<p>ひとり暮らしなら、${days.min}日分で${need(t, 1, days.min)}回分、${days.better}日分で${need(t, 1, days.better)}回分です。</p>
${
  rei
    ? `<p>全国の1世帯の平均は${per1(rei.z.per)}人で、この人数の${days.better}日分は約${need(t, r1(rei.z.per), days.better)}回分です。市区町村のページでは、その街の平均人数で1週間分を出しています。</p>`
    : ''
}
${h2('マンションなど集合住宅の場合')}
<p>建物の配管が傷んでいるのに気づかずに流すと、下の階で汚水があふれるおそれがあると、神奈川県は注意をよびかけています。配管の状態がわかるまでは、携帯トイレを使います。</p>
${
  rei
    ? `<p>共同住宅に住む世帯は、全国で${pct1(rei.z.pKyodo)}です。くわしく見られる${rei.n}の街のうち${rei.kyodoHalf}の街で半分をこえ、いちばん高い${link(rei.kyodo)}は${pct1(rei.kyodo.pKyodo)}です。</p>`
    : ''
}
<p>エレベーターや水のポンプが止まることは<a href="/sonae/mansion/">マンション（共同住宅）の備え</a>に、家で過ごすための水や明かりの備えは<a href="/sonae/zaitaku-hinan/">在宅避難の備え</a>に。</p>
<p><a href="/hinmoku/keitai-toilet/">携帯トイレの品目と商品</a></p>
<p><a class="go" href="/dougu/keisan/">わが家の人数で計算する</a></p>
</div>
${a8Ad('stoole')}
${h2('出典')}
${sourceList(by['keitai-toilet'].sources, sources)}
${rei ? srcKokusei(rei.munis) : ''}`,
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
