// 市区町村ページ「県内と全国でくらべると」・都道府県ページ「県内の街の幅」・備えのページの街の例（10/31 夜 #47）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMunis } from '../src/munis.mjs';
import { resolveCities, PREFS } from '../src/areas.mjs';
import { derive, muniList, feature, kurabeText, prefRanks, prefRangeText, nearText, niteruText, setaiText, hitori65Text, zenkokuOrder, villageText, similar, RANK_BY } from '../src/stats.mjs';
import { kazuData, village } from '../src/machi-tools.mjs';
import { mtNear } from '../src/machi-core.mjs';
import { machiRei } from '../src/pages/sonae.mjs';

const m = readMunis();
const skip = !m;
const list = m ? muniList(m.areas) : [];
const z = m ? derive(m.areas['00000']) : null;
const cities = m ? resolveCities(m.areas).cities : [];
const kazu = m ? kazuData(m.areas, () => 0) : null;
const BAN = ['しましょう', 'ぜひ', '便利', '簡単', '安心', 'おすすめ', 'ポイント', 'コツ', '今すぐ', '手遅れ', 'ワースト', '住みにくい', '——', '—', '›', '→'];

// 文の決まり：1文は全角60字まで・かっこは1文に1つまで・使わない言葉なし・値の抜けなし
function rules(where, texts) {
  for (const s of texts.flatMap((t) => t.split(/(?<=。)/)).filter(Boolean)) {
    assert.ok([...s].length <= 60, `${where}：60字をこえる「${s}」`);
    assert.ok((s.match(/（/g) ?? []).length <= 1, `${where}：かっこが2つ「${s}」`);
    for (const w of BAN) assert.ok(!s.includes(w), `${where}：使わない言葉「${w}」`);
    assert.ok(!/undefined|NaN|null|Infinity/.test(s), `${where}：値の抜け「${s}」`);
  }
}

const textsOf = (c) => {
  const a = derive(m.areas[c.code]);
  const feat = feature(list, a, z);
  const meRow = kazu.r.find((r) => r[0] === c.code);
  const nr = mtNear(kazu.r, kazu.s, c.code, 3);
  return { a, feat, kurabe: kurabeText({ list, a, z, feat, meRow, near1: nr[0], S: kazu.s, P: kazu.p }), meRow, nr };
};

test('くらべる：103の街とも2〜4文・文の決まり・人口の順位を1画面めとくり返さない', { skip }, () => {
  for (const c of cities) {
    const { a, feat, kurabe, meRow, nr } = textsOf(c);
    assert.ok(kurabe.length >= 2 && kurabe.length <= 4, `${c.slug}：${kurabe.length}文`);
    rules(c.slug, [...kurabe, nearText(a, similar(list, a)), niteruText(meRow, nr, kazu.s), setaiText(a), hitori65Text(a, z), villageText(a.name, village(a), village(z))]);
    // 特徴の1行が人口の順位なら、くらべるの文に「人口が◯番目に多い」「人口がいちばん多い」を書かない
    if (/市区町村で、人口が/.test(feat)) assert.ok(!kurabe.some((s) => /人口が(いちばん|\d+番目に)多/.test(s)), `${c.slug}：人口の順位を2回`);
    // 65歳以上の割合と人口の減り方は順位にしない
    for (const s of kurabe) assert.ok(!/65歳以上[^。]*番目|減[^。]*番目|番目[^。]*減/.test(s), `${c.slug}：してはいけない順位「${s}」`);
  }
});

test('くらべる：同じ言い回しにならない（文の形の種類が多い）', { skip }, () => {
  const shapes = new Set(cities.flatMap((c) => textsOf(c).kurabe.map((s) => s.replace(/[0-9,.+%-]+/g, '#').replace(/[^\s、。]+?(市|区|町|村|県|府|都|道)(?=[はのとがも、（]|$)/g, '〇'))));
  assert.ok(shapes.size >= 40, `文の形が ${shapes.size} 種類しかない`);
});

test('くらべる：全国とのちがいは、その街の値と全国の値を両方書く', { skip }, () => {
  const c = cities.find((x) => x.slug === 'chuo' && x.pref === 'tokyo');
  const { a, kurabe } = textsOf(c);
  const s = kurabe.find((t) => t.includes('全国'));
  assert.ok(s.includes(`${(Math.round(z.pKyodo * 10) / 10).toFixed(1)}%`) && s.includes(`${(Math.round(a.pKyodo * 10) / 10).toFixed(1)}%`), s);
});

test('県内の順位：決めた数字だけ・65歳以上の割合は入れない・順位は1から', { skip }, () => {
  assert.ok(!RANK_BY.some(([k]) => k === 'p65' || k === 'rate'));
  const a = derive(m.areas[cities[0].code]);
  for (const r of prefRanks(list, a)) assert.ok(r.rank >= 1 && r.rank <= r.of, `${r.k} ${r.rank}/${r.of}`);
  const pop = prefRanks(list, a).find((r) => r.k === 'pop');
  const inPref = list.filter((x) => x.code.slice(0, 2) === a.code.slice(0, 2)).sort((x, y) => y.pop - x.pop);
  assert.equal(pop.rank, inPref.findIndex((x) => x.code === a.code) + 1);
});

test('目盛りの順：6つとも1回ずつ', { skip }, () => {
  for (const c of cities.slice(0, 10)) assert.deepEqual([...zenkokuOrder(list, derive(m.areas[c.code]), z)].sort(), ['p014', 'p65', 'pKyodo', 'pSingle', 'per', 'rate']);
});

test('都道府県：47県とも県内の幅の文があり、文の決まりを守る', { skip }, () => {
  for (const p of PREFS) {
    const t = prefRangeText(list, derive(m.areas[`${p.code}000`]));
    assert.ok(t.length >= 6, p.slug);
    rules(p.slug, t);
  }
});

test('備えのページの街の例：くわしく見られる街から・データがなければ出さない', { skip }, () => {
  const r = machiRei(m);
  assert.ok(r.perMax.per >= r.perMin.per);
  assert.ok(cities.some((c) => c.code === r.kyodo.code) && cities.some((c) => c.code === r.single.code));
  assert.notEqual(r.kyodo.code, r.single.code);
  assert.equal(machiRei(null), null);
});
