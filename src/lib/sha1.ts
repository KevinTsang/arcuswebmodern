/**
 * SHA-1 of an ASCII string, synchronously.
 *
 * Only used for the two-byte checksum in Z-Wave QR codes (see zwaveQr.ts),
 * which is not a security check. `crypto.subtle.digest` would do, but it is
 * async and missing on insecure origins, where the QR parser must still work.
 */

function rotl(value: number, bits: number): number {
  return (value << bits) | (value >>> (32 - bits));
}

/** The 20-byte SHA-1 digest of `text`, whose characters must all be below U+0100. */
export function sha1(text: string): Uint8Array {
  const length = text.length;
  // Message, 0x80, zero padding, then the bit length as a 64-bit big-endian number.
  const paddedLength = Math.ceil((length + 9) / 64) * 64;
  const bytes = new Uint8Array(paddedLength);
  for (let i = 0; i < length; i++) bytes[i] = text.charCodeAt(i) & 0xff;
  bytes[length] = 0x80;
  const view = new DataView(bytes.buffer);
  const bitLength = length * 8;
  view.setUint32(paddedLength - 8, Math.floor(bitLength / 0x100000000));
  view.setUint32(paddedLength - 4, bitLength >>> 0);

  let h0 = 0x67452301;
  let h1 = 0xefcdab89;
  let h2 = 0x98badcfe;
  let h3 = 0x10325476;
  let h4 = 0xc3d2e1f0;
  const w = new Uint32Array(80);

  for (let block = 0; block < paddedLength; block += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(block + i * 4);
    for (let i = 16; i < 80; i++) w[i] = rotl(w[i - 3] ^ w[i - 8] ^ w[i - 14] ^ w[i - 16], 1);

    let a = h0;
    let b = h1;
    let c = h2;
    let d = h3;
    let e = h4;
    for (let i = 0; i < 80; i++) {
      let f: number;
      let k: number;
      if (i < 20) {
        f = (b & c) | (~b & d);
        k = 0x5a827999;
      } else if (i < 40) {
        f = b ^ c ^ d;
        k = 0x6ed9eba1;
      } else if (i < 60) {
        f = (b & c) | (b & d) | (c & d);
        k = 0x8f1bbcdc;
      } else {
        f = b ^ c ^ d;
        k = 0xca62c1d6;
      }
      const temp = (rotl(a, 5) + f + e + k + w[i]) >>> 0;
      e = d;
      d = c;
      c = rotl(b, 30) >>> 0;
      b = a;
      a = temp;
    }
    h0 = (h0 + a) >>> 0;
    h1 = (h1 + b) >>> 0;
    h2 = (h2 + c) >>> 0;
    h3 = (h3 + d) >>> 0;
    h4 = (h4 + e) >>> 0;
  }

  const out = new Uint8Array(20);
  const outView = new DataView(out.buffer);
  [h0, h1, h2, h3, h4].forEach((h, i) => outView.setUint32(i * 4, h));
  return out;
}
