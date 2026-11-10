// 都道府県と、ページを作る市区町村
//   段階1a：県庁所在地46・東京23区・県庁所在地でない政令市5
//   第2弾：中核市（総務省の一覧、62市・令和7年4月1日現在）のうち県庁所在地でないもの。ページを作る条件（設計の決定版）を
//     みたさない6市（川越・越谷・柏・豊田・岡崎・豊橋。「この街の備え」に世帯の特徴の数字が全国とも県ともはっきり違わない）は入れていない
//     松本は10/27 に条件5を「全国か県とはっきり違う」にしたので足した
//   段階2の前倒し（11/4 しょーくん：案A）：人口10万人以上の市（令和7年国勢調査）のうち、上にない市で条件5・6をみたす146市。
//     みたさない29市（柏・豊田・岡崎・豊橋・川越・所沢・越谷・春日井・茅ヶ崎・太田など）・町村・政令市の区（避難場所の数が市でまとまる）は入れない。
//     5万人以上（+193・442街）は、11/4 のためしで50ページが「どの街も同じ文」65%をこえた。#85 で文を足し、ためしで最大61%・こえる0（AdSense の審査に通ってから考える）
//     英字は読みがな（data/yomi.json）からヘボン式・長音は書かない・末尾の「し」は外す（上の103もこの規則で同じになる）
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
// 種類：kencho 県庁所在地／seirei 政令市（県庁所在地でない）／ku 東京23区／chukaku 中核市（県庁所在地でない）／shi 人口10万人以上の市（上のどれでもない）
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
  ['kanagawa', '横須賀市', 'yokosuka', 'chukaku'], ['nagano', '松本市', 'matsumoto', 'chukaku'], ['aichi', '一宮市', 'ichinomiya', 'chukaku'], ['osaka', '豊中市', 'toyonaka', 'chukaku'],
  ['osaka', '吹田市', 'suita', 'chukaku'], ['osaka', '高槻市', 'takatsuki', 'chukaku'], ['osaka', '枚方市', 'hirakata', 'chukaku'],
  ['osaka', '八尾市', 'yao', 'chukaku'], ['osaka', '寝屋川市', 'neyagawa', 'chukaku'], ['osaka', '東大阪市', 'higashiosaka', 'chukaku'],
  ['hyogo', '姫路市', 'himeji', 'chukaku'], ['hyogo', '尼崎市', 'amagasaki', 'chukaku'], ['hyogo', '明石市', 'akashi', 'chukaku'],
  ['hyogo', '西宮市', 'nishinomiya', 'chukaku'], ['okayama', '倉敷市', 'kurashiki', 'chukaku'], ['hiroshima', '呉市', 'kure', 'chukaku'],
  ['hiroshima', '福山市', 'fukuyama', 'chukaku'], ['yamaguchi', '下関市', 'shimonoseki', 'chukaku'], ['fukuoka', '久留米市', 'kurume', 'chukaku'],
  ['nagasaki', '佐世保市', 'sasebo', 'chukaku'],
  // 人口10万人以上の市（段階2の前倒し・11/4）
  ['hokkaido', '小樽市', 'otaru', 'shi'], ['hokkaido', '釧路市', 'kushiro', 'shi'], ['hokkaido', '帯広市', 'obihiro', 'shi'],
  ['hokkaido', '北見市', 'kitami', 'shi'], ['hokkaido', '苫小牧市', 'tomakomai', 'shi'], ['hokkaido', '江別市', 'ebetsu', 'shi'],
  ['aomori', '弘前市', 'hirosaki', 'shi'], ['iwate', '一関市', 'ichinoseki', 'shi'], ['iwate', '奥州市', 'oshu', 'shi'],
  ['miyagi', '石巻市', 'ishinomaki', 'shi'], ['miyagi', '大崎市', 'osaki', 'shi'], ['yamagata', '鶴岡市', 'tsuruoka', 'shi'],
  ['fukushima', '会津若松市', 'aizuwakamatsu', 'shi'], ['ibaraki', '日立市', 'hitachi', 'shi'], ['ibaraki', '土浦市', 'tsuchiura', 'shi'],
  ['ibaraki', '古河市', 'koga', 'shi'], ['ibaraki', '取手市', 'toride', 'shi'], ['ibaraki', 'つくば市', 'tsukuba', 'shi'],
  ['tochigi', '足利市', 'ashikaga', 'shi'], ['tochigi', '栃木市', 'tochigi', 'shi'], ['tochigi', '佐野市', 'sano', 'shi'],
  ['tochigi', '那須塩原市', 'nasushiobara', 'shi'], ['saitama', '熊谷市', 'kumagaya', 'shi'], ['saitama', '加須市', 'kazo', 'shi'],
  ['saitama', '春日部市', 'kasukabe', 'shi'], ['saitama', '狭山市', 'sayama', 'shi'], ['saitama', '鴻巣市', 'konosu', 'shi'],
  ['saitama', '深谷市', 'fukaya', 'shi'], ['saitama', '上尾市', 'ageo', 'shi'], ['saitama', '草加市', 'soka', 'shi'],
  ['saitama', '戸田市', 'toda', 'shi'], ['saitama', '入間市', 'iruma', 'shi'], ['saitama', '朝霞市', 'asaka', 'shi'],
  ['saitama', '久喜市', 'kuki', 'shi'], ['saitama', '富士見市', 'fujimi', 'shi'], ['saitama', '三郷市', 'misato', 'shi'],
  ['chiba', '市川市', 'ichikawa', 'shi'], ['chiba', '松戸市', 'matsudo', 'shi'], ['chiba', '野田市', 'noda', 'shi'],
  ['chiba', '成田市', 'narita', 'shi'], ['chiba', '佐倉市', 'sakura', 'shi'], ['chiba', '習志野市', 'narashino', 'shi'],
  ['chiba', '市原市', 'ichihara', 'shi'], ['chiba', '八千代市', 'yachiyo', 'shi'], ['chiba', '我孫子市', 'abiko', 'shi'],
  ['chiba', '鎌ケ谷市', 'kamagaya', 'shi'], ['chiba', '浦安市', 'urayasu', 'shi'], ['chiba', '印西市', 'inzai', 'shi'],
  ['tokyo', '立川市', 'tachikawa', 'shi'], ['tokyo', '武蔵野市', 'musashino', 'shi'], ['tokyo', '三鷹市', 'mitaka', 'shi'],
  ['tokyo', '青梅市', 'ome', 'shi'], ['tokyo', '府中市', 'fuchu', 'shi'], ['tokyo', '昭島市', 'akishima', 'shi'],
  ['tokyo', '調布市', 'chofu', 'shi'], ['tokyo', '町田市', 'machida', 'shi'], ['tokyo', '小金井市', 'koganei', 'shi'],
  ['tokyo', '小平市', 'kodaira', 'shi'], ['tokyo', '日野市', 'hino', 'shi'], ['tokyo', '東村山市', 'higashimurayama', 'shi'],
  ['tokyo', '国分寺市', 'kokubunji', 'shi'], ['tokyo', '東久留米市', 'higashikurume', 'shi'], ['tokyo', '多摩市', 'tama', 'shi'],
  ['tokyo', '西東京市', 'nishitokyo', 'shi'], ['kanagawa', '平塚市', 'hiratsuka', 'shi'], ['kanagawa', '鎌倉市', 'kamakura', 'shi'],
  ['kanagawa', '藤沢市', 'fujisawa', 'shi'], ['kanagawa', '小田原市', 'odawara', 'shi'], ['kanagawa', '秦野市', 'hadano', 'shi'],
  ['kanagawa', '厚木市', 'atsugi', 'shi'], ['kanagawa', '大和市', 'yamato', 'shi'], ['kanagawa', '海老名市', 'ebina', 'shi'],
  ['kanagawa', '座間市', 'zama', 'shi'], ['niigata', '長岡市', 'nagaoka', 'shi'], ['niigata', '上越市', 'joetsu', 'shi'],
  ['toyama', '高岡市', 'takaoka', 'shi'], ['ishikawa', '小松市', 'komatsu', 'shi'], ['ishikawa', '白山市', 'hakusan', 'shi'],
  ['nagano', '上田市', 'ueda', 'shi'], ['gifu', '大垣市', 'ogaki', 'shi'], ['gifu', '多治見市', 'tajimi', 'shi'],
  ['gifu', '各務原市', 'kakamigahara', 'shi'], ['shizuoka', '沼津市', 'numazu', 'shi'], ['shizuoka', '三島市', 'mishima', 'shi'],
  ['shizuoka', '富士宮市', 'fujinomiya', 'shi'], ['shizuoka', '富士市', 'fuji', 'shi'], ['shizuoka', '磐田市', 'iwata', 'shi'],
  ['shizuoka', '焼津市', 'yaizu', 'shi'], ['shizuoka', '掛川市', 'kakegawa', 'shi'], ['shizuoka', '藤枝市', 'fujieda', 'shi'],
  ['aichi', '瀬戸市', 'seto', 'shi'], ['aichi', '豊川市', 'toyokawa', 'shi'], ['aichi', '西尾市', 'nishio', 'shi'],
  ['aichi', '稲沢市', 'inazawa', 'shi'], ['mie', '四日市市', 'yokkaichi', 'shi'], ['mie', '伊勢市', 'ise', 'shi'],
  ['mie', '松阪市', 'matsusaka', 'shi'], ['mie', '桑名市', 'kuwana', 'shi'], ['shiga', '彦根市', 'hikone', 'shi'],
  ['shiga', '長浜市', 'nagahama', 'shi'], ['shiga', '草津市', 'kusatsu', 'shi'], ['shiga', '東近江市', 'higashiomi', 'shi'],
  ['kyoto', '宇治市', 'uji', 'shi'], ['osaka', '岸和田市', 'kishiwada', 'shi'], ['osaka', '池田市', 'ikeda', 'shi'],
  ['osaka', '守口市', 'moriguchi', 'shi'], ['osaka', '茨木市', 'ibaraki', 'shi'], ['osaka', '富田林市', 'tondabayashi', 'shi'],
  ['osaka', '松原市', 'matsubara', 'shi'], ['osaka', '和泉市', 'izumi', 'shi'], ['osaka', '箕面市', 'mino', 'shi'],
  ['osaka', '羽曳野市', 'habikino', 'shi'], ['osaka', '門真市', 'kadoma', 'shi'], ['hyogo', '伊丹市', 'itami', 'shi'],
  ['hyogo', '加古川市', 'kakogawa', 'shi'], ['hyogo', '宝塚市', 'takarazuka', 'shi'], ['hyogo', '川西市', 'kawanishi', 'shi'],
  ['hyogo', '三田市', 'sanda', 'shi'], ['nara', '橿原市', 'kashihara', 'shi'], ['nara', '生駒市', 'ikoma', 'shi'],
  ['tottori', '米子市', 'yonago', 'shi'], ['shimane', '出雲市', 'izumo', 'shi'], ['hiroshima', '尾道市', 'onomichi', 'shi'],
  ['hiroshima', '東広島市', 'higashihiroshima', 'shi'], ['hiroshima', '廿日市市', 'hatsukaichi', 'shi'], ['yamaguchi', '宇部市', 'ube', 'shi'],
  ['yamaguchi', '防府市', 'hofu', 'shi'], ['yamaguchi', '岩国市', 'iwakuni', 'shi'], ['yamaguchi', '周南市', 'shunan', 'shi'],
  ['kagawa', '丸亀市', 'marugame', 'shi'], ['ehime', '今治市', 'imabari', 'shi'], ['ehime', '新居浜市', 'niihama', 'shi'],
  ['fukuoka', '大牟田市', 'omuta', 'shi'], ['fukuoka', '飯塚市', 'iizuka', 'shi'], ['fukuoka', '春日市', 'kasuga', 'shi'],
  ['fukuoka', '大野城市', 'onojo', 'shi'], ['fukuoka', '糸島市', 'itoshima', 'shi'], ['saga', '唐津市', 'karatsu', 'shi'],
  ['nagasaki', '諫早市', 'isahaya', 'shi'], ['kumamoto', '八代市', 'yatsushiro', 'shi'], ['oita', '別府市', 'beppu', 'shi'],
  ['miyazaki', '都城市', 'miyakonojo', 'shi'], ['miyazaki', '延岡市', 'nobeoka', 'shi'], ['okinawa', '宜野湾市', 'ginowan', 'shi'],
  ['okinawa', '浦添市', 'urasoe', 'shi'], ['okinawa', '沖縄市', 'okinawa', 'shi'],
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
