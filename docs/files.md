# ファイルの中身（CLAUDE.md から移した。さわるファイルの行だけ読む）

| 場所 | 中身 |
|---|---|
| `src/site.mjs` | サイト名・URL・公開前フラグ・e-Stat のクレジット文 |
| `static/` | ファビコン（A 森と川：杉と丸い木と川の線。10/23 決定）。favicon.svg はダークモードで明るい色になる。ico（16・32・48）・apple-touch-icon（180、白地）は svg から作った画像。ビルドでそのまま dist/ に置く |
| `src/art.mjs`・`static/hero-860.webp` | 専用の絵（10/26、見本の5）：トップの1枚は Canva のペンと水彩（文字は HTML、遅れ読み込みにしない）、いちばん下の街並み（dist/town.svg、遅れ読み込み）と地図の方位記号は SVG の「えんぴつの挿絵」（ゆれは決まった種から、フィルターなし） |
| `src/japan-map.mjs`・`japan-map-data.mjs`・`tools/map/` | 都道府県の地図（10/27 案1「地図そのもの」、#21）：トップとドボンクイズで共通。形は Natural Earth 10m（パブリックドメイン。北方領土は disputed_areas の Kuril Is. を北海道に、東京と鹿児島の南の島は入れない）。作業場で geojson を MAPWORK に置き `python3 -I tools/map/gen.py` → `python3 -I tools/map/render.py --emit src/japan-map-data.mjs`（CI では作らない）。県名の置き場・4色のぬり分けもこのとき決める。クイズは県名の位置に赤ペンの丸・バツ |
| `static/og.jpg`・`og-ranking-jinko.jpg`・`tools/og/` | 共有画像（10/27 しょーくん：サイトは案B、人口が増えた市区町村は案A。X にも貼る）。作業場で `python3 tools/og/render.py tools/og/site.html static/og.jpg 1200 630`・`node tools/og/ranking-jinko.mjs` で作る（CI では作らない）。ランキングの画像は数字のしるし `data/og-ranking-jinko.json` が今のデータと合うときだけ使い、合わなければビルドの注記を出してサイトの画像にもどる |
| `src/layout.mjs` | ページの外側（head・ヘッダー・ナビ・フッター）と共通の部品。見た目は「G 森と川」（10/22 決定）：木の帯のふち・明朝の見出しに小さな木の印・森の緑と川の青・えらんだものに朱の印・「この街の備え」は川の線で区切る |
| `src/stats.mjs` | 割合・全国の中の位置・県内順位・人口が近い街・特徴の1行（データの条件ごとの言い回し）・備えの知識へのつなぎ |
| `src/calc.mjs` | 備蓄量の計算の部品（items.yml から。?n=1&d=7 で人数と日数を入れて開ける） |
| `src/rakuten.mjs`・`scripts/fetch-rakuten.mjs` | 楽天市場の商品検索・ランキングの呼び方とえらび方、ビルドの前の取得（data/rakuten/products.json、コミットしない） |
| `src/quiz.mjs`・`src/quiz-core.mjs`・`src/pages/quiz.mjs` | クイズ（10/23）：/quiz/ の棚・どっちが多い（2択10問）・ドボンクイズ（トップ10を1つずつ、外れたらドボン。都道府県は地図、市区町村は語群30）・備えの数字クイズ（items.yml の数字、19のひな形から5問）・わたしの街クイズ（市区町村ページに作れる問題を全部、3問ずつ見せて入れかえ。街のコードから毎回同じに作る）。どっちが多い・ドボンは /quiz/machi.json（都道府県47＋全国の市区町村×くらべる数字10）を開いたときだけ読み、問題は quiz-core.mjs の関数（toString でページに入れる。外の変数を使わない）で毎回作る。出題の範囲（おまかせ・都道府県・全国・県ごと）は select、この端末におぼえる。回答は送らない・正解は赤ペンの丸・まちがいはバツ・AdSense なし（body data-ads="off"）・減り方や高齢化の題は出さない・同点や表示が同じになる問題は出さない |
| `src/pages/*.mjs` | hinmoku（品目6と一覧。楽天の商品）・top（トップ）・pref（都道府県47）・city（市区町村103）・sonae（備えの知識3本と計算のページ）・sonae-fuyu（冬の停電と寒さの備え /sonae/fuyu-teiden/。止まるもの→足すものの表、数字は items.yml の fuyu・days・gas・mizu、CSS はこのページの head だけ）・sonae-yomimono（読みもの5本 /sonae/jishin/・zaitaku-hinan/・akachan-koureisha/・hitorigurashi/・mansion/。作りは冬の停電と同じ表、出典は items.yml の jishin・zaitaku・akachan・hitori・mansion。市区町村ページの共同住宅の行は mansion、ひとり暮らしの行は hitorigurashi へ。発生中の行動・家にいてよいかの判断は書かない。ペットは環境省の正式版待ち）・sonae-soto（家の外の備え2本 /sonae/kuruma-taisetsu/・kitaku-konnan/。同じ表と末尾、前に積むもの・置くものだけ。車は数字を出さない、職場は items.yml の kitaku。立ち往生の動き・帰るかとどまるかは公式へ1行）・dougu（チェックリスト。品目は items.yml の checklists、チェックはブラウザの中だけ）・ranking（人口が増えた市区町村。増えた街だけ、割合は人口1万人以上）・info（このサイトについて・プライバシーポリシー） |
| `src/data.mjs` | data/*.yml を読んで形を確かめる、必要量の計算 |
| `src/lib/yaml.mjs` | このリポジトリで使う形だけの小さなYAMLの読み取り |
| `src/lib/estat.mjs` | e-Stat API の呼び出しと返ってきた形の読み取り |
| `src/lib/csv.mjs` | CSV の読み取りと文字コードの見分け |
| `src/lib/hinan.mjs` | 国土地理院の避難場所の全国CSV（hinanmap.gsi.go.jp）のURLと、市区町村ごと・災害の種類ごとの数え方 |
| `data/sources.yml`・`items.yml`・`shogo.yml` | 出典台帳・備えの数字・照らし合わせ用の公式の数字 |
| `data/bichiku.yml` | 自治体の備蓄の公表ページ（10/26 に57の街、10/28 に68の街）。市区町村ページの「この街の備え」に1行とリンク。ない街は行ごと出さない。年1回の公表なので題が変わることがある |
| `scripts/check-links.mjs`・`src/lib/links.mjs`・`linkcheck.mjs` | リンクの点検の本体・集め方・開き方（同じホストは2秒あけ、HEAD→GET、1回だけやり直し） |
| `scripts/build.mjs`・`verify-dist.mjs`・`changed.mjs` | ビルド・全ページ点検・本番とのちがい |
| `data/estat.yml` | e-Stat から取る表と項目（名前で指定）。年齢・世帯・住宅は不詳補完値の表 |
| `scripts/fetch-estat.mjs` → `data/estat/munis.json`・`meta.json` | 表の更新日を見て、変わったときだけ全市区町村の数字を取る。照らし合わせに通らなければ書きかえない |
| `scripts/fetch-hinan.mjs` → `data/hinan/counts.json`・`list/<コード>.json`・`meta.json` | 避難場所の全国CSV（ETagが変わったときか、ページを作る街の一覧が足りないときだけ作り直す）。数は全市区町村、一覧はページを作る街だけ。件数の見張り。点検は一覧がないと止まる（ローカルだけ `ALLOW_MISSING_HINAN_LIST=1` で注記に。Actions では効かない） |
| `scripts/fetch-yomi.mjs` → `data/yomi.json`・`src/yomi.mjs`・`src/lib/zip.mjs` | 市区町村さがしの読みがな（日本郵便の郵便番号データ ken_all.zip。ETag が変わったときだけ。郡を外し、政令市は区の読みの頭から）。取れなくても止めない。トップのさがすスクリプトは漢字・ひらがな・カタカナで、頭が合うものが先 |
| `src/munis.mjs`・`src/areas.mjs` | munis.json の読み書きと点検・都道府県とページを作る103の街（県庁所在地46・東京23区・政令市5・中核市29 `chukaku`。英字のURL）。ページを作る条件5（10/27）：「この街の備え」に世帯の特徴が1つ以上（全国か県とはっきり違う。`sonaeLinks()`、tests/sonae-links.test.mjs が見張る）。中核市のうち川越・越谷・柏・豊田・岡崎・豊橋は満たさないので作らない |
| `src/kigen-core.mjs`・`src/pages/kigen.mjs` | 期限メモ（10/26、/dougu/kigen/）：近い順・あと何か月を目盛りで・30日以内は朱のはんこ。品目は items.yml の checklists の kigen（記号はURLに入るので変えない）。メモは localStorage だけ。URL（# のあと、k1_ 版つき）は「URLを送る」で作り、開いたらアドレス欄から消してから読む（ちがえばたずねる）。.ics（30日前の朝9時）・文字の書き出し。AdSense は # を消したあとに読む（`adsLate`、body の data-ads-late。しょーくん 10/26「下の方にさりげなく」） |
| `src/machi-core.mjs`・`src/machi-tools.mjs`・`src/pages/kurabe.mjs` | 街の道具（10/27 #17）：似てる街さがし /niteru/（人口（対数）・15歳未満・65歳以上・5年の増減・ひとり暮らし・共同住宅を全国の散らばりでならし、同じ重みで近い3つ。人口1万人以上、政令市の区はのぞく）・2つの街をくらべる /kurabe/（差だけ。割合は5%以上か1.3倍以上、増減は2%以上、人口は1.3倍以上。「ポイント」は使わない言葉なので「%高い」）・100人の村（市区町村ページ。5つに分けて最大剰余法で100、方眼紙のマスにえんぴつの塗り、人の形は使わない）。数字は /kurabe/kazu.json（100KBまで、えらぶ欄にさわったときだけ読む。読みがなは /search.json から）。市区町村ページの似ている街もこの JSON から作る（ブラウザと同じ答え） |
| `src/pages/print.mjs` | 冷蔵庫に貼る紙（10/27、/dougu/print/、案1）：A4縦1枚。家に置く備え＝丸と期限の欄（kigen のある品目）・持ち出す袋＝丸（かっこの中は小さい2行目）。挿絵なし、2つの表の行は同じ高さ。画面は紙を縮めて見せ、印刷は紙だけ（@media print）。AdSense なし |
| `.github/workflows/update.yml` | 毎週月曜0:07に上の3つ → 変わったら data/ をコミットして deploy.yml を呼ぶ。止まったら Issue。データの取り方を変えたPRでも動き、PRのブランチにコミットする |
