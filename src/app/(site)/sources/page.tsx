import type { Metadata } from "next";
import { Suspense } from "react";
import { SourceIndex, type SourceRow } from "@/components/sources/SourceIndex";
import { PageHeader } from "@/components/ui";
import { SOURCES, citationsOf } from "@/data";
import { compareDateDesc } from "@/lib/dates";

export const metadata: Metadata = { title: "信源库" };

export default function SourcesPage() {
  const rows: SourceRow[] = [...SOURCES]
    .sort((a, b) => compareDateDesc(a.date, b.date))
    .map((source) => {
      const cited = citationsOf(source.id);
      return {
        id: source.id,
        kind: source.kind,
        title: source.title,
        meta: [source.authors, source.label, source.pmid ? `PMID ${source.pmid}` : null].filter(Boolean).join(" · "),
        url: source.url ?? null,
        cites: cited.studies.length + cited.companies.length + cited.milestones.length,
      };
    });

  return (
    <div className="max-w-[900px]">
      <PageHeader title="信源库" count={rows.length} />
      <Suspense>
        <SourceIndex rows={rows} />
      </Suspense>
    </div>
  );
}
