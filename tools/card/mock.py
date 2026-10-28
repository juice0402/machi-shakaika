# 街くらべカードの見本（案A、10/28 しょーくん決定）の描き方。夜のメモ #28 の写し元（数字・色・大きさ）。
# 作業場の scratchpad で動かしたもの（パスは当時のまま）。絵の窓はトップの絵で仮においている（本番は地方の絵）
import json, math, random, base64

SP = '/tmp/claude-0/-home-claude/97ed28e4-7722-5c84-a75a-0996f8e13454/scratchpad/'
S = json.load(open(SP + 'map/shapes.json'))
HERO = base64.b64encode(open('/home/claude/machi-shakaika/static/hero-860.webp', 'rb').read()).decode()

INK, SUB, LINE, AC = '#23312a', '#5f6e66', '#d3dfd5', '#c53d43'
GREEN, GREEN2, BLUE, BLUE2 = '#2f6b45', '#b5cfbb', '#3f8fbf', '#bcd9ea'
WOOD = '#8a6a4f'
SERIF = "'Noto Serif CJK JP',serif"
SANS = "'Noto Sans CJK JP',sans-serif"

NAT = dict(p014=10.9, p65=29.4, single=41.4, kyodo=46.0, growth=-2.5)
A = dict(name='札幌市', pref='北海道', iso='JP-01', lon=141.35, lat=43.06, pop=1961996, p014=9.9, p65=29.3, growth=-0.6, single=46.5, kyodo=66.0, col=GREEN, col2=GREEN2, crop=0)
B = dict(name='福岡市', pref='福岡県', iso='JP-40', lon=130.40, lat=33.59, pop=1662793, p014=11.8, p65=22.3, growth=3.1, single=54.5, kyodo=79.6, col=BLUE, col2=BLUE2, crop=1)
K = S['W'] / ((149.15 - 128.95) * math.cos(math.radians(37.5)))


def proj(lon, lat):
    return ((lon - 128.95) * math.cos(math.radians(37.5)) * K, (45.65 - lat) * K)


def jp_map(t, w):
    """小さな日本地図（その街の県をぬって、朱の点）"""
    s = w / S['W']
    R = random.Random(7)
    out = []
    for iso, rs in S['main'].items():
        d = ''.join('M' + ' L'.join(f'{x*s:.1f} {y*s:.1f}' for x, y in r) + 'Z' for r in rs)
        fill = t['col2'] if iso == t['iso'] else '#f3f6f1'
        out.append(f'<path d="{d}" fill="{fill}" stroke="{INK}" stroke-width=".5" stroke-linejoin="round"/>')
    x, y = proj(t['lon'], t['lat'])
    out.append(f'<circle cx="{x*s:.1f}" cy="{y*s:.1f}" r="4.5" fill="{AC}" stroke="#fff" stroke-width="1.5"/>')
    h = S['H'] * s
    # 沖縄の枠はうすく
    return f'<svg width="{w:.0f}" height="{h:.0f}" viewBox="0 0 {w:.1f} {h:.1f}">{"".join(out)}</svg>'


def man(n):
    return f'{n/10000:.0f}万人' if n >= 100000 else f'{n:,}人'


ROWS = [('15歳未満', 'p014', '%', 30), ('65歳以上', 'p65', '%', 50), ('ひとり暮らし', 'single', '%', 80), ('共同住宅', 'kyodo', '%', 100)]


def ruler_bar(x, y, w, v, vmax, nat, col, h=14):
    """ものさしの目盛りの上に棒。全国は小さな三角"""
    o = [f'<rect x="{x}" y="{y}" width="{w}" height="{h}" fill="#eef3ee"/>',
         f'<rect x="{x}" y="{y}" width="{w*v/vmax:.1f}" height="{h}" fill="{col}"/>']
    for i in range(0, 11):
        tx = x + w * i / 10
        o.append(f'<line x1="{tx:.1f}" y1="{y+h}" x2="{tx:.1f}" y2="{y+h+(6 if i%5==0 else 3)}" stroke="{SUB}" stroke-width="1"/>')
    nx = x + w * nat / vmax
    o.append(f'<path d="M{nx:.1f} {y-2} l-5 -8 h10z" fill="{INK}"/>')
    return ''.join(o)


# ---- 案A：トレカ2枚 ----
def card_a(t, x0, y0):
    W, H = 540, 820
    o = [f'<g transform="translate({x0},{y0})">',
         f'<rect x="0" y="0" width="{W}" height="{H}" rx="18" fill="{WOOD}"/>',
         f'<rect x="10" y="10" width="{W-20}" height="{H-20}" rx="10" fill="#fff"/>',
         f'<rect x="18" y="18" width="{W-36}" height="{H-36}" rx="6" fill="none" stroke="{t["col"]}" stroke-width="2"/>',
         f'<text x="36" y="58" font-family="{SANS}" font-size="20" fill="{SUB}">{t["pref"]}</text>',
         f'<text x="36" y="106" font-family="{SERIF}" font-size="46" font-weight="700" fill="{INK}">{t["name"]}</text>',
         f'<text x="{W-36}" y="70" text-anchor="end" font-family="{SANS}" font-size="18" fill="{SUB}">人口</text>',
         f'<text x="{W-36}" y="106" text-anchor="end" font-family="{SANS}" font-size="34" font-weight="700" fill="{t["col"]}">{man(t["pop"])}</text>']
    # 絵の窓
    cx = -40 if t['crop'] == 0 else -320
    o.append(f'<clipPath id="c{t["iso"]}"><rect x="36" y="124" width="{W-72}" height="200" rx="4"/></clipPath>')
    o.append(f'<image href="data:image/webp;base64,{HERO}" x="{36+cx}" y="104" width="860" height="378" clip-path="url(#c{t["iso"]})" preserveAspectRatio="xMidYMid slice"/>')
    o.append(f'<rect x="36" y="124" width="{W-72}" height="200" rx="4" fill="none" stroke="{INK}" stroke-width="1"/>')
    # 地図の小窓
    o.append(f'<rect x="{W-36-128}" y="132" width="120" height="114" fill="#fff" stroke="{INK}" stroke-width=".8"/>')
    o.append(f'<g transform="translate({W-36-124},138)">{jp_map(t, 112)}</g>')
    # 5年の増減
    g = t['growth']
    o.append(f'<text x="36" y="372" font-family="{SANS}" font-size="20" fill="{INK}">5年の人口の増減</text>')
    o.append(f'<text x="{W-36}" y="374" text-anchor="end" font-family="{SANS}" font-size="30" font-weight="700" fill="{t["col"]}">{g:+.1f}%</text>')
    # 増減のものさし（真ん中が0）
    mx, mw, my = 36, W - 72, 392
    o.append(f'<line x1="{mx}" y1="{my+7}" x2="{mx+mw}" y2="{my+7}" stroke="{LINE}" stroke-width="14"/>')
    zero = mx + mw / 2
    gw = mw / 2 * g / 6
    o.append(f'<rect x="{min(zero, zero+gw):.1f}" y="{my}" width="{abs(gw):.1f}" height="14" fill="{t["col"]}"/>')
    o.append(f'<line x1="{zero}" y1="{my-4}" x2="{zero}" y2="{my+20}" stroke="{INK}" stroke-width="1.2"/>')
    nx = zero + mw / 2 * NAT['growth'] / 6
    o.append(f'<path d="M{nx:.1f} {my-2} l-5 -8 h10z" fill="{INK}"/>')
    y = 452
    for lab, key, unit, vmax in ROWS:
        v = t[key]
        o.append(f'<text x="36" y="{y}" font-family="{SANS}" font-size="20" fill="{INK}">{lab}</text>')
        o.append(f'<text x="{W-36}" y="{y+2}" text-anchor="end" font-family="{SANS}" font-size="30" font-weight="700" fill="{t["col"]}">{v:.1f}<tspan font-size="18">%</tspan></text>')
        o.append(ruler_bar(36, y + 18, W - 72, v, 100, NAT[key], t['col']))
        y += 78
    o.append(f'<text x="36" y="{H-34}" font-family="{SANS}" font-size="14" fill="{SUB}">▲は全国　令和7年国勢調査を加工して作成</text>')
    o.append('</g>')
    return ''.join(o)


def opt_a():
    W, H = 1200, 900
    body = card_a(A, 40, 40) + card_a(B, 620, 40)
    foot = f'<text x="{W-40}" y="{H-14}" text-anchor="end" font-family="{SERIF}" font-size="18" font-weight="700" fill="{INK}">まちの社会科</text>'
    return W, H, body + foot


# ---- 案B：対決の1枚（左右にのびる棒） ----
def opt_b():
    W, H = 1200, 675
    o = [f'<rect x="0" y="0" width="{W}" height="{H}" fill="#fff"/>', f'<rect x="12" y="12" width="{W-24}" height="{H-24}" fill="none" stroke="{WOOD}" stroke-width="8"/>']
    for t, side in ((A, -1), (B, 1)):
        nx = 70 if side < 0 else W - 70
        anc = 'start' if side < 0 else 'end'
        mx = 50 if side < 0 else W - 50 - 130
        o.append(f'<g transform="translate({mx if side>0 else 60},40)">{jp_map(t, 130)}</g>')
        tx = 210 if side < 0 else W - 210
        o.append(f'<text x="{tx}" y="78" text-anchor="{anc}" font-family="{SANS}" font-size="20" fill="{SUB}">{t["pref"]}</text>')
        o.append(f'<text x="{tx}" y="128" text-anchor="{anc}" font-family="{SERIF}" font-size="48" font-weight="700" fill="{INK}">{t["name"]}</text>')
        o.append(f'<text x="{tx}" y="166" text-anchor="{anc}" font-family="{SANS}" font-size="24" fill="{t["col"]}" font-weight="700">人口 {man(t["pop"])}</text>')
    rows = [('5年の増減', 'growth', 6, True)] + [(l, k, 100, False) for l, k, u, m in ROWS]
    cx, half, y = W / 2, 400, 230
    for lab, key, vmax, signed in rows:
        o.append(f'<text x="{cx}" y="{y+22}" text-anchor="middle" font-family="{SANS}" font-size="20" fill="{INK}">{lab}</text>')
        for t, side in ((A, -1), (B, 1)):
            v = t[key]
            x0 = cx + side * 90
            bw = (half - 120) * (abs(v) / vmax)
            if signed:
                o.append(f'<line x1="{x0+side*(half-120)/2:.1f}" y1="{y}" x2="{x0+side*(half-120)/2:.1f}" y2="{y+34}" stroke="{INK}"/>')
                base = x0 + side * (half - 120) / 2
                ww = (half - 120) / 2 * v / vmax
                xa = base + side * ww
                o.append(f'<rect x="{min(base, xa):.1f}" y="{y+6}" width="{abs(xa-base):.1f}" height="22" fill="{t["col"]}"/>')
                vt = f'{v:+.1f}%'
            else:
                o.append(f'<rect x="{min(x0, x0+side*(half-120)):.1f}" y="{y+6}" width="{half-120}" height="22" fill="#eef3ee"/>')
                o.append(f'<rect x="{min(x0, x0+side*bw):.1f}" y="{y+6}" width="{bw:.1f}" height="22" fill="{t["col"]}"/>')
                nxp = x0 + side * (half - 120) * NAT[key] / vmax
                o.append(f'<path d="M{nxp:.1f} {y+4} l-5 -8 h10z" fill="{INK}"/>')
                vt = f'{v:.1f}%'
            vx = cx + side * (half - 20)
            o.append(f'<text x="{vx}" y="{y+28}" text-anchor="{"end" if side<0 else "start"}" font-family="{SANS}" font-size="28" font-weight="700" fill="{t["col"]}">{vt}</text>')
        y += 72
    o.append(f'<text x="40" y="{H-30}" font-family="{SANS}" font-size="15" fill="{SUB}">▲は全国　総務省「令和7年国勢調査」を加工して作成</text>')
    o.append(f'<text x="{W-40}" y="{H-30}" text-anchor="end" font-family="{SERIF}" font-size="20" font-weight="700" fill="{INK}">まちの社会科</text>')
    return W, H, ''.join(o)


# ---- 案C：100人の村カード（方眼紙） ----
def grid(x0, y0, cells, cs=26):
    o = []
    for i, c in enumerate(cells):
        r, q = divmod(i, 10)
        o.append(f'<rect x="{x0+q*cs}" y="{y0+r*cs}" width="{cs}" height="{cs}" fill="{c}" stroke="#9fb3a6" stroke-width=".8"/>')
    o.append(f'<rect x="{x0}" y="{y0}" width="{cs*10}" height="{cs*10}" fill="none" stroke="{INK}" stroke-width="1.4"/>')
    return ''.join(o)


def card_c(t, x0, y0):
    W, H = 540, 820
    kid, old = round(t['p014']), round(t['p65'])
    mid = 100 - kid - old
    cells = ['#cfe3bf'] * kid + ['#fff'] * mid + ['#e3dccd'] * old
    s = round(t['single'])
    cells2 = [t['col']] * s + ['#fff'] * (100 - s)
    o = [f'<g transform="translate({x0},{y0})">',
         f'<rect x="0" y="0" width="{W}" height="{H}" rx="18" fill="{WOOD}"/>',
         f'<rect x="10" y="10" width="{W-20}" height="{H-20}" rx="10" fill="#fff"/>',
         f'<text x="36" y="60" font-family="{SANS}" font-size="20" fill="{SUB}">{t["pref"]}</text>',
         f'<text x="36" y="108" font-family="{SERIF}" font-size="46" font-weight="700" fill="{INK}">{t["name"]}</text>',
         f'<g transform="translate({W-36-104},28)">{jp_map(t, 104)}</g>',
         f'<text x="36" y="150" font-family="{SANS}" font-size="20" fill="{INK}">人口 <tspan font-weight="700" font-size="26" fill="{t["col"]}">{man(t["pop"])}</tspan>　5年で <tspan font-weight="700" font-size="26" fill="{t["col"]}">{t["growth"]:+.1f}%</tspan></text>',
         f'<text x="36" y="200" font-family="{SERIF}" font-size="24" font-weight="700" fill="{INK}">100人の村なら</text>',
         grid(36, 216, cells, 24),
         f'<rect x="296" y="236" width="18" height="18" fill="#cfe3bf" stroke="#9fb3a6"/><text x="322" y="252" font-family="{SANS}" font-size="18" fill="{INK}">子ども <tspan font-weight="700" font-size="24">{kid}</tspan>人</text>',
         f'<rect x="296" y="282" width="18" height="18" fill="#fff" stroke="#9fb3a6"/><text x="322" y="298" font-family="{SANS}" font-size="18" fill="{INK}">15〜64歳 <tspan font-weight="700" font-size="24">{mid}</tspan>人</text>',
         f'<rect x="296" y="328" width="18" height="18" fill="#e3dccd" stroke="#9fb3a6"/><text x="322" y="344" font-family="{SANS}" font-size="18" fill="{INK}">65歳以上 <tspan font-weight="700" font-size="24">{old}</tspan>人</text>',
         f'<text x="36" y="510" font-family="{SERIF}" font-size="24" font-weight="700" fill="{INK}">100世帯なら</text>',
         grid(36, 526, cells2, 24),
         f'<rect x="296" y="546" width="18" height="18" fill="{t["col"]}"/><text x="322" y="562" font-family="{SANS}" font-size="18" fill="{INK}">ひとり暮らし</text><text x="322" y="596" font-family="{SANS}" font-size="18" fill="{INK}"><tspan font-weight="700" font-size="30" fill="{t["col"]}">{s}</tspan> 世帯</text>',
         f'<text x="322" y="650" font-family="{SANS}" font-size="16" fill="{SUB}">全国は {round(NAT["single"])} 世帯</text>',
         f'<text x="36" y="{H-34}" font-family="{SANS}" font-size="14" fill="{SUB}">令和7年国勢調査を加工して作成</text>',
         '</g>']
    return ''.join(o)


def opt_c():
    W, H = 1200, 900
    body = card_c(A, 40, 40) + card_c(B, 620, 40)
    foot = f'<text x="{W-40}" y="{H-14}" text-anchor="end" font-family="{SERIF}" font-size="18" font-weight="700" fill="{INK}">まちの社会科</text>'
    return W, H, body + foot


for name, fn in (('a', opt_a), ('b', opt_b), ('c', opt_c)):
    W, H, body = fn()
    html = f'<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff"><svg xmlns="http://www.w3.org/2000/svg" width="{W}" height="{H}" viewBox="0 0 {W} {H}" style="display:block"><rect width="{W}" height="{H}" fill="#fff"/>{body}</svg></body>'
    open(SP + f'card/{name}.html', 'w').write(html)
print('ok')
