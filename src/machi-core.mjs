// 似てる街さがし・2つの街をくらべる の部品（ブラウザでも同じものを使う。関数の中身を toString でページに入れるので、
// ここの関数は引数と Math・ほかの mt から始まる関数だけを使い、外の変数・import を使わない）
//
// K（/kurabe/kazu.json）の形：
//   s: 似ているの計算の物差し [[平均, 散らばり], ...]（人口1万人以上の市区町村から。人口は対数）
//   p: { "01": "北海道", ... }
//   r: [市区町村コード, 名前, ページのURL か 0, 人口, 15歳未満%×10, 65歳以上%×10, 5年の増減%×10, ひとり暮らし%×10, 共同住宅%×10]
//   読みがなは /search.json（トップの市区町村さがしと同じ）から、都道府県と名前で引く
//      （人口の多い順。政令市は市でまとめ、区はふくめない）

// 似ているの計算に使う数字：人口（対数）・15歳未満・65歳以上・5年の人口の増減・ひとり暮らし・共同住宅
export function mtVec(r) {
  return [Math.log(r[3]), r[4] / 10, r[5] / 10, r[6] / 10, r[7] / 10, r[8] / 10];
}

// 似ている街の候補：人口1万人以上
export function mtCand(r) {
  return r[3] >= 10000;
}

// 全国の散らばり（候補の平均と標準偏差）
export function mtStats(rows) {
  const vs = rows.filter(mtCand).map(mtVec);
  return vs[0].map((_, i) => {
    const m = vs.reduce((s, v) => s + v[i], 0) / vs.length;
    const sd = Math.sqrt(vs.reduce((s, v) => s + (v[i] - m) ** 2, 0) / vs.length);
    return [m, sd || 1];
  });
}

// 数字が似ている街 n こ（自分はのぞく。同じ重みで、ならした距離の近い順。同じ距離ならコードの順）
export function mtNear(rows, S, code, n) {
  const me = rows.find((r) => r[0] === code);
  if (!me) return [];
  const a = mtVec(me);
  return rows
    .filter((r) => r[0] !== code && mtCand(r))
    .map((r) => {
      const v = mtVec(r);
      let d = 0;
      for (let i = 0; i < v.length; i++) d += ((v[i] - a[i]) / S[i][1]) ** 2;
      return [d, r];
    })
    .sort((p, q) => p[0] - q[0] || (p[1][0] < q[1][0] ? -1 : 1))
    .slice(0, n)
    .map((p) => p[1]);
}

// 2つの街のちがい（a から b へ。差の小さい項目は出さない）
//   割合：5%以上の差か1.3倍以上。人口の増減：2%以上の差。人口：1.3倍以上
//   言い回しは事実だけ（よい・悪いを言わない）
export function mtDiff(a, b) {
  const out = [];
  const pa = a[3];
  const pb = b[3];
  if (Math.max(pa, pb) / Math.min(pa, pb) >= 1.3) {
    const r = pb / pa;
    const t = r >= 1 ? `約${r >= 10 ? Math.round(r) : r.toFixed(1)}倍` : r < 0.5 ? `約${Math.round(pa / pb)}分の1` : `約${r.toFixed(1)}倍`;
    out.push({ k: 'pop', label: '人口', a: pa, b: pb, text: t });
  }
  const P = [
    [4, 'p014', '子ども（15歳未満）の割合'],
    [5, 'p65', '65歳以上の人の割合'],
    [7, 'pSingle', 'ひとり暮らしの世帯の割合'],
    [8, 'pKyodo', '共同住宅に住む世帯の割合'],
  ];
  for (const [i, k, label] of P) {
    const x = a[i] / 10;
    const y = b[i] / 10;
    const d = Math.round((y - x) * 10) / 10;
    const lo = Math.min(x, y);
    const R = lo > 0 ? Math.max(x, y) / lo : Infinity;
    if (Math.abs(d) < 5 && R < 1.3) continue;
    let t;
    if (d > 0) t = R >= 1.5 && R !== Infinity ? `${R.toFixed(1)}倍` : `${d.toFixed(1)}%高い`;
    else t = Math.abs(d) >= 5 || x === 0 ? `${Math.abs(d).toFixed(1)}%低い` : `${(y / x).toFixed(1)}倍`;
    out.push({ k, label, a: x, b: y, text: t });
  }
  const ra = a[6] / 10;
  const rb = b[6] / 10;
  const dr = Math.round((rb - ra) * 10) / 10;
  if (Math.abs(dr) >= 2) out.push({ k: 'rate', label: '2020年からの人口の増減', a: ra, b: rb, text: `差 ${Math.abs(dr).toFixed(1)}%` });
  return out;
}

export function mtEsc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// ちがいの絵（棒2本と数字）。na・nb は街の名前
export function mtDiffHtml(diffs, na, nb) {
  if (!diffs.length) return '<p class="kd0">くらべた数字に、大きなちがいはありません。</p>';
  const sg = (v) => `${v > 0 ? '+' : ''}${v.toFixed(1)}%`;
  const max = Math.max(...diffs.filter((d) => d.k === 'pop').map((d) => Math.max(d.a, d.b)), 1);
  return diffs
    .map((d) => {
      const isPop = d.k === 'pop';
      const v = (x) => (isPop ? `${Math.round(x).toLocaleString('ja-JP')}人` : d.k === 'rate' ? sg(x) : `${x.toFixed(1)}%`);
      const w = (x) => (d.k === 'rate' ? 0 : isPop ? (x / max) * 100 : x).toFixed(1);
      const row = (n, x, c) =>
        `<span class="kn">${mtEsc(n)}</span>${d.k === 'rate' ? '<span></span>' : `<div class="share${c}"><i style="width:${w(x)}%"></i></div>`}<span class="num">${v(x)}</span>`;
      return `<div class="kd"><p class="kt">${d.label}<b>${d.text}</b></p><div class="bars kb">${row(na, d.a, ' ka')}${row(nb, d.b, '')}</div></div>`;
    })
    .join('');
}

// 数字が似ている街の表（me はえらんだ街、near は mtNear の答え、P は都道府県の名前）
export function mtNearHtml(me, near, P) {
  const p1 = (v) => `${(v / 10).toFixed(1)}%`;
  const tr = (r, isMe) =>
    `<tr${isMe ? ' class="me"' : ''}><td>${isMe ? mtEsc(r[1]) : r[2] ? `<a href="${r[2]}">${mtEsc(r[1])}</a>` : mtEsc(r[1])}<br><span class="note">${mtEsc(P[r[0].slice(0, 2)])}</span></td><td>${r[3].toLocaleString('ja-JP')}</td><td>${p1(r[5])}</td><td>${p1(r[7])}</td></tr>`;
  return `<table class="tbl"><thead><tr><th>数字が似ている街</th><th>人口</th><th>65歳以上</th><th>ひとり暮らし</th></tr></thead><tbody>${tr(me, true)}${near.map((r) => tr(r, false)).join('')}</tbody></table>`;
}
