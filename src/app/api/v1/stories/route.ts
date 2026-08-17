import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface MonitorItem {
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

interface MonitorStory {
  id: string;
  company: string;
  product: string;
  title: string;
  heat:number;
  badges: string[];
  sources_count:number;
  categories: string[];
  first_seen: string;
  last_seen: string;
  spark:number[];
  items: MonitorItem[];
  summary: string;
  score:number;
  reason: string;
}

interface MonitorReport {
  generated_at: string;
  window_since: string;
  stories: MonitorStory[];
}

async function readReport(): Promise<MonitorReport | null> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "public", "monitor", "daily-report.json"),
      "utf8"
    );
    return JSON.parse(raw) as MonitorReport;
  } catch {
    return null;
  }
}/**
 * GET /api/v1/stories — 监测故事线(按热度排序，含 AI 摘要与评分)。
 */
export async function GET() {
  const report = await readReport();

  if (!report) {
    return NextResponse.json(
      { error: "monitor_report_missing", hint: "npm run monitor" },{ status: 503 }
    );
  }

  return NextResponse.json({
    generated_at: report.generated_at,
    window_since: report.window_since,
    count: report.stories.length,
    stories: report.stories,});
}
