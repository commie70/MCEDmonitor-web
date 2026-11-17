import type { Metadata } from "next";
import Link from "next/link";
import { StarButton } from "@/components/feed/StarButton";
import { Empty, KindTag, LevelMark, PageHeader, SourceLinks, pillClass } from "@/components/ui";
import { shortDate } from "@/lib/dates";
import { eventHref, hotEvents } from "@/lib/events";
import { loadEvents } from "@/lib/load-events";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "热点榜" };

const WINDOWS = [
  { days: 31, label: "近 31 天" },
  { days: 90, label: "近 90 天" },
  { days: 365, label: "近一年" },
];

export default async function HotPage({ searchParams }: { searchParams: Promise<{ w?: string }> }) {
  const { w } = await searchParams;
  const windowDays = WINDOWS.find((item) => String(item.days) === w)?.days ?? 31;
  const { events, today } = await loadEvents();
  const ranked = hotEvents(events, today, windowDays).slice(0, 20);

  return (
    <div className="max-w-[900px]">
      <PageHeader title="热点榜" count={ranked.length}>
        <nav aria-label="时间窗口" className="flex gap-[6px]">
          {WINDOWS.map((item) => (
            <Link
              key={item.days}
              href={item.days === 31 ? "/hot" : `/hot?w=${item.days}`}
              aria-current={item.days === windowDays ? "page" : undefined}
              className={pillClass(item.days === windowDays)}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </PageHeader>

      {ranked.length === 0 ? (
        <Empty>{WINDOWS.find((item) => item.days === windowDays)?.label}没有达到 L3 以上的事件</Empty>
      ) : (
        <ol>
          {ranked.map((event, index) => (
            <li
              key={event.id}
              className="grid grid-cols-[46px_minmax(0,1fr)_28px] gap-x-3 border-b border-line py-4 last:border-b-0"
            >
              <span
                className={cn(
                  "pt-[2px] font-mono text-[20px] font-bold leading-none tabular-nums",
                  index < 3 ? "text-accent-ink" : "text-line-strong"
                )}
              >
                {String(index + 1).padStart(2, "0")}
              </span>
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-x-[10px] gap-y-1 text-[12px] text-ink-3">
                  <KindTag kind={event.kind} />
                  {event.companyId ? (
                    <Link
                      href={`/companies/${event.companyId}`}
                      className={cn("font-semibold hover:text-accent-ink", event.self ? "text-self" : "text-ink-2")}
                    >
                      {event.company}
                    </Link>
                  ) : (
                    <span className="font-semibold text-ink-2">{event.company}</span>
                  )}
                  <time dateTime={event.date} className="tabular-nums">
                    {shortDate(event.date)}
                  </time>
                  <span className="ml-auto flex items-center gap-2">
                    {event.score !== null && <span className="tabular-nums">{event.score}</span>}
                    <LevelMark level={event.level} />
                  </span>
                </div>
                <h2 className={cn("mt-[5px] font-semibold leading-[1.5] text-ink", index < 3 ? "text-[16px]" : "text-[15px]")}>
                  <Link href={eventHref(event)} className="transition hover:text-accent-ink">
                    {event.title}
                  </Link>
                </h2>
                {index < 3 && event.summary && (
                  <p className="mt-[6px] text-[13.5px] leading-[1.7] text-ink-2">{event.summary}</p>
                )}
                {index < 3 && event.why && (
                  <p className="mt-2 border-l-2 border-accent pl-[10px] text-[13px] leading-[1.65] text-ink-2">{event.why}</p>
                )}
                {event.links.length > 0 && (
                  <div className="mt-[9px]">
                    <SourceLinks links={event.links} max={index < 3 ? 5 : 2} />
                  </div>
                )}
              </div>
              <StarButton
                id={event.id}
                title={event.title}
                source={[event.company, event.product].filter(Boolean).join(" · ")}
                date={event.date}
                className="-mt-[3px]"
              />
            </li>
          ))}
        </ol>
      )}
    </div>
  );
}
