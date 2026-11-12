// 見張り（scripts/mihari.mjs・.github/workflows/mihari.yml）：ネットにはつながず、GitHub の答えを作りものにして確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as M from '../scripts/mihari.mjs';

const NOW = new Date('2026-11-02T04:00:00Z'); // 日本時間 11/2 13:00
const R = `repos/${process.env.GITHUB_REPOSITORY || 'juice0402/machi-shakaika'}`;
const notes = [
  { annotation_level: 'warning', message: 'Node.js 20 is deprecated.' },
  { annotation_level: 'failure', message: 'Process completed with exit code 1.' },
  { annotation_level: 'failure', message: '照らし合わせ：大阪市の人口が\n合わない' },
  { annotation_level: 'failure', message: 'あ'.repeat(300) },
  { annotation_level: 'failure', message: '4つめ' },
];
const jobs = [
  { name: 'build-deploy', conclusion: 'failure', check_run_url: 'https://api.github.com/x/check-runs/55', steps: [{ name: 'テスト', conclusion: 'success' }, { name: '楽天の商品を取る', conclusion: 'failure' }, { name: 'ビルド', conclusion: 'skipped' }] },
];
const runs = [
  { id: 9, status: 'completed', conclusion: 'failure', updated_at: '2026-11-02T03:00:00Z' },
  { id: 8, status: 'completed', conclusion: 'cancelled', updated_at: '2026-11-02T02:00:00Z' },
  { id: 7, status: 'completed', conclusion: 'timed_out', updated_at: '2026-11-01T21:30:00Z' },
  { id: 6, status: 'completed', conclusion: 'success', updated_at: '2026-11-01T15:36:41Z' },
  { id: 5, status: 'completed', conclusion: 'failure', updated_at: '2026-11-01T10:00:00Z' },
];
const run = { id: 9, path: '.github/workflows/deploy.yml', head_branch: 'main', html_url: 'https://github.com/x/actions/runs/9', conclusion: 'failure', updated_at: '2026-11-02T03:00:00Z' };
const cfg = M.WATCH['deploy.yml'];

test('結果の見分け：failure・timed_out は issue、success は閉じる、cancelled は何もしない', () => {
  assert.equal(M.kind('failure'), 'fail');
  assert.equal(M.kind('timed_out'), 'fail');
  assert.equal(M.kind('success'), 'ok');
  assert.equal(M.kind('cancelled'), null);
  assert.equal(M.kind('skipped'), null);
  assert.equal(M.workflowFile({ path: '.github/workflows/deploy.yml' }), 'deploy.yml');
});

test('時刻は日本時間・その日の0時は UTC で', () => {
  assert.equal(M.when('2026-11-01T15:36:41Z'), '11月2日 0:36（日本時間）');
  assert.equal(M.midnightUtc(NOW), '2026-11-01T15:00:00Z');
});

test('失敗の注記は3つまで・200字まで・exit code は後ろ・warning は拾わない', () => {
  const p = M.pickNotes(notes);
  assert.equal(p.length, 3);
  assert.equal(p[0], '照らし合わせ：大阪市の人口が 合わない');
  assert.equal(p[1].length, 200);
  assert.ok(!p.some((m) => m.startsWith('Process')));
});

test('失敗したジョブとステップ', () => {
  assert.deepEqual(M.failedParts(jobs), ['build-deploy / 楽天の商品を取る']);
});

test('最後の成功と、そのあとの失敗の回数（cancelled は数えない）', () => {
  assert.deepEqual(M.history(runs, 9), { lastOk: '2026-11-01T15:36:41Z', fails: 2 });
  assert.deepEqual(M.history(runs, 5), { lastOk: null, fails: 1 });
});

test('本文：何が止まったか・いつ・URL・最後の成功・ステップ・注記・署名', () => {
  const body = M.buildBody(cfg, run, ['build-deploy / 楽天の商品を取る'], ['止まった'], { lastOk: '2026-11-01T15:36:41Z', fails: 2 });
  for (const s of ['本番のサイトが前のまま', '11月2日 12:00（日本時間）', 'https://github.com/x/actions/runs/9', '最後にうまくいったのは 11月2日 0:36（日本時間）', '失敗は 2 回', 'build-deploy / 楽天の商品を取る', '- 止まった', '「公開が止まってる」']) assert.ok(body.includes(s), s);
  assert.ok(body.endsWith(M.SIGN));
});

test('今日もう知らせたか（issue を今日作った・見張りが今日コメントした。人のコメントは数えない）', () => {
  assert.ok(M.notedToday({ created_at: '2026-11-01T16:00:00Z' }, [], NOW));
  assert.ok(!M.notedToday({ created_at: '2026-11-01T14:00:00Z' }, [], NOW));
  assert.ok(M.notedToday({ created_at: '2026-10-30T00:00:00Z' }, [{ user: { login: M.BOT }, created_at: '2026-11-02T01:00:00Z' }], NOW));
  assert.ok(!M.notedToday({ created_at: '2026-10-30T00:00:00Z' }, [{ user: { login: 'juice0402' }, created_at: '2026-11-02T01:00:00Z' }], NOW));
});

// 作りものの GitHub。answers は [[method, path の頭], 答え] の並び
function fake(answers) {
  const calls = [];
  const api = async (path, { method = 'GET', body } = {}) => {
    calls.push({ method, path, body });
    for (const [key, val] of answers) {
      if (method === key[0] && path.startsWith(key[1])) {
        if (val instanceof Error) throw val;
        return val;
      }
    }
    return null;
  };
  return { api, calls };
}
async function go(r, answers, opts = {}) {
  const { api, calls } = fake(answers);
  const lines = [];
  await M.handle(r, { now: NOW, api, log: (s) => lines.push(s), ...opts });
  return { calls, out: lines.join('\n'), writes: calls.filter((c) => c.method !== 'GET') };
}
const openIssue = { number: 12, title: cfg.title, created_at: '2026-11-01T10:00:00Z' };
const failAnswers = [
  [['GET', `${R}/issues?`], []],
  [['GET', `${R}/actions/runs/9/jobs`], { jobs }],
  [['GET', `${R}/check-runs/55/annotations`], notes],
  [['GET', `${R}/actions/workflows/deploy.yml/runs`], { workflow_runs: runs }],
  [['GET', `${R}/labels/mihari`], new M.ApiError(404, 'Not Found')],
];

test('cancelled・main 以外・見張っていない workflow は GitHub に何も聞かない', async () => {
  assert.equal((await go({ ...run, conclusion: 'cancelled' }, [])).calls.length, 0);
  assert.equal((await go({ ...run, head_branch: 'claude/x' }, [])).calls.length, 0);
  assert.equal((await go({ ...run, path: '.github/workflows/check-links.yml' }, [])).calls.length, 0);
});

test('失敗 → ラベル mihari を作って issue を作る', async () => {
  const r = await go(run, failAnswers);
  assert.deepEqual(r.writes.map((c) => c.path), [`${R}/labels`, `${R}/issues`]);
  assert.equal(r.writes[0].body.color, 'd93f0b');
  assert.equal(r.writes[1].body.title, '【見張り】公開が失敗した');
  assert.deepEqual(r.writes[1].body.labels, ['mihari']);
  assert.ok(r.writes[1].body.body.includes('照らし合わせ：大阪市の人口が 合わない'));
});

test('ためし（dry_run）は書かずに題と本文を出す', async () => {
  const r = await go(run, failAnswers, { dry: true });
  assert.equal(r.writes.length, 0);
  assert.ok(r.out.includes('【見張り】公開が失敗した') && r.out.includes(M.SIGN));
});

test('開いた issue がある → 新しく作らず、その日1回だけ「まだ続いている」', async () => {
  let r = await go(run, [[['GET', `${R}/issues?`], [openIssue]], [['GET', `${R}/issues/12/comments`], []]]);
  assert.equal(r.writes.length, 1);
  assert.equal(r.writes[0].path, `${R}/issues/12/comments`);
  assert.equal(r.writes[0].body.body, 'まだ続いている（https://github.com/x/actions/runs/9）');
  assert.ok(r.calls.some((c) => c.path.includes('since=2026-11-01T15:00:00Z')));
  r = await go(run, [[['GET', `${R}/issues?`], [openIssue]], [['GET', `${R}/issues/12/comments`], [{ user: { login: M.BOT }, created_at: '2026-11-02T00:00:00Z' }]]]);
  assert.equal(r.writes.length, 0);
});

test('成功 → 同じ題の issue に「直った」とコメントして閉じる（ほかの題は閉じない）', async () => {
  let r = await go({ ...run, conclusion: 'success' }, [[['GET', `${R}/issues?`], [openIssue]]]);
  assert.deepEqual(r.writes.map((c) => `${c.method} ${c.path}`), [`POST ${R}/issues/12/comments`, `PATCH ${R}/issues/12`]);
  assert.equal(r.writes[0].body.body, '直った（https://github.com/x/actions/runs/9）');
  assert.equal(r.writes[1].body.state, 'closed');
  r = await go({ ...run, conclusion: 'success' }, [[['GET', `${R}/issues?`], [{ ...openIssue, title: M.WATCH['update.yml'].title }]]]);
  assert.equal(r.writes.length, 0);
});

test('mihari.yml の workflows: に、見張る workflow の name がそろっている', () => {
  const listed = (readFileSync('.github/workflows/mihari.yml', 'utf8').match(/^\s*workflows:\s*\[(.*)\]/m)?.[1] ?? '').split(',').map((s) => s.trim());
  for (const file of Object.keys(M.WATCH)) {
    const name = readFileSync(`.github/workflows/${file}`, 'utf8').match(/^name:\s*(.+)$/m)?.[1].trim();
    assert.ok(listed.includes(name), `${file}（${name}）`);
  }
});

test('3時間ごとにも見る（GITHUB_TOKEN で動かした公開は、終わっても workflow_run が来ないため。2026-11-13）', () => {
  const wf = readFileSync('.github/workflows/mihari.yml', 'utf8');
  assert.match(wf, /^\s*schedule:\s*\n\s*- cron: '29 \*\/3 \* \* \*'/m);
  // schedule のときは、手で動かしたときと同じく、見張る workflow ごとのいちばん新しい実行を見る
  assert.match(readFileSync('scripts/mihari.mjs', 'utf8'), /if \(process\.env\.GITHUB_EVENT_NAME === 'workflow_run'\)/);
});
