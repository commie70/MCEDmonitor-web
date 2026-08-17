"use client";

import { useMemo, useState } from "react";
import { CATEGORIES, TOP_HOT } from "../shared/data";
import type { DayGroupDef, NewsItem } from "../shared/types";
import { FeedHeader } from "../shared/FeedHeader";
import { HotTopicsCard } from "../shared/HotTopicsCard";
import { TimelineFeed } from "../shared/TimelineFeed";

function matches(item: NewsItem, search: string) {
  const haystack = [item.title, ...(item.summary ?? []), item.reason ?? ""]
    .join(" ")
    .toLowerCase();
  return haystack.includes(search.trim().toLowerCase());
}

export function FeaturedPage({
  subtitle,
  dayGroups,
  items,}:{
  subtitle: string;
  dayGroups: DayGroupDef[];
  items: NewsItem[];
}) {
  const [category, setCategory] = useState("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(
    () =>
      items.filter(
        (item) =>
          (category === "all" || item.category === category) &&
          (search.trim() === "" || matches(item, search))
      ),
    [items, category, search]
  );

  return (
    <div className="grid gap-4">
      <FeedHeader
        title="精选"
        subtitle={subtitle}
        categories={CATEGORIES}
        activeCategory={category}
        onCategoryChange={setCategory}
        searchValue={search}
        onSearchChange={setSearch}/>
      <HotTopicsCard events={TOP_HOT}/>
      <TimelineFeed items={filtered} dayGroups={dayGroups} variant="featured" />
    </div>
  );
}
