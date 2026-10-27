import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMunis } from '../src/munis.mjs';
import { resolveCities } from '../src/areas.mjs';
import { derive, sonaeLinks } from '../src/stats.mjs';

// ページを作る条件5（10/27）：「この街の備え」に世帯の特徴が1つ以上（全国か県とはっきり違う）
test('ページを作る街は、どれも世帯の特徴から備えの知識につながる', () => {
  const m = readMunis();
  const D = (code) => derive(m.areas[code]);
  const z = D('00000');
  const { cities } = resolveCities(m.areas);
  const none = cities.filter((c) => !sonaeLinks(D(c.code), z, D(`${c.code.slice(0, 2)}000`)).some((l) => l.why)).map((c) => c.name);
  assert.deepEqual(none, []);
});

test('全国とくらべて言えないときだけ県とくらべ、県の名前と数字を出す', () => {
  const z = { pKyodo: 46.1, pSingle: 41.4, pWith65: 41.1 };
  const p = { pKyodo: 25.6, pSingle: 36.4, pWith65: 52.2 };
  const a = { code: '03201', pKyodo: 45.2, pSingle: 42.3, pWith65: 40.5 };
  const [k, s] = sonaeLinks(a, z, p);
  assert.equal(k.why, '共同住宅に住む世帯が45.2%あります（岩手県は25.6%）。');
  assert.equal(k.href, '/sonae/mansion/');
  assert.equal(s.href, '/sonae/hitorigurashi/');
  assert.equal(s.why, 'ひとり暮らしの世帯が42.3%あります（岩手県は36.4%）。');
  // 全国とくらべて言えるときは県を見ない
  const b = { ...a, pKyodo: 55 };
  assert.deepEqual(sonaeLinks(b, z, p).map((l) => l.why), ['世帯の6割が共同住宅に住んでいます。']);
  // 県の数字がないときは今までどおり
  assert.deepEqual(sonaeLinks(a, z).map((l) => l.why), ['']);
});
