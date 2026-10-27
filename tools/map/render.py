# 見本の案1を HTML に描く（gen.py のあと）。案2（opt2）は使わない
import json, math, random, sys

import os
D = os.environ.get('MAPWORK', 'tools/map/.work') + '/'
S = json.load(open(D + 'shapes.json'))
W, H = S['W'], S['H']
INK = '#33413a'
R = random.Random(47)
FONT = "font-family=\"'Noto Sans CJK JP',sans-serif\""


def path(ring, j=0.3):
    pts = [(x + R.uniform(-j, j), y + R.uniform(-j, j)) for x, y in ring]
    return 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z'


def wob_rect(x, y, w, h):
    pts = []
    for (ax, ay, bx, by) in [(x, y, x + w, y), (x + w, y, x + w, y + h), (x + w, y + h, x, y + h), (x, y + h, x, y)]:
        for t in [i / 6 for i in range(6)]:
            pts.append((ax + (bx - ax) * t + R.uniform(-.5, .5), ay + (by - ay) * t + R.uniform(-.5, .5)))
    return 'M' + ' L'.join(f'{px:.1f} {py:.1f}' for px, py in pts) + 'Z'


PAL = ['#eef5e8', '#e1edd6', '#f6f9f1', '#dce9e0']


def neighbors():
    sets = {iso: {(round(x), round(y)) for r in rs for x, y in r} for iso, rs in S['main'].items()}
    grow = {iso: {(x + dx, y + dy) for x, y in st for dx in (-1, 0, 1) for dy in (-1, 0, 1)} for iso, st in sets.items()}
    nb = {iso: set() for iso in sets}
    keys = list(sets)
    for i, a in enumerate(keys):
        for b in keys[i + 1:]:
            if grow[a] & sets[b]:
                nb[a].add(b); nb[b].add(a)
    return nb


def colors():
    nb = neighbors()
    col = {}
    for iso in sorted(nb, key=lambda k: -len(nb[k])):
        used = {col.get(n) for n in nb[iso]}
        col[iso] = next((c for c in PAL if c not in used), PAL[0])
    col['JP-47'] = PAL[0]
    return col


# 名前の置き場：中心から始めて、重なりを押しのける
FIX = {  # 中心がずれて見える所だけ手で（dx, dy）
    'JP-01': (8, 4), 'JP-13': (0, 0), 'JP-28': (0, 4), 'JP-04': (4, 0),
}


def place(bw, bh, fixed_boxes=(), iters=400):
    anchors = {iso: (c[0] + FIX.get(iso, (0, 0))[0], c[1] + FIX.get(iso, (0, 0))[1]) for iso, c in S['c'].items()}
    pos = {iso: list(a) for iso, a in anchors.items()}
    keys = list(pos)
    for it in range(iters):
        for i, a in enumerate(keys):
            for b in keys[i + 1:]:
                ax, ay = pos[a]; bx, by = pos[b]
                ox = bw + 2 - abs(ax - bx); oy = bh + 2 - abs(ay - by)
                if ox > 0 and oy > 0:
                    if ox < oy:
                        s = 1 if ax < bx else -1
                        pos[a][0] -= s * ox / 2 * .5; pos[b][0] += s * ox / 2 * .5
                    else:
                        s = 1 if ay < by else -1
                        pos[a][1] -= s * oy / 2 * .5; pos[b][1] += s * oy / 2 * .5
        for iso in keys:
            if iso == 'JP-47':
                pos[iso] = list(anchors[iso]); continue
            ax, ay = anchors[iso]
            pos[iso][0] += (ax - pos[iso][0]) * .02; pos[iso][1] += (ay - pos[iso][1]) * .02
            pos[iso][0] = min(max(pos[iso][0], bw / 2 + 1), W - bw / 2 - 1)
            pos[iso][1] = min(max(pos[iso][1], bh / 2 + 1), H - bh / 2 - 1)
            for (fx, fy, fw, fh) in fixed_boxes:  # 沖縄の枠に入らない
                if iso != 'JP-47' and fx - bw / 2 < pos[iso][0] < fx + fw + bw / 2 and fy - bh / 2 < pos[iso][1] < fy + fh + bh / 2:
                    pos[iso][0] = fx + fw + bw / 2 + 1
    return anchors, pos


def base(col, stroke=.7):
    out = []
    for iso, rs in S['main'].items():
        d = ''.join(path(r) for r in rs)
        out.append(f'<a href="#{iso}" aria-label="{S["names"][iso]}"><path d="{d}" fill="{col[iso]}" stroke="{INK}" stroke-width="{stroke}" stroke-linejoin="round"/></a>')
    ox, oy, ow, oh = S['obox']
    out.append(f'<path d="{wob_rect(ox, oy, ow, oh)}" fill="none" stroke="{INK}" stroke-width=".8"/>')
    d = ''.join(path(r) for r in S['oki'])
    out.append(f'<a href="#JP-47"><path d="{d}" fill="{col["JP-47"]}" stroke="{INK}" stroke-width="{stroke}"/></a>')
    # 北と波（今の飾りを右下へ）
    nx, ny = W - 30, H - 70
    out.append(f'<path d="M{nx} {ny+50} L{nx} {ny+8}" stroke="{INK}" stroke-width="1.2" fill="none"/><path d="M{nx} {ny} L{nx-5} {ny+20} L{nx} {ny+16}Z" fill="{INK}"/><path d="M{nx} {ny} L{nx+5} {ny+20} L{nx} {ny+16}" fill="none" stroke="{INK}" stroke-width="1"/><text x="{nx}" y="{ny-5}" font-size="12" text-anchor="middle" fill="{INK}" font-weight="700" font-family="Noto Serif CJK JP">北</text>')
    for x, y, w in [(250, H - 40, 28), (300, H - 18, 24), (200, H - 14, 22)]:
        out.append(f'<path d="M{x} {y} q{w/4} -4 {w/2} 0 t{w/2} 0" stroke="#3f8fbf" fill="none" stroke-width="1"/>')
    return out


def opt1():
    col = colors()
    out = base(col)
    bw, bh = 19, 10
    anchors, pos = place(bw, bh, [S['obox']])
    lab = []
    for iso, (x, y) in pos.items():
        ax, ay = anchors[iso]
        if math.hypot(x - ax, y - ay) > 5.5:
            lab.append(f'<path d="M{ax:.1f} {ay:.1f} L{x:.1f} {y:.1f}" stroke="{INK}" stroke-width=".5"/><circle cx="{ax:.1f}" cy="{ay:.1f}" r="1.1" fill="{INK}"/>')
        lab.append(f'<text x="{x:.1f}" y="{y + 3.2:.1f}" text-anchor="middle">{S["short"][iso]}</text>')
    return f'<svg viewBox="0 0 {W} {H}" width="{W}" style="display:block">{"".join(out)}<g font-size="9" fill="{INK}" {FONT} stroke="#fff" stroke-width="2.6" paint-order="stroke" stroke-linejoin="round" pointer-events="none">{"".join(lab)}</g></svg>'


def opt2():
    col = {iso: '#f3f7ef' for iso in list(S['main']) + ['JP-47']}
    out = base(col, stroke=.45)
    bw, bh = 19, 13
    anchors, pos = place(bw, bh, [S['obox']])
    tiles = []
    for iso, (x, y) in pos.items():
        ax, ay = anchors[iso]
        if math.hypot(x - ax, y - ay) > 9:
            tiles.append(f'<path d="M{ax:.1f} {ay:.1f} L{x:.1f} {y:.1f}" stroke="{INK}" stroke-width=".5"/><circle cx="{ax:.1f}" cy="{ay:.1f}" r="1.1" fill="{INK}"/>')
        tiles.append(f'<a href="#{iso}"><rect x="{x - bw/2:.1f}" y="{y - bh/2:.1f}" width="{bw}" height="{bh}" fill="#fff" stroke="#9fbf95" stroke-width=".8"/><text x="{x:.1f}" y="{y + 2.9:.1f}" text-anchor="middle">{S["short"][iso]}</text></a>')
    return f'<svg viewBox="0 0 {W} {H}" width="{W}" style="display:block">{"".join(out)}<g font-size="8" fill="{INK}" {FONT}>{"".join(tiles)}</g></svg>'


if __name__ == '__main__':
    for name, fn in [('o1', opt1)]:
        html = f'<!doctype html><meta charset="utf-8"><body style="margin:0;background:#fff;width:390px">{fn()}</body>'
        open(D + name + '.html', 'w').write(html)
