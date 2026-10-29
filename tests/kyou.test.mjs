import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMunis } from '../src/munis.mjs';
import { machiData } from '../src/quiz.mjs';
import { qFair } from '../src/quiz-core.mjs';
import { kyouPick, kyouKeep, kyouStreak, KYOU_JS, kyouQ, kyouDays, kyouPool, kyouView, kyouShowDiffers, jstDate, addDays, pathBox, KYOU_DAYS, KYOU_ORDER, KYOU_MIN_POP } from '../src/kyou.mjs';
import { JMAP } from '../src/japan-map-data.mjs';

const munis = readMunis();
const skip = !munis && 'data/estat/munis.json がない';
const D = munis ? machiData(munis.areas, () => null) : null;
const START = '2026-10-29';
const days = (n) => Array.from({ length: n }, (_, i) => addDays(START, i));

test('日本時間の日付：UTC 15時で次の日になる', () => {
  assert.equal(jstDate(Date.parse('2026-10-29T14:59:59Z')), '2026-10-29');
  assert.equal(jstDate(Date.parse('2026-10-29T15:00:00Z')), '2026-10-30');
  assert.equal(addDays('2026-12-31', 1), '2027-01-01');
});

test('題の順番：くらべる数字を1つずつ全部使う', { skip }, () => {
  assert.deepEqual([...KYOU_ORDER].sort((a, b) => a - b), D.m.map((_, i) => i));
});

test('同じ日付なら同じ問題、日付が変わると問題が変わる', { skip }, () => {
  const pool = kyouPool(D);
  const qs = days(60).map((d) => kyouQ(D, d, pool));
  for (const [i, d] of days(60).entries()) assert.deepEqual(kyouQ(D, d), qs[i], d);
  for (let i = 1; i < qs.length; i++) {
    assert.notEqual(qs[i].mi, qs[i - 1].mi, `${qs[i].d} 題が前の日と同じ`);
    assert.notDeepEqual(qs[i].p.map((r) => r[0]).sort(), qs[i - 1].p.map((r) => r[0]).sort());
  }
  // 60日で、同じ組は出ない
  assert.equal(new Set(qs.map((q) => q.p.map((r) => r[0]).sort().join('-'))).size, qs.length);
});

test('2つの街は県がちがう・人口10万人以上・同点や表示が同じになる組なし・名前もちがう', { skip }, () => {
  for (const d of days(120)) {
    const q = kyouQ(D, d);
    const [a, b] = q.p;
    assert.notEqual(a[0].slice(0, 2), b[0].slice(0, 2), d);
    assert.notEqual(a[1], b[1], d);
    assert.ok(a[3] >= KYOU_MIN_POP && b[3] >= KYOU_MIN_POP, d);
    assert.ok(qFair(D.m[q.mi], a[3 + q.mi], b[3 + q.mi]), d);
    assert.ok(kyouShowDiffers(D, q), d);
  }
});

test('禁止の題（減り方・高齢化・65歳以上・所得）は出さない', { skip }, () => {
  for (const d of days(30)) assert.ok(!/減|高齢|65歳|所得/.test(D.m[kyouQ(D, d).mi][0]), d);
});

test('毎週のデータ更新で、えらばれていない街が増えたり減ったりしても、その日の問題は変わらない', { skip }, () => {
  for (const d of days(14)) {
    const q = kyouQ(D, d);
    const keep = new Set(q.p.map((r) => r[0]));
    // えらばれていない街を1割へらし、ほかの街の数字を少し動かす
    const D2 = { ...D, munis: D.munis.filter((r, i) => keep.has(r[0]) || i % 10).map((r) => (keep.has(r[0]) ? r : [...r.slice(0, 3), ...r.slice(3).map((v) => v * 1.001)])) };
    const q2 = kyouQ(D2, d);
    assert.deepEqual(q2.p.map((r) => r[0]), q.p.map((r) => r[0]), d);
    assert.equal(q2.mi, q.mi);
  }
});

test('ページに入れるのは14日分（日付が続く）で、地図の切り出しに2つの県名が入る', { skip }, () => {
  const ds = kyouDays(D, START, () => '/x/');
  assert.equal(ds.length, KYOU_DAYS);
  ds.forEach((q, i) => {
    assert.equal(q.d, addDays(START, i));
    const [x, y, w, h] = q.v.vb;
    for (const [lx, ly] of q.v.lab) assert.ok(lx > x && lx < x + w && ly > y && ly < y + h, `${q.d} 県名が外`);
  });
  assert.ok(JSON.stringify(ds).length < 6000, '重すぎる');
});

test('地図：どの2つの県の組でも、切り出しに両方の県の形が入る', () => {
  const codes = Object.keys(JMAP.prefs);
  for (const a of codes) for (const b of codes) {
    if (a >= b) continue;
    const { vb: [x, y, w, h] } = kyouView(a, b);
    for (const c of [a, b]) {
      const [x0, y0, x1, y1] = pathBox(JMAP.prefs[c].d);
      assert.ok(x0 >= x - 0.1 && y0 >= y - 0.1 && x1 <= x + w + 0.1 && y1 <= y + h + 0.1, `${a}-${b} ${c}`);
    }
  }
});

test('ページ：/quiz/kyou/ は AdSense なし・回答を送らない（fetch を使わない）・絵文字なし', { skip }, async () => {
  const { kyouPage } = await import('../src/pages/kyou.mjs');
  const p = kyouPage({ munis, machi: D, start: START, urlOfRow: () => '/x/' });
  assert.equal(p.path, '/quiz/kyou/');
  assert.equal(p.noAds, true);
  assert.ok(!/fetch\(|XMLHttpRequest|sendBeacon/.test(p.script));
  assert.ok(!/\p{Extended_Pictographic}/u.test(p.body + p.script + p.head));
});

test('日本時間0時の切りかえ：UTC 14:59 と 15:00 で今日の1問が入れかわる', { skip }, () => {
  const qs = kyouDays(D, START, () => '/x/');
  assert.equal(kyouPick(qs, jstDate(Date.parse('2026-10-29T14:59:59Z'))).q.d, '2026-10-29');
  assert.equal(kyouPick(qs, jstDate(Date.parse('2026-10-29T15:00:00Z'))).q.d, '2026-10-30');
});

test('14日の外の日は問題なし（ページは「読み込めませんでした」）・あしたの題は本当の次の日だけ', () => {
  const qs = [{ d: '2026-10-29' }, { d: '2026-10-31' }, { d: '2026-11-01' }];
  assert.equal(kyouPick(qs, '2026-11-12').q, null);
  assert.equal(kyouPick(qs, '2026-10-28').q, null);
  assert.equal(kyouPick(qs, '2026-10-29').next, null, '30日が作れなかったので31日の題は予告しない');
  assert.equal(kyouPick(qs, '2026-10-31').next.d, '2026-11-01');
  assert.equal(kyouPick(qs, '2026-11-01').next, null);
});

test('連続正解：途切れ・今日まだ答えていない日・いままでの最高', () => {
  const R = { '2026-10-20': [0, 1], '2026-10-21': [0, 1], '2026-10-22': [0, 1], '2026-10-23': [0, 1], '2026-10-25': [0, 1], '2026-10-26': [1, 0], '2026-10-27': [0, 1], '2026-10-28': [0, 1] };
  assert.deepEqual(kyouStreak(R, '2026-10-29'), [2, 4], '今日まだ：きのうまでの2日・最高は20〜23日の4日');
  assert.deepEqual(kyouStreak({ ...R, '2026-10-29': [0, 1] }, '2026-10-29'), [3, 4]);
  assert.deepEqual(kyouStreak({ ...R, '2026-10-29': [1, 0] }, '2026-10-29'), [0, 4], 'まちがえたら0');
  assert.deepEqual(kyouStreak(R, '2026-10-30'), [0, 4], '1日あくと途切れる');
  assert.deepEqual(kyouStreak({}, '2026-10-29'), [0, 0]);
  assert.deepEqual(kyouStreak({ '2026-12-31': [0, 1], '2027-01-01': [0, 1] }, '2027-01-01'), [2, 2], '年をまたぐ');
});

test('組が変わった日の古い記録は消して保存し直す。同じ組なら答えたまま', () => {
  const q = { p: [['a', 'x', '13'], ['b', 'y', '27']] };
  const R = { '2026-10-29': [0, 1, '13', '27'] };
  assert.deepEqual(kyouKeep(R, '2026-10-29', q), { done: true, changed: false });
  const R2 = { '2026-10-29': [0, 1, '01', '47'], '2026-10-28': [0, 1, '02', '03'] };
  assert.deepEqual(kyouKeep(R2, '2026-10-29', q), { done: false, changed: true });
  assert.deepEqual(Object.keys(R2), ['2026-10-28']);
  assert.deepEqual(kyouKeep({}, '2026-10-29', q), { done: false, changed: false });
});

test('ブラウザに入れる部品は、外の変数を使わずに動く', () => {
  const f = new Function(`${KYOU_JS}; return { jstDate, addDays, kyouPick, kyouKeep, kyouStreak };`)();
  assert.equal(f.jstDate(Date.parse('2026-10-29T15:00:00Z')), '2026-10-30');
  assert.equal(f.addDays('2026-12-31', 1), '2027-01-01');
  assert.deepEqual(f.kyouStreak({ '2026-10-28': [0, 1] }, '2026-10-29'), [1, 1]);
  assert.equal(f.kyouPick([{ d: '2026-10-29' }, { d: '2026-10-30' }], '2026-10-29').next.d, '2026-10-30');
});
