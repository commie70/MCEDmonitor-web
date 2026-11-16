import Link from "next/link";
import { ArrowUpRight } from "lucide-react";
import type { ReactNode } from "react";
import { STAGE_META, isExternal } from "@/data/meta";
import type { EventKind, IntelLevel, RegStatus, RouteKey, StudyDesign } from "@/data/types";
import { KIND_LABEL, type EventLink } from "@/lib/event-model";
import { cn } from "@/lib/utils";

/** 页头：只有标题与右侧操作，不放说明文字。 */
export function PageHeader({
  title,
  count,
  children,
}: {
  title: string;
  count?: number | string;
  children?: ReactNode;
}) {
  return (
    <header className="mb-4 flex flex-wrap items-end gap-x-3 gap-y-2 border-b border-line pb-3">
      <h1 className="text-[22px] font-bold leading-tight tracking-[-0.01em] text-ink">{title}</h1>
      {count !== undefined && <span className="pb-[3px] text-[13px] tabular-nums text-ink-3">{count}</span>}
      {children && <div className="ml-auto flex flex-wrap items-center gap-2">{children}</div>}
    </header>
  );
}

export function Panel({ className, children }: { className?: string; children: ReactNode }) {
  return <section className={cn("rounded-xl border border-line bg-panel shadow-panel", className)}>{children}</section>;
}

export function SectionTitle({ children, href, more }: { children: ReactNode; href?: string; more?: string }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="text-[13px] font-bold tracking-[0.02em] text-ink">{children}</h2>
      {href && (
        <Link href={href} className="text-[12px] text-ink-3 transition hover:text-accent-ink">
          {more ?? "全部"}
        </Link>
      )}
    </div>
  );
}

/** 研究设计徽章：RCT 实心深色 → 前瞻实心墨青 → 病例对照虚线描边。 */
export function DesignBadge({ design, className }: { design: StudyDesign; className?: string }) {
  return (
    <span
      data-design={design}
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-[5px] border border-(--d-bd) bg-(--d-bg) px-[6px] py-px text-[11px] font-semibold leading-[18px] text-(--d-fg) [border-style:var(--d-style)]",
        className
      )}
    >
      {design}
    </span>
  );
}

export function StageChip({
  status,
  compact,
  className,
}: {
  status: Pick<RegStatus, "stage" | "label">;
  compact?: boolean;
  className?: string;
}) {
  return (
    <span
      data-stage={status.stage}
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-full border border-(--s-bd) bg-(--s-bg) px-2 py-px text-[11px] font-semibold leading-[18px] text-(--s-fg)",
        className
      )}
    >
      {compact ? STAGE_META[status.stage].short : status.label}
    </span>
  );
}

export function RouteTag({ route }: { route: RouteKey }) {
  return (
    <span data-route={route} className="inline-flex items-center gap-1 whitespace-nowrap text-[12px] text-ink-2">
      <span aria-hidden className="size-[7px] rounded-full bg-(--route)" />
      {route}
    </span>
  );
}

export function KindTag({ kind }: { kind: EventKind }) {
  return (
    <span data-kind={kind} className="inline-flex items-center gap-[5px] whitespace-nowrap text-[12px] font-semibold text-(--kind)">
      <span aria-hidden className="size-[6px] rounded-full bg-(--kind)" />
      {KIND_LABEL[kind]}
    </span>
  );
}

export function LevelMark({ level }: { level: IntelLevel | null }) {
  if (!level) return null;
  return (
    <span
      className={cn(
        "inline-flex h-[18px] items-center rounded-[4px] px-[5px] font-mono text-[10.5px] font-bold tracking-wide",
        level === "L1" ? "bg-ink text-panel" : level === "L2" ? "bg-sunken text-ink-2" : "text-ink-3"
      )}
    >
      {level}
    </span>
  );
}

/** 信源链接：公开资料外链，新开窗口；站内重建页走站内路由。 */
export function SourceLink({ link, className }: { link: EventLink; className?: string }) {
  const external = isExternal(link.href);
  const classes = cn(
    "inline-flex max-w-full items-center gap-[3px] rounded-[5px] border border-line bg-panel px-[7px] py-[1px] text-[11.5px] leading-[19px] text-ink-2 transition hover:border-accent hover:text-accent-ink",
    className
  );
  if (!external) {
    return (
      <Link href={link.href} className={classes}>
        <span className="truncate">{link.label}</span>
      </Link>
    );
  }
  return (
    <a href={link.href} target="_blank" rel="noreferrer noopener" className={classes}>
      <span className="truncate">{link.label}</span>
      <ArrowUpRight aria-hidden size={11} className="shrink-0 opacity-60" />
    </a>
  );
}

export function SourceLinks({ links, max }: { links: EventLink[]; max?: number }) {
  if (!links.length) return null;
  const shown = max ? links.slice(0, max) : links;
  const hidden = links.length - shown.length;
  return (
    <div className="flex flex-wrap items-center gap-[6px]">
      {shown.map((link) => (
        <SourceLink key={link.href + link.label} link={link} />
      ))}
      {hidden > 0 && <span className="text-[11.5px] tabular-nums text-ink-3">+{hidden}</span>}
    </div>
  );
}

/** 性能卡片的栅格：卡片最小 340px，放得下几列就排几列。 */
export const CARD_GRID = "grid grid-cols-[repeat(auto-fill,minmax(min(100%,340px),1fr))] gap-4";

/** 胶囊筛选项 */
export function pillClass(active: boolean): string {
  return cn(
    "inline-flex h-[28px] shrink-0 items-center whitespace-nowrap rounded-full border px-[11px] text-[12.5px] transition",
    active
      ? "border-ink bg-ink font-semibold text-panel"
      : "border-line bg-panel text-ink-2 hover:border-line-strong hover:text-ink"
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <div className="rounded-xl border border-dashed border-line-strong px-5 py-10 text-center text-[13px] text-ink-3">
      {children}
    </div>
  );
}

/** 0–100 的水平条，SVG 绘制，避免内联样式。 */
export function Bar({ value, tone = "accent", className }: { value: number; tone?: "accent" | "self" | "muted"; className?: string }) {
  const width = Math.max(0, Math.min(100, value));
  const fill = tone === "self" ? "fill-mark-self" : tone === "muted" ? "fill-ink-3" : "fill-mark";
  return (
    <svg viewBox="0 0 100 6" preserveAspectRatio="none" aria-hidden className={cn("h-[6px] w-full", className)}>
      <rect x="0" y="0" width="100" height="6" rx="3" className="fill-sunken" />
      <rect x="0" y="0" width={width} height="6" rx="3" className={fill} />
    </svg>
  );
}
