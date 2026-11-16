"use client";

import Link from "next/link";
import { ChevronRight, Search, X } from "lucide-react";
import type { ReactNode } from "react";
import { CARD_GRID, Empty, pillClass } from "@/components/ui";
import { MRD_APPROACHES, MRD_APPROACH_LABEL, MRD_CATEGORY_LABEL, MRD_TISSUE_ASSAYS, formatPrice } from "@/data/meta";
import type { MrdApproach, MrdCategory, MrdEvidence } from "@/data/types";
import { useQueryState } from "@/hooks/use-query-state";
import { cn } from "@/lib/utils";
import {
  ApproachChip,
  EvidenceDot,
  assayLine,
  clinicalContext,
  clinicalReadings,
  lodBasis,
  type MatrixProduct,
} from "./mrd-parts";

const GROUPS: { key: string; category: MrdCategory; approach: MrdApproach | null; label: string }[] = [
  { key: "informed", category: "solid", approach: "tumor-informed", label: `${MRD_CATEGORY_LABEL.solid} · Tumor-informed` },
  { key: "naive", category: "solid", approach: "tumor-naive", label: `${MRD_CATEGORY_LABEL.solid} · Tumor-naive` },
  { key: "heme", category: "heme", approach: null, label: MRD_CATEGORY_LABEL.heme },
];

interface Filter {
  approach: string;
  tissue: string;
  region: string;
  keyword: string;
}

function matches(product: MatrixProduct, filter: Filter): boolean {
  if (filter.approach && product.approach !== filter.approach) return false;
  if (filter.tissue && product.tissue !== filter.tissue) return false;
  if (filter.region && product.region !== filter.region) return false;
  if (filter.keyword) {
    const haystack = [
      product.company,
      product.companyEn,
      product.product,
      product.tissueDetail,
      product.trackingDetail,
      ...product.analytes,
      ...product.clinical.map((entry) => `${entry.cancer} ${entry.study}`),
    ]
      .join(" ")
      .toLowerCase();
    if (!haystack.includes(filter.keyword)) return false;
  }
  return true;
}

/** 读数的分量跟着出处走：同行评议与监管审评实心深色，企业材料减重变浅。 */
function weight(evidence: MrdEvidence): string {
  return evidence === "vendor" ? "font-semibold text-ink-2" : "font-bold text-ink";
}

function Slot({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg bg-sunken/70 px-3 py-3">
      <h4 className="text-[12px] leading-[1.4] text-ink-3">{title}</h4>
      {children}
    </section>
  );
}

function Undisclosed() {
  return <p className="mt-[2px] text-[13.5px] text-ink-3">未公开</p>;
}

function ProductCard({ product }: { product: MatrixProduct }) {
  const href = `/mrd/${product.id}`;
  const lod = product.lod[0];
  const clinical = product.clinical[0];
  const price = product.prices[0];
  const readings = clinical ? clinicalReadings(clinical) : [];
  const moreStatuses = product.statuses.length - 2;
  return (
    <article
      className={cn(
        "flex min-w-0 flex-col rounded-xl border bg-panel shadow-panel",
        product.self ? "border-self" : "border-line"
      )}
    >
      <div className="grid flex-1 content-start gap-3 px-4 pb-4 pt-4">
        <header>
          <div className="flex items-start justify-between gap-3">
            <h3 className="min-w-0 text-[17px] font-bold leading-[1.3]">
              <Link href={href} className={cn("transition hover:text-accent-ink", product.self ? "text-self" : "text-ink")}>
                {product.product}
              </Link>
            </h3>
            {product.category === "solid" && <ApproachChip approach={product.approach} />}
          </div>
          <p className="mt-[3px] text-[12.5px] leading-[1.5] text-ink-3">
            {product.companyId ? (
              <Link href={`/companies/${product.companyId}`} className="text-ink-2 transition hover:text-accent-ink">
                {product.company}
              </Link>
            ) : (
              <span className="text-ink-2">{product.company}</span>
            )}
            <span className="ml-2">{product.region === "国外" ? product.country : product.companyEn}</span>
          </p>
          <p className="mt-2 text-[13.5px] font-semibold leading-[1.45] text-ink">{assayLine(product)}</p>
          {product.targets && <p className="text-[12.5px] leading-[1.5] text-ink-3">{product.targets}</p>}
        </header>

        <Slot title="检出限">
          {lod ? (
            <>
              <p className="mt-[2px] grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2">
                <EvidenceDot evidence={lod.evidence} className="translate-y-[-3px]" />
                <span className={cn("text-[20px] leading-[1.3] tracking-[-0.005em] tabular-nums", weight(lod.evidence))}>
                  {lod.label}
                </span>
              </p>
              <p className="mt-[3px] text-[13px] leading-[1.5] text-ink">{lodBasis(lod)}</p>
            </>
          ) : (
            <Undisclosed />
          )}
        </Slot>

        <Slot title="临床性能">
          {clinical ? (
            <>
              <dl className="mt-1 grid grid-cols-2 gap-x-3 gap-y-[6px]">
                {readings.map((reading) => (
                  <div key={reading.label} className="min-w-0">
                    <dt className="text-[12px] leading-[1.4] text-ink-3">{reading.label}</dt>
                    <dd className={cn("text-[15px] leading-[1.4] tabular-nums", weight(clinical.evidence))}>{reading.value}</dd>
                  </div>
                ))}
              </dl>
              <p className="mt-[8px] grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-2 border-t border-line pt-[8px] text-[12.5px] leading-[1.5]">
                <EvidenceDot evidence={clinical.evidence} className="translate-y-[-1px]" />
                <span>
                  <span className="font-semibold text-ink">{clinical.study}</span>
                  <span className="ml-2 text-ink-3">{clinicalContext(clinical)}</span>
                </span>
              </p>
              {clinical.note && <p className="mt-[6px] line-clamp-3 text-[12px] leading-[1.55] text-warn">{clinical.note}</p>}
            </>
          ) : (
            <Undisclosed />
          )}
        </Slot>

        {product.statuses.length > 0 && (
          <ul className="grid gap-[3px] text-[12.5px] leading-[1.5] text-ink-2">
            {product.statuses.slice(0, 2).map((status) => (
              <li key={status.label}>{status.label}</li>
            ))}
            {moreStatuses > 0 && <li className="tabular-nums text-ink-3">+{moreStatuses}</li>}
          </ul>
        )}

        {product.note && <p className="line-clamp-3 text-[12px] leading-[1.55] text-warn">{product.note}</p>}
      </div>

      <Link
        href={href}
        className="group flex items-center justify-between gap-3 border-t border-line px-4 py-[10px] transition hover:text-accent-ink"
      >
        {price ? (
          <span className="min-w-0 text-[12.5px] leading-[1.5] text-ink-2">
            <span className="mr-2 text-[15px] font-bold tabular-nums text-ink group-hover:text-accent-ink">
              {formatPrice(price.amount, price.currency)}
            </span>
            {price.covers}
          </span>
        ) : (
          <span className="text-[12.5px] text-ink-3">市价未公开</span>
        )}
        <ChevronRight size={15} aria-hidden className="shrink-0 text-ink-3 group-hover:text-accent-ink" />
      </Link>
    </article>
  );
}

/**
 * MRD 性能矩阵：按「实体瘤 tumor-informed / tumor-naive / 血液肿瘤」分组的性能卡片，
 * 卡片上是技术选型、检出限、临床性能与市价，点进产品页看全部口径与逐格出处。
 */
export function MrdMatrix({ products }: { products: MatrixProduct[] }) {
  const query = useQueryState();
  const filter: Filter = {
    approach: query.get("approach"),
    tissue: query.get("tissue"),
    region: query.get("region"),
    keyword: query.get("q").trim().toLowerCase(),
  };
  const visible = products.filter((product) => matches(product, filter));
  const groups = GROUPS.map((group) => ({
    ...group,
    list: visible
      .filter((product) => product.category === group.category && (!group.approach || product.approach === group.approach))
      .sort((a, b) => Number(a.region === "国内") - Number(b.region === "国内")),
  })).filter((group) => group.list.length > 0);

  const segmentClass = (active: boolean) =>
    cn(
      "min-h-[22px] rounded-full px-[10px] text-[12px] transition",
      active ? "bg-ink font-semibold text-panel" : "text-ink-2 hover:text-ink"
    );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <div role="radiogroup" aria-label="技术路径" className="inline-flex rounded-full border border-line bg-panel p-[2px]">
          {["", ...MRD_APPROACHES].map((approach) => (
            <button
              key={approach || "all"}
              type="button"
              role="radio"
              aria-checked={filter.approach === approach}
              onClick={() => query.set({ approach: approach || null })}
              className={segmentClass(filter.approach === approach)}
            >
              {approach ? MRD_APPROACH_LABEL[approach as MrdApproach] : "全部"}
            </button>
          ))}
        </div>
        <div className="flex items-center gap-[6px]">
          {MRD_TISSUE_ASSAYS.map((assay) => {
            const active = filter.tissue === assay;
            return (
              <button
                key={assay}
                type="button"
                aria-pressed={active}
                onClick={() => query.set({ tissue: active ? null : assay })}
                className={pillClass(active)}
              >
                {assay}
              </button>
            );
          })}
        </div>
        <div role="radiogroup" aria-label="地区" className="inline-flex rounded-full border border-line bg-panel p-[2px]">
          {["", "国外", "国内"].map((region) => (
            <button
              key={region || "all"}
              type="button"
              role="radio"
              aria-checked={filter.region === region}
              onClick={() => query.set({ region: region || null })}
              className={segmentClass(filter.region === region)}
            >
              {region || "全部"}
            </button>
          ))}
        </div>
        <label className="relative flex items-center">
          <Search size={13} aria-hidden className="pointer-events-none absolute left-[10px] text-ink-3" />
          <input
            type="search"
            aria-label="搜索企业、产品或癌种"
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
        <span className="ml-auto flex flex-wrap items-center gap-x-3 gap-y-1 text-[12px] text-ink-3">
          <span className="inline-flex items-center gap-[5px]">
            <EvidenceDot evidence="peer-reviewed" />
            同行评议 / 监管审评
          </span>
          <span className="inline-flex items-center gap-[5px]">
            <EvidenceDot evidence="vendor" />
            企业材料 / 转述
          </span>
          <span className="tabular-nums">
            {visible.length} / {products.length}
          </span>
        </span>
      </div>

      {visible.length === 0 ? (
        <Empty>没有符合条件的产品</Empty>
      ) : (
        <div className="grid gap-6">
          {groups.map((group) => (
            <section key={group.key} aria-label={group.label}>
              <h2 className="mb-3 flex items-baseline gap-2 text-[14px] font-bold text-ink">
                {group.label}
                <span className="text-[12.5px] font-normal tabular-nums text-ink-3">{group.list.length}</span>
              </h2>
              <div className={CARD_GRID}>
                {group.list.map((product) => (
                  <ProductCard key={product.id} product={product} />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
