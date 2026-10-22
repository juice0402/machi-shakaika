// data/estat/munis.json（全国・都道府県・市区町村の国勢調査の数字）の読み書きと点検
// 形：{ survey, published, statName, fields: [...], areas: { "27140": [名前, レベル, 親, 値...] } }（1地域1行）
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

const root = fileURLToPath(new URL('../', import.meta.url));
export const MUNIS_PATH = 'data/estat/munis.json';
export const FIELDS = [
  'pop', 'male', 'female', 'pop2020', 'popChange', 'popChangeRate', 'hh2020', 'menseki', 'density',
  'hh', 'ippan', 'perHh', 'age014', 'age1564', 'age65', 'age75', 'single', 'with65', 'single65',
  'housed', 'ikkodate', 'nagaya', 'kyodo',
];

export function writeMunis({ survey, published, statName, areas }, path = MUNIS_PATH) {
  const codes = Object.keys(areas).sort();
  const lines = codes.map((c) => {
    const a = areas[c];
    return `  ${JSON.stringify(c)}: ${JSON.stringify([a.name, a.level, a.parent ?? null, ...FIELDS.map((f) => a[f] ?? null)])}`;
  });
  const head = JSON.stringify({ survey, published, statName, fields: FIELDS }).slice(0, -1);
  writeFileSync(path, `${head},"areas":{\n${lines.join(',\n')}\n}}\n`);
}

export function readMunis(path = `${root}${MUNIS_PATH}`) {
  if (!existsSync(path)) return null;
  const j = JSON.parse(readFileSync(path, 'utf8'));
  const areas = {};
  for (const [code, row] of Object.entries(j.areas)) {
    const [name, level, parent, ...vals] = row;
    const a = { code, name, level, parent };
    j.fields.forEach((f, i) => (a[f] = vals[i]));
    areas[code] = a;
  }
  return { survey: j.survey, published: j.published, statName: j.statName, areas };
}

// 公式の数字との照らし合わせと、形の点検。問題があれば文のリスト
const SHOGO_FIELD = {
  人口: 'pop',
  '人口（男）': 'male',
  '人口（女）': 'female',
  '2020年の人口': 'pop2020',
  世帯数: 'hh',
  一般世帯数: 'ippan',
  一般世帯の1世帯当たり人員: 'perHh',
  '0〜14歳': 'age014',
  '15〜64歳': 'age1564',
  '65歳以上': 'age65',
  '単独世帯（一般世帯）': 'single',
  '65歳以上世帯員のいる一般世帯': 'with65',
  '65歳以上世帯員のいる一般世帯のうち単独世帯': 'single65',
};
export function checkMunis(m, shogo) {
  const errors = [];
  const areas = m?.areas ?? {};
  const codes = Object.keys(areas);
  const munis = codes.filter((c) => areas[c].level === '4' || areas[c].level === '6');
  if (!areas['00000']) errors.push('全国の行がない');
  if (codes.filter((c) => areas[c].level === '2').length !== 47) errors.push('都道府県が47でない');
  if (munis.length < 1700) errors.push(`市区町村が ${munis.length}（1700より少ない）`);
  const noPop = munis.filter((c) => !(areas[c].pop > 0));
  if (noPop.length) errors.push(`人口がない市区町村 ${noPop.length}：${noPop.slice(0, 5).join(' ')}`);
  for (const c of shogo?.checks ?? []) {
    const f = SHOGO_FIELD[c.what];
    if (!f) {
      errors.push(`照らし合わせ：「${c.what}」に当たる項目がない`);
      continue;
    }
    const v = areas[String(c.area)]?.[f];
    const ok = c.digits ? v != null && Math.round(v * 10 ** c.digits) / 10 ** c.digits === c.value : v === c.value;
    if (!ok) errors.push(`照らし合わせ：${c.name} ${c.what} 公式 ${c.value}・e-Stat ${v}`);
  }
  return errors;
}
