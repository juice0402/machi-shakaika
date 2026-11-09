// 都道府県ページの「県内の街の読み解き」「県内の避難場所と県の備え」と、人口のランキングの文（11/9 夜 #72）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readMunis } from '../src/munis.mjs';
import { PREFS, resolveCities } from '../src/areas.mjs';
import { derive, muniList, prefReadText, prefHinanText } from '../src/stats.mjs';
import { readKenBichiku, kenBichikuMap, checkKenBichiku } from '../src/data.mjs';
import { rankingText, chihoCounts } from '../src/pages/ranking.mjs';
import { kenBichikuLine } from '../src/pages/pref.mjs';

const m = readMunis();
const skip = !m;
const list = m ? muniList(m.areas) : [];
const hinan = JSON.parse(readFileSync(new URL('../data/hinan/counts.json', import.meta.url), 'utf8'));
const BAN = ['しましょう', 'ぜひ', '便利', '簡単', '安心', 'おすすめ', 'ポイント', 'コツ', '今すぐ', '手遅れ', 'ワースト', '住みにくい', '——', '›', '→', '高齢化', '減った順', '人口あたり'];

function rules(where, texts) {
  for (const s of texts.flatMap((t) => t.split(/(?<=。)/)).filter(Boolean)) {
    assert.ok([...s].length <= 60, `${where}：60字をこえる「${s}」`);
    assert.ok((s.match(/（/g) ?? []).length <= 1, `${where}：かっこが2つ「${s}」`);
    for (const w of BAN) assert.ok(!s.includes(w), `${where}：使わない言葉「${w}」「${s}」`);
    assert.ok(!/undefined|NaN|null|Infinity/.test(s), `${where}：値の抜け「${s}」`);
    assert.ok(s.endsWith('。'), `${where}：「。」で終わらない「${s}」`);
  }
}

test('47都道府県の読み解きと避難場所の文が作れ、文の決まりを守る', { skip }, () => {
  for (const pref of PREFS) {
    const p = derive(m.areas[`${pref.code}000`]);
    const y = prefReadText(list, p);
    assert.ok(y.jinko.length >= 1 && y.koureisha.length >= 1 && y.setai.length === 2, pref.name);
    rules(pref.name, [...y.jinko, ...y.up, ...y.koureisha, ...y.setai]);
    // 増えた街がない県は文を出さない。名前は3つまで
    const up = list.filter((x) => x.code.slice(0, 2) === pref.code && x.rate > 0);
    if (!up.length) assert.deepEqual(y.up, [], pref.name);
    // 65歳以上は「いちばん高い街」を書かない
    assert.ok(!y.koureisha.some((s) => s.includes('いちばん')), pref.name);
    const h = prefHinanText(hinan, pref.code);
    assert.ok(h && h.text.length >= 2, pref.name);
    rules(`${pref.name} 避難場所`, h.text);
    // 種類の数はデータの合計どおり。0か所の種類は書かない
    const rows = Object.entries(hinan.areas).filter(([c]) => c.slice(0, 2) === pref.code).map(([, r]) => r);
    assert.equal(h.basho, rows.reduce((s, r) => s + r[0], 0));
    hinan.kinds.forEach(([, name], i) => {
      if (rows.reduce((s, r) => s + r[3 + i], 0) === 0) assert.ok(!h.text.some((s) => s.includes(name)), `${pref.name}：0か所の${name}`);
    });
  }
});

test('人口のランキングの文：決まりを守り、数はデータどおり', { skip }, () => {
  const kencho = new Set(resolveCities(m.areas).cities.filter((c) => c.kind === 'kencho').map((c) => c.code));
  const t = rankingText({ list, kencho });
  rules('ランキング', [...t.yomikata, ...t.yosu]);
  const up = list.filter((x) => x.rate > 0);
  assert.ok(t.yomikata[0].includes(`${up.length.toLocaleString('ja-JP')}市区町村`));
  // 地方ごとの数を足すと、増えた街の数
  const ch = chihoCounts(up);
  assert.equal(ch.reduce((s, [, v]) => s + v, 0), up.length);
  assert.ok(ch.every(([, v], i) => v > 0 && (i === 0 || ch[i - 1][1] >= v)));
  // 東京都は県庁所在地の一覧に入らないので「東京都をのぞく」と書く
  assert.ok(t.yosu.some((s) => s.includes(`東京都をのぞく道府県庁所在地の${kencho.size}市`)));
});

test('地方ごとの数：多い順・同じ数は北から・0の地方は入れない', () => {
  const xs = ['01100', '13101', '13102', '47201', '02201', '27100', '27140'].map((code) => ({ code }));
  assert.deepEqual(chihoCounts(xs), [['関東', 2], ['近畿', 2], ['北海道', 1], ['東北', 1], ['九州・沖縄', 1]]);
  assert.deepEqual(chihoCounts([]), []);
});

// 合成データで言い回しのえらび分けを試す（北海道のコードを借りる。人口は合計100）
const P = { code: '01000', pop: 100, pWith65: 45, single65: 1000, age65: 10000, pSingle: 35, pKyodo: 35 };
const mk = (pops, rates = []) => pops.map((pop, i) => ({ code: `01${String(i + 1).padStart(3, '0')}`, name: `街${i + 1}`, pop, rate: rates[i] ?? -1 }));
const jinko = (pops) => prefReadText(mk(pops), P).jinko.join('');

test('読み解き：半分をこえるまでの街の数（1・2〜3・4以上）と、残りの割合の境い目', () => {
  assert.match(jinko([60, 10, 10, 10, 10]), /^北海道の人口の半分より多くが、街11つの街に住んでいます。/);
  assert.match(jinko([30, 25, 9, 9, 9, 9, 9]), /街1と街2の2市区町村を合わせると/);
  assert.match(jinko([20, 15, 15, 10, 10, 10, 10, 10]), /街1・街2・街3から人口の多い順に4市区町村を足すと/);
  // 残りの割合：45%以上・40〜45%・25〜40%・25%未満
  assert.match(jinko([30, 25, 9, 9, 9, 9, 9]), /残りの5市区町村にも、北海道の人口の45\.0%/);
  assert.match(jinko([30, 30, 8, 8, 8, 8, 8]), /北海道の人口の40\.0%は、ほかの5市区町村に住む人です/);
  assert.match(jinko([50, 25, 5, 5, 5, 5, 5]), /残る5市区町村に住む人は、合わせて北海道の人口の25\.0%/);
  assert.match(jinko([40, 36, 8, 8, 8]), /ほかの3市区町村の人口は、合わせても北海道の24\.0%/);
  // 残りが1つだけのときは書かない
  assert.equal(prefReadText(mk([60, 30, 10]), P).jinko.length, 2);
  assert.equal(prefReadText(mk([60, 40]), P).jinko.length, 1);
});

test('読み解き：増えた街（0・1・2〜3・4以上）', () => {
  const up = (rates, pops = [20000, 20000, 20000, 20000, 10000, 10000]) => prefReadText(mk(pops, rates), { ...P, pop: 100000 }).up.join('');
  assert.equal(up([]), '');
  assert.equal(up([1]), '町や村もふくめて、2020年より人口が増えた市区町村は街1だけです。');
  assert.equal(up([1, 3, 2]), '2020年より人口が増えたのは、増えた割合の大きい順に街2・街3・街1の3市区町村です。');
  assert.equal(up([1, 2, 3, 4]), '6市区町村のうち、2020年より人口が増えたのは4です。増えた割合が大きいのは街4・街3・街2の順です。');
  // 1万人未満の街がふくまれるときの言い回し
  assert.match(prefReadText(mk([60000, 20000, 9000, 9000, 2000], [1, 2, 3, 4, 5]), { ...P, pop: 100000 }).up[0], /^人口1万人未満の小さな街もふくめると、人口が増えたのは5市区町村です。/);
});

test('避難場所：多い2つの種類の近さ（0.85）の境い目・0か所の種類は書かない', () => {
  const kinds = [['kouzui', '洪水'], ['dosha', '土砂災害'], ['takashio', '高潮'], ['jishin', '地震'], ['tsunami', '津波'], ['kaji', '大規模な火事'], ['naisui', '内水氾濫'], ['kazan', '火山']];
  const h = (kouzui, hinanjo = 90) => prefHinanText({ kinds, areas: { '01001': [100, hinanjo, '', kouzui, 0, 0, 100, 0, 0, 0, 0], '02001': [999, 999, '', 999, 0, 0, 0, 0, 0, 0, 0] } }, '01');
  assert.equal(h(85).text[0], '北海道の指定緊急避難場所100か所のうち、地震に使える所は100か所で、洪水も85か所あります。');
  assert.equal(h(84).text[0], '北海道に100か所ある指定緊急避難場所は、地震に使える所が100か所、洪水が84か所です。');
  assert.ok(!h(85).text.join('').includes('土砂'));
  assert.equal(h(85).rows, 1);
  // 指定避難所の言い回し：多い・75%以上・75%未満
  assert.match(h(85, 120).text.at(-1), /指定緊急避難場所より多く/);
  assert.match(h(85, 75).text.at(-1), /^家に戻れないときに過ごす指定避難所は、75か所/);
  assert.match(h(85, 74).text.at(-1), /^指定避難所は74か所で/);
  assert.equal(prefHinanText({ kinds, areas: {} }, '01'), null);
});

test('県の備えのページ：データの形が合っていて、まちがったものはエラーになる', () => {
  const b = readKenBichiku();
  assert.deepEqual(checkKenBichiku(b), []);
  assert.equal(kenBichikuMap(b).size, b.prefs.length);
  const ok = { pref: 'hokkaido', publisher: '北海道', title: '家庭における災害への備え', url: 'https://example.jp/a', checked: '2026-11-09', note: '最低3日分の水と食料の備えを載せています。' };
  const bad = (o) => checkKenBichiku({ prefs: [{ ...ok, ...o }] });
  assert.deepEqual(bad({}), []);
  assert.ok(bad({ pref: 'nai' }).some((e) => e.includes('PREFS')));
  assert.ok(bad({ publisher: '北海道庁' }).some((e) => e.includes('publisher')));
  assert.ok(bad({ title: '' }).some((e) => e.includes('title')));
  assert.ok(bad({ url: 'http://example.jp/a' }).some((e) => e.includes('https')));
  assert.ok(bad({ checked: '2026/11/09' }).some((e) => e.includes('checked')));
  assert.ok(bad({ note: undefined }).some((e) => e.includes('note')));
  assert.ok(bad({ note: '食料は十分な数を載せています。' }).some((e) => e.includes('十分')));
  assert.ok(bad({ note: 'あ'.repeat(60) + '。' }).some((e) => e.includes('60字')));
  assert.ok(checkKenBichiku({ prefs: [ok, ok] }).some((e) => e.includes('2回')));
  assert.deepEqual(checkKenBichiku(null), []);
  const line = kenBichikuLine(ok);
  assert.ok(line.includes('北海道のページは、最低3日分の水と食料の備えを載せています。<br>'));
  assert.ok(line.includes('<a href="https://example.jp/a" rel="noopener">北海道<cite>「家庭における災害への備え」</cite></a>'));
  assert.equal(kenBichikuLine(null), '');
});
