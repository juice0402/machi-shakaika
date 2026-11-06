// 備えのごよみ（data/koyomi.yml・src/koyomi.mjs・/koyomi/。夜 #64）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml } from '../src/data.mjs';
import { checkKoyomi, koyomiPick, koyomiFill, koyomiVars, koyomiRawDigits, koyomiIcs, koyomiLine, KOYOMI_TEXT_MAX, KOYOMI_NG } from '../src/koyomi.mjs';
import { koyomiPages, WEBCAL, GCAL } from '../src/pages/koyomi.mjs';
import { hinmokuPages } from '../src/pages/hinmoku.mjs';
import { kigenPages } from '../src/pages/kigen.mjs';

const koyomi = readYaml('koyomi.yml');
const items = readYaml('items.yml');
const sources = readYaml('sources.yml');
const P = koyomi.periods;
const vars = koyomiVars(items);

const days = (y) => {
  const out = [];
  for (let t = Date.UTC(y, 0, 1); t < Date.UTC(y + 1, 0, 1); t += 864e5) out.push(new Date(t).toISOString().slice(0, 10));
  return out;
};

test('koyomi.yml の点検が通る（24期間・品目・出典・数字・字数・使わない言葉）', () => {
  assert.deepEqual(checkKoyomi(koyomi, items, sources), []);
  assert.equal(P.length, 24);
});

test('24期間が1年をすき間・重なりなく埋める（うるう年の2/29も）', () => {
  for (const y of [2026, 2027, 2028]) {
    const d = days(y);
    assert.equal(d.length, y === 2028 ? 366 : 365);
    for (const iso of d) {
      const hit = P.filter((p) => p.from <= iso.slice(5) && iso.slice(5) <= p.to);
      assert.equal(hit.length, 1, `${iso} の期間が ${hit.length}`);
    }
  }
  assert.equal(koyomiPick(P, '2028-02-29').from, '02-15');
  assert.equal(koyomiPick(P, '2026-11-06').from, '11-01');
  assert.equal(koyomiPick(P, '2026-12-31').from, '12-16');
  // 各月の1日・16日（2月は1日・15日）から始まる
  assert.deepEqual(P.map((p) => p.from), Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0')).flatMap((m) => [`${m}-01`, m === '02' ? '02-15' : `${m}-16`]));
});

test('item はみな品目ページのある品目（hinmoku: true）', () => {
  const hin = new Set(items.items.filter((it) => it.hinmoku).map((it) => it.id));
  for (const p of P) assert.ok(hin.has(p.item), p.item);
});

test('text：数字の直書きがない（月日だけ）・差しこんだあと全角60字まで・使わない言葉がない', () => {
  assert.equal(koyomiRawDigits('1月17日と9/1'), false);
  assert.equal(koyomiRawDigits('水は3L'), true);
  for (const p of P) {
    assert.ok(!koyomiRawDigits(p.text), p.text);
    const t = koyomiFill(p.text, vars);
    assert.ok([...t].length <= KOYOMI_TEXT_MAX, `${t}（${[...t].length}字）`);
    for (const w of KOYOMI_NG) assert.ok(!t.includes(w) && !p.theme.includes(w), `${p.from}：${w}`);
    assert.ok(!/[\u{1F300}-\u{1FAFF}☀-➿]/u.test(t + p.theme), `${p.from}：絵文字`);
    // 1行に入れる数字は1つか2つ（差しこみの数）
    assert.ok((p.text.match(/\{\w+\}/g) ?? []).length <= 2, p.text);
  }
  assert.throws(() => koyomiFill('{nai}', vars));
  // 数字は items.yml から
  assert.equal(vars.mizu, `1人1日${items.items.find((x) => x.id === 'mizu').per_day}L`);
});

test('sources はみな sources.yml にある', () => {
  const ids = new Set(sources.sources.map((s) => s.id));
  for (const p of P) for (const id of p.sources) assert.ok(ids.has(id), `${p.from}：${id}`);
});

test('点検：まちがいを見つける', () => {
  const bad = structuredClone(koyomi);
  bad.periods[1].item = 'nai';
  bad.periods[2].text = '水は3Lです';
  bad.periods[3].sources = ['nai'];
  bad.periods[4].from = '02-10';
  bad.periods[5].text = 'ぜひ'.repeat(40);
  const e = checkKoyomi(bad, items, sources).join('\n');
  for (const w of ['hinmoku', '数字を直接', '出典 nai', '重なって', '字（', '「ぜひ」']) assert.ok(e.includes(w), w);
  assert.deepEqual(checkKoyomi({ periods: P.slice(1) }, items, sources), ['koyomi.yml：periods は24期間']);
});

test('.ics：今年と来年の48件・終日・UID・75オクテットで折る・通知なし', () => {
  const ics = koyomiIcs(P, items, 2027, '2027-01-02');
  const ev = ics.match(/BEGIN:VEVENT/g);
  assert.equal(ev.length, 48);
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!ics.includes('VALARM'));
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line) <= 75, line);
  const un = ics.replace(/\r\n /g, '');
  const uids = [...un.matchAll(/^UID:(.+)$/gm)].map((m) => m[1]);
  assert.equal(new Set(uids).size, 48);
  assert.ok(uids.includes('koyomi-2027-01-01@machi-shakaika.com') && uids.includes('koyomi-2028-12-16@machi-shakaika.com'));
  assert.ok(un.includes('DTSTART;VALUE=DATE:20280215\r\nDTEND;VALUE=DATE:20280216'));
  assert.ok(un.includes('DTSTART;VALUE=DATE:20271216\r\nDTEND;VALUE=DATE:20271217'));
  assert.ok(un.includes('SUMMARY:いまの備え：台風の前'));
  assert.ok(un.includes('https://machi-shakaika.com/hinmoku/gas/'));
  // 同じ日なら同じ中身
  assert.equal(ics, koyomiIcs(P, items, 2027, '2027-01-02'));
});

test('/koyomi/：今の行にはんこ・購読のリンク2つ・災害時モードでは1行を出さない（表はそのまま）', () => {
  const [pg, ics] = koyomiPages({ koyomi, items, sources, today: '2026-11-20', saigai: false });
  assert.equal(pg.path, '/koyomi/');
  assert.equal(ics.path, '/koyomi/koyomi.ics');
  assert.ok(pg.body.includes('class="ima"'));
  assert.ok(pg.body.includes(`href="${WEBCAL}"`) && pg.body.includes(`href="${GCAL}"`));
  assert.equal(WEBCAL, 'webcal://machi-shakaika.com/koyomi/koyomi.ics');
  assert.equal(GCAL, 'https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fmachi-shakaika.com%2Fkoyomi%2Fkoyomi.ics');
  assert.equal((pg.body.match(/<tr class="on">/g) ?? []).length, 1);
  assert.ok(/<tr class="on"><td><span class="han"[^>]*><\/span>11\/16〜11\/30/.test(pg.body));
  assert.ok(pg.body.includes('2/15〜2/末'));
  assert.equal((pg.body.match(/<tr[ >]/g) ?? []).length, 25);
  assert.ok(!pg.body.includes('a8.net'));
  const sg = koyomiPages({ koyomi, items, sources, today: '2026-11-20', saigai: true })[0];
  assert.ok(!sg.body.includes('class="ima"'));
  assert.ok(sg.body.includes('<tr class="on">'));
});

test('品目ページ：今の品目のページだけ、量のめやすの下に1行。災害時モードでは出さない', () => {
  const cur = koyomiPick(P, '2026-11-06');
  const ima = { item: cur.item, html: koyomiLine(cur, items, { item: false }) };
  const pages = hinmokuPages({ items, sources, products: null, saigai: false, ima });
  for (const p of pages.filter((x) => x.path.startsWith('/hinmoku/') && x.path !== '/hinmoku/')) {
    const on = p.path === `/hinmoku/${cur.item}/`;
    assert.equal(p.body.includes('class="ima"'), on, p.path);
    if (on) assert.ok(/<p class="feat">[^\n]*<\/p>\n<p class="ima">/.test(p.body));
  }
  for (const p of hinmokuPages({ items, sources, products: null, saigai: true, ima })) assert.ok(!p.body.includes('class="ima"'));
});

test('期限メモ：期限の見直しの期間だけ、一覧の下に1行', () => {
  const cur = koyomiPick(P, '2026-11-20');
  assert.ok(cur.theme.includes('期限の見直し'));
  const [pg] = kigenPages({ items, ima: koyomiLine(cur, items) });
  assert.ok(/id="k0">[^<]*<\/p>\n<p class="ima">/.test(pg.body));
  assert.ok(!kigenPages({ items })[0].body.includes('class="ima"'));
  assert.equal(P.filter((p) => p.theme.includes('期限の見直し')).length, 3);
});
