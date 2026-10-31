// A8.net の広告リンク（連絡 C-014。10/31 しょーくんが A8 の管理画面の「広告リンク」から、サイト 002 まちの社会科の「通常広告用」のテキスト素材をコピー）
// コードは A8 から受け取ったまま（文・rel・1px の画像を書きかえない）。置くのは答えのあとに1ページ1つ、「広告」の表示つき
// 置かないページ：楽天の品目ページ・クイズ・今日の1問・まなびプリント・防災カルテ（verify-dist が見張る）
// 新しく足すときは、しょーくんにコードを頼む（夜の作業では広告のIDをさわらない）

const CODES = {
  // スツーレ（非常用トイレ）→ /sonae/keitai-toilet/
  stoole: '<a href="https://px.a8.net/svt/ejp?a8mat=4BES24+CAYJMI+5VK4+5YRHE" rel="nofollow">【スツーレ】</a>\n<img border="0" width="1" height="1" src="https://www16.a8.net/0.gif?a8mat=4BES24+CAYJMI+5VK4+5YRHE" alt="">',
  // Jackery（ポータブル電源）→ /sonae/fuyu-teiden/
  jackery: '<a href="https://px.a8.net/svt/ejp?a8mat=4BES24+C6SIE2+4NJ4+5YRHE" rel="nofollow">Jackery（ジャクリ）のポータブル電源</a>\n<img border="0" width="1" height="1" src="https://www13.a8.net/0.gif?a8mat=4BES24+C6SIE2+4NJ4+5YRHE" alt="">',
  // 防災士監修の防災セット → /dougu/check/
  bousaiset: '<a href="https://px.a8.net/svt/ejp?a8mat=4BES24+BX9KPM+5HQC+5YJRM" rel="nofollow">防災士監修の防災グッズ44点セット</a>\n<img border="0" width="1" height="1" src="https://www12.a8.net/0.gif?a8mat=4BES24+BX9KPM+5HQC+5YJRM" alt="">',
};

// 「広告」の表示と、A8 のコードそのまま（楽天の品目ページの「PR」と同じ形）
export const a8Ad = (key) => `<p class="pr"><b>広告</b>　${CODES[key]}</p>`;
