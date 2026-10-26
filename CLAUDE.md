# まちの社会科 — Claude 向けの決まり

市区町村の数字（e-Stat の国勢調査など）と、家の備え（備蓄量の計算・チェックリスト・品目）をつなぐ静的サイト（https://machi-shakaika.com、2026-10-22 公開）。
運営はしょーくん。しょーくんはコードを書かず、ターミナルも使わず、スマホで確認する。開発・運用は Claude が担当する。
設計の決定版はプロジェクト資料 `claude/bousai-estat-tougou-plan.md`（ここと食いちがったら、そちらが正）。共通ルールは `claude/site-principles.md`、台帳は `claude/site-registry.md`。

## サイト作りの方針（迷ったら上から順に）
- 前提：数字が正しい（出典と時点を必ず出す）・軽くて速い・利用者のデータを集めない・むだな通信をしない・SEO。公開の前に高速化・デバッグ・SEO の点検
1. 直感で使いやすく、文字を少なく。大事な部分はスマホの1画面（幅390px・高さ660px）、説明は1行まで
2. AIっぽさゼロ。作る前と見せる前に、`claude/site-principles.md` の「使わないもの」とスクショを照らし合わせる
   - 使わない：絵文字、クリーム色×オレンジ、同じ丸いカードと影、色つきの四角に入れた線のアイコン、右はしの「›」「→」、グラデーションの飾り、英語の大文字の小見出し、ふわっと出る動き、キャッチコピー
   - 10/22 追加：枠やカードの左はしの色の太い帯、同じ大きさの四角いボタンを並べた切りかえ（えらんだものだけ色をぬる形も）、行の右はしの小さな「見る」「詳しく」ボタン、「準備中」「NEW」のような小さなバッジ
   - 切りかえやボタンも、見た目の芯にする「もの」の形で作る（例：小テストの選択肢に赤ペンの丸、冷蔵庫のマグネット）
3. GUIでビジュアル的に（数字は目盛り・地図・棒・人の形のマスで）
- 防災はあおらない（「今すぐ」「手遅れ」・赤と黄の警告色を使わない）。「数字で自分ごと」→ わが家の数を計算へ
- 国の刊行物・役所に見える名前と見た目にしない（e-Stat と国土地理院の規約で、加工した情報を国が作ったように見せることは禁止）
- 「ワースト」「住みにくい」と書かない。住む人を傷つける順位は作らない。避難場所の数は人口あたり・順位・街どうしのくらべに使わない
- 文章はデータの条件ごとの言い回しから作る。AIに毎回書かせない
- 検索結果での見え方（10/26 連絡 C-003）：トップの title はサイト名だけ・WebSite の構造化データ（name・url・alternateName）・全ページに og:site_name。説明文はページのデータから `fit()`（src/layout.mjs）で作り、全角80〜120文字・そのページだけの数字・値段は `priceBand()` の幅・同じ説明文を作らない（verify-dist.mjs が見張る）

## しくみ
- 依存パッケージなしの Node 22 だけ（`scripts/build.mjs`）。npm の部品を足さない
- コマンド：`npm run check`（テスト → ビルド → 全ページ点検）。PR前に必ず緑にする
- 公開：`.github/workflows/deploy.yml` が Cloudflare Pages（プロジェクト `machi-shakaika`）へ Direct Upload。Cloudflare 側のビルドは使わない（アカウント共有の月500回の枠を使わないため）
  - PR → プレビュー（PRにURLのコメント）／ main → 本番。毎朝6:17にも動く（楽天の商品をとりなおす）。本番は `dist/fingerprint.json` を本番の `/fingerprint.json` とくらべ、同じなら公開しない。毎朝の分が止まったら Issue
  - Secrets：`ESTAT_APP_ID`・`CLOUDFLARE_API_TOKEN`（Pages の編集だけ、`machi-shakaika-deploy`）・`CLOUDFLARE_ACCOUNT_ID`。値はチャット・ログ・コメント・ファイルに出さない
  - `SITE.launched`（`src/site.mjs`）が false のあいだは全ページ noindex・robots.txt は全部おことわり（AdSense の審査もこの間はできない）。pages.dev はいつも noindex
- AdSense：`SITE.adsense` に運営者ID（ca-pub-）を入れると、公開後の全ページの head にスクリプト、/ads.txt を置く。審査に向けて、空のリンク・「準備中」のページ・中身のない棚の入口を作らない。運営者情報・プライバシーポリシー（広告の Cookie の説明）・ナビを全ページに
- 流れ：ブランチ `claude/...` → PR → CI が緑・プレビューで確認 → しょーくんに知らせてから Merge。修正はまとめて少ない push で
- Claude の予約タスクは使わない。毎週の更新は GitHub Actions の `update.yml`（月曜0:07）
- 災害時モード（10/26）：しょーくんが Actions の「災害時モードの切りかえ」（`saigai.yml`）でオン／オフ → `data/mode.yml` をコミットして公開。オンのあいだは全ページの上に灰色の帯で気象庁と市区町村への案内1行（`src/mode.mjs`）、楽天の商品（取りもしない）と AdSense を外す。避難場所の数・注記はそのまま。災害を見て自動で切りかえることはしない
- このクラウドの作業場からは e-Stat と国土地理院につながらない。データは Actions が取って data/ にコミットしたものを使う

## データの決まり
- 出典はすべて `data/sources.yml`（出典台帳）。ページでは `srcName()`（layout.mjs）で 発行元<cite>「題」</cite> と出す（題は相手の言葉なので、使わない言葉の点検から外す）。ページ・計算は出典の id を指す。title はページの題そのもの（まだ確かめていないものは null。ページに出す前に確かめる）。checked は開いて確かめた日。計算に使う出典は90日を過ぎるとテストが止まる
- 備えの数字は `data/items.yml` の1か所だけ。本文・計算・チェックリスト・クイズはここから読む（数字を本文に直接書かない）。チェックリストの並びも items.yml の checklists
- ランキングは増えた街だけ（減った順・「ワースト」を作らない）
- 照らし合わせ：`data/shogo.yml` の公式の数字（堺市 802,648人など）と e-Stat の値が合わなければ公開しない
- e-Stat：クレジット表示（`ESTAT_CREDIT`、指定の文言のまま）を全ページのフッターに。数字のかたまりごとに「出典：総務省「令和7年国勢調査」を加工して作成」と調査の日・公表日。呼び出しは1秒あける（`src/lib/estat.mjs`）。使っている表の更新日だけ週1回見て、更新された表だけ取る
- 国土地理院の避難場所データ：公共データ利用規約（PDL1.0）。出典と加工の記載、取得日、ご利用上の注意（ふたつのちがい・載っていない＝無い、ではない・最新は自治体で確かめる）を出す。一覧は「開く」を押したときだけ読み込む
- 楽天（10/23 しょーくんの判断で手作りリンクから API に変更。販売終了の商品が残らないように）：商品は品目ページ（/hinmoku/<id>/ の6つ）だけ。楽天のアプリ「まちの社会科」（許可されたWebサイト machi-shakaika.com・machi-shakaika.pages.dev、楽天市場API、有効期限 2027-10-23。切れる前にアプリ一覧で延長）
  - `scripts/fetch-rakuten.mjs` がビルドの前に毎回、items.yml の shop の言葉で商品検索（レビューが多い順・買えるものだけ）→ 結果に多いジャンルのデイリーランキング → 順位・レビューでえらぶ（`src/rakuten.mjs`）。品目ごとに6件持ち、開くたびに3件を入れかえて見せる
  - 公開リポジトリなので、取ったものはコミットしない（data/rakuten/ は .gitignore）・ログに商品名を出さない・artifacts に上げない（規約 第10条9号）。本番に公開したら3日より古いデプロイを消す（`scripts/cleanup-deployments.mjs`）
  - 品目ページは AdSense なし・楽天以外へのリンクなし（出典は名前と確認日だけ。第8条4項）・フッターに楽天のクレジット（1文字も変えない）・商品の上に「PR」・リンクは rel="nofollow sponsored noopener"・画像はAPIのURLのまま。「おすすめ」「最安値」「定価」は使わない。順位は楽天のランキングの事実だけ
  - Secrets：`RAKUTEN_APPLICATION_ID`・`RAKUTEN_ACCESS_KEY`・`RAKUTEN_AFFILIATE_ID`

## ファイル
| 場所 | 中身 |
|---|---|
| `src/site.mjs` | サイト名・URL・公開前フラグ・e-Stat のクレジット文 |
| `static/` | ファビコン（A 森と川：杉と丸い木と川の線。10/23 決定）。favicon.svg はダークモードで明るい色になる。ico（16・32・48）・apple-touch-icon（180、白地）は svg から作った画像。ビルドでそのまま dist/ に置く |
| `src/art.mjs`・`static/hero-860.webp` | 専用の絵（10/26、見本の5）：トップの1枚は Canva のペンと水彩（文字は HTML、遅れ読み込みにしない）、いちばん下の街並み（dist/town.svg、遅れ読み込み）と地図の方位記号は SVG の「えんぴつの挿絵」（ゆれは決まった種から、フィルターなし） |
| `src/layout.mjs` | ページの外側（head・ヘッダー・ナビ・フッター）と共通の部品。見た目は「G 森と川」（10/22 決定）：木の帯のふち・明朝の見出しに小さな木の印・森の緑と川の青・えらんだものに朱の印・「この街の備え」は川の線で区切る |
| `src/stats.mjs` | 割合・全国の中の位置・県内順位・人口が近い街・特徴の1行（データの条件ごとの言い回し）・備えの知識へのつなぎ |
| `src/calc.mjs` | 備蓄量の計算の部品（items.yml から。?n=1&d=7 で人数と日数を入れて開ける） |
| `src/rakuten.mjs`・`scripts/fetch-rakuten.mjs` | 楽天市場の商品検索・ランキングの呼び方とえらび方、ビルドの前の取得（data/rakuten/products.json、コミットしない） |
| `src/quiz.mjs`・`src/quiz-core.mjs`・`src/pages/quiz.mjs` | クイズ（10/23）：/quiz/ の棚・どっちが多い（2択10問）・ドボンクイズ（トップ10を1つずつ、外れたらドボン。都道府県は地図、市区町村は語群30）・備えの数字クイズ（items.yml の数字、19のひな形から5問）・わたしの街クイズ（市区町村ページに作れる問題を全部、3問ずつ見せて入れかえ。街のコードから毎回同じに作る）。どっちが多い・ドボンは /quiz/machi.json（都道府県47＋全国の市区町村×くらべる数字10）を開いたときだけ読み、問題は quiz-core.mjs の関数（toString でページに入れる。外の変数を使わない）で毎回作る。出題の範囲（おまかせ・都道府県・全国・県ごと）は select、この端末におぼえる。回答は送らない・正解は赤ペンの丸・まちがいはバツ・AdSense なし（body data-ads="off"）・減り方や高齢化の題は出さない・同点や表示が同じになる問題は出さない |
| `src/pages/*.mjs` | hinmoku（品目6と一覧。楽天の商品）・top（トップ）・pref（都道府県47）・city（市区町村102）・sonae（備えの知識3本と計算のページ）・sonae-fuyu（冬の停電と寒さの備え /sonae/fuyu-teiden/。止まるもの→足すものの表、数字は items.yml の fuyu・days・gas・mizu、CSS はこのページの head だけ）・dougu（チェックリスト。品目は items.yml の checklists、チェックはブラウザの中だけ）・ranking（人口が増えた市区町村。増えた街だけ、割合は人口1万人以上）・info（このサイトについて・プライバシーポリシー） |
| `src/data.mjs` | data/*.yml を読んで形を確かめる、必要量の計算 |
| `src/lib/yaml.mjs` | このリポジトリで使う形だけの小さなYAMLの読み取り |
| `src/lib/estat.mjs` | e-Stat API の呼び出しと返ってきた形の読み取り |
| `src/lib/csv.mjs` | CSV の読み取りと文字コードの見分け |
| `src/lib/hinan.mjs` | 国土地理院の避難場所の全国CSV（hinanmap.gsi.go.jp）のURLと、市区町村ごと・災害の種類ごとの数え方 |
| `data/sources.yml`・`items.yml`・`shogo.yml` | 出典台帳・備えの数字・照らし合わせ用の公式の数字 |
| `scripts/build.mjs`・`verify-dist.mjs`・`changed.mjs` | ビルド・全ページ点検・本番とのちがい |
| `data/estat.yml` | e-Stat から取る表と項目（名前で指定）。年齢・世帯・住宅は不詳補完値の表 |
| `scripts/fetch-estat.mjs` → `data/estat/munis.json`・`meta.json` | 表の更新日を見て、変わったときだけ全市区町村の数字を取る。照らし合わせに通らなければ書きかえない |
| `scripts/fetch-hinan.mjs` → `data/hinan/counts.json`・`list/<コード>.json`・`meta.json` | 避難場所の全国CSV（ETagが変わったときか、ページを作る街の一覧が足りないときだけ作り直す）。数は全市区町村、一覧はページを作る街だけ。件数の見張り。点検は一覧がないと止まる（ローカルだけ `ALLOW_MISSING_HINAN_LIST=1` で注記に。Actions では効かない） |
| `scripts/fetch-yomi.mjs` → `data/yomi.json`・`src/yomi.mjs`・`src/lib/zip.mjs` | 市区町村さがしの読みがな（日本郵便の郵便番号データ ken_all.zip。ETag が変わったときだけ。郡を外し、政令市は区の読みの頭から）。取れなくても止めない。トップのさがすスクリプトは漢字・ひらがな・カタカナで、頭が合うものが先 |
| `src/munis.mjs`・`src/areas.mjs` | munis.json の読み書きと点検・都道府県とページを作る102の街（県庁所在地46・東京23区・政令市5・中核市28 `chukaku`。英字のURL）。中核市のうち川越・越谷・柏・松本・豊田・岡崎・豊橋は「この街の備え」の世帯の数字が出ないので作らない（10/26） |
| `src/kigen-core.mjs`・`src/pages/kigen.mjs` | 期限メモ（10/26、/dougu/kigen/）：近い順・あと何か月を目盛りで・30日以内は朱のはんこ。品目は items.yml の checklists の kigen（記号はURLに入るので変えない）。メモは localStorage と URL の # のあと（k1_ 版つき）だけで、ちがえばたずねる。.ics（30日前の朝9時）・文字の書き出し。AdSense なし（# のメモを広告に渡さない） |
| `.github/workflows/update.yml` | 毎週月曜0:07に上の3つ → 変わったら data/ をコミットして deploy.yml を呼ぶ。止まったら Issue。データの取り方を変えたPRでも動き、PRのブランチにコミットする |
