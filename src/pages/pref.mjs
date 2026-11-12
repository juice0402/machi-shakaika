// 都道府県のページ（/都道府県/）。パソコンの広い画面では、1世帯の計算と「くわしく見られる街」が右の柱（.side）。県全体の数字と、県内の市区町村の一覧（人口の多い順）
import { esc, fmt, h2, srcKokusei, srcName, jpDate, fit } from '../layout.mjs';
import { derive, r1, prefRangeText, prefReadText, prefHinanText } from '../stats.mjs';
import { need } from '../calc.mjs';
import { PREFS } from '../areas.mjs';
import { qChiho, qChihoName } from '../quiz-core.mjs';

const signed = (v) => `${v > 0 ? '+' : ''}${r1(v).toFixed(1)}%`;

// 県の備えのページの1行（data/ken-bichiku.yml の1件。11/9 夜 #72）。無い県は出さない
export function kenBichikuLine(b) {
  if (!b) return '';
  return `<p class="why">${esc(b.publisher)}のページは、${esc(b.note)}<br><a href="${esc(b.url)}" rel="noopener">${srcName(b)}</a></p>`;
}

// 本文のいちばん最後の「<地方>のほかの都道府県」（#98）。県のコードの順に名前だけ。北海道は地方にほかの県がないので東北の6県
export function hokaKen(pref) {
  const c = qChiho(pref.code);
  const to = c === 0 ? 1 : c;
  const xs = PREFS.filter((p) => p.code !== pref.code && qChiho(p.code) === to);
  return `${h2(c === 0 ? '東北の県' : `${qChihoName(c)}のほかの都道府県`)}
<ul class="list cols">${xs.map((p) => `<li><a href="/${p.slug}/">${esc(p.name)}</a></li>`).join('')}</ul>`;
}

export function prefPage({ pref, munis, list, z, cc, urlOf, hinan = null, hinanMeta = null, kenBichiku = null }) {
  const a = derive(munis.areas[`${pref.code}000`]);
  const inPref = list.filter((x) => x.code.slice(0, 2) === pref.code).sort((x, y) => y.pop - x.pop);
  const up = inPref.filter((x) => x.rate > 0).length;
  const per = r1(a.per);
  const withPage = inPref.filter((x) => urlOf(x.code));
  const haba = prefRangeText(list, a);
  const yomi = prefReadText(list, a);
  const hn = hinan ? prefHinanText(hinan, pref.code) : null;
  const para = (xs) => (xs.length ? `<p>${xs.map(esc).join('')}</p>\n` : '');
  const body = `<p class="crumb"><a href="/">トップ</a></p>
<h1 class="city">${esc(pref.name)}</h1>
<p class="big"><b>${fmt(a.pop)}</b>人</p>
<p class="chg">2020年から <b>${fmt(Math.abs(a.popChange))}</b>人${a.popChange >= 0 ? 'ふえた' : 'へった'}（${signed(a.rate)}・全国 ${signed(z.rate)}）</p>
<p class="hh">世帯 <b>${fmt(a.hh)}</b>・1世帯 <b>${per.toFixed(1)}</b>人・${inPref.length}市区町村</p>
<p class="feat">${up ? `2020年から人口が増えたのは、${inPref.length}市区町村のうち${up}` : `${inPref.length}市区町村の人口と世帯の数字`}</p>
<div class="side"><p class="s1">1世帯の平均人数（${per.toFixed(1)}人）で計算すると、1週間に 水 <b>約${need(cc.per.mizu, per, 7)}L</b>・携帯トイレ <b>約${need(cc.per.toilet, per, 7)}回分</b><br><a class="go" href="/dougu/keisan/?d=7">わが家の人数で計算</a></p>
${srcKokusei(munis)}
${withPage.length ? `${h2('くわしく見られる街')}<ul class="list cols">${withPage.map((x) => `<li><a href="${urlOf(x.code)}">${esc(x.name)}</a></li>`).join('')}</ul>` : ''}</div>
${h2('市区町村の人口（多い順）')}
<table class="tbl"><thead><tr><th>市区町村</th><th>人口</th><th>5年の増減</th><th>1世帯</th></tr></thead><tbody>
${inPref.map((x) => `<tr id="m${x.code}"><td>${urlOf(x.code) ? `<a href="${urlOf(x.code)}">${esc(x.name)}</a>` : esc(x.name)}</td><td>${fmt(x.pop)}</td><td>${signed(x.rate)}</td><td>${r1(x.per).toFixed(1)}</td></tr>`).join('\n')}
</tbody></table>
<p class="note">5年の増減は2020年から2025年。1世帯は一般世帯の平均人数（人）。</p>
<p><a href="/ranking/jinko/">全国で人口が増えた市区町村</a>・<a href="/quiz/dobon/">都道府県ドボンクイズ</a></p>
${srcKokusei(munis)}
${h2('県内の街の読み解き')}
${para(yomi.jinko)}${para(yomi.up)}${yomi.setai.length ? `<p>${yomi.setai.map(esc).join('')}<br><a href="/sonae/hitorigurashi/">ひとり暮らしの備え</a>・<a href="/sonae/mansion/">マンション（共同住宅）の備え</a></p>\n` : ''}${yomi.koureisha.length ? `<p>${yomi.koureisha.map(esc).join('')}<br><a href="/sonae/akachan-koureisha/">高齢の家族がいる家の備え</a></p>\n` : ''}${srcKokusei(munis)}
${hn?.text.length || kenBichiku ? `${h2(kenBichiku ? '県内の避難場所と県の備え' : '県内の避難場所')}
${hn?.text.length ? `${para(hn.text)}<p class="note">1か所が複数の災害の種類に入ります。</p>
<p class="src">出典：国土地理院「指定緊急避難場所データ」「指定避難所データ」を加工して作成（${hn.rows}市区町村の合計・${jpDate(hinanMeta.checked)}取得）</p>\n` : ''}${kenBichikuLine(kenBichiku)}` : ''}
${haba.length ? `${h2('県内の街の幅')}
<p>${haba.map(esc).join('')}</p>
<p class="note"><a href="/about/#keisan-ken">幅の見方</a></p>
${srcKokusei(munis)}` : ''}
${hokaKen(pref)}`;
  return {
    path: `/${pref.slug}/`,
    title: `${pref.name}の市区町村の人口と備え`,
    description: fit(
      [
        `${pref.name}の人口は${fmt(a.pop)}人、世帯は${fmt(a.hh)}（${munis.survey.slice(0, 4)}年国勢調査）。`,
        `${inPref.length}市区町村で人口が多いのは${inPref.slice(0, 3).map((x) => x.name).join('・')}${up ? `、2020年から人口が増えたのは${up}市区町村` : ''}。`,
      ],
      [[`1世帯${per.toFixed(1)}人で1週間に水約${need(cc.per.mizu, per, 7)}L・携帯トイレ約${need(cc.per.toilet, per, 7)}回分。`, `1世帯の平均は${per.toFixed(1)}人。`]],
    ),
    body,
    hashira: true,
  };
}
