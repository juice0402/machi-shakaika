// 人口が増えた市区町村（/ranking/jinko/）。増えた街だけを並べる（減った順・「ワースト」は作らない）
// 割合の順は人口1万人以上の街だけ（小さな町村は数十人で大きく動くため）
import { readFileSync, existsSync } from 'node:fs';
import { esc, fmt, h2, srcKokusei, fit } from '../layout.mjs';
import { prefOf, r1, fit60 } from '../stats.mjs';

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

// 地方（学校で習う8つの分け方。三重県は近畿）
const CHIHO = [['北海道', 1], ['東北', 7], ['関東', 14], ['中部', 23], ['近畿', 30], ['中国', 35], ['四国', 39], ['九州・沖縄', 47]];
const chihoOf = (code) => CHIHO.find(([, last]) => Number(String(code).slice(0, 2)) <= last)[0];
const n0 = (v) => Math.round(v).toLocaleString('ja-JP');

// 表の読み方と、増えた街のようす（11/9 夜 #72）。データから作る。減った順・「ワースト」は作らない
//   kencho：県庁所在地の市区町村コードの Set
export function rankingText({ list, kencho = new Set() }) {
  const { up, byRate, byCount } = rankingData({ list, munis: { areas: {} } });
  const last = (a) => a[a.length - 1];
  const yomikata = [
    `下の2つの表は、2020年から2025年に人口が増えた${n0(up.length)}市区町村から、それぞれ上位${byRate.length}をえらんだものです。`,
    `割合の表は人口${MIN_POP / 10000}万人以上の街だけで、人数の表は全部の市区町村から作っています。`,
    `割合は2020年の人口とくらべた増え方なので、人口が少ない街ほど大きく動きやすくなります。`,
    fit60(`割合は${byRate[0].name}の${rateText(byRate[0])}から${last(byRate).name}の${rateText(last(byRate))}まで、人数は${byCount[0].name}の${n0(byCount[0].popChange)}人から${last(byCount).name}の${n0(last(byCount).popChange)}人までです。`,
      `割合は${rateText(byRate[0])}から${rateText(last(byRate))}まで、人数は${n0(byCount[0].popChange)}人から${n0(last(byCount).popChange)}人までです。`),
  ];
  const tiny = up.filter((x) => x.pop < MIN_POP).sort((a, b) => b.rate - a.rate)[0];
  if (tiny) yomikata.push(fit60(`表に入らない人口${MIN_POP / 10000}万人未満の街では、${tiny.name}の${rateText(tiny)}がいちばん大きい割合です。`, `人口${MIN_POP / 10000}万人未満の街でいちばん大きい割合は${rateText(tiny)}です。`));
  const rateChoson = byRate.filter((x) => /[町村]$/.test(x.name)).length;
  if (rateChoson) yomikata.push(`割合の表の${byRate.length}の街のうち、${rateChoson}は町か村です。`);
  const rs = new Set(byRate.map((x) => x.code));
  const both = byCount.filter((x) => rs.has(x.code));
  yomikata.push(
    !both.length
      ? '2つの表の両方に入る街はありません。'
      : both.length <= 3
        ? fit60(`2つの表の両方に入っているのは、${both.map((x) => x.name).join('・')}です。`, `2つの表の両方に入っているのは${both.length}の街です。`)
        : fit60(`2つの表の両方に入っているのは${both.length}の街で、${both.slice(0, 3).map((x) => x.name).join('・')}などです。`, `2つの表の両方に入っているのは${both.length}の街です。`),
  );
  // 地方ごとの数（多い順。0の地方は書かない）
  const cnt = new Map();
  for (const x of up) cnt.set(chihoOf(x.code), (cnt.get(chihoOf(x.code)) ?? 0) + 1);
  const ch = [...cnt].sort((a, b) => b[1] - a[1] || CHIHO.findIndex(([n]) => n === a[0]) - CHIHO.findIndex(([n]) => n === b[0]));
  const yosu = [];
  if (ch.length) yosu.push(fit60(`増えた${n0(up.length)}市区町村を地方ごとに数えると、${ch.slice(0, 3).map(([n, v]) => `${n}が${v}`).join('、')}です。`));
  if (ch.length > 3) yosu.push(`ほかは${ch.slice(3).map(([n, v]) => `${n}が${v}`).join('、')}です。`);
  // 県庁所在地
  const kenUp = up.filter((x) => kencho.has(x.code));
  if (kencho.size) {
    const inCount = byCount.filter((x) => kencho.has(x.code));
    const inRate = byRate.filter((x) => kencho.has(x.code));
    yosu.push(
      !kenUp.length
        ? `県庁所在地の${kencho.size}市で、人口が増えた市はありません。`
        : fit60(`県庁所在地の${kencho.size}市のうち人口が増えたのは${kenUp.length}市で、${inCount.length}市が人数の表に入っています。`),
    );
    if (kenUp.length) yosu.push(inRate.length ? `割合の表に入っている県庁所在地は${inRate.length}市です。` : '割合の表には、県庁所在地は入っていません。');
  }
  // 東京23区と、町と村の数
  const ku = up.filter((x) => /^131\d\d$/.test(x.code) && x.code !== '13100').length;
  if (ku) yosu.push(`東京23区のうち人口が増えたのは${ku}区で、人数の表の${byCount.filter((x) => /^131\d\d$/.test(x.code)).length}の街が区です。`);
  const choson = up.filter((x) => /[町村]$/.test(x.name)).length;
  if (choson) yosu.push(`増えた${n0(up.length)}市区町村のうち、町と村は合わせて${choson}あります。`);
  // 街の大きさと、人数の表が占める分
  const big = up.filter((x) => x.pop >= 100000).length;
  const small = up.filter((x) => x.pop < MIN_POP).length;
  yosu.push(`増えた街のうち、人口10万人以上は${big}で、${MIN_POP / 10000}万人未満の街は${small}です。`);
  const total = up.reduce((s, x) => s + x.popChange, 0);
  const top = byCount.reduce((s, x) => s + x.popChange, 0);
  if (total > 0) yosu.push(fit60(`増えた人数を全部足すと${n0(total)}人で、そのうち${Math.round((top / total) * 100)}%が人数の表の${byCount.length}の街の分です。`));
  return { yomikata, yosu };
}

export function rankingPages({ munis, list, urlOf, kencho = new Set() }) {
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
<p>${rankingText({ list, kencho }).yomikata.map(esc).join('')}</p>
${h2(`増えた割合が大きい街`)}
<p class="note">人口${MIN_POP / 10000}万人以上の市区町村。2020年の人口とくらべた増え方</p>
${rows(byRate, (x) => x.rate, rateText)}
${h2('増えた人数が多い街')}
${rows(byCount, (x) => x.popChange, (x) => `+${fmt(x.popChange)}人`)}
<p class="note">${NOTE_KUMIKAE}政令市は市全体で数えています。住みやすさの順位ではありません。</p>
${h2('増えた街のようす')}
<p>${rankingText({ list, kencho }).yosu.map(esc).join('')}</p>
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
