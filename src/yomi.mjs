// 市区町村と都道府県の読みがな（トップの市区町村さがしで、ひらがな・カタカナでもさがせるように）
// もとは日本郵便の郵便番号データ（読み仮名の小書き版 ken_all.zip。日本郵便は郵便番号データの著作権を主張していない）
// data/yomi.json：{ etag, prefs: { '01': 'ほっかいどう' }, munis: { '01100': 'さっぽろし' } }。scripts/fetch-yomi.mjs が週1回作る
import { existsSync, readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const YOMI_URL = 'https://www.post.japanpost.jp/service/search/zipcode/download/kogaki/zip/ken_all.zip';
const root = fileURLToPath(new URL('../', import.meta.url));
export const YOMI_PATH = `${root}data/yomi.json`;

// 半角カナ → 全角 → ひらがな。空白はとる（ページのさがすスクリプトも同じ変え方をする：src/pages/top.mjs）
export const toHira = (s) =>
  String(s ?? '')
    .normalize('NFKC')
    .replace(/[\s　]/g, '')
    .replace(/[ァ-ヶ]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0x60));

// 郵便番号データの行（[コード, 旧郵便番号, 郵便番号, 県カナ, 市区町村カナ, 町域カナ, 県, 市区町村, 町域, ...]）と
// e-Stat の市区町村（readMunis().areas）から読みを作る
//   町村は e-Stat の名前に郡がない（当別町）ので、郵便番号データの「石狩郡当別町」の読みから郡の分を外す
//   政令市そのもの（堺市）は郵便番号データに行がないので、区の読み（さかいしさかいく・さかいしきたく…）の共通の頭から作る
export function buildYomi(rows, areas) {
  const prefs = {};
  const post = new Map();
  for (const r of rows) {
    if (r.length < 9 || !/^\d{5}$/.test(r[0])) continue;
    const pc = r[0].slice(0, 2);
    if (!prefs[pc] && r[3]) prefs[pc] = toHira(r[3]);
    if (!post.has(r[0])) post.set(r[0], { kana: toHira(r[4]), kanji: r[7] });
  }
  const munis = {};
  const missing = [];
  for (const a of Object.values(areas)) {
    if ((a.level !== '4' && a.level !== '6') || a.code === '13100') continue;
    const p = post.get(a.code);
    let y = null;
    if (p) {
      y = p.kana;
      // 「〇〇郡当別町」→ 郡の読みのあとから。郡の読みは「ぐん」で終わる
      if (p.kanji !== a.name && p.kanji.endsWith(a.name) && p.kanji.slice(0, -a.name.length).endsWith('郡')) {
        const i = y.indexOf('ぐん');
        if (i > 0) y = y.slice(i + 2);
      }
    } else {
      // 政令市：区の読みの共通の頭を、最後の「し」までにする
      const wards = Object.values(areas)
        .filter((w) => w.parent === a.code && post.has(w.code) && post.get(w.code).kanji.startsWith(a.name))
        .map((w) => post.get(w.code).kana);
      if (wards.length >= 2) {
        let head = wards[0];
        for (const w of wards) while (!w.startsWith(head)) head = head.slice(0, -1);
        head = head.slice(0, head.lastIndexOf('し') + 1);
        if (head && a.name.endsWith('市')) y = head;
      }
    }
    if (y && /^[ぁ-ゖー]+$/.test(y)) munis[a.code] = y;
    else missing.push(`${a.code} ${a.name}`);
  }
  return { prefs, munis, missing };
}

export function readYomi() {
  return existsSync(YOMI_PATH) ? JSON.parse(readFileSync(YOMI_PATH, 'utf8')) : null;
}
