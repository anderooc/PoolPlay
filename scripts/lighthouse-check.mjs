#!/usr/bin/env node

import { spawn } from "node:child_process";
import lighthouse from "lighthouse";
import * as chromeLauncher from "chrome-launcher";
import { chromium } from "playwright";

const externalBaseUrl = process.env.E2E_BASE_URL?.replace(/\/$/, "");
const localBaseUrl = "http://127.0.0.1:3100";
const baseUrl = externalBaseUrl ?? localBaseUrl;
const routes = ["/", "/explore", "/about"];
const categories = ["performance", "accessibility", "best-practices", "seo"];
const minimumScores = {
  accessibility: 0.9,
  "best-practices": 0.9,
  seo: 0.9,
};

async function waitForServer(url) {
  const deadline = Date.now() + 30_000;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(url);
      if (response.ok) return;
    } catch {
      // Server is still starting.
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  throw new Error(`Timed out waiting for ${url}`);
}

function median(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)];
}

let server;
let chrome;
let failed = false;

try {
  if (!externalBaseUrl) {
    server = spawn(
      "npm",
      ["run", "start", "--", "--hostname", "127.0.0.1", "--port", "3100"],
      { stdio: "inherit" }
    );
    await waitForServer(localBaseUrl);
  }

  chrome = await chromeLauncher.launch({
    chromePath: chromium.executablePath(),
    chromeFlags: ["--headless", "--no-sandbox", "--disable-gpu"],
  });

  for (const route of routes) {
    const runs = [];
    for (let run = 0; run < 2; run += 1) {
      const result = await lighthouse(`${baseUrl}${route}`, {
        port: chrome.port,
        logLevel: "error",
        output: "json",
        preset: "desktop",
        onlyCategories: categories,
      });
      if (!result?.lhr) throw new Error(`Lighthouse returned no report for ${route}`);
      runs.push(result.lhr);
    }

    const scores = Object.fromEntries(
      categories.map((category) => [
        category,
        median(runs.map((report) => report.categories[category].score ?? 0)),
      ])
    );
    const formatted = Object.entries(scores)
      .map(([category, score]) => `${category}=${Math.round(score * 100)}`)
      .join(" ");
    console.log(`${route} ${formatted}`);

    if (scores.performance < 0.75) {
      console.warn(`${route} performance is below the warning budget of 75.`);
    }
    for (const [category, minimum] of Object.entries(minimumScores)) {
      if (scores[category] < minimum) {
        console.error(
          `${route} ${category} is below ${Math.round(minimum * 100)}.`
        );
        failed = true;
      }
    }
  }
} finally {
  await chrome?.kill();
  server?.kill("SIGTERM");
}

if (failed) process.exitCode = 1;
