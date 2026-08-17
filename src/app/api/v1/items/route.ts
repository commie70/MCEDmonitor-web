import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const CATEGORY_KEYS = ["regulatory", "academic", "research", "market"] as const;
type CategoryKey = (typeof CATEGORY_KEYS)[number];

interface MonitorCategory {
  key: string;
  label: string;
  count:number;
}

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

interface MonitorReport {
  generated_at: string;
  window_since: string;
  categories: MonitorCategory[];
  items: MonitorItem[];
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
 * GET /api/v1/items — 监测条目流；支持 ?category=regulatory|academic|research|market 过滤。
 */
export async function GET(request: Request) {
  const report = await readReport();

  if (!report) {
    return NextResponse.json(
      { error: "monitor_report_missing", hint: "npm run monitor" },{ status: 503 }
    );
  }

  const category = new URL(request.url).searchParams.get("category");
  const filter = CATEGORY_KEYS.includes(category as CategoryKey)
    ? (category as CategoryKey)
    :null;
  const items = filter
    ? report.items.filter((item) => item.category === filter)
    : report.items;

  return NextResponse.json({
    generated_at: report.generated_at,
    window_since: report.window_since,
    count: items.length,
    categories: report.categories,
    items,});
}
