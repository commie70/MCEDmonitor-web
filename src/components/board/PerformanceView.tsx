"use client";

import Link from "next/link";
import { ArrowDown, ArrowUp } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import { EvidenceGap, type GapRow } from "@/components/charts/EvidenceGap";
import { PerfScatter, type PerfPoint } from "@/components/charts/PerfScatter";
import { DesignBadge, Empty, Panel, pillClass } from "@/components/ui";
import { DESIGN_ORDER, designRank, isProspective } from "@/data/meta";
import type { StudyDesign } from "@/data/types";
import { useQueryState } from "@/hooks/use-query-state";
import { cn } from "@/lib/utils";

export interface PerfRow {
  id: string;
  companyId: string;
  company: string;
  product: string;
  self: boolean;
  design: StudyDesign;
  scope: "mced" | "single";
  name: string;
  population: string;
  n?: number;
  spec?: number;
  specText: string;
  specSub?: string;
  sens?: number;
  sensText: string;
  sensSub?: string;
  early?: number;
  earlyText: string;
  earlySub?: string;
  too?: number;
  tooText: string;
  tooSub?: string;
  diagnostic: boolean;
  symptomatic: boolean;
  scatterLabel?: string;
}

type SortKey = "spec" | "sens" | "early" | "too" | "n";

const SCOPES = [
  { value: "", label: "全部" },
  { value: "mced", label: "MCED" },
  { value: "single", label: "单癌种" },
];

const TIERS = [
  { value: "", label: "前瞻 / RCT" },
  { value: "all", label: "含病例对照" },
];

function ChartTitle({ children }: { children: ReactNode }) {
  return <h2 className="mb-3 text-[17px] font-bold leading-tight tracking-[-0.005em] text-ink">{children}</h2>;
}

function Cell({ text, sub, strong }: { text: string; sub?: string; strong?: boolean }) {
  return (
    <td className="px-3 py-[10px] align-top">
      <div className={cn("whitespace-nowrap tabular-nums", strong ? "font-semibold text-ink" : "text-ink-2")}>{text}</div>
      {sub && <div className="mt-[2px] min-w-[120px] max-w-[220px] text-[11.5px] leading-[1.5] text-ink-3">{sub}</div>}
    </td>
  );
}

/**
 * 性能对照：一行筛选作用于散点图、证据落差与研究表。
 * 默认只看前瞻 / RCT——病例对照普遍高估，不能外推无症状筛查。
 */
export function PerformanceView({ rows, gaps }: { rows: PerfRow[]; gaps: GapRow[] }) {
  const query = useQueryState();
  const scope = query.get("scope");
  const tier = query.get("tier");
  const design = query.get("design");
  const [sort, setSort] = useState<{ key: SortKey; dir: 1 | -1 } | null>(null);

  const scoped = useMemo(() => rows.filter((row) => !scope || row.scope === scope), [rows, scope]);

  const points: PerfPoint[] = useMemo(
    () =>
      scoped
        .filter((row) => !row.diagnostic && typeof row.spec === "number" && typeof row.sens === "number")
        .map((row) => ({
          id: row.id,
          company: row.company,
          product: row.product,
          self: row.self,
          design: row.design,
          prospective: isProspective(row.design),
          name: row.name,
          spec: row.spec as number,
          sens: row.sens as number,
          n: row.n,
          label: row.scatterLabel,
        })),
    [scoped]
  );

  const table = useMemo(() => {
    const list = scoped.filter((row) =>
      design ? row.design === design : tier === "all" ? true : isProspective(row.design)
    );
    if (!sort) {
      return [...list].sort((a, b) => designRank(a.design) - designRank(b.design) || (b.sens ?? -1) - (a.sens ?? -1));
    }
    return [...list].sort((a, b) => ((b[sort.key] ?? -1) - (a[sort.key] ?? -1)) * sort.dir);
  }, [scoped, tier, design, sort]);

  const visibleGaps = gaps.filter((gap) => !scope || (scope === "mced") === gap.mced);

  const header = (key: SortKey, label: string) => {
    const active = sort?.key === key;
    return (
      <th
        scope="col"
        aria-sort={active ? (sort.dir === 1 ? "descending" : "ascending") : "none"}
        className="px-3 py-2 text-left font-semibold"
      >
        <button
          type="button"
          onClick={() => setSort(active ? (sort.dir === 1 ? { key, dir: -1 } : null) : { key, dir: 1 })}
          className={cn("inline-flex items-center gap-1 whitespace-nowrap transition hover:text-ink", active && "text-ink")}
        >
          {label}
          {active && (sort.dir === 1 ? <ArrowDown size={12} aria-hidden /> : <ArrowUp size={12} aria-hidden />)}
        </button>
      </th>
    );
  };

  return (
    <div>
      <div role="radiogroup" aria-label="范围" className="mb-4 inline-flex rounded-full border border-line bg-panel p-[2px]">
        {SCOPES.map((item) => (
          <button
            key={item.value || "all"}
            type="button"
            role="radio"
            aria-checked={scope === item.value}
            onClick={() => query.set({ scope: item.value || null })}
            className={cn(
              "h-[26px] rounded-full px-[14px] text-[12.5px] transition",
              scope === item.value ? "bg-ink font-semibold text-panel" : "text-ink-2 hover:text-ink"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>

      <div className="grid gap-5">
        <Panel className="p-4 sm:p-6">
          <ChartTitle>灵敏度 × 特异性</ChartTitle>
          {points.length ? <PerfScatter points={points} /> : <Empty>该范围内没有同时报告特异性与灵敏度的研究</Empty>}
        </Panel>
        <Panel className="p-4 sm:p-6">
          <ChartTitle>病例对照 → 前瞻队列 · 灵敏度 %</ChartTitle>
          {visibleGaps.length ? <EvidenceGap rows={visibleGaps} /> : <Empty>该范围内没有可配对的研究</Empty>}
        </Panel>
      </div>

      <section id="studies" className="mt-6 scroll-mt-20">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          <h2 className="mr-2 text-[13px] font-bold text-ink">研究</h2>
          {TIERS.map((item) => (
            <button
              key={item.value || "prospective"}
              type="button"
              aria-pressed={!design && tier === item.value}
              onClick={() => query.set({ tier: item.value || null, design: null })}
              className={pillClass(!design && tier === item.value)}
            >
              {item.label}
            </button>
          ))}
          <select
            aria-label="研究设计"
            value={design}
            onChange={(event) => query.set({ design: event.target.value || null })}
            className="h-[28px] rounded-full border border-line bg-panel px-[10px] text-[12.5px] text-ink-2 outline-none hover:border-line-strong focus:border-accent"
          >
            <option value="">按研究设计</option>
            {DESIGN_ORDER.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
          <span className="ml-auto text-[12px] tabular-nums text-ink-3">{table.length}</span>
        </div>

        {table.length === 0 ? (
          <Empty>没有符合条件的研究</Empty>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-line bg-panel shadow-panel">
            <table className="sticky-first w-full min-w-[980px] border-collapse text-[12.5px]">
              <thead>
                <tr className="border-b border-line bg-sunken/60 text-[11.5px] text-ink-3">
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    企业 · 产品
                  </th>
                  <th scope="col" className="px-3 py-2 text-left font-semibold">
                    研究
                  </th>
                  {header("n", "例数")}
                  {header("spec", "特异性")}
                  {header("sens", "灵敏度")}
                  {header("early", "早期 / 癌前")}
                  {header("too", "TOO")}
                </tr>
              </thead>
              <tbody>
                {table.map((row) => (
                  <tr key={row.id} className={cn("border-b border-line last:border-b-0", row.self && "bg-self-soft/40")}>
                    <th scope="row" className={cn("px-3 py-[10px] text-left align-top font-normal", row.self && "bg-self-soft")}>
                      <Link
                        href={`/companies/${row.companyId}`}
                        className={cn("font-semibold transition hover:text-accent-ink", row.self ? "text-self" : "text-ink")}
                      >
                        {row.company}
                      </Link>
                      <div className="max-w-[170px] text-[11.5px] leading-[1.5] text-ink-3">{row.product}</div>
                    </th>
                    <td className="px-3 py-[10px] align-top">
                      <div className="flex items-start gap-2">
                        <DesignBadge design={row.design} className="mt-px" />
                        <Link
                          href={`/studies/${row.id}`}
                          className="min-w-[180px] max-w-[280px] font-semibold leading-[1.5] text-ink transition hover:text-accent-ink"
                        >
                          {row.name}
                        </Link>
                      </div>
                      <div className="mt-[3px] max-w-[360px] text-[11.5px] leading-[1.5] text-ink-3">{row.population}</div>
                    </td>
                    <Cell text={row.n ? row.n.toLocaleString("en-US") : "—"} />
                    <Cell text={row.specText} sub={row.specSub} strong />
                    <Cell text={row.sensText} sub={row.sensSub} strong />
                    <Cell text={row.earlyText} sub={row.earlySub} />
                    <Cell text={row.tooText} sub={row.tooSub} />
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  );
}
