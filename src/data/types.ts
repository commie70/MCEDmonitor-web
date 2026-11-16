/**
 * 证据库数据契约。
 *
 * 数据本体是同目录下的 JSON(companies / studies / sources / milestones / pathfinder)，
 * 页面、REST、MCP 与 RSS 都只经由 ./index.ts 读取，不直接 import JSON。
 */

export type Region = "国外" | "国内";

export type RouteKey =
  | "甲基化"
  | "片段组学"
  | "多组学"
  | "突变"
  | "蛋白质"
  | "miRNA"
  | "RNA"
  | "FIT"
  | "FIT-DNA"
  | "AI";

/** 证据可信度由高到低；病例对照不可外推真实筛查。 */
export type StudyDesign =
  | "RCT"
  | "前瞻干预"
  | "前瞻注册"
  | "前瞻 + 回顾注册汇总"
  | "前瞻队列"
  | "病例对照";

export type RegStage =
  | "nmpa-approved"
  | "nmpa-innovative"
  | "fda-approved"
  | "fda-review"
  | "fda-breakthrough"
  | "ce"
  | "hsa"
  | "ldt"
  | "rnd";

export type SourceKind =
  | "journal"
  | "conference"
  | "regulator"
  | "registry"
  | "company"
  | "media"
  | "internal";

export interface SourceBlock {
  heading?: string;
  text?: string;
  table?: string[][];
}

/** 站内重建的资料页：仅在互联网上找不到对应公开资料时使用。 */
export interface SourceDocument {
  /** 资料出处的文字说明，如「世和基因医学部会议纪要」 */
  origin: string;
  locator?: string;
  blocks: SourceBlock[];
}

export interface Source {
  id: string;
  kind: SourceKind;
  /** 简短引文，如 "Ann Oncol 2021;32:1167-77" */
  label: string;
  title: string;
  authors?: string;
  /** 公开访问地址；重建资料页没有该字段，链接指向 /sources/{id} */
  url?: string;
  doi?: string;
  pmid?: string;
  date?: string;
  document?: SourceDocument;
}

export interface RegStatus {
  stage: RegStage;
  label: string;
  /** 获批适应症 / 适用范围 */
  scope: string;
  date: string | null;
  sources: string[];
}

export interface Company {
  id: string;
  name: string;
  nameEn: string;
  country: string;
  region: Region;
  /** 本司锚定(世和基因) */
  self: boolean;
  mced: boolean;
  product: string;
  layout: string;
  routes: RouteKey[];
  cancers: string[];
  cancerLabel: string;
  panel: string;
  statuses: RegStatus[];
  /** 旧版筛选键，REST v1 兼容字段 */
  statusKeys: string[];
  citation: string;
  updatedAt: string;
}

export interface StudyMetrics {
  n?: number;
  spec?: number;
  specLabel?: string;
  sens?: number;
  /** I 期 / 早期分层灵敏度 */
  early?: number;
  earlyLabel?: string;
  /** 进展期癌前病变灵敏度 */
  precancer?: number;
  too?: number;
  tooLabel?: string;
  ppv?: number;
  npv?: number;
}

/** 前瞻性能对照表的一行(原 PROSPECTIVE 数据集) */
export interface StudyCompare {
  order: number;
  co: string;
  prod: string;
  route: RouteKey[];
  type: Exclude<StudyDesign, "病例对照">;
  study: string;
  mced: boolean;
  canc: string;
  pop: string;
  spec: string;
  specSub?: string;
  sens: string;
  sensSub?: string;
  early: string;
  earlySub?: string;
  too: string;
  tooSub?: string;
  detail?: "pf1";
  updatedAt: string;
}

export interface Study {
  /** 稳定 ID，用于 /studies/{id} */
  id: string;
  companyId: string;
  /** 在该企业研究列表中的旧下标，支撑旧版证据页 URL */
  legacyIndex: number;
  design: StudyDesign;
  /** 多癌种(mced)或单癌种(single)研究 */
  scope: "mced" | "single";
  name: string;
  /** 发表或披露时间(YYYY / YYYY-MM)，用于排序 */
  date: string | null;
  dateNote: string;
  population: string;
  performance: string;
  metrics: StudyMetrics;
  /** 诊断 / 结节分类用途，不与无症状筛查同图比较 */
  diagnostic?: boolean;
  /** 有症状转诊人群 */
  symptomatic?: boolean;
  /** 口径说明：数值与公开原文存在出入或出处受限时必须写明 */
  note?: string;
  sources: string[];
  compare?: StudyCompare;
}

export type EventKind =
  | "regulatory"
  | "readout"
  | "publication"
  | "conference"
  | "launch"
  | "deal"
  | "corporate"
  | "policy"
  | "other";

export type IntelLevel = "L1" | "L2" | "L3";

/** 人工核验后直接写入证据库的事件(监测流水线之外的补录) */
export interface Milestone {
  id: string;
  date: string;
  companyId: string | null;
  company?: string;
  product: string;
  kind: EventKind;
  level: IntelLevel;
  title: string;
  summary: string;
  why: string;
  confidence: "high" | "medium";
  sources: string[];
}

// ---- MRD(分子残留病灶)产品矩阵 ----

/** 实体瘤 ctDNA MRD 与血液肿瘤克隆追踪是两类检测，不放在同一条检出限轴上比较。 */
export type MrdCategory = "solid" | "heme";

export type MrdApproach = "tumor-informed" | "tumor-naive";

/** 定制检测前对肿瘤组织做的测序；tumor-naive 没有这一步。 */
export type MrdTissueAssay = "WES" | "WGS" | "panel";

/** 血浆(或骨髓)里追踪的范围 */
export type MrdTracking = "个体化 panel" | "固定 panel" | "WGS" | "免疫受体测序";

/** 数据出处的分量：同行评议的研究、监管机构审评过的数据 → 实心；企业材料 → 描边。 */
export type MrdEvidence = "peer-reviewed" | "regulator" | "vendor";

/**
 * 检出限按原文记录，不在 VAF 与肿瘤分数之间换算；
 * 只有同一量纲(scale)的数值才可以排序或同图比较。
 */
export interface MrdLod {
  /** 原文数值与单位，如 "0.01% VAF"、"1.67 ppm" */
  label: string;
  /** 口径：LoD95 / LoD50 / 检出阈值 / 企业宣称 */
  basis: string;
  /** vaf：变异等位基因频率(%)；tf：肿瘤分数(ppm)；cells：有核细胞中的克隆比例 */
  scale: "vaf" | "tf" | "cells" | null;
  /** 该量纲下的数值(vaf 为百分数，tf 为 ppm，cells 为比例)；量纲不明时为 null */
  value: number | null;
  /** cfDNA / DNA 投入量 */
  input?: string;
  evidence: MrdEvidence;
  sources: string[];
}

export interface MrdClinical {
  cancer: string;
  /** 术后单点(landmark) / 纵向监测 */
  setting: string;
  study: string;
  n?: number;
  /** 对复发的灵敏度 */
  sensitivity?: string;
  specificity?: string;
  /** 治疗前(基线)血浆的 ctDNA 检出率：不是对复发的灵敏度，不与之比较 */
  baselineDetection?: string;
  /** 较影像学复发的中位提前期 */
  leadTime?: string;
  hazardRatio?: string;
  note?: string;
  evidence: MrdEvidence;
  sources: string[];
}

export interface MrdPrice {
  amount: number;
  currency: "USD" | "CNY" | "EUR" | "GBP";
  /** 价格性质：目录价 / Medicare 支付价 / 企业披露均价 / 官方渠道标价 */
  basis: string;
  /** 这个价格买到什么：首次定制 / 每次监测 / 套餐 */
  covers: string;
  /** 价格所指的时间(YYYY 或 YYYY-MM) */
  asOf: string;
  sources: string[];
}

export interface MrdStatus {
  label: string;
  date: string | null;
  sources: string[];
}

export interface MrdProduct {
  id: string;
  /** 证据库里已有档案的企业 */
  companyId: string | null;
  company: string;
  companyEn: string;
  country: string;
  region: Region;
  /** 本司锚定(世和基因) */
  self: boolean;
  product: string;
  category: MrdCategory;
  approach: MrdApproach;
  tissue: MrdTissueAssay | null;
  tissueDetail: string;
  tracking: MrdTracking;
  trackingDetail: string;
  analytes: string[];
  /** 追踪的位点 / 区域数，按原文 */
  targets: string;
  lod: MrdLod[];
  clinical: MrdClinical[];
  sample: string;
  turnaround: string;
  statuses: MrdStatus[];
  prices: MrdPrice[];
  launch: string | null;
  /** 口径说明：数值在不同出处之间有出入时必须写明 */
  note?: string;
  /** 技术选型、样本与周期等描述性字段的出处 */
  sources: string[];
  updatedAt: string;
}

/** 没有产品级公开标价时，媒体报道的行业报价区间。 */
export interface MrdPriceRange {
  region: Region;
  /** 报价对应的购买方式：单次检测 / 一次性套餐 */
  covers: string;
  /** 原文区间，不换算 */
  range: string;
  asOf: string;
  sources: string[];
}

export type PfCell = [number, string] | null;

export interface PathfinderTable {
  stages: string[];
  rows: { cancer: string; n: number; cells: PfCell[] }[];
  total: PfCell[];
}
