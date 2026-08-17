"use client";

/**
 * 早筛情报站 — 日期分组时间线 + 卡片流
 * 折叠 / 展开按日期独立；收藏态(starred)由本组件托管并透传给 ArticleCard。
 */

import { useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";

import { cn } from "@/lib/utils";

import { ArticleCard } from "./ArticleCard";
import type { DayGroupDef, NewsItem } from "./types";
import { useStarred } from "./use-starred";

export interface TimelineFeedProps {/** 父组件已完成分类 / 搜索过滤 */
  items: NewsItem[];
  /** 顺序即展示顺序 */
  dayGroups: DayGroupDef[];
  variant: "featured" | "all";
}

interface DayGroupItems {
  def: DayGroupDef;
  items: NewsItem[];
}

export function TimelineFeed({ items, dayGroups, variant }: TimelineFeedProps) {
  const [collapsed, setCollapsed] = useState<Record<string, boolean>>({});
  const { starred, toggle: toggleStarred } = useStarred();

  const groups = useMemo<DayGroupItems[]>(
    () =>
      dayGroups
        .map((def) => ({
          def,
          items: items
            .filter((item) => item.date === def.date)
            // "23:48" > "02:40"，零填充 HH: MM 字符串直接比较
            .sort((a, b) => (a.time < b.time ? 1 :a.time > b.time ? -1 : 0)),}))
        .filter((group) => group.items.length > 0),
    [dayGroups, items],
  );

  const toggleCollapsed = (date: string) => {
    setCollapsed((prev) => ({ ...prev, [date]: !prev[date] }));
  };

  const toggleStar = (item: NewsItem) => {
    toggleStarred({
      id: item.id,
      title: item.title,
      source: item.source,
      score: item.score,
      date: item.date,
      time: item.time,});
  };

  if (groups.length === 0) {
    return (
      <div className="rounded-[12px] border border-dashed border-[var(--border-emphasis)] bg-[var(--surface-0)] px-[20px] py-[28px] text-center text-[13px] text-[var(--text-1)]">
        没有匹配的动态，试试更换分类或关键词。
      </div>
    );
  }

  return (
    <div className="grid gap-[22px] max-[960px]:gap-[14px]">
      {groups.map(({ def, items: groupItems }) => {
        const isCollapsed = collapsed[def.date] ?? false;
        return (
          <section key={def.date} className="grid gap-[10px]">
            <div className="sticky top-0 z-[2] grid grid-cols-[64px_22px_1fr] items-center bg-[var(--bg-0)] max-[960px]:grid-cols-[86px_minmax(0,1fr)]">
              <h2 className="m-0 whitespace-nowrap text-right text-[15px] font-extrabold tracking-[-0.01em] text-[var(--text-0)] max-[960px]:col-start-2 max-[960px]:text-left max-[960px]:text-[16px] max-[960px]:font-bold">
                {def.label}
              </h2>
              <button
                type="button"
                onClick={() => toggleCollapsed(def.date)}
                aria-expanded={!isCollapsed}
                aria-label={`${isCollapsed ? "展开" : "收起"} ${def.label}`}
                className="inline-flex h-[22px] w-[22px] cursor-pointer items-center justify-center rounded-[4px] border border-transparent bg-transparent p-[2px] text-[var(--text-2)] transition-colors hover:border-[var(--border)] hover:bg-[var(--surface-1)] hover:text-[var(--text-0)] max-[960px]:col-start-1 max-[960px]:row-start-1 max-[960px]:justify-self-center"
              >
                <ChevronDown
                  size={14}
                  className={cn(
                    "transition-transform duration-200",
                    isCollapsed && "-rotate-90",
                  )}/>
              </button>
              <span className="pl-[2px] text-[11.5px] text-[var(--text-2)] max-[960px]:hidden">
                {def.weekday} · {groupItems.length} 条
              </span>
            </div>
            {!isCollapsed && (
              <div className="relative">
                <div
                  aria-hidden
                  className="absolute top-[6px] bottom-[6px] left-[calc(64px_+_11px)] w-px bg-[var(--border-strong)]"
                />
                {groupItems.map((item) => {
                  const isStarred = item.id in starred;
                  return (
                    <div
                      key={item.id}
                      className="grid grid-cols-[64px_22px_1fr] pb-[12px] last:pb-0 max-[960px]:pb-2 max-[960px]:last:pb-0"
                    >
                      <span className="pt-4 text-right font-semibold text-[12.5px] leading-[1.1] whitespace-nowrap tabular-nums text-[var(--text-1)] [font-family:ui-monospace,SFMono-Regular,Menlo,monospace] max-[960px]:pt-[10px] max-[960px]:text-[12px] max-[960px]:text-[var(--text-2)]">
                        {item.time}
                      </span>
                      <div className="relative">
                        <span
                          aria-hidden
                          className={cn(
                            "absolute top-[20px] left-1/2 h-[7px] w-[7px] -translate-x-1/2 rounded-full shadow-[0_0_0_3px_var(--bg-0)] max-[960px]:top-[16px]",
                            isStarred
                              ? "bg-[var(--accent-amber)]"
                              : "bg-[var(--accent-cyan)]",
                          )}/>
                      </div>
                      <ArticleCard
                        item={item}
                        variant={variant}
                        starred={isStarred}
                        onToggleStar={() => toggleStar(item)}/>
                    </div>
                  );
                })}
              </div>
            )}
          </section>
        );
      })}
    </div>
  );
}
