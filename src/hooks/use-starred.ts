"use client";

import { useCallback } from "react";
import { createLocalStore, useLocalStore } from "./use-local-store";

/**
 * 收藏只存在当前浏览器。沿用旧版的键与字段(mced-starred-v1)，
 * 重构前收藏的条目继续显示，并能经 /items/{旧 id} 解析到事件。
 */
export interface StarredEntry {
  id: string;
  title: string;
  source: string;
  date: string;
  /** 旧版字段，新收藏不再写入 */
  score?: number;
  time?: string;
}

type StarredMap = Record<string, StarredEntry>;

const EMPTY: StarredMap = {};

const store = createLocalStore<StarredMap>("mced-starred-v1", EMPTY, (raw) => {
  const parsed: unknown = JSON.parse(raw);
  return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? (parsed as StarredMap) : EMPTY;
});

export function useStarred() {
  const [starred, write] = useLocalStore(store);

  const toggle = useCallback(
    (entry: StarredEntry) => {
      const current = store.snapshot();
      const next = { ...current };
      if (next[entry.id]) delete next[entry.id];
      else next[entry.id] = entry;
      write(JSON.stringify(next));
    },
    [write]
  );

  const remove = useCallback(
    (id: string) => {
      const current = store.snapshot();
      if (!current[id]) return;
      const next = { ...current };
      delete next[id];
      write(JSON.stringify(next));
    },
    [write]
  );

  return { starred, toggle, remove };
}
