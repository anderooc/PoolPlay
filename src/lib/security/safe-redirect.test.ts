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
