// クイズのデータ（ページを作るときに国勢調査の数字・items.yml から作る。文はデータの条件ごとの言い回し）
// 決まり（設計 3章）：回答は集めない（ブラウザの中で判定）・答えに出典と時点・正解は赤ペンの丸だけ・広告はクイズのページに置かない
//   人口の減り方・高齢化の高さなど、住む人が気にする題は出さない。同点や表示が同じになる問題は出さない
// 問題の作り方（ブラウザでも使う部品）は quiz-core.mjs
import { derive, prefOf, muniList } from './stats.mjs';
import { need } from './calc.mjs';
import { PREFS } from './areas.mjs';
import { srcTitle } from './layout.mjs';

// くらべる数字（どっちが多い・ドボンクイズで使う）
// digits：表示の小数のけた。store：machi.json に入れるけた。diff：どっちが多いで出す最小の差。rel：数の大きいものの最小の割合の差
export const METRICS = [
  { key: 'pop', q: '人口が多いのは？', top: '人口が多い', unit: '人', digits: 0, store: 0, rel: 0.03 },
  { key: 'hh', q: '世帯の数が多いのは？', top: '世帯の数が多い', unit: '世帯', digits: 0, store: 0, rel: 0.03 },
  { key: 'menseki', q: '面積が広いのは？', top: '面積が広い', unit: 'km²', digits: 0, store: 1, rel: 0.05 },
  { key: 'density', q: '人口密度（1km²あたりの人口）が高いのは？', top: '人口密度が高い', unit: '人/km²', digits: 0, store: 1, rel: 0.05 },
  { key: 'per', q: '1世帯の平均人数が多いのは？', top: '1世帯の平均人数が多い', unit: '人', digits: 2, store: 3, diff: 0.05 },
  { key: 'p014', q: '子ども（15歳未満）の割合が高いのは？', top: '子ども（15歳未満）の割合が高い', unit: '%', digits: 1, store: 2, diff: 0.5 },
  { key: 'p1564', q: '15〜64歳の人の割合が高いのは？', top: '15〜64歳の人の割合が高い', unit: '%', digits: 1, store: 2, diff: 0.5 },
  { key: 'pSingle', q: 'ひとり暮らしの世帯の割合が高いのは？', top: 'ひとり暮らしの世帯の割合が高い', unit: '%', digits: 1, store: 2, diff: 1 },
  { key: 'pKyodo', q: '共同住宅（マンション・アパートなど）に住む世帯の割合が高いのは？', top: '共同住宅に住む世帯の割合が高い', unit: '%', digits: 1, store: 2, diff: 2 },
  { key: 'pIkko', q: '一戸建てに住む世帯の割合が高いのは？', top: '一戸建てに住む世帯の割合が高い', unit: '%', digits: 1, store: 2, diff: 2 },
];

export const show = (m, v) => (m.digits ? Number(v).toFixed(m.digits) : Math.round(v).toLocaleString('ja-JP'));
const keep = (m, v) => (Number.isFinite(v) ? Number(Number(v).toFixed(m.store)) : null);

// クイズで使う割合（stats.mjs の derive にないもの）
export const plus = (a) => ({ ...a, p1564: a.pop ? (a.age1564 / a.pop) * 100 : null, pIkko: a.housed ? (a.ikkodate / a.housed) * 100 : null });

// 同じ入力からは同じ問題（ビルドの結果が毎回同じになるように）
export function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// /quiz/machi.json：都道府県47と全国の市区町村（クイズのページが開いたときに読む）
//   市区町村の行の最後は読みがな（この街はどこ？で使う。data/yomi.json がないときは ''）
export function machiData(areas, urlOf, yomi = null) {
  const vals = (a) => METRICS.map((m) => keep(m, a[m.key]));
  const prefs = PREFS.map((p) => [p.code, p.name, p.slug, ...vals(plus(derive(areas[`${p.code}000`])))]);
  const munis = muniList(areas)
    .map(plus)
    .sort((x, y) => (x.code < y.code ? -1 : 1))
    .map((a) => [a.code, a.name, urlOf(a.code) ?? 0, ...vals(a), yomi?.munis?.[a.code] ?? '']);
  return { m: METRICS.map((m) => [m.q, m.top, m.unit, m.digits, m.diff ?? 0, m.rel ?? 0]), prefs, munis };
}

const yen = (n) => n.toLocaleString('ja-JP');
const shuffle = (arr, r) => {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(r() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
};

// わたしの街クイズ（市区町村ページ）：データから作れるものを全部（3問ずつ見せて「ほかの問題」で入れかえ）。3択か2択
export function machiQuiz(a0, list, near, cityList) {
  const a = plus(a0);
  const pref = prefOf(a.code);
  const r = rng(Number(a.code));
  const inPref = list.filter((x) => x.code.slice(0, 2) === a.code.slice(0, 2)).map(plus);
  const of = inPref.length;
  const rankBy = (key) => [...inPref].sort((x, y) => y[key] - x[key]);
  const qs = [];
  const rankQ = (key, verb, valText) => {
    const s = rankBy(key);
    const rank = s.findIndex((x) => x.code === a.code) + 1;
    const cand = [rank - 2, rank - 1, rank + 1, rank + 2, rank + 3].filter((n) => n >= 1 && n <= of && n !== rank);
    if (cand.length < 2) return;
    const ch = [rank, ...shuffle(cand, r).slice(0, 2)].sort((x, y) => x - y);
    qs.push({
      q: `${a.name}の${verb.q}は、${pref.name}の${of}市区町村で何番目に${verb.adj}？`,
      ch: ch.map((n) => `${n}番目`),
      a: ch.indexOf(rank),
      ex: `${rank}番目。${a.name}は${valText(a)}${rank > 1 ? `、1番目は${s[0].name}（${valText(s[0])}）` : ''}`,
    });
  };
  // 近い値をえらぶ（ほかの2つは off だけずらす。0〜100% の外や同じ表示になるものは使わない）
  const nearQ = (q, v, offs, fmt, ex) => {
    const cand = offs.map((o) => v + o).filter((x) => x > 0 && (fmt(x).includes('%') ? x < 100 : true) && fmt(x) !== fmt(v));
    if (cand.length < 2) return;
    const ch = shuffle([v, ...shuffle(cand, r).slice(0, 2)], r);
    if (new Set(ch.map(fmt)).size !== 3) return;
    qs.push({ q, ch: ch.map(fmt), a: ch.indexOf(v), ex });
  };

  rankQ('pop', { q: '人口', adj: '多い' }, (x) => `${yen(x.pop)}人`);

  const nearest = near[0];
  const far = cityList.filter((x) => x.code !== a.code && x.code !== nearest?.code && (x.pop > a.pop * 2 || x.pop < a.pop / 2));
  if (nearest && far.length >= 2) {
    const ch = shuffle([nearest, ...shuffle(far, r).slice(0, 2)], r);
    const label = (x) => `${x.name}（${prefOf(x.code).name}）`;
    qs.push({
      q: `全国の市区町村で、人口が${a.name}にいちばん近いのは？`,
      ch: ch.map(label),
      a: ch.indexOf(nearest),
      ex: `${label(nearest)}の${yen(nearest.pop)}人。${a.name}は${yen(a.pop)}人`,
    });
  }

  if (a.menseki > 0) {
    const fmtA = (v) => `約${v >= 100 ? yen(Math.round(v)) : v.toFixed(1)}km²`;
    const ch = shuffle([a.menseki, a.menseki * 0.4, a.menseki * 2.5], r);
    const mr = rankBy('menseki').findIndex((x) => x.code === a.code) + 1;
    qs.push({ q: `${a.name}の面積に近いのは？`, ch: ch.map(fmtA), a: ch.indexOf(a.menseki), ex: `${yen(a.menseki)}km²。${pref.name}の${of}市区町村のうち${mr}番目に広い` });
  }

  rankQ('density', { q: '人口密度（1km²あたりの人口）', adj: '高い' }, (x) => `${yen(Math.round(x.density))}人/km²`);
  rankQ('hh', { q: '世帯の数', adj: '多い' }, (x) => `${yen(x.hh)}世帯`);

  const pct = (v) => `${v.toFixed(1)}%`;
  nearQ(`${a.name}で、ひとり暮らしの世帯の割合に近いのは？`, a.pSingle, [-12, -8, 8, 12], pct, `${pct(a.pSingle)}（一般世帯のうち）`);
  nearQ(`${a.name}の人口のうち、子ども（15歳未満）の割合に近いのは？`, a.p014, [-4, -2.5, 2.5, 4], pct, `${pct(a.p014)}`);
  const per2 = (v) => `${v.toFixed(2)}人`;
  nearQ(`${a.name}の1世帯の平均人数に近いのは？`, a.per, [-0.4, -0.25, 0.25, 0.4], per2, `${per2(a.per)}（一般世帯）`);

  if (a.housed > 0 && Math.abs(a.ikkodate - a.kyodo) / a.housed > 0.05) {
    const more = a.ikkodate > a.kyodo ? 0 : 1;
    qs.push({
      q: `${a.name}で多いのは、一戸建てに住む世帯？ 共同住宅（マンション・アパートなど）に住む世帯？`,
      ch: ['一戸建て', '共同住宅'],
      a: more,
      ex: `一戸建て ${pct((a.ikkodate / a.housed) * 100)}・共同住宅 ${pct((a.kyodo / a.housed) * 100)}（住宅に住む一般世帯のうち）`,
    });
  }

  const sameNear = inPref.filter((x) => x.code !== a.code).sort((x, y) => Math.abs(Math.log(x.pop / a.pop)) - Math.abs(Math.log(y.pop / a.pop)));
  if (sameNear.length >= 6) {
    const right = sameNear[0];
    const others = shuffle(sameNear.slice(3), r).slice(0, 2);
    const ch = shuffle([right, ...others], r);
    qs.push({
      q: `${pref.name}の市区町村で、人口が${a.name}にいちばん近いのは？`,
      ch: ch.map((x) => x.name),
      a: ch.indexOf(right),
      ex: `${right.name}の${yen(right.pop)}人。${a.name}は${yen(a.pop)}人`,
    });
  }
  return qs;
}

// 備えの数字クイズ：items.yml の数字だけで作る。人数と日数はブラウザの中で毎回えらぶ
export function sonaeData(items, sources) {
  const by = Object.fromEntries(items.items.map((it) => [it.id, it]));
  const src = new Map(sources.sources.map((s) => [s.id, s]));
  const name = (id) => {
    const s = src.get(id);
    const [y, mo, d] = String(s.checked).split('-').map(Number);
    return `${s.publisher}${srcTitle(s)}（${y}年${mo}月${d}日確認）`;
  };
  return {
    w: by.mizu.per_day,
    m: by.shushoku.per_day,
    t: by['keitai-toilet'].per_day,
    min: items.days.min,
    better: items.days.better,
    y: items.yohairyo_days,
    gas: by.gas.example_qty,
    src: {
      mizu: name(by.mizu.sources[0]),
      shoku: name(by.shushoku.sources[0]),
      toilet: name(by['keitai-toilet'].sources[0]),
      days: name(items.days.sources[0]),
      y: name(items.yohairyo_sources[0]),
      gas: name(by.gas.sources[0]),
      seikatsu: name('kantei-sonae'),
      rolling: name('maff-guide'),
      bottle: name('maff-sonae'),
    },
  };
}

// 計算の問題の答えと、ほかの2つ（半分と2倍。同じにならないように）
export function calcChoices(per, n, d) {
  const c = need(per, n, d);
  const lo = Math.max(1, Math.round(c / 2));
  const hi = c * 2;
  return [...new Set([lo, c, hi])].length === 3 ? { c, ch: [lo, c, hi] } : null;
}
