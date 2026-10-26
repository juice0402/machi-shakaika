// 出典・外部リンクの点検：どのリンクを点検するか集める・結果の書き方（ネットにつながない部分）
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, writeFileSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { normalizeUrl, findLine, collectLinks, describeWhere, buildReport, annotationLines, countKinds } from '../src/lib/links.mjs';
import { parseYaml } from '../src/lib/yaml.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

// 一時の作業場に、ファイルを置く
function fixture(files) {
  const dir = mkdtempSync(join(tmpdir(), 'links-'));
  for (const [p, text] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, p)), { recursive: true });
    writeFileSync(join(dir, p), text);
  }
  return dir;
}
const withFixture = (files, fn) => {
  const dir = fixture(files);
  try {
    return fn(dir);
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
};

test('URL をそろえる：& をもどす・# を落とす・自分のサイト・楽天・広告・API は点検しない', () => {
  assert.equal(normalizeUrl('https://a.go.jp/x?p=1&amp;q=2#top'), 'https://a.go.jp/x?p=1&q=2');
  assert.equal(normalizeUrl(' http://a.go.jp/ '), 'http://a.go.jp/');
  for (const u of [
    'https://machi-shakaika.com/about/',
    'https://www.machi-shakaika.com/',
    'https://machi-shakaika.pages.dev/x',
    'https://item.rakuten.co.jp/shop/1/',
    'https://developers.rakuten.com/',
    'https://hb.afl.rakuten.co.jp/ichiba/x/',
    'https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js',
    'https://api.e-stat.go.jp/rest/3.0/app/json',
    'mailto:a@b.jp',
    'ftp://a.jp/x',
    'not a url',
    '',
  ]) {
    assert.equal(normalizeUrl(u), null, u);
  }
  // 名前が似ているだけの別のサイトは点検する
  assert.ok(normalizeUrl('https://notrakuten.co.jp/'));
  assert.ok(normalizeUrl('https://machi-shakaika.com.example.jp/'));
});

test('データの中の url の行を探す（注記を行につけるため）', () => {
  const text = 'sources:\n  - id: a\n    url: https://a.jp/x\n    checked: 2026-10-26\n  - id: b\n    url: https://b.jp/y\n';
  assert.equal(findLine(text, 'https://a.jp/x'), 3);
  assert.equal(findLine(text, 'https://b.jp/y'), 6);
  assert.equal(findLine(text, 'https://c.jp/'), null);
  assert.equal(findLine('about: 見てください https://a.jp/x\n', 'https://a.jp/x'), null, 'url: の行だけ');
});

test('実データ：data/sources.yml の url は全部、点検の対象に入る', () => {
  const src = parseYaml(readFileSync(join(root, 'data/sources.yml'), 'utf8')).sources;
  const { links } = collectLinks({ root, dist: null });
  const got = new Map(links.map((l) => [l.url, l]));
  let n = 0;
  for (const s of src.filter((x) => x.url)) {
    const u = normalizeUrl(s.url);
    if (!u) continue; // 自分のサイト・楽天などは対象外
    n++;
    const l = got.get(u);
    assert.ok(l, `${s.id} の url が点検の対象にない`);
    assert.ok(l.wheres.some((w) => w.label === `出典 ${s.id}` && w.file === 'data/sources.yml' && w.line > 0), `${s.id} の出どころ（行つき）`);
  }
  assert.ok(n >= 30, `出典の url が少なすぎる（${n}）`);
});

test('実データ：集めたリンクは https か http で、自分のサイト・楽天をふくまず、出どころがある', () => {
  const { links } = collectLinks({ root, dist: null });
  assert.ok(links.length >= 30);
  const seen = new Set();
  for (const l of links) {
    assert.match(l.url, /^https?:\/\//);
    assert.ok(!/machi-shakaika|rakuten|googlesyndication/.test(new URL(l.url).host), l.url);
    assert.ok(!l.url.includes('#'), l.url);
    assert.ok(l.wheres.length > 0, l.url);
    assert.ok(!seen.has(l.url), `${l.url} が2回ある`);
    seen.add(l.url);
  }
});

test('data/bichiku.yml：あれば url を点検の対象にし、なければとばす', () => {
  const bichiku = `cities:
  - city: hokkaido/sapporo
    publisher: 札幌市
    title: 札幌市の備蓄
    url: https://www.city.sapporo.jp/kikikanri/bichiku.html
    checked: 2026-10-26
  - city: tokyo/ota
    publisher: 大田区
    title: 大田区の備蓄
    url: https://www.city.ota.tokyo.jp/saigai.html#bichiku
    checked: 2026-10-26
`;
  withFixture({ 'data/sources.yml': 'sources:\n  - id: a\n    url: https://a.go.jp/x\n    checked: 2026-10-26\n', 'data/bichiku.yml': bichiku }, (dir) => {
    const { links, notes } = collectLinks({ root: dir, dist: null });
    const b = links.find((l) => l.url === 'https://www.city.sapporo.jp/kikikanri/bichiku.html');
    assert.equal(b.title, '札幌市の備蓄');
    assert.deepEqual(b.wheres, [{ kind: 'bichiku', label: '備蓄 hokkaido/sapporo', file: 'data/bichiku.yml', line: 5 }]);
    assert.ok(links.some((l) => l.url === 'https://www.city.ota.tokyo.jp/saigai.html'), '# から後ろは落とす');
    assert.ok(links.some((l) => l.url === 'https://a.go.jp/x'));
    assert.equal(notes.filter((n) => n.includes('bichiku')).length, 0);
  });
  withFixture({ 'data/sources.yml': 'sources:\n  - id: a\n    url: https://a.go.jp/x\n    checked: 2026-10-26\n' }, (dir) => {
    const { links } = collectLinks({ root: dir, dist: null });
    assert.deepEqual(links.map((l) => l.url), ['https://a.go.jp/x']);
  });
  // 読めないファイルでも止まらず、注記に出す
  withFixture({ 'data/sources.yml': 'sources:\n  - id: a\n    url: https://a.go.jp/x\n', 'data/bichiku.yml': 'cities:\n\t- city: x\n' }, (dir) => {
    const { links, notes } = collectLinks({ root: dir, dist: null });
    assert.equal(links.length, 1);
    assert.ok(notes.some((n) => n.includes('data/bichiku.yml を読めなかった')));
  });
});

test('同じ URL は1つにまとめ、出どころを足す', () => {
  withFixture(
    {
      'data/sources.yml': 'sources:\n  - id: gsi\n    title: 国土地理院の題\n    url: https://www.gsi.go.jp/x.html\n    checked: 2026-10-26\n',
      'data/bichiku.yml': 'cities:\n  - city: a/b\n    title: 町の題\n    url: https://www.gsi.go.jp/x.html\n    checked: 2026-10-26\n',
    },
    (dir) => {
      const { links } = collectLinks({ root: dir, dist: null });
      assert.equal(links.length, 1);
      assert.equal(links[0].title, '国土地理院の題', '先に読んだ題を使う');
      assert.deepEqual(links[0].wheres.map((w) => w.label), ['出典 gsi', '備蓄 a/b']);
    },
  );
});

test('src/ のコードに直接書いた href を拾う（${ } で組み立てるものと、href でない文字列は拾わない）', () => {
  const code = [
    'export const BAR = \'<p><a href="https://www.jma.go.jp/bosai/">気象庁</a></p>\';',
    'const t = `<a href="https://www.e-stat.go.jp/dbview?sid=${id}">表</a>`;',
    'const api = "https://api.e-stat.go.jp/rest/3.0/app/json";',
    'const own = \'<a href="https://machi-shakaika.com/about/">このサイト</a>\';',
    'const zip = "https://www.post.japanpost.jp/x/ken_all.zip";',
  ].join('\n');
  withFixture({ 'data/sources.yml': 'sources: []\n', 'src/sub/a.mjs': code }, (dir) => {
    const { links, hasDist } = collectLinks({ root: dir, dist: null });
    assert.deepEqual(links.map((l) => l.url), ['https://www.jma.go.jp/bosai/']);
    assert.deepEqual(links[0].wheres, [{ kind: 'src', label: 'src/sub/a.mjs' }]);
    assert.equal(hasDist, false);
  });
});

test('dist/ の <a href> を拾う（canonical・script・img は拾わない。ページごとの出どころ）', () => {
  const page = (body) => `<!doctype html><html><head><link rel="canonical" href="https://machi-shakaika.com/x/"><script async src="https://pagead2.googlesyndication.com/a.js"></script></head><body>${body}</body></html>`;
  withFixture(
    {
      'data/sources.yml': 'sources: []\n',
      'dist/index.html': page('<a href="https://www.jma.go.jp/bosai/">気象庁</a><img src="https://img.example.jp/a.png">'),
      'dist/aichi/nagoya/index.html': page('<a class="x" href="https://disaportal.gsi.go.jp/" rel="noopener"><b>ハザード</b>\n マップ</a><a href="https://www.jma.go.jp/bosai/">気象庁</a>'),
      'dist/about/index.html': page('<a href="https://www.e-stat.go.jp/dbview?sid=1&amp;x=2#a">表</a><a href="https://machi-shakaika.com/">自分</a><a href="/relative/">相対</a>'),
      'dist/404.html': page('<a href="https://www.jma.go.jp/bosai/">気象庁</a>'),
    },
    (dir) => {
      const { links, notes, hasDist } = collectLinks({ root: dir });
      assert.equal(hasDist, true);
      assert.deepEqual(notes, []);
      assert.deepEqual(links.map((l) => l.url).sort(), ['https://disaportal.gsi.go.jp/', 'https://www.e-stat.go.jp/dbview?sid=1&x=2', 'https://www.jma.go.jp/bosai/']);
      const jma = links.find((l) => l.url.includes('jma'));
      assert.deepEqual(jma.wheres.map((w) => w.label).sort(), ['/', '/404.html', '/aichi/nagoya/']);
      assert.equal(links.find((l) => l.url.includes('disaportal')).title, 'ハザード マップ');
    },
  );
});

test('dist/ がないときは、注記に出して src の直書きだけ見る', () => {
  withFixture({ 'data/sources.yml': 'sources: []\n' }, (dir) => {
    const { notes, hasDist } = collectLinks({ root: dir });
    assert.equal(hasDist, false);
    assert.ok(notes.some((n) => n.includes('dist/ がない')));
  });
});

test('出どころの書き方：ページは2つまで、あとは数', () => {
  const pages = ['/a/', '/b/', '/c/', '/d/'].map((label) => ({ kind: 'page', label }));
  assert.equal(describeWhere([{ kind: 'sources', label: '出典 x' }, { kind: 'src', label: 'src/layout.mjs' }, ...pages]), '出典 x・src/layout.mjs・ページ /a/ /b/ ほか2ページ');
  assert.equal(describeWhere(pages.slice(0, 2)), 'ページ /a/ /b/');
  assert.equal(describeWhere([{ kind: 'bichiku', label: '備蓄 a/b' }]), '備蓄 a/b');
});

const R = (url, kind, reason, extra = {}) => ({ url, kind, reason, title: null, wheres: [{ kind: 'sources', label: '出典 x', file: 'data/sources.yml', line: 7 }], ...extra });

test('Markdown の報告：消えたものを先に、断られたものは別。なければ見出しを出さない', () => {
  const results = [
    R('https://a.jp/ok', 'alive', '開けた'),
    R('https://b.jp/gone(1)', 'gone', 'ページがない（404）', { title: '題[1]' }),
    R('https://c.jp/x', 'refused', '断られた（403）'),
  ];
  const md = buildReport(results, { notes: ['dist/ がない'] });
  const lines = md.split('\n');
  assert.equal(lines[0], '出典・外部リンク 3件を点検しました：生きている 1・断られた 1・消えた 1');
  assert.ok(md.includes('注：dist/ がない'));
  assert.ok(md.indexOf('### 消えたリンク（1件）') < md.indexOf('### 断られた・つながらなかったリンク（1件）'));
  assert.ok(md.includes('- [題\\[1\\]](https://b.jp/gone%281%29)（出典 x）：ページがない（404）'));
  assert.ok(md.includes('- [c.jp/x](https://c.jp/x)（出典 x）：断られた（403）'), '題がなければ短い URL');
  assert.ok(md.includes('消えたとは限りません'));
  assert.ok(buildReport(results, { date: '2026-10-26' }).startsWith('2026-10-26 に出典・外部リンク 3件を点検しました'));
  const clean = buildReport([R('https://a.jp/ok', 'alive', '開けた')]);
  assert.ok(!clean.includes('###'));
  assert.deepEqual(countKinds(results), { total: 3, alive: 1, refused: 1, gone: 1 });
});

test('注記（annotation）：消えたものは warning でファイルと行つき、断られたものは notice、まとめは必ず1行', () => {
  const results = [R('https://b.jp/gone', 'gone', 'ページがない（404）'), R('https://c.jp/x', 'refused', '断られた（403）'), R('https://a.jp/', 'alive', '開けた')];
  const lines = annotationLines(results);
  assert.deepEqual(lines, [
    '::warning file=data/sources.yml,line=7,title=消えたリンク::ページがない（404）：https://b.jp/gone（出典 x）',
    '::notice title=リンクの点検::3件：生きている 1・断られた 1・消えた 1',
    '::notice file=data/sources.yml,line=7,title=断られたリンク::断られた（403）：https://c.jp/x（出典 x）',
  ]);
  // 行がわからない（ページのリンク）ときは file をつけない。% と改行はよける
  const page = R('https://d.jp/a?x=100%', 'gone', 'ページがない\n（404）', { wheres: [{ kind: 'page', label: '/x/' }] });
  assert.equal(annotationLines([page])[0], '::warning title=消えたリンク::ページがない%0A（404）：https://d.jp/a?x=100%25（ページ /x/）');
});

test('注記：10件をこえたら最後の1つを「ほか N件」にして、数をこえない', () => {
  const gone = Array.from({ length: 13 }, (_, i) => R(`https://g${i}.jp/`, 'gone', 'ページがない（404）'));
  const refused = Array.from({ length: 12 }, (_, i) => R(`https://r${i}.jp/`, 'refused', '断られた（403）'));
  const lines = annotationLines([...gone, ...refused]);
  const w = lines.filter((l) => l.startsWith('::warning'));
  const n = lines.filter((l) => l.startsWith('::notice'));
  assert.equal(w.length, 10);
  assert.ok(w[9].endsWith('::ほか4件は画面の要約を見てください'));
  assert.equal(n.length, 10, 'まとめ1＋断られた9');
  assert.ok(n.at(-1).endsWith('::ほか4件は画面の要約を見てください'));
  assert.ok(lines.length <= 20);
});

test('ワークフロー：週1回の時刻が update.yml・deploy.yml とかさならず、PR は data/bichiku.yml とページのコードで動く', () => {
  const read = (n) => readFileSync(join(root, '.github/workflows', n), 'utf8');
  const cron = (t) => [...t.matchAll(/^\s*- cron: '([^']+)'/gm)].map((m) => m[1]);
  const mine = cron(read('check-links.yml'));
  assert.equal(mine.length, 1);
  assert.match(mine[0], /^\d+ \d+ \* \* \d$/, '週1回（曜日が1つ）');
  for (const other of ['update.yml', 'deploy.yml']) assert.ok(!cron(read(other)).includes(mine[0]), `${other} と同じ時刻`);
  const yml = read('check-links.yml');
  const paths = yml.match(/pull_request:\s*\n\s*paths:\s*\n((?:\s+- .+\n)+)/)?.[1] ?? '';
  for (const p of ['data/sources.yml', 'data/bichiku.yml', 'src/**', 'scripts/check-links.mjs']) assert.ok(paths.includes(`'${p}'`), `paths に ${p}`);
  assert.ok(!/pull_request_target/.test(yml));
  // PR では Issue を立てない
  assert.ok(/github\.event_name != 'pull_request'/.test(yml));
});
