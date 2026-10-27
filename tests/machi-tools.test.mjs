import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMunis } from '../src/munis.mjs';
import { derive, muniList } from '../src/stats.mjs';
import { mtNear, mtDiff, mtDiffHtml, mtStats } from '../src/machi-core.mjs';
import { kazuData, village, largestRemainder, villageSvg } from '../src/machi-tools.mjs';
import { toolPages } from '../src/pages/kurabe.mjs';

const munis = readMunis();
const urlOf = (c) => (c === '27140' ? '/osaka/sakai/' : null);
const kazu = kazuData(munis.areas, urlOf);

test('似てる街：同じ入力で毎回同じ3つ・自分を出さない・人口1万人以上だけ', () => {
  const again = kazuData(munis.areas, urlOf);
  for (const code of ['27140', '13101', '01100', '47201', kazu.r.at(-1)[0]]) {
    const a = mtNear(kazu.r, kazu.s, code, 3);
    const b = mtNear(again.r, again.s, code, 3);
    assert.equal(a.length, 3);
    assert.deepEqual(a.map((r) => r[0]), b.map((r) => r[0]));
    assert.ok(a.every((r) => r[0] !== code && r[3] >= 10000));
  }
  // 並びを入れかえても同じ答え（同じ距離はコードの順）
  const shuffled = [...kazu.r].reverse();
  assert.deepEqual(mtNear(shuffled, mtStats(shuffled), '27140', 3).map((r) => r[0]), mtNear(kazu.r, kazu.s, '27140', 3).map((r) => r[0]));
  // 政令市の区は入れない
  assert.ok(!kazu.r.some((r) => munis.areas[r[0]].level === '5'));
  assert.equal(mtNear(kazu.r, kazu.s, '99999', 3).length, 0);
});

test('/kurabe/kazu.json：100KBまで・ページのある街はURL', () => {
  assert.ok(Buffer.byteLength(JSON.stringify(kazu)) < 100 * 1024);
  assert.equal(kazu.r.find((r) => r[0] === '27140')[2], '/osaka/sakai/');
  assert.equal(kazu.r.length, muniList(munis.areas).length);
});

test('100人の村：合計はいつも100（最大剰余法）', () => {
  assert.deepEqual(largestRemainder([1, 1, 1]), [34, 33, 33]);
  assert.deepEqual(largestRemainder([0, 0]), [0, 0]);
  for (const a of [...muniList(munis.areas), derive(munis.areas['00000'])]) {
    const v = village(a);
    assert.equal(v.parts.reduce((s, x) => s + x, 0), 100, a.name);
    assert.equal(v.kids + v.work + v.old, 100, a.name);
    assert.ok(v.alone >= 0 && v.alone <= v.work + v.old);
  }
  const svg = villageSvg(village(derive(munis.areas['27140'])), '堺市');
  assert.ok(svg.startsWith('<svg') && !/circle/.test(svg));
});

const row = (pop, p014, p65, rate, single, kyodo) => ['00001', 'A', 0, pop, p014 * 10, p65 * 10, rate * 10, single * 10, kyodo * 10];

test('/kurabe/：差の言い回し（差の小さいものは出さない・よい悪いを言わない）', () => {
  const a = row(100000, 12, 24, -2, 40, 50);
  assert.deepEqual(mtDiff(a, row(105000, 13, 26, -1, 42, 53)), []);
  const d = Object.fromEntries(mtDiff(a, row(230000, 12, 36, 1.5, 40, 70.3)).map((x) => [x.k, x.text]));
  assert.equal(d.pop, '約2.3倍');
  assert.equal(d.p65, '1.5倍');
  assert.equal(d.pKyodo, '20.3%高い');
  assert.equal(d.rate, '差 3.5%');
  const e = Object.fromEntries(mtDiff(a, row(20000, 8, 24, -2, 30, 50)).map((x) => [x.k, x.text]));
  assert.equal(e.pop, '約5分の1');
  assert.equal(e.p014, '0.7倍');
  assert.equal(e.pSingle, '10.0%低い');
  const html = mtDiffHtml(mtDiff(a, row(230000, 12, 36, 1.5, 40, 70.3)), '<x>', 'B');
  assert.ok(html.includes('&lt;x&gt;') && !html.includes('<x>'));
  for (const w of ['住みやすい', 'ワースト', 'よい', '悪い', '避難']) assert.ok(!html.includes(w), w);
  assert.ok(mtDiffHtml([], 'A', 'B').includes('大きなちがいはありません'));
});

test('/niteru/・/kurabe/：説明文80〜120文字・h1は1つ・数字は開いたときだけ読む', () => {
  for (const p of toolPages({ munis, kazu })) {
    const n = [...p.description].length;
    assert.ok(n >= 80 && n <= 120, `${p.path} ${n}`);
    assert.equal((p.body.match(/<h1/g) ?? []).length, 1);
    assert.ok(p.script.includes("fetch('/kurabe/kazu.json')"));
    assert.ok(/国勢調査」を加工して作成/.test(p.body));
  }
});
