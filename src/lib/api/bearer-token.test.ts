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
import { bearerTokenFromHeader, bearerTokenFromRequest } from "./bearer-token";

describe("bearerTokenFromHeader", () => {
  it("extracts the token from a well-formed header", () => {
    assert.equal(bearerTokenFromHeader("Bearer abc.def.ghi"), "abc.def.ghi");
  });

  it("matches the scheme case-insensitively per RFC 7235", () => {
    assert.equal(bearerTokenFromHeader("bearer abc"), "abc");
    assert.equal(bearerTokenFromHeader("BEARER abc"), "abc");
  });

  it("tolerates surrounding and repeated whitespace", () => {
    assert.equal(bearerTokenFromHeader("  Bearer   abc  "), "abc");
    assert.equal(bearerTokenFromHeader("Bearer\tabc"), "abc");
  });

  it("returns null for missing or empty headers", () => {
    assert.equal(bearerTokenFromHeader(null), null);
    assert.equal(bearerTokenFromHeader(undefined), null);
    assert.equal(bearerTokenFromHeader(""), null);
    assert.equal(bearerTokenFromHeader("   "), null);
  });

  it("returns null for other auth schemes", () => {
    assert.equal(bearerTokenFromHeader("Basic dXNlcjpwYXNz"), null);
    assert.equal(bearerTokenFromHeader("Token abc"), null);
  });

  it("rejects a scheme with no credential", () => {
    assert.equal(bearerTokenFromHeader("Bearer"), null);
    assert.equal(bearerTokenFromHeader("Bearer "), null);
  });

  it("rejects tokens containing whitespace", () => {
    // A JWT never contains whitespace, so this means the header was assembled
    // incorrectly and we should not try to guess which part is the token.
    assert.equal(bearerTokenFromHeader("Bearer abc def"), null);
  });
});

describe("bearerTokenFromRequest", () => {
  it("reads the Authorization header off a Request", () => {
    const request = new Request("https://brack-t.com/api/v1/me", {
      headers: { Authorization: "Bearer token-123" },
    });
    assert.equal(bearerTokenFromRequest(request), "token-123");
  });

  it("returns null when the header is absent", () => {
    const request = new Request("https://brack-t.com/api/v1/me");
    assert.equal(bearerTokenFromRequest(request), null);
  });
});
