import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml } from '../src/data.mjs';
import { calcConf, need } from '../src/calc.mjs';
import { sonaePages } from '../src/pages/sonae.mjs';
import { yomimonoPages, checkYomimono, YOMIMONO } from '../src/pages/sonae-yomimono.mjs';
import { sonaeLinks } from '../src/stats.mjs';

const items = readYaml('items.yml');
const sources = readYaml('sources.yml');
const cc = calcConf(items);
const pages = yomimonoPages({ cc, items, sources });
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<cite>[\s\S]*?<\/cite>/g, '').replace(/<[^>]+>/g, ' ');

test('読みもの3本：出典は題・URL・確認日がそろい、まちがったデータはエラー', () => {
  assert.deepEqual(checkYomimono(items, sources), []);
  assert.deepEqual(pages.map((p) => p.path), YOMIMONO.map((y) => y.path));
  assert.ok(checkYomimono({ ...items, jishin: { sources: ['nai'] } }, sources).some((e) => e.includes('nai')));
  assert.ok(checkYomimono({ ...items, zaitaku: undefined }, sources).some((e) => e.includes('zaitaku')));
  assert.throws(() => yomimonoPages({ cc, items: { ...items, akachan: { sources: [] } }, sources }));
});

test('読みもの3本：本文の数字は items.yml とそこから計算したものだけ', () => {
  const w = cc.by.mizu.per_day;
  const t = cc.by['keitai-toilet'].per_day;
  const { min, better } = items.days;
  const y = items.yohairyo_days;
  const allowed = new Set([1, 2, 4, min, better, w, t, y, need(w, 4, better), need(t, 4, better), need(w, 2, y)]);
  for (const p of pages) {
    const nums = (text(p.body).replace(/（\d{4}年\d{1,2}月\d{1,2}日確認）/g, '').match(/\d+/g) ?? []).map(Number);
    assert.ok(nums.length >= 3, p.path);
    for (const n of nums) assert.ok(allowed.has(n), `${p.path}：${n} は items.yml にない数字`);
  }
});

test('読みもの3本：説明文80〜120文字・h1は1つ・はじめに計算への入口・出典と確認日', () => {
  const descs = new Set();
  for (const p of pages) {
    const n = [...p.description].length;
    assert.ok(n >= 80 && n <= 120, `${p.path} ${n}文字`);
    descs.add(p.description);
    assert.equal((p.body.match(/<h1[\s>]/g) ?? []).length, 1);
    // 題 → 1行 → 計算の入口の順（最初の1画面）
    const iH1 = p.body.indexOf('<h1'), iLead = p.body.indexOf('class="lead"'), iCalc = p.body.indexOf('href="/dougu/keisan/"');
    assert.ok(iH1 < iLead && iLead < iCalc && iCalc < p.body.indexOf('<table'), p.path);
    const lead = p.body.match(/<p class="lead">([^<]*)<\/p>/)[1];
    assert.ok([...lead].length <= 24, `${p.path} の1行が長い`);
    const key = YOMIMONO.find((y) => y.path === p.path).key;
    for (const id of items[key].sources) {
      const s = sources.sources.find((x) => x.id === id);
      assert.ok(p.body.includes(s.url.replace(/&/g, '&amp;')), `${p.path}：${id}`);
    }
    assert.ok(/\d{4}年\d{1,2}月\d{1,2}日確認/.test(p.body));
  }
  assert.equal(descs.size, 3);
});

test('読みもの3本：商品は置かず品目ページ6つへのリンクだけ。使わない言葉・絵文字なし', () => {
  const hinmoku = items.items.filter((x) => x.hinmoku).map((x) => x.id);
  for (const p of pages) {
    const hrefs = [...p.body.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
    for (const id of hinmoku) assert.ok(hrefs.includes(`/hinmoku/${id}/`), `${p.path}：${id}`);
    for (const h of hrefs.filter((h) => h.startsWith('/hinmoku/'))) assert.ok(hinmoku.some((id) => h === `/hinmoku/${id}/`), h);
    assert.ok(!/rakuten|class="shop"|円/.test(p.body));
    const shown = text(p.body);
    for (const w of ['今すぐ', '手遅れ', 'しましょう', 'ぜひ', '便利', '簡単', '安心', 'おすすめ', 'ポイント', 'コツ', '——', 'ペット']) assert.ok(!shown.includes(w), `${p.path}：${w}`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(shown));
  }
});

test('入口：/sonae/ の棚・関係するページの末尾・市区町村の65歳以上の行', () => {
  const sp = sonaePages({ cc, items, sources });
  const shelf = sp.find((p) => p.path === '/sonae/').body;
  for (const y of YOMIMONO) assert.ok(shelf.includes(`href="${y.path}"`), y.path);
  assert.ok(sp.find((p) => p.path === '/sonae/bichiku/').body.includes('href="/sonae/akachan-koureisha/"'));
  assert.ok(sp.find((p) => p.path === '/sonae/keitai-toilet/').body.includes('href="/sonae/zaitaku-hinan/"'));
  const z = { pKyodo: 40, pSingle: 30, pWith65: 40 };
  const links = sonaeLinks({ code: '01100', pKyodo: 10, pSingle: 20, pWith65: 50 }, z);
  assert.equal(links[0].href, '/sonae/akachan-koureisha/');
});
