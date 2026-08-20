import assert from "node:assert/strict";
import { it } from "node:test";
import { normalizeAppUrl } from "./metadata";

it("normalizes bare hostnames with https", () => {
  assert.equal(normalizeAppUrl("brack-t.com"), "https://brack-t.com");
});

it("uses http for localhost hosts without a scheme", () => {
  assert.equal(normalizeAppUrl("localhost:3001"), "http://localhost:3001");
});

it("preserves explicit schemes and trims trailing slashes", () => {
  assert.equal(
    normalizeAppUrl("http://localhost:3001/"),
    "http://localhost:3001"
  );
  assert.equal(
    normalizeAppUrl("https://brack-t.com/"),
    "https://brack-t.com"
  );
});

it("returns null for empty values", () => {
  assert.equal(normalizeAppUrl(""), null);
  assert.equal(normalizeAppUrl("   "), null);
  assert.equal(normalizeAppUrl(undefined), null);
});
