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
  emailDomain,
  emailMatchesDomain,
  emailMatchesSchoolDomain,
} from "@/lib/schools/email-domain";

describe("emailDomain", () => {
  it("returns the lowercased domain", () => {
    assert.equal(emailDomain("Alex@UCLA.EDU"), "ucla.edu");
  });

  it("rejects missing or invalid emails", () => {
    assert.equal(emailDomain(null), null);
    assert.equal(emailDomain("no-at-sign"), null);
    assert.equal(emailDomain("@ucla.edu"), null);
  });
});

describe("emailMatchesDomain", () => {
  it("requires an exact domain match", () => {
    assert.equal(emailMatchesDomain("a@ucla.edu", "ucla.edu"), true);
    assert.equal(emailMatchesDomain("a@g.ucla.edu", "ucla.edu"), false);
  });
});

describe("emailMatchesSchoolDomain", () => {
  it("matches the school domain and its subdomains", () => {
    assert.equal(emailMatchesSchoolDomain("a@ucla.edu", "ucla.edu"), true);
    assert.equal(emailMatchesSchoolDomain("a@g.ucla.edu", "@UCLA.EDU"), true);
    assert.equal(emailMatchesSchoolDomain("a@mail.g.ucla.edu", "ucla.edu"), true);
  });

  it("does not match a different registrable domain", () => {
    assert.equal(emailMatchesSchoolDomain("a@notucla.edu", "ucla.edu"), false);
    assert.equal(emailMatchesSchoolDomain("a@ucla.edu.evil.com", "ucla.edu"), false);
    assert.equal(emailMatchesSchoolDomain("a@emory.edu", "ucla.edu"), false);
  });
});
