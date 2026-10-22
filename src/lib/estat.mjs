// e-Stat API（3.0版・JSON）の呼び出しと、返ってきた形の読み取り
// アプリケーションIDは環境変数 ESTAT_APP_ID からだけ読む。URL（IDが入る）はログ・ファイル・エラーの文に出さない
// 呼び出しの間を1秒あける（API機能利用規約 第8条：短時間の大量アクセスをしない）

const BASE = 'https://api.e-stat.go.jp/rest/3.0/app/json';
const WAIT_MS = 1000;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
export let callCount = 0;

export async function estat(name, params = {}, appId = process.env.ESTAT_APP_ID) {
  if (!appId) throw new Error('ESTAT_APP_ID がありません（GitHub の Secrets に入れる）');
  const u = new URL(`${BASE}/${name}`);
  u.searchParams.set('appId', appId);
  for (const [k, v] of Object.entries(params)) if (v != null && v !== '') u.searchParams.set(k, String(v));
  let res;
  let err;
  for (let i = 0; i < 3; i++) {
    const wait = last + WAIT_MS - Date.now();
    if (wait > 0) await sleep(wait);
    last = Date.now();
    callCount++;
    try {
      res = await fetch(u, { signal: AbortSignal.timeout(90_000) });
      if (res.ok) break;
      err = `HTTP ${res.status}`;
    } catch (e) {
      err = e?.name === 'TimeoutError' ? 'タイムアウト' : 'つながらない';
    }
    res = null;
    await sleep(5000 * (i + 1));
  }
  if (!res) throw new Error(`e-Stat ${name}：${err}`);
  const json = await res.json();
  const root = Object.values(json)[0];
  const st = Number(root?.RESULT?.STATUS);
  // 0：正常、1：正常（データなし）、2：正常（一部のデータなし）。100以上はエラー
  if (![0, 1, 2].includes(st)) throw new Error(`e-Stat ${name}：STATUS ${st} ${text(root?.RESULT?.ERROR_MSG)}`);
  return root;
}

export const arr = (x) => (x == null ? [] : Array.isArray(x) ? x : [x]);
export const text = (x) => (x == null ? '' : typeof x === 'object' ? String(x.$ ?? '') : String(x));

// 統計表情報（getStatsList の TABLE_INF・getMetaInfo の TABLE_INF）を読みやすい形に
export function tableInfo(t) {
  const title = t.TITLE;
  const spec = t.STATISTICS_NAME_SPEC ?? {};
  return {
    id: t['@id'],
    statName: text(t.STAT_NAME),
    statisticsName: text(t.STATISTICS_NAME),
    tabulation: [spec.TABULATION_CATEGORY, spec.TABULATION_SUB_CATEGORY1, spec.TABULATION_SUB_CATEGORY2, spec.TABULATION_SUB_CATEGORY3]
      .map(text)
      .filter(Boolean)
      .join(' / '),
    no: typeof title === 'object' ? text(title['@no']) : '',
    title: text(title),
    tableName: text(t.TITLE_SPEC?.TABLE_NAME),
    cycle: text(t.CYCLE),
    surveyDate: text(t.SURVEY_DATE),
    openDate: text(t.OPEN_DATE),
    updatedDate: text(t.UPDATED_DATE),
    collectArea: text(t.COLLECT_AREA),
    smallArea: text(t.SMALL_AREA),
    total: Number(t.OVERALL_TOTAL_NUMBER ?? 0),
  };
}

// CLASS_INF → { area: { id, name, codes: Map(code → { name, level, parent, unit }) }, ... }
export function classMap(classInf) {
  const out = {};
  for (const obj of arr(classInf?.CLASS_OBJ)) {
    const codes = new Map();
    for (const c of arr(obj.CLASS)) {
      codes.set(String(c['@code']), {
        name: String(c['@name'] ?? ''),
        level: c['@level'] == null ? null : String(c['@level']),
        parent: c['@parentCode'] == null ? null : String(c['@parentCode']),
        unit: c['@unit'] == null ? null : String(c['@unit']),
      });
    }
    out[obj['@id']] = { id: obj['@id'], name: String(obj['@name'] ?? ''), codes };
  }
  return out;
}

// getStatsData の値を1行ずつ。{ keys: { tab, cat01, area, time, ... }, unit, raw, value }
// raw は元の文字（"-" "***" "X" などの記号もそのまま）、value は数にできたときだけ数
export function readValues(root) {
  const rows = [];
  for (const v of arr(root?.STATISTICAL_DATA?.DATA_INF?.VALUE)) {
    const keys = {};
    for (const [k, x] of Object.entries(v)) if (k.startsWith('@') && k !== '@unit') keys[k.slice(1)] = String(x);
    const raw = String(v.$ ?? '');
    const n = Number(raw.replaceAll(',', ''));
    rows.push({ keys, unit: v['@unit'] ?? null, raw, value: raw !== '' && Number.isFinite(n) ? n : null });
  }
  return rows;
}

// 行に名前をつける（"人口 / 総数 / 堺市 / 2025年" のように）
export function rowLabel(row, classes, skip = []) {
  return Object.entries(row.keys)
    .filter(([k]) => !skip.includes(k))
    .map(([k, code]) => classes?.[k]?.codes.get(code)?.name ?? `${k}=${code}`)
    .join(' / ');
}
