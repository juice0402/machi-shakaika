# まなびプリントが A4 に収まるかの点検（作業場で。CI では動かさない）
#   使い方：npm run build のあと python3 -m http.server 8734 -d dist & を動かしてから
#           python3 tools/manabi/check-fit.py [ポート] [a|b]
#   A は全部の街、B は全部の街 × 人口の近い街（次の行）と人口のいちばん多い街を、どちらも 3段階 × 答えありで、印刷の形（emulate_media('print')）で紙に入れ、
#   紙からはみ出したもの・出典の行に重なったものを出す。問題の紙のいちばん少ない下の余白も出す
import json, sys
from playwright.sync_api import sync_playwright

PORT = sys.argv[1] if len(sys.argv) > 1 else '8734'
KIND = sys.argv[2] if len(sys.argv) > 2 else 'a'
JS = '''async(kind)=>{const K=await MT.load();const out=[];let slack=1e9;const ss=document.querySelector('.sheets');
const B=kind==='b'?await fetch(C.bUrl).then(r=>r.json()):null;if(kind==='b')C.M=MC;
const jobs=[];K.r.forEach((r,i)=>{if(kind==='a')jobs.push([r]);else{if(K.r[i+1])jobs.push([r,K.r[i+1]]);if(i)jobs.push([r,K.r[0]])}});
for(const [r,r2] of jobs){const d=mbCity(r,K.p[r[0].slice(0,2)]);for(const g of ['s','c','h']){
ss.innerHTML=r2?mbSheets(C,{k:'b',m:r[0],n:r2[0],g,a:1},mbAddB(d,B[r[0]]),mbAddB(mbCity(r2,K.p[r2[0].slice(0,2)]),B[r2[0]])):mbSheets(C,{k:'a',m:r[0],g,a:1},d);
[...ss.querySelectorAll('.sheet')].forEach((s,i)=>{const R=s.getBoundingClientRect();let mb=0,mr=0;
s.querySelectorAll('*').forEach(e=>{const q=e.getBoundingClientRect();if(q.height||q.width){mb=Math.max(mb,q.bottom);mr=Math.max(mr,q.right)}});
const ft=s.querySelector('.mb-foot'),f=ft.getBoundingClientRect(),pv=ft.previousElementSibling.getBoundingClientRect();
if(mb>R.bottom+0.5||mr>R.right+0.5||pv.bottom>f.top+0.5)out.push([r[1],r2?r2[1]:'',g,i+1]);if(i===0)slack=Math.min(slack,f.top-pv.bottom)})}}
return {bad:out.slice(0,30),n:out.length,slack:Math.round(slack)}}'''
with sync_playwright() as p:
    b = p.chromium.launch()
    pg = b.new_page(viewport={'width': 900, 'height': 1200})
    errs = []
    pg.on('pageerror', lambda e: errs.append(str(e)))
    pg.goto(f'http://localhost:{PORT}/dougu/manabi/?k={KIND}&m=14100&g=s&a=1')
    pg.wait_for_timeout(800)
    pg.emulate_media(media='print')
    res = pg.evaluate(JS, KIND)
    b.close()
print(json.dumps({**res, 'errors': errs[:5]}, ensure_ascii=False))
sys.exit(1 if res['n'] or errs else 0)
