// 市区町村と都道府県のページの最後の「ほかの街」「ほかの都道府県」（夜 #98 案A「県の中を歩く」）
//   市区町村249：街へのリンク2〜4・自分へのリンクなし・県のページへのリンクあり／都道府県47：自分へのリンクなし・北海道は東北の6県
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMunis } from '../src/munis.mjs';
import { resolveCities, PREFS } from '../src/areas.mjs';
import { derive, muniList, prefOf } from '../src/stats.mjs';
import { qChiho, qChihoName } from '../src/quiz-core.mjs';
import { hokaMachi } from '../src/pages/city.mjs';
import { hokaKen } from '../src/pages/pref.mjs';

const m = readMunis();
const skip = !m && 'data/estat/munis.json がない';
const list = m ? muniList(m.areas) : [];
const cities = m ? resolveCities(m.areas).cities : [];
const url = new Map(cities.map((c) => [c.code, `/${c.pref}/${c.slug}/`]));
const urlOf = (code) => url.get(code) ?? null;
const hrefs = (html) => [...html.matchAll(/href="([^"]+)"/g)].map((x) => x[1]);

test('市区町村ページ：同じ県（少ない県は同じ地方）の街へ2〜4・自分なし・県のページあり', { skip }, () => {
  assert.equal(cities.length, 249);
  for (const c of cities) {
    const a = derive(m.areas[c.code]);
    const pref = prefOf(c.code);
    const html = hokaMachi(a, list, urlOf);
    const hs = hrefs(html);
    const towns = hs.filter((h) => h.split('/').length === 4);
    assert.ok(towns.length >= 2 && towns.length <= 4, `${a.name}：街へのリンク ${towns.length}`);
    assert.ok(!hs.includes(urlOf(c.code)), `${a.name}：自分へのリンク`);
    assert.ok(hs.includes(`/${pref.slug}/`), `${a.name}：県のページへのリンクがない`);
    assert.equal(new Set(towns).size, towns.length, `${a.name}：同じ街が2回`);
    const same = cities.filter((x) => x.code !== c.code && x.code.slice(0, 2) === c.code.slice(0, 2)).length;
    const title = same >= 2 ? `${pref.name}のほかの街` : `${qChihoName(qChiho(c.code))}のほかの街`;
    assert.ok(html.includes(`<h2`) && html.includes(title), `${a.name}：見出し「${title}」`);
    for (const h of towns) {
      const code = [...url].find(([, u]) => u === h)[0];
      if (same >= 2) assert.equal(code.slice(0, 2), c.code.slice(0, 2), `${a.name}：ほかの県の街 ${h}`);
      else assert.equal(qChiho(code), qChiho(c.code), `${a.name}：ほかの地方の街 ${h}`);
    }
    assert.ok(!/undefined|NaN|null/.test(html), `${a.name}：値の抜け`);
  }
});

test('市区町村ページ：人口の差が小さい順・地方から足した行は県名つき', { skip }, () => {
  const a = derive(m.areas['27207']); // 高槻市
  const html = hokaMachi(a, list, urlOf);
  const pops = [...html.matchAll(/人口 ([\d,]+)人/g)].map((x) => Number(x[1].replace(/,/g, '')));
  const d = pops.map((p) => Math.abs(p - a.pop));
  assert.deepEqual(d, [...d].sort((x, y) => x - y));
  assert.ok(!html.includes('府・人口'));
  const kochi = cities.find((c) => c.pref === 'kochi');
  if (kochi && cities.filter((c) => c.pref === 'kochi').length < 2) {
    const k = hokaMachi(derive(m.areas[kochi.code]), list, urlOf);
    assert.ok(k.includes('四国のほかの街'));
    assert.ok(/県・人口 [\d,]+人/.test(k));
  }
});

test('都道府県ページ：同じ地方のほかの都道府県・自分なし・北海道は東北の6県', () => {
  assert.equal(PREFS.length, 47);
  for (const p of PREFS) {
    const html = hokaKen(p);
    const hs = hrefs(html);
    assert.ok(!hs.includes(`/${p.slug}/`), `${p.name}：自分へのリンク`);
    if (p.code === '01') {
      assert.ok(html.includes('東北の県'));
      assert.deepEqual(hs, ['/aomori/', '/iwate/', '/miyagi/', '/akita/', '/yamagata/', '/fukushima/']);
    } else {
      assert.ok(html.includes(`${qChihoName(qChiho(p.code))}のほかの都道府県`), p.name);
      assert.ok(hs.length >= 1, `${p.name}：リンクなし`);
      for (const h of hs) assert.equal(qChiho(PREFS.find((x) => `/${x.slug}/` === h).code), qChiho(p.code), `${p.name}：ほかの地方 ${h}`);
    }
  }
});
