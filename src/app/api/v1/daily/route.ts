import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

interface MonitorStory {
  id: string;
  company: string;
  title: string;
  heat:number;
  badges: string[];
  summary: string;
  score:number;
  reason: string;
}

interface MonitorDigest {
  markdown: string;
  model: string;
  generated_at: string;
}

interface MonitorReport {
  generated_at: string;
  window_since: string;
  stories: MonitorStory[];
  digest: MonitorDigest;
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
 * GET /api/v1/daily — 每日监测摘要： AI 日报 + 热度前 5 故事线(精简字段)。
 */
export async function GET() {
  const report = await readReport();

  if (!report) {
    return NextResponse.json(
      { error: "monitor_report_missing", hint: "npm run monitor" },{ status: 503 }
    );
  }

  const topStories = report.stories.slice(0, 5).map((s) => ({
    id: s.id,
    title: s.title,
    company: s.company,
    heat: s.heat,
    badges: s.badges,
    summary: s.summary,
    score: s.score,
    reason: s.reason,}));

  return NextResponse.json({
    generated_at: report.generated_at,
    window_since: report.window_since,
    digest: report.digest,
    top_stories: topStories,});
}
