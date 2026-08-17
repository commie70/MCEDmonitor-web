"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * 收藏存储：仅当前浏览器 localStorage。
 * 清除浏览器数据或换设备后不会同步(与模板站一致)。
 */

export interface StarredEntry {
  id: string;
  title: string;
  source: string;
  score:number;
  date: string;
  time: string;
}

type StarredMap = Record<string, StarredEntry>;

const STORAGE_KEY = "mced-starred-v1";
const EMPTY: StarredMap = {};
const listeners = new Set<() => void>();

let cachedRaw: string | null = null;
let cached: StarredMap = EMPTY;

function safeParse(raw: string): StarredMap {
  try {
    const parsed = JSON.parse(raw);
    return parsed && typeof parsed === "object" ? (parsed as StarredMap) : EMPTY;
  } catch {
    return EMPTY;
  }
}

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function read(): StarredMap {
  if (typeof window === "undefined") return EMPTY;
  return getSnapshot();
}/** 按原始字符串缓存解析结果，保证快照引用稳定(useSyncExternalStore 要求) */
function getSnapshot(): StarredMap {
  const raw = window.localStorage.getItem(STORAGE_KEY);
  if (raw !== cachedRaw) {
    cachedRaw = raw;
    cached = raw ? safeParse(raw) : EMPTY;
  }
  return cached;
}

function getServerSnapshot(): StarredMap {
  return EMPTY;
}

function write(next: StarredMap) {
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((l) => l());
}

export function useStarred() {
  const starred = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(
    (entry: StarredEntry) => {
      const current = read();
      if (current[entry.id]) {
        const next = { ...current };
        delete next[entry.id];
        write(next);
      } else {
        write({ ...current, [entry.id]: entry });
      }
    },[]
  );

  const remove = useCallback((id: string) => {
    const current = read();
    if (!current[id]) return;
    const next = { ...current };
    delete next[id];
    write(next);
  },[]);

  return { starred, toggle, remove };
}
