// data/*.yml を読んで形を確かめる（ビルドとテストの両方で使う）
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { parseYaml } from './lib/yaml.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
export const readYaml = (name) => parseYaml(readFileSync(`${root}data/${name}`, 'utf8'));

const DATE = /^\d{4}-\d{2}-\d{2}$/;
const KINDS = new Set(['sonae', 'estat', 'hinan', 'rule', 'shogo']);

// 出典台帳。問題があれば文のリストを返す（空なら OK）
export function checkSources(src) {
  const errors = [];
  const ids = new Set();
  for (const s of src?.sources ?? []) {
    const at = s?.id ?? '(id なし)';
    if (!s?.id || !/^[a-z0-9-]+$/.test(s.id)) errors.push(`${at}: id は英小文字・数字・- だけ`);
    if (ids.has(s.id)) errors.push(`${at}: id が2回あります`);
    ids.add(s.id);
    if (!KINDS.has(s.kind)) errors.push(`${at}: kind がちがいます（${s.kind}）`);
    if (!s.publisher) errors.push(`${at}: publisher がありません`);
    if (!s.about) errors.push(`${at}: about がありません`);
    if (s.url != null && !/^https:\/\/[^\s]+$/.test(s.url)) errors.push(`${at}: url は https で`);
    if (s.url != null && !DATE.test(String(s.checked))) errors.push(`${at}: url があるのに checked（確かめた日）がありません`);
    if (s.checked != null && !DATE.test(String(s.checked))) errors.push(`${at}: checked は 2026-10-22 の形で`);
  }
  if (ids.size === 0) errors.push('出典が1つもありません');
  return errors;
}

// 備えの数字。出典 id が台帳にあるか、計算に使う数字がそろっているか
export function checkItems(items, src) {
  const errors = [];
  const ids = new Set((src?.sources ?? []).map((s) => s.id));
  const srcOk = (list, at) => {
    for (const id of list ?? []) if (!ids.has(id)) errors.push(`${at}: 出典 ${id} が sources.yml にありません`);
  };
  const d = items?.days;
  if (!(d?.min > 0 && d?.better >= d?.min)) errors.push('days: min と better がおかしい');
  if (!Array.isArray(d?.choices) || !d.choices.includes(d.min) || !d.choices.includes(d.better)) {
    errors.push('days.choices に min と better を入れる');
  }
  srcOk(d?.sources, 'days');
  if (!d?.sources?.length) errors.push('days: 出典がありません');
  if (!(items?.yohairyo_days > 0)) errors.push('yohairyo_days がありません');
  srcOk(items?.yohairyo_sources, 'yohairyo');
  const seen = new Set();
  for (const it of items?.items ?? []) {
    const at = it?.id ?? '(id なし)';
    if (!it?.id || seen.has(it.id)) errors.push(`${at}: id がないか2回あります`);
    seen.add(it.id);
    if (!it.name || !it.unit) errors.push(`${at}: name と unit が要ります`);
    srcOk(it.sources, at);
    if (it.calc) {
      if (!(typeof it.per_day === 'number' && it.per_day > 0)) errors.push(`${at}: 計算に使うのに per_day がありません`);
      if (!it.sources?.length) errors.push(`${at}: 計算に使うのに出典がありません`);
    } else if (it.per_day != null) errors.push(`${at}: calc: false なら per_day は null`);
    if (it.hinmoku) {
      if (!it.page) errors.push(`${at}: 品目ページの名前（page）がありません`);
      if (!it.sources?.length) errors.push(`${at}: 品目ページに出典がありません`);
      if (!it.calc && !it.example_qty && !it.page_note) errors.push(`${at}: 品目ページに出す量のめやす（example_qty か page_note）がありません`);
      const sh = it.shop;
      if (!Array.isArray(sh?.keywords) || !sh.keywords.length || !Array.isArray(sh?.must) || !sh.must.length) errors.push(`${at}: shop の keywords と must がありません`);
    }
  }
  if (seen.size === 0) errors.push('品目が1つもありません');
  // チェックリスト：品目を指すか、名前と出典があるか
  const lists = new Set();
  for (const cl of items?.checklists ?? []) {
    const at = `チェックリスト ${cl?.id ?? '(id なし)'}`;
    if (!cl?.id || lists.has(cl.id) || !/^[a-z0-9-]+$/.test(cl.id)) errors.push(`${at}: id がないか2回あります`);
    lists.add(cl?.id);
    if (!cl?.name) errors.push(`${at}: name がありません`);
    if (!cl?.entries?.length) errors.push(`${at}: entries がありません`);
    const names = new Set();
    for (const e of cl?.entries ?? []) {
      const it = e?.item ? (items.items ?? []).find((x) => x.id === e.item) : null;
      const name = e?.name ?? it?.name;
      if (e?.item && !it) errors.push(`${at}: 品目 ${e.item} が items にありません`);
      if (!name) errors.push(`${at}: name がありません`);
      if (names.has(name)) errors.push(`${at}: ${name} が2回あります`);
      names.add(name);
      srcOk(e?.sources, `${at} ${name}`);
      if (!(e?.sources?.length || it?.sources?.length)) errors.push(`${at} ${name}: 出典がありません`);
    }
  }
  return errors;
}

// チェックリストの1行を、品目の情報とあわせて読む
export function checkEntries(items, cl) {
  return cl.entries.map((e) => {
    const it = e.item ? items.items.find((x) => x.id === e.item) : null;
    return {
      key: `${cl.id}:${e.name ?? it.name}`,
      name: e.name ?? it.name,
      sub: e.sub ?? null,
      item: it,
      qty: Boolean(it?.calc) && e.qty !== false,
      sources: [...new Set([...(e.sources ?? []), ...(it?.sources ?? [])])],
    };
  });
}

// 照らし合わせ用の公式の数字
export function checkShogo(shogo, src) {
  const errors = [];
  const ids = new Set((src?.sources ?? []).map((s) => s.id));
  for (const c of shogo?.checks ?? []) {
    const at = `${c?.name ?? '?'} ${c?.what ?? '?'}`;
    if (!/^\d{5}$/.test(String(c?.area))) errors.push(`${at}: area は5けたの市区町村コード（"27140" のように引用符で）`);
    if (typeof c?.value !== 'number') errors.push(`${at}: value は数`);
    if (!ids.has(c?.source)) errors.push(`${at}: 出典 ${c?.source} が sources.yml にありません`);
  }
  return errors;
}

// 1世帯の平均人数などから必要な量（端数は四捨五入して「約」をつける前の値）
export function needAmount(item, people, days) {
  if (!item?.calc) return null;
  return item.per_day * people * days;
}
