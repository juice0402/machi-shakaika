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

// 全国の値の▲（街くらべカードと防災カルテで共通。ビルドのときにデータの合計から作る。年齢は人数、世帯の割合は世帯数で重みづけ）
//   list は muniList の形（pop・pop2020・age014・age65・single・ippan・kyodo・housed・perHh）
export function nationalRates(list) {
  const sum = (k) => list.reduce((s, a) => s + (a[k] || 0), 0);
  return {
    g: r1(((sum('pop') - sum('pop2020')) / sum('pop2020')) * 100),
    p014: r1((sum('age014') / sum('pop')) * 100),
    p65: r1((sum('age65') / sum('pop')) * 100),
    single: r1((sum('single') / sum('ippan')) * 100),
    kyodo: r1((sum('kyodo') / sum('housed')) * 100),
    // 1世帯の人数（一般世帯）：街ごとの人数を一般世帯の数で重みづけ（＝全国の行と同じ）。小数第2位まで
    per: Math.round((list.reduce((s, a) => s + (a.perHh || 0) * (a.ippan || 0), 0) / sum('ippan')) * 100) / 100,
  };
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
// しきい（トップの「このサイトでわかること」も同じ数を使う）：共同住宅に住む世帯が KYODO_MIN% 以上、ひとり暮らしが全国より SINGLE_PLUS 以上
export const KYODO_MIN = 50;
export const SINGLE_PLUS = 3;
const TOILET = { href: '/sonae/mansion/', text: 'マンション（共同住宅）の備え' };
const ONE = { href: '/sonae/hitorigurashi/', text: 'ひとり暮らしの備え' };
export function sonaeLinks(a, z, p = null) {
  const out = [];
  // 言い回しは数の大きさでえらぶ（11/8 夜 #70。言っていることは同じ）
  if (a.pKyodo >= KYODO_MIN) out.push({ why: a.pKyodo >= 70 ? `共同住宅に住む世帯が${wari(a.pKyodo)}割をしめます。` : `世帯の${wari(a.pKyodo)}割が共同住宅に住んでいます。`, ...TOILET });
  if (a.pSingle >= z.pSingle + SINGLE_PLUS) out.push({ why: a.pSingle >= 50 ? `一般世帯の${r1(a.pSingle)}%がひとり暮らしです。` : `ひとり暮らしの世帯が${r1(a.pSingle)}%あります。`, ...ONE });
  if (a.pWith65 >= z.pWith65) out.push({ why: a.pWith65 >= 50 ? `半分をこえる${r1(a.pWith65)}%の世帯に、65歳以上の人がいます。` : a.pWith65 >= 45 ? `一般世帯のうち${r1(a.pWith65)}%は、65歳以上の人がいる世帯です。` : `65歳以上の人がいる世帯が${r1(a.pWith65)}%あります。`, href: '/sonae/akachan-koureisha/', text: '高齢の家族がいる家の備え' });
  if (!out.length && p) {
    const pn = prefOf(a.code).name;
    if (a.pKyodo >= p.pKyodo + 10) out.push({ why: `共同住宅に住む世帯が${r1(a.pKyodo)}%あります（${pn}は${r1(p.pKyodo)}%）。`, ...TOILET });
    if (a.pSingle >= p.pSingle + 3) out.push({ why: `ひとり暮らしの世帯が${r1(a.pSingle)}%あります（${pn}は${r1(p.pSingle)}%）。`, ...ONE });
  }
  if (!out.length) out.push({ why: '', href: '/sonae/bichiku/', text: '備蓄の量のめやす' });
  return out.slice(0, 2);
}

export { r1 };

// ---- 市区町村ページ「県内と全国でくらべると」（10/31 夜 #47）。文はデータの条件ごとの言い回しから作る ----
//   新しい文の言葉は「増え・減り」の漢字にそろえる。1文は全角60字まで（tests/machi-yomidokoro.test.mjs が全国の市区町村で見張る）
const n0 = (v) => Math.round(v).toLocaleString('ja-JP');
const p1 = (v) => `${r1(v).toFixed(1)}%`;
const sg = (v) => `${v > 0 ? '+' : ''}${r1(v).toFixed(1)}%`;
const ab = (v) => `${r1(Math.abs(v)).toFixed(1)}%`; // 符号を外した割合（「増え」「減り」と書くとき）
const ADJ = { 多: ['多い', '多く'], 高: ['高い', '高く'], 広: ['広い', '広く'] };
// 言い回しのえらび分け（11/8 夜 #70）：先の候補から、どの文も全角60字までに収まる最初のもの。収まらなければ最後（前からの言い回し）
export const fit60 = (...c) => c.find((t) => t.split(/(?<=。)/).every((x) => [...x].length <= 60)) ?? c[c.length - 1];

// 倍率の言い方：1.0倍になるときは「ほぼ同じ」
export function bai(r) {
  const t = r >= 10 ? String(Math.round(r)) : r1(r).toFixed(1);
  return t === '1.0' ? null : `約${t}倍`;
}
// derive にない割合（15〜64歳・一戸建て）を足す。derive の結果は変えない
const ext = (x) => ({ ...x, p1564: x.pop ? (x.age1564 / x.pop) * 100 : null, pIkko: x.housed ? (x.ikkodate / x.housed) * 100 : null });

// 県内の順位にしてよい数字（大きいほうから数える）。65歳以上の割合と人口の減り方は入れない
export const RANK_BY = [
  ['pop', '人口', '多'],
  ['hh', '世帯の数', '多'],
  ['menseki', '面積', '広'],
  ['density', '人口密度', '高'],
  ['per', '1世帯の人数', '多'],
  ['p014', '15歳未満の割合', '高'],
  ['p1564', '15〜64歳の割合', '高'],
  ['pSingle', 'ひとり暮らしの世帯の割合', '高'],
  ['pKyodo', '共同住宅に住む世帯の割合', '高'],
  ['pIkko', '一戸建てに住む世帯の割合', '高'],
];

// 県内の順位（RANK_BY の順）：[{ k, name, adj, rank, of }]
export function prefRanks(list, a) {
  const me = ext(a);
  const inPref = list.filter((x) => x.code.slice(0, 2) === a.code.slice(0, 2)).map(ext);
  return RANK_BY.map(([k, name, adj]) => {
    const vals = inPref.map((x) => x[k]).filter((v) => v != null);
    return { k, name, adj, rank: me[k] == null ? null : vals.filter((v) => v > me[k]).length + 1, of: vals.length };
  });
}

// 全国とくらべる数字。label は文の主語、show は値の書き方
const ZEN = [
  { k: 'p014', label: '15歳未満の子どもの割合', show: p1 },
  { k: 'p65', label: '65歳以上の人の割合', show: p1 },
  { k: 'pSingle', label: 'ひとり暮らしの世帯の割合', show: p1 },
  { k: 'pKyodo', label: '共同住宅に住む世帯の割合', show: p1 },
  { k: 'per', label: '1世帯の人数', show: (v) => `${r1(v).toFixed(1)}人` },
  { k: 'rate', label: '5年の人口の増減', show: sg },
];

// 全国の市区町村の中での位置（0〜1、小さいほうから）。list ごとに並べた値を1回だけ作る
//   全国の値は全国の合計（人口で重みがつく）なので、離れ方は「市区町村の中で全国の値がどこにあるか」とのちがいで見る
const SORTED = new WeakMap();
function pctOf(list, k, v) {
  if (!SORTED.has(list)) SORTED.set(list, {});
  const o = SORTED.get(list);
  o[k] ??= list.map((x) => x[k]).filter((x) => x != null).sort((x, y) => x - y);
  const vs = o[k];
  let lo = 0;
  let hi = vs.length;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (vs[mid] < v) lo = mid + 1;
    else hi = mid;
  }
  return lo / vs.length;
}

// 全国の値から離れている順（市区町村の中の位置の差の大きい順。表に出すと同じ値になるものはのぞく）
//   d：位置の差（-1〜1。+ は全国より大きい）
export function zenkokuDiffs(list, a, z) {
  return ZEN.filter((m) => a[m.k] != null && m.show(a[m.k]) !== m.show(z[m.k]))
    .map((m) => ({ ...m, me: a[m.k], zk: z[m.k], d: pctOf(list, m.k, a[m.k]) - pctOf(list, m.k, z[m.k]) }))
    .sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
}
// 全国とのちがいとして書く大きさ：市区町村の中の位置で2割以上
const ZEN_BIG = 0.2;

// 65歳以上のひとり暮らし（65歳以上の人のうちの割合）。全国との差で言い回しをえらぶ。順位にはしない
export function hitori65Text(a, z) {
  if (!(a.age65 > 0) || a.single65 == null) return '';
  const r = (a.single65 / a.age65) * 100;
  const zr = (z.single65 / z.age65) * 100;
  if (r >= zr + 3) return `65歳以上の人のうち${p1(r)}がひとり暮らしで、全国の${p1(zr)}より高い割合です。`;
  if (r <= zr - 3) return `65歳以上の人のうちひとり暮らしの人は${p1(r)}で、全国の${p1(zr)}より低い割合です。`;
  // 言い回しは人数の大きさでえらぶ（11/8 夜 #70。書く数字は同じ）
  if (a.single65 >= 20000 && [...`${a.name}`].length <= 6) return `${a.name}では65歳以上の${n0(a.single65)}人がひとり暮らしで、65歳以上の人の${p1(r)}にあたります。`;
  if (a.single65 >= 8000) return `ひとり暮らしの65歳以上の人は${n0(a.single65)}人いて、65歳以上の人の${p1(r)}です。`;
  return `65歳以上でひとり暮らしの人は${n0(a.single65)}人で、65歳以上の人のうち${p1(r)}です。`;
}

// 65歳以上の人のうち75歳以上の割合（#85。小さい街でもその街の数字が1文入るように）。数字を並べるだけで、多い・少ないは言わない。順位にはしない
//   言い回しは人数の大きさでえらぶ（書く数字は同じ）
export function age75Text(a, z) {
  if (!(a.age65 > 0) || !(a.age75 >= 0) || !(z.age65 > 0)) return '';
  const r = p1((a.age75 / a.age65) * 100);
  const zr = p1((z.age75 / z.age65) * 100);
  const nm = a.name;
  if (a.age75 >= 50000) return `75歳以上の人は${n0(a.age75)}人で、65歳以上の人のうち${r}です。全国は${zr}です。`;
  if (a.age75 >= 10000) return fit60(`${nm}の65歳以上の人のうち、75歳以上は${r}で、全国は${zr}です。`, `65歳以上の人のうち、75歳以上は${r}で、全国は${zr}です。`);
  return fit60(`${nm}の75歳以上は${n0(a.age75)}人で、65歳以上の人の${r}です。全国は${zr}です。`, `75歳以上は${n0(a.age75)}人で、65歳以上の人の${r}です。全国は${zr}です。`);
}

// 人口密度を県全体とくらべる文（#85）。倍率で言い回しをえらぶ。順位にはしない
export function densityText(a, p) {
  if (!(a.density > 0) || !(p?.density > 0)) return '';
  const pn = prefOf(a.code).name;
  const d = n0(a.density);
  const pd = n0(p.density);
  const r = a.density / p.density;
  if (r >= 1.25) {
    const b = bai(r);
    return fit60(`${a.name}の人口密度は1km²あたり${d}人で、${pn}全体の${pd}人の${b}です。`, `人口密度は1km²あたり${d}人で、${pn}全体の${b}です。`);
  }
  if (r < 0.01) return fit60(`${a.name}の1km²あたりの人口は${d}人で、${pn}全体の${pd}人の1%に届かない数です。`, `1km²あたりの人口は${d}人で、${pn}全体の${pd}人の1%に届きません。`);
  if (r <= 0.8) return fit60(`${a.name}の1km²あたりの人口は${d}人で、${pn}全体の${pd}人の${Math.round(r * 100)}%ほどです。`, `1km²あたりの人口は${d}人で、${pn}全体の${pd}人の${Math.round(r * 100)}%ほどです。`);
  return fit60(`${a.name}の1km²あたりの人口は${d}人で、${pn}全体の${pd}人に近い数です。`, `1km²あたりの人口は${d}人で、${pn}全体の${pd}人に近い数です。`);
}

// 避難場所の災害の種類ごとの数から作る文（#85）。kinds は [種類の名前, 数] を多い順に（0は除く）、h0 は指定緊急避難場所の数
//   その街の中の数だけを書く。人口あたり・順位・街どうしのくらべにはしない
export function hinanKindsText(name, h0, kinds) {
  if (!(h0 > 0) || !kinds.length) return [];
  const [[t, v]] = kinds;
  const sh = Math.round((v / h0) * 100);
  const out = [
    v >= h0
      ? fit60(`${name}の指定緊急避難場所は、${n0(h0)}か所のすべてが${t}の指定を受けています。`, `${n0(h0)}か所のすべてが${t}の指定を受けています。`)
      : sh >= 80
        ? `${t}の指定がある場所は${n0(v)}か所で、指定緊急避難場所の${sh}%です。`
        : sh >= 50
          ? fit60(`${name}の指定緊急避難場所${n0(h0)}か所のうち、${t}の指定は${n0(v)}か所です。`, `指定緊急避難場所${n0(h0)}か所のうち、${t}の指定は${n0(v)}か所です。`)
          : `種類ごとでいちばん多い${t}でも${n0(v)}か所で、全体の${sh}%です。`,
  ];
  const rest = kinds.slice(1);
  const [lt, lv] = kinds[kinds.length - 1];
  if (!rest.length) out.push('ほかの種類の指定は、このデータには載っていません。');
  else if (rest.length <= 2) out.push(`ほかに${rest.map(([k, x]) => `${k}${n0(x)}か所`).join('・')}の指定があります。`);
  else if (kinds.length >= 6) out.push(`${kinds.length}つの種類に指定があり、いちばん少ないのは${lt}の${n0(lv)}か所です。`);
  else out.push(fit60(`ほかの${rest.length}つの種類では、${rest[0][0]}が${n0(rest[0][1])}か所、${lt}が${n0(lv)}か所です。`, `${lt}の指定は${n0(lv)}か所です。`));
  return out;
}

// 100人の村の全国とのちがい（v・n は machi-tools の village の答え）。2人以上ちがうものを大きい順に2つまで
export function villageText(name, v, n) {
  const L = [['kids', '子ども'], ['work', '働く世代'], ['old', 'お年寄り'], ['alone', 'ひとり暮らし']];
  const ds = L.map(([k, l]) => ({ l, me: v[k], zk: n[k], d: v[k] - n[k] })).filter((x) => Math.abs(x.d) >= 2).sort((x, y) => Math.abs(y.d) - Math.abs(x.d));
  if (!ds.length) return '全国を100人にしたときと、4つとも1人以内の差です。';
  const [x, y] = ds;
  // 言い回しは差の大きさでえらぶ（11/8 夜 #70。書く数字は同じ）
  const t0 = `${x.l}は全国の${x.zk}人に対して${x.me}人${y ? `、${y.l}は${y.zk}人に対して${y.me}人` : ''}です。`;
  if (Math.abs(x.d) >= 6) return fit60(`全国とのちがいがいちばん大きいのは${x.l}で、${name}は${x.me}人、全国は${x.zk}人です。${y ? `${y.l}は${y.me}人と${y.zk}人です。` : ''}`, t0);
  if (Math.abs(x.d) >= 4) return fit60(`${name}の村では${x.l}が${x.me}人で、全国の村なら${x.zk}人です。${y ? `${y.l}は${y.me}人で、全国なら${y.zk}人です。` : ''}`, t0);
  return t0;
}

// 似ている街の1つめとのちがいが最も大きい数字（machi-core の mtVec の並び。S は kazu.s）
//   大きい・小さいは言わない。人口は倍率で書く
const NITERU = [
  { label: '人口', show: (r) => `${n0(r[3])}人` },
  { label: '15歳未満の割合', show: (r) => p1(r[4] / 10) },
  { label: '65歳以上の割合', show: (r) => p1(r[5] / 10) },
  { label: '5年の人口の増減', show: (r) => sg(r[6] / 10) },
  { label: 'ひとり暮らしの割合', show: (r) => p1(r[7] / 10) },
  { label: '共同住宅の割合', show: (r) => p1(r[8] / 10) },
];
const vec = (r) => [Math.log(r[3]), r[4] / 10, r[5] / 10, r[6] / 10, r[7] / 10, r[8] / 10];
export function niteruDiff(me, b, S) {
  const va = vec(me);
  const vb = vec(b);
  const ds = va.map((v, i) => ({ i, d: (vb[i] - v) / S[i][1] })).filter(({ i }) => NITERU[i].show(me) !== NITERU[i].show(b));
  if (!ds.length) return null;
  const top = ds.sort((x, y) => Math.abs(y.d) - Math.abs(x.d))[0];
  const m = NITERU[top.i];
  return { i: top.i, label: m.label, a: m.show(me), b: m.show(b), ratio: top.i === 0 ? b[3] / me[3] : null };
}

// 目盛りの下の文：県の値とくらべる（1画面めより下に出す）。市区町村の中の位置が県の値からはなれている順に2つ
const KEN = [
  { k: 'rate', label: '5年の人口の増減', show: sg },
  { k: 'per', label: '1世帯の人数', show: (v) => `${r1(v).toFixed(1)}人` },
  { k: 'p65', label: '65歳以上の人の割合', show: p1 },
  { k: 'pSingle', label: 'ひとり暮らしの世帯の割合', show: p1 },
  { k: 'pKyodo', label: '共同住宅に住む世帯の割合', show: p1 },
  { k: 'p014', label: '15歳未満の子どもの割合', show: p1 },
];
export function prefScaleText(list, a, p) {
  if (!p) return [];
  const pn = prefOf(a.code).name;
  const ds = KEN.filter((m) => a[m.k] != null && p[m.k] != null && m.show(a[m.k]) !== m.show(p[m.k]))
    .map((m) => ({ ...m, d: Math.abs(pctOf(list, m.k, a[m.k]) - pctOf(list, m.k, p[m.k])) }))
    .sort((x, y) => y.d - x.d);
  if (!ds.length) return [`目盛りの6つの数字は、どれも${pn}の値と同じです。`];
  const [x, y] = ds;
  const nm = a.name;
  const A = (m) => m.show(a[m.k]);
  const P = (m) => m.show(p[m.k]);
  // 言い回しは、県の値からのはなれ方（市区町村の中の位置の差）でえらぶ（11/8 夜 #70。書く数字は同じ）
  const x0 = `${pn}の値とくらべると、${x.label}は${pn}の${P(x)}に対して${A(x)}です。`;
  const y0 = y && `${y.label}は、${pn}の${P(y)}に対して${A(y)}です。`;
  const out = [
    x.d >= 0.35
      ? fit60(`目盛りの数字で${pn}の値からいちばん離れているのは${x.label}で、${nm}は${A(x)}、${pn}は${P(x)}です。`, `${pn}の値からいちばん離れているのは${x.label}で、${nm}は${A(x)}、${pn}は${P(x)}です。`, x0)
      : x.d >= 0.2
        ? fit60(`${pn}全体の${P(x)}とくらべて、${nm}の${x.label}は${A(x)}です。`, x0)
        : x0,
  ];
  if (y) out.push(y.d >= 0.2 ? fit60(`次に離れているのは${y.label}で、${pn}の${P(y)}に対して${A(y)}です。`, y0) : fit60(`${y.label}は、${nm}が${A(y)}、${pn}が${P(y)}です。`, y0));
  return out;
}

// 「県内と全国でくらべると」の文（2〜4文）。返すのは文の配列（エスケープはページの側で）
//   feat：1画面めの特徴の1行（同じ事実をくり返さない）
//   meRow・near1・S・P：kazu.json の行・数字が似ている街の1つめ・物差し・都道府県の名前
export function kurabeText({ list, a, z, feat = '', meRow = null, near1 = null, S = null, P = {} }) {
  const pn = prefOf(a.code).name;
  const nm = a.name;

  // 1. 県内での位置
  //    1a 人口の順位：1番目なら2番目の街とくらべ、ほかはすぐ上とすぐ下の街。1画面めの特徴の1行に人口の順位があれば、順位はくり返さない
  const ranks = prefRanks(list, a).filter((x) => x.rank != null);
  const pop = ranks.find((x) => x.k === 'pop');
  const inPref = list.filter((x) => x.code.slice(0, 2) === a.code.slice(0, 2)).map(ext);
  const byPop = [...inPref].sort((x, y) => y.pop - x.pop);
  const popInFeat = feat.includes(`${pn}の${pop.of}市区町村で、人口が`);
  let s1a = '';
  if (pop.rank === 1 && byPop[1]) {
    const t = bai(a.pop / byPop[1].pop);
    const vs = t ? `2番目の${byPop[1].name}の${t}です。` : `2番目の${byPop[1].name}とほぼ同じです。`;
    s1a = popInFeat ? `人口は、${pn}で${vs}` : `${pn}の${pop.of}市区町村のうち、${nm}は人口がいちばん多い街です。人口は${vs}`;
  } else if (pop.rank > 1) {
    const up = byPop[pop.rank - 2];
    const dn = byPop[pop.rank];
    // 言い回しは順位でえらぶ（11/8 夜 #70。上位3つ・県内の上半分・下半分）
    const nb0 = dn ? `人口ですぐ上は${up.name}、すぐ下は${dn.name}です。` : `人口ですぐ上は${up.name}です。`;
    const nb = !dn ? nb0 : pop.rank <= 3 ? `人口の順では${up.name}と${dn.name}のあいだです。` : pop.rank * 2 <= pop.of ? nb0 : `人口が1つ上の街は${up.name}、1つ下は${dn.name}です。`;
    const mk = (b) => (popInFeat ? `${pn}のなかで、${b}` : `${pn}の${pop.of}市区町村のうち、${nm}は人口が${pop.rank}番目に多い街です。${b}`);
    s1a = fit60(mk(nb), mk(nb0));
  }

  // 2. 全国の値とくらべる数字を1つか2つ（市区町村の中の位置が、全国の値の位置からはなれている順）
  //    1つめは、人口の減り方と65歳以上の割合をのぞいた中でいちばんはなれているもの。2つめは2割以上はなれているときだけ
  //    人口が増えた街の増減は 3. で書くのでのぞく。大きい・小さいは言わず、両方の値を書く
  const zd = zenkokuDiffs(list, a, z).filter((m) => !(m.k === 'rate' && a.rate > 0));
  const m1 = zd.find((m) => m.k !== 'rate' && m.k !== 'p65');
  const m2 = m1 && zd.find((m) => m !== m1 && Math.abs(m.d) >= ZEN_BIG);
  const big = [m1, m2].filter(Boolean);
  const zen = [];
  // 言い回しは全国の値からのはなれ方でえらぶ（11/8 夜 #70。書く数字は同じ）
  if (m1) {
    const d = Math.abs(m1.d);
    const z0 = `全国とくらべると、${nm}の${m1.label}は${m1.show(m1.me)}で、全国は${m1.show(m1.zk)}です。`;
    zen.push(
      d >= 0.28
        ? fit60(`全国の値から離れている数字の1つは${m1.label}で、${nm}は${m1.show(m1.me)}、全国は${m1.show(m1.zk)}です。`, z0)
        : d >= 0.18
          ? fit60(`${m1.label}を全国とならべると、${nm}は${m1.show(m1.me)}、全国は${m1.show(m1.zk)}です。`, z0)
          : z0,
    );
  }
  if (m2) zen.push(Math.abs(m2.d) >= 0.3 ? fit60(`${m2.label}も全国の${m2.show(m2.zk)}に対して${m2.show(m2.me)}です。`, `${m2.label}は${m2.show(m2.me)}で、全国は${m2.show(m2.zk)}です。`) : `${m2.label}は${m2.show(m2.me)}で、全国は${m2.show(m2.zk)}です。`);

  // 1b. ほかでいちばん上にある順位（上から3番目までか、上の1割）。全国とのちがいで書く数字と、人口と同じ順位の世帯の数はのぞく
  const top = ranks
    .filter((x) => x.k !== 'pop' && !(x.k === 'hh' && x.rank === pop.rank) && !big.some((m) => m.k === x.k))
    .filter((x) => x.rank <= 3 || x.rank / x.of <= 0.1)
    .sort((x, y) => x.rank / x.of - y.rank / y.of)[0];
  let s1b = '';
  if (top) {
    const first = inPref.filter((x) => x[top.k] != null).sort((x, y) => y[top.k] - x[top.k])[0];
    if (top.rank === 1) s1b = pop.rank === 1 ? `${nm}は、${top.name}も${pn}でいちばん${ADJ[top.adj][0]}街です。` : `${nm}は、${top.name}が${pn}でいちばん${ADJ[top.adj][0]}街です。`;
    else s1b = `${top.name}は${pn}で${top.rank}番目に${ADJ[top.adj][1]}、1番目は${first.name}です。`;
  }

  // 3. 5年で人口が増えた街は増え方（県内で増えた街のなかでの、増えた人数の順位）
  let s3 = '';
  if (a.rate > 0) {
    const up = inPref.filter((x) => x.rate > 0).sort((x, y) => y.popChange - x.popChange);
    const r = up.findIndex((x) => x.code === a.code) + 1;
    const all = list.filter((x) => x.rate > 0).sort((x, y) => y.popChange - x.popChange);
    const r2 = all.findIndex((x) => x.code === a.code) + 1;
    const head = `人口は5年で${ab(a.rate)}増えました。`;
    if (feat.includes('人口が増えた') && up.length <= 5) s3 = `${head}増えた人数は、全国で増えた${all.length}市区町村のうち${r2}番目です。`;
    else if (up.length === 1) s3 = `${head}${pn}で人口が増えたのは${nm}だけです。`;
    else if (r === 1) s3 = `${head}${pn}で増えた${up.length}市区町村のなかで、増えた人数がいちばん多い街です。`;
    else s3 = `${head}増えた人数は、${pn}で増えた${up.length}市区町村のうち${r}番目です。`;
  }

  // 4. 数字がいちばん似ている街とのちがいが最も大きい数字（大きい・小さいは言わない。人口は倍率）
  let s4 = '';
  if (meRow && near1 && S) {
    const bn = near1[0].slice(0, 2) === a.code.slice(0, 2) ? near1[1] : `${near1[1]}（${P[near1[0].slice(0, 2)]}）`;
    const df = niteruDiff(meRow, near1, S);
    // 言い回しは、ちがいが最も大きい数字（人口・割合のどれか）でえらぶ（11/8 夜 #70）
    const head0 = `数字がいちばん似ているのは${bn}です。`;
    const head = fit60(df && df.i === 0 ? `6つの数字でいちばん近い街は${bn}です。` : df && df.i >= 4 ? `数字の並びが${nm}にいちばん近いのは${bn}です。` : head0, head0);
    const bName = near1[1];
    if (df && df.i === 0) {
      // 人口は倍率で（1倍より大きくなる向きで書く）
      const big = df.ratio >= 1;
      const t = bai(big ? df.ratio : 1 / df.ratio);
      s4 = `${head}ちがいが最も大きいのは人口で、${t ? (big ? `${bName}は${nm}の${t}です。` : `${nm}は${bName}の${t}です。`) : 'ほぼ同じです。'}`;
    } else if (df) {
      // 全国とのくらべで同じ数字を書いたときは、この街の値をくり返さない
      const KEY = [null, 'p014', 'p65', 'rate', 'pSingle', 'pKyodo'][df.i];
      s4 = big.some((m) => m.k === KEY) ? `${head}ちがいが最も大きいのは${df.label}で、${bName}は${df.b}です。` : `${head}ちがいが最も大きいのは${df.label}で、${nm}の${df.a}に対して${df.b}です。`;
    }
  }

  // 4文までえらぶ（先にえらぶ順：人口の順位・全国とのちがい1つめ・増え方・似ている街・ほかの順位・全国とのちがい2つめ）
  const cand = [
    [s1a, 1],
    [zen[0], 3],
    [s3, 5],
    [s4, 6],
    [s1b, 2],
    [zen[1], 4],
  ].filter(([t]) => t);
  return cand
    .slice(0, 4)
    .sort((x, y) => x[1] - y[1])
    .map(([t]) => t);
}

// 「人口が近い街」の表の上の1文：全国で人口が近い街の5年の増減（増えた街の名前だけを書く。減り方はくらべない）
export function nearText(a, near) {
  const nm = a.name;
  const up = near.filter((x) => x.rate > 0);
  const head = `全国で人口が${nm}に近い${near.length}つの街`;
  const names = up.map((x) => x.name).join('と');
  if (up.length === near.length) return a.rate > 0 ? `${head}も、どれも5年で人口が増えています。` : `${head}は、どれも5年で人口が増えています。`;
  if (a.rate > 0 && up.length) return `${head}のうち、${nm}と同じく人口が増えたのは${names}です。`;
  if (a.rate > 0) return `${head}は、どれも5年で人口が減っています。`;
  if (up.length) return `${head}のうち、5年で人口が増えたのは${names}です。`;
  return `${head}も、5年で人口が減っています。`;
}

// 「数字が似ている街」の表の上の文：自分と似ている街（near）で、幅がいちばんせまい数字を2つ（全国の散らばりでならした幅）
//   人口は表にあるのでのぞく。r は kazu.json の行、S は物差し
export function niteruText(me, near, S) {
  if (!me || !near.length) return '';
  const rows = [me, ...near];
  const w = NITERU.map((m, i) => ({ m, i }))
    .filter(({ i }) => i > 0)
    .map(({ m, i }) => {
      const v = rows.map((r) => vec(r)[i]);
      const lo = rows[v.indexOf(Math.min(...v))];
      const hi = rows[v.indexOf(Math.max(...v))];
      return { m, w: (Math.max(...v) - Math.min(...v)) / S[i][1], lo: m.show(lo), hi: m.show(hi) };
    })
    .sort((x, y) => x.w - y.w)
    .slice(0, 2);
  // 言い回しは、2つめの数字の幅（全国の散らばりでならした幅）でえらぶ（11/8 夜 #70。書く数字は同じ）
  const n = rows.length;
  const [x, y] = w;
  const rng = (v, a, b) => (v.lo === v.hi ? a : b);
  const t0 = `この${n}つの街の${rng(x, `${x.m.label}はどれも${x.lo}です。`, `${x.m.label}は${x.lo}から${x.hi}のあいだです。`)}${rng(y, `${y.m.label}はどれも${y.lo}です。`, `${y.m.label}は${y.lo}から${y.hi}のあいだです。`)}`;
  if (y.w >= 0.4) {
    return fit60(`この${n}つの街の${rng(x, `${x.m.label}はどれも${x.lo}です。`, `${x.m.label}は${x.lo}から${x.hi}のあいだです。`)}${rng(y, `${y.m.label}もどれも${y.lo}です。`, `${y.m.label}は${y.lo}から${y.hi}まで開きがあります。`)}`, t0);
  }
  if (y.w >= 0.2) {
    return fit60(`${n}つの街で${rng(x, `${x.m.label}がどれも${x.lo}と同じです。`, `${x.m.label}がそろっていて、${x.lo}から${x.hi}に入ります。`)}${rng(y, `${y.m.label}もどれも${y.lo}です。`, `${y.m.label}は${y.lo}から${y.hi}の幅です。`)}`, t0);
  }
  return t0;
}

// 「この街の数字」の下の文：5年の世帯の数の変わり方（人口の増減との組み合わせで言い回しをえらぶ）
//   人口と世帯の増減の差が1未満のときだけ「近い」
export function setaiText(a) {
  const nm = a.name;
  if (!(a.hh2020 > 0)) return '';
  const hr = ((a.hh - a.hh2020) / a.hh2020) * 100;
  const from = `世帯の数は${n0(a.hh2020)}から${n0(a.hh)}`;
  const near = Math.abs(hr - a.rate) < 1;
  if (a.rate <= 0 && hr > 0) {
    return hr >= 2 ? `人口は減りましたが、${from}へ${ab(hr)}増えました。1世帯の人数が少なくなっています。` : `人口が減るなかで、${nm}の${from}へ${ab(hr)}増えました。`;
  }
  if (a.rate <= 0) return near ? `${from}へ${ab(hr)}減り、人口の${ab(a.rate)}と近い減り方です。` : `${from}へ${ab(hr)}減りました。人口の減り方は${ab(a.rate)}です。`;
  if (hr <= 0) return `人口は増えましたが、${from}へ${ab(hr)}減りました。`;
  if (near) return `${from}へ${ab(hr)}増え、人口の${ab(a.rate)}と近い増え方です。`;
  return hr > a.rate ? `${from}へ${ab(hr)}増え、人口の${ab(a.rate)}より大きく増えました。` : `${from}へ${ab(hr)}増えました。人口の増え方の${ab(a.rate)}より小さい数です。`;
}

// 都道府県ページ「県内の街の幅」（10/31 夜 #47）：県内の市区町村の数字の幅から作る文（データの条件ごとの言い回し）
//   p は県の derive。人口が少ない町村は数字が大きく動くので、幅は人口 HABA_MIN 人以上の市区町村で見る（そう書く）
//   名前を出すのは大きい側だけ。少ない側・低い側は数字だけ。65歳以上の割合と人口の減り方の順位は作らない
export const HABA_MIN = 10000;
export function prefRangeText(list, p) {
  const all = list.filter((x) => x.code.slice(0, 2) === p.code.slice(0, 2)).map(ext);
  if (all.length < 2) return [];
  const pn = prefOf(p.code).name;
  const out = [];
  // 人口：いちばん多い街に県の人口の何割が住むか（全部の市区町村で）
  const big = [...all].sort((x, y) => y.pop - x.pop)[0];
  const share = (big.pop / p.pop) * 100;
  out.push(share >= 30 ? `人口がいちばん多い${big.name}に、${pn}の人口の${p1(share)}が住んでいます。` : `人口がいちばん多い${big.name}でも、${pn}の人口の${p1(share)}です。`);
  const small = all.filter((x) => x.pop < HABA_MIN).length;
  const inPref = all.filter((x) => x.pop >= HABA_MIN);
  if (small) out.push(`人口${HABA_MIN / 10000}万人未満の${small}市町村をのぞき、ここから下の幅は${inPref.length}市区町村で見ます。`);
  if (inPref.length < 2) return out;
  const hiLo = (k) => {
    const s = inPref.filter((x) => x[k] != null).sort((x, y) => y[k] - x[k] || (x.code < y.code ? -1 : 1));
    return [s[0], s[s.length - 1]];
  };
  // 5年の増減：増えた街の名前だけ（減った街の順位は作らない）
  const up = inPref.filter((x) => x.rate > 0).sort((x, y) => y.rate - x.rate);
  if (up.length === 1) out.push(`5年で人口が増えたのは${up[0].name}で、${ab(up[0].rate)}増えました。`);
  else if (up.length > 1) out.push(`人口が増えた${up.length}市区町村のうち、増えた割合がいちばん大きいのは${up[0].name}の${ab(up[0].rate)}です。`);
  else out.push(`${small ? `この${inPref.length}市区町村に` : ''}5年で人口が増えた街はなく、${pn}全体の増減は${sg(p.rate)}でした。`);
  // 1世帯の人数
  const [pmax, pmin] = hiLo('per');
  out.push(`1世帯の人数がいちばん多いのは${pmax.name}の${r1(pmax.per).toFixed(1)}人で、少ない街は${r1(pmin.per).toFixed(1)}人です。`);
  // ひとり暮らし・共同住宅：幅の広さで言い回しをえらぶ
  const [smax, smin] = hiLo('pSingle');
  if (smax.pSingle - smin.pSingle >= 20) out.push(`ひとり暮らしの世帯の割合は街によって大きくちがい、${smax.name}の${p1(smax.pSingle)}から${p1(smin.pSingle)}まであります。`);
  else out.push(`ひとり暮らしの世帯の割合は、いちばん高い${smax.name}で${p1(smax.pSingle)}、低い街で${p1(smin.pSingle)}です。`);
  const [kmax, kmin] = hiLo('pKyodo');
  if (kmax.pKyodo >= 50) out.push(`共同住宅に住む世帯は${kmax.name}で${p1(kmax.pKyodo)}と半分をこえ、低い街では${p1(kmin.pKyodo)}です。`);
  else out.push(`共同住宅に住む世帯の割合は、いちばん高い${kmax.name}で${p1(kmax.pKyodo)}です。`);
  // 15歳未満（高い順だけ）
  const [kid] = hiLo('p014');
  out.push(`15歳未満の子どもの割合がいちばん高いのは${kid.name}の${p1(kid.p014)}で、${pn}全体は${p1(p.p014)}です。`);
  return out;
}

// 県内の街の読み解き（11/9 夜 #72）。県の中の街どうし・県の中の内訳だけを書く（県と県はくらべない・減り方と高齢化の順位は作らない）
//   返すのは { jinko: [文], up: [文], koureisha: [文] }。増えた街がない県は up が空
const NAMES = (xs) => xs.map((x) => x.name).join('・');
export function prefReadText(list, p) {
  const all = list.filter((x) => x.code.slice(0, 2) === p.code.slice(0, 2)).sort((x, y) => y.pop - x.pop || (x.code < y.code ? -1 : 1));
  const pn = prefOf(p.code).name;
  const n = all.length;
  const jinko = [];
  if (n >= 2) {
    // 人口の多い順に足して、県の人口の半分をこえるまでの街の数
    let k = 0;
    let s = 0;
    while (k < n && s * 2 <= p.pop) s += all[k++].pop;
    const rest = ((p.pop - s) / p.pop) * 100;
    if (k === 1) jinko.push(`${pn}の人口の半分より多くが、${all[0].name}1つの街に住んでいます。`);
    else if (k <= 3) jinko.push(fit60(`人口の多い${all.slice(0, k).map((x) => x.name).join('と')}の${k}市区町村を合わせると、${pn}の人口の半分をこえます。`, `人口の多い${k}市区町村を合わせると、${pn}の人口の半分をこえます。`));
    else jinko.push(fit60(`${NAMES(all.slice(0, 3))}から人口の多い順に${k}市区町村を足すと、${pn}の人口の半分をこえます。`, `人口の多い順に${k}市区町村を足すと、${pn}の人口の半分をこえます。`));
    if (n - k >= 2) {
      jinko.push(
        rest >= 45
          ? `残りの${n - k}市区町村にも、${pn}の人口の${p1(rest)}が住んでいます。`
          : rest >= 40
          ? `${pn}の人口の${p1(rest)}は、ほかの${n - k}市区町村に住む人です。`
          : rest >= 25
            ? `残る${n - k}市区町村に住む人は、合わせて${pn}の人口の${p1(rest)}です。`
            : `ほかの${n - k}市区町村の人口は、合わせても${pn}の${p1(rest)}です。`,
      );
    }
  }
  // 5年で人口が増えた街（全部の市区町村。増えた割合の大きい順に3つまで）。ないときは文を出さない
  const up = all.filter((x) => x.rate > 0).sort((x, y) => y.rate - x.rate || (x.code < y.code ? -1 : 1));
  const upText = [];
  if (up.length === 1) upText.push(`町や村もふくめて、2020年より人口が増えた市区町村は${up[0].name}だけです。`);
  else if (up.length <= 3 && up.length) upText.push(fit60(`2020年より人口が増えたのは、増えた割合の大きい順に${NAMES(up)}の${up.length}市区町村です。`, `2020年より人口が増えたのは${NAMES(up)}の${up.length}市区町村です。`));
  else if (up.length) {
    const small = up.filter((x) => x.pop < HABA_MIN).length;
    upText.push(
      fit60(
        small ? `人口1万人未満の小さな街もふくめると、人口が増えたのは${up.length}市区町村です。` : `${n}市区町村のうち、2020年より人口が増えたのは${up.length}です。`,
      ),
      fit60(`増えた割合が大きいのは${NAMES(up.slice(0, 3))}の順です。`, `増えた割合がいちばん大きいのは${up[0].name}です。`),
    );
  }
  // 65歳以上の人がいる世帯（県の中の内訳。街の順位にはしない）→ 高齢の家族がいる家の備えへ
  const koureisha = [];
  if (p.pWith65 != null) {
    const w = p.pWith65;
    koureisha.push(
      w >= 50
        ? `${pn}では、一般世帯の半分をこえる${p1(w)}に65歳以上の人がいます。`
        : w >= 42
          ? `${pn}の一般世帯のうち${p1(w)}は、65歳以上の人がいる世帯です。`
          : `65歳以上の人がいる世帯は、${pn}の一般世帯の${p1(w)}です。`,
    );
    if (p.single65 > 0) koureisha.push(p.single65 >= 300000 ? `ひとり暮らしの65歳以上の人も、${n0(p.single65)}人います。` : p.single65 >= 100000 ? `県内でひとり暮らしをしている65歳以上の人は${n0(p.single65)}人です。` : p.age65 > 0 && (p.single65 / p.age65) * 100 >= 20
          ? `ひとり暮らしの65歳以上の人は${n0(p.single65)}人で、65歳以上の人の${p1((p.single65 / p.age65) * 100)}です。`
          : `ひとり暮らしの65歳以上の人は、${pn}に${n0(p.single65)}人います。`);
  }
  // 県全体の世帯の内訳（ひとり暮らし・共同住宅）。言い回しは割合の大きさでえらぶ
  const setai = [];
  if (p.pSingle != null && p.pKyodo != null) {
    setai.push(
      p.pSingle >= 40
        ? `${pn}では、一般世帯の${p1(p.pSingle)}がひとり暮らしです。`
        : p.pSingle >= 33
          ? `${pn}の一般世帯のうち、ひとり暮らしは${p1(p.pSingle)}です。`
          : `ひとり暮らしの世帯は、${pn}の一般世帯の${p1(p.pSingle)}です。`,
      p.pKyodo >= 50 ? `住宅に住む世帯の半分をこえる${p1(p.pKyodo)}が、共同住宅に住んでいます。` : p.pKyodo >= 30 ? `共同住宅に住む世帯は、住宅に住む世帯の${p1(p.pKyodo)}です。` : `住宅に住む世帯のうち、共同住宅は${p1(p.pKyodo)}で、ほかは一戸建てなどです。`,
    );
  }
  return { jinko, up: upText, koureisha, setai };
}

// 県内の避難場所の顔ぶれ（data/hinan/counts.json の県内の市区町村の合計。11/9 夜 #72）
//   人口あたり・順位・県どうしのくらべには使わない。0か所の災害の種類は書かない
export function prefHinanText(hinan, prefCode) {
  const rows = Object.entries(hinan.areas).filter(([c]) => c.slice(0, 2) === prefCode).map(([, r]) => r);
  if (!rows.length) return null;
  const basho = rows.reduce((s, r) => s + r[0], 0);
  const hinanjo = rows.reduce((s, r) => s + r[1], 0);
  const kinds = hinan.kinds.map(([k, name], i) => ({ k, name, v: rows.reduce((s, r) => s + (r[3 + i] || 0), 0) })).filter((x) => x.v > 0).sort((x, y) => y.v - x.v);
  const pn = prefByCode.get(prefCode).name;
  const out = [];
  // 言い回しは、多い2つの種類の数の近さでえらぶ（書く数字は同じ）
  if (basho > 0 && kinds.length >= 2) {
    const [x, y] = kinds;
    out.push(
      y.v >= x.v * 0.85
        ? fit60(`${pn}の指定緊急避難場所${n0(basho)}か所のうち、${x.name}に使える所は${n0(x.v)}か所で、${y.name}も${n0(y.v)}か所あります。`, `指定緊急避難場所${n0(basho)}か所のうち、${x.name}に使える所は${n0(x.v)}か所で、${y.name}も${n0(y.v)}か所です。`)
        : fit60(`${pn}に${n0(basho)}か所ある指定緊急避難場所は、${x.name}に使える所が${n0(x.v)}か所、${y.name}が${n0(y.v)}か所です。`, `${n0(basho)}か所ある指定緊急避難場所は、${x.name}に使える所が${n0(x.v)}か所、${y.name}が${n0(y.v)}か所です。`),
    );
  }
  else if (basho > 0 && kinds.length) out.push(`${pn}の指定緊急避難場所は${n0(basho)}か所で、${kinds[0].name}に使える所が${n0(kinds[0].v)}か所です。`);
  // 火山・津波は、載っている県だけ
  const kazan = kinds.find((x) => x.k === 'kazan');
  const tsunami = kinds.find((x) => x.k === 'tsunami');
  // 3番めに多い種類（火山・津波は、載っている県だけ別の言い回し）
  const third = kinds[2];
  if (kazan && kinds.indexOf(kazan) > 1) out.push(`火山の災害に使える所も、${n0(kazan.v)}か所が載っています。`);
  else if (tsunami && kinds.indexOf(tsunami) > 1) out.push(`津波のときに使える所は${n0(tsunami.v)}か所です。`);
  if (third && third !== kazan && third !== tsunami) out.push(`3番めに多いのは${third.name}で、${n0(third.v)}か所です。`);
  if (hinanjo > basho) out.push(`家に戻れないときに過ごす指定避難所は${n0(hinanjo)}か所で、指定緊急避難場所より多く載っています。`);
  else if (hinanjo >= basho * 0.75) out.push(`家に戻れないときに過ごす指定避難所は、${n0(hinanjo)}か所が載っています。`);
  else if (hinanjo > 0) out.push(`指定避難所は${n0(hinanjo)}か所で、家に戻れないときに過ごす所です。`);
  return { basho, hinanjo, rows: rows.length, text: out };
}
