import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readBichiku, bichikuMap, checkBichiku } from '../src/data.mjs';
import { CITIES } from '../src/areas.mjs';
import { bichikuLine } from '../src/pages/city.mjs';

const bichiku = readBichiku();
const city = (key) => CITIES.find((c) => `${c.pref}/${c.slug}` === key);
const ok = { city: 'hokkaido/sapporo', publisher: '札幌市', title: '災害用備蓄物資', url: 'https://example.jp/a', checked: '2026-10-26' };

test('自治体の備蓄の公表ページ：データの形が合っている', () => {
  assert.deepEqual(checkBichiku(bichiku), []);
  assert.ok(bichiku.cities.length >= 50, '見つかった街が少なすぎます');
});

test('どの街も areas.mjs にあり、発行元は街の名前、2回は書かない', () => {
  const keys = new Set();
  for (const c of bichiku.cities) {
    const hit = city(c.city);
    assert.ok(hit, `${c.city} が areas.mjs にありません`);
    assert.equal(c.publisher, hit.name);
    assert.ok(!keys.has(c.city), `${c.city} が2回あります`);
    keys.add(c.city);
  }
  assert.equal(bichikuMap(bichiku).size, bichiku.cities.length);
});

test('まちがったものはエラーになる', () => {
  const bad = (o) => checkBichiku({ cities: [{ ...ok, ...o }] });
  assert.deepEqual(bad({}), []);
  assert.ok(bad({ city: 'hokkaido/nai' }).some((e) => e.includes('areas.mjs')));
  assert.ok(bad({ publisher: '札幌' }).some((e) => e.includes('publisher')));
  assert.ok(bad({ publisher: null }).some((e) => e.includes('publisher')));
  assert.ok(bad({ title: '' }).some((e) => e.includes('title')));
  assert.ok(bad({ title: null }).some((e) => e.includes('title')));
  assert.ok(bad({ url: 'http://example.jp/a' }).some((e) => e.includes('https')));
  assert.ok(bad({ url: null }).some((e) => e.includes('https')));
  assert.ok(bad({ checked: '2026/10/26' }).some((e) => e.includes('checked')));
  assert.ok(bad({ checked: null }).some((e) => e.includes('checked')));
  const dup = checkBichiku({ cities: [ok, ok] });
  assert.ok(dup.some((e) => e.includes('2回')));
  assert.ok(checkBichiku({ cities: 'x' }).length > 0);
  assert.deepEqual(checkBichiku(null), []);
  assert.deepEqual(checkBichiku({ cities: [] }), []);
});

test('「この街の備え」の1行：市は「市の備蓄」、東京23区は「区の備蓄」。リンクは rel="noopener"', () => {
  const s = bichikuLine(city('hokkaido/sapporo'), ok);
  assert.ok(s.startsWith('<p class="why">市の備蓄は避難所に来た人の分です。<br>家の分は家で備えます。<br>'));
  assert.ok(s.includes('<a href="https://example.jp/a" rel="noopener">札幌市<cite>「災害用備蓄物資」</cite></a>'));
  const k = bichikuLine(city('tokyo/setagaya'), { ...ok, city: 'tokyo/setagaya', publisher: '世田谷区', title: '備蓄状況の公表' });
  assert.ok(k.includes('区の備蓄は避難所に来た人の分です。<br>家の分は家で備えます。'));
  assert.ok(!k.includes('市の備蓄'));
  // 東京の市（八王子）は「市」
  assert.ok(bichikuLine(city('tokyo/hachioji'), ok).includes('市の備蓄は'));
});

test('「この街の備え」の1行：リンクがない街は行ごと出さない・題の中の記号は逃がす', () => {
  assert.equal(bichikuLine(city('hokkaido/sapporo'), null), '');
  assert.equal(bichikuLine(city('hokkaido/sapporo'), undefined), '');
  const s = bichikuLine(city('hokkaido/sapporo'), { ...ok, title: 'A「B」<c>', url: 'https://example.jp/?a=1&b=2' });
  assert.ok(s.includes('「A『B』&lt;c&gt;」'));
  assert.ok(s.includes('href="https://example.jp/?a=1&amp;b=2"'));
});

test('「この街の備え」の1行に使わない言葉・右はしの矢印がない', () => {
  const s = bichikuLine(city('hokkaido/sapporo'), ok).replace(/<cite>.*<\/cite>/, '');
  for (const w of ['今すぐ', '手遅れ', 'しましょう', 'ぜひ', '便利', '簡単', '安心', 'おすすめ', 'ポイント', 'コツ', '——', '›', '→']) {
    assert.ok(!s.includes(w), `使わない言葉「${w}」`);
  }
});
