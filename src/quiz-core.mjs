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

// ---- この街はどこ？・ならべる・ヒントで街あて（#43）----
// 市区町村の行のうしろ（3＋数字の数）は読みがな（data/yomi.json。ないときは ''）

// 地方（北海道と東北、九州と沖縄はいっしょ。ヒントで街あてで、どの地方にも3つ以上の県があるように）
export function qRegion(code) {
  const n = Number(String(code).slice(0, 2));
  return n <= 7 ? 0 : n <= 14 ? 1 : n <= 23 ? 2 : n <= 30 ? 3 : n <= 35 ? 4 : n <= 39 ? 5 : 6;
}
export function qRegionName(i) {
  return ['北海道・東北', '関東', '中部', '近畿', '中国', '四国', '九州・沖縄'][i];
}

// この街はどこ？・ヒントで街あての街：'' おまかせ（人口5万人以上）・'big' 人口10万人以上・'all' 全国・'r0'〜'r6' 地方の中の人口5万人以上
//   名前が全国で1つの街だけ（同じ名前の街があると答えが1つに決まらない）
export function qTowns(D, scope) {
  const cnt = {};
  for (const r of D.munis) cnt[r[1]] = (cnt[r[1]] || 0) + 1;
  const rows = D.munis.filter((r) => cnt[r[1]] === 1);
  if (scope === 'all') return rows;
  if (scope === 'big') return rows.filter((r) => r[3] >= 100000);
  const base = rows.filter((r) => r[3] >= 50000);
  return scope && scope[0] === 'r' ? base.filter((r) => qRegion(r[0]) === Number(scope.slice(1))) : base;
}

// この街はどこ？で出す街：県と同じ名前の市（静岡市など）は名前が答えになるので出さない
export function qDokoPool(D, scope) {
  const pn = {};
  for (const p of D.prefs) pn[p[0]] = p[1].replace(/[都道府県]$/, '');
  return qTowns(D, scope).filter((r) => r[1].replace(/[市区町村]$/, '') !== pn[r[0].slice(0, 2)]);
}

// n問。同じ街は出さない。同じ県は、範囲の県の数で割った数まで（東京の街ばかりにならないように）
export function qDoko(D, scope, rand, n) {
  const a = qDokoPool(D, scope).slice();
  const prefs = {};
  for (const r of a) prefs[r[0].slice(0, 2)] = 1;
  const cap = Math.max(1, Math.ceil(n / Object.keys(prefs).length));
  const per = {};
  const out = [];
  for (let i = 0; i < a.length && out.length < n; i++) {
    const j = i + Math.floor(rand() * (a.length - i));
    [a[i], a[j]] = [a[j], a[i]];
    const p = a[i][0].slice(0, 2);
    if ((per[p] || 0) >= cap) continue;
    per[p] = (per[p] || 0) + 1;
    out.push({ r: a[i], p });
  }
  // 街の少ない県があって足りないときは、上の数をこえて足す
  for (let i = 0; i < a.length && out.length < n; i++) if (!out.some((q) => q.r === a[i])) out.push({ r: a[i], p: a[i][0].slice(0, 2) });
  return out;
}

// ならべる：範囲はどっちが多いと同じ。3つのどの2つも qFair をみたす組だけ（順番が1つに決まる）。order は大きい順の番号
export function qNarabe(D, scope, rand, n) {
  const out = [];
  const seen = {};
  for (let tries = 0; out.length < n && tries < 8000; tries++) {
    const pool = qPool(D, scope, rand);
    const rows = pool.rows;
    if (rows.length < 3) continue;
    const mi = Math.floor(rand() * D.m.length);
    const m = D.m[mi];
    const p = [0, 1, 2].map(() => rows[Math.floor(rand() * rows.length)]);
    if (p[0] === p[1] || p[0] === p[2] || p[1] === p[2]) continue;
    const v = p.map((r) => r[3 + mi]);
    if (!qFair(m, v[0], v[1]) || !qFair(m, v[0], v[2]) || !qFair(m, v[1], v[2])) continue;
    const key = p.map((r) => r[0]).sort().join('-') + ':' + mi;
    if (seen[key]) continue;
    seen[key] = 1;
    out.push({ mi, kind: pool.kind, p, order: [0, 1, 2].sort((x, y) => v[y] - v[x]) });
  }
  return out;
}

// ヒントで街あて：答えと同じ地方で、県がみなちがう3つの街（最後のヒントの県の名前で、答えが1つに決まる）
//   ヒントは 地方 → 人口の大きさ → 数字の特徴（全国でいちばん上のほうにある数字。人口と世帯の数はのぞく）→ 県の名前
export function qHint(D, scope, rand, n) {
  const towns = qTowns(D, scope);
  const L = D.m.length;
  const rank = {};
  for (let mi = 2; mi < L; mi++) {
    const s = D.munis.filter((r) => r[3 + mi] != null).sort((x, y) => y[3 + mi] - x[3 + mi]);
    const o = {};
    s.forEach((r, i) => (o[r[0]] = i));
    rank[mi] = { o, len: s.length };
  }
  const PN = {};
  for (const p of D.prefs) PN[p[0]] = p[1];
  const B = [[1e4, '1万人未満'], [3e4, '1万〜3万人'], [5e4, '3万〜5万人'], [1e5, '5万〜10万人'], [2e5, '10万〜20万人'], [5e5, '20万〜50万人'], [1e6, '50万〜100万人'], [Infinity, '100万人以上']];
  const pick = (rows) => rows[Math.floor(rand() * rows.length)];
  const out = [];
  const used = {};
  for (let tries = 0; out.length < n && tries < 3000; tries++) {
    const a = pick(towns);
    if (!a || used[a[0]]) continue;
    const g = qRegion(a[0]);
    const others = towns.filter((r) => qRegion(r[0]) === g && r[0].slice(0, 2) !== a[0].slice(0, 2));
    const b = pick(others);
    if (!b) continue;
    const c = pick(others.filter((r) => r[0].slice(0, 2) !== b[0].slice(0, 2)));
    if (!c) continue;
    let best = -1;
    for (let mi = 2; mi < L; mi++) if (a[3 + mi] != null && rank[mi].o[a[0]] != null && (best < 0 || rank[mi].o[a[0]] / rank[mi].len < rank[best].o[a[0]] / rank[best].len)) best = mi;
    if (best < 0) continue;
    used[a[0]] = 1;
    const m = D.m[best];
    const pct = Math.max(1, Math.ceil(((rank[best].o[a[0]] + 1) / rank[best].len) * 100));
    const ch = [a, b, c];
    for (let i = 2; i > 0; i--) {
      const j = Math.floor(rand() * (i + 1));
      [ch[i], ch[j]] = [ch[j], ch[i]];
    }
    out.push({
      ch,
      a: ch.indexOf(a),
      mi: best,
      hints: [qRegionName(g) + '地方の市区町村', '人口は' + B.find((x) => a[3] < x[0])[1], m[1] + '。全国の市区町村で上から' + pct + '%、' + qFmt(m, a[3 + best]) + m[2], PN[a[0].slice(0, 2)] + 'の市区町村'],
    });
  }
  return out;
}

export const CORE_FUNCS = [qFmt, qFair, qPool, qDocchi, qDobonTopics, qDobonBoard, qRegion, qRegionName, qTowns, qDokoPool, qDoko, qNarabe, qHint];
export const CORE_JS = CORE_FUNCS.map((f) => f.toString()).join('\n');
