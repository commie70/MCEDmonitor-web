import Link from "next/link";
import { KindTag, LevelMark, SourceLinks } from "@/components/ui";
import { dayOf, shortDate, yearOf } from "@/lib/dates";
import { eventHref, type IntelEvent } from "@/lib/event-model";
import { cn } from "@/lib/utils";
import { StarButton } from "./StarButton";

/**
 * 事件行：左侧日期，右侧「类型 · 企业 · 产品」→ 标题 → 摘要 → 关注理由 → 信源。
 * 列表密度优先，不用卡片。
 */
export function EventRow({
  event,
  dateStyle = "day",
  dense,
}: {
  event: IntelEvent;
  /** day：月分组内只显示「日」；full：显示年份与「月日」 */
  dateStyle?: "day" | "full";
  dense?: boolean;
}) {
  const day = dayOf(event.date);
  return (
    <article className="group grid grid-cols-[44px_minmax(0,1fr)_28px] gap-x-3 border-b border-line py-[14px] last:border-b-0 sm:grid-cols-[56px_minmax(0,1fr)_28px]">
      <time dateTime={event.date} className="pt-[1px] text-right tabular-nums text-ink-3">
        {dateStyle === "day" ? (
          <span className={cn("text-[19px] font-semibold leading-none", day ? "text-ink-2" : "text-line-strong")}>
            {day || "··"}
          </span>
        ) : (
          <>
            <span className="block text-[11px] leading-[1.3]">{yearOf(event.date)}</span>
            {event.date.length >= 7 && (
              <span className="block whitespace-nowrap text-[12px] leading-[1.4] text-ink-2">{shortDate(event.date)}</span>
            )}
          </>
        )}
      </time>

      <div className="min-w-0">
        <div className="flex flex-wrap items-center gap-x-[10px] gap-y-1 text-[12px] text-ink-3">
          <KindTag kind={event.kind} />
          {event.companyId ? (
            <Link
              href={`/companies/${event.companyId}`}
              className={cn("font-semibold transition hover:text-accent-ink", event.self ? "text-self" : "text-ink-2")}
            >
              {event.company}
            </Link>
          ) : (
            <span className="font-semibold text-ink-2">{event.company}</span>
          )}
          {event.product && <span className="truncate">{event.product}</span>}
          <span className="ml-auto flex items-center gap-[6px]">
            {event.state === "first" && <span className="font-semibold text-self">新</span>}
            {event.state === "update" && <span className="font-semibold text-self">更新</span>}
            <LevelMark level={event.level} />
          </span>
        </div>

        <h3 className="mt-[5px] text-[15px] font-semibold leading-[1.5] text-ink">
          <Link href={eventHref(event)} className="transition hover:text-accent-ink">
            {event.title}
          </Link>
        </h3>

        {event.summary && (
          <p className={cn("mt-[5px] text-[13.5px] leading-[1.7] text-ink-2", dense ? "line-clamp-2" : "line-clamp-3")}>
            {event.summary}
          </p>
        )}

        {event.why && !dense && (
          <p className="mt-2 border-l-2 border-accent pl-[10px] text-[13px] leading-[1.65] text-ink-2">{event.why}</p>
        )}

        {event.links.length > 0 && (
          <div className="mt-[9px]">
            <SourceLinks links={event.links} max={dense ? 2 : 4} />
          </div>
        )}
      </div>

      <StarButton
        id={event.id}
        title={event.title}
        source={[event.company, event.product].filter(Boolean).join(" · ")}
        date={event.date}
        className="-mt-[3px] opacity-60 group-hover:opacity-100 max-sm:opacity-100"
      />
    </article>
  );
}
