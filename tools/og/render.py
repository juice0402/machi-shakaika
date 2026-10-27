# HTML を共有画像（JPEG・品質90）にする。Claude の作業場で手で動かす（CI では使わない）
# 使い方：python3 tools/og/render.py <html> <出力.jpg> <幅> <高さ>
# 字は作業場の Noto Serif CJK JP・Noto Sans CJK JP。はみ出した部品があれば止まる
import os, sys
from playwright.sync_api import sync_playwright

src, out, w, h = sys.argv[1], sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
CHECK = """([W, H]) => [...document.querySelectorAll('body *')].map((el) => [el, el.getBoundingClientRect()])
  .filter(([, r]) => r.width && r.height && (r.right > W + 0.5 || r.bottom > H + 0.5 || r.left < -0.5 || r.top < -0.5))
  .map(([el]) => el.tagName + '.' + el.className)"""
with sync_playwright() as p:
    b = p.chromium.launch(args=['--allow-file-access-from-files'])
    pg = b.new_page(viewport={'width': w, 'height': h}, device_scale_factor=1)
    pg.goto('file://' + os.path.abspath(src))
    pg.wait_for_load_state('networkidle')
    pg.evaluate('document.fonts.ready')
    bad = pg.evaluate(CHECK, [w, h])
    if bad:
        sys.exit('はみ出し：' + ', '.join(bad[:5]))
    pg.screenshot(path=out, type='jpeg', quality=90, clip={'x': 0, 'y': 0, 'width': w, 'height': h})
    b.close()
print(out, os.path.getsize(out) // 1024, 'KB')
