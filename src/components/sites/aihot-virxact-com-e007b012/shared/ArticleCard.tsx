"use client";

import Link from "next/link";
import { Bookmark } from "lucide-react";
import { cn } from "@/lib/utils";
import type { NewsItem } from "./types";

export interface ArticleCardProps {
  item: NewsItem;
  variant: "featured" | "all";
  starred: boolean;
  onToggleStar: (id: string) => void;
}

const MONO_FONT = "font-[ui-monospace,SFMono-Regular,Menlo,monospace]";

function scoreColorClass(score:number): string {
  if (score >= 80) return "text-[var(--accent-emerald-fg)]";
  if (score >= 60) return "text-[var(--accent-cyan-fg)]";
  return "text-[var(--text-2)]";
}

const CONFIDENCE_LABEL = { high: "High", medium: "Medium", low: "Low" } as const;

export function ArticleCard({ item, variant, starred, onToggleStar }: ArticleCardProps) {
  const isFeatured = variant === "featured";
  const showBadge = isFeatured && item.featured;
  const showQuote = isFeatured && Boolean(item.quote);
  const showOtherSources = isFeatured && (item.otherSources ?? 0) > 0;
  const showReason = isFeatured && Boolean(item.reason);
  const showTags = !isFeatured && (item.tags?.length ?? 0) > 0;
  const hasBodyContent =
    (item.summary?.length ?? 0) > 0 || showQuote || showOtherSources;

  return (
    <article
      className={cn(
        "group rounded-[12px] border border-[var(--border)] bg-[var(--surface-card)] p-[15px_18px_14px] shadow-[var(--shadow-card)]",
        "transition-[border-color_.16s_ease,background_.16s_ease,box-shadow_.16s_ease,transform_.16s_ease]",
        "hover:-translate-y-px hover:border-[var(--border-card-subtle-solid)] hover:bg-[var(--surface-card-hover)] hover:shadow-[var(--shadow-card-hover)]",
        "max-[960px]:p-[13px]",
      )}
    >
      {/* head */}
      <div
        className={cn(
          "mb-[6px] flex items-center justify-between gap-[10px]",
          "max-[960px]:mb-2 max-[960px]:grid max-[960px]:grid-cols-[minmax(0,1fr)_auto] max-[960px]:items-start max-[960px]:gap-2",
        )}
      >
        <div className="flex min-w-0 items-center gap-2">
          <span className="overflow-hidden text-[12px] leading-[1.2] tracking-[0.06em] text-ellipsis whitespace-nowrap text-[var(--text-2)] uppercase">
            {item.source}
          </span>
          {item.handle && (
            <span className="text-[11px] text-[var(--text-2)]">{item.handle}</span>
          )}
          {showBadge && (
            <span className="inline-flex items-center gap-[3px] rounded-[3px] bg-[color-mix(in_srgb,var(--accent-amber)_12%,transparent)] px-[7px] py-[3px] text-[10.5px] leading-none font-semibold tracking-[0.04em] text-[var(--accent-amber-fg)]">
              <span className="text-[9.5px]">✦</span>
              精选
            </span>
          )}
          {item.publicationState && ["first", "update"].includes(item.publicationState) && (
            <span className="rounded-[3px] bg-[color-mix(in_srgb,var(--accent-cyan)_12%,transparent)] px-[7px] py-[3px] text-[10.5px] font-semibold leading-none text-mc-cyan-fg">
              {item.publicationState === "first" ? "新" : "更新"}
            </span>
          )}
          {item.level && (
            <span className="rounded-[3px] bg-mc-surface2 px-[6px] py-[3px] text-[10.5px] font-bold leading-none text-mc-ink1">
              {item.level}
            </span>
          )}
          {item.evidenceConfidence && (
            <span className="text-[10.5px] font-semibold text-mc-ink2">
              证据 {CONFIDENCE_LABEL[item.evidenceConfidence]}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-[6px]">
          <span
            className={cn(
              "inline-flex items-center gap-1 text-[12px] font-semibold tabular-nums",
              MONO_FONT,
              scoreColorClass(item.score),
            )}
          >
            <span className="size-[5px] rounded-full bg-current" />
            重要性 {item.score}/100
          </span>
          {item.scoreBreakdown && (
            <span
              className="hidden text-[10.5px] tabular-nums text-mc-ink2 min-[1100px]:inline"
              title={`相关性：${item.scoreBreakdown.rationales?.relevance || "—"}\n竞争影响：${item.scoreBreakdown.rationales?.impact || "—"}\n行动价值：${item.scoreBreakdown.rationales?.actionability || "—"}`}
            >
              相关 {item.scoreBreakdown.relevance} · 影响 {item.scoreBreakdown.impact} · 行动{" "}
              {item.scoreBreakdown.actionability}
            </span>
          )}
          <button
            type="button"
            aria-pressed={starred}
            aria-label="收藏"
            title="收藏"
            onClick={() => onToggleStar(item.id)}
            className={cn(
              "cursor-pointer rounded-[8px] border border-transparent bg-transparent p-1 leading-[0]",
              "transition-[opacity_.12s,background_.12s,border-color_.12s,color_.12s,transform_80ms]",
              "hover:border-[var(--border-strong)] hover:bg-[var(--surface-1)] hover:text-[var(--text-0)]",
              "active:scale-[0.96]",
              starred
                ? "text-[var(--accent-rose-fg)] opacity-100"
                : "text-[var(--text-2)] opacity-55 group-hover:opacity-[0.92]",
            )}
          >
            <Bookmark size={16} fill={starred ? "currentColor" : "none"}/>
          </button>
        </div>
      </div>

      {/* 标题 → 文章页 */}
      <Link
        href={`/items/${encodeURIComponent(item.id)}`}
        className={cn(
          "block text-[15.5px] leading-[1.5] font-bold text-[var(--text-0)] transition-[color_.12s] hover:text-[var(--accent-cyan-fg)]",
          "max-[960px]:text-[14.5px] max-[960px]:leading-[1.55]",
        )}
      >
        {item.title}
      </Link>

      {/* 摘要 */}
      {(item.summary?.length ?? 0) > 0 && (
        <div
          className={cn(
            "mt-[5px] text-[13.5px] leading-[1.65] text-[var(--text-1)]",
            isFeatured ? "max-[960px]:line-clamp-3" : "line-clamp-5 max-[960px]:line-clamp-2",
            "max-[960px]:text-[14px] max-[960px]:leading-[1.65]",
          )}
        >
          {item.summary?.map((paragraph, index) => (
            <span key={index} className={cn("block", index > 0 && "mt-[0.6em]")}>
              {paragraph}
            </span>
          ))}
        </div>
      )}

      {/* 引用块 */}
      {showQuote && item.quote && (
        <div className="mt-1 line-clamp-2 rounded-[8px] border border-[var(--border)] bg-[var(--surface-0)] px-[10px] py-[6px] text-[12px] leading-[1.5] text-[var(--text-2)]">
          <span className="font-bold text-[var(--text-1)]">{item.quote.source}:</span>
          {item.quote.text}
        </div>
      )}

      {/* 另有信源 */}
      {showOtherSources && (
        <div className="mt-[10px] text-[12px] text-[var(--text-2)]">
          另有 {item.otherSources} 家信源报道
        </div>
      )}

      {/* 虚线分隔 */}
      {showReason && hasBodyContent && (
        <hr className="mt-[10px] border-0 border-t border-dashed border-[var(--border-strong)]" />
      )}

      {/* 关注理由 */}
      {showReason && (
        <p
          className={cn(
            "pt-[9px] text-[12px] leading-[1.6] text-[var(--note-fg)]",
            "max-[960px]:rounded-[8px] max-[960px]:bg-[var(--note-bg)] max-[960px]:p-[8px_10px]",
          )}
        >
          <span className="font-bold">关注理由：</span>
          {item.reason}
        </p>
      )}

      {/* 标签行 */}
      {showTags && (
        <div className="mt-2 flex flex-wrap gap-[6px]">
          {item.tags?.map((tag) => (
            <span
              key={tag}
              className={cn(
                "inline-flex items-center p-[2px] text-[11.5px] leading-[1.4] text-[var(--text-2)]",
                MONO_FONT,
              )}
            >
              <span className="mr-[1px] opacity-55">#</span>
              {tag}
            </span>
          ))}
        </div>
      )}
    </article>
  );
}
