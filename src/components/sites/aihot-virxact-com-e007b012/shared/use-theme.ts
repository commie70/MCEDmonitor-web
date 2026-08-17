"use client";

import { useCallback, useEffect, useSyncExternalStore } from "react";

export type ThemeMode = "dark" | "system" | "light";

const STORAGE_KEY = "mced-theme";
const listeners = new Set<() => void>();

function subscribe(callback: () => void) {
  listeners.add(callback);
  return () => {
    listeners.delete(callback);
  };
}

function readStored(): ThemeMode {
  const saved = window.localStorage.getItem(STORAGE_KEY);
  return saved === "dark" || saved === "system" || saved === "light"
    ? saved
    : "system";
}

function getSnapshot(): ThemeMode {
  return readStored();
}

function getServerSnapshot(): ThemeMode {
  return "system";
}

function resolve(mode: ThemeMode): "dark" | "light" {
  if (mode !== "system") return mode;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function apply(mode: ThemeMode) {
  const resolved = resolve(mode);
  const el = document.documentElement;
  el.setAttribute("data-theme", resolved);
  el.style.colorScheme = resolved;
}/**
 * 三态主题(深色 / 跟随系统 / 浅色)：读 localStorage「mced-theme」,
 * 写入 <html data-theme>,system 模式下跟随 prefers-color-scheme 变化。
 * 与 src/app/layout.tsx 中的预水合脚本保持一致；
 * 多个组件同时使用本 hook 时通过自定义订阅保持同步。
 */
export function useTheme() {
  const mode = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  useEffect(() => {
    if (mode !== "system") return;
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  },[mode]);

  const setTheme = useCallback((next: ThemeMode) => {
    window.localStorage.setItem(STORAGE_KEY,next);
    apply(next);
    listeners.forEach((listener) => listener());
  },[]);

  return { mode, setTheme };
}
