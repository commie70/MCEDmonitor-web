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
}

interface LiveReport {
  generated_at: string;
  window_since: string;
  stories: Story[];
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

  const events:HotEvent[] = report.stories.slice(0, 20).map((s) => ({
    id: s.items?.[0]?.id ?? s.id,
    title: s.title,
    badge: s.badges[0],
    stale: s.stale_month ?? null,
    source: `${s.company} · ${s.items[0]?.source ?? "多信源"}${s.sources_count > 1 ? ` · 另有 ${s.sources_count - 1} 家信源` : ""}`,ago:agoOf(s.last_seen),
    heat: s.heat,
    spark: s.spark,
    sources: s.sources_count,}));

  return (
    <HotRankPanel
      events={events}
      heroDescription={`监测窗口 ${report.window_since} 至今，${report.stories.length} 条故事线按热度实时排序。`}
      methodNote={
        <>
          榜单热度 = Σ(信道权重 × 0.5^(年龄 / 24h)) + 跨引擎命中加成(Brave / Tavily /
          AnySearch / Firecrawl / Exa 每多一个信道命中 + 1.0)，检索命中频率越高排名越前；
          窗口为当前时间倒推 14 天，同一事件多信源合并为故事线。标签含义：新 = 12 小时内有更新。
        </>
      }/>
  );
}
