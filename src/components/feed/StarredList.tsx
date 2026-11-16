"use client";

import Link from "next/link";
import { X } from "lucide-react";
import { useMemo } from "react";
import { DownloadButton } from "@/components/actions";
import { Empty, PageHeader } from "@/components/ui";
import { useStarred } from "@/hooks/use-starred";
import { compareDateDesc, shortDate, yearOf } from "@/lib/dates";

/** 收藏只保存在当前浏览器；可导出为 JSON 备份。 */
export function StarredList() {
  const { starred, remove } = useStarred();
  const entries = useMemo(
    () => Object.values(starred).sort((a, b) => compareDateDesc(a.date, b.date)),
    [starred]
  );

  return (
    <div className="max-w-[820px]">
      <PageHeader title="收藏" count={entries.length}>
        {entries.length > 0 && (
          <DownloadButton
            filename="mced-starred.json"
            type="application/json"
            content={JSON.stringify(entries, null, 2)}
            label="导出"
          />
        )}
      </PageHeader>

      {entries.length === 0 ? (
        <Empty>还没有收藏</Empty>
      ) : (
        <ul>
          {entries.map((entry) => (
            <li key={entry.id} className="grid grid-cols-[minmax(0,1fr)_28px] gap-x-3 border-b border-line py-3 last:border-b-0">
              <div className="min-w-0">
                <Link
                  href={`/items/${encodeURIComponent(entry.id)}`}
                  className="text-[14.5px] font-semibold leading-[1.5] text-ink transition hover:text-accent-ink"
                >
                  {entry.title}
                </Link>
                <div className="mt-[3px] flex flex-wrap gap-x-2 text-[12px] text-ink-3">
                  <span className="truncate">{entry.source}</span>
                  {entry.date && (
                    <time dateTime={entry.date} className="tabular-nums">
                      {yearOf(entry.date)} · {shortDate(entry.date)}
                    </time>
                  )}
                </div>
              </div>
              <button
                type="button"
                onClick={() => remove(entry.id)}
                aria-label="移除收藏"
                title="移除收藏"
                className="grid size-[28px] place-items-center rounded-full text-ink-3 transition hover:bg-sunken hover:text-ink"
              >
                <X size={14} aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
