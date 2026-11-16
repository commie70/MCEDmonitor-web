import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader, RouteTag } from "@/components/ui";
import { COMPANIES, HIGH_MORTALITY, allCancers, type Company } from "@/data";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "癌种覆盖" };

function Group({ label, companies, cancers }: { label: string; companies: Company[]; cancers: string[] }) {
  return (
    <tbody>
      <tr className="border-b border-line bg-bg">
        <th scope="colgroup" colSpan={cancers.length + 2} className="px-4 py-[6px] text-left text-[12px] font-bold text-ink-2">
          {label}
          <span className="ml-2 font-normal tabular-nums text-ink-3">{companies.length}</span>
        </th>
      </tr>
      {companies.map((company) => (
        <tr key={company.id} className={cn("border-b border-line last:border-b-0", company.self && "bg-self-soft/40")}>
          <th scope="row" className={cn("px-4 py-[9px] text-left align-middle font-normal", company.self && "bg-self-soft")}>
            <Link
              href={`/companies/${company.id}`}
              className={cn("text-[13.5px] font-bold transition hover:text-accent-ink", company.self ? "text-self" : "text-ink")}
            >
              {company.name}
            </Link>
            <div className="max-w-[190px] truncate text-[11.5px] text-ink-3">{company.product}</div>
          </th>
          {cancers.map((cancer) => {
            const covered = company.cancers.includes(cancer);
            return (
              <td key={cancer} className="px-0 py-0 text-center align-middle">
                {covered ? (
                  <svg viewBox="0 0 16 16" className="mx-auto size-4" role="img" aria-label={`${company.name} 覆盖 ${cancer}`}>
                    <circle cx="8" cy="8" r="5.5" className={company.self ? "fill-mark-self" : "fill-mark"} />
                  </svg>
                ) : (
                  <span aria-hidden className="text-line-strong">
                    ·
                  </span>
                )}
              </td>
            );
          })}
          <td className="px-3 text-right align-middle tabular-nums text-ink-2">
            {company.cancers.filter((cancer) => cancers.includes(cancer)).length || "—"}
          </td>
        </tr>
      ))}
    </tbody>
  );
}

export default function CoveragePage() {
  const cancers = allCancers();
  const mced = COMPANIES.filter((company) => company.mced);
  const single = COMPANIES.filter((company) => !company.mced);
  const routes = [...new Set(COMPANIES.flatMap((company) => company.routes))];

  return (
    <div>
      <PageHeader title="癌种覆盖" />
      <div className="overflow-x-auto rounded-xl border border-line bg-panel shadow-panel">
        <table className="sticky-first w-full min-w-[900px] border-collapse text-[12.5px]">
          <thead>
            <tr className="border-b border-line bg-sunken/60">
              <th scope="col" className="w-[200px] px-4 py-2 text-left text-[11.5px] font-semibold text-ink-3">
                企业 · 产品
              </th>
              {cancers.map((cancer) => (
                <th
                  key={cancer}
                  scope="col"
                  className={cn(
                    "h-[86px] w-[38px] px-0 pb-2 align-bottom text-[12px]",
                    HIGH_MORTALITY.has(cancer) ? "font-bold text-ink" : "font-normal text-ink-3"
                  )}
                >
                  <span className="mx-auto block [writing-mode:vertical-rl]">{cancer}</span>
                </th>
              ))}
              <th scope="col" className="w-[52px] px-3 py-2 text-right text-[11.5px] font-semibold text-ink-3">
                计
              </th>
            </tr>
          </thead>
          <Group label="多癌种 MCED" companies={mced} cancers={cancers} />
          <Group label="单癌种" companies={single} cancers={cancers} />
          <tfoot>
            <tr className="border-t border-line bg-sunken/60 text-ink-2">
              <th scope="row" className="bg-sunken px-4 py-2 text-left text-[11.5px] font-semibold text-ink-3">
                产品数
              </th>
              {cancers.map((cancer) => (
                <td key={cancer} className="py-2 text-center tabular-nums">
                  {COMPANIES.filter((company) => company.cancers.includes(cancer)).length}
                </td>
              ))}
              <td />
            </tr>
          </tfoot>
        </table>
      </div>

      <section className="mt-8">
        <h2 className="mb-2 text-[13px] font-bold text-ink">技术路线 × 企业</h2>
        <div className="overflow-x-auto rounded-xl border border-line bg-panel shadow-panel">
          <table className="sticky-first w-full min-w-[760px] border-collapse text-[12.5px]">
            <thead>
              <tr className="border-b border-line bg-sunken/60">
                <th scope="col" className="w-[200px] px-4 py-2 text-left text-[11.5px] font-semibold text-ink-3">
                  企业
                </th>
                {routes.map((route) => (
                  <th key={route} scope="col" className="px-2 py-2 text-center font-normal">
                    <RouteTag route={route} />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {COMPANIES.map((company) => (
                <tr key={company.id} className={cn("border-b border-line last:border-b-0", company.self && "bg-self-soft/40")}>
                  <th scope="row" className={cn("px-4 py-[7px] text-left font-normal", company.self && "bg-self-soft")}>
                    <Link
                      href={`/companies/${company.id}`}
                      className={cn("font-bold transition hover:text-accent-ink", company.self ? "text-self" : "text-ink")}
                    >
                      {company.name}
                    </Link>
                  </th>
                  {routes.map((route) => (
                    <td key={route} data-route={route} className="text-center">
                      {company.routes.includes(route) ? (
                        <svg viewBox="0 0 16 16" className="mx-auto size-4" role="img" aria-label={`${company.name} 采用 ${route}`}>
                          <rect x="3" y="3" width="10" height="10" rx="2.5" className="fill-(--route)" />
                        </svg>
                      ) : (
                        <span aria-hidden className="text-line-strong">
                          ·
                        </span>
                      )}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
