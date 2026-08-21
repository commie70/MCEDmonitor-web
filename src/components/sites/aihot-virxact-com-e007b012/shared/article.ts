import {
  readMonitorReport,
  type MonitorItem,
} from "./monitor-report";
import { ALL_ITEMS, CATEGORIES, HOT_EVENTS } from "./data";
import { safeHttpUrl } from "./url";

/**
 * 文章页统一视图 — 监测条目 / 故事线条目 / 演示条目归一化为同一渲染模型。
 * url 一律经 safeHttpUrl 校验(非 http(s) 置 null,前端省略原文链接)。
 */

export interface ArticleView {
  id: string;
  title: string;
  source: string;
  url: string | null;
  date: string;
  time?: string;
  categoryLabel?: string;
  company?: string;
  score?: number;
  reason?: string;
  summary: string[];
  snippet?: string;
  /** 抓回清洗后的信源 markdown 复制品(有则在详情页作为主正文) */
  content?: string;
  contentFetchedAt?: string;
  note?: string;
}

const MONITOR_CATEGORY_LABELS: Record<string, string> = {
  regulatory: "报证审批",
  academic: "学术动态",
  research: "新研究",
  market: "市场动态",
};

function fromMonitorItem(
  item: MonitorItem,
  company: string,
  storyMeta?: { summary?: string; score?: number; reason?: string }
): ArticleView {
  return {
    id: item.id,
    title: decodeEntities(item.title),
    source: item.source,
    url: safeHttpUrl(item.url),
    date: item.date,
    categoryLabel: MONITOR_CATEGORY_LABELS[item.category] ?? item.category,
    company,
    score: storyMeta?.score,
    reason: storyMeta?.reason,
    summary: storyMeta?.summary ? [storyMeta.summary] : [],
    snippet: item.snippet ? decodeEntities(item.snippet) : undefined,
    content: item.content || undefined,
    contentFetchedAt: item.content_fetched_at || undefined,
    note: item.note || undefined,
  };
}

/** 抓回文本里常见的 HTML 实体解码(采集端 stripHtml 不解实体) */
function decodeEntities(text: string): string {
  return text
    .replace(/&#x27;|&#39;|&apos;/g, "'")
    .replace(/&#x2F;/g, "/")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&");
}

function fromDemo(item: (typeof ALL_ITEMS)[number]): ArticleView {
  return {
    id: item.id,
    title: item.title,
    source: item.source,
    url: safeHttpUrl(item.url),
    date: item.date,
    time: item.time,
    categoryLabel: CATEGORIES.find((c) => c.key === item.category)?.label,
    score: item.score,
    reason: item.reason,
    summary: item.summary ?? [],
    snippet: item.quote ? `${item.quote.source}:${item.quote.text}` : undefined,
  };
}

function fromHotEvent(id: string): ArticleView | null {
  const ev = HOT_EVENTS.find((e) => e.id === id);
  if (!ev) return null;
  return {
    id: ev.id,
    title: ev.title,
    source: ev.source,
    url: null,
    date: "",
    summary: [`演示热点事件 · ${ev.ago} · 热度 ${ev.heat} · ${ev.sources} 家信源`],
  };
}

/** 按 id 查找文章页数据:先监测报告(全量条目 → 故事线条目 → 故事线 id),再演示数据。 */
export async function findArticle(id: string): Promise<ArticleView | null> {
  const report = await readMonitorReport();
  if (report) {
    const direct = report.items.find((i) => i.id === id);
    if (direct) return fromMonitorItem(direct, direct.company);
    for (const story of report.stories) {
      const hit = story.items.find((i) => i.id === id);
      if (hit) {
        return fromMonitorItem(hit, story.company, {
          summary: story.summary,
          score: story.score,
          reason: story.reason,
        });
      }
    }
    const story = report.stories.find((s) => s.id === id);
    if (story?.items[0]) {
      return fromMonitorItem(story.items[0], story.company, {
        summary: story.summary,
        score: story.score,
        reason: story.reason,
      });
    }
  }
  const demo = ALL_ITEMS.find((i) => i.id === id);
  if (demo) return fromDemo(demo);
  return fromHotEvent(id);
}

/** 导出用 Markdown 文档 */
export function articleMarkdown(a: ArticleView): string {
  const lines = [`# ${a.title}`, ""];
  if (a.company) lines.push(`- 公司：${a.company}`);
  lines.push(`- 信源：${a.source}`);
  if (a.date) lines.push(`- 日期：${a.date}${a.time ? ` ${a.time}` : ""}`);
  if (a.categoryLabel) lines.push(`- 类别：${a.categoryLabel}`);
  if (a.score != null) lines.push(`- 监测评分：${a.score}/100`);
  if (a.url) lines.push(`- 原文：${a.url}`);
  lines.push("");
  for (const p of a.summary) lines.push(p, "");
  if (a.reason) lines.push(`> 关注理由：${a.reason}`, "");
  if (a.content) lines.push("## 正文(抓自信源)", "", a.content, "");
  else if (a.snippet) lines.push("## 抓回内容", "", a.snippet, "");
  if (a.note) lines.push(`> ${a.note}`, "");
  lines.push("---", "导出自早筛情报站");
  return lines.join("\n");
}
