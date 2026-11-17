import type { Metadata } from "next";
import { Suspense } from "react";
import { ProductBoard, type BoardCompany } from "@/components/board/ProductBoard";
import { PageHeader } from "@/components/ui";
import { COMPANIES, allCancers, boardStats, studiesOf } from "@/data";
import { headlineStudy, toHeadline } from "@/lib/headline";

export const metadata: Metadata = { title: "产品看板" };

export default function LeaderboardPage() {
  const stats = boardStats();
  const companies: BoardCompany[] = COMPANIES.map((company) => {
    const studies = studiesOf(company.id);
    const lead = headlineStudy(company, studies);
    return { ...company, headline: lead ? toHeadline(lead) : null, studyNames: studies.map((study) => study.name) };
  });

  const tiles = [
    { value: stats.companies, label: "企业" },
    { value: stats.mced, label: "MCED 产品" },
    { value: stats.studies, label: "研究" },
    { value: stats.prospective, label: "前瞻 / RCT" },
    { value: stats.nmpaApproved, label: "NMPA III 类证" },
    { value: stats.fdaApproved, label: "FDA 获批" },
  ];

  return (
    <div>
      <PageHeader title="产品看板"><a download className="text-[12px] font-semibold text-accent-ink hover:underline" href="/api/v1/export/products">导出 CSV</a></PageHeader>
      <dl className="mb-4 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-panel sm:grid-cols-6">
        {tiles.map((tile) => (
          <div key={tile.label} className="px-3 py-3 text-center max-sm:[&:nth-child(n+4)]:border-t max-sm:[&:nth-child(n+4)]:border-line">
            <dd className="text-[22px] font-bold leading-none tabular-nums text-ink">{tile.value}</dd>
            <dt className="mt-[6px] text-[11.5px] text-ink-3">{tile.label}</dt>
          </div>
        ))}
      </dl>
      <Suspense>
        <ProductBoard companies={companies} cancers={allCancers()} />
      </Suspense>
    </div>
  );
}
