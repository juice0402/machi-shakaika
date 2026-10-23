import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMunis } from '../src/munis.mjs';
import { readYaml } from '../src/data.mjs';
import { resolveCities } from '../src/areas.mjs';
import { muniList, similar, derive } from '../src/stats.mjs';
import { METRICS, top5Topics, docchiData, fair, machiQuiz, sonaeData, calcChoices, show } from '../src/quiz.mjs';

const munis = readMunis();
const skip = !munis && 'data/estat/munis.json がない';

test('トップ5当て：お題があり、5位と6位が表示で同じにならない', { skip }, () => {
  const t = top5Topics(munis.areas);
  assert.ok(t.length >= 5, `お題 ${t.length}`);
  for (const x of t) {
    assert.equal(x.order.length, 47);
    assert.notEqual(x.vals[4], x.vals[5], x.title);
    assert.ok(!/人口が増え|減|高齢|65歳/.test(x.title), `住む人が気にする題：${x.title}`);
  }
});

test('どっちが多い：くらべる数字に、減り方・高齢化の題がない。問題にできる組がたくさんある', { skip }, () => {
  for (const m of METRICS) assert.ok(!/減|高齢|65歳|所得/.test(m.q), m.q);
  const { cities } = resolveCities(munis.areas);
  const d = docchiData(munis.areas, cities, (c) => `/x/${c}/`);
  assert.equal(d.a.length, cities.length + 47);
  METRICS.forEach((m, i) => {
    const c = d.a.filter((a) => a[3] === 'c');
    let n = 0;
    for (let x = 0; x < c.length; x++) for (let y = x + 1; y < c.length; y++) if (fair(m, c[x][4 + i], c[y][4 + i])) n++;
    assert.ok(n >= 100, `${m.key}: ${n}組`);
  });
  const pop = METRICS[0];
  assert.equal(fair(pop, 1000, 1000), false);
  assert.equal(fair(pop, 1000, 1010), false); // 差が小さい
  assert.equal(fair(pop, 1000, 5000), false); // 3倍より開いている
  assert.equal(fair(pop, 1000, 1500), true);
  assert.equal(show(METRICS[4], 2.3456), '2.35');
});

test('わたしの街クイズ：74の街すべてに3問。選択肢はちがう3つで、答えは1つ', { skip }, () => {
  const list = muniList(munis.areas);
  const { cities } = resolveCities(munis.areas);
  const codes = new Set(cities.map((c) => c.code));
  const cityList = list.filter((x) => codes.has(x.code));
  for (const c of cities) {
    const a = derive(munis.areas[c.code]);
    const qs = machiQuiz(a, list, similar(list, a), cityList);
    assert.equal(qs.length, 3, c.code);
    for (const q of qs) {
      assert.equal(new Set(q.ch).size, q.ch.length, `${a.name} ${q.q}`);
      assert.ok(q.a >= 0 && q.a < q.ch.length);
    }
    // 同じ入力からは同じ問題（ビルドの結果が毎回同じ）
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
