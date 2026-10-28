// わが家の防災カルテ（/dougu/karte/、夜のメモ #29・案3「絵で量を見る」）の計算と紙の部品
//   ページを作るときと、ブラウザの中の両方で同じ関数を使う（toString でページのスクリプトに入れる）。
//   なので、どの関数もほかの ka* 関数と引数だけを使い、外の変数を読まない。
//   C はページの設定（src/pages/karte.mjs の karteConf）。数字は items.yml から、全国の値はデータの合計から。

export function kaEsc(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
}

// 入れたものを、ありえる範囲にそろえる（URL の ? やおぼえた値から来るので）
export function kaState(o, days) {
  const num = (v, lo, hi, def) => {
    const x = Math.floor(Number(v));
    return Number.isFinite(x) && x >= lo ? Math.min(hi, x) : def;
  };
  const n = num(o.n, 1, 10, 3);
  return {
    m: /^\d{5}$/.test(String(o.m ?? '')) ? String(o.m) : '',
    n,
    d: days.includes(Number(o.d)) ? Number(o.d) : days[days.length - 1],
    s: o.s === 'm' ? 'm' : 'k',
    y: Math.min(n, num(o.y, 0, 10, 0)),
  };
}

// 量＝1人1日の量 ×（ほかの人数 × 日数 ＋ 2週間分の人数 × 14）
export function kaAmounts(per, yd, st) {
  const pd = (st.n - st.y) * st.d + st.y * yd;
  const mizu = per.mizu * pd;
  return { pd, mizu, shoku: per.shoku * pd, toilet: per.toilet * pd, bottles: Math.ceil(mizu / 2), boxes: Math.ceil(mizu / 12) };
}

// 方眼の1マスがいくつ分か（21×10マスにおさまる 1・2・5・10 のいちばん小さいもの）
export function kaUnit(c) {
  for (const u of [1, 2, 5, 10]) if (Math.ceil(c / u) <= 210) return u;
  return 10;
}

// 2Lボトル（横16本×3段＝48本まで）。こえたら 2L×6本の箱（1箱＝12L）を横10箱ずつ
export function kaWaterSvg(a) {
  const ink = '#23312a';
  if (a.bottles <= 48) {
    const rows = Math.max(1, Math.ceil(a.bottles / 16));
    let g = '';
    for (let i = 0; i < a.bottles; i++) {
      const x = 2 + (i % 16) * 21;
      const y = 4 + Math.floor(i / 16) * 44;
      g += `<g transform="translate(${x},${y})"><path d="M5 0h6v4c3 2 5 4 5 8v22c0 2-1 3-3 3H3c-2 0-3-1-3-3V12c0-4 2-6 5-8z" fill="#d5eaf5" stroke="${ink}" stroke-width="1"/><rect x="4" y="-2" width="8" height="3" fill="#3f8fbf"/></g>`;
    }
    return `<svg class="kw" width="340" height="${rows * 44 + 2}" viewBox="0 0 340 ${rows * 44 + 2}" aria-hidden="true">${g}</svg>`;
  }
  const rows = Math.ceil(a.boxes / 10);
  let g = '';
  for (let i = 0; i < a.boxes; i++) {
    const x = 2 + (i % 10) * 34;
    const y = 2 + Math.floor(i / 10) * 30;
    g += `<g transform="translate(${x},${y})"><rect x="0" y="4" width="30" height="22" fill="#d5eaf5" stroke="${ink}" stroke-width="1"/><path d="M0 4l4-4h22l4 4" fill="none" stroke="${ink}" stroke-width="1"/><path d="M5 9v12M10 9v12M15 9v12M20 9v12M25 9v12" stroke="#3f8fbf" stroke-width="1.6"/></g>`;
  }
  return `<svg class="kw" width="340" height="${rows * 30 + 2}" viewBox="0 0 340 ${rows * 30 + 2}" aria-hidden="true">${g}</svg>`;
}

// 方眼のマス（1マス＝u）。21列
export function kaGridSvg(c, u, fill) {
  const cells = Math.ceil(c / u);
  const rows = Math.max(1, Math.ceil(cells / 21));
  let g = '';
  for (let i = 0; i < cells; i++) g += `<rect x="${(i % 21) * 13 + 0.5}" y="${Math.floor(i / 21) * 13 + 0.5}" width="11" height="11" fill="${fill}" stroke="#23312a" stroke-width=".6"/>`;
  return `<svg class="kg" width="274" height="${rows * 13}" viewBox="0 0 274 ${rows * 13}" aria-hidden="true">${g}</svg>`;
}

// 0〜100% のものさし（10ごとに目盛り）と全国の▲
export function kaGauge(lab, v, nat) {
  const ok = Number.isFinite(v);
  const tk = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((i) => `<s style="left:${i * 10}%"></s>`).join('');
  return `<div class="ga"><p><span>${lab}</span><b>${ok ? `${v.toFixed(1)}%` : ''}</b></p><div class="gb">${ok ? `<i style="width:${Math.max(0, Math.min(100, v))}%"></i>` : ''}${tk}<u style="left:${nat}%"></u></div></div>`;
}

// 街と住まいからの1行（市区町村ページの「この街の備え」と同じ条件：共同住宅50%以上・ひとり暮らしが全国＋3ポイント以上。言い回しは今ある読みものから）
//   row は /kurabe/kazu.json の1行（割合は10倍の整数）。2週間分の人がいれば、もう1行
export function kaLines(C, st, row) {
  const L = C.lines;
  const out = [];
  if (st.s === 'm') out.push({ ...L.mansion, why: row && row[8] >= 500 ? `世帯の${Math.round(row[8] / 100)}割が共同住宅に住む街です。` : L.mansion.why });
  else if (st.n === 1) out.push({ ...L.hitori, why: row && row[7] >= C.single3 ? `ひとり暮らしの世帯が${(row[7] / 10).toFixed(1)}%の街です。` : L.hitori.why });
  else out.push(L.zaitaku);
  if (st.y > 0) out.push(L.akachan);
  return out;
}

// 紙の中身（.sheet の中）。row は街の行（えらぶ前は null）、pn は都道府県の名前、today は「2026年10月28日」
export function kaSheet(C, st, row, pn, today) {
  const a = kaAmounts(C.per, C.yd, st);
  const f = (v) => Math.round(v).toLocaleString('ja-JP');
  const wr = (w) => `<span class="wr" style="width:${w}px"></span>`;
  const us = kaUnit(a.shoku);
  const ut = kaUnit(a.toilet);
  const water = a.bottles <= 48 ? `2Lボトル ${f(a.bottles)}本` : `2L×6本の箱 ${f(a.boxes)}箱`;
  const who = `家族 <b>${st.n}</b>人${st.y ? `（うち2週間分 <b>${st.y}</b>人）` : ''}<br>${st.s === 'm' ? 'マンション・アパート' : '一戸建て'}・<b>${st.d}</b>日分`;
  const qty = { mizu: `${f(a.mizu)}L`, shoku: `${f(a.shoku)}食`, toilet: `${f(a.toilet)}回分` };
  const v = (k) => (row ? row[k] / 10 : NaN);
  const lines = kaLines(C, st, row)
    .map((l) => `<p class="kl"><span>${kaEsc(l.why)}<a href="${l.href}">${kaEsc(l.text)}</a></span><small>${C.host}${l.href}</small></p>`)
    .join('');
  return `<span class="band">${C.band}</span>
<div class="ttl"><div><p class="h1">わが家の防災カルテ</p><p class="dt">${today ? kaEsc(today) : `${wr(48)}年${wr(26)}月${wr(26)}日`}に作成</p></div>
<div class="who"><p class="mc">${row ? `<b>${kaEsc(row[1])}</b>（${kaEsc(pn)}）` : `${wr(150)}`}</p><p>${who}</p></div></div>
<p class="h2">${C.hm}わが家の量<small>${kaEsc(C.perText)}</small></p>
<div class="amt">
<div class="am"><span class="lb">水</span><b>${f(a.mizu)}</b><small>L</small><span class="nt">${water}${a.bottles > 48 ? '<br>1箱＝12L' : ''}</span></div>${kaWaterSvg(a)}
<div class="am"><span class="lb">主食</span><b>${f(a.shoku)}</b><small>食</small><span class="nt">1マス＝${us}食</span></div>${kaGridSvg(a.shoku, us, '#dcebd9')}
<div class="am"><span class="lb">携帯トイレ</span><b>${f(a.toilet)}</b><small>回分</small><span class="nt">1マス＝${ut}回</span></div>${kaGridSvg(a.toilet, ut, '#e4e6e5')}
</div>
<span class="river">${C.river}</span>
<p class="h2">${C.hm}この街の数字<small>▲は全国</small></p>
<div class="gs">${kaGauge('65歳以上', v(5), C.nat.p65)}${kaGauge('ひとり暮らし', v(7), C.nat.single)}${kaGauge('共同住宅', v(8), C.nat.kyodo)}</div>
${lines}
<p class="h2">${C.hm}期限を書いておく</p>
<div class="kgs">${C.kigen.map((e) => `<div class="tr"><span class="bx"></span><span class="nm">${kaEsc(e.name)}${e.q ? `<small>わが家は ${qty[e.q]}</small>` : ''}</span><span class="dd">${wr(52)}年${wr(30)}月${wr(30)}日</span></div>`).join('')}</div>
<p class="h2">${C.hm}家族で決めておくこと</p>
<div class="fam"><p>集まる場所${wr(330)}</p><p>連絡は 災害用伝言ダイヤル <b>${kaEsc(C.dengon)}</b></p></div>
<div class="foot"><p>${C.src}</p><p><span class="site">${kaEsc(C.site)}</span>${C.host}/dougu/karte/</p></div>`;
}
