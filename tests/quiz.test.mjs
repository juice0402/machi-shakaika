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
const SCOPES_T = ['', 'big', 'all', 'r0', 'r1', 'r2', 'r3', 'r4', 'r5', 'r6'];
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
      assert.ok(v[q.order[0]] > v[q.order[1]] && v[q.order[1]] > v[q.order[2]]);
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
        if (s === '' || s[0] === 'r') assert.ok(a[3] >= 50000);
      }
    }
  }
  assert.ok(qTowns(D, 'all').length > 1500);
});
