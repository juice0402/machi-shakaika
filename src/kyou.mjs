// 今日の1問（/quiz/kyou/）の問題：日本時間の日付から、県のちがう2つの市区町村を「どっちが多い？」でくらべる
// 決まり：その日はだれでも同じ問題（日付で決める）。2つの街は県をまたぐ。同点・表示が同じになる組は出さない（qFair）
//   題は日ごとに順番（KYOU_ORDER）。組は「日付と組から作る数がいちばん小さい組」なので、
//   毎週のデータ更新で街が増えたり数字が少し動いても、その日の組はほとんど変わらない（えらばれた組がだめになったときだけ変わる）
import { qFair, qFmt } from './quiz-core.mjs';
import { JMAP } from './japan-map-data.mjs';

export const KYOU_DAYS = 14; // ページに入れる日数（毎朝のビルドで、その日から14日分）
export const KYOU_MIN_POP = 100000; // 出す街：人口10万人以上
// 題の順番（METRICS の番号）。似た題（人口と世帯・共同住宅と一戸建て）が続かないように
export const KYOU_ORDER = [0, 5, 2, 8, 4, 1, 7, 3, 6, 9];

const DAY = 864e5;
export const jstDate = (t = Date.now()) => new Date(t + 9 * 3600e3).toISOString().slice(0, 10);
export const addDays = (iso, n) => new Date(Date.parse(`${iso}T00:00:00Z`) + n * DAY).toISOString().slice(0, 10);
const dayNum = (iso) => Math.round(Date.parse(`${iso}T00:00:00Z`) / DAY);

// 文字から 32bit の数（FNV-1a に混ぜを足したもの）
export function h32(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) h = Math.imul(h ^ s.charCodeAt(i), 0x01000193);
  h ^= h >>> 16;
  h = Math.imul(h, 0x85ebca6b);
  h ^= h >>> 13;
  return h >>> 0;
}

export const kyouPool = (D) => D.munis.filter((r) => r[3] >= KYOU_MIN_POP).sort((x, y) => (x[0] < y[0] ? -1 : 1));

// その日の1問：{ d, mi, p: [ア, イ] }（p は machi.json の市区町村の行）
export function kyouQ(D, iso, pool = kyouPool(D)) {
  const order = KYOU_ORDER.filter((i) => i < D.m.length);
  const mi = order[((dayNum(iso) % order.length) + order.length) % order.length];
  const m = D.m[mi];
  let best = null;
  let bs = Infinity;
  for (let i = 0; i < pool.length; i++) {
    const a = pool[i];
    for (let j = i + 1; j < pool.length; j++) {
      const b = pool[j];
      if (a[0].slice(0, 2) === b[0].slice(0, 2) || a[1] === b[1]) continue;
      const s = h32(`${iso}:${mi}:${a[0]}:${b[0]}`);
      if (s < bs && qFair(m, a[3 + mi], b[3 + mi])) {
        bs = s;
        best = [a, b];
      }
    }
  }
  if (!best) return null;
  // どちらをアにするかも日付で決める（多いほうがいつもアにならないように）
  const p = h32(`${iso}:swap`) & 1 ? [best[1], best[0]] : best;
  return { d: iso, mi, p };
}

// ---- 地図：県の形の範囲から、2つの県が入る切り出し（横390：縦190） ----
export const KYOU_ASPECT = 390 / 190;

export function pathBox(d) {
  const t = d.match(/[A-Za-z]|-?\d*\.?\d+/g);
  let x = 0, y = 0, sx = 0, sy = 0, cmd = '';
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  for (let k = 0; k < t.length; ) {
    if (/[A-Za-z]/.test(t[k])) {
      cmd = t[k++];
      if (cmd === 'Z' || cmd === 'z') {
        x = sx;
        y = sy;
        continue;
      }
    }
    const a = Number(t[k]), b = Number(t[k + 1]);
    k += 2;
    if (cmd === 'M' || cmd === 'L') [x, y] = [a, b];
    else if (cmd === 'm' || cmd === 'l') [x, y] = [x + a, y + b];
    else throw new Error(`地図の形に知らない命令 ${cmd}`);
    if (cmd === 'M' || cmd === 'm') {
      [sx, sy] = [x, y];
      cmd = cmd === 'M' ? 'L' : 'l';
    }
    x0 = Math.min(x0, x); y0 = Math.min(y0, y); x1 = Math.max(x1, x); y1 = Math.max(y1, y);
  }
  return [x0, y0, x1, y1];
}

const BOX = Object.fromEntries(Object.entries(JMAP.prefs).map(([c, p]) => [c, pathBox(p.d)]));
const r1 = (v) => Math.round(v * 10) / 10;

// 切り出し [x, y, w, h] と、県名の置き場 [[x, y], [x, y]]・字の大きさ（地図の単位）
export function kyouView(ca, cb, names = ['', '']) {
  const [a, b] = [BOX[ca], BOX[cb]];
  const bx0 = Math.min(a[0], b[0]), by0 = Math.min(a[1], b[1]), bx1 = Math.max(a[2], b[2]), by1 = Math.max(a[3], b[3]);
  const w = Math.max(bx1 - bx0 + 60, (by1 - by0 + 30) * KYOU_ASPECT, 150);
  const h = w / KYOU_ASPECT;
  // 地図の外に出すぎないように寄せる（地図より大きいときは、まん中のまま）
  const fitIn = (c, size, lo, hi) => (size >= hi - lo ? c - size / 2 : Math.min(Math.max(c - size / 2, lo), hi - size));
  const vb = [
    r1(fitIn((bx0 + bx1) / 2, w, Math.min(0, bx0 - 4), Math.max(JMAP.w, bx1 + 4))),
    r1(fitIn((by0 + by1) / 2, h, Math.min(0, by0 - 4), Math.max(JMAP.h, by1 + 4))),
    r1(w),
    r1(h),
  ];
  const fs = r1((w / 390) * 13);
  const lab = [ca, cb].map((c) => [JMAP.prefs[c].x, JMAP.prefs[c].y]);
  // 2つの県名が近いときは、上下に離す（名前と数字の2行ぶん）
  const gap = fs * 2.6;
  if (Math.abs(lab[0][1] - lab[1][1]) < gap && Math.abs(lab[0][0] - lab[1][0]) < fs * 7) {
    const up = lab[0][1] <= lab[1][1] ? 0 : 1;
    const mid = (lab[0][1] + lab[1][1]) / 2;
    lab[up][1] = mid - gap / 2;
    lab[1 - up][1] = mid + gap / 2;
  }
  // 県名が切り出しの外にはみ出さないように（字の幅は「ア 」＋名前の文字数でみつもる）
  lab.forEach((l, i) => {
    const half = ((names[i].length + 2) * fs) / 2;
    l[0] = Math.min(Math.max(l[0], vb[0] + half + 2), vb[0] + vb[2] - half - 2);
    l[1] = Math.min(Math.max(l[1], vb[1] + fs * 1.2), vb[1] + vb[3] - fs * 1.6);
  });
  return { vb, fs, lab: lab.map(([x, y]) => [r1(x), r1(y)]) };
}

// ページに入れる問題（14日分）：[日付, 題の番号, [コード, 名前, 県コード, 数字, URL]×2, 切り出し]
export function kyouDays(D, start, urlOfRow, n = KYOU_DAYS) {
  const pool = kyouPool(D);
  const out = [];
  for (let i = 0; i < n; i++) {
    const q = kyouQ(D, addDays(start, i), pool);
    if (!q) continue;
    const [a, b] = q.p;
    out.push({
      d: q.d,
      mi: q.mi,
      p: q.p.map((r) => [r[0], r[1], r[0].slice(0, 2), r[3 + q.mi], urlOfRow(r)]),
      v: kyouView(a[0].slice(0, 2), b[0].slice(0, 2), [a[1], b[1]]),
    });
  }
  return out;
}

// 2つの数字の表示がちがうか（テスト用）
export const kyouShowDiffers = (D, q) => qFmt(D.m[q.mi], q.p[0][3 + q.mi]) !== qFmt(D.m[q.mi], q.p[1][3 + q.mi]);
