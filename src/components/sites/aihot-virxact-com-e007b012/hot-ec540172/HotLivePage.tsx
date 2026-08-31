"use client";

import { useEffect, useState } from "react";
import { HotRankPanel } from "../shared/HotRankPanel";
import type { HotBadge,HotEvent } from "../shared/types";

interface StoryItem {
  id: string;
  category: string;
  channel: string;
  title: string;
  source: string;
  date: string;
  url: string;
}

interface Story {
  id: string;
  company: string;
  product: string;
  title: string;
  heat:number;
  badges:HotBadge[];
  stale_month?: string | null;
  sources_count:number;
  last_seen: string;
  spark:number[];
  items: StoryItem[];
  level?: "L1" | "L2" | "L3" | null;
  evidence_confidence?: "high" | "medium" | "low";
}

interface LiveReport {
  schema_version?: number;
  generated_at: string;
  window_since: string;
  stories: Story[];
  views?: { hot_event_ids: string[] };
}

function agoOf(date: string) {
  if (!date) return "时间不详";
  const hours = Math.max(0, (Date.now() - Date.parse(date)) / 3600000);
  if (hours < 1) return "刚刚";
  if (hours < 24) return `${Math.floor(hours)}小时前`;
  return `${Math.floor(hours / 24)}天前`;
}

export function HotLivePage() {
  const [report, setReport] = useState<LiveReport | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/monitor/daily-report.json",{ cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setReport(json as LiveReport))
      .catch(() => setFailed(true));
  },[]);

  if (failed) {
    return (
      <div className="rounded-xl border border-dashed border-mc-emphasis bg-mc-surface0 p-[28px_20px] text-center">
        <p className="text-[14px] font-semibold text-mc-ink">热点榜等待监测数据</p>
        <p className="mx-auto mt-2 max-w-[560px] text-[12.5px] leading-[1.7] text-mc-ink1">
          在项目根目录运行{" "}
          <code className="rounded bg-mc-surface2 px-[6px] py-[2px] text-[12px] text-mc-ink">
            npm run monitor
          </code>{" "}
          生成监测报告后，本页自动按故事线热度排序展示。
        </p>
      </div>
    );
  }

  if (!report) {
    return <p className="py-10 text-center text-[13px] text-mc-ink1">正在读取监测报告…</p>;
  }

  const storyById = new Map(report.stories.map((story) => [story.id, story]));
  const rankedStories = report.views?.hot_event_ids
    ? report.views.hot_event_ids.map((id) => storyById.get(id)).filter((story): story is Story => Boolean(story))
    : report.stories;
  const events:HotEvent[] = rankedStories.slice(0, 20).map((s) => ({
    id: s.items?.[0]?.id ?? s.id,
    title: s.title,
    badge: s.badges[0],
    stale: s.stale_month ?? null,
    source: `${s.company} · ${s.items[0]?.source ?? "多信源"}${s.sources_count > 1 ? ` · 另有 ${s.sources_count - 1} 家信源` : ""}`,ago:agoOf(s.last_seen),
    heat: s.heat,
    level: s.level,
    evidenceConfidence: s.evidence_confidence,
    spark: s.spark,
    sources: s.sources_count,}));

  return (
    <HotRankPanel
      events={events}
      heroDescription={`监测窗口 ${report.window_since} 至今，${rankedStories.length} 个事件按重要性与事件时间排序。`}
      methodNote={
        report.schema_version === 2 ? (
          <>
            榜单按 L1–L3、重要性总分、事件时间依次排序；重要性由相关性、竞争影响、行动价值三个固定档位相加。
            搜索引擎重复命中不增加分数；信源数按独立编辑主体计算。标签含义：新 = 首次发布，更新 = 实质更新。
          </>
        ) : (
          <>当前仍展示切换前的兼容数据；新账本正在影子运行，达到验收门槛后切换。</>
        )
      }/>
  );
}
