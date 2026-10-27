import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { readMunis, writeMunis, checkMunis, FIELDS } from '../src/munis.mjs';
import { resolveCities, CITIES, PREFS } from '../src/areas.mjs';
import { readYaml } from '../src/data.mjs';
import { missingLists } from '../src/lib/hinan.mjs';

const munis = readMunis();
const shogo = readYaml('shogo.yml');

test('都道府県47・ページを作る街（種類ごとの数）・英字が重ならない', () => {
  assert.equal(PREFS.length, 47);
  // 県庁所在地46（東京都は23区）・東京23区・県庁所在地でない政令市5・中核市（県庁所在地でないもの。条件をみたす街だけ）
  const kinds = {};
  for (const c of CITIES) kinds[c.kind] = (kinds[c.kind] ?? 0) + 1;
  assert.deepEqual(kinds, { kencho: 46, ku: 23, seirei: 5, chukaku: 29 });
  const names = CITIES.map((c) => `${c.pref}/${c.name}`);
  assert.equal(new Set(names).size, names.length, '同じ街を2回入れていない');
  const keys = CITIES.map((c) => `${c.pref}/${c.slug}`);
  assert.equal(new Set(keys).size, keys.length);
  for (const c of CITIES) assert.match(c.slug, /^[a-z]+$/);
});

test('munis.json の書き出しと読みこみ', () => {
  const dir = mkdtempSync(join(tmpdir(), 'munis-'));
  const p = join(dir, 'm.json');
  writeMunis({ survey: '2025-10-01', published: '2026-09-29', statName: 'x', areas: { '27140': { name: '堺市', level: '4', parent: null, pop: 802648, perHh: 2.10345 } } }, p);
  const m = readMunis(p);
  assert.equal(m.areas['27140'].pop, 802648);
  assert.equal(m.areas['27140'].perHh, 2.10345);
  assert.equal(m.areas['27140'].male, null);
  assert.equal(JSON.parse(readFileSync(p, 'utf8')).fields.length, FIELDS.length);
});

test('国勢調査の数字が公式の発表と合う（data/estat/munis.json があるとき）', { skip: !munis && 'データがまだない' }, () => {
  assert.deepEqual(checkMunis(munis, shogo), []);
});

test('ページを作る街が e-Stat の地域に1つずつある（データがあるとき）', { skip: !munis && 'データがまだない' }, () => {
  const { cities, errors } = resolveCities(munis.areas);
  assert.deepEqual(errors, []);
  assert.equal(cities.length, CITIES.length);
});

// 一覧ファイルは update.yml（国土地理院に届く Actions）が作る。この作業場では作れないので、
//   ALLOW_MISSING_HINAN_LIST=1 のときだけ、ない一覧を止めずに知らせる（GitHub Actions の中では使わない）
test('避難場所の数と一覧（data/hinan があるとき）', { skip: !existsSync('data/hinan/counts.json') && 'データがまだない' }, (t) => {
  const c = JSON.parse(readFileSync('data/hinan/counts.json', 'utf8'));
  assert.equal(c.kinds.length, 8);
  assert.ok(Object.keys(c.areas).length > 1600);
  const meta = JSON.parse(readFileSync('data/hinan/meta.json', 'utf8'));
  assert.match(meta.checked, /^\d{4}-\d{2}-\d{2}$/);
  if (munis) {
    const { cities } = resolveCities(munis.areas);
    const missing = missingLists(cities, c, (code) => existsSync(`data/hinan/list/${code}.json`));
    if (missing.length && process.env.ALLOW_MISSING_HINAN_LIST === '1' && !process.env.GITHUB_ACTIONS) t.diagnostic(`一覧ファイルがない街 ${missing.length}（update.yml で作る）`);
    else assert.deepEqual(missing, [], '一覧ファイルがない街');
  }
});
