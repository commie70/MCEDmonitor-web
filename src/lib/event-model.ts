import type { EventKind, IntelLevel, Region, SourceKind } from "@/data/types";
import { compareDateDesc, daysBetween } from "./dates";

/**
 * 站点统一的「事件」模型(纯类型与纯函数，客户端可安全引用)。
 *
 * 两个来源汇成一条时间线：
 *  - monitor：监测流水线事件账本中通过发布门禁的事件；
 *  - archive：证据库本身的里程碑——研究发表 / 读出、报证节点、人工补录事件。
 */

export interface EventLink {
  label: string;
  href: string;
  kind: SourceKind;
}

export interface IntelEvent {
  id: string;
  origin: "monitor" | "archive";
  /** YYYY / YYYY-MM / YYYY-MM-DD */
  date: string;
  kind: EventKind;
  companyId: string | null;
  company: string;
  product: string;
  region: Region | null;
  self: boolean;
  title: string;
  summary: string;
  why: string;
  level: IntelLevel | null;
  score: number | null;
  confidence: "high" | "medium" | null;
  state: "first" | "update" | "backfill" | null;
  links: EventLink[];
  /** 关联的研究证据页 */
  studyId?: string;
  /** 独立信源数 */
  sourceCount: number;
  legacyIds: string[];
}

export const KIND_LABEL: Record<EventKind, string> = {
  regulatory: "报证",
  readout: "读出",
  publication: "文献",
  conference: "会议",
  launch: "上市",
  deal: "合作",
  corporate: "公司",
  policy: "政策",
  other: "其他",
};

export const KIND_ORDER: EventKind[] = [
  "regulatory",
  "readout",
  "publication",
  "conference",
  "launch",
  "deal",
  "corporate",
  "policy",
  "other",
];

const LEVEL_RANK: Record<string, number> = { L1: 3, L2: 2, L3: 1 };

export function levelRank(level: IntelLevel | null): number {
  return level ? LEVEL_RANK[level] : 0;
}

export function sortEvents(events: IntelEvent[]): IntelEvent[] {
  return [...events].sort(
    (a, b) =>
      compareDateDesc(a.date, b.date) || levelRank(b.level) - levelRank(a.level) || a.id.localeCompare(b.id)
  );
}

/** 精选：L1 / L2。 */
export function featured(events: IntelEvent[]): IntelEvent[] {
  return events.filter((event) => event.level === "L1" || event.level === "L2");
}

/** 热点：窗口内按 等级 → 重要性总分 → 时间 排序，搜索引擎重复命中不加分。 */
export function hotEvents(events: IntelEvent[], today: string, windowDays: number): IntelEvent[] {
  return events
    .filter((event) => {
      const age = daysBetween(event.date, today);
      return event.level !== null && event.date.length >= 7 && age !== null && age >= 0 && age <= windowDays;
    })
    .sort(
      (a, b) =>
        levelRank(b.level) - levelRank(a.level) ||
        (b.score ?? 0) - (a.score ?? 0) ||
        compareDateDesc(a.date, b.date)
    );
}

export function findEvent(events: IntelEvent[], id: string): IntelEvent | undefined {
  return events.find((event) => event.id === id) ?? events.find((event) => event.legacyIds.includes(id));
}

export function eventHref(event: Pick<IntelEvent, "id">): string {
  return `/items/${encodeURIComponent(event.id)}`;
}

/** 导出为 Markdown：标题、元信息、摘要、关注理由与信源。 */
export function eventMarkdown(event: IntelEvent, origin = ""): string {
  const lines = [
    `# ${event.title}`,
    "",
    `- 日期：${event.date}`,
    `- 企业 / 产品：${[event.company, event.product].filter(Boolean).join(" · ")}`,
    `- 类型：${KIND_LABEL[event.kind]}${event.level ? ` · ${event.level}` : ""}${
      event.confidence ? ` · 证据 ${event.confidence === "high" ? "High" : "Medium"}` : ""
    }`,
    "",
  ];
  if (event.summary) lines.push(event.summary, "");
  if (event.why) lines.push(`**关注**：${event.why}`, "");
  if (event.links.length) {
    lines.push("## 信源", "");
    for (const link of event.links) {
      lines.push(`- [${link.label}](${/^https?:/.test(link.href) ? link.href : `${origin}${link.href}`})`);
    }
    lines.push("");
  }
  return lines.join("\n");
}
