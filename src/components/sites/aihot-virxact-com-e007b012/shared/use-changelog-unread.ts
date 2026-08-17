"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

/**
 * 更新日志未读状态：* - 拉取 / changelog.json 的 generated_at，与 localStorage 中的已读水位比较
 * - 用户打开更新日志页(markSeen)后红点消除；有新数据更新时红点再次出现
 */

const SEEN_KEY = "mced-changelog-seen";
const listeners = new Set<() => void>();

let cachedSeen: string | null = null;
let seenInit = false;

function subscribe(cb: () => void) {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}

function getSeenSnapshot(): string | null {
  const raw = window.localStorage.getItem(SEEN_KEY);
  if (!seenInit || raw !== cachedSeen) {
    seenInit = true;
    cachedSeen = raw;
  }
  return cachedSeen;
}

function getServerSnapshot(): string | null {
  return null;
}

export function useChangelogUnread() {
  const [generatedAt, setGeneratedAt] = useState<string | null>(null);

  useEffect(() => {
    fetch("/changelog.json",{ cache: "no-store" })
      .then((res) => (res.ok ? res.json() :null))
      .then((json) => setGeneratedAt(json?.generated_at ?? null))
      .catch(() => {});
  },[]);

  const seen = useSyncExternalStore(subscribe, getSeenSnapshot, getServerSnapshot);

  const unread = Boolean(generatedAt && (!seen || generatedAt > seen));

  const markSeen = () => {
    window.localStorage.setItem(SEEN_KEY,new Date().toISOString());
    listeners.forEach((l) => l());
  };

  return { unread, markSeen };
}
