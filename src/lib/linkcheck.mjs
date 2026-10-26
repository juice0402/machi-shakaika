// 外部リンクを開いてみる部分（相手のサーバーに優しく）
//   同じホストへは間をあける・同時に開くホストの数をしぼる・時間切れあり・1回だけやり直し・HEAD がだめなら GET・わかる User-Agent
//   同じホストで2件続けてつながらなければ、そのホストの残りは試さない（落ちているサーバーを何度もたたかない）
// 結果は3つに分ける：生きている（alive）・断られた／つながらなかった（refused＝消えたとは限らない）・消えた（gone）
//   消えた：404・410・名前が引けない・トップページに飛ばされた。ほかの 4xx・5xx・時間切れ・証明書などは「断られた」
// fetch と sleep は差しかえられる（tests/ がネットなしで確かめるため）

import http from 'node:http';
import https from 'node:https';
import { constants } from 'node:crypto';

export const UA ='Mozilla/5.0 (compatible; machi-shakaika-linkcheck; +https://machi-shakaika.com/about/)';

export const DEFAULTS = {
  gapMs: 2000, // 同じホストへの間
  retryWaitMs: 5000, // やり直しの前
  maxRetryWaitMs: 30000, // 429 の Retry-After はここまで待つ
  timeoutMs: 20000,
  concurrency: 4, // 同時に開くホストの数
  breakAfter: 2, // 続けてつながらなかったらそのホストはやめる
  deadlineMs: 12 * 60 * 1000, // 全体でこれをこえたら、残りは試さない
};

const NAME_GONE = new Set(['ENOTFOUND', 'EAI_NODATA', 'ENODATA']);
export const LEGACY_TLS = 'ERR_SSL_UNSAFE_LEGACY_RENEGOTIATION_DISABLED';
const isTop = (p) => p === '/' || p === '' || /^\/index\.html?$/.test(p);

// 古い TLS のつなぎ方しかできないサーバー（国土地理院など）は fetch でつながらない。
// 開けるかを見るだけなので、この点検の中だけ node:https に古いつなぎ方を許して開き直す（リダイレクトは5回までたどる）
export function legacyFetch(url, method, d, hops = 0) {
  return new Promise((resolve) => {
    const u = new URL(url);
    const mod = u.protocol === 'http:' ? http : https;
    const req = mod.request(u, { method, headers: { 'User-Agent': UA }, secureOptions: constants.SSL_OP_LEGACY_SERVER_CONNECT, timeout: d.timeoutMs }, (res) => {
      res.destroy(); // 本文は読まない
      const loc = res.headers.location;
      if (res.statusCode >= 300 && res.statusCode < 400 && loc) {
        resolve(hops < 5 ? legacyFetch(new URL(loc, u).href, method, d, hops + 1) : { error: 'TOO_MANY_REDIRECTS' });
        return;
      }
      resolve({ status: res.statusCode, finalUrl: u.href, retryAfter: Number(res.headers['retry-after']) || 0 });
    });
    req.on('timeout', () => req.destroy(Object.assign(new Error('timeout'), { code: 'ETIMEDOUT' })));
    req.on('error', (e) => resolve({ error: e?.code || e?.name || 'ERROR' }));
    req.end();
  });
}

async function probe(url, method, d) {
  try {
    const r = await d.fetch(url, { method, redirect: 'follow', headers: { 'User-Agent': UA }, signal: AbortSignal.timeout(d.timeoutMs) });
    await r.body?.cancel().catch(() => {});
    return { status: r.status, finalUrl: r.url || url, retryAfter: Number(r.headers?.get?.('retry-after')) || 0 };
  } catch (e) {
    const code = e?.cause?.code || e?.code || e?.name || 'ERROR';
    if (code === LEGACY_TLS && d.legacyFetch) return d.legacyFetch(url, method, d);
    return { error: code };
  }
}

// 1つのリンクを開く。HEAD → だめなら GET → だめなら少し待って GET をもう1回。返すのは最後の1回の結果
export async function checkUrl(url, d) {
  let r = await probe(url, 'HEAD', d);
  if (r.status < 400 || NAME_GONE.has(r.error)) return r; // 名前が引けないものは、やり直しても同じ
  await d.sleep(d.gapMs);
  r = await probe(url, 'GET', d);
  if (r.status < 400 || NAME_GONE.has(r.error)) return r;
  await d.sleep(r.status === 429 && r.retryAfter > 0 ? Math.min(r.retryAfter * 1000, d.maxRetryWaitMs) : d.retryWaitMs);
  return probe(url, 'GET', d);
}

// 開いた結果を、生きている／断られた／消えた に分ける。reason は人が読む短い文
export function classify(url, raw) {
  const note = raw.note ? `（${raw.note}）` : '';
  if (raw.skipped) return { kind: 'refused', reason: raw.skipped };
  if (raw.status != null) {
    const s = raw.status;
    if (s < 400) {
      // 古いページがトップページに飛ばされるのは、消えたときによくある形
      const from = new URL(url);
      const to = new URL(raw.finalUrl || url);
      if (!isTop(from.pathname) && isTop(to.pathname) && !to.search) {
        return { kind: 'gone', reason: `トップページに飛ばされた（${to.host}）。移転か削除の可能性` };
      }
      return { kind: 'alive', reason: s === 200 ? '開けた' : `開けた（${s}）` };
    }
    if (s === 404 || s === 410) return { kind: 'gone', reason: `ページがない（${s}）` };
    if ([401, 403, 406, 429, 451].includes(s)) return { kind: 'refused', reason: `断られた（${s}）` };
    if (s >= 500) return { kind: 'refused', reason: `サーバーの不調（${s}）` };
    return { kind: 'refused', reason: `返事 ${s}` };
  }
  const e = raw.error;
  if (NAME_GONE.has(e)) return { kind: 'gone', reason: `ドメイン名が引けない（${e}）${note}` };
  if (e === 'TimeoutError' || e === 'ETIMEDOUT' || e === 'UND_ERR_CONNECT_TIMEOUT') return { kind: 'refused', reason: `時間切れ${note}` };
  return { kind: 'refused', reason: `つながらない（${e}）${note}` };
}

// urls を点検する。返すのは URL → { kind, reason } の Map
export async function runChecks(urls, opts = {}) {
  const d = {
    ...DEFAULTS,
    fetch: globalThis.fetch,
    legacyFetch,
    sleep: (ms) => new Promise((ok) => setTimeout(ok, ms)),
    now: Date.now,
    ...opts,
  };
  const deadline = d.now() + d.deadlineMs;
  const byHost = new Map();
  for (const u of urls) {
    const h = new URL(u).host;
    if (!byHost.has(h)) byHost.set(h, []);
    byHost.get(h).push(u);
  }
  const out = new Map();
  const queue = [...byHost.values()];

  const worker = async () => {
    for (let list; (list = queue.shift()); ) {
      let fails = 0; // 続けて、返事すらなかった数
      let last = null;
      let touched = false; // このホストに1回でも送ったか（間をあけるため）
      for (const u of list) {
        if (fails >= d.breakAfter) {
          out.set(u, classify(u, { ...last, note: '同じホストの前の2件がつながらなかったので、試していません' }));
          continue;
        }
        if (touched) await d.sleep(d.gapMs);
        if (d.now() > deadline) {
          out.set(u, classify(u, { skipped: '時間が足りず、試していません' }));
          touched = false;
          continue;
        }
        touched = true;
        const raw = await checkUrl(u, d);
        fails = raw.error ? fails + 1 : 0;
        last = raw;
        out.set(u, classify(u, raw));
      }
    }
  };
  await Promise.all(Array.from({ length: Math.min(d.concurrency, queue.length) }, worker));
  return out;
}
