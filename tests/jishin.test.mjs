// 地震の見張り（scripts/jishin.mjs・.github/workflows/jishin.yml）：ネットにはつながず、気象庁と GitHub の答えを作りものにして確かめる
// list.json の1件の形（ttl・at・anm・mag・maxi・eid。maxi は "1"〜"4"・"5-"・"5+"・"6-"・"6+"・"7"）を写した見本。
// 本物の形は Actions の「地震の見張り」の dry_run で確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import * as J from '../scripts/jishin.mjs';

const NOW = new Date('2026-11-05T07:00:00Z'); // 日本時間 11/5 16:00
const R = `repos/${process.env.GITHUB_REPOSITORY || 'juice0402/machi-shakaika'}`;
const row = (eid, maxi, o = {}) => ({
  ctt: '20261105153000', eid, rdt: '2026-11-05T15:30:00+09:00', ttl: '震源・震度情報', ift: '発表', ser: '1',
  at: '2026-11-05T15:25:00+09:00', anm: '石川県能登地方', acd: '390', cod: '+37.5+137.2-10000/', mag: '6.1', maxi, int: [], json: 'x.json', ...o,
});

// 作りものの GitHub。calls に呼ばれた順を残す
function fakeApi(issues = []) {
  const calls = [];
  const api = async (path, { method = 'GET', body } = {}) => {
    calls.push({ method, path, body });
    if (method === 'GET' && path.startsWith(`${R}/issues?`)) return issues;
    if (method === 'GET' && path === `${R}/labels/jishin`) return { name: 'jishin' };
    if (method === 'POST' && path === `${R}/issues`) return { number: 99 };
    throw new Error(`思っていない呼び出し ${method} ${path}`);
  };
  return { api, calls };
}
const made = (calls) => calls.filter((c) => c.method === 'POST' && c.path === `${R}/issues`);
const run = async (list, issues = [], o = {}) => {
  const { api, calls } = fakeApi(issues);
  const r = await J.check({ now: NOW, read: async () => list, api, log: () => {}, ...o });
  return { ...r, calls };
};

test('最大震度の書き方：5強以下は立てない、6弱・6強・7 は立てる', () => {
  assert.deepEqual(['1', '4', '5-', '5+', '6-', '6+', '7'].map(J.shindo), ['1', '4', '5弱', '5強', '6弱', '6強', '7']);
  assert.ok(J.rank('5+') < J.THRESHOLD);
  assert.ok(J.rank('6-') === J.THRESHOLD && J.rank('6+') > J.rank('6-') && J.rank('7') > J.rank('6+'));
  assert.equal(J.rank('6弱'), -1);
  assert.equal(J.rank(undefined), -1);
});

for (const [maxi, word] of [['6-', '6弱'], ['6+', '6強'], ['7', '7']]) {
  test(`最大震度${word}：issue を1つ立てる（ラベル jishin・題・本文に eid）`, async () => {
    const r = await run([row('20261105152500', maxi), row('20261105100000', '3')]);
    const p = made(r.calls);
    assert.equal(p.length, 1);
    assert.equal(p[0].body.title, `震度${word}（最大）：石川県能登地方（11/5 15:25）`);
    assert.deepEqual(p[0].body.labels, ['jishin']);
    const b = p[0].body.body;
    assert.match(b, /^eid: 20261105152500$/m);
    assert.ok(b.includes('災害時モードにするかは、しょーくんが決める（ボタン https://github.com/juice0402/machi-shakaika/actions/workflows/saigai.yml → Run workflow）'));
    assert.ok(b.includes('気象庁 https://www.jma.go.jp/bosai/'));
    assert.ok(b.includes('マグニチュード：6.1'));
    assert.deepEqual(r.made.length, 1);
    assert.equal(r.failed, false);
  });
}

test('5強以下だけなら立てない（GitHub にも聞かない）', async () => {
  const r = await run([row('1', '5+'), row('2', '5-'), row('3', '4'), row('4', '1')]);
  assert.equal(r.calls.length, 0);
  assert.equal(r.failed, false);
});

test('同じ eid の issue（開いている・閉じた）があれば立てない', async () => {
  const issues = [{ number: 5, state: 'closed', body: `…\n\neid: 20261105152500\n${J.SIGN}` }];
  const r = await run([row('20261105152500', '6+')], issues);
  assert.equal(made(r.calls).length, 0);
  assert.ok(r.calls[0].path.includes('state=all') && r.calls[0].path.includes('labels=jishin'));
});

test('震度速報と震源・震度情報で同じ eid が2行：issue は1つ、震度は大きいほう・震源は出ているほう', async () => {
  const list = [
    row('20261105152500', '6+', { ttl: '震源・震度情報' }),
    row('20261105152500', '6-', { ttl: '震度速報', anm: '', mag: '' }),
  ];
  const r = await run(list);
  const p = made(r.calls);
  assert.equal(p.length, 1);
  assert.equal(p[0].body.title, '震度6強（最大）：石川県能登地方（11/5 15:25）');
  assert.ok(p[0].body.body.includes('情報：震源・震度情報／震度速報'));
});

test('震度速報だけ（震源がまだ）でも立てる', async () => {
  const r = await run([row('20261105152500', '6-', { ttl: '震度速報', anm: '', mag: '' })]);
  const p = made(r.calls);
  assert.equal(p[0].body.title, '震度6弱（最大）：震源は未発表（11/5 15:25）');
  assert.ok(p[0].body.body.includes('マグニチュード：まだ出ていない'));
});

test('形のおかしい行（maxi の書き方・eid・at がない）では立てない', async () => {
  const list = [row('20261105152500', '6弱'), row('', '7'), row('20261105152501', '7', { at: 'きのう' }), null, 'x', row('3', '2')];
  const r = await run(list);
  assert.equal(made(r.calls).length, 0);
  assert.equal(r.failed, false);
});

test('24時間より前の地震では立てない', async () => {
  const r = await run([row('20261103152500', '7', { at: '2026-11-03T15:25:00+09:00' })]);
  assert.equal(r.calls.length, 0);
});

test('dry_run：issue を立てず、ログに題と本文を出す', async () => {
  const logs = [];
  const r = await run([row('20261105152500', '6-')], [], { dry: true, log: (m) => logs.push(m) });
  assert.equal(made(r.calls).length, 0);
  assert.ok(logs.some((m) => m.includes('（ためし）') && m.includes('eid: 20261105152500')));
});

test('読めないとき：1回・2回は失敗にしない、3回続けたら失敗。読めたら0にもどす', async () => {
  const read = async () => {
    throw new Error('503');
  };
  let r = await run(null, [], { read, fails: 0 });
  assert.deepEqual([r.fails, r.failed], [1, false]);
  r = await run(null, [], { read, fails: 1 });
  assert.deepEqual([r.fails, r.failed], [2, false]);
  r = await run(null, [], { read, fails: 2 });
  assert.deepEqual([r.fails, r.failed], [3, true]);
  r = await run([row('1', '3')], [], { fails: 2 });
  assert.deepEqual([r.fails, r.failed], [0, false]);
});

test('JSON の形が変わったら、1回めでも失敗', async () => {
  for (const list of [{ items: [] }, [], [{ a: 1 }], [row('1', '震度3'), row('2', '')]]) {
    const r = await run(list);
    assert.equal(r.failed, true, JSON.stringify(list).slice(0, 40));
    assert.equal(r.calls.length, 0);
  }
});

test('jishin.yml：10分ごと・dry_run・災害時モードを切りかえない・見張りの WATCH にある', async () => {
  const y = readFileSync('.github/workflows/jishin.yml', 'utf8');
  assert.match(y, /cron: '\*\/10 \* \* \* \*'/);
  assert.match(y, /dry_run:/);
  assert.match(y, /JISHIN_DRY_RUN: \$\{\{ inputs\.dry_run \}\}/);
  assert.ok(!/saigai|mode\.yml|contents: write/.test(y.replace(/^#.*$/gm, '')));
  const M = await import('../scripts/mihari.mjs');
  assert.ok(M.WATCH['jishin.yml']);
});
