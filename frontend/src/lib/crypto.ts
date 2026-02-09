/**
 * E2EE暗号化データのデコードユーティリティ
 * サーバーがBYTEA→Base64で返却するデータをフロントエンドでデコードする
 *
 * 重要: atob()はBase64→Latin-1バイナリ文字列に変換するが、
 * 日本語などのUTF-8マルチバイト文字は正しくデコードできない。
 * TextDecoderを使ってUTF-8バイト列→文字列に変換する必要がある。
 */

/** Base64エンコードされたUTF-8文字列をデコード。失敗時は元の文字列を返す */
export function decodeBase64(encoded: string): string {
  try {
    const binaryString = atob(encoded);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
  } catch {
    return encoded;
  }
}

/** Base64エンコードされた数値文字列をデコードしてnumberに変換 */
export function decodeAmount(encoded: string): number {
  try {
    const decoded = decodeBase64(encoded);
    const num = Number(decoded);
    return isNaN(num) ? 0 : num;
  } catch {
    const num = Number(encoded);
    return isNaN(num) ? 0 : num;
  }
}

/** 金額を万円表記にフォーマット */
export function formatManYen(amount: number): string {
  if (Math.abs(amount) >= 10000) {
    return `${(amount / 10000).toFixed(1)}万円`;
  }
  return `${amount.toLocaleString()}円`;
}
