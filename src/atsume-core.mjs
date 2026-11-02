// 街あつめ帳（/atsume/）の記録：クイズで問題に出た街に、はんこを押す（#42 案1「地図に色がたまる」）
// 記録はこの端末の localStorage（キー machi-atsume）だけ。どこにも送らない
// 記録 A：{ m: { 市区町村コード: はじめて押した日 }, p: { 県コード: はじめて押した日 }, d: [遊んだ日（古い順・400日まで）], l: いちばん最近押した県コード }
//   コードが5けたなら街のはんこ、2けたなら県のはんこ（都道府県の問題に出た県。1,741 には数えない）
//   正解かどうかは問わず、問題に出た街すべてに押す。街のページを開いただけ・カードを作っただけでは押さない
// ブラウザでも同じものを使う（toString でページに入れる。引数と組みこみの関数・localStorage だけを使う）

export const ATSUME_KEY = 'machi-atsume';
export const ATSUME_DAYS = 400;

// 記録 A に codes のはんこを日付 day で押す（はじめての所だけ日付を入れる）。新しく押した数を返す
export function atsumeAdd(A, codes, day) {
  if (!A.m || typeof A.m !== 'object') A.m = {};
  if (!A.p || typeof A.p !== 'object') A.p = {};
  if (!Array.isArray(A.d)) A.d = [];
  let n = 0;
  let last = '';
  for (const c of codes) {
    const s = String(c ?? '');
    const box = /^\d{5}$/.test(s) ? A.m : /^\d{2}$/.test(s) ? A.p : null;
    if (!box) continue;
    if (!box[s] || box[s] > day) {
      if (!box[s]) n++;
      box[s] = day;
    }
    last = s.slice(0, 2);
  }
  if (!last) return 0;
  A.l = last;
  if (!A.d.includes(day)) {
    A.d.push(day);
    A.d.sort();
    if (A.d.length > 400) A.d = A.d.slice(-400);
  }
  return n;
}

// 続けた日数：今日まで（今日がまだなら、きのうまで）毎日遊んだ日の数
export function atsumeStreak(days, today) {
  const set = new Set(days || []);
  const prev = (d) => new Date(Date.parse(d + 'T00:00:00Z') - 864e5).toISOString().slice(0, 10);
  let d = set.has(today) ? today : prev(today);
  let s = 0;
  while (set.has(d)) {
    s++;
    d = prev(d);
  }
  return s;
}

// 記録を読む（こわれていたら空から）
export function atsumeLoad() {
  try {
    const A = JSON.parse(localStorage.getItem('machi-atsume') || '{}');
    return A && typeof A === 'object' && !Array.isArray(A) ? A : {};
  } catch (e) {
    return {};
  }
}

// クイズで答えたあとに呼ぶ：問題に出た街（と県）のコードに、日本時間の今日の日付ではんこを押して保存する
export function atsume(codes) {
  const day = new Date(Date.now() + 9 * 3600e3).toISOString().slice(0, 10);
  const A = atsumeLoad();
  const n = atsumeAdd(A, codes, day);
  try {
    localStorage.setItem('machi-atsume', JSON.stringify(A));
  } catch (e) {}
  return n;
}

export const ATSUME_JS = [atsumeAdd, atsumeStreak, atsumeLoad, atsume].map((f) => f.toString()).join('\n');
