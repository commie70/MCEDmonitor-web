import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { StageHeatmap } from "@/components/charts/StageHeatmap";
import { DesignBadge, Panel, SectionTitle } from "@/components/ui";
import {
  PATHFINDER,
  SOURCE_KIND_LABEL,
  getCompany,
  getStudy,
  isExternal,
  resolveSources,
  sourceHref,
  studiesOf,
  type StudyMetrics,
} from "@/data";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const study = getStudy(id);
  const company = study ? getCompany(study.companyId) : undefined;
  return study && company
    ? { title: `${company.name} · ${study.name}`, description: study.performance }
    : { title: "研究证据" };
}

function metricTiles(metrics: StudyMetrics): { label: string; value: string; sub?: string }[] {
  const tiles: { label: string; value: string; sub?: string }[] = [];
  const add = (label: string, value: number | undefined, sub?: string, text?: string) => {
    if (typeof value === "number") tiles.push({ label, value: text ?? `${value}%`, sub });
  };
  add("特异性", metrics.spec, undefined, metrics.specLabel);
  add("灵敏度", metrics.sens);
  add("早期灵敏度", metrics.early, metrics.earlyLabel);
  add("进展期癌前病变", metrics.precancer);
  add("TOO / CSO", metrics.too, metrics.tooLabel);
  add("PPV", metrics.ppv);
  add("NPV", metrics.npv);
  if (typeof metrics.n === "number") tiles.push({ label: "例数", value: metrics.n.toLocaleString("en-US") });
  return tiles;
}

export default async function StudyPage({ params }: Props) {
  const { id } = await params;
  const study = getStudy(id);
  const company = study ? getCompany(study.companyId) : undefined;
  if (!study || !company) notFound();

  const sources = resolveSources(study.sources);
  const tiles = metricTiles(study.metrics);
  const siblings = studiesOf(company.id).filter((item) => item.id !== study.id);

  return (
    <div className="max-w-[900px]">
      <Link
        href={`/companies/${company.id}`}
        className="inline-flex items-center gap-[6px] text-[12.5px] text-ink-3 transition hover:text-accent-ink"
      >
        <ArrowLeft size={14} aria-hidden />
        {company.name}
      </Link>

      <header className="mt-3 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[12.5px] text-ink-3">
          <DesignBadge design={study.design} />
          <span className={cn("font-semibold", company.self ? "text-self" : "text-ink-2")}>
            {company.name} · {study.compare?.prod ?? company.product}
          </span>
          <span>{study.scope === "mced" ? "多癌种" : "单癌种"}</span>
          {study.symptomatic && <span>有症状人群</span>}
          {study.diagnostic && <span>诊断 / 结节分类</span>}
          <span className="tabular-nums">{study.dateNote}</span>
        </div>
        <h1 className="mt-2 text-[22px] font-bold leading-[1.45] tracking-[-0.01em] text-ink">{study.name}</h1>
      </header>

      {tiles.length > 0 && (
        <dl className="mt-5 grid grid-cols-2 gap-px overflow-hidden rounded-xl border border-line bg-line sm:grid-cols-4">
          {tiles.map((tile) => (
            <div key={tile.label} className="bg-panel px-4 py-3">
              <dt className="text-[11.5px] text-ink-3">{tile.label}</dt>
              <dd className="mt-1 text-[22px] font-bold leading-none tabular-nums text-ink">{tile.value}</dd>
              {tile.sub && <dd className="mt-[5px] text-[11.5px] text-ink-3">{tile.sub}</dd>}
            </div>
          ))}
        </dl>
      )}

      <section className="mt-6">
        <SectionTitle>人群</SectionTitle>
        <p className="text-[14px] leading-[1.8] text-ink-2">{study.population}</p>
      </section>

      <section className="mt-6">
        <SectionTitle>性能</SectionTitle>
        <p className="text-[14px] leading-[1.8] text-ink-2">{study.performance}</p>
        {study.note && (
          <p className="mt-3 rounded-lg border border-warn bg-warn-soft px-3 py-2 text-[13px] leading-[1.7] text-warn">{study.note}</p>
        )}
      </section>

      {study.compare?.detail === "pf1" && (
        <section className="mt-6">
          <SectionTitle>癌种 × 分期灵敏度</SectionTitle>
          <Panel className="p-3">
            <StageHeatmap table={PATHFINDER} />
          </Panel>
        </section>
      )}

      <section className="mt-6">
        <SectionTitle href="/sources" more="信源库">
          信源
        </SectionTitle>
        {sources.length ? (
          <Panel>
            <ul className="divide-y divide-line">
              {sources.map((source) => {
                const href = sourceHref(source);
                const external = isExternal(href);
                const body = (
                  <>
                    <span className="block text-[13.5px] font-semibold leading-[1.5] text-ink group-hover:text-accent-ink">
                      {source.title}
                      {external && <ArrowUpRight size={12} aria-hidden className="ml-1 inline opacity-50" />}
                    </span>
                    <span className="mt-[2px] block text-[12px] text-ink-3">
                      {[source.authors, source.label, source.pmid ? `PMID ${source.pmid}` : null].filter(Boolean).join(" · ")}
                    </span>
                  </>
                );
                return (
                  <li key={source.id} className="flex items-start gap-3 px-4 py-[10px]">
                    <span className="mt-[2px] w-[56px] shrink-0 text-[11.5px] text-ink-3">{SOURCE_KIND_LABEL[source.kind]}</span>
                    {external ? (
                      <a href={href} target="_blank" rel="noreferrer noopener" className="group min-w-0 flex-1">
                        {body}
                      </a>
                    ) : (
                      <Link href={href} className="group min-w-0 flex-1">
                        {body}
                      </Link>
                    )}
                  </li>
                );
              })}
            </ul>
          </Panel>
        ) : (
          <p className="text-[13px] text-ink-3">暂无可公开核对的信源</p>
        )}
      </section>

      {siblings.length > 0 && (
        <section className="mt-8">
          <SectionTitle href={`/companies/${company.id}`} more="企业档案">
            {company.name} 的其他研究
          </SectionTitle>
          <ul className="grid gap-2">
            {siblings.map((item) => (
              <li key={item.id} className="flex items-start gap-3">
                <DesignBadge design={item.design} className="mt-[2px]" />
                <Link href={`/studies/${item.id}`} className="text-[13.5px] leading-[1.55] text-ink-2 transition hover:text-accent-ink">
                  {item.name}
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
