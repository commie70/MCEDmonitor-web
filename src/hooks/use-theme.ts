"use client";

import { useCallback, useEffect } from "react";
import { createLocalStore, useLocalStore } from "./use-local-store";

export type ThemeMode = "dark" | "system" | "light";

/** 与 layout.tsx 的预水合脚本共用同一个键，旧版用户的选择原样保留。 */
export const THEME_KEY = "mced-theme";

const store = createLocalStore<ThemeMode>(THEME_KEY, "system", (raw) =>
  raw === "dark" || raw === "light" ? raw : "system"
);

function apply(mode: ThemeMode) {
  const resolved =
    mode === "system" ? (window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light") : mode;
  const root = document.documentElement;
  root.setAttribute("data-theme", resolved);
  root.style.colorScheme = resolved;
}

/** 三态主题：深色 / 跟随系统 / 浅色。 */
export function useTheme() {
  const [mode, write] = useLocalStore(store);

  useEffect(() => {
    apply(mode);
    if (mode !== "system") return;
    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => apply("system");
    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [mode]);

  const setTheme = useCallback((next: ThemeMode) => write(next), [write]);
  return { mode, setTheme };
}
