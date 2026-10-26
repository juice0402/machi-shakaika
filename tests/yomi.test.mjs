import { test } from 'node:test';
import assert from 'node:assert/strict';
import { deflateRawSync } from 'node:zlib';
import { toHira, buildYomi, readYomi } from '../src/yomi.mjs';
import { readZipEntry } from '../src/lib/zip.mjs';
import { FIND_JS } from '../src/pages/top.mjs';
import { readMunis } from '../src/munis.mjs';
import { CITIES, PREFS } from '../src/areas.mjs';

test('読みをひらがなにする', () => {
  assert.equal(toHira('ｻｯﾎﾟﾛｼ'), 'さっぽろし');
  assert.equal(toHira('ﾄｳｷｮｳ ﾄ'), 'とうきょうと');
  assert.equal(toHira('ヴ'), 'ゔ');
});

// 小さな zip を作る（1ファイル・deflate）
function zip(name, text) {
  const data = Buffer.from(text);
  const comp = deflateRawSync(data);
  const nm = Buffer.from(name);
  const local = Buffer.alloc(30);
  local.writeUInt32LE(0x04034b50, 0);
  local.writeUInt16LE(8, 8);
  local.writeUInt32LE(comp.length, 18);
  local.writeUInt32LE(data.length, 22);
  local.writeUInt16LE(nm.length, 26);
  const cen = Buffer.alloc(46);
  cen.writeUInt32LE(0x02014b50, 0);
  cen.writeUInt16LE(8, 10);
  cen.writeUInt32LE(comp.length, 20);
  cen.writeUInt32LE(data.length, 24);
  cen.writeUInt16LE(nm.length, 28);
  cen.writeUInt32LE(0, 42);
  const body = Buffer.concat([local, nm, comp]);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(1, 8);
  end.writeUInt16LE(1, 10);
  end.writeUInt32LE(46 + nm.length, 12);
  end.writeUInt32LE(body.length, 16);
  return new Uint8Array(Buffer.concat([body, cen, nm, end]));
}

test('zip から1つ取り出す', () => {
  assert.equal(Buffer.from(readZipEntry(zip('KEN_ALL.CSV', 'あいう,1\n'), /KEN_ALL\.CSV$/)).toString(), 'あいう,1\n');
  assert.throws(() => readZipEntry(zip('a.txt', 'x'), /KEN_ALL/));
});

test('郵便番号データの行から読みを作る（郡を外す・政令市は区から）', () => {
  const row = (code, pk, mk, p, m) => [code, '', '', pk, mk, '', p, m, ''];
  const rows = [
    row('01303', 'ﾎｯｶｲﾄﾞｳ', 'ｲｼｶﾘｸﾞﾝﾄｳﾍﾞﾂﾁｮｳ', '北海道', '石狩郡当別町'),
    row('27141', 'ｵｵｻｶﾌ', 'ｻｶｲｼｻｶｲｸ', '大阪府', '堺市堺区'),
    row('27142', 'ｵｵｻｶﾌ', 'ｻｶｲｼﾅｶｸ', '大阪府', '堺市中区'),
    row('27143', 'ｵｵｻｶﾌ', 'ｻｶｲｼﾋｶﾞｼｸ', '大阪府', '堺市東区'),
    row('21219', 'ｷﾞﾌｹﾝ', 'ｸﾞｼﾞｮｳｼ', '岐阜県', '郡上市'),
  ];
  const a = (code, name, level, parent) => ({ code, name, level, parent });
  const areas = {
    '01303': a('01303', '当別町', '6', '01000'),
    27140: a('27140', '堺市', '4', '27000'),
    27141: a('27141', '堺市堺区', '5', '27140'),
    27142: a('27142', '堺市中区', '5', '27140'),
    27143: a('27143', '堺市東区', '5', '27140'),
    21219: a('21219', '郡上市', '4', '21000'),
    99999: a('99999', 'ない市', '4', '99000'),
  };
  const y = buildYomi(rows, areas);
  assert.equal(y.munis['01303'], 'とうべつちょう');
  assert.equal(y.munis['27140'], 'さかいし');
  assert.equal(y.munis['21219'], 'ぐじょうし');
  assert.equal(y.munis['27141'], undefined, '政令市の区はさがす対象にしない');
  assert.equal(y.prefs['27'], 'おおさかふ');
  assert.deepEqual(y.missing, ['99999 ない市']);
});

// ページのさがすスクリプト（top.mjs）の変え方と並べ方
const { norm, score } = new Function(`${FIND_JS.match(/const norm=[^\n]*\nconst score=[^\n]*/)[0]};return {norm,score};`)();

test('ひらがな・カタカナ・漢字でさがせて、頭が合うものが先', () => {
  assert.equal(norm('サカイ'), 'さかい');
  assert.equal(norm('ｻｶｲ'), 'さかい');
  assert.equal(norm('堺 市'), '堺市');
  const sakai = ['堺市', '大阪府', '/osaka/sakai/', 'さかいし'];
  const misaki = ['岬町', '大阪府', '/osaka/#m27366', 'みさきちょう'];
  const nisako = ['ニセコ町', '北海道', '/hokkaido/#m01395', 'にせこちょう'];
  assert.equal(score(sakai, norm('さかい')), 2);
  assert.equal(score(sakai, norm('堺')), 2);
  assert.equal(score(misaki, norm('さき')), 1);
  assert.equal(score(misaki, norm('さかい')), 0);
  assert.equal(score(nisako, norm('ニセコ')), 2);
  assert.equal(score(['郡上市', '岐阜県', '/x/', ''], norm('ぐじょう')), 0, '読みがないときは漢字だけ');
});

const yomi = readYomi();
test('data/yomi.json：都道府県47・ページのある街・政令市の読み', { skip: !yomi && 'data/yomi.json がまだない（週1回の更新で作る）' }, () => {
  assert.equal(Object.keys(yomi.prefs).length, 47);
  for (const p of PREFS) assert.match(yomi.prefs[p.code], /^[ぁ-ゖー]+$/, p.name);
  const areas = readMunis().areas;
  const byName = new Map(Object.values(areas).filter((a) => a.level === '4' || a.level === '6').map((a) => [`${a.code.slice(0, 2)}${a.name}`, a.code]));
  for (const { pref, name } of CITIES) {
    const code = byName.get(`${PREFS.find((p) => p.slug === pref).code}${name}`);
    assert.ok(yomi.munis[code], `${name} の読みがない`);
  }
  // 照らし合わせ：政令市20（区の読みの共通の頭から作るので、ずれていないか）
  const seirei = { 札幌市: 'さっぽろし', 仙台市: 'せんだいし', さいたま市: 'さいたまし', 千葉市: 'ちばし', 横浜市: 'よこはまし', 川崎市: 'かわさきし', 相模原市: 'さがみはらし', 新潟市: 'にいがたし', 静岡市: 'しずおかし', 浜松市: 'はままつし', 名古屋市: 'なごやし', 京都市: 'きょうとし', 大阪市: 'おおさかし', 堺市: 'さかいし', 神戸市: 'こうべし', 岡山市: 'おかやまし', 広島市: 'ひろしまし', 北九州市: 'きたきゅうしゅうし', 福岡市: 'ふくおかし', 熊本市: 'くまもとし' };
  for (const [name, y] of Object.entries(seirei)) {
    const a = Object.values(areas).find((x) => x.level === '4' && x.name === name);
    assert.equal(yomi.munis[a.code], y, name);
  }
});
