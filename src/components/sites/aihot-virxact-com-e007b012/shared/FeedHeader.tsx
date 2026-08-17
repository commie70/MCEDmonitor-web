"use client";

import { ChevronDown } from "lucide-react";
import type { FormEvent } from "react";

import { cn } from "@/lib/utils";

export interface FeedHeaderProps {
  title: string; // 「精选」/「全部动态」
  subtitle: string; // 「2026年8月15日星期六 · 今日竞品重点动态」
  categories:{ key: string; label: string }[]; // 不含「全部」
  activeCategory: string; // "all" 或分类 key
  onCategoryChange: (key: string) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
  /** 传入则显示来源下拉(/all 页) */
  sourceTypes?:{ key: string; label: string }[];
  activeSourceType?: string;
  onSourceTypeChange?: (key: string) => void;
}

export function FeedHeader(props: FeedHeaderProps) {
  const {
    title,
    subtitle,
    categories,activeCategory,
    onCategoryChange,
    searchValue,
    onSearchChange,
    sourceTypes,activeSourceType,
    onSourceTypeChange,} = props;

  const pills = [{ key: "all", label: "全部" },...categories];
  const sourceValue = activeSourceType ?? "all";

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
  }

  return (
    <header className="pt-[6px]">
      <h1 className="m-0 text-[23px] font-bold leading-[1.2] tracking-[-0.01em] text-[var(--text-0)] max-[960px]:text-[21px]">
        {title}
      </h1>
      <p className="mt-[5px] text-[12px] leading-[1.6] text-[var(--text-2)]">
        {subtitle}
      </p>
      <hr className="mb-[8px] mt-[10px] border-0 border-t border-[var(--border-soft)]" />
      <div className="flex flex-wrap items-center gap-x-[12px] gap-y-[8px]">
        <nav
          aria-label="分类筛选"
          className="inline-flex gap-[22px] border-b border-[var(--border-soft)] max-[960px]:mx-[-18px] max-[960px]:w-full max-[960px]:flex-nowrap max-[960px]:overflow-x-auto max-[960px]:px-[18px] max-[960px]:pb-[2px] max-[960px]:[scrollbar-width:none] max-[960px]:[&::-webkit-scrollbar]:hidden max-[960px]:[mask-image:linear-gradient(90deg,transparent,#000_18px,#000_calc(100%_-_32px),transparent)]"
        >
          {pills.map((pill) => {
            const active = activeCategory === pill.key;
            return (
              <button
                key={pill.key}
                type="button"
                onClick={() => onCategoryChange(pill.key)}
                className={cn(
                  "px-[1px] pb-[9px] pt-[7px] text-[13px] leading-[1] text-[var(--text-1)] transition-[color,box-shadow] duration-[120ms] hover:text-[var(--text-0)] max-[960px]:shrink-0",active &&
                    "font-semibold text-[var(--accent-cyan-fg)] [box-shadow:inset_0_-2px_0_var(--accent-cyan)]",
                )}
              >
                {pill.label}
              </button>
            );
          })}
        </nav>
        <form
          onSubmit={handleSubmit}
          className="ml-auto flex items-center gap-[6px] max-[960px]:ml-0 max-[960px]:w-full"
        >
          {sourceTypes ? (
            <div className="relative w-[128px] flex-none">
              <select
                aria-label="来源筛选"
                value={sourceValue}
                onChange={(e) => onSourceTypeChange?.(e.target.value)}
                className={cn(
                  "min-h-[38px] w-full cursor-pointer appearance-none rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface-card)] py-[8px] pl-[12px] pr-[36px] text-[12.5px] text-[var(--text-1)]",
                  sourceValue !== "all" &&
                    "border-[rgba(var(--theme-accent-rgb),.42)] bg-[rgba(var(--theme-accent-rgb),.08)] font-semibold text-[var(--accent-cyan-fg)]",
                )}
              >
                <option value="all">全部来源</option>
                {sourceTypes.map((s) => (
                  <option key={s.key} value={s.key}>
                    {s.label}
                  </option>
                ))}
              </select>
              <ChevronDown
                size={14}
                aria-hidden
                className="pointer-events-none absolute right-[12px] top-1/2 -translate-y-1/2 text-[var(--text-2)]"
              />
            </div>
          ) :null}
          <input
            type="search"
            aria-label="搜索标题、摘要"
            placeholder="搜索标题、摘要…"
            value={searchValue}
            onChange={(e) => onSearchChange(e.target.value)}
            className="min-h-[34px] w-[180px] min-w-[100px] flex-[0_1_180px] rounded-[8px] border border-[var(--border-strong)] bg-[var(--surface-0)] px-[12px] py-[6px] text-[12.5px] text-[var(--text-1)] outline-none placeholder:text-[var(--text-2)] focus:border-[rgba(var(--theme-accent-rgb),.3)] focus:bg-[var(--surface-2)] focus:[box-shadow:0_0_0_3px_rgba(var(--theme-accent-rgb),.12)] max-[960px]:flex-1"
          />
          <button
            type="submit"
            className="min-h-[34px] rounded-[8px] border border-[var(--theme-accent)] bg-[var(--theme-accent)] px-[16px] py-[5px] text-[13px] font-semibold text-[var(--theme-accent-contrast)] hover:border-[var(--theme-accent-hover)] hover:bg-[var(--theme-accent-hover)] active:scale-[0.98]"
          >
            搜索
          </button>
        </form>
      </div>
    </header>
  );
}
