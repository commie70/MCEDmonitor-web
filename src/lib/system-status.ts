import { readFile } from "node:fs/promises";
import path from "node:path";
export interface SystemStatus {
  lastRun: string | null; health: string; failedSources: number; coverageGaps: number;
  pendingCount: number; pendingCandidates: number;
  release: { gate_open: boolean; reason: string | null; accepted_at: string | null };
  sources: { id: string; owner: string; enabled: boolean; last_checked_at: string | null; last_success_at: string | null; next_due_at: string | null; consecutive_failures: number; item_count: number }[];
}
export async function readSystemStatus(): Promise<SystemStatus | null> {
  try { return JSON.parse(await readFile(path.join(process.cwd(), "public/monitor/system-status.json"), "utf8")) as SystemStatus; }
  catch { return null; }
}
