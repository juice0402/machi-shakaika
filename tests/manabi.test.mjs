import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMunis } from '../src/munis.mjs';
import { derive, muniList, nationalRates } from '../src/stats.mjs';
import { kazuData } from '../src/machi-tools.mjs';
import { ESTAT_CREDIT } from '../src/site.mjs';
import { esc } from '../src/layout.mjs';
import { mbState, mbCity, mbPopScale, mbQuizA, mbSheets, mbPerRange, mbSig2 } from '../src/manabi-core.mjs';
import { manabiPages, manabiConf, MANABI_PATH } from '../src/pages/manabi.mjs';

const munis = readMunis();
const list = muniList(munis.areas);
const nat = nationalRates(list);
const kazu = kazuData(munis.areas, () => null);
const C = manabiConf({ munis, list, nat });
const [p] = manabiPages({ munis, list, nat, kazu });
const city = (code) => {
  const r = kazu.r.find((x) => x[0] === code);
  return mbCity(r, kazu.p[code.slice(0, 2)]);
};
// 人口の多い街・少ない街・共同住宅が0%の街（マスの問いを入れかえる）
const CODES = ['14100', '40130', '13402', '12422', '27383', '07547'];
const all = kazu.r.map((r) => mbCity(r, kazu.p[r[0].slice(0, 2)]));
const near = (a, b, e = 1e-9) => Math.abs(a - b) <= e;

test('kazu.json の1世帯の人数と、全国の▲（データの合計）', () => {
  for (const r of kazu.r) assert.equal(r[9], Math.round(munis.areas[r[0]].perHh * 100), r[1]);
  assert.ok(near(nat.per, munis.areas['00000'].perHh, 0.006));
  assert.equal(C.nat.per, nat.per);
  assert.equal(C.nat.count, list.length);
  const pops = list.map((a) => a.pop).sort((a, b) => a - b);
  assert.equal(C.nat.popMid, pops[Math.floor(pops.length / 2)]);
});

test('入れたものを、ありえる範囲にそろえる', () => {
  assert.deepEqual(mbState({}, ['a']), { k: 'a', m: '', g: 's', a: 0 });
  assert.deepEqual(mbState({ k: 'z', m: '<x>', g: 'q', a: '2' }, ['a']), { k: 'a', m: '', g: 's', a: 0 });
  assert.deepEqual(mbState({ k: 'a', m: '40130', g: 'h', a: '1' }, ['a']), { k: 'a', m: '40130', g: 'h', a: 1 });
});

test('人口の棒の物差しと概数', () => {
  assert.deepEqual(mbPopScale(168), { max: 200, step: 10, lab: 50, place: '十', round: 170 });
  assert.deepEqual(mbPopScale(3750952), { max: 5000000, step: 100000, lab: 1000000, place: '十万', round: 3800000 });
  assert.equal(mbPopScale(1612392).max, 2000000);
  for (const d of all) {
    const s = mbPopScale(d.pop);
    assert.ok(s.max >= d.pop * 1.08 && s.max <= d.pop * 5.5, d.name);
    assert.ok(s.place, d.name);
    assert.ok(Math.abs(s.round - d.pop) <= s.step / 2, d.name);
  }
  assert.equal(mbSig2(401352), 400000);
  assert.equal(mbSig2(14.95), 15);
});

test('小学生：答えがデータと合う・0%や100%のマスは出さない', () => {
  for (const d of all) {
    const q = mbQuizA(C, 's', d);
    assert.equal(q.grids.length, 2, d.name);
    for (const gr of q.grids) {
      assert.ok(gr.v >= 1 && gr.v <= 99, d.name);
      assert.equal(gr.v, Math.round(d[gr.key]));
    }
    const pr = mbPerRange(q.per1, q.nper1);
    assert.ok(pr.lo <= Math.min(d.per, C.nat.per) && pr.hi >= Math.max(d.per, C.nat.per), d.name);
  }
  // 国勢調査の数字（derive）とくらべる
  for (const code of CODES) {
    const d = city(code);
    const a = derive(munis.areas[code]);
    const q = mbQuizA(C, 's', d);
    const [g1, g2] = q.grids;
    const key = { kyodo: 'pKyodo', single: 'pSingle', p014: 'p014' };
    assert.ok(Math.abs(g1.v - a[key[g1.key]]) <= 0.56, code);
    assert.ok(Math.abs(g2.v - a[key[g2.key]]) <= 0.56, code);
    assert.match(q.ans[0][1], new RegExp(`^約${g1.v}(世帯|人)。全国より${a[key[g1.key]] > nat[g1.key] + 0.5 ? '多い' : a[key[g1.key]] < nat[g1.key] - 0.5 ? '少ない' : ''}`));
    const sign = Math.round(a.perHh * 100) > Math.round(nat.per * 100) ? 'ア' : Math.round(a.perHh * 100) < Math.round(nat.per * 100) ? 'イ' : 'ウ';
    assert.equal(q.ans[2][1], `約${(Math.round(a.perHh * 10) / 10).toFixed(1)}人。${sign}`);
    assert.ok(q.ans[3][1].startsWith('約'));
  }
  // 共同住宅が0%の街は、ひとり暮らしと15歳未満のマス
  assert.deepEqual(mbQuizA(C, 's', city('12422')).grids.map((g) => g.key), ['single', 'p014']);
  assert.equal(mbQuizA(C, 's', city('14100')).ans[3][1], '約380万人');
  assert.equal(mbQuizA(C, 's', city('13402')).ans[3][1], '約170人');
});

test('中学生：答えがデータと合う・正しいものは毎回まざる', () => {
  for (const d of all) {
    const q = mbQuizA(C, 'c', d);
    assert.equal(q.n014, mbSig2((d.pop * d.p014) / 100), d.name);
    assert.ok(q.big.df !== 0, d.name);
    assert.ok(Math.round(d[q.big.key]) >= 1 && Math.round(d[q.big.key]) <= 99, d.name);
    assert.ok(near(q.big.df, Math.round((d[q.big.key] - C.nat[q.big.key]) * 10) / 10), d.name);
    assert.equal(q.ops.length, 4, d.name);
    for (const o of q.ops) assert.equal(o.ok, o.hi ? o.v > o.w : o.v < o.w, d.name);
    assert.ok(q.ops.some((o) => o.ok) && q.ops.some((o) => !o.ok), d.name);
  }
  const d = city('14100');
  const a = derive(munis.areas['14100']);
  const q = mbQuizA(C, 'c', d);
  assert.ok(Math.abs(q.n014 - a.age014) / a.age014 < 0.03);
  assert.equal(q.ans[0][1], '約400,000人');
});

test('高校生以上：全国より大きいものがデータと合う', () => {
  for (const code of CODES) {
    const d = city(code);
    const a = derive(munis.areas[code]);
    const q = mbQuizA(C, 'h', d);
    const exp = [];
    if (a.pop > C.nat.popMid) exp.push('人口');
    for (const [k, lab] of [['p014', '15歳未満の人'], ['pSingle', 'ひとり暮らしの世帯'], ['pKyodo', '共同住宅に住む世帯']]) {
      const nk = { p014: 'p014', pSingle: 'single', pKyodo: 'kyodo' }[k];
      if (Math.round(a[k] * 10) / 10 > nat[nk]) exp.push(lab);
    }
    if (Math.round(a.perHh * 10) / 10 > Math.round(nat.per * 10) / 10) exp.push('1世帯の人数');
    assert.deepEqual(q.up, exp, code);
    assert.ok(q.ans[1][2].startsWith(`例：${d.pn}の${d.name}は`));
  }
});

test('紙：全部の街と段階で、1枚と答えの2枚目・出典とクレジット・使わない言葉なし', () => {
  const NG = /undefined|NaN|65歳|ワースト|住みにくい|高齢|減っ|class="(k|ans|q)"/;
  for (const d of all) {
    for (const g of ['s', 'c', 'h']) {
      const one = mbSheets(C, { k: 'a', m: d.code, g, a: 0 }, d);
      const two = mbSheets(C, { k: 'a', m: d.code, g, a: 1 }, d);
      assert.equal((one.match(/class="sheet"/g) || []).length, 1);
      assert.equal((two.match(/class="sheet"/g) || []).length, 2);
      assert.ok(!NG.test(two), `${d.name} ${g} ${two.match(NG)?.[0]}`);
      assert.equal((two.match(/令和7年国勢調査」を加工して作成（2025年10月1日現在・2026年9月29日公表）/g) || []).length, 2);
      assert.equal(two.split(esc(ESTAT_CREDIT)).length - 1, 2);
    }
  }
});

test('ページ：AdSense なし・ブラウザと同じ関数・入口', async () => {
  assert.equal(p.path, MANABI_PATH);
  assert.equal(p.noAds, true);
  for (const f of ['function mbSheets', 'function mbQuizA', 'function mbCity', 'function mtPick']) assert.ok(p.script.includes(f), f);
  assert.ok(!/\bimport\b/.test(p.script.replace(/\/\/.*$/gm, '')));
  // 関数は外の変数を読まない（toString で入れるので）：ブラウザと同じように、関数だけで紙が作れる
  const src = p.script.slice(p.script.indexOf('function mb'), p.script.indexOf('\nconst C='));
  const fn = new Function('C', 'st', 'd', `${src}\nreturn mbSheets(C, st, d);`);
  const d = city('13402');
  assert.equal(fn(C, { k: 'a', m: d.code, g: 'h', a: 1 }, d), mbSheets(C, { k: 'a', m: d.code, g: 'h', a: 1 }, d));
  const { douguPages } = await import('../src/pages/dougu.mjs');
  const { readYaml } = await import('../src/data.mjs');
  const { calcConf } = await import('../src/calc.mjs');
  const items = readYaml('items.yml');
  const html = douguPages({ cc: calcConf(items), items, sources: readYaml('sources.yml') }).map((x) => x.body).join('');
  assert.ok(html.includes('href="/dougu/manabi/"'));
});
