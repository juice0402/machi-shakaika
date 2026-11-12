// 本番の公開のあと、中身が変わったページを IndexNow に知らせる（Bing・Yandex・Naver など。Google は入っていないので sitemap と Search Console）
// 前に知らせたときの中身の印は .indexnow/pages.json（anzen と同じ形。鍵は static/<32けた>.txt で、ビルドが dist にそのまま置く）（GitHub Actions の cache に置く。main にはコミットしない）
// 知らせるのに失敗したら印を更新しない → 次の公開で送り直す。失敗しても公開は止めない
import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { SITE } from '../src/site.mjs';

const DIST = 'dist';
const REC = '.indexnow/pages.json';
const key = (readdirSync('static').find((f) => /^[0-9a-f]{32}\.txt$/.test(f)) || '').replace('.txt', '');
const note = (t) => {
  console.log(t);
  if (process.env.GITHUB_STEP_SUMMARY) writeFileSync(process.env.GITHUB_STEP_SUMMARY, `${t}\n`, { flag: 'a' });
};
if (!SITE.launched || !key) {
  note('IndexNow：公開前か鍵がないので知らせません');
  process.exit(0);
}
const urls = [...readFileSync(join(DIST, 'sitemap.xml'), 'utf8').matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]);
const prev = existsSync(REC) ? JSON.parse(readFileSync(REC, 'utf8')) : {};
const now = {};
for (const u of urls) {
  const html = readFileSync(join(DIST, u.slice(SITE.url.length), 'index.html'));
  now[u] = createHash('sha256').update(html).digest('hex').slice(0, 16);
}
const changed = urls.filter((u) => prev[u] !== now[u]);
if (!changed.length) {
  note('IndexNow：変わったページはありません');
  process.exit(0);
}
try {
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
    body: JSON.stringify({ host: new URL(SITE.url).host, key, keyLocation: `${SITE.url}/${key}.txt`, urlList: changed }),
  });
  if (res.ok) {
    mkdirSync('.indexnow', { recursive: true });
    writeFileSync(REC, JSON.stringify({ ...prev, ...now }));
    note(`IndexNow：${changed.length}件を知らせました（返事 ${res.status}）`);
  } else {
    note(`IndexNow：受け付けられませんでした（返事 ${res.status} ${(await res.text()).slice(0, 200)}）。次の公開で送り直します`);
  }
} catch (e) {
  note(`IndexNow：つながりませんでした（${e.message}）。次の公開で送り直します`);
}
