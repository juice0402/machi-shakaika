# 日本地図の見本（案1、10/27 しょーくん決定）の形づくり。夜のメモ #21 の下書き（そのまま使っても、作り直してもよい）
# 使い方：MAPWORK に Natural Earth の geojson を置いて（ne_10m_admin_1_states_provinces.geojson・ne_10m_admin_0_disputed_areas.geojson、
#   https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson/ から。パブリックドメイン）
#   python3 -I tools/map/gen.py → MAPWORK/shapes.json、python3 -I tools/map/render.py → MAPWORK/o1.html（見本の案1）
import os
WORK = os.environ.get('MAPWORK', 'tools/map/.work') + '/'
import json, math, random, sys

src = json.load(open(WORK + 'ne_10m_admin_1_states_provinces.geojson'))
g = {'features': [{'properties': {'name_ja': f['properties']['name_ja'], 'iso': f['properties']['iso_3166_2']}, 'geometry': f['geometry']} for f in src['features'] if f['properties'].get('adm0_a3') == 'JPN']}
dis = json.load(open(WORK + 'ne_10m_admin_0_disputed_areas.geojson'))
kuril = next(f['geometry'] for f in dis['features'] if (f['properties'].get('BRK_NAME') or f['properties'].get('brk_name')) == 'Kuril Is.')  # 北方領土（北海道に入れる）

SHORT = {}
NAMES = {}
for f in g['features']:
    p = f['properties']
    n = p['name_ja']
    NAMES[p['iso']] = n
    SHORT[p['iso']] = '北海' if n == '北海道' else n.rstrip('都府県')[:2] if n not in ('京都府',) else '京都'
SHORT['JP-26'] = '京都'

W = 390
LON0, LON1, LAT0, LAT1 = 128.95, 149.15, 30.9, 45.65
CS = math.cos(math.radians(37.5))
K = W / ((LON1 - LON0) * CS)
H = round((LAT1 - LAT0) * K) + 6


def proj(lon, lat, k=K, lon0=LON0, lat1=LAT1, ox=0, oy=0):
    return ((lon - lon0) * CS * k + ox, (lat1 - lat) * k + oy)


def area(r):
    a = 0
    for i in range(len(r)):
        x1, y1 = r[i]; x2, y2 = r[(i + 1) % len(r)]
        a += x1 * y2 - x2 * y1
    return a / 2


def dp(pts, tol):
    if len(pts) < 3:
        return pts
    (x1, y1), (x2, y2) = pts[0], pts[-1]
    dx, dy = x2 - x1, y2 - y1
    L = math.hypot(dx, dy) or 1e-9
    best, idx = 0, 0
    for i in range(1, len(pts) - 1):
        x, y = pts[i]
        d = abs(dy * x - dx * y + x2 * y1 - y2 * x1) / L
        if d > best:
            best, idx = d, i
    if best > tol:
        return dp(pts[:idx + 1], tol)[:-1] + dp(pts[idx:], tol)
    return [pts[0], pts[-1]]


def simp(ring, tol):
    # split ring in two halves so DP works on closed rings
    n = len(ring)
    if n < 8:
        return ring
    h = n // 2
    a = dp(ring[:h + 1], tol)
    b = dp(ring[h:] + [ring[0]], tol)
    return a[:-1] + b[:-1]


def polys_of(geom):
    return geom['coordinates'] if geom['type'] == 'MultiPolygon' else [geom['coordinates']]


R = random.Random(47)


def path(ring, j=0.35):
    pts = [(x + R.uniform(-j, j), y + R.uniform(-j, j)) for x, y in ring]
    s = 'M' + ' L'.join(f'{x:.1f} {y:.1f}' for x, y in pts) + 'Z'
    return s


def shapes(geom, pf, tol=0.55, minarea=6):
    out = []
    for pl in polys_of(geom):
        ring = [pf(lon, lat) for lon, lat in pl[0]]
        if abs(area(ring)) < minarea:
            continue
        r = simp(ring, tol)
        if len(r) >= 3:
            out.append(r)
    return out


def centroid(rings):
    big = max(rings, key=lambda r: abs(area(r)))
    a = area(big); cx = cy = 0
    for i in range(len(big)):
        x1, y1 = big[i]; x2, y2 = big[(i + 1) % len(big)]
        c = x1 * y2 - x2 * y1
        cx += (x1 + x2) * c; cy += (y1 + y2) * c
    return cx / (6 * a), cy / (6 * a)


MAIN = {}
OKI = None
for f in g['features']:
    iso = f['properties']['iso']
    if iso == 'JP-47':
        continue
    geom = f['geometry']
    if iso == 'JP-13':  # 東京：本土だけ（島は入れない）
        geom = {'type': 'MultiPolygon', 'coordinates': [pl for pl in polys_of(geom) if pl[0][0][1] > 35.3]}
    if iso == 'JP-46':
        geom = {'type': 'MultiPolygon', 'coordinates': [pl for pl in polys_of(geom) if max(c[1] for c in pl[0]) > 30.9]}
    MAIN[iso] = shapes(geom, proj)
MAIN['JP-01'] += shapes(kuril, proj, minarea=1)

# 沖縄（左上の枠）：本島まわりだけ、1.7倍
OK_K = K * 2.3
OBOX = (12, 12, 62, 70)  # x, y, w, h
f47 = [f for f in g['features'] if f['properties']['iso'] == 'JP-47'][0]
okgeom = {'type': 'MultiPolygon', 'coordinates': [pl for pl in polys_of(f47['geometry']) if 127.2 < pl[0][0][0] < 128.6 and 25.9 < pl[0][0][1] < 27.2]}
OKI = shapes(okgeom, lambda lon, lat: proj(lon, lat, OK_K, 127.28, 27.02, OBOX[0] + 2, OBOX[1] + 6), minarea=2)

C = {iso: centroid(r) for iso, r in MAIN.items()}
C['JP-47'] = centroid(OKI)

json.dump({'W': W, 'H': H, 'main': MAIN, 'oki': OKI, 'c': C, 'short': SHORT, 'names': NAMES, 'obox': OBOX}, open(WORK + 'shapes.json', 'w'))
print('H', H, 'K', round(K, 2), 'pts', sum(len(r) for rs in MAIN.values() for r in rs) + sum(len(r) for r in OKI))
