// 楽天市場の商品（品目ページ /hinmoku/ だけに出す）
// 呼び方は推しグッズ入荷手帳と同じ新方式（applicationId＋accessKey、Referer に許可されたWebサイト）
// このリポジトリは公開なので、楽天から取った情報はコミットしない・ログに出さない（楽天ウェブサービス規約 第10条9号）
//   取ったものは data/rakuten/（.gitignore）に置き、ビルドで HTML にするだけ

export const SEARCH = 'https://openapi.rakuten.co.jp/ichibams/api/IchibaItem/Search/20260701';
export const RANKING = 'https://openapi.rakuten.co.jp/ichibaranking/api/IchibaItem/Ranking/20220601';
// 楽天のアプリの「許可されたWebサイト」（machi-shakaika.com と machi-shakaika.pages.dev）
export const SITE_ORIGIN = 'https://machi-shakaika.com';
export const HEADERS = { Referer: `${SITE_ORIGIN}/`, Origin: SITE_ORIGIN };
export const PRODUCTS_PATH = 'data/rakuten/products.json';

// 1つの品目で持っておく数と、1回に見せる数（見るたびに入れかえる）
export const KEEP = 6;
export const SHOW = 3;

const ELEMENTS = ['itemName', 'itemCode', 'itemPrice', 'affiliateUrl', 'mediumImageUrls', 'shopName', 'availability', 'genreId', 'reviewCount', 'reviewAverage'];
// どの品目でも外す言葉（楽天側の NGKeyword にも渡す）
const NG_ALL = ['中古', 'ふるさと納税', '訳あり', '定期便', 'レンタル', '福袋'];

export function cleanKeys(env) {
  return {
    appId: String(env.RAKUTEN_APPLICATION_ID ?? '').trim(),
    accessKey: String(env.RAKUTEN_ACCESS_KEY ?? '').trim(),
    affiliateId: String(env.RAKUTEN_AFFILIATE_ID ?? '').trim(),
  };
}

const base = (keys) => ({ applicationId: keys.appId, accessKey: keys.accessKey, affiliateId: keys.affiliateId, formatVersion: '2' });

// 商品検索：レビューが多い順・買えるものだけ・画像あり
export function searchUrl(keys, keyword) {
  const p = new URLSearchParams({
    ...base(keys),
    keyword,
    hits: '30',
    page: '1',
    sort: '-reviewCount',
    availability: '1',
    imageFlag: '1',
    NGKeyword: NG_ALL.join(' '),
    elements: ELEMENTS.join(','),
  });
  return `${SEARCH}?${p}`;
}

// ジャンル別のデイリーランキング（売れ筋）
export function rankingUrl(keys, genreId, page = 1) {
  const p = new URLSearchParams({ ...base(keys), genreId: String(genreId), page: String(page), elements: [...ELEMENTS, 'rank'].join(',') });
  return `${RANKING}?${p}`;
}

function firstImage(it) {
  const v = Array.isArray(it.mediumImageUrls) ? it.mediumImageUrls[0] : null;
  return typeof v === 'string' ? v : (v?.imageUrl ?? '');
}

export function parseItems(json) {
  return (json?.Items ?? json?.items ?? []).map((r) => {
    const it = r.Item ?? r.item ?? r;
    return {
      code: String(it.itemCode ?? ''),
      name: String(it.itemName ?? ''),
      price: Number(it.itemPrice ?? 0),
      url: String(it.affiliateUrl ?? ''),
      img: firstImage(it),
      shop: String(it.shopName ?? ''),
      avail: it.availability == null ? 1 : Number(it.availability),
      genre: String(it.genreId ?? ''),
      reviews: Number(it.reviewCount ?? 0),
      rating: Number(it.reviewAverage ?? 0),
      rank: Number(it.rank ?? 0),
    };
  });
}

// 商品名の飾り（【送料無料】・★・絵文字など）を外して、ページに出す名前にする
export function cleanName(s) {
  const t = String(s)
    .replace(/【[^】]*】|［[^］]*］|\[[^\]]*\]|＜[^＞]*＞|<[^>]*>/g, ' ')
    .replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '')
    .replace(/[★☆◆◇■□●○◎※♪♡♥！!]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  return t || String(s).replace(/[\p{Extended_Pictographic}\u{FE0F}\u{200D}]/gu, '').trim();
}

// 品目ごとの条件に合うか（商品名に must のどれか、also があればそのどれかも。ng と全体の外す言葉が入っていない）
export function fits(it, shop) {
  const n = it.name;
  if (!(it.avail === 1 && it.price > 0 && it.url.startsWith('https://') && it.img.startsWith('https://'))) return false;
  if (!(shop.must ?? []).some((w) => n.includes(w))) return false;
  if (shop.also?.length && !shop.also.some((w) => n.includes(w))) return false;
  if ([...NG_ALL, ...(shop.ng ?? [])].some((w) => n.includes(w))) return false;
  // レビューが少なすぎる・点数が低いものは出さない
  if (it.reviews < 10 || it.rating < 3.8) return false;
  return true;
}

const median = (a) => {
  const s = [...a].sort((x, y) => x - y);
  return s.length ? s[Math.floor(s.length / 2)] : 0;
};

// 候補から KEEP 件をえらぶ：ランキングに入っているもの（順位の高い順）→ レビューが多い順。
// 同じ商品は1つ、同じお店は2つまで。値段が候補の真ん中の3倍をこえるものは外す（災害のあとの値上がりなど）
export function pick(cands, shop, keep = KEEP) {
  const seen = new Set();
  const ok = [];
  for (const it of cands) {
    if (!it.code || seen.has(it.code) || !fits(it, shop)) continue;
    seen.add(it.code);
    ok.push(it);
  }
  const mid = median(ok.map((x) => x.price));
  const sorted = ok
    .filter((x) => x.price <= mid * 3)
    .sort((a, b) => (a.rank ? 0 : 1) - (b.rank ? 0 : 1) || (a.rank && b.rank ? a.rank - b.rank : 0) || b.reviews - a.reviews);
  const perShop = {};
  const out = [];
  for (const it of sorted) {
    if ((perShop[it.shop] = (perShop[it.shop] ?? 0) + 1) > 2) continue;
    out.push({ code: it.code, name: cleanName(it.name), price: it.price, url: it.url, img: it.img, shop: it.shop, reviews: it.reviews, rating: it.rating, rank: it.rank || 0 });
    if (out.length >= keep) break;
  }
  return out;
}

// 検索の結果に多いジャンル（ランキングを見るジャンル）
export function topGenres(items, n = 2) {
  const c = {};
  for (const it of items) if (it.genre) c[it.genre] = (c[it.genre] ?? 0) + 1;
  return Object.entries(c)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([g]) => g);
}
