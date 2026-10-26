import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml, checkSources, checkItems, checkShogo, needAmount, checkEntries } from '../src/data.mjs';
import { ESTAT_CREDIT } from '../src/site.mjs';

const sources = readYaml('sources.yml');
const items = readYaml('items.yml');
const shogo = readYaml('shogo.yml');

test('出典台帳の形', () => {
  assert.deepEqual(checkSources(sources), []);
});

test('備えの数字：出典がそろい、計算に使う数字がある', () => {
  assert.deepEqual(checkItems(items, sources), []);
});

test('照らし合わせ用の数字の形', () => {
  assert.deepEqual(checkShogo(shogo, sources), []);
  assert.ok(shogo.checks.some((c) => c.area === '27140' && c.what === '人口' && c.value === 802648));
});

test('計算に使う出典は確かめてから90日以内（古くなったら開き直して checked を更新）', () => {
  const byId = new Map(sources.sources.map((s) => [s.id, s]));
  const used = new Set(items.days.sources);
  for (const it of items.items) if (it.calc) for (const id of it.sources) used.add(id);
  const now = Date.now();
  for (const id of used) {
    const s = byId.get(id);
    assert.ok(s.url, `${id}: url がありません`);
    const days = (now - Date.parse(`${s.checked}T00:00:00+09:00`)) / 86400000;
    assert.ok(days <= 90, `${id}: 確かめてから ${Math.floor(days)} 日たちました`);
  }
});

test('設計の例：1世帯の平均人数2.1人・1週間で水 約44L・携帯トイレ 約74回分', () => {
  const by = Object.fromEntries(items.items.map((it) => [it.id, it]));
  assert.equal(Math.round(needAmount(by.mizu, 2.1, 7)), 44);
  assert.equal(Math.round(needAmount(by['keitai-toilet'], 2.1, 7)), 74);
  // 書き方の例：4人家族の1週間は140回分
  assert.equal(needAmount(by['keitai-toilet'], 4, 7), 140);
  assert.equal(needAmount(by.light, 4, 7), null);
});

test('e-Stat のクレジット表示の文言（指定のとおり）', () => {
  assert.equal(
    ESTAT_CREDIT,
    'このサービスは、政府統計総合窓口(e-Stat)のAPI機能を使用していますが、サービスの内容は国によって保証されたものではありません。',
  );
});

test('まちがった台帳はエラーになる', () => {
  const bad = { sources: [{ id: 'A_B', kind: 'x', url: 'http://a', checked: null }] };
  const e = checkSources(bad);
  assert.ok(e.some((x) => x.includes('id は')));
  assert.ok(e.some((x) => x.includes('kind')));
  assert.ok(e.some((x) => x.includes('https')));
  const e2 = checkItems({ days: { min: 3, better: 7, choices: [3, 7], sources: ['nai'] }, yohairyo_days: 14, items: [{ id: 'm', name: '水', unit: 'L', calc: true, sources: [] }] }, sources);
  assert.ok(e2.some((x) => x.includes('nai')));
  assert.ok(e2.some((x) => x.includes('per_day')));
});

test('チェックリスト：家に置く備えと持ち出す袋。量を出すのは計算に使う品目だけ', () => {
  const ids = items.checklists.map((c) => c.id);
  assert.deepEqual(ids, ['bichiku', 'mochidashi']);
  const keys = new Set();
  for (const cl of items.checklists) {
    for (const e of checkEntries(items, cl)) {
      assert.ok(!keys.has(e.key), `${e.key} が2回あります`);
      keys.add(e.key);
      assert.ok(e.sources.length, `${e.key}: 出典がありません`);
      if (e.qty) assert.equal(e.item.calc, true);
    }
  }
  const bichiku = checkEntries(items, items.checklists[0]);
  assert.deepEqual(bichiku.filter((e) => e.qty).map((e) => e.item.id), ['mizu', 'shushoku', 'keitai-toilet']);
  assert.equal(checkEntries(items, items.checklists[1]).filter((e) => e.qty).length, 0);
  const bad = { ...items, checklists: [{ id: 'x', name: 'x', entries: [{ item: 'nai' }, { name: '出典なし' }] }] };
  const e = checkItems(bad, sources);
  assert.ok(e.some((x) => x.includes('nai')));
  assert.ok(e.some((x) => x.includes('出典なし: 出典がありません')));
});


test('説明文の部品：120文字をこえない分だけ足す・言いかえは1つだけ・値段は幅で', async () => {
  const { fit, priceBand, DESC_MAX } = await import('../src/layout.mjs');
  assert.equal(DESC_MAX, 120);
  const a = 'あ'.repeat(100);
  assert.equal(fit([a], ['い'.repeat(30), 'う'.repeat(10)]), a + 'う'.repeat(10));
  assert.equal(fit([a], [['え'.repeat(30), 'お'.repeat(5)], 'か'.repeat(5)]), a + 'お'.repeat(5) + 'か'.repeat(5));
  assert.equal(fit(['a'], [['bb', 'c']]), 'abb');
  assert.equal(priceBand(698), '600円台から');
  assert.equal(priceBand(1980), '1,000円台から');
  assert.equal(priceBand(3280), '3,000円台から');
  assert.equal(priceBand(12800), '1万円台から');
});
