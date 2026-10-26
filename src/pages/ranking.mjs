// 人口が増えた市区町村（/ranking/jinko/）。増えた街だけを並べる（減った順・「ワースト」は作らない）
// 割合の順は人口1万人以上の街だけ（小さな町村は数十人で大きく動くため）
import { esc, fmt, h2, srcKokusei, fit } from '../layout.mjs';
import { prefOf, r1 } from '../stats.mjs';

const TOP = 20;
const MIN_POP = 10000;

export function rankingPages({ munis, list, urlOf }) {
  const up = list.filter((x) => x.rate > 0);
  const cells = Math.round((up.length / list.length) * 100);
  const prefs = Object.values(munis.areas).filter((a) => a.level === '2');
  const prefUp = prefs.filter((a) => a.popChangeRate > 0);
  const byRate = up.filter((x) => x.pop >= MIN_POP).sort((a, b) => b.rate - a.rate).slice(0, TOP);
  const byCount = [...up].sort((a, b) => b.popChange - a.popChange).slice(0, TOP);
  const link = (x) => {
    const pref = prefOf(x.code);
    const href = urlOf(x.code) ?? `/${pref.slug}/#m${x.code}`;
    return `<a href="${href}">${esc(x.name)}</a><small>${esc(pref.name)}</small>`;
  };
  const rows = (arr, val, label) => {
    const max = Math.max(...arr.map(val));
    return `<ol class="rk">${arr
      .map((x, i) => `<li><span class="no">${i + 1}</span><span class="nm">${link(x)}</span><span class="bv"><i style="width:${((val(x) / max) * 100).toFixed(1)}%"></i></span><span class="num">${label(x)}</span></li>`)
      .join('')}</ol>`;
  };
  const prefLine = prefUp.length
    ? `都道府県で人口が増えたのは${prefUp.length === 1 ? `${esc(prefUp[0].name)}だけ` : prefUp.map((a) => esc(a.name)).join('・')}（${prefUp.map((a) => `+${r1(a.popChangeRate).toFixed(1)}%`).join('・')}）`
    : '';
  const body = `<p class="crumb"><a href="/">トップ</a></p>
<h1 class="city">人口が増えた市区町村</h1>
<p class="big">${fmt(list.length)}市区町村のうち <b>${fmt(up.length)}</b></p>
<p class="chg">2020年から2025年に人口が増えた市区町村${prefLine ? `。${prefLine}` : ''}</p>
<div class="masu" role="img" aria-label="100マスのうち${cells}マス">${Array.from({ length: 100 }, (_, i) => `<i${i < cells ? ' class="on"' : ''}></i>`).join('')}</div>
<p class="note">全国の市区町村を100マスにすると、増えた街は${cells}マス</p>
${srcKokusei(munis)}
${h2(`増えた割合が大きい街`)}
<p class="note">人口${MIN_POP / 10000}万人以上の市区町村。2020年の人口とくらべた増え方</p>
${rows(byRate, (x) => x.rate, (x) => `+${r1(x.rate).toFixed(1)}%`)}
${h2('増えた人数が多い街')}
${rows(byCount, (x) => x.popChange, (x) => `+${fmt(x.popChange)}人`)}
<p class="note">2020年の人口は、2025年の市区町村の範囲に組み替えた値です。政令市は市全体で数えています。住みやすさの順位ではありません。</p>
${srcKokusei(munis)}`;
  return [
    {
      path: '/ranking/jinko/',
      title: '人口が増えた市区町村（2020年→2025年）',
      description: fit(
        [
          `2020年から2025年に人口が増えたのは、全国${fmt(list.length)}市区町村のうち${fmt(up.length)}（${munis.survey.slice(0, 4)}年国勢調査）。`,
          `増えた割合は${byRate[0].name}の+${r1(byRate[0].rate).toFixed(1)}%、人数は${byCount[0].name}の+${fmt(byCount[0].popChange)}人がいちばん大きい。`,
        ],
        [prefUp.length === 1 ? `都道府県で増えたのは${prefUp[0].name}だけ。` : prefUp.length ? `都道府県で増えたのは${prefUp.length}。` : '', `上位${TOP}の街を一覧に。`],
      ),
      body,
    },
  ];
}
