import Link from "next/link";
import { Bar, KindTag, Panel, SectionTitle } from "@/components/ui";
import { COMPANIES, STUDIES, boardStats, getCompany } from "@/data";
import { shortDate } from "@/lib/dates";
import { eventHref, hotEvents, type IntelEvent } from "@/lib/events";
import { cn } from "@/lib/utils";

/** 当前热点：近 31 天不足 3 条时放宽到 90 天，避免低频领域出现空榜。 */
export function HotPanel({ events, today }: { events: IntelEvent[]; today: string }) {
  const recent = hotEvents(events, today, 31);
  const list = (recent.length >= 3 ? recent : hotEvents(events, today, 90)).slice(0, 5);
  if (!list.length) return null;
  return (
    <Panel className="p-4">
      <SectionTitle href="/hot" more="完整榜单">
        当前热点
      </SectionTitle>
      <ol className="grid grid-cols-1 gap-3">
        {list.map((event, index) => (
          <li key={event.id} className="grid grid-cols-[22px_minmax(0,1fr)] gap-x-2">
            <span
              className={cn(
                "pt-[2px] font-mono text-[12px] font-bold tabular-nums",
                index < 3 ? "text-accent-ink" : "text-ink-3"
              )}
            >
              {String(index + 1).padStart(2, "0")}
            </span>
            <div className="min-w-0">
              <Link
                href={eventHref(event)}
                className="line-clamp-2 text-[13px] font-semibold leading-[1.5] text-ink transition hover:text-accent-ink"
              >
                {event.title}
              </Link>
              <div className="mt-[3px] flex items-center gap-2 text-[11.5px] text-ink-3">
                <KindTag kind={event.kind} />
                <span className="truncate">{event.company}</span>
                <span className="ml-auto shrink-0 tabular-nums">{shortDate(event.date)}</span>
              </div>
            </div>
          </li>
        ))}
      </ol>
    </Panel>
  );
}

export function RegulatoryPanel() {
  const stats = boardStats();
  const cells = [
    { value: stats.nmpaApproved, label: "NMPA III 类证" },
    { value: stats.fdaApproved, label: "FDA 获批" },
    { value: stats.fdaReview, label: "FDA 审评中" },
    { value: stats.breakthrough, label: "突破性 / 创新通道" },
  ];
  return (
    <Panel className="p-4">
      <SectionTitle href="/regulatory" more="报证进度">
        报证
      </SectionTitle>
      <div className="grid grid-cols-2 gap-x-4 gap-y-3">
        {cells.map((cell) => (
          <Link key={cell.label} href="/regulatory" className="group block">
            <div className="text-[24px] font-bold leading-none tabular-nums text-ink transition group-hover:text-accent-ink">
              {cell.value}
            </div>
            <div className="mt-[5px] text-[11.5px] text-ink-3">{cell.label}</div>
          </Link>
        ))}
      </div>
    </Panel>
  );
}

/** 本司锚点：无症状人群前瞻研究中的 MCED 灵敏度，世和基因用陶土橙标出。 */
export function AnchorPanel() {
  const rows = STUDIES.filter(
    (study) => study.compare?.mced && !study.symptomatic && typeof study.metrics.sens === "number"
  )
    .map((study) => ({ study, company: getCompany(study.companyId) }))
    .filter((row): row is { study: (typeof STUDIES)[number]; company: (typeof COMPANIES)[number] } => Boolean(row.company))
    .sort((a, b) => (b.study.metrics.sens ?? 0) - (a.study.metrics.sens ?? 0));
  if (!rows.length) return null;
  return (
    <Panel className="p-4">
      <SectionTitle href="/performance" more="性能对照">
        前瞻灵敏度 · MCED
      </SectionTitle>
      <ul className="grid grid-cols-1 gap-[10px]">
        {rows.map(({ study, company }) => (
          <li key={study.id}>
            <Link href={`/studies/${study.id}`} className="group block">
              <div className="flex items-baseline justify-between gap-2 text-[12px]">
                <span className={cn("truncate font-semibold", company.self ? "text-self" : "text-ink-2 group-hover:text-accent-ink")}>
                  {study.compare?.prod ?? company.product}
                </span>
                <span className="shrink-0 tabular-nums text-ink">{study.compare?.sens}</span>
              </div>
              <Bar value={study.metrics.sens ?? 0} tone={company.self ? "self" : "accent"} className="mt-1" />
              <div className="mt-[3px] truncate text-[11px] text-ink-3">{study.compare?.study ?? study.name}</div>
            </Link>
          </li>
        ))}
      </ul>
    </Panel>
  );
}
