#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  atomicWriteBundle,
  migrateLegacyReport,
  projectPublicReport,
  validateSourceRegistry,
} from "./lib-monitor-ledger.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT, "public", "monitor", "daily-report.json");
const SHADOW_PATH = path.join(ROOT, "public", "monitor", "shadow-report.json");
const LEDGER_PATH = path.join(ROOT, "scripts", "monitor-ledger.json");
const REGISTRY_PATH = path.join(ROOT, "scripts", "monitor-sources.json");

if (process.argv.includes("--force")) {
  throw new Error("--force is intentionally unsupported; move the existing ledger aside after review instead");
}

try {
  await fs.access(LEDGER_PATH);
  throw new Error(`refusing to replace existing ${path.relative(ROOT, LEDGER_PATH)}`);
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

const [report, registry] = await Promise.all([
  fs.readFile(REPORT_PATH, "utf8").then(JSON.parse),
  fs.readFile(REGISTRY_PATH, "utf8").then(JSON.parse),
]);
validateSourceRegistry(registry);
const ledger = migrateLegacyReport(report, { registry, now: report.generated_at });
const shadow = projectPublicReport(ledger, {
  generatedAt: report.generated_at,
  sourceCount: report.watches,
  digest: report.digest,
  manualTasks: report.manual_tasks,
  errors: [],
  metrics: {
    migration: true,
    imported_items: report.items.length,
    imported_stories: report.stories.length,
  },
});
await atomicWriteBundle([
  { path: LEDGER_PATH, value: ledger },
  { path: SHADOW_PATH, value: shadow },
]);
console.log(
  `[monitor-ledger] migrated ${ledger.events.length} events / ${ledger.evidence.length} evidence → ${path.relative(
    ROOT,
    LEDGER_PATH
  )}`
);
