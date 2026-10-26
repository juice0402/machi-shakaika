import { test } from 'node:test';
import assert from 'node:assert/strict';
import { checkMode, SAIGAI_BAR } from '../src/mode.mjs';
import { page } from '../src/layout.mjs';
import { readYaml } from '../src/data.mjs';
import { hinmokuPages } from '../src/pages/hinmoku.mjs';
import { SITE } from '../src/site.mjs';

const items = readYaml('items.yml');
const sources = readYaml('sources.yml');

test('mode.yml の形', () => {
  assert.deepEqual(checkMode(readYaml('mode.yml')), []);
  assert.deepEqual(checkMode({ saigai: true, since: '2026-10-26' }), []);
  assert.equal(checkMode({ saigai: 'yes', since: null }).length, 1);
  assert.equal(checkMode({ saigai: false, since: '10/26' }).length, 1);
});

test('災害時モード：全ページの上に案内の帯、AdSense なし', () => {
  const p = { path: '/x/', title: 'x', description: 'x', body: '<h1>x</h1>' };
  const on = page({ ...p, saigai: true });
  assert.ok(on.includes(SAIGAI_BAR));
  assert.ok(on.indexOf(SAIGAI_BAR) < on.indexOf('<header>'), '帯はヘッダーより上');
  assert.ok(!on.includes('adsbygoogle'));
  assert.ok(on.includes('<body data-ads="off">'));
  const off = page({ ...p, saigai: false });
  assert.ok(!off.includes('class="sg"'));
  if (SITE.adsense && SITE.launched) assert.ok(off.includes('adsbygoogle'));
});

test('災害時モード：案内は気象庁へのリンクつきの1行で、あおる言葉を使わない', () => {
  assert.ok(SAIGAI_BAR.includes('href="https://www.jma.go.jp/bosai/"'));
  const text = SAIGAI_BAR.replace(/<[^>]+>/g, '');
  assert.ok([...text].length <= 27, `スマホの1行（${[...text].length}文字）`);
  for (const w of ['今すぐ', '危険', '緊急', '手遅れ', '！']) assert.ok(!text.includes(w));
});

test('災害時モード：品目ページから楽天の商品を外す', () => {
  const it = items.items.find((x) => x.hinmoku);
  const one = { url: 'https://item.rakuten.co.jp/x/1/', img: 'https://thumbnail.image.rakuten.co.jp/x.jpg', name: '水', price: 1000, reviews: 10, rating: 4.5 };
  const products = { fetchedAt: '2026-10-26T00:00:00Z', items: { [it.id]: [one, one, one] } };
  const on = hinmokuPages({ items, sources, products, saigai: true }).find((p) => p.path === `/hinmoku/${it.id}/`);
  assert.equal(on.rakuten, false);
  assert.ok(!on.body.includes('class="shop"'));
  assert.ok(!/楽天/.test(on.title + on.description + on.body));
  const off = hinmokuPages({ items, sources, products, saigai: false }).find((p) => p.path === `/hinmoku/${it.id}/`);
  assert.equal(off.rakuten, true);
  assert.ok(off.body.includes('class="shop"'));
});
