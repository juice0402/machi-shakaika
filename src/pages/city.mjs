// 市区町村のページ（/都道府県/市区町村/）。上が「この街の数字」、下が「この街の備え」
// 見出し（h2）ごとに section。パソコンの広い画面では「この街の備え」が右の柱（.side）
import { esc, fmt, h2, scale, srcName, srcKokusei, jpDate, RIVER, fit } from '../layout.mjs';
import { derive, feature, prefRank, similar, sonaeLinks, prefOf, r1, kurabeText, zenkokuOrder, villageText, nearText, niteruText, setaiText, scaleNote, hitori65Text } from '../stats.mjs';
import { need } from '../calc.mjs';
import { machiQuiz } from '../quiz.mjs';
import { machiQuizHtml, MACHI_JS } from './quiz.mjs';
import { mtNear, mtNearHtml } from '../machi-core.mjs';
import { village, villageHtml, VILLAGE_CSS } from '../machi-tools.mjs';

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
  const prefA = derive(munis.areas[`${a.code.slice(0, 2)}000`]);
  const links = sonaeLinks(a, z, prefA);
  const diff = a.popChange;
  const path = urlOf(city.code);
  const meRow = kazu.r.find((r) => r[0] === city.code);
  const niteru = mtNear(kazu.r, kazu.s, city.code, 3);
  const quiz = machiQuizHtml(a.name, machiQuiz(a, list, near, list.filter((x) => urlOf(x.code))));
  const feat = feature(list, a, z);
  const kurabe = kurabeText({ list, a, z, feat, meRow, near1: niteru[0], S: kazu.s, P: kazu.p });

  // 目盛り：全国の値から離れている順に並べる。割合のもと（人口のうち・一般世帯のうちなど）と目盛りのはしの説明は /about/#keisan
  const SCALE = {
    rate: ['5年の人口の増減', { lo: -15, hi: 10, me: a.rate, zk: z.rate, unit: '%', meLabel: `${a.name} ${signed(a.rate)}`, zkLabel: `全国 ${signed(z.rate)}` }],
    per: ['1世帯の人数', { lo: 1.5, hi: 3, me: a.per, zk: z.per, unit: '人', meLabel: `${a.name} ${per.toFixed(1)}人`, zkLabel: `全国 ${r1(z.per).toFixed(1)}人` }],
    p014: ['15歳未満の子ども', { lo: 0, hi: 25, me: a.p014, zk: z.p014, unit: '%', meLabel: `${a.name} ${pct(a.p014)}`, zkLabel: `全国 ${pct(z.p014)}` }],
    p65: ['65歳以上の人', { lo: 10, hi: 60, me: a.p65, zk: z.p65, unit: '%', meLabel: `${a.name} ${pct(a.p65)}`, zkLabel: `全国 ${pct(z.p65)}` }],
    pSingle: ['ひとり暮らしの世帯', { lo: 10, hi: 70, me: a.pSingle, zk: z.pSingle, unit: '%', meLabel: `${a.name} ${pct(a.pSingle)}`, zkLabel: `全国 ${pct(z.pSingle)}` }],
    pKyodo: ['共同住宅に住む世帯', { lo: 0, hi: 100, me: a.pKyodo, zk: z.pKyodo, unit: '%', meLabel: `${a.name} ${pct(a.pKyodo)}`, zkLabel: `全国 ${pct(z.pKyodo)}` }],
  };
  const scales = zenkokuOrder(list, a, z).map((k) => [SCALE[k][0], scaleNote(list, a, z, prefA, k), SCALE[k][1]]);
  // 100人の村：全国の数を並べる1行のかわりに、全国とのちがいを書く
  const villageBox = villageHtml(a.name, a, z).replace(/<p class="note">全国なら[^<]*<\/p>/, `<p class="note">${esc(villageText(a.name, village(a), village(z)))}</p>`);

  const body = `<p class="crumb"><a href="/">トップ</a> / <a href="/${pref.slug}/">${esc(pref.name)}</a></p>
<h1 class="city">${esc(a.name)}</h1>
<p class="big"><b>${fmt(a.pop)}</b>人</p>
<p class="chg">2020年から <b>${fmt(Math.abs(diff))}</b>人${diff >= 0 ? 'ふえた' : 'へった'}（${signed(a.rate)}）</p>
<p class="hh">世帯 <b>${fmt(a.hh)}</b>・1世帯 <b>${per.toFixed(1)}</b>人</p>
<p class="feat">${esc(feat)}</p>
<p class="s1">1世帯の平均人数（${per.toFixed(1)}人）で計算すると、1週間に 水 <b>約${need(cc.per.mizu, per, 7)}L</b>・携帯トイレ <b>約${need(cc.per.toilet, per, 7)}回分</b><br><a class="go" href="/dougu/keisan/?d=7">わが家の人数で計算</a></p>
${srcKokusei(munis)}

<section>${h2('この街の数字')}
${scales.map(([t, muki, s]) => `<div class="g"><p><b>${t}</b>　${muki}</p>${scale(s)}</div>`).join('\n')}
<p>${esc(setaiText(a))}</p>
<p class="note"><a href="/about/#keisan">目盛りの見方と並べ方</a></p></section>

<section>${h2('県内と全国でくらべると')}
<p>${kurabe.map(esc).join('')}</p>
${srcKokusei(munis)}</section>

<section>${h2('100人の村にすると')}
${villageBox}
${srcKokusei(munis)}</section>

${quiz ? `<section>${quiz}</section>` : ''}

<section>${h2('人口が近い街')}
<p>${esc(nearText(a, near))}</p>
<table class="tbl"><thead><tr><th>街</th><th>人口</th><th>5年の増減</th></tr></thead><tbody>
<tr class="me"><td>${esc(a.name)}</td><td>${fmt(a.pop)}</td><td>${signed(a.rate)}</td></tr>
${near.map((x) => `<tr><td>${urlOf(x.code) ? `<a href="${urlOf(x.code)}">${esc(x.name)}</a>` : esc(x.name)}<br><span class="note">${esc(prefOf(x.code).name)}</span></td><td>${fmt(x.pop)}</td><td>${signed(x.rate)}</td></tr>`).join('\n')}
</tbody></table></section>

<section>${h2('数字が似ている街')}
<p>${esc(niteruText(meRow, niteru, kazu.s))}</p>
${mtNearHtml(meRow, niteru, kazu.p).replace('<th>数字が似ている街</th>', '<th>街</th>')}
<p class="note"><a href="/about/#keisan">似ている街のえらび方</a></p>
<p><a class="go" href="/kurabe/?a=${a.code}">${esc(a.name)}をほかの街とカードでくらべる</a></p>
${srcKokusei(munis)}</section>

<section class="sonae side"><span class="edge">${RIVER}</span>
${h2('この街の備え')}
${links.map((l) => `<p class="why">${esc(l.why)}<a href="${l.href}">${esc(l.text)}</a></p>`).join('\n')}
<p class="why">${esc(hitori65Text(a, z))}</p>
${bichikuLine(city, bichiku)}
<p class="why"><a href="/dougu/karte/?m=${a.code}">${esc(a.name)}で防災カルテを作る</a></p>
<p class="why"><a href="/dougu/manabi/?m=${a.code}">${esc(a.name)}の数字を読むプリント</a></p>
${
  h
    ? `<div class="cnt"><p>指定緊急避難場所<b>${fmt(h[0])}</b></p><p>指定避難所<b>${fmt(h[1])}</b></p></div>
<p class="note">災害の種類ごとの数</p>
<div class="kinds">${kinds.map(([k, v]) => `<span>${k}</span><i style="width:${((v / h[0]) * 100).toFixed(1)}%"></i><span class="num">${fmt(v)}</span>`).join('')}</div>
<ul class="notes"><li>ここにない場所が無いとはかぎりません。最新は${esc(a.name)}の情報とハザードマップで確かめてください。<a href="/about/#keisan">2つの場所のちがい</a></li></ul>
<details id="hl" data-src="/hinan/${city.code}.json"><summary>一覧を開く</summary><ul class="hl"></ul></details>
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
    hashira: true,
    script,
    gsi: true,
  };
}
