import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml } from '../src/data.mjs';
import { calcConf } from '../src/calc.mjs';
import { allYomimono, yomimonoPages } from '../src/pages/sonae-yomimono.mjs';
import { sotoPages } from '../src/pages/sonae-soto.mjs';
import { fuyuTeidenPages } from '../src/pages/sonae-fuyu.mjs';
import { feedXml, pubDate, FEED_TITLE } from '../src/feed.mjs';
import { SITE } from '../src/site.mjs';

const items = readYaml('items.yml');
const sources = readYaml('sources.yml');
const cc = calcConf(items);
const pages = [...yomimonoPages({ cc, items, sources }), ...sotoPages({ cc, items, sources }), ...fuyuTeidenPages({ cc, items, sources })];
const descOf = new Map(pages.map((p) => [p.path, p.description]));
const xml = feedXml(allYomimono(), (p) => descOf.get(p));
const tag = (s, t) => [...s.matchAll(new RegExp(`<${t}>([^<]*)</${t}>`, 'g'))].map((m) => m[1]);

test('RSS：読みものの全部に date（YYYY-MM-DD）がある', () => {
  for (const y of allYomimono()) {
    assert.match(String(y.date), /^\d{4}-\d{2}-\d{2}$/, y.path);
    assert.ok(!Number.isNaN(Date.parse(y.date)), y.path);
  }
});

test('RSS：item は読みものの全部・新しい順・link と guid と説明文', () => {
  const list = allYomimono();
  const itemsXml = xml.match(/<item>[\s\S]*?<\/item>/g);
  assert.equal(itemsXml.length, list.length);
  const dates = itemsXml.map((x) => Date.parse(tag(x, 'pubDate')[0]));
  for (let i = 1; i < dates.length; i++) assert.ok(dates[i - 1] >= dates[i], '新しい順');
  for (const x of itemsXml) {
    const [link] = tag(x, 'link');
    assert.equal(tag(x, 'guid')[0], link);
    const y = list.find((v) => `${SITE.url}${v.path}` === link);
    assert.ok(y, link);
    assert.equal(tag(x, 'pubDate')[0], pubDate(y.date));
    assert.ok(tag(x, 'description')[0].length > 0);
  }
  assert.ok(!/lastBuildDate/.test(xml));
  assert.equal(tag(xml, 'title')[0], FEED_TITLE);
  assert.equal(tag(xml, 'link')[0], `${SITE.url}/sonae/`);
});

test('RSS：pubDate は日本時間0時・曜日つき', () => {
  assert.equal(pubDate('2026-10-27'), 'Tue, 27 Oct 2026 00:00:00 +0900');
  assert.equal(new Date(pubDate('2026-11-01')).toISOString(), '2026-10-31T15:00:00.000Z');
  assert.throws(() => pubDate('2026/10/27'));
});

test('RSS：& < > をエスケープし、同じ入力からは同じ出力', () => {
  const odd = [{ path: '/sonae/a/', name: 'A & <B>', date: '2026-11-01' }];
  const s = feedXml(odd, () => '水 > 3L & <x>');
  assert.ok(s.includes('<title>A &amp; &lt;B&gt;</title>'));
  assert.ok(s.includes('<description>水 &gt; 3L &amp; &lt;x&gt;</description>'));
  assert.equal(feedXml(allYomimono(), (p) => descOf.get(p)), xml);
  assert.throws(() => feedXml(odd, () => ''));
});
