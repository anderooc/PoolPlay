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

import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

/*
 * The mobile app imports these modules directly across the repo boundary. If a
 * contract starts importing server code, the mobile TypeScript build pulls in
 * Drizzle and `next/*` and breaks in ways that are slow to diagnose from the
 * Metro side. Cheaper to fail here.
 */

const CONTRACTS_DIR = dirname(fileURLToPath(import.meta.url));

/** Only modules that are themselves free of runtime dependencies. */
const ALLOWED_IMPORT_SOURCES = new Set(["@/types"]);

function contractFiles(): string[] {
  return readdirSync(CONTRACTS_DIR)
    .filter((name) => name.endsWith(".ts") && !name.endsWith(".test.ts"))
    .sort();
}

function importStatements(source: string): { statement: string; from: string }[] {
  const results: { statement: string; from: string }[] = [];
  const pattern = /^\s*(import\b[^;]*?|export\b[^;]*?)\s+from\s+["']([^"']+)["']/gm;

  let match: RegExpExecArray | null;
  while ((match = pattern.exec(source)) !== null) {
    results.push({ statement: match[1], from: match[2] });
  }
  return results;
}

describe("api contracts stay dependency-free", () => {
  it("finds the contract modules", () => {
    const files = contractFiles();
    assert.ok(files.length >= 3, `expected contract modules, saw ${files}`);
    assert.ok(files.includes("envelope.ts"));
  });

  for (const file of contractFiles()) {
    it(`${file} imports only pure modules, and only as types`, () => {
      const source = readFileSync(join(CONTRACTS_DIR, file), "utf8");

      for (const { statement, from } of importStatements(source)) {
        // Sibling contracts are pure by the same rule this test enforces.
        const isSibling = from.startsWith("./") || from.startsWith("../contracts/");
        assert.ok(
          isSibling || ALLOWED_IMPORT_SOURCES.has(from),
          `${file} imports "${from}", which is not known to be dependency-free`
        );

        if (!isSibling) {
          assert.match(
            statement,
            /\btype\b/,
            `${file} must import "${from}" with "import type" so nothing survives compilation`
          );
        }
      }
    });

    it(`${file} has no side-effect or dynamic imports`, () => {
      const source = readFileSync(join(CONTRACTS_DIR, file), "utf8");

      assert.doesNotMatch(
        source,
        /^\s*import\s+["']/m,
        `${file} has a bare side-effect import`
      );
      assert.doesNotMatch(source, /\brequire\s*\(/, `${file} uses require()`);
      assert.doesNotMatch(source, /\bimport\s*\(/, `${file} uses dynamic import()`);
    });
  }
});
