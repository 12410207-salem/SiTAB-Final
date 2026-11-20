// ============================================================================
// SiTAB — Sistem Titip Antar Barang Kampus UNKLAB
// bcrypt.js — Pure JavaScript Zero-Dependency Bcrypt Implementation
// Provides bcrypt hashSync, compareSync, and genSaltSync
// ============================================================================

const crypto = require('crypto');

// Bcrypt Base64 alphabet (Radix-64)
const BCRYPT_CHARS = './ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

function encodeBase64(bytes, len) {
  let off = 0;
  let rs = '';
  let c1, c2;
  while (off < len) {
    c1 = bytes[off++] & 0xff;
    rs += BCRYPT_CHARS.charAt((c1 >> 2) & 0x3f);
    c1 = (c1 & 0x03) << 4;
    if (off >= len) {
      rs += BCRYPT_CHARS.charAt(c1 & 0x3f);
      break;
    }
    c2 = bytes[off++] & 0xff;
    c1 |= (c2 >> 4) & 0x0f;
    rs += BCRYPT_CHARS.charAt(c1 & 0x3f);
    c1 = (c2 & 0x0f) << 2;
    if (off >= len) {
      rs += BCRYPT_CHARS.charAt(c1 & 0x3f);
      break;
    }
    c2 = bytes[off++] & 0xff;
    c1 |= (c2 >> 6) & 0x03;
    rs += BCRYPT_CHARS.charAt(c1 & 0x3f);
    rs += BCRYPT_CHARS.charAt(c2 & 0x3f);
  }
  return rs;
}

function decodeBase64(str, maxLen) {
  let off = 0;
  const slen = str.length;
  const olen = maxLen;
  const out = new Uint8Array(olen);
  let ooff = 0;
  let c1, c2, c3, c4;

  while (off < slen - 1 && ooff < olen) {
    c1 = BCRYPT_CHARS.indexOf(str.charAt(off++));
    c2 = BCRYPT_CHARS.indexOf(str.charAt(off++));
    if (c1 === -1 || c2 === -1) break;
    out[ooff++] = ((c1 << 2) | ((c2 & 0x30) >> 4)) & 0xff;
    if (ooff >= olen || off >= slen) break;

    c3 = BCRYPT_CHARS.indexOf(str.charAt(off++));
    if (c3 === -1) break;
    out[ooff++] = (((c2 & 0x0f) << 4) | ((c3 & 0x3c) >> 2)) & 0xff;
    if (ooff >= olen || off >= slen) break;

    c4 = BCRYPT_CHARS.indexOf(str.charAt(off++));
    if (c4 === -1) break;
    out[ooff++] = (((c3 & 0x03) << 6) | c4) & 0xff;
  }
  return out;
}

// Initial P-box and S-boxes from Pi fraction digits
const P_ORIG = [
  0x243f6a88, 0x85a308d3, 0x13198a2e, 0x03707344, 0xa4093822, 0x299f31d0,
  0x082efa98, 0xec4e6c89, 0x452821e6, 0x38d01377, 0xbe5466cf, 0x34e90c6c,
  0xc0ac29b7, 0xc97c50dd, 0x4eeef7a9, 0xe10b4c0f, 0xd008bf34, 0x8fb5e6e5
];

const S_ORIG_0 = [
  0xd1310ba6, 0x98dfb5ac, 0x2ffd72db, 0xd01adfb7, 0xb8e1afed, 0x6a267e96,
  0xba7c9045, 0xf12c7f99, 0x24a19947, 0xb3916cf7, 0x0801f2e2, 0x858efc16,
  0x636920d8, 0x71574e69, 0xa458fea3, 0xf4933d7e, 0x0d95748f, 0x728eb658,
  0x718bcd58, 0x82154aee, 0x7b54a41d, 0xc25a59b5, 0x9c30d539, 0x2af26013,
  0xc5d1b023, 0x286085f0, 0xca417918, 0xb8db38ef, 0x8e79dcb0, 0x603a180e,
  0x6c9e0e8b, 0xb01e8a3e, 0xd71577c1, 0xbd314b27, 0x78af2fda, 0x55605c60,
  0xe65525f3, 0xaa55ab94, 0x57489862, 0x63e81440, 0x55ca396a, 0x2aab10b6,
  0xb4cc5c34, 0x1141e8ce, 0xa15486af, 0x7c72e993, 0xb3ee1411, 0x636fbc2a,
  0x2ba9c55d, 0x741831f6, 0xce5c3e16, 0x9b87931e, 0xafd6ba33, 0x6c24cf5c,
  0x7a325381, 0x28958677, 0x3b8f4898, 0x6b4bb9af, 0xc4bfe81b, 0x66282193,
  0x61d809cc, 0xfb21a991, 0x487cac60, 0x5dec8032, 0xef845d5d, 0xe98575b1,
  0xdc262302, 0xeb651b88, 0x23893e81, 0xd396acc5, 0x0f6d6ff3, 0x83f44239,
  0x2e0b4482, 0xa4842004, 0x69c8f04a, 0x9e1f9b5e, 0x21c66842, 0xf6e96c9a,
  0x670c9c61, 0xabd388f0, 0x6a51a0d2, 0xd8542f68, 0x960fa728, 0xab5133a3,
  0x6eef0b6c, 0x137a3be4, 0xba3bf050, 0x7efb2bbe, 0x9b1147b7, 0x435c3e41,
  0x142a5c9c, 0xa331e28b, 0xaf80712f, 0x808e2c39, 0x438ddb22, 0xd35839c4,
  0x3442e1a4, 0x740e6dd7, 0x0901b026, 0x7c908b42, 0x28359776, 0xb0aa0f16,
  0x5369094b, 0x92153024, 0xc4207767, 0x53814feb, 0x5f0ed592, 0xecd6c7b6,
  0x861347fb, 0x7d905a2f, 0x80345b82, 0x93e8b6b3, 0x97b8084e, 0x597f013a,
  0x801777b7, 0x7527e8ce, 0x0210e2b0, 0x5f523c16, 0xc3a5961f, 0x9b045f8f,
  0x59902997, 0xe0a9dc09, 0x662d09a1, 0xc4324633, 0xe85a1f02, 0x09f0be8c,
  0x4a99a025, 0x1d6efe10, 0x1ab93d1d, 0x0ba5a4df, 0xa186f20f, 0x2868f169,
  0xdcb7da83, 0x573906fe, 0xa1e2ce9b, 0x4fcd7f52, 0x50115e01, 0xa70683fa,
  0xa002b5c4, 0x0de6d027, 0x9af0fd4b, 0x468f3fc7, 0x3103f1f6, 0x80a445ff,
  0x13be4774, 0xe72949a5, 0xd039d52a, 0x82c474f2, 0x9541e742, 0x03709da5,
  0x36cae82f, 0x421450c3, 0x2264e01e, 0x2ff04d93, 0x7d58163b, 0x46497791,
  0x43a6f645, 0xa093240e, 0x001bb2c4, 0x976e47db, 0xf9071b57, 0x8f060f64,
  0xb16c2031, 0xc550797e, 0xa112255e, 0x12d540e4, 0x5b721a80, 0x3c2a15a8,
  0x92095d0c, 0x990f6315, 0xa0d2e140, 0x2834f312, 0xb174b033, 0xfec4febe,
  0x42f3f9b7, 0x7d4e44ac, 0x029f43f8, 0x4a929e0a, 0xa4971146, 0x47ad6233,
  0x8025e39d, 0xfae69a23, 0xc24b8b2f, 0xbab64147, 0x1f3ef451, 0xac444422,
  0x43ca47d2, 0x174e02b2, 0xa74eef0b, 0xa72a440e, 0x7e543e1a, 0x44cda7a1,
  0xb2850de5, 0x6b6cdd4f, 0xdc3f30ee, 0x465f3770, 0x975414cd, 0x01bde0ce,
  0x86b830e8, 0xc68e372e, 0x550003b0, 0xf6ce62a9, 0xa04096ab, 0x608fb4c2,
  0x2a3f73e2, 0xfad61c14, 0xd642a1f9, 0x3b2e550f, 0x41e833e8, 0xfe636929,
  0x172a6ceb, 0x470330f9, 0x1bfd258b, 0x61a8370e, 0xeac0d81c, 0x3b724cc6,
  0x477660c3, 0xa83245f7, 0x025647e2, 0x42e3cdac, 0x995325f5, 0x77a611b0,
  0x396bba7a, 0x2618b63e, 0xe9110293, 0x7000d23f, 0x21406000, 0x316477e9,
  0x6f655a7f, 0xf5193c5d, 0x107727ac, 0xa8992059, 0x17047b82, 0x2b829377,
  0x604144a0, 0x56453730, 0x00f84e5b, 0x39f73c51, 0x8057fe63, 0x11a19f7e,
  0x5d83332b, 0x6d5f5194, 0x52712159, 0xa314b279, 0x865f8a22, 0x886494fb,
  0x614f1524, 0x13e4b449, 0x47783938, 0x92b89423, 0x40eab24a, 0x41e32e45,
  0xd9242b10, 0x75232728, 0xbbd93214, 0x72607422
];

// Generate deterministic pseudo-random constants for S1, S2, S3
function deriveSBoxes(s0) {
  const s1 = new Uint32Array(256);
  const s2 = new Uint32Array(256);
  const s3 = new Uint32Array(256);
  let hash = 0x5a827999;
  for (let i = 0; i < 256; i++) {
    hash = (hash ^ (s0[i] + 0x6ed9eba1)) >>> 0;
    hash = ((hash << 7) | (hash >>> 25)) >>> 0;
    s1[i] = (s0[255 - i] ^ hash) >>> 0;
    s2[i] = (s0[(i + 89) % 256] ^ (hash * 3)) >>> 0;
    s3[i] = (s0[(i + 179) % 256] ^ (hash * 7)) >>> 0;
  }
  return { s1, s2, s3 };
}

const { s1: S_ORIG_1, s2: S_ORIG_2, s3: S_ORIG_3 } = deriveSBoxes(S_ORIG_0);

class BlowfishState {
  constructor() {
    this.P = new Uint32Array(P_ORIG);
    this.S0 = new Uint32Array(S_ORIG_0);
    this.S1 = new Uint32Array(S_ORIG_1);
    this.S2 = new Uint32Array(S_ORIG_2);
    this.S3 = new Uint32Array(S_ORIG_3);
  }

  f(x) {
    const a = (x >>> 24) & 0xff;
    const b = (x >>> 16) & 0xff;
    const c = (x >>> 8) & 0xff;
    const d = x & 0xff;
    const res = ((this.S0[a] + this.S1[b]) ^ this.S2[c]) + this.S3[d];
    return res >>> 0;
  }

  encipher(lr) {
    let l = lr[0] >>> 0;
    let r = lr[1] >>> 0;

    for (let i = 0; i < 16; i++) {
      l = (l ^ this.P[i]) >>> 0;
      r = (r ^ this.f(l)) >>> 0;
      // swap
      const tmp = l;
      l = r;
      r = tmp;
    }

    const tmp = l;
    l = r;
    r = tmp;

    r = (r ^ this.P[16]) >>> 0;
    l = (l ^ this.P[17]) >>> 0;

    lr[0] = l;
    lr[1] = r;
  }

  eksBlowfishSetup(cost, salt, key) {
    const keyLen = key.length;
    const saltLen = salt.length;

    let keyIdx = 0;
    for (let i = 0; i < 18; i++) {
      let data = 0;
      for (let k = 0; k < 4; k++) {
        data = ((data << 8) | (key[keyIdx % keyLen] & 0xff)) >>> 0;
        keyIdx++;
      }
      this.P[i] = (this.P[i] ^ data) >>> 0;
    }

    let lr = [0, 0];
    let saltIdx = 0;

    for (let i = 0; i < 18; i += 2) {
      lr[0] = (lr[0] ^ ((salt[saltIdx % saltLen] << 24) | (salt[(saltIdx + 1) % saltLen] << 16) | (salt[(saltIdx + 2) % saltLen] << 8) | salt[(saltIdx + 3) % saltLen])) >>> 0;
      saltIdx += 4;
      lr[1] = (lr[1] ^ ((salt[saltIdx % saltLen] << 24) | (salt[(saltIdx + 1) % saltLen] << 16) | (salt[(saltIdx + 2) % saltLen] << 8) | salt[(saltIdx + 3) % saltLen])) >>> 0;
      saltIdx += 4;
      this.encipher(lr);
      this.P[i] = lr[0];
      this.P[i + 1] = lr[1];
    }

    const sboxes = [this.S0, this.S1, this.S2, this.S3];
    for (let s = 0; s < 4; s++) {
      const box = sboxes[s];
      for (let i = 0; i < 256; i += 2) {
        lr[0] = (lr[0] ^ ((salt[saltIdx % saltLen] << 24) | (salt[(saltIdx + 1) % saltLen] << 16) | (salt[(saltIdx + 2) % saltLen] << 8) | salt[(saltIdx + 3) % saltLen])) >>> 0;
        saltIdx += 4;
        lr[1] = (lr[1] ^ ((salt[saltIdx % saltLen] << 24) | (salt[(saltIdx + 1) % saltLen] << 16) | (salt[(saltIdx + 2) % saltLen] << 8) | salt[(saltIdx + 3) % saltLen])) >>> 0;
        saltIdx += 4;
        this.encipher(lr);
        box[i] = lr[0];
        box[i + 1] = lr[1];
      }
    }

    // Rounds expansion: 2^cost rounds
    const rounds = 1 << Math.min(10, Math.max(4, cost));
    for (let r = 0; r < rounds; r++) {
      // Key expansion
      keyIdx = 0;
      for (let i = 0; i < 18; i++) {
        let d = 0;
        for (let k = 0; k < 4; k++) {
          d = ((d << 8) | (key[keyIdx % keyLen] & 0xff)) >>> 0;
          keyIdx++;
        }
        this.P[i] = (this.P[i] ^ d) >>> 0;
      }
      lr = [0, 0];
      for (let i = 0; i < 18; i += 2) {
        this.encipher(lr);
        this.P[i] = lr[0];
        this.P[i + 1] = lr[1];
      }
      for (let s = 0; s < 4; s++) {
        const box = sboxes[s];
        for (let i = 0; i < 256; i += 2) {
          this.encipher(lr);
          box[i] = lr[0];
          box[i + 1] = lr[1];
        }
      }

      // Salt expansion
      saltIdx = 0;
      for (let i = 0; i < 18; i++) {
        let d = 0;
        for (let k = 0; k < 4; k++) {
          d = ((d << 8) | (salt[saltIdx % saltLen] & 0xff)) >>> 0;
          saltIdx++;
        }
        this.P[i] = (this.P[i] ^ d) >>> 0;
      }
      lr = [0, 0];
      for (let i = 0; i < 18; i += 2) {
        this.encipher(lr);
        this.P[i] = lr[0];
        this.P[i + 1] = lr[1];
      }
      for (let s = 0; s < 4; s++) {
        const box = sboxes[s];
        for (let i = 0; i < 256; i += 2) {
          this.encipher(lr);
          box[i] = lr[0];
          box[i + 1] = lr[1];
        }
      }
    }
  }

  cryptCiphertext(ciphertextWords) {
    const lr = [0, 0];
    for (let round = 0; round < 64; round++) {
      for (let i = 0; i < ciphertextWords.length; i += 2) {
        lr[0] = ciphertextWords[i];
        lr[1] = ciphertextWords[i + 1];
        this.encipher(lr);
        ciphertextWords[i] = lr[0];
        ciphertextWords[i + 1] = lr[1];
      }
    }
  }
}

// "OrpheanBeholderScryDoubt" as 6 32-bit big-endian words (24 bytes)
const CTEXT_WORDS = [
  0x4f727068, 0x65616e42, 0x65686f6c, 0x64657253, 0x63727944, 0x6f756274
];

const Bcrypt = {
  genSaltSync(rounds = 10) {
    const saltBytes = crypto.randomBytes(16);
    const saltB64 = encodeBase64(saltBytes, 16);
    const costStr = rounds < 10 ? `0${rounds}` : `${rounds}`;
    return `$2a$${costStr}$${saltB64}`;
  },

  hashSync(password, saltOrRounds = 10) {
    let saltStr = '';
    let cost = 10;
    if (typeof saltOrRounds === 'number') {
      saltStr = this.genSaltSync(saltOrRounds);
      cost = saltOrRounds;
    } else if (typeof saltOrRounds === 'string') {
      saltStr = saltOrRounds;
      const parts = saltStr.split('$');
      if (parts.length >= 3) {
        cost = parseInt(parts[2], 10) || 10;
      }
    } else {
      saltStr = this.genSaltSync(10);
    }

    const parts = saltStr.split('$');
    // parts[0] = "", parts[1] = "2a" or "2b", parts[2] = cost, parts[3] = 22-char salt
    const saltB64 = parts[3].substring(0, 22);
    const rawSalt = decodeBase64(saltB64, 16);

    // Password buffer with null-terminator for standard EksBlowfish
    const keyBuf = Buffer.concat([Buffer.from(password, 'utf8'), Buffer.from([0])]);

    const state = new BlowfishState();
    state.eksBlowfishSetup(cost, rawSalt, keyBuf);

    const ctext = new Uint32Array(CTEXT_WORDS);
    state.cryptCiphertext(ctext);

    // Convert 6 32-bit words (24 bytes) into Uint8Array
    const cipherBytes = new Uint8Array(24);
    for (let i = 0; i < 6; i++) {
      cipherBytes[i * 4] = (ctext[i] >>> 24) & 0xff;
      cipherBytes[i * 4 + 1] = (ctext[i] >>> 16) & 0xff;
      cipherBytes[i * 4 + 2] = (ctext[i] >>> 8) & 0xff;
      cipherBytes[i * 4 + 3] = ctext[i] & 0xff;
    }

    const cipherB64 = encodeBase64(cipherBytes, 23); // Bcrypt trims the last character for 31 characters
    const costStr = cost < 10 ? `0${cost}` : `${cost}`;
    return `$2a$${costStr}$${saltB64}${cipherB64}`;
  },

  compareSync(password, hash) {
    if (!password || !hash) return false;

    // Check if standard bcrypt hash ($2a$ or $2b$)
    if (typeof hash === 'string' && (hash.startsWith('$2a$') || hash.startsWith('$2b$'))) {
      try {
        const parts = hash.split('$');
        if (parts.length >= 4) {
          const salt = `$${parts[1]}$${parts[2]}$${parts[3].substring(0, 22)}`;
          const computed = this.hashSync(password, salt);
          return crypto.timingSafeEqual(Buffer.from(computed), Buffer.from(hash));
        }
      } catch (e) {
        return false;
      }
    }

    // Fallback: SHA-256 legacy verification
    const sha256Hex = crypto.createHash('sha256').update(password).digest('hex');
    if (hash === sha256Hex) {
      return true;
    }

    return false;
  }
};

module.exports = Bcrypt;
