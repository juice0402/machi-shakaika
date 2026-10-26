// 出典・外部リンクの点検：data/sources.yml・data/bichiku.yml・ページに出ている外部リンクが、いま開けるか
// 動くのは .github/workflows/check-links.yml（週1回と、データ・ページのコードを変えた PR）。ページのリンクは dist/ から集めるので、先に npm run build
//   node scripts/check-links.mjs [--report report.md]   開いてみる（結果は注記・Markdown・GITHUB_OUTPUT の gone / refused / total）
//   node scripts/check-links.mjs --list                  点検する URL を出すだけ（ネットにつながない）
// 消えたリンクがあっても終了コードは 0（PR を止めない）。止まるのは、このスクリプトが壊れたときだけ
import { writeFileSync, appendFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { collectLinks, buildReport, annotationLines, countKinds, describeWhere } from '../src/lib/links.mjs';
import { runChecks } from '../src/lib/linkcheck.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const arg = (name) => {
  const i = process.argv.indexOf(name);
  return i < 0 ? null : process.argv[i + 1];
};

const { links, notes } = collectLinks({ root });

if (process.argv.includes('--list')) {
  for (const l of links) console.log(`${l.url}\t${describeWhere(l.wheres)}`);
  console.log(`${links.length}件${notes.map((n) => `\n注：${n}`).join('')}`);
  process.exit(0);
}

const checked = await runChecks(links.map((l) => l.url));
const results = links.map((l) => ({ ...l, ...checked.get(l.url) }));
const c = countKinds(results);
const report = buildReport(results, { notes, date: new Date().toLocaleDateString('sv-SE', { timeZone: 'Asia/Tokyo' }) });

console.log(report);
if (process.env.GITHUB_ACTIONS) for (const l of annotationLines(results, { notes })) console.log(l);
if (arg('--report')) writeFileSync(arg('--report'), report);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `gone=${c.gone}\nrefused=${c.refused}\ntotal=${c.total}\nnotes=${notes.length}\n`);
