// 人口が増えた市区町村（/ranking/jinko/）。増えた街だけを並べる（減った順・「ワースト」は作らない）
// 割合の順は人口1万人以上の街だけ（小さな町村は数十人で大きく動くため）
import { readFileSync, existsSync } from 'node:fs';
import { esc, fmt, h2, srcKokusei, fit } from '../layout.mjs';
import { prefOf, r1 } from '../stats.mjs';

const TOP = 20;
export const MIN_POP = 10000;

// ページと共有画像（tools/og/ranking-jinko.mjs）で同じ数字を使う
export function rankingData({ munis, list }) {
  const up = list.filter((x) => x.rate > 0);
  const prefUp = Object.values(munis.areas).filter((a) => a.level === '2' && a.popChangeRate > 0);
  const byRate = up.filter((x) => x.pop >= MIN_POP).sort((a, b) => b.rate - a.rate).slice(0, TOP);
  const byCount = [...up].sort((a, b) => b.popChange - a.popChange).slice(0, TOP);
  return { up, prefUp, byRate, byCount };
}
export const NOTE_KUMIKAE = '2020年の人口は、2025年の市区町村の範囲に組み替えた値です。';
export const rateText = (x) => `+${r1(x.rate).toFixed(1)}%`;

// 共有画像（X 用にも使う。10/27 しょーくんが案A）。画像の数字の「しるし」が今のデータと同じときだけ使う
export const OG_RANKING = { file: '/og-ranking-jinko.jpg', w: 1200, h: 675, sig: 'data/og-ranking-jinko.json', top: 10, alt: '2020年から人口が増えた市区町村のうち、増えた割合が大きい10の街の横棒' };
export const ogSig = ({ munis, list }) => {
  const { up, byRate } = rankingData({ munis, list });
  return `${munis.survey}|${up.length}/${list.length}|${byRate.slice(0, OG_RANKING.top).map((x) => `${x.code}${rateText(x)}`).join(',')}`;
};
function ogImage(munis, list) {
  const saved = existsSync(OG_RANKING.sig) ? JSON.parse(readFileSync(OG_RANKING.sig, 'utf8')).sig : null;
  if (saved === ogSig({ munis, list })) return OG_RANKING;
  console.log('::warning::人口が増えた市区町村の共有画像がいまのデータと合わないので、サイトの共有画像にしました（node tools/og/ranking-jinko.mjs で作り直す）');
  return null;
}

export function rankingPages({ munis, list, urlOf }) {
  const { up, prefUp, byRate, byCount } = rankingData({ munis, list });
  const cells = Math.round((up.length / list.length) * 100);
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
${rows(byRate, (x) => x.rate, rateText)}
${h2('増えた人数が多い街')}
${rows(byCount, (x) => x.popChange, (x) => `+${fmt(x.popChange)}人`)}
<p class="note">${NOTE_KUMIKAE}政令市は市全体で数えています。住みやすさの順位ではありません。</p>
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
      og: ogImage(munis, list),
    },
  ];
}
