// サイトの設定（まちの社会科）

export const SITE = {
  name: 'まちの社会科',
  // 本番のURL。独自ドメインをつなぐまでは pages.dev
  url: 'https://machi-shakaika.com',
  pagesDev: 'https://machi-shakaika.pages.dev',
  project: 'machi-shakaika',
  // false のあいだは全ページ noindex、robots.txt は全部おことわり（10/22 公開）
  launched: true,
  lang: 'ja',
  // Google AdSense の運営者ID（ca-pub- から始まる。公開してよい値）。入れると、公開後の全ページ（noindex と noAds はのぞく）の head に
  // AdSense のスクリプトが入り、ビルドが /ads.txt を置く。空のあいだは何も入らない
  adsense: 'ca-pub-7891863499821813',
  // お問い合わせ：全サイト共通の Google フォーム1つ（連絡 C-020）。「どのサイトから」（entry.1872798598）にサイト名を入れた事前入力の URL。
  // 短縮 URL は名前が入らないので使わない。フッターと /about/ から開く
  contact: `https://docs.google.com/forms/d/e/1FAIpQLSdAYN3cjrLkbbFywxHmCS7bqLFtDN0VmlO3NuTVPqKpaFj6Dg/viewform?usp=pp_url&entry.1872798598=${encodeURIComponent('まちの社会科')}`,
};

// e-Stat API のクレジット表示（e-Stat 指定の文言。変えない。API機能利用規約 第7条）
export const ESTAT_CREDIT =
  'このサービスは、政府統計総合窓口(e-Stat)のAPI機能を使用していますが、サービスの内容は国によって保証されたものではありません。';
