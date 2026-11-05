// 地震の見張り（.github/workflows/jishin.yml。2026-11-05 #61）。依存パッケージなしの Node 22 だけ。Claude は使わない。
// 10分ごとに気象庁の地震の一覧（list.json）を読み、最大震度6弱以上の地震があれば issue（ラベル jishin）を1つ立てる。
//   - 同じ地震（eid）で2つ立てない。jishin の issue（開いている・閉じた）の本文の「eid: 」の行を見る。
//   - 災害時モードは切りかえない（しょーくんが saigai.yml で決める）。ページには何も出さない。
//   - 「震度速報」と「震源・震度情報」のどちらでも、最大震度が6弱以上なら立てる（同じ eid は1つ）。
//   - 発生から24時間より前の地震は見ない（はじめて動いた日に、何日も前の地震で issue を立てないため）。
//   - 読めないとき：1回・2回は知らせない。3回続けて読めない・JSON の形が変わったときは失敗で終わり、見張り（mihari.yml）が issue を立てる。
//     続けて読めなかった回数は、Actions の cache（.jishin/state.json）に残す。
// 使い方（jishin.yml から。GH_TOKEN が要る）：node scripts/jishin.mjs
//   JISHIN_DRY_RUN=true なら issue を立てず、立てるはずの題と本文を出す（cache の回数も変えない）。
// テストは tests/jishin.test.mjs

import { readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { pathToFileURL } from 'node:url';

const REPO = process.env.GITHUB_REPOSITORY || 'juice0402/machi-shakaika';
export const LIST_URL = 'https://www.jma.go.jp/bosai/quake/data/list.json';
export const LABEL = { name: 'jishin', color: '5319e7', description: '地震の見張りが見つけた（最大震度6弱以上）。しょーくんが決める' };
export const SIGN = '地震の見張り（.github/workflows/jishin.yml）が作った';
export const SAIGAI_URL = `https://github.com/${REPO}/actions/workflows/saigai.yml`;
export const FAIL_LIMIT = 3; // 続けてこの回数読めなかったら失敗にする
export const WINDOW_H = 24; // 発生からこの時間までの地震だけ見る

// 気象庁の最大震度の書き方 → 大きさの順と、見せる言葉
const SHINDO = { 1: '1', 2: '2', 3: '3', 4: '4', '5-': '5弱', '5+': '5強', '6-': '6弱', '6+': '6強', 7: '7' };
const ORDER = Object.keys(SHINDO).sort((a, b) => parseFloat(a) - parseFloat(b) || (a.endsWith('+') ? 1 : -1));
export const rank = (maxi) => ORDER.indexOf(String(maxi ?? '').trim()); // わからない書き方は -1
export const shindo = (maxi) => SHINDO[String(maxi ?? '').trim()] ?? null;
export const THRESHOLD = rank('6-');

// ---- 判定（ネットにつながない。テストする所） ----

const jst = (iso) => {
  const t = Date.parse(iso ?? '');
  return Number.isNaN(t) ? null : new Date(t + 9 * 3600e3); // getUTC* で日本時間を読む
};

// 「1/1 16:10」
export const shortTime = (iso) => {
  const d = jst(iso);
  return d ? `${d.getUTCMonth() + 1}/${d.getUTCDate()} ${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}` : '時刻不明';
};

const longTime = (iso) => {
  const d = jst(iso);
  return d ? `${d.getUTCFullYear()}年${d.getUTCMonth() + 1}月${d.getUTCDate()}日 ${d.getUTCHours()}:${String(d.getUTCMinutes()).padStart(2, '0')}（日本時間）` : '時刻不明';
};

export class ShapeError extends Error {}

// list.json の中身 → 最大震度6弱以上の地震（eid ごとに1つ・新しい順）。形が変わっていたら ShapeError
export function pickQuakes(list, now = new Date()) {
  if (!Array.isArray(list) || list.length === 0) throw new ShapeError('list.json が配列でない・空');
  const rows = list.filter((r) => r && typeof r === 'object' && /^\d+$/.test(String(r.eid ?? '')) && !Number.isNaN(Date.parse(r.at ?? '')));
  if (rows.length === 0) throw new ShapeError('list.json に eid と at のそろった行がない');
  if (!rows.some((r) => rank(r.maxi) >= 0)) throw new ShapeError('list.json に読める maxi（最大震度）がない');
  const since = now.getTime() - WINDOW_H * 3600e3;
  const byEid = new Map();
  for (const r of rows) {
    if (rank(r.maxi) < THRESHOLD) continue; // 5強以下・形のおかしい maxi
    if (Date.parse(r.at) < since || Date.parse(r.at) > now.getTime() + 3600e3) continue;
    const eid = String(r.eid);
    const q = byEid.get(eid) ?? { eid, maxi: r.maxi, at: r.at, anm: '', mag: '', ttl: [] };
    if (rank(r.maxi) > rank(q.maxi)) q.maxi = r.maxi;
    if (!q.anm && r.anm) q.anm = String(r.anm);
    if (!q.mag && r.mag && r.mag !== 'Ｍ不明') q.mag = String(r.mag);
    if (r.ttl && !q.ttl.includes(String(r.ttl))) q.ttl.push(String(r.ttl));
    byEid.set(eid, q);
  }
  return [...byEid.values()].sort((a, b) => Date.parse(b.at) - Date.parse(a.at));
}

export const issueTitle = (q) => `震度${shindo(q.maxi)}（最大）：${q.anm || '震源は未発表'}（${shortTime(q.at)}）`;

export function issueBody(q) {
  return [
    '気象庁の地震の一覧に、最大震度6弱以上の地震が出ました。',
    '',
    `- 最大震度：${shindo(q.maxi)}`,
    `- 震源：${q.anm || 'まだ出ていない'}`,
    `- 発生：${longTime(q.at)}`,
    `- マグニチュード：${q.mag || 'まだ出ていない'}`,
    `- 情報：${q.ttl?.length ? q.ttl.join('／') : '不明'}`,
    '',
    `災害時モードにするかは、しょーくんが決める（ボタン ${SAIGAI_URL} → Run workflow）。見張りは切りかえていません。`,
    '',
    '気象庁 https://www.jma.go.jp/bosai/',
    '',
    `eid: ${q.eid}`,
    SIGN,
  ].join('\n');
}

// jishin の issue の本文から、もう立てた eid
export const knownEids = (issues) => new Set((issues ?? []).flatMap((i) => [...String(i.body ?? '').matchAll(/^eid: (\d+)\s*$/gm)].map((m) => m[1])));

// 続けて読めなかった回数。ok なら0にもどす
export const nextFails = (fails, ok) => (ok ? 0 : (Number(fails) || 0) + 1);

// ---- 読む・書く ----

export class ApiError extends Error {
  constructor(status, text) {
    super(`${status} ${text}`);
    this.status = status;
  }
}

async function github(path, { method = 'GET', body } = {}) {
  const token = process.env.GH_TOKEN || process.env.GITHUB_TOKEN;
  const res = await fetch(`${process.env.GITHUB_API_URL || 'https://api.github.com'}/${path}`, {
    method,
    headers: {
      ...(token ? { authorization: `Bearer ${token}` } : {}),
      accept: 'application/vnd.github+json',
      'x-github-api-version': '2022-11-28',
      'user-agent': 'jishin',
      ...(body ? { 'content-type': 'application/json' } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new ApiError(res.status, (await res.text()).slice(0, 200));
  return res.status === 204 ? null : res.json();
}

async function fetchList() {
  const res = await fetch(LIST_URL, { headers: { 'user-agent': 'machi-shakaika-jishin' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`気象庁 ${res.status}`);
  return JSON.parse(await res.text());
}

async function ensureLabel(api) {
  try {
    await api(`repos/${REPO}/labels/${LABEL.name}`);
  } catch (e) {
    if (e.status !== 404) throw e;
    try {
      await api(`repos/${REPO}/labels`, { method: 'POST', body: LABEL });
    } catch (e2) {
      if (e2.status !== 422) throw e2; // すでにある
    }
  }
}

// 1回分。返すのは { fails: 次に残す回数, failed: 失敗で終えるか, made: 立てた issue の題 }
export async function check({ fails = 0, dry = false, now = new Date(), read = fetchList, api = github, log = console.log } = {}) {
  let list;
  try {
    list = await read();
  } catch (e) {
    const n = nextFails(fails, false);
    log(`気象庁の一覧が読めない（${String(e.message).slice(0, 120)}）。続けて ${n} 回め`);
    return { fails: n, failed: n >= FAIL_LIMIT, made: [] };
  }
  let quakes;
  try {
    quakes = pickQuakes(list, now);
  } catch (e) {
    if (!(e instanceof ShapeError)) throw e;
    log(`気象庁の一覧の形が変わった：${e.message}`);
    return { fails: 0, failed: true, made: [] };
  }
  log(`気象庁の一覧：${list.length} 件。24時間以内の最大震度6弱以上：${quakes.length} 件`);
  const made = [];
  if (quakes.length) {
    const issues = (await api(`repos/${REPO}/issues?state=all&labels=${LABEL.name}&per_page=100`)) ?? [];
    const known = knownEids(issues);
    for (const q of quakes) {
      if (known.has(q.eid)) {
        log(`eid ${q.eid}：もう issue がある`);
        continue;
      }
      const title = issueTitle(q);
      if (dry) {
        log(`（ためし）立てるはずの issue: ${title}\n${issueBody(q)}`);
      } else {
        await ensureLabel(api);
        const r = await api(`repos/${REPO}/issues`, { method: 'POST', body: { title, body: issueBody(q), labels: [LABEL.name] } });
        log(`issue #${r?.number} を立てた：${title}`);
      }
      known.add(q.eid);
      made.push(title);
    }
  }
  return { fails: 0, failed: false, made };
}

async function main() {
  const dry = (process.env.JISHIN_DRY_RUN ?? '').toLowerCase() === 'true';
  const file = process.env.JISHIN_STATE || '.jishin/state.json';
  let fails = 0;
  try {
    fails = Number(JSON.parse(readFileSync(file, 'utf8')).fails) || 0;
  } catch {
    // はじめて・cache がない
  }
  const r = await check({ fails, dry });
  const save = !dry && r.fails !== fails;
  if (save) {
    mkdirSync(dirname(file), { recursive: true });
    writeFileSync(file, JSON.stringify({ fails: r.fails }) + '\n');
  }
  if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `save=${save}\n`);
  if (r.failed) {
    console.log(`::error::地震の見張り：${r.fails ? `気象庁の一覧が ${r.fails} 回続けて読めない` : '気象庁の一覧の形が変わった'}`);
    process.exitCode = 1;
  }
}

if (import.meta.url === pathToFileURL(process.argv[1] ?? '').href) {
  main().catch((e) => {
    console.log(`::error::地震の見張り：うまく動きませんでした（${String(e.message).slice(0, 200)}）`);
    process.exit(1);
  });
}
