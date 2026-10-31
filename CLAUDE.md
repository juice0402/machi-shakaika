# まちの社会科 — Claude 向けの決まり

市区町村の数字（e-Stat の国勢調査など）と、家の備え（備蓄量の計算・チェックリスト・品目）をつなぐ静的サイト（https://machi-shakaika.com）。
運営はしょーくん。しょーくんはコードを書かず、ターミナルも使わず、スマホで確認する。開発・運用は Claude が担当する。
設計の決定版はプロジェクト資料 `claude/bousai-estat-tougou-plan.md`（ここと食いちがったら、そちらが正）。共通ルールは `claude/site-principles.md`、台帳は `claude/site-registry.md`。
くわしいことは `docs/shikumi.md`（しくみ・経緯）と `docs/files.md`（ファイルごとの中身）。全部は読まず、さわる所の節・行だけ読む。

## サイト作りの方針（迷ったら上から順に）
- 前提：数字が正しい（出典と時点を必ず出す）・軽くて速い・利用者のデータを集めない・むだな通信をしない・SEO。公開の前に高速化・デバッグ・SEO の点検
1. 直感で使いやすく、文字を少なく。大事な部分はスマホの1画面（幅390px・高さ660px）、説明は1行まで
2. AIっぽさゼロ。作る前と見せる前に、`claude/site-principles.md` の「使わないもの」とスクショを照らし合わせる
   - 使わない：絵文字、クリーム色×オレンジ、同じ丸いカードと影、色つきの四角に入れた線のアイコン、右はしの「›」「→」、グラデーションの飾り、英語の大文字の小見出し、ふわっと出る動き、キャッチコピー、左はしの色の帯、同じ四角いボタンを並べた切りかえ、行の右はしの小さな「見る」、「準備中」「NEW」のバッジ
3. GUIでビジュアル的に（数字は目盛り・地図・棒・人の形のマスで）
- 防災はあおらない（「今すぐ」「手遅れ」・赤と黄の警告色を使わない）。「数字で自分ごと」→ わが家の数を計算へ
- 国の刊行物・役所に見える名前と見た目にしない（e-Stat と国土地理院の規約）
- 「ワースト」「住みにくい」と書かない。住む人を傷つける順位は作らない。避難場所の数は人口あたり・順位・街どうしのくらべに使わない
- 文章はデータの条件ごとの言い回しから作る。AIに毎回書かせない
- 説明文（meta description）はページのデータから `fit()` で作る。全角80〜120文字・そのページだけの数字・同じ説明文を作らない（verify-dist.mjs が見張る）
- 1画面めの下に、そのページにしかない中身（しくみ・例・早見表・問いへの答え）。404 以外は本文600字以上、市区町村は「どの街も同じ文」65%以下（今より増やさない。verify-dist が見張る。測り方は `scripts/honbun.mjs`）。水増しはしない（AdSense の審査・連絡 C-019）

## しくみ
- 依存パッケージなしの Node 22 だけ（`scripts/build.mjs`）。npm の部品を足さない
- コマンド：`npm run check`（テスト → ビルド → 全ページ点検）。PR前に必ず緑にする
- 公開：`deploy.yml` が Cloudflare Pages（`machi-shakaika`）へ Direct Upload。Cloudflare 側のビルドは使わない。PR → プレビュー／main → 本番。毎朝6:17にも動く
- Secrets：`ESTAT_APP_ID`・`CLOUDFLARE_API_TOKEN`・`CLOUDFLARE_ACCOUNT_ID`・`RAKUTEN_APPLICATION_ID`・`RAKUTEN_ACCESS_KEY`・`RAKUTEN_AFFILIATE_ID`。値はチャット・ログ・コメント・ファイルに出さない
- `SITE.launched` が false のあいだは全ページ noindex。pages.dev はいつも noindex
- AdSense（`SITE.adsense`）：空のリンク・「準備中」のページ・中身のない棚の入口を作らない。運営者情報・プライバシーポリシー・ナビを全ページに
- 流れ：ブランチ `claude/...` → PR → CI が緑・プレビューで確認 → しょーくんに知らせてから Merge。修正はまとめて少ない push で
- Claude の予約タスクは使わない。毎週の更新は Actions の `update.yml`（月曜0:07）
- 災害時モード（`saigai.yml` → `data/mode.yml`）はしょーくんが切りかえる。災害を見て自動で切りかえない
- リンクの点検：`check-links.yml`（毎週水曜と PR）。対象は `node scripts/check-links.mjs --list`。消えたリンクは同じ発行元の新しいページに差しかえる。403・429 は消えたとは限らない
- このクラウドの作業場からは e-Stat と国土地理院につながらない。データは Actions が取って data/ にコミットしたものを使う

## データの決まり
- 出典はすべて `data/sources.yml`。ページでは `srcName()` で 発行元<cite>「題」</cite>。title はページの題そのもの（確かめていないものは null）。checked は開いて確かめた日。計算に使う出典は90日を過ぎるとテストが止まる
- 備えの数字は `data/items.yml` の1か所だけ。本文・計算・チェックリスト・クイズはここから読む（数字を本文に直接書かない）
- 自治体の備蓄のページは `data/bichiku.yml`。公式ページだけ・題は開いて確かめたまま・避難所の分を含むものだけ。見つからない街は書かない
- ランキングは増えた街だけ（減った順・「ワースト」を作らない）
- 照らし合わせ：`data/shogo.yml` の公式の数字と e-Stat の値が合わなければ公開しない
- e-Stat：クレジット表示（`ESTAT_CREDIT`、指定の文言のまま）を全ページのフッターに。数字のかたまりごとに出典・調査の日・公表日。呼び出しは1秒あける
- 国土地理院の避難場所データ（PDL1.0）：出典と加工の記載・取得日・ご利用上の注意を出す
- 楽天：商品は品目ページ（/hinmoku/<id>/）だけ。取ったものはコミットしない・ログに商品名を出さない・artifacts に上げない。品目ページは AdSense なし・楽天以外へのリンクなし・楽天のクレジットは1文字も変えない・「PR」・rel="nofollow sponsored noopener"・画像はAPIのURLのまま。「おすすめ」「最安値」「定価」は使わない。アプリの有効期限 2027-10-23（切れる前に延長）

## おもなファイル（中身は docs/files.md）
- `src/site.mjs`（サイト名・公開前フラグ）・`src/layout.mjs`（ページの外側と共通部品）・`src/pages/*.mjs`（ページ）・`src/stats.mjs`（数字と言い回し）
- `src/data.mjs`（data/*.yml の読み取りと点検）・`src/areas.mjs`（ページを作る103の街）・`src/munis.mjs`
- `scripts/build.mjs`・`verify-dist.mjs`（全ページ点検）・`fetch-*.mjs`（Actions が使う取得）・`check-links.mjs`
- `tools/og/`（共有画像。作業場で作る）・`static/`（アイコン・絵）
