// 市区町村ページ「この街の備え」の避難場所の顔ぶれ（11/8 夜 #70・AdSense のやり直し A）
//   data/hinan/list/<コード>.json（{ b: [[名前, 住所, 災害の種類のビット]], h: [[名前, 住所]] }）から、その街の中の内訳の文を作る
//   避難場所の数は人口あたり・順位・街どうしのくらべに使わない。「多い」は街の中の種類どうしのくらべだけ
//   一覧に載っていない災害の種類は書かない。施設の名前はデータの表記のまま。1文は全角60字まで
//   言い回しは数の条件でえらぶ（同じ言い回しが市区町村ページの半分以上に出ないように）
import { DISASTERS } from './hinan.mjs';

const MAX = 60;
const len = (s) => [...s].length;
const KIND_NAMES = DISASTERS.map(([, , name]) => name);
const JISHIN = 8;

// 指定避難所の名前の分け方（上から順に、最初に当てはまるもの）。学校を先に見る（「◯◯小学校体育館」は小学校）
export const SHISETSU = [
  ['小学校', /小学校/],
  ['中学校', /中学校/],
  ['高校', /高等学校|高校/],
  ['体育館', /体育館|スポーツ/],
  ['公民館や集会所', /公民館|コミュニティ|集会所|会館|センター/],
];
export const SONOTA = 'そのほか';
export const shisetsuOf = (name) => SHISETSU.find(([, re]) => re.test(name))?.[0] ?? SONOTA;

// (a) 指定避難所の施設の内訳：[{ name, n }]（多い順。同じ数は SHISETSU の順。そのほかは入れない）と、そのほかの数
export function shisetsuCounts(h) {
  const c = new Map(SHISETSU.map(([k]) => [k, 0]));
  let other = 0;
  for (const [name] of h) {
    const k = shisetsuOf(name);
    if (k === SONOTA) other++;
    else c.set(k, c.get(k) + 1);
  }
  const order = SHISETSU.map(([k]) => k);
  const top = [...c].map(([name, n]) => ({ name, n })).filter((x) => x.n > 0).sort((x, y) => y.n - x.n || order.indexOf(x.name) - order.indexOf(y.name));
  return { top, other, total: h.length };
}

// 3つめに多い種類（2か所以上のとき）。言い回しは数でえらぶ
export function shisetsuText3(h) {
  if (!h?.length) return '';
  const z = shisetsuCounts(h).top[2];
  if (!z || z.n < 2) return '';
  return z.n >= 20 ? `その次は${z.name}の${z.n}か所です。` : z.n >= 5 ? `${z.name}の名前の所も${z.n}か所あります。` : `ほかに${z.name}が${z.n}か所です。`;
}

export function shisetsuText(h) {
  if (!h?.length) return '';
  const { top, other, total } = shisetsuCounts(h);
  const [x, y] = top;
  if (!x) return `指定避難所${total}か所は、どれも学校や公民館などの名前ではありません。`;
  if (!y) return `指定避難所${total}か所のうち、名前から${x.name}とわかる所は${x.n}か所です。`;
  if (x.n === y.n) return `指定避難所${total}か所のうち、${x.name}と${y.name}がどちらも${x.n}か所です。`;
  if (x.n * 2 > total) return `指定避難所${total}か所のうち、${x.name}が${x.n}か所と半分をこえ、次は${y.name}の${y.n}か所です。`;
  if (other > x.n) return `指定避難所${total}か所は名前で分けにくい所が多く、${x.name}が${x.n}、${y.name}が${y.n}か所です。`;
  if (!/学校|高校/.test(x.name)) return `指定避難所${total}か所の中でいちばん多いのは${x.name}の${x.n}か所、次が${y.name}の${y.n}か所です。`;
  return `指定避難所${total}か所を名前で分けると、${x.name}が${x.n}、${y.name}が${y.n}か所です。`;
}

const bits = (m) => KIND_NAMES.filter((_, i) => (m >> i) & 1);
const popcount = (m) => bits(m).length;

// (b) いちばん多くの災害の種類に使える場所：{ kinds, k, places, all }（種類が1つだけの街は null）
//   いちばん多い種類の数の組み合わせが2つ以上あるときは、場所の多い組み合わせ（同じなら一覧で先に出るもの）
export function widest(b) {
  if (!b?.length) return null;
  const k = Math.max(...b.map(([, , m]) => popcount(m)));
  if (k < 2) return null;
  const by = new Map();
  for (const row of b) if (popcount(row[2]) === k) by.set(row[2], [...(by.get(row[2]) ?? []), row]);
  const [m, places] = [...by].sort((x, y) => y[1].length - x[1].length)[0];
  const union = b.reduce((u, [, , mm]) => u | mm, 0);
  return { kinds: bits(m), k, places: places.map(([n]) => n), all: m === union };
}

export function widestText(b) {
  const w = widest(b);
  if (!w) return [];
  // 一覧にある種類が全部そろう場所で種類が多い（5つ以上）ときは、種類を並べずに書く
  const head = w.all && w.k >= 5 ? `一覧にある${w.k}つの災害の種類すべてに使える` : `${w.kinds.join('・')}の${w.k}つに使える`;
  const [p, q] = w.places;
  const n = w.places.length;
  const tries =
    n === 1
      ? [[`${head}のは、${p}の1か所です。`], [`${head}のは1か所です。`, `その場所は${p}です。`]]
      : n === 2
        ? [[`${head}のは、${p}と${q}の2か所です。`], [`${head}のは2か所です。`, `${p}と${q}です。`], [`${head}のは2か所で、${p}などです。`]]
        : n >= 30
          ? [[`${head}場所は${n}か所あり、${p}や${q}もその1つです。`], [`${head}場所は${n}か所です。`, `${p}や${q}などがあります。`], [`${head}場所は${n}か所あり、${p}もその1つです。`], [`${head}場所は${n}か所です。`, `${p}などがあります。`]]
          : [[`${head}場所は${n}か所で、${p}や${q}などです。`], [`${head}場所は${n}か所です。`, `${p}や${q}などがあります。`], [`${head}場所は${n}か所で、${p}などです。`], [`${head}場所は${n}か所です。`, `${p}などがあります。`]];
  tries.push([`${head}場所は${n}か所です。`]);
  // 60字まで・かっこは1文に1つまで（施設の名前にかっこがあるときは名前を1つにする）
  return tries.find((t) => t.every((s) => len(s) <= MAX && (s.match(/（/g) ?? []).length <= 1)) ?? [];
}

// (c) 地震に使える指定緊急避難場所の、公園・広場と学校の数（名前で。学校を先に見る）
export function jishinParkSchool(b) {
  let park = 0;
  let school = 0;
  for (const [name, , m] of b ?? []) {
    if (!(m & JISHIN)) continue;
    if (/学校/.test(name)) school++;
    else if (/公園|広場/.test(name)) park++;
  }
  return { park, school };
}

export function jishinText(b) {
  const { park, school } = jishinParkSchool(b);
  if (park === school || (park < 3 && school < 3)) return '';
  const pk = park > school;
  const [hi, lo] = pk ? [park, school] : [school, park];
  const [hn, ln] = pk ? ['公園や広場', '学校'] : ['学校', '公園や広場'];
  if (lo === 0) return `地震のときの指定緊急避難場所には${hn}が${hi}か所あり、名前が${ln}の所はありません。`;
  if (hi >= lo * 3) return `地震に使える場所のうち${hn}は${hi}か所で、${ln}の${lo}か所の3倍以上あります。`;
  if (hi >= lo * 2) return `名前で見ると、地震に使える指定緊急避難場所は${hn}が${hi}か所で、${ln}の${lo}か所の2倍以上です。`;
  return `地震に使える指定緊急避難場所は、${hn}が${hi}か所、${ln}が${lo}か所で、${hn}のほうが多くあります。`;
}

// 文をまとめて返す（一覧のファイルがない街は空）
export function kaobureText(list) {
  if (!list) return [];
  return [shisetsuText(list.h) + shisetsuText3(list.h), ...widestText(list.b), jishinText(list.b)].filter(Boolean);
}
