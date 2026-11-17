#!/usr/bin/env node

/**
 * 由事件账本重建公开读模型 public/monitor/daily-report.json。
 *
 * 公开报告不保存任何独有状态：它只是账本中已放行事件的投影，可随时重建。
 * 与监测脚本共用同一个发布门禁(lib-release-gate.mjs)——门禁开放时放行账本里
 * 满足条件的事件，门禁未开时重建结果只包含此前已放行的事件。
 *
 * 用法: npm run monitor:project
 */

import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  atomicWriteBundle,
  loadJson,
  loadLedger,
  projectPublicReport,
  releaseEligibleEvents,
} from "./lib-monitor-ledger.mjs";
import { loadReleaseGate, publicRelease, readRunHistory } from "./lib-release-gate.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const LEDGER_PATH = path.join(ROOT, "scripts", "monitor-ledger.json");
const REPORT_PATH = path.join(ROOT, "public", "monitor", "daily-report.json");
const CONFIG_PATH = path.join(ROOT, "scripts", "monitor-sources.json");

const RUN_METRIC_KEYS = [
  "collected_hits",
  "canonical_duplicates",
  "first",
  "update",
  "duplicate",
  "backfill",
  "pending",
  "rejected",
  "failed",
  "coverage_gaps",
  "review_backlog",
  "stalled_candidates",
  "deferred",
  "errors",
  "acceptance_passed",
];

/** 与监测脚本一致：每家企业 × 每个需人工核查的权威信源。 */
function manualTasks(registry) {
  const manual = registry.sources.filter((source) => source.enabled && source.type === "manual_registry");
  return registry.discovery_queries.flatMap((query) =>
    manual.map((source) => ({
      company: query.company,
      channel: source.editorial_owner,
      category: source.coverage.event_types.includes("regulatory_decision") ? "regulatory" : "academic",
      label: `${source.editorial_owner} · ${query.company} ${query.product}`,
      url: source.url,
    }))
  );
}

const [ledger, registry, history, gate, previous] = await Promise.all([
  loadLedger(LEDGER_PATH),
  loadJson(CONFIG_PATH),
  readRunHistory(ROOT),
  loadReleaseGate(ROOT),
  loadJson(REPORT_PATH).catch(() => null),
]);

// 最近一次流水线运行的指标随报告保留，站点据此显示监测健康度。
const run = history.filter((record) => record.mode).at(-1) ?? null;

const released = gate.gate_open ? releaseEligibleEvents(ledger) : 0;
const report = projectPublicReport(ledger, {
  generatedAt: ledger.last_successful_run_at || new Date().toISOString(),
  sourceCount: new Set(registry.discovery_queries.map((query) => query.company)).size + 1,
  digest: gate.gate_open ? previous?.digest ?? null : null,
  manualTasks: manualTasks(registry),
  metrics: {
    ...(run ? Object.fromEntries(RUN_METRIC_KEYS.filter((key) => key in run).map((key) => [key, run[key]])) : {}),
    // 验收状态取当前门禁，而不是上一次运行当时的值。
    acceptance_passed: gate.acceptance.passed,
  },
  gateOpen: gate.gate_open,
  release: publicRelease(gate),
});

await atomicWriteBundle([
  ...(released ? [{ path: LEDGER_PATH, value: ledger }] : []),
  { path: REPORT_PATH, value: report },
]);
console.log(
  `[monitor-project] gate=${gate.reason || "open"} · released ${released} · ${report.stories.length} public events / ${report.items.length} evidence items → ${path.relative(
    ROOT,
    REPORT_PATH
  )}`
);
