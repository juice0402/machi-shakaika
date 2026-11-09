// 都道府県ページの「県内の街の読み解き」「県内の避難場所と県の備え」と、人口のランキングの文（11/9 夜 #72）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { readMunis } from '../src/munis.mjs';
import { PREFS, resolveCities } from '../src/areas.mjs';
import { derive, muniList, prefReadText, prefHinanText } from '../src/stats.mjs';
import { readKenBichiku, kenBichikuMap, checkKenBichiku } from '../src/data.mjs';
import { rankingText } from '../src/pages/ranking.mjs';
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
  const sum = [...t.yosu.slice(0, 2).join('').matchAll(/が(\d+)/g)].reduce((s, x) => s + Number(x[1]), 0);
  assert.equal(sum, up.length);
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
