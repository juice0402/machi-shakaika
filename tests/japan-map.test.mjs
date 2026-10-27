import { test } from 'node:test';
import assert from 'node:assert/strict';
import { japanMap, short } from '../src/japan-map.mjs';
import { JMAP } from '../src/japan-map-data.mjs';
import { PREFS } from '../src/areas.mjs';

test('トップの地図：47都道府県のリンクがそろう（形と県名の両方）', () => {
  const svg = japanMap();
  const labels = [...svg.matchAll(/<a class="pf" href="\/([a-z]+)\/" aria-label="([^"]+)">/g)];
  assert.equal(labels.length, 47);
  assert.deepEqual(labels.map((m) => m[1]).sort(), PREFS.map((p) => p.slug).sort());
  assert.equal([...svg.matchAll(/<a href="\/[a-z]+\/" tabindex="-1" aria-hidden="true"><path/g)].length, 47);
});

test('ドボンクイズの地図：47都道府県のボタン（キーボードでもえらべる）', () => {
  const svg = japanMap({ quiz: true });
  const btns = [...svg.matchAll(/<g class="pf" data-c="(\d\d)" role="button" tabindex="0" aria-label="[^"]+">/g)];
  assert.equal(btns.length, 47);
  assert.deepEqual(btns.map((m) => m[1]).sort(), PREFS.map((p) => p.code).sort());
  assert.ok(!svg.includes('href="/'));
});

test('地図のデータ：47県の形と県名の置き場。県名どうしが重ならない・地図の中', () => {
  const codes = Object.keys(JMAP.prefs);
  assert.equal(codes.length, 47);
  const box = PREFS.map((p) => ({ n: short(p.name), ...JMAP.prefs[p.code] }));
  for (const b of box) {
    assert.ok(b.d.startsWith('M') && b.d.length > 20, b.n);
    assert.ok(b.x > 9 && b.x < JMAP.w - 9 && b.y > 5 && b.y < JMAP.h - 5, b.n);
  }
  for (let i = 0; i < box.length; i++) for (let k = i + 1; k < box.length; k++) {
    const a = box[i], b = box[k];
    assert.ok(Math.abs(a.x - b.x) >= 18 || Math.abs(a.y - b.y) >= 10, `${a.n}と${b.n}`);
  }
});
