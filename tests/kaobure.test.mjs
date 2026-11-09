// 市区町村ページ「この街の備え」の避難場所の顔ぶれ（11/8 夜 #70）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { readMunis } from '../src/munis.mjs';
import { resolveCities } from '../src/areas.mjs';
import { shisetsuOf, shisetsuCounts, shisetsuText, shisetsuText3, widest, widestText, jishinParkSchool, jishinText, kaobureText } from '../src/lib/kaobure.mjs';

const BAN = ['しましょう', 'ぜひ', '便利', '簡単', '安心', 'おすすめ', 'ポイント', 'コツ', '今すぐ', '手遅れ', 'ワースト', '住みにくい', '危険な', '安全な', '——', '—', '›', '→', '人口あたり', '番目', '全国', '県内'];
const sentences = (ts) => ts.flatMap((t) => t.split(/(?<=。)/)).filter(Boolean);

test('施設の名前の分け方：学校を先に・迷う名前はそのほか', () => {
  assert.equal(shisetsuOf('埴生南小学校'), '小学校');
  assert.equal(shisetsuOf('高鷲南中学校'), '中学校');
  assert.equal(shisetsuOf('府立懐風館高等学校'), '高校');
  assert.equal(shisetsuOf('◯◯小学校体育館'), '小学校');
  assert.equal(shisetsuOf('総合スポーツセンター'), '体育館');
  assert.equal(shisetsuOf('羽曳野市民会館'), '公民館や集会所');
  assert.equal(shisetsuOf('◯◯地区コミュニティセンター'), '公民館や集会所');
  assert.equal(shisetsuOf('はびきの埴生学園'), 'そのほか');
  assert.equal(shisetsuOf('府立西浦支援学校'), 'そのほか');
});

const H = (names) => names.map((n) => [n, '住所']);
test('(a) 指定避難所の内訳：多い2つと数・言い回しのえらび分け', () => {
  const h = H(['A小学校', 'B小学校', 'C小学校', 'D中学校', 'E公民館', 'F学園']);
  assert.deepEqual(shisetsuCounts(h).top.map((x) => [x.name, x.n]), [['小学校', 3], ['中学校', 1], ['公民館や集会所', 1]]);
  assert.equal(shisetsuText(h), '指定避難所6か所を名前で分けると、小学校が3、中学校が1か所です。');
  assert.equal(shisetsuText(H(['A小学校', 'B小学校', 'C小学校', 'D中学校'])), '指定避難所4か所のうち、小学校が3か所と半分をこえ、次は中学校の1か所です。');
  assert.equal(shisetsuText(H(['A小学校', 'B中学校'])), '指定避難所2か所のうち、小学校と中学校がどちらも1か所です。');
  assert.equal(shisetsuText(H(['A小学校', 'B寺', 'C寺'])), '指定避難所3か所のうち、名前から小学校とわかる所は1か所です。');
  assert.equal(shisetsuText(H(['A小学校', 'B小学校', 'C中学校', 'D寺', 'E寺', 'F寺'])), '指定避難所6か所は名前で分けにくい所が多く、小学校が2、中学校が1か所です。');
  assert.equal(shisetsuText([]), '');
  assert.equal(shisetsuText3(H(['A小学校', 'B小学校', 'C小学校', 'D中学校', 'E中学校', 'F公民館', 'G会館'])), 'ほかに公民館や集会所が2か所です。');
  assert.equal(shisetsuText3(h), '');
});

const B = (rows) => rows.map(([n, m]) => [n, '住所', m]);
test('(b) いちばん多くの種類に使える場所：種類はビットのとおり・一覧にない種類は書かない', () => {
  // 洪水1・土砂災害2・地震8・大規模な火事32 → 43
  const b = B([['羽曳が丘小学校', 43], ['B公園', 8], ['C小学校', 43], ['D小学校', 11]]);
  const w = widest(b);
  assert.deepEqual(w.kinds, ['洪水', '土砂災害', '地震', '大規模な火事']);
  assert.equal(w.k, 4);
  assert.deepEqual(w.places, ['羽曳が丘小学校', 'C小学校']);
  assert.deepEqual(widestText(b), ['洪水・土砂災害・地震・大規模な火事の4つに使えるのは、羽曳が丘小学校とC小学校の2か所です。']);
  assert.deepEqual(widestText(B([['A', 9], ['B', 9], ['C', 9], ['D', 1]])), ['洪水・地震の2つに使える場所は3か所で、AやBなどです。']);
  assert.deepEqual(widestText(B([['A', 11], ['B', 8]])), ['洪水・土砂災害・地震の3つに使えるのは、Aの1か所です。']);
  // 種類が1つだけの街は書かない
  assert.deepEqual(widestText(B([['A', 8], ['B', 1]])), []);
  // 一覧にある種類が全部そろい、5つ以上のときは並べない（1+2+8+16+32+64）
  assert.deepEqual(widestText(B([['A', 123], ['B', 123], ['C', 1]])), ['一覧にある6つの災害の種類すべてに使えるのは、AとBの2か所です。']);
  // 名前にかっこがあるときは名前を1つにする
  assert.deepEqual(widestText(B([['A（体育館）', 9], ['B（体育館）', 9], ['C', 9]])), ['洪水・地震の2つに使える場所は3か所で、A（体育館）などです。']);
  // 名前が長くて60字をこえるときは文を分ける
  const long = 'あ'.repeat(30);
  for (const s of sentences(widestText(B([[long, 43], [long + 'い', 43], ['C', 43]])))) assert.ok([...s].length <= 60, s);
});

test('(c) 地震に使える場所の公園と学校：差がない・どちらも3未満なら出さない', () => {
  const b = B([['A公園', 8], ['B広場', 9], ['C公園', 8], ['D小学校', 8], ['E公園', 1]]);
  assert.deepEqual(jishinParkSchool(b), { park: 3, school: 1 });
  assert.equal(jishinText(b), '地震に使える場所のうち公園や広場は3か所で、学校の1か所の3倍以上あります。');
  assert.equal(jishinText(B([['A公園', 8], ['B公園', 8], ['C公園', 8], ['D公園', 8], ['E小学校', 8], ['F小学校', 8]])), '名前で見ると、地震に使える指定緊急避難場所は公園や広場が4か所で、学校の2か所の2倍以上です。');
  assert.equal(jishinText(B([['A小学校', 8], ['B中学校', 8], ['C高等学校', 8], ['D公園', 8], ['E公園', 8]])), '地震に使える指定緊急避難場所は、学校が3か所、公園や広場が2か所で、学校のほうが多くあります。');
  assert.equal(jishinText(B([['A小学校', 8], ['B中学校', 8], ['C学校', 8]])), '地震のときの指定緊急避難場所には学校が3か所あり、名前が公園や広場の所はありません。');
  assert.equal(jishinText(B([['A公園', 8], ['B公園', 8], ['C小学校', 8]])), '');
  assert.equal(jishinText(B([['A公園', 8], ['B公園', 8], ['C公園', 8], ['D小学校', 8], ['E中学校', 8], ['F学校', 8]])), '');
  assert.equal(kaobureText(null).length, 0);
});

const m = readMunis();
test('ページのある街（249）：文の決まり・同じ言い回しが半分以上の街に出ない', { skip: !m }, () => {
  const cities = resolveCities(m.areas).cities;
  const seen = new Map();
  let n = 0;
  for (const c of cities) {
    const f = `data/hinan/list/${c.code}.json`;
    if (!existsSync(f)) continue;
    n++;
    const t = kaobureText(JSON.parse(readFileSync(f, 'utf8')));
    for (const s of sentences(t)) {
      assert.ok([...s].length <= 60, `${c.slug}：60字をこえる「${s}」`);
      assert.ok((s.match(/（/g) ?? []).length <= 1, `${c.slug}：かっこが2つ「${s}」`);
      for (const w of BAN) assert.ok(!s.includes(w), `${c.slug}：使わない言葉「${w}」「${s}」`);
      assert.ok(!/undefined|NaN|null|Infinity/.test(s), `${c.slug}：値の抜け「${s}」`);
    }
    // 言い回し：数字・施設と種類の名前をのぞいた文の頭
    for (const s of new Set(sentences(t).map((s) => s.replace(/\d+/g, '#').replace(/^[^、。]*?(の#つに|すべてに)/, '…$1').slice(0, 14)))) seen.set(s, (seen.get(s) ?? 0) + 1);
  }
  assert.ok(n > 200, `一覧のある街 ${n}`);
  for (const [k, v] of seen) assert.ok(v < n / 2, `同じ言い回しが${v}/${n}の街に「${k}」`);
});
