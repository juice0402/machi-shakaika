// 市区町村のページ（/都道府県/市区町村/）。上が「この街の数字」、下が「この街の備え」
import { esc, fmt, h2, scale, srcName, srcKokusei, jpDate, RIVER, fit } from '../layout.mjs';
import { derive, feature, prefRank, similar, sonaeLinks, prefOf, r1 } from '../stats.mjs';
import { need } from '../calc.mjs';
import { machiQuiz } from '../quiz.mjs';
import { machiQuizHtml, MACHI_JS } from './quiz.mjs';
import { mtNear, mtNearHtml } from '../machi-core.mjs';
import { villageHtml, VILLAGE_CSS } from '../machi-tools.mjs';

const pct = (v) => `${r1(v).toFixed(1)}%`;
const signed = (v) => `${v > 0 ? '+' : ''}${r1(v).toFixed(1)}%`;

// 「この街の備え」の1行：街の備蓄は避難所に来た人の分、家の分は家で。街が出している備蓄のページへのリンクつき
// b は data/bichiku.yml の1件。無い街は行ごと出さない（東京23区は「区」）
export function bichikuLine(city, b) {
  if (!b) return '';
  const who = city.kind === 'ku' ? '区' : '市';
  return `<p class="why">${who}の備蓄は避難所に来た人の分です。<br>家の分は家で備えます。<br><a href="${esc(b.url)}" rel="noopener">${srcName(b)}</a></p>`;
}

export function cityPage({ city, munis, list, z, cc, hinan, hinanMeta, urlOf, kazu, bichiku = null }) {
  const a = derive(munis.areas[city.code]);
  const pref = prefOf(a.code);
  const per = r1(a.per);
  const { rank, of } = prefRank(list, a);
  const near = similar(list, a);
  const h = hinan.areas[city.code];
  const kinds = hinan.kinds.map(([k, name], i) => [name, h ? h[3 + i] : 0]).filter(([, v]) => v > 0).sort((x, y) => y[1] - x[1]);
  const links = sonaeLinks(a, z, derive(munis.areas[`${a.code.slice(0, 2)}000`]));
  const diff = a.popChange;
  const path = urlOf(city.code);
  const meRow = kazu.r.find((r) => r[0] === city.code);
  const niteru = mtNear(kazu.r, kazu.s, city.code, 3);

  const scales = [
    ['人口の増減', '2020年から2025年', { lo: -15, hi: 10, me: a.rate, zk: z.rate, unit: '%', meLabel: `${a.name} ${signed(a.rate)}`, zkLabel: `全国 ${signed(z.rate)}` }],
    ['1世帯の人数', '一般世帯', { lo: 1.5, hi: 3, me: a.per, zk: z.per, unit: '人', meLabel: `${a.name} ${per.toFixed(1)}人`, zkLabel: `全国 ${r1(z.per).toFixed(1)}人` }],
    ['65歳以上の人', '人口のうち', { lo: 10, hi: 60, me: a.p65, zk: z.p65, unit: '%', meLabel: `${a.name} ${pct(a.p65)}`, zkLabel: `全国 ${pct(z.p65)}` }],
    ['ひとり暮らしの世帯', '一般世帯のうち', { lo: 10, hi: 70, me: a.pSingle, zk: z.pSingle, unit: '%', meLabel: `${a.name} ${pct(a.pSingle)}`, zkLabel: `全国 ${pct(z.pSingle)}` }],
    ['共同住宅に住む世帯', '住宅に住む一般世帯のうち', { lo: 0, hi: 100, me: a.pKyodo, zk: z.pKyodo, unit: '%', meLabel: `${a.name} ${pct(a.pKyodo)}`, zkLabel: `全国 ${pct(z.pKyodo)}` }],
  ];

  const body = `<p class="crumb"><a href="/">トップ</a> / <a href="/${pref.slug}/">${esc(pref.name)}</a></p>
<h1 class="city">${esc(a.name)}</h1>
<p class="big"><b>${fmt(a.pop)}</b>人</p>
<p class="chg">2020年から <b>${fmt(Math.abs(diff))}</b>人${diff >= 0 ? 'ふえた' : 'へった'}（${signed(a.rate)}）</p>
<p class="hh">世帯 <b>${fmt(a.hh)}</b>・1世帯 <b>${per.toFixed(1)}</b>人</p>
<p class="feat">${esc(feature(list, a, z))}</p>
<p class="s1">1世帯の平均人数（${per.toFixed(1)}人）で計算すると、1週間に 水 <b>約${need(cc.per.mizu, per, 7)}L</b>・携帯トイレ <b>約${need(cc.per.toilet, per, 7)}回分</b><br><a class="go" href="/dougu/keisan/?d=7">わが家の人数で計算</a></p>
${srcKokusei(munis)}

${h2('この街の数字')}
${scales.map(([t, sub, s]) => `<div class="g"><p><b>${t}</b>　${sub}</p>${scale(s)}</div>`).join('\n')}
<p class="note">目盛りのはしは、全国の市区町村のおおよその幅です。</p>

${h2('100人の村にすると')}
${villageHtml(a.name, a, z)}
${srcKokusei(munis)}

${machiQuizHtml(a.name, machiQuiz(a, list, near, list.filter((x) => urlOf(x.code))))}

${h2('県内と、人口が近い街')}
<p>${esc(pref.name)}の${of}市区町村のうち、人口は${rank}番目に多い街です。</p>
<table class="tbl"><thead><tr><th>人口が近い街</th><th>人口</th><th>5年の増減</th></tr></thead><tbody>
<tr class="me"><td>${esc(a.name)}</td><td>${fmt(a.pop)}</td><td>${signed(a.rate)}</td></tr>
${near.map((x) => `<tr><td>${urlOf(x.code) ? `<a href="${urlOf(x.code)}">${esc(x.name)}</a>` : esc(x.name)}<br><span class="note">${esc(prefOf(x.code).name)}</span></td><td>${fmt(x.pop)}</td><td>${signed(x.rate)}</td></tr>`).join('\n')}
</tbody></table>

${h2('数字が似ている街')}
${mtNearHtml(meRow, niteru, kazu.p)}
<p class="note">人口・年齢の割合・5年の増減・ひとり暮らしと共同住宅の割合が近い街です。</p>
<p><a class="go" href="/kurabe/?a=${a.code}">この街をほかの街とカードでくらべる</a></p>
${srcKokusei(munis)}

${h2('年齢と世帯')}
<div class="bars">
<span>15歳未満</span><div class="share"><i style="width:${r1(a.p014)}%"></i></div><span class="num">${pct(a.p014)}</span>
<span>65歳以上</span><div class="share"><i style="width:${r1(a.p65)}%"></i></div><span class="num">${pct(a.p65)}</span>
<span>ひとり暮らし</span><div class="share"><i style="width:${r1(a.pSingle)}%"></i></div><span class="num">${pct(a.pSingle)}</span>
<span>共同住宅</span><div class="share"><i style="width:${r1(a.pKyodo)}%"></i></div><span class="num">${pct(a.pKyodo)}</span>
</div>
<p class="note">15歳未満と65歳以上は人口のうち、ひとり暮らしは一般世帯のうち、共同住宅は住宅に住む一般世帯のうち。年齢などが不詳の人を割り振った値（不詳補完値）です。</p>
${srcKokusei(munis)}

<section class="sonae"><span class="edge">${RIVER}</span>
${h2('この街の備え')}
${links.map((l) => `<p class="why">${esc(l.why)}<a href="${l.href}">${esc(l.text)}</a></p>`).join('\n')}
${bichikuLine(city, bichiku)}
<p class="why"><a href="/dougu/karte/?m=${a.code}">${esc(a.name)}のわが家の防災カルテを作る</a></p>
<p class="why"><a href="/dougu/manabi/?m=${a.code}">${esc(a.name)}の数字を読むプリント</a></p>
${
  h
    ? `<div class="cnt"><p>指定緊急避難場所<b>${fmt(h[0])}</b></p><p>指定避難所<b>${fmt(h[1])}</b></p></div>
<p class="note">指定緊急避難場所のうち、災害の種類ごとの数（1か所が複数の種類に入ります）</p>
<div class="kinds">${kinds.map(([k, v]) => `<span>${k}</span><i style="width:${((v / h[0]) * 100).toFixed(1)}%"></i><span class="num">${fmt(v)}</span>`).join('')}</div>
<ul class="notes"><li>指定緊急避難場所は危険が迫ったときに逃げる所、指定避難所は家に戻れないときに過ごす所です。</li><li>ここに載っていない場所が、無いとはかぎりません。</li><li>最新は${esc(a.name)}の情報とハザードマップで確かめてください。</li></ul>
<details id="hl" data-src="/hinan/${city.code}.json"><summary>一覧を開く（指定緊急避難場所${fmt(h[0])}・指定避難所${fmt(h[1])}）</summary><ul class="hl"></ul></details>
<p class="src">「指定緊急避難場所データ」「指定避難所データ」（国土地理院）をもとにまちの社会科作成。${esc(a.name)}の更新 ${h[2] ? jpDate(h[2]) : '-'}・取得 ${jpDate(hinanMeta.checked)}</p>`
    : '<p>国土地理院のデータに、この街の避難場所はまだ載っていません。</p>'
}
<div class="links"><a href="https://disaportal.gsi.go.jp/">ハザードマップポータルサイト（国土交通省）</a></div>
</section>`;

  const script = MACHI_JS + (h
    ? `(()=>{const d=document.getElementById('hl');if(!d)return;const K=${JSON.stringify(hinan.kinds.map(([, n]) => n))};let done=0;d.addEventListener('toggle',()=>{if(!d.open||done)return;done=1;const ul=d.querySelector('ul');ul.textContent='読み込み中';fetch(d.dataset.src).then(r=>r.json()).then(j=>{ul.textContent='';const add=(n,a,t)=>{const li=document.createElement('li');li.textContent=n;const s=document.createElement('small');s.textContent=a+(t?'　'+t:'');li.append(s);ul.append(li)};
const h1=document.createElement('li');h1.textContent='指定緊急避難場所';h1.style.fontWeight='700';ul.append(h1);j.b.forEach(([n,a,m])=>add(n,a,K.filter((_,i)=>m>>i&1).join('・')));
const h2=document.createElement('li');h2.textContent='指定避難所';h2.style.fontWeight='700';ul.append(h2);j.h.forEach(([n,a])=>add(n,a,''))}).catch(()=>{ul.textContent='読み込めませんでした'})})})();`
    : '');

  return {
    path,
    title: `${a.name}（${pref.name}）の人口と備え`,
    description: fit(
      [
        `${pref.name}${a.name}の人口は${fmt(a.pop)}人、世帯は${fmt(a.hh)}（${munis.survey.slice(0, 4)}年国勢調査）。`,
        `${pref.name}の${of}市区町村で${rank === 1 ? '人口がいちばん多く' : `人口は${rank}番目`}、1世帯は${per.toFixed(1)}人。`,
      ],
      [
        `平均の1世帯で1週間に水約${need(cc.per.mizu, per, 7)}L・携帯トイレ約${need(cc.per.toilet, per, 7)}回分。`,
        h ? [`指定緊急避難場所${fmt(h[0])}か所・指定避難所${fmt(h[1])}か所。`, `指定緊急避難場所${fmt(h[0])}か所。`] : '',
      ],
    ),
    head: `<style>${VILLAGE_CSS}</style>`,
    body,
    script,
    gsi: true,
  };
}
