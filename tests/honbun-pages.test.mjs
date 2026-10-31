// 本文のうすいページに足した中身（夜 #47）：品目6と入口・クイズ5・道具4・トップ
//   本文600字以上（楽天の商品なし）・数字はデータから・品目ページは楽天以外へのリンクなし・クイズは広告なし・使わない言葉なし
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml } from '../src/data.mjs';
import { readMunis } from '../src/munis.mjs';
import { calcConf, need } from '../src/calc.mjs';
import { muniList } from '../src/stats.mjs';
import { kazuData } from '../src/machi-tools.mjs';
import { mtDiff } from '../src/machi-core.mjs';
import { machiData } from '../src/quiz.mjs';
import { qDobonTopics } from '../src/quiz-core.mjs';
import { KYOU_ORDER } from '../src/kyou.mjs';
import { page } from '../src/layout.mjs';
import { honbunText, honbunCount, HONBUN_MIN } from '../scripts/honbun.mjs';
import { hinmokuPages } from '../src/pages/hinmoku.mjs';
import { quizPages, DOCCHI_N, SONAE_N, SONAE_KINDS } from '../src/pages/quiz.mjs';
import { kyouPage } from '../src/pages/kyou.mjs';
import { toolPages } from '../src/pages/kurabe.mjs';
import { kigenPages, KIGEN_NOTICE_DAYS } from '../src/pages/kigen.mjs';
import { sonaePages } from '../src/pages/sonae.mjs';
import { topPage } from '../src/pages/top.mjs';

const items = readYaml('items.yml');
const sources = readYaml('sources.yml');
const cc = calcConf(items);
const munis = readMunis();
const skip = !munis && 'data/estat/munis.json がない';
const list = munis ? muniList(munis.areas) : [];
const machi = munis ? machiData(munis.areas, () => null) : null;
const kazu = munis ? kazuData(munis.areas, () => null) : null;

const BANNED = ['しましょう', 'ぜひ', '便利', '簡単', '安心', 'おすすめ', 'ポイント', 'コツ', '今すぐ', '手遅れ', '——', '最安値', '定価', 'ワースト', '住みにくい'];
const count = (p) => honbunCount(honbunText(page(p)));
const shown = (html) => html.replace(/<cite>[\s\S]*?<\/cite>/g, '').replace(/<script[\s\S]*?<\/script>/g, '').replace(/<style[\s\S]*?<\/style>/g, '').replace(/<[^>]+>/g, ' ');
const sentences = (html) =>
  [...html.replace(/<cite>[\s\S]*?<\/cite>/g, '').matchAll(/<(p|h3|li|td)\b[^>]*>([\s\S]*?)<\/\1>/g)].flatMap((m) => m[2].replace(/<[^>]+>/g, '').split(/(?<=[。？])/).map((s) => s.trim()).filter(Boolean));
// 足した所だけを見る（mark の見出しから後ろ。前からある文は変えていないので見ない）
function wording(p, mark) {
  const at = mark ? p.body.indexOf(mark) : 0;
  assert.ok(at >= 0, `${p.path}：${mark} がない`);
  p = { ...p, body: p.body.slice(at) };
  const t = shown(p.body);
  for (const w of BANNED) assert.ok(!t.includes(w), `${p.path}：「${w}」`);
  assert.ok(!/<h2[^>]*>[\s\S]*?使い方/.test(p.body), `${p.path}：「使い方」の節`);
  for (const s of sentences(p.body)) {
    assert.ok([...s].length <= 60, `${p.path}：1文が長い「${s}」`);
    assert.ok((s.match(/（/g) ?? []).length <= 1 || /確認）$/.test(s), `${p.path}：かっこが2つ以上「${s}」`);
  }
}

test('品目6と入口：商品なしで本文600字以上・楽天以外へのリンクなし・言葉', () => {
  const pages = hinmokuPages({ items, sources, products: null, saigai: false });
  for (const p of pages) {
    assert.ok(count(p) >= HONBUN_MIN, `${p.path} ${count(p)}字`);
    for (const m of p.body.matchAll(/href="([^"]+)"/g)) assert.ok(m[1].startsWith('/'), `${p.path}：サイトの外へのリンク ${m[1]}`);
    wording(p);
  }
});

test('品目：早見表は per_day のある品目だけ。数字は items.yml から', () => {
  const pages = hinmokuPages({ items, sources, products: null, saigai: false });
  const y = items.yohairyo_days;
  for (const it of items.items.filter((x) => x.hinmoku)) {
    const p = pages.find((x) => x.path === `/hinmoku/${it.id}/`);
    const hasTable = /<table class="tbl">/.test(p.body);
    assert.equal(hasTable, Boolean(it.calc && it.per_day), it.id);
    if (hasTable) {
      for (const n of [1, 6]) for (const d of [...items.days.choices, y]) assert.ok(p.body.includes(`>${need(it.per_day, n, d).toLocaleString('ja-JP')}${it.unit}<`), `${it.id} ${n}人${d}日`);
    }
  }
  // 出典の例しかない品目（gas）は、例の数だけ（人数でかけた数を出さない）
  const gas = items.items.find((x) => x.id === 'gas');
  const g = pages.find((x) => x.path === '/hinmoku/gas/');
  assert.ok(g.body.includes(`${gas.example_qty}${gas.unit}`));
  for (const n of [2, 3, 4]) assert.ok(!g.body.includes(`${gas.example_qty * n}${gas.unit}`), `gas ${n}人分`);
  // 災害時モードでも同じ中身（楽天の文は外す）
  const off = hinmokuPages({ items, sources, products: null, saigai: true }).find((x) => x.path === '/hinmoku/');
  assert.ok(!/楽天/.test(off.body));
});

test('クイズ5：本文600字以上・広告なし・問題の数はページのスクリプトと同じ・答えは送らない', { skip }, () => {
  const ps = [...quizPages({ munis, items, sources, machi }), kyouPage({ munis, machi, start: '2026-10-29', urlOfRow: () => '/x/' })];
  for (const p of ps) {
    assert.equal(p.noAds, true, p.path);
    assert.ok(count(p) >= HONBUN_MIN, `${p.path} ${count(p)}字`);
    assert.ok(/送りません/.test(p.body), `${p.path}：答えを送らないことを書く`);
    wording(p, /docchi|dobon/.test(p.path) ? 'しくみ</h2>' : '数字のもと</h2>');
  }
  const by = (x) => ps.find((p) => p.path === x);
  assert.ok(by('/quiz/docchi/').script.includes(`N=${DOCCHI_N};`));
  assert.ok(by('/quiz/sonae/').script.includes(`N=${SONAE_N},`));
  assert.ok(by('/quiz/').body.includes(`>${SONAE_KINDS}種類のひな形<`));
  assert.ok(by('/quiz/dobon/').body.includes(`お題は全部で${qDobonTopics(machi).length.toLocaleString('ja-JP')}あります`));
  // 今日の1問：題の順番は KYOU_ORDER のまま、今日の答えはページの下に書かない（例はきのうの1問）
  const k = by('/quiz/kyou/');
  const ol = [...k.body.matchAll(/<ol>([\s\S]*?)<\/ol>/g)].map((m) => m[1]).join('');
  assert.equal((ol.match(/<li>/g) ?? []).length, KYOU_ORDER.filter((i) => i < machi.m.length).length);
  assert.ok(k.body.includes('10月28日（水）の問題'));
  // 減り方・65歳以上はクイズの題にしないと書く（題にはしない）
  assert.ok(/人口の減り方/.test(by('/quiz/').body));
});

test('道具：/kurabe/・/niteru/ の例はデータから作り、ページの計算と同じ', { skip }, () => {
  for (const p of toolPages({ munis, kazu })) {
    assert.ok(count(p) >= HONBUN_MIN, `${p.path} ${count(p)}字`);
    assert.ok(/住みやすさ/.test(p.body), `${p.path}：住みやすさではないと書く`);
    wording(p, 'しくみ</h2>');
  }
  const k = toolPages({ munis, kazu }).find((p) => p.path === '/kurabe/');
  const a = kazu.r.find((r) => r[1] === '堺市');
  const b = kazu.r.find((r) => r[1] === '岡山市');
  for (const d of mtDiff(a, b)) assert.ok(k.body.includes(`<td>${d.text}</td>`), d.label);
  assert.ok(k.body.includes(`<td>${a[3].toLocaleString('ja-JP')}人</td>`));
});

test('道具：/dougu/kigen/・/dougu/keisan/ と トップ', { skip }, () => {
  const [kg] = kigenPages({ items });
  assert.ok(count(kg) >= HONBUN_MIN, `kigen ${count(kg)}字`);
  assert.ok(kg.body.includes(`${KIGEN_NOTICE_DAYS}日以内`));
  wording(kg, 'しくみ</h2>');
  const ks = sonaePages({ cc, items, sources }).find((p) => p.path === '/dougu/keisan/');
  assert.ok(count(ks) >= HONBUN_MIN, `keisan ${count(ks)}字`);
  assert.ok(ks.body.includes(`<td>全国</td><td>${(Math.round(munis.areas['00000'].perHh * 10) / 10).toFixed(1)}人</td>`));
  wording(ks, 'しくみ</h2>');
  const top = topPage({ cc, munis, hinanMeta: { total: { basho: 1 }, checked: '2026-10-27' }, nMunis: list.length });
  assert.ok(count(top) >= HONBUN_MIN, `top ${count(top)}字`);
  // 1画面め（さがす・計算・地図）が先、足した2節はクイズの棚より下
  assert.ok(top.body.indexOf('data-find') < top.body.indexOf('id="map"') && top.body.indexOf('/quiz/sonae/') < top.body.indexOf('街の数字</h2>'));
  wording(top, '街の数字</h2>');
});
