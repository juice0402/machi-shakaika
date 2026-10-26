// 出典・外部リンクの点検で使う、ネットにつながない部分：どのリンクを点検するか集める・結果の書き方
// つなぐ部分は linkcheck.mjs、動かすのは scripts/check-links.mjs（週1回と、データ・ページのコードを変えた PR）
//
// 点検の対象
//   data/sources.yml の url（全部）・data/bichiku.yml があればその url（自治体の備蓄の公表ページ）
//   ページに出ている外部リンク：ビルドした dist/ の <a href>（e-Stat の統計表のように、コードで組み立てるものも入る）
//   src/ のコードに直接書いた href="https://…"（災害時モードの帯など、いまの dist に出ていないものも入る）
// 点検しない：自分のサイト（machi-shakaika.com・pages.dev）・楽天・広告・API の呼び出し先
import { readFileSync, readdirSync, existsSync } from 'node:fs';
import { join, relative, sep } from 'node:path';
import { parseYaml } from './yaml.mjs';

const SKIP_HOSTS = [
  /(^|\.)machi-shakaika\.com$/,
  /(^|\.)pages\.dev$/,
  /(^|\.)rakuten\.(co\.jp|com|net)$/,
  /(^|\.)googlesyndication\.com$/,
  /(^|\.)doubleclick\.net$/,
  /^api\.e-stat\.go\.jp$/,
];

const decode = (s) =>
  s.replace(/&(amp|lt|gt|quot|#39|#x27);/g, (_, n) => ({ amp: '&', lt: '<', gt: '>', quot: '"', '#39': "'", '#x27': "'" })[n]);

// 点検する形の URL にそろえる（# から後ろは落とす）。点検しないもの・URL でないものは null
export function normalizeUrl(raw) {
  let u;
  try {
    u = new URL(decode(String(raw).trim()));
  } catch {
    return null;
  }
  if (u.protocol !== 'https:' && u.protocol !== 'http:') return null;
  if (SKIP_HOSTS.some((re) => re.test(u.hostname))) return null;
  u.hash = '';
  return u.href;
}

// データのファイルの中で、その URL が書いてある行（1から数える）。注記を行につけるため
export function findLine(text, url) {
  const i = text.split(/\r?\n/).findIndex((l) => /^\s*(-\s*)?url:/.test(l) && l.includes(url));
  return i < 0 ? null : i + 1;
}

const walk = (dir, ext) => {
  const out = [];
  if (!existsSync(dir)) return out;
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) out.push(...walk(p, ext));
    else if (e.name.endsWith(ext)) out.push(p);
  }
  return out.sort();
};

const pagePath = (dist, file) => {
  const rel = relative(dist, file).split(sep).join('/');
  return rel === 'index.html' ? '/' : rel.endsWith('/index.html') ? `/${rel.slice(0, -'index.html'.length)}` : `/${rel}`;
};

// 点検するリンクを集める。links は URL ごとに1つ（title・出どころ wheres をまとめる）
export function collectLinks({ root, dist = join(root, 'dist') }) {
  const map = new Map();
  const notes = [];
  const add = (raw, title, where) => {
    const url = normalizeUrl(raw);
    if (!url) return;
    const e = map.get(url) ?? map.set(url, { url, title: null, wheres: [] }).get(url);
    if (title && !e.title) e.title = title;
    if (!e.wheres.some((w) => w.label === where.label)) e.wheres.push(where);
  };

  // data/ の出典台帳と、自治体の備蓄のページ
  const fromYaml = (name, key, label, titleOf) => {
    const path = join(root, 'data', name);
    if (!existsSync(path)) return false;
    const text = readFileSync(path, 'utf8');
    let rows;
    try {
      rows = parseYaml(text)?.[key] ?? [];
    } catch (e) {
      notes.push(`data/${name} を読めなかったので、その中のリンクは見ていません（${e.message}）`);
      return true;
    }
    for (const r of rows) {
      if (!r?.url) continue;
      add(r.url, r.title, { kind: name.replace(/\.yml$/, ''), label: label(r), file: `data/${name}`, line: findLine(text, r.url) });
    }
    return true;
  };
  fromYaml('sources.yml', 'sources', (r) => `出典 ${r.id}`);
  fromYaml('bichiku.yml', 'cities', (r) => `備蓄 ${r.city}`); // B が作るファイル。なければとばす

  // src/ のコードに直接書いた href="https://…"（${ } で組み立てるものは dist のほうで拾う）
  for (const f of walk(join(root, 'src'), '.mjs')) {
    const text = readFileSync(f, 'utf8');
    for (const m of text.matchAll(/href="(https?:\/\/[^"$]+)"/g)) {
      const rel = relative(root, f).split(sep).join('/');
      add(m[1], null, { kind: 'src', label: rel });
    }
  }

  // ビルドした全ページの <a href>
  const files = dist ? walk(dist, '.html') : [];
  if (files.length === 0) {
    notes.push('dist/ がないので、ページに出ているリンクは src の直書きだけ見ました（ビルドしてから動かすと全ページを見ます）');
  }
  for (const f of files) {
    const html = readFileSync(f, 'utf8');
    const page = pagePath(dist, f);
    for (const m of html.matchAll(/<a\b[^>]*?\bhref="(https?:\/\/[^"]+)"[^>]*>([\s\S]*?)<\/a>/g)) {
      const text = decode(m[2].replace(/<[^>]+>/g, '')).replace(/\s+/g, ' ').trim();
      add(m[1], text.slice(0, 40), { kind: 'page', label: page });
    }
  }
  return { links: [...map.values()], notes, hasDist: files.length > 0 };
}

// ---------- 結果の書き方 ----------

// 出どころを短く。ページは2つまで出して、あとは数だけ
export function describeWhere(wheres) {
  const other = wheres.filter((w) => w.kind !== 'page').map((w) => w.label);
  const pages = wheres.filter((w) => w.kind === 'page').map((w) => w.label);
  const out = [...new Set(other)];
  if (pages.length) out.push(`ページ ${pages.slice(0, 2).join(' ')}${pages.length > 2 ? ` ほか${pages.length - 2}ページ` : ''}`);
  return out.join('・');
}

const shortUrl = (url) => {
  const u = new URL(url);
  const s = `${u.host}${u.pathname === '/' ? '' : u.pathname}`;
  return s.length > 50 ? `${s.slice(0, 49)}…` : s;
};
const linkText = (r) => String(r.title || shortUrl(r.url)).replace(/([\\[\]])/g, '\\$1');
const linkHref = (url) => url.replace(/\(/g, '%28').replace(/\)/g, '%29');

export const countKinds = (results) => ({
  total: results.length,
  alive: results.filter((r) => r.kind === 'alive').length,
  refused: results.filter((r) => r.kind === 'refused').length,
  gone: results.filter((r) => r.kind === 'gone').length,
});

// Issue と画面（step summary）に出す Markdown。消えたものを先に
export function buildReport(results, { notes = [], date = null } = {}) {
  const c = countKinds(results);
  const line = (r) => `- [${linkText(r)}](${linkHref(r.url)})（${describeWhere(r.wheres)}）：${r.reason}`;
  const out = [`${date ? `${date} に` : ''}出典・外部リンク ${c.total}件を点検しました：生きている ${c.alive}・断られた ${c.refused}・消えた ${c.gone}`];
  for (const n of notes) out.push(`\n注：${n}`);
  const gone = results.filter((r) => r.kind === 'gone');
  if (gone.length) {
    out.push(
      `\n### 消えたリンク（${gone.length}件）\n同じ発行元の新しいページに差しかえてください（data/sources.yml・data/bichiku.yml・ページのコード）。\n${gone.map(line).join('\n')}`,
    );
  }
  const refused = results.filter((r) => r.kind === 'refused');
  if (refused.length) {
    out.push(
      `\n### 断られた・つながらなかったリンク（${refused.length}件）\n消えたとは限りません。ブラウザで開けるか確かめてください。\n${refused.map(line).join('\n')}`,
    );
  }
  return `${out.join('\n')}\n`;
}

// GitHub Actions の注記（annotation）の文字のよけ方
const escData = (s) => String(s).replace(/%/g, '%25').replace(/\r/g, '%0D').replace(/\n/g, '%0A');
const escProp = (s) => escData(s).replace(/:/g, '%3A').replace(/,/g, '%2C');

// 注記の行。1ステップで見える数に上限があるので（warning・notice とも10）、あふれたら最後の1つを「ほか N件」にする
export function annotationLines(results, { max = 10, notes = [] } = {}) {
  const c = countKinds(results);
  const one = (level, title, r) => {
    const w = r.wheres.find((x) => x.file && x.line);
    const props = [w ? `file=${escProp(w.file)},line=${w.line}` : null, `title=${escProp(title)}`].filter(Boolean).join(',');
    return `::${level} ${props}::${escData(`${r.reason}：${r.url}（${describeWhere(r.wheres)}）`)}`;
  };
  const cap = (level, title, list, room) => {
    const lines = list.slice(0, room).map((r) => one(level, title, r));
    if (list.length > room) lines[room - 1] = `::${level} title=${escProp(title)}::${escData(`ほか${list.length - room + 1}件は画面の要約を見てください`)}`;
    return lines;
  };
  const gone = results.filter((r) => r.kind === 'gone');
  const refused = results.filter((r) => r.kind === 'refused');
  return [
    ...cap('warning', '消えたリンク', gone, max),
    `::notice title=${escProp('リンクの点検')}::${escData(`${c.total}件：生きている ${c.alive}・断られた ${c.refused}・消えた ${c.gone}${notes.length ? `（${notes[0]}）` : ''}`)}`,
    ...cap('notice', '断られたリンク', refused, max - 1),
  ];
}
