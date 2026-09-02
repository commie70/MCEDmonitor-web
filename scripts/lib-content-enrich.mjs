/**
 * 正文富化(抓取落盘):经 Firecrawl scrape 抓原页正文 → 清洗为信源 markdown 复制品。
 * 供监视脚本(daily)与手动补抓脚本(enrich-content)共用。
 * 设计边界:
 *  - 每条目一次抓取,45s 超时,条目间 800ms 限速;
 *  - 幂等:已有 content 的条目跳过;
 *  - 失败按条目标记 content_status:"failed",不影响其他条目与主流程;
 *  - 未配置 FIRECRAWL_API_KEY 时整体跳过(skipped:true)。
 */

const FIRECRAWL_URL = "https://api.firecrawl.dev/v2/scrape";
const MAX_CONTENT_CHARS = 8000;
const FETCH_TIMEOUT_MS = 45_000;
const MIN_CONTENT_CHARS = 200;
import { fetchPublic, readCappedBody, validatePublicUrl } from "./lib-network-security.mjs";

/** 清洗:剥掉开头广告/导航杂讯,截断尾部站点样板(相关推荐/订阅等),压缩空行,超长截断 */
const TAIL_MARKERS = /^(#{1,4}\s*)?(related content|related articles?|newsletter|sign up|subscribe|more from|read more|trending|更多阅读|相关阅读|相关推荐|推荐阅读|猜你喜欢|版权声明|责任编辑|免责声明)\b/i;

export function cleanScrapedMarkdown(md) {
  if (!md) return "";
  const junkLine = /^(advertisement|scroll to continue.*|x|skip to main content|close|accept all cookies.*)$/i;
  const lines = String(md).split("\n");
  let start = 0;
  while (start < lines.length) {
    const l = lines[start].trim();
    if (!l || junkLine.test(l)) {
      start++;
      continue;
    }
    break;
  }
  let body = lines.slice(start);
  const tailAt = body.findIndex((l) => TAIL_MARKERS.test(l.trim()));
  if (tailAt > 0) body = body.slice(0, tailAt);
  let out = body.join("\n").replace(/\n{3,}/g, "\n\n").trim();
  if (out.length > MAX_CONTENT_CHARS) {
    out = `${out.slice(0, MAX_CONTENT_CHARS).trimEnd()}\n\n…(内容过长,后略)`;
  }
  return out;
}

export async function scrapeMarkdown(url) {
  await validatePublicUrl(url);
  const res = await fetchPublic(FIRECRAWL_URL,{
    method: "POST",
    headers:{
      Authorization:`Bearer ${process.env.FIRECRAWL_API_KEY}`,
      "Content-Type": "application/json",}, body: JSON.stringify({ url, formats: ["markdown"], onlyMainContent: true }),
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),});
  if (!res.ok) throw new Error(`firecrawl HTTP ${res.status}`);
  const json = JSON.parse(await readCappedBody(res, "firecrawl_response"));
  const cleaned = cleanScrapedMarkdown(json?.data?.markdown || "");
  if (cleaned.length < MIN_CONTENT_CHARS) throw new Error("content too short");
  return cleaned;
}

/**
 * 为报告前 maxItems 条故事线的首条目抓取正文并就地写回(item.content)。
 * 故事线条目是扁平条目的拷贝,抓取后同步传播到 report.items 的同 id 条目。
 * 返回 { enriched, failed, skipped, propagated }。
 */
export async function enrichReport(report, { maxItems = 12 } = {}) {
  if (!process.env.FIRECRAWL_API_KEY) {
    return { enriched: 0, failed: 0, skipped: true, propagated: 0 };
  }
  const targets = [];
  for (const story of report.stories.slice(0, maxItems)) {
    const lead = story.items?.[0];
    if (lead && /^https?:/.test(lead.url) && !lead.content) targets.push(lead);
  }
  let enriched = 0, failed = 0;
  for (const item of targets) {
    try {
      item.content = await scrapeMarkdown(item.url);
      item.content_fetched_at = new Date().toISOString();
      enriched++;
    } catch (err) {
      item.content_status = "failed";
      failed++;
      console.warn(`[enrich] ${item.url} → ${err.message || err}`);
    }
    await new Promise((r) => setTimeout(r, 800));
  }
  // 传播:故事线 content → 扁平 items 同 id 条目(详情页优先命中扁平条目)
  const byId = new Map();
  for (const s of report.stories) {
    for (const it of s.items || []) if (it.content) byId.set(it.id, it);
  }
  let propagated = 0;
  for (const it of report.items || []) {
    const src = byId.get(it.id);
    if (src && !it.content) {
      it.content = src.content;
      it.content_fetched_at = src.content_fetched_at;
      propagated++;
    }
  }
  return { enriched, failed, skipped: false, propagated };
}
