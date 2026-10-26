// 冷蔵庫に貼る紙（/dougu/print/、10/27 しょーくんが案1に決定）：A4 縦1枚のチェックリスト
//   家に置く備え＝丸と期限を書く欄（期限の欄は items.yml の checklists で kigen のある品目だけ）／持ち出す袋＝丸
//   品目・数字・出典は items.yml・sources.yml から（手で打たない）。挿絵なし。行の高さは2つの表でそろえる（あいた所を行の数で分ける）
//   画面では紙を幅に合わせて縮めて見せ、印刷では紙だけを A4 に出す。AdSense なし（印刷に広告が入らないように）
import { esc, h2, fit, srcName, TREES, RIVER, MINCHO, GOTHIC } from '../layout.mjs';
import { checkEntries } from '../data.mjs';
import { sourceList } from './sonae.mjs';
import { SITE } from '../site.mjs';

export const PRINT_PATH = '/dougu/print/';

const W = 635; // 木の帯：絵の比を変えずに A4 の幅へ（794 / 635 = 1.25 倍）
const band = () => TREES('pt').replace('viewBox="0 0 390 24"', `viewBox="0 0 ${W} 24"`).replace('<rect width="390"', `<rect width="${W}"`);
const HM = h2('x').match(/<svg[^]*?<\/svg>/)[0];
const nm = (t) => esc(t).replace(/・/g, '・<wbr>').replace(/（/g, '<wbr>（');
const wr = (w) => `<span class="wr" style="width:${w}px"></span>`;
const unitDay = (it) => `1人1日${it.per_day}${it.unit === '回分' ? '回' : it.unit}`;

// 持ち出す袋：かっこの中は小さい2行目に（文字は items.yml のまま）。どの行も「名前1行＋小さい1行まで」にする
export function splitName(e) {
  const k = /^(.+?)（(.+)）$/.exec(e.name);
  return { main: k ? k[1] : e.name, small: [k?.[2], e.sub].filter(Boolean).join('　') };
}

// 出典（発行元「題」）と、確かめた日の幅
function srcLine(ids, sources) {
  const by = new Map(sources.sources.map((s) => [s.id, s]));
  const list = ids.map((id) => {
    const s = by.get(id);
    if (!s) throw new Error(`出典 ${id} が sources.yml にない`);
    return s;
  });
  const ds = list.map((s) => String(s.checked)).sort();
  const [y1, m1, d1] = ds[0].split('-').map(Number);
  const [y2, m2, d2] = ds.at(-1).split('-').map(Number);
  const when = ds[0] === ds.at(-1) ? `${y1}年${m1}月${d1}日` : y1 === y2 && m1 === m2 ? `${y1}年${m1}月${d1}日〜${d2}日` : `${y1}年${m1}月${d1}日〜${y2}年${m2}月${d2}日`;
  return `出典：${list.map(srcName).join('、')}（${when}に確認）`;
}

export function printPages({ cc, items, sources }) {
  const { days } = cc;
  const lists = Object.fromEntries(items.checklists.map((cl) => [cl.id, { cl, entries: checkEntries(items, cl) }]));
  const b = lists.bichiku;
  const m = lists.mochidashi;
  if (!b || !m) throw new Error('items.yml の checklists に bichiku と mochidashi がない');

  const ymd = `${wr(52)}年${wr(30)}月${wr(30)}日`;
  const rows = b.entries
    .map((e, i) => {
      const sub = e.sub ?? (e.qty ? unitDay(e.item) : '');
      const kg = b.cl.entries[i].kigen ? ymd : '';
      return `<div class="tr"><span class="bx"></span><span class="nm">${nm(e.name)}${sub ? `<small>${esc(sub)}</small>` : ''}</span><span class="kg">${kg}</span></div>`;
    })
    .join('');
  const kigenN = b.cl.entries.filter((e) => e.kigen).length;
  const mrows = m.entries
    .map((e) => {
      const { main, small } = splitName(e);
      return `<li><span class="bx"></span><span class="nm">${nm(main)}${small ? `<small>${esc(small)}</small>` : ''}</span></li>`;
    })
    .join('');
  const mHalf = Math.ceil(m.entries.length / 2);
  const ids = [...new Set([...b.entries, ...m.entries].flatMap((e) => e.sources).concat(days.sources))];

  const sheet = `<div class="sheet" lang="ja">
<span class="band">${band()}</span>
<div class="ttl"><p class="h1">${HM}備えのチェックリスト</p><span class="fld">人数${wr(64)}人</span></div>
<p class="ld">量は人数分。最低${days.min}日分、できれば${days.better}日分</p>
<p class="h2">${HM}${esc(b.cl.name)}<small>${b.entries.length}品目</small></p>
<div class="th"><span></span><span>品目</span><span>期限</span></div>
<div class="tbody">${rows}</div>
<span class="river">${RIVER}</span>
<p class="h2">${HM}${esc(m.cl.name)}<small>${m.entries.length}品目</small></p>
<ul class="ml">${mrows}</ul>
<div class="foot"><p>${srcLine(ids, sources)}</p><p><span class="site">${esc(SITE.name)}</span>${esc(SITE.url.replace('https://', ''))}/dougu/check/</p></div>
</div>`;

  // 紙の中の見た目（.sheet の中だけに効かせる）。1px は印刷で 1/96 インチ
  const S = '.sheet';
  const css = `<style>
.sheetwrap{margin:12px 0 4px;border:1px solid var(--line);overflow:hidden;background:#fff}
${S}{width:210mm;height:297mm;padding:5mm 14mm 0;display:flex;flex-direction:column;overflow:hidden;background:#fff;color:var(--ink);font:15px/1.5 ${GOTHIC};transform-origin:0 0;-webkit-print-color-adjust:exact;print-color-adjust:exact}
${S} p{margin:0}${S} cite{font-style:normal}
${S} .band{display:block;margin:0 -14mm;line-height:0}${S} .band svg{display:block;width:100%;height:30px}
${S} .ttl{display:flex;align-items:flex-end;justify-content:space-between;gap:16px;margin:16px 0 2px}
${S} .h1{font:700 38px/1.2 ${MINCHO};display:flex;align-items:center;gap:12px;letter-spacing:.06em}
${S} .h1 svg{width:36px;height:28px;color:var(--h2)}
${S} .ld{font:15px/1.5 ${MINCHO};color:var(--sub);margin-top:4px}
${S} .fld{font-size:20px;white-space:nowrap;padding-bottom:4px}
${S} .wr{display:inline-block;border-bottom:1.3px solid var(--ink);height:1.25em;vertical-align:-.3em;margin:0 4px}
${S} .h2{font:700 24px/1.3 ${MINCHO};color:var(--h2);display:flex;align-items:center;gap:10px;margin:18px 0 4px}
${S} .h2 svg{width:24px;height:19px}
${S} .h2 small{margin-left:auto;font:400 12px/1 ${GOTHIC};color:var(--sub)}
${S} .river{display:block;line-height:0;margin:14px 0 0}${S} .river svg{display:block;width:100%;height:10px}
${S} .bx{display:inline-block;width:28px;height:28px;border:1.6px solid var(--sub);border-radius:50%}
${S} .nm{word-break:keep-all;overflow-wrap:anywhere}${S} .nm small{display:block;font-size:11.5px;line-height:1.35;color:var(--sub)}
${S} .th,${S} .tr{display:grid;grid-template-columns:40px 1fr 196px;align-items:center;gap:0 10px}
${S} .th{font-size:12px;color:var(--sub);padding:0 0 3px;border-bottom:1.3px solid var(--ink)}${S} .th span:last-child{text-align:center}
${S} .tbody{flex:${b.entries.length} 1 0;min-height:0;display:grid;grid-template-rows:repeat(${b.entries.length},minmax(0,1fr))}
${S} .tr{border-bottom:1px dotted #9fb3a6}
${S} .tr .nm{font-size:17px;line-height:1.3}
${S} .kg{font-size:13px;white-space:nowrap;text-align:right}
${S} .ml{flex:${mHalf} 1 0;min-height:0;list-style:none;margin:4px 0 0;padding:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(${mHalf},minmax(0,1fr));grid-auto-flow:column;column-gap:28px}
${S} .ml li{display:grid;grid-template-columns:36px 1fr;align-items:center;border-bottom:1px dotted #9fb3a6}
${S} .ml .bx{width:24px;height:24px}${S} .ml .nm{font-size:15px;line-height:1.3;white-space:nowrap}
${S} .foot{margin-top:14px;padding:8px 0 7mm;font-size:9.5px;line-height:1.55;color:var(--sub)}
${S} .foot .site{font:700 12px/1 ${MINCHO};color:var(--ink);margin-right:10px;letter-spacing:.06em}
@page{size:A4;margin:0}
@media print{
header,footer,.ft,.town,.sg,main>:not(.sheetwrap){display:none!important}
html,body{background:#fff}.pg{max-width:none;margin:0;padding:0}
.sheetwrap{margin:0!important;border:0!important;height:auto!important;overflow:visible!important}
${S}{transform:none!important;height:296mm}
}
</style>`;

  // 画面では、紙を幅に合わせて縮める（印刷のときは CSS で元の大きさ）
  const js = `(()=>{const w=document.querySelector('.sheetwrap'),s=w&&w.firstElementChild;if(!s)return;const f=()=>{const k=Math.min(1,w.clientWidth/s.offsetWidth);s.style.transform='scale('+k+')';w.style.height=Math.ceil(s.offsetHeight*k)+'px'};f();addEventListener('resize',f);const p=document.querySelector('[data-print]');if(p)p.addEventListener('click',()=>print())})();`;

  return [
    {
      path: PRINT_PATH,
      title: '冷蔵庫に貼る備えのチェックリスト（A4・印刷用）',
      description: fit(
        [`冷蔵庫に貼るA4の1枚。${b.cl.name}${b.entries.length}品目と${m.cl.name}${m.entries.length}品目に丸をつける欄、水や主食など${kigenN}品目に期限を書く欄があります。`],
        [['印刷のほか、PDFにして保存もできます。', 'PDFにもできます。']],
      ),
      noAds: true,
      head: css,
      body: `<p class="crumb"><a href="/">トップ</a> / <a href="/dougu/check/">チェックリスト</a></p>
<h1 class="city">冷蔵庫に貼る紙</h1>
<p class="src">A4で1枚。期限はペンで書きこみます</p>
<p><button class="go" type="button" data-print>印刷する・PDFにする</button></p>
<div class="sheetwrap">${sheet}</div>
<p><a class="go" href="/dougu/check/">画面でチェックする</a><br><a class="go" href="/dougu/kigen/">賞味期限をメモする</a></p>
${h2('出典')}
${sourceList(ids, sources)}`,
      script: js,
    },
  ];
}
