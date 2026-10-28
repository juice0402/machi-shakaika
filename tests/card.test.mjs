// 街くらべカード（夜のメモ #28）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { readMunis } from '../src/munis.mjs';
import { derive, muniList } from '../src/stats.mjs';
import { PREFS } from '../src/areas.mjs';
import { kazuData } from '../src/machi-tools.mjs';
import { mcRegion, mcMan, mcCardSvg, mcShareSvg, nationalCard } from '../src/card-core.mjs';
import { cardScript, toolPages } from '../src/pages/kurabe.mjs';

const munis = readMunis();
const kazu = kazuData(munis.areas, () => null);
const { js } = cardScript({ munis });
const MC = JSON.parse(js.match(/^const MC=(.*);$/m)[1]);
const REGIONS = ['hokkaido', 'tohoku', 'kanto', 'chubu', 'kinki', 'chugoku', 'shikoku', 'kyushu', 'okinawa'];

test('47都道府県が9つの地方のどれかに入る', () => {
  const by = {};
  for (const p of PREFS) {
    const r = mcRegion(p.code);
    assert.ok(REGIONS.includes(r), p.name);
    (by[r] ??= []).push(p.name);
  }
  assert.deepEqual(Object.keys(by).sort(), [...REGIONS].sort());
  assert.deepEqual(by.tohoku, ['青森県', '岩手県', '宮城県', '秋田県', '山形県', '福島県']);
  assert.deepEqual(by.kanto, ['茨城県', '栃木県', '群馬県', '埼玉県', '千葉県', '東京都', '神奈川県']);
  assert.deepEqual(by.chubu, ['新潟県', '富山県', '石川県', '福井県', '山梨県', '長野県', '岐阜県', '静岡県', '愛知県']);
  assert.deepEqual(by.kinki, ['三重県', '滋賀県', '京都府', '大阪府', '兵庫県', '奈良県', '和歌山県']);
  assert.deepEqual(by.chugoku, ['鳥取県', '島根県', '岡山県', '広島県', '山口県']);
  assert.equal(by.shikoku.length, 4);
  assert.deepEqual(by.kyushu, ['福岡県', '佐賀県', '長崎県', '熊本県', '大分県', '宮崎県', '鹿児島県']);
  assert.deepEqual(by.hokkaido, ['北海道']);
  assert.deepEqual(by.okinawa, ['沖縄県']);
  // 地方の絵が9枚そろっている（936×400 の WebP・40KBまで）
  for (const r of REGIONS) {
    const f = `static/card/${r}.webp`;
    assert.ok(statSync(f).size <= 40 * 1024, f);
    const b = readFileSync(f);
    assert.equal(b.toString('ascii', 8, 12), 'WEBP', f);
  }
  assert.equal(readdirSync('static/card').length, REGIONS.length);
});

test('全国の▲：データの合計から（年齢は人数、世帯の割合は世帯数で重みづけ）', () => {
  const z = munis.areas['00000'];
  const n = nationalCard(muniList(munis.areas));
  assert.deepEqual(MC.nat, n);
  // 全国の行の値と0.1までで合う
  assert.ok(Math.abs(n.p014 - (z.age014 / z.pop) * 100) < 0.11);
  assert.ok(Math.abs(n.p65 - (z.age65 / z.pop) * 100) < 0.11);
  assert.ok(Math.abs(n.single - (z.single / z.ippan) * 100) < 0.11);
  assert.ok(Math.abs(n.kyodo - (z.kyodo / z.housed) * 100) < 0.11);
  assert.ok(Math.abs(n.g - z.popChangeRate) < 0.11);
  assert.equal(n.p014, 10.9);
  assert.equal(n.p65, 29.4);
  assert.equal(n.single, 41.4);
  assert.equal(n.kyodo, 46.1);
  assert.equal(n.g, -2.5);
});

test('カードの数字が kazu.json とページの数字と同じ（札幌市・福岡市・松本市・世田谷区）', () => {
  const r1 = (v) => (Math.round(v * 10) / 10).toFixed(1);
  for (const code of ['01100', '40130', '20202', '13112']) {
    const r = kazu.r.find((x) => x[0] === code);
    const a = derive(munis.areas[code]);
    const svg = mcCardSvg(r, 0, munis.areas[code].name, MC, '/kurabe/e/x.webp');
    assert.ok(svg.includes(`>${r[1]}</text>`));
    assert.ok(svg.includes(`>${mcMan(a.pop)}</text>`));
    for (const [k, v] of [[4, a.p014], [5, a.p65], [7, a.pSingle], [8, a.pKyodo]]) {
      assert.equal((r[k] / 10).toFixed(1), r1(v), `${code} ${k}`);
      assert.ok(svg.includes(`>${r1(v)}<tspan`), `${code} ${k}`);
    }
    const g = Math.round(a.rate * 10) / 10;
    assert.equal(r[6] / 10, g);
    assert.ok(svg.includes(`>${g > 0 ? '+' : '−'}${Math.abs(g).toFixed(1)}<tspan`));
    // 勝ち負けの言葉はない
    assert.ok(!/VS|勝ち|負け/.test(svg));
  }
  assert.equal(mcMan(1961996), '196万人');
  assert.equal(mcMan(12345), '12,345人');
});

test('送る画像は 1200×900・右下にサイト名・出典の1行', () => {
  const a = kazu.r.find((x) => x[0] === '01100');
  const b = kazu.r.find((x) => x[0] === '40130');
  const s = mcShareSvg(a, b, '北海道', '福岡県', MC, 'base');
  assert.ok(s.startsWith('<svg xmlns="http://www.w3.org/2000/svg" width="1200" height="900"'));
  assert.ok(s.includes('machi-shakaika.com') && s.includes('まちの社会科'));
  assert.ok(s.includes('▲は全国　出典：総務省「令和7年国勢調査」を加工して作成'));
  // 全国の▲の位置（共同住宅 46.1% → 36 + 468×0.461）
  assert.ok(s.includes(`M${(36 + 468 * 0.461).toFixed(1)} `));
});

test('/kurabe/：ページを開いただけではカードの部品を読まない', () => {
  const page = toolPages({ munis, kazu }).find((p) => p.path === '/kurabe/');
  assert.ok(/data-card="\/kurabe\/card\.js\?v=[0-9a-f]{10}"/.test(page.body));
  assert.ok(!page.script.includes('mcCard') && !page.script.includes('/kurabe/e/'));
  assert.ok(js.includes('カードを画像で送る') && js.includes('machi-card-'));
});
