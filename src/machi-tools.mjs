// 街の道具（10/27 #17）：似てる街さがし・2つの街をくらべる のデータと、100人の村
//   使う数字は国勢調査だけ（人口・年齢の割合・5年の人口の増減・ひとり暮らし・共同住宅）。家賃は使わない
//   「似ている」は数字の近さで、住みやすさではない。避難場所の数はくらべない
import { muniList } from './stats.mjs';
import { PREFS } from './areas.mjs';
import { mtStats } from './machi-core.mjs';
import { esc } from './layout.mjs';

const x10 = (v) => (Number.isFinite(v) ? Math.round(v * 10) : 0);

// /kurabe/kazu.json（machi-core.mjs の K の形）。似ている街の計算も、ページを作るときにこれを使う（ブラウザと同じ答えになるように）
export function kazuData(areas, urlOf) {
  const r = muniList(areas)
    .sort((a, b) => b.pop - a.pop || (a.code < b.code ? -1 : 1))
    .map((a) => [a.code, a.name, urlOf(a.code) ?? 0, a.pop, x10(a.p014), x10(a.p65), x10(a.rate), x10(a.pSingle), x10(a.pKyodo)]);
  return { s: mtStats(r), p: Object.fromEntries(PREFS.map((p) => [p.code, p.name])), r };
}

// 最大剰余法：合計が total になるように丸める（同じ余りなら前のもの）
export function largestRemainder(vals, total = 100) {
  const sum = vals.reduce((s, v) => s + v, 0);
  if (!(sum > 0)) return vals.map(() => 0);
  const raw = vals.map((v) => (v / sum) * total);
  const fl = raw.map(Math.floor);
  const rest = total - fl.reduce((s, v) => s + v, 0);
  const order = raw.map((v, i) => [v - fl[i], i]).sort((p, q) => q[0] - p[0] || p[1] - q[1]);
  for (let k = 0; k < rest; k++) fl[order[k][1]]++;
  return fl;
}

// 100人の村：子ども（15歳未満）・働く世代（15〜64歳）・お年寄り（65歳以上）と、そのうちのひとり暮らしの人
//   ひとり暮らしの人＝単独世帯の数（1世帯1人）。65歳以上のひとり暮らしはお年寄りに、ほかは働く世代に入れる
//   5つに分けて最大剰余法で丸めるので、合計はいつも100
export function village(a) {
  const old = a.age65 ?? 0;
  const kidsN = a.age014 ?? 0;
  const workN = a.age1564 ?? 0;
  const s65 = Math.max(0, Math.min(a.single65 ?? 0, old));
  const sU = Math.max(0, Math.min((a.single ?? 0) - s65, workN));
  const parts = largestRemainder([kidsN, workN - sU, sU, s65, old - s65]);
  const [kids, work, workAlone, oldAlone, oldRest] = parts;
  return { kids, work: work + workAlone, old: oldAlone + oldRest, alone: workAlone + oldAlone, parts };
}

const C = 30; // 1マスの大きさ
const GROUPS = [
  ['vk', '#2f7fb0', 'rotate(45)', 3.6],
  ['vw', '#3f7d4e', 'rotate(-45)', 3.6],
  ['vo', '#7a5a2e', 'rotate(0)', 3.2],
];
// えんぴつの塗り（線を重ねた模様）。人の形は使わない
const PATTERNS = GROUPS.map(([id, c, rot, gap]) => `<pattern id="${id}" width="${gap}" height="${gap}" patternUnits="userSpaceOnUse" patternTransform="${rot}"><line x1="0" y1="0" x2="0" y2="${gap}" stroke="${c}" stroke-width="1.7" stroke-linecap="round"/></pattern>`).join('');

// 方眼紙の10×10マス（1マス＝1人）。左上から 子ども → 働く世代 → ひとり暮らし（働く世代・お年寄り）→ お年寄り
export function villageSvg(v, label) {
  const [kids, work, workAlone, oldAlone, oldRest] = v.parts;
  const seq = [
    ...Array(kids).fill(0),
    ...Array(work).fill(1),
    ...Array(workAlone).fill(1),
    ...Array(oldAlone).fill(2),
    ...Array(oldRest).fill(2),
  ];
  const aloneFrom = kids + work;
  const aloneTo = aloneFrom + workAlone + oldAlone;
  const rects = [];
  for (let y = 0; y < 10; y++) {
    let x = 0;
    while (x < 10) {
      const g = seq[y * 10 + x];
      let e = x;
      while (e + 1 < 10 && seq[y * 10 + e + 1] === g) e++;
      rects.push(`<rect x="${x * C}" y="${y * C}" width="${(e - x + 1) * C}" height="${C}" fill="url(#${GROUPS[g][0]})"/>`);
      x = e + 1;
    }
  }
  let marks = '';
  for (let i = aloneFrom; i < aloneTo; i++) {
    const x = (i % 10) * C;
    const y = Math.floor(i / 10) * C;
    marks += `M${x + 7} ${y + 23}L${x + 23} ${y + 7}`;
  }
  let grid = '';
  for (let i = 1; i < 10; i++) grid += `M${i * C} 0V300M0 ${i * C}H300`;
  return `<svg class="vil" viewBox="-1 -1 302 302" role="img" aria-label="${label}"><defs>${PATTERNS}</defs><rect width="300" height="300" fill="#fff"/>${rects.join('')}${marks ? `<path d="${marks}" stroke="#23312a" stroke-width="3" stroke-linecap="round"/>` : ''}<path d="${grid}" stroke="#fff" stroke-width="3"/><path d="${grid}" stroke="#9fb3a6" stroke-width=".8"/><rect width="300" height="300" fill="none" stroke="#9fb3a6"/></svg>`;
}

const sw = (id) => `<svg class="sw" viewBox="0 0 14 14" aria-hidden="true"><rect width="14" height="14" fill="url(#${id})"/></svg>`;
const swAlone = `<svg class="sw" viewBox="0 0 14 14" aria-hidden="true"><path d="M3 11L11 3" stroke="#23312a" stroke-width="2" stroke-linecap="round"/></svg>`;

// 市区町村ページの「100人の村にすると」（z は全国）
export function villageHtml(name, a, z) {
  const v = village(a);
  const n = village(z);
  const label = `${esc(name)}を100人にすると、子ども${v.kids}人・働く世代${v.work}人・お年寄り${v.old}人。ひとり暮らしの人は${v.alone}人`;
  return `<div class="vw">${villageSvg(v, label)}
<ul class="vl"><li>${sw('vk')}子ども<small>15歳未満</small><span class="vn"><b>${v.kids}</b>人</span></li><li>${sw('vw')}働く世代<small>15〜64歳</small><span class="vn"><b>${v.work}</b>人</span></li><li>${sw('vo')}お年寄り<small>65歳以上</small><span class="vn"><b>${v.old}</b>人</span></li><li>${swAlone}ひとり暮らし<small>上の人のうち</small><span class="vn"><b>${v.alone}</b>人</span></li></ul></div>
<p class="note">全国なら子ども${n.kids}・働く世代${n.work}・お年寄り${n.old}・ひとり暮らし${n.alone}</p>`;
}

export const VILLAGE_CSS = `.vw{display:grid;grid-template-columns:minmax(0,1fr) 9.5em;gap:12px;align-items:center;margin:4px 0 6px}.vil{display:block;width:100%;height:auto}
.vl{list-style:none;margin:0;padding:0;font-size:13px;line-height:1.35}.vl li{display:grid;grid-template-columns:16px 1fr auto;column-gap:6px;align-items:center;padding:5px 0;border-bottom:1px dotted var(--line)}
.vl small{grid-column:2;grid-row:2;font-size:10px;color:var(--sub)}.vl .vn{grid-column:3;grid-row:1/span 2}.vl b{font-size:20px;color:var(--num);font-variant-numeric:tabular-nums;margin-right:1px}.vl .sw{width:14px;height:14px;border:1px solid #c9dcc0}`.replace(/\n/g, '');
