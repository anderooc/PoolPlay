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
import {
  ApiError,
  badRequest,
  forbidden,
  statusForErrorCode,
  toApiError,
  tokenExpired,
  unauthorized,
} from "./errors";
import { API_VERSION, jsonError, jsonSuccess } from "./response";

describe("statusForErrorCode", () => {
  it("maps codes to their HTTP status", () => {
    assert.equal(statusForErrorCode("bad_request"), 400);
    assert.equal(statusForErrorCode("unauthorized"), 401);
    assert.equal(statusForErrorCode("token_expired"), 401);
    assert.equal(statusForErrorCode("forbidden"), 403);
    assert.equal(statusForErrorCode("not_found"), 404);
    assert.equal(statusForErrorCode("rate_limited"), 429);
    assert.equal(statusForErrorCode("internal_error"), 500);
  });
});

describe("toApiError", () => {
  it("passes an ApiError through unchanged", () => {
    const original = badRequest("nope");
    assert.equal(toApiError(original), original);
  });

  it("maps the sentinel errors thrown by requireUser and requireAdmin", () => {
    assert.equal(toApiError(new Error("Unauthorized")).code, "unauthorized");
    assert.equal(toApiError(new Error("Forbidden")).code, "forbidden");
  });

  it("collapses unexpected failures so internals do not leak", () => {
    const mapped = toApiError(new Error("connection to db-prod-7 refused"));
    assert.equal(mapped.code, "internal_error");
    assert.equal(mapped.message, "Something went wrong.");
    assert.ok(!mapped.message.includes("db-prod-7"));
  });

  it("handles non-Error throws", () => {
    assert.equal(toApiError("boom").code, "internal_error");
    assert.equal(toApiError(undefined).code, "internal_error");
  });
});

describe("jsonSuccess", () => {
  it("wraps data in the versioned envelope", async () => {
    const response = jsonSuccess({ id: "abc" });
    assert.equal(response.status, 200);
    assert.deepEqual(await response.json(), {
      data: { id: "abc" },
      meta: { version: API_VERSION },
    });
  });

  it("never allows a shared cache to hold a per-caller response", () => {
    const headers = jsonSuccess({}).headers;
    assert.equal(headers.get("Cache-Control"), "no-store, private");
    assert.equal(headers.get("Vary"), "Authorization");
  });

  it("carries pagination cursors in meta", async () => {
    const response = jsonSuccess([], { meta: { cursor: { next: "20" } } });
    const body = (await response.json()) as { meta: { cursor: unknown } };
    assert.deepEqual(body.meta.cursor, { next: "20" });
  });
});

describe("jsonError", () => {
  it("serializes code and message at the documented path", async () => {
    const response = jsonError(unauthorized());
    assert.equal(response.status, 401);
    const body = (await response.json()) as {
      error: { code: string; message: string };
    };
    assert.equal(body.error.code, "unauthorized");
    assert.ok(body.error.message.length > 0);
  });

  it("includes validation details when present", async () => {
    const response = jsonError(
      badRequest("Invalid query parameters.", { limit: ["Too big"] })
    );
    const body = (await response.json()) as {
      error: { details: Record<string, string[]> };
    };
    assert.deepEqual(body.error.details, { limit: ["Too big"] });
  });

  it("omits details when there are none", async () => {
    const body = (await jsonError(forbidden()).json()) as {
      error: Record<string, unknown>;
    };
    assert.ok(!("details" in body.error));
  });

  it("signals refreshable expiry distinctly from a hard 401", () => {
    // The app retries once after refreshing on `expired`, but signs the user
    // out on a plain unauthorized, so these must stay distinguishable.
    const expired = jsonError(tokenExpired());
    const rejected = jsonError(unauthorized());

    assert.match(
      expired.headers.get("WWW-Authenticate") ?? "",
      /expired/
    );
    assert.equal(rejected.headers.get("WWW-Authenticate"), "Bearer");
  });

  it("uses the status carried by the error", () => {
    assert.equal(jsonError(new ApiError("conflict", "dupe")).status, 409);
  });
});
