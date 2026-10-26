// まちの社会科の専用の絵（10/26 しょーくんが見本の5を選んだ）。「人が作った」とわかるように、このサイトのためだけに描く
//   トップの1枚：Canva で作ったペンと水彩の絵（高さのちがうビルの街 → 川と石の橋 → 朱の屋根の家と水）。static/hero-860.webp
//     文字は絵に入れず HTML に。1画面目なので遅れ読み込みにしない
//   いちばん下の街並み（全ページ）：杉と丸い木・家・時計の塔の学校・眼鏡橋と川・共同住宅。dist/town.svg、遅れ読み込み
//   都道府県の地図（トップ）：北の方位記号と波
// SVG は「えんぴつの挿絵」：うすい色をぬって、少しずれたゆれる線でなぞる。フィルターは使わない
// 線のゆれは決まった種から作るので、同じ入力からは同じ絵になる（本番と同じなら公開しない仕組みのため）

const f1 = (n) => Math.round(n * 10) / 10;
function rng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// ---- 形（点の列） ----
const rect = (x, y, w, h) => [[x, y], [x + w, y], [x + w, y + h], [x, y + h]];
const circ = (cx, cy, r, n = 14) => Array.from({ length: n }, (_, i) => [cx + r * Math.cos((i / n) * Math.PI * 2), cy + r * Math.sin((i / n) * Math.PI * 2)]);
const quad = (a, c, b, n = 10) =>
  Array.from({ length: n + 1 }, (_, i) => {
    const t = i / n;
    const u = 1 - t;
    return [u * u * a[0] + 2 * u * t * c[0] + t * t * b[0], u * u * a[1] + 2 * u * t * c[1] + t * t * b[1]];
  });
const tri = (x1, y1, x2, y2, x3, y3) => [[x1, y1], [x2, y2], [x3, y3]];

// ---- 線のゆれ：点の間を細かく分けて少しずらし、なめらかにつなぐ ----
function wobble(pts, R, { j = 0.8, closed = true, step = 9 }) {
  const P = closed ? [...pts, pts[0]] : pts;
  const out = [];
  for (let i = 0; i < P.length - 1; i++) {
    const [x1, y1] = P[i];
    const [x2, y2] = P[i + 1];
    const n = Math.max(1, Math.round(Math.hypot(x2 - x1, y2 - y1) / step));
    for (let k = 0; k < n; k++) out.push([x1 + ((x2 - x1) * k) / n, y1 + ((y2 - y1) * k) / n]);
  }
  if (!closed) out.push(P[P.length - 1]);
  const J = out.map(([x, y]) => [x + (R() - 0.5) * 2 * j, y + (R() - 0.5) * 2 * j]);
  let d = `M${f1(J[0][0])} ${f1(J[0][1])}`;
  for (let i = 1; i < J.length - 1; i++) d += `Q${f1(J[i][0])} ${f1(J[i][1])} ${f1((J[i][0] + J[i + 1][0]) / 2)} ${f1((J[i][1] + J[i + 1][1]) / 2)}`;
  d += `L${f1(J[J.length - 1][0])} ${f1(J[J.length - 1][1])}`;
  return closed ? `${d}Z` : d;
}
// 小さな窓：角だけ少しずらしてまっすぐつなぐ
const cut = (pts, R, j) => `M${pts.map(([x, y]) => `${f1(x + (R() - 0.5) * 2 * j)} ${f1(y + (R() - 0.5) * 2 * j)}`).join('L')}Z`;

// ---- いちばん下の街並み（390×60） ----
const gy0 = (x) => 43 + 2.2 * Math.sin(x / 62) + 1.3 * Math.sin(x / 23 + 1);
const gy = (x) => gy0(x) + 10 * Math.exp(-(((x - 212) / 16) ** 2)); // 橋の下は川の谷
function townShapes() {
  const s = [];
  const on = (x) => gy(x) + 1.5;
  const sugi = (x, h, w = 6) => s.push({ r: 'sugi', p: tri(x - w, on(x), x, on(x) - h, x + w, on(x)) });
  const maru = (x, r) => s.push({ r: 'trunk', p: rect(x - 0.8, on(x) - r * 0.8, 1.6, r * 0.8) }, { r: 'maru', p: circ(x, on(x) - r * 1.3, r, 12) });
  const house = (x, w, h) => {
    const b = on(x + w / 2);
    s.push({ r: 'wall', p: rect(x, b - h, w, h) }, { r: 'roof', p: tri(x - 2, b - h + 1, x + w / 2, b - h - 7, x + w + 2, b - h + 1) }, { r: 'win', p: rect(x + w / 2 - 1.5, b - h + 3, 3, 3) });
  };
  s.push({ r: 'ground', p: Array.from({ length: 40 }, (_, i) => [(i / 39) * 390, gy((i / 39) * 390)]) });
  sugi(10, 22);
  sugi(24, 16, 5);
  maru(40, 6.5);
  house(52, 16, 10);
  house(72, 14, 8);
  // 学校（時計の塔）
  const sb = on(125);
  s.push({ r: 'wall', p: rect(98, sb - 14, 54, 14) }, { r: 'wall', p: rect(120, sb - 28, 10, 14) }, { r: 'roof', p: tri(118, sb - 27, 125, sb - 34, 132, sb - 27) }, { r: 'win', p: circ(125, sb - 22, 2.6, 10) });
  for (let i = 0; i < 6; i++) for (const yy of [sb - 11, sb - 6]) if (!(i === 3 && yy === sb - 6)) s.push({ r: 'win', p: rect(102 + i * 8 + (i >= 3 ? 4 : 0), yy, 3, 3) });
  s.push({ r: 'win', p: rect(122, sb - 6, 6, 6) });
  maru(162, 6);
  // 川と眼鏡橋
  s.push({ r: 'river', p: [[197, 49.5], [227, 49.5], [231, 60], [193, 60]] });
  const top = quad([184, gy(184) - 1], [212, 36], [240, gy(240) - 1], 10);
  s.push({ r: 'bridge', p: [...top, ...quad([240, gy(240) + 2], [212, 39], [184, gy(184) + 2], 10)] });
  s.push({ r: 'bridge', p: [[190, gy(190) + 1], ...quad([194, 54], [212, 36], [230, 54], 10), [234, gy(234) + 1], [234, gy(234) + 3], ...quad([227, 56], [212, 41], [197, 56], 10), [190, gy(190) + 3]] });
  for (const t of [0.2, 0.4, 0.6, 0.8]) {
    const [x, y] = top[Math.round(t * 10)];
    s.push({ r: 'rail', o: true, p: [[x, y], [x, y - 3.5]] });
  }
  house(252, 14, 8);
  // 共同住宅
  const ab = on(286);
  s.push({ r: 'wall', p: rect(274, ab - 26, 24, 26) });
  for (let i = 0; i < 3; i++) for (let k = 0; k < 4; k++) s.push({ r: 'win', p: rect(278 + i * 7, ab - 22 + k * 5.5, 3, 3) });
  house(304, 16, 10);
  sugi(334, 20);
  sugi(348, 15, 5);
  maru(366, 7.5);
  sugi(382, 14, 5);
  s.push({ r: 'bird', o: true, p: [[296, 9], [300, 12], [304, 9]] }, { r: 'bird', o: true, p: [[306, 5], [309, 7.5], [312, 5]] });
  return s;
}

// ---- 都道府県の地図の飾り（358×330、地図のマスに合わせる） ----
function mapShapes() {
  const s = [{ r: 'axis', o: true, p: [[34, 92], [34, 44]] }, { r: 'needle', p: [[34, 34], [28, 56], [34, 51]] }, { r: 'needle2', o: true, p: [[34, 34], [40, 56], [34, 51]] }];
  for (const [x, y, w] of [[150, 274, 30], [214, 302, 26], [282, 284, 30], [120, 312, 22]]) s.push({ r: 'sea', o: true, p: [[x, y], [x + w * 0.25, y - 3], [x + w * 0.5, y], [x + w * 0.75, y + 3], [x + w, y]] });
  return s;
}

// ---- えんぴつの挿絵の描き方 ----
const INK = '#33413a';
const FILL = { river: '#d5eaf5', win: '#9fb3a6', sugi: '#7fae78', maru: '#a9cf8f', trunk: '#8a6a4f', bridge: '#efe6da', wall: '#fff', roof: '#e0867f', needle: INK };
const WIDTH = { win: 0.8, sea: 1, rail: 0.9, bird: 1, trunk: 0.9 };
function draw(shapes, seed) {
  const R = rng(seed);
  const out = [];
  for (const sh of shapes) {
    if (sh.r === 'ground') {
      out.push(`<path d="${wobble(sh.p, R, { j: 0.6, closed: false, step: 12 })}" fill="none" stroke="${INK}" stroke-width="1.2"/>`);
      continue;
    }
    const fill = FILL[sh.r];
    if (sh.r === 'win') {
      out.push(`<path d="${cut(sh.p, R, 0.25)}" fill="${fill}"/>`);
      continue;
    }
    // うすい色を少しずらしてぬってから、線でなぞる
    if (!sh.o && fill) out.push(`<path d="${wobble(sh.p.map(([x, y]) => [x + 1.1, y + 0.9]), R, { j: 0.5 })}" fill="${fill}"/>`);
    out.push(`<path d="${wobble(sh.p, R, { j: 0.7, closed: !sh.o, step: 8 })}" fill="${sh.r === 'needle' ? INK : 'none'}" stroke="${sh.r === 'sea' ? '#3f8fbf' : INK}" stroke-width="${WIDTH[sh.r] ?? 1.25}"/>`);
  }
  return out.join('');
}

export const HERO = { file: '/hero-860.webp', w: 860, h: 378, alt: '高さのちがうビルの街と、川にかかる石の橋と、朱の屋根の家と水のボトルのペン画' };
export const heroHtml = () =>
  `<div class="hero"><img src="${HERO.file}" width="${HERO.w}" height="${HERO.h}" alt="${HERO.alt}" decoding="async" fetchpriority="high"></div>
<p class="cap"><span>街の数字を調べて</span><span>わが家の備えの量を出す</span></p>`;

// いちばん下の街並み（ファイルにして、全ページで同じものを遅れて読み込む）
export const TOWN_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 390 60" stroke-linecap="round" stroke-linejoin="round">${draw(townShapes(), 1026)}</svg>\n`;
export const townHtml = () => `<div class="town"><img src="/town.svg" width="390" height="60" alt="" loading="lazy" decoding="async"></div>`;

export const mapArt = () =>
  `<svg class="mapart" viewBox="0 0 358 330" aria-hidden="true" stroke-linecap="round">${draw(mapShapes(), 47)}<text x="34" y="29" font-size="12" text-anchor="middle" fill="${INK}" font-family="'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif" font-weight="700">北</text></svg>`;

export const ART_CSS = `.hero{margin:6px -16px 0;line-height:0}.hero img{display:block;width:100%;height:auto}
.cap{display:flex;justify-content:space-between;margin:2px 0 12px;font:13.5px/1.5 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;color:var(--sub)}
.mapw{position:relative}.mapart{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.town{max-width:430px;margin:24px auto 0;line-height:0}.town img{display:block;width:100%;height:auto}.town+.ft{border-top:0}`.replace(/\n/g, '');
