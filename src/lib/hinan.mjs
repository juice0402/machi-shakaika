// 国土地理院「指定緊急避難場所・指定避難所データ」の全国CSVを、市区町村ごとの数にまとめる
// 全国CSV（2026-10-22 に確かめた形。UTF-8 BOM付き）
//   指定緊急避難場所：defaultFtpData/csv/mergeFromCity_2.csv（災害の種類ごとに 1 か空）
//   指定避難所　　　：defaultFtpData/csv/mergeFromCity_1.csv
//   市区町村ごとの公開日・最終更新日：defaultFtpData/publicHistoryCSV/publicHistoryListData.csv（ヘッダーなし）
// 市区町村コードは「共通ID」の E のあとの5けた（E0110000001202 → 01100 札幌市）。政令市は市でまとまっている

export const HINAN_BASE = 'https://hinanmap.gsi.go.jp/hinanjocp/defaultFtpData';
export const HINAN_FILES = {
  basho: `${HINAN_BASE}/csv/mergeFromCity_2.csv`,
  hinanjo: `${HINAN_BASE}/csv/mergeFromCity_1.csv`,
  history: `${HINAN_BASE}/publicHistoryCSV/publicHistoryListData.csv`,
};

// 災害の種類（列の名前の目印 → このサイトでの呼び名）
export const DISASTERS = [
  ['kouzui', /^洪水$/, '洪水'],
  ['dosha', /崖崩れ/, '土砂災害'],
  ['takashio', /^高潮$/, '高潮'],
  ['jishin', /^地震$/, '地震'],
  ['tsunami', /^津波$/, '津波'],
  ['kaji', /大規模な火事/, '大規模な火事'],
  ['naisui', /^内水氾濫$/, '内水氾濫'],
  ['kazan', /^火山現象$/, '火山'],
];

export const muniCode = (id) => /^E(\d{5})/.exec(String(id ?? '').trim())?.[1] ?? null;

const col = (head, re) => head.findIndex((h) => re.test(String(h).trim()));

// 指定緊急避難場所の全国CSV（行の配列）→ Map(code → { name, total, kinds: { kouzui: n, ... } })
export function countBasho(rows) {
  const head = rows[0] ?? [];
  const iId = col(head, /^共通ID$/);
  const iName = col(head, /都道府県名及び市町村名/);
  const kinds = DISASTERS.map(([key, re]) => [key, col(head, re)]);
  if (iId < 0 || iName < 0 || kinds.some(([, i]) => i < 0)) throw new Error(`指定緊急避難場所のCSVの列がちがう：${head.join(',')}`);
  const out = new Map();
  for (const r of rows.slice(1)) {
    const code = muniCode(r[iId]);
    if (!code) continue;
    const m = out.get(code) ?? { name: r[iName], total: 0, kinds: Object.fromEntries(DISASTERS.map(([k]) => [k, 0])) };
    m.total++;
    for (const [key, i] of kinds) if (String(r[i] ?? '').trim() === '1') m.kinds[key]++;
    out.set(code, m);
  }
  return out;
}

// 指定避難所の全国CSV → Map(code → { name, total })
export function countHinanjo(rows) {
  const head = rows[0] ?? [];
  const iId = col(head, /^共通ID$/);
  const iName = col(head, /都道府県名及び市町村名/);
  if (iId < 0 || iName < 0) throw new Error(`指定避難所のCSVの列がちがう：${head.join(',')}`);
  const out = new Map();
  for (const r of rows.slice(1)) {
    const code = muniCode(r[iId]);
    if (!code) continue;
    const m = out.get(code) ?? { name: r[iName], total: 0 };
    m.total++;
    out.set(code, m);
  }
  return out;
}

// 公開・更新情報（ヘッダーなし：コード・名前・公開日・最終更新日・特記のコード・特記）→ Map(code → {...})
export function readHistory(rows) {
  const out = new Map();
  for (const r of rows) {
    if (!/^\d{5}$/.test(r[0] ?? '')) continue;
    out.set(r[0], { name: r[1], opened: r[2] || null, updated: r[3] || null, noteCode: r[4] || null, note: r[5] || null });
  }
  return out;
}
