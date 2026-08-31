import Link from "next/link";

import { cn } from "@/lib/utils";

import type { HotEvent } from "./types";

function rankClass(index:number): string {
  if (index === 0) return "text-[15px] font-black text-mc-rank1";
  if (index === 1) return "text-[15px] font-black text-mc-rank2";
  if (index === 2) return "text-[15px] font-black text-mc-rank3";
  return "text-sm font-bold text-mc-rankrest";
}

export function HotTopicsCard({ events }:{ events:HotEvent[] }) {
  return (
    <section
      aria-label="当前热点"
      className="mb-5 rounded-xl border border-mc-line bg-mc-card shadow-mc-card"
    >
      <div className="flex items-center gap-2.5 border-b border-mc-line-soft px-4 py-[11px]">
        <span className="text-[15px] font-extrabold tracking-[0.04em] text-mc-ink">
          当前热点
        </span>
        <Link
          href="/hot"
          className="ml-auto text-xs font-bold text-mc-cyan-fg hover:underline"
        >
          完整榜单 →
        </Link>
      </div>
      <ol className="m-0 list-none pb-1.5 pt-1">
        {events.map((event, index) => (
          <li
            key={event.id}
            className="flex items-center gap-3 px-4 py-2 [transition: background_.14s_ease] last:rounded-b-[11px] hover:bg-mc-surface0 max-[960px]:gap-2 max-[960px]:px-3"
          >
            <span
              className={cn(
                "w-5 flex-none text-center leading-none",
                rankClass(index),
              )}
            >
              {index + 1}
            </span>
            <Link
              href={`/items/${encodeURIComponent(event.id)}`}
              className="min-w-0 flex-1 truncate text-sm font-semibold leading-normal text-mc-ink transition-colors hover:text-mc-cyan-fg"
            >
              {event.title}
            </Link>
            <span className="inline-flex flex-none items-center gap-1.5 text-[13px] font-semibold tabular-nums text-mc-ink2">
              {event.heat} 重要性
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
