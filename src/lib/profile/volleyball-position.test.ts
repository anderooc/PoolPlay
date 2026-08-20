import assert from "node:assert/strict";
import { it } from "node:test";
import {
  parseVolleyballPositionInput,
  volleyballPositionSearchHaystack,
  VOLLEYBALL_POSITION_UNSET,
} from "./volleyball-position";

it("parses volleyball position values including unset", () => {
  assert.equal(parseVolleyballPositionInput("setter"), "setter");
  assert.equal(parseVolleyballPositionInput("libero_ds"), "libero_ds");
  assert.equal(parseVolleyballPositionInput(null), null);
  assert.equal(parseVolleyballPositionInput(""), null);
  assert.equal(parseVolleyballPositionInput(VOLLEYBALL_POSITION_UNSET), null);
  assert.equal(parseVolleyballPositionInput("middle"), "invalid");
  assert.equal(parseVolleyballPositionInput(12), "invalid");
});

it("builds a search haystack from full and short labels", () => {
  assert.equal(
    volleyballPositionSearchHaystack("outside_hitter"),
    "outside hitter oh"
  );
  assert.equal(volleyballPositionSearchHaystack(null), "");
});
