import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseYaml } from '../src/lib/yaml.mjs';

test('マップとリストと入れ子', () => {
  const y = `
# コメント
name: まちの社会科   # 後ろのコメント
days:
  min: 3
  choices: [3, 7]
items:
  - id: mizu
    per_day: 3
    sources: [maff-sonae, "miyagi-mizu"]
  - id: light
    per_day: null
    calc: false
list:
- a
- "b # コメントではない"
- 'it''s'
`;
  assert.deepEqual(parseYaml(y), {
    name: 'まちの社会科',
    days: { min: 3, choices: [3, 7] },
    items: [
      { id: 'mizu', per_day: 3, sources: ['maff-sonae', 'miyagi-mizu'] },
      { id: 'light', per_day: null, calc: false },
    ],
    list: ['a', 'b # コメントではない', "it's"],
  });
});

test('値の読み方：日付とURLと時刻は文字、小数は数', () => {
  const y = `checked: 2026-10-22
url: https://www.e-stat.go.jp/api/terms-of-use
time: 10:30
ratio: 2.10
code: "27140"
num: 27140
empty: []
`;
  assert.deepEqual(parseYaml(y), {
    checked: '2026-10-22',
    url: 'https://www.e-stat.go.jp/api/terms-of-use',
    time: '10:30',
    ratio: 2.1,
    code: '27140',
    num: 27140,
    empty: [],
  });
});

test('リストの中のマップの中のリスト', () => {
  const y = `a:
  - id: x
    sub:
      - 1
      - 2
    after: ok
  - id: y
`;
  assert.deepEqual(parseYaml(y), { a: [{ id: 'x', sub: [1, 2], after: 'ok' }, { id: 'y' }] });
});

test('読めない形はエラー', () => {
  assert.throws(() => parseYaml('a:\n\tb: 1\n'), /タブ/);
  assert.throws(() => parseYaml('a: |\n  x\n'), /複数行/);
  assert.throws(() => parseYaml('a: {b: 1}\n'), /マップ/);
  assert.throws(() => parseYaml('a: 1\na: 2\n'), /2回/);
  assert.throws(() => parseYaml('a:\n  b: 1\n   c: 2\n'), /字下げ/);
  assert.throws(() => parseYaml('a: [1, 2\n'), /閉じて/);
  assert.throws(() => parseYaml('a: "x\n'), /閉じて/);
});
