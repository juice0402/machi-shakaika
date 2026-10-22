import { test } from 'node:test';
import assert from 'node:assert/strict';
import { cleanName, fits, pick, topGenres, searchUrl, rankingUrl, KEEP, SHOW } from '../src/rakuten.mjs';
import { readYaml } from '../src/data.mjs';

const shop = { must: ['保存水'], ng: ['炭酸'] };
const item = (o) => ({ code: 'c', name: '保存水 2L×6本', price: 2000, url: 'https://hb.afl.rakuten.co.jp/x', img: 'https://thumbnail.image.rakuten.co.jp/x.jpg', shop: 'A', avail: 1, genre: '1', reviews: 100, rating: 4.5, rank: 0, ...o });

test('商品名の飾りと絵文字を外す', () => {
  assert.equal(cleanName('【送料無料】保存水 ★5年保存★ 2L×6本 [防災]'), '保存水 5年保存 2L×6本');
  assert.equal(cleanName('保存水😀 2L'), '保存水 2L');
  assert.equal(cleanName('【だけ】'), '【だけ】');
});

test('品目の条件：言葉・在庫・レビュー', () => {
  assert.equal(fits(item(), shop), true);
  assert.equal(fits(item({ name: '炭酸水 保存水' }), shop), false);
  assert.equal(fits(item({ name: '天然水 2L' }), shop), false);
  assert.equal(fits(item({ name: '【中古】保存水' }), shop), false);
  assert.equal(fits(item({ avail: 0 }), shop), false);
  assert.equal(fits(item({ reviews: 3 }), shop), false);
  assert.equal(fits(item({ rating: 3.5 }), shop), false);
  assert.equal(fits(item({ name: 'アルファ米 白米' }), { must: ['アルファ米'], also: ['非常食'] }), false);
  assert.equal(fits(item({ name: 'アルファ米 白米 非常食' }), { must: ['アルファ米'], also: ['非常食'] }), true);
});

test('えらび方：ランキングの順位 → レビューの多さ。同じ商品は1つ、同じお店は2つまで、値段がとびぬけたものは外す', () => {
  const c = [
    item({ code: 'a', reviews: 50, shop: 'S1' }),
    item({ code: 'b', reviews: 900, shop: 'S2' }),
    item({ code: 'r5', reviews: 20, rank: 5, shop: 'S3' }),
    item({ code: 'r2', reviews: 20, rank: 2, shop: 'S4' }),
    item({ code: 'b', reviews: 900, shop: 'S2' }),
    item({ code: 's1', reviews: 800, shop: 'X' }),
    item({ code: 's2', reviews: 700, shop: 'X' }),
    item({ code: 's3', reviews: 600, shop: 'X' }),
    item({ code: 'high', reviews: 5000, price: 20000, shop: 'S5' }),
  ];
  const out = pick(c, shop, 10).map((x) => x.code);
  assert.deepEqual(out, ['r2', 'r5', 'b', 's1', 's2', 'a']);
  assert.equal(pick(c, shop).length <= KEEP, true);
  assert.ok(SHOW < KEEP);
});

test('ランキングを見るジャンルは、検索の結果に多いもの', () => {
  const g = topGenres([item({ genre: '1' }), item({ genre: '2' }), item({ genre: '2' }), item({ genre: '3' })]);
  assert.deepEqual(g, ['2', '1']);
});

test('呼び出しのURL：レビューが多い順・買えるものだけ・中古などを外す', () => {
  const k = { appId: 'A', accessKey: 'K', affiliateId: 'F' };
  const u = new URL(searchUrl(k, '保存水 2L'));
  assert.equal(u.searchParams.get('sort'), '-reviewCount');
  assert.equal(u.searchParams.get('availability'), '1');
  assert.ok(u.searchParams.get('NGKeyword').includes('中古'));
  assert.equal(u.searchParams.get('affiliateId'), 'F');
  assert.ok(new URL(rankingUrl(k, '123', 2)).searchParams.get('elements').includes('rank'));
});

test('品目ページの6品目に、探す言葉がある', () => {
  const items = readYaml('items.yml').items.filter((it) => it.hinmoku);
  assert.deepEqual(items.map((it) => it.id), ['mizu', 'shushoku', 'keitai-toilet', 'gas', 'light', 'battery']);
  for (const it of items) assert.ok(it.shop.keywords.length && it.shop.must.length, it.id);
});
