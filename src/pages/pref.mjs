// 都道府県のページ（/都道府県/）。県全体の数字と、県内の市区町村の一覧（人口の多い順）
import { esc, fmt, h2, srcKokusei } from '../layout.mjs';
import { derive, r1 } from '../stats.mjs';
import { need } from '../calc.mjs';

const signed = (v) => `${v > 0 ? '+' : ''}${r1(v).toFixed(1)}%`;

export function prefPage({ pref, munis, list, z, cc, urlOf }) {
  const a = derive(munis.areas[`${pref.code}000`]);
  const inPref = list.filter((x) => x.code.slice(0, 2) === pref.code).sort((x, y) => y.pop - x.pop);
  const up = inPref.filter((x) => x.rate > 0).length;
  const per = r1(a.per);
  const withPage = inPref.filter((x) => urlOf(x.code));
  const body = `<p class="crumb"><a href="/">トップ</a></p>
<h1 class="city">${esc(pref.name)}</h1>
<p class="big"><b>${fmt(a.pop)}</b>人</p>
<p class="chg">2020年から <b>${fmt(Math.abs(a.popChange))}</b>人${a.popChange >= 0 ? 'ふえた' : 'へった'}（${signed(a.rate)}・全国 ${signed(z.rate)}）</p>
<p class="hh">世帯 <b>${fmt(a.hh)}</b>・1世帯 <b>${per.toFixed(1)}</b>人・${inPref.length}市区町村</p>
<p class="feat">${up ? `2020年から人口が増えたのは、${inPref.length}市区町村のうち${up}` : `${inPref.length}市区町村の人口と世帯の数字`}</p>
<p class="s1">1世帯の平均人数（${per.toFixed(1)}人）で計算すると、1週間に 水 <b>約${need(cc.per.mizu, per, 7)}L</b>・携帯トイレ <b>約${need(cc.per.toilet, per, 7)}回分</b><br><a class="go" href="/dougu/keisan/?d=7">わが家の人数で計算</a></p>
${srcKokusei(munis)}
${withPage.length ? `${h2('くわしく見られる街')}<ul class="list cols">${withPage.map((x) => `<li><a href="${urlOf(x.code)}">${esc(x.name)}</a></li>`).join('')}</ul>` : ''}
${h2('市区町村の人口（多い順）')}
<table class="tbl"><thead><tr><th>市区町村</th><th>人口</th><th>5年の増減</th><th>1世帯</th></tr></thead><tbody>
${inPref.map((x) => `<tr id="m${x.code}"><td>${urlOf(x.code) ? `<a href="${urlOf(x.code)}">${esc(x.name)}</a>` : esc(x.name)}</td><td>${fmt(x.pop)}</td><td>${signed(x.rate)}</td><td>${r1(x.per).toFixed(1)}</td></tr>`).join('\n')}
</tbody></table>
<p class="note">5年の増減は2020年から2025年。1世帯は一般世帯の平均人数（人）。</p>
${srcKokusei(munis)}`;
  return {
    path: `/${pref.slug}/`,
    title: `${pref.name}の市区町村の人口と備え`,
    description: `${pref.name}の人口${fmt(a.pop)}人と、県内${inPref.length}市区町村の人口・5年の増減・1世帯の人数（2025年国勢調査）。`,
    body,
  };
}
