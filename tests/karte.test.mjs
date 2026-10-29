import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml } from '../src/data.mjs';
import { calcConf } from '../src/calc.mjs';
import { readMunis } from '../src/munis.mjs';
import { derive, muniList, nationalRates } from '../src/stats.mjs';
import { kazuData } from '../src/machi-tools.mjs';
import { kaState, kaAmounts, kaUnit, kaWaterSvg, kaGridSvg, kaLines, kaSheet } from '../src/karte-core.mjs';
import { kartePages, karteConf, KARTE_PATH } from '../src/pages/karte.mjs';
import { printPages } from '../src/pages/print.mjs';
import { douguPages } from '../src/pages/dougu.mjs';
import { topPage } from '../src/pages/top.mjs';

const items = readYaml('items.yml');
const sources = readYaml('sources.yml');
const cc = calcConf(items);
const munis = readMunis();
const list = muniList(munis.areas);
const z = derive(munis.areas['00000']);
const nat = nationalRates(list);
const { conf } = karteConf({ cc, items, sources, munis, nat, z });
const [p] = kartePages({ cc, items, sources, munis, nat, z });
const kazu = kazuData(munis.areas, () => null);
const count = (s, re) => (s.match(re) ?? []).length;

test('カルテの量：items.yml の数字だけで計算（2週間分の人は日数にかかわらず yohairyo_days）', () => {
  assert.equal(conf.yd, items.yohairyo_days);
  assert.equal(conf.yd, 14, '画面と紙は「2週間分」と書いている');
  const a = kaAmounts(conf.per, conf.yd, { n: 3, d: 7, y: 0 });
  assert.deepEqual([a.mizu, a.bottles, a.shoku, a.toilet], [63, 32, 63, 105]);
  const b = kaAmounts(conf.per, conf.yd, { n: 4, d: 3, y: 1 });
  assert.equal(b.mizu, 3 * 3 * 3 + 3 * 1 * 14);
  assert.equal(b.mizu, 69);
  const m = kaAmounts(conf.per, conf.yd, { n: 10, d: 7, y: 10 });
  assert.deepEqual([m.mizu, m.boxes, m.shoku, m.toilet], [420, 35, 420, 700]);
  // 1人1日の量は items.yml の per_day
  assert.deepEqual(conf.per, { mizu: cc.by.mizu.per_day, shoku: cc.by.shushoku.per_day, toilet: cc.by['keitai-toilet'].per_day });
});

test('ボトルは48本まで、こえたら1箱12Lの箱。マスは21×10におさまる 1・2・5・10', () => {
  assert.equal(count(kaWaterSvg({ bottles: 48, boxes: 8 }), /<g /g), 48);
  assert.equal(count(kaWaterSvg({ bottles: 49, boxes: 9 }), /<g /g), 9);
  assert.deepEqual([kaUnit(63), kaUnit(210), kaUnit(211), kaUnit(420), kaUnit(700), kaUnit(1050)], [1, 1, 2, 2, 5, 5]);
  for (const c of [1, 105, 210, 420, 700]) assert.ok(count(kaGridSvg(c, kaUnit(c), '#fff'), /<rect /g) <= 210);
});

test('入れたものは範囲にそろえる（URL の ? やおぼえた値から）', () => {
  assert.deepEqual(kaState({}, conf.days), { m: '', n: 3, d: 7, s: 'k', y: 0 });
  assert.deepEqual(kaState({ m: '01100', n: '3', d: '7', s: 'm', y: '0' }, conf.days), { m: '01100', n: 3, d: 7, s: 'm', y: 0 });
  assert.deepEqual(kaState({ m: '<x>', n: '99', d: '5', s: 'z', y: '20' }, conf.days), { m: '', n: 10, d: 7, s: 'k', y: 10 });
  assert.equal(kaState({ n: '2', y: '5' }, conf.days).y, 2, '2週間分の人は家族の人数まで');
  assert.equal(kaState({ n: '0' }, conf.days).n, 3);
});

test('全国の▲：データの合計から（街くらべカード #28 と同じ作り方）', () => {
  assert.deepEqual({ p65: nat.p65, single: nat.single, kyodo: nat.kyodo }, { p65: 29.4, single: 41.4, kyodo: 46.1 });
});

test('全国の市区町村のどれでもカルテができる', () => {
  assert.equal(kazu.r.length, list.length);
  assert.ok(kazu.r.length >= 1741);
  const st = kaState({ n: 3, d: 7, s: 'm', y: 1 }, conf.days);
  for (const r of kazu.r) {
    const s = kaSheet(conf, st, r, kazu.p[r[0].slice(0, 2)], '2026年10月28日');
    assert.ok(s.includes(r[1]) || s.includes(r[1].replace(/&/g, '&amp;')), r[1]);
    assert.ok(!/NaN|undefined/.test(s), r[1]);
  }
});

test('街と住まいからの1行：市区町村ページと同じ条件・読みものへのリンク', () => {
  const sap = kazu.r.find((r) => r[0] === '01100');
  const one = (st, row) => kaLines(conf, { n: 3, d: 7, s: 'k', y: 0, ...st }, row).map((l) => l.href);
  assert.deepEqual(one({ s: 'm' }, sap), ['/sonae/mansion/']);
  assert.deepEqual(one({ y: 1 }, sap), ['/sonae/zaitaku-hinan/', '/sonae/akachan-koureisha/']);
  assert.deepEqual(one({ n: 1 }, null), ['/sonae/hitorigurashi/']);
  assert.match(kaLines(conf, { n: 3, s: 'm', y: 0 }, sap)[0].why, /^世帯の\d+割が共同住宅に住む街です。$/);
});

test('紙の中身：期限の欄は kigen のある品目、171、出典、サイトの URL', () => {
  const kg = items.checklists.find((c) => c.id === 'bichiku').entries.filter((e) => e.kigen).length;
  assert.equal(conf.kigen.length, kg);
  assert.equal(count(p.body, /<div class="tr">/g), kg);
  assert.equal(count(p.body, /わが家は /g), 3, '水・主食・携帯トイレはわが家の量も');
  assert.match(p.body, new RegExp(`災害用伝言ダイヤル <b>${items.kitaku.dengon}</b>`));
  assert.match(p.body, /令和7年国勢調査」を加工して作成（▲は全国）/);
  assert.match(p.body, /machi-shakaika\.com\/dougu\/karte\//);
  assert.ok(!/#f1e3c8|<img/.test(p.body + p.head), 'クリーム色と画像は使わない');
});

test('ページ：広告なし・A4・印刷・入れたものは送らない', () => {
  assert.equal(p.path, KARTE_PATH);
  assert.equal(p.title, 'わが家の防災カルテ（印刷用）');
  assert.equal(p.noAds, true);
  assert.match(p.head, /@page\{size:A4;margin:0\}/);
  assert.match(p.body, /data-print/);
  assert.ok(!/fetch\((?!'\/kurabe\/kazu\.json'|'\/search\.json')/.test(p.script), '読むのは街の数字と読みがなだけ');
  assert.ok(!/sendBeacon|XMLHttpRequest|method:/.test(p.script));
  assert.ok(/localStorage\.setItem\('karte'/.test(p.script) && /try\{localStorage/.test(p.script));
  new Function(p.script); // 文法
});

test('入口：トップの備えの知識・チェックリスト・冷蔵庫に貼る紙', () => {
  const top = topPage({ cc, munis, hinanMeta: { total: { basho: 1 } }, nMunis: list.length });
  assert.match(top.body, /href="\/dougu\/karte\/"/);
  assert.ok(douguPages({ cc, items, sources }).some((x) => x.path === '/dougu/check/' && x.body.includes('href="/dougu/karte/"')));
  assert.match(printPages({ cc, items, sources })[0].body, /href="\/dougu\/karte\/"/);
});
