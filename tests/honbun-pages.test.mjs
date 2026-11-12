// 本文のうすいページに足した中身（夜 #47）：品目6と入口・クイズ5・道具4・トップ
//   本文600字以上（楽天の商品なし）・数字はデータから・品目ページは楽天以外へのリンクなし・クイズは広告なし・使わない言葉なし
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml } from '../src/data.mjs';
import { readMunis } from '../src/munis.mjs';
import { calcConf, need, CALC_JS } from '../src/calc.mjs';
import { muniList } from '../src/stats.mjs';
import { kazuData } from '../src/machi-tools.mjs';
import { mtDiff } from '../src/machi-core.mjs';
import { machiData, METRICS } from '../src/quiz.mjs';
import { qDobonTopics } from '../src/quiz-core.mjs';
import { KYOU_ORDER } from '../src/kyou.mjs';
import { page } from '../src/layout.mjs';
import { honbunText, honbunCount, HONBUN_MIN, jinobunCount, jinobunMeyasu } from '../scripts/honbun.mjs';
import { douguPages } from '../src/pages/dougu.mjs';
import { hinmokuPages } from '../src/pages/hinmoku.mjs';
import { quizPages, DOCCHI_N, SONAE_N, SONAE_KINDS, DOKO_N, NARABE_N, HINT_N } from '../src/pages/quiz.mjs';
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
    // 答えは送らない：読むのは /quiz/machi.json だけ、sendBeacon・XMLHttpRequest・POST を使わない
    for (const m of (p.script ?? '').matchAll(/fetch\(([^)]*)\)/g)) assert.equal(m[1], "'/quiz/machi.json'", `${p.path}：fetch(${m[1]})`);
    assert.ok(!/sendBeacon|XMLHttpRequest|method\s*:/.test(p.script ?? ''), `${p.path}：送る処理がある`);
    wording(p, /docchi|dobon|doko|narabe|hint/.test(p.path) ? 'しくみ</h2>' : '数字のもと</h2>');
  }
  const by = (x) => ps.find((p) => p.path === x);
  assert.ok(by('/quiz/docchi/').script.includes(`N=${DOCCHI_N};`));
  assert.ok(by('/quiz/sonae/').script.includes(`N=${SONAE_N},`));
  assert.ok(by('/quiz/doko/').script.includes(`N=${DOKO_N};`));
  assert.ok(by('/quiz/narabe/').script.includes(`N=${NARABE_N};`));
  assert.ok(by('/quiz/hint/').script.includes(`N=${HINT_N},`));
  for (const x of ['/quiz/doko/', '/quiz/narabe/', '/quiz/hint/']) assert.ok(by('/quiz/').body.includes(`href="${x}"`), `棚に ${x} がない`);
  assert.ok(by('/quiz/').body.includes(`>${SONAE_KINDS}種類の問題の型<`));
  assert.ok(by('/quiz/dobon/').body.includes(`お題は全部で${qDobonTopics(machi).length.toLocaleString('ja-JP')}あります`));
  // 今日の1問：題の順番は KYOU_ORDER のまま、今日の答えはページの下に書かない（例はきのうの1問）
  const k = by('/quiz/kyou/');
  const ol = [...k.body.matchAll(/<ol>([\s\S]*?)<\/ol>/g)].map((m) => m[1]).join('');
  assert.equal((ol.match(/<li>/g) ?? []).length, KYOU_ORDER.filter((i) => i < machi.m.length).length);
  assert.ok(k.body.includes('10月28日（水）の問題'));
  // 減り方・65歳以上はクイズの題にしない（くらべる数字に入っていない）
  const keys = METRICS.map((m) => m.key);
  for (const k of ['rate', 'popChange', 'popChangeRate', 'p65', 'age65', 'age75', 'single65', 'with65', 'pWith65']) assert.ok(!keys.includes(k), k);
  assert.ok(!machi.m.some((m) => /65歳|減/.test(m[0] + (m[1] ?? ''))));
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

// 夜 #74（AdSense のやり直し E）：品目6は地の文900字・入口と道具とトップは600字。足した節は商品の一覧のあと、数字は items.yml から
test('夜 #74：品目・道具・トップの地の文がめやす以上', { skip }, () => {
  const jc = (p) => jinobunCount(page(p));
  const ps = [
    ...hinmokuPages({ items, sources, products: null, saigai: false }),
    ...douguPages({ cc, items, sources }),
    ...kigenPages({ items }),
    ...sonaePages({ cc, items, sources }).filter((p) => p.path === '/dougu/keisan/'),
    ...toolPages({ munis, kazu }),
    topPage({ cc, munis, hinanMeta: { total: { basho: 1 }, checked: '2026-10-27' }, nMunis: list.length }),
  ];
  for (const p of ps) {
    const m = jinobunMeyasu(p.path);
    assert.ok(m, `${p.path}：めやすがない`);
    assert.ok(jc(p) >= m, `${p.path} 地の文${jc(p)}字（めやす${m}）`);
  }
  const ck = douguPages({ cc, items, sources }).find((p) => p.path === '/dougu/check/');
  wording(ck, 'しくみ</h2>');
  assert.ok(ck.body.indexOf('しくみ</h2>') > ck.body.indexOf('data-reset'), 'チェックリストの説明は一覧の下');
});

test('夜 #74：品目ページの足した節は商品の一覧のあと・水の数は items.yml から', () => {
  const one = { url: 'https://item.rakuten.co.jp/x/', img: 'https://thumbnail.image.rakuten.co.jp/x.jpg', name: 'x', price: 1000, reviews: 10, rating: 4 };
  const products = { fetchedAt: '2026-11-09T00:00:00Z', items: Object.fromEntries(items.items.map((it) => [it.id, [one]])) };
  for (const p of hinmokuPages({ items, sources, products, saigai: false }).filter((x) => x.path !== '/hinmoku/')) {
    const shop = p.body.indexOf('class="shopb"');
    assert.ok(shop > 0, p.path);
    for (const h of ['えらび方の目安</h2>', 'まちがえやすいところ</h2>']) assert.ok(p.body.indexOf(h) > shop, `${p.path}：${h} が商品の一覧より前`);
  }
  const mizu = items.items.find((x) => x.id === 'mizu');
  const { bottle: bt, kumioki: km } = mizu;
  const d = items.days.better;
  const m = hinmokuPages({ items, sources, products: null, saigai: false }).find((x) => x.path === '/hinmoku/mizu/');
  const hon = Math.ceil(need(mizu.per_day, 4, d) / bt.liters);
  assert.ok(m.body.includes(`${bt.liters}Lのボトルが${bt.per_case}本入った箱を${bt.cases}箱`));
  assert.ok(m.body.includes(`${need(mizu.per_day, 4, d)}L、${hon}本です。${bt.per_case}本入りの箱なら${Math.ceil(hon / bt.per_case)}箱`));
  assert.ok(m.body.includes(`約${km.suzushii}日、冷蔵庫なら約${km.reizouko}日`));
  // 足した節の出典は、ページの下の出典にも並ぶ
  for (const id of ['nerima-kumioki']) assert.ok(m.body.includes(sources.sources.find((x) => x.id === id).title), id);
});

// 夜 #91（C-026）：/sonae/bichiku/ で、わが家の人数の量をその場で出す。計算のカードは1つめの段落の下・1つだけ、スクリプトは計算のページと同じ
test('夜 #91：/sonae/bichiku/ に計算のカードと CALC_JS・地の文はめやす以上', () => {
  const p = sonaePages({ cc, items, sources }).find((x) => x.path === '/sonae/bichiku/');
  const html = page(p);
  assert.equal((html.match(/id="calc"/g) ?? []).length, 1, 'id="calc" は1つだけ');
  assert.ok(html.includes(`<script>${CALC_JS}</script>`), 'CALC_JS が入っていない');
  assert.ok(p.body.indexOf('id="calc"') < p.body.indexOf('1人1日の量</h2>'), 'カードは「1人1日の量」の前');
  assert.ok(p.body.includes('<a class="go" data-keep href="/dougu/check/">この人数でチェックリストを見る</a>'));
  assert.ok(!p.body.includes('<a class="go" href="/dougu/keisan/">'));
  assert.ok(jinobunCount(html) >= jinobunMeyasu(p.path), `地の文${jinobunCount(html)}字`);
});

// 夜 #93：品目ページ（水・主食・携帯トイレ）に計算のカードと、その品目だけの答えの1行。水は2Lボトルの本数（切り上げ）
// CALC_JS を小さなにせの DOM で動かし、?n=&d= で開いたときの出力とリンクを見る
function runCalc(body, search = '') {
  const attrs = (s) => Object.fromEntries([...s.matchAll(/data-([a-z]+)(?:=(?:"([^"]*)"|'([^']*)'))?/g)].map((m) => [m[1], m[2] ?? m[3] ?? '']));
  const outs = [...body.matchAll(/<b ([^>]*data-out=[^>]*)>[^<]*<\/b>/g)].map((m) => ({ dataset: attrs(m[1]), textContent: '' }));
  const keeps = [...body.matchAll(/<a ([^>]*data-keep[^>]*)>/g)].map((m) => {
    const h = m[1].match(/href="([^"]+)"/)[1];
    return { pathname: h.split('?')[0], href: h };
  });
  const sec = body.match(/<section id="calc"([^>]*)>/);
  const c = { dataset: attrs(sec[1]), querySelectorAll: () => [], addEventListener() {} };
  const doc = {
    getElementById: (id) => (id === 'calc' ? c : null),
    querySelectorAll: (q) => {
      const k = q.match(/data-out="([^"]+)"/);
      if (k) return outs.filter((o) => o.dataset.out === k[1]);
      return q === 'a[data-keep]' ? keeps : [];
    },
  };
  new Function('document', 'location', CALC_JS)(doc, { search });
  return { outs: outs.map((o) => [o.dataset.out, o.dataset.ceil ?? null, o.textContent]), keeps: keeps.map((a) => a.href) };
}

test('夜 #93：品目ページ3つに計算のカードと答えの1行・水は2Lボトルの本数', () => {
  const pages = hinmokuPages({ items, sources, products: null, saigai: false, cc });
  const want = { mizu: ['水', 'L'], shushoku: ['主食', '食'], 'keitai-toilet': ['携帯トイレ', '回分'] };
  for (const it of items.items.filter((x) => x.hinmoku)) {
    const p = pages.find((x) => x.path === `/hinmoku/${it.id}/`);
    const html = page(p);
    if (!want[it.id]) {
      // gas・light・battery は今と同じ（カードもスクリプトもない）
      assert.ok(!html.includes('id="calc"') && !p.body.includes('class="ans"') && !p.script, it.id);
      continue;
    }
    assert.equal((html.match(/id="calc"/g) ?? []).length, 1, `${it.id}：id="calc" は1つだけ`);
    assert.ok(html.includes(`<script>${CALC_JS}</script>`), `${it.id}：CALC_JS`);
    assert.ok(!p.body.includes('href="/dougu/keisan/"'), `${it.id}：計算のページへのリンクはカードに置きかえ`);
    const [nm, unit] = want[it.id];
    const ans = p.body.match(/<p class="ans">([\s\S]*?)<\/p>/)[1].replace(/<[^>]+>/g, '');
    const k = cc.out[it.id];
    const base = `${nm}${need(cc.per[k], 4, items.days.min)}${unit}`;
    assert.equal(ans, it.id === 'mizu' ? `${base}（2Lボトル${Math.ceil(need(cc.per[k], 4, items.days.min) / 2)}本）` : base, it.id);
    // カードは量のめやすの下・早見表の上。商品の並びは今の場所のまま
    assert.ok(p.body.indexOf('class="feat"') < p.body.indexOf('id="calc"') && p.body.indexOf('id="calc"') < p.body.indexOf('人数と日数の早見表</h2>'), it.id);
  }
  // 本数（4人・3日 → 36L・18本、1人・7日 → 21L・11本）。?n=&d= で開いたとき
  const mz = pages.find((x) => x.path === '/hinmoku/mizu/').body;
  assert.equal(items.items.find((x) => x.id === 'mizu').bottle.liters, 2);
  assert.deepEqual(runCalc(mz, '?n=4&d=3').outs, [['mizu', null, '36'], ['mizu', '2', '18']]);
  assert.deepEqual(runCalc(mz, '?n=1&d=7').outs, [['mizu', null, '21'], ['mizu', '2', '11']]);
  assert.deepEqual(runCalc(mz, '').outs, [['mizu', null, '36'], ['mizu', '2', '18']]);
  const sh = pages.find((x) => x.path === '/hinmoku/shushoku/').body;
  assert.deepEqual(runCalc(sh, '?n=2&d=7').outs, [['shoku', null, String(need(cc.per.shoku, 2, 7))]]);
});

test('夜 #93：商品があるときも計算のカードは1つ・スクリプトは SHOP_JS と CALC_JS・楽天以外の外のリンクなし', () => {
  const one = { url: 'https://item.rakuten.co.jp/x/', img: 'https://thumbnail.image.rakuten.co.jp/x.jpg', name: 'x', price: 1000, reviews: 10, rating: 4 };
  const products = { fetchedAt: '2026-11-09T00:00:00Z', items: Object.fromEntries(items.items.map((it) => [it.id, [one]])) };
  for (const saigai of [false, true]) {
    for (const p of hinmokuPages({ items, sources, products, saigai, cc }).filter((x) => x.path !== '/hinmoku/')) {
      const id = p.path.split('/')[2];
      const calc = ['mizu', 'shushoku', 'keitai-toilet'].includes(id);
      assert.equal((p.body.match(/id="calc"/g) ?? []).length, calc ? 1 : 0, p.path);
      assert.equal(p.script.includes(CALC_JS), calc, p.path);
      for (const m of p.body.matchAll(/href="([^"]+)"/g)) assert.ok(m[1].startsWith('/') || m[1].startsWith('https://item.rakuten.co.jp/'), `${p.path}：外へのリンク ${m[1]}`);
      // 商品の並びは早見表のあと（入れかえない）
      if (!saigai) assert.ok(p.body.indexOf('class="shopb"') > p.body.indexOf('id="calc"'), p.path);
    }
  }
});

test('夜 #93：計算のページと /sonae/bichiku/ から、人数と日数をつけたまま品目ページへ', () => {
  const ps = sonaePages({ cc, items, sources });
  const ks = ps.find((p) => p.path === '/dougu/keisan/').body;
  const bi = ps.find((p) => p.path === '/sonae/bichiku/').body;
  const three = '<a data-keep href="/hinmoku/mizu/">備蓄の水</a>・<a data-keep href="/hinmoku/shushoku/">備蓄の主食</a>・<a data-keep href="/hinmoku/keitai-toilet/">携帯トイレ</a>';
  for (const b of [ks, bi]) assert.ok(b.includes(three));
  assert.ok(ks.indexOf(three) > ks.indexOf('この人数でチェックリストを見る'));
  assert.deepEqual(runCalc(ks, '?n=2&d=7').keeps, ['/dougu/check/?n=2&d=7', '/hinmoku/mizu/?n=2&d=7', '/hinmoku/shushoku/?n=2&d=7', '/hinmoku/keitai-toilet/?n=2&d=7']);
  // 品目ページを同じ ?n=&d= で開くと、計算のページと同じ量
  const mz = hinmokuPages({ items, sources, products: null, saigai: false, cc }).find((x) => x.path === '/hinmoku/mizu/').body;
  assert.equal(runCalc(mz, '?n=2&d=7').outs[0][2], runCalc(ks, '?n=2&d=7').outs.find((o) => o[0] === 'mizu')[2]);
});
