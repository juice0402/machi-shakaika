import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml } from '../src/data.mjs';
import { calcConf, need } from '../src/calc.mjs';
import { sonaePages } from '../src/pages/sonae.mjs';
import { fuyuTeidenPages } from '../src/pages/sonae-fuyu.mjs';
import { yomimonoPages } from '../src/pages/sonae-yomimono.mjs';
import { sotoPages, checkSoto, SOTO } from '../src/pages/sonae-soto.mjs';

const items = readYaml('items.yml');
const sources = readYaml('sources.yml');
const cc = calcConf(items);
const pages = sotoPages({ cc, items, sources });
const page = (p) => pages.find((x) => x.path === p);
const text = (html) => html.replace(/<style[\s\S]*?<\/style>/g, '').replace(/<svg[\s\S]*?<\/svg>/g, '').replace(/<cite>[\s\S]*?<\/cite>/g, '').replace(/<[^>]+>/g, ' ');
const nums = (html) => (text(html).replace(/（\d{4}年\d{1,2}月\d{1,2}日確認）/g, '').match(/\d+/g) ?? []).map(Number);

test('家の外の備え：出典は題・URL・確認日がそろい、まちがったデータはエラー', () => {
  assert.deepEqual(checkSoto(items, sources), []);
  assert.deepEqual(pages.map((p) => p.path), SOTO.map((s) => s.path));
  assert.ok(checkSoto({ ...items, kuruma: { sources: ['nai'] } }, sources).some((e) => e.includes('nai')));
  assert.ok(checkSoto({ ...items, kitaku: { ...items.kitaku, days: 0 } }, sources).some((e) => e.includes('kitaku.days')));
  assert.throws(() => sotoPages({ cc, items: { ...items, kitaku: undefined }, sources }));
});

test('家の外の備え：車は数字を出さず、職場の数字は items.yml とそこから計算したものだけ', () => {
  // 車：出典の数（説明文）のほかは数字なし
  assert.deepEqual(nums(page('/sonae/kuruma-taisetsu/').body), []);
  const k = items.kitaku;
  const w = cc.by.mizu.per_day;
  const m = cc.by.shushoku.per_day;
  const allowed = new Set([1, 2, k.days, k.moufu, Number(k.dengon), w, m, need(w, 1, k.days), need(m, 1, k.days)]);
  const kb = page('/sonae/kitaku-konnan/').body;
  for (const n of nums(kb)) assert.ok(allowed.has(n), `${n} は items.yml にない数字`);
  assert.ok(kb.includes(`1人${k.days}日分`) && kb.includes(`水${need(w, 1, k.days)}L`) && kb.includes(`毛布は1人${k.moufu}枚`));
  assert.ok(kb.includes(`災害用伝言ダイヤル${k.dengon}`));
});

test('家の外の備え：説明文80〜120文字・h1は1つ・題 → 1行 → 表の順・出典と確認日', () => {
  for (const p of pages) {
    const n = [...p.description].length;
    assert.ok(n >= 80 && n <= 120, `${p.path} ${n}文字`);
    assert.equal((p.body.match(/<h1[\s>]/g) ?? []).length, 1);
    const iH1 = p.body.indexOf('<h1'), iLead = p.body.indexOf('class="lead"'), iTable = p.body.indexOf('<table');
    assert.ok(iH1 < iLead && iLead < iTable, p.path);
    // 1画面目に収まるように、題と表のあいだにほかのものを入れない
    assert.ok(!/<(p|div|ul)[\s>]/.test(p.body.slice(p.body.indexOf('</p>', iLead) + 4, iTable)), p.path);
    const lead = p.body.match(/<p class="lead">([^<]*)<\/p>/)[1];
    assert.ok([...lead].length <= 24, `${p.path} の1行が長い`);
    const key = SOTO.find((s) => s.path === p.path).key;
    for (const id of items[key].sources) {
      const s = sources.sources.find((x) => x.id === id);
      assert.ok(p.body.includes(s.url.replace(/&/g, '&amp;')), `${p.path}：${id}`);
    }
    assert.ok(/\d{4}年\d{1,2}月\d{1,2}日確認/.test(p.body));
  }
  assert.notEqual(pages[0].description, pages[1].description);
});

test('家の外の備え：商品は置かず品目ページ6つへのリンクだけ。使わない言葉・絵文字なし・公式へ1行', () => {
  const hinmoku = items.items.filter((x) => x.hinmoku).map((x) => x.id);
  for (const p of pages) {
    const hrefs = [...p.body.matchAll(/href="(\/[^"]*)"/g)].map((m) => m[1]);
    for (const id of hinmoku) assert.ok(hrefs.includes(`/hinmoku/${id}/`), `${p.path}：${id}`);
    for (const h of hrefs.filter((h) => h.startsWith('/hinmoku/'))) assert.ok(hinmoku.some((id) => h === `/hinmoku/${id}/`), h);
    assert.ok(!/rakuten|class="shop"|円/.test(p.body));
    const shown = text(p.body);
    for (const w of ['今すぐ', '手遅れ', 'しましょう', 'ぜひ', '便利', '簡単', '安心', 'おすすめ', 'ポイント', 'コツ', '——', '一酸化炭素']) assert.ok(!shown.includes(w), `${p.path}：${w}`);
    assert.ok(!/\p{Extended_Pictographic}/u.test(shown));
    assert.equal((p.body.match(/class="why"/g) ?? []).length, 1);
  }
  assert.ok(page('/sonae/kuruma-taisetsu/').body.includes('雪の多い地域では'));
});

test('入口：/sonae/ の棚・冬の停電の末尾・読みものの末尾', () => {
  const shelf = sonaePages({ cc, items, sources }).find((p) => p.path === '/sonae/').body;
  for (const s of SOTO) assert.ok(shelf.includes(`href="${s.path}"`), s.path);
  const [fuyu] = fuyuTeidenPages({ cc, items, sources });
  assert.ok(fuyu.body.includes('href="/sonae/kuruma-taisetsu/"'));
  for (const y of yomimonoPages({ cc, items, sources })) for (const s of SOTO) assert.ok(y.body.includes(`href="${s.path}"`), `${y.path} → ${s.path}`);
  // 家の外の2本どうしもつながる
  assert.ok(page('/sonae/kuruma-taisetsu/').body.includes('href="/sonae/kitaku-konnan/"'));
  assert.ok(page('/sonae/kitaku-konnan/').body.includes('href="/sonae/kuruma-taisetsu/"'));
});
