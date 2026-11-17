import Link from "next/link";
import { SourceLinks } from "@/components/ui";
import { MRD_APPROACH_LABEL, mrdPriceLabel } from "@/data/meta";
import { clinicalContext, clinicalReadings, lodBasis, type MatrixProduct } from "./mrd-parts";

export function MrdViews({ products, view }: { products: MatrixProduct[]; view: string }) {
  return <div className="overflow-x-auto rounded-xl border border-line bg-panel"><table className="w-full min-w-[820px] text-left text-[13px]"><thead className="bg-sunken text-ink-3"><tr><th className="p-3">企业 / 产品</th><th className="p-3">{view === "technology" ? "组织发现 → 随访检测" : view === "analytical" ? "检出限 / 分析性能" : view === "clinical" ? "人群 / 临床性能" : "价格 / 计费口径"}</th></tr></thead><tbody>{products.map((p) => <tr className="border-t border-line align-top" key={p.id}><th className="w-[230px] p-3 font-normal"><Link className="font-semibold text-accent-ink" href={`/mrd/${p.id}`}>{p.product}</Link><p>{p.company} · {p.country}</p><p className="text-ink-3">{p.availability}</p></th><td className="p-3">
    {view === "technology" && <><p>{MRD_APPROACH_LABEL[p.approach]} · {p.tissue || "无需组织"} → {p.tracking}</p><p>{p.tissueDetail}</p><p>{p.trackingDetail}</p><p>{p.targets}</p><p>{p.sample} · {p.turnaround}</p><SourceLinks links={p.links} /></>}
    {view === "analytical" && <div className="grid gap-4">{p.lod.map((l, i) => <div key={i}><strong>{l.label}</strong><p>{lodBasis(l)}</p><SourceLinks links={l.links} /></div>)}{p.analytical.map((m, i) => <div key={i}><strong>{m.label} · {m.value}</strong><p>{m.context}</p><SourceLinks links={m.links} /></div>)}{!p.lod.length && !p.analytical.length && "未公开"}</div>}
    {view === "clinical" && <div className="grid gap-4">{p.clinical.map((c, i) => <div key={i}><strong>{c.study}</strong><p>{clinicalContext(c)}</p><p>{clinicalReadings(c).map((m) => `${m.label} ${m.value}`).join(" · ")}</p><p className="text-ink-3">{c.note}</p><SourceLinks links={c.links} /></div>)}{!p.clinical.length && "未公开"}</div>}
    {view === "prices" && <div className="grid gap-4">{p.prices.map((price, i) => <div key={i}><strong>{mrdPriceLabel(price)} · {price.currency}</strong><p>{price.basis} · {price.covers}</p><p>{[price.market, price.dateNote || price.asOf, price.status === "historical" && "历史价格"].filter(Boolean).join(" · ")}</p><SourceLinks links={price.links} /></div>)}{!p.prices.length && "未公开"}</div>}
  </td></tr>)}</tbody></table></div>;
}
