import type { Metadata } from "next";
import Markdown from "react-markdown";
import { TriangleAlert } from "lucide-react";
import { EventRow } from "@/components/feed/EventRow";
import { Empty, PageHeader, Panel, SectionTitle } from "@/components/ui";
import { cstDate, cstDateTime, weekday } from "@/lib/dates";
import { featured, findEvent, hotEvents, type IntelEvent } from "@/lib/events";
import { loadEvents } from "@/lib/load-events";
import { monitorHealth, storiesForView } from "@/lib/monitor-report";
import { safeHttpUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "监测日报" };

export default async function DailyPage() {
  const { events, report, today } = await loadEvents();

  if (!report) {
    return (
      <div className="max-w-[900px]">
        <PageHeader title="监测日报" />
        <Empty>监测报告尚未生成</Empty>
      </div>
    );
  }

  const health = monitorHealth(report);
  const metrics = report.metrics ?? {};
  const issue = storiesForView(report, "daily")
    .map((story) => findEvent(events, story.id))
    .filter((event): event is IntelEvent => Boolean(event));
  const recent = featured(hotEvents(events, today, 31)).sort((a, b) => b.date.localeCompare(a.date));
  const runDate = cstDate(report.generated_at);

  const channels = [
    ...new Map(
      (report.manual_tasks ?? []).map((task) => [task.channel, safeHttpUrl(task.url)] as const)
    ).entries(),
  ].filter((entry): entry is [string, string] => Boolean(entry[1]));

  const tiles: { label: string; value: number | string; warn?: boolean }[] = [
    { label: "采集命中", value: health.hits ?? "—", warn: health.state === "down" },
    { label: "新发布", value: Number(metrics.first ?? 0) },
    { label: "实质更新", value: Number(metrics.update ?? 0) },
    { label: "待复核", value: health.backlog },
    { label: "信源缺口", value: health.gaps, warn: health.gaps > 0 },
  ];

  return (
    <div className="max-w-[900px]">
      <PageHeader title="监测日报">
        <time dateTime={report.generated_at} className="text-[13px] tabular-nums text-ink-2" title={cstDateTime(report.generated_at)}>
          {runDate} {weekday(runDate)}
        </time>
      </PageHeader>

      {health.state === "down" && (
        <div role="alert" className="mb-4 flex items-start gap-[10px] rounded-xl border border-warn bg-warn-soft px-4 py-3 text-[13px] text-warn">
          <TriangleAlert size={16} aria-hidden className="mt-[2px] shrink-0" />
          <span>
            本次运行采集中断：{health.gaps} 个信源连续失败，没有取得任何命中。下方为账本中既有事件，不代表窗口内没有新动态。
          </span>
        </div>
      )}

      {health.state === "held" && (
        <div role="alert" className="mb-4 flex items-start gap-[10px] rounded-xl border border-warn bg-warn-soft px-4 py-3 text-[13px] text-warn">
          <TriangleAlert size={16} aria-hidden className="mt-[2px] shrink-0" />
          <span>
            模型验收未通过，发布暂停：{health.held} 条新事件已入账，下次验收通过后自动上站。
          </span>
        </div>
      )}

      <dl className="mb-6 grid grid-cols-5 divide-x divide-line overflow-hidden rounded-xl border border-line bg-panel">
        {tiles.map((tile) => (
          <div key={tile.label} className="px-3 py-3 text-center">
            <dd className={cn("text-[20px] font-bold leading-none tabular-nums", tile.warn ? "text-warn" : "text-ink")}>
              {tile.value}
            </dd>
            <dt className="mt-[6px] text-[11.5px] text-ink-3">{tile.label}</dt>
          </div>
        ))}
      </dl>

      <section className="mb-7">
        <SectionTitle>本期</SectionTitle>
        {issue.length ? (
          <Panel className="px-4">
            {issue.map((event) => (
              <EventRow key={event.id} event={event} dateStyle="full" />
            ))}
          </Panel>
        ) : (
          <Empty>本期没有首次发布或实质更新的 L1 / L2 事件</Empty>
        )}
      </section>

      {report.digest?.markdown && (
        <section className="mb-7">
          <SectionTitle>综述</SectionTitle>
          <Panel className="px-5 py-4">
            <div className="prose-mc">
              <Markdown>{report.digest.markdown}</Markdown>
            </div>
          </Panel>
        </section>
      )}

      <section className="mb-7">
        <SectionTitle href="/hot" more="热点榜">
          近 31 天
        </SectionTitle>
        {recent.length ? (
          <Panel className="px-4">
            {recent.map((event) => (
              <EventRow key={event.id} event={event} dateStyle="full" dense />
            ))}
          </Panel>
        ) : (
          <Empty>近 31 天没有 L1 / L2 事件</Empty>
        )}
      </section>

      {channels.length > 0 && (
        <section>
          <SectionTitle>人工核查入口</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {channels.map(([channel, url]) => (
              <a
                key={channel}
                href={url}
                target="_blank"
                rel="noreferrer noopener"
                className="rounded-full border border-line bg-panel px-3 py-1 text-[12.5px] text-ink-2 transition hover:border-accent hover:text-accent-ink"
              >
                {channel}
              </a>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
