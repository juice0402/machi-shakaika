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
