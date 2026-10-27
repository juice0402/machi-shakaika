// 都道府県の地図（トップとドボンクイズで共通）。形・ぬりの色・県名の置き場は src/japan-map-data.mjs（tools/map で作る）
import { JMAP } from './japan-map-data.mjs';
import { PREFS } from './areas.mjs';
import { mapDeco } from './art.mjs';
import { esc } from './layout.mjs';

export const short = (n) => (n === '北海道' ? '北海' : n.replace(/[都府県]$/, '').slice(0, 2));

const INK = '#33413a';
const HZ = [24, 16]; // 県名の字のまわりの押せる範囲

// quiz: false → 県のページへのリンク（トップ）／ true → その県をえらぶボタン（ドボンクイズ。data-c に県のコード）
export function japanMap({ quiz = false } = {}) {
  const { w, h, pal, frame, prefs } = JMAP;
  const shapes = [];
  const labels = [];
  for (const p of PREFS) {
    const m = prefs[p.code];
    const shape = `<path d="${m.d}" fill="${pal[m.f]}"/>`;
    const lead = m.a ? `<path class="ld" d="M${m.a[0]} ${m.a[1]}L${m.x} ${m.y}"/><circle cx="${m.a[0]}" cy="${m.a[1]}" r="1.1"/>` : '';
    const inner = `<rect class="hz" x="${(m.x - HZ[0] / 2).toFixed(1)}" y="${(m.y - HZ[1] / 2).toFixed(1)}" width="${HZ[0]}" height="${HZ[1]}"/>${lead}<text x="${m.x}" y="${(m.y + 3.2).toFixed(1)}">${short(p.name)}</text>`;
    if (quiz) {
      shapes.push(`<g data-c="${p.code}">${shape}</g>`);
      labels.push(`<g class="pf" data-c="${p.code}" role="button" tabindex="0" aria-label="${esc(p.name)}">${inner}<use class="mo" href="#jo" x="${m.x}" y="${m.y}"/><use class="mx" href="#jx" x="${m.x}" y="${m.y}"/></g>`);
    } else {
      shapes.push(`<a href="/${p.slug}/" tabindex="-1" aria-hidden="true">${shape}</a>`);
      labels.push(`<a class="pf" href="/${p.slug}/" aria-label="${esc(p.name)}">${inner}</a>`);
    }
  }
  const defs = quiz
    ? '<defs><ellipse id="jo" rx="14" ry="9" transform="rotate(-6)"/><path id="jx" d="M-8-6 8 6M8-6-8 6"/></defs>'
    : '';
  return `<svg class="jm" viewBox="0 0 ${w} ${h}" role="group" aria-label="都道府県の地図">${defs}<g stroke="${INK}" stroke-width=".7" stroke-linejoin="round">${shapes.join('')}<path d="${frame}" fill="none" stroke-width=".8"/></g>${mapDeco(w, h)}<g class="lb">${labels.join('')}</g></svg>`;
}

// 地図の見た目（スマホは画面の幅いっぱい。.pg の最大幅 430px をこえない）
export const JMAP_CSS = `.jm{display:block;width:calc(100% + 32px);height:auto;margin:0 -16px;font-size:9px;-webkit-tap-highlight-color:transparent}
.jm .lb text{fill:${INK};stroke:#fff;stroke-width:2.6px;paint-order:stroke;stroke-linejoin:round;text-anchor:middle}
.jm .hz{fill:transparent}.jm .ld{stroke:${INK};stroke-width:.5}.jm circle{fill:${INK}}.jm a{cursor:pointer}
.jm .pf{outline:none;cursor:pointer}.jm .pf:focus-visible .hz{stroke:${INK};stroke-width:1}
.jm .mo,.jm .mx{display:none;fill:none;stroke:var(--accent);stroke-width:2;stroke-linecap:round}
.jm .hit .mo,.jm .ans5 .mo,.jm .miss .mx{display:inline}.jm .ans5 .mo{stroke-dasharray:3 2.5}
.jm .hit text{fill:var(--accent);font-weight:700}`.replace(/\n/g, '');
