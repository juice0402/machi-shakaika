# 育てる山（夜の作業が上から1つずつ取る）
しょーくんが OK したものだけ。順番は上から（11/4 しょーくんが5つとも OK。claude/sodatsu-spec.md）。
1つの項目が、そのまま夜の issue の本文になる。夜は誰にも聞けないので、決まっていないことは書かない。

## 山

### [ ] 備えの知識の棚を見やすく（読みものが30本になっても迷わない並べ方）
- やること：/sonae/ の一覧（`src/pages/sonae.mjs` の `<ul class="list">`。今は手で書いた `<li>` が15）を、見出しで分けた並べ方にし、読みものの一覧を `YOMIMONO`（`src/pages/sonae-yomimono.mjs`）・`SOTO`（`src/pages/sonae-soto.mjs`）と冬の停電から作る形にする。`YOMIMONO`・`SOTO` の各行に `group` を足す。読みものの末尾 `tail()` の「ほかの読みもの」は、同じ group の読みもの（4つまで）だけにする。最後に `docs/yomimono-neta.md` の「足す所」の5（/sonae/ の一覧に `<li>` を足す）を消し、1の行に `group` を書くことを足す
- できあがりの条件：`npm run check` が緑。/sonae/ に今と同じページが全部出る（YOMIMONO・SOTO・冬の停電・備蓄の量のめやす・ローリングストック・携帯トイレ・道具とクイズの全部に /sonae/ からリンクがあることをテストで見張る）。YOMIMONO に group つきで1行足すだけで、一覧と末尾に出る。スマホとパソコンのスクショを PR に（1画面めは今と同じ）
- 決まったこと：見出し（h2）は5つ。「量と品目」（備蓄の量のめやす・ローリングストック・携帯トイレの備え・品目ごとのめやす）／「災害の前に」（地震・冬の停電と寒さ・これから足す台風や大雨など）／「家族と住まい」（赤ちゃん・高齢の家族・ひとり暮らし・マンション・在宅避難）／「家の外」（職場と通勤・車の大雪）／「道具とクイズ」（計算・チェックリスト・期限メモ・防災カルテ・備えの数字クイズ）。見た目は今の h2（木の印）と `ul.list` のまま。新しい部品やカードは作らない。トップの「備えの知識」の8つはそのまま
- 迷ったら：どの見出しか迷う読みものは、災害の種類の名前が題にあれば「災害の前に」、家族や住まいの形が題にあれば「家族と住まい」、それ以外は「量と品目」
- 読むファイル：CLAUDE.md・docs/yomimono-neta.md・src/pages/sonae.mjs・src/pages/sonae-yomimono.mjs・src/pages/sonae-soto.mjs・src/pages/sonae-fuyu.mjs
- マージ：する

### [x] 地震の見張り：最大震度6弱以上で issue を立てる（#61）
- やること：`.github/workflows/jishin.yml` と `scripts/jishin.mjs` を新しく作る。10分ごと（cron `*/10 * * * *`）に気象庁の地震の一覧 JSON を読み、最大震度が6弱以上の地震があれば issue を1つ立てる（ラベル `jishin`。なければ作る）。同じ地震（`eid`）で2つ立てない（開いている・閉じた jishin の issue の本文に eid を書いておき、それを見る）。workflow_dispatch に dry_run（issue を立てずに結果だけ出す）
- 読む URL：https://www.jma.go.jp/bosai/quake/data/list.json （1件ごとに `ttl` 情報の題・`at` 時刻・`anm` 震源の地名・`mag` マグニチュード・`maxi` 最大震度・`eid` 地震の ID。`maxi` の書き方〔"6-" "6+" "7" など〕は開いて確かめ、テストに写す）
- issue の題と本文：題「震度◯（最大）：◯◯（月/日 時:分）」。本文に「災害時モードにするかは、しょーくんが決める（ボタン https://github.com/juice0402/machi-shakaika/actions/workflows/saigai.yml → Run workflow）」「気象庁 https://www.jma.go.jp/bosai/ 」と eid。災害時モードは切りかえない
- 読めないとき：1回の失敗では知らせない。3回続けて読めない・JSON の形が変わったときは workflow を失敗にし、`mihari.yml` の `WATCH` に足して mihari の issue で知らせる（docs/shikumi.md の「見張り」）
- できあがりの条件：`npm run check` が緑。`tests/jishin.test.mjs` で、最大震度6弱・6強・7 のときは立て、5強以下・同じ eid・形のおかしい行では立てないことを見張る。dry_run で動いた結果を PR に書く
- 決まったこと：しきいは最大震度6弱以上（引き継ぎの「もっと先」の案「震度6弱以上で Issue だけ立てる」。11/4 しょーくんが山に OK）。災害を見て自動で切りかえない（CLAUDE.md）。ページには何も出さない。見張りだけの Claude の予約タスクは作らない（連絡 C-023）。公開リポジトリなので Actions の分数は枠外
- 迷ったら：「震度速報」と「震源・震度情報」のどちらでも、最大震度が6弱以上なら立てる（同じ eid は1つ）。GitHub の schedule が数分おくれるのは気にしない
- 読むファイル：CLAUDE.md・scripts/mihari.mjs・.github/workflows/mihari.yml・docs/shikumi.md の「見張り」・.github/workflows/saigai.yml
- マージ：する

### [ ] 足した146市の「市の備蓄のページ」を探して1行リンクに（人口の多い順に50市）
- やること：`src/areas.mjs` の種類 `shi`（PR #56 で足した人口10万人以上の市）を人口の多い順にならべ、上から50市について、市が自分のホームページで出している備蓄の状況や一覧のページを WebSearch で探す（「◯◯市 備蓄 公表」「◯◯市 災害用備蓄品 一覧」など）。見つかった市だけ `data/bichiku.yml` に足す（市区町村ページの「この街の備え」に1行のリンクが出る）
- できあがりの条件：`npm run check` が緑（`checkBichiku`）。PR に、調べた50市・見つかった数・見つからなかった市の一覧
- 決まったこと（data/bichiku.yml の頭の決まり）：市の公式ページだけ。題は開いて確かめたまま（サイト名の部分は除く）。避難所などの市の備蓄の状況や一覧のページだけ（県・国のページ、防災のトップ、家庭の備えだけのページは入れない）。checked は開いた日。並びは CITIES の順。見つからない市は書かない
- 迷ったら：HTML のページがあればそちら。PDF しかなければ、市の公式サイトの中の PDF でよい（題は PDF の1ページめの題）。古い年度のページしかない市は入れない（ここ2年のものだけ）
- 順番：PR #56 のマージのあと（`shi` の市が areas.mjs にないときは始めない）
- 読むファイル：CLAUDE.md・data/bichiku.yml・src/areas.mjs
- マージ：する

### [ ] 小さい街でも、その街だけの文が出るように（5万人以上へ広げる準備）
- やること：市区町村ページの「どの街も同じ文」（`scripts/honbun.mjs` の型の割合）を下げる。ためしに `src/areas.mjs` に人口5万人以上の市（町村と政令市の区は入れない。ページを作る条件5・6をみたすもの、約+339）を足してビルドし、65%をこえる街を0にする。ためしの街は PR に入れない（ためしの英字は重ならなければ何でもよい。例 `c` と市区町村コード）
- 方法：半分以上の街に出る8字の切れはしを、多いものから見る。その文を、数字の条件で言い回しをえらび分ける形に直す（`src/stats.mjs`）。今のデータ（国勢調査の数字・避難場所の種類ごとの数・似てる街・県内の位置）から、その街だけの数字を1文足すのはよい
- 11/4 のためしの数字：5万人以上（+339 → 442街）で、型の割合は中央63%・最大67%・65%をこえる50（249街では中央61%・最大65%・こえる0）
- できあがりの条件：`npm run check` が緑。PR に「249街のとき」と「ためしの442街のとき」の最小・中央・最大・65%をこえる数。今の249も65%以下のまま
- 決まったこと：1画面めと街クイズの文は変えない（10/31 しょーくん）。水増ししない。データにない事実（地名の由来・名所など）を書かない。1文は全角60字まで（tests/machi-yomidokoro.test.mjs が全国の1,741で見張る）。「ワースト」「住みにくい」・減り方や高齢化の順位は書かない。避難場所の数は人口あたり・順位・街どうしのくらべに使わない
- 迷ったら：65%を切れない街が少し残ったら、その街の名前と割合を PR に書いて、止めずにできあがりにする
- 読むファイル：CLAUDE.md・scripts/honbun.mjs・src/stats.mjs・src/pages/city.mjs・src/areas.mjs の頭のコメント
- マージ：する

### [ ] ページを作る街を、データの条件で自動にえらぶしくみ
- やること
  - `src/areas.mjs` に `AUTO_MIN_POP = 100000` と `slugOf(読みがな)` を足す。slugOf は読みがな（data/yomi.json）からヘボン式・長音は書かない（ou・oo→o、uu→u）・末尾の「し」「く」を外す。テストで CITIES の全部の英字と一致させる
  - `data/auto-cities.json`（`[[市区町村コード, 都道府県の英字, 英字], ...]`）を作り、`resolveCities()` が CITIES とこのファイルを合わせて返す（種類 `auto`）
  - `scripts/pick-cities.mjs`：CITIES と auto-cities.json にない市（レベル4。町村と政令市の区は入れない）で、人口が AUTO_MIN_POP 以上・条件5（`sonaeLinks()` に why がある）・条件6（data/hinan/counts.json に数がある）をみたす街を候補にする。候補をふくめた型の割合（`scripts/honbun.mjs` の関数）を測り、65%をこえる候補を外して、残りを auto-cities.json に足す
  - `.github/workflows/update.yml`：避難場所の取得（fetch-hinan）の前に pick-cities を動かし、auto-cities.json が変わったら、ほかのデータと同じコミットに入れる（足した街の避難場所の一覧も同じ回にできる）
- できあがりの条件：`npm run check` が緑。AUTO_MIN_POP が10万のままでは auto-cities.json は空（PR #56 の249と同じページ）。ためしに5万で pick-cities を動かすと、65%をこえる街が入らず、全部の市区町村ページが65%以下になること（数を PR に）
- 決まったこと：しょーくんが「5万人以上にして」と言ったら AUTO_MIN_POP を変えるだけで広がる形にする（5万人以上は AdSense の審査に通ってから。11/4 しょーくん）。一度 auto-cities.json に入った街は、条件から外れても消さない・英字を変えない。ページを消す自動は作らない。英字が同じ県の中で重なったら、その街は足さずに workflow の注記に出す
- 迷ったら：ビルドを2回するのが重ければ、候補をふくめた本文だけを作って測ってよい
- 順番：「小さい街でも、その街だけの文が出るように」のあと（そのブランチがマージ待ちなら、その上に作る）
- 読むファイル：CLAUDE.md・src/areas.mjs・src/stats.mjs・scripts/fetch-hinan.mjs・src/lib/hinan.mjs・.github/workflows/update.yml・scripts/honbun.mjs
- マージ：する
