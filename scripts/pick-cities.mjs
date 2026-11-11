// ページを作る街を、データの条件で自動にえらぶ（#87）→ data/auto-cities.json に足す
//   候補：src/areas.mjs の CITIES と auto-cities.json にない市（レベル4・名前が「市」。町村と政令市の区は入れない）で、
//         人口が AUTO_MIN_POP 以上・条件5（「この街の備え」に全国か県とはっきり違う世帯の特徴＝sonaeLinks に why がある）・
//         条件6（data/hinan/counts.json に避難場所の数がある）・読みがなから英字が作れる街
//   候補をふくめた市区町村ページの本文だけを作り、「どの街も同じ文」の割合（scripts/honbun.mjs）を測って、
//   めあて（KATA_GOAL の最大・中央。verify-dist が止める線）をこえる候補を外す。残りを足す
//   一度入った街は消さない・英字を変えない。英字が同じ県の中で重なった街は足さずに注記に出す
//   候補の避難場所の一覧（data/hinan/list/）はまだないので、一覧の文なしで測る（ある街より割合は高めに出る＝きびしいほう）
// 使い方：node scripts/pick-cities.mjs [--min=50000] [--dry]（--dry は書かずに数だけ出す。ためし用）
import { appendFileSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { AUTO_MIN_POP, AUTO_PATH, PREFS, prefByCode, readAutoCities, resolveCities, slugOf } from '../src/areas.mjs';
import { readMunis } from '../src/munis.mjs';
import { readYomi } from '../src/yomi.mjs';
import { derive, muniList, sonaeLinks } from '../src/stats.mjs';
import { readYaml, readBichiku, bichikuMap } from '../src/data.mjs';
import { calcConf } from '../src/calc.mjs';
import { kazuData } from '../src/machi-tools.mjs';
import { cityPage } from '../src/pages/city.mjs';
import { page } from '../src/layout.mjs';
import { honbunText, kataShare, KATA_GOAL } from './honbun.mjs';

// 条件をみたす候補：[{ code, pref, slug, name, pop }]。英字が重なった街は skipped に
export function pickCandidates({ areas, cities, yomi, counts, min = AUTO_MIN_POP }) {
  const z = derive(areas['00000']);
  const taken = new Set(cities.map((c) => c.code));
  const urls = new Set(cities.map((c) => `${c.pref}/${c.slug}`));
  const cands = [];
  const skipped = [];
  for (const a of Object.values(areas)) {
    if (a.level !== '4' || !a.name.endsWith('市') || taken.has(a.code) || !(a.pop >= min)) continue;
    const pref = prefByCode.get(a.code.slice(0, 2));
    const prefA = derive(areas[`${pref.code}000`]);
    if (!sonaeLinks(derive(a), z, prefA).some((l) => l.why)) continue;
    const n = counts?.areas?.[a.code];
    if (!n || n[0] + n[1] <= 0) continue;
    const slug = slugOf(yomi?.munis?.[a.code]);
    if (!slug) {
      skipped.push(`${a.code} ${a.name}：読みがなから英字が作れない`);
      continue;
    }
    cands.push({ code: a.code, pref: pref.slug, slug, name: a.name, pop: a.pop });
  }
  // 英字が同じ県の中で、ページのある街か、ほかの候補と重なったら足さない
  const key = (c) => `${c.pref}/${c.slug}`;
  const dup = new Map();
  for (const c of cands) dup.set(key(c), (dup.get(key(c)) ?? 0) + 1);
  const ok = [];
  for (const c of cands) {
    if (urls.has(key(c)) || dup.get(key(c)) > 1) skipped.push(`${c.code} ${c.name}：英字 /${key(c)}/ が同じ県の中で重なる`);
    else ok.push(c);
  }
  return { cands: ok.sort((x, y) => (x.code < y.code ? -1 : 1)), skipped };
}

// 外す候補：めあての最大をこえる候補。それがなく、中央がめあてをこえる・ページのある街が最大をこえるときは、割合のいちばん高い候補
//   shares：Map(コード → 割合)〔ページのある街と候補の全部〕。返すのは外すコードの Set（空なら終わり）
export function dropByKata(shares, candCodes, goal = KATA_GOAL) {
  const over = candCodes.filter((c) => shares.get(c) > goal.cityMax);
  if (over.length) return new Set(over);
  const ks = [...shares.values()].sort((a, b) => a - b);
  const median = ks[ks.length >> 1];
  const baseOver = [...shares].some(([c, v]) => !candCodes.includes(c) && v > goal.cityMax);
  if ((median > goal.cityMedian || baseOver) && candCodes.length) {
    const top = [...candCodes].sort((a, b) => shares.get(b) - shares.get(a))[0];
    return new Set([top]);
  }
  return new Set();
}

// 市区町村ページの本文だけを作る：Map(コード → 本文)
function cityTexts({ munis, cities }) {
  const items = readYaml('items.yml');
  const cc = calcConf(items);
  const list = muniList(munis.areas);
  const z = derive(munis.areas['00000']);
  const hinan = JSON.parse(readFileSync('data/hinan/counts.json', 'utf8'));
  const hinanMeta = JSON.parse(readFileSync('data/hinan/meta.json', 'utf8'));
  const cityUrl = new Map(cities.map((c) => [c.code, `/${c.pref}/${c.slug}/`]));
  const urlOf = (code) => cityUrl.get(code) ?? null;
  const kazu = kazuData(munis.areas, urlOf);
  const bichikuOf = bichikuMap(readBichiku());
  const hinanList = (code) => (existsSync(`data/hinan/list/${code}.json`) ? JSON.parse(readFileSync(`data/hinan/list/${code}.json`, 'utf8')) : null);
  return new Map(
    cities.map((city) => [
      city.code,
      honbunText(page(cityPage({ city, munis, list, z, cc, hinan, hinanMeta, urlOf, kazu, bichiku: bichikuOf.get(`${city.pref}/${city.slug}`) ?? null, hinanList: hinanList(city.code) }))),
    ]),
  );
}

if (import.meta.url === `file://${process.argv[1]}`) {
  const arg = (k) => process.argv.find((a) => a.startsWith(`--${k}=`))?.split('=')[1];
  const min = Number(arg('min') ?? AUTO_MIN_POP);
  const dry = process.argv.includes('--dry');
  const note = (level, msg) => {
    console.log(msg);
    if (process.env.GITHUB_ACTIONS) console.log(`::${level} title=ページを作る街::${msg}`);
  };
  const summary = (md) => process.env.GITHUB_STEP_SUMMARY && appendFileSync(process.env.GITHUB_STEP_SUMMARY, md);

  const munis = readMunis();
  if (!munis) {
    note('warning', 'data/estat/munis.json がないので、えらばない');
    process.exit(0);
  }
  const auto = readAutoCities();
  const { cities, errors } = resolveCities(munis.areas, auto);
  if (errors.length) {
    note('error', errors.join(' / '));
    process.exit(1);
  }
  const counts = existsSync('data/hinan/counts.json') ? JSON.parse(readFileSync('data/hinan/counts.json', 'utf8')) : null;
  const { cands, skipped } = pickCandidates({ areas: munis.areas, cities, yomi: readYomi(), counts, min });
  for (const s of skipped) note('warning', `足さない：${s}`);
  console.log(`人口${min.toLocaleString('ja-JP')}人以上の候補：${cands.length}（ページのある街 ${cities.length}）`);

  let keep = cands;
  const dropped = [];
  let shares = null;
  for (;;) {
    const all = [...cities, ...keep.map((c) => ({ pref: c.pref, name: c.name, slug: c.slug, kind: 'auto', code: c.code }))];
    const texts = cityTexts({ munis, cities: all });
    shares = kataShare(texts);
    if (!keep.length) break;
    const drop = dropByKata(shares, keep.map((c) => c.code));
    if (!drop.size) break;
    for (const c of keep) if (drop.has(c.code)) dropped.push(`${c.name} ${Math.round(shares.get(c.code) * 100)}%`);
    keep = keep.filter((c) => !drop.has(c.code));
  }
  const pct = (x) => `${Math.round(x * 100)}%`;
  const ks = [...shares.values()].sort((a, b) => a - b);
  const line = `型の割合（市区町村${ks.length}）：最小 ${pct(ks[0])}・中央 ${pct(ks[ks.length >> 1])}・最大 ${pct(ks[ks.length - 1])}・${pct(KATA_GOAL.cityMax)}をこえる ${ks.filter((x) => x > KATA_GOAL.cityMax).length}`;
  console.log(line);
  if (dropped.length) note('notice', `型の割合がめあてをこえるので足さない ${dropped.length}：${dropped.join('・')}`);
  if (!keep.length) {
    note('notice', '足す街なし');
    process.exit(0);
  }
  note('notice', `足す街 ${keep.length}：${keep.map((c) => `${PREFS.find((p) => p.slug === c.pref).name}${c.name}`).join('・')}`);
  if (dry) process.exit(0);
  const next = [...auto, ...keep.map((c) => [c.code, c.pref, c.slug])];
  writeFileSync(AUTO_PATH, `[\n${next.map((r) => `  ${JSON.stringify(r)}`).join(',\n')}\n]\n`);
  summary(`### ページを作る街\n- 足した ${keep.length}（人口${min.toLocaleString('ja-JP')}人以上）\n- ${line}\n`);
}
