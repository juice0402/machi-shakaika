// 期限メモの部品（ブラウザでも同じものを使う。関数の中身を toString でページに入れるので、
// ここの関数は引数と Math・Date・encodeURIComponent などだけを使い、外の変数・import を使わない。たがいに呼ぶのはよい）
//
// 1件：{ n: 名前, y: 2027, m: 3, d: 0（日なし）か 1〜31, q: 0（数なし）か 1〜999 }
//   日なし（年月だけ）の期限は、その月の末日までとして数える
// URL の形（# のあと＝フラグメント。ブラウザはサーバーに送らない）：k1_2703.w.6_280115.-%E9%9B%BB%E6%B1%A0
//   k1 は版。1件ずつ _ でつなぎ、件の中は . で「期限.名前.数」
//   期限は YYMM か YYMMDD（2000年代）。名前は items.yml の記号（英小文字1字）か、- のあとに名前を %xx にしたもの
//   数は1〜999（なければ書かない）。読めない件は飛ばして数える（ページは落とさない）
// C：えらべる品目 [[記号, 名前, ...], ...]

// m 月（1〜12）の末日
export function kMonthEnd(y, m) {
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

// 1970-01-01 からの日数（日付どうしの引き算に使う）
export function kDay(y, m, d) {
  return Date.UTC(y, m - 1, d) / 86400000;
}

// 期限の日（日なしは月末）
export function kDue(e) {
  return [e.y, e.m, e.d || kMonthEnd(e.y, e.m)];
}

export function kKey(e) {
  const t = kDue(e);
  return kDay(t[0], t[1], t[2]);
}

// 期限の近い順（同じ日は名前・数の順）
export function kSort(list) {
  return list.slice().sort((a, b) => kKey(a) - kKey(b) || (a.n < b.n ? -1 : a.n > b.n ? 1 : 0) || a.q - b.q);
}

// 名前：制御文字を外し、空白を1つにして、20文字まで
export function kName(s) {
  return [...String(s ?? '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim()].slice(0, 20).join('').trim();
}

// URL に入れる名前（. と _ も %xx にする）
export function kEnc(s) {
  return encodeURIComponent(s).replace(/[-_.!~*'()]/g, (c) => '%' + c.charCodeAt(0).toString(16).toUpperCase());
}

// 状態 → URL の文字（# はつけない。空なら ''）
export function kStr(list, C) {
  const code = {};
  C.forEach((c) => (code[c[1]] = c[0]));
  const p2 = (v) => (v < 10 ? '0' : '') + v;
  const out = kSort(list).map((e) => [p2(e.y % 100) + p2(e.m) + (e.d ? p2(e.d) : ''), code[e.n] || '-' + kEnc(e.n)].concat(e.q ? [e.q] : []).join('.'));
  return out.length ? 'k1_' + out.join('_') : '';
}

// URL の文字 → 状態。{ ok: 読めたか, list, bad: 読めなかった件の数 }。どんな文字でも投げない
export function kRead(s, C) {
  s = String(s ?? '').replace(/^#/, '');
  if (!s) return { ok: true, list: [], bad: 0 };
  const m = /^k(\d+)(?:_([\s\S]*))?$/.exec(s);
  if (!m || m[1] !== '1') return { ok: false, list: [], bad: 0 };
  const name = {};
  C.forEach((c) => (name[c[0]] = c[1]));
  const parts = m[2] ? m[2].split('_') : [];
  const list = [];
  let bad = Math.max(0, parts.length - 50);
  for (const t of parts.slice(0, 50)) {
    const f = t.split('.');
    const dm = /^(\d\d)(\d\d)(\d\d)?$/.exec(f[0] || '');
    let n = '';
    if (f[1] && name[f[1]]) n = name[f[1]];
    else if (f[1] && f[1][0] === '-') {
      try {
        n = kName(decodeURIComponent(f[1].slice(1)));
      } catch (e) {
        n = '';
      }
    }
    const q = f[2] == null ? 0 : /^[1-9]\d{0,2}$/.test(f[2]) ? +f[2] : -1;
    const y = dm ? 2000 + +dm[1] : 0;
    const mo = dm ? +dm[2] : 0;
    const d = dm && dm[3] ? +dm[3] : 0;
    if (!dm || !n || q < 0 || f.length > 3 || mo < 1 || mo > 12 || (dm[3] && (d < 1 || d > kMonthEnd(y, mo)))) {
      bad++;
      continue;
    }
    list.push({ n, y, m: mo, d, q });
  }
  return { ok: true, list: kSort(list), bad };
}

export function kDate(e) {
  return e.y + '年' + e.m + '月' + (e.d ? e.d + '日' : '');
}

// 今日 t = [年, 月, 日] から見た残り。text は「あと5か月」など、frac は1年を1とした目盛りの長さ
export function kLeft(e, t) {
  const due = kDue(e);
  const days = kDay(due[0], due[1], due[2]) - kDay(t[0], t[1], t[2]);
  let mo = (e.y - t[0]) * 12 + (e.m - t[1]);
  let text = null;
  if (days < 0) text = 'すぎています';
  else if (!e.d) {
    if (mo === 0) text = '今月まで';
  } else if (days === 0) text = '今日まで';
  else if (days < 31) text = 'あと' + days + '日';
  else if (e.d < t[2]) mo--;
  if (text == null) {
    mo = Math.max(1, mo);
    text = 'あと' + (mo >= 12 ? Math.floor(mo / 12) + '年' + (mo % 12 ? (mo % 12) + 'か月' : '') : mo + 'か月');
  }
  return { days, text, frac: Math.max(0, Math.min(1, days / 365)) };
}

// UID 用の短い指紋（FNV-1a）
export function kHash(s) {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h.toString(36);
}

// .ics の文字（RFC 5545 3.3.11）
export function kEsc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

// 75オクテットで折り返す（UTF-8 の1文字を分けない。続きの行は空白1つから）
export function kFold(line) {
  let out = '';
  let n = 0;
  for (const ch of line) {
    const cp = ch.codePointAt(0);
    const b = cp < 0x80 ? 1 : cp < 0x800 ? 2 : cp < 0x10000 ? 3 : 4;
    if (n + b > 75) {
      out += '\r\n ';
      n = 1;
    }
    out += ch;
    n += b;
  }
  return out;
}

// カレンダーの予定（.ics）。期限ごとに終日の予定「（品目）の期限」、通知は before 日前の朝9時
// o = { now: Date, url: 続きのURL, before: 30 }
export function kIcs(list, o) {
  const ymd = (day) => new Date(day * 86400000).toISOString().slice(0, 10).replace(/-/g, '');
  const stamp = o.now.toISOString().replace(/[-:]/g, '').replace(/\.\d+/, '');
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//machi-shakaika.com//kigen-memo//JA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  const seen = {};
  kSort(list).forEach((e) => {
    const day = kKey(e);
    const id = ymd(day) + '-' + kHash(e.n);
    seen[id] = (seen[id] || 0) + 1;
    const title = e.n + 'の期限';
    L.push(
      'BEGIN:VEVENT',
      'UID:' + id + '-' + seen[id] + '@machi-shakaika.com',
      'DTSTAMP:' + stamp,
      'DTSTART;VALUE=DATE:' + ymd(day),
      'DTEND;VALUE=DATE:' + ymd(day + 1),
      'SUMMARY:' + kEsc(title),
      'DESCRIPTION:' + kEsc('期限 ' + kDate(e) + (e.q ? '・数 ' + e.q : '') + (o.url ? '\n期限メモ ' + o.url : '')),
      'TRANSP:TRANSPARENT',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      'DESCRIPTION:' + kEsc(title),
      'TRIGGER:-P' + (o.before - 1) + 'DT15H',
      'END:VALARM',
      'END:VEVENT',
    );
  });
  L.push('END:VCALENDAR');
  return L.map(kFold).join('\r\n') + '\r\n';
}

// 文字で書き出す（コピーして残す・送る）
export function kText(list, t, url) {
  return ['期限メモ（' + t[0] + '年' + t[1] + '月' + t[2] + '日）']
    .concat(
      kSort(list).map((e) => e.n + (e.q ? ' ×' + e.q : '') + '　' + kDate(e) + '（' + kLeft(e, t).text + '）'),
      url ? ['続き ' + url] : [],
    )
    .join('\n');
}

export const KIGEN_FUNCS = [kMonthEnd, kDay, kDue, kKey, kSort, kName, kEnc, kStr, kRead, kDate, kLeft, kHash, kEsc, kFold, kIcs, kText];
export const KIGEN_JS = KIGEN_FUNCS.map((f) => f.toString()).join('\n');
