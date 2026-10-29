// 「授業・家庭学習のプリント」の見本（案A・B・C）。リポジトリの部品とデータを読むだけ。出力は作業場の print/manabi/
import { writeFileSync, mkdirSync } from 'node:fs';
const R = '/home/claude/machi-shakaika/src/';
const OUT = process.argv[2];
const { esc, TREES, RIVER, MINCHO, GOTHIC, page, srcName, jpDate, h2 } = await import(R + 'layout.mjs');
const { readMunis } = await import(R + 'munis.mjs');
const { derive, muniList, nationalRates } = await import(R + 'stats.mjs');
const { readYaml } = await import(R + 'data.mjs');
const { SITE, ESTAT_CREDIT } = await import(R + 'site.mjs');

const M = readMunis();
const L = muniList(M.areas);
const NAT = nationalRates(L);
const sum = (k) => L.reduce((s, a) => s + (a[k] || 0), 0);
const NAT_IKKO = Math.round((sum('ikkodate') / sum('housed')) * 1000) / 10;
const NAT_PER = Math.round(derive(M.areas['00000']).perHh * 10) / 10;
const NAT_DENS = M.areas['00000'].density;
const city = (c) => {
  const a = derive(M.areas[c]);
  return { ...a, pIkko: (a.ikkodate / a.housed) * 100 };
};
const r1 = (v) => Math.round(v * 10) / 10;
const f1 = (v) => r1(v).toFixed(1);
const fmt = (n) => Number(n).toLocaleString('ja-JP');
const items = readYaml('items.yml');
const sources = readYaml('sources.yml');
const mizu = items.items.find((i) => i.id === 'mizu');
const DAYS = items.days;

const SRC_K = `出典：総務省「${esc(M.statName)}」を加工して作成（${jpDate(M.survey)}現在・${jpDate(M.published)}公表）`;
function srcLine(ids) {
  const by = new Map(sources.sources.map((s) => [s.id, s]));
  const list = ids.map((id) => by.get(id));
  const ds = list.map((s) => String(s.checked)).sort();
  const [y1, m1, d1] = ds[0].split('-').map(Number);
  const [, , d2] = ds.at(-1).split('-').map(Number);
  const when = ds[0] === ds.at(-1) ? `${y1}年${m1}月${d1}日` : `${y1}年${m1}月${d1}日〜${d2}日`;
  return `${list.map(srcName).join('、')}（${when}に確認）`;
}

const INK = '#23312a', SUB = '#5f6e66', BAR = '#4f8d5e', WATER = '#3f8fbf', TRACK = '#e6efe8';
const HM = h2('x').match(/<svg[^]*?<\/svg>/)[0];
const band = (id) => TREES(id).replace('viewBox="0 0 390 24"', 'viewBox="0 0 635 24"').replace('<rect width="390"', '<rect width="635"');
const wr = (w) => `<span class="wr" style="width:${w}px"></span>`;
const qh = (n, t, small = '') => `<p class="qh">${HM}<span class="n">${n}</span>${t}${small ? `<small>${small}</small>` : ''}</p>`;

// 10×10 のマス（1マス＝1）。5ごとにすきま、右に 10・20…
function grid100(v, fill = BAR) {
  const n = Math.round(v), c = 17, g = 2, m = 4;
  const pos = (i) => i * (c + g) + (i >= 5 ? m : 0);
  let s = '';
  for (let i = 0; i < 100; i++) s += `<rect x="${pos(i % 10) + 0.5}" y="${pos(Math.floor(i / 10)) + 0.5}" width="${c}" height="${c}" fill="${i < n ? fill : '#fff'}" stroke="${INK}" stroke-width=".7"/>`;
  const W = pos(9) + c + 1;
  for (let r = 0; r < 10; r++) s += `<text x="${W + 5}" y="${pos(r) + c - 4}" font-size="10" fill="${SUB}">${(r + 1) * 10}</text>`;
  return `<svg class="g100" width="${W + 26}" height="${W}" viewBox="0 0 ${W + 26} ${W}" aria-hidden="true">${s}</svg>`;
}

// 数の線（目盛り）。marks は上の▼（街）、nat は下の▲（全国）
function numline({ lo, hi, minor, major, w = 600, unit = '', marks = [], nat, natLabel, dec = 1 }) {
  const px = (v) => 22 + ((v - lo) / (hi - lo)) * (w - 44);
  const ay = 44;
  let s = `<line x1="${px(lo)}" x2="${px(hi)}" y1="${ay}" y2="${ay}" stroke="${INK}" stroke-width="1.3"/>`;
  const steps = Math.round((hi - lo) / minor);
  for (let i = 0; i <= steps; i++) {
    const v = lo + i * minor;
    const k = (v - lo) / major;
    const isM = Math.abs(k - Math.round(k)) < 1e-6;
    s += `<line x1="${px(v)}" x2="${px(v)}" y1="${ay - (isM ? 8 : 4)}" y2="${ay + (isM ? 8 : 4)}" stroke="${INK}" stroke-width="${isM ? 1.2 : 0.8}"/>`;
    if (isM) s += `<text x="${px(v)}" y="${ay + 25}" font-size="12.5" text-anchor="middle" fill="${INK}">${v.toFixed(dec)}${unit}</text>`;
  }
  for (const mk of marks) {
    const x = px(mk.v);
    s += `<path d="M${x - 7} ${ay - 22}h14l-7 11z" fill="${mk.color}"/><text x="${x}" y="${ay - 28}" font-size="13" font-weight="700" text-anchor="middle" fill="${mk.color === BAR ? '#2f5d3e' : mk.color === WATER ? '#2b6f99' : INK}">${mk.label}</text>`;
  }
  if (nat != null) {
    const x = px(nat);
    s += `<path d="M${x} ${ay + 10}l6 9h-12z" fill="${INK}"/><text x="${x}" y="${ay + 42}" font-size="12" text-anchor="middle" fill="${INK}">${natLabel}</text>`;
  }
  return `<svg class="nl" width="${w}" height="${ay + 48}" viewBox="0 0 ${w} ${ay + 48}" aria-hidden="true">${s}</svg>`;
}

// 人口の棒（0〜max）。目盛りは step ごと、ラベルは lab ごと
function popbar(v, { max, step, lab, w = 600, labf }) {
  const x0 = 22, x1 = w - 22, px = (t) => x0 + (t / max) * (x1 - x0);
  let s = `<rect x="${x0}" y="8" width="${x1 - x0}" height="20" fill="${TRACK}"/><rect x="${x0}" y="8" width="${px(v) - x0}" height="20" fill="${BAR}"/>`;
  for (let t = 0; t <= max + 1e-6; t += step) {
    const isL = Math.abs(t / lab - Math.round(t / lab)) < 1e-6;
    s += `<line x1="${px(t)}" x2="${px(t)}" y1="${isL ? 28 : 28}" y2="${isL ? 40 : 35}" stroke="${INK}" stroke-width="${isL ? 1.2 : 0.8}"/>`;
    if (t > 0 && t < max) s += `<line x1="${px(t)}" x2="${px(t)}" y1="8" y2="28" stroke="#fff" stroke-width="1"/>`;
    if (isL) s += `<text x="${px(t)}" y="56" font-size="12.5" text-anchor="middle" fill="${INK}">${labf(t)}</text>`;
  }
  s += `<line x1="${x0}" x2="${x1}" y1="28" y2="28" stroke="${INK}" stroke-width="1.3"/>`;
  return `<svg class="pb" width="${w}" height="62" viewBox="0 0 ${w} 62" aria-hidden="true">${s}</svg>`;
}

// 2つの街の棒（同じ物差し）。▼は全国
function pairs(rows, { max = 100, ticks = [0, 50, 100], tickf = (t) => `${t}%`, w = 688, valf = (v) => `${f1(v)}%`, lw = 150 }) {
  const x0 = lw, bw = w - lw - 78, px = (v) => x0 + (Math.min(v, max) / max) * bw;
  const rh = 46;
  let s = '';
  rows.forEach((r, i) => {
    const y = 4 + i * rh;
    s += `<text x="0" y="${y + 30}" font-size="13.5" fill="${INK}">${r.label}</text>`;
    s += `<rect x="${x0}" y="${y + 11}" width="${bw}" height="13" fill="${TRACK}"/><rect x="${x0}" y="${y + 26}" width="${bw}" height="13" fill="${TRACK}"/>`;
    s += `<rect x="${x0}" y="${y + 11}" width="${px(r.a) - x0}" height="13" fill="${BAR}"/><rect x="${x0}" y="${y + 26}" width="${px(r.b) - x0}" height="13" fill="${WATER}"/>`;
    for (let k = 1; k < 10; k++) s += `<line x1="${x0 + (bw * k) / 10}" x2="${x0 + (bw * k) / 10}" y1="${y + 11}" y2="${y + 39}" stroke="#fff" stroke-width="1"/>`;
    s += `<text x="${x0 + bw + 8}" y="${y + 22}" font-size="12.5" fill="#2f5d3e" font-weight="700">${valf(r.a)}</text><text x="${x0 + bw + 8}" y="${y + 37}" font-size="12.5" fill="#2b6f99" font-weight="700">${valf(r.b)}</text>`;
    if (r.nat != null) {
      const x = px(r.nat);
      s += `<line x1="${x}" x2="${x}" y1="${y + 8}" y2="${y + 41}" stroke="${INK}" stroke-width="1" stroke-dasharray="2 2"/><path d="M${x} ${y + 39}l5 7h-10z" fill="${INK}"/>`;
    }
  });
  const yb = 4 + rows.length * rh;
  s += `<line x1="${x0}" x2="${x0 + bw}" y1="${yb}" y2="${yb}" stroke="${INK}" stroke-width="1"/>`;
  for (const t of ticks) s += `<line x1="${px(t)}" x2="${px(t)}" y1="${yb}" y2="${yb + 5}" stroke="${INK}"/><text x="${px(t)}" y="${yb + 18}" font-size="11.5" text-anchor="middle" fill="${SUB}">${tickf(t)}</text>`;
  return `<svg class="pr" width="${w}" height="${yb + 22}" viewBox="0 0 ${w} ${yb + 22}" aria-hidden="true">${s}</svg>`;
}

// 2Lボトルのぬり絵（線だけ）
function bottles(n, perRow) {
  let g = '';
  for (let i = 0; i < n; i++) {
    const x = 2 + (i % perRow) * 27, y = 6 + Math.floor(i / perRow) * 50;
    g += `<g transform="translate(${x},${y}) scale(1.2)"><path d="M5 0h6v4c3 2 5 4 5 8v22c0 2-1 3-3 3H3c-2 0-3-1-3-3V12c0-4 2-6 5-8z" fill="#fff" stroke="${INK}" stroke-width=".9"/><rect x="4" y="-2" width="8" height="3" fill="#fff" stroke="${INK}" stroke-width=".8"/></g>`;
  }
  const rows = Math.ceil(n / perRow);
  return `<svg class="bt" width="${perRow * 27 + 4}" height="${rows * 50 + 2}" viewBox="0 0 ${perRow * 27 + 4} ${rows * 50 + 2}" aria-hidden="true">${g}</svg>`;
}
const box = (v, cls = '') => `<span class="bx2${cls}">${v}</span>`;

const legend = (a, b) =>
  `<p class="lg"><span><i style="background:${BAR}"></i>${esc(a)}</span><span><i style="background:${WATER}"></i>${esc(b)}</span><span><svg width="12" height="10" viewBox="0 0 12 10"><path d="M6 1l5 8H1z" fill="${INK}"/></svg>全国</span></p>`;

const foot = (srcs, path) =>
  `<div class="foot">${srcs.map((s) => `<p>${s}</p>`).join('')}<p>${esc(ESTAT_CREDIT)}</p><p><span class="site">${esc(SITE.name)}</span>${esc(SITE.url.replace('https://', ''))}${path}</p></div>`;

const ttl = (t, ld) => `<div class="ttl"><p class="h1">${t}</p><span class="nmf">名前${wr(170)}</span></div><p class="ld">${ld}</p>`;
const fold = (ans) => `<div class="fold"><p class="fl"><span>ここで折ると、答えがかくれます</span></p><div class="kae"><p class="ah">答え</p>${ans.map(([n, t], i) => `<p${i === ans.length - 1 && i % 2 === 0 ? ' class="w2"' : ''}><b>${n}</b>${t}</p>`).join('')}</div></div>`;

// ---------- 案A：1つの街を深く読む（福岡市・小学校高学年） ----------
function sheetA() {
  const c = city('40130');
  const ans = [
    ['1', `約${Math.round(c.pKyodo)}世帯（${f1(c.pKyodo)}%）。全国（約${Math.round(NAT.kyodo)}世帯）より多い`],
    ['2', `約${Math.round(c.pSingle)}世帯（${f1(c.pSingle)}%）`],
    ['3', `約${f1(c.perHh)}人。イ（全国は${NAT_PER.toFixed(1)}人）`],
    ['4', `約${Math.round(c.pop / 100000) * 10}万人（${fmt(c.pop)}人）`],
    ['5', '例：停電でポンプの給水が止まることがあるので、家に水を置いておく'],
  ];
  return `<div class="sheet" lang="ja">
<span class="band">${band('ba')}</span>
${ttl('福岡市を数字で読む', 'マスや目盛りを読んで答えよう。数字は2025年の国勢調査から')}
<div class="two">
<div>${qh('1', '共同住宅に住む世帯')}${grid100(c.pKyodo)}
<p class="qt">100世帯のうち、約何世帯？</p><p class="an">答え${wr(70)}世帯</p>
<p class="qt sm">共同住宅＝マンション・アパートなど</p><p class="qt sm2">全国（100のうち${Math.round(NAT.kyodo)}）より　多い ・ 少ない</p></div>
<div>${qh('2', 'ひとり暮らしの世帯')}${grid100(c.pSingle, WATER)}
<p class="qt">100世帯のうち、約何世帯？</p><p class="an">答え${wr(70)}世帯</p>
<p class="qt sm">1マス＝1世帯（100世帯にしたとき）</p></div>
</div>
${qh('3', '1世帯の人数', '目盛りは0.1人ずつ')}
${numline({ lo: 1, hi: 3, minor: 0.1, major: 0.5, w: 688, unit: '人', marks: [{ v: c.perHh, label: '福岡市', color: BAR }], nat: NAT_PER, natLabel: `全国 ${NAT_PER.toFixed(1)}人` })}
<p class="qt">福岡市の1世帯の人数は？　答え 約${wr(60)}人　全国より　<span class="kn">ア</span>多い　<span class="kn">イ</span>少ない　<span class="kn">ウ</span>同じ</p>
${qh('4', '人口', '目盛りは10万人ずつ')}
${popbar(c.pop, { max: 2000000, step: 100000, lab: 500000, w: 688, labf: (t) => (t ? `${t / 10000}万` : '0') })}
<p class="qt">福岡市の人口は約何万人？（十万の位までの概数）　答え 約${wr(80)}万人</p>
<span class="river">${RIVER}</span>
${qh('5', '家の備えにつなげる')}
<p class="qt">1の数字から、福岡市の家の備えで気をつけるとよいことを書こう。<span class="hint">ヒント：マンションは停電でポンプの給水が止まることがあります</span></p>
<div class="lines"><p></p><p></p></div>
${fold(ans)}
${foot([SRC_K], '/fukuoka/fukuoka/')}
</div>`;
}

// ---------- 案B：2つの街をくらべる（大阪市と枚方市・中学） ----------
function sheetB() {
  const a = city('27100'), b = city('27210');
  const rows = [
    { label: '共同住宅に住む世帯', a: a.pKyodo, b: b.pKyodo, nat: NAT.kyodo },
    { label: '一戸建てに住む世帯', a: a.pIkko, b: b.pIkko, nat: NAT_IKKO },
    { label: 'ひとり暮らしの世帯', a: a.pSingle, b: b.pSingle, nat: NAT.single },
    { label: '15歳未満の人', a: a.p014, b: b.p014, nat: NAT.p014 },
  ];
  const ratio = (a.density / b.density).toFixed(2);
  const p1 = `<div class="sheet" lang="ja">
<span class="band">${band('bb1')}</span>
${ttl('大阪市と枚方市をくらべる', 'グラフを読んで、2つの街のちがいを考えよう。数字は2025年の国勢調査から')}
${legend('大阪市', '枚方市')}
${qh('1', '世帯と人の割合', '共同住宅＝マンション・アパートなど')}
${pairs(rows, {})}
${qh('2', '人口密度', '1km²あたりの人口')}
${pairs([{ label: '人口密度', a: a.density, b: b.density, nat: NAT_DENS }], { max: 15000, ticks: [0, 5000, 10000, 15000], tickf: (t) => fmt(t), valf: (v) => `${fmt(v)}人` })}
${qh('3', '1世帯の人数')}
${numline({ lo: 1.5, hi: 2.5, minor: 0.1, major: 0.5, w: 688, unit: '人', marks: [{ v: a.perHh, label: `大阪市 ${f1(a.perHh)}人`, color: BAR }, { v: b.perHh, label: `枚方市 ${f1(b.perHh)}人`, color: WATER }], nat: NAT_PER, natLabel: `全国 ${NAT_PER.toFixed(1)}人` })}
<span class="river">${RIVER}</span>
<p class="qt qq"><b>問1</b>正しいものを全部えらんで、記号に丸をつけよう。</p>
<div class="ops"><p><span class="kn">ア</span>共同住宅に住む世帯の割合は、大阪市のほうが高い。</p><p><span class="kn">イ</span>1世帯の人数は、大阪市のほうが多い。</p><p><span class="kn">ウ</span>一戸建てに住む世帯の割合は、どちらの街も全国より高い。</p><p><span class="kn">エ</span>枚方市では、一戸建てに住む世帯のほうが、共同住宅に住む世帯より多い。</p></div>
<p class="qt qq"><b>問2</b>大阪市の人口密度は、枚方市の約何倍？（小数第1位まで）　答え 約${wr(70)}倍</p>
<p class="qt qq"><b>問3</b>1世帯の人数が少ないのはどちらの街？ グラフの中で、それとつながっていそうな数字を1つ書こう。</p>
<div class="lines"><p></p></div>
<p class="qt qq"><b>問4</b>マンションは停電でポンプの給水が止まることがあります。この備えが当てはまる世帯の割合が高いのは？　大阪市 ・ 枚方市　　あなたの家は？　共同住宅 ・ 一戸建て ・ そのほか</p>
${foot([SRC_K], '/kurabe/')}
</div>`;
  const tr = (lab, va, vb, vn) => `<tr><td>${lab}</td><td>${va}</td><td>${vb}</td><td>${vn}</td></tr>`;
  const p2 = `<div class="sheet" lang="ja">
<span class="band">${band('bb2')}</span>
<div class="ttl"><p class="h1">答えと考え方</p><span class="nmf">大阪市と枚方市をくらべる</span></div>
<p class="ld">先生・おうちの人へ。数字は国勢調査（${jpDate(M.survey)}現在）の時点のものです</p>
<div class="ak">
<p class="ah2"><b>問1</b><span class="ar">ア・エ</span></p>
<p class="kt">ア 共同住宅は大阪市${f1(a.pKyodo)}%、枚方市${f1(b.pKyodo)}%。イ 大阪市${f1(a.perHh)}人・枚方市${f1(b.perHh)}人で、枚方市のほうが多い。ウ 大阪市の一戸建ては${f1(a.pIkko)}%で、全国（${f1(NAT_IKKO)}%）より低い。エ 枚方市は一戸建て${f1(b.pIkko)}%、共同住宅${f1(b.pKyodo)}%。</p>
<p class="ah2"><b>問2</b><span class="ar">約${(Math.round(Number(ratio) * 10) / 10).toFixed(1)}倍</span></p>
<p class="kt">${fmt(a.density)} ÷ ${fmt(b.density)} ＝ ${ratio}…（小数第2位を四捨五入）</p>
<p class="ah2"><b>問3</b><span class="ar">大阪市</span></p>
<p class="kt">例：ひとり暮らしの世帯の割合（大阪市${f1(a.pSingle)}%、枚方市${f1(b.pSingle)}%）。共同住宅の割合も、つながりを考えられる数字です。</p>
<p class="ah2"><b>問4</b><span class="ar">大阪市</span></p>
<p class="kt">共同住宅に住む世帯は大阪市${f1(a.pKyodo)}%。家の数字は、まちの社会科の「わが家の防災カルテ」で計算できます。</p>
</div>
<span class="river">${RIVER}</span>
<p class="qh">${HM}この紙の数字</p>
<table class="tbl2"><tr><th></th><th>大阪市</th><th>枚方市</th><th>全国</th></tr>
${tr('人口', `${fmt(a.pop)}人`, `${fmt(b.pop)}人`, `${fmt(M.areas['00000'].pop)}人`)}
${tr('1世帯の人数', `${a.perHh.toFixed(2)}人`, `${b.perHh.toFixed(2)}人`, `${derive(M.areas['00000']).perHh.toFixed(2)}人`)}
${tr('人口密度（1km²あたり）', `${fmt(a.density)}人`, `${fmt(b.density)}人`, `${fmt(NAT_DENS)}人`)}
${tr('共同住宅に住む世帯', `${f1(a.pKyodo)}%`, `${f1(b.pKyodo)}%`, `${f1(NAT.kyodo)}%`)}
${tr('一戸建てに住む世帯', `${f1(a.pIkko)}%`, `${f1(b.pIkko)}%`, `${f1(NAT_IKKO)}%`)}
${tr('ひとり暮らしの世帯', `${f1(a.pSingle)}%`, `${f1(b.pSingle)}%`, `${f1(NAT.single)}%`)}
${tr('15歳未満の人', `${f1(a.p014)}%`, `${f1(b.p014)}%`, `${f1(NAT.p014)}%`)}
</table>
<p class="nt2">共同住宅・一戸建ては住宅に住む一般世帯のうちの割合、ひとり暮らしは一般世帯のうちの割合。全国は市区町村の合計から計算</p>
<p class="nt2">ほかの2つの街のプリントは machi-shakaika.com/kurabe/ で街をえらんで作れます</p>
${foot([SRC_K], '/kurabe/')}
</div>`;
  return p1 + p2;
}

// ---------- 案C：数字から、わが家の水を計算（名古屋市・家庭学習） ----------
function sheetC() {
  const c = city('23100');
  const per = r1(c.perHh);
  const L3 = r1(mizu.per_day * per * DAYS.min);
  const bt = Math.ceil(L3 / 2);
  const ans = [
    ['1', `約${Math.round(c.pKyodo)}世帯（${f1(c.pKyodo)}%）`],
    ['2', `${mizu.per_day}×${per}×${DAYS.min}＝${L3}L、${bt}本（${L3}÷2の答えを切り上げ）`],
    ['3', `例：4人なら ${mizu.per_day * 4 * DAYS.min}L・${(mizu.per_day * 4 * DAYS.min) / 2}本。${DAYS.better}日分は${mizu.per_day * 4 * DAYS.better}L`],
  ];
  return `<div class="sheet" lang="ja">
<span class="band">${band('bc')}</span>
${ttl('名古屋市の数字で水を計算', `水は1人1日${mizu.per_day}L。最低${DAYS.min}日分、できれば${DAYS.better}日分を家に置きます`)}
${qh('1', 'マンション・アパートなどに住む世帯')}
<div class="gq">${grid100(c.pKyodo)}<div>
<p class="qt">名古屋市で、100世帯のうち、マンション・アパートなど（共同住宅）に住むのは約何世帯？</p>
<p class="an">答え${wr(70)}世帯</p>
<p class="qt sm">1マス＝1世帯（100世帯にしたとき）</p>
<p class="qt note">マンションは停電でポンプの給水が止まることがあります。</p></div></div>
${qh('2', '名古屋市の平均の1世帯で計算', `1世帯は平均${per}人`)}
<p class="fx">${box(mizu.per_day)}L × ${box(per)}人 × ${box(DAYS.min)}日 ＝ ${box('', ' e')}L</p>
<p class="qt">2Lのボトルで何本？（あまりが出たら1本ふやす）ボトルに色をぬろう。　答え${wr(60)}本</p>
${bottles(12, 12)}
<span class="river">${RIVER}</span>
${qh('3', 'わが家で計算', 'おうちの人といっしょに')}
<p class="fx">${box(mizu.per_day)}L × ${box('', ' e')}人 × ${box(DAYS.min)}日 ＝ ${box('', ' e')}L</p>
<p class="fx">${box(mizu.per_day)}L × ${box('', ' e')}人 × ${box(DAYS.better)}日 ＝ ${box('', ' e')}L</p>
<p class="qt">${DAYS.min}日分は2Lのボトルで${wr(50)}本。ボトルに色をぬろう。</p>
${bottles(30, 15)}
<p class="qt">家にある水を数えよう。　2Lのボトル${wr(50)}本　ほかの水${wr(90)}</p>
${fold(ans)}
${foot([SRC_K, `出典（水の量）：${srcLine(mizu.sources)}`], '/aichi/nagoya/')}
</div>`;
}

const S = '.sheet';
const css = `<style>
.sheetwrap{margin:12px 0 4px;border:1px solid var(--line);overflow:hidden;background:#fff}
.sheets{width:210mm;transform-origin:0 0}
${S}{width:210mm;height:297mm;padding:5mm 14mm 0;display:flex;flex-direction:column;overflow:hidden;background:#fff;color:var(--ink);font:14.5px/1.55 ${GOTHIC};-webkit-print-color-adjust:exact;print-color-adjust:exact}
${S}+${S}{border-top:1px solid var(--line)}
${S}>*{flex-shrink:0}${S} p{margin:0}${S} cite{font-style:normal}${S} svg text{font-family:${GOTHIC}}
${S} .band{display:block;margin:0 -14mm;line-height:0}${S} .band svg{display:block;width:100%;height:30px}
${S} .ttl{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:14px 0 0}
${S} .h1{font:700 31px/1.2 ${MINCHO};letter-spacing:.04em;white-space:nowrap}
${S} .nmf{font-size:15px;white-space:nowrap;padding-bottom:4px}
${S} .wr{display:inline-block;border-bottom:1.3px solid var(--ink);height:1.3em;vertical-align:-.35em;margin:0 4px}
${S} .ld{font:14px/1.5 ${MINCHO};color:var(--sub);margin-top:4px}
${S} .qh{font:700 17.5px/1.35 ${MINCHO};color:var(--h2);display:flex;align-items:center;gap:7px;margin:12px 0 5px}
${S} .qh svg{width:20px;height:16px;flex:none}
${S} .qh .n{font:700 21px/1 ${MINCHO};color:var(--ink);margin-right:2px}
${S} .qh small{margin-left:auto;font:400 11.5px/1 ${GOTHIC};color:var(--sub)}
${S} .two{display:grid;grid-template-columns:1fr 1fr;gap:0 28px}
${S} .gq{display:grid;grid-template-columns:auto 1fr;gap:0 22px;align-items:start}
${S} .g100,${S} .nl,${S} .pb,${S} .pr,${S} .bt{display:block}
${S} .qt{font-size:15px;line-height:1.6;margin-top:6px}${S} .qt.sm2{font-size:14px;margin-top:4px}${S} .qt.sm{font-size:12.5px;color:var(--sub);margin-top:2px}
${S} .qt.note{font-size:13px;margin-top:14px;padding-top:6px;border-top:1px dotted #9fb3a6}
${S} .qt.qq{margin-top:8px}${S} .qt.qq b{font:700 16px/1 ${MINCHO};margin-right:8px}
${S} .an{font-size:15px;margin-top:4px}
${S} .kn{display:inline-block;font:700 15px/1 ${MINCHO};color:var(--sub);margin:0 3px 0 6px}
${S} .hint{display:block;font-size:12.5px;color:var(--sub)}
${S} .lines p{height:34px;border-bottom:1px solid #9fb3a6}
${S} .ops{margin:2px 0 0 1.2em;font-size:14.5px;line-height:1.68}${S} .ops .kn{margin:0 8px 0 0}
${S} .lg{display:flex;gap:20px;font-size:13px;margin:12px 0 0}${S} .lg span{display:inline-flex;align-items:center;gap:6px}${S} .lg i{display:inline-block;width:22px;height:11px}
${S} .river{display:block;line-height:0;margin:14px 0 0}${S} .river svg{display:block;width:100%;height:10px}
${S} .fx{display:flex;align-items:center;gap:8px;font-size:17px;margin:6px 0 2px}
${S} .bx2{display:inline-flex;align-items:center;justify-content:center;min-width:58px;height:38px;padding:0 8px;border:1.3px solid var(--ink);font:700 21px/1 ${GOTHIC};color:var(--num)}${S} .bx2.e{min-width:74px}
${S} .fold{margin-top:auto;padding-top:10px}
${S} .fl{position:relative;border-top:1.3px dashed var(--sub);text-align:center;height:10px}
${S} .fl span{position:relative;top:-9px;background:#fff;padding:0 10px;font-size:11px;color:var(--sub)}
${S} .kae{display:grid;grid-template-columns:auto 1fr 1fr;gap:1px 18px;margin-top:4px;font-size:12.5px;line-height:1.5;color:var(--accent)}
${S} .kae .w2{grid-column:2/4}${S} .kae .ah{grid-row:span 3;font:700 14px/1.5 ${MINCHO}}${S} .kae b{font:700 13px/1 ${MINCHO};margin-right:8px}
${S} .ak{margin-top:8px}${S} .ah2{display:flex;align-items:baseline;gap:14px;margin-top:14px}${S} .ah2 b{font:700 17px/1 ${MINCHO}}
${S} .ar{font:700 22px/1.2 ${MINCHO};color:var(--accent)}
${S} .kt{font-size:13.5px;line-height:1.65;color:var(--ink);margin-top:2px}
${S} .tbl2{width:100%;border-collapse:collapse;font-size:13.5px;margin-top:4px}${S} .tbl2 th,${S} .tbl2 td{padding:6px 4px;border-bottom:1px dotted #9fb3a6;text-align:right;font-variant-numeric:tabular-nums}
${S} .tbl2 th{font-weight:400;font-size:12px;color:var(--sub);border-bottom:1.3px solid var(--ink)}${S} .tbl2 td:first-child{text-align:left}
${S} .nt2{font-size:11.5px;color:var(--sub);margin-top:8px}
${S} .foot{margin-top:auto;padding:8px 0 6mm;font-size:9px;line-height:1.5;color:var(--sub)}${S} .fold+.foot{margin-top:0}
${S} .foot .site{font:700 12px/1 ${MINCHO};color:var(--ink);margin-right:10px;letter-spacing:.06em}
@page{size:A4;margin:0}
@media print{
header,footer,.ft,.town,.sg,main>:not(.sheetwrap){display:none!important}
html,body{background:#fff}.pg{max-width:none;margin:0;padding:0}
.sheetwrap{margin:0!important;border:0!important;height:auto!important;overflow:visible!important}
.sheets{transform:none!important}${S}{height:296mm;break-after:page}${S}:last-child{break-after:auto}${S}+${S}{border-top:0}
}
</style>`;
const js = `(()=>{const w=document.querySelector('.sheetwrap'),s=w&&w.firstElementChild;if(!s)return;const f=()=>{const k=Math.min(1,w.clientWidth/s.offsetWidth);s.style.transform='scale('+k+')';w.style.height=Math.ceil(s.offsetHeight*k)+'px'};f();addEventListener('resize',f);const p=document.querySelector('[data-print]');if(p)p.addEventListener('click',()=>print())})();`;

const pages = [
  ['a', '福岡市を数字で読む（プリント見本A）', '/fukuoka/fukuoka/', '福岡市', sheetA()],
  ['b', '大阪市と枚方市をくらべる（プリント見本B）', '/kurabe/', '2つの街をくらべる', sheetB()],
  ['c', '名古屋市の数字で水を計算（プリント見本C）', '/aichi/nagoya/', '名古屋市', sheetC()],
];
for (const [k, title, back, backName, sheet] of pages) {
  const html = page({
    path: `/manabi/${k}/`,
    title,
    description: `${title}。A4で1枚の見本です。`,
    noAds: true,
    noindex: true,
    head: css,
    body: `<p class="crumb"><a href="/">トップ</a> / <a href="${back}">${backName}</a></p>
<h1 class="city">授業・家庭学習のプリント</h1>
<p class="src">A4で印刷。答えつき</p>
<p><button class="go" type="button" data-print>印刷する・PDFにする</button></p>
<div class="sheetwrap"><div class="sheets">${sheet}</div></div>`,
    script: js,
  });
  mkdirSync(`${OUT}/manabi/${k}`, { recursive: true });
  writeFileSync(`${OUT}/manabi/${k}/index.html`, html);
}
console.log('ok', NAT, NAT_IKKO, NAT_PER, NAT_DENS);
