// 災害時モード（data/mode.yml）。ビルドのときに1回読む
// 切りかえは Actions の「災害時モードの切りかえ」（.github/workflows/saigai.yml）。災害を見て自動で切りかえることはしない
import { readYaml } from './data.mjs';

export function checkMode(m) {
  const errors = [];
  if (typeof m?.saigai !== 'boolean') errors.push('mode.yml: saigai は true か false');
  if (m?.since != null && !/^\d{4}-\d{2}-\d{2}$/.test(String(m.since))) errors.push('mode.yml: since は 2026-10-26 の形か null');
  return errors;
}

const mode = readYaml('mode.yml');
const err = checkMode(mode);
if (err.length) throw new Error(err.join('\n'));

export const SAIGAI = mode.saigai;

// 全ページのいちばん上に出す案内（灰色の帯に1行。点滅・赤い大きな文字にしない）
export const SAIGAI_BAR = '<p class="sg" role="note">災害の情報は、<a href="https://www.jma.go.jp/bosai/">気象庁</a>と市区町村の発表を見てください</p>';
