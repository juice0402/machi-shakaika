// 人口が増えた市区町村の共有画像（1200×675、X にも貼る。10/27 しょーくんが案A）
// 数字はページと同じ rankingData() から。作ったら数字のしるしを data/og-ranking-jinko.json に書く
// （データが変わってしるしが合わなくなると、ページはサイトの共有画像にもどる）
// 使い方（リポジトリのいちばん上で、Claude の作業場から）：node tools/og/ranking-jinko.mjs
import { writeFileSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { readMunis } from '../../src/munis.mjs';
import { muniList, prefOf } from '../../src/stats.mjs';
import { rankingData, rateText, ogSig, OG_RANKING, MIN_POP, NOTE_KUMIKAE } from '../../src/pages/ranking.mjs';
import { TREES, fmt, jpDate } from '../../src/layout.mjs';
import { SITE } from '../../src/site.mjs';

const munis = readMunis();
const list = muniList(munis.areas);
const { up, byRate } = rankingData({ munis, list });
const rows = byRate.slice(0, OG_RANKING.top);
const { w: W, h: H } = OG_RANKING;

const MIN = "'Noto Serif CJK JP',serif";
const GOT = "'Noto Sans CJK JP',sans-serif";
const trees = TREES('tr').replace('viewBox="0 0 390 24"', `viewBox="0 0 ${W} 24"`).replace('height="24"', `width="${W}" height="24"`).replace('<rect width="390"', `<rect width="${W}"`);
const HM = `<svg class="hm" viewBox="0 0 18 14" width="34" height="26" aria-hidden="true"><path d="M2 13l5-11 5 11z" fill="currentColor"/><circle cx="13" cy="7" r="4" fill="currentColor" opacity=".55"/></svg>`;
const title = '2020年から人口が増えた市区町村';

// 棒：0〜MAX%（12% か、1位が入る2%きざみ）
const MAX = Math.max(12, Math.ceil(rows[0].rate / 2) * 2);
const P = 350;
const x = (v) => (v / MAX) * P;
const ticks = Array.from({ length: MAX / 2 + 1 }, (_, i) => i * 2);
const X0 = 30 + 14 + 238 + 14;

const html = `<!doctype html><html lang="ja"><head><meta charset="utf-8"><title>${title}</title><style>
:root{--bg:#fff;--ink:#23312a;--sub:#5f6e66;--line:#d3dfd5;--accent:#c53d43;--num:#2f6b45;--h2:#2f5d3e;--bar:#4f8d5e}
*{box-sizing:border-box}html,body{margin:0}
body{width:${W}px;height:${H}px;overflow:hidden;position:relative;background:var(--bg);color:var(--ink);font-family:${GOT};font-variant-numeric:tabular-nums}
.trees{position:absolute;left:0;top:0;line-height:0}
.ttl{position:absolute;left:44px;top:38px;margin:0;display:flex;align-items:center;gap:14px;font:700 46px/1.2 ${MIN};letter-spacing:.04em;white-space:nowrap}
.hm{color:var(--h2);flex:none}
.sub{font:700 29px/1.3 ${MIN};color:var(--h2);margin:0}
.cond{font-size:18px;color:var(--sub);margin:4px 0 0}
.ft{position:absolute;left:44px;right:44px;bottom:14px;display:flex;justify-content:space-between;align-items:baseline;gap:24px;padding-top:10px;border-top:1px solid var(--line);font-size:16px;line-height:1.4;color:var(--sub)}
.site{font:700 20px/1.2 ${MIN};color:var(--ink);letter-spacing:.06em;white-space:nowrap}.site small{font:15px ${GOT};color:var(--sub);letter-spacing:0;margin-left:10px}
.no{font-size:22px;color:var(--sub);text-align:right;position:relative}
.no.han{color:var(--accent);font-weight:700}
.no.han::after{content:"";position:absolute;right:-9px;top:50%;width:36px;height:36px;margin-top:-18px;border:2.5px solid var(--accent);border-radius:50%;box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3.5px var(--accent);transform:rotate(-8deg)}
.nm{font-size:30px;line-height:1.1;white-space:nowrap}.nm small{font-size:16px;color:var(--sub);margin-left:8px}
.v{font-size:30px;font-weight:700;color:var(--num);white-space:nowrap;line-height:1}.v small{font-size:20px;font-weight:700;margin-left:1px}
.left{position:absolute;left:44px;top:132px;width:318px}
.lead{font:700 27px/1.3 ${MIN};color:var(--h2);margin:0}
.bign{font-size:112px;font-weight:700;color:var(--num);line-height:1;margin:10px 0 0;letter-spacing:-.01em}
.mnote{font-size:18px;color:var(--sub);margin:10px 0 0}
.hero{position:absolute;left:44px;bottom:96px;width:318px;height:auto}
.right{position:absolute;left:408px;top:112px;width:748px}
.plot{position:relative;margin-top:8px;height:${28 + rows.length * 38}px}
.tk{position:absolute;top:0;bottom:0;width:1px;background:var(--line)}.tk b{position:absolute;top:0;left:0;transform:translateX(-50%);font-size:16px;font-weight:400;color:var(--sub);background:#fff;padding:0 3px;white-space:nowrap}
.tk.z{background:var(--sub)}
.r{position:absolute;left:0;right:0;height:38px;display:grid;grid-template-columns:30px 238px 1fr;gap:0 14px;align-items:center}
.bar{position:relative;height:100%}.bar i{position:absolute;left:0;top:10px;height:18px;background:var(--bar)}
.bar .v{position:absolute;top:50%;transform:translateY(-50%)}
</style></head><body><div class="trees">${trees}</div><h1 class="ttl">${HM}${title}</h1>
<div class="left"><p class="lead">人口が増えた市区町村</p><p class="bign">${fmt(up.length)}</p><p class="mnote">全国${fmt(list.length)}市区町村のうち</p></div>
<img class="hero" src="../../static/hero-860.webp" alt="">
<div class="right"><p class="sub">増えた割合が大きい${rows.length}の街</p><p class="cond">人口${MIN_POP / 10000}万人以上の市区町村。2020年の人口とくらべた増え方</p>
<div class="plot">${ticks.map((t) => `<span class="tk${t === 0 ? ' z' : ''}" style="left:${X0 + x(t)}px;top:${t === 0 ? 28 : 0}px"><b style="top:${t === 0 ? -28 : 0}px">${t}%</b></span>`).join('')}
${rows.map((r, i) => `<div class="r" style="top:${28 + i * 38}px"><span class="no${i === 0 ? ' han' : ''}">${i + 1}</span><span class="nm">${r.name}<small>${prefOf(r.code).name}</small></span><span class="bar"><i style="width:${x(r.rate).toFixed(1)}px"></i><span class="v" style="left:${(x(r.rate) + 10).toFixed(1)}px">${rateText(r).replace('%', '<small>%</small>')}</span></span></div>`).join('')}</div></div>
<footer class="ft"><span>出典：総務省「${munis.statName}」を加工して作成（${jpDate(munis.survey)}現在・${jpDate(munis.published)}公表）<br>${NOTE_KUMIKAE}</span><span class="site">${SITE.name}<small>${SITE.url.replace(/^https?:\/\//, '')}</small></span></footer>
</body></html>`;

const src = 'tools/og/ranking-jinko.out.html';
writeFileSync(src, html);
execFileSync('python3', ['tools/og/render.py', src, `static${OG_RANKING.file}`, String(W), String(H)], { stdio: 'inherit' });
writeFileSync(OG_RANKING.sig, `${JSON.stringify({ sig: ogSig({ munis, list }) }, null, 1)}\n`);
console.log('しるし', OG_RANKING.sig);
