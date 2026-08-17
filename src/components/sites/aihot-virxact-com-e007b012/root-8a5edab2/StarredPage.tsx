"use client";

import { Bookmark, Trash2 } from "lucide-react";
import { useStarred } from "../shared/use-starred";

/**
 * 收藏页 — 复刻模板站 / starred。
 * 收藏只保存在当前浏览器；清除浏览器数据或换设备后不会同步。
 */
export function StarredPage() {
  const { starred, remove } = useStarred();
  const entries = Object.values(starred).sort((a, b) =>
    a.date < b.date ? 1 :a.date > b.date ? -1 :a.time < b.time ? 1 : -1
  );

  return (
    <div className="grid gap-4">
      <header className="pt-[6px]">
        <h1 className="m-0 text-[23px] font-bold leading-[1.2] tracking-[-0.01em] text-mc-ink">
          收藏
        </h1>
        <p className="mt-[5px] max-w-[700px] text-[12px] leading-[1.6] text-mc-ink2">
          本机收藏的早筛竞品动态，适合稍后阅读和回看。
        </p>
        <p className="mt-[4px] max-w-[700px] text-[12px] leading-[1.6] text-mc-ink2">
          收藏只保存在当前浏览器；清除浏览器数据或换设备后不会同步。
        </p>
        <hr className="mt-[10px] mb-[8px] border-0 border-t border-mc-line-soft" />
      </header>

      {entries.length === 0 ? (
        <div className="rounded-xl border border-dashed border-mc-emphasis bg-mc-surface0 p-[28px_20px] text-center">
          <Bookmark size={18} className="mx-auto text-mc-ink2" />
          <p className="mt-[10px] text-[14px] font-semibold text-mc-ink">还没有收藏内容</p>
          <p className="mx-auto mt-2 max-w-[520px] text-[12.5px] leading-[1.7] text-mc-ink1">
            在「精选」或「全部动态」的任意卡片上点击右侧书签图标，即可添加到这里。
          </p>
        </div>
      ) : (
        <section className="rounded-xl border border-mc-line bg-mc-card shadow-mc-card">
          <div className="flex items-center gap-[10px] border-b border-mc-line-soft px-4 py-[11px]">
            <span className="text-[15px] font-extrabold tracking-[0.04em] text-mc-ink">
              已收藏
            </span>
            <span className="text-[12px] text-mc-ink2">{entries.length} 条</span>
          </div>
          <ul className="m-0 list-none p-[4px_0_6px]">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="flex items-start gap-[12px] px-4 py-[10px] transition-colors hover:bg-mc-surface0"
              >
                <Bookmark
                  size={14}
                  className="mt-[4px] shrink-0 text-mc-rose-fg"
                  fill="currentColor"
                />
                <div className="min-w-0 flex-1">
                  <span className="text-[14px] font-semibold leading-[1.5] text-mc-ink">
                    {entry.title}
                  </span>
                  <div className="mt-[3px] flex flex-wrap gap-x-[10px] text-[11.5px] text-mc-ink2">
                    <span>{entry.source}</span>
                    <span className="tabular-nums">
                      {entry.date} {entry.time}
                    </span>
                    <span className="tabular-nums">监测评分 {entry.score}/100</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => remove(entry.id)}
                  aria-label="取消收藏"
                  title="取消收藏"
                  className="shrink-0 rounded-[8px] border border-transparent p-[5px] text-mc-ink2 transition hover:border-mc-line-strong hover:bg-mc-surface1 hover:text-mc-ink"
                >
                  <Trash2 size={14}/>
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
