// チェックリストの「まだの品目」（夜 #106）：家に置く備えの、品目ページのある行の数だけリンク
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml } from '../src/data.mjs';
import { calcConf } from '../src/calc.mjs';
import { douguPages } from '../src/pages/dougu.mjs';

const items = readYaml('items.yml');
const sources = readYaml('sources.yml');
const page = douguPages({ cc: calcConf(items), items, sources }).find((p) => p.path === '/dougu/check/');

test('まだの品目：家に置く備えの品目ページのある行の数だけ、/hinmoku/ への data-keep のリンク', () => {
  const [home] = items.checklists;
  const ids = home.entries.map((e) => e.item).filter((id) => id && items.items.find((x) => x.id === id)?.hinmoku);
  assert.ok(ids.length > 0);
  const rows = page.body.match(/<p class="mada"[^>]*data-mada="([^"]+)"[^>]*>[\s\S]*?<\/p>/g) ?? [];
  assert.equal(rows.length, 1, 'まだの品目の行は1つだけ（持ち出す袋には足さない）');
  assert.ok(rows[0].includes(`data-mada="${home.id}"`));
  const links = [...rows[0].matchAll(/<a\b([^>]*)>/g)].map((m) => m[1]);
  assert.equal(links.length, ids.length);
  links.forEach((a, i) => {
    assert.match(a, /\bdata-keep\b/);
    assert.ok(a.includes(`href="/hinmoku/${ids[i]}/"`), a);
  });
  assert.ok(rows[0].includes('まだの品目：'));
  assert.ok(rows[0].includes('品目がそろった'));
  // まだの行は家に置く備えの一覧のすぐ下
  assert.match(page.body, new RegExp(`<section id="${home.id}">[\\s\\S]*?</ul>\\n<p class="mada"`));
  // 家に置く備えのチェック欄で data-i があるのは、品目ページのある行だけ
  const homeSec = page.body.match(new RegExp(`<section id="${home.id}">[\\s\\S]*?</section>`))[0];
  assert.deepEqual([...homeSec.matchAll(/data-l="[^"]+" data-k="[^"]+" data-i="([^"]+)"/g)].map((m) => m[1]), ids);
});
