// 本文の字数と、市区町村ページの「型の割合」（連絡 C-019・夜 #47。AdSense の審査に向けて）
//   本文：<main> の中から script・style・svg・header・nav・footer・noscript を除き、ひらがな・カタカナ・漢字・英数字を数える
//   型の割合：市区町村ページの本文の数字を # にして、8字の切れはしを1字ずつずらして作り、
//            その街の切れはしのうち、市区町村ページの半分以上に出るものの割合
//   地の文：下の jinobunCount（本文から表・見出し・出典・数字の札・クイズを除いた文）
//   単体で動かすと一覧を出す：node scripts/honbun.mjs [dist] [--pages]（--pages で市区町村・都道府県以外のページごとの 地の文・本文）
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { PREFS } from '../src/areas.mjs';

export const HONBUN_MIN = 600; // 本文の字数の下限（404 をのぞく全ページ）
export const KATA_MAX = 0.65; // 型の割合の上限（市区町村ページ）。10/31 しょーくん：1画面めと街クイズの決まった文はそのままにし、今（最大65%）より増やさない線
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

// 地の文（11/8 AdSense のやり直し。claude/machi-adsense-plan.md）：本文から、表・見出し・フォーム・パンくず・出典・数字の札・クイズの問いと答えを除き、
//   p・li・dd・figcaption のうち「数える字が20字以上で、。か、がある」ものだけを数える（li の中のリンクの字は数えない。p を含む li は p の側で数える）
const JINOBUN_SKIP = /\b(crumb|src|big|chg|hh|qq|ex|credit)\b/;
export function jinobunCount(html) {
  const m = html.match(/<main\b[^>]*>([\s\S]*)<\/main>/i);
  let s = m ? m[1] : '';
  for (const t of ['script', 'style', 'svg', 'header', 'nav', 'footer', 'noscript', 'table', 'h1', 'h2', 'h3', 'h4', 'form', 'button', 'select', 'cite'])
    s = s.replace(new RegExp(`<${t}\\b[\\s\\S]*?<\\/${t}>`, 'gi'), ' ');
  let n = 0;
  const add = (tag, attr, inner) => {
    if (/\bhidden\b/.test(attr) || JINOBUN_SKIP.test((attr.match(/class="([^"]*)"/) ?? [])[1] ?? '')) return;
    const body = tag === 'p' ? inner : inner.replace(/<a\b[\s\S]*?<\/a>/gi, ' ');
    const text = honbunText(`<main>${body}</main>`);
    const c = honbunCount(text);
    if (c >= 20 && /[。、]/.test(text)) n += c;
  };
  // p を先に数えて消し、残りの li・dd・figcaption を数える（p を含む li を二重に数えない）
  for (const [, attr, inner] of s.matchAll(/<p\b([^>]*)>([\s\S]*?)<\/p>/gi)) add('p', attr, inner);
  s = s.replace(/<p\b[^>]*>[\s\S]*?<\/p>/gi, ' ');
  for (const [, tag, attr, inner] of s.matchAll(/<(li|dd|figcaption)\b([^>]*)>([\s\S]*?)<\/\1>/gi)) add(tag, attr, inner);
  return n;
}

const PREF_SLUGS = new Set(PREFS.map((p) => p.slug));
const segs = (path) => path.replace(/^\/|\/?(index\.html)?$/g, '').split('/').filter(Boolean);
export const isCityPage = (path) => {
  const seg = segs(path);
  return seg.length === 2 && PREF_SLUGS.has(seg[0]);
};
export const isPrefPage = (path) => {
  const seg = segs(path);
  return seg.length === 1 && PREF_SLUGS.has(seg[0]);
};
// ページのまとまり：top・pref・city・それ以外は1段めの名前（sonae・hinmoku・quiz・dougu など）
export const pageKind = (path) => (segs(path).length === 0 ? 'top' : isCityPage(path) ? 'city' : isPrefPage(path) ? 'pref' : segs(path)[0]);

// 地の文のめやす（11/8 しょーくん：案B「市区町村は残して街ごとに厚く」。claude/machi-adsense-plan.md）
//   null のページ（クイズ・カルテ・プリント・街あつめ帳など広告を置かない道具、このサイトについて、プライバシーポリシー）はめやすなし
//   JINOBUN_STRICT が true なので、めやす・めあてに足りないページで verify-dist が止まる（夜 #75 で true にした。めやすを下げて通さない）
export const JINOBUN_STRICT = true;
// 型の割合のめあて：ためしに測ると、中央50%は水増ししないと届かない（足す文の3割ほどは決まった言い回しになる）ので、中央55%・最大60%
export const KATA_GOAL = { cityMedian: 0.55, cityMax: 0.6, prefMax: 0.6 };
const MEYASU_600 = new Set(['/', '/ranking/jinko/', '/sonae/', '/hinmoku/', '/dougu/check/', '/dougu/keisan/', '/dougu/kigen/', '/kurabe/', '/niteru/', '/koyomi/']);
export function jinobunMeyasu(path) {
  const kind = pageKind(path);
  if (kind === 'city') return 700;
  if (kind === 'pref') return 600;
  if (MEYASU_600.has(path)) return 600;
  if ((kind === 'sonae' || kind === 'hinmoku') && segs(path).length === 2) return 900;
  return null;
}

// dist の全ページを測る：{ pages: [{ path, n, j }], kata: Map(パス → 割合)〔市区町村〕, prefKata: Map〔都道府県〕 }
//   n＝本文の字数・j＝地の文の字数
export function measure(dist = 'dist') {
  const walk = (d) => readdirSync(d).flatMap((x) => (statSync(`${d}/${x}`).isDirectory() ? walk(`${d}/${x}`) : [`${d}/${x}`]));
  const pages = [];
  const cityTexts = new Map();
  const prefTexts = new Map();
  for (const f of walk(dist).filter((f) => f.endsWith('.html'))) {
    const path = f.slice(dist.length).replace(/index\.html$/, '');
    const html = readFileSync(f, 'utf8');
    const text = honbunText(html);
    pages.push({ path, n: honbunCount(text), j: jinobunCount(html) });
    if (isCityPage(path)) cityTexts.set(path, text);
    if (isPrefPage(path)) prefTexts.set(path, text);
  }
  return { pages, kata: kataShare(cityTexts), prefKata: kataShare(prefTexts) };
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const { pages, kata, prefKata } = measure(process.argv.slice(2).find((a) => !a.startsWith('--')) ?? 'dist');
  const short = pages.filter((p) => p.path !== '/404.html' && p.n < HONBUN_MIN).sort((a, b) => a.n - b.n);
  const pct = (x) => `${Math.round(x * 100)}%`;
  const spread = (m) => {
    const k = [...m.values()].sort((a, b) => a - b);
    return `最小 ${pct(k[0])}・中央 ${pct(k[k.length >> 1])}・最大 ${pct(k[k.length - 1])}・${pct(KATA_MAX)}をこえる ${k.filter((x) => x > KATA_MAX).length}`;
  };
  console.log(`本文${HONBUN_MIN}字未満：${short.length}ページ`);
  for (const p of short) console.log(`  ${p.n}\t${p.path}`);
  if (kata.size) console.log(`型の割合（市区町村${kata.size}）：${spread(kata)}`);
  if (prefKata.size) console.log(`型の割合（都道府県${prefKata.size}）：${spread(prefKata)}`);
  // 地の文：まとまりごとの最小・中央・最大と、600字・900字に足りないページの数
  const groups = new Map();
  for (const p of pages.filter((p) => p.path !== '/404.html')) groups.set(pageKind(p.path), [...(groups.get(pageKind(p.path)) ?? []), p]);
  console.log('地の文（まとまり・ページ数・最小・中央・最大・600字未満・900字未満・めやす未満）');
  for (const [k, ps] of [...groups].sort((a, b) => b[1].length - a[1].length)) {
    const js = ps.map((p) => p.j).sort((a, b) => a - b);
    console.log(`  ${k}\t${ps.length}\t${js[0]}\t${js[js.length >> 1]}\t${js[js.length - 1]}\t${js.filter((j) => j < 600).length}\t${js.filter((j) => j < 900).length}\t${ps.filter((p) => jinobunMeyasu(p.path) && p.j < jinobunMeyasu(p.path)).length}`);
  }
  if (process.argv.includes('--pages')) for (const p of pages.filter((p) => !isCityPage(p.path) && !isPrefPage(p.path)).sort((a, b) => (a.path < b.path ? -1 : 1))) console.log(`  ${p.j}\t${p.n}\t${p.path}`);
}
