// 国勢調査の数字から、ページに出す割合・全国の中の位置・特徴の1行を作る（文はデータの条件ごとの言い回しから。AIに書かせない）
import { prefByCode } from './areas.mjs';

const r1 = (v) => Math.round(v * 10) / 10;

export function derive(a) {
  if (!a) return null;
  return {
    ...a,
    rate: a.popChangeRate,
    per: a.perHh,
    p65: a.pop ? (a.age65 / a.pop) * 100 : null,
    p014: a.pop ? (a.age014 / a.pop) * 100 : null,
    pSingle: a.ippan ? (a.single / a.ippan) * 100 : null,
    pKyodo: a.housed ? (a.kyodo / a.housed) * 100 : null,
    pWith65: a.ippan ? (a.with65 / a.ippan) * 100 : null,
  };
}

// 全国の市区町村（政令市の区と特別区部の合計の行はのぞく）
export function muniList(areas) {
  return Object.values(areas).filter((a) => (a.level === '4' || a.level === '6') && a.code !== '13100' && a.pop > 0).map(derive);
}

export const prefOf = (code) => prefByCode.get(String(code).slice(0, 2));

// 県内で人口の多い順の何番目か（市区町村の数も）
export function prefRank(list, a) {
  const inPref = list.filter((x) => x.code.slice(0, 2) === a.code.slice(0, 2)).sort((x, y) => y.pop - x.pop);
  return { rank: inPref.findIndex((x) => x.code === a.code) + 1, of: inPref.length, inPref };
}

// 人口が近い街（全国、自分をのぞく）
export function similar(list, a, n = 3) {
  return list
    .filter((x) => x.code !== a.code)
    .map((x) => ({ x, d: Math.abs(Math.log(x.pop / a.pop)) }))
    .sort((p, q) => p.d - q.d)
    .slice(0, n)
    .map((p) => p.x);
}

// 全国の市区町村の中で、値が小さいほうから何％の位置か（0〜100）
export function position(list, key, v) {
  const vals = list.map((x) => x[key]).filter((x) => x != null);
  const below = vals.filter((x) => x < v).length;
  return Math.round((below / vals.length) * 100);
}

const wari = (p) => Math.round(p / 10);

// 特徴の1行（上から順に、当てはまる最初のもの）。人口の減り方・高齢化の高さを見出しにしない
export function feature(list, a, z) {
  const pref = prefOf(a.code);
  if (a.rate > 0) {
    const up = list.filter((x) => x.code.slice(0, 2) === a.code.slice(0, 2) && x.rate > 0).length;
    return up <= 5 ? `${pref.name}で人口が増えた${up}つの市区町村のひとつ` : '2020年から人口が増えた街';
  }
  if (a.pSingle >= z.pSingle + 5 && wari(a.pSingle) > wari(z.pSingle)) return `世帯の${wari(a.pSingle)}割がひとり暮らし（全国は${wari(z.pSingle)}割）`;
  if (a.pKyodo >= 60) return `世帯の${wari(a.pKyodo)}割が共同住宅に住んでいる`;
  if (a.per >= z.per + 0.3) return `1世帯の人数が全国より多い（${r1(a.per).toFixed(1)}人・全国${r1(z.per).toFixed(1)}人）`;
  if (a.p014 >= z.p014 + 2) return `子ども（15歳未満）の割合が全国より高い（${r1(a.p014)}%・全国${r1(z.p014)}%）`;
  const { rank, of } = prefRank(list, a);
  return rank === 1 ? `${pref.name}の${of}市区町村で、人口がいちばん多い` : `${pref.name}の${of}市区町村で、人口が${rank}番目に多い`;
}

// 「この街の備え」で見せる知識（世帯の特徴から1〜2本）。全国とくらべて言えることがなければ県とくらべる
// （10/27 しょーくん：ページを作る条件5は「全国か県とはっきり違う」。p は県の数字、なければ全国だけ）
const TOILET = { href: '/sonae/keitai-toilet/', text: '携帯トイレの備え' };
const ONE = { href: '/dougu/keisan/?n=1', text: '1人分の量を計算' };
export function sonaeLinks(a, z, p = null) {
  const out = [];
  if (a.pKyodo >= 50) out.push({ why: `世帯の${wari(a.pKyodo)}割が共同住宅に住んでいます。`, ...TOILET });
  if (a.pSingle >= z.pSingle + 3) out.push({ why: `ひとり暮らしの世帯が${r1(a.pSingle)}%あります。`, ...ONE });
  if (a.pWith65 >= z.pWith65) out.push({ why: `65歳以上の人がいる世帯が${r1(a.pWith65)}%あります。`, href: '/sonae/bichiku/#yohairyo', text: '高齢の家族がいる家の備蓄' });
  if (!out.length && p) {
    const pn = prefOf(a.code).name;
    if (a.pKyodo >= p.pKyodo + 10) out.push({ why: `共同住宅に住む世帯が${r1(a.pKyodo)}%あります（${pn}は${r1(p.pKyodo)}%）。`, ...TOILET });
    if (a.pSingle >= p.pSingle + 3) out.push({ why: `ひとり暮らしの世帯が${r1(a.pSingle)}%あります（${pn}は${r1(p.pSingle)}%）。`, ...ONE });
  }
  if (!out.length) out.push({ why: '', href: '/sonae/bichiku/', text: '備蓄の量のめやす' });
  return out.slice(0, 2);
}

export { r1 };
