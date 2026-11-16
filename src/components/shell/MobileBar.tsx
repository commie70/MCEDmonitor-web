"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Ellipsis, X } from "lucide-react";
import { useRef } from "react";
import { cn } from "@/lib/utils";
import { MOBILE_TABS, isActive } from "./nav";
import { Brand, NavList, StatusLine, type ShellStatus } from "./Sidebar";
import { ThemeToggle } from "./ThemeToggle";

/**
 * 移动端：顶部品牌条 + 底部标签栏；「更多」打开原生 <dialog> 抽屉，
 * 由浏览器负责焦点陷阱、Escape 关闭与背景惰性。
 */
export function MobileBar({ status }: { status: ShellStatus }) {
  const pathname = usePathname();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const tabActive = MOBILE_TABS.some((tab) => isActive(tab, pathname));

  const close = () => dialogRef.current?.close();

  return (
    <>
      <header className="sticky top-0 z-30 flex h-[52px] items-center justify-between border-b border-line bg-bg/90 px-4 backdrop-blur lg:hidden">
        <Brand />
        <ThemeToggle />
      </header>

      <nav
        aria-label="底部导航"
        className="fixed inset-x-0 bottom-0 z-30 grid grid-cols-5 border-t border-line bg-panel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden"
      >
        {MOBILE_TABS.map((tab) => {
          const active = isActive(tab, pathname);
          const Icon = tab.icon;
          return (
            <Link
              key={tab.href}
              href={tab.href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex h-[54px] flex-col items-center justify-center gap-[3px] text-[10.5px]",
                active ? "font-semibold text-accent-ink" : "text-ink-3"
              )}
            >
              <Icon size={19} aria-hidden />
              {tab.label}
            </Link>
          );
        })}
        <button
          type="button"
          onClick={() => dialogRef.current?.showModal()}
          aria-haspopup="dialog"
          className={cn(
            "flex h-[54px] flex-col items-center justify-center gap-[3px] text-[10.5px]",
            tabActive ? "text-ink-3" : "font-semibold text-accent-ink"
          )}
        >
          <Ellipsis size={19} aria-hidden />
          更多
        </button>
      </nav>

      <dialog
        ref={dialogRef}
        aria-label="导航"
        onClick={(event) => {
          if (event.target === event.currentTarget) close();
        }}
        className="fixed inset-0 m-0 ml-auto h-dvh max-h-none w-[min(84vw,300px)] max-w-none border-l border-line bg-panel p-0 backdrop:bg-black/40"
      >
        <div className="flex h-full flex-col px-4 py-4">
          <div className="mb-4 flex items-center justify-between">
            <Brand />
            <button
              type="button"
              onClick={close}
              aria-label="关闭导航"
              className="grid size-[32px] place-items-center rounded-full text-ink-2 hover:bg-sunken"
            >
              <X size={17} aria-hidden />
            </button>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto">
            <NavList status={status} onNavigate={close} />
          </div>
          <div className="border-t border-line pt-3">
            <StatusLine status={status} />
          </div>
        </div>
      </dialog>
    </>
  );
}
