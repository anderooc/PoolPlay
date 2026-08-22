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

import AsyncStorage from "@react-native-async-storage/async-storage";
import * as Crypto from "expo-crypto";
import * as SecureStore from "expo-secure-store";
import {
  AES_KEY_BYTES,
  decryptFromHex,
  encryptToHex,
  keyFromHex,
  keyToHex,
} from "./session-cipher";

/*
 * Supabase persists a whole session — access token, refresh token, and the
 * serialized user — as a single string, which routinely exceeds the roughly
 * 2048-byte value size the iOS keychain has historically refused. The failure
 * mode is unpleasant: sign-in appears to work, then the session is gone on next
 * launch.
 *
 * This is Supabase's documented workaround. The session is encrypted and parked
 * in AsyncStorage, which has no size ceiling, while only the 32-byte key goes
 * into the keychain. That key is what an attacker holding a copy of the
 * AsyncStorage file would need, and it never leaves hardware-backed storage.
 *
 * See https://supabase.com/docs/reference/javascript/initializing
 */

export const largeSecureStore = {
  async getItem(key: string): Promise<string | null> {
    const ciphertextHex = await AsyncStorage.getItem(key);
    if (ciphertextHex === null) return null;

    const keyHex = await SecureStore.getItemAsync(key);
    // The blob outlived its key, so it can never be read again — most likely the
    // keychain was cleared independently of app storage. Drop the orphan and let
    // Supabase treat the user as signed out.
    if (keyHex === null) {
      await AsyncStorage.removeItem(key);
      return null;
    }

    return decryptFromHex(keyFromHex(keyHex), ciphertextHex);
  },

  async setItem(key: string, value: string): Promise<void> {
    const encryptionKey = Crypto.getRandomValues(
      new Uint8Array(AES_KEY_BYTES)
    );

    // Key first: a reader that sees the new blob must be able to decrypt it. The
    // reverse order leaves a window where the old key is paired with the new
    // ciphertext, which decrypts to garbage rather than to a clean miss.
    await SecureStore.setItemAsync(key, keyToHex(encryptionKey));
    await AsyncStorage.setItem(key, encryptToHex(encryptionKey, value));
  },

  async removeItem(key: string): Promise<void> {
    await Promise.all([
      AsyncStorage.removeItem(key),
      SecureStore.deleteItemAsync(key),
    ]);
  },
};
