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
  notificationKindLabel,
  safeInternalHref,
} from "@/lib/notifications/display";

describe("notificationKindLabel", () => {
  it("labels each notification kind", () => {
    assert.equal(notificationKindLabel("tournament_posted"), "Tournament posted");
    assert.equal(notificationKindLabel("tournament_message"), "Host message");
    assert.equal(notificationKindLabel("chat_announcement"), "Announcement");
    assert.equal(notificationKindLabel("registration_update"), "Registration");
  });
});

describe("safeInternalHref", () => {
  it("allows in-app paths only", () => {
    assert.equal(safeInternalHref("/tournaments/spring-invite"), "/tournaments/spring-invite");
    assert.equal(safeInternalHref("/tournaments/x?tab=chat"), "/tournaments/x?tab=chat");
    assert.equal(safeInternalHref("https://example.com"), null);
    assert.equal(safeInternalHref("//evil.example"), null);
    assert.equal(safeInternalHref(null), null);
  });
});
