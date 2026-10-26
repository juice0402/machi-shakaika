// 楽天市場から、品目ページ（/hinmoku/）に出す商品を取る（GitHub Actions で、ビルドの前に毎回）
// 品目ごとに：items.yml の shop.keywords で商品検索（レビューが多い順・買えるものだけ）→ 結果に多いジャンルのデイリーランキング（60位まで）
//   → 条件に合うものを、ランキングの順位 → レビューの多さでえらぶ（src/rakuten.mjs の pick）
// このリポジトリは公開なので、取ったものは data/rakuten/（.gitignore）に置くだけ。商品名などはログに出さない（件数だけ）
// うまく取れなければ止める（終了コード 1）→ 公開しない（前の公開がそのまま残る）

import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname } from 'node:path';
import { readYaml } from '../src/data.mjs';
import { cleanKeys, searchUrl, rankingUrl, parseItems, pick, topGenres, HEADERS, PRODUCTS_PATH, KEEP } from '../src/rakuten.mjs';
import { SAIGAI } from '../src/mode.mjs';

// 災害時モード（data/mode.yml）のあいだは商品を出さないので、取らない
if (SAIGAI) {
  console.log('災害時モードなので、楽天の商品は取りません');
  process.exit(0);
}

const keys = cleanKeys(process.env);
const note = (level, msg) => {
  console.log(msg);
  if (process.env.GITHUB_ACTIONS) console.log(`::${level} title=楽天の商品::${msg}`);
};
if (!keys.appId || !keys.accessKey || !keys.affiliateId) {
  note('error', '楽天のキー（RAKUTEN_APPLICATION_ID / RAKUTEN_ACCESS_KEY / RAKUTEN_AFFILIATE_ID）がありません');
  process.exit(1);
}

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
let calls = 0;
// 1.1秒以上あけて呼ぶ。混んでいる（429・5xx）ときは待って3回まで。404（なし）・400（そのジャンルは出せない）は空で返す
async function get(url) {
  for (let attempt = 1; attempt <= 3; attempt++) {
    const wait = last + 1100 - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    calls++;
    const res = await fetch(url, { headers: HEADERS });
    const text = await res.text();
    if ((res.status === 429 || res.status >= 500) && attempt < 3) {
      await sleep(5000 * attempt);
      continue;
    }
    if (res.status === 404 || res.status === 400) return [];
    if (!res.ok) {
      // 本文には商品の情報が入らない（エラーの説明だけ）。キーが入ることはないが、念のため英数字の長い並びは伏せる
      const hint = /SCOPES_NOT_ALLOWED/.test(text) ? '（楽天のアプリで楽天市場APIが許可されていません）' : /REFERRER|referer|Referer/.test(text) ? '（許可されたWebサイトを確かめてください）' : '';
      throw new Error(`HTTP ${res.status}${hint} ${text.slice(0, 120).replace(/[A-Za-z0-9_-]{20,}/g, '…').replace(/\s+/g, ' ')}`);
    }
    return parseItems(JSON.parse(text));
  }
  throw new Error('楽天APIが混んでいて取れませんでした');
}

const items = readYaml('items.yml').items.filter((it) => it.hinmoku && it.shop);
const out = {};
const counts = [];
try {
  for (const it of items) {
    const found = [];
    for (const kw of it.shop.keywords) found.push(...(await get(searchUrl(keys, kw))));
    const rank = new Map();
    const ranked = [];
    for (const g of topGenres(found)) {
      for (const page of [1, 2]) {
        for (const r of await get(rankingUrl(keys, g, page))) {
          if (!rank.has(r.code)) rank.set(r.code, r.rank);
          ranked.push(r);
        }
      }
    }
    // ランキングに入っている商品は順位をつける。検索になくてもランキングにあって条件に合えば候補に入れる
    const cands = [...ranked, ...found].map((x) => ({ ...x, rank: rank.get(x.code) ?? 0 }));
    out[it.id] = pick(cands, it.shop, KEEP);
    counts.push(`${it.id} ${out[it.id].length}件（ランキング入り ${out[it.id].filter((x) => x.rank).length}）`);
  }
} catch (e) {
  note('error', `取れませんでした：${String(e.message ?? e).slice(0, 200)}`);
  process.exit(1);
}

// 見張り：商品が3件以上ある品目が半分より少なければ、楽天の仕様が変わったなどと考えて止める
const enough = Object.values(out).filter((l) => l.length >= 3).length;
if (enough < Math.ceil(items.length / 2)) {
  note('error', `商品が少なすぎます（${counts.join('・')}）`);
  process.exit(1);
}
mkdirSync(dirname(PRODUCTS_PATH), { recursive: true });
writeFileSync(PRODUCTS_PATH, JSON.stringify({ fetchedAt: new Date().toISOString(), items: out }));
note('notice', `呼び出し ${calls}回：${counts.join('・')}`);
