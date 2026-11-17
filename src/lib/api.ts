import {
  COMPANIES,
  MRD_PRICE_RANGES,
  MRD_INSTITUTION_PRICES,
  MRD_PRODUCTS,
  STUDIES,
  getCompany,
  resolveSources,
  sourceHref,
  studiesOf,
  type Company,
  type MrdProduct,
  type RegStage,
  type RegStatus,
  type Source,
  type Study,
} from "@/data";
import { filterMrdProducts } from "./mrd-filter.mjs";
import { isExternal } from "@/data/meta";
import type { IntelEvent } from "./event-model";
import { SITE_URL } from "./url";

/**
 * REST v1 / MCP 的序列化层。
 *
 * v1 的字段名(co / en / pop / perf / status[].tone / evidence …)是对外契约，原样保留；
 * 新字段在旁边追加。`evidence` 过去会泄露本地文件路径，现在只输出公开地址。
 */

type Tone = "emerald" | "cyan" | "amber" | "violet" | "neutral" | "muted";

const STAGE_TONE: Record<RegStage, Tone> = {
  "nmpa-approved": "emerald",
  "nmpa-innovative": "emerald",
  "fda-approved": "cyan",
  "fda-review": "cyan",
  hsa: "cyan",
  "fda-breakthrough": "amber",
  ce: "violet",
  ldt: "muted",
  rnd: "muted",
};

function absolute(href: string): string {
  return isExternal(href) ? href : `${SITE_URL}${href}`;
}

export function apiSource(source: Source) {
  return {
    id: source.id,
    kind: source.kind,
    label: source.label,
    title: source.title,
    url: absolute(sourceHref(source)),
    ...(source.doi ? { doi: source.doi } : {}),
    ...(source.pmid ? { pmid: source.pmid } : {}),
    ...(source.date ? { date: source.date } : {}),
  };
}

function apiStatus(status: RegStatus) {
  return {
    label: status.label,
    tone: STAGE_TONE[status.stage],
    scope: status.scope,
    stage: status.stage,
    date: status.date,
    sources: resolveSources(status.sources).map(apiSource),
  };
}

export function apiStudy(study: Study) {
  const sources = resolveSources(study.sources);
  return {
    id: study.id,
    type: study.design,
    name: study.name,
    pop: study.population,
    perf: study.performance,
    updatedAt: study.dateNote,
    /** 分号分隔的公开信源地址(v1 兼容字段) */
    evidence: sources.map((source) => absolute(sourceHref(source))).join(";"),
    date: study.date,
    metrics: study.metrics,
    ...(study.note ? { note: study.note } : {}),
    url: `${SITE_URL}/studies/${study.id}`,
    sources: sources.map(apiSource),
  };
}

export function apiCompanySummary(company: Company) {
  return {
    id: company.id,
    co: company.name,
    en: company.region === "国外" ? company.country : company.nameEn,
    region: company.region,
    country: company.country,
    self: company.self,
    routes: company.routes,
    layout: company.layout,
    product: company.product,
    cancerLabel: company.cancerLabel,
    mced: company.mced,
    status: company.statuses.map(apiStatus),
    statusKeys: company.statusKeys,
    updatedAt: company.updatedAt,
    url: `${SITE_URL}/companies/${company.id}`,
  };
}

export function apiCompany(company: Company) {
  const stages = company.statuses.map((status) => status.stage);
  return {
    ...apiCompanySummary(company),
    cancers: company.cancers,
    hasFDA: stages.some((stage) => stage.startsWith("fda-")),
    hasNMPA3: stages.includes("nmpa-approved"),
    src: company.citation,
    panel: company.panel,
    studies: studiesOf(company.id).map(apiStudy),
  };
}

export function apiCompanies() {
  return COMPANIES.map(apiCompanySummary);
}

export function apiProspective() {
  return STUDIES.filter((study) => study.compare)
    .sort((a, b) => (a.compare?.order ?? 0) - (b.compare?.order ?? 0))
    .map((study) => {
      const { order, ...row } = study.compare!;
      void order;
      return {
        ...row,
        ...(getCompany(study.companyId)?.self ? { self: true } : {}),
        evidenceRef: { companyId: study.companyId, studyIndex: study.legacyIndex },
        studyId: study.id,
        url: `${SITE_URL}/studies/${study.id}`,
        sources: resolveSources(study.sources).map(apiSource),
      };
    });
}

function withApiSources<T extends { sources: string[] }>({ sources, ...rest }: T) {
  return { ...rest, sources: resolveSources(sources).map(apiSource) };
}

export interface MrdFilter {
  category?: string;
  approach?: string;
  tissue?: string;
  region?: string;
  tracking?: string;
  q?: string;
}

/** MRD 产品矩阵的一行。检出限与价格按原文口径输出，不做单位或币种换算。 */
export function apiMrdProduct(product: MrdProduct) {
  return {
    id: product.id,
    company_id: product.companyId,
    company: product.company,
    company_en: product.companyEn,
    country: product.country,
    region: product.region,
    self: product.self,
    product: product.product,
    category: product.category,
    approach: product.approach,
    tissue_assay: product.tissue,
    tissue_detail: product.tissueDetail,
    tracking: product.tracking,
    tracking_detail: product.trackingDetail,
    analytes: product.analytes,
    targets: product.targets,
    analytical: (product.analytical || []).map(withApiSources),
    availability: product.availability,
    record_kind: product.recordKind,
    lod: product.lod.map(withApiSources),
    clinical: product.clinical.map(withApiSources),
    statuses: product.statuses.map(withApiSources),
    prices: product.prices.map(withApiSources),
    sample: product.sample,
    turnaround: product.turnaround,
    launch: product.launch,
    ...(product.note ? { note: product.note } : {}),
    updatedAt: product.updatedAt,
    url: `${SITE_URL}/mrd/${product.id}`,
    sources: resolveSources(product.sources).map(apiSource),
  };
}

export function apiMrdProducts(filter: MrdFilter = {}) {
  return filterMrdProducts(MRD_PRODUCTS, filter).map(apiMrdProduct);
}

/** 没有产品级公开标价的市场，媒体报道的行业报价区间。 */
export function apiMrdPriceRanges() {
  return MRD_PRICE_RANGES.map(withApiSources);
}

export function apiEvent(event: IntelEvent) {
  return {
    id: event.id,
    origin: event.origin,
    date: event.date,
    kind: event.kind,
    company_id: event.companyId,
    company: event.company,
    product: event.product,
    title: event.title,
    summary: event.summary,
    reason: event.why,
    level: event.level,
    score: event.score,
    evidence_confidence: event.confidence,
    publication_state: event.state,
    sources_count: event.sourceCount,
    url: `${SITE_URL}/items/${encodeURIComponent(event.id)}`,
    ...(event.studyId ? { study_url: `${SITE_URL}/studies/${event.studyId}` } : {}),
    sources: event.links.map((link) => ({ label: link.label, kind: link.kind, url: absolute(link.href) })),
  };
}

export function apiMrdInstitutionPrices() { return MRD_INSTITUTION_PRICES.map(withApiSources); }
