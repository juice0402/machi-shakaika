// 本文の字数と、市区町村ページの「型の割合」（連絡 C-019・夜 #47。AdSense の審査に向けて）
//   本文：<main> の中から script・style・svg・header・nav・footer・noscript を除き、ひらがな・カタカナ・漢字・英数字を数える
//   型の割合：市区町村ページの本文の数字を # にして、8字の切れはしを1字ずつずらして作り、
//            その街の切れはしのうち、市区町村ページの半分以上に出るものの割合
//   単体で動かすと一覧を出す：node scripts/honbun.mjs [dist]
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { PREFS } from '../src/areas.mjs';

export const HONBUN_MIN = 600; // 本文の字数の下限（404 をのぞく全ページ）
export const KATA_MAX = 0.5; // 型の割合の上限（市区町村ページ）
const SHINGLE = 8;

const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", nbsp: ' ' };
export function honbunText(html) {
  const m = html.match(/<main\b[^>]*>([\s\S]*)<\/main>/i);
  let s = m ? m[1] : '';
  for (const t of ['script', 'style', 'svg', 'header', 'nav', 'footer', 'noscript']) s = s.replace(new RegExp(`<${t}\\b[\\s\\S]*?<\\/${t}>`, 'gi'), ' ');
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/&(#?\w+);/g, (x, k) => ENT[k] ?? (k.startsWith('#') ? String.fromCodePoint(Number(k.slice(1))) : x))
    .replace(/\s+/g, ' ')
    .trim();
}
const COUNTED = /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ーA-Za-z0-9Ａ-Ｚａ-ｚ０-９]/gu;
export const honbunCount = (text) => (text.match(COUNTED) ?? []).length;

const shingles = (text) => {
  const t = [...text.replace(/[0-9０-９,.%％]/g, '#')];
  const out = new Set();
  for (let i = 0; i + SHINGLE <= t.length; i++) out.add(t.slice(i, i + SHINGLE).join(''));
  return out;
};
// texts：Map(パス → 本文)。返すのは Map(パス → 割合)
export function kataShare(texts) {
  const sets = new Map([...texts].map(([p, t]) => [p, shingles(t)]));
  const df = new Map();
  for (const s of sets.values()) for (const g of s) df.set(g, (df.get(g) ?? 0) + 1);
  const half = sets.size / 2;
  return new Map([...sets].map(([p, s]) => [p, s.size ? [...s].filter((g) => df.get(g) >= half).length / s.size : 0]));
}

const PREF_SLUGS = new Set(PREFS.map((p) => p.slug));
export const isCityPage = (path) => {
  const seg = path.replace(/^\/|\/?(index\.html)?$/g, '').split('/');
  return seg.length === 2 && PREF_SLUGS.has(seg[0]);
};

// dist の全ページを測る：{ pages: [{ path, n }], kata: Map(パス → 割合) }
export function measure(dist = 'dist') {
  const walk = (d) => readdirSync(d).flatMap((x) => (statSync(`${d}/${x}`).isDirectory() ? walk(`${d}/${x}`) : [`${d}/${x}`]));
  const pages = [];
  const cityTexts = new Map();
  for (const f of walk(dist).filter((f) => f.endsWith('.html'))) {
    const path = f.slice(dist.length).replace(/index\.html$/, '');
    const text = honbunText(readFileSync(f, 'utf8'));
    pages.push({ path, n: honbunCount(text) });
    if (isCityPage(path)) cityTexts.set(path, text);
  }
  return { pages, kata: kataShare(cityTexts) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { pages, kata } = measure(process.argv[2] ?? 'dist');
  const short = pages.filter((p) => p.path !== '/404.html' && p.n < HONBUN_MIN).sort((a, b) => a.n - b.n);
  const k = [...kata.values()].sort((a, b) => a - b);
  const pct = (x) => `${Math.round(x * 100)}%`;
  console.log(`本文${HONBUN_MIN}字未満：${short.length}ページ`);
  for (const p of short) console.log(`  ${p.n}\t${p.path}`);
  if (k.length) console.log(`型の割合（市区町村${k.length}）：最小 ${pct(k[0])}・中央 ${pct(k[k.length >> 1])}・最大 ${pct(k[k.length - 1])}・${pct(KATA_MAX)}をこえる ${k.filter((x) => x > KATA_MAX).length}`);
}
