import { readMonitorReport } from "@/components/sites/aihot-virxact-com-e007b012/shared/monitor-report";
import {
  API_CACHE_HEADERS,
  safeHttpUrl,
} from "@/components/sites/aihot-virxact-com-e007b012/shared/url";

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function toRfc822(value: string, fallback: string): string {
  const date = new Date(value || fallback);
  if (Number.isNaN(date.getTime())) {
    return new Date(fallback).toUTCString();
  }
  return date.toUTCString();
}/** GET /feed.xml — RSS 2.0：监测故事线前 20 条(仅 http(s) 链接入 feed)。 */
export async function GET() {
  const report = await readMonitorReport();

  if (!report) {
    return new Response("monitor_report_missing: run npm run monitor",{
      status: 503,
      headers:{ "Content-Type": "text/plain; charset=utf-8" },});
  }

  const dailyIds = new Set(report.views?.daily_event_ids ?? report.stories.map((story) => story.id));
  const items = report.stories
    .filter((story) => dailyIds.has(story.id))
    .slice(0, 20)
    .map((story) => {
      const link = safeHttpUrl(story.items[0]?.url);
      if (!link) return null;
      const description =
        story.summary || `${story.company} · ${story.sources_count} 个信源`;
      return `    <item>
      <title>${escapeXml(story.title)}</title>
      <link>${escapeXml(link)}</link>
      <description>${escapeXml(description)}</description>
      <pubDate>${toRfc822(story.last_seen, report.generated_at)}</pubDate>
      <guid isPermaLink="false">${escapeXml(story.id)}</guid>
    </item>`;
    })
    .filter(Boolean)
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>早筛情报站 · 竞品监测</title>
    <link>/</link>
    <description>癌症早筛竞品新闻监测：每日故事线、监管动态与新研究。</description>
    <lastBuildDate>${toRfc822(report.generated_at, report.generated_at)}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml,{
    headers:{
      "Content-Type": "application/rss+xml; charset=utf-8",
      ...API_CACHE_HEADERS,
    },});
}
