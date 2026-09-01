#!/usr/bin/env node

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  atomicWriteBundle,
  loadLedger,
  projectPublicReport,
  validateLedger,
} from "./lib-monitor-ledger.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(ROOT, "scripts", "monitor-ledger.json");
const REPORT_PATH = path.join(ROOT, "public", "monitor", "daily-report.json");
const SHADOW_PATH = path.join(ROOT, ".monitor", "shadow-report.json");

const args = parseArgs(process.argv.slice(2));
if (!args.eventId || !args.decision) {
  throw new Error("usage: node scripts/review-monitor-event.mjs --event <id> (--approve|--reject) [--reviewer <name>] [--publish]");
}

const ledger = await loadLedger(LEDGER_PATH);
const event = ledger.events.find(
  (entry) => entry.id === args.eventId || entry.legacy_ids.includes(args.eventId)
);
if (!event) throw new Error(`event not found: ${args.eventId}`);
if (event.review_status !== "pending") {
  throw new Error(`event ${event.id} is ${event.review_status}; only pending events can be reviewed`);
}

event.review_status = args.decision;
event.reviewed_at = new Date().toISOString();
event.reviewed_by = args.reviewer || "local-cli";
if (
  args.decision === "approved" &&
  ["first", "update"].includes(event.publication_state) &&
  !ledger.last_publication_event_ids.includes(event.id)
) {
  ledger.last_publication_event_ids.push(event.id);
}
validateLedger(ledger);
const targetReport = args.publish ? REPORT_PATH : SHADOW_PATH;
const report = projectPublicReport(ledger, {
  generatedAt: new Date().toISOString(),
  metrics: { manual_review: true, reviewed_event_id: event.id },
});
await atomicWriteBundle([
  { path: LEDGER_PATH, value: ledger },
  { path: targetReport, value: report },
]);
console.log(`[monitor-review] ${event.id} → ${event.review_status}; wrote ${path.relative(ROOT, targetReport)}`);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--event") parsed.eventId = argv[++index];
    else if (arg === "--approve") parsed.decision = "approved";
    else if (arg === "--reject") parsed.decision = "rejected";
    else if (arg === "--reviewer") parsed.reviewer = argv[++index];
    else if (arg === "--publish") parsed.publish = true;
    else throw new Error(`unknown argument ${arg}`);
  }
  return parsed;
}
