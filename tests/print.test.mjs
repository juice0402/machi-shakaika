import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml } from '../src/data.mjs';
import { calcConf } from '../src/calc.mjs';
import { printPages, splitName, PRINT_PATH } from '../src/pages/print.mjs';

const items = readYaml('items.yml');
const sources = readYaml('sources.yml');
const [p] = printPages({ cc: calcConf(items), items, sources });
const count = (s, re) => (s.match(re) ?? []).length;

test('冷蔵庫に貼る紙：品目はすべて items.yml から、期限の欄は kigen のある品目だけ', () => {
  assert.equal(p.path, PRINT_PATH);
  const cl = (id) => items.checklists.find((c) => c.id === id);
  assert.equal(count(p.body, /<div class="tr">/g), cl('bichiku').entries.length);
  assert.equal(count(p.body, /<li><span class="bx">/g), cl('mochidashi').entries.length);
  assert.equal(count(p.body, /<span class="kg"><span class="wr"/g), cl('bichiku').entries.filter((e) => e.kigen).length);
});

test('冷蔵庫に貼る紙：広告なし・挿絵なし・行の数で高さを分ける・印刷は A4', () => {
  assert.equal(p.noAds, true);
  assert.ok(!/town|<img/.test(p.body), '挿絵を入れない');
  assert.match(p.head, /grid-template-rows:repeat\(\d+,minmax\(0,1fr\)\)/);
  assert.match(p.head, /@page\{size:A4;margin:0\}/);
  assert.match(p.body, /data-print/);
});

test('かっこの中は小さい2行目に。文字はそのまま', () => {
  assert.deepEqual(splitName({ name: '救急用品（消毒液・常備薬・包帯など）' }), { main: '救急用品', small: '消毒液・常備薬・包帯など' });
  assert.deepEqual(splitName({ name: '携帯ラジオ' }), { main: '携帯ラジオ', small: '' });
  assert.deepEqual(splitName({ name: 'ミルク・紙おむつ・ほ乳びん', sub: '乳児がいる家' }), { main: 'ミルク・紙おむつ・ほ乳びん', small: '乳児がいる家' });
});
