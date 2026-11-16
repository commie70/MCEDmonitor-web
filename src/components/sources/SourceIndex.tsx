"use client";

import Link from "next/link";
import { ArrowUpRight, Search, X } from "lucide-react";
import { useMemo } from "react";
import { Empty, pillClass } from "@/components/ui";
import { SOURCE_KIND_LABEL } from "@/data/meta";
import type { SourceKind } from "@/data/types";
import { useQueryState } from "@/hooks/use-query-state";

export interface SourceRow {
  id: string;
  kind: SourceKind;
  title: string;
  meta: string;
  /** 公开原文地址；站内重建的资料没有 */
  url: string | null;
  cites: number;
}

const KIND_ORDER: SourceKind[] = ["journal", "conference", "registry", "regulator", "company", "media", "internal"];

/** 信源库索引：类型与关键词筛选，状态在 URL 里。 */
export function SourceIndex({ rows }: { rows: SourceRow[] }) {
  const query = useQueryState();
  const kind = query.get("kind");
  const keyword = query.get("q");

  const counts = useMemo(() => {
    const map = new Map<SourceKind, number>();
    for (const row of rows) map.set(row.kind, (map.get(row.kind) ?? 0) + 1);
    return map;
  }, [rows]);

  const filtered = useMemo(() => {
    const needle = keyword.trim().toLowerCase();
    return rows.filter((row) => {
      if (kind && row.kind !== kind) return false;
      return !needle || `${row.title} ${row.meta}`.toLowerCase().includes(needle);
    });
  }, [rows, kind, keyword]);

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div className="no-scrollbar -mx-4 flex min-w-0 flex-1 gap-[6px] overflow-x-auto px-4 sm:mx-0 sm:px-0">
          <button type="button" className={pillClass(!kind)} onClick={() => query.set({ kind: null })}>
            全部 <span className="ml-[5px] tabular-nums opacity-60">{rows.length}</span>
          </button>
          {KIND_ORDER.filter((value) => counts.has(value)).map((value) => (
            <button
              key={value}
              type="button"
              className={pillClass(kind === value)}
              aria-pressed={kind === value}
              onClick={() => query.set({ kind: kind === value ? null : value })}
            >
              {SOURCE_KIND_LABEL[value]}
              <span className="ml-[5px] tabular-nums opacity-60">{counts.get(value)}</span>
            </button>
          ))}
        </div>
        <label className="relative w-full sm:w-[220px]">
          <Search size={14} aria-hidden className="pointer-events-none absolute left-[10px] top-1/2 -translate-y-1/2 text-ink-3" />
          <input
            type="search"
            value={keyword}
            onChange={(event) => query.set({ q: event.target.value || null })}
            placeholder="标题 / 作者 / 期刊"
            aria-label="检索信源"
            className="h-[30px] w-full rounded-full border border-line bg-panel pl-[30px] pr-[30px] text-[12.5px] text-ink outline-none transition placeholder:text-ink-3 focus:border-accent [&::-webkit-search-cancel-button]:hidden"
          />
          {keyword && (
            <button
              type="button"
              aria-label="清除关键词"
              onClick={() => query.set({ q: null })}
              className="absolute right-[8px] top-1/2 -translate-y-1/2 text-ink-3 transition hover:text-ink"
            >
              <X size={14} aria-hidden />
            </button>
          )}
        </label>
      </div>

      {filtered.length ? (
        <ul className="divide-y divide-line overflow-hidden rounded-xl border border-line bg-panel shadow-panel">
          {filtered.map((row) => (
            <li key={row.id} className="flex items-start gap-3 px-4 py-[10px]">
              <span className="mt-[2px] hidden w-[56px] shrink-0 text-[11.5px] text-ink-3 sm:block">
                {SOURCE_KIND_LABEL[row.kind]}
              </span>
              <div className="min-w-0 flex-1">
                {row.url ? (
                  <a
                    href={row.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="text-[13.5px] font-semibold leading-[1.5] text-ink transition hover:text-accent-ink"
                  >
                    {row.title}
                    <ArrowUpRight size={12} aria-hidden className="ml-1 inline opacity-50" />
                  </a>
                ) : (
                  <Link
                    href={`/sources/${row.id}`}
                    className="text-[13.5px] font-semibold leading-[1.5] text-ink transition hover:text-accent-ink"
                  >
                    {row.title}
                  </Link>
                )}
                {row.meta && <div className="mt-[2px] text-[12px] leading-[1.5] text-ink-3">{row.meta}</div>}
              </div>
              {row.cites > 0 && (
                <Link
                  href={`/sources/${row.id}`}
                  className="mt-[1px] shrink-0 whitespace-nowrap rounded-full border border-line px-2 text-[11.5px] leading-[20px] tabular-nums text-ink-3 transition hover:border-accent hover:text-accent-ink"
                >
                  引用 {row.cites}
                </Link>
              )}
            </li>
          ))}
        </ul>
      ) : (
        <Empty>没有匹配的信源</Empty>
      )}
    </>
  );
}
