// マージの印（.github/workflows/merge-ok.yml）。くわしくは CLAUDE.md の「マージの印」
// ラベル merge-ok が付いた開いている PR を、番号の小さい順に1つずつ：
//   base が main・draft でない → 本文の順番の指定 → 点検（check-runs と commit statuses）→ ぶつかり → squash でマージ
//   点検が通らない・main とぶつかった → コメントして merge-ok を外し、merge-blocked を付ける
// マージしたら公開の workflow（PUBLISH_WORKFLOW）を main で1回だけ動かす（結果は待たない。失敗は見張りが知らせる）
// Node 標準だけ。GITHUB_TOKEN だけ。DRY_RUN=true ならマージせず、するはずのことをログに出す。PR_NUMBER があればその PR だけ見る
import { pathToFileURL } from 'node:url';

export const LABEL = 'merge-ok';
export const BLOCKED = 'merge-blocked';
export const LABELS = {
  [LABEL]: { color: '0e8a16', description: 'しょーくんの OK。点検が通ったら GitHub がマージ' },
  [BLOCKED]: { color: 'b60205', description: '印を付けたがマージできなかった。司令塔が見る' },
};
export const SELF_JOB = 'merge-ok'; // この workflow の job の名前。自分の check-run は数えない
export const GRACE_MS = 10 * 60e3; // check-runs が1つもない PR は、印が付いてから10分たったらマージしてよい
export const OK = ['success', 'skipped', 'neutral'];
export const FAIL = ['failure', 'timed_out', 'cancelled', 'action_required', 'startup_failure'];
export const MSG = {
  fail: (names) => `点検が通らなかったのでマージしなかった（${names.join('・')}）`,
  conflict: 'main とぶつかったのでマージしなかった。司令塔で main を取りこむ',
  error: (status, why = '') => `マージできなかった（GitHub API HTTP ${status}${why ? `：${why}` : ''}）`,
};

const norm = (s) => String(s ?? '')
  .replace(/[０-９]/g, (c) => String.fromCharCode(c.charCodeAt(0) - 0xfee0))
  .replace(/＃/g, '#')
  .replace(/[ＰｐPp][ＲｒRr]/g, 'PR')
  .replace(/[*_`]/g, '');

// 本文の順番の指定（「#12 の PR #34 のあとにマージ」「PR #34 のあとにマージ」「#12 のあとにマージ」）
// 「のあとにマージ」の前の、同じ行・同じ文（。まで）にある番号をぜんぶ拾う（かっこの中の「その前に #85・#84」も）
// kind：pr＝PR の番号、any＝PR か issue（issue なら、それに対応する PR）
export function orderDeps(body) {
  const out = [];
  const add = (num, kind) => {
    if (!out.some((d) => d.num === num && d.kind === kind)) out.push({ num, kind });
  };
  for (const line of norm(body).split(/\r?\n/)) {
    for (const m of line.matchAll(/の\s*(?:あと|後)(?:に|で)?\s*マージ/g)) {
      const before = line.slice(0, m.index);
      const seg = before.slice(before.lastIndexOf('。') + 1);
      for (const r of seg.matchAll(/#(\d+)\s*の\s*PR(?:\s*#(\d+))?|PR\s*#(\d+)|#(\d+)/g)) {
        if (r[1] && r[2]) { add(+r[2], 'pr'); add(+r[1], 'any'); }
        else if (r[1]) add(+r[1], 'any');
        else if (r[3]) add(+r[3], 'pr');
        else add(+r[4], 'any');
      }
    }
  }
  return out;
}

// 順番の指定のうち、まだ開いている PR の番号（なければ空。空ならマージへ進んでよい）
// issue の番号は、開いている PR のうち、ブランチが claude/night-<番号>（claude/night-<番号>-… も）か本文に「Closes #番号」があるもの
export function waitingOn(deps, openPulls, self) {
  const open = openPulls.filter((p) => p.number !== self);
  const linked = (n) => {
    const branch = new RegExp(`^claude/night-${n}(?:-|$)`);
    const closes = new RegExp(`\\b(?:close[sd]?|fix(?:e[sd])?|resolve[sd]?)\\s*:?\\s*#${n}(?!\\d)`, 'i');
    return open.filter((p) => branch.test(p.head?.ref || '') || closes.test(p.body || '')).map((p) => p.number);
  };
  const out = new Set();
  for (const d of deps) {
    if (d.num === self) continue;
    if (open.some((p) => p.number === d.num)) out.add(d.num);
    else if (d.kind === 'any') for (const n of linked(d.num)) out.add(n);
  }
  return [...out].sort((a, b) => a - b);
}

// 点検の判定：success（マージへ）・wait（待つ）・fail（失敗した点検の名前つき）
export function evaluateChecks({ checkRuns = [], statuses = [], labeledAt = null, now = Date.now(), graceMs = GRACE_MS, selfName = SELF_JOB }) {
  const runs = checkRuns.filter((c) => c.name !== selfName);
  const pending = [];
  const failed = [];
  for (const c of runs) {
    if (c.status !== 'completed') pending.push(c.name);
    else if (!OK.includes(c.conclusion)) failed.push(c.name);
  }
  for (const s of statuses) {
    if (s.state === 'pending') pending.push(s.context);
    else if (s.state !== 'success') failed.push(s.context);
  }
  if (pending.length) return { state: 'wait', reason: `点検の終わりを待つ（${pending.join('・')}）` };
  if (failed.length) return { state: 'fail', failed };
  if (!runs.length && !statuses.length) {
    const left = labeledAt == null ? graceMs : graceMs - (now - labeledAt);
    if (left > 0) return { state: 'wait', grace: left, reason: `点検がまだ1つもない（あと${Math.ceil(left / 60e3)}分で、なくてもマージ）` };
  }
  return { state: 'success' };
}

// mergeable：true→マージ、false→ぶつかり、null→もう一度見る
export const mergeableAction = (v) => (v === true ? 'merge' : v === false ? 'conflict' : 'retry');
export const mergeTitle = (p) => `${p.title} (#${p.number})`;
// squash の本文は空にしない（空だと GitHub がブランチのコミットの一覧を入れることがある）
export const mergeMessage = (p) => `マージの印（merge-ok）で #${p.number} をマージ`;
export const hasLabel = (p, name = LABEL) => (p.labels || []).some((l) => (l.name ?? l) === name);
// 見る PR：印の付いた開いている PR を番号の小さい順に（only があればその PR だけ。印がなければ見ない）
export const pickTargets = (open, only = null) => open.filter((p) => hasLabel(p) && (!only || p.number === only)).sort((a, b) => a.number - b.number);

// ---------- GitHub API（GITHUB_TOKEN だけ） ----------
const API = process.env.GITHUB_API_URL || 'https://api.github.com';
const REPO = process.env.GITHUB_REPOSITORY || 'juice0402/machi-shakaika';
const DRY = process.env.DRY_RUN === 'true';
const ONLY = Number(process.env.PR_NUMBER) || null; // 手で動かすときの pr（空ならぜんぶ）
const PUBLISH = process.env.PUBLISH_WORKFLOW || '';
const RUN_URL = `${process.env.GITHUB_SERVER_URL || 'https://github.com'}/${REPO}/actions/runs/${process.env.GITHUB_RUN_ID || ''}`;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const log = (s) => console.log(DRY ? `[dry_run] ${s}` : s);

async function gh(path, { method = 'GET', body } = {}) {
  if (!process.env.GITHUB_TOKEN) throw new Error('GITHUB_TOKEN がない');
  const url = path.startsWith('/') ? `${API}${path}` : `${API}/repos/${REPO}/${path}`;
  const r = await fetch(url, {
    method,
    headers: { authorization: `Bearer ${process.env.GITHUB_TOKEN}`, accept: 'application/vnd.github+json', 'x-github-api-version': '2022-11-28', 'user-agent': 'merge-ok', ...(body ? { 'content-type': 'application/json' } : {}) },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (r.status === 404 && method === 'GET') return null;
  if (!r.ok) {
    const why = String((await r.json().catch(() => ({}))).message || '').slice(0, 200);
    const e = new Error(`GitHub API ${method} ${path.split('?')[0]}：HTTP ${r.status}${why ? `（${why}）` : ''}`);
    e.status = r.status;
    e.why = why;
    throw e;
  }
  const text = await r.text();
  return text ? JSON.parse(text) : null;
}
async function pages(path, pick = (x) => x, max = 5) {
  const out = [];
  for (let p = 1; p <= max; p++) {
    const res = await gh(`${path}${path.includes('?') ? '&' : '?'}per_page=100&page=${p}`);
    const list = res ? pick(res) : [];
    out.push(...list);
    if (list.length < 100) break;
  }
  return out;
}

async function ensureLabel(name) {
  if (await gh(`labels/${encodeURIComponent(name)}`)) return;
  await gh('labels', { method: 'POST', body: { name, ...LABELS[name] } }).catch((e) => console.log(`ラベル ${name} を作れなかった（${e.message}）`));
}

// ラベル merge-ok が付いた最後の時刻（ms）
async function labeledAt(n) {
  const ev = await pages(`issues/${n}/events`, (x) => x, 3);
  const hit = ev.filter((e) => e.event === 'labeled' && e.label?.name === LABEL).pop();
  return hit ? Date.parse(hit.created_at) : null;
}

async function block(p, msg) {
  if (DRY) return log(`#${p.number} にコメントして ${LABEL} を外し ${BLOCKED} を付けるはず：${msg}`);
  await gh(`issues/${p.number}/comments`, { method: 'POST', body: { body: `${msg}\n\n（マージの印 .github/workflows/merge-ok.yml：${RUN_URL}）` } });
  await gh(`issues/${p.number}/labels/${LABEL}`, { method: 'DELETE' }).catch((e) => console.log(`#${p.number}：${LABEL} を外せなかった（${e.message}）`));
  await ensureLabel(BLOCKED);
  await gh(`issues/${p.number}/labels`, { method: 'POST', body: { labels: [BLOCKED] } });
  console.log(`#${p.number}：${msg}`);
}

// 1つの PR を見る。返すのは log の文と、もう一度見るまでの時間（retry）
async function consider(p, open, merged) {
  if (p.base?.ref !== 'main') return { say: `base が ${p.base?.ref} なので見ない` };
  if (p.draft) return { say: 'draft なので見ない' };

  const wait = waitingOn(orderDeps(p.body), open.filter((o) => !merged.includes(o.number)), p.number);
  if (wait.length) return { say: `順番の指定：${wait.map((n) => `#${n}`).join('・')} がまだ開いているので待つ` };

  const sha = p.head.sha;
  const checkRuns = await pages(`commits/${sha}/check-runs`, (x) => x.check_runs, 3);
  const statuses = (await gh(`commits/${sha}/status`))?.statuses || [];
  const others = checkRuns.filter((c) => c.name !== SELF_JOB);
  const at = others.length || statuses.length ? null : await labeledAt(p.number);
  const c = evaluateChecks({ checkRuns, statuses, labeledAt: at });
  if (c.state === 'wait') return { say: c.reason, retry: c.grace ? Math.min(c.grace + 5e3, 60e3) : undefined };
  if (c.state === 'fail') {
    await block(p, MSG.fail(c.failed));
    return { say: '点検が通らなかった' };
  }

  let fresh;
  for (let i = 0; i <= 2; i++) {
    if (i) await sleep(5000);
    fresh = await gh(`pulls/${p.number}`);
    if (!fresh || fresh.state !== 'open' || !hasLabel(fresh)) return { say: '閉じた・印が外れたので見ない' };
    if (fresh.head.sha !== sha) return { say: 'head が変わったので、次の点検の終わりで見直す' };
    if (fresh.mergeable !== null) break;
  }
  const act = mergeableAction(fresh.mergeable);
  if (act === 'retry') return { say: 'ぶつかりの計算がまだなので待つ', retry: 20e3 };
  if (act === 'conflict') {
    await block(p, MSG.conflict);
    return { say: 'main とぶつかった' };
  }

  const title = mergeTitle(fresh);
  if (DRY) {
    merged.push(p.number);
    return { say: `squash でマージするはず（${title}・sha ${sha.slice(0, 7)}）` };
  }
  try {
    await gh(`pulls/${p.number}/merge`, { method: 'PUT', body: { merge_method: 'squash', sha, commit_title: title, commit_message: mergeMessage(fresh) } });
  } catch (e) {
    if (e.status === 409) return { say: 'head が変わったので、次の点検の終わりで見直す' };
    if (!e.status) throw e;
    await block(p, MSG.error(e.status, e.why));
    return { say: 'マージできなかった' };
  }
  merged.push(p.number);
  return { say: `squash でマージした（${title}）` };
}

async function pass(merged) {
  const open = await pages('pulls?state=open', (x) => x, 3);
  const marked = pickTargets(open, ONLY);
  if (!marked.length) {
    log(ONLY ? `#${ONLY} は印の付いた開いている PR ではない` : '印の付いた開いている PR はない');
    return null;
  }
  let retry = null;
  for (const p of marked) {
    if (merged.includes(p.number)) continue;
    const r = await consider(p, open, merged);
    log(`#${p.number}：${r.say}`);
    if (r.retry) retry = Math.min(retry ?? r.retry, r.retry);
  }
  return retry;
}

async function main() {
  if (!DRY) await ensureLabel(LABEL);
  const merged = [];
  // 点検がまだ1つもない PR・ぶつかりの計算がまだの PR は、ほかに見直すきっかけがないので、少し待ってから見直す（11分まで）
  const until = Date.now() + 11 * 60e3;
  for (let i = 0; i < 20; i++) {
    const retry = await pass(merged);
    if (retry == null || DRY || Date.now() + retry > until) break;
    log(`${Math.round(retry / 1000)}秒待って見直す`);
    await sleep(retry);
  }
  if (!merged.length) return;
  if (!PUBLISH) return log('公開の workflow の指定がない（PUBLISH_WORKFLOW）');
  if (DRY) return log(`公開（${PUBLISH}）を main で動かすはず`);
  await gh(`actions/workflows/${PUBLISH}/dispatches`, { method: 'POST', body: { ref: 'main' } });
  console.log(`公開（${PUBLISH}）を main で動かした（結果は見張りが見る）`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((e) => {
    console.error(`マージの印：${e.message}`);
    process.exitCode = 1;
  });
}
