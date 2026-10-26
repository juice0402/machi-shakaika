// 都道府県と、ページを作る市区町村
//   段階1a：県庁所在地46・東京23区・県庁所在地でない政令市5
//   第2弾：中核市（総務省の一覧、62市・令和7年4月1日現在）のうち県庁所在地でないもの。ページを作る条件（設計の決定版）を
//     みたさない7市（川越・越谷・柏・松本・豊田・岡崎・豊橋。「この街の備え」に世帯の特徴の数字がない）は入れていない
// URL は /都道府県/市区町村/（同じ名前の市があるので都道府県の下に置く）。英字は一度公開したら変えない

export const PREFS = [
  ['hokkaido', '北海道'], ['aomori', '青森県'], ['iwate', '岩手県'], ['miyagi', '宮城県'], ['akita', '秋田県'],
  ['yamagata', '山形県'], ['fukushima', '福島県'], ['ibaraki', '茨城県'], ['tochigi', '栃木県'], ['gunma', '群馬県'],
  ['saitama', '埼玉県'], ['chiba', '千葉県'], ['tokyo', '東京都'], ['kanagawa', '神奈川県'], ['niigata', '新潟県'],
  ['toyama', '富山県'], ['ishikawa', '石川県'], ['fukui', '福井県'], ['yamanashi', '山梨県'], ['nagano', '長野県'],
  ['gifu', '岐阜県'], ['shizuoka', '静岡県'], ['aichi', '愛知県'], ['mie', '三重県'], ['shiga', '滋賀県'],
  ['kyoto', '京都府'], ['osaka', '大阪府'], ['hyogo', '兵庫県'], ['nara', '奈良県'], ['wakayama', '和歌山県'],
  ['tottori', '鳥取県'], ['shimane', '島根県'], ['okayama', '岡山県'], ['hiroshima', '広島県'], ['yamaguchi', '山口県'],
  ['tokushima', '徳島県'], ['kagawa', '香川県'], ['ehime', '愛媛県'], ['kochi', '高知県'], ['fukuoka', '福岡県'],
  ['saga', '佐賀県'], ['nagasaki', '長崎県'], ['kumamoto', '熊本県'], ['oita', '大分県'], ['miyazaki', '宮崎県'],
  ['kagoshima', '鹿児島県'], ['okinawa', '沖縄県'],
].map(([slug, name], i) => ({ slug, name, code: String(i + 1).padStart(2, '0') }));

// [都道府県の英字, 名前（e-Stat の地域名と同じ）, 英字, 種類]
// 種類：kencho 県庁所在地／seirei 政令市（県庁所在地でない）／ku 東京23区／chukaku 中核市（県庁所在地でない）
export const CITIES = [
  ['hokkaido', '札幌市', 'sapporo', 'kencho'], ['aomori', '青森市', 'aomori', 'kencho'], ['iwate', '盛岡市', 'morioka', 'kencho'],
  ['miyagi', '仙台市', 'sendai', 'kencho'], ['akita', '秋田市', 'akita', 'kencho'], ['yamagata', '山形市', 'yamagata', 'kencho'],
  ['fukushima', '福島市', 'fukushima', 'kencho'], ['ibaraki', '水戸市', 'mito', 'kencho'], ['tochigi', '宇都宮市', 'utsunomiya', 'kencho'],
  ['gunma', '前橋市', 'maebashi', 'kencho'], ['saitama', 'さいたま市', 'saitama', 'kencho'], ['chiba', '千葉市', 'chiba', 'kencho'],
  ['tokyo', '千代田区', 'chiyoda', 'ku'], ['tokyo', '中央区', 'chuo', 'ku'], ['tokyo', '港区', 'minato', 'ku'],
  ['tokyo', '新宿区', 'shinjuku', 'ku'], ['tokyo', '文京区', 'bunkyo', 'ku'], ['tokyo', '台東区', 'taito', 'ku'],
  ['tokyo', '墨田区', 'sumida', 'ku'], ['tokyo', '江東区', 'koto', 'ku'], ['tokyo', '品川区', 'shinagawa', 'ku'],
  ['tokyo', '目黒区', 'meguro', 'ku'], ['tokyo', '大田区', 'ota', 'ku'], ['tokyo', '世田谷区', 'setagaya', 'ku'],
  ['tokyo', '渋谷区', 'shibuya', 'ku'], ['tokyo', '中野区', 'nakano', 'ku'], ['tokyo', '杉並区', 'suginami', 'ku'],
  ['tokyo', '豊島区', 'toshima', 'ku'], ['tokyo', '北区', 'kita', 'ku'], ['tokyo', '荒川区', 'arakawa', 'ku'],
  ['tokyo', '板橋区', 'itabashi', 'ku'], ['tokyo', '練馬区', 'nerima', 'ku'], ['tokyo', '足立区', 'adachi', 'ku'],
  ['tokyo', '葛飾区', 'katsushika', 'ku'], ['tokyo', '江戸川区', 'edogawa', 'ku'],
  ['kanagawa', '横浜市', 'yokohama', 'kencho'], ['kanagawa', '川崎市', 'kawasaki', 'seirei'], ['kanagawa', '相模原市', 'sagamihara', 'seirei'],
  ['niigata', '新潟市', 'niigata', 'kencho'], ['toyama', '富山市', 'toyama', 'kencho'], ['ishikawa', '金沢市', 'kanazawa', 'kencho'],
  ['fukui', '福井市', 'fukui', 'kencho'], ['yamanashi', '甲府市', 'kofu', 'kencho'], ['nagano', '長野市', 'nagano', 'kencho'],
  ['gifu', '岐阜市', 'gifu', 'kencho'], ['shizuoka', '静岡市', 'shizuoka', 'kencho'], ['shizuoka', '浜松市', 'hamamatsu', 'seirei'],
  ['aichi', '名古屋市', 'nagoya', 'kencho'], ['mie', '津市', 'tsu', 'kencho'], ['shiga', '大津市', 'otsu', 'kencho'],
  ['kyoto', '京都市', 'kyoto', 'kencho'], ['osaka', '大阪市', 'osaka', 'kencho'], ['osaka', '堺市', 'sakai', 'seirei'],
  ['hyogo', '神戸市', 'kobe', 'kencho'], ['nara', '奈良市', 'nara', 'kencho'], ['wakayama', '和歌山市', 'wakayama', 'kencho'],
  ['tottori', '鳥取市', 'tottori', 'kencho'], ['shimane', '松江市', 'matsue', 'kencho'], ['okayama', '岡山市', 'okayama', 'kencho'],
  ['hiroshima', '広島市', 'hiroshima', 'kencho'], ['yamaguchi', '山口市', 'yamaguchi', 'kencho'], ['tokushima', '徳島市', 'tokushima', 'kencho'],
  ['kagawa', '高松市', 'takamatsu', 'kencho'], ['ehime', '松山市', 'matsuyama', 'kencho'], ['kochi', '高知市', 'kochi', 'kencho'],
  ['fukuoka', '福岡市', 'fukuoka', 'kencho'], ['fukuoka', '北九州市', 'kitakyushu', 'seirei'], ['saga', '佐賀市', 'saga', 'kencho'],
  ['nagasaki', '長崎市', 'nagasaki', 'kencho'], ['kumamoto', '熊本市', 'kumamoto', 'kencho'], ['oita', '大分市', 'oita', 'kencho'],
  ['miyazaki', '宮崎市', 'miyazaki', 'kencho'], ['kagoshima', '鹿児島市', 'kagoshima', 'kencho'], ['okinawa', '那覇市', 'naha', 'kencho'],
  // 中核市（第2弾）
  ['hokkaido', '旭川市', 'asahikawa', 'chukaku'], ['hokkaido', '函館市', 'hakodate', 'chukaku'], ['aomori', '八戸市', 'hachinohe', 'chukaku'],
  ['fukushima', 'いわき市', 'iwaki', 'chukaku'], ['fukushima', '郡山市', 'koriyama', 'chukaku'], ['gunma', '高崎市', 'takasaki', 'chukaku'],
  ['saitama', '川口市', 'kawaguchi', 'chukaku'], ['chiba', '船橋市', 'funabashi', 'chukaku'], ['tokyo', '八王子市', 'hachioji', 'chukaku'],
  ['kanagawa', '横須賀市', 'yokosuka', 'chukaku'], ['aichi', '一宮市', 'ichinomiya', 'chukaku'], ['osaka', '豊中市', 'toyonaka', 'chukaku'],
  ['osaka', '吹田市', 'suita', 'chukaku'], ['osaka', '高槻市', 'takatsuki', 'chukaku'], ['osaka', '枚方市', 'hirakata', 'chukaku'],
  ['osaka', '八尾市', 'yao', 'chukaku'], ['osaka', '寝屋川市', 'neyagawa', 'chukaku'], ['osaka', '東大阪市', 'higashiosaka', 'chukaku'],
  ['hyogo', '姫路市', 'himeji', 'chukaku'], ['hyogo', '尼崎市', 'amagasaki', 'chukaku'], ['hyogo', '明石市', 'akashi', 'chukaku'],
  ['hyogo', '西宮市', 'nishinomiya', 'chukaku'], ['okayama', '倉敷市', 'kurashiki', 'chukaku'], ['hiroshima', '呉市', 'kure', 'chukaku'],
  ['hiroshima', '福山市', 'fukuyama', 'chukaku'], ['yamaguchi', '下関市', 'shimonoseki', 'chukaku'], ['fukuoka', '久留米市', 'kurume', 'chukaku'],
  ['nagasaki', '佐世保市', 'sasebo', 'chukaku'],
].map(([pref, name, slug, kind]) => ({ pref, name, slug, kind }));

export const prefBySlug = new Map(PREFS.map((p) => [p.slug, p]));
export const prefByCode = new Map(PREFS.map((p) => [p.code, p]));

// e-Stat の地域の一覧（munis.json の areas）から、CITIES の市区町村コードを引く
// 見つからない・2つ以上あるときはエラー（合併などで名前が変わったら気づけるように）
export function resolveCities(areas) {
  const out = [];
  const errors = [];
  for (const c of CITIES) {
    const pc = prefBySlug.get(c.pref).code;
    const hit = Object.entries(areas).filter(([code, a]) => code.startsWith(pc) && a.level === '4' && a.name === c.name);
    if (hit.length !== 1) errors.push(`${c.pref} ${c.name}：e-Stat の地域が ${hit.length} 件`);
    else out.push({ ...c, code: hit[0][0] });
  }
  return { cities: out, errors };
}
