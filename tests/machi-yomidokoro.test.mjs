// 市区町村ページ「県内と全国でくらべると」・都道府県ページ「県内の街の幅」・備えのページの街の例（10/31 夜 #47）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readMunis } from '../src/munis.mjs';
import { resolveCities, PREFS } from '../src/areas.mjs';
import {
  derive, muniList, feature, kurabeText, prefRanks, prefRangeText, prefScaleText, nearText, niteruText, setaiText, hitori65Text, villageText, similar, bai, RANK_BY,
} from '../src/stats.mjs';
import { kazuData, village } from '../src/machi-tools.mjs';
import { mtNear } from '../src/machi-core.mjs';
import { machiRei } from '../src/pages/sonae.mjs';

const m = readMunis();
const skip = !m;
const list = m ? muniList(m.areas) : [];
const z = m ? derive(m.areas['00000']) : null;
const cities = m ? resolveCities(m.areas).cities : [];
const kazu = m ? kazuData(m.areas, () => 0) : null;
// 新しい文では「ふえ・へる」のひらがなを使わない（1画面めに合わせて「増え・減り」）
const BAN = ['しましょう', 'ぜひ', '便利', '簡単', '安心', 'おすすめ', 'ポイント', 'コツ', '今すぐ', '手遅れ', 'ワースト', '住みにくい', '——', '—', '›', '→', 'ふえ', 'へっ', 'へる', 'へり'];

// 文の決まり：1文は全角60字まで・かっこは1文に1つまで・使わない言葉なし・値の抜けなし
function rules(where, texts) {
  for (const s of texts.flatMap((t) => t.split(/(?<=。)/)).filter(Boolean)) {
    assert.ok([...s].length <= 60, `${where}：60字をこえる「${s}」`);
    assert.ok((s.match(/（/g) ?? []).length <= 1, `${where}：かっこが2つ「${s}」`);
    for (const w of BAN) assert.ok(!s.includes(w), `${where}：使わない言葉「${w}」「${s}」`);
    assert.ok(!/undefined|NaN|null|Infinity|約1\.0倍/.test(s), `${where}：値の抜け「${s}」`);
  }
}

const textsOf = (a) => {
  const feat = feature(list, a, z);
  const meRow = kazu.r.find((r) => r[0] === a.code);
  const nr = meRow ? mtNear(kazu.r, kazu.s, a.code, 3) : [];
  return { feat, kurabe: kurabeText({ list, a, z, feat, meRow, near1: nr[0], S: kazu.s, P: kazu.p }), meRow, nr };
};
const cityA = (pref, slug) => derive(m.areas[cities.find((c) => c.pref === pref && c.slug === slug).code]);

test('全国の市区町村（1,741）で、新しい文がエラーなく作れ、文の決まりを守る', { skip }, () => {
  for (const a of list) {
    const { kurabe, meRow, nr } = textsOf(a);
    assert.ok(kurabe.length >= 1 && kurabe.length <= 4, `${a.name}：${kurabe.length}文`);
    const p = derive(m.areas[`${a.code.slice(0, 2)}000`]);
    rules(a.name, [...kurabe, nearText(a, similar(list, a)), niteruText(meRow, nr, kazu.s), setaiText(a), hitori65Text(a, z), villageText(a.name, village(a), village(z)), ...prefScaleText(list, a, p)]);
  }
});

test('くらべる：103の街とも2〜4文・人口の順位を1画面めとくり返さない・してはいけない順位なし', { skip }, () => {
  for (const c of cities) {
    const a = derive(m.areas[c.code]);
    const { feat, kurabe } = textsOf(a);
    assert.ok(kurabe.length >= 2 && kurabe.length <= 4, `${c.slug}：${kurabe.length}文`);
    if (/市区町村で、人口が/.test(feat)) assert.ok(!kurabe.some((s) => /人口が(いちばん|\d+番目に)多/.test(s)), `${c.slug}：人口の順位を2回`);
    for (const s of kurabe) assert.ok(!/65歳以上[^。]*番目|減[^。]*番目|番目[^。]*減/.test(s), `${c.slug}：してはいけない順位「${s}」`);
    // 全国とのくらべの1つめに、人口の減り方と65歳以上の割合を出さない
    const zs = kurabe.find((s) => s.startsWith('全国とくらべると'));
    if (zs) assert.ok(!/65歳以上|人口の増減/.test(zs), `${c.slug}：${zs}`);
    // 似ている街とのちがいに「でも」「差が大きく」を使わない
    for (const s of kurabe) assert.ok(!/いちばん離れた|差が大きく/.test(s), `${c.slug}：${s}`);
  }
});

test('くらべる：数字を固定した確かめ（世田谷区・千代田区・富山市）', { skip }, () => {
  const se = textsOf(cityA('tokyo', 'setagaya')).kurabe;
  assert.ok(se.includes('東京都の62市区町村のうち、世田谷区は人口がいちばん多い街です。人口は2番目の練馬区の約1.3倍です。'), se.join('\n'));
  assert.ok(se.includes('人口は5年で1.2%増えました。増えた人数は、東京都で増えた31市区町村のうち10番目です。'), se.join('\n'));
  const ch = textsOf(cityA('tokyo', 'chiyoda')).kurabe;
  assert.ok(ch.includes('共同住宅に住む世帯の割合は東京都で2番目に高く、1番目は中央区です。'), ch.join('\n'));
  assert.ok(ch.includes('数字がいちばん似ているのは港区です。ちがいが最も大きいのは人口で、港区は千代田区の約4.1倍です。'), ch.join('\n'));
  const to = textsOf(cityA('toyama', 'toyama')).kurabe;
  assert.ok(to.includes('人口は、富山県で2番目の高岡市の約2.5倍です。'), to.join('\n'));
  assert.ok(to.includes('全国とくらべると、富山市のひとり暮らしの世帯の割合は37.2%で、全国は41.4%です。'), to.join('\n'));
});

test('都道府県：47県とも幅の文・文の決まり・少ない側を名指ししない・富山県の数字', { skip }, () => {
  for (const p of PREFS) {
    const t = prefRangeText(list, derive(m.areas[`${p.code}000`]));
    assert.ok(t.length >= 6, p.slug);
    rules(p.slug, t);
    for (const s of t) assert.ok(!/いちばん少ない|いちばん低い/.test(s), `${p.slug}：${s}`);
  }
  const t = prefRangeText(list, derive(m.areas['16000']));
  assert.equal(t[0], '人口がいちばん多い富山市に、富山県の人口の40.6%が住んでいます。');
  assert.equal(t[1], '人口1万人未満の2市町村をのぞき、ここから下の幅は13市区町村で見ます。');
  // 市区町村が1つの県（合成データ）は、文を出さない
  assert.deepEqual(prefRangeText([{ code: '16201', pop: 10 }], { code: '16000', pop: 10 }), []);
});

test('県内の順位：決めた数字だけ・65歳以上の割合は入れない・順位は1から', { skip }, () => {
  assert.ok(!RANK_BY.some(([k]) => k === 'p65' || k === 'rate'));
  const a = cityA('toyama', 'toyama');
  for (const r of prefRanks(list, a)) assert.ok(r.rank >= 1 && r.rank <= r.of, `${r.k} ${r.rank}/${r.of}`);
  assert.equal(prefRanks(list, a).find((r) => r.k === 'pop').rank, 1);
});

test('倍率：1.0倍は「ほぼ同じ」にする（null）・10倍からは整数', () => {
  assert.equal(bai(1.04), null);
  assert.equal(bai(1.26), '約1.3倍');
  assert.equal(bai(12.4), '約12倍');
});

test('世帯の数の文：人口と世帯の増減の組み合わせごと（合成データ）', () => {
  const b = { code: '13101', name: 'A市' };
  const s = (hh, rate) => setaiText({ ...b, hh2020: 100, hh, rate });
  assert.equal(s(110, 5), '世帯の数は100から110へ10.0%増え、人口の5.0%より大きく増えました。');
  assert.equal(s(103.6, 3), '世帯の数は100から104へ3.6%増え、人口の3.0%と近い増え方です。');
  assert.equal(s(103, 5), '世帯の数は100から103へ3.0%増えました。人口の増え方の5.0%より小さい数です。');
  assert.equal(s(99, 2), '人口は増えましたが、世帯の数は100から99へ1.0%減りました。');
  assert.equal(s(101, -1), '人口が減るなかで、A市の世帯の数は100から101へ1.0%増えました。');
  assert.equal(s(105, -1), '人口は減りましたが、世帯の数は100から105へ5.0%増えました。1世帯の人数が少なくなっています。');
  assert.equal(s(96.5, -3), '世帯の数は100から97へ3.5%減り、人口の3.0%と近い減り方です。');
  assert.equal(s(90, -3), '世帯の数は100から90へ10.0%減りました。人口の減り方は3.0%です。');
  // 大熊町のように人口が大きく増え、世帯の増え方とはなれている街は「近い」と書かない
  assert.ok(!s(155.5, 81).includes('近い'));
  assert.equal(setaiText({ ...b, hh2020: 0, hh: 10, rate: 1 }), '');
});

test('人口が近い街の文：増えた街の数ごと（合成データ）', () => {
  const n = (r) => r.map((rate, i) => ({ name: 'BCD'[i], rate }));
  assert.equal(nearText({ name: 'A', rate: 1 }, n([1, 2, 3])), '全国で人口がAに近い3つの街も、どれも5年で人口が増えています。');
  assert.equal(nearText({ name: 'A', rate: -1 }, n([1, 2, 3])), '全国で人口がAに近い3つの街は、どれも5年で人口が増えています。');
  assert.equal(nearText({ name: 'A', rate: 1 }, n([1, -1, 2])), '全国で人口がAに近い3つの街のうち、Aと同じく人口が増えたのはBとDです。');
  assert.equal(nearText({ name: 'A', rate: 1 }, n([-1, -1, -2])), '全国で人口がAに近い3つの街は、どれも5年で人口が減っています。');
  assert.equal(nearText({ name: 'A', rate: -1 }, n([-1, 1, -2])), '全国で人口がAに近い3つの街のうち、5年で人口が増えたのはCです。');
  assert.equal(nearText({ name: 'A', rate: -1 }, n([-1, -1, -2])), '全国で人口がAに近い3つの街も、5年で人口が減っています。');
});

test('65歳以上のひとり暮らしの文・100人の村の文（合成データ）', () => {
  const zz = { age65: 1000, single65: 226 };
  assert.equal(hitori65Text({ age65: 100, single65: 30 }, zz), '65歳以上の人のうち30.0%がひとり暮らしで、全国の22.6%より高い割合です。');
  assert.equal(hitori65Text({ age65: 100, single65: 10 }, zz), '65歳以上の人のうちひとり暮らしの人は10.0%で、全国の22.6%より低い割合です。');
  assert.equal(hitori65Text({ age65: 100, single65: 22 }, zz), '65歳以上でひとり暮らしの人は22人で、65歳以上の人のうち22.0%です。');
  assert.equal(hitori65Text({ age65: 0, single65: 0 }, zz), '');
  const n = { kids: 11, work: 60, old: 29, alone: 19 };
  assert.equal(villageText('A', n, n), '全国を100人にしたときと、4つとも1人以内の差です。');
  assert.equal(villageText('A', { kids: 15, work: 55, old: 30, alone: 20 }, n), '働く世代は全国の60人に対して55人、子どもは11人に対して15人です。');
  assert.equal(villageText('A', { kids: 13, work: 59, old: 28, alone: 19 }, n), '子どもは全国の11人に対して13人です。');
});

test('備えのページの街の例：くわしく見られる街から・データがなければ出さない', { skip }, () => {
  const r = machiRei(m);
  assert.ok(r.perMax.per >= r.perMin.per);
  assert.ok(cities.some((c) => c.code === r.kyodo.code) && cities.some((c) => c.code === r.single.code));
  assert.notEqual(r.kyodo.code, r.single.code);
  assert.equal(machiRei(null), null);
});
