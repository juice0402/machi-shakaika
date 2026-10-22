// data/*.yml を読む小さなYAMLの読み取り（npmの部品を使わないため、このリポジトリで使う形だけ）
// 読める形：マップ（key: 値）、リスト（- 値 / - key: 値）、字下げ（スペース）での入れ子、
//           値は 文字・数・true/false・null・"…"・'…'・[a, "b", 1] のような1行のリスト、行の # コメント
// 読めない形：複数行の文字（| >）、アンカー（& *）、{ } のマップ、タブの字下げ → エラーにする
// 日付（2026-10-22）は文字のまま返す

export function parseYaml(text) {
  const lines = [];
  text.split(/\r?\n/).forEach((raw, i) => {
    const no = i + 1;
    const lead = raw.match(/^[ \t]*/)[0];
    const body = stripComment(raw);
    if (body.trim() === '') return;
    if (lead.includes('\t')) throw new Error(`${no}行目：字下げにタブは使えません`);
    const t = body.trim();
    if (/(^-|:)\s*[|>][-+]?\d?$/.test(t)) throw new Error(`${no}行目：複数行の文字（| >）は使えません`);
    if (/^[&*]/.test(t) || /:\s*[&*]\w/.test(t)) throw new Error(`${no}行目：アンカー（& *）は使えません`);
    lines.push({ indent: lead.length, text: t, no });
  });

  let pos = 0;
  const isItem = (t) => t === '-' || t.startsWith('- ');

  function block(indent) {
    return isItem(lines[pos].text) ? list(indent) : map(indent);
  }

  function map(indent) {
    const obj = {};
    while (pos < lines.length && lines[pos].indent === indent && !isItem(lines[pos].text)) {
      const { text: t, no } = lines[pos];
      const kv = splitKey(t);
      if (!kv) throw new Error(`${no}行目：「key: 値」の形ではありません（${t}）`);
      const [key, rest] = kv;
      if (Object.hasOwn(obj, key)) throw new Error(`${no}行目：${key} が2回あります`);
      pos++;
      if (rest !== '') obj[key] = scalar(rest, no);
      else if (pos < lines.length && lines[pos].indent > indent) obj[key] = block(lines[pos].indent);
      else if (pos < lines.length && lines[pos].indent === indent && isItem(lines[pos].text)) obj[key] = list(indent);
      else obj[key] = null;
    }
    if (pos < lines.length && lines[pos].indent > indent) {
      throw new Error(`${lines[pos].no}行目：字下げがずれています`);
    }
    return obj;
  }

  function list(indent) {
    const arr = [];
    while (pos < lines.length && lines[pos].indent === indent && isItem(lines[pos].text)) {
      const line = lines[pos];
      const rest = line.text.slice(1).replace(/^ +/, '');
      if (rest === '') {
        pos++;
        arr.push(pos < lines.length && lines[pos].indent > indent ? block(lines[pos].indent) : null);
        continue;
      }
      if (splitKey(rest)) {
        // 「- key: 値」は、key の位置を字下げにしたマップとして読む
        const col = line.indent + (line.text.length - rest.length);
        lines[pos] = { indent: col, text: rest, no: line.no };
        arr.push(map(col));
        continue;
      }
      if (isItem(rest)) throw new Error(`${line.no}行目：1行に入れ子のリストは書けません`);
      pos++;
      arr.push(scalar(rest, line.no));
      if (pos < lines.length && lines[pos].indent > indent) {
        throw new Error(`${lines[pos].no}行目：字下げがずれています`);
      }
    }
    return arr;
  }

  if (lines.length === 0) return null;
  if (lines[0].indent !== 0) throw new Error(`${lines[0].no}行目：はじめの行は字下げしません`);
  const out = block(0);
  if (pos < lines.length) throw new Error(`${lines[pos].no}行目：字下げがずれています`);
  return out;
}

// 「key: 値」「key:」を分ける。key は英数字と _ . -（27140 のような数字も）
function splitKey(t) {
  const m = t.match(/^([A-Za-z0-9_][\w.-]*)\s*:(?:\s+(.*)|$)/);
  if (!m) return null;
  return [m[1], (m[2] ?? '').trim()];
}

// 引用符の外の「 #」から後ろを消す
function stripComment(s) {
  let q = null;
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      if (c === '\\' && q === '"') i++;
      else if (c === q) q = null;
    } else if (c === '"' || c === "'") q = c;
    else if (c === '#' && (i === 0 || /\s/.test(s[i - 1]))) return s.slice(0, i);
  }
  return s;
}

function scalar(s, no) {
  if (s.startsWith('[')) {
    if (!s.endsWith(']')) throw new Error(`${no}行目：[ ] が閉じていません`);
    const inner = s.slice(1, -1).trim();
    return inner === '' ? [] : splitTop(inner, no).map((x) => scalar(x.trim(), no));
  }
  if (s.startsWith('{')) throw new Error(`${no}行目：{ } のマップは使えません`);
  if (s.startsWith('"')) {
    if (!/"$/.test(s) || s.length < 2) throw new Error(`${no}行目：" が閉じていません`);
    try {
      return JSON.parse(s);
    } catch {
      throw new Error(`${no}行目：" の中の書き方がちがいます`);
    }
  }
  if (s.startsWith("'")) {
    if (!s.endsWith("'") || s.length < 2) throw new Error(`${no}行目：' が閉じていません`);
    return s.slice(1, -1).replaceAll("''", "'");
  }
  if (s === 'true') return true;
  if (s === 'false') return false;
  if (s === 'null' || s === '~') return null;
  if (/^-?(0|[1-9]\d*)(\.\d+)?$/.test(s)) return Number(s);
  return s;
}

function splitTop(s, no) {
  const out = [];
  let q = null;
  let cur = '';
  for (let i = 0; i < s.length; i++) {
    const c = s[i];
    if (q) {
      cur += c;
      if (c === '\\' && q === '"') cur += s[++i] ?? '';
      else if (c === q) q = null;
    } else if (c === '"' || c === "'") {
      q = c;
      cur += c;
    } else if (c === '[' || c === '{') throw new Error(`${no}行目：1行のリストの中に入れ子は書けません`);
    else if (c === ',') {
      out.push(cur);
      cur = '';
    } else cur += c;
  }
  if (q) throw new Error(`${no}行目：引用符が閉じていません`);
  out.push(cur);
  return out;
}
