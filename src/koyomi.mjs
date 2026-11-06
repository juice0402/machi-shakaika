// 備えのごよみ（data/koyomi.yml）：1年を24の期間に分け、日付（日本時間）から今の期間をえらぶ。文の数字は items.yml から差しこむ
//   ビルドは毎朝動くので、その日の期間でページを作る（ブラウザの JS は使わない）
//   「いまの備え」の1行はトップ・品目ページ（今の品目だけ）・期限メモ（期限の見直しの期間だけ）・/koyomi/ に出す。災害時モードでは出さない
import { esc, HAN } from './layout.mjs';
import { kEsc, kFold } from './kigen-core.mjs';
import { SITE } from './site.mjs';

export const KOYOMI_TEXT_MAX = 60;
export const KOYOMI_NG = ['しましょう', 'ぜひ', '便利', '簡単', '安心', 'おすすめ', 'お得', 'ポイント', 'コツ', '最安値', '定価', '今すぐ', '手遅れ', '——', '—'];
const MD = /^(0[1-9]|1[0-2])-(0[1-9]|[12]\d|3[01])$/;

// 差しこむ数字：{名前} → items.yml の数字の文
export function koyomiVars(items) {
  const by = Object.fromEntries(items.items.map((it) => [it.id, it]));
  const per = (id, u = by[id].unit) => `1人1日${by[id].per_day}${u}`;
  const g = by.gas;
  return {
    mizu: per('mizu'),
    shushoku: per('shushoku'),
    toilet: per('keitai-toilet'),
    gas: `${g.example_text}${g.example_qty}${g.unit}`,
    min: `${items.days.min}日分`,
    better: `${items.days.better}日分`,
  };
}

export function koyomiFill(text, vars) {
  return String(text).replace(/\{(\w+)\}/g, (x, k) => {
    if (!(k in vars)) throw new Error(`koyomi.yml：{${k}} は差しこめません`);
    return vars[k];
  });
}

// 月日だけをのぞいて、数字が残っていないか（数字は items.yml から差しこむ）
export const koyomiRawDigits = (text) => /[0-9０-９]/.test(String(text).replace(/\d{1,2}月(\d{1,2}日)?|\d{1,2}\/\d{1,2}/g, ''));

export function checkKoyomi(k, items, sources) {
  const errors = [];
  const P = k?.periods;
  if (!Array.isArray(P) || P.length !== 24) return ['koyomi.yml：periods は24期間'];
  const hin = new Set(items.items.filter((it) => it.hinmoku).map((it) => it.id));
  const ids = new Set(sources.sources.map((s) => s.id));
  const vars = koyomiVars(items);
  P.forEach((p, i) => {
    const at = `koyomi.yml の ${i + 1} 番め（${p?.from}）`;
    if (!MD.test(String(p?.from)) || !MD.test(String(p?.to)) || p.from > p.to) errors.push(`${at}：from・to は 'MM-DD' で from ≦ to`);
    if (i > 0 && P[i - 1].to >= p.from) errors.push(`${at}：前の期間と重なっています`);
    if (!p?.theme) errors.push(`${at}：theme がありません`);
    if (!hin.has(p?.item)) errors.push(`${at}：item ${p?.item} は items.yml の hinmoku: true の品目に`);
    if (!Array.isArray(p?.links) || p.links.some((l) => !/^\/[a-z0-9/-]*\/$/.test(l))) errors.push(`${at}：links はサイトの中のパスのリスト`);
    if (!Array.isArray(p?.sources) || !p.sources.length) errors.push(`${at}：sources がありません`);
    for (const id of p?.sources ?? []) if (!ids.has(id)) errors.push(`${at}：出典 ${id} が sources.yml にありません`);
    if (koyomiRawDigits(p?.text)) errors.push(`${at}：text に数字を直接書かない（{mizu} などで差しこむ）`);
    let t = '';
    try {
      t = koyomiFill(p?.text ?? '', vars);
    } catch (e) {
      errors.push(`${at}：${e.message}`);
    }
    if ([...t].length > KOYOMI_TEXT_MAX) errors.push(`${at}：text が${[...t].length}字（${KOYOMI_TEXT_MAX}字まで）`);
    for (const w of KOYOMI_NG) if (t.includes(w) || String(p?.theme).includes(w)) errors.push(`${at}：「${w}」は使わない`);
  });
  return errors;
}

// 'YYYY-MM-DD'（日本時間の日付）の期間
export function koyomiPick(periods, iso) {
  const md = iso.slice(5, 10);
  return periods.find((p) => p.from <= md && md <= p.to) ?? null;
}

// 期間の表の文字（2月の終わりは「末」）
export const koyomiSpan = (p) => {
  const d = (md, end) => `${Number(md.slice(0, 2))}/${end && md === '02-29' ? '末' : Number(md.slice(3))}`;
  return `${d(p.from)}〜${d(p.to, true)}`;
};

// 「いまの備え」の1行。o.item：品目ページへのリンク・o.koyomi：/koyomi/ へのリンク
export function koyomiLine(p, items, o = {}) {
  if (!p) return '';
  const it = items.items.find((x) => x.id === p.item);
  const text = koyomiFill(p.text, koyomiVars(items));
  const links = [o.item !== false ? `<a href="/hinmoku/${it.id}/">${esc(it.page)}</a>` : '', o.koyomi !== false ? '<a href="/koyomi/">備えのごよみ</a>' : ''].filter(Boolean);
  return `<p class="ima"><span class="imh">いま${HAN}</span><span class="imt">${esc(p.theme)}</span>${esc(text)}。${links.length ? `<br>${links.join('・')}` : ''}</p>`;
}

export const KOYOMI_ICS_PATH = '/koyomi/koyomi.ics';

// カレンダーの購読（.ics）：year と次の年の48期間を、始まりの日の終日の予定に。通知（VALARM）は入れない
//   DTSTAMP はビルドした日（同じ日なら同じ中身）
export function koyomiIcs(periods, items, year, today) {
  const vars = koyomiVars(items);
  const stamp = `${today.replace(/-/g, '')}T000000Z`;
  const next = (y, md) => {
    const t = new Date(Date.UTC(y, Number(md.slice(0, 2)) - 1, Number(md.slice(3)) + 1));
    return t.toISOString().slice(0, 10).replace(/-/g, '');
  };
  const L = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//machi-shakaika.com//koyomi//JA', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH', `X-WR-CALNAME:${kEsc('備えのごよみ（まちの社会科）')}`, 'X-WR-TIMEZONE:Asia/Tokyo', 'REFRESH-INTERVAL;VALUE=DURATION:P1D', 'X-PUBLISHED-TTL:P1D'];
  for (const y of [year, year + 1]) {
    for (const p of periods) {
      const it = items.items.find((x) => x.id === p.item);
      L.push(
        'BEGIN:VEVENT',
        `UID:koyomi-${y}-${p.from}@machi-shakaika.com`,
        `DTSTAMP:${stamp}`,
        `DTSTART;VALUE=DATE:${y}${p.from.replace('-', '')}`,
        `DTEND;VALUE=DATE:${next(y, p.from)}`,
        `SUMMARY:${kEsc(`いまの備え：${p.theme}`)}`,
        `DESCRIPTION:${kEsc(`${koyomiFill(p.text, vars)}。\n${it.page} ${SITE.url}/hinmoku/${it.id}/\n備えのごよみ ${SITE.url}/koyomi/`)}`,
        `URL:${SITE.url}/hinmoku/${it.id}/`,
        'TRANSP:TRANSPARENT',
        'END:VEVENT',
      );
    }
  }
  L.push('END:VCALENDAR');
  return L.map(kFold).join('\r\n') + '\r\n';
}

// 1行の見た目（全ページ共通の CSS に足す）：左に朱のはんこ「いま」、右にテーマと文
export const KOYOMI_CSS = `.ima{position:relative;margin:8px 0;padding:6px 0 8px 56px;min-height:52px;border-bottom:1px dotted var(--line);font-size:14px;line-height:1.6}
.ima .imh{position:absolute;left:4px;top:6px;width:44px;height:44px;display:flex;align-items:center;justify-content:center;font:700 14px/1 "Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif;color:var(--accent)}
.ima .han{position:absolute;inset:0;border:2px solid var(--accent);border-radius:50%;box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3px var(--accent);transform:rotate(-8deg);pointer-events:none}
.ima .imt{display:block;font-weight:700;font-size:15px}`;
