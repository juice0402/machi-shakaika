// まなびプリント（/dougu/manabi/、夜のメモ #34）の問題と答えと紙の部品
//   ページを作るときと、ブラウザの中の両方で同じ関数を使う（toString でページのスクリプトに入れる）。
//   なので、どの関数もほかの mb* 関数と引数だけを使い、外の変数を読まない。
//   C はページの設定（src/pages/manabi.mjs の manabiConf）。問いと答えの文は、データの条件ごとの言い回しから作る（AIに書かせない）。
//   紙の共通の部品（頭・足・答えの2枚目・数の線・マス・棒）は、B「2つの街をくらべる」（#35）でも使う。
//   B の小学生の紙は紙のカード（src/card-core.mjs の mcPaper・mcStyle。絵の窓なし・問いの4つだけ）。ブラウザでは /kurabe/card.js から読み、C.M はその MC
import { mcPaper, mcStyle } from './card-core.mjs';

export function mbEsc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// 入れたものを、ありえる範囲にそろえる（URL の ? やおぼえた値から来るので）
//   k＝プリントの種類（a 1つの街・b 2つの街）・m＝街のコード・n＝くらべる街のコード（B）・g＝段階（s 小学生・c 中学生・h 高校生以上）・a＝答えもつける
export function mbState(o, kinds) {
  return {
    k: kinds.includes(o.k) ? o.k : kinds[0],
    m: /^\d{5}$/.test(String(o.m ?? '')) ? String(o.m) : '',
    n: /^\d{5}$/.test(String(o.n ?? '')) ? String(o.n) : '',
    g: ['s', 'c', 'h'].includes(o.g) ? o.g : 's',
    a: o.a === '1' || o.a === 1 || o.a === true ? 1 : 0,
  };
}

// /kurabe/kazu.json の1行（割合は10倍、1世帯の人数は100倍の整数）→ 紙で使う数字。pn は都道府県の名前
export function mbCity(row, pn) {
  return { code: row[0], name: row[1], pn, pop: row[3], p014: row[4] / 10, single: row[7] / 10, kyodo: row[8] / 10, per: row[9] / 100, r: row };
}

// B で使う数字を足す。x は /dougu/manabi/b.json の [人口密度（1km²あたり）×10, 一戸建てに住む世帯の割合×10]
export function mbAddB(d, x) {
  return { ...d, dens: x ? x[0] / 10 : 0, ikko: x ? x[1] / 10 : 0 };
}

export function mbFmt(n) {
  return Math.round(n).toLocaleString('ja-JP');
}

// 1世帯の人数は小数第1位で読む
export function mbPer1(v) {
  return Math.round(v * 10) / 10;
}

// くらべた答え（見せる桁でくらべる）
export function mbCmp(a, b) {
  return a > b ? '多い' : a < b ? '少ない' : '同じ';
}

// 人口の棒の物差し：最大は 1・2・5 × 10^k のうち、人口の1.08倍より大きいいちばん小さい数。目盛り1つは 10^(k-1)
//   答えは目盛り1つの位までの概数（目盛り1つ＝10万人なら「十万の位までの概数」）
export function mbPopScale(pop) {
  let k = 1;
  while (10 ** (k + 1) <= pop * 1.08) k++;
  let m = 1;
  for (const x of [1, 2, 5, 10]) {
    if (x * 10 ** k >= pop * 1.08) {
      m = x;
      break;
    }
  }
  if (m === 10) {
    m = 1;
    k++;
  }
  const step = 10 ** (k - 1);
  const lab = m === 1 ? step * 2 : m === 2 ? step * 5 : step * 10;
  const names = { 1: '一', 10: '十', 100: '百', 1000: '千', 10000: '一万', 100000: '十万', 1000000: '百万', 10000000: '千万' };
  return { max: m * 10 ** k, step, lab, place: names[step] || '', round: Math.round(pop / step) * step };
}

// 人の数の言い方（1万以上は「万」）
export function mbMan(n) {
  if (n >= 10000) return `${(n / 10000).toLocaleString('ja-JP', { maximumFractionDigits: 1 })}万`;
  return mbFmt(n);
}

// 上から2けたの概数
export function mbSig2(n) {
  if (n < 100) return Math.round(n);
  const mag = 10 ** (Math.floor(Math.log10(n)) - 1);
  return Math.round(n / mag) * mag;
}

// 線を引いた答えの欄
export function mbWr(w) {
  return `<span class="mb-wr" style="width:${w}px"></span>`;
}

// 問いの見出し
export function mbQh(C, n, t, small) {
  return `<p class="mb-qh">${C.hm}<span class="mb-n">${n}</span>${t}${small ? `<small>${small}</small>` : ''}</p>`;
}

// 10×10 のマス（1マス＝1）。5ごとにすきま、右に 10・20…
export function mbGrid100(C, v, fill) {
  const n = Math.round(v);
  const c = 17;
  const g = 2;
  const pos = (i) => i * (c + g) + (i >= 5 ? 4 : 0);
  let s = '';
  for (let i = 0; i < 100; i++) s += `<rect x="${pos(i % 10) + 0.5}" y="${pos(Math.floor(i / 10)) + 0.5}" width="${c}" height="${c}" fill="${i < n ? fill : '#fff'}" stroke="${C.col.ink}" stroke-width=".7"/>`;
  const W = pos(9) + c + 1;
  for (let r = 0; r < 10; r++) s += `<text x="${W + 5}" y="${pos(r) + c - 4}" font-size="10" fill="${C.col.sub}">${(r + 1) * 10}</text>`;
  return `<svg class="mb-svg" width="${W + 26}" height="${W}" viewBox="0 0 ${W + 26} ${W}" aria-hidden="true">${s}</svg>`;
}

// 数の線（目盛り）。marks は上の▼（街）、nat は下の▲（全国）
export function mbNumline(C, o) {
  const w = o.w || 688;
  const dec = o.dec ?? 1;
  const px = (v) => 22 + ((v - o.lo) / (o.hi - o.lo)) * (w - 44);
  const ay = 44 + (o.top || 0);
  let s = `<line x1="${px(o.lo)}" x2="${px(o.hi)}" y1="${ay}" y2="${ay}" stroke="${C.col.ink}" stroke-width="1.3"/>`;
  const steps = Math.round((o.hi - o.lo) / o.minor);
  for (let i = 0; i <= steps; i++) {
    const v = o.lo + i * o.minor;
    const k = (v - o.lo) / o.major;
    const big = Math.abs(k - Math.round(k)) < 1e-6;
    s += `<line x1="${px(v)}" x2="${px(v)}" y1="${ay - (big ? 8 : 4)}" y2="${ay + (big ? 8 : 4)}" stroke="${C.col.ink}" stroke-width="${big ? 1.2 : 0.8}"/>`;
    if (big) s += `<text x="${px(v)}" y="${ay + 25}" font-size="12.5" text-anchor="middle" fill="${C.col.ink}">${v.toFixed(dec)}${o.unit || ''}</text>`;
  }
  for (const mk of o.marks || []) {
    const x = px(mk.v);
    // 字が紙の外に出ないように、字の幅のめやすで寄せる
    const tw = [...String(mk.label)].reduce((t, c) => t + (/[ -~]/.test(c) ? 7.6 : 13), 0);
    const tx = Math.max(tw / 2, Math.min(w - tw / 2, x));
    s += `<path d="M${x - 7} ${ay - 22}h14l-7 11z" fill="${mk.color}"/><text x="${tx}" y="${ay - 28 - (mk.up || 0)}" font-size="13" font-weight="700" text-anchor="middle" fill="${mk.text || C.col.ink}">${mbEsc(mk.label)}</text>`;
  }
  if (o.nat != null) {
    const x = px(o.nat);
    s += `<path d="M${x} ${ay + 10}l6 9h-12z" fill="${C.col.ink}"/><text x="${x}" y="${ay + 42}" font-size="12" text-anchor="middle" fill="${C.col.ink}">${o.natLabel}</text>`;
  }
  return `<svg class="mb-svg" width="${w}" height="${ay + 48}" viewBox="0 0 ${w} ${ay + 48}" aria-hidden="true">${s}</svg>`;
}

// 1世帯の人数の数の線の範囲：0.5きざみのきりのいい数で、街と全国が入る幅1か1.5か2
export function mbPerRange(a, b) {
  const lo = Math.max(0.5, Math.floor((Math.min(a, b) - 0.15) * 2) / 2);
  let hi = lo + 1;
  while (hi < Math.max(a, b) + 0.15) hi += 0.5;
  return { lo, hi };
}

// 人口の棒（0〜max）
export function mbPopbar(C, v, sc) {
  const w = 688;
  const x0 = 22;
  const x1 = w - 22;
  const px = (t) => x0 + (t / sc.max) * (x1 - x0);
  let s = `<rect x="${x0}" y="8" width="${x1 - x0}" height="20" fill="${C.col.track}"/><rect x="${x0}" y="8" width="${px(v) - x0}" height="20" fill="${C.col.bar}"/>`;
  const n = Math.round(sc.max / sc.step);
  for (let i = 0; i <= n; i++) {
    const t = i * sc.step;
    const big = Math.round(t / sc.step) % Math.round(sc.lab / sc.step) === 0;
    s += `<line x1="${px(t)}" x2="${px(t)}" y1="28" y2="${big ? 40 : 35}" stroke="${C.col.ink}" stroke-width="${big ? 1.2 : 0.8}"/>`;
    if (i > 0 && i < n) s += `<line x1="${px(t)}" x2="${px(t)}" y1="8" y2="28" stroke="#fff" stroke-width="1"/>`;
    if (big) s += `<text x="${px(t)}" y="56" font-size="12.5" text-anchor="middle" fill="${C.col.ink}">${t ? mbMan(t) : '0'}</text>`;
  }
  s += `<line x1="${x0}" x2="${x1}" y1="28" y2="28" stroke="${C.col.ink}" stroke-width="1.3"/>`;
  return `<svg class="mb-svg" width="${w}" height="62" viewBox="0 0 ${w} 62" aria-hidden="true">${s}</svg>`;
}

// 割合の横棒（0〜100%）。値を棒の右に、全国は点線と▲
export function mbBars(C, rows) {
  const w = 688;
  const lw = 170;
  const bw = w - lw - 70;
  const px = (v) => lw + (Math.max(0, Math.min(100, v)) / 100) * bw;
  const rh = 40;
  let s = '';
  rows.forEach((r, i) => {
    const y = 4 + i * rh;
    s += `<text x="0" y="${y + 21}" font-size="13.5" fill="${C.col.ink}">${r.label}</text>`;
    s += `<rect x="${lw}" y="${y + 8}" width="${bw}" height="18" fill="${C.col.track}"/><rect x="${lw}" y="${y + 8}" width="${px(r.v) - lw}" height="18" fill="${C.col.bar}"/>`;
    for (let k = 1; k < 10; k++) s += `<line x1="${lw + (bw * k) / 10}" x2="${lw + (bw * k) / 10}" y1="${y + 8}" y2="${y + 26}" stroke="#fff" stroke-width="1"/>`;
    s += `<text x="${lw + bw + 8}" y="${y + 22}" font-size="13.5" font-weight="700" fill="${C.col.num}">${r.v.toFixed(1)}%</text>`;
    const x = px(r.nat);
    s += `<line x1="${x}" x2="${x}" y1="${y + 4}" y2="${y + 30}" stroke="${C.col.ink}" stroke-width="1" stroke-dasharray="2 2"/><path d="M${x} ${y + 28}l5 7h-10z" fill="${C.col.ink}"/>`;
  });
  const yb = 4 + rows.length * rh + 2;
  s += `<line x1="${lw}" x2="${lw + bw}" y1="${yb}" y2="${yb}" stroke="${C.col.ink}" stroke-width="1"/>`;
  for (let t = 0; t <= 100; t += 10) s += `<line x1="${px(t)}" x2="${px(t)}" y1="${yb}" y2="${yb + (t % 50 ? 3 : 6)}" stroke="${C.col.ink}"/>${t % 50 ? '' : `<text x="${px(t)}" y="${yb + 19}" font-size="11.5" text-anchor="middle" fill="${C.col.sub}">${t}%</text>`}`;
  return `<svg class="mb-svg" width="${w}" height="${yb + 23}" viewBox="0 0 ${w} ${yb + 23}" aria-hidden="true">${s}</svg>`;
}

// 横顔の1行：名前・値・物差し（lo〜hi、ticks）と全国の▲
export function mbProfileRow(C, r) {
  const w = 430;
  const x0 = 18;
  const x1 = w - 22;
  const px = (v) => x0 + ((r.log ? Math.log10(v) : v) - r.lo) / (r.hi - r.lo) * (x1 - x0);
  const cx = (v) => Math.max(x0, Math.min(x1, px(v)));
  let s = `<line x1="${x0}" x2="${x1}" y1="14" y2="14" stroke="${C.col.ink}" stroke-width="1.2"/>`;
  for (const t of r.ticks) {
    const x = r.log ? x0 + ((t[0] - r.lo) / (r.hi - r.lo)) * (x1 - x0) : px(t[0]);
    s += `<line x1="${x}" x2="${x}" y1="9" y2="19" stroke="${C.col.ink}" stroke-width=".9"/><text x="${x}" y="44" font-size="11" text-anchor="middle" fill="${C.col.sub}">${t[1]}</text>`;
  }
  s += `<circle cx="${cx(r.v)}" cy="14" r="6" fill="${C.col.bar}" stroke="${C.col.ink}" stroke-width="1"/>`;
  s += `<path d="M${cx(r.nat)} 21l6 9h-12z" fill="${C.col.ink}"/>`;
  return `<div class="mb-pr"><p class="mb-prl">${r.label}<b>${r.text}</b></p><svg class="mb-svg" width="${w}" height="48" viewBox="0 0 ${w} 48" aria-hidden="true">${s}</svg></div>`;
}

// 紙の頭（木の帯・題・名前の欄・1行の説明）。fs は長い題の字の大きさ
export function mbHead(C, title, lead, fs) {
  return `<span class="mb-band">${C.band}</span>
<div class="mb-ttl"><p class="mb-h1"${fs ? ` style="font-size:${fs}px"` : ''}>${title}</p><span class="mb-nmf">名前${mbWr(170)}</span></div><p class="mb-ld">${lead}</p>`;
}

// 紙の足（出典・調査の日・公表日・e-Stat のクレジット・サイト）
export function mbFoot(C) {
  return `<div class="mb-foot"><p>${C.src}</p><p>${C.credit}</p><p><span class="mb-site">${mbEsc(C.site)}</span>${C.host}/dougu/manabi/</p></div>`;
}

// 答えの2枚目。ans は [番号, 答え, 考え方]、heads は表の列の名前（街と全国）、table は [名前, 街…, 全国] の行
export function mbAnsSheet(C, sub, ans, heads, table, notes) {
  return `<div class="sheet" lang="ja"><span class="mb-band">${C.band2}</span>
<div class="mb-ttl"><p class="mb-h1">答えと考え方</p><span class="mb-nmf">${mbEsc(sub)}</span></div>
<p class="mb-ld">先生・おうちの人へ。数字は${C.statName}（${C.survey}現在）のものです</p>
<div class="mb-ak">${ans.map((x) => `<p class="mb-ah"><b>${x[0]}</b><span class="mb-ar">${x[1]}</span></p>${x[2] ? `<p class="mb-kt">${x[2]}</p>` : ''}`).join('')}</div>
<span class="mb-river">${C.river}</span>
<p class="mb-qh">${C.hm}この紙の数字</p>
<table class="mb-tbl"><tr><th></th>${heads.map((h) => `<th>${mbEsc(h)}</th>`).join('')}</tr>${table.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')}</table>
${notes.map((n) => `<p class="mb-nt">${n}</p>`).join('')}
${mbFoot(C)}</div>`;
}

// この紙の数字の表（A・B で共通の行）
export function mbTable(C, d) {
  const N = C.nat;
  return [
    ['人口', `${mbFmt(d.pop)}人`, `${mbFmt(N.pop)}人`],
    ['15歳未満の人', `${d.p014.toFixed(1)}%`, `${N.p014.toFixed(1)}%`],
    ['ひとり暮らしの世帯', `${d.single.toFixed(1)}%`, `${N.single.toFixed(1)}%`],
    ['共同住宅に住む世帯', `${d.kyodo.toFixed(1)}%`, `${N.kyodo.toFixed(1)}%`],
    ['1世帯の人数', `${d.per.toFixed(2)}人`, `${N.per.toFixed(2)}人`],
  ];
}

// 割合の項目（どの段階でも同じ言い方）。kyodo は住宅に住む一般世帯のうち、single は一般世帯のうち、p014 は人口のうち
export function mbItems() {
  return [
    { key: 'kyodo', lab: '共同住宅に住む世帯', unit: '世帯', base: '100世帯', note: '共同住宅＝マンション・アパートなど' },
    { key: 'single', lab: 'ひとり暮らしの世帯', unit: '世帯', base: '100世帯', note: '' },
    { key: 'p014', lab: '15歳未満の人', unit: '人', base: '100人', note: '' },
  ];
}

// ---------- A「1つの街を読む」 ----------
//   問いと答えをデータだけで作る（テストもこれを見る）。d は mbCity の形
export function mbQuizA(C, g, d) {
  const N = C.nat;
  const its = mbItems();
  const per1 = mbPer1(d.per);
  const nper1 = mbPer1(N.per);
  if (g === 's') {
    // 10×10のマスで読む2つ：割合を整数にして0や100になるもの（人口の少ない街）は出さない
    const two = its.filter((it) => Math.round(d[it.key]) >= 1 && Math.round(d[it.key]) <= 99).slice(0, 2);
    const sc = mbPopScale(d.pop);
    const popAns = sc.round >= 10000 ? `約${mbMan(sc.round)}人` : `約${mbFmt(sc.round)}人`;
    const q1 = two[0];
    const n1 = Math.round(d[q1.key]);
    const nn1 = Math.round(N[q1.key]);
    return {
      grids: two.map((it) => ({ key: it.key, v: Math.round(d[it.key]) })),
      ans: [
        ['1', `約${n1}${q1.unit}。全国より${mbCmp(n1, nn1)}`, `${q1.lab}は${d[q1.key].toFixed(1)}%。ぬったマスを数えます。全国は100${q1.unit}のうち${nn1}${q1.unit}`],
        ['2', `約${Math.round(d[two[1].key])}${two[1].unit}`, `${two[1].lab}は${d[two[1].key].toFixed(1)}%`],
        // 全国とのくらべは紙の表示（0.1人きざみ）で。同じ表示になる街は、くらべる問いを出さない
        ['3', per1 !== nper1 ? `約${per1.toFixed(1)}人。${{ 多い: 'ア', 少ない: 'イ' }[mbCmp(per1, nper1)]}` : `約${per1.toFixed(1)}人`, `目盛り1つは0.1人。全国は${nper1.toFixed(1)}人`],
        ['4', popAns, `${mbFmt(d.pop)}人。目盛り1つは${mbMan(sc.step)}人なので、${sc.place}の位までの概数にします`],
        ['5', '', two.some((it) => it.key === 'kyodo') && d.kyodo >= 50 ? '例：停電でポンプの給水が止まることがあるので、家に水を置いておく' : '例：家族の人数分の水と食べものを、家に置いておく', ''],
      ],
      popScale: sc,
      perCmp: per1 !== nper1,
      per1,
      nper1,
    };
  }
  if (g === 'c') {
    // 問1 割合から人数。問2 全国との差がいちばん大きい割合（差が0のものは出さない）
    const n014 = mbSig2((d.pop * d.p014) / 100);
    const diffs = its.map((it) => ({ it, df: Math.round((d[it.key] - N[it.key]) * 10) / 10 })).filter((x) => x.df !== 0 && Math.round(d[x.it.key]) >= 1 && Math.round(d[x.it.key]) <= 99).sort((p, q) => Math.abs(q.df) - Math.abs(p.df));
    const big = diffs[0] || { it: its[0], df: 0 };
    // 問3 正しいものを全部えらぶ。言い方（高い・低い）は街のコードで決め、全部同じ正誤にならないように最後を入れかえる
    const seed = Number(d.code) || 0;
    const cands = [
      { v: d.kyodo, w: N.kyodo, t: ['共同住宅に住む世帯の割合は、全国より高い。', '共同住宅に住む世帯の割合は、全国より低い。'], n: `共同住宅は${d.kyodo.toFixed(1)}%で、全国は${N.kyodo.toFixed(1)}%` },
      { v: per1, w: nper1, t: ['1世帯の人数は、全国より多い。', '1世帯の人数は、全国より少ない。'], n: `1世帯の人数は${per1.toFixed(1)}人で、全国は${nper1.toFixed(1)}人` },
      { v: d.p014, w: N.p014, t: ['15歳未満の人の割合は、全国より高い。', '15歳未満の人の割合は、全国より低い。'], n: `15歳未満は${d.p014.toFixed(1)}%で、全国は${N.p014.toFixed(1)}%` },
      { v: d.single, w: N.single, t: ['ひとり暮らしの世帯の割合は、全国より高い。', 'ひとり暮らしの世帯の割合は、全国より低い。'], n: `ひとり暮らしは${d.single.toFixed(1)}%で、全国は${N.single.toFixed(1)}%` },
      { v: d.single, w: 50, t: ['ひとり暮らしの世帯は、世帯の半分より多い。', 'ひとり暮らしの世帯は、世帯の半分より少ない。'], n: `ひとり暮らしは${d.single.toFixed(1)}%で、50%より${d.single > 50 ? '多い' : '少ない'}` },
      { v: d.kyodo, w: d.single, t: ['共同住宅に住む世帯の割合は、ひとり暮らしの世帯の割合より高い。', '共同住宅に住む世帯の割合は、ひとり暮らしの世帯の割合より低い。'], n: `共同住宅${d.kyodo.toFixed(1)}%、ひとり暮らし${d.single.toFixed(1)}%` },
    ].filter((x) => x.v !== x.w);
    const ops = cands.slice(0, 4).map((x, i) => {
      const hi = ((seed >> i) & 1) === 0;
      return { ...x, hi, ok: hi ? x.v > x.w : x.v < x.w };
    });
    if (ops.length > 1 && ops.every((o) => o.ok === ops[0].ok)) {
      const o = ops[ops.length - 1];
      o.hi = !o.hi;
      o.ok = !o.ok;
    }
    const kana = ['ア', 'イ', 'ウ', 'エ'];
    const right = ops.map((o, i) => (o.ok ? kana[i] : '')).filter(Boolean);
    // 問4 1世帯の人数とつながる数字（例）
    const ex =
      per1 < nper1 && d.single > N.single
        ? `例：ひとり暮らしの世帯の割合（${d.single.toFixed(1)}%）。ひとり暮らしが多いと、1世帯の人数は少なくなります`
        : per1 > nper1 && d.p014 > N.p014
          ? `例：15歳未満の人の割合（${d.p014.toFixed(1)}%）。子どもといっしょに住む世帯が多いと、1世帯の人数は多くなります`
          : `例：ひとり暮らしの世帯の割合（${d.single.toFixed(1)}%）。ひとり暮らしの世帯は1人なので、多いほど1世帯の人数は少なくなります`;
    return {
      n014,
      big: { key: big.it.key, lab: big.it.lab, df: big.df },
      ops,
      ans: [
        ['問1', `約${mbFmt(n014)}人`, `${mbFmt(d.pop)} × ${d.p014.toFixed(1)} ÷ 100 ＝ ${mbFmt(Math.round((d.pop * d.p014) / 10) / 10)}…を上から2けたの概数に`],
        ['問2', `${Math.abs(big.df).toFixed(1)}%・${big.df > 0 ? '高い' : '低い'}`, `${big.it.lab}は${d[big.it.key].toFixed(1)}%、全国は${N[big.it.key].toFixed(1)}%。${d[big.it.key].toFixed(1)} − ${N[big.it.key].toFixed(1)} ＝ ${big.df.toFixed(1)}`],
        ['問3', right.join('・') || 'なし', ops.map((o, i) => `${kana[i]} ${o.n}`).join('<br>')],
        ['問4', '', ex],
      ],
    };
  }
  // 高校生以上：横顔の5つ。全国（人口は全国の市区町村のまん中）より大きいもの
  const rows = [
    { key: 'pop', lab: '人口', v: d.pop, w: N.popMid },
    { key: 'p014', lab: '15歳未満の人', v: d.p014, w: N.p014 },
    { key: 'single', lab: 'ひとり暮らしの世帯', v: d.single, w: N.single },
    { key: 'kyodo', lab: '共同住宅に住む世帯', v: d.kyodo, w: N.kyodo },
    { key: 'per', lab: '1世帯の人数', v: per1, w: nper1 },
  ];
  const up = rows.filter((r) => r.v > r.w).map((r) => r.lab);
  // 全国とのちがいが大きい順（割合は全国の何倍か、人口はまん中の何倍か）
  const rel = rows
    .filter((r) => r.v !== r.w)
    .map((r) => ({ ...r, z: Math.abs(Math.log((r.v || 0.1) / r.w)) }))
    .sort((p, q) => q.z - p.z);
  const say = (r) =>
    r.key === 'pop'
      ? `人口は全国の市区町村のまん中（約${mbMan(mbSig2(N.popMid))}人）より${r.v > r.w ? '多い' : '少ない'}`
      : r.key === 'per'
        ? `1世帯の人数は${per1.toFixed(1)}人で、全国より${r.v > r.w ? '多い' : '少ない'}`
        : `${r.lab}は${r.v.toFixed(1)}%で、全国より${r.v > r.w ? '高い' : '低い'}`;
  const sc = mbPopScale(d.pop);
  const ex1 = `${d.pn}の${d.name}は、人口${sc.round >= 10000 ? `約${mbMan(mbSig2(d.pop))}` : `約${mbFmt(mbSig2(d.pop))}`}人の街。`;
  const intro = [ex1, ...rel.filter((r) => r.key === 'per' || (r.key !== 'pop' && Math.round(r.v) >= 1 && Math.round(r.v) <= 99)).slice(0, 2).map((r) => `${say(r)}。`)];
  return {
    rows,
    up,
    rel: rel.map((r) => r.key),
    ans: [
      ['問1', up.length ? up.join('・') : 'なし', rows.map((r) => (r.key === 'pop' ? `人口${mbFmt(r.v)}人（まん中は${mbFmt(r.w)}人）` : r.key === 'per' ? `1世帯${r.v.toFixed(1)}人（全国${r.w.toFixed(1)}人）` : `${r.lab}${r.v.toFixed(1)}%（全国${r.w.toFixed(1)}%）`)).join('、')],
      ['問2', '', `例：${intro.join('')}`],
      ['問3', '', '例：昼間に街にいる人の数（通勤・通学で出入りする人）。国勢調査の「昼間人口」で調べられます'],
    ],
  };
}

// A の問題の紙（.sheet の中身）
export function mbSheetA(C, g, d) {
  const q = mbQuizA(C, g, d);
  const N = C.nat;
  const co = C.col;
  const nm = mbEsc(d.name);
  const its = mbItems();
  const it = (k) => its.find((x) => x.key === k);
  if (g === 's') {
    const [a, b] = q.grids.map((x) => it(x.key));
    const pr = mbPerRange(q.per1, q.nper1);
    const sc = q.popScale;
    return `${mbHead(C, `${nm}を数字で読む`, `マスや目盛りを読んで答えよう。数字は${C.year}年の国勢調査から`)}
<div class="mb-two">
<div>${mbQh(C, '1', a.lab)}${mbGrid100(C, d[a.key], co.bar)}
<p class="mb-qt">${a.base}のうち、約何${a.unit}？</p><p class="mb-an">答え${mbWr(70)}${a.unit}</p>
${a.note ? `<p class="mb-qt mb-sm">${a.note}</p>` : ''}<p class="mb-qt mb-sm2">全国（100のうち${Math.round(N[a.key])}）より　多い ・ 少ない ・ 同じ</p></div>
<div>${mbQh(C, '2', b.lab)}${mbGrid100(C, d[b.key], co.water)}
<p class="mb-qt">${b.base}のうち、約何${b.unit}？</p><p class="mb-an">答え${mbWr(70)}${b.unit}</p>
<p class="mb-qt mb-sm">1マス＝1${b.unit}（${b.base}にしたとき）</p>${b.note ? `<p class="mb-qt mb-sm">${b.note}</p>` : ''}</div>
</div>
${mbQh(C, '3', '1世帯の人数', '目盛りは0.1人ずつ')}
${mbNumline(C, { lo: pr.lo, hi: pr.hi, minor: 0.1, major: 0.5, unit: '人', marks: [{ v: d.per, label: d.name, color: co.bar, text: co.num }], nat: N.per, natLabel: `全国 ${q.nper1.toFixed(1)}人` })}
<p class="mb-qt">${nm}の1世帯の人数は？　答え 約${mbWr(60)}人${q.perCmp ? `　全国より　<span class="mb-kn">ア</span>多い　<span class="mb-kn">イ</span>少ない` : ''}</p>
${mbQh(C, '4', '人口', `目盛りは${mbMan(sc.step)}人ずつ`)}
${mbPopbar(C, d.pop, sc)}
<p class="mb-qt">${nm}の人口は約何${sc.round >= 10000 ? '万' : ''}人？（${sc.place}の位までの概数）　答え 約${mbWr(80)}${sc.round >= 10000 ? '万' : ''}人</p>
<span class="mb-river">${C.river}</span>
${mbQh(C, '5', '家の備えにつなげる')}
<p class="mb-qt">1や2の数字から、${nm}の家の備えで気をつけるとよいことを書こう。<span class="mb-hint">${q.grids.some((x) => x.key === 'kyodo') && d.kyodo >= 50 ? 'ヒント：マンションは停電でポンプの給水が止まることがあります' : 'ヒント：家族の人数や住まいで、家に置く量が変わります'}</span></p>
<div class="mb-lines"><p></p><p></p><p></p></div>
${mbFoot(C)}`;
  }
  if (g === 'c') {
    const pr = mbPerRange(mbPer1(d.per), mbPer1(N.per));
    const kana = ['ア', 'イ', 'ウ', 'エ'];
    return `${mbHead(C, `${nm}の数字を読む`, `グラフを読んで答えよう。数字は${C.year}年の国勢調査から・▲は全国`)}
${mbQh(C, '', `${nm}の割合`, `人口 ${mbFmt(d.pop)}人`)}
${mbBars(C, its.map((x) => ({ label: x.lab, v: d[x.key], nat: N[x.key] })))}
<p class="mb-qt mb-sm">15歳未満は人口のうち、ひとり暮らしは世帯のうち、共同住宅（マンション・アパートなど）は住宅に住む世帯のうち</p>
${mbQh(C, '', '1世帯の人数', '目盛りは0.1人ずつ')}
${mbNumline(C, { lo: pr.lo, hi: pr.hi, minor: 0.1, major: 0.5, unit: '人', marks: [{ v: d.per, label: `${d.name} ${mbPer1(d.per).toFixed(1)}人`, color: co.bar, text: co.num }], nat: N.per, natLabel: `全国 ${mbPer1(N.per).toFixed(1)}人` })}
<span class="mb-river">${C.river}</span>
<p class="mb-qt mb-qq"><b>問1</b>${nm}の人口のうち、15歳未満の人は約何人？（上から2けたの概数）　答え 約${mbWr(90)}人</p>
<p class="mb-qt mb-qq"><b>問2</b>${q.big.lab}の割合は、全国とくらべて何%ちがう？　答え${mbWr(60)}%　高い ・ 低い</p>
<p class="mb-qt mb-qq"><b>問3</b>グラフから言えることで、正しいものを全部えらんで記号に丸をつけよう。</p>
<div class="mb-ops">${q.ops.map((o, i) => `<p><span class="mb-kn">${kana[i]}</span>${o.t[o.hi ? 0 : 1]}</p>`).join('')}</div>
<p class="mb-qt mb-qq"><b>問4</b>1世帯の人数とつながりがありそうな数字を、グラフから1つえらぼう。そう考えた理由も書こう。</p>
<div class="mb-lines"><p></p><p></p><p></p></div>
${mbFoot(C)}`;
  }
  const P = C.prof;
  const tk = (lo, hi, st, f) => {
    const out = [];
    for (let t = lo; t <= hi + 1e-9; t += st) out.push([t, f(t)]);
    return out;
  };
  const rows = [
    { label: '人口', text: `${mbFmt(d.pop)}人`, v: d.pop, nat: N.popMid, log: true, lo: P.popLo, hi: P.popHi, ticks: tk(P.popLo, P.popHi, 1, (e) => (10 ** e >= 10000 ? `${10 ** (e - 4)}万` : mbFmt(10 ** e))) },
    { label: '15歳未満の人', text: `${d.p014.toFixed(1)}%`, v: d.p014, nat: N.p014, lo: 0, hi: P.p014Hi, ticks: tk(0, P.p014Hi, 10, (t) => `${t}%`) },
    { label: 'ひとり暮らしの世帯', text: `${d.single.toFixed(1)}%`, v: d.single, nat: N.single, lo: 0, hi: 100, ticks: tk(0, 100, 25, (t) => `${t}%`) },
    { label: '共同住宅に住む世帯', text: `${d.kyodo.toFixed(1)}%`, v: d.kyodo, nat: N.kyodo, lo: 0, hi: 100, ticks: tk(0, 100, 25, (t) => `${t}%`) },
    { label: '1世帯の人数', text: `${mbPer1(d.per).toFixed(1)}人`, v: d.per, nat: N.per, lo: P.perLo, hi: P.perHi, ticks: tk(P.perLo, P.perHi, 0.5, (t) => `${t.toFixed(1)}人`) },
  ];
  return `${mbHead(C, `${nm}の横顔`, `旅行先や調べ学習の街を、5つの数字で読もう。数字は${C.year}年の国勢調査から`)}
<p class="mb-lg"><span><svg width="12" height="12" viewBox="0 0 12 12"><circle cx="6" cy="6" r="5" fill="${co.bar}" stroke="${co.ink}"/></svg>${nm}（${mbEsc(d.pn)}）</span><span><svg width="12" height="10" viewBox="0 0 12 10"><path d="M6 1l5 8H1z" fill="${co.ink}"/></svg>全国（人口は全国の市区町村のまん中）</span></p>
<div class="mb-prs">${rows.map((r) => mbProfileRow(C, r)).join('')}</div>
<p class="mb-qt mb-sm">15歳未満は人口のうち、ひとり暮らしは世帯のうち、共同住宅（マンション・アパートなど）は住宅に住む世帯のうち</p>
<span class="mb-river">${C.river}</span>
<p class="mb-qt mb-qq"><b>問1</b>5つの数字のうち、全国（▲）より大きいものの名前に丸をつけよう。</p>
<p class="mb-qt mb-qq"><b>問2</b>横顔から、${nm}を知らない人に、この街を3行で紹介しよう。</p>
<div class="mb-lines"><p></p><p></p><p></p></div>
<p class="mb-qt mb-qq"><b>問3</b>この街について、もっと調べたい数字と、そう思った理由を書こう。</p>
<div class="mb-lines"><p></p><p></p><p></p></div>
${mbFoot(C)}`;
}


// ---------- B「2つの街をくらべる」（#35） ----------
// 紙に出る表示でくらべる値（割合・人口密度は0.1、1世帯の人数は0.1人、popc はカードの人口の表示）
export function mbShow(d, k) {
  if (k === 'per') return mbPer1(d.per);
  if (k === 'popc') return d.pop >= 100000 ? Math.round(d.pop / 10000) * 10000 : d.pop;
  if (k === 'pop') return d.pop;
  return Math.round(d[k] * 10) / 10;
}

// 紙に出す字
export function mbV(d, k) {
  const v = d[k];
  if (k === 'dens') return `${v.toLocaleString('ja-JP', { minimumFractionDigits: 1, maximumFractionDigits: 1 })}人`;
  if (k === 'per') return `${mbPer1(v).toFixed(1)}人`;
  if (k === 'pop' || k === 'popc') return d.pop >= 100000 && k === 'popc' ? `${Math.round(d.pop / 10000)}万人` : `${mbFmt(d.pop)}人`;
  return `${v.toFixed(1)}%`;
}

// 割合が 1〜99% に見えるか（例文に 0% や 100% を使わない）。割合でないものはいつも true
export function mbMid(k, ...ds) {
  if (!['kyodo', 'ikko', 'single', 'p014'].includes(k)) return true;
  return ds.every((d) => Math.round(d[k]) >= 1 && Math.round(d[k]) <= 99);
}

// 何倍（大きいほう ÷ 小さいほう、小数第1位に四捨五入）。1.0倍になるときは null
export function mbRatio(x, y) {
  const big = Math.max(x, y);
  const sm = Math.min(x, y);
  if (!(sm > 0)) return null;
  const r = Math.round((big / sm) * 10) / 10;
  return r > 1 ? r : null;
}

// B の割合の項目
export function mbItemsB() {
  return [
    { key: 'kyodo', lab: '共同住宅に住む世帯', sh: '共同住宅' },
    { key: 'ikko', lab: '一戸建てに住む世帯', sh: '一戸建て' },
    { key: 'single', lab: 'ひとり暮らしの世帯', sh: 'ひとり暮らし' },
    { key: 'p014', lab: '15歳未満の人', sh: '15歳未満' },
  ];
}

// 人口密度の物差し：0〜max（全国の▲も入る、きりのいい数）
export function mbDensScale(...vs) {
  const top = Math.max(...vs) * 1.05;
  const k = 10 ** Math.floor(Math.log10(top));
  let m = 10;
  for (const x of [1, 1.5, 2, 3, 4, 5, 6, 8, 10]) {
    if (x * k >= top) {
      m = x;
      break;
    }
  }
  const max = m * k;
  const n = [1.5, 3, 6].includes(m) ? 3 : [2, 4, 8].includes(m) ? 4 : 5;
  const ticks = [];
  for (let i = 0; i <= n; i++) ticks.push([(max * i) / n, mbFmt((max * i) / n)]);
  return { max, n: n * 2, ticks };
}

// 2つの街の横棒（上が1つ目の街、下が2つ目の街）。全国は点線と▲。sc は {max, n（白い区切りの数）, ticks}
export function mbPairBars(C, rows, sc) {
  const w = 688;
  const lw = 150;
  const bw = 460;
  const rh = 46;
  const px = (v) => lw + (Math.max(0, Math.min(sc.max, v)) / sc.max) * bw;
  let s = '';
  rows.forEach((r, i) => {
    const y = 4 + i * rh;
    s += `<text x="0" y="${y + 26}" font-size="13.5" fill="${C.col.ink}">${r.label}</text>`;
    for (const [v, f, tc, t, yy] of [
      [r.a, C.col.bar, C.col.num, r.ta, 11],
      [r.b, C.col.water, C.col.num2, r.tb, 26],
    ]) {
      s += `<rect x="${lw}" y="${y + yy}" width="${bw}" height="13" fill="${C.col.track}"/><rect x="${lw}" y="${y + yy}" width="${(px(v) - lw).toFixed(1)}" height="13" fill="${f}"/><text x="${lw + bw + 8}" y="${y + yy + 11}" font-size="12.5" font-weight="700" fill="${tc}">${t}</text>`;
    }
    for (let k = 1; k < sc.n; k++) s += `<line x1="${lw + (bw * k) / sc.n}" x2="${lw + (bw * k) / sc.n}" y1="${y + 11}" y2="${y + 39}" stroke="#fff" stroke-width="1"/>`;
    const x = px(r.nat).toFixed(1);
    s += `<line x1="${x}" x2="${x}" y1="${y + 8}" y2="${y + 41}" stroke="${C.col.ink}" stroke-width="1" stroke-dasharray="2 2"/><path d="M${x} ${y + 39}l5 7h-10z" fill="${C.col.ink}"/>`;
  });
  const yb = 4 + rows.length * rh + 2;
  s += `<line x1="${lw}" x2="${lw + bw}" y1="${yb}" y2="${yb}" stroke="${C.col.ink}" stroke-width="1"/>`;
  for (const [t, lab] of sc.ticks) s += `<line x1="${px(t)}" x2="${px(t)}" y1="${yb}" y2="${yb + 5}" stroke="${C.col.ink}"/><text x="${px(t)}" y="${yb + 19}" font-size="11.5" text-anchor="middle" fill="${C.col.sub}">${lab}</text>`;
  return `<svg class="mb-svg" width="${w}" height="${yb + 23}" viewBox="0 0 ${w} ${yb + 23}" aria-hidden="true">${s}</svg>`;
}

// B の問いと答え（データだけで作る。テストもこれを見る）。a・b は mbAddB の形
export function mbQuizB(C, g, a, b) {
  const N = C.nat;
  const S = mbShow;
  const kana = ['ア', 'イ', 'ウ', 'エ'];
  const hiOf = (k) => (S(a, k) > S(b, k) ? [a, b] : S(a, k) < S(b, k) ? [b, a] : null);
  const its = mbItemsB();
  const lab = (k) => (its.find((x) => x.key === k) || { lab: { dens: '人口密度', per: '1世帯の人数', pop: '人口' }[k] }).lab;
  const sh = (k) => (its.find((x) => x.key === k) || { sh: { dens: '人口密度', per: '1世帯の人数', pop: '人口' }[k] }).sh;
  const both = (k) => `${a.name}${mbV(a, k)}、${b.name}${mbV(b, k)}`;
  const seed = (Number(a.code) || 0) + (Number(b.code) || 0);
  const qs = [];
  if (g === 's') {
    // 1 どっちが多い？（カードに出ている数字で。表示が同じものは出さない）
    const cmp = [
      ['popc', '人口が多いのは？', '人口'],
      ['p014', '15歳未満の人の割合が多いのは？', '15歳未満'],
      ['single', 'ひとり暮らしの世帯の割合が多いのは？', 'ひとり暮らし'],
      ['kyodo', '共同住宅に住む世帯の割合が多いのは？', '共同住宅'],
    ]
      .filter(([k]) => hiOf(k))
      .map(([k, q, l], i) => ({ k, q, l, kn: kana[i], w: hiOf(k)[0].name }));
    if (cmp.length) qs.push({ t: 'cmp', head: 'どっちが多い？', small: '多いほうの街の名前に丸', cmp, ans: cmp.map((x) => `${x.kn} ${x.w}`).join('　'), ex: cmp.map((x) => `${x.kn} ${x.l}は${both(x.k)}`).join('<br>') });
    // 2 全国（▲）より多いのは？（どちらの街も全国と表示がちがう割合）
    const nk = ['kyodo', 'single', 'p014'].find((k) => S(a, k) !== S(N, k) && S(b, k) !== S(N, k));
    if (nk) {
      const up = [a, b].filter((d) => S(d, nk) > S(N, nk));
      qs.push({ t: 'nat', k: nk, head: '全国（▲）とくらべる', q: `${lab(nk)}の割合が、全国（▲）より多いのは？`, ans: up.length === 2 ? 'どちらも' : up.length ? up[0].name : 'どちらでもない', ex: `${sh(nk)}は${both(nk)}。全国は${N[nk].toFixed(1)}%` });
    }
    // 3 いちばんちがうと思ったもの（書く）
    const rel = ['kyodo', 'single', 'p014'].filter((k) => hiOf(k) && mbMid(k, a, b)).sort((p, q) => Math.abs(Math.log(a[q] / b[q])) - Math.abs(Math.log(a[p] / b[p])));
    qs.push({ t: 'write', head: 'カードでくらべる', q: '2まいのカードで、いちばんちがうと思ったものと、そのわけを書こう。', hint: 'ヒント：ものさしの棒の長さのちがいを見てみよう', lines: 2, ans: '', ex: rel.length ? `例：${sh(rel[0])}（${both(rel[0])}）。棒の長さが大きくちがいます` : `例：人口（${a.name}${mbV(a, 'popc')}、${b.name}${mbV(b, 'popc')}）` });
  } else {
    if (g === 'c') {
      // 正しいものを全部えらぶ。言い方は2つの街のコードで決め、全部同じ正誤にならないように入れかえる
      const pool = [];
      const two = (k, l, adj) => {
        if (!hiOf(k)) return;
        pool.push({ two: 1, mk: (f) => ({ t: `${l}は、${(f ? b : a).name}のほうが${adj}。`, ok: f ? S(b, k) > S(a, k) : S(a, k) > S(b, k) }), n: `${sh(k)}は${both(k)}` });
      };
      two('kyodo', '共同住宅に住む世帯の割合', '高い');
      two('per', '1世帯の人数', '多い');
      if ([a, b].every((d) => S(d, 'ikko') !== S(N, 'ikko')))
        pool.push({ mk: (f) => ({ t: `一戸建てに住む世帯の割合は、どちらの街も全国より${f ? '低い' : '高い'}。`, ok: [a, b].every((d) => (f ? S(d, 'ikko') < S(N, 'ikko') : S(d, 'ikko') > S(N, 'ikko'))) }), n: `一戸建ては${both('ikko')}、全国${N.ikko.toFixed(1)}%` });
      const wc = [b, a].find((d) => S(d, 'ikko') !== S(d, 'kyodo'));
      if (wc)
        pool.push({ two: 1, mk: (f) => ({ t: `${wc.name}では、${f ? '共同住宅に住む世帯のほうが、一戸建てに住む世帯' : '一戸建てに住む世帯のほうが、共同住宅に住む世帯'}より多い。`, ok: f ? S(wc, 'kyodo') > S(wc, 'ikko') : S(wc, 'ikko') > S(wc, 'kyodo') }), n: `${wc.name}は一戸建て${mbV(wc, 'ikko')}、共同住宅${mbV(wc, 'kyodo')}` });
      two('single', 'ひとり暮らしの世帯の割合', '高い');
      two('p014', '15歳未満の人の割合', '高い');
      two('dens', '人口密度', '高い');
      const ops = pool.slice(0, 4).map((x, i) => ({ ...x, f: (seed >> i) & 1, ...x.mk((seed >> i) & 1) }));
      for (let i = ops.length - 1; i >= 0 && ops.length > 1 && ops.every((o) => o.ok === ops[0].ok); i--) {
        if (!ops[i].two) continue;
        const f = ops[i].f ? 0 : 1;
        Object.assign(ops[i], { f }, ops[i].mk(f));
      }
      qs.push({ t: 'ops', q: '正しいものを全部えらんで、記号に丸をつけよう。', ops, ans: ops.map((o, i) => (o.ok ? kana[i] : '')).filter(Boolean).join('・') || 'なし', ex: ops.map((o, i) => `${kana[i]} ${o.n}`).join('<br>') });
      // 何倍（人口密度、1.0倍なら人口）
      const rt = ['dens', 'pop'].map((k) => ({ k, r: mbRatio(a[k], b[k]) })).find((x) => x.r);
      if (rt) {
        const [hi, lo] = a[rt.k] > b[rt.k] ? [a, b] : [b, a];
        const num = (d) => (rt.k === 'dens' ? mbV(d, 'dens').replace('人', '') : mbFmt(d.pop));
        qs.push({ t: 'ratio', q: `${hi.name}の${lab(rt.k)}は、${lo.name}の約何倍？（小数第1位まで）`, ans: `約${rt.r.toFixed(1)}倍`, ex: `${num(hi)} ÷ ${num(lo)} ＝ ${(Math.floor((hi[rt.k] / lo[rt.k]) * 100) / 100).toFixed(2)}…（小数第2位を四捨五入）` });
      }
      // 1世帯の人数（同じ表示なら共同住宅）とつながる数字
      const mid = (k, ...ds) => mbMid(k, ...ds);
      if (hiOf('per')) {
        const [hi, lo] = hiOf('per');
        const ex =
          S(lo, 'single') > S(hi, 'single') && mid('single', lo, hi)
            ? `例：ひとり暮らしの世帯の割合（${lo.name}${mbV(lo, 'single')}、${hi.name}${mbV(hi, 'single')}）。ひとり暮らしが多いと、1世帯の人数は少なくなります`
            : S(lo, 'p014') < S(hi, 'p014') && mid('p014', lo, hi)
              ? `例：15歳未満の人の割合（${lo.name}${mbV(lo, 'p014')}、${hi.name}${mbV(hi, 'p014')}）。子どもといっしょに住む世帯が少ないと、1世帯の人数は少なくなります`
              : '例：ひとり暮らしの世帯の割合。ひとり暮らしの世帯は1人なので、多いほど1世帯の人数は少なくなります';
        qs.push({ t: 'write', q: '1世帯の人数が少ないのはどちらの街？ グラフの中で、それとつながっていそうな数字を1つ書こう。', lines: 1, ans: lo.name, ex });
      } else if (hiOf('kyodo')) {
        const [hi, lo] = hiOf('kyodo');
        const ex =
          S(hi, 'dens') > S(lo, 'dens')
            ? `例：人口密度（${hi.name}${mbV(hi, 'dens')}、${lo.name}${mbV(lo, 'dens')}）。人が多く集まる街では、マンションなどの共同住宅が多くなります`
            : '例：一戸建てに住む世帯の割合。一戸建てが少ないと、共同住宅に住む世帯が多くなります';
        qs.push({ t: 'write', q: '共同住宅に住む世帯の割合が高いのはどちらの街？ グラフの中で、それとつながっていそうな数字を1つ書こう。', lines: 1, ans: hi.name, ex });
      }
      // 家の備え（1文は C.mansion。出典は data/sources.yml）。共同住宅の割合が同じ表示のときは出さない
      const kh = hiOf('kyodo');
      if (kh) qs.push({ t: 'home', q: `${C.mansion.why}この備えが当てはまる世帯の割合が高いのは？　`, src: C.mansion.src, ans: kh[0].name, ex: `共同住宅に住む世帯は${both('kyodo')}。家の数字は、まちの社会科の「わが家の防災カルテ」で計算できます` });
    } else {
      // 高校生以上：全国とくらべて向きが逆の数字
      const ks = ['kyodo', 'ikko', 'single', 'p014', 'dens', 'per'];
      const opp = ks.filter((k) => S(a, k) !== S(N, k) && S(b, k) !== S(N, k) && S(a, k) > S(N, k) !== S(b, k) > S(N, k));
      qs.push({ t: 'opp', q: '全国（▲）より、片方の街は高く、もう片方は低い数字に、全部丸をつけよう。', words: [...ks.map(sh), 'なし'], ans: opp.length ? opp.map(sh).join('・') : 'なし', ex: ks.map((k) => `${sh(k)} ${both(k)}・全国${k === 'dens' ? mbV(N, 'dens') : k === 'per' ? mbV(N, 'per') : `${N[k].toFixed(1)}%`}`).join('<br>') });
      // ちがいの理由（仮説）：ちがいがいちばん大きい割合
      const big = ['kyodo', 'ikko', 'single', 'p014'].filter((k) => hiOf(k) && mbMid(k, a, b)).sort((p, q) => Math.abs(a[q] - b[q]) - Math.abs(a[p] - b[p]))[0];
      if (big) {
        const [hi, lo] = hiOf(big);
        const df = (Math.round((hi[big] - lo[big]) * 10) / 10).toFixed(1);
        const dr = mbRatio(hi.dens, lo.dens);
        let ex = '';
        if ((big === 'kyodo' && hi.dens > lo.dens && dr) || (big === 'ikko' && lo.dens > hi.dens && dr)) {
          const [dh, dl] = hi.dens > lo.dens ? [hi, lo] : [lo, hi];
          ex = `例：${dh.name}は人口密度が${mbV(dh, 'dens')}で、${dl.name}の約${dr.toFixed(1)}倍。土地が少なく人が多く集まる街では、マンションなどの共同住宅が多くなる、と考えられます`;
        } else if ((big === 'kyodo' || big === 'single') && S(hi, big === 'kyodo' ? 'single' : 'kyodo') > S(lo, big === 'kyodo' ? 'single' : 'kyodo') && mbMid(big === 'kyodo' ? 'single' : 'kyodo', hi, lo)) {
          const o = big === 'kyodo' ? 'single' : 'kyodo';
          ex = `例：${hi.name}は${lab(o)}の割合も${mbV(hi, o)}で、${lo.name}（${mbV(lo, o)}）より高い。${big === 'kyodo' ? 'ひとり暮らしの人は、アパートなどの共同住宅に住むことが多い' : 'アパートなど1人で住む部屋の多い住まいがあると、ひとり暮らしの人がふえる'}、と考えられます`;
        } else if ((big === 'p014' || big === 'ikko') && S(hi, big === 'p014' ? 'ikko' : 'p014') > S(lo, big === 'p014' ? 'ikko' : 'p014') && mbMid(big === 'p014' ? 'ikko' : 'p014', hi, lo)) {
          const o = big === 'p014' ? 'ikko' : 'p014';
          ex = `例：${hi.name}は${lab(o)}の割合も${mbV(hi, o)}で、${lo.name}（${mbV(lo, o)}）より高い。子どものいる家族は一戸建てに住むことが多い、と考えられます`;
        } else {
          ex = `例：${hi.name}と${lo.name}で、駅からの近さや住宅が建った時期がちがうのかもしれない。たしかめるには、この紙にない数字も要ります`;
        }
        qs.push({ t: 'write', q: `${lab(big)}の割合は、${hi.name}のほうが${df}%高い。このちがいが生まれる理由を、グラフのほかの数字を使って考えて書こう（仮説）。`, lines: 2, ans: '', ex });
      }
      qs.push({ t: 'write', q: 'この2つの街について、ほかに調べたい数字と、そう思った理由を書こう。', lines: 2, ans: '', ex: '例：通勤・通学で街に出入りする人の数（国勢調査の「昼間人口」）。人口密度や住まいのちがいと、働く場所や学校の近さがつながっているか調べられます' });
    }
  }
  return { qs, ans: qs.map((q, i) => [g === 's' ? String(i + 1) : `問${i + 1}`, q.ans, q.ex]) };
}

// B の問題の紙（.sheet の中身）
export function mbSheetB(C, g, a, b, q) {
  const N = C.nat;
  const co = C.col;
  const na = mbEsc(a.name);
  const nb = mbEsc(b.name);
  const title = `${na}と${nb}をくらべる`;
  const len = a.name.length + b.name.length + 6;
  const fs = len > 14 ? Math.max(20, Math.floor((31 * 14) / len)) : 0;
  const or2 = `<span class="mb-or">${na}<i>・</i>${nb}</span>`;
  if (g === 's') {
    const cards = [a, b].map((d, i) => `<svg class="mb-svg" width="312" height="358" viewBox="0 0 540 620" aria-hidden="true">${mcStyle()}${mcPaper(d.r, i, d.pn, C.M)}</svg>`).join('');
    const body = q.qs
      .map((x, i) => {
        const n = String(i + 1);
        if (x.t === 'cmp') return `${mbQh(C, n, x.head, x.small)}<div class="mb-cqs">${x.cmp.map((c) => `<p class="mb-cq"><span class="mb-kn">${c.kn}</span><span>${c.q}</span>${or2}</p>`).join('')}</div>`;
        if (x.t === 'nat') return `${mbQh(C, n, x.head)}<p class="mb-qt">${x.q}</p><p class="mb-qt mb-wds"><span class="mb-or">${na}<i>・</i>${nb}<i>・</i>どちらも<i>・</i>どちらでもない</span></p>`;
        return `${mbQh(C, n, x.head)}<p class="mb-qt">${x.q}<span class="mb-hint">${x.hint}</span></p><div class="mb-lines">${'<p></p>'.repeat(x.lines)}</div>`;
      })
      .join('\n');
    return `${mbHead(C, title, `カードを見て、多いほうの街に丸をつけよう。数字は${C.year}年の国勢調査から`, fs)}
<div class="mb-cards">${cards}</div>
<div class="mb-bs">${body}</div>
${mbFoot(C)}`;
  }
  const its = mbItemsB();
  const pa = mbPer1(a.per);
  const pb = mbPer1(b.per);
  const pr = mbPerRange(Math.min(pa, pb, mbPer1(N.per), a.per, b.per, N.per), Math.max(pa, pb, mbPer1(N.per), a.per, b.per, N.per));
  const close = (Math.abs(a.per - b.per) / (pr.hi - pr.lo)) * 644 < 150;
  const kana = ['ア', 'イ', 'ウ', 'エ'];
  const body = q.qs
    .map((x, i) => {
      const n = `<b>問${i + 1}</b>`;
      if (x.t === 'ops') return `<p class="mb-qt mb-qq">${n}${x.q}</p><div class="mb-ops">${x.ops.map((o, j) => `<p><span class="mb-kn">${kana[j]}</span>${o.t}</p>`).join('')}</div>`;
      if (x.t === 'ratio') return `<p class="mb-qt mb-qq">${n}${x.q}　答え 約${mbWr(70)}倍</p>`;
      if (x.t === 'home') return `<p class="mb-qt mb-qq">${n}${x.q}${or2}　あなたの家は？　共同住宅 ・ 一戸建て ・ そのほか</p><p class="mb-qt mb-sm">${x.src}</p>`;
      if (x.t === 'opp') return `<p class="mb-qt mb-qq">${n}${x.q}</p><p class="mb-qt mb-wds">${x.words.join('<i>・</i>')}</p>`;
      return `<p class="mb-qt mb-qq">${n}${x.q}</p><div class="mb-lines">${'<p></p>'.repeat(x.lines)}</div>`;
    })
    .join('\n');
  const lead = g === 'c' ? 'グラフを読んで、2つの街のちがいを考えよう' : '2つの街のちがいと、その理由を数字から考えよう';
  return `${mbHead(C, title, `${lead}。数字は${C.year}年の国勢調査から`, fs)}
<p class="mb-lg"><span><i style="background:${co.bar}"></i>${na}</span><span><i style="background:${co.water}"></i>${nb}</span><span><svg width="12" height="10" viewBox="0 0 12 10"><path d="M6 1l5 8H1z" fill="${co.ink}"/></svg>全国</span></p>
${mbQh(C, '1', '世帯と人の割合', '共同住宅＝マンション・アパートなど')}
${mbPairBars(C, its.map((x) => ({ label: x.lab, a: a[x.key], b: b[x.key], nat: N[x.key], ta: mbV(a, x.key), tb: mbV(b, x.key) })), { max: 100, n: 10, ticks: [[0, '0%'], [50, '50%'], [100, '100%']] })}
${mbQh(C, '2', '人口密度', '1km²あたりの人口')}
${mbPairBars(C, [{ label: '人口密度', a: a.dens, b: b.dens, nat: N.dens, ta: mbV(a, 'dens'), tb: mbV(b, 'dens') }], mbDensScale(a.dens, b.dens, N.dens))}
${mbQh(C, '3', '1世帯の人数', '目盛りは0.1人ずつ')}
${mbNumline(C, { lo: pr.lo, hi: pr.hi, minor: 0.1, major: 0.5, unit: '人', top: close ? 18 : 0, marks: [{ v: a.per, label: `${a.name} ${pa.toFixed(1)}人`, color: co.bar, text: co.num, up: close ? 18 : 0 }, { v: b.per, label: `${b.name} ${pb.toFixed(1)}人`, color: co.water, text: co.num2 }], nat: N.per, natLabel: `全国 ${mbPer1(N.per).toFixed(1)}人` })}
<span class="mb-river">${C.river}</span>
${body}
${mbFoot(C)}`;
}

// B の答えの紙の数字の表
export function mbTableB(C, a, b) {
  const N = C.nat;
  const row = (l, k, f) => [l, f(a, k), f(b, k), f(N, k)];
  const pct = (d, k) => `${d[k].toFixed(1)}%`;
  return [
    row('人口', 'pop', (d) => `${mbFmt(d.pop)}人`),
    row('1世帯の人数', 'per', (d) => `${d.per.toFixed(2)}人`),
    row('人口密度（1km²あたり）', 'dens', (d) => mbV(d, 'dens')),
    row('共同住宅に住む世帯', 'kyodo', pct),
    row('一戸建てに住む世帯', 'ikko', pct),
    row('ひとり暮らしの世帯', 'single', pct),
    row('15歳未満の人', 'p014', pct),
  ];
}

// 紙を全部（問題の1枚と、えらんだときは答えの2枚目）。d は mbCity の形、B は d と d2 が mbAddB の形
export function mbSheets(C, st, d, d2) {
  const G = { s: '小学生', c: '中学生', h: '高校生以上' };
  if (st.k === 'b' && d2) {
    const q = mbQuizB(C, st.g, d, d2);
    const p1 = `<div class="sheet" lang="ja">${mbSheetB(C, st.g, d, d2, q)}</div>`;
    if (!st.a) return p1;
    const notes = ['共同住宅・一戸建ては住宅に住む一般世帯のうち、ひとり暮らしは一般世帯のうちの割合。全国は市区町村の合計から計算（人口密度は全国の人口と面積から）', 'くらべているのは数字の大きさです。住みやすさのよしあしではありません'];
    return p1 + mbAnsSheet(C, `${d.name}と${d2.name}（${G[st.g]}）`, q.ans, [d.name, d2.name, '全国'], mbTableB(C, d, d2), notes);
  }
  const q = mbQuizA(C, st.g, d);
  const p1 = `<div class="sheet" lang="ja">${mbSheetA(C, st.g, d)}</div>`;
  if (!st.a) return p1;
  const notes = ['15歳未満は人口のうち、ひとり暮らしは一般世帯のうち、共同住宅は住宅に住む一般世帯のうちの割合。全国は市区町村の合計から計算'];
  if (st.g === 'h') notes.push(`人口の▲は全国の${mbFmt(C.nat.count)}市区町村の人口のまん中（${mbFmt(C.nat.popMid)}人）`);
  return p1 + mbAnsSheet(C, `${d.name}を読む（${G[st.g]}）`, q.ans, [d.name, '全国'], mbTable(C, d), notes);
}
