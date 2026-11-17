import companiesJson from "./companies.json";
import milestonesJson from "./milestones.json";
import mrdInstitutionPricesJson from "./mrd-institution-prices.json";
import mrdJson from "./mrd.json";
import mrdPriceRangesJson from "./mrd-price-ranges.json";
import pathfinderJson from "./pathfinder.json";
import sourcesJson from "./sources.json";
import studiesJson from "./studies.json";
import { CANCER_ORDER, isProspective } from "./meta";
import type { MrdInstitutionPrice, Company, Milestone, MrdPriceRange, MrdProduct, PathfinderTable, RegStage, Source, Study } from "./types";

export type * from "./types";
export * from "./meta";

/**
 * 证据库读入口(服务端)。客户端组件请改用 ./meta 与 ./types，数据经 props 传入。
 */

export const COMPANIES = companiesJson as Company[];
export const STUDIES = studiesJson as Study[];
export const SOURCES = sourcesJson as Source[];
export const MILESTONES = milestonesJson as Milestone[];
export const PATHFINDER = pathfinderJson as PathfinderTable;
export const MRD_INSTITUTION_PRICES = mrdInstitutionPricesJson as MrdInstitutionPrice[];
export const MRD_PRODUCTS = mrdJson as MrdProduct[];
export const MRD_PRICE_RANGES = mrdPriceRangesJson as MrdPriceRange[];

const companyById = new Map(COMPANIES.map((company) => [company.id, company]));
const studyById = new Map(STUDIES.map((study) => [study.id, study]));
const sourceById = new Map(SOURCES.map((source) => [source.id, source]));

export const SELF = COMPANIES.find((company) => company.self) ?? COMPANIES[0];

export function getCompany(id: string): Company | undefined {
  return companyById.get(id);
}

export function getStudy(id: string): Study | undefined {
  return studyById.get(id);
}

export function getSource(id: string): Source | undefined {
  return sourceById.get(id);
}

export function studiesOf(companyId: string): Study[] {
  return STUDIES.filter((study) => study.companyId === companyId);
}

export function studyByLegacyIndex(companyId: string, index: number): Study | undefined {
  return STUDIES.find((study) => study.companyId === companyId && study.legacyIndex === index);
}

export function resolveSources(ids: string[]): Source[] {
  return ids.map((id) => sourceById.get(id)).filter((source): source is Source => Boolean(source));
}

/** 公开地址优先；没有公开地址的资料走站内重建页。 */
export function sourceHref(source: Source): string {
  return source.url ?? `/sources/${source.id}`;
}

export function allCancers(): string[] {
  const present = new Set(COMPANIES.flatMap((company) => company.cancers));
  const ordered = CANCER_ORDER.filter((cancer) => present.has(cancer));
  const rest = [...present].filter((cancer) => !CANCER_ORDER.includes(cancer) && cancer !== "多癌种");
  return [...ordered, ...rest];
}

/** 一个 MRD 产品引用的全部信源 id(技术选型、检出限、临床研究、报证、价格)。 */
export function mrdSourceIds(product: MrdProduct): string[] {
  return [
    ...new Set([
      ...product.sources,
      ...(product.analytical || []).flatMap((entry) => entry.sources),
      ...product.lod.flatMap((entry) => entry.sources),
      ...product.clinical.flatMap((entry) => entry.sources),
      ...product.statuses.flatMap((entry) => entry.sources),
      ...product.prices.flatMap((entry) => entry.sources),
    ]),
  ];
}

/** 引用某条信源的研究、报证节点、里程碑事件与 MRD 产品，用于信源库反查。 */
export function citationsOf(sourceId: string): {
  studies: Study[];
  companies: Company[];
  milestones: Milestone[];
  mrd: MrdProduct[];
} {
  return {
    studies: STUDIES.filter((study) => study.sources.includes(sourceId)),
    companies: COMPANIES.filter((company) => company.statuses.some((status) => status.sources.includes(sourceId))),
    milestones: MILESTONES.filter((milestone) => milestone.sources.includes(sourceId)),
    mrd: MRD_PRODUCTS.filter((product) => mrdSourceIds(product).includes(sourceId)),
  };
}

export function boardStats() {
  const stages = COMPANIES.flatMap((company) => company.statuses.map((status) => status.stage));
  const count = (stage: RegStage) => stages.filter((value) => value === stage).length;
  return {
    companies: COMPANIES.length,
    mced: COMPANIES.filter((company) => company.mced).length,
    studies: STUDIES.length,
    prospective: STUDIES.filter((study) => isProspective(study.design)).length,
    nmpaApproved: count("nmpa-approved"),
    fdaApproved: count("fda-approved"),
    fdaReview: count("fda-review"),
    breakthrough: count("fda-breakthrough") + count("nmpa-innovative"),
    sources: SOURCES.length,
  };
}
