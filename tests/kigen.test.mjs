import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml, checkItems } from '../src/data.mjs';
import { kStr, kRead, kSort, kLeft, kIcs, kFold, kText, kName, kMonthEnd, KIGEN_JS } from '../src/kigen-core.mjs';
import { kigenChoices, kigenPages, KIGEN_NOTICE_DAYS } from '../src/pages/kigen.mjs';
import { page } from '../src/layout.mjs';

const items = readYaml('items.yml');
const sources = readYaml('sources.yml');
const C = kigenChoices(items);
const L = [
  { n: '水', y: 2028, m: 1, d: 0, q: 6 },
  { n: '水', y: 2027, m: 3, d: 0, q: 0 },
  { n: '単3電池', y: 2030, m: 12, d: 0, q: 8 },
  { n: 'カセットボンベ', y: 2033, m: 5, d: 0, q: 3 },
  { n: '缶詰', y: 2026, m: 11, d: 15, q: 0 },
];

test('えらべる品目：items.yml のチェックリストから、記号は1字で重ならない。品目ページは items.yml にあるものだけ', () => {
  assert.deepEqual(checkItems(items, sources), []);
  assert.deepEqual(C.map((c) => c[1]), ['水', '主食', '缶詰', '携帯トイレ', 'カセットボンベ']);
  assert.equal(new Set(C.map((c) => c[0])).size, C.length);
  for (const c of C) if (c[2]) assert.ok(items.items.some((it) => it.hinmoku && c[2] === `/hinmoku/${it.id}/`), c[1]);
  assert.equal(C.find((c) => c[1] === '缶詰')[2], '');
  const bad = { ...items, checklists: [{ id: 'x', name: 'x', entries: [{ name: 'a', kigen: ['ab', 'a'], sources: ['maff-sonae'] }, { name: 'b', kigen: ['c', 'b'], sources: ['maff-sonae'] }, { name: 'c', kigen: ['c', 'c'], sources: ['maff-sonae'] }] }] };
  const e = checkItems(bad, sources);
  assert.ok(e.some((x) => x.includes('英小文字1字')));
  assert.ok(e.some((x) => x.includes('2回')));
});

test('URL の文字：短く、版の番号つき。行って戻ると同じ', () => {
  const s = kStr(L, C);
  assert.ok(s.startsWith('k1_'));
  assert.equal(s, 'k1_261115.k_2703.w_2801.w.6_3012.-%E5%8D%983%E9%9B%BB%E6%B1%A0.8_3305.g.3');
  assert.deepEqual(kRead(s, C), { ok: true, list: kSort(L), bad: 0 });
  assert.deepEqual(kRead('#' + s, C).list, kSort(L));
  assert.equal(kStr([], C), '');
  assert.deepEqual(kRead('', C), { ok: true, list: [], bad: 0 });
  // 名前に . や _ や # が入っても読める
  const odd = [{ n: 'a.b_c #1 100%', y: 2027, m: 1, d: 31, q: 0 }];
  assert.deepEqual(kRead(kStr(odd, C), C).list, odd);
  assert.ok(!/[#\s]/.test(kStr(odd, C)));
});

test('URL の文字：こわれた文字でも投げず、読めない件だけ外す', () => {
  for (const s of ['k2_2703.w', 'x', 'k1x', '%%%', 'k', '#k9']) assert.equal(kRead(s, C).ok, false, s);
  const r = kRead('k1_2703.w_2713.w_270230.w_2702.z_2703.-%E0%A4%A_2703.-_2703.w.0_2703.w.1000_2703.w.5.9_abc_2704.w.12', C);
  assert.equal(r.ok, true);
  assert.deepEqual(r.list, [
    { n: '水', y: 2027, m: 3, d: 0, q: 0 },
    { n: '水', y: 2027, m: 4, d: 0, q: 12 },
  ]);
  assert.equal(r.bad, 9);
  assert.deepEqual(kRead('k1_', C).list, []);
  const many = 'k1_' + Array.from({ length: 60 }, () => '2703.w').join('_');
  assert.equal(kRead(many, C).list.length, 50);
  assert.equal(kRead(many, C).bad, 10);
  for (const s of [null, undefined, 123, 'k1_' + '\u0000'.repeat(5), 'k1_9999.-' + '%41'.repeat(500)]) assert.doesNotThrow(() => kRead(s, C));
  assert.equal([...kRead('k1_2703.-' + '%E3%81%82'.repeat(40), C).list[0].n].length, 20);
});

test('名前：空白をまとめ、制御文字を外し、20文字まで', () => {
  assert.equal(kName('  水\n  2L \u0007'), '水 2L');
  assert.equal(kName('あ'.repeat(30)), 'あ'.repeat(20));
  assert.equal(kName(null), '');
});

test('期限の近い順と、あと何日・何か月（日なしは月末まで）', () => {
  assert.deepEqual(kSort(L).map((e) => `${e.n}${e.y}`), ['缶詰2026', '水2027', '水2028', '単3電池2030', 'カセットボンベ2033']);
  const t = [2026, 10, 26];
  const left = (y, m, d) => kLeft({ n: 'x', y, m, d, q: 0 }, t);
  assert.equal(left(2026, 11, 15).text, 'あと20日');
  assert.equal(left(2026, 11, 15).days, 20);
  assert.equal(left(2026, 10, 26).text, '今日まで');
  assert.equal(left(2026, 10, 25).text, 'すぎています');
  assert.equal(left(2026, 10, 0).text, '今月まで');
  assert.equal(left(2026, 10, 0).days, 5);
  assert.equal(left(2026, 9, 0).text, 'すぎています');
  assert.equal(left(2026, 11, 0).text, 'あと1か月');
  assert.equal(left(2027, 3, 0).text, 'あと5か月');
  assert.equal(left(2027, 3, 20).text, 'あと4か月');
  assert.equal(left(2027, 3, 26).text, 'あと5か月');
  assert.equal(left(2027, 10, 0).text, 'あと1年');
  assert.equal(left(2028, 1, 0).text, 'あと1年3か月');
  assert.equal(left(2027, 3, 0).frac < 1 && left(2027, 3, 0).frac > 0.4, true);
  assert.equal(left(2033, 5, 0).frac, 1);
  assert.equal(left(2026, 1, 0).frac, 0);
  assert.equal(kMonthEnd(2028, 2), 29);
  assert.equal(kMonthEnd(2027, 2), 28);
});

test('.ics：RFC 5545（CRLF・UID・DTSTAMP・終日・UTF-8・75オクテットで折り返し）、通知は期限の前', () => {
  const ics = kIcs(L, { now: new Date('2026-10-26T09:30:00Z'), url: 'https://machi-shakaika.com/dougu/kigen/#k1_2703.w', before: KIGEN_NOTICE_DAYS });
  assert.ok(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\nPRODID:'));
  assert.ok(ics.endsWith('END:VCALENDAR\r\n'));
  assert.ok(!/[^\r]\n/.test(ics), '改行はすべて CRLF');
  for (const line of ics.split('\r\n')) assert.ok(Buffer.byteLength(line, 'utf8') <= 75, `75オクテットをこえる：${line}`);
  const un = ics.replace(/\r\n /g, '');
  const ev = un.split('BEGIN:VEVENT').slice(1);
  assert.equal(ev.length, L.length);
  const uids = ev.map((e) => /\r\nUID:([^\r]+)/.exec(e)[1]);
  assert.equal(new Set(uids).size, L.length, 'UID は重ならない');
  for (const e of ev) {
    assert.match(e, /\r\nDTSTAMP:20261026T093000Z\r\n/);
    assert.match(e, /\r\nDTSTART;VALUE=DATE:\d{8}\r\nDTEND;VALUE=DATE:\d{8}\r\n/);
    assert.match(e, /\r\nBEGIN:VALARM\r\nACTION:DISPLAY\r\nDESCRIPTION:[^\r]+\r\nTRIGGER:-P29DT15H\r\nEND:VALARM\r\n/);
  }
  // 日なしは月末。終わりは次の日（終日の予定）
  assert.match(un, /SUMMARY:水の期限\r\nDESCRIPTION:期限 2027年3月\\n期限メモ https:\/\/machi-shakaika\.com\/dougu\/kigen\/#k1_2703\.w\r\n/);
  assert.match(ev[1], /DTSTART;VALUE=DATE:20270331\r\nDTEND;VALUE=DATE:20270401/);
  assert.match(ev[0], /DTSTART;VALUE=DATE:20261115\r\nDTEND;VALUE=DATE:20261116/);
  assert.match(ev[2], /DTSTART;VALUE=DATE:20280131/);
  assert.match(un, /SUMMARY:単3電池の期限/);
  assert.match(un, /DESCRIPTION:期限 2028年1月・数 6/);
  // 折り返しは日本語の文字を分けない
  const long = kFold('SUMMARY:' + 'あ'.repeat(40));
  assert.equal(long.replace(/\r\n /g, ''), 'SUMMARY:' + 'あ'.repeat(40));
  for (const line of long.split('\r\n')) {
    assert.ok(Buffer.byteLength(line, 'utf8') <= 75);
    assert.ok(!line.includes('�'));
  }
  // , ; \ は逃がす
  const esc = kIcs([{ n: 'a,b;c\\d', y: 2027, m: 1, d: 1, q: 0 }], { now: new Date(0), url: '', before: 30 });
  assert.match(esc, /SUMMARY:a\\,b\\;c\\\\dの期限/);
});

test('文字の書き出し：近い順、残りと続きのURL', () => {
  const s = kText(L, [2026, 10, 26], 'https://machi-shakaika.com/dougu/kigen/#x');
  assert.deepEqual(s.split('\n'), [
    '期限メモ（2026年10月26日）',
    '缶詰　2026年11月15日（あと20日）',
    '水　2027年3月（あと5か月）',
    '水 ×6　2028年1月（あと1年3か月）',
    '単3電池 ×8　2030年12月（あと4年2か月）',
    'カセットボンベ ×3　2033年5月（あと6年7か月）',
    '続き https://machi-shakaika.com/dougu/kigen/#x',
  ]);
});

test('ページに入れる部品は、外の変数を使わずに動く', () => {
  const f = new Function('C', 'L', `${KIGEN_JS}\nconst s=kStr(L,C);return [s,kRead(s,C).list.length,kIcs(L,{now:new Date(0),url:'',before:30}).length>0];`);
  assert.deepEqual(f(C, L), [kStr(L, C), L.length, true]);
});

test('期限メモのページ：AdSense なし・品目は items.yml から・災害時モードでも同じ・説明は1行', () => {
  const [p] = kigenPages({ items });
  assert.equal(p.path, '/dougu/kigen/');
  assert.equal(p.noAds, true);
  for (const c of C) assert.ok(p.body.includes(`>${c[1]}</button>`), c[1]);
  assert.ok(p.description.includes(`${KIGEN_NOTICE_DAYS}日前`));
  const n = [...p.description].length;
  assert.ok(n >= 80 && n <= 120, `説明文 ${n}文字`);
  const lead = /<p class="lead">([^<]*)<\/p>/.exec(p.body)[1];
  assert.ok([...lead].length <= 22, lead);
  assert.ok(!/使い方/.test(p.body));
  for (const saigai of [true, false]) {
    const html = page({ ...p, saigai });
    assert.ok(!html.includes('adsbygoogle'));
    assert.ok(!/rakuten/.test(html));
    assert.ok(html.includes('<body data-ads="off">'));
  }
  // スクリプトが文法として正しい
  assert.doesNotThrow(() => new Function(p.script));
});
