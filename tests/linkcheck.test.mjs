// リンクを開く部分の動き：ネットにはつながず、fetch と sleep を差しかえて確かめる
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { UA, DEFAULTS, checkUrl, classify, runChecks } from '../src/lib/linkcheck.mjs';

// 作りものの fetch。reply(url, method, n) が { status, url?, retryAfter? } を返すか、Error を投げる（n はそのURLへの何回目か）
function fake(reply, { wait = 0 } = {}) {
  const calls = [];
  const count = new Map();
  let active = 0;
  const st = { calls, maxActive: 0 };
  const fetch = async (url, init) => {
    const n = (count.get(url) ?? 0) + 1;
    count.set(url, n);
    calls.push({ url, method: init.method, ua: init.headers['User-Agent'], redirect: init.redirect, hasSignal: init.signal instanceof AbortSignal, t: st.clock?.t });
    active++;
    st.maxActive = Math.max(st.maxActive, active);
    if (wait) await new Promise((ok) => setTimeout(ok, wait));
    active--;
    const r = reply(url, init.method, n);
    return {
      status: r.status,
      url: r.url ?? url,
      headers: new Headers(r.retryAfter ? { 'retry-after': String(r.retryAfter) } : {}),
      body: { cancel: async () => {} },
    };
  };
  return { fetch, ...st, get maxActive() { return st.maxActive; } };
}
const err = (code, name = 'TypeError') => Object.assign(new Error('fetch failed'), { name, cause: { code } });
// 時計：sleep で進む
function clock() {
  const c = { t: 0, waits: [] };
  c.sleep = async (ms) => {
    c.waits.push(ms);
    c.t += ms;
  };
  c.now = () => c.t;
  return c;
}
const deps = (f, c = clock(), extra = {}) => ({ ...DEFAULTS, fetch: f.fetch, sleep: c.sleep, now: c.now, ...extra });

test('開けるリンクは HEAD の1回だけ。わかる User-Agent をつけ、リダイレクトはたどる', async () => {
  const f = fake(() => ({ status: 200 }));
  const c = clock();
  const r = await checkUrl('https://a.go.jp/x', deps(f, c));
  assert.equal(r.status, 200);
  assert.deepEqual(f.calls.map((x) => x.method), ['HEAD']);
  assert.equal(f.calls[0].ua, UA);
  assert.ok(UA.includes('machi-shakaika') && UA.includes('https://machi-shakaika.com/'));
  assert.equal(f.calls[0].redirect, 'follow');
  assert.equal(f.calls[0].hasSignal, true, '時間切れがある');
  assert.deepEqual(c.waits, []);
});

test('HEAD がだめなら GET（間をあけて）。GET で開ければ生きている', async () => {
  const f = fake((u, m) => ({ status: m === 'HEAD' ? 405 : 200 }));
  const c = clock();
  const r = await checkUrl('https://a.go.jp/x', deps(f, c));
  assert.equal(r.status, 200);
  assert.deepEqual(f.calls.map((x) => x.method), ['HEAD', 'GET']);
  assert.deepEqual(c.waits, [DEFAULTS.gapMs]);
  // HEAD が 404 を返しても GET で開けるサイトがある
  const g = fake((u, m) => ({ status: m === 'HEAD' ? 404 : 200 }));
  assert.equal((await checkUrl('https://a.go.jp/x', deps(g))).status, 200);
});

test('どちらもだめなら、少し待って GET を1回だけやり直す（全部で3回まで）', async () => {
  const f = fake(() => ({ status: 404 }));
  const c = clock();
  const r = await checkUrl('https://a.go.jp/gone', deps(f, c));
  assert.equal(r.status, 404);
  assert.deepEqual(f.calls.map((x) => x.method), ['HEAD', 'GET', 'GET']);
  assert.deepEqual(c.waits, [DEFAULTS.gapMs, DEFAULTS.retryWaitMs]);
  // 1回目の GET が時間切れでも、やり直しで開ければ生きている
  const g = fake((u, m, n) => {
    if (n <= 2) throw err('ETIMEDOUT', 'TimeoutError');
    return { status: 200 };
  });
  assert.equal((await checkUrl('https://a.go.jp/slow', deps(g))).status, 200);
});

test('429 は Retry-After の分だけ待つ（30秒まで）', async () => {
  const run = async (retryAfter) => {
    const f = fake((u, m, n) => (n < 3 ? { status: 429, retryAfter } : { status: 200 }));
    const c = clock();
    const r = await checkUrl('https://a.go.jp/x', deps(f, c));
    assert.equal(r.status, 200);
    return c.waits;
  };
  assert.deepEqual(await run(3), [DEFAULTS.gapMs, 3000]);
  assert.deepEqual(await run(900), [DEFAULTS.gapMs, DEFAULTS.maxRetryWaitMs]);
});

test('名前が引けないものは、やり直さない', async () => {
  const f = fake(() => {
    throw err('ENOTFOUND');
  });
  const r = await checkUrl('https://no-such.example.jp/', deps(f));
  assert.equal(r.error, 'ENOTFOUND');
  assert.equal(f.calls.length, 1);
});

test('結果の分け方：生きている・断られた・消えた', () => {
  const U = 'https://a.go.jp/x/y.html';
  const k = (raw, url = U) => classify(url, raw).kind;
  assert.equal(k({ status: 200, finalUrl: U }), 'alive');
  assert.equal(k({ status: 204, finalUrl: U }), 'alive');
  // 消えた
  assert.equal(k({ status: 404 }), 'gone');
  assert.equal(k({ status: 410 }), 'gone');
  assert.equal(k({ error: 'ENOTFOUND' }), 'gone');
  // 断られた・つながらなかった（消えたとは限らない）
  for (const status of [401, 403, 406, 429, 451, 400, 500, 502, 503, 504]) assert.equal(k({ status }), 'refused', String(status));
  for (const error of ['TimeoutError', 'ETIMEDOUT', 'ECONNRESET', 'ECONNREFUSED', 'CERT_HAS_EXPIRED', 'EAI_AGAIN', 'ERROR']) assert.equal(k({ error }), 'refused', error);
  assert.match(classify(U, { status: 403 }).reason, /断られた（403）/);
  assert.match(classify(U, { status: 404 }).reason, /ページがない（404）/);
  assert.match(classify(U, { error: 'TimeoutError' }).reason, /時間切れ/);
  assert.match(classify(U, { error: 'ENOTFOUND' }).reason, /ドメイン名が引けない/);
  assert.match(classify(U, { status: 503 }).reason, /サーバーの不調（503）/);
});

test('トップページに飛ばされたら消えた。もともとトップや、中身のあるページへの移転はそのまま生きている', () => {
  const to = (url, finalUrl) => classify(url, { status: 200, finalUrl });
  assert.equal(to('https://a.go.jp/x/y.html', 'https://a.go.jp/').kind, 'gone');
  assert.equal(to('https://a.go.jp/x/y.html', 'https://a.go.jp/index.html').kind, 'gone');
  assert.equal(to('https://a.go.jp/x/y.html', 'https://new.go.jp/').kind, 'gone');
  assert.match(to('https://a.go.jp/x/y.html', 'https://a.go.jp/').reason, /トップページに飛ばされた/);
  assert.equal(to('https://a.go.jp/', 'https://a.go.jp/').kind, 'alive');
  assert.equal(to('https://a.go.jp/', 'https://a.go.jp/ja/').kind, 'alive');
  assert.equal(to('https://a.go.jp/x/y.html', 'https://a.go.jp/z/new.html').kind, 'alive');
  assert.equal(to('https://a.go.jp/x/y.html', 'https://a.go.jp/?from=x').kind, 'alive', '検索語つきは別のページ');
  assert.equal(to('https://a.go.jp/index.html', 'https://a.go.jp/').kind, 'alive');
});

test('同じホストへは間をあける（HEAD・GET・つぎのリンクのどれも）', async () => {
  const c = clock();
  const f = fake((u, m) => (u.endsWith('/b') && m === 'HEAD' ? { status: 405 } : { status: 200 }));
  f.clock = c;
  const urls = ['https://a.go.jp/a', 'https://a.go.jp/b', 'https://a.go.jp/c'];
  // 時刻を呼び出しごとに記録するため、fetch を包む
  const times = [];
  const wrapped = { ...f, fetch: async (u, init) => (times.push(c.t), f.fetch(u, init)) };
  const res = await runChecks(urls, deps(wrapped, c));
  assert.deepEqual([...res.values()].map((r) => r.kind), ['alive', 'alive', 'alive']);
  assert.equal(times.length, 4, 'a:HEAD, b:HEAD, b:GET, c:HEAD');
  for (let i = 1; i < times.length; i++) assert.ok(times[i] - times[i - 1] >= DEFAULTS.gapMs, `${i} 回目の前に間がある`);
});

test('同時に開くホストの数をしぼる。ホストが別なら並べて進む', async () => {
  const hosts = Array.from({ length: 10 }, (_, i) => `https://h${i}.go.jp/a`);
  const f = fake(() => ({ status: 200 }), { wait: 2 });
  const res = await runChecks(hosts, deps(f, clock(), { concurrency: 3 }));
  assert.equal(res.size, 10);
  assert.ok(f.maxActive <= 3, `同時に ${f.maxActive}`);
  assert.ok(f.maxActive >= 2, '別のホストは並べて進む');
  // 同じホストの2件は同時に開かない
  const g = fake(() => ({ status: 200 }), { wait: 2 });
  await runChecks(['https://x.go.jp/1', 'https://x.go.jp/2', 'https://x.go.jp/3'], deps(g, clock(), { concurrency: 4 }));
  assert.equal(g.maxActive, 1);
});

test('同じホストで2件続けてつながらなければ、残りは試さない（落ちているサーバーをたたかない）', async () => {
  const f = fake(() => {
    throw err('ECONNRESET');
  });
  const urls = ['https://down.go.jp/1', 'https://down.go.jp/2', 'https://down.go.jp/3', 'https://down.go.jp/4'];
  const res = await runChecks(urls, deps(f));
  assert.equal(f.calls.length, 6, '1件目と2件目だけ（HEAD・GET・やり直しの3回ずつ）');
  assert.deepEqual([...res.values()].map((r) => r.kind), ['refused', 'refused', 'refused', 'refused']);
  assert.match(res.get(urls[3]).reason, /試していません/);
  // 返事があれば（404 でも）数えない
  const g = fake(() => ({ status: 404 }));
  await runChecks(urls, deps(g));
  assert.equal(g.calls.length, 12);
});

test('時間が足りなければ、残りは試さずに「断られた・つながらなかった」へ', async () => {
  const c = clock();
  const f = fake(() => ({ status: 200 }));
  const urls = ['https://a.go.jp/1', 'https://a.go.jp/2', 'https://a.go.jp/3'];
  const res = await runChecks(urls, deps(f, c, { deadlineMs: DEFAULTS.gapMs + 1, gapMs: DEFAULTS.gapMs }));
  assert.deepEqual([...res.values()].map((r) => r.kind), ['alive', 'alive', 'refused']);
  assert.match(res.get(urls[2]).reason, /時間が足りず/);
  assert.equal(f.calls.length, 2);
});

test('点検する URL がなければ何もしない', async () => {
  const f = fake(() => ({ status: 200 }));
  assert.equal((await runChecks([], deps(f))).size, 0);
  assert.equal(f.calls.length, 0);
});
