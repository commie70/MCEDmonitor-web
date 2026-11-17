import { readFile, writeFile, rename, mkdir } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { loadReleaseGate, publicRelease, readRunHistory } from "./lib-release-gate.mjs";

const count = (value) => Number.isSafeInteger(value) && value >= 0 ? value : 0;
const timestamp = (value) => typeof value === "string" && /^\d{4}-\d{2}-\d{2}T[\d:.]+Z$/.test(value) && Number.isFinite(Date.parse(value)) ? value : null;
/** Only registry identity and aggregate operational facts leave the ledger. */
export function buildSystemStatus(registry, ledger, release, latestRun = {}) {
  const sources = registry.sources.map((source) => {
    const run = ledger.source_runs?.[source.source_id] || {};
    return { id: source.source_id, owner: source.editorial_owner, enabled: source.enabled === true,
      last_checked_at: timestamp(run.last_checked_at), last_success_at: timestamp(run.last_success_at),
      next_due_at: timestamp(run.next_due_at), consecutive_failures: count(run.consecutive_failures), item_count: count(run.item_count) };
  });
  const active = sources.filter((s) => s.enabled);
  const failed = active.filter((s) => s.consecutive_failures > 0);
  const gaps = active.filter((s) => s.consecutive_failures >= 3);
  const checked = active.filter((s) => s.last_checked_at);
  return { schema_version: 1, lastRun: timestamp(latestRun.ts) || timestamp(ledger.last_successful_run_at),
    health: !checked.length ? "unknown" : failed.length === checked.length ? "failed" : failed.length ? "degraded" : "healthy",
    failedSources: failed.length, coverageGaps: gaps.length, errors: count(latestRun.errors),
    pendingCount: (ledger.events || []).filter((e) => e.review_status === "pending").length,
    pendingCandidates: (ledger.candidates || []).filter((e) => e.status === "pending").length,
    release: { gate_open: release.gate_open === true, reason: release.gate_open ? null : "acceptance_not_passed", accepted_at: timestamp(release.accepted_at) }, sources };
}
export async function writeSystemStatus(root) {
  const load = async (name) => JSON.parse(await readFile(path.join(root, "scripts", name), "utf8"));
  const [registry, ledger, gate, history] = await Promise.all([load("monitor-sources.json"), load("monitor-ledger.json"), loadReleaseGate(root), readRunHistory(root)]);
  const latest = history.findLast((run) => run.mode || run.status === "fatal") || {};
  const status = buildSystemStatus(registry, ledger, publicRelease(gate), latest);
  const destination = path.join(root, "public/monitor/system-status.json");
  await mkdir(path.dirname(destination), { recursive: true });
  const temporary = `${destination}.${process.pid}.tmp`;
  await writeFile(temporary, JSON.stringify(status, null, 2) + "\n");
  await rename(temporary, destination);
  return status;
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await writeSystemStatus(path.resolve(import.meta.dirname, ".."));
