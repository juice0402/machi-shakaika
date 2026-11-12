// 備えの読みものの新着を RSS 2.0 で（/sonae/feed.xml。#102 呼び戻せる入口）
//   ビルドの時刻は入れない（lastBuildDate なし）。同じデータなら1バイトも変わらず、本番の指紋も変わらない
import { SITE } from './site.mjs';
import { esc } from './layout.mjs';

export const FEED_PATH = '/sonae/feed.xml';
export const FEED_TITLE = 'まちの社会科 備えの読みもの';
// /sonae/ と読みもののページの head に入れる1行
export const FEED_LINK = `<link rel="alternate" type="application/rss+xml" title="${FEED_TITLE}" href="${FEED_PATH}">`;

const WEEK = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MON = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

// 'YYYY-MM-DD' → その日の日本時間0時（RFC 822。例 Tue, 27 Oct 2026 00:00:00 +0900）
export function pubDate(date) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(date ?? ''));
  if (!m) throw new Error(`RSS：日付 ${date} は YYYY-MM-DD で`);
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return `${WEEK[d.getUTCDay()]}, ${m[3]} ${MON[+m[2] - 1]} ${m[1]} 00:00:00 +0900`;
}

// list は allYomimono()（date つき）、descOf(path) はそのページの meta description
export function feedXml(list, descOf) {
  const rows = [...list].sort((a, b) => (a.date < b.date ? 1 : a.date > b.date ? -1 : 0));
  const item = (y) => {
    const desc = descOf(y.path);
    if (!desc) throw new Error(`RSS：${y.path} の説明文がない`);
    const url = esc(`${SITE.url}${y.path}`);
    return `<item><title>${esc(y.name)}</title><link>${url}</link><guid>${url}</guid><pubDate>${pubDate(y.date)}</pubDate><description>${esc(desc)}</description></item>`;
  };
  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
<channel>
<title>${esc(FEED_TITLE)}</title>
<link>${esc(`${SITE.url}/sonae/`)}</link>
<description>家の備えを人数と日数で考える、まちの社会科の読みものの新着です。</description>
<language>ja</language>
${rows.map(item).join('\n')}
</channel>
</rss>
`;
}
