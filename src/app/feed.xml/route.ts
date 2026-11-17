import { isExternal } from "@/data/meta";
import { featured, type IntelEvent } from "@/lib/events";
import { loadEvents } from "@/lib/load-events";
import { API_CACHE_HEADERS, SITE_URL, safeHttpUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

function escapeXml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

/** 事件日期可能只有年 / 年月，缺失部分按 1 号计。 */
function pubDate(date: string, fallback: string): string {
  const [y, m = "01", d = "01"] = date.slice(0, 10).split("-");
  const parsed = new Date(`${y}-${m}-${d}T00:00:00+08:00`);
  return (Number.isNaN(parsed.getTime()) ? new Date(fallback) : parsed).toUTCString();
}

function itemXml(event: IntelEvent, fallback: string): string {
  const page = `${SITE_URL}/items/${encodeURIComponent(event.id)}`;
  const external = event.links.find((link) => isExternal(link.href));
  const link = safeHttpUrl(external?.href) ?? page;
  const description = [event.summary, event.why].filter(Boolean).join(" ") || `${event.company} · ${event.product}`;
  return `    <item>
      <title>${escapeXml(event.title)}</title>
      <link>${escapeXml(link)}</link>
      <comments>${escapeXml(page)}</comments>
      <description>${escapeXml(description)}</description>
      <category>${escapeXml(event.company)}</category>
      <pubDate>${pubDate(event.date, fallback)}</pubDate>
      <guid isPermaLink="false">${escapeXml(event.id)}</guid>
    </item>`;
}

/** GET /feed.xml — RSS 2.0：最近 30 条 L1/L2 事件。 */
export async function GET() {
  const { events, report } = await loadEvents();
  const built = report?.generated_at ?? new Date().toISOString();
  const items = featured(events)
    .slice(0, 30)
    .map((event) => itemXml(event, built))
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>早筛情报站</title>
    <link>${SITE_URL}/</link>
    <description>癌症早筛产品的性能、技术路线、癌种覆盖与报证进度：报证节点、研究读出与文献。</description>
    <language>zh-CN</language>
    <lastBuildDate>${new Date(built).toUTCString()}</lastBuildDate>
${items}
  </channel>
</rss>
`;

  return new Response(xml, {
    headers: { "Content-Type": "application/rss+xml; charset=utf-8", ...API_CACHE_HEADERS },
  });
}
