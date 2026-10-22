import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseCsv, decodeText } from '../src/lib/csv.mjs';

test('CSV：引用符・改行・空の値', () => {
  const t = 'a,b,c\r\n1,"x,y","he said ""hi"""\n2,,"line1\nline2"\n';
  assert.deepEqual(parseCsv(t), [
    ['a', 'b', 'c'],
    ['1', 'x,y', 'he said "hi"'],
    ['2', '', 'line1\nline2'],
  ]);
});

test('文字コード：BOM付きUTF-8・UTF-8・Shift_JIS', () => {
  const bom = new Uint8Array([0xef, 0xbb, 0xbf, ...new TextEncoder().encode('堺市')]);
  assert.deepEqual(decodeText(bom), { text: '堺市', encoding: 'UTF-8（BOM付き）' });
  assert.equal(decodeText(new TextEncoder().encode('避難場所')).encoding, 'UTF-8');
  // 「堺」の Shift_JIS は 0x8D 0xE4
  assert.deepEqual(decodeText(new Uint8Array([0x8d, 0xe4])), { text: '堺', encoding: 'Shift_JIS' });
});
