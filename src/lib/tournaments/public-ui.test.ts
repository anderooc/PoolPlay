/*
 * brackt - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { PublicRegistrationAvailability } from "@/components/public-registration-availability";

describe("public tournament availability UI", () => {
  it("renders aggregate availability without exposing applicant identities", () => {
    const html = renderToStaticMarkup(
      createElement(PublicRegistrationAvailability, {
        availability: {
          capacity: 24,
          deadline: "2027-03-01T17:00:00.000Z",
          registeredCount: 24,
          waitlistCount: 3,
        },
      })
    );

    assert.match(html, /24 \/ 24 teams registered/);
    assert.match(html, /March 1, 2027[^<]*5:00 PM UTC/);
    assert.match(html, /3 teams waiting/);
    assert.match(html, /join the existing queue/i);
    assert.doesNotMatch(html, /slots? available/i);
  });

  it("renders unlimited capacity with the active registration count", () => {
    const html = renderToStaticMarkup(
      createElement(PublicRegistrationAvailability, {
        availability: {
          capacity: null,
          deadline: null,
          registeredCount: 60,
          waitlistCount: 0,
        },
      })
    );

    assert.match(html, /Unlimited capacity/);
    assert.match(html, /60 teams registered/);
    assert.match(html, /No teams waiting/);
  });
});
