#!/usr/bin/env node
import { readFileSync, writeFileSync, readdirSync, statSync } from "node:fs";
import { join, relative } from "node:path";

const ROOT = new URL("..", import.meta.url).pathname;

const COPYRIGHT_LINES = [
  "ShootSet - Collegiate club volleyball tournament hub",
  "Copyright (C) 2026 Andrew Chang",
  "",
  "This program is free software: you can redistribute it and/or modify",
  "it under the terms of the GNU General Public License as published by",
  "the Free Software Foundation, either version 3 of the License, or",
  "(at your option) any later version.",
  "",
  "This program is distributed in the hope that it will be useful,",
  "but WITHOUT ANY WARRANTY; without even the implied warranty of",
  "MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the",
  "GNU General Public License for more details.",
  "",
  "You should have received a copy of the GNU General Public License",
  "along with this program.  If not, see <https://www.gnu.org/licenses/>.",
];

function blockComment(lines) {
  return `/*\n${lines.map((line) => ` * ${line}`).join("\n")}\n */\n`;
}

function lineComment(lines) {
  return `${lines.map((line) => (line ? `-- ${line}` : "--")).join("\n")}\n`;
}

const HEADERS = {
  ts: blockComment(COPYRIGHT_LINES),
  tsx: blockComment(COPYRIGHT_LINES),
  css: blockComment(COPYRIGHT_LINES),
  sql: lineComment(COPYRIGHT_LINES),
};

const GLOBS = [
  join(ROOT, "src"),
  join(ROOT, "drizzle.config.ts"),
  join(ROOT, "supabase/migrations"),
];

const EXTENSIONS = new Set([".ts", ".tsx", ".css", ".sql"]);

function walk(dir, files = []) {
  for (const entry of readdirSync(dir)) {
    const path = join(dir, entry);
    const stat = statSync(path);
    if (stat.isDirectory()) {
      if (entry === "node_modules" || entry === ".next") continue;
      walk(path, files);
    } else {
      files.push(path);
    }
  }
  return files;
}

function collectFiles() {
  const files = [];
  for (const target of GLOBS) {
    try {
      const stat = statSync(target);
      if (stat.isDirectory()) {
        walk(target, files);
      } else {
        files.push(target);
      }
    } catch {
      // skip missing paths
    }
  }
  return files.filter((file) => EXTENSIONS.has(file.slice(file.lastIndexOf("."))));
}

function hasCopyright(content) {
  return content.includes("Copyright (C) 2026 Andrew Chang");
}

function prependHeader(content, header, ext) {
  const normalized = content.replace(/^\uFEFF/, "");
  if (hasCopyright(normalized)) return null;

  if (ext === "ts" || ext === "tsx") {
    const useDirective = normalized.match(/^["']use (client|server)["'];?\s*/);
    if (useDirective) {
      const rest = normalized.slice(useDirective[0].length).replace(/^\n+/, "");
      return `${useDirective[0].trim()}\n\n${header}\n${rest}`;
    }
  }

  return `${header}\n${normalized}`;
}

let updated = 0;
let skipped = 0;

for (const file of collectFiles()) {
  const ext = file.slice(file.lastIndexOf(".") + 1);
  const header = HEADERS[ext];
  const content = readFileSync(file, "utf8");
  const next = prependHeader(content, header, ext);
  if (next === null) {
    skipped += 1;
    continue;
  }
  writeFileSync(file, next, "utf8");
  updated += 1;
  console.log(relative(ROOT, file));
}

console.log(`\nUpdated ${updated} files, skipped ${skipped} already marked.`);
