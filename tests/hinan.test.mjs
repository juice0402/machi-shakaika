import { test } from 'node:test';
import assert from 'node:assert/strict';
import { muniCode, countBasho, countHinanjo, readHistory } from '../src/lib/hinan.mjs';
import { parseCsv } from '../src/lib/csv.mjs';

// 2026-10-22 に確かめた全国CSVの見出しと同じ形（行は作った例）
const BASHO = `NO,共通ID,都道府県名及び市町村名,施設・場所名,住所,洪水,"崖崩れ、土石流及び地滑り",高潮,地震,津波,大規模な火事,内水氾濫,火山現象,指定避難所との住所同一,緯度,経度,備考
1,E2714000001202,大阪府堺市,A小学校,大阪府堺市堺区1,1,1,,1,,1,,,1,34.5,135.4,
2,E2714000002202,大阪府堺市,B公園,大阪府堺市北区2,,,,1,,1,,,,34.5,135.5,
3,E0110000001202,北海道札幌市,C中学校,北海道札幌市厚別区3,1,1,,1,,1,,,1,43.0,141.4,
`;
const HINANJO = `NO,共通ID,都道府県名及び市町村名,施設・場所名,住所,指定緊急避難場所との住所同一,その他市町村長が必要と認める事項,受入対象者,緯度,経度,備考
1,E2714000001111,大阪府堺市,A小学校,大阪府堺市堺区1,1,,,34.5,135.4,
2,E2714000003111,大阪府堺市,C会館,大阪府堺市南区3,,,,34.4,135.5,
`;

test('共通IDから市区町村コード', () => {
  assert.equal(muniCode('E0110000001202'), '01100');
  assert.equal(muniCode('E2714000001111'), '27140');
  assert.equal(muniCode('x'), null);
});

test('指定緊急避難場所を市区町村ごと・災害の種類ごとに数える', () => {
  const m = countBasho(parseCsv(BASHO));
  assert.equal(m.get('27140').total, 2);
  assert.equal(m.get('27140').kinds.jishin, 2);
  assert.equal(m.get('27140').kinds.kouzui, 1);
  assert.equal(m.get('27140').kinds.dosha, 1);
  assert.equal(m.get('27140').kinds.tsunami, 0);
  assert.equal(m.get('01100').name, '北海道札幌市');
});

test('指定避難所を市区町村ごとに数える', () => {
  assert.equal(countHinanjo(parseCsv(HINANJO)).get('27140').total, 2);
});

test('列がちがうときは止める', () => {
  assert.throws(() => countBasho(parseCsv('NO,ID\n1,2\n')), /列がちがう/);
});

test('公開・更新情報の一覧', () => {
  const h = readHistory(parseCsv('27140,大阪府堺市,2017-03-16,2026-09-08,,\n01234,北海道どこか町,,,9,データ未登録\n'));
  assert.equal(h.get('27140').updated, '2026-09-08');
  assert.equal(h.get('01234').note, 'データ未登録');
});
