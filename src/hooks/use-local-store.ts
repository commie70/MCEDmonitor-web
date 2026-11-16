"use client";

import { useCallback, useSyncExternalStore } from "react";

/**
 * localStorage 上的极小外部存储：同页多组件同步、跨标签页同步、SSR 安全。
 * 快照按原始字符串缓存，保证 useSyncExternalStore 所需的引用稳定。
 */
export function createLocalStore<T>(key: string, fallback: T, parse: (raw: string) => T) {
  const listeners = new Set<() => void>();
  let cachedRaw: string | null | undefined;
  let cached: T = fallback;

  function snapshot(): T {
    let raw: string | null = null;
    try {
      raw = window.localStorage.getItem(key);
    } catch {
      raw = null;
    }
    if (raw !== cachedRaw) {
      cachedRaw = raw;
      try {
        cached = raw === null ? fallback : parse(raw);
      } catch {
        cached = fallback;
      }
    }
    return cached;
  }

  function subscribe(callback: () => void) {
    listeners.add(callback);
    const onStorage = (event: StorageEvent) => {
      if (event.key === key) callback();
    };
    window.addEventListener("storage", onStorage);
    return () => {
      listeners.delete(callback);
      window.removeEventListener("storage", onStorage);
    };
  }

  function write(raw: string) {
    try {
      window.localStorage.setItem(key, raw);
    } catch {
      // 隐私模式或配额耗尽：仅本次会话内不持久化
    }
    listeners.forEach((listener) => listener());
  }

  return { snapshot, subscribe, write, fallback };
}

export function useLocalStore<T>(store: ReturnType<typeof createLocalStore<T>>): [T, (raw: string) => void] {
  const value = useSyncExternalStore(store.subscribe, store.snapshot, () => store.fallback);
  const write = useCallback((raw: string) => store.write(raw), [store]);
  return [value, write];
}
