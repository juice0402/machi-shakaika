// ページを作る街を、データの条件で自動にえらぶ（#87）：英字の作り方・候補・型の割合で外す候補
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { AUTO_MIN_POP, CITIES, readAutoCities, resolveCities, slugOf } from '../src/areas.mjs';
import { readMunis } from '../src/munis.mjs';
import { readYomi } from '../src/yomi.mjs';
import { pickCandidates, dropByKata } from '../scripts/pick-cities.mjs';
import { existsSync, readFileSync } from 'node:fs';

const munis = readMunis();
const yomi = readYomi();
const counts = existsSync('data/hinan/counts.json') ? JSON.parse(readFileSync('data/hinan/counts.json', 'utf8')) : null;

test('slugOf：ヘボン式・長音は書かない・末尾の「し」「く」を外す', () => {
  assert.equal(slugOf('ちゅうおうく'), 'chuo');
  assert.equal(slugOf('おうしゅうし'), 'oshu');
  assert.equal(slugOf('おおいたし'), 'oita');
  assert.equal(slugOf('よっかいちし'), 'yokkaichi');
  assert.equal(slugOf('はっちょうし'), 'hatcho');
  assert.equal(slugOf('じょうえつし'), 'joetsu');
  assert.equal(slugOf('みのおし'), 'mino');
  assert.equal(slugOf('いいづかし'), 'iizuka');
  assert.equal(slugOf(''), null);
  assert.equal(slugOf(undefined), null);
});

test('slugOf：今の CITIES の英字と全部同じになる（data/yomi.json があるとき）', { skip: !(munis && yomi) && 'データがまだない' }, () => {
  const { cities } = resolveCities(munis.areas, []);
  assert.equal(cities.length, CITIES.length);
  const bad = cities.filter((c) => slugOf(yomi.munis[c.code]) !== c.slug).map((c) => `${c.name} ${yomi.munis[c.code]} → ${slugOf(yomi.munis[c.code])}（${c.slug}）`);
  assert.deepEqual(bad, []);
});

test('人口10万人のままでは候補なし・auto-cities.json はページのある街と重ならない', { skip: !(munis && yomi && counts) && 'データがまだない' }, () => {
  assert.equal(AUTO_MIN_POP, 100000);
  const { cities, errors } = resolveCities(munis.areas);
  assert.deepEqual(errors, []);
  assert.equal(cities.filter((c) => c.kind === 'auto').length, readAutoCities().length);
  assert.deepEqual(pickCandidates({ areas: munis.areas, cities, yomi, counts }).cands, []);
});

test('候補：市だけ・人口の下限・条件6・英字が同じ県の中で重なったら足さない', { skip: !(munis && yomi && counts) && 'データがまだない' }, () => {
  const { cities } = resolveCities(munis.areas);
  const { cands } = pickCandidates({ areas: munis.areas, cities, yomi, counts, min: 50000 });
  assert.ok(cands.length > 0);
  for (const c of cands) {
    const a = munis.areas[c.code];
    assert.equal(a.level, '4');
    assert.ok(a.name.endsWith('市') && a.pop >= 50000, a.name);
    assert.ok(counts.areas[c.code][0] + counts.areas[c.code][1] > 0);
    assert.match(c.slug, /^[a-z]+$/);
  }
  const c = cands[0];
  const r = pickCandidates({ areas: munis.areas, cities: [...cities, { pref: c.pref, slug: c.slug, code: 'x', name: 'x' }], yomi, counts, min: 50000 });
  assert.ok(!r.cands.some((x) => x.code === c.code));
  assert.ok(r.skipped.some((s) => s.startsWith(c.code) && s.includes('重なる')));
});

test('dropByKata：めあての最大をこえる候補・中央がこえるときは割合のいちばん高い候補', () => {
  const goal = { cityMedian: 0.55, cityMax: 0.6 };
  assert.deepEqual([...dropByKata(new Map([['a', 0.5], ['b', 0.62], ['c', 0.61]]), ['b', 'c'], goal)].sort(), ['b', 'c']);
  assert.deepEqual([...dropByKata(new Map([['a', 0.5], ['b', 0.58], ['c', 0.57]]), ['b', 'c'], goal)], ['b']);
  assert.deepEqual([...dropByKata(new Map([['a', 0.61], ['b', 0.5]]), ['b'], goal)], ['b']);
  assert.deepEqual([...dropByKata(new Map([['a', 0.5], ['b', 0.54], ['c', 0.53]]), ['b', 'c'], goal)], []);
  assert.deepEqual([...dropByKata(new Map([['a', 0.61]]), [], goal)], []);
});
