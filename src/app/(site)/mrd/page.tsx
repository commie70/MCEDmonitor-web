import type { Metadata } from "next";
import { Suspense } from "react";
import { MrdMatrix } from "@/components/board/MrdMatrix";
import { PageHeader, Panel, SectionTitle, SourceLinks } from "@/components/ui";
import { MRD_PRICE_RANGES, MRD_PRODUCTS } from "@/data";
import { sourceLinks as links, toMatrixProduct } from "@/lib/mrd-view";

export const metadata: Metadata = { title: "MRD 性能矩阵" };

export default function MrdPage() {
  const products = MRD_PRODUCTS.map(toMatrixProduct);

  const solid = MRD_PRODUCTS.filter((product) => product.category === "solid");
  const tiles = [
    { value: MRD_PRODUCTS.length, label: "产品" },
    { value: solid.filter((product) => product.approach === "tumor-informed").length, label: "Tumor-informed" },
    { value: solid.filter((product) => product.approach === "tumor-naive").length, label: "Tumor-naive" },
    { value: MRD_PRODUCTS.filter((product) => product.region === "国内").length, label: "国内" },
    { value: MRD_PRODUCTS.filter((product) => product.lod.length > 0).length, label: "公开检出限" },
    { value: MRD_PRODUCTS.filter((product) => product.prices.length > 0).length, label: "公开价格" },
  ];

  return (
    <div>
      <PageHeader title="MRD 性能矩阵" />
      <dl className="mb-4 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-panel sm:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="px-3 py-3 text-center max-sm:[&:nth-child(n+4)]:border-t max-sm:[&:nth-child(n+4)]:border-line">
            <dd className="text-[22px] font-bold leading-none tabular-nums text-ink">{tile.value}</dd>
            <dt className="mt-[6px] text-[11.5px] text-ink-3">{tile.label}</dt>
          </div>
        ))}
      </dl>
      <Suspense>
        <MrdMatrix products={products} />
      </Suspense>
      {MRD_PRICE_RANGES.length > 0 && (
        <section className="mt-6">
          <SectionTitle>国内行业报价 · 媒体报道</SectionTitle>
          <Panel>
            <ul className="divide-y divide-line">
              {MRD_PRICE_RANGES.map((range) => (
                <li key={range.covers} className="flex flex-wrap items-center gap-x-4 gap-y-[6px] px-4 py-[10px]">
                  <span className="text-[14px] font-bold tabular-nums text-ink">{range.range}</span>
                  <span className="text-[12.5px] text-ink-2">
                    {range.covers} · {range.asOf}
                  </span>
                  <SourceLinks links={links(range.sources)} />
                </li>
              ))}
            </ul>
          </Panel>
        </section>
      )}
    </div>
  );
}
