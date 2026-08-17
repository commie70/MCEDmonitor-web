/**
 * 早筛情报站 — 内容类型定义
 * 字段语义对齐 AIHOT(aihot.virxact.com)精选页 / 全部动态 / 热点榜三页。
 */

export type CategoryKey =
  | "product" // 产品发布
  | "regulatory" // 监管获批
  | "clinical" // 临床数据
  | "conference" // 会议摘要
  | "publication" // 文献
  | "funding" // 融资合作
  | "opinion"; // 行业观点

export type SourceType =
  | "official" // 企业官网与公众号
  | "journal" // 期刊与文献
  | "conference" // 会议
  | "regulator" // 监管机构
  | "social" // 社交媒体
  | "media"; // 行业媒体

export interface CategoryDef {
  key: CategoryKey;
  label: string;
}

export interface NewsQuote {
  source: string;
  text: string;
}

export interface NewsItem {
  id: string;
  /** ISO 日期，用于分组，如 "2026-08-15" */
  date: string;
  /** 展示时间 "03:22" */
  time: string;
  /** 信源标签，如 "GRAIL：Newsroom（网页）" */
  source: string;
  /** 社交账号句柄，可选，如 "@GrailBio" */
  handle?: string;
  sourceType: SourceType;
  category: CategoryKey;
  /** 是否编辑精选(精选页条目均为 true) */
  featured: boolean;
  /** 监测评分 0-100 */
  score:number;
  title: string;
  /** 摘要段(可多段) */
  summary?: string[];
  /** 引用块(原站为灰底引文盒) */
  quote?: NewsQuote;
  /** 「另有 N 家信源报道」 */
  otherSources?:number;
  /** 关注理由(精选页特有) */
  reason?: string;
  /** 标签行(全部动态页特有)，如 ["GRAIL", "临床数据"] */
  tags?: string[];
}

export interface DayGroupDef {
  date: string;
  /** "8月15日" */
  label: string;
  /** "星期六" */
  weekday: string;
}

export type HotBadge = "爆" | "新" | "发酵中";

export interface HotEvent {
  id: string;
  title: string;
  badge?:HotBadge;
  /** 「旧文」月份(YYYY-MM，最新可推断证据早于监测窗口起点) */
  stale?: string | null;
  /** "GRAIL：Newsroom（网页）" */
  source: string;
  /** "16小时前" */
  ago: string;
  heat:number;
  /** 迷你趋势折线数据(由左到右) */
  spark:number[];
  /** 关联信源数 */
  sources:number;
}
