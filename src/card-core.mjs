// 街くらべカード（夜のメモ #28。10/28 しょーくん：案A「トレカ2枚」・地方ごとの水彩の絵）
//   ブラウザでも同じものを使う。関数の中身を toString で /kurabe/card.js に入れるので、
//   ここの mc から始まる関数は、引数と Math・ほかの mc 関数だけを使い、外の変数・import を使わない
//   形と色と大きさは見本 tools/card/mock.py（mihon-a.png）から
//
// r は /kurabe/kazu.json の行 [コード, 名前, URL, 人口, 15歳未満%×10, 65歳以上%×10, 5年の増減%×10, ひとり暮らし%×10, 共同住宅%×10]
// M（card.js の中の MC）：{ nat: {g, p014, p65, single, kyodo}（全国。%）, src: 出典の1行, map: {w, h, frame, d: {県コード: 形}} }

// 地方（9つ）。県コードの上2けたから
export function mcRegion(code) {
  const n = Number(String(code).slice(0, 2));
  if (n === 1) return 'hokkaido';
  if (n <= 7) return 'tohoku';
  if (n <= 14) return 'kanto';
  if (n <= 23) return 'chubu';
  if (n <= 30) return 'kinki';
  if (n <= 35) return 'chugoku';
  if (n <= 39) return 'shikoku';
  if (n <= 46) return 'kyushu';
  if (n === 47) return 'okinawa';
  return null;
}

// 人口：10万人以上は「196万人」、それより下は「12,345人」
export function mcMan(n) {
  return n >= 100000 ? `${Math.round(n / 10000)}万人` : `${n.toLocaleString('ja-JP')}人`;
}

export function mcEsc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// 字の幅のめやす（字の大きさを1として。数字・英字・記号は細い）
export function mcWidth(s) {
  let w = 0;
  for (const c of String(s)) w += /[0-9]/.test(c) ? 0.6 : /[,.\-+%]/.test(c) ? 0.35 : /[ -~]/.test(c) ? 0.6 : 1;
  return w;
}

// カード1枚（540×820）。i：0 は1枚目（森の緑）、1 は2枚目（川の青）
//   part：'base'（絵の窓の中身と地図の小窓をのぞく）・'over'（窓の枠と地図の小窓）・'all'（img の絵も入れて全部）
export function mcCard(r, i, pref, M, img, part) {
  const W = 540;
  const H = 820;
  const col = i ? '#3f8fbf' : '#2f6b45';
  const col2 = i ? '#bcd9ea' : '#b5cfbb';
  const INK = '#23312a';
  const SUB = '#5f6e66';
  const v = (k) => r[k] / 10;
  const o = [];
  if (part !== 'over') {
    o.push(`<rect width="${W}" height="${H}" rx="18" fill="#8a6a4f"/><rect x="10" y="10" width="${W - 20}" height="${H - 20}" rx="10" fill="#fff"/><rect x="18" y="18" width="${W - 36}" height="${H - 36}" rx="6" fill="none" stroke="${col}" stroke-width="2"/>`);
    const pop = mcMan(r[3]);
    const popW = mcWidth(pop) * 34;
    const fs = Math.max(20, Math.min(46, Math.floor((W - 72 - popW - 24) / Math.max(1, mcWidth(r[1])))));
    const pfs = Math.min(20, Math.floor((W - 72 - 40 - 16) / Math.max(1, mcWidth(pref))));
    o.push(`<text x="36" y="58" class="gs" font-size="${pfs}" fill="${SUB}">${mcEsc(pref)}</text>`);
    o.push(`<text x="36" y="106" class="mn" font-size="${fs}" font-weight="700" fill="${INK}">${mcEsc(r[1])}</text>`);
    o.push(`<text x="${W - 36}" y="70" text-anchor="end" class="gs" font-size="18" fill="${SUB}">人口</text>`);
    o.push(`<text x="${W - 36}" y="106" text-anchor="end" class="gs" font-size="34" font-weight="700" fill="${col}">${pop}</text>`);
    o.push(`<rect x="36" y="124" width="${W - 72}" height="200" rx="4" fill="#f3f6f1"/>`);
    // 5年の人口の増減（真ん中が0。±10% で端に止める。字は本当の値）
    const g = v(6);
    const mx = 36;
    const mw = W - 72;
    const my = 392;
    const zero = mx + mw / 2;
    const cl = (x) => Math.max(-10, Math.min(10, x));
    const gw = (mw / 2) * (cl(g) / 10);
    const sg = g > 0 ? '+' : g < 0 ? '−' : '';
    o.push(`<text x="36" y="372" class="gs" font-size="20" fill="${INK}">5年の人口の増減</text>`);
    o.push(`<text x="${W - 36}" y="374" text-anchor="end" class="gs" font-size="30" font-weight="700" fill="${col}">${sg}${Math.abs(g).toFixed(1)}<tspan font-size="18">%</tspan></text>`);
    o.push(`<rect x="${mx}" y="${my}" width="${mw}" height="14" fill="#e6efe8"/>`);
    o.push(`<rect x="${Math.min(zero, zero + gw).toFixed(1)}" y="${my}" width="${Math.abs(gw).toFixed(1)}" height="14" fill="${col}"/>`);
    for (let t = -10; t <= 10; t += 5) {
      const tx = zero + (mw / 2) * (t / 10);
      o.push(`<line x1="${tx}" y1="${my + 14}" x2="${tx}" y2="${my + (t === 0 ? 22 : 18)}" stroke="${SUB}"/>`);
    }
    o.push(`<line x1="${zero}" y1="${my - 4}" x2="${zero}" y2="${my + 14}" stroke="${INK}" stroke-width="1.2"/>`);
    o.push(`<path d="M${(zero + (mw / 2) * (cl(M.nat.g) / 10)).toFixed(1)} ${my - 2}l-5-8h10z" fill="${INK}"/>`);
    // 割合のものさし（0〜100%。10ごとに目盛り）
    const rows = [
      ['15歳未満', 4, 'p014'],
      ['65歳以上', 5, 'p65'],
      ['ひとり暮らし', 7, 'single'],
      ['共同住宅', 8, 'kyodo'],
    ];
    let y = 452;
    for (const [lab, k, nk] of rows) {
      const x = v(k);
      o.push(`<text x="36" y="${y}" class="gs" font-size="20" fill="${INK}">${lab}</text>`);
      o.push(`<text x="${W - 36}" y="${y + 2}" text-anchor="end" class="gs" font-size="30" font-weight="700" fill="${col}">${x.toFixed(1)}<tspan font-size="18">%</tspan></text>`);
      const by = y + 18;
      o.push(`<rect x="36" y="${by}" width="${mw}" height="14" fill="#e6efe8"/><rect x="36" y="${by}" width="${((mw * Math.min(100, x)) / 100).toFixed(1)}" height="14" fill="${col}"/>`);
      for (let t = 0; t <= 10; t++) {
        const tx = 36 + (mw * t) / 10;
        o.push(`<line x1="${tx}" y1="${by + 14}" x2="${tx}" y2="${by + (t % 5 ? 17 : 20)}" stroke="${SUB}"/>`);
      }
      o.push(`<path d="M${(36 + (mw * M.nat[nk]) / 100).toFixed(1)} ${by - 2}l-5-8h10z" fill="${INK}"/>`);
      y += 78;
    }
    o.push(`<text x="36" y="${H - 34}" class="gs" font-size="14" fill="${SUB}">${mcEsc(M.src)}</text>`);
  }
  if (part === 'all' && img) {
    o.push(`<clipPath id="mcw${i}"><rect x="36" y="124" width="${W - 72}" height="200" rx="4"/></clipPath><image href="${img}" x="36" y="124" width="${W - 72}" height="200" preserveAspectRatio="xMidYMid slice" clip-path="url(#mcw${i})"/>`);
  }
  if (part !== 'base') {
    o.push(`<rect x="36" y="124" width="${W - 72}" height="200" rx="4" fill="none" stroke="${INK}"/>`);
    // 日本地図の小窓：その街の県をカードの色のうすい色でぬる（市区町村の位置のデータがないので点は打たない）
    const m = M.map;
    const s = 112 / m.w;
    const code = String(r[0]).slice(0, 2);
    const paths = Object.keys(m.d)
      .map((c) => `<path d="${m.d[c]}" fill="${c === code ? col2 : '#f3f6f1'}"${c === code ? ` stroke="${col}"` : ''}/>`)
      .join('');
    o.push(`<rect x="${W - 36 - 128}" y="132" width="120" height="${Math.ceil(m.h * s) + 12}" fill="#fff" stroke="${INK}" stroke-width=".8"/>`);
    o.push(`<g transform="translate(${W - 36 - 124} 138) scale(${s.toFixed(4)})" stroke="${INK}" stroke-width="${(0.5 / s).toFixed(2)}" stroke-linejoin="round">${paths}<path d="${m.frame}" fill="none"/></g>`);
  }
  return o.join('');
}

// 字の形（ページの中も、送る画像も同じ）
export function mcStyle() {
  return `<style>.mn{font-family:"Hiragino Mincho ProN","Yu Mincho","Noto Serif CJK JP","Noto Serif JP",serif}.gs{font-family:"Hiragino Sans","Hiragino Kaku Gothic ProN","Yu Gothic","Noto Sans CJK JP","Noto Sans JP",sans-serif}</style>`;
}

// ページに出す1枚（同じ部品。広い画面は横に、スマホは縦に並べる）
export function mcCardSvg(r, i, pref, M, img) {
  const label = `${pref}${r[1]}：人口${mcMan(r[3])}`;
  return `<svg class="mc" viewBox="0 0 540 820" role="img" aria-label="${mcEsc(label)}">${mcStyle()}${mcCard(r, i, pref, M, img, 'all')}</svg>`;
}

// 送る画像（1200×900。いつも横に2枚）。part は mcCard と同じ。'over' のときは右下の字も入れない
export function mcShareSvg(a, b, pa, pb, M, part) {
  const foot =
    part === 'over'
      ? ''
      : `<text x="1160" y="886" text-anchor="end" fill="#23312a"><tspan class="mn" font-size="18" font-weight="700">まちの社会科</tspan><tspan class="gs" font-size="15" dx="10">machi-shakaika.com</tspan></text>`;
  return `<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900" viewBox="0 0 1200 900">${mcStyle()}${part === 'over' ? '' : '<rect width="1200" height="900" fill="#fff"/>'}<g transform="translate(40 40)">${mcCard(a, 0, pa, M, null, part)}</g><g transform="translate(620 40)">${mcCard(b, 1, pb, M, null, part)}</g>${foot}</svg>`;
}

// 全国の値（ビルドのときにデータの合計から作る。年齢は人数、世帯の割合は世帯数で重みづけ）
//   list は stats.mjs の muniList の形（pop・pop2020・age014・age65・single・ippan・kyodo・housed）
export function nationalCard(list) {
  const sum = (k) => list.reduce((s, a) => s + (a[k] || 0), 0);
  const r1 = (x) => Math.round(x * 10) / 10;
  return {
    g: r1(((sum('pop') - sum('pop2020')) / sum('pop2020')) * 100),
    p014: r1((sum('age014') / sum('pop')) * 100),
    p65: r1((sum('age65') / sum('pop')) * 100),
    single: r1((sum('single') / sum('ippan')) * 100),
    kyodo: r1((sum('kyodo') / sum('housed')) * 100),
  };
}
