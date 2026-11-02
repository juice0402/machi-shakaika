// 街あつめ帳（#42）：はんこの記録・続けた日数・クイズとのつなぎ・ページ
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { atsumeAdd, atsumeStreak, atsume, atsumeLoad, ATSUME_JS, ATSUME_KEY } from '../src/atsume-core.mjs';
import { kyouCarry, ATSUME_STEPS } from '../src/pages/atsume.mjs';
import { kyouQ } from '../src/kyou.mjs';

test('はんこ：5けたは街、2けたは県。はじめて押した日を残す', () => {
  const A = {};
  assert.equal(atsumeAdd(A, ['13101', '27100', '13'], '2026-11-02'), 3);
  assert.deepEqual(A.m, { 13101: '2026-11-02', 27100: '2026-11-02' });
  assert.deepEqual(A.p, { 13: '2026-11-02' });
  assert.equal(A.l, '13');
  // 帳面で見ていない新しいはんこ（街だけ。押す動きはここだけ）
  assert.deepEqual(A.n, ['13101', '27100']);
  assert.equal(atsumeAdd(A, ['13101'], '2026-11-03'), 0);
  assert.equal(A.m['13101'], '2026-11-02');
  // 前の日の記録（今日の1問の引きつぎ）は、日付を早いほうにする
  assert.equal(atsumeAdd(A, ['27100'], '2026-10-30'), 0);
  assert.equal(A.m['27100'], '2026-10-30');
  assert.deepEqual(A.d, ['2026-10-30', '2026-11-02', '2026-11-03']);
  // コードでないものは押さない・日も足さない
  assert.equal(atsumeAdd(A, ['', 'x', null, '123'], '2026-11-05'), 0);
  assert.ok(!A.d.includes('2026-11-05'));
});

test('はんこ：遊んだ日は400日まで', () => {
  const A = {};
  for (let i = 0; i < 450; i++) atsumeAdd(A, ['01100'], new Date(Date.UTC(2026, 0, 1) + i * 864e5).toISOString().slice(0, 10));
  assert.equal(A.d.length, 400);
  assert.equal(A.d[399], new Date(Date.UTC(2026, 0, 1) + 449 * 864e5).toISOString().slice(0, 10));
});

test('続けた日数：今日がまだなら、きのうまで', () => {
  const d = ['2026-10-28', '2026-10-30', '2026-10-31', '2026-11-01'];
  assert.equal(atsumeStreak(d, '2026-11-01'), 3);
  assert.equal(atsumeStreak(d, '2026-11-02'), 3);
  assert.equal(atsumeStreak(d, '2026-11-03'), 0);
  assert.equal(atsumeStreak([...d, '2026-11-02'], '2026-11-02'), 4);
  assert.equal(atsumeStreak(undefined, '2026-11-02'), 0);
});

test('保存：localStorage の machi-atsume だけ。こわれた記録は空から', () => {
  const store = {};
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => { store[k] = String(v); } };
  try {
    assert.equal(ATSUME_KEY, 'machi-atsume');
    store['machi-atsume'] = '[1,2';
    assert.deepEqual(atsumeLoad(), { m: {}, p: {}, d: [] });
    // 形のちがう所は捨てる（日付でない値・けたのちがうキー・日付でない遊んだ日・2けたでない県）
    store['machi-atsume'] = JSON.stringify({ m: { 13101: 5, 27100: '2026-11-01', 131: '2026-11-01', 40130: '11/1' }, p: { 13: '2026-11-01', 135: '2026-11-01', 27: null }, d: ['2026-11-01', 3, 'x', '2026-13-45', '2026-10-31'], l: 13, n: ['27100', 5, '13'] });
    assert.deepEqual(atsumeLoad(), { m: { 27100: '2026-11-01' }, p: { 13: '2026-11-01' }, d: ['2026-10-31', '2026-11-01'], n: ['27100'] });
    store['machi-atsume'] = JSON.stringify({ m: [], p: 'x', d: 'x', l: '13' });
    assert.deepEqual(atsumeLoad(), { m: {}, p: {}, d: [], l: '13' });
    assert.equal(atsumeStreak(atsumeLoad().d, '2026-11-02'), 0);
    store['machi-atsume'] = '{}';
    assert.equal(atsume(['01100', '47201']), 2);
    assert.deepEqual(Object.keys(store), ['machi-atsume']);
    assert.deepEqual(Object.keys(JSON.parse(store['machi-atsume']).m).sort(), ['01100', '47201']);
  } finally {
    delete globalThis.localStorage;
  }
  // ページに入れる形は、外の変数を使わない（ほかの名前と重ならない）
  assert.doesNotThrow(() => new Function(`${ATSUME_JS};return atsume`)());
  assert.ok(!/fetch|XMLHttpRequest|sendBeacon/.test(ATSUME_JS));
});

test('色の6段：0・少し・5%・15%・30%・半分より上', () => {
  const shade = (r) => ATSUME_STEPS.find(([t]) => r >= t)[1];
  assert.equal(shade(0), '#f6f9f1');
  assert.equal(shade(0.01), '#dcebd9');
  assert.equal(shade(0.05), '#b5cfbb');
  assert.equal(shade(0.2), '#86b391');
  assert.equal(shade(0.3), '#4f8d5e');
  assert.equal(shade(0.51), '#2f6b45');
});

test('今日の1問の引きつぎ：日付から作り直した問題の街と県', () => {
  const D = {
    m: [['人口が多いのは？', '人口', '人', 0], ['世帯が多いのは？', '世帯', '世帯', 0]],
    munis: [['01100', '札幌市', '', 1900000, 900000], ['13101', '千代田区', '', 110000, 70000], ['27100', '大阪市', '', 2700000, 1500000], ['40130', '福岡市', '', 1600000, 800000]],
    prefs: [],
  };
  const k = kyouCarry(D, '2026-10-31');
  assert.deepEqual(Object.keys(k), ['2026-10-29', '2026-10-30', '2026-10-31']);
  for (const [d, r] of Object.entries(k)) {
    const q = kyouQ(D, d);
    assert.deepEqual(r, [q.p[0][0], q.p[1][0], q.p[0][0].slice(0, 2), q.p[1][0].slice(0, 2)]);
  }
});

test('クイズに、はんこを押すつなぎがある（今あるクイズ全部と #43・#44 のクイズ）', () => {
  const src = readFileSync(new URL('../src/pages/quiz.mjs', import.meta.url), 'utf8');
  for (const name of ['DOCCHI_JS', 'DOBON_JS', 'DOKO_JS', 'NARABE_JS', 'HINT_JS', 'MACHI_JS']) {
    const at = src.indexOf(`const ${name} = \``);
    assert.ok(at >= 0, name);
    const body = src.slice(at, src.indexOf('})();`', at));
    assert.match(body, /\$\{ATSUME_JS\}/, `${name} に ATSUME_JS`);
    assert.match(body, /atsume\(/, `${name} で atsume を呼ぶ`);
  }
  const kyou = readFileSync(new URL('../src/pages/kyou.mjs', import.meta.url), 'utf8');
  assert.match(kyou, /atsume\(\[q\.p\[0\]\[0\],q\.p\[1\]\[0\]\]\)/);
});
