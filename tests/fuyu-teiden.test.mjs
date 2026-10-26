import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml } from '../src/data.mjs';
import { calcConf } from '../src/calc.mjs';
import { page } from '../src/layout.mjs';
import { sonaePages } from '../src/pages/sonae.mjs';
import { fuyuTeidenPages, checkFuyu } from '../src/pages/sonae-fuyu.mjs';
import { SAIGAI_BAR } from '../src/mode.mjs';

const items = readYaml('items.yml');
const sources = readYaml('sources.yml');
const cc = calcConf(items);
const [fuyu] = fuyuTeidenPages({ cc, items, sources });
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<[^>]+>/g, ' ');

test('冬の停電：items.yml の数字は出典 id を持ち、出典は題・URL・確認日がそろっている', () => {
  assert.deepEqual(checkFuyu(items, sources), []);
  assert.equal(items.fuyu.toketsu.celsius, -4);
  const by = new Map(sources.sources.map((s) => [s.id, s]));
  for (const id of [...items.fuyu.sources, ...items.fuyu.toketsu.sources, 'mlit-lifeline']) {
    const s = by.get(id);
    assert.ok(s?.title && s.url && /^\d{4}-\d{2}-\d{2}$/.test(s.checked), `${id}: 題・URL・確認日`);
  }
  assert.ok(items.fuyu.toketsu.sources.every((id) => items.fuyu.sources.includes(id)));
});

test('冬の停電：まちがったデータはエラーになる', () => {
  const bad = { ...items, fuyu: { toketsu: { celsius: 4, sources: [] }, sources: ['nai'] } };
  const e = checkFuyu(bad, sources);
  assert.ok(e.some((x) => x.includes('celsius')));
  assert.ok(e.some((x) => x.includes('nai')));
  assert.ok(e.some((x) => x.includes('fuyu.toketsu: 出典がありません')));
  assert.ok(checkFuyu({ ...items, fuyu: undefined }, sources).length);
  // 題を確かめていない出典はページに出さない
  const noTitle = { sources: sources.sources.map((s) => (s.id === 'niigata-ooyuki' ? { ...s, title: null } : s)) };
  assert.ok(checkFuyu(items, noTitle).some((x) => x.includes('niigata-ooyuki')));
  assert.throws(() => fuyuTeidenPages({ cc, items: bad, sources }));
});

test('冬の停電：本文の数字は items.yml のものだけ（直接書かない）', () => {
  const gas = items.items.find((x) => x.id === 'gas');
  const mizu = items.items.find((x) => x.id === 'mizu');
  const allowed = new Set([1, items.days.min, items.days.better, gas.example_qty, mizu.per_day, -items.fuyu.toketsu.celsius]);
  const nums = (text(fuyu.body).replace(/（\d{4}年\d{1,2}月\d{1,2}日確認）/g, '').match(/\d+/g) ?? []).map(Number);
  assert.ok(nums.length >= 5);
  for (const n of nums) assert.ok(allowed.has(n), `${n} は items.yml にない数字`);
  assert.ok(fuyu.body.includes(`最低${items.days.min}日分、できれば${items.days.better}日分`));
  assert.ok(fuyu.body.includes(`${gas.example_text}${gas.example_qty}${gas.unit}`));
  assert.ok(fuyu.body.includes(`マイナス${-items.fuyu.toketsu.celsius}度以下`));
  assert.ok(fuyu.description.includes(`${gas.example_qty}本`));
});

test('冬の停電：説明文は80〜120文字、題・URL・出典の形', () => {
  const n = [...fuyu.description].length;
  assert.ok(n >= 80 && n <= 120, `${n}文字`);
  assert.equal(fuyu.path, '/sonae/fuyu-teiden/');
  assert.ok(fuyu.title.includes('冬の停電'));
  assert.equal((fuyu.body.match(/<h1[\s>]/g) ?? []).length, 1);
  // 出典の行は items.fuyu.sources のとおり、確認日つき
  for (const id of items.fuyu.sources) {
    const s = sources.sources.find((x) => x.id === id);
    assert.ok(fuyu.body.includes(s.url.replace(/&/g, '&amp;')), `${id} が出典に出ていない`);
  }
  assert.ok(fuyu.body.includes('2026年10月26日確認'));
});

test('冬の停電：商品は並べず、リンクは品目ページ・計算・チェックリストだけ。使わない言葉・絵文字なし', () => {
  const hinmoku = new Set(items.items.filter((x) => x.hinmoku).map((x) => x.id));
  const hrefs = [...fuyu.body.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
  for (const h of hrefs) {
    const m = h.match(/^\/hinmoku\/([a-z-]+)\/$/);
    if (m) assert.ok(hinmoku.has(m[1]), `${h} は品目ページにない`);
  }
  for (const id of ['gas', 'light', 'battery', 'mizu', 'shushoku']) assert.ok(hrefs.includes(`/hinmoku/${id}/`), id);
  assert.ok(hrefs.includes('/dougu/keisan/') && hrefs.includes('/dougu/check/'));
  assert.ok(!/rakuten|class="shop"|円/.test(fuyu.body));
  const shown = text(fuyu.body).replace(/<cite>[\s\S]*?<\/cite>/g, '');
  const cites = fuyu.body.replace(/<cite>[\s\S]*?<\/cite>/g, '');
  for (const w of ['今すぐ', '手遅れ', 'しましょう', 'ぜひ', '便利', '簡単', '安心', 'おすすめ', 'ポイント', 'コツ', '——']) assert.ok(!text(cites).includes(w), w);
  assert.ok(!/\p{Extended_Pictographic}/u.test(shown));
});

test('冬の停電：/sonae/ の棚に入口がある（今の3本のあと）。災害時モードでも壊れない', () => {
  const shelf = sonaePages({ cc, items, sources }).find((p) => p.path === '/sonae/');
  const hrefs = [...shelf.body.matchAll(/href="(\/sonae\/[^"]+)"/g)].map((m) => m[1]);
  assert.deepEqual(hrefs.slice(0, 4), ['/sonae/bichiku/', '/sonae/rolling-stock/', '/sonae/keitai-toilet/', '/sonae/fuyu-teiden/']);
  const on = page({ ...fuyu, saigai: true });
  assert.ok(on.includes(SAIGAI_BAR) && on.includes('冬の停電と寒さの備え') && !on.includes('adsbygoogle'));
  assert.ok(on.includes(fuyu.description.replace(/&/g, '&amp;')));
});
