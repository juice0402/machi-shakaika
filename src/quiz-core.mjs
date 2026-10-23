// クイズの問題を作る部品（ブラウザでも同じものを使う。関数の中身を toString でページに入れるので、
// ここの関数は引数と Math だけを使い、外の変数・import を使わない）
//
// D（/quiz/machi.json）の形：
//   m:     くらべる数字 [問い, トップのお題（null は出さない）, 単位, 小数のけた, 最小の差, 最小の割合の差]
//   prefs: [都道府県コード2けた, 名前, URLの名前, ...数字]
//   munis: [市区町村コード5けた, 名前, ページのURL か 0, ...数字]（政令市は市でまとめる。区はふくめない）

export function qFmt(m, v) {
  return m[3] ? Number(v).toFixed(m[3]) : Math.round(v).toLocaleString('ja-JP');
}

// 2つの数字を「どっちが多い」にできるか：同じ・差が小さすぎる・（数の大きいものは）3倍より開いている、はだめ
export function qFair(m, x, y) {
  if (x == null || y == null || x === y) return false;
  if (m[4] && Math.abs(x - y) < m[4]) return false;
  if (m[5] && (Math.abs(x - y) / Math.max(x, y) < m[5] || Math.max(x, y) / Math.min(x, y) > 3)) return false;
  return qFmt(m, x) !== qFmt(m, y);
}

// どっちが多いの範囲：'' おまかせ・'p' 都道府県・'big' 人口10万人以上・'all' 全国の市区町村・'13' など 県の中
export function qPool(D, scope, rand) {
  const big = D.munis.filter((r) => r[3] >= 100000);
  if (scope === 'p') return { kind: 'p', rows: D.prefs };
  if (scope === 'big') return { kind: 'm', rows: big };
  if (scope === 'all') return { kind: 'm', rows: D.munis };
  if (scope) return { kind: 'm', rows: D.munis.filter((r) => r[0].slice(0, 2) === scope) };
  const x = rand();
  if (x < 0.25) return { kind: 'p', rows: D.prefs };
  if (x < 0.65) return { kind: 'm', rows: big };
  const p = D.prefs[Math.floor(rand() * D.prefs.length)][0];
  return { kind: 'm', rows: D.munis.filter((r) => r[0].slice(0, 2) === p) };
}

export function qDocchi(D, scope, rand, n) {
  const out = [];
  const seen = {};
  for (let tries = 0; out.length < n && tries < 5000; tries++) {
    const pool = qPool(D, scope, rand);
    const rows = pool.rows;
    if (rows.length < 2) continue;
    const mi = Math.floor(rand() * D.m.length);
    const a = rows[Math.floor(rand() * rows.length)];
    const b = rows[Math.floor(rand() * rows.length)];
    const key = [a[0], b[0]].sort().join('-') + ':' + mi;
    if (a === b || seen[key] || !qFair(D.m[mi], a[3 + mi], b[3 + mi])) continue;
    seen[key] = 1;
    out.push({ mi, kind: pool.kind, p: [a, b] });
  }
  return out;
}

// ドボンクイズのお題の一覧：都道府県の地図（トップ10）・全国の市区町村（トップ10）・県ごとの市区町村（25以上ならトップ10、少なければトップ5）
// N位と N+1位が表示で同じになるお題は、割合だけ1けた細かく出す。それでも同じなら出さない
export function qDobonTopics(D) {
  const out = [];
  const add = (scope, rows, N, board) => {
    D.m.forEach((m0, mi) => {
      if (!m0[1]) return;
      const s = rows.filter((r) => r[3 + mi] != null).sort((x, y) => y[3 + mi] - x[3 + mi]);
      if (s.length <= N) return;
      const tries = m0[2] === '%' ? [m0, [m0[0], m0[1], m0[2], m0[3] + 1, m0[4], m0[5]]] : [m0];
      const m = tries.find((t) => qFmt(t, s[N - 1][3 + mi]) !== qFmt(t, s[N][3 + mi]));
      if (m) out.push({ scope, mi, N, board, digits: m[3] });
    });
  };
  add('p', D.prefs, 10, 'map');
  add('all', D.munis, 10, 'words');
  for (const p of D.prefs) {
    const rows = D.munis.filter((r) => r[0].slice(0, 2) === p[0]);
    add(p[0], rows, rows.length >= 25 ? 10 : 5, 'words');
  }
  return out;
}

// お題の順位と、えらぶ語群（地図のときは47すべて。語群はトップN＋そのすぐ下からまぜて30まで）
export function qDobonBoard(D, t, rand) {
  const rows = t.scope === 'p' ? D.prefs : t.scope === 'all' ? D.munis : D.munis.filter((r) => r[0].slice(0, 2) === t.scope);
  const order = rows.filter((r) => r[3 + t.mi] != null).sort((x, y) => y[3 + t.mi] - x[3 + t.mi]);
  let board = order;
  if (t.board === 'words' && order.length > 30) {
    const near = order.slice(t.N, t.N + 40);
    for (let i = near.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [near[i], near[j]] = [near[j], near[i]];
    }
    board = order.slice(0, t.N).concat(near.slice(0, 30 - t.N));
  }
  if (t.board === 'words') {
    board = board.slice();
    for (let i = board.length - 1; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [board[i], board[j]] = [board[j], board[i]];
    }
  }
  return { order, board };
}

export const CORE_FUNCS = [qFmt, qFair, qPool, qDocchi, qDobonTopics, qDobonBoard];
export const CORE_JS = CORE_FUNCS.map((f) => f.toString()).join('\n');
