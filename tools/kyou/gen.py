"""「毎日の1問」の見本ページを作る（dist-base の HTML と CSS をそのまま使う）。"""
import json, re, os

W = '/tmp/claude-0/-home-claude/9d7db939-a62f-5c75-a943-eb18381f29a0/scratchpad/daily'
SITE = W + '/site'
OUT = SITE + '/mihon'
os.makedirs(OUT, exist_ok=True)

top = open(SITE + '/index.html', encoding='utf-8').read()
docchi = open(SITE + '/quiz/docchi/index.html', encoding='utf-8').read()
dobon = open(SITE + '/quiz/dobon/index.html', encoding='utf-8').read()
D = json.load(open(SITE + '/quiz/machi.json', encoding='utf-8'))

MIN = '"Hiragino Mincho ProN","Yu Mincho","Noto Serif JP",serif'
SRC = '<p class="src">出典：総務省「令和7年国勢調査」を加工して作成（2025年10月1日現在・2026年9月29日公表）</p>'
HM = '<svg class="hm" viewBox="0 0 18 14" aria-hidden="true"><path d="M2 13l5-11 5 11z" fill="currentColor"/><circle cx="13" cy="7" r="4" fill="currentColor" opacity=".55"/></svg>'

# ---- 今日の問題（見本は 10/29 の1問：人口 熊本市 と 岡山市） ----
row = {r[1]: r for r in D['munis']}
A, B = row['熊本市'], row['岡山市']
mi = 0
m = D['m'][mi]
va, vb = A[3 + mi], B[3 + mi]
PN = {p[0]: p for p in D['prefs']}
fmt = lambda v: f'{round(v):,}'
assert va != vb and abs(va - vb) / max(va, vb) >= m[5]
DATE, DOW = '10月29日', '木'
NEXT = '10月30日（金）0時'

# ---- 追加の CSS（このページだけの style。ほかは dist の CSS のまま） ----
EXTRA = f"""
.kq{{font:700 20px/1.5 {MIN};margin:2px 0 6px}}
.kd{{font-size:13px;color:var(--sub);margin:6px 0 0;font-variant-numeric:tabular-nums}}
.two{{display:grid;grid-template-columns:1fr auto 1fr;align-items:center;margin:0 0 6px;border-top:1px dotted var(--line);border-bottom:1px dotted var(--line)}}
.two a{{display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:88px;padding:8px 4px;text-decoration:none;color:var(--ink);line-height:1.3}}
.two .k{{font:700 15px/1 {MIN};color:var(--sub);margin-bottom:6px}}
.two b{{font:700 23px/1.3 {MIN};letter-spacing:.04em}}
.two small{{font-size:11px;color:var(--sub);margin-top:6px}}
.two .or{{font:15px/1 {MIN};color:var(--sub)}}
.wk{{display:grid;grid-template-columns:repeat(7,1fr);margin:4px 0 0;text-align:center;font-size:11px;line-height:1.2;color:var(--sub)}}
.wk i{{position:relative;display:block;width:32px;height:32px;margin:4px auto 0;font:400 13px/32px {MIN};font-style:normal;font-variant-numeric:tabular-nums;color:var(--ink)}}
.wk .o i{{color:var(--accent);font-weight:700}}
.wk .o i::after{{content:"";position:absolute;inset:1px;border:2.2px solid var(--accent);border-radius:50%;transform:rotate(-12deg)}}
.wk .x i::before,.wk .x i::after{{content:"";position:absolute;left:5px;right:5px;top:50%;height:2px;margin-top:-1px;background:var(--accent);transform:rotate(40deg)}}
.wk .x i::after{{transform:rotate(-40deg)}}
.wk .t i{{font-weight:700}}
.wk .t i::after{{content:"";position:absolute;inset:1px;border:1.5px dashed #9fb3a6;border-radius:50%}}
.wk .t.o i::after{{border:2.2px solid var(--accent)}}
.stk{{display:flex;align-items:baseline;gap:14px;margin:12px 0 0;font-size:13px;color:var(--sub)}}
.stk b{{font:700 34px/1 {MIN};color:var(--accent);margin:0 2px 0 6px;font-variant-numeric:tabular-nums}}
.stk .best{{margin-left:auto}}
.stk .best b{{font:700 15px/1 {MIN};color:var(--ink);margin:0 1px 0 4px}}
.vs{{margin:10px 0 4px}}
.vs p{{display:flex;justify-content:space-between;margin:6px 0 2px;font-size:14px}}
.vs p b{{font-variant-numeric:tabular-nums}}
.vs .bt{{height:18px;background:var(--track);position:relative}}
.vs .bt i{{position:absolute;inset:0 auto 0 0;background:var(--num)}}
.vs .bt i.w{{background:var(--water)}}
.ax{{position:relative;height:18px;margin:2px 0 0;border-top:1px solid var(--ink);font-size:10px;color:var(--sub)}}
.ax span{{position:absolute;top:0;transform:translateX(-50%);padding-top:4px;white-space:nowrap}}
.ax span::before{{content:"";position:absolute;left:50%;top:-1px;height:5px;border-left:1px solid var(--ink)}}
.ax span:first-child{{transform:none}}
.ax span:first-child::before{{left:0}}
.ax span:last-child{{transform:translateX(-100%)}}
.ax span:last-child::before{{left:auto;right:0}}
.dif{{margin:6px 0 0;font-size:13px}}
.dif b{{font-size:17px;color:var(--num);font-variant-numeric:tabular-nums}}
.nx{{display:flex;flex-wrap:wrap;align-items:baseline;gap:4px 16px;margin:10px 0 0;font-size:13px;color:var(--sub)}}
.nx .go{{margin:0}}
.mz{{margin:8px 0 0}}
.mz p{{display:flex;justify-content:space-between;margin:6px 0 3px;font-size:14px}}
.mz p b{{font-variant-numeric:tabular-nums}}
.mz .gr{{display:grid;grid-template-columns:repeat(20,1fr);gap:2px}}
.mz .gr i{{position:relative;aspect-ratio:1;background:var(--track)}}
.mz .gr i.on{{background:var(--num)}}
.mz .w i.on{{background:var(--water)}}
.mz .gr i b{{position:absolute;inset:0 auto 0 0;background:var(--num)}}
.mz .w i b{{background:var(--water)}}
.mz .unit{{margin:4px 0 0;font-size:11px;color:var(--sub);text-align:right}}
.calh{{display:flex;align-items:baseline;gap:12px;margin:4px 0 0;font:700 15px/1.4 {MIN};color:var(--h2)}}
.calh small{{margin-left:auto;font:400 13px/1 "Hiragino Sans","Noto Sans JP",sans-serif;color:var(--sub)}}
.calh small b{{font:700 24px/1 {MIN};color:var(--accent);margin:0 2px 0 4px}}
.cal{{width:100%;border-collapse:collapse;table-layout:fixed;text-align:center;font:13px/1 {MIN};font-variant-numeric:tabular-nums}}
.cal th{{font:400 11px/1.6 "Hiragino Sans","Noto Sans JP",sans-serif;color:var(--sub)}}
.cal td{{height:24px;border-top:1px dotted var(--line);color:var(--sub);position:relative}}
.cal td span{{position:relative;display:inline-block;width:22px;height:22px;line-height:22px}}
.cal td.o span{{color:var(--accent);font-weight:700}}
.cal td.o span::after{{content:"";position:absolute;inset:0;border:2px solid var(--accent);border-radius:50%;transform:rotate(-12deg)}}
.cal td.x span::before,.cal td.x span::after{{content:"";position:absolute;left:4px;right:4px;top:50%;height:1.8px;margin-top:-1px;background:var(--accent);transform:rotate(40deg)}}
.cal td.x span::after{{transform:rotate(-40deg)}}
.cal td.t span{{color:var(--ink);font-weight:700}}
.cal td.t span::after{{content:"";position:absolute;inset:0;border:1.5px dashed #9fb3a6;border-radius:50%}}
.cal td.t.o span::after{{border:2px solid var(--accent)}}
.cal td.f{{color:#b8c4bc}}
.km{{display:block;width:calc(100% + 32px);height:auto;margin:2px -16px 0}}
.km text{{font:700 7px {MIN};fill:#23312a;stroke:#fff;stroke-width:2.2px;paint-order:stroke;stroke-linejoin:round}}
.km text.v{{font:400 5.6px "Hiragino Sans","Noto Sans JP",sans-serif;fill:var(--sub)}}
.km text.ok{{fill:var(--accent)}}
.lg{{display:inline-block;width:12px;height:12px;margin-right:2px;vertical-align:-1px}}
.qz .ch .lgk{{position:relative;flex:none;display:flex;align-items:center;justify-content:center;width:24px;height:24px;font:700 15px/1 {MIN};color:#fff}}
.han2{{position:relative;flex:none;display:flex;flex-direction:column;align-items:center;justify-content:center;width:72px;height:72px;margin-left:auto;border:2.5px solid var(--accent);border-radius:50%;box-shadow:inset 0 0 0 2px #fff,inset 0 0 0 3.5px var(--accent);transform:rotate(-8deg);color:var(--accent);font:700 12px/1.1 {MIN};text-align:center}}
.han2 b{{font-size:24px;line-height:1}}
.qz .rs li{{border-bottom:1px dotted var(--line);padding:0 0 7px}}
.qz .rs button{{border-bottom:0;min-height:46px}}
.qz .rs .v{{visibility:visible;font-size:15px;color:var(--ink);font-weight:700;font-variant-numeric:tabular-nums}}
.qz .rs .bt{{height:14px;background:var(--track);position:relative;margin:0 0 0 8px}}
.qz .rs .bt i{{position:absolute;inset:0 auto 0 0;background:var(--num)}}
.qz .rs .bt i.w{{background:var(--water)}}
.qz .rs .mz{{margin:0 0 0 8px}}
.ax{{margin-left:8px!important}}
.swc{{flex:none;width:14px;height:14px;border:1px solid #c9dcc0;margin-left:-4px}}
.two b{{text-decoration:underline dotted #9fb3a6;text-underline-offset:5px;text-decoration-thickness:1.5px}}
.res{{display:flex;align-items:center;gap:12px;margin:8px 0 0}}
.res p{{margin:0;font-size:13px;color:var(--sub);line-height:1.6}}
"""

STYLE = re.search(r'<style>.*?</style>', docchi, re.S).group(0)
HEAD_TOP = docchi[:docchi.index('<main>')]
TAIL = docchi[docchi.index('</main>'):]
TAIL = re.sub(r'<script>.*?</script>', '', TAIL, flags=re.S)


def page(name, body, title='今日の1問｜まちの社会科', extra_style=''):
    h = HEAD_TOP
    h = re.sub(r'<title>.*?</title>', f'<title>{title}</title><meta name="robots" content="noindex">', h)
    h = h.replace(STYLE, STYLE + f'<style>{EXTRA}{extra_style}</style>')
    html = h + '<main>\n' + body + '\n' + TAIL
    open(f'{OUT}/{name}.html', 'w', encoding='utf-8').write(html)


# ---- 部品 ----
WEEK = [('金', 23, 'n'), ('土', 24, 'x'), ('日', 25, 'o'), ('月', 26, 'o'), ('火', 27, 'o'), ('水', 28, 'o'), ('木', 29, 't')]


def week(today_done):
    cells = []
    for dow, d, s in WEEK:
        c = s
        if s == 't' and today_done:
            c = 't o'
        cells.append(f'<p class="{c}" style="margin:0">{dow}<i>{d}</i></p>')
    return '<div class="wk" aria-label="この7日のきろく">' + ''.join(cells) + '</div>'


def masu(v, cls):
    unit = 40000
    n = v / unit
    full = int(n)
    part = n - full
    cells = []
    for i in range(20):
        if i < full:
            cells.append('<i class="on"></i>')
        elif i == full and part > 0:
            cells.append(f'<i><b style="width:{part * 100:.0f}%"></b></i>')
        else:
            cells.append('<i></i>')
    return f'<div class="mz"><div class="gr {cls}">' + ''.join(cells) + '</div></div>'


def choices(done, colors=False, picked=1, graph=None):
    vals = [va, vb]
    ans = 0 if va > vb else 1
    lis = []
    for i, r in enumerate([A, B]):
        cls = ''
        if done:
            cls = ' class="ok"' if i == ans else (' class="ng"' if i == picked else '')
        k = 'アイ'[i]
        kspan = f'<span class="k">{k}</span>'
        sw = ''
        if colors:
            col = '#b5cfbb' if i == 0 else '#bcd8ea'
            sw = f'<span class="swc" style="background:{col}" aria-hidden="true"></span>'
        v = f'<span class="v">{fmt(vals[i])}人</span>'
        g = ''
        if graph == 'bar':
            g = f'<div class="bt"><i{" class=\"w\"" if i else ""} style="width:{vals[i] / 800000 * 100:.1f}%"></i></div>'
        elif graph == 'masu':
            g = masu(vals[i], 'w' if i else '')
        lis.append(f'<li><button type="button"{cls}{" disabled" if done else ""}>{kspan}{sw}<span class="t">{r[1]}<small>{PN[r[0][:2]][1]}</small></span>{v}</button>{g}</li>')
    return f'<ul class="ch{" rs" if graph else ""}"{" data-done=1" if done else ""}>' + ''.join(lis) + '</ul>'


CRUMB = '<p class="crumb"><a href="/">トップ</a> / <a href="/quiz/">クイズ</a></p>'
H1 = '<h1 class="city" style="margin:0">今日の1問</h1>'


def dline(extra=''):
    return f'<p class="kd">{DATE}（{DOW}）{extra}</p>'


# =========================================================
# 案A：トップに出す（答え合わせは広告なしの専用ページ）・棒で答え合わせ・7日のはんこ
# =========================================================
blockA = f"""<section id="kyou" class="kt"><h2>{HM}今日の1問<span class="kz">{DATE}（{DOW}）</span></h2>
<p class="kq" style="margin:0 0 4px">{m[0]}</p>
<div class="two"><a href="/mihon/a-ato.html"><span class="k">ア</span><b>{A[1]}</b><small>{PN[A[0][:2]][1]}</small></a><span class="or">か</span><a href="/mihon/a-ato.html"><span class="k">イ</span><b>{B[1]}</b><small>{PN[B[0][:2]][1]}</small></a></div>
{week(False)}
<p class="note" style="margin:6px 0 0">日本時間の0時に、つぎの1問に入れかわります</p>
</section>
"""
t = top
t = re.sub(r'<script async src="https://pagead2[^>]*></script>\n?', '', t)
t = re.sub(r'<title>(.*?)</title>', r'<title>\1</title><meta name="robots" content="noindex">', t, count=1)
st_top = re.search(r'<style>.*?</style>', t, re.S).group(0)
t = t.replace(st_top, st_top + f'<style>{EXTRA}</style>', 1)
t = t.replace('<section id="map">', blockA + '<section id="map">', 1)
open(f'{OUT}/a-mae.html', 'w', encoding='utf-8').write(t)

# A 答えたあと（/quiz/kyou/）
mx = 800000
ticks = [0, 200000, 400000, 600000, 800000]
tk = ''.join(f'<span style="left:{v / mx * 100:.1f}%">{"0" if v == 0 else str(v // 10000) + "万人"}</span>' for v in ticks)
bodyA2 = f"""{CRUMB}
{H1}
{dline('・つぎは30日（金）0時')}
<section class="qz"><p class="qq">{m[0]}</p>
{choices(True, picked=0, graph='bar')}
<div class="ax">{tk}</div>
<p class="dif">差は <b>{fmt(va - vb)}</b>人</p>
</section>
<div class="stk"><span>連続正解<b>5</b>日</span><span class="best">いままでの最高<b>12</b>日</span></div>
{week(True)}
<div class="nx"><button class="go" type="button">結果を送る</button><a href="/quiz/docchi/">どっちが多い？を10問</a></div>
{SRC}"""
page('a-ato', bodyA2)

# =========================================================
# 案B：専用ページだけ・マス目で答え合わせ・月のこよみ
# =========================================================
OCT = {d: 'f' for d in range(1, 32)}
for d in range(1, 29):
    OCT[d] = ''
for d in [8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19]:
    OCT[d] = 'o'
for d in [20]:
    OCT[d] = 'x'
for d in [21, 22]:
    OCT[d] = 'o'
OCT[23] = ''
OCT[24] = 'x'
for d in [25, 26, 27, 28]:
    OCT[d] = 'o'
OCT[29] = 't'
OCT[30] = 'f'
OCT[31] = 'f'


def cal(today_done):
    # 2026年10月1日は木曜
    first = 4  # 日=0
    cells = [''] * first + list(range(1, 32))
    while len(cells) % 7:
        cells.append('')
    rows = []
    for w in range(len(cells) // 7):
        tds = []
        for d in cells[w * 7:(w + 1) * 7]:
            if d == '':
                tds.append('<td></td>')
                continue
            c = OCT[d]
            if d == 29 and today_done:
                c = 't o'
            tds.append(f'<td class="{c}"><span>{d}</span></td>')
        rows.append('<tr>' + ''.join(tds) + '</tr>')
    head = ''.join(f'<th>{x}</th>' for x in '日月火水木金土')
    return f'<table class="cal" aria-label="10月のきろく"><thead><tr>{head}</tr></thead><tbody>{"".join(rows)}</tbody></table>'


bodyB1 = f"""{CRUMB}
{H1}
{dline('・日本時間の0時に入れかわります')}
<section class="qz"><p class="qq" style="font-size:21px">{m[0]}</p>
{choices(False).replace('<span class="v">', '<span class="v" hidden>')}
</section>
<p class="calh">10月のきろく<small>連続正解<b>4</b>日</small></p>
{cal(False)}
{SRC}"""
page('b-mae', bodyB1)

bodyB2 = f"""{CRUMB}
{H1}
{dline('・つぎは30日（金）0時')}
<section class="qz"><p class="qq">{m[0]}</p>
{choices(True, picked=0, graph='masu')}
<div class="nx" style="margin:2px 0 0;justify-content:space-between"><button class="go" type="button">結果を送る</button><span style="font-size:11px">1マス＝4万人</span></div>
</section>
<p class="calh">10月のきろく<small>連続正解<b>5</b>日</small></p>
{cal(True)}
{SRC}"""
page('b-ato', bodyB2)

# =========================================================
# 案C：地図で場所も見せる（県をぬる）・連続はひとつの朱のはんこ
# =========================================================
mapsvg = re.search(r'<svg class="jm".*?</svg>', dobon, re.S).group(0)
groups = dict(re.findall(r'<g data-c="(\d\d)">(.*?)</g>', mapsvg, re.S))


def bbox(code):
    xs, ys = [], []
    for d in re.findall(r'd="([^"]*)"', groups[code]):
        x = y = 0.0
        toks = re.findall(r'[A-Za-z]|-?\d*\.?\d+', d)
        k = 0
        cmd = None
        while k < len(toks):
            if re.match(r'[A-Za-z]', toks[k]):
                cmd = toks[k]
                k += 1
                if cmd in 'Zz':
                    continue
            if cmd in ('M', 'L'):
                x, y = float(toks[k]), float(toks[k + 1]); k += 2
            elif cmd in ('m', 'l'):
                x += float(toks[k]); y += float(toks[k + 1]); k += 2
            else:
                k += 1
                continue
            xs.append(x); ys.append(y)
    return min(xs), min(ys), max(xs), max(ys)


ca, cb = A[0][:2], B[0][:2]
ba, bb = bbox(ca), bbox(cb)
x0, y0 = min(ba[0], bb[0]), min(ba[1], bb[1])
x1, y1 = max(ba[2], bb[2]), max(ba[3], bb[3])
ASPECT = 390 / 215
h = (y1 - y0) + 26
w = max((x1 - x0) + 40, h * ASPECT)
h = w / ASPECT
cx, cy = (x0 + x1) / 2 + 10, (y0 + y1) / 2
vb_ = f'{cx - w / 2:.1f} {cy - h / 2:.1f} {w:.1f} {h:.1f}'


def cmap(done):
    parts = []
    for code, g in groups.items():
        fill = '#f6f9f1'
        if code == ca:
            fill = '#b5cfbb'
        if code == cb:
            fill = '#bcd8ea'
        g2 = re.sub(r'fill="#[0-9a-f]{6}"', f'fill="{fill}"', g)
        parts.append(g2)
    s = ''.join(parts)
    lab = []
    for i, (code, bx, r, v) in enumerate([(ca, ba, A, va), (cb, bb, B, vb)]):
        mx_, my_ = (bx[0] + bx[2]) / 2, (bx[1] + bx[3]) / 2
        tx = bx[2] + 3
        ty = my_ + 2
        k = 'アイ'[i]
        ok = done and i == 0
        lab.append(f'<text x="{tx:.1f}" y="{ty:.1f}"{" class=\"ok\"" if ok else ""}>{k} {r[1]}</text>')
        if done:
            lab.append(f'<text class="v" x="{tx + 6:.1f}" y="{ty + 10.5:.1f}">{v / 10000:.1f}万人</text>')
        if ok:
            ex = tx + 17
            lab.append(f'<ellipse cx="{ex:.1f}" cy="{ty - 2.4:.1f}" rx="21" ry="6.6" transform="rotate(-6 {ex:.1f} {ty - 2.4:.1f})" fill="none" stroke="#c53d43" stroke-width="1.1"/>')
    return (f'<svg class="km" viewBox="{vb_}" role="img" aria-label="{A[1]}（{PN[ca][1]}）と{B[1]}（{PN[cb][1]}）の場所">'
            f'<g stroke="#33413a" stroke-width=".45" stroke-linejoin="round">{s}</g>{"".join(lab)}</svg>')


bodyC1 = f"""{CRUMB}
{H1}
{dline('・日本時間の0時に入れかわります')}
<section class="qz"><p class="qq">{m[0]}</p>
{cmap(False)}
{choices(False, colors=True).replace('<span class="v">', '<span class="v" hidden>')}
</section>
{SRC}"""
page('c-mae', bodyC1)

bodyC2 = f"""{CRUMB}
{H1}
{dline('・つぎは30日（金）0時')}
<section class="qz"><p class="qq">{m[0]}</p>
{cmap(True)}
{choices(True, colors=True, picked=0)}
</section>
<div class="res"><p>差は <b style="color:var(--num);font-size:17px">{fmt(va - vb)}</b>人<br><button class="go" type="button">結果を送る</button></p><div class="han2" role="img" aria-label="連続正解5日">連続正解<b>5日</b></div></div>
{SRC}"""
page('c-ato', bodyC2)
print('ok', vb_)
