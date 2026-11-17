import "server-only";
import { readFile, stat } from "node:fs/promises";
import path from "node:path";

/**
 * 监测公开读模型(public/monitor/daily-report.json)的服务端加载器。
 * 该文件是事件账本的投影：只含已放行(通过证据、等级、模型复核与验收门禁)的事件。
 * 按 mtime 缓存解析结果，报告不变时零解析。
 */

export interface MonitorCategory {
  key: string;
  label: string;
  count: number;
}

export interface MonitorItem {
  id: string;
  legacy_ids?: string[];
  event_id?: string;
  company: string;
  product: string;
  category: string;
  event_type?: string;
  channel: string;
  title: string;
  source: string;
  editorial_owner?: string;
  source_type?: string;
  date: string;
  occurred_at?: string | null;
  published_at?: string | null;
  discovered_at?: string;
  url: string;
  note: string;
  snippet?: string;
  content?: string;
  content_status?: string;
}

export interface MonitorImportance {
  relevance: number;
  impact: number;
  actionability: number;
  total: number;
  level: "L1" | "L2" | "L3" | null;
  rationales?: { relevance: string; impact: string; actionability: string };
}

export interface MonitorEvidenceRef {
  id: string;
  editorial_owner: string;
  source_id: string;
  tier: string;
  url: string;
}

export interface MonitorStory {
  id: string;
  legacy_ids?: string[];
  company: string;
  product: string;
  title: string;
  event_type?: string;
  publication_state?: "first" | "update" | "duplicate" | "backfill";
  level?: "L1" | "L2" | "L3" | null;
  evidence_confidence?: "high" | "medium" | "low";
  score_breakdown?: MonitorImportance;
  review_status?: "not_required" | "pending" | "approved" | "rejected";
  occurred_at?: string | null;
  published_at?: string | null;
  discovered_at?: string;
  heat: number;
  score: number;
  badges: ("新" | "更新")[];
  sources_count: number;
  evidence_summary?: MonitorEvidenceRef[];
  categories: string[];
  first_seen: string;
  last_seen: string;
  spark: number[];
  items: MonitorItem[];
  summary: string;
  reason: string;
  stale_month?: string | null;
}

export interface MonitorDigest {
  markdown: string;
  model: string;
  generated_at: string;
}

export interface MonitorRunMetrics {
  collected_hits?: number;
  first?: number;
  update?: number;
  duplicate?: number;
  backfill?: number;
  pending?: number;
  coverage_gaps?: number;
  review_backlog?: number;
  /** 重试次数用尽、模型始终无法达成一致的候选 */
  stalled_candidates?: number;
  /** 超出运行预算、顺延到下次运行的候选 */
  deferred?: number;
  errors?: number;
  acceptance_passed?: boolean;
  [key: string]: unknown;
}

/** 发布门禁摘要：模型验收通过即放行；未通过时新事件留在账本里(held)。 */
export interface MonitorRelease {
  gate_open: boolean;
  reason: string | null;
  accepted_at?: string | null;
  held?: number;
}

export interface MonitorReport {
  schema_version?: number;
  generated_at: string;
  window_since: string;
  watches?: number;
  categories: MonitorCategory[];
  items: MonitorItem[];
  stories: MonitorStory[];
  digest: MonitorDigest | null;
  manual_tasks?: { company: string; channel: string; category: string; label: string; url: string }[];
  errors?: { candidate_id?: string | null; source_id?: string; stage?: string; error_code: string; retry_count?: number }[];
  views?: { daily_event_ids: string[]; hot_event_ids: string[]; all_event_ids: string[] };
  metrics?: MonitorRunMetrics;
  release?: MonitorRelease;
}

const REPORT_PATH = path.join(process.cwd(), "public", "monitor", "daily-report.json");

let cache: { mtimeMs: number; report: MonitorReport } | null = null;

export async function readMonitorReport(): Promise<MonitorReport | null> {
  try {
    const st = await stat(REPORT_PATH);
    if (cache && cache.mtimeMs === st.mtimeMs) return cache.report;
    const report = JSON.parse(await readFile(REPORT_PATH, "utf8")) as MonitorReport;
    cache = { mtimeMs: st.mtimeMs, report };
    return report;
  } catch {
    return null;
  }
}

export function storiesForView(report: MonitorReport, view: "daily" | "hot" | "all"): MonitorStory[] {
  const key = { daily: "daily_event_ids", hot: "hot_event_ids", all: "all_event_ids" } as const;
  const ids = report.views?.[key[view]];
  if (!ids) return report.stories;
  const byId = new Map(report.stories.map((story) => [story.id, story]));
  return ids.map((id) => byId.get(id)).filter((story): story is MonitorStory => Boolean(story));
}

export type MonitorHealth = "ok" | "degraded" | "held" | "down" | "unknown";

/**
 * 监测健康度。两种状态必须被看见，因为没有人逐条盯着：
 *   down —— 采集全失败(它曾让站点空转十周而无人察觉)；
 *   held —— 模型验收未通过，新事件入账但不上站。
 */
export function monitorHealth(report: MonitorReport | null): {
  state: MonitorHealth;
  hits: number | null;
  gaps: number;
  backlog: number;
  held: number;
} {
  const metrics = report?.metrics;
  // 待复核 = 模型复核未一致的事件 + 重试用尽的候选，两者都需要人看一眼才会有下文。
  const backlog = Number(metrics?.review_backlog ?? 0) + Number(metrics?.stalled_candidates ?? 0);
  const paused = report?.release?.gate_open === false;
  const held = Number(report?.release?.held ?? 0);
  if (!report || !metrics || typeof metrics.collected_hits !== "number") {
    return { state: paused ? "held" : "unknown", hits: null, gaps: 0, backlog, held };
  }
  const hits = metrics.collected_hits;
  const gaps = Number(metrics.coverage_gaps ?? 0);
  const state: MonitorHealth =
    hits === 0 && gaps > 0 ? "down" : paused ? "held" : gaps > 0 ? "degraded" : "ok";
  return { state, hits, gaps, backlog, held };
}

/** 分页参数解析: offset ≥ 0，limit 1..maxLimit(默认 defaultLimit)。 */
export function pageParams(url: string, defaultLimit: number, maxLimit: number): { offset: number; limit: number } {
  const sp = new URL(url).searchParams;
  const offset = Math.max(0, Math.floor(Number(sp.get("offset")) || 0));
  const limit = Math.max(1, Math.min(Math.floor(Number(sp.get("limit")) || defaultLimit), maxLimit));
  return { offset, limit };
}
