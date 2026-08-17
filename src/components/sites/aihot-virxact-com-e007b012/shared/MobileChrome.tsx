"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  Menu,
  Monitor,
  Moon, Sun, X,
  type LucideIcon,} from "lucide-react";
import { cn } from "@/lib/utils";
import { MOBILE_TABS, NAV_GROUPS, type NavItem } from "./nav";
import { BrandLogo, BrandMark } from "./icons";
import { useTheme, type ThemeMode } from "./use-theme";
import { useChangelogUnread } from "./use-changelog-unread";
import { todayCstIso } from "./dates";

const THEME_OPTIONS:{ value: ThemeMode; label: string; icon: LucideIcon }[] = [
  { value: "dark", label: "深色", icon: Moon },{ value: "system", label: "跟随系统", icon: Monitor },{ value: "light", label: "浅色", icon: Sun },];

/** 三态主题切换(深色 / 跟随系统 / 浅色)，与桌面侧栏一致 */
function ThemeToggle() {
  const { mode, setTheme } = useTheme();
  const thumbIndex = mode === "dark" ? 0 : mode === "system" ? 1 : 2;

  return (
    <div className="relative mx-1 my-1.5 grid h-11 grid-cols-3 rounded-full border border-mc-line bg-mc-surface0 p-[3px]">
      <span
        aria-hidden="true"
        className={cn(
          "absolute top-[3px] bottom-[3px] left-[3px] w-[calc((100%-6px)/3)] rounded-full border border-mc-line-strong bg-mc-surface2 shadow-mc-thumb transition-transform duration-[260ms] ease-[cubic-bezier(.32,.72,0,1)]",
          thumbIndex === 1 && "translate-x-full",
          thumbIndex === 2 && "translate-x-[200%]",
        )}/>
      {THEME_OPTIONS.map((option) => {
        const Icon = option.icon;
        const active = mode === option.value;
        return (
          <button
            key={option.value}
            type="button"
            aria-label={option.label}
            aria-pressed={active}
            onClick={() => setTheme(option.value)}
            className={cn(
              "relative z-10 flex items-center justify-center text-mc-ink2",active && "text-mc-ink",
            )}
          >
            <Icon size={15}/>
          </button>
        );
      })}
    </div>
  );
}/** 移动 chrome(≤960px):sticky 顶栏 + 汉堡抽屉导航 + fixed 底部标签栏 */
export function MobileChrome() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [entered, setEntered] = useState(false);
  const { unread } = useChangelogUnread();

  const dotVisible = (item: NavItem) =>
    item.href === "/changelog" ? unread : true;

  const close = () => {
    setOpen(false);
    setEntered(false);
  };

  const isActive = (href?: string) => {
    if (!href) return false;
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  };

  // 抽屉挂载后下一帧滑入(只做入场动画)
  useEffect(() => {
    if (!open) return;
    let inner = 0;
    const outer = requestAnimationFrame(() => {
      inner = requestAnimationFrame(() => setEntered(true));
    });
    return () => {
      cancelAnimationFrame(outer);
      cancelAnimationFrame(inner);
    };
  },[open]);

  // 打开抽屉时锁定页面滚动
  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  },[open]);

  return (
    <>
      {/* 移动顶栏 */}
      <header className="sticky top-0 z-30 grid grid-cols-[44px_1fr_44px] items-center gap-2 border-b border-mc-line bg-[color-mix(in_srgb,var(--bg-0)_98%,transparent)] px-3 py-2 min-[961px]:hidden">
        <button
          type="button"
          aria-label="打开导航"
          onClick={() => setOpen(true)}
          className="flex h-11 w-11 items-center justify-center rounded-xl border border-mc-line-strong bg-mc-card text-mc-ink shadow-mc-soft active:scale-[.94]"
        >
          <Menu size={20}/>
        </button>
        <Link
          href="/"
          className="flex items-center justify-center gap-2 text-mc-ink"
        >
          <BrandMark size={22}/>
          <span className="text-[15px] font-bold tracking-[0.04em]">
            早筛情报站
          </span>
        </Link>
        <div className="h-11 w-11" aria-hidden="true" />
      </header>

      {/* 底部标签栏 */}
      <nav className="fixed right-0 bottom-0 left-0 z-[900] grid grid-cols-4 border-t border-mc-line bg-mc-card px-1.5 pt-1 pb-[calc(env(safe-area-inset-bottom,0px)_+_4px)] min-[961px]:hidden">
        {MOBILE_TABS.map((tab) => {
          const active = isActive(tab.href);
          const Icon = tab.icon;
          const classes = cn(
            "flex min-h-11 flex-col items-center gap-[3px] py-1 text-mc-ink2",active && "text-mc-accent",
          );
          const content = (
            <>
              <Icon size={22} strokeWidth={active ? 2.4 : 2}/>
              <span
                className={cn(
                  "text-[11px] leading-none font-semibold",active && "font-bold",
                )}
              >
                {tab.label}
              </span>
            </>
          );
          if (!tab.href) {
            return (
              <button
                key={tab.label}
                type="button"
                title="演示版未开放"
                className={classes}
              >
                {content}
              </button>
            );
          }
          return (
            <Link key={tab.label} href={tab.href} className={classes}>
              {content}
            </Link>
          );
        })}
      </nav>

      {/* 抽屉 + 遮罩 */}
      {open && (
        <>
          <div
            aria-hidden="true"
            onClick={close}
            className="fixed inset-0 z-[999] bg-[rgba(0,0,0,0.5)] min-[961px]:hidden"
          />
          <div
            role="dialog"
            aria-modal="true"
            aria-label="导航菜单"
            className={cn(
              "fixed top-0 bottom-0 left-0 z-[1000] grid w-[min(86vw,320px)] grid-rows-[auto_auto_1fr_auto] gap-2 overflow-y-auto border-r border-mc-line bg-mc-sidebar px-3.5 pt-3.5 pb-[18px] transition-transform duration-[190ms] ease-[cubic-bezier(.32,.72,0,1)] min-[961px]:hidden",
              entered ? "translate-x-0" : "-translate-x-full",
            )}
          >
            {/* 品牌 + 关闭 */}
            <div className="flex items-center justify-between">
              <BrandLogo />
              <button
                type="button"
                aria-label="关闭导航"
                onClick={close}
                className="flex h-11 w-11 items-center justify-center rounded-xl text-mc-ink1 hover:bg-mc-surface1"
              >
                <X size={20}/>
              </button>
            </div>

            <div className="h-px bg-mc-line" />

            {/* 导航分组 */}
            <nav>
              {NAV_GROUPS.map((group) => (
                <div key={group.label}>
                  <div className="px-2.5 pt-3.5 pb-1 font-mono text-[10px] uppercase tracking-[0.14em] text-mc-ink2">
                    {group.label}
                  </div>
                  {group.items.map((item) => {
                    const active = isActive(item.href);
                    const Icon = item.icon;
                    const classes = cn(
                      "flex min-h-11 items-center gap-2.5 rounded-lg px-3 py-2.5 text-[13px] font-medium text-mc-ink1",active &&
                        "bg-[rgba(var(--theme-accent-rgb),0.1)] font-semibold text-mc-cyan-fg",
                    );
                    const content = (
                      <>
                        <Icon size={16} className="shrink-0" />
                        <span>{item.label}</span>
                        {item.dot && dotVisible(item) && (
                          <span className="ml-auto h-1.5 w-1.5 rounded-full bg-mc-rose" />
                        )}
                      </>
                    );
                    if (!item.href) {
                      return (
                        <span
                          key={item.label}
                          title="演示版未开放"
                          className={classes}
                        >
                          {content}
                        </span>
                      );
                    }
                    return (
                      <Link
                        key={item.label}
                        href={item.href}
                        onClick={close}
                        className={classes}
                      >
                        {content}
                      </Link>
                    );
                  })}
                </div>
              ))}
            </nav>

            {/* 主题切换 + 备案行 */}
            <div>
              <ThemeToggle />
              <p className="px-2 pb-1 text-[10px] text-mc-ink2">
                截至 {todayCstIso()}
              </p>
            </div>
          </div>
        </>
      )}
    </>
  );
}
