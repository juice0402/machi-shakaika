// クイズのデータ（ページを作るときに国勢調査の数字・items.yml から作る。文はデータの条件ごとの言い回し）
// 決まり（設計 3章）：回答は集めない（ブラウザの中で判定）・答えに出典と時点・正解は赤ペンの丸だけ・広告はクイズのページに置かない
//   人口の減り方・高齢化の高さなど、住む人が気にする題は出さない。同点や表示が同じになる問題は出さない
import { derive, prefOf, r1 } from './stats.mjs';
import { need } from './calc.mjs';

// くらべる数字（どっちが多い・トップ5当て・わたしの街で使う）
// diff：どっちが多いで出す最小の差（同じ単位。数の大きいものは割合 rel も見る）
export const METRICS = [
  { key: 'pop', q: '人口が多いのは？', top: '人口が多い', unit: '人', digits: 0, rel: 0.03 },
  { key: 'hh', q: '世帯の数が多いのは？', top: null, unit: '世帯', digits: 0, rel: 0.03 },
  { key: 'menseki', q: '面積が広いのは？', top: '面積が広い', unit: 'km²', digits: 0, rel: 0.05 },
  { key: 'density', q: '人口密度（1km²あたりの人口）が高いのは？', top: '人口密度が高い', unit: '人/km²', digits: 0, rel: 0.05 },
  { key: 'per', q: '1世帯の平均人数が多いのは？', top: '1世帯の平均人数が多い', unit: '人', digits: 2, diff: 0.05 },
  { key: 'p014', q: '子ども（15歳未満）の割合が高いのは？', top: '子ども（15歳未満）の割合が高い', unit: '%', digits: 1, diff: 0.5 },
  { key: 'pSingle', q: 'ひとり暮らしの世帯の割合が高いのは？', top: 'ひとり暮らしの世帯の割合が高い', unit: '%', digits: 1, diff: 1 },
  { key: 'pKyodo', q: '共同住宅（マンション・アパートなど）に住む世帯の割合が高いのは？', top: '共同住宅に住む世帯の割合が高い', unit: '%', digits: 1, diff: 2 },
];

export const show = (m, v) => (m.digits ? Number(v).toFixed(m.digits) : Math.round(v).toLocaleString('ja-JP'));
const round = (m, v) => (m.digits ? Number(Number(v).toFixed(m.digits)) : Math.round(v));

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

// トップ5当て：都道府県47のお題。5位と6位が表示で同じになるお題は出さない
export function top5Topics(areas) {
  const prefs = Object.values(areas)
    .filter((a) => a.level === '2')
    .map(derive);
  const out = [];
  for (const m of METRICS.filter((x) => x.top)) {
    const s = [...prefs].filter((p) => Number.isFinite(p[m.key])).sort((a, b) => b[m.key] - a[m.key]);
    if (s.length !== 47 || show(m, s[4][m.key]) === show(m, s[5][m.key])) continue;
    out.push({ key: m.key, title: m.top, unit: m.unit, order: s.map((p) => p.code.slice(0, 2)), vals: s.map((p) => show(m, p[m.key])) });
  }
  return out;
}

// どっちが多い：くらべる街（ページのある74の街）と都道府県47の数字。問題はブラウザの中で毎回えらぶ
export function docchiData(areas, cities, urlOf) {
  const row = (a, sub, url, g) => [a.name, sub, url, g, ...METRICS.map((m) => (Number.isFinite(a[m.key]) ? round(m, a[m.key]) : null))];
  const prefs = Object.values(areas)
    .filter((a) => a.level === '2')
    .map(derive)
    .map((a) => row(a, '', `/${prefOf(a.code).slug}/`, 'p'));
  const cs = cities.map((c) => {
    const a = derive(areas[c.code]);
    return row(a, prefOf(a.code).name, urlOf(c.code), 'c');
  });
  return { m: METRICS.map((m) => [m.q, m.unit, m.digits, m.diff ?? 0, m.rel ?? 0]), a: [...cs, ...prefs] };
}

// どっちが多いの2つが問題にできるか（ブラウザの中と同じ決まり。テスト用）
export function fair(m, x, y) {
  if (x == null || y == null || x === y) return false;
  if (m.diff && Math.abs(x - y) < m.diff) return false;
  // 数の大きいもの：差が小さすぎる・3倍より開いている（かんたんすぎる）ものは出さない
  if (m.rel && (Math.abs(x - y) / Math.max(x, y) < m.rel || Math.max(x, y) / Math.min(x, y) > 3)) return false;
  return show(m, x) !== show(m, y);
}

// わたしの街クイズ（市区町村ページ）：県内の人口の順位・人口がいちばん近い街・面積。3択
export function machiQuiz(a, list, near, cityList) {
  const pref = prefOf(a.code);
  const r = rng(Number(a.code));
  const inPref = list.filter((x) => x.code.slice(0, 2) === a.code.slice(0, 2));
  const byPop = [...inPref].sort((x, y) => y.pop - x.pop);
  const rank = byPop.findIndex((x) => x.code === a.code) + 1;
  const of = byPop.length;
  const qs = [];

  // 1. 県内の人口の順位
  const cand = [rank - 2, rank - 1, rank + 1, rank + 2, rank + 3].filter((n) => n >= 1 && n <= of && n !== rank);
  if (cand.length >= 2) {
    const two = cand.sort(() => r() - 0.5).slice(0, 2);
    const ch = [rank, ...two].sort((x, y) => x - y);
    qs.push({
      q: `${a.name}の人口は、${pref.name}の${of}市区町村で何番目に多い？`,
      ch: ch.map((n) => `${n}番目`),
      a: ch.indexOf(rank),
      ex: `${rank}番目。${a.name}は${a.pop.toLocaleString('ja-JP')}人${rank > 1 ? `、1番目は${byPop[0].name}（${byPop[0].pop.toLocaleString('ja-JP')}人）` : ''}`,
    });
  }

  // 2. 人口がいちばん近い街（全国）。ほかの2つは人口が2倍以上ちがう、ページのある街から
  const nearest = near[0];
  const far = cityList.filter((x) => x.code !== a.code && x.code !== nearest.code && (x.pop > a.pop * 2 || x.pop < a.pop / 2));
  if (nearest && far.length >= 2) {
    const pick = [...far].sort(() => r() - 0.5).slice(0, 2);
    const ch = [nearest, ...pick].sort(() => r() - 0.5);
    const label = (x) => `${x.name}（${prefOf(x.code).name}）`;
    qs.push({
      q: `全国の市区町村で、人口が${a.name}にいちばん近いのは？`,
      ch: ch.map(label),
      a: ch.indexOf(nearest),
      ex: `${label(nearest)}の${nearest.pop.toLocaleString('ja-JP')}人。${a.name}は${a.pop.toLocaleString('ja-JP')}人`,
    });
  }

  // 3. 面積（ほかの2つは0.4倍と2.5倍）
  if (a.menseki > 0) {
    const fmtA = (v) => `約${v >= 100 ? Math.round(v).toLocaleString('ja-JP') : v.toFixed(1)}km²`;
    const vals = [a.menseki, a.menseki * 0.4, a.menseki * 2.5];
    const ch = [...vals].sort(() => r() - 0.5);
    const byArea = [...inPref].sort((x, y) => y.menseki - x.menseki);
    const mr = byArea.findIndex((x) => x.code === a.code) + 1;
    qs.push({
      q: `${a.name}の面積に近いのは？`,
      ch: ch.map(fmtA),
      a: ch.indexOf(a.menseki),
      ex: `${a.menseki.toLocaleString('ja-JP')}km²。${pref.name}の${of}市区町村のうち${mr}番目に広い`,
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
    return `${s.publisher}${s.title ? `「${s.title}」` : ''}（${y}年${mo}月${d}日確認）`;
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

export { r1 };
