# 育てる山（夜の作業が上から1つずつ取る）
しょーくんが OK したものだけ。順番は上から（11/4 しょーくんが5つとも OK。11/6 に連絡 C-025「買いに来る理由」の2つを OK し、残りのいちばん上に入れた。claude/sodatsu-spec.md）。
1つの項目が、そのまま夜の issue の本文になる。夜は誰にも聞けないので、決まっていないことは書かない。

## 山

### [x] 備えの知識の棚を見やすく（読みものが30本になっても迷わない並べ方）（#59）
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

### [x] 備えのごよみ：季節で変わる「いまの備え」の1行とカレンダーの購読（連絡 C-025 案B）（#64）
- やること
  - `data/koyomi.yml` を新しく作る。1年を24の期間（各月の1〜15日と16日〜月末）に分け、1期間1行（`from`・`to`〔MM-DD〕・`theme`・`item`〔items.yml の `hinmoku: true` の id〕・`text`・`links`・`sources`）。期間とテーマと品目は下の表のとおり
  - `text` は「なぜ今か」の1文（全角60字まで）。品目の数字は items.yml から差しこむ（例 `{gas}` → 農林水産省の例のボンベ6本、`{mizu}` → 1人1日3L）。yml の `text` に数字を直接書かない（月日だけはよい）
  - `src/koyomi.mjs`：日付（日本時間）から今の期間をえらぶ関数と、文の差しこみ。ビルドは毎朝6:17に動くので、その日の期間でページを作る（ブラウザの JS は足さない）
  - 新しいページ /koyomi/（`src/pages/koyomi.mjs`）「備えのごよみ」：1画面めに今の期間の1行（`HAN` の朱のはんこ）と品目ページへのリンク、カレンダーの購読のリンク2つ（iPhone は `webcal://machi-shakaika.com/koyomi/koyomi.ics`、Google カレンダーは `https://calendar.google.com/calendar/render?cid=webcal%3A%2F%2Fmachi-shakaika.com%2Fkoyomi%2Fkoyomi.ics`。今の `a.go` の形で縦に並べる）。その下に1年の表（24行：期間・テーマ・品目へのリンク。今の行に朱のはんこ）と出典。本文600字以上。AdSense はほかの読みものと同じ。A8 は置かない
  - `/koyomi/koyomi.ics`：今年と来年の48期間を、始まりの日の終日の予定にする（SUMMARY「いまの備え：<テーマ>」、DESCRIPTION に text と品目ページの URL。通知 VALARM は入れない）。.ics の部品は `src/kigen-core.mjs` の `kEsc`・`kFold` を使う。UID は `koyomi-<年>-<MM-DD>@machi-shakaika.com`
  - 今の期間の1行を出す所：トップ（`h2('備えの知識')` のすぐ下）・品目ページ（今の期間の item と同じ品目のページだけ、量のめやすの下）・期限メモ（theme が「期限の見直し」の期間だけ、一覧の下）。/sonae/ の見出し「道具とクイズ」に /koyomi/ を1行。サイトマップに /koyomi/
  - 市区町村ページ：柱の「この街の備え」の最後に1行出す形をためしにビルドし、型の割合（`scripts/honbun.mjs`）の最大と中央が今より上がらなければ出す。上がるなら市区町村ページには出さず、PR にその数字を書く
- 表（24期間。links は品目ページのほかに足すページ）

| 期間 | theme | item | links |
| --- | --- | --- | --- |
| 01-01〜01-15 | 冬の停電と寒さ | gas | /sonae/fuyu-teiden/ |
| 01-16〜01-31 | 1/17 防災とボランティアの日：期限の見直し | mizu | /dougu/kigen/ |
| 02-01〜02-14 | 冬の停電と寒さ | light | /sonae/fuyu-teiden/ |
| 02-15〜02-末 | 冬の停電と寒さ | battery | /sonae/fuyu-teiden/ |
| 03-01〜03-15 | 3/11：備蓄の量の見直し | mizu | /sonae/bichiku/ |
| 03-16〜03-31 | 新生活：ひとり暮らしの備え | shushoku | /sonae/hitorigurashi/ |
| 04-01〜04-15 | 新生活：ひとり暮らしの備え | keitai-toilet | /sonae/hitorigurashi/ |
| 04-16〜04-30 | ローリングストック | shushoku | /sonae/rolling-stock/ |
| 05-01〜05-15 | 大雨の前 | light | |
| 05-16〜05-31 | 大雨の前 | battery | |
| 06-01〜06-15 | 大雨の前 | keitai-toilet | /sonae/keitai-toilet/ |
| 06-16〜06-30 | 大雨の前 | mizu | /sonae/bichiku/ |
| 07-01〜07-15 | 台風の前 | light | |
| 07-16〜07-31 | 台風の前 | mizu | /sonae/bichiku/ |
| 08-01〜08-15 | 台風の前 | battery | |
| 08-16〜08-31 | 9/1 防災の日の前：期限の見直し | mizu | /dougu/kigen/ |
| 09-01〜09-15 | 9/1 防災の日：備蓄の量の見直し | shushoku | /sonae/bichiku/ |
| 09-16〜09-30 | 台風の前 | gas | |
| 10-01〜10-15 | 台風の前 | keitai-toilet | /sonae/keitai-toilet/ |
| 10-16〜10-31 | ローリングストック | shushoku | /sonae/rolling-stock/ |
| 11-01〜11-15 | 冬の前：冬の停電と寒さ | gas | /sonae/fuyu-teiden/ |
| 11-16〜11-30 | 11/19 備蓄の日：期限の見直し | mizu | /dougu/kigen/ |
| 12-01〜12-15 | 冬の停電と寒さ | light | /sonae/fuyu-teiden/ |
| 12-16〜12-31 | 冬の停電と寒さ | battery | /sonae/fuyu-teiden/ |

- 季節と行事の出典：11/19 は sources.yml の `tokyo-bichiku`（東京都の「備蓄の日」）。冬の停電は /sonae/fuyu-teiden/ と同じ出典。1/17・3/11・9/1 と、大雨・台風の時期は、WebSearch で内閣府・気象庁の公式ページを探して開き、about にある事実だけを書く（sources.yml に足す。title は開いた題そのまま、checked は開いた日）
- できあがりの条件：`npm run check` が緑。`tests/koyomi.test.mjs` で、24期間が1年（うるう年の2/29も）をすき間・重なりなく埋める・item がみな `hinmoku: true`・text に数字の直書きがない・全角60字まで・下の使わない言葉がない・sources が sources.yml にある・.ics が今年と来年の48件で75オクテットで折られている、を見張る。/koyomi/・トップ・品目ページ1つのスクショ（スマホとパソコン）を並べて1枚で PR に。市区町村ページの型の割合（249街の最小・中央・最大）を PR に
- 決まったこと：C-025「買いに来る理由がある人を集める」の案B（11/6 しょーくん OK・案Aより先）。楽しさは「来るたびに季節で変わる・カレンダーから呼び戻す」、買う理由は「季節の備えと買いかえの時期」。クイズ・今日の1問・まなびプリント・街あつめ帳・防災カルテ・冷蔵庫に貼る紙には出さない（子どもも使う）。新しい売り場のページは作らない（商品は今の品目ページ6つの楽天のまま。楽天を呼ぶ回数はふやさない）。あおらない（「今すぐ」「手遅れ」・赤と黄を使わない）。使わない言葉：〜しましょう・ぜひ・便利・簡単・安心・おすすめ・お得・ポイント・コツ・最安値・定価・ダッシュ・絵文字。災害が起きているときの動きは書かない。災害時モードのとき（`src/mode.mjs` の `SAIGAI`）は1行を出さない（/koyomi/ の表はそのまま）
- 迷ったら：出典が見つからない・開けない行事や季節は、その名前を書かず、theme を「ローリングストック」（/sonae/rolling-stock/ と同じ出典）にして item はそのまま。期間の区切りは日本時間の0時。1行に入れる数字は1つか2つ
- 読むファイル：CLAUDE.md・data/items.yml・data/sources.yml の頭の決まり・src/pages/top.mjs・src/pages/hinmoku.mjs・src/pages/kigen.mjs・src/kigen-core.mjs の .ics の所・src/pages/sonae.mjs・src/pages/sonae-fuyu.mjs・src/mode.mjs・scripts/honbun.mjs
- マージ：する

### [x] わが家の防災カルテに「家にある数」：そろった分に色がつく（連絡 C-025 案A）（#67）
- やること
  - /dougu/karte/（`src/pages/karte.mjs`・`src/karte-core.mjs`）の入力のすぐ下に、たたんだ1行「家にある数を入れる」（details と summary）を足し、開くと水（2Lのボトルの本数）・主食（食）・携帯トイレ（回分）の3つの数の欄。欄の見た目は期限メモの数の欄（`.kf` の input）と同じ。0〜999
  - 紙（`kaSheet`）の絵で、ある分のボトルとマスを中までぬる（色は今の線の色。新しい色は足さない）。足りない分は今のまま白
  - 品目ごとに、足りないときは「水 あと6本（2L）で7日分」のような1行と、その品目ページ（/hinmoku/mizu/ など）へのリンク。足りているときは、その行に今の日数ボタンと同じ朱のはんこ（`HAN`）と「7日分そろった」
  - 期限メモの .ics（`src/kigen-core.mjs` の `kIcs`）の DESCRIPTION に、品目ページがある品目だけ「品目のめやす https://machi-shakaika.com/hinmoku/<id>/」の1行を足す（期限の30日前の知らせから品目ページへ）
  - 入れた数は、今と同じく URL の ? と localStorage（karte）だけ。プライバシーポリシー（`src/pages/info.mjs` の防災カルテとまなびプリントの段落）に「家にある数」を足す
- できあがりの条件：`npm run check` が緑。テストで、足りない数（水は必要な L を2で割って切り上げた本数から、ある本数を引く。0より小さければ0）・そろったときのはんこ・kIcs の説明の品目の URL を見張る。家にある数を入れていないときは、紙は今と同じ（main のビルドと、playwright の 390×660・1280×800 と印刷の PDF を画素までくらべる。画面は「家にある数を入れる」の1行がふえるだけ）。スクショ（数を入れたとき・入れないとき・紙、スマホとパソコン）を並べて1枚で PR に
- 決まったこと：C-025「買いに来る理由がある人を集める」の案A（11/6 しょーくん OK）。楽しさは「ある分に色がたまる・そろうとはんこ」、買う理由は「わが家の足りない数と期限」。カルテは AdSense・A8 を置かないまま（品目ページへの内部リンクだけ）。必要な量の計算（`kaAmounts`。2週間分の人も）は今のまま。紙は A4縦1枚におさめる。使わない言葉とあおらない決まりは上の「備えのごよみ」と同じ
- 迷ったら：主食と携帯トイレのマスは、1マスが何食・何回分かの今の決まり（1・2・5・10）に合わせ、ある数をマスの数に直してぬる（半端は切り捨て。ぬりすぎない）。「あと◯」の行で紙が A4 をはみ出すなら、その行は画面だけに出す
- 読むファイル：CLAUDE.md・src/pages/karte.mjs・src/karte-core.mjs・src/kigen-core.mjs の .ics の所・src/pages/kigen.mjs・src/pages/info.mjs・tools/karte/
- 順番：「備えのごよみ」のあと（そのブランチがマージ待ちなら、その上に作る）
- マージ：する

### [x] 足した146市の「市の備蓄のページ」を探して1行リンクに（人口の多い順に50市）（夜 #71 に移した：249の街ぜんぶと、わかることの1文に広げた。11/8 AdSense のやり直し）
- やること：`src/areas.mjs` の種類 `shi`（PR #56 で足した人口10万人以上の市）を人口の多い順にならべ、上から50市について、市が自分のホームページで出している備蓄の状況や一覧のページを WebSearch で探す（「◯◯市 備蓄 公表」「◯◯市 災害用備蓄品 一覧」など）。見つかった市だけ `data/bichiku.yml` に足す（市区町村ページの「この街の備え」に1行のリンクが出る）
- できあがりの条件：`npm run check` が緑（`checkBichiku`）。PR に、調べた50市・見つかった数・見つからなかった市の一覧
- 決まったこと（data/bichiku.yml の頭の決まり）：市の公式ページだけ。題は開いて確かめたまま（サイト名の部分は除く）。避難所などの市の備蓄の状況や一覧のページだけ（県・国のページ、防災のトップ、家庭の備えだけのページは入れない）。checked は開いた日。並びは CITIES の順。見つからない市は書かない
- 迷ったら：HTML のページがあればそちら。PDF しかなければ、市の公式サイトの中の PDF でよい（題は PDF の1ページめの題）。古い年度のページしかない市は入れない（ここ2年のものだけ）
- 順番：PR #56 のマージのあと（`shi` の市が areas.mjs にないときは始めない）
- 読むファイル：CLAUDE.md・data/bichiku.yml・src/areas.mjs
- マージ：する

### [x] 小さい街でも、その街だけの文が出るように（5万人以上へ広げる準備）（#85）
- 11/8：今の249の街の分は、AdSense のやり直しの夜 #70（避難場所の顔ぶれ・言い回しのえらび分け。めあては型の割合 中央55%・最大60%）でする。この項目は #70 のマージのあとに、5万人以上のためしの分だけを進める（65%の線は #70 のめあてに読みかえる）
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

### [ ] 備蓄の量のめやす（/sonae/bichiku/）で、わが家の人数の量をその場で出す（連絡 C-026）
- やること：/sonae/bichiku/（`src/pages/sonae.mjs` の `path: '/sonae/bichiku/'`）の1つめの段落のすぐ下（h2「1人1日の量」の前）に、計算のページと同じ計算カード `calcHtml(cc)` を置き、ページに `script: CALC_JS` を足す（prose の div はカードの前で閉じて、あとで開き直す）。早見表の下の `<a class="go" href="/dougu/keisan/">わが家の人数で計算する</a>` は、計算のページと同じ `<a class="go" data-keep href="/dougu/check/">この人数でチェックリストを見る</a>` に置きかえる（カードの人数と日数がチェックリストに引きつがれる）。ほかの文・早見表・出典は変えない
- できあがりの条件：`npm run check` が緑（作業場から e-Stat・国土地理院にはつながらないので `ALLOW_MISSING_HINAN_LIST=1 npm run check`。データは Actions が取って data/ にコミットしたものを使う）。テストで、/sonae/bichiku/ に `id="calc"` が1つだけあり、`CALC_JS` が入っていることを見張る（ビルドの結果を見ている今のテストの形をまねる）。スマホ 390×660 で計算の答えの行（水・食事・携帯トイレ）が1画面めに入る。`?n=2&d=7` で開くと2人・7日分の数になる。地の文の字数（`node scripts/honbun.mjs dist --pages`）がめやすの900字を下回らない。スマホとパソコンのスクショを並べて1枚で PR に
- 決まったこと：連絡 C-026（11/6）の machi の行「備え（/sonae/bichiku/ 7位）は自分の家の人数で量を出す形を」。答えのページは消さない・下げない（C-026）。1行で済む答えはページの上に書いてよく、そのすぐ下に道具を置く（site-principles「AIの検索の答えに負けない作り」）。/sonae/bichiku/ は検索で表示の多い備えのページ（search-data-machi.md 11/6 の回：6表示・7.17位）。計算の部品と数字は今の `calcHtml`・`CALC_JS` と data/items.yml のまま（数字を本文に直接書かない・CLAUDE.md）。AdSense の置き場所は今のまま（新しい置き場所は合格のあと・machi-adsense-plan.md）。利用者のデータを集めない（CLAUDE.md）ので、入れた人数と日数は URL の ? だけ
- 迷ったら：カードを1つめの段落の下に置くと答えの行が1画面めに入らないときは、h1 のすぐ下（段落の前）に置く。カードの問いの文は `calcHtml` のはじめからの文のまま。人数と日数のはじめの値も `calcHtml` のはじめの値（4人・最低の日数）のまま
- 読むファイル：CLAUDE.md・src/pages/sonae.mjs の /sonae/bichiku/ と /dougu/keisan/ の所・src/calc.mjs・scripts/honbun.mjs
- マージ：する
- 足した：育てる山の補充（自動・2026-11-10）

### [ ] 品目ページ（水・主食・携帯トイレ）に、わが家の人数の量と2Lボトルの本数
- やること
  - `calc: true` の品目ページ3つ（/hinmoku/mizu/・shushoku/・keitai-toilet/。`src/pages/hinmoku.mjs`）の上の `<p><a class="go" href="/dougu/keisan/">わが家の人数で計算</a></p>` を、計算カード `calcHtml(cc, { ans: false })` と、その品目だけの答えの1行（`<p class="ans">`。水は「水 ◯L（2Lボトル◯本）」、主食は「主食 ◯食」、携帯トイレは「携帯トイレ ◯回分」）に置きかえる。`cc` は `scripts/build.mjs` の `calcConf(items)` の値を、`hinmokuPages({ ... })` の引数に足して渡す。ページの script は、商品があるときは `SHOP_JS + CALC_JS`、ないときも `CALC_JS` を入れる
  - ボトルの本数は、L を items.yml の `bottle.liters` で割って切り上げた数（防災カルテの「あと◯本」と同じ数え方）。`CALC_JS` に、`data-ceil` のような印のついた出力だけ切り上げて書く形を小さく足す（今の出力の数え方は変えない）
  - 計算のページ（/dougu/keisan/）の「この人数でチェックリストを見る」の下に、3つの品目ページへの `data-keep` のリンクを1行（「備蓄の水」「備蓄の主食」「携帯トイレ」）。/sonae/bichiku/ のいちばん下の3つの品目のリンクにも `data-keep` をつける（人数と日数をつけたまま品目ページが開く）
- できあがりの条件：`npm run check` が緑（作業場から e-Stat・国土地理院にはつながらないので `ALLOW_MISSING_HINAN_LIST=1 npm run check`。データは Actions が取って data/ にコミットしたものを使う。楽天の商品はない形でビルドされる）。テストで、本数（例：4人・3日なら水36Lで18本、1人・7日なら21Lで11本）と、3つの品目ページに `id="calc"` が1つだけあること、品目ページに楽天以外の外のリンクが増えていないことを見張る。/dougu/keisan/ で人数と日数を変えてから水のリンクを押すと、品目ページに同じ人数と日数の量が出る。gas・light・battery のページは今と同じ。スマホとパソコンのスクショ（水のページ・計算のページ）を並べて1枚で PR に
- 決まったこと：二大テーマの両方に当たるもの（遊びに来た人に、いまの買う理由を渡す・site-principles「買いに来る理由がある人を集める」11/6）。買う理由は「わが家に要る数」。新しい売り場のページは作らず、今の品目ページ6つへの内部リンクだけ。楽天を呼ぶ回数・A8・AdSense の置き場所は今のまま（引き継ぎの「買いに来る理由」C-025 の決め）。品目ページは AdSense なし・楽天以外へのリンクなし・「おすすめ」「最安値」「定価」は使わない・商品名を本文に書かない（CLAUDE.md・machi-adsense-plan.md）。利用者のデータを集めない（CLAUDE.md）ので、入れた人数と日数は URL の ? だけ
- 迷ったら：答えの1行の言い方は、ページの上の `p.feat` の量の書き方（単位）に合わせる。calc: false の品目（カセットコンロ・明かり・電池）には何も足さない（家族の人数での数え方を出典で確かめていないため・`shelfText` の文）。カードで品目ページの1画面めがのびても、商品の並びは今の場所のまま（早見表の上下を入れかえない）。災害時モード（`SAIGAI`）のときも計算はそのまま出す（商品が出ないだけ）
- 順番：「備蓄の量のめやす（/sonae/bichiku/）で、わが家の人数の量をその場で出す」のあと（そのブランチがマージ待ちなら、その上に作る）
- 読むファイル：CLAUDE.md・src/pages/hinmoku.mjs・src/calc.mjs・src/pages/sonae.mjs の /dougu/keisan/ と /sonae/bichiku/ の所・src/karte-core.mjs の本数の数え方・data/items.yml の mizu
- マージ：する
- 足した：育てる山の補充（自動・2026-11-10）

### [ ] 備えの読みものの新着を RSS で（呼び戻せる入口）
- やること
  - `src/pages/sonae-yomimono.mjs` の `YOMIMONO`、`src/pages/sonae-soto.mjs` の `SOTO`、`src/pages/sonae-fuyu.mjs` の `FUYU` の各行に `date: 'YYYY-MM-DD'` を足す。日付は、その読みものの path が main に初めて入った日（`git fetch --unshallow` のあと `git log --reverse --format=%cs -S"<path>" origin/main -- src/pages` のいちばん上）
  - ビルド（`scripts/build.mjs`。`/robots.txt` を書く `out()` と同じ形）で `/sonae/feed.xml` を作る。RSS 2.0。channel は title「まちの社会科 備えの読みもの」・link `${SITE.url}/sonae/`・description 1文・language ja。item は `allYomimono()` の全部を date の新しい順に、title（name）・link と guid（`${SITE.url}${path}`）・pubDate（date の日本時間0時、+0900）・description（そのページの meta description。`build.mjs` で作ったページの一覧から path で引く）。& < > はエスケープする
  - /sonae/ と読みもののページ全部の head に `<link rel="alternate" type="application/rss+xml" title="まちの社会科 備えの読みもの" href="/sonae/feed.xml">`。/sonae/ の出典の見出しのすぐ前に1行 `<p><a href="/sonae/feed.xml">読みものの新着をRSSで受け取る</a></p>`
  - `docs/yomimono-neta.md` の「足す所」の1の `{ key, path, name, group }` を `{ key, path, name, group, date }` にし、date は PR を作る日と書き足す。docs/files.md の sonae-yomimono の行に、feed.xml を作ることを1文
- できあがりの条件：`npm run check` が緑（作業場から e-Stat・国土地理院にはつながらないので `ALLOW_MISSING_HINAN_LIST=1 npm run check`。データは Actions が取って data/ にコミットしたものを使う）。テストで、`allYomimono()` の全部に date（YYYY-MM-DD）があること、feed.xml の item の数が `allYomimono()` と同じで新しい順なこと、エスケープされていることを見張る。同じデータで2回ビルドしたとき feed.xml が1バイトも変わらない（毎朝のビルドで本番の fingerprint が変わらないように）。サイトマップには入れない。PR に feed.xml の頭の数行
- 決まったこと：呼び戻せる入口はホーム画面に追加・カレンダーの購読（.ics）・RSS。運営の SNS の発信はしない（site-principles「楽しさで、わざわざ来てもらう」・連絡 C-016 の②）。machi はホーム画面（街あつめ帳）とカレンダー（備えのごよみ）は済で、RSS はまだない。読みものは予約タスク「読みもの書き」が火・土に1本ずつ足す（docs/yomimono-neta.md）。本番は fingerprint が同じなら公開しない（docs/shikumi.md の「公開と運用」）。外のスクリプトや数える画像は入れない（利用者のデータを集めない・CLAUDE.md）
- 迷ったら：`lastBuildDate` は入れない（ビルドのたびに変わるため）。日付が git で分からない読みものは、/sonae/ の棚に出ている今の読みものの中でいちばん古い日にそろえ、PR にその名前を書く。品目ページ・道具・市区町村ページは feed に入れない（読みものだけ）。head の link を入れるのが難しいページがあれば、/sonae/ だけでよい
- 読むファイル：CLAUDE.md・docs/yomimono-neta.md の「足す所」・src/pages/sonae-yomimono.mjs・src/pages/sonae-soto.mjs・src/pages/sonae-fuyu.mjs・src/pages/sonae.mjs の /sonae/ の所・scripts/build.mjs の robots.txt と sitemap の所・docs/shikumi.md の「公開と運用」
- マージ：する
- 足した：育てる山の補充（自動・2026-11-10）

### [ ] 携帯トイレの備えとローリングストックでも、わが家の人数の量をその場で出す
- やること：/sonae/keitai-toilet/ と /sonae/rolling-stock/（どちらも `src/pages/sonae.mjs`）の1つめの段落のすぐ下（最初の h2 の前）に、計算のページと同じ計算カード `calcHtml(cc)` を置き、2ページに `script: CALC_JS` を足す（prose の div はカードの前で閉じて、あとで開き直す）。2ページの `<p><a class="go" href="/dougu/keisan/">わが家の人数で計算する</a></p>` は、計算のページと同じ `<p><a class="go" data-keep href="/dougu/check/">この人数でチェックリストを見る</a></p>` に置きかえる。/sonae/keitai-toilet/ の `<a href="/hinmoku/keitai-toilet/">携帯トイレの品目と商品</a>` には `data-keep` をつける（人数と日数をつけたまま開く。ボンベのページは人数で数えない品目なのでつけない）。ほかの文・早見表・A8 の広告・出典は変えない
- できあがりの条件：`npm run check` が緑（作業場から e-Stat・国土地理院にはつながらないので `ALLOW_MISSING_HINAN_LIST=1 npm run check`。データは Actions が取って data/ にコミットしたものを使う）。テストで、2ページに `id="calc"` が1つだけあり `CALC_JS` が入っていること、/sonae/keitai-toilet/ の A8 の広告が1つのままなことを見張る（ビルドの結果を見ている今のテストの形をまねる）。スマホ 390×660 で計算の答えの行（水・食事・携帯トイレ）が1画面めに入る。`?n=2&d=7` で開くと2人・7日分の数になる。地の文の字数（`node scripts/honbun.mjs dist --pages`）が2ページともめやすの900字を下回らない。2ページのスマホとパソコンのスクショを並べて1枚で PR に
- 決まったこと：連絡 C-026（11/6）の決まり「表示の多い答えのページから順に、来る理由を足しつづける」の③「自分で計算できる・自分の数字が残る」。答えのページは消さない・下げない（C-026）。1行で済む答えはページの上に書いてよく、そのすぐ下に道具を置く（site-principles「AIの検索の答えに負けない作り」）。/sonae/ のページは検索の順位がよいまとまり（search-data-machi.md 11/6 の回：/sonae/ 4ページ・9表示・21.4位、11/2 の回の見立て「順位がよいのは備え」）。計算の部品と数字は今の `calcHtml`・`CALC_JS` と data/items.yml のまま（数字を本文に直接書かない・CLAUDE.md）。A8 は1ページ1つ・答えのあと（引き継ぎの A8 の決めごと）、AdSense の置き場所は今のまま（新しい置き場所は合格のあと・machi-adsense-plan.md）。入れた人数と日数は URL の ? だけ（利用者のデータを集めない・CLAUDE.md）
- 迷ったら：カードを1つめの段落の下に置くと答えの行が1画面めに入らないときは、h1 のすぐ下（段落の前）に置く。カードの問いの文・はじめの人数と日数は `calcHtml` のはじめのまま（携帯トイレだけの形にしない）。A8 の広告はカードの近くに動かさず、今の場所のまま
- 順番：「備蓄の量のめやす（/sonae/bichiku/）で、わが家の人数の量をその場で出す」のあと（同じ置き方をまねる。そのブランチがマージ待ちなら、その上に作る）
- 読むファイル：CLAUDE.md・src/pages/sonae.mjs の /sonae/keitai-toilet/・/sonae/rolling-stock/・/dougu/keisan/ の所・src/calc.mjs・src/a8.mjs・scripts/honbun.mjs
- マージ：する
- 足した：育てる山の補充（自動・2026-11-11）

### [ ] チェックリストで、まだの品目から品目ページへ・そろったら朱のはんこ
- やること
  - /dougu/check/（`src/pages/dougu.mjs`）の「家に置く備え」の一覧（`<ul class="ckl">`）のすぐ下に1行 `<p class="mada" data-mada>` を足す。中身は、その一覧で品目ページがある行（items.yml の checklists の `item` があり、その品目が `hinmoku: true`。今は水・主食・携帯トイレ・ボンベの4つ）の品目ページへのリンク（`<a data-keep href="/hinmoku/<id>/">` と items.yml の `page` の名前を「・」でつなぐ）を、はじめから HTML に書いておく
  - `CHECK_JS` で、チェックした行の品目のリンクには `hidden` をつけ、外したら戻す。品目ページのある行が全部チェックされたら、リンクの代わりに防災カルテの「◯日分そろった」と同じ朱のはんこ（`HAN` と、`src/pages/karte.mjs` の `.ok` と同じ見た目）で「品目がそろった」の1行にする。リンクは HTML に書いておくので、カードの人数と日数を変えると `CALC_JS` が `data-keep` の URL を書きかえる
  - 行の頭のことばは「まだの品目：」。持ち出す袋の一覧には足さない
- できあがりの条件：`npm run check` が緑（`ALLOW_MISSING_HINAN_LIST=1 npm run check`）。テストで、/dougu/check/ の data-mada の行に、家に置く備えの品目ページのある行の数だけリンクがあり、どれも /hinmoku/ の中で `data-keep` がついていることを見張る（items.yml から数えて、数を手で書かない）。playwright で、4つをチェックすると「まだの品目」が消えてはんこが出る・1つ外すとその品目のリンクが戻る・開き直してもチェックに合った形で出る、を確かめる。何もチェックしていないときのスマホ 390×660 の1画面めは今と同じ（main のビルドと画素までくらべる）。スクショ（チェックなし・一部・全部、スマホとパソコン）を並べて1枚で PR に
- 決まったこと：二大テーマの両方に当たるもの（site-principles「買いに来る理由がある人を集める」11/6）。楽しさは「積み上がる」（チェックが端末に残り、そろうとはんこ）、買う理由は「わが家にまだない品目」。防災カルテの「家にある数」（連絡 C-025 案A）と同じ形（そろうと朱のはんこ・足りない品目は品目ページへ）。新しい売り場のページは作らず、今の品目ページへの内部リンクだけ。楽天を呼ぶ回数・A8（このページの防災セットの1つ）・AdSense の置き場所は今のまま（引き継ぎの C-025 の決め・A8 は1ページ1つ）。チェックは今と同じく localStorage（`machi-check-v1`）だけで、どこにも送らない（CLAUDE.md）。使わない言葉（〜しましょう・ぜひ・便利・簡単・安心・おすすめ・お得・ポイント・コツ・最安値・定価・ダッシュ・絵文字）とあおらない決まり（「今すぐ」「手遅れ」・赤と黄を使わない）は CLAUDE.md と site-principles のまま
- 迷ったら：品目ページのない行（生活用水・缶詰・トイレットペーパー・マッチ・乾電池）は「まだの品目」に出さず、はんこの数えにも入れない（乾電池は品目ページ「モバイルバッテリー」とは別の品目なので、items.yml の `item` は足さない）。はんこの文は「品目がそろった」の1つだけにし、一覧の全部がそろったかは今の「◯/◯」の数のままで見せる。「チェックをすべて消す」を押したら、リンクは全部戻す。はんこの見た目がこのページで出ないときは、karte.mjs の `.ok` の CSS をこのページの CSS にも入れる（新しい色は足さない）
- 読むファイル：CLAUDE.md・src/pages/dougu.mjs・src/calc.mjs の data-keep の所・src/data.mjs の checkEntries・data/items.yml の checklists と各品目の page・src/pages/karte.mjs の .ok・src/karte-core.mjs の「そろった」の所・src/layout.mjs の HAN
- マージ：する
- 足した：育てる山の補充（自動・2026-11-11）

### [ ] 県と市の備蓄のページの確かめ残し（群馬・富山の県のページと、1文のない8つの街）
- やること
  - `data/ken-bichiku.yml` の群馬県（「群馬県防災レシピ」について）と富山県（県の広報の特集のページ）を、WebSearch で出たそのページを開いて確かめ直す。題が今のままか、ファイルの頭の決まり（県の備蓄の状況のページか、家庭に呼びかけている備えのページ）に合うかを見る。合っていれば checked を開いた日にし、note を開いて読んだことの1文に直す（同じでよければそのまま）。合わないときは、同じ県のホームページで決まりに合うページを WebSearch で探して差しかえる
  - `data/bichiku.yml` で note のない8つの街（文京区・目黒区・世田谷区・荒川区・大津市・山口市・北九州市・那覇市）のページを WebSearch から開き、ページに書いてあることの1文の note を足し、checked を開いた日にする
  - 夜 #72 で見つからなかった秋田県・岡山県・鹿児島県も、もう一度だけ WebSearch で探す（見つかれば決まりのとおり足す）
- できあがりの条件：`npm run check` が緑（`ALLOW_MISSING_HINAN_LIST=1 npm run check`。`checkBichiku` と note の決まり〔全角60字まで・「。」で終わる1文・使わない言葉なし〕が見張る）。PR に、確かめた県と街ごとの結果（そのまま・直した・差しかえた・開けなかった）と、足した note の文の一覧
- 決まったこと：data/bichiku.yml と data/ken-bichiku.yml の頭の決まりのまま（公式ページだけ・題は開いて確かめたまま〔サイト名の部分は除く〕・checked は開いた日・note はそのページに書いてあることを1文で、開いて読んだことだけ・評価やくらべは書かない・数字は1つまでページにあるまま）。県のページは PDF だけのものは入れない（ken-bichiku.yml の頭）。市のページは古い年度のものしかない街は入れない（ここ2年。育てる山「足した146市の…」の迷ったら）。報告ファイル（claude/reports/machi.md の 11/9 夜と 11/10 朝の行）に「群馬と富山の title・note を確かめ直す」「note なしの8つは確かめられないまま」と残っているもの
- 迷ったら：開けないページ（承認が要る・断られる）と、WebSearch の回数の上限で探せなかったものは、今の行のまま変えず、PR にその名前を書く。県や街の行を消すことはしない（今のページが決まりに合わないと分かっても、差しかえ先が見つからなければ今のまま残し、PR に「合わないかもしれない」と理由を書く）。note にできる1文がページにないときは note を足さない。WebSearch は県と街ごとに2回までにする
- 読むファイル：CLAUDE.md・data/ken-bichiku.yml と data/bichiku.yml の頭の決まり・src/data.mjs の noteErrors と checkBichiku
- マージ：する
- 足した：育てる山の補充（自動・2026-11-11）
