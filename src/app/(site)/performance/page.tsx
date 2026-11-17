import type { Metadata } from "next";
import { Suspense } from "react";
import { PerformanceView, type PerfRow } from "@/components/board/PerformanceView";
import type { GapRow } from "@/components/charts/EvidenceGap";
import { PageHeader } from "@/components/ui";
import { STUDIES, getCompany, getStudy, isProspective, type Study } from "@/data";
import { pctText as pct, shortStudyName as shortName } from "@/lib/headline";

export const metadata: Metadata = { title: "性能对照" };

/** 同一产品(或其前身)的病例对照 → 前瞻研究链，按时间先后。 */
const LINEAGES: { product: string; mced: boolean; ids: string[] }[] = [
  { product: "CanScan® 鹰眼", mced: true, ids: ["geneseeq-deciphe-omnia", "geneseeq-jinling"] },
  {
    product: "Galleri®",
    mced: true,
    ids: ["grail-ccga3", "grail-pathfinder", "grail-pathfinder2", "grail-nhs-galleri-performance"],
  },
  { product: "CancerSEEK", mced: true, ids: ["exact-cancerseek", "exact-detect-a"] },
  { product: "SPOT-MAS™", mced: true, ids: ["genesolutions-spotmas-validation", "genesolutions-kdetek"] },
  { product: "Shield™ · CRC", mced: false, ids: ["guardant-shield-asco2022", "guardant-eclipse"] },
];

function toRow(study: Study): PerfRow | null {
  const company = getCompany(study.companyId);
  if (!company) return null;
  const { metrics, compare } = study;
  const early =
    typeof metrics.early === "number"
      ? { value: metrics.early, text: `${metrics.early}%`, sub: metrics.earlyLabel }
      : typeof metrics.precancer === "number"
        ? { value: metrics.precancer, text: `${metrics.precancer}%`, sub: "进展期癌前病变" }
        : { value: undefined, text: "—", sub: undefined };
  const labelled =
    company.self || (isProspective(study.design) && study.scope === "mced" && !study.symptomatic);
  return {
    id: study.id,
    companyId: company.id,
    company: company.name,
    product: compare?.prod ?? company.product,
    self: company.self,
    design: study.design,
    scope: study.scope,
    name: study.name,
    population: compare?.pop ?? study.population,
    n: metrics.n,
    spec: metrics.spec,
    specText: pct(metrics.spec, metrics.specLabel),
    specSub: compare?.specSub,
    sens: metrics.sens,
    sensText: pct(metrics.sens),
    sensSub: compare?.sensSub,
    early: early.value,
    earlyText: early.text,
    earlySub: [early.sub, compare?.earlySub].filter(Boolean).join("；") || undefined,
    too: metrics.too,
    tooText: pct(metrics.too),
    tooSub: [metrics.tooLabel, compare?.tooSub].filter(Boolean).join("；") || undefined,
    diagnostic: Boolean(study.diagnostic),
    symptomatic: Boolean(study.symptomatic),
    scatterLabel: labelled ? shortName(study) : undefined,
  };
}

export default function PerformancePage() {
  const rows = STUDIES.map(toRow).filter((row): row is PerfRow => Boolean(row));

  const gaps: GapRow[] = LINEAGES.flatMap((lineage) => {
    const studies = lineage.ids.map(getStudy).filter((study): study is Study => Boolean(study));
    const company = studies[0] ? getCompany(studies[0].companyId) : undefined;
    const points = studies
      .filter((study) => typeof study.metrics.sens === "number")
      .map((study) => ({
        id: study.id,
        name: shortName(study),
        prospective: isProspective(study.design),
        sens: study.metrics.sens as number,
      }));
    if (!company || points.length < 2) return [];
    return [{ product: lineage.product, company: company.name, self: company.self, mced: lineage.mced, points }];
  });

  return (
    <div>
      <PageHeader title="性能对照" />
      <Suspense>
        <PerformanceView rows={rows} gaps={gaps} />
      </Suspense>
    </div>
  );
}
