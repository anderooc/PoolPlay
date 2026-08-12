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
  LISTING_DESCRIPTION_MIN_LENGTH,
  descriptionMeetsMinLength,
  descriptionMentionsEntryFees,
  eventStartTimeDocumented,
  evaluateListingDetailsChecklist,
  listingDetailsHint,
} from "./listing-details-checklist";

describe("listing details checklist", () => {
  it(`uses min description length of ${LISTING_DESCRIPTION_MIN_LENGTH}`, () => {
    assert.equal(LISTING_DESCRIPTION_MIN_LENGTH, 10);
    assert.equal(descriptionMeetsMinLength("123456789"), false);
    assert.equal(descriptionMeetsMinLength("1234567890"), true);
  });

  it("detects entry fees for first and additional teams", () => {
    assert.equal(
      descriptionMentionsEntryFees(
        "Start 9am. Entry fee first team $200, additional $150."
      ),
      true
    );
    assert.equal(
      descriptionMentionsEntryFees(
        "9am start. $50 first team, $25 each additional team."
      ),
      true
    );
    assert.equal(
      descriptionMentionsEntryFees(
        "Start 10am. Fee first team $50, additional $40."
      ),
      true
    );
    assert.equal(
      descriptionMentionsEntryFees(
        "Pool play 9am. Registration fee: first team $100, each additional $80."
      ),
      true
    );
    assert.equal(
      descriptionMentionsEntryFees(
        "Starts 9am. $200 for first team, $150 for each additional team."
      ),
      true
    );
    assert.equal(
      descriptionMentionsEntryFees("Entry fee $100 per team. Doors open 8am."),
      false
    );
  });

  it("detects start time in description", () => {
    assert.equal(eventStartTimeDocumented("Play begins 9am today.", false), true);
    assert.equal(eventStartTimeDocumented("Doors open at 8:30am.", false), true);
    assert.equal(eventStartTimeDocumented("Tournament starts at 9:00.", false), true);
    assert.equal(eventStartTimeDocumented("", false), false);
    assert.equal(eventStartTimeDocumented(null, true), true);
  });

  it("marks listing step complete when all requirements met", () => {
    const result = evaluateListingDetailsChecklist({
      description:
        "Start 9am. Entry fee first team $200, additional $150.",
      address: "123 Main St",
      hasScheduledMatches: false,
    });
    assert.equal(result.complete, true);
    assert.deepEqual(result, {
      complete: true,
      descriptionMinLength: true,
      hasAddress: true,
      mentionsEntryFees: true,
      documentsStartTime: true,
    });
  });

  it("stays incomplete without address", () => {
    const result = evaluateListingDetailsChecklist({
      description:
        "Start 9am. Entry fee first team $200, additional $150.",
      address: "  ",
      hasScheduledMatches: false,
    });
    assert.equal(result.complete, false);
    assert.equal(result.hasAddress, false);
  });

  it("builds a hint that names missing items", () => {
    const result = evaluateListingDetailsChecklist({
      description: "short",
      address: "",
      hasScheduledMatches: false,
    });
    const hint = listingDetailsHint(result, false);
    assert.equal(
      hint,
      "Add description, address, fees, start time in listing details."
    );
  });
});
