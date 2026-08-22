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
import assert from "node:assert/strict";
import { webcrypto } from "node:crypto";
import { test } from "node:test";
import {
  AES_KEY_BYTES,
  decryptFromHex,
  encryptToHex,
  keyFromHex,
  keyToHex,
} from "./session-cipher";

const randomKey = () =>
  webcrypto.getRandomValues(new Uint8Array(AES_KEY_BYTES));

/** Shaped like a Supabase session and padded past the keychain size ceiling. */
const oversizedSession = JSON.stringify({
  access_token: "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9." + "x".repeat(1800),
  refresh_token: "v1.MRq" + "y".repeat(60),
  expires_at: 1787000000,
  token_type: "bearer",
  user: {
    id: "8f14e45f-ceea-467a-9c1e-7a1b2c3d4e5f",
    email: "libero@example.edu",
    user_metadata: { full_name: "Renée Ödegaard 强", school: "UC Davis" },
  },
});

test("round trips values Supabase actually stores", () => {
  const cases: [string, string][] = [
    ["oversized session", oversizedSession],
    ["empty string", ""],
    ["single character", "x"],
    ["quotes and newlines", '{"a":"b\\nc","d":"\\"e\\""}'],
    ["accents and CJK", "Renée Ödegaard 强强强"],
    ["emoji outside the BMP", "🏐 Davis Club 🇺🇸"],
    ["lone high surrogate is replaced, not thrown", "ok \ud83c"],
  ];

  for (const [label, input] of cases) {
    const key = randomKey();
    const output = decryptFromHex(key, encryptToHex(key, input));
    if (label.startsWith("lone high surrogate")) {
      assert.equal(output, "ok \ufffd", label);
      continue;
    }
    assert.equal(output, input, label);
  }
});

test("only a 64-character key needs to fit in the keychain", () => {
  const keyHex = keyToHex(randomKey());
  assert.equal(keyHex.length, 64);
  assert.ok(
    Buffer.byteLength(oversizedSession) > 2048,
    "fixture must exceed the keychain ceiling for this test to mean anything"
  );
});

test("key survives the hex round trip", () => {
  const key = randomKey();
  assert.deepEqual(keyFromHex(keyToHex(key)), key);
});

test("a fresh key changes the ciphertext despite the fixed counter", () => {
  const first = randomKey();
  const second = randomKey();
  assert.notEqual(keyToHex(first), keyToHex(second));
  assert.notEqual(
    encryptToHex(first, oversizedSession),
    encryptToHex(second, oversizedSession)
  );
});

test("aes-js utf8 is still broken, so the TextEncoder detour is still needed", () => {
  const emoji = "🏐 Davis Club";
  // If this ever starts passing, aes-js fixed its UTF-8 handling and
  // session-cipher.ts could be simplified back to the helper Supabase documents.
  assert.notEqual(
    aesjs.utils.utf8.fromBytes(aesjs.utils.utf8.toBytes(emoji)),
    emoji
  );
});
