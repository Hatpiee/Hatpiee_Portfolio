// SHA-256 and AES-256-CBC decryption in plain JS, for when Web Crypto is unavailable:
// browsers only provide crypto.subtle on HTTPS or localhost, so a dev server opened over
// http://<LAN IP> from a phone would otherwise leave the hero without its character.
// decrypt.ts loads this only in that case; production (HTTPS) keeps using Web Crypto.

const K = new Uint32Array([
  0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5,
  0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3, 0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174,
  0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967,
  0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13, 0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85,
  0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3,
  0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208, 0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

export function sha256(data: Uint8Array): Uint8Array {
  const bitLength = data.length * 8;
  const padded = new Uint8Array(((data.length + 9 + 63) >> 6) << 6);
  padded.set(data);
  padded[data.length] = 0x80;
  const view = new DataView(padded.buffer);
  view.setUint32(padded.length - 8, Math.floor(bitLength / 2 ** 32));
  view.setUint32(padded.length - 4, bitLength >>> 0);

  const h = new Uint32Array([
    0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
  ]);
  const w = new Uint32Array(64);
  const rotr = (x: number, n: number) => (x >>> n) | (x << (32 - n));
  for (let offset = 0; offset < padded.length; offset += 64) {
    for (let i = 0; i < 16; i++) w[i] = view.getUint32(offset + i * 4);
    for (let i = 16; i < 64; i++) {
      const s0 = rotr(w[i - 15], 7) ^ rotr(w[i - 15], 18) ^ (w[i - 15] >>> 3);
      const s1 = rotr(w[i - 2], 17) ^ rotr(w[i - 2], 19) ^ (w[i - 2] >>> 10);
      w[i] = (w[i - 16] + s0 + w[i - 7] + s1) >>> 0;
    }
    let [a, b, c, d, e, f, g, hh] = h;
    for (let i = 0; i < 64; i++) {
      const t1 =
        (hh + (rotr(e, 6) ^ rotr(e, 11) ^ rotr(e, 25)) + ((e & f) ^ (~e & g)) + K[i] + w[i]) >>> 0;
      const t2 = ((rotr(a, 2) ^ rotr(a, 13) ^ rotr(a, 22)) + ((a & b) ^ (a & c) ^ (b & c))) >>> 0;
      hh = g;
      g = f;
      f = e;
      e = (d + t1) >>> 0;
      d = c;
      c = b;
      b = a;
      a = (t1 + t2) >>> 0;
    }
    h[0] += a;
    h[1] += b;
    h[2] += c;
    h[3] += d;
    h[4] += e;
    h[5] += f;
    h[6] += g;
    h[7] += hh;
  }
  const out = new Uint8Array(32);
  const outView = new DataView(out.buffer);
  h.forEach((word, i) => outView.setUint32(i * 4, word));
  return out;
}

// AES tables: S-box, its inverse, and GF(2^8) products used by InvMixColumns.
const SBOX = new Uint8Array(256);
const INV_SBOX = new Uint8Array(256);
const MUL9 = new Uint8Array(256);
const MUL11 = new Uint8Array(256);
const MUL13 = new Uint8Array(256);
const MUL14 = new Uint8Array(256);
{
  const xtime = (x: number) => ((x << 1) ^ (x & 0x80 ? 0x1b : 0)) & 0xff;
  const mul = (x: number, y: number) => {
    let result = 0;
    for (; y; y >>= 1, x = xtime(x)) if (y & 1) result ^= x;
    return result;
  };
  const rotl8 = (x: number, s: number) => ((x << s) | (x >> (8 - s))) & 0xff;
  let p = 1;
  let q = 1;
  do {
    p = (p ^ (p << 1) ^ (p & 0x80 ? 0x1b : 0)) & 0xff; // p * 3
    q = (q ^ (q << 1)) & 0xff; // q / 3
    q = (q ^ (q << 2)) & 0xff;
    q = (q ^ (q << 4)) & 0xff;
    if (q & 0x80) q ^= 0x09;
    SBOX[p] = q ^ rotl8(q, 1) ^ rotl8(q, 2) ^ rotl8(q, 3) ^ rotl8(q, 4) ^ 0x63;
  } while (p !== 1);
  SBOX[0] = 0x63;
  for (let i = 0; i < 256; i++) {
    INV_SBOX[SBOX[i]] = i;
    MUL9[i] = mul(i, 9);
    MUL11[i] = mul(i, 11);
    MUL13[i] = mul(i, 13);
    MUL14[i] = mul(i, 14);
  }
}

function expandKey256(key: Uint8Array): Uint8Array {
  const w = new Uint8Array(240);
  w.set(key);
  const t = new Uint8Array(4);
  let rcon = 1;
  for (let i = 32; i < 240; i += 4) {
    t.set(w.subarray(i - 4, i));
    if (i % 32 === 0) {
      const first = t[0];
      t[0] = SBOX[t[1]] ^ rcon;
      t[1] = SBOX[t[2]];
      t[2] = SBOX[t[3]];
      t[3] = SBOX[first];
      rcon = ((rcon << 1) ^ (rcon & 0x80 ? 0x1b : 0)) & 0xff;
    } else if (i % 32 === 16) {
      for (let j = 0; j < 4; j++) t[j] = SBOX[t[j]];
    }
    for (let j = 0; j < 4; j++) w[i + j] = w[i - 32 + j] ^ t[j];
  }
  return w;
}

// AES-256-CBC with PKCS#7 padding, matching crypto.subtle.decrypt({ name: "AES-CBC" }).
export function aes256CbcDecrypt(key: Uint8Array, iv: Uint8Array, data: Uint8Array): Uint8Array {
  const roundKeys = expandKey256(key);
  const out = new Uint8Array(data.length);
  const s = new Uint8Array(16);
  const tmp = new Uint8Array(16);
  let prev = iv;
  for (let offset = 0; offset < data.length; offset += 16) {
    const block = data.subarray(offset, offset + 16);
    for (let i = 0; i < 16; i++) s[i] = block[i] ^ roundKeys[224 + i];
    for (let round = 13; round >= 0; round--) {
      // InvShiftRows + InvSubBytes (state is column-major: byte r + 4c).
      for (let c = 0; c < 4; c++) {
        for (let r = 0; r < 4; r++) tmp[r + 4 * c] = INV_SBOX[s[r + 4 * ((c - r + 4) & 3)]];
      }
      const rk = round * 16;
      for (let i = 0; i < 16; i++) s[i] = tmp[i] ^ roundKeys[rk + i];
      if (round === 0) break;
      for (let c = 0; c < 16; c += 4) {
        const a0 = s[c], a1 = s[c + 1], a2 = s[c + 2], a3 = s[c + 3];
        s[c] = MUL14[a0] ^ MUL11[a1] ^ MUL13[a2] ^ MUL9[a3];
        s[c + 1] = MUL9[a0] ^ MUL14[a1] ^ MUL11[a2] ^ MUL13[a3];
        s[c + 2] = MUL13[a0] ^ MUL9[a1] ^ MUL14[a2] ^ MUL11[a3];
        s[c + 3] = MUL11[a0] ^ MUL13[a1] ^ MUL9[a2] ^ MUL14[a3];
      }
    }
    for (let i = 0; i < 16; i++) out[offset + i] = s[i] ^ prev[i];
    prev = block;
  }
  const pad = out[out.length - 1];
  if (pad < 1 || pad > 16) throw new Error("AES-CBC: bad padding");
  return out.subarray(0, out.length - pad);
}
