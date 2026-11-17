import { readSystemStatus } from "@/lib/system-status";
import type { Metadata } from "next";
import { Suspense } from "react";
import { SourceIndex, type SourceRow } from "@/components/sources/SourceIndex";
import { PageHeader } from "@/components/ui";
import { SOURCES, citationsOf } from "@/data";
import { compareDateDesc } from "@/lib/dates";

export const metadata: Metadata = { title: "信源库" };

export default async function SourcesPage() {
  const status = await readSystemStatus();
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
        cites: cited.studies.length + cited.companies.length + cited.milestones.length + cited.mrd.length,
      };
    });

  return (
    <div className="max-w-[900px]">
      <PageHeader title="信源库" count={rows.length}><a download className="text-[12px] font-semibold text-accent-ink hover:underline" href="/api/v1/export/studies">导出研究 CSV</a></PageHeader>
      {status && <details className="mb-4 rounded-xl border border-line bg-panel p-4"><summary className="cursor-pointer text-[13px] font-semibold">采集运行 · {status.failedSources} 个失败信源 · {status.coverageGaps} 个覆盖缺口</summary><p className="my-3 text-[12px] text-ink-3">最近运行 {status.lastRun || "未记录"} · 待复核事件 {status.pendingCount} · 待处理候选 {status.pendingCandidates} · 发布门禁 {status.release.gate_open ? "通过" : "未通过"}</p><div className="overflow-x-auto"><table className="w-full min-w-[650px] text-left text-[12px]"><thead><tr><th>信源</th><th>最近检查</th><th>最近成功</th><th>连续失败</th></tr></thead><tbody>{status.sources.map((source) => <tr key={source.id} className="border-t border-line"><td className="py-2">{source.id}{!source.enabled && " · 已停用"}</td><td>{source.last_checked_at || "—"}</td><td>{source.last_success_at || "—"}</td><td>{source.consecutive_failures}</td></tr>)}</tbody></table></div></details>}
      <Suspense>
        <SourceIndex rows={rows} />
      </Suspense>
    </div>
  );
}
