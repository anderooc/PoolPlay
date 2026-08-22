/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import * as aesjs from "aes-js";

/*
 * The AES-CTR half of the session store, kept free of native modules so it can
 * be exercised by `npm test` outside a simulator. Key generation and storage
 * live in large-secure-store.ts.
 *
 * Text conversion deliberately avoids `aesjs.utils.utf8`, which corrupts
 * anything outside the BMP: it walks UTF-16 code units without reassembling
 * surrogate pairs, so an emoji in a display name comes back mangled and the
 * session then fails to parse. TextEncoder is spec-correct — Hermes provides it,
 * and Expo's winter runtime provides TextDecoder.
 */

export const AES_KEY_BYTES = 32;

/*
 * A counter of 1 is reused for every value, which is safe only because a fresh
 * key is generated on every write: CTR mode leaks plaintext when a keystream
 * repeats, and the keystream is a function of both key and counter. Never reuse
 * a key across two writes.
 */
function cipherFor(key: Uint8Array) {
  return new aesjs.ModeOfOperation.ctr(key, new aesjs.Counter(1));
}

export function encryptToHex(key: Uint8Array, value: string): string {
  return aesjs.utils.hex.fromBytes(
    cipherFor(key).encrypt(new TextEncoder().encode(value))
  );
}

export function decryptFromHex(key: Uint8Array, ciphertextHex: string): string {
  const plaintext = cipherFor(key).decrypt(
    aesjs.utils.hex.toBytes(ciphertextHex)
  );
  return new TextDecoder().decode(new Uint8Array(plaintext));
}

export function keyToHex(key: Uint8Array): string {
  return aesjs.utils.hex.fromBytes(key);
}

export function keyFromHex(keyHex: string): Uint8Array {
  return new Uint8Array(aesjs.utils.hex.toBytes(keyHex));
}
