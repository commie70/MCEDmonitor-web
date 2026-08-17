"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Monitor, Moon, Sun, type LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { BrandLogo } from "./icons";
import { NAV_GROUPS, type NavItem } from "./nav";
import { useTheme, type ThemeMode } from "./use-theme";
import { useChangelogUnread } from "./use-changelog-unread";
import { todayCstIso } from "./dates";

function isActive(pathname: string, href: string): boolean {
  if (href === "/") return pathname === "/";
  return pathname.startsWith(href);
}

function NavEntry({
  item,pathname,
  dotVisible,}:{
  item: NavItem;
  pathname: string;
  dotVisible: boolean;
}) {
  const active = item.href !== undefined && isActive(pathname, item.href);
  const body = (
    <>
      <item.icon size={16} aria-hidden className="shrink-0" />
      {item.label}
      {item.dot && dotVisible ? (
        <span className="ml-auto h-1.5 w-1.5 rounded-full bg-[var(--accent-rose)]" />
      ) :null}
    </>
  );

  if (item.href === undefined) {
    return (
      <span
        title="演示版未开放"
        className="relative flex cursor-default items-center gap-[9px] rounded-[8px] px-[10px] py-[8px] text-[13px] font-medium text-[var(--text-1)]"
      >
        {body}
      </span>
    );
  }

  return (
    <Link
      href={item.href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-[9px] rounded-[8px] px-[10px] py-[8px] text-[13px] font-medium text-[var(--text-1)] transition-colors duration-[120ms]",active
          ? "bg-[rgba(var(--theme-accent-rgb),.1)] font-semibold text-[var(--accent-cyan-fg)]"
          : "hover:bg-[var(--surface-1)] hover:text-[var(--text-0)]",
      )}
    >
      {body}
    </Link>
  );
}

const THEME_OPTIONS:{ mode: ThemeMode; label: string; icon: LucideIcon }[] = [
  { mode: "dark", label: "深色", icon: Moon },{ mode: "system", label: "跟随系统", icon: Monitor },{ mode: "light", label: "浅色", icon: Sun },];

const THUMB_OFFSET: Record<ThemeMode, string> = {
  dark: "translate-x-0",
  system: "translate-x-full",
  light: "translate-x-[200%]",};

function ThemeToggle() {// useTheme 初始值恒为 "system"，挂载后才在 effect 内读 localStorage 更新，// 因此首次渲染(SSR / 水合)一律按 system 渲染，无 hydration mismatch。
  const { mode, setTheme } = useTheme();

  return (
    <div
      role="radiogroup"
      aria-label="主题"
      className="relative mx-1 mt-1 mb-2 grid h-[34px] grid-cols-3 rounded-full border border-[var(--border)] bg-[var(--surface-0)] p-[3px]"
    >
      <span
        aria-hidden
        className={cn(
          "absolute top-[3px] bottom-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-full border border-[var(--border-strong)] bg-[var(--surface-2)] shadow-[var(--shadow-thumb)] transition-transform duration-[260ms] ease-[cubic-bezier(.32,.72,0,1)]",
          THUMB_OFFSET[mode],
        )}/>
      {THEME_OPTIONS.map((option) => {
        const checked = mode === option.mode;
        return (
          <button
            key={option.mode}
            type="button"
            role="radio"
            aria-checked={checked}
            aria-label={option.label}
            title={option.label}
            onClick={() => setTheme(option.mode)}
            className={cn(
              "relative z-10 flex cursor-pointer items-center justify-center rounded-full transition-colors duration-[120ms]",
              checked
                ? "text-[var(--text-0)]"
                : "text-[var(--text-2)] hover:text-[var(--text-1)]",
            )}
          >
            <option.icon size={15} aria-hidden/>
          </button>
        );
      })}
    </div>
  );
}

export function SiteSidebar() {
  const pathname = usePathname();
  const { unread } = useChangelogUnread();

  return (
    <aside className="sticky top-0 grid h-screen grid-rows-[auto_auto_1fr_auto] gap-2 border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)] px-3 pt-6 pb-[14px] max-[960px]:hidden">
      <Link
        href="/"
        className="flex items-center justify-center px-2 pt-[6px] pb-[14px]"
      >
        <BrandLogo />
      </Link>
      <div className="h-px bg-[var(--border)]" />
      <nav className="grid content-start gap-1 overflow-y-auto px-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {NAV_GROUPS.map((group) => (
          <div key={group.label}>
            <div className="px-[10px] pt-[14px] pb-[4px] font-mono text-[10px] tracking-[.14em] text-[var(--text-2)] uppercase">
              {group.label}
            </div>
            {group.items.map((item) => (
              <NavEntry
                key={item.label}
                item={item}
                pathname={pathname}
                dotVisible={item.href === "/changelog" ? unread : true}/>
            ))}
          </div>
        ))}
      </nav>
      <div className="grid gap-1 px-1">
        <ThemeToggle />
        <div className="px-2 pb-1 text-[10px] leading-[1.4] text-[var(--text-2)]">
          截至 {todayCstIso()}
        </div>
      </div>
    </aside>
  );
}
