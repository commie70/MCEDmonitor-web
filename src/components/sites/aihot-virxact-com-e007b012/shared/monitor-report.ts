import { readFile, stat } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

/**
 * 监测日报公共加载器(仅服务端)。
 * 按文件 mtime 缓存解析结果:每次请求仅一次 stat,日报不变时零 I/O 零解析。
 */

export interface MonitorCategory {
  key: string;
  label: string;
  count: number;
}

export interface MonitorItem {
  id: string;
  company: string;
  product: string;
  category: string;
  channel: string;
  title: string;
  source: string;
  date: string;
  url: string;
  note: string;
}

export interface MonitorStory {
  id: string;
  company: string;
  product: string;
  title: string;
  heat: number;
  badges: string[];
  sources_count: number;
  categories: string[];
  first_seen: string;
  last_seen: string;
  spark: number[];
  items: MonitorItem[];
  summary: string;
  score: number;
  reason: string;
  stale_month?: string;
}

export interface MonitorDigest {
  markdown: string;
  model: string;
  generated_at: string;
}

export interface MonitorReport {
  generated_at: string;
  window_since: string;
  categories: MonitorCategory[];
  items: MonitorItem[];
  stories: MonitorStory[];
  digest: MonitorDigest | null;
}

const REPORT_PATH = path.join(
  process.cwd(),
  "public",
  "monitor",
  "daily-report.json"
);

let cache: { mtimeMs: number; report: MonitorReport } | null = null;

export async function readMonitorReport(): Promise<MonitorReport | null> {
  try {
    const st = await stat(REPORT_PATH);
    if (cache && cache.mtimeMs === st.mtimeMs) return cache.report;
    const raw = await readFile(REPORT_PATH, "utf8");
    const report = JSON.parse(raw) as MonitorReport;
    cache = { mtimeMs: st.mtimeMs, report };
    return report;
  } catch {
    return null;
  }
}

export function reportMissingResponse(): NextResponse {
  return NextResponse.json(
    { error: "monitor_report_missing", hint: "npm run monitor" },
    { status: 503 }
  );
}

/** 分页参数解析:offset ≥0,limit 1..maxLimit(默认 defaultLimit)。 */
export function pageParams(
  url: string,
  defaultLimit: number,
  maxLimit: number
): { offset: number; limit: number } {
  const sp = new URL(url).searchParams;
  const offset = Math.max(0, Math.floor(Number(sp.get("offset")) || 0));
  const limit = Math.max(
    1,
    Math.min(Math.floor(Number(sp.get("limit")) || defaultLimit), maxLimit)
  );
  return { offset, limit };
}
