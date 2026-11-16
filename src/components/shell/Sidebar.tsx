"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import { createLocalStore, useLocalStore } from "@/hooks/use-local-store";
import { cn } from "@/lib/utils";
import { NAV_GROUPS, isActive } from "./nav";
import { ThemeToggle } from "./ThemeToggle";

export interface ShellStatus {
  /** 监测健康度 */
  state: "ok" | "degraded" | "held" | "down" | "unknown";
  /** 最近一次监测运行(东八区日期) */
  lastRun: string;
  /** 更新日志的生成时间，用于未读红点 */
  changelogStamp: string;
}

const seenStore = createLocalStore<string>("mced-changelog-seen", "", (raw) => raw);

const STATE_TEXT: Record<ShellStatus["state"], string> = {
  ok: "监测正常",
  degraded: "部分信源缺口",
  held: "发布暂停",
  down: "采集中断",
  unknown: "监测状态未知",
};

export function Brand() {
  return (
    <Link href="/" className="flex items-center gap-[10px]" aria-label="早筛情报站首页">
      <svg viewBox="0 0 28 28" className="size-[28px] shrink-0" aria-hidden>
        <rect width="28" height="28" rx="7" className="fill-accent" />
        <circle cx="14" cy="14" r="7.2" fill="none" strokeWidth="1.6" className="stroke-panel" opacity="0.55" />
        <circle cx="14" cy="14" r="3.4" fill="none" strokeWidth="1.6" className="stroke-panel" opacity="0.8" />
        <circle cx="14" cy="14" r="1.5" className="fill-panel" />
        <path d="M14 14 L21.6 7.6" strokeWidth="1.6" strokeLinecap="round" className="stroke-panel" />
      </svg>
      <span className="min-w-0 leading-none">
        <span className="block whitespace-nowrap text-[15px] font-bold tracking-[0.01em] text-ink">早筛情报站</span>
        <span className="mt-[3px] block whitespace-nowrap font-mono text-[9.5px] tracking-[0.12em] text-ink-3">MCED · INTEL</span>
      </span>
    </Link>
  );
}

export function NavList({ status, onNavigate }: { status: ShellStatus; onNavigate?: () => void }) {
  const pathname = usePathname();
  const [seen, markSeen] = useLocalStore(seenStore);
  const unread = Boolean(status.changelogStamp) && status.changelogStamp > seen;

  useEffect(() => {
    if (pathname === "/changelog" && status.changelogStamp && status.changelogStamp > seen) {
      markSeen(status.changelogStamp);
    }
  }, [pathname, status.changelogStamp, seen, markSeen]);

  return (
    <nav aria-label="主导航" className="grid gap-4">
      {NAV_GROUPS.map((group) => (
        <div key={group.label}>
          <div className="mb-1 px-[10px] text-[11px] font-semibold tracking-[0.08em] text-ink-3">{group.label}</div>
          <ul className="grid gap-px">
            {group.items.map((item) => {
              const active = isActive(item, pathname);
              const Icon = item.icon;
              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    onClick={onNavigate}
                    aria-current={active ? "page" : undefined}
                    className={cn(
                      "flex h-[32px] items-center gap-[9px] rounded-[8px] px-[10px] text-[13.5px] transition",
                      active ? "bg-accent-soft font-semibold text-accent-ink" : "text-ink-2 hover:bg-sunken hover:text-ink"
                    )}
                  >
                    <Icon size={15} aria-hidden className="shrink-0" />
                    <span className="flex-1">{item.label}</span>
                    {item.href === "/changelog" && unread && (
                      <span className="size-[6px] rounded-full bg-self" aria-label="有新的更新" />
                    )}
                  </Link>
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </nav>
  );
}

export function StatusLine({ status }: { status: ShellStatus }) {
  return (
    <Link
      href="/daily"
      className="flex items-center gap-[7px] text-[11.5px] text-ink-3 transition hover:text-ink-2"
      title={STATE_TEXT[status.state]}
    >
      <span
        aria-hidden
        className={cn(
          "size-[7px] shrink-0 rounded-full",
          status.state === "ok" ? "bg-accent" : status.state === "unknown" ? "bg-ink-3" : "bg-self"
        )}
      />
      <span className="truncate">
        {status.state === "ok" ? status.lastRun || STATE_TEXT.ok : STATE_TEXT[status.state]}
      </span>
    </Link>
  );
}

export function Sidebar({ status }: { status: ShellStatus }) {
  return (
    <aside className="sticky top-0 hidden h-dvh w-[208px] shrink-0 flex-col border-r border-line px-3 py-5 lg:flex">
      <div className="px-[6px] pb-5">
        <Brand />
      </div>
      <div className="no-scrollbar min-h-0 flex-1 overflow-y-auto">
        <NavList status={status} />
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-line px-[6px] pt-3">
        <StatusLine status={status} />
        <ThemeToggle />
      </div>
    </aside>
  );
}
