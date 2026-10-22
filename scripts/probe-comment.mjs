// データの確認の結果を、PRのコメント（1つ6万字まで）に分けて probe-out/comment-1.md… に書く。Actions のまとめにも出す
import { existsSync, readFileSync, writeFileSync, mkdirSync, appendFileSync } from 'node:fs';

const OUT = 'probe-out';
mkdirSync(OUT, { recursive: true });
const part = (file, title, outcome) =>
  existsSync(`${OUT}/${file}`) ? readFileSync(`${OUT}/${file}`, 'utf8') : `## ${title}\n\n- 確認が止まった（${outcome || '不明'}）。Actions のログを見る\n`;
const all = [
  `データの確認（${new Date().toISOString().slice(0, 16).replace('T', ' ')} UTC）`,
  '',
  part('estat.md', 'e-Stat の確認', process.env.ESTAT_OUTCOME),
  part('hinan.md', '国土地理院の避難場所データの確認', process.env.HINAN_OUTCOME),
].join('\n');

const LIMIT = 60000;
const chunks = [];
let cur = '';
for (const line of all.split('\n')) {
  if (cur.length + line.length + 1 > LIMIT) {
    chunks.push(cur);
    cur = '';
  }
  cur += `${line.slice(0, LIMIT - 100)}\n`;
}
if (cur.trim()) chunks.push(cur);
chunks.forEach((c, i) => writeFileSync(`${OUT}/comment-${i + 1}.md`, chunks.length > 1 ? `（${i + 1}/${chunks.length}）\n\n${c}` : c));
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, all.slice(0, 900_000));
console.log(`コメント ${chunks.length} 件`);
