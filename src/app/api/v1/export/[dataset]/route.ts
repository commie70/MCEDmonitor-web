import { NextResponse } from "next/server";
import { COMPANIES, STUDIES, resolveSources, sourceHref } from "@/data";
import { apiMrdProducts, apiProspective } from "@/lib/api";
import { toCsv } from "@/lib/csv.mjs";

function sourceUrls(ids: string[]) { return resolveSources(ids).map(sourceHref).join("; "); }
export async function GET(request: Request, { params }: { params: Promise<{ dataset: string }> }) {
  const { dataset } = await params;
  const query = Object.fromEntries(new URL(request.url).searchParams);
  let rows: unknown[][];
  if (dataset === "mrd") rows = [["企业", "产品/版本", "国家", "类别", "策略", "组织发现", "随访检测", "靶标", "LoD及条件", "分析性能", "临床研究及口径", "价格及类型", "来源"], ...apiMrdProducts(query).map((p) => [p.company, p.product, p.country, p.category, p.approach, p.tissue_assay, p.tracking, p.targets, JSON.stringify(p.lod), JSON.stringify(p.analytical), JSON.stringify(p.clinical), JSON.stringify(p.prices), p.sources.map((s) => s.url).join("; ")])];
  else if (dataset === "products") rows = [["企业", "产品", "国家", "地区", "技术", "癌种", "审批及适用范围", "日期"], ...COMPANIES.filter((c) => !query.q || `${c.name} ${c.product}`.toLowerCase().includes(query.q.toLowerCase())).map((c) => [c.name, c.product, c.country, c.region, c.routes.join(" / "), c.cancerLabel, c.statuses.map((s) => `${s.label}: ${s.scope} ${sourceUrls(s.sources)}`).join("; "), c.updatedAt])];
  else if (dataset === "studies") rows = [["研究", "企业", "设计", "人群", "性能", "说明", "日期", "来源"], ...STUDIES.map((s) => [s.name, s.companyId, s.design, s.population, s.performance, s.note, s.date, sourceUrls(s.sources)])];
  else if (dataset === "regulatory") rows = [["企业", "产品", "审批", "适用范围", "日期", "来源"], ...COMPANIES.flatMap((c) => c.statuses.map((s) => [c.name, c.product, s.label, s.scope, s.date, sourceUrls(s.sources)]))];
  else if (dataset === "performance") { const records = apiProspective(); rows = [["企业", "研究", "人群", "完整口径", "来源"], ...records.map((p) => [p.co, p.study, p.pop, JSON.stringify(p), p.sources.map((s) => s.url).join("; ")])]; }
  else return NextResponse.json({ error: "not_found" }, { status: 404 });
  return new Response(toCsv(rows), { headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="mced-${dataset}.csv"`, "Cache-Control": "no-store" } });
}
