import type { Metadata } from "next";
import Link from "next/link";
import { EventRow } from "@/components/feed/EventRow";
import { PageHeader, Panel, SectionTitle, SourceLinks, StageChip } from "@/components/ui";
import { COMPANIES, STAGE_META, resolveSources, sourceHref, type Company, type RegStatus } from "@/data";
import { yearOf } from "@/lib/dates";
import type { IntelEvent } from "@/lib/events";
import { loadEvents } from "@/lib/load-events";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "报证进度" };

const COLUMNS = ["NMPA", "FDA", "其他", "LDT / 研发"] as const;

function columnOf(status: RegStatus): (typeof COLUMNS)[number] {
  return STAGE_META[status.stage].regulator ?? "LDT / 研发";
}

function StatusCell({ statuses }: { statuses: RegStatus[] }) {
  if (!statuses.length) return <span className="text-line-strong">—</span>;
  const sorted = [...statuses].sort((a, b) => STAGE_META[b.stage].rank - STAGE_META[a.stage].rank);
  return (
    <ul className="grid grid-cols-1 gap-[10px]">
      {sorted.map((status) => {
        const sources = resolveSources(status.sources);
        return (
          <li key={status.label + status.scope}>
            <StageChip status={status} />
            <div className="mt-[3px] text-[12px] leading-[1.5] text-ink-2">{status.scope}</div>
            {sources.length > 0 && (
              <div className="mt-1">
                <SourceLinks
                  links={sources.map((source) => ({ label: source.label, href: sourceHref(source), kind: source.kind }))}
                  max={2}
                />
              </div>
            )}
          </li>
        );
      })}
    </ul>
  );
}

function Matrix({ companies }: { companies: Company[] }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-line bg-panel shadow-panel">
      {/* 固定列宽：四个监管列平分剩余宽度，信源标签在列内截断而不是把表格撑出视口 */}
      <table className="sticky-first w-full min-w-[920px] table-fixed border-collapse text-[12.5px]">
        <thead>
          <tr className="border-b border-line bg-sunken/60 text-[11.5px] text-ink-3">
            <th scope="col" className="w-[170px] px-4 py-2 text-left font-semibold">
              企业 · 产品
            </th>
            {COLUMNS.map((column) => (
              <th key={column} scope="col" className="px-3 py-2 text-left font-semibold">
                {column}
              </th>
            ))}
          </tr>
        </thead>
        {(["国外", "国内"] as const).map((region) => (
          <tbody key={region}>
            <tr className="border-b border-line bg-bg">
              <th scope="colgroup" colSpan={COLUMNS.length + 1} className="px-4 py-[6px] text-left text-[12px] font-bold text-ink-2">
                {region}
              </th>
            </tr>
            {companies
              .filter((company) => company.region === region)
              .map((company) => (
                <tr key={company.id} className={cn("border-b border-line last:border-b-0", company.self && "bg-self-soft/40")}>
                  <th scope="row" className={cn("px-4 py-3 text-left align-top font-normal", company.self && "bg-self-soft")}>
                    <Link
                      href={`/companies/${company.id}`}
                      className={cn("text-[13.5px] font-bold transition hover:text-accent-ink", company.self ? "text-self" : "text-ink")}
                    >
                      {company.name}
                    </Link>
                    <div className="text-[11.5px] leading-[1.5] text-ink-3">{company.product}</div>
                  </th>
                  {COLUMNS.map((column) => (
                    <td key={column} className="px-3 py-3 align-top">
                      <StatusCell statuses={company.statuses.filter((status) => columnOf(status) === column)} />
                    </td>
                  ))}
                </tr>
              ))}
          </tbody>
        ))}
      </table>
    </div>
  );
}

export default async function RegulatoryPage() {
  const { events } = await loadEvents();
  const regulatory = events.filter((event) => event.kind === "regulatory" && event.date);
  const byYear = new Map<string, IntelEvent[]>();
  for (const event of regulatory) {
    const year = yearOf(event.date);
    byYear.set(year, [...(byYear.get(year) ?? []), event]);
  }

  return (
    <div>
      <PageHeader title="报证进度" />
      <Matrix companies={COMPANIES} />

      <section className="mt-8 max-w-[900px]">
        <SectionTitle>时间线</SectionTitle>
        {[...byYear.entries()].map(([year, list]) => (
          <div key={year} className="mb-5">
            <h3 className="mb-1 flex items-baseline gap-2 text-[13px] font-bold text-ink">
              {year}
              <span className="text-[12px] font-normal tabular-nums text-ink-3">{list.length}</span>
            </h3>
            <Panel className="px-4">
              {list.map((event) => (
                <EventRow key={event.id} event={event} dateStyle="full" dense />
              ))}
            </Panel>
          </div>
        ))}
      </section>
    </div>
  );
}
