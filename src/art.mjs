// まちの社会科の専用の絵（見本・10/26）。「人が作った」とわかるように、このサイトのためだけに描く
//   トップの説明の絵：街の数字（棒グラフのビル）→ 川と橋 → わが家（家族と備え）。わが家の屋根は朱（えらんだものに朱）
//   いちばん下の街並み：杉と丸い木・家・学校・橋と川・共同住宅
//   都道府県の地図：北の方位記号と波
// 描き方は3案（1 えんぴつの挿絵／2 切り絵／3 木版画）。形は共通で、案ごとに線・面・彫りの描き方を変える
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
// 人の形：頭と、上が丸い体
const body = (cx, top, bottom, r) => [
  [cx - r, bottom],
  ...Array.from({ length: 9 }, (_, i) => [cx - r * Math.cos((i / 8) * Math.PI), top + r - r * Math.sin((i / 8) * Math.PI)]),
  [cx + r, bottom],
];
const bottle = (x, top, bottom) => [[x, bottom], [x, top + 6], [x + 1.5, top + 3], [x + 2, top], [x + 5, top], [x + 5.5, top + 3], [x + 7, top + 6], [x + 7, bottom]];
const tri = (x1, y1, x2, y2, x3, y3) => [[x1, y1], [x2, y2], [x3, y3]];

// ---- 線のゆれ ----
// 点の間を細かく分けて少しずらし、なめらかにつなぐ（えんぴつ）
function wobble(pts, R, { j = 0.8, closed = true, step = 9, smooth = true }) {
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
  if (smooth) {
    for (let i = 1; i < J.length - 1; i++) d += `Q${f1(J[i][0])} ${f1(J[i][1])} ${f1((J[i][0] + J[i + 1][0]) / 2)} ${f1((J[i][1] + J[i + 1][1]) / 2)}`;
    d += `L${f1(J[J.length - 1][0])} ${f1(J[J.length - 1][1])}`;
  } else for (let i = 1; i < J.length; i++) d += `L${f1(J[i][0])} ${f1(J[i][1])}`;
  return closed ? `${d}Z` : d;
}
// はさみで切った形：角の点だけ少しずらして、まっすぐつなぐ
function cut(pts, R, j = 0.5) {
  return `M${pts.map(([x, y]) => `${f1(x + (R() - 0.5) * 2 * j)} ${f1(y + (R() - 0.5) * 2 * j)}`).join('L')}Z`;
}

// ---- トップの説明の絵（390×118） ----
const G = 92; // 地面
const BLD = [[20, 18, 34], [42, 22, 58], [68, 16, 26], [88, 24, 46], [116, 18, 70]];
function heroShapes() {
  const s = [];
  s.push({ r: 'hill', p: [[0, 64], ...quad([0, 64], [40, 46], [95, 54]).slice(1), ...quad([95, 54], [150, 62], [205, 44]).slice(1), ...quad([205, 44], [262, 28], [318, 48]).slice(1), ...quad([318, 48], [360, 60], [390, 50]).slice(1), [390, G], [0, G]] });
  s.push({ r: 'ground', p: [[0, G], [194, G], [192, 118], [0, 118]] });
  s.push({ r: 'ground', p: [[236, G], [390, G], [390, 118], [244, 118]] });
  s.push({ r: 'river', p: [[203, 80.5], [211, 79.8], [219, 80.5], [226, 84], [238, G], [242, 104], [246, 118], [190, 118], [192, 104], [194, G], [198, 84.5]] });
  for (const [x, y, w] of [[199, 104, 11], [219, 111, 13], [224, 98, 9]]) s.push({ r: 'wave', o: true, p: [[x, y], [x + w * 0.25, y - 1.6], [x + w * 0.5, y], [x + w * 0.75, y + 1.6], [x + w, y]] });
  BLD.forEach(([x, w, h], i) => {
    s.push({ r: 'bld', i, p: rect(x, G - h, w, h) });
    for (let wy = G - h + 6; wy <= G - 9; wy += 8) for (let wx = x + 4; wx <= x + w - 6; wx += 6) s.push({ r: 'win', p: rect(wx, wy, 2.6, 3.6) });
  });
  s.push({ r: 'sugi', p: tri(141, 89, 148, 58, 155, 89) }, { r: 'trunk', p: rect(147.2, 88, 1.6, 4) });
  s.push({ r: 'maru', p: circ(168, 75, 9.5) }, { r: 'trunk', p: rect(167.2, 83, 1.6, 9) });
  s.push({ r: 'sugi', p: tri(180, 90, 185, 70, 190, 90) }, { r: 'trunk', p: rect(184.3, 89, 1.4, 3) });
  // 橋（街とわが家をつなぐ）
  const top = quad([182, 89], [218, 76], [254, 89], 12);
  const bot = quad([182, 93], [218, 81], [254, 93], 12).reverse();
  s.push({ r: 'bridge', p: [...top, ...bot] });
  for (const t of [0.15, 0.32, 0.5, 0.68, 0.85]) {
    const [x, y] = top[Math.round(t * 12)];
    s.push({ r: 'rail', o: true, p: [[x, y], [x, y - 5]] });
  }
  s.push({ r: 'rail', o: true, p: quad([184, 84], [218, 71], [252, 84], 10) });
  // わが家
  s.push({ r: 'wall', p: rect(256, 64, 46, 28) });
  s.push({ r: 'roof', p: tri(249, 66, 279, 42, 309, 66) });
  s.push({ r: 'door', p: rect(282, 76, 10, 16) });
  s.push({ r: 'win2', p: rect(262, 72, 12, 10) });
  s.push({ r: 'frame', o: true, p: [[268, 72], [268, 82]] }, { r: 'frame', o: true, p: [[262, 77], [274, 77]] });
  // 家族（人の形）
  [[316, 63, 4.4, 69.5, 5.5], [330, 63, 4.4, 69.5, 5.5], [343, 72, 3.6, 77, 4.4]].forEach(([cx, hy, hr, bt, br], i) => {
    s.push({ r: 'head', p: circ(cx, hy, hr, 12) }, { r: 'body', i, p: body(cx, bt, G, br) });
  });
  // 備え（水と箱）
  s.push({ r: 'box', p: rect(354, 79, 32, 13) }, { r: 'frame', o: true, p: [[354, 83.5], [386, 83.5]] });
  for (const x of [357, 366.5, 376]) {
    s.push({ r: 'bottle', p: bottle(x, 61, 79) }, { r: 'cap', p: rect(x + 2, 58, 3, 3) }, { r: 'wline', o: true, p: [[x + 1.2, 68], [x + 5.8, 68]] });
  }
  for (const [x, y] of [[58, 22], [72, 15], [292, 18]]) s.push({ r: 'bird', o: true, p: [[x - 4, y - 2], [x, y + 1], [x + 4, y - 2]] });
  return s;
}

// ---- いちばん下の街並み（390×60） ----
const gy0 = (x) => 43 + 2.2 * Math.sin(x / 62) + 1.3 * Math.sin(x / 23 + 1);
const gy = (x) => gy0(x) + 10 * Math.exp(-(((x - 212) / 16) ** 2)); // 橋の下は川の谷
function townShapes() {
  const s = [];
  const on = (x) => gy(x) + 1.5;
  const sugi = (x, h, w = 6) => {
    s.push({ r: 'sugi', p: tri(x - w, on(x), x, on(x) - h, x + w, on(x)) });
  };
  const maru = (x, r) => {
    s.push({ r: 'trunk', p: rect(x - 0.8, on(x) - r * 0.8, 1.6, r * 0.8) }, { r: 'maru', p: circ(x, on(x) - r * 1.3, r, 12) });
  };
  const house = (x, w, h) => {
    const b = on(x + w / 2);
    s.push({ r: 'wall', p: rect(x, b - h, w, h) }, { r: 'roof', p: tri(x - 2, b - h + 1, x + w / 2, b - h - 7, x + w + 2, b - h + 1) }, { r: 'win', p: rect(x + w / 2 - 1.5, b - h + 3, 3, 3) });
  };
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
  // 川と橋
  s.push({ r: 'river', p: [[197, 49.5], [227, 49.5], [231, 60], [193, 60]] });
  // 眼鏡橋のような石の橋：上の道と、下のアーチ
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
  s.unshift({ r: 'ground', p: [[0, 60], ...Array.from({ length: 40 }, (_, i) => [(i / 39) * 390, gy((i / 39) * 390)]), [390, 60]] });
  return s;
}

// ---- 都道府県の地図の飾り（358×330、地図のマスに合わせる） ----
function mapShapes() {
  const s = [];
  s.push({ r: 'axis', o: true, p: [[34, 92], [34, 44]] });
  s.push({ r: 'needle', p: [[34, 34], [28, 56], [34, 51]] }, { r: 'needleo', o: true, p: [[34, 34], [40, 56], [34, 51]] });
  for (const [x, y, w] of [[150, 274, 30], [214, 302, 26], [282, 284, 30], [120, 312, 22]]) s.push({ r: 'sea', o: true, p: [[x, y], [x + w * 0.25, y - 3], [x + w * 0.5, y], [x + w * 0.75, y + 3], [x + w, y]] });
  return s;
}

// ---- 描き方 ----
const INK = '#33413a';
const STYLE = {
  // 1 えんぴつの挿絵：うすい色をぬって、少しずれた線でなぞる
  1: {
    fill: { hill: 'none', ground: 'none', river: '#d5eaf5', bld: '#e3eee1', win: '#9fb3a6', sugi: '#7fae78', maru: '#a9cf8f', trunk: '#8a6a4f', bridge: '#efe6da', wall: '#fff', roof: '#e0867f', door: '#b5cfbb', win2: '#e8f2f8', head: '#fff', body: ['#9cc3dc', '#a9cf8f', '#eab3a6'], box: '#eadfcd', bottle: '#d8ebf6', cap: '#7fa9c4', needle: INK },
  },
  // 2 切り絵：線を引かず、色紙を切って重ねた形
  2: {
    fill: { hill: '#e1eedf', ground: '#bfd8ac', river: '#5d9fca', wave: '#fff', sea: '#8dbfdd', axis: '#2f5d3e', bld: ['#4f8d5e', '#3d7a4e', '#5f9c6a', '#46845a', '#356b44'], win: '#fff', sugi: '#2f5d3e', maru: '#76a95a', trunk: '#6b5242', bridge: '#9b7a5b', rail: '#9b7a5b', wall: '#2f6b45', roof: '#c53d43', door: '#fff', win2: '#fff', frame: '#2f6b45', head: '#2f6b45', body: '#2f6b45', box: '#a9865f', bottle: '#3f8fbf', cap: '#2f5d3e', wline: '#fff', bird: '#5f6e66', needle: '#2f5d3e', needleo: '#2f5d3e' },
  },
  // 3 木版画：深い緑の版、川の青の版、朱の版。白い彫りあとと、紙の白いかすれ
  3: {
    fill: { hill: '#b3cfa6', ground: '#2c4a36', river: '#3f7fae', bld: '#2c4a36', win: '#fff', sugi: '#2c4a36', maru: '#2c4a36', trunk: '#2c4a36', bridge: '#2c4a36', wall: '#2c4a36', roof: '#c53d43', door: '#fff', win2: '#fff', head: '#2c4a36', body: '#2c4a36', box: '#2c4a36', bottle: '#3f7fae', cap: '#2c4a36', needle: '#2c4a36' },
  },
};

function hatch(shape, R, id, gap = 5) {
  // えんぴつのななめの線（丘の中だけ）
  const lines = [];
  for (let x = -120; x < 400; x += gap) lines.push(wobble([[x, 120], [x + 90, 30]], R, { j: 0.6, closed: false, step: 14 }));
  return `<clipPath id="${id}"><path d="${wobble(shape.p, R, { j: 0.3 })}"/></clipPath><path clip-path="url(#${id})" d="${lines.join('')}" stroke="#a9cf8f" stroke-width=".8" fill="none"/>`;
}

function draw(v, shapes, seed, id, { textured = false } = {}) {
  const R = rng(seed);
  const st = STYLE[v];
  const out = [];
  if (v === '1') {
    for (const sh of shapes) {
      if (sh.r === 'hill') {
        out.push(hatch(sh, R, `${id}h`));
        out.push(`<path d="${wobble(sh.p.slice(0, -2), R, { j: 0.6, closed: false })}" fill="none" stroke="#7f978a" stroke-width="1"/>`);
        continue;
      }
      if (sh.r === 'ground') {
        const line = sh.p.length > 4 ? sh.p.slice(1, -1) : [sh.p[0], sh.p[1]];
        out.push(`<path d="${wobble(line, R, { j: 0.6, closed: false, step: 12 })}" fill="none" stroke="${INK}" stroke-width="1.2"/>`);
        continue;
      }
      let fill = st.fill[sh.r];
      if (Array.isArray(fill)) fill = fill[(sh.i ?? 0) % fill.length];
      if (sh.r === 'win') {
        out.push(`<path d="${cut(sh.p, R, 0.25)}" fill="${fill}"/>`);
        continue;
      }
      if (!sh.o && fill && fill !== 'none') out.push(`<path d="${wobble(sh.p.map(([x, y]) => [x + 1.1, y + 0.9]), R, { j: 0.5 })}" fill="${fill}"/>`);
      const sw = { win: 0.8, frame: 0.8, wline: 0.8, wave: 1, sea: 1, rail: 0.9, bird: 1, trunk: 0.9, cap: 0.8 }[sh.r] ?? 1.25;
      const col = sh.r === 'wave' || sh.r === 'wline' || sh.r === 'sea' ? '#3f8fbf' : INK;
      out.push(`<path d="${wobble(sh.p, R, { j: sh.r === 'win' ? 0.25 : 0.7, closed: !sh.o, step: 8 })}" fill="${sh.r === 'needle' ? INK : 'none'}" stroke="${col}" stroke-width="${sw}"/>`);
    }
  } else if (v === '2') {
    for (const sh of shapes) {
      let fill = st.fill[sh.r];
      if (Array.isArray(fill)) fill = fill[sh.i % fill.length];
      if (!fill) continue;
      if (sh.o) {
        const w = { axis: 1.6, rail: 1.4, wave: 1.3, sea: 1.6, frame: 1, wline: 1, bird: 1.4, needleo: 1.4 }[sh.r] ?? 1.2;
        out.push(`<path d="${wobble(sh.p, R, { j: 0.3, closed: false, step: 30, smooth: sh.r === 'wave' || sh.r === 'bird' })}" fill="none" stroke="${fill}" stroke-width="${w}" stroke-linecap="square"/>`);
      } else out.push(`<path d="${cut(sh.p, R, sh.r === 'win' ? 0.2 : 0.55)}" fill="${fill}"/>`);
    }
  } else {
    // 木版画：版ごとに少しずらす（版ずれ）
    for (const sh of shapes) {
      const fill = st.fill[sh.r];
      const off = fill === '#c53d43' ? [0.9, -0.6] : fill === '#3f7fae' ? [-0.7, 0.5] : [0, 0];
      const pp = sh.p.map(([x, y]) => [x + off[0], y + off[1]]);
      if (sh.o) {
        const c = sh.r === 'sea' ? '#3f7fae' : sh.r === 'wave' || sh.r === 'wline' || sh.r === 'frame' ? '#fff' : '#2c4a36';
        const w = { axis: 1.8, rail: 1.5, wave: 1.2, sea: 1.5, frame: 1, wline: 1, bird: 1.5, needleo: 1.6 }[sh.r] ?? 1.3;
        out.push(`<path d="${wobble(pp, R, { j: 0.45, closed: false, step: 5, smooth: false })}" fill="none" stroke="${c}" stroke-width="${w}"/>`);
        continue;
      }
      if (!fill) continue;
      out.push(`<path d="${wobble(pp, R, { j: sh.r === 'win' ? 0.3 : 0.6, step: 5, smooth: false })}" fill="${fill}"/>`);
      // 彫りあと
      const carve = [];
      if (sh.r === 'bld') {
        const [[x0, y0], [x1]] = sh.p;
        carve.push([[x0 + 2, y0 + 3], [x0 + 2, G - 3]], [[x1 - 1.6, y0 + 4], [x1 - 1.6, G - 6]]);
      }
      if (sh.r === 'sugi' && sh.p[0][1] - sh.p[1][1] > 18) {
        const [[ax, ay], [tx, ty]] = sh.p;
        carve.push([[tx, ty + 8], [tx, ay - 3]]);
      }
      if (sh.r === 'maru') {
        const xs = sh.p.map((q) => q[0]);
        const ys = sh.p.map((q) => q[1]);
        const cx = (Math.min(...xs) + Math.max(...xs)) / 2;
        const cy = (Math.min(...ys) + Math.max(...ys)) / 2;
        const r = (Math.max(...xs) - Math.min(...xs)) / 2;
        carve.push(quad([cx - r * 0.55, cy - r * 0.1], [cx - r * 0.3, cy - r * 0.6], [cx + r * 0.2, cy - r * 0.55], 4));
      }
      if (sh.r === 'hill') {
        carve.push(quad([150, 70], [176, 60], [200, 58], 6), quad([236, 56], [270, 46], [300, 52], 6), quad([330, 60], [356, 56], [384, 60], 6));
      }
      if (sh.r === 'ground' && sh.p.length === 4 && sh.p[2][1] > 100) {
        const [[x0], [x1]] = sh.p;
        for (let x = x0 + 6; x < x1 - 14; x += 22) carve.push([[x, 100 + ((x * 7) % 9)], [x + 9, 100 + ((x * 7) % 9)]]);
      }
      if (sh.r === 'wall' && sh.p[1][0] - sh.p[0][0] > 40) carve.push([[258, 88], [300, 88]]);
      if (sh.r === 'body') {
        const cx = (sh.p[0][0] + sh.p[sh.p.length - 1][0]) / 2;
        carve.push([[cx, G - 7], [cx, G - 1]]);
      }
      if (sh.r === 'box') carve.push([[356, 87], [384, 87]]);
      for (const c of carve) out.push(`<path d="${wobble(c, R, { j: 0.35, closed: false, step: 4, smooth: false })}" fill="none" stroke="#fff" stroke-width="1" stroke-linecap="round"/>`);
    }
    if (textured) {
      // 紙の白いかすれ（白い地の上では見えず、版の色の上でだけ見える）
      const dots = [];
      for (let k = 0; k < 170; k++) dots.push(`M${f1(R() * 390)} ${f1(R() * 118)}h.9`);
      out.push(`<path d="${dots.join('')}" stroke="#fff" stroke-width=".9" stroke-linecap="round" opacity=".85"/>`);
    }
  }
  return out.join('');
}

export const ARTS = { 1: 'えんぴつの挿絵', 2: '切り絵', 3: '木版画', 4: 'Canva 切り絵', 5: 'Canva ペンと水彩', 6: 'Canva 川ぞいの街（司令塔）' };
// Canva で作った絵（10/26）：トップの1枚だけ。下の帯・地図の飾りは、合う描き方の SVG
const CANVA = {
  4: { file: 'mihon-kirie-860.webp', w: 860, h: 381, svg: '2', alt: '緑の紙を切って重ねた街のビルと、川にかかる橋と、朱の屋根の家と水のボトルの絵' },
  5: { file: 'mihon-pen-860.webp', w: 860, h: 378, svg: '1', alt: '高さのちがうビルの街と、川にかかる石の橋と、朱の屋根の家と水のボトルのペン画' },
  6: { file: 'mihon-shirei-860.webp', w: 860, h: 335, svg: '1', alt: '山にかこまれた川ぞいの街と、橋と田んぼのペン画' },
};
const base = (v) => CANVA[v]?.svg ?? v;

export function heroArt(v) {
  const c = CANVA[v];
  if (c)
    return `<div class="hero hero-img"><img src="/${c.file}" width="${c.w}" height="${c.h}" alt="${c.alt}" decoding="async" fetchpriority="high"></div>
<p class="cap"><span>街の数字を調べて</span><span>わが家の備えの量を出す</span></p>`;
  const seal =
    v === '3'
      ? `<g transform="rotate(-3 376 16)"><path d="${wobble(rect(367, 5, 18, 23), rng(7), { j: 0.6, step: 5, smooth: false })}" fill="#c53d43"/><text x="376" y="15" font-size="8.5" text-anchor="middle" fill="#fff" font-family="'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif" font-weight="700">ま</text><text x="376" y="25" font-size="8.5" text-anchor="middle" fill="#fff" font-family="'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif" font-weight="700">ち</text></g>`
      : '';
  return `<div class="hero" role="img" aria-label="街の数字を調べて、橋をわたって、わが家の備えの量を出す絵"><svg viewBox="0 0 390 118" aria-hidden="true">${draw(v, heroShapes(), 20261026, `hr${v}`, { textured: true })}${seal}</svg></div>
<p class="cap"><span>街の数字を調べて</span><span>わが家の備えの量を出す</span></p>`;
}

export function townArt(v) {
  v = base(v);
  const st = { 1: '', 2: 'town2', 3: 'town3' }[v];
  if (v === '2') {
    // 切り絵の街並みは、うすい緑の1色（窓だけ白く切りぬく）
    const R = rng(1026);
    const shapes = townShapes();
    const body = shapes
      .map((sh) => {
        const c = sh.r === 'win' ? '#fff' : sh.r === 'river' ? '#bcdaec' : sh.r === 'bird' ? '#9fb3a6' : '#c3d9b8';
        return sh.o
          ? `<path d="${wobble(sh.p, R, { j: 0.3, closed: false, step: 30, smooth: sh.r === 'bird' })}" fill="none" stroke="${c}" stroke-width="1.3"/>`
          : `<path d="${cut(sh.p, R, 0.45)}" fill="${c}"/>`;
      })
      .join('');
    return `<div class="town ${st}" aria-hidden="true"><svg viewBox="0 0 390 60">${body}</svg></div>`;
  }
  return `<div class="town ${st}" aria-hidden="true"><svg viewBox="0 0 390 60">${draw(v, townShapes(), 1026, `tw${v}`)}</svg></div>`;
}

export function mapArt(v) {
  v = base(v);
  return `<svg class="mapart" viewBox="0 0 358 330" aria-hidden="true">${draw(v, mapShapes(), 47, `mp${v}`)}<text x="34" y="29" font-size="12" text-anchor="middle" fill="${v === '2' ? '#2f5d3e' : INK}" font-family="'Hiragino Mincho ProN','Yu Mincho','Noto Serif JP',serif" font-weight="700">北</text></svg>`;
}

export const ART_CSS = `.hero{margin:6px -16px 0;line-height:0}.hero svg,.hero img{display:block;width:100%;height:auto}
.cap{display:flex;justify-content:space-between;margin:2px 0 12px;font:13.5px/1.5 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;color:var(--sub)}
.mapw{position:relative}.mapart{position:absolute;inset:0;width:100%;height:100%;pointer-events:none}
.town{max-width:430px;margin:24px auto 0;line-height:0}.town svg{display:block;width:100%;height:auto}
.town+.ft{border-top:0}.town3+.ft{background:#2c4a36;color:#dfe9e2;border-top:0}.town3+.ft .fl a{color:#fff}
.town2+.ft{background:#c3d9b8}.town2+.ft,.town2+.ft .fl a{color:#23312a}`.replace(/\n/g, '');
