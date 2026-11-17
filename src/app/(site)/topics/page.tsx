import type { Metadata } from "next";
import Link from "next/link";
import { DesignBadge, KindTag, PageHeader, RouteTag, SectionTitle } from "@/components/ui";
import { COMPANIES, DESIGN_ORDER, ROUTES, STATUS_FILTERS, STUDIES, allCancers } from "@/data";
import { HIGH_MORTALITY } from "@/data/meta";
import { shortDate, yearOf } from "@/lib/dates";
import { KIND_ORDER, eventsOfCompany } from "@/lib/events";
import { loadEvents } from "@/lib/load-events";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "主题" };

const chip =
  "inline-flex h-[30px] items-center gap-2 rounded-full border border-line bg-panel px-3 text-[13px] text-ink-2 transition hover:border-accent hover:text-accent-ink";

export default async function TopicsPage() {
  const { events } = await loadEvents();
  const kinds = KIND_ORDER.map((kind) => ({ kind, count: events.filter((event) => event.kind === kind).length })).filter(
    (item) => item.count > 0
  );

  return (
    <div className="max-w-[1100px]">
      <PageHeader title="主题" />

      <section className="mb-8">
        <SectionTitle href="/leaderboard" more="产品看板">
          企业
        </SectionTitle>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {COMPANIES.map((company) => {
            const timeline = eventsOfCompany(events, company.id);
            const latest = timeline[0];
            return (
              <li key={company.id}>
                <Link
                  href={`/companies/${company.id}`}
                  className={cn(
                    "block h-full rounded-xl border bg-panel p-4 transition hover:border-accent",
                    company.self ? "border-self" : "border-line"
                  )}
                >
                  <div className="flex items-baseline justify-between gap-2">
                    <span className={cn("text-[15px] font-bold", company.self ? "text-self" : "text-ink")}>{company.name}</span>
                    <span className="shrink-0 text-[11.5px] tabular-nums text-ink-3">{timeline.length}</span>
                  </div>
                  <div className="mt-[2px] truncate text-[12.5px] text-ink-2">{company.product}</div>
                  <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
                    {company.routes.map((route) => (
                      <RouteTag key={route} route={route} />
                    ))}
                  </div>
                  {latest && (
                    <div className="mt-3 border-t border-line pt-2">
                      <div className="line-clamp-2 text-[12.5px] leading-[1.55] text-ink-2">{latest.title}</div>
                      <time dateTime={latest.date} className="mt-1 block text-[11.5px] tabular-nums text-ink-3">
                        {yearOf(latest.date)} · {shortDate(latest.date)}
                      </time>
                    </div>
                  )}
                </Link>
              </li>
            );
          })}
        </ul>
      </section>

      <div className="grid gap-x-10 gap-y-8 lg:grid-cols-2">
        <section>
          <SectionTitle>技术路线</SectionTitle>
          <div className="flex flex-wrap gap-2">
            {ROUTES.map((route) => (
              <Link key={route} href={`/leaderboard?route=${encodeURIComponent(route)}`} className={chip}>
                <RouteTag route={route} />
                <span className="tabular-nums text-ink-3">
                  {COMPANIES.filter((company) => company.routes.includes(route)).length}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle href="/coverage" more="癌种覆盖">
            癌种
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {allCancers().map((cancer) => (
              <Link key={cancer} href={`/leaderboard?cancer=${encodeURIComponent(cancer)}`} className={chip}>
                <span className={cn(HIGH_MORTALITY.has(cancer) && "font-semibold text-ink")}>{cancer}</span>
                <span className="tabular-nums text-ink-3">
                  {COMPANIES.filter((company) => company.cancers.includes(cancer)).length}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle href="/regulatory" more="报证进度">
            报证
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {STATUS_FILTERS.map((status) => (
              <Link key={status} href={`/leaderboard?status=${encodeURIComponent(status)}`} className={chip}>
                {status}
                <span className="tabular-nums text-ink-3">
                  {COMPANIES.filter((company) => company.statusKeys.includes(status)).length}
                </span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle href="/performance" more="性能对照">
            研究设计
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {DESIGN_ORDER.map((design) => (
              <Link key={design} href={`/performance?design=${encodeURIComponent(design)}#studies`} className={chip}>
                <DesignBadge design={design} />
                <span className="tabular-nums text-ink-3">{STUDIES.filter((study) => study.design === design).length}</span>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <SectionTitle href="/all" more="全部动态">
            事件类型
          </SectionTitle>
          <div className="flex flex-wrap gap-2">
            {kinds.map(({ kind, count }) => (
              <Link key={kind} href={`/all?kind=${kind}`} className={chip}>
                <KindTag kind={kind} />
                <span className="tabular-nums text-ink-3">{count}</span>
              </Link>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
