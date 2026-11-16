"use client";

import { Monitor, Moon, Sun } from "lucide-react";
import { useTheme, type ThemeMode } from "@/hooks/use-theme";
import { cn } from "@/lib/utils";

const OPTIONS: { mode: ThemeMode; label: string; icon: typeof Sun }[] = [
  { mode: "light", label: "浅色", icon: Sun },
  { mode: "system", label: "跟随系统", icon: Monitor },
  { mode: "dark", label: "深色", icon: Moon },
];

export function ThemeToggle() {
  const { mode, setTheme } = useTheme();
  return (
    <div role="radiogroup" aria-label="主题" className="inline-flex rounded-full border border-line bg-sunken p-[2px]">
      {OPTIONS.map(({ mode: option, label, icon: Icon }) => (
        <button
          key={option}
          type="button"
          role="radio"
          aria-checked={mode === option}
          aria-label={label}
          title={label}
          onClick={() => setTheme(option)}
          className={cn(
            "grid size-[26px] place-items-center rounded-full text-ink-3 transition",
            mode === option && "bg-panel text-ink shadow-panel"
          )}
        >
          <Icon size={13} aria-hidden />
        </button>
      ))}
    </div>
  );
}
