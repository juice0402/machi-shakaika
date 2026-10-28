// わが家の防災カルテ（/dougu/karte/、夜のメモ #29。10/28 しょーくんが案3「絵で量を見る」に決定）：A4 縦1枚
//   街・家族の人数・日数・住まい・2週間分の人を入れると、わが家の量（ボトルとマスの絵）と街の数字が1枚の紙になる
//   量は items.yml の per_day・yohairyo_days だけで計算（src/karte-core.mjs）。街の数字は /kurabe/kazu.json を街をえらんだときだけ読む
//   入れたものはブラウザの中だけ（URL の ? とこの端末におぼえるだけ。送らない）。印刷のやり方は /dougu/print/ と同じ。AdSense なし
import { esc, h2, fit, srcKokusei, TREES, RIVER, HAN, MINCHO, GOTHIC } from '../layout.mjs';
import { checkEntries } from '../data.mjs';
import { sourceList } from './sonae.mjs';
import { SITE } from '../site.mjs';
import { kaEsc, kaState, kaAmounts, kaUnit, kaWaterSvg, kaGridSvg, kaGauge, kaLines, kaSheet } from '../karte-core.mjs';
import { findForm, PICK_JS } from './kurabe.mjs';

export const KARTE_PATH = '/dougu/karte/';
const CORE = [kaEsc, kaState, kaAmounts, kaUnit, kaWaterSvg, kaGridSvg, kaGauge, kaLines, kaSheet].map((f) => f.toString()).join('\n');

const W = 635; // 木の帯：/dougu/print/ と同じ（A4 の幅へ）
const band = () => TREES('kt').replace('viewBox="0 0 390 24"', `viewBox="0 0 ${W} 24"`).replace('<rect width="390"', `<rect width="${W}"`);
const HM = h2('x').match(/<svg[^]*?<\/svg>/)[0];

// 出典の発行元を短く（紙のいちばん下）。題つきの全部はページの「出典」に
function srcShort(ids, sources) {
  const by = new Map(sources.sources.map((s) => [s.id, s]));
  const list = ids.map((id) => {
    const s = by.get(id);
    if (!s) throw new Error(`出典 ${id} が sources.yml にない`);
    return s;
  });
  const pubs = [...new Set(list.map((s) => s.publisher))];
  const ds = list.map((s) => String(s.checked)).sort();
  const [y1, m1] = ds[0].split('-').map(Number);
  const [y2, m2] = ds.at(-1).split('-').map(Number);
  const when = y1 === y2 && m1 === m2 ? `${y1}年${m1}月` : `${y1}年${m1}月〜${y2}年${m2}月`;
  return `${pubs.map(esc).join('・')}（${when}確認）`;
}

export function karteConf({ cc, items, sources, munis, nat, z }) {
  const b = items.checklists.find((c) => c.id === 'bichiku');
  if (!b) throw new Error('items.yml の checklists に bichiku がない');
  const ents = checkEntries(items, b);
  const Q = { mizu: 'mizu', shushoku: 'shoku', 'keitai-toilet': 'toilet' };
  const kigen = b.entries.map((e, i) => (e.kigen ? { name: ents[i].name, q: (ents[i].qty && Q[ents[i].item.id]) || null } : null)).filter(Boolean);
  const yd = items.yohairyo_days;
  const ids = [...new Set([...items.days.sources, ...items.yohairyo_sources, ...cc.by.mizu.sources, ...cc.by.shushoku.sources, ...cc.by['keitai-toilet'].sources, ...ents.filter((e, i) => b.entries[i].kigen).flatMap((e) => e.sources), ...items.kitaku.sources])];
  return {
    ids,
    conf: {
      per: cc.per,
      yd,
      days: cc.days.choices,
      nat,
      single3: Math.round((z.pSingle + 3) * 10),
      kigen,
      perText: `1人1日 水${cc.per.mizu}L・主食${cc.per.shoku}食・トイレ${cc.per.toilet}回で計算`,
      dengon: items.kitaku.dengon,
      host: SITE.url.replace('https://', ''),
      site: SITE.name,
      band: band(),
      river: RIVER,
      hm: HM,
      src: `出典：総務省「${esc(munis.statName)}」を加工して作成（▲は全国）・${srcShort(ids, sources)}`,
      // 1行の言い回しは今ある読みもの（/sonae/…）の文から。新しい数字や注意は足さない
      lines: {
        mansion: { why: 'マンションは停電でポンプの給水が止まることがあります。', text: 'マンションの備え', href: '/sonae/mansion/' },
        hitori: { why: '1人分の量と、せまい部屋での置き方。', text: 'ひとり暮らしの備え', href: '/sonae/hitorigurashi/' },
        zaitaku: { why: '家が無事なとき、家で過ごすための備え。', text: '在宅避難の備え', href: '/sonae/zaitaku-hinan/' },
        akachan: { why: `配慮が要る家族の分は少なくとも${yd}日分。`, text: '赤ちゃん・高齢の家族の備え', href: '/sonae/akachan-koureisha/' },
      },
    },
  };
}

// 紙の中の見た目（.sheet の中だけ）。1px は印刷で 1/96 インチ。A4 は 794×1123px
const S = '.sheet';
const SHEET_CSS = `.sheetwrap{margin:12px 0 4px;border:1px solid var(--line);overflow:hidden;background:#fff}
${S}{width:210mm;height:297mm;padding:5mm 14mm 0;display:flex;flex-direction:column;overflow:hidden;background:#fff;color:var(--ink);font:14px/1.5 ${GOTHIC};transform-origin:0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
${S} p{margin:0}${S} cite{font-style:normal}${S} a{color:var(--ink)}
${S} .band{display:block;margin:0 -14mm;line-height:0}${S} .band svg{display:block;width:100%;height:30px}
${S} .ttl{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:12px 0 0}
${S} .ttl>div:first-child{flex:none}${S} .h1{font:700 34px/1.2 ${MINCHO};letter-spacing:.04em;white-space:nowrap}
${S} .dt{font-size:13px;color:var(--sub);margin-top:4px}
${S} .who{text-align:right;font-size:14px;line-height:1.45}${S} .who b{font-size:19px}${S} .mc b{font:700 21px/1.3 ${MINCHO}}
${S} .wr{display:inline-block;border-bottom:1.3px solid var(--ink);height:1.25em;vertical-align:-.3em;margin:0 4px}
${S} .h2{font:700 19px/1.3 ${MINCHO};color:var(--h2);display:flex;align-items:center;gap:8px;margin:12px 0 5px}
${S} .h2 svg{width:19px;height:15px}${S} .h2 small{margin-left:auto;font:400 11.5px/1 ${GOTHIC};color:var(--sub)}
${S} .amt{display:grid;grid-template-columns:150px 1fr;gap:10px 14px;align-items:center}
${S} .am .lb{display:block;font-size:13px;color:var(--sub)}${S} .am b{font:700 34px/1 ${GOTHIC};color:var(--num);font-variant-numeric:tabular-nums}
${S} .am>small{font-size:15px;margin-left:3px}${S} .am .nt{display:block;font-size:11.5px;color:var(--sub);margin-top:2px;line-height:1.35}
${S} .amt svg{display:block}
${S} .river{display:block;line-height:0;margin:12px 0 0}${S} .river svg{display:block;width:100%;height:10px}
${S} .gs{display:grid;grid-template-columns:repeat(3,1fr);gap:20px;margin:6px 0 8px}
${S} .ga p{display:flex;justify-content:space-between;align-items:baseline;font-size:13.5px}${S} .ga b{font-size:18px;color:var(--num)}
${S} .gb{position:relative;height:10px;background:var(--track);margin-top:8px}${S} .gb i{position:absolute;left:0;top:0;bottom:0;background:var(--bar)}
${S} .gb s{position:absolute;top:0;bottom:0;width:1px;background:#fff;opacity:.9}
${S} .gb u{position:absolute;top:-8px;width:0;height:0;border:5px solid transparent;border-top:7px solid var(--ink);margin-left:-5px}
${S} .kl{display:flex;justify-content:space-between;align-items:baseline;gap:10px;font-size:13.5px;padding:2px 0}${S} .kl a{font-weight:700}${S} .kl small{font-size:10px;color:var(--sub);white-space:nowrap}
${S} .kgs{flex:6 1 0;min-height:0;display:grid;grid-template-rows:repeat(6,minmax(26px,1fr))}
${S} .tr{display:grid;grid-template-columns:30px 1fr auto;align-items:center;gap:0 10px;border-bottom:1px dotted #9fb3a6}
${S} .bx{display:inline-block;width:22px;height:22px;border:1.4px solid var(--sub);border-radius:50%}
${S} .nm{font-size:14.5px;line-height:1.3}${S} .nm small{font-size:11.5px;color:var(--sub);margin-left:12px;white-space:nowrap}
${S} .dd{font-size:12.5px;white-space:nowrap}
${S} .fam{flex:2 1 0;min-height:0;display:grid;grid-template-rows:repeat(2,minmax(30px,1fr));font-size:15px}${S} .fam p{display:flex;align-items:center;border-bottom:1px dotted #9fb3a6}${S} .fam b{font-size:19px;margin-left:6px}
${S} .foot{margin-top:10px;padding:6px 0 7mm;font-size:9.5px;line-height:1.55;color:var(--sub)}
${S} .foot .site{font:700 12px/1 ${MINCHO};color:var(--ink);margin-right:10px;letter-spacing:.06em}`;

const FORM_CSS = `.day.sm{font-size:16px!important;padding:0 14px!important}.day.sm .han{left:0;right:0;width:auto;height:46px;margin:-23px 0 0;transform:rotate(-3deg)}
[data-pick] .hits:empty,[data-pick] .msg:empty{display:none}
.yk{display:flex;align-items:center;gap:10px;min-height:54px;border-bottom:1px dotted var(--line);font-size:13px;cursor:pointer}.yk input{width:22px;height:22px;flex:none;accent-color:var(--num)}
#kf .row[hidden]{display:none}`;

const PRINT_CSS = `@page{size:A4;margin:0}
@media print{
header,footer,.ft,.town,.sg,main>:not(.sheetwrap){display:none!important}
html,body{background:#fff}.pg{max-width:none;margin:0;padding:0}
.sheetwrap{margin:0!important;border:0!important;height:auto!important;overflow:visible!important}
${S}{transform:none!important;height:296mm}
}`;

// ブラウザの中の動き：入れたもの → 紙を作り直す → URL の ? とこの端末におぼえる
const KARTE_JS = String.raw`(()=>{const kf=document.getElementById('kf'),sh=document.querySelector('.sheet'),f=document.querySelector('[data-pick]');if(!kf||!sh)return;
let row=null,pn='',moved=false;const t=new Date(),today=t.getFullYear()+'年'+(t.getMonth()+1)+'月'+t.getDate()+'日';
const KS=['m','n','d','s','y'];let o={};if(KS.some(k=>mtQ.has(k))){KS.forEach(k=>{if(mtQ.has(k))o[k]=mtQ.get(k)});moved=true}else{try{o=Object.fromEntries(new URLSearchParams(localStorage.getItem('karte')||''))}catch(e){}}
const st=kaState(o,C.days);
const qs=()=>(st.m?'m='+st.m+'&':'')+'n='+st.n+'&d='+st.d+'&s='+st.s+'&y='+st.y;
const wrap=document.querySelector('.sheetwrap');const fit=()=>{const k=Math.min(1,wrap.clientWidth/sh.offsetWidth);sh.style.transform='scale('+k+')';wrap.style.height=Math.ceil(sh.offsetHeight*k)+'px'};
function draw(){kf.querySelector('[data-n]').textContent=st.n;kf.querySelector('[data-yn]').textContent=st.y;
kf.querySelectorAll('[data-day]').forEach(b=>{const on=+b.dataset.day===st.d;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
kf.querySelectorAll('[data-s]').forEach(b=>{const on=b.dataset.s===st.s;b.classList.toggle('on',on);b.setAttribute('aria-pressed',on)});
const cb=kf.querySelector('[data-y]');cb.checked=st.y>0;kf.querySelector('[data-yrow]').hidden=!st.y;
sh.innerHTML=kaSheet(C,st,row,pn,today);fit();
if(moved){history.replaceState(null,'','?'+qs());try{localStorage.setItem('karte',qs())}catch(e){}}}
const set=f?mtPick(f,r=>MT.load().then(K=>{row=r;pn=K.p[r[0].slice(0,2)];st.m=r[0];moved=true;draw()})):null;
kf.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;moved=true;
if(b.dataset.step){st.n=Math.min(10,Math.max(1,st.n+ +b.dataset.step));st.y=Math.min(st.y,st.n)}
else if(b.dataset.ystep){st.y=Math.min(st.n,Math.max(1,st.y+ +b.dataset.ystep))}
else if(b.dataset.day)st.d=+b.dataset.day;else if(b.dataset.s)st.s=b.dataset.s;draw()});
kf.querySelector('[data-y]').addEventListener('change',e=>{moved=true;st.y=e.target.checked?Math.max(1,st.y):0;draw()});
addEventListener('resize',fit);const p=document.querySelector('[data-print]');if(p)p.addEventListener('click',()=>print());
if(st.m&&set)MT.load().then(K=>{const r=K.r.find(x=>x[0]===st.m);if(r)set(r);else{st.m='';draw()}});draw()})();`;

export function kartePages({ cc, items, sources, munis, nat, z }) {
  const { conf, ids } = karteConf({ cc, items, sources, munis, nat, z });
  const st = kaState({}, conf.days);
  const a = kaAmounts(conf.per, conf.yd, st);
  const a4 = kaAmounts(conf.per, conf.yd, { n: 4, d: cc.days.min, y: 1 });
  const days = cc.days.choices.map((x) => `<button class="day${x === st.d ? ' on' : ''}" type="button" data-day="${x}" aria-pressed="${x === st.d}"><span>${x}日</span>${HAN}</button>`).join('');
  const form = `<section id="kf" class="calc">
<div class="row"><span class="k">家族</span><button type="button" data-step="-1" aria-label="1人へらす">−</button><b data-n>${st.n}</b><span>人</span><button type="button" data-step="1" aria-label="1人ふやす">＋</button></div>
<div class="row"><span class="k">日数</span>${days}</div>
<div class="row"><span class="k">住まい</span><button class="day sm on" type="button" data-s="k" aria-pressed="true"><span>一戸建て</span>${HAN}</button><button class="day sm" type="button" data-s="m" aria-pressed="false"><span>マンション・アパート</span>${HAN}</button></div>
<label class="yk"><input type="checkbox" data-y>赤ちゃん・高齢の家族・持病などで2週間分がいる人</label>
<div class="row" data-yrow hidden><span class="k">うち</span><button type="button" data-ystep="-1" aria-label="1人へらす">−</button><b data-yn>0</b><span>人</span><button type="button" data-ystep="1" aria-label="1人ふやす">＋</button></div>
</section>`;
  const body = `<p class="crumb"><a href="/">トップ</a> / <a href="/dougu/check/">チェックリスト</a></p>
<h1 class="city">わが家の防災カルテ</h1>
<p class="src">街と家族を入れると、A4の1枚になります</p>
${findForm('qm', '街', '例 札幌市・さっぽろ')}
${form}
<p><button class="go" type="button" data-print>印刷する・PDFにする</button></p>
<div class="sheetwrap"><div class="sheet" lang="ja">${kaSheet(conf, st, null, '', '')}</div></div>
<p class="note">入れたものは送りません。この端末のブラウザにだけおぼえます。</p>
<p><a class="go" href="/dougu/print/">冷蔵庫に貼るチェックリスト</a><br><a class="go" href="/dougu/kigen/">賞味期限をメモする</a></p>
${h2('出典')}
${srcKokusei(munis)}
${sourceList(ids, sources)}`;
  return [
    {
      path: KARTE_PATH,
      title: 'わが家の防災カルテ（印刷用）',
      description: fit(
        [`街と家族の人数・日数・住まいを入れると、水・主食・携帯トイレの量を絵にしたA4の1枚に。${st.n}人の${st.d}日分は水${a.mizu}L・主食${a.shoku}食・携帯トイレ${a.toilet}回分。`],
        [[`${conf.yd}日分がいる人を1人入れた4人の${cc.days.min}日分は水${a4.mizu}L。`, '街の65歳以上・ひとり暮らし・共同住宅の割合も。']],
      ),
      noAds: true,
      head: `<style>${SHEET_CSS}\n${FORM_CSS}\n${PRINT_CSS}</style>`,
      body,
      script: `${PICK_JS}\n${CORE}\nconst C=${JSON.stringify(conf).replace(/</g, '\\u003c')};\n${KARTE_JS}`,
    },
  ];
}
