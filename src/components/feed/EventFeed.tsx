"use client";

import { Search, X } from "lucide-react";
import { useMemo, useState } from "react";
import { Empty, pillClass } from "@/components/ui";
import type { EventKind } from "@/data/types";
import { useQueryState } from "@/hooks/use-query-state";
import { monthKey, monthLabel } from "@/lib/dates";
import { KIND_LABEL, KIND_ORDER, type IntelEvent } from "@/lib/event-model";
import { cn } from "@/lib/utils";
import { EventRow } from "./EventRow";

const PAGE = 40;

export interface FeedCompany {
  id: string;
  name: string;
  region: string;
}

/**
 * 事件时间线：类型 / 企业 / 地区 / 来源 / 关键词筛选，状态全部在 URL 里。
 * 按月分组，月内按日排列。
 */
export function EventFeed({
  events,
  companies,
  full,
}: {
  events: IntelEvent[];
  companies?: FeedCompany[];
  /** 全量模式：额外提供企业、地区与来源筛选 */
  full?: boolean;
}) {
  const query = useQueryState();
  const kind = query.get("kind");
  const company = query.get("co");
  const region = query.get("region");
  const origin = query.get("src");
  const keyword = query.get("q");
  const [limit, setLimit] = useState(PAGE);

  const kinds = useMemo(() => {
    const present = new Set(events.map((event) => event.kind));
    return KIND_ORDER.filter((value) => present.has(value));
  }, [events]);

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return events.filter((event) => {
      if (kind && event.kind !== kind) return false;
      if (company && event.companyId !== company) return false;
      if (region && event.region !== region) return false;
      if (origin && event.origin !== origin) return false;
      if (needle) {
        const haystack = `${event.title} ${event.summary} ${event.company} ${event.product} ${event.why}`.toLowerCase();
        if (!haystack.includes(needle)) return false;
      }
      return true;
    });
  }, [events, kind, company, region, origin, keyword]);

  const shown = filtered.slice(0, limit);
  const groups = useMemo(() => {
    const map = new Map<string, IntelEvent[]>();
    for (const event of shown) {
      const key = monthKey(event.date);
      const list = map.get(key);
      if (list) list.push(event);
      else map.set(key, [event]);
    }
    return [...map.entries()];
  }, [shown]);

  const update = (patch: Record<string, string | null>) => {
    setLimit(PAGE);
    query.set(patch);
  };

  const selectClass =
    "h-[28px] rounded-full border border-line bg-panel px-[10px] text-[12.5px] text-ink-2 outline-none transition hover:border-line-strong focus:border-accent";

  return (
    <div>
      <div className="mb-1 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar -mx-4 flex items-center gap-[6px] overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
          <button type="button" className={pillClass(!kind)} onClick={() => update({ kind: null })}>
            全部
          </button>
          {kinds.map((value: EventKind) => (
            <button
              key={value}
              type="button"
              className={pillClass(kind === value)}
              aria-pressed={kind === value}
              onClick={() => update({ kind: kind === value ? null : value })}
            >
              {KIND_LABEL[value]}
            </button>
          ))}
        </div>

        <div className="ml-auto flex flex-wrap items-center gap-2">
          {full && companies && (
            <>
              <select
                aria-label="企业"
                value={company}
                onChange={(event) => update({ co: event.target.value || null })}
                className={selectClass}
              >
                <option value="">全部企业</option>
                {companies.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name}
                  </option>
                ))}
              </select>
              <select
                aria-label="地区"
                value={region}
                onChange={(event) => update({ region: event.target.value || null })}
                className={selectClass}
              >
                <option value="">国内外</option>
                <option value="国外">国外</option>
                <option value="国内">国内</option>
              </select>
              <select
                aria-label="来源"
                value={origin}
                onChange={(event) => update({ src: event.target.value || null })}
                className={selectClass}
              >
                <option value="">监测 + 证据库</option>
                <option value="monitor">监测流水线</option>
                <option value="archive">证据库</option>
              </select>
            </>
          )}
          <label className="relative flex items-center">
            <Search size={13} aria-hidden className="pointer-events-none absolute left-[10px] text-ink-3" />
            <input
              type="search"
              aria-label="搜索标题与摘要"
              placeholder="搜索"
              value={keyword}
              onChange={(event) => update({ q: event.target.value || null })}
              className="h-[28px] w-[150px] rounded-full border border-line bg-panel pl-[28px] pr-[10px] text-[12.5px] text-ink outline-none transition placeholder:text-ink-3 hover:border-line-strong focus:w-[200px] focus:border-accent"
            />
          </label>
          {query.active && (
            <button
              type="button"
              onClick={() => {
                setLimit(PAGE);
                query.clear();
              }}
              className="inline-flex h-[28px] items-center gap-1 rounded-full px-2 text-[12px] text-ink-3 transition hover:text-ink"
            >
              <X size={12} aria-hidden />
              清除
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="mt-4">
          <Empty>没有符合条件的事件</Empty>
        </div>
      ) : (
        <>
          {groups.map(([key, list]) => (
            <section key={key} aria-label={monthLabel(key)}>
              <h2 className="sticky top-[52px] z-10 -mx-4 flex items-baseline gap-2 border-b border-line bg-bg/95 px-4 pb-[6px] pt-4 backdrop-blur lg:top-0 lg:mx-0 lg:px-0">
                <span className="text-[13px] font-bold text-ink">{monthLabel(key)}</span>
                <span className="text-[12px] tabular-nums text-ink-3">{list.length}</span>
              </h2>
              {list.map((event) => (
                <EventRow key={event.id} event={event} />
              ))}
            </section>
          ))}
          {filtered.length > shown.length && (
            <div className="pt-5 text-center">
              <button
                type="button"
                onClick={() => setLimit((value) => value + PAGE)}
                className={cn(pillClass(false), "h-[34px] px-5")}
              >
                再看 {Math.min(PAGE, filtered.length - shown.length)} 条 · 余 {filtered.length - shown.length}
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
