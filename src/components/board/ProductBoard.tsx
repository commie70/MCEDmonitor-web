"use client";

import Link from "next/link";
import { ChevronRight, Search, X } from "lucide-react";
import { CARD_GRID, DesignBadge, Empty, RouteTag, StageChip, pillClass } from "@/components/ui";
import { ROUTES, STATUS_FILTERS } from "@/data/meta";
import type { Company, RouteKey, StudyDesign } from "@/data/types";
import { useQueryState } from "@/hooks/use-query-state";
import { cn } from "@/lib/utils";

/** 卡片上领衔的读数：数字属于某一项研究，卡片同时写明是哪一项。 */
export interface BoardHeadline {
  id: string;
  design: StudyDesign;
  prospective: boolean;
  name: string;
  n?: number;
  spec: string;
  sens: string;
  extras: string[];
  note?: string;
}

export type BoardCompany = Company & {
  headline: BoardHeadline | null;
  studyNames: string[];
};

interface Filter {
  routes: string[];
  cancer: string;
  status: string;
  region: string;
  keyword: string;
}

function matches(company: BoardCompany, filter: Filter): boolean {
  if (filter.routes.length && !filter.routes.every((route) => company.routes.includes(route as RouteKey))) return false;
  if (filter.cancer === "MCED" ? !company.mced : filter.cancer && !company.cancers.includes(filter.cancer)) return false;
  if (filter.status && !company.statusKeys.includes(filter.status)) return false;
  if (filter.region && company.region !== filter.region) return false;
  if (filter.keyword) {
    const haystack = [
      company.name,
      company.nameEn,
      company.product,
      company.layout,
      company.panel,
      company.cancerLabel,
      ...company.studyNames,
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(filter.keyword)) return false;
  }
  return true;
}

function Reading({ label, value, solid }: { label: string; value: string; solid: boolean }) {
  return (
    <div className="min-w-0">
      <dt className="text-[12px] leading-[1.4] text-ink-3">{label}</dt>
      <dd
        className={cn(
          "text-[28px] leading-[1.2] tracking-[-0.01em] tabular-nums",
          solid ? "font-bold text-ink" : "font-semibold text-ink-3"
        )}
      >
        {value}
      </dd>
    </div>
  );
}

/** 性能读数：前瞻数据实心深色，病例对照减重变浅，不与前瞻读数等量齐观。 */
function Performance({ headline }: { headline: BoardHeadline | null }) {
  if (!headline) {
    return (
      <div className="rounded-lg border border-dashed border-line-strong px-3 py-4 text-[13px] text-ink-3">
        无症状筛查性能未公开
      </div>
    );
  }
  return (
    <div className="rounded-lg bg-sunken/70 px-3 py-3">
      <dl className="grid grid-cols-2 gap-x-3">
        <Reading label="特异性" value={headline.spec} solid={headline.prospective} />
        <Reading label="灵敏度" value={headline.sens} solid={headline.prospective} />
      </dl>
      {headline.extras.length > 0 && (
        <p className="mt-[6px] text-[13px] leading-[1.5] tabular-nums text-ink-2">{headline.extras.join(" · ")}</p>
      )}
      <div className="mt-[10px] flex flex-wrap items-center gap-x-2 gap-y-1 border-t border-line pt-[10px]">
        <DesignBadge design={headline.design} />
        <Link
          href={`/studies/${headline.id}`}
          className="min-w-0 text-[13px] font-semibold leading-[1.45] text-ink transition hover:text-accent-ink"
        >
          {headline.name}
        </Link>
        {headline.n && <span className="text-[12px] tabular-nums text-ink-3">n={headline.n.toLocaleString("en-US")}</span>}
      </div>
      {headline.note && <p className="mt-[6px] line-clamp-3 text-[12px] leading-[1.55] text-warn">{headline.note}</p>}
    </div>
  );
}

function CompanyCard({ company }: { company: BoardCompany }) {
  const href = `/companies/${company.id}`;
  const shown = company.statuses.slice(0, 3);
  const hidden = company.statuses.length - shown.length;
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col rounded-xl border bg-panel shadow-panel",
        company.self ? "border-self" : "border-line"
      )}
    >
      <div className="grid flex-1 content-start gap-3 px-4 pb-4 pt-4">
        <header>
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 text-[17px] font-bold leading-[1.3]">
              <Link href={href} className={cn("transition hover:text-accent-ink", company.self ? "text-self" : "text-ink")}>
                {company.name}
              </Link>
              <span className="ml-2 text-[12.5px] font-normal text-ink-3">
                {company.region === "国外" ? company.country : company.nameEn}
              </span>
            </h3>
            {company.mced && (
              <span className="shrink-0 rounded-[5px] bg-accent-soft px-[6px] py-px text-[11px] font-semibold leading-[18px] text-accent-ink">
                MCED
              </span>
            )}
          </div>
          <p className="mt-[3px] text-[13.5px] font-semibold leading-[1.45] text-ink-2">{company.product}</p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-[2px]">
            {company.routes.map((route) => (
              <RouteTag key={route} route={route} />
            ))}
          </div>
        </header>

        <Performance headline={company.headline} />

        {shown.length > 0 && (
          <ul className="flex flex-wrap items-center gap-[6px]">
            {shown.map((status) => (
              <li key={status.label + status.scope} className="max-w-full">
                <StageChip status={status} className="max-w-full shrink whitespace-normal" />
              </li>
            ))}
            {hidden > 0 && <li className="text-[12px] tabular-nums text-ink-3">+{hidden}</li>}
          </ul>
        )}

        <p className="line-clamp-2 text-[12.5px] leading-[1.55] text-ink-2">{company.cancerLabel}</p>
      </div>

      <Link
        href={href}
        className="flex items-center justify-between gap-2 border-t border-line px-4 py-[10px] text-[12.5px] text-ink-3 transition hover:text-accent-ink"
      >
        <span className="tabular-nums">{company.studyNames.length} 项研究</span>
        <ChevronRight size={15} aria-hidden />
      </Link>
    </article>
  );
}

/**
 * 产品看板：每家企业一张性能卡片，领衔读数取自一项无症状筛查研究并注明出处；
 * 技术路线(多选)/ 癌种 / 报证 / 地区 筛选写在 URL 里。
 */
export function ProductBoard({ companies, cancers }: { companies: BoardCompany[]; cancers: string[] }) {
  const query = useQueryState();
  const filter: Filter = {
    routes: query.getList("route"),
    cancer: query.get("cancer"),
    status: query.get("status"),
    region: query.get("region"),
    keyword: query.get("q").trim().toLowerCase(),
  };
  const visible = companies.filter((company) => matches(company, filter));
  const groups = (["国外", "国内"] as const)
    .map((region) => ({ region, list: visible.filter((company) => company.region === region) }))
    .filter((group) => group.list.length > 0);

  const toggleRoute = (route: string) =>
    query.set({
      route: filter.routes.includes(route) ? filter.routes.filter((value) => value !== route) : [...filter.routes, route],
    });

  const selectClass =
    "h-[28px] rounded-full border border-line bg-panel px-[10px] text-[12.5px] text-ink-2 outline-none transition hover:border-line-strong focus:border-accent";

  return (
    <div>
      <div className="mb-4 grid gap-2">
        <div className="no-scrollbar -mx-4 flex items-center gap-[6px] overflow-x-auto px-4 lg:mx-0 lg:flex-wrap lg:px-0">
          {ROUTES.map((route) => {
            const active = filter.routes.includes(route);
            return (
              <button
                key={route}
                type="button"
                data-route={route}
                aria-pressed={active}
                onClick={() => toggleRoute(route)}
                className={cn(pillClass(active), "gap-[6px]")}
              >
                <span aria-hidden className="size-[7px] rounded-full bg-(--route)" />
                {route}
              </button>
            );
          })}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select aria-label="癌种" value={filter.cancer} onChange={(event) => query.set({ cancer: event.target.value || null })} className={selectClass}>
            <option value="">全部癌种</option>
            <option value="MCED">多癌种(MCED)</option>
            {cancers.map((cancer) => (
              <option key={cancer} value={cancer}>
                {cancer}
              </option>
            ))}
          </select>
          <select aria-label="报证状态" value={filter.status} onChange={(event) => query.set({ status: event.target.value || null })} className={selectClass}>
            <option value="">全部报证状态</option>
            {STATUS_FILTERS.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
          <div role="radiogroup" aria-label="地区" className="inline-flex rounded-full border border-line bg-panel p-[2px]">
            {["", "国外", "国内"].map((region) => (
              <button
                key={region || "all"}
                type="button"
                role="radio"
                aria-checked={filter.region === region}
                onClick={() => query.set({ region: region || null })}
                className={cn(
                  "min-h-[22px] rounded-full px-[10px] text-[12px] transition",
                  filter.region === region ? "bg-ink font-semibold text-panel" : "text-ink-2 hover:text-ink"
                )}
              >
                {region || "全部"}
              </button>
            ))}
          </div>
          <label className="relative flex items-center">
            <Search size={13} aria-hidden className="pointer-events-none absolute left-[10px] text-ink-3" />
            <input
              type="search"
              aria-label="搜索企业、产品或研究"
              placeholder="搜索"
              value={query.get("q")}
              onChange={(event) => query.set({ q: event.target.value || null })}
              className="h-[28px] w-[150px] rounded-full border border-line bg-panel pl-[28px] pr-[10px] text-[12.5px] text-ink outline-none transition placeholder:text-ink-3 hover:border-line-strong focus:border-accent"
            />
          </label>
          {query.active && (
            <button
              type="button"
              onClick={query.clear}
              className="inline-flex h-[28px] items-center gap-1 rounded-full px-2 text-[12px] text-ink-3 transition hover:text-ink"
            >
              <X size={12} aria-hidden />
              清除
            </button>
          )}
          <span className="ml-auto text-[12px] tabular-nums text-ink-3">
            {visible.length} / {companies.length}
          </span>
        </div>
      </div>

      {visible.length === 0 ? (
        <Empty>没有符合条件的企业</Empty>
      ) : (
        <div className="grid gap-6">
          {groups.map((group) => (
            <section key={group.region} aria-label={group.region}>
              <h2 className="mb-3 flex items-baseline gap-2 text-[14px] font-bold text-ink">
                {group.region}
                <span className="text-[12.5px] font-normal tabular-nums text-ink-3">{group.list.length}</span>
              </h2>
              <div className={CARD_GRID}>
                {group.list.map((company) => (
                  <CompanyCard key={company.id} company={company} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
