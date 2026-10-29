import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMunis } from '../src/munis.mjs';
import { derive, muniList, nationalRates } from '../src/stats.mjs';
import { kazuData } from '../src/machi-tools.mjs';
import { ESTAT_CREDIT } from '../src/site.mjs';
import { esc } from '../src/layout.mjs';
import { mbState, mbCity, mbPopScale, mbQuizA, mbSheets, mbPerRange, mbSig2, mbAddB, mbQuizB, mbRatio, mbDensScale } from '../src/manabi-core.mjs';
import { manabiPages, manabiConf, manabiBData, MANABI_PATH } from '../src/pages/manabi.mjs';
import { cardData, toolPages } from '../src/pages/kurabe.mjs';
import * as MC from '../src/card-core.mjs';

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
  assert.deepEqual(mbState({}, ['a', 'b']), { k: 'a', m: '', n: '', g: 's', a: 0 });
  assert.deepEqual(mbState({ k: 'z', m: '<x>', n: '1', g: 'q', a: '2' }, ['a', 'b']), { k: 'a', m: '', n: '', g: 's', a: 0 });
  assert.deepEqual(mbState({ k: 'b', m: '40130', n: '27210', g: 'h', a: '1' }, ['a', 'b']), { k: 'b', m: '40130', n: '27210', g: 'h', a: 1 });
  assert.deepEqual(C.kinds, ['a', 'b']);
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
    assert.equal(q.perCmp, q.per1 !== q.nper1, d.name);
    const sheet = mbSheets(C, { k: 'a', m: d.code, g: 's', a: 0 }, d);
    assert.equal(sheet.includes('少ない</p>'), q.perCmp, d.name);
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
    // 1世帯の人数のくらべは紙の表示（0.1人きざみ）で。同じ表示なら、くらべる問いを出さない
    const p1 = Math.round(a.perHh * 10) / 10;
    const n1 = Math.round(nat.per * 10) / 10;
    const sign = p1 > n1 ? '。ア' : p1 < n1 ? '。イ' : '';
    assert.equal(q.ans[2][1], `約${p1.toFixed(1)}人${sign}`);
    assert.equal(q.perCmp, p1 !== n1);
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
  // 問2 の例文に 0.0% や 100% の割合を使わない
  for (const d of all) {
    const ex = mbQuizA(C, 'h', d).ans[1][2];
    assert.ok(!/(^|[^\d.])(0\.0|100\.0)%/.test(ex), `${d.name} ${ex}`);
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

// ---------- B「2つの街をくらべる」（#35） ----------
C.M = cardData({ munis });
const BD = manabiBData(list);
const cityB = (code) => mbAddB(city(code), BD[code]);
const r1 = (v) => Math.round(v * 10) / 10;
// 人口の差が大きい組・近い組・共同住宅が0%の街・人口の少ない街
const PAIRS = [['14100', '13402'], ['27210', '27203'], ['27100', '27210'], ['12422', '07547'], ['40130', '01100'], ['13101', '27383']];
// 全部の街：人口の近い街（次の行）と、人口のいちばん多い街
const ALLP = [];
kazu.r.forEach((r, i) => {
  if (kazu.r[i + 1]) ALLP.push([r[0], kazu.r[i + 1][0]]);
  if (i) ALLP.push([r[0], kazu.r[0][0]]);
});

test('B の数字（b.json）：人口密度と一戸建ての割合がデータと合う・小さい', () => {
  assert.equal(Object.keys(BD).length, kazu.r.length);
  for (const r of kazu.r) {
    const a = munis.areas[r[0]];
    assert.equal(BD[r[0]][0], Math.round(a.density * 10), r[1]);
    assert.ok(Math.abs(BD[r[0]][1] / 10 - (a.ikkodate / a.housed) * 100) <= 0.051, r[1]);
  }
  assert.ok(Buffer.byteLength(JSON.stringify(BD)) < 50 * 1024);
  assert.equal(C.nat.dens, munis.areas['00000'].density);
  const sum = (k) => list.reduce((t, a) => t + a[k], 0);
  assert.ok(Math.abs(C.nat.ikko - (sum('ikkodate') / sum('housed')) * 100) <= 0.051);
  // 大阪市と枚方市（見本 b/ と同じ数字）
  const o = cityB('27100');
  assert.equal(o.dens, 12449.5);
  assert.equal(o.ikko, 20.7);
  assert.equal(cityB('27210').ikko, 54.1);
});

test('B 小学生：どっちが多いがカードの表示と合う・同じ表示は出さない', () => {
  for (const [x, y] of [...PAIRS, ...ALLP]) {
    const a = cityB(x);
    const b = cityB(y);
    const q = mbQuizB(C, 's', a, b);
    const cmp = q.qs.find((t) => t.t === 'cmp');
    const show = { popc: (d) => (d.pop >= 100000 ? Math.round(d.pop / 10000) * 10000 : d.pop), p014: (d) => r1(d.p014), single: (d) => r1(d.single), kyodo: (d) => r1(d.kyodo) };
    const exp = Object.keys(show).filter((k) => show[k](a) !== show[k](b));
    assert.deepEqual((cmp?.cmp || []).map((c) => c.k), exp, `${a.name} ${b.name}`);
    for (const c of cmp?.cmp || []) assert.equal(c.w, show[c.k](a) > show[c.k](b) ? a.name : b.name);
    const nat = q.qs.find((t) => t.t === 'nat');
    if (nat) {
      const n = r1(C.nat[nat.k]);
      assert.ok(r1(a[nat.k]) !== n && r1(b[nat.k]) !== n);
      const up = [a, b].filter((d) => r1(d[nat.k]) > n);
      assert.equal(nat.ans, up.length === 2 ? 'どちらも' : up.length ? up[0].name : 'どちらでもない');
    }
  }
  const q = mbQuizB(C, 's', cityB('14100'), cityB('13402'));
  assert.equal(q.ans[0][1], 'ア 横浜市　イ 横浜市　ウ 青ヶ島村　エ 横浜市');
});

test('B 中学生：正誤がデータと合って必ずまざる・何倍は小数第1位で1.0倍は出さない', () => {
  for (const [x, y] of [...PAIRS, ...ALLP]) {
    const a = cityB(x);
    const b = cityB(y);
    const q = mbQuizB(C, 'c', a, b);
    const ops = q.qs.find((t) => t.t === 'ops').ops;
    assert.ok(ops.length >= 2, `${a.name} ${b.name}`);
    assert.ok(ops.some((o) => o.ok) && ops.some((o) => !o.ok), `${a.name} ${b.name}`);
    const rt = q.qs.find((t) => t.t === 'ratio');
    const want = [mbRatio(a.dens, b.dens), mbRatio(a.pop, b.pop)].find((v) => v);
    if (want) assert.equal(rt.ans, `約${want.toFixed(1)}倍`);
    else assert.equal(rt, undefined);
    if (rt) assert.notEqual(rt.ans, '約1.0倍');
    // 例文には 0% や 100% の割合を使わない（答えの数字の説明は、そのままの値）
    for (const t of q.qs) if (t.ex.startsWith('例')) assert.ok(!/(^|[^\d.])(0\.0|100\.0)%/.test(t.ex), `${a.name} ${b.name} ${t.ex}`);
  }
  // 大阪市と枚方市は見本 b/ と同じ答え
  const q = mbQuizB(C, 'c', cityB('27100'), cityB('27210'));
  assert.equal(q.qs.find((t) => t.t === 'ratio').ans, '約2.1倍');
  assert.equal(q.qs.find((t) => t.t === 'write').ans, '大阪市');
  assert.equal(q.qs.find((t) => t.t === 'home').ans, '大阪市');
  for (const o of q.qs.find((t) => t.t === 'ops').ops) assert.equal(typeof o.ok, 'boolean');
  assert.equal(mbRatio(100, 104), null);
  assert.equal(mbRatio(100, 106), 1.1);
});

test('B 高校生以上：全国とくらべて向きが逆の数字がデータと合う', () => {
  const ks = { kyodo: '共同住宅', ikko: '一戸建て', single: 'ひとり暮らし', p014: '15歳未満', dens: '人口密度', per: '1世帯の人数' };
  for (const [x, y] of [...PAIRS, ...ALLP]) {
    const a = cityB(x);
    const b = cityB(y);
    const q = mbQuizB(C, 'h', a, b);
    const sh = (d, k) => (k === 'per' ? r1(d.per) : r1(d[k]));
    const opp = Object.keys(ks).filter((k) => sh(a, k) !== sh(C.nat, k) && sh(b, k) !== sh(C.nat, k) && sh(a, k) > sh(C.nat, k) !== sh(b, k) > sh(C.nat, k));
    assert.equal(q.ans[0][1], opp.length ? opp.map((k) => ks[k]).join('・') : 'なし', `${a.name} ${b.name}`);
    for (const t of q.qs) assert.ok((!t.ex.startsWith('例') || !/(^|[^\d.])(0\.0|100\.0)%/.test(t.ex)) && !/(^|[^\d.])(0\.0|100\.0)%/.test(t.q), `${a.name} ${b.name} ${t.ex}`);
  }
  const d = mbDensScale(12449.5, 5971.4, 329.7);
  assert.equal(d.max, 15000);
  assert.deepEqual(d.ticks.map((t) => t[0]), [0, 5000, 10000, 15000]);
});

test('B の紙：1枚と答えの2枚目・出典とクレジット・使わない言葉なし・同じ関数で作れる', () => {
  const NG = /undefined|NaN|ワースト|住みにくい|高齢|減っ|class="(k|ans|q)"/;
  for (const [x, y] of [...PAIRS, ...ALLP.filter((_, i) => i % 7 === 0)]) {
    const a = cityB(x);
    const b = cityB(y);
    for (const g of ['s', 'c', 'h']) {
      const one = mbSheets(C, { k: 'b', m: x, n: y, g, a: 0 }, a, b);
      const two = mbSheets(C, { k: 'b', m: x, n: y, g, a: 1 }, a, b);
      assert.equal((one.match(/class="sheet"/g) || []).length, 1);
      assert.equal((two.match(/class="sheet"/g) || []).length, 2);
      assert.ok(!NG.test(two), `${a.name} ${b.name} ${g} ${two.match(NG)?.[0]}`);
      // 65歳以上は小学生のカードにだけ出る（問いにはしない）
      if (g !== 's') assert.ok(!/65歳/.test(two));
      assert.ok(!/65歳以上の.*(多い|少ない)のは/.test(two));
      assert.equal(two.split(esc(ESTAT_CREDIT)).length - 1, 2);
      assert.equal((two.match(/令和7年国勢調査」を加工して作成（2025年10月1日現在・2026年9月29日公表）/g) || []).length, 2);
      assert.ok(two.includes('住みやすさのよしあしではありません'));
    }
  }
  // 小学生のカードは絵なし（水彩の絵の image を入れない）
  const s = mbSheets(C, { k: 'b', m: '27100', n: '27210', g: 's', a: 0 }, cityB('27100'), cityB('27210'));
  assert.ok(!/<image|\.webp/.test(s));
  assert.equal((s.match(/viewBox="0 0 540 820"/g) || []).length, 2);
  // ブラウザと同じように、mb の関数とカードの関数だけで同じ紙ができる
  const src = p.script.slice(p.script.indexOf('function mb'), p.script.indexOf('\nconst C='));
  const fn = new Function('C', 'st', 'd', 'd2', `${Object.values(MC).map((f) => f.toString()).join('\n')}\n${src}\nreturn mbSheets(C, st, d, d2);`);
  for (const g of ['s', 'c', 'h']) {
    const st = { k: 'b', m: '14100', n: '13402', g, a: 1 };
    assert.equal(fn(C, st, cityB('14100'), cityB('13402')), mbSheets(C, st, cityB('14100'), cityB('13402')));
  }
});

test('B の入口：/kurabe/ の2つの街から1行のリンク・ページに種類と2つ目の街', () => {
  const page = toolPages({ munis, kazu }).find((x) => x.path === '/kurabe/');
  assert.ok(page.script.includes("/dougu/manabi/?k=b&amp;m='+a[0]+'&amp;n='+b[0]+'\">この2つの街でプリントを作る</a>"));
  assert.ok(p.body.includes('data-k="b"'));
  assert.ok(p.body.includes('id="f2" hidden'));
  assert.ok(p.script.includes('/kurabe/card.js?v='));
  assert.ok(p.script.includes('/dougu/manabi/b.json'));
});
