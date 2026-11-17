import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import type { ReactNode } from "react";
import {
  ApproachChip,
  EvidenceDot,
  assayLine,
  clinicalContext,
  clinicalReadings,
  lodBasis,
} from "@/components/board/mrd-parts";
import { Panel, SourceLinks } from "@/components/ui";
import { MRD_CATEGORY_LABEL, MRD_PRODUCTS, formatPrice } from "@/data";
import { toMatrixProduct } from "@/lib/mrd-view";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function find(id: string) {
  return MRD_PRODUCTS.find((product) => product.id === id);
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = find(id);
  return product ? { title: `${product.product} · ${product.company}` } : { title: "MRD 产品" };
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Panel className="p-4 sm:p-5">
      <h2 className="mb-3 text-[14px] font-bold text-ink">{title}</h2>
      {children}
    </Panel>
  );
}

function Detail({ term, children }: { term: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-[12px] font-semibold text-ink-3">{term}</dt>
      <dd className="text-[13.5px] leading-[1.65] text-ink-2">{children}</dd>
    </div>
  );
}

/** MRD 产品页：一款产品的全部口径——每条检出限、临床研究、报证与价格各自带出处。 */
export default async function MrdProductPage({ params }: Props) {
  const { id } = await params;
  const raw = find(id);
  if (!raw) notFound();
  const product = toMatrixProduct(raw);

  return (
    <div>
      <Link href="/mrd" className="inline-flex items-center gap-[6px] text-[12.5px] text-ink-3 transition hover:text-accent-ink">
        <ArrowLeft size={14} aria-hidden />
        MRD 矩阵
      </Link>

      <header className="mt-3 border-b border-line pb-4">
        <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
          <h1 className={cn("text-[24px] font-bold leading-tight tracking-[-0.01em]", product.self ? "text-self" : "text-ink")}>
            {product.product}
          </h1>
          {product.category === "solid" ? (
            <ApproachChip approach={product.approach} />
          ) : (
            <span className="rounded-[5px] border border-line-strong px-[6px] py-px text-[11px] font-semibold leading-[18px] text-ink-2">
              {MRD_CATEGORY_LABEL.heme}
            </span>
          )}
        </div>
        <p className="mt-1 text-[13.5px] text-ink-3">
          {product.companyId ? (
            <Link href={`/companies/${product.companyId}`} className="font-semibold text-ink-2 transition hover:text-accent-ink">
              {product.company}
            </Link>
          ) : (
            <span className="font-semibold text-ink-2">{product.company}</span>
          )}
          <span className="ml-2">
            {product.companyEn !== product.company ? `${product.companyEn} · ` : ""}
            {product.country}
          </span>
        </p>
        <p className="mt-3 text-[15px] font-semibold text-ink">{assayLine(product)}</p>
        {product.targets && <p className="text-[13px] leading-[1.6] text-ink-3">{product.targets}</p>}
      </header>

      <div className="mt-5 grid items-start gap-x-8 gap-y-5 lg:grid-cols-[minmax(0,320px)_minmax(0,1fr)]">
        <div className="grid gap-4">
          <dl className="grid content-start gap-3">
            {product.tissueDetail && <Detail term="组织测序">{product.tissueDetail}</Detail>}
            {product.trackingDetail && <Detail term="血浆追踪">{product.trackingDetail}</Detail>}
            {product.analytes.length > 0 && <Detail term="分析物">{product.analytes.join(" · ")}</Detail>}
            {product.sample && <Detail term="样本">{product.sample}</Detail>}
            {product.turnaround && <Detail term="周期">{product.turnaround}</Detail>}
            {product.launch && <Detail term="上市">{product.launch}</Detail>}
          </dl>
          {product.note && <p className="text-[12.5px] leading-[1.65] text-warn">{product.note}</p>}
          <SourceLinks links={product.links} />
        </div>

        <div className="grid content-start gap-4">
          <Block title="检出限">
            {product.lod.length === 0 ? (
              <p className="text-[13.5px] text-ink-3">未公开</p>
            ) : (
              <ul className="grid gap-4">
                {product.lod.map((entry) => (
                  <li key={entry.label + entry.basis} className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-[10px]">
                    <EvidenceDot evidence={entry.evidence} className="translate-y-[-3px]" />
                    <div className="min-w-0">
                      <p
                        className={cn(
                          "text-[20px] leading-[1.3] tabular-nums",
                          entry.evidence === "vendor" ? "font-semibold text-ink-2" : "font-bold text-ink"
                        )}
                      >
                        {entry.label}
                      </p>
                      <p className="mt-[2px] text-[13.5px] leading-[1.6] text-ink">{lodBasis(entry)}</p>
                      <div className="mt-[6px]">
                        <SourceLinks links={entry.links} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          <Block title="临床性能">
            {product.clinical.length === 0 ? (
              <p className="text-[13.5px] text-ink-3">未公开</p>
            ) : (
              <ul className="grid gap-5">
                {product.clinical.map((entry) => (
                  <li key={entry.study + entry.cancer} className="grid grid-cols-[auto_minmax(0,1fr)] items-baseline gap-x-[10px]">
                    <EvidenceDot evidence={entry.evidence} className="translate-y-[-1px]" />
                    <div className="min-w-0">
                      <p className="text-[14.5px] font-semibold leading-[1.5] text-ink">{entry.study}</p>
                      <p className="text-[12.5px] leading-[1.6] text-ink-3">{clinicalContext(entry)}</p>
                      <dl className="mt-2 flex flex-wrap gap-x-6 gap-y-2">
                        {clinicalReadings(entry).map((reading) => (
                          <div key={reading.label}>
                            <dt className="text-[12px] leading-[1.4] text-ink-3">{reading.label}</dt>
                            <dd
                              className={cn(
                                "text-[16px] leading-[1.4] tabular-nums",
                                entry.evidence === "vendor" ? "font-semibold text-ink-2" : "font-bold text-ink"
                              )}
                            >
                              {reading.value}
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {entry.note && <p className="mt-2 text-[12.5px] leading-[1.6] text-warn">{entry.note}</p>}
                      <div className="mt-[8px]">
                        <SourceLinks links={entry.links} />
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Block>

          {product.statuses.length > 0 && (
            <Block title="报证 · 支付">
              <ul className="grid gap-[10px]">
                {product.statuses.map((status) => (
                  <li key={status.label} className="flex flex-wrap items-center gap-x-3 gap-y-[6px]">
                    <span className="text-[13.5px] leading-[1.6] text-ink">{status.label}</span>
                    {status.date && <time className="text-[12.5px] tabular-nums text-ink-3">{status.date}</time>}
                    <SourceLinks links={status.links} />
                  </li>
                ))}
              </ul>
            </Block>
          )}

          <Block title="市价">
            {product.prices.length === 0 ? (
              <p className="text-[13.5px] text-ink-3">未公开</p>
            ) : (
              <ul className="grid gap-[10px]">
                {product.prices.map((entry) => (
                  <li key={entry.basis + entry.covers + entry.amount} className="flex flex-wrap items-center gap-x-3 gap-y-[6px]">
                    <span className="text-[18px] font-bold tabular-nums text-ink">{formatPrice(entry.amount, entry.currency)}</span>
                    <span className="text-[13px] leading-[1.6] text-ink-2">
                      {[entry.covers, entry.basis, entry.asOf].filter(Boolean).join(" · ")}
                    </span>
                    <SourceLinks links={entry.links} />
                  </li>
                ))}
              </ul>
            )}
          </Block>
        </div>
      </div>
    </div>
  );
}
