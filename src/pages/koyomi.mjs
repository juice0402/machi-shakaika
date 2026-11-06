// 備えのごよみ（/koyomi/）と、カレンダーの購読（/koyomi/koyomi.ics）
//   1画面め：今の期間の1行（朱のはんこ）と品目ページ、カレンダーの購読のリンク2つ。その下に1年の表（24行）・しくみ・よくある問い・出典
//   今の期間はビルドの日（日本時間）で決まる。毎朝のビルドで入れかわる。AdSense はほかの読みものと同じ・A8 は置かない
import { esc, h2, fit, HAN } from '../layout.mjs';
import { SITE } from '../site.mjs';
import { SAIGAI } from '../mode.mjs';
import { koyomiPick, koyomiLine, koyomiSpan, koyomiIcs, koyomiFill, koyomiVars, KOYOMI_CSS, KOYOMI_ICS_PATH } from '../koyomi.mjs';
import { sourceList } from './sonae.mjs';

const HOST = SITE.url.replace(/^https:\/\//, '');
export const WEBCAL = `webcal://${HOST}${KOYOMI_ICS_PATH}`;
export const GCAL = `https://calendar.google.com/calendar/render?cid=${encodeURIComponent(WEBCAL)}`;

const CSS = `<style>${KOYOMI_CSS}
.kyt th,.kyt td{text-align:left}.kyt td{vertical-align:top;font-variant-numeric:normal}.kyt td:first-child{position:relative;white-space:nowrap;width:5.6em}
.kyt tr.on td{color:var(--ink);font-weight:700}.kyt tr.on td:first-child{color:var(--accent)}
.kyt .han{position:absolute;left:-2px;top:1px;width:30px;height:30px;border:2px solid var(--accent);border-radius:50%;transform:rotate(-8deg);pointer-events:none}
.kyt td a{font-weight:400}.kyt td:last-child{width:8.5em}</style>`;

const qa = (q, a) => `<h3>${q}</h3>\n<p>${a}</p>`;

export function koyomiPages({ koyomi, items, sources, today, saigai = SAIGAI }) {
  const P = koyomi.periods;
  const cur = koyomiPick(P, today);
  const vars = koyomiVars(items);
  const by = Object.fromEntries(items.items.map((it) => [it.id, it]));
  const year = Number(today.slice(0, 4));
  const themes = [...new Set(P.map((p) => p.theme.replace(/^.*：/, '')))];
  const used = [...new Set(P.map((p) => p.item))];
  const rows = P.map((p) => {
    const on = p === cur;
    const it = by[p.item];
    const more = p.links.filter((l) => l !== `/hinmoku/${it.id}/`);
    return `<tr${on ? ' class="on"' : ''}><td>${on ? HAN : ''}${koyomiSpan(p)}</td><td>${esc(p.theme)}</td><td><a href="/hinmoku/${it.id}/">${esc(it.name)}</a>${more.length ? `<br>${more.map((l) => `<a href="${l}">${esc(pageName(l))}</a>`).join('<br>')}` : ''}</td></tr>`;
  }).join('\n');
  const srcIds = [...new Set(P.flatMap((p) => p.sources))];
  const nKigen = P.filter((p) => p.theme.includes('期限の見直し')).length;
  const nTai = P.filter((p) => p.theme.includes('台風')).length;
  const body = `<p class="crumb"><a href="/">トップ</a> / <a href="/sonae/">備えの知識</a></p>
<h1 class="city">備えのごよみ</h1>
<p class="lead">半月ごとに、見直す備えを1つずつ</p>
${saigai ? '' : koyomiLine(cur, items, { koyomi: false })}
<p><a class="go" href="${WEBCAL}">iPhoneのカレンダーに入れる</a></p>
<p><a class="go" href="${GCAL}" rel="noopener">Googleカレンダーに入れる</a></p>
<p class="note">半月ごとの始まりの日に、1日の予定が入ります</p>
<section>${h2('1年の備え')}
<table class="tbl kyt"><thead><tr><th>期間</th><th>テーマ</th><th>品目</th></tr></thead><tbody>
${rows}
</tbody></table></section>
<div class="prose">
${h2('しくみ')}
<p>1年を、毎月の1日から15日と、16日から月の終わりまでの${P.length}の期間に分けています。2月だけは14日と15日で分けています。期間ごとに、季節や防災の日にあわせたテーマと、見直す品目を1つ決めました。</p>
<p>ページは毎朝作り直していて、その日がどの期間かで、上の1行と表の朱のはんこが入れかわります。区切りは日本時間の0時です。</p>
<p>文に出てくる量は、ほかのページと同じめやすです。水は${esc(vars.mizu)}、主食は${esc(vars.shushoku)}、携帯トイレは${esc(vars.toilet)}で、日数は最低${esc(vars.min)}、できれば${esc(vars.better)}です。カセットコンロのボンベは、${esc(vars.gas)}です。</p>
${h2('テーマの決め方')}
<p>テーマは${themes.map(esc).join('・')}です。梅雨の前の5月と6月は大雨、7月から10月の初めまでは台風にあわせています。台風の期間は${nTai}あり、日本に近づく台風の数の平年値で8月と9月が多いことから決めました。</p>
<p>1月17日の防災とボランティアの日、8月30日からの防災週間、11月19日の東京都の備蓄の日のあたりは、置いてある物の期限を見直す期間です。1年に${nKigen}回あり、<a href="/dougu/kigen/">期限メモ</a>にも同じ1行が出ます。</p>
<p>品目は、品目ページのある${used.length}つ（${used.map((id) => esc(by[id].name)).join('・')}）から、季節にあうものをえらんでいます。</p>
${h2('よくある問い')}
${qa('カレンダーには何が入りますか', `${year}年と${year + 1}年の${P.length * 2}の期間の始まりの日に、テーマを題にした1日の予定が入ります。予定のメモには、上の表と同じ文と品目ページのURLが入ります。`)}
${qa('通知は来ますか', '通知はつけていません。カレンダーのアプリで、予定に通知をつけることはできます。')}
${qa('入れたあとで変わったら', '購読なので、このサイトがごよみを直すと、カレンダーの予定も入れかわります。読み直す間かくは、カレンダーのアプリによってちがいます。')}
${qa('住んでいる所で、梅雨や台風の時期はちがいますか', '梅雨入りの平年の日は、九州北部と関東甲信でもちがいます。ここでは全国で同じ期間にしているので、地域の天気の情報もあわせて見てください。')}
${qa('やめるときは', 'カレンダーのアプリで、「備えのごよみ（まちの社会科）」のカレンダーを消すと、予定もなくなります。')}
</div>
${h2('あわせて')}
<ul class="list"><li><a href="/sonae/bichiku/">備蓄の量のめやす</a></li><li><a href="/dougu/kigen/">期限メモ</a></li><li><a href="/dougu/check/">チェックリスト</a></li><li><a href="/hinmoku/">品目ごとのめやす</a></li></ul>
${h2('出典')}
${sourceList(srcIds, sources)}`;
  const curText = cur ? koyomiFill(cur.text, vars) : '';
  return [
    {
      path: '/koyomi/',
      title: '備えのごよみ（季節で見直す家の備え）',
      description: fit(
        [`1年を${P.length}の期間に分け、季節と防災の日にあわせて見直す備えを1つずつ。`],
        [
          cur && !saigai ? [`いまは「${cur.theme}」で、${curText}。`, `いまは「${cur.theme}」。`] : `${themes.slice(0, 4).join('・')}など。`,
          ['iPhoneとGoogleのカレンダーで購読できます。', 'カレンダーで購読できます。'],
        ],
      ),
      head: CSS,
      body,
    },
    { path: KOYOMI_ICS_PATH, raw: koyomiIcs(P, items, year, today) },
  ];
}

const pageName = (l) => {
  if (!PAGE_NAME[l]) throw new Error(`備えのごよみ：${l} の名前を PAGE_NAME に`);
  return PAGE_NAME[l];
};
const PAGE_NAME = {
  '/sonae/fuyu-teiden/': '冬の停電と寒さ',
  '/dougu/kigen/': '期限メモ',
  '/sonae/bichiku/': '備蓄の量',
  '/sonae/hitorigurashi/': 'ひとり暮らしの備え',
  '/sonae/rolling-stock/': 'ローリングストック',
  '/sonae/keitai-toilet/': '携帯トイレの備え',
};
