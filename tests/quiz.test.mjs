import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMunis } from '../src/munis.mjs';
import { readYaml } from '../src/data.mjs';
import { resolveCities } from '../src/areas.mjs';
import { muniList, similar, derive } from '../src/stats.mjs';
import { METRICS, machiData, machiQuiz, sonaeData, calcChoices, rng } from '../src/quiz.mjs';
import { qFair, qFmt, qDocchi, qDobonTopics, qDobonBoard, CORE_JS } from '../src/quiz-core.mjs';

const munis = readMunis();
const skip = !munis && 'data/estat/munis.json がない';
const D = munis ? machiData(munis.areas, () => null) : null;

test('くらべる数字に、減り方・高齢化・所得の題がない', () => {
  for (const m of METRICS) assert.ok(!/減|高齢|65歳|所得/.test(m.q + (m.top ?? '')), m.q);
});

test('machi.json：都道府県47と全国の市区町村、数字がそろっている', { skip }, () => {
  assert.equal(D.prefs.length, 47);
  assert.ok(D.munis.length >= 1700);
  assert.equal(D.m.length, METRICS.length);
  for (const r of [...D.prefs, ...D.munis]) for (let i = 0; i < METRICS.length; i++) assert.ok(r[3 + i] != null && r[3 + i] >= 0 && (D.m[i][5] ? r[3 + i] > 0 : true), `${r[1]} ${METRICS[i].key}`);
  assert.ok(JSON.stringify(D).length < 300000, '重すぎる');
});

test('どっちが多い：決まり（同じ・差が小さい・3倍より開く組は出さない）と、範囲ごとに10問できる', { skip }, () => {
  const pop = D.m[0];
  assert.equal(qFair(pop, 1000, 1000), false);
  assert.equal(qFair(pop, 1000, 1010), false);
  assert.equal(qFair(pop, 1000, 5000), false);
  assert.equal(qFair(pop, 1000, 1500), true);
  assert.equal(qFmt(D.m[4], 2.3456), '2.35');
  const r = rng(1);
  for (const scope of ['', 'p', 'big', 'all', ...D.prefs.map((p) => p[0])]) {
    const qs = qDocchi(D, scope, r, 10);
    assert.equal(qs.length, 10, `範囲 ${scope}`);
    for (const q of qs) assert.ok(qFair(D.m[q.mi], q.p[0][3 + q.mi], q.p[1][3 + q.mi]));
  }
});

test('ドボンクイズ：お題がたくさんあり、N位とN+1位が表示で同じにならない。語群は30まで、トップNを全部ふくむ', { skip }, () => {
  const T = qDobonTopics(D);
  assert.ok(T.length >= 400, `お題 ${T.length}`);
  assert.ok(T.filter((t) => t.scope === 'p').length >= 8);
  assert.ok(T.filter((t) => t.scope === 'all').length >= 8);
  const r = rng(2);
  for (const t of T) {
    const { order, board } = qDobonBoard(D, t, r);
    const m = [...D.m[t.mi]];
    m[3] = t.digits;
    assert.notEqual(qFmt(m, order[t.N - 1][3 + t.mi]), qFmt(m, order[t.N][3 + t.mi]), `${t.scope} ${t.mi}`);
    if (t.board === 'words') {
      assert.ok(board.length <= 30 && board.length > t.N);
      for (const x of order.slice(0, t.N)) assert.ok(board.includes(x));
    } else assert.equal(board.length, 47);
  }
});

test('ブラウザで使う部品は、外の変数を使わない（ページに入れて動く）', { skip }, () => {
  const f = new Function('D', `${CORE_JS}\nreturn [qDocchi(D,'',Math.random,10).length, qDobonTopics(D).length];`);
  const [n, t] = f(D);
  assert.equal(n, 10);
  assert.ok(t >= 400);
});

test('わたしの街クイズ：ページを作る街すべてに5問以上。選択肢はちがうもので、答えは1つ。毎回同じ', { skip }, () => {
  const list = muniList(munis.areas);
  const { cities } = resolveCities(munis.areas);
  const codes = new Set(cities.map((c) => c.code));
  const cityList = list.filter((x) => codes.has(x.code));
  for (const c of cities) {
    const a = derive(munis.areas[c.code]);
    const qs = machiQuiz(a, list, similar(list, a), cityList);
    assert.ok(qs.length >= 5, `${a.name} ${qs.length}`);
    for (const q of qs) {
      assert.equal(new Set(q.ch).size, q.ch.length, `${a.name} ${q.q}`);
      assert.ok(q.a >= 0 && q.a < q.ch.length);
      assert.ok(!/減|高齢|65歳/.test(q.q));
      // 街あつめ帳：問題に出た街のコード（この街はいつも入る。5けた）
      assert.ok(q.c.includes(a.code) && q.c.every((x) => /^\d{5}$/.test(x)), `${a.name} ${q.q}`);
    }
    assert.deepEqual(machiQuiz(a, list, similar(list, a), cityList), qs);
  }
});

test('備えの数字クイズ：数字は items.yml から、出典の名前と確認日つき', () => {
  const d = sonaeData(readYaml('items.yml'), readYaml('sources.yml'));
  assert.equal(d.w, 3);
  assert.equal(d.t, 5);
  assert.equal(d.y, 14);
  assert.equal(d.gas, 6);
  for (const s of Object.values(d.src)) assert.match(s, /\d{4}年\d{1,2}月\d{1,2}日確認/);
  for (let n = 1; n <= 6; n++) for (const day of [3, 7]) for (const per of [3, 5]) assert.ok(calcChoices(per, n, day), `${per} ${n} ${day}`);
});

// ---- この街はどこ？・ならべる・ヒントで街あて（#43）：どの問題も答えが1つに決まる ----
import { qRegion, qTowns, qDokoPool, qDoko, qNarabe, qHint } from '../src/quiz-core.mjs';
import { readYomi } from '../src/yomi.mjs';
const SCOPES_T = ['', 'big', 'all', 'c1', 'c2', 'c3', 'c4', 'c5', 'c6', 'c7'];
const DY = munis ? machiData(munis.areas, () => null, readYomi()) : null;

test('地方：7つ、どの地方にも県が3つ以上', () => {
  const n = [0, 0, 0, 0, 0, 0, 0];
  for (let c = 1; c <= 47; c++) n[qRegion(String(c).padStart(2, '0'))]++;
  assert.deepEqual(n, [7, 7, 9, 7, 5, 4, 8]);
});

test('この街はどこ？：同じ名前の街・県と同じ名前の市は出さない。範囲ごとに10問、同じ街なし。おまかせは人口5万人以上', { skip }, () => {
  const cnt = {};
  for (const r of DY.munis) cnt[r[1]] = (cnt[r[1]] || 0) + 1;
  assert.ok(qDokoPool(DY, '').every((r) => r[3] >= 50000));
  assert.ok(!qDokoPool(DY, 'all').some((r) => r[1] === '静岡市' || r[1] === '府中市'));
  const r = rng(3);
  for (const s of SCOPES_T) {
    for (let k = 0; k < 20; k++) {
      const qs = qDoko(DY, s, r, 10);
      assert.equal(qs.length, 10, `範囲 ${s}`);
      assert.equal(new Set(qs.map((q) => q.r[0])).size, 10);
      for (const q of qs) {
        assert.equal(cnt[q.r[1]], 1, q.r[1]);
        assert.equal(q.p, q.r[0].slice(0, 2));
      }
    }
  }
  // 読みがなは市区町村の行の最後（data/yomi.json があるとき）
  if (readYomi()) assert.ok(DY.munis.filter((x) => x[3 + DY.m.length]).length > DY.munis.length * 0.95);
  assert.ok(JSON.stringify(DY).length < 300000, '重すぎる');
});

test('ならべる：3つのどの2つも qFair（同点・近すぎる数字なし）で、大きい順が1つに決まる。範囲ごとに5問', { skip }, () => {
  const r = rng(4);
  for (const s of ['', 'p', 'big', 'all', ...D.prefs.map((p) => p[0])]) {
    const qs = qNarabe(D, s, r, 5);
    assert.equal(qs.length, 5, `範囲 ${s}`);
    for (const q of qs) {
      const m = D.m[q.mi];
      const v = q.p.map((x) => x[3 + q.mi]);
      for (const [a, b] of [[0, 1], [0, 2], [1, 2]]) assert.ok(qFair(m, v[a], v[b]), `${s} ${q.p.map((x) => x[1])}`);
      if (q.lo) assert.ok(v[q.order[0]] < v[q.order[1]] && v[q.order[1]] < v[q.order[2]]);
      else assert.ok(v[q.order[0]] > v[q.order[1]] && v[q.order[1]] > v[q.order[2]]);
    }
  }
});

test('ヒントで街あて：3つは同じ地方・県と名前がみなちがい、最後のヒント（県の名前）で答えが1つに決まる。ヒントは4つ', { skip }, () => {
  const r = rng(5);
  const PN = Object.fromEntries(D.prefs.map((p) => [p[0], p[1]]));
  for (const s of SCOPES_T) {
    for (let k = 0; k < 20; k++) {
      const qs = qHint(D, s, r, 5);
      assert.equal(qs.length, 5, `範囲 ${s}`);
      assert.equal(new Set(qs.map((q) => q.ch[q.a][0])).size, 5);
      for (const q of qs) {
        assert.equal(q.hints.length, 4);
        const a = q.ch[q.a];
        assert.equal(new Set(q.ch.map((x) => qRegion(x[0]))).size, 1);
        assert.equal(new Set(q.ch.map((x) => x[0].slice(0, 2))).size, 3);
        assert.equal(new Set(q.ch.map((x) => x[1])).size, 3);
        assert.equal(q.ch.filter((x) => q.hints[3] === `${PN[x[0].slice(0, 2)]}の市区町村`).length, 1);
        assert.ok(q.mi >= 2 && !/減|高齢|65歳/.test(q.hints.join('')));
        if (s === '' || s[0] === 'c') assert.ok(a[3] >= 50000);
      }
    }
  }
  assert.ok(qTowns(D, 'all').length > 1500);
});

// ---- #44 題・範囲・むずかしさ ----
import { qChiho, qDai, qClose } from '../src/quiz-core.mjs';
import { quizOff, QUIZ_SCOPES, DOCCHI_N, NARABE_N, DOKO_N, HINT_N } from '../src/pages/quiz.mjs';

test('地方（出題の範囲）：8つ。北海道・東北・関東・中部・近畿・中国・四国・九州と沖縄', () => {
  const n = [0, 0, 0, 0, 0, 0, 0, 0];
  for (let c = 1; c <= 47; c++) n[qChiho(String(c).padStart(2, '0'))]++;
  assert.deepEqual(n, [1, 6, 7, 9, 7, 5, 4, 8]);
});

test('題：小さいほうの向きは6つだけ（人口・世帯の数・子どもと15〜64歳の割合は作らない）。言葉に減り方・高齢化がない', { skip }, () => {
  const lo = qDai(D).filter(([, l]) => l).map(([mi]) => METRICS[mi].key);
  assert.deepEqual(lo, ['menseki', 'density', 'per', 'pSingle', 'pKyodo', 'pIkko']);
  for (const m of D.m) if (m[6]) assert.ok(/(少ない|せまい|低い)のは？$/.test(m[6]) && /(少ない|せまい|低い)$/.test(m[7]) && !/減|高齢|65歳/.test(m[6] + m[7]), m[6]);
});

const off = D ? quizOff(D) : null;
const on = (list, offs) => list.filter((s) => !offs.includes(s));

test('どっちが多い・ならべる：えらべる範囲×むずかしさのどれでも1回分作れる。答えは題の向き、むずかしいは差が小さい', { skip }, () => {
  const r = rng(44);
  for (const lv of ['', 'h']) {
    for (const s of on(QUIZ_SCOPES.full, off.docchi[lv])) {
      const qs = qDocchi(D, s, r, DOCCHI_N, lv);
      assert.equal(qs.length, DOCCHI_N, `どっち ${s} ${lv}`);
      for (const q of qs) {
        const [x, y] = q.p.map((p) => p[3 + q.mi]);
        assert.ok((lv ? qClose : qFair)(D.m[q.mi], x, y));
        if (q.lo) assert.ok(D.m[q.mi][6]);
      }
    }
    for (const s of on(QUIZ_SCOPES.full, off.narabe[lv])) {
      const qs = qNarabe(D, s, r, NARABE_N, lv);
      assert.equal(qs.length, NARABE_N, `ならべる ${s} ${lv}`);
      if (lv) for (const q of qs) {
        const v = q.order.map((j) => q.p[j][3 + q.mi]);
        assert.ok(qClose(D.m[q.mi], v[0], v[1]) && qClose(D.m[q.mi], v[1], v[2]));
      }
    }
  }
  // ふつうは全部の範囲がえらべる。むずかしいでえらべないのは、市区町村の少ない県だけ
  assert.deepEqual(off.docchi[''], []);
  assert.deepEqual(off.narabe[''], []);
  for (const s of [...off.docchi.h, ...off.narabe.h]) assert.ok(/^\d\d$/.test(s), s);
  assert.ok(off.docchi.h.length < 10 && off.narabe.h.length < 20);
});

test('題：どの題も、どっちが多い・ならべるで出る', { skip }, () => {
  const r = rng(45);
  const all = new Set(qDai(D).map(([mi, lo]) => mi + ':' + lo));
  for (const [gen, n] of [[qDocchi, DOCCHI_N], [qNarabe, NARABE_N]]) for (const lv of ['', 'h']) for (const s of ['p', 'big']) {
    const got = new Set();
    for (let k = 0; k < 60; k++) for (const q of gen(D, s, r, n, lv)) got.add(q.mi + ':' + q.lo);
    assert.deepEqual([...got].sort(), [...all].sort(), `${gen.name} ${s} ${lv}`);
  }
});

test('ドボンクイズ：地方のお題と小さいほうのお題がある。えらべる範囲にはお題がある', { skip }, () => {
  const T = qDobonTopics(D);
  for (let c = 0; c < 8; c++) assert.ok(T.filter((t) => t.scope === 'c' + c).length >= 10, `地方 ${c}`);
  assert.ok(T.filter((t) => t.lo && t.scope === 'p').length >= 4);
  assert.ok(!T.some((t) => t.lo && !D.m[t.mi][7]));
  for (const s of on(QUIZ_SCOPES.dobon, off.dobon)) if (s) assert.ok(T.some((t) => t.scope === s), s);
  const r = rng(6);
  for (const t of T.filter((x) => x.lo).slice(0, 50)) {
    const { order } = qDobonBoard(D, t, r);
    assert.ok(order[0][3 + t.mi] <= order[t.N][3 + t.mi]);
  }
});

test('この街はどこ？・ヒントで街あて：北海道だけの範囲はえらべない。ほかの範囲はどれも作れる', { skip }, () => {
  assert.deepEqual(off.doko, ['c0']);
  assert.deepEqual(off.hint, ['c0']);
  const r = rng(46);
  for (const s of on(QUIZ_SCOPES.town, off.doko)) assert.equal(qDoko(DY, s, r, DOKO_N).length, DOKO_N, s);
  for (const s of on(QUIZ_SCOPES.town, off.hint)) assert.equal(qHint(D, s, r, HINT_N).length, HINT_N, s);
});
