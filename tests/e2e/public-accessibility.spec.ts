/*
 * ShootSet - Collegiate club volleyball tournament hub
 * Copyright (C) 2026 Andrew Chang
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 */

import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";

const publicRoutes = [
  "/",
  "/explore",
  "/about",
  "/login",
  "/signup",
  "/forgot-password",
] as const;

for (const route of publicRoutes) {
  test(`${route} has one main heading and no serious accessibility violations`, async ({
    page,
  }) => {
    await page.goto(route, { waitUntil: "domcontentloaded" });
    await expect(page.locator("h1")).toHaveCount(1);

    const results = await new AxeBuilder({ page })
      .withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa"])
      .analyze();

    const seriousViolations = results.violations.filter((violation) =>
      ["serious", "critical"].includes(violation.impact ?? "")
    );
    expect(seriousViolations).toEqual([]);
  });
}
