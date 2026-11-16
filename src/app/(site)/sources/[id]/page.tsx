import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { DesignBadge, Panel, SectionTitle, StageChip } from "@/components/ui";
import { SOURCE_KIND_LABEL, citationsOf, getCompany, getSource } from "@/data";
import { fullDate } from "@/lib/dates";
import { eventHref } from "@/lib/event-model";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const source = getSource(id);
  return source ? { title: source.title, description: source.label } : { title: "信源" };
}

export default async function SourcePage({ params }: Props) {
  const { id } = await params;
  const source = getSource(id);
  if (!source) notFound();

  const cited = citationsOf(source.id);
  const statuses = cited.companies.flatMap((company) =>
    company.statuses
      .filter((status) => status.sources.includes(source.id))
      .map((status) => ({ company, status }))
  );
  const identifiers = [
    source.doi ? { label: `DOI ${source.doi}`, href: `https://doi.org/${source.doi}` } : null,
    source.pmid ? { label: `PMID ${source.pmid}`, href: `https://pubmed.ncbi.nlm.nih.gov/${source.pmid}/` } : null,
  ].filter((entry): entry is { label: string; href: string } => Boolean(entry));

  return (
    <div className="max-w-[900px]">
      <Link href="/sources" className="inline-flex items-center gap-[6px] text-[12.5px] text-ink-3 transition hover:text-accent-ink">
        <ArrowLeft size={14} aria-hidden />
        信源库
      </Link>

      <header className="mt-3 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
          <span className="font-semibold text-ink-2">{SOURCE_KIND_LABEL[source.kind]}</span>
          <span>{source.label}</span>
          {source.date && <time dateTime={source.date}>{fullDate(source.date)}</time>}
        </div>
        <h1 className="mt-2 text-[22px] font-bold leading-[1.45] tracking-[-0.01em] text-ink">{source.title}</h1>
        {source.authors && <p className="mt-2 text-[13px] leading-[1.6] text-ink-2">{source.authors}</p>}
        {(source.url || identifiers.length > 0) && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            {source.url && (
              <a
                href={source.url}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-[30px] items-center gap-[5px] rounded-full bg-accent px-[14px] text-[12.5px] font-semibold text-panel transition hover:opacity-90"
              >
                原文
                <ArrowUpRight size={13} aria-hidden />
              </a>
            )}
            {identifiers.map((identifier) => (
              <a
                key={identifier.href}
                href={identifier.href}
                target="_blank"
                rel="noreferrer noopener"
                className="inline-flex h-[30px] items-center rounded-full border border-line bg-panel px-3 font-mono text-[11.5px] text-ink-2 transition hover:border-accent hover:text-accent-ink"
              >
                {identifier.label}
              </a>
            ))}
          </div>
        )}
      </header>

      {source.document && (
        <article className="mt-5">
          <p className="text-[12.5px] text-ink-3">
            {[source.document.origin, source.document.locator].filter(Boolean).join(" · ")}
          </p>
          {source.document.blocks.map((block, index) => (
            <section key={index} className="mt-5">
              {block.heading && <h2 className="mb-2 text-[14px] font-bold text-ink">{block.heading}</h2>}
              {block.text && <p className="text-[14px] leading-[1.8] text-ink-2">{block.text}</p>}
              {block.table && block.table.length > 0 && (
                <Panel className="mt-2 overflow-x-auto">
                  <table className="w-full min-w-[480px] border-collapse text-[13px]">
                    <thead>
                      <tr className="border-b border-line text-left text-[11.5px] text-ink-3">
                        {block.table[0].map((cell, column) => (
                          <th key={column} scope="col" className="px-3 py-2 font-semibold first:pl-4">
                            {cell}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-line">
                      {block.table.slice(1).map((row, rowIndex) => (
                        <tr key={rowIndex}>
                          {row.map((cell, column) =>
                            column === 0 ? (
                              <th key={column} scope="row" className="px-3 py-[7px] pl-4 text-left font-medium text-ink">
                                {cell}
                              </th>
                            ) : (
                              <td key={column} className="px-3 py-[7px] tabular-nums text-ink-2">
                                {cell}
                              </td>
                            )
                          )}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </Panel>
              )}
            </section>
          ))}
        </article>
      )}

      {cited.studies.length > 0 && (
        <section className="mt-7">
          <SectionTitle>引用研究</SectionTitle>
          <Panel>
            <ul className="divide-y divide-line">
              {cited.studies.map((study) => (
                <li key={study.id} className="flex items-start gap-3 px-4 py-[10px]">
                  <DesignBadge design={study.design} className="mt-[2px]" />
                  <Link href={`/studies/${study.id}`} className="group min-w-0 flex-1">
                    <span className="block text-[13.5px] font-semibold leading-[1.5] text-ink group-hover:text-accent-ink">
                      {study.name}
                    </span>
                    <span className="mt-[2px] block text-[12px] text-ink-3">
                      {[getCompany(study.companyId)?.name, study.dateNote].filter(Boolean).join(" · ")}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}

      {cited.milestones.length > 0 && (
        <section className="mt-7">
          <SectionTitle>引用事件</SectionTitle>
          <Panel>
            <ul className="divide-y divide-line">
              {cited.milestones.map((milestone) => (
                <li key={milestone.id} className="px-4 py-[10px]">
                  <Link href={eventHref({ id: `ms-${milestone.id}` })} className="group block">
                    <span className="block text-[13.5px] font-semibold leading-[1.5] text-ink group-hover:text-accent-ink">
                      {milestone.title}
                    </span>
                    <time dateTime={milestone.date} className="mt-[2px] block text-[12px] tabular-nums text-ink-3">
                      {fullDate(milestone.date)}
                    </time>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}

      {cited.mrd.length > 0 && (
        <section className="mt-7">
          <SectionTitle>引用 MRD 产品</SectionTitle>
          <Panel>
            <ul className="divide-y divide-line">
              {cited.mrd.map((product) => (
                <li key={product.id} className="px-4 py-[10px]">
                  <Link href={`/mrd/${product.id}`} className="group block">
                    <span className="block text-[13.5px] font-semibold leading-[1.5] text-ink group-hover:text-accent-ink">
                      {product.product}
                    </span>
                    <span className="mt-[2px] block text-[12px] text-ink-3">{product.company}</span>
                  </Link>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}

      {statuses.length > 0 && (
        <section className="mt-7">
          <SectionTitle>引用报证节点</SectionTitle>
          <Panel>
            <ul className="divide-y divide-line">
              {statuses.map(({ company, status }) => (
                <li key={`${company.id}-${status.stage}-${status.label}`} className="flex flex-wrap items-center gap-x-3 gap-y-1 px-4 py-[10px]">
                  <StageChip status={status} />
                  <Link
                    href={`/companies/${company.id}`}
                    className="text-[13.5px] font-semibold text-ink transition hover:text-accent-ink"
                  >
                    {company.name} · {company.product}
                  </Link>
                  <span className="text-[12px] text-ink-3">{[status.scope, status.date].filter(Boolean).join(" · ")}</span>
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}
    </div>
  );
}
