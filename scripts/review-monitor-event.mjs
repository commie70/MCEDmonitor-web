#!/usr/bin/env node

/**
 * 人工复核 CLI(可选)。
 *
 * 高风险事件默认由独立模型复核自动放行，不需要逐条人工确认。本工具只处理例外：
 * 模型复核未覆盖而停在 pending 的事件，或需要人工撤下的已发布事件。
 *
 *   npm run monitor:review -- --list
 *   npm run monitor:review -- --event <id> --approve [--reviewer <name>]
 *   npm run monitor:review -- --event <id> --reject  [--reviewer <name>]
 *
 * 写回账本后按当前发布门禁重建公开报告；门禁未开时，通过复核的事件留在账本里，门禁开放后自动放行。
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  atomicWriteBundle,
  loadJson,
  loadLedger,
  projectPublicReport,
  releaseEligibleEvents,
  validateLedger,
} from "./lib-monitor-ledger.mjs";
import { loadReleaseGate, publicRelease } from "./lib-release-gate.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(ROOT, "scripts", "monitor-ledger.json");
const REPORT_PATH = path.join(ROOT, "public", "monitor", "daily-report.json");

const args = parseArgs(process.argv.slice(2));
const ledger = await loadLedger(LEDGER_PATH);

if (args.list) {
  const pending = ledger.events
    .filter((event) => event.review_status === "pending")
    .sort((a, b) => String(b.occurred_at || b.published_at).localeCompare(String(a.occurred_at || a.published_at)));
  if (!pending.length) console.log("[monitor-review] 没有待复核事件");
  for (const event of pending) {
    const revision = event.fact_revisions.at(-1) || {};
    const urls = ledger.evidence
      .filter((evidence) => event.evidence_ids.includes(evidence.id))
      .map((evidence) => `    ${evidence.tier.padEnd(13)} ${evidence.url}`);
    console.log(
      [
        `\n${event.id}`,
        `  ${String(event.occurred_at || event.published_at || "").slice(0, 10)} · ${event.company} · ${event.event_type} · ${
          event.importance.level || "—"
        } ${event.importance.total} · 证据 ${event.evidence_confidence}`,
        `  ${event.title}`,
        revision.summary ? `  ${revision.summary}` : null,
        ...urls,
      ]
        .filter(Boolean)
        .join("\n")
    );
  }
  process.exit(0);
}

if (!args.eventId || !args.decision) {
  throw new Error(
    "usage: node scripts/review-monitor-event.mjs --list | --event <id> (--approve|--reject) [--reviewer <name>]"
  );
}

const event = ledger.events.find(
  (entry) => entry.id === args.eventId || entry.legacy_ids.includes(args.eventId)
);
if (!event) throw new Error(`event not found: ${args.eventId}`);
// 驳回可用于撤下任何事件；批准只针对停在 pending 的事件。
if (args.decision === "approved" && event.review_status !== "pending") {
  throw new Error(`event ${event.id} is ${event.review_status}; only pending events can be approved`);
}

event.review_status = args.decision;
event.reviewed_at = new Date().toISOString();
event.reviewed_by = args.reviewer || "local-cli";
const [gate, previous] = await Promise.all([loadReleaseGate(ROOT), loadJson(REPORT_PATH).catch(() => null)]);
if (gate.gate_open) releaseEligibleEvents(ledger, event.reviewed_at);
validateLedger(ledger);
const report = projectPublicReport(ledger, {
  generatedAt: new Date().toISOString(),
  digest: previous?.digest ?? null,
  sourceCount: previous?.watches ?? 0,
  manualTasks: previous?.manual_tasks ?? [],
  metrics: { ...(previous?.metrics ?? {}), manual_review: true, reviewed_event_id: event.id },
  gateOpen: gate.gate_open,
  release: publicRelease(gate),
});
await atomicWriteBundle([
  { path: LEDGER_PATH, value: ledger },
  { path: REPORT_PATH, value: report },
]);
console.log(
  `[monitor-review] ${event.id} → ${event.review_status}; gate=${gate.reason || "open"}; wrote ${path.relative(
    ROOT,
    REPORT_PATH
  )}`
);

function parseArgs(argv) {
  const parsed = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--event") parsed.eventId = argv[++index];
    else if (arg === "--list") parsed.list = true;
    else if (arg === "--approve") parsed.decision = "approved";
    else if (arg === "--reject") parsed.decision = "rejected";
    else if (arg === "--reviewer") parsed.reviewer = argv[++index];
    else if (arg === "--publish") continue; // 旧参数：是否公开只由发布门禁决定
    else throw new Error(`unknown argument ${arg}`);
  }
  return parsed;
}
