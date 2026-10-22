// いまの dist/ が前回の本番と変わったか（変わっていなければ公開しない）
// 本番の /fingerprint.json とくらべる。本番がまだない・取れないときは「変わった」として公開する
// GitHub Actions では changed=true|false を出力する
import { readFileSync, appendFileSync } from 'node:fs';
import { SITE } from '../src/site.mjs';

const now = JSON.parse(readFileSync('dist/fingerprint.json', 'utf8'));
let prev = null;
try {
  const r = await fetch(`${SITE.pagesDev}/fingerprint.json`, { cache: 'no-store', signal: AbortSignal.timeout(20_000) });
  if (r.ok) prev = await r.json();
} catch {
  // 取れないときは公開する
}
const changed = prev?.hash !== now.hash;
const msg = prev ? (changed ? `本番と変わった（${prev.hash.slice(0, 12)} → ${now.hash.slice(0, 12)}）` : '本番と同じなので公開しない') : '本番の指紋が取れないので公開する';
console.log(msg);
if (process.env.GITHUB_OUTPUT) appendFileSync(process.env.GITHUB_OUTPUT, `changed=${changed}\n`);
if (process.env.GITHUB_STEP_SUMMARY) appendFileSync(process.env.GITHUB_STEP_SUMMARY, `### 本番とのちがい\n${msg}\n`);
