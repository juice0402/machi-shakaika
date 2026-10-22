// サイトの設定（まちの社会科）

export const SITE = {
  name: 'まちの社会科',
  // 本番のURL。独自ドメインをつなぐまでは pages.dev
  url: 'https://machi-shakaika.com',
  pagesDev: 'https://machi-shakaika.pages.dev',
  project: 'machi-shakaika',
  // 第1弾の公開まで false：全ページ noindex、robots.txt は全部おことわり
  launched: false,
  lang: 'ja',
};

// e-Stat API のクレジット表示（e-Stat 指定の文言。変えない。API機能利用規約 第7条）
export const ESTAT_CREDIT =
  'このサービスは、政府統計総合窓口(e-Stat)のAPI機能を使用していますが、サービスの内容は国によって保証されたものではありません。';
