"use client";

import { Bookmark } from "lucide-react";
import { useStarred } from "@/hooks/use-starred";
import { cn } from "@/lib/utils";

export function StarButton({
  id,
  title,
  source,
  date,
  className,
}: {
  id: string;
  title: string;
  source: string;
  date: string;
  className?: string;
}) {
  const { starred, toggle } = useStarred();
  const active = Boolean(starred[id]);
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={active ? "取消收藏" : "收藏"}
      title={active ? "取消收藏" : "收藏"}
      onClick={() => toggle({ id, title, source, date })}
      className={cn(
        "grid size-[28px] shrink-0 place-items-center rounded-full transition hover:bg-sunken",
        active ? "text-self" : "text-ink-3 hover:text-ink",
        className
      )}
    >
      <Bookmark size={15} aria-hidden fill={active ? "currentColor" : "none"} />
    </button>
  );
}
