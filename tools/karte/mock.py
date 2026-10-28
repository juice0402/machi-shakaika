# わが家の防災カルテの見本（10/28 しょーくん：案3 に決定）の描き方。夜のメモ #29 の写し元
# 作業場の scratchpad で動かしたもの（パスは当時のまま）。opt3 が採用の案。主食のクリーム色は使わない（issue のとおり）
import math

D = '/tmp/claude-0/-home-claude/97ed28e4-7722-5c84-a75a-0996f8e13454/scratchpad/karte/'
INK, SUB, LINE, AC, GREEN, H2, BAR, BAR2, WATER = '#23312a', '#5f6e66', '#d3dfd5', '#c53d43', '#2f6b45', '#2f5d3e', '#4f8d5e', '#b5cfbb', '#3f8fbf'
T = dict(machi='札幌市', pref='北海道', n=3, days=7, sumai='共同住宅', p65=29.3, single=46.5, kyodo=66.0, n65=29.4, nsingle=41.4, nkyodo=46.0)
MIZU, SHU, TOI = 3 * T['n'] * T['days'], 3 * T['n'] * T['days'], 5 * T['n'] * T['days']
BOT = math.ceil(MIZU / 2)

CSS = f'''*{{box-sizing:border-box}}body{{margin:0;background:#fff;font-family:'Noto Sans CJK JP',sans-serif;color:{INK}}}
.page{{width:794px;height:1123px;padding:0 52px;position:relative;overflow:hidden;background:#fff}}
.band{{height:30px;margin:0 -52px 14px;background:url("data:image/svg+xml;utf8,{{TREES}}") repeat-x left bottom}}
h1{{font:700 34px/1.2 'Noto Serif CJK JP',serif;margin:0}}h2{{font:700 19px/1.3 'Noto Serif CJK JP',serif;color:{H2};margin:18px 0 8px;display:flex;align-items:center;gap:6px}}
h2::before{{content:"";width:16px;height:13px;background:radial-gradient(circle at 70% 60%,#9fb3a6 35%,transparent 36%),linear-gradient(to top right,transparent 49%,{GREEN} 50%) left/60% 100% no-repeat}}
.sub{{color:{SUB};font-size:14px}}.who{{font-size:15px}}.who b{{font-size:20px}}
.big{{font:700 34px/1 'Noto Sans CJK JP';color:{GREEN};font-variant-numeric:tabular-nums}}.big small{{font-size:16px;font-weight:400;color:{INK};margin-left:2px}}
.g{{margin:0 0 10px}}.g .l{{display:flex;justify-content:space-between;font-size:14px}}.g .l b{{font-size:18px;color:{GREEN}}}
.bar{{position:relative;height:10px;background:#eef3ee;margin-top:6px}}.bar i{{position:absolute;left:0;top:0;bottom:0;background:{BAR}}}.bar u{{position:absolute;top:-7px;width:0;height:0;border:5px solid transparent;border-top:7px solid {INK};margin-left:-5px}}
.ck{{display:grid;grid-template-columns:22px 1fr auto;gap:0 10px;align-items:center;border-bottom:1px dotted {LINE};padding:6px 0;font-size:14.5px}}
.ck i{{width:20px;height:20px;border:1.4px solid {INK};border-radius:50%}}.ck small{{display:block;color:{SUB};font-size:11.5px}}.ck .k{{font-size:12px;color:{SUB};white-space:nowrap}}
.ft{{position:absolute;left:52px;right:52px;bottom:26px;font-size:10px;color:{SUB}}}.ft b{{color:{INK};font:700 13px 'Noto Serif CJK JP',serif;margin-right:8px}}
.river{{height:10px;margin:14px 0 0;background:url("data:image/svg+xml;utf8,%3Csvg xmlns='http://www.w3.org/2000/svg' width='120' height='10'%3E%3Cpath d='M0 5 Q30 1 60 5 T120 5' fill='none' stroke='%233f8fbf' stroke-width='1.6'/%3E%3C/svg%3E") repeat-x}}
.box{{border:1.4px solid {INK};padding:10px 14px}}.fill{{border-bottom:1px solid {INK};display:inline-block;min-width:200px;height:20px}}'''
TREES = "%3Csvg xmlns='http://www.w3.org/2000/svg' width='35' height='30'%3E%3Cpath d='M3 28 L10 10 L17 28Z' fill='%232f6b45'/%3E%3Ccircle cx='26' cy='20' r='6' fill='%2376a95a'/%3E%3Crect x='25' y='24' width='2' height='5' fill='%238a6a4f'/%3E%3Crect x='0' y='27' width='35' height='3' fill='%23b9d3a3'/%3E%3C/svg%3E"
CSS = CSS.replace('{TREES}', TREES)

KIGEN = ['水（飲み水と調理の水）', '主食（ご飯・アルファ米・乾パンなど）', 'おかずになる缶詰など', '携帯トイレ・簡易トイレ', 'カセットコンロとボンベ', '乾電池（ライトやラジオの予備）']
NOK = ['生活用水', 'トイレットペーパー・ティッシュペーパー', 'マッチ・ろうそく']
QTY = {'水（飲み水と調理の水）': f'{MIZU}L', '主食（ご飯・アルファ米・乾パンなど）': f'{SHU}食', '携帯トイレ・簡易トイレ': f'{TOI}回分'}
DATE = '<span class="k">____年__月__日</span>'
SRC = '出典：総務省「令和7年国勢調査」を加工して作成（▲は全国）・首相官邸・農林水産省・広島市・神奈川県ほか（2026年10月確認）'


def gauge(lab, v, nat):
    return f'<div class="g"><div class="l"><span>{lab}</span><b>{v:.1f}%</b></div><div class="bar"><i style="width:{v}%"></i><u style="left:{nat}%"></u></div></div>'


def head(title='わが家の防災カルテ'):
    return f'''<div class="band"></div><div style="display:flex;justify-content:space-between;align-items:flex-end">
<div><h1>{title}</h1><div class="sub" style="margin-top:4px">2026年10月28日に作成</div></div>
<div class="who" style="text-align:right"><b>{T["machi"]}</b>（{T["pref"]}）<br>家族 <b>{T["n"]}</b>人・{T["sumai"]}・<b>{T["days"]}</b>日分</div></div>'''


def foot():
    return f'<div class="ft">{SRC}<br><b>まちの社会科</b>machi-shakaika.com/dougu/karte/</div>'


def bottle(x, y, s=1, fill=True):
    return (f'<g transform="translate({x},{y}) scale({s})"><path d="M5 0h6v4c3 2 5 4 5 8v22c0 2-1 3-3 3H3c-2 0-3-1-3-3V12c0-4 2-6 5-8z" fill="{"#d5eaf5" if fill else "#fff"}" stroke="{INK}" stroke-width="1"/>'
            f'<rect x="4" y="-2" width="8" height="3" fill="{WATER}"/></g>')


# ---- 案1：カルテ（区切った欄） ----
def opt1():
    ck = ''.join(f'<div class="ck"><i></i><span>{n}{f"<small>わが家は {QTY[n]}</small>" if n in QTY else ""}</span>{DATE if n in KIGEN else "<span></span>"}</div>' for n in KIGEN[:4] + NOK[:1] + KIGEN[4:])
    return f'''<div class="page">{head()}
<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:16px">
<div class="box"><h2 style="margin-top:0">この街の数字</h2>{gauge("65歳以上", T["p65"], T["n65"])}{gauge("ひとり暮らしの世帯", T["single"], T["nsingle"])}{gauge("共同住宅の世帯", T["kyodo"], T["nkyodo"])}</div>
<div class="box"><h2 style="margin-top:0">わが家の量</h2>
<div style="display:grid;grid-template-columns:auto 1fr;gap:10px 14px;align-items:baseline">
<span>水</span><span class="big">{MIZU}<small>L</small> <small style="color:{SUB}">2Lボトル {BOT}本</small></span>
<span>主食</span><span class="big">{SHU}<small>食</small></span>
<span>携帯トイレ</span><span class="big">{TOI}<small>回分</small></span></div>
<div class="sub" style="margin-top:8px;font-size:12px">1人1日 水3L・主食3食・トイレ5回で計算</div></div></div>
<p style="margin:14px 0 0;font-size:14.5px">共同住宅に住む世帯が多い街です（全国より20ポイント多い）。マンションの備え：machi-shakaika.com/sonae/mansion/</p>
<h2>家に置く備え</h2>{ck}
<h2>家族で決めておくこと</h2>
<div style="font-size:15px;line-height:2.3">集まる場所 <span class="fill"></span>　　連絡のしかた 災害用伝言ダイヤル <b>171</b></div>
{foot()}</div>'''


# ---- 案2：今の冷蔵庫に貼る紙を広げる ----
def opt2():
    rows = KIGEN[:1] + NOK[:1] + KIGEN[1:4] + NOK[1:2] + KIGEN[4:5] + NOK[2:] + KIGEN[5:]
    ck = ''.join(f'<div class="ck"><i></i><span>{n}</span>{f"<b style=&quot;font-size:18px;color:{GREEN}&quot;>{QTY[n]}</b>" if n in QTY else ""}{DATE if n in KIGEN else ""}</div>'.replace('&quot;', '"') for n in rows)
    ck = ck.replace('class="ck"', 'class="ck" style="grid-template-columns:22px 1fr auto auto"')
    bag = ['飲料水', '火を通さずに食べられるもの', '貴重品', '懐中電灯', '携帯ラジオ', 'モバイルバッテリー', 'ヘルメット・防災ずきん・軍手', '救急用品', 'マスク・消毒用アルコール・体温計', '衣類・下着・タオル・毛布・雨具', '洗面用具・ウェットティッシュ・生理用品', '携帯トイレ']
    bg = ''.join(f'<div class="ck" style="grid-template-columns:22px 1fr;padding:4px 0"><i></i><span>{n}</span></div>' for n in bag)
    strip = f'<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px;margin-top:14px">{gauge("65歳以上", T["p65"], T["n65"])}{gauge("ひとり暮らし", T["single"], T["nsingle"])}{gauge("共同住宅", T["kyodo"], T["nkyodo"])}</div>'
    return f'''<div class="page">{head("備えのチェックリスト")}{strip}
<h2>家に置く備え <span class="sub" style="font:400 13px sans-serif;margin-left:auto">{T["n"]}人・{T["days"]}日分の量</span></h2>{ck}
<div class="river"></div><h2>持ち出す袋</h2><div style="display:grid;grid-template-columns:1fr 1fr;gap:0 28px">{bg}</div>
{foot()}</div>'''


# ---- 案3：絵で量を見る ----
def opt3():
    bots = ''.join(bottle(4 + (i % 16) * 21, 6 + (i // 16) * 46, 1) for i in range(BOT))
    sq = lambda n, cols, col: ''.join(f'<rect x="{(i%cols)*13}" y="{(i//cols)*13}" width="11" height="11" fill="{col}" stroke="{INK}" stroke-width=".6"/>' for i in range(n))
    rows_s = math.ceil(SHU / 21); rows_t = math.ceil(TOI / 21)
    ck = ''.join(f'<div class="ck" style="padding:5px 0"><i></i><span>{n}</span>{DATE}</div>' for n in KIGEN)
    return f'''<div class="page">{head()}
<h2>わが家の量（{T["n"]}人・{T["days"]}日分）</h2>
<div style="display:grid;grid-template-columns:120px 1fr;gap:10px 12px;align-items:center">
<div><div class="sub">水</div><div class="big">{MIZU}<small>L</small></div><div class="sub" style="font-size:12px">2Lボトル {BOT}本</div></div>
<svg width="340" height="{math.ceil(BOT/16)*46+6}">{bots}</svg>
<div><div class="sub">主食</div><div class="big">{SHU}<small>食</small></div><div class="sub" style="font-size:12px">1マス＝1食</div></div>
<svg width="290" height="{rows_s*13}">{sq(SHU, 21, "#f1e3c8")}</svg>
<div><div class="sub">携帯トイレ</div><div class="big">{TOI}<small>回分</small></div><div class="sub" style="font-size:12px">1マス＝1回</div></div>
<svg width="290" height="{rows_t*13}">{sq(TOI, 21, "#e6efe8")}</svg></div>
<div class="river"></div>
<h2>この街の数字</h2><div style="display:grid;grid-template-columns:repeat(3,1fr);gap:18px">{gauge("65歳以上", T["p65"], T["n65"])}{gauge("ひとり暮らし", T["single"], T["nsingle"])}{gauge("共同住宅", T["kyodo"], T["nkyodo"])}</div>
<h2>期限を書いておく</h2>{ck}
{foot()}</div>'''


for name, fn in (('k1', opt1), ('k2', opt2), ('k3', opt3)):
    open(D + name + '.html', 'w').write(f'<!doctype html><meta charset="utf-8"><style>{CSS}</style><body>{fn()}</body>')
print(MIZU, SHU, TOI, BOT)
