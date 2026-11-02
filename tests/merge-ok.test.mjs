import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderDeps, waitingOn, evaluateChecks, mergeableAction, mergeTitle, mergeMessage, hasLabel, pickTargets, MSG, GRACE_MS, SELF_JOB } from '../scripts/merge-ok.mjs';

const pr = (number, extra = {}) => ({ number, head: { ref: `claude/x-${number}` }, body: '', ...extra });

test('順番の指定の3つの書き方', () => {
  assert.deepEqual(orderDeps('⚠️ #106 の PR #109 のあとにマージ（この PR には #106 の変更もふくまれる）\n\nCloses #107'),
    [{ num: 109, kind: 'pr' }, { num: 106, kind: 'any' }]);
  assert.deepEqual(orderDeps('PR #34 のあとにマージ'), [{ num: 34, kind: 'pr' }]);
  assert.deepEqual(orderDeps('#12 のあとにマージしてください'), [{ num: 12, kind: 'any' }]);
  assert.deepEqual(orderDeps('＃１２の後にマージ'), [{ num: 12, kind: 'any' }]);
  assert.deepEqual(orderDeps('**PR #5** のあとでマージ'), [{ num: 5, kind: 'pr' }]);
});

test('かっこの中の「その前に」もぜんぶ拾う', () => {
  assert.deepEqual(orderDeps('⚠️ #82 の PR #86（その前に #85・#84）のあとにマージ（この PR には #80〜#82 の変更もふくまれる）'),
    [{ num: 86, kind: 'pr' }, { num: 82, kind: 'any' }, { num: 85, kind: 'any' }, { num: 84, kind: 'any' }]);
  assert.deepEqual(orderDeps('⚠️ #81 の PR #85（その前に #80 の PR #84）のあとにマージ'),
    [{ num: 85, kind: 'pr' }, { num: 81, kind: 'any' }, { num: 84, kind: 'pr' }, { num: 80, kind: 'any' }]);
});

test('順番の指定がないときは空（ほかの行・前の文の番号は拾わない）', () => {
  assert.deepEqual(orderDeps('Closes #80\n\n図解の式を足しました。#79 で決めたとおり'), []);
  assert.deepEqual(orderDeps('#109 がマージされたので main を取りこみ済み'), []);
  assert.deepEqual(orderDeps('#70 を直した。PR #75 のあとにマージ'), [{ num: 75, kind: 'pr' }]);
  assert.deepEqual(orderDeps(null), []);
});

test('待つのは、指定した PR か issue の PR がまだ開いているときだけ', () => {
  const open = [pr(109, { head: { ref: 'claude/night-106' } }), pr(114), pr(120, { body: 'Fixes #118' })];
  const deps = orderDeps('#106 の PR #109 のあとにマージ');
  assert.deepEqual(waitingOn(deps, open, 114), [109]);
  // #109 がマージされて閉じた
  assert.deepEqual(waitingOn(deps, open.filter((p) => p.number !== 109), 114), []);
  // issue の番号だけ：ブランチ claude/night-<番号> か「Closes #番号」の PR
  assert.deepEqual(waitingOn(orderDeps('#106 のあとにマージ'), open, 114), [109]);
  assert.deepEqual(waitingOn(orderDeps('#118 のあとにマージ'), open, 114), [120]);
  assert.deepEqual(waitingOn(orderDeps('#42 のあとにマージ'), [pr(52, { head: { ref: 'claude/night-42-build' } })], 114), [52]);
  assert.deepEqual(waitingOn(orderDeps('#4 のあとにマージ'), [pr(52, { head: { ref: 'claude/night-42-build' } })], 114), []);
  assert.deepEqual(waitingOn(orderDeps('#11 のあとにマージ'), [pr(12, { body: 'Closes #118' })], 114), []);
  // 「PR #番号」は PR だけを見る。自分は待たない
  assert.deepEqual(waitingOn(orderDeps('PR #106 のあとにマージ'), open, 114), []);
  assert.deepEqual(waitingOn(orderDeps('#114 のあとにマージ'), open, 114), []);
  // 自分も同じ issue を閉じる PR でも、自分は数えない
  assert.deepEqual(waitingOn(orderDeps('#118 のあとにマージ'), [pr(130, { body: 'Closes #118' })], 130), []);
});

const run = (name, status, conclusion = null) => ({ name, status, conclusion });
const T0 = Date.parse('2026-11-02T10:00:00Z');

test('点検：success・skipped・neutral だけならマージ', () => {
  const r = evaluateChecks({ checkRuns: [run('build-deploy', 'completed', 'success'), run('check', 'completed', 'skipped'), run('lint', 'completed', 'neutral')] });
  assert.equal(r.state, 'success');
  assert.equal(evaluateChecks({ statuses: [{ context: 'ci/x', state: 'success' }] }).state, 'success');
});

test('点検：まだ終わっていないものがあれば待つ', () => {
  const r = evaluateChecks({ checkRuns: [run('build-deploy', 'in_progress'), run('check', 'completed', 'failure')] });
  assert.equal(r.state, 'wait');
  assert.match(r.reason, /build-deploy/);
  assert.equal(evaluateChecks({ checkRuns: [run('a', 'queued')] }).state, 'wait');
  assert.equal(evaluateChecks({ checkRuns: [run('a', 'completed', 'success')], statuses: [{ context: 'ci/x', state: 'pending' }] }).state, 'wait');
});

test('点検：失敗があれば、失敗した点検の名前つき', () => {
  for (const c of ['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure']) {
    const r = evaluateChecks({ checkRuns: [run('build-deploy', 'completed', c), run('check', 'completed', 'success')] });
    assert.deepEqual(r, { state: 'fail', failed: ['build-deploy'] }, c);
  }
  const s = evaluateChecks({ checkRuns: [run('a', 'completed', 'success')], statuses: [{ context: 'ci/x', state: 'error' }, { context: 'ci/y', state: 'failure' }] });
  assert.deepEqual(s.failed, ['ci/x', 'ci/y']);
  assert.equal(MSG.fail(['build-deploy', 'check']), '点検が通らなかったのでマージしなかった（build-deploy・check）');
});

test('点検：この workflow 自身の check-run は数えない', () => {
  assert.equal(SELF_JOB, 'merge-ok');
  const r = evaluateChecks({ checkRuns: [run('merge-ok', 'in_progress'), run('build-deploy', 'completed', 'success')] });
  assert.equal(r.state, 'success');
  const f = evaluateChecks({ checkRuns: [run('merge-ok', 'completed', 'failure'), run('build-deploy', 'completed', 'success')] });
  assert.equal(f.state, 'success');
});

test('点検：check-runs が1つもないときは、印から10分たったらマージ', () => {
  assert.equal(GRACE_MS, 600000);
  const w = evaluateChecks({ checkRuns: [run('merge-ok', 'in_progress')], labeledAt: T0, now: T0 + 3 * 60e3 });
  assert.equal(w.state, 'wait');
  assert.equal(w.grace, 7 * 60e3);
  assert.equal(evaluateChecks({ checkRuns: [], labeledAt: T0, now: T0 + 9 * 60e3 + 59e3 }).state, 'wait');
  assert.equal(evaluateChecks({ checkRuns: [], labeledAt: T0, now: T0 + 10 * 60e3 }).state, 'success');
  // 印の時刻がわからないときは待つ
  assert.equal(evaluateChecks({ checkRuns: [], labeledAt: null, now: T0 }).state, 'wait');
});

test('ぶつかり・マージの題・ラベル', () => {
  assert.equal(mergeableAction(true), 'merge');
  assert.equal(mergeableAction(false), 'conflict');
  assert.equal(mergeableAction(null), 'retry');
  assert.equal(mergeTitle({ title: '【夜】#107 パソコンの見開き [CI Skip]', number: 114 }), '【夜】#107 パソコンの見開き [CI Skip] (#114)');
  assert.equal(mergeMessage({ number: 114 }), 'マージの印（merge-ok）で #114 をマージ');
  assert.equal(hasLabel({ labels: [{ name: 'night' }, { name: 'merge-ok' }] }), true);
  assert.equal(hasLabel({ labels: [{ name: 'merge-blocked' }] }), false);
});

test('見る PR：印の付いたものだけを番号の小さい順に。pr があればその PR だけ', () => {
  const ok = [{ name: 'merge-ok' }];
  const open = [pr(30, { labels: ok }), pr(12, { labels: ok }), pr(20, { labels: [{ name: 'night' }] }), pr(25, { labels: [{ name: 'merge-blocked' }] })];
  assert.deepEqual(pickTargets(open).map((p) => p.number), [12, 30]);
  assert.deepEqual(pickTargets(open, 30).map((p) => p.number), [30]);
  assert.deepEqual(pickTargets(open, 20), []); // 印がない PR は、番号を入れても見ない
  assert.deepEqual(pickTargets([]), []);
});
