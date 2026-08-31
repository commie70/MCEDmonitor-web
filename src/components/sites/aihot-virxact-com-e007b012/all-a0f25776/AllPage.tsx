"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, SOURCE_TYPES } from "../shared/data";
import type { DayGroupDef, NewsItem } from "../shared/types";
import { FeedHeader } from "../shared/FeedHeader";
import { TimelineFeed } from "../shared/TimelineFeed";

export function AllPage({
  subtitle,
  dayGroups,
  items,}:{
  subtitle: string;
  dayGroups: DayGroupDef[];
  items: NewsItem[];
}) {
  const [category, setCategory] = useState("all");
  const [sourceType, setSourceType] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    const kw = search.trim().toLowerCase();
    return items.filter(
      (item) =>
        (category === "all" || item.category === category) &&
        (sourceType === "all" || item.sourceType === sourceType) &&
        (kw === "" ||
          [item.title, ...(item.summary ?? []), (item.tags ?? []).join(" ")]
            .join(" ")
            .toLowerCase()
            .includes(kw))
    );
  },[items, category, sourceType, search]);

  return (
    <div className="grid gap-4">
      <FeedHeader
        title="全部动态"
        subtitle={subtitle}
        categories={CATEGORIES}
        activeCategory={category}
        onCategoryChange={setCategory}
        searchValue={search}
        onSearchChange={setSearch}
        sourceTypes={SOURCE_TYPES.filter((t) => t.key !== "all")}
        activeSourceType={sourceType}
        onSourceTypeChange={setSourceType}/>
      <TimelineFeed items={filtered} dayGroups={dayGroups} variant="all" />
      {filtered.length > 0 && (
        <p className="py-[18px] pb-2 text-center text-xs text-mc-ink2">
          已展示全部 {filtered.length} 条事件
        </p>
      )}
    </div>
  );
}
