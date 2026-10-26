// zip から1つのファイルを取り出す（依存パッケージなし。無圧縮と deflate だけ）
// 中央ディレクトリ（ファイルの最後）から場所と大きさを読むので、データ記述子つきの zip でも読める
import { inflateRawSync } from 'node:zlib';

export function readZipEntry(buf, match) {
  const b = Buffer.from(buf.buffer ?? buf, buf.byteOffset ?? 0, buf.byteLength ?? buf.length);
  // 終わりの記録（EOCD）をうしろからさがす（コメントは最大 65535 バイト）
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 22 - 65535); i--) {
    if (b.readUInt32LE(i) === 0x06054b50) {
      eocd = i;
      break;
    }
  }
  if (eocd < 0) throw new Error('zip の終わりの記録が見つからない');
  const count = b.readUInt16LE(eocd + 10);
  let p = b.readUInt32LE(eocd + 16);
  const names = [];
  for (let n = 0; n < count; n++) {
    if (b.readUInt32LE(p) !== 0x02014b50) throw new Error('zip の目次がこわれている');
    const method = b.readUInt16LE(p + 10);
    const size = b.readUInt32LE(p + 20);
    const nameLen = b.readUInt16LE(p + 28);
    const extraLen = b.readUInt16LE(p + 30);
    const commentLen = b.readUInt16LE(p + 32);
    const local = b.readUInt32LE(p + 42);
    const name = b.subarray(p + 46, p + 46 + nameLen).toString('latin1');
    names.push(name);
    if (match.test(name)) {
      if (b.readUInt32LE(local) !== 0x04034b50) throw new Error('zip の中身の見出しがこわれている');
      const start = local + 30 + b.readUInt16LE(local + 26) + b.readUInt16LE(local + 28);
      const data = b.subarray(start, start + size);
      if (method === 0) return new Uint8Array(data);
      if (method === 8) return new Uint8Array(inflateRawSync(data));
      throw new Error(`zip の圧縮のしかた ${method} は読めない`);
    }
    p += 46 + nameLen + extraLen + commentLen;
  }
  throw new Error(`zip の中に ${match} がない（${names.join('・')}）`);
}
