import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { EventRow } from "@/components/feed/EventRow";
import { DesignBadge, Panel, RouteTag, SectionTitle, SourceLinks, StageChip } from "@/components/ui";
import { HIGH_MORTALITY, designRank, getCompany, resolveSources, sourceHref, studiesOf } from "@/data";
import { compareDateDesc } from "@/lib/dates";
import { eventsOfCompany } from "@/lib/events";
import { loadEvents } from "@/lib/load-events";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const company = getCompany(id);
  return company
    ? { title: `${company.name} · ${company.product}`, description: company.layout }
    : { title: "企业档案" };
}

export default async function CompanyPage({ params }: Props) {
  const { id } = await params;
  const company = getCompany(id);
  if (!company) notFound();

  const { events } = await loadEvents();
  const timeline = eventsOfCompany(events, company.id);
  const studies = studiesOf(company.id).sort(
    (a, b) => designRank(a.design) - designRank(b.design) || compareDateDesc(a.date, b.date)
  );

  return (
    <div>
      <Link href="/leaderboard" className="inline-flex items-center gap-[6px] text-[12.5px] text-ink-3 transition hover:text-accent-ink">
        <ArrowLeft size={14} aria-hidden />
        产品看板
      </Link>

      <header className="mt-3 border-b border-line pb-4">
        <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
          <h1 className={cn("text-[24px] font-bold leading-tight tracking-[-0.01em]", company.self ? "text-self" : "text-ink")}>
            {company.name}
          </h1>
          <span className="text-[13px] text-ink-3">
            {company.nameEn !== company.name ? `${company.nameEn} · ` : ""}
            {company.country}
          </span>
          {company.mced && <span className="text-[12px] font-semibold text-accent-ink">MCED</span>}
        </div>
        <p className="mt-1 text-[15px] font-semibold text-ink-2">{company.product}</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-1">
          {company.routes.map((route) => (
            <RouteTag key={route} route={route} />
          ))}
        </div>
      </header>

      <div className="mt-5 grid grid-cols-1 gap-x-8 gap-y-7 xl:grid-cols-[minmax(0,1fr)_380px]">
        <div className="min-w-0">
          <section className="mb-7">
            <SectionTitle href="/regulatory" more="报证进度">
              报证
            </SectionTitle>
            <Panel>
              <ul className="divide-y divide-line">
                {company.statuses.map((status) => {
                  const sources = resolveSources(status.sources);
                  return (
                    <li key={status.label + status.scope} className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-[10px]">
                      <StageChip status={status} />
                      <span className="min-w-[min(100%,14em)] flex-1 text-[13px] leading-[1.55] text-ink-2">{status.scope}</span>
                      <SourceLinks
                        links={sources.map((source) => ({ label: source.label, href: sourceHref(source), kind: source.kind }))}
                        max={2}
                      />
                    </li>
                  );
                })}
              </ul>
            </Panel>
          </section>

          <section className="mb-7">
            <SectionTitle href={`/performance`} more="性能对照">
              研究
            </SectionTitle>
            <Panel>
              <ul className="divide-y divide-line">
                {studies.map((study) => (
                  <li key={study.id} className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-3 px-4 py-3">
                    <DesignBadge design={study.design} className="mt-[2px]" />
                    <div className="min-w-0">
                      <Link
                        href={`/studies/${study.id}`}
                        className="text-[14px] font-semibold leading-[1.5] text-ink transition hover:text-accent-ink"
                      >
                        {study.name}
                      </Link>
                      <p className="mt-[2px] text-[12px] leading-[1.6] text-ink-3">{study.population}</p>
                      <p className="mt-1 text-[13.5px] leading-[1.7] text-ink-2">{study.performance}</p>
                      {study.note && <p className="mt-1 text-[12px] leading-[1.6] text-warn">{study.note}</p>}
                      <div className="mt-2">
                        <SourceLinks
                          links={resolveSources(study.sources).map((source) => ({
                            label: source.label,
                            href: sourceHref(source),
                            kind: source.kind,
                          }))}
                          max={4}
                        />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>
          </section>

          <section>
            <SectionTitle>产品</SectionTitle>
            <Panel className="px-4 py-3">
              <dl className="grid gap-3 text-[13px] leading-[1.7]">
                <div>
                  <dt className="text-[11.5px] font-semibold text-ink-3">布局</dt>
                  <dd className="text-ink-2">{company.layout}</dd>
                </div>
                <div>
                  <dt className="text-[11.5px] font-semibold text-ink-3">检测平台</dt>
                  <dd className="text-ink-2">{company.panel}</dd>
                </div>
                <div>
                  <dt className="text-[11.5px] font-semibold text-ink-3">癌种 · {company.cancerLabel}</dt>
                  <dd className="mt-1 flex flex-wrap gap-[5px]">
                    {company.cancers.map((cancer) => (
                      <Link
                        key={cancer}
                        href={`/leaderboard?cancer=${encodeURIComponent(cancer)}`}
                        className={cn(
                          "rounded-[5px] px-[7px] py-px text-[12px] transition hover:text-accent-ink",
                          HIGH_MORTALITY.has(cancer) ? "bg-accent-soft font-semibold text-accent-ink" : "bg-sunken text-ink-2"
                        )}
                      >
                        {cancer}
                      </Link>
                    ))}
                  </dd>
                </div>
              </dl>
            </Panel>
          </section>
        </div>

        <aside className="min-w-0">
          <SectionTitle href={`/all?co=${company.id}`} more="全部动态">
            时间线
          </SectionTitle>
          {timeline.length ? (
            <Panel className="px-3">
              {timeline.map((event) => (
                <EventRow key={event.id} event={event} dateStyle="full" dense />
              ))}
            </Panel>
          ) : (
            <p className="text-[13px] text-ink-3">暂无带日期的事件</p>
          )}
        </aside>
      </div>
    </div>
  );
}
