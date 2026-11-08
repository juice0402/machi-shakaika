// 地の文の数え方（11/8 AdSense のやり直し。scripts/honbun.mjs の jinobunCount）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { jinobunCount, pageKind, jinobunMeyasu } from '../scripts/honbun.mjs';

const S = 'この街では、ひとり暮らしの世帯が県より多く、共同住宅に住む世帯も多めです。'; // 数える字 35
const n = [...S].filter((c) => /[\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Han}ーA-Za-z0-9]/u.test(c)).length;

test('地の文：p の文だけを数える', () => {
  assert.equal(jinobunCount(`<main><p>${S}</p></main>`), n);
});

test('地の文：表・見出し・出典・パンくず・クイズ・短い札は数えない', () => {
  const html = `<main><p class="crumb">トップ / 大阪府</p><h2>${S}</h2><table><tr><td>${S}</td></tr></table>
<p class="src">出典：${S}</p><p class="qq">${S}</p><p class="ex" hidden>${S}</p><p>指定避難所 26</p><p>${S}<cite>「題」</cite></p></main>`;
  assert.equal(jinobunCount(html), n);
});

test('地の文：li はリンクの字を除き、p を含む li は二重に数えない', () => {
  assert.equal(jinobunCount(`<main><ul><li><a href="/x/">${S}</a></li><li><p>${S}</p></li></ul></main>`), n);
});

test('ページのまとまり', () => {
  assert.equal(pageKind('/'), 'top');
  assert.equal(pageKind('/osaka/'), 'pref');
  assert.equal(pageKind('/osaka/sakai/'), 'city');
  assert.equal(pageKind('/sonae/minaoshi/'), 'sonae');
});

test('地の文のめやす', () => {
  assert.equal(jinobunMeyasu('/osaka/sakai/'), 700);
  assert.equal(jinobunMeyasu('/osaka/'), 600);
  assert.equal(jinobunMeyasu('/sonae/minaoshi/'), 900);
  assert.equal(jinobunMeyasu('/sonae/'), 600);
  assert.equal(jinobunMeyasu('/hinmoku/mizu/'), 900);
  assert.equal(jinobunMeyasu('/quiz/kyou/'), null);
  assert.equal(jinobunMeyasu('/dougu/karte/'), null);
});
