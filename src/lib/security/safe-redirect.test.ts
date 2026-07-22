/*
 * ShootSet - Collegiate club volleyball tournament hub
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
import { safeRedirectPath } from "./safe-redirect";

describe("safeRedirectPath", () => {
  it("allows same-origin relative paths", () => {
    assert.equal(safeRedirectPath("/dashboard"), "/dashboard");
    assert.equal(safeRedirectPath("/tournaments/foo"), "/tournaments/foo");
  });

  it("rejects protocol-relative and absolute URLs", () => {
    assert.equal(safeRedirectPath("//evil.com"), "/dashboard");
    assert.equal(safeRedirectPath("https://evil.com"), "/dashboard");
    assert.equal(safeRedirectPath("/\\evil.com"), "/dashboard");
  });

  it("uses fallback for empty values", () => {
    assert.equal(safeRedirectPath(null), "/dashboard");
    assert.equal(safeRedirectPath(""), "/dashboard");
    assert.equal(safeRedirectPath(undefined, "/login"), "/login");
  });
});
