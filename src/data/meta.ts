import type { MrdApproach, MrdCategory, MrdLod, MrdTissueAssay, RegStage, RouteKey, StudyDesign } from "./types";

/**
 * 不依赖数据本体的常量与小工具。
 * 客户端组件只从这里和 ./types 引用，避免把整个证据库打进浏览器包。
 */

export function isExternal(href: string): boolean {
  return /^https?:\/\//.test(href);
}

// ---- 研究设计：证据层级 ----

export const DESIGN_ORDER: StudyDesign[] = [
  "RCT",
  "前瞻干预",
  "前瞻注册",
  "前瞻 + 回顾注册汇总",
  "前瞻队列",
  "病例对照",
];

export function isProspective(design: StudyDesign): boolean {
  return design !== "病例对照";
}

export function designRank(design: StudyDesign): number {
  return DESIGN_ORDER.indexOf(design);
}

// ---- 技术路线 ----

export const ROUTES: RouteKey[] = [
  "甲基化",
  "片段组学",
  "多组学",
  "突变",
  "蛋白质",
  "miRNA",
  "RNA",
  "FIT",
  "FIT-DNA",
  "AI",
];

// ---- 报证 ----

export type Regulator = "NMPA" | "FDA" | "其他";

export const REGULATORS: Regulator[] = ["NMPA", "FDA", "其他"];

export const STAGE_META: Record<RegStage, { short: string; regulator: Regulator | null; rank: number }> = {
  "nmpa-approved": { short: "NMPA III 类证", regulator: "NMPA", rank: 4 },
  "nmpa-innovative": { short: "NMPA 创新通道", regulator: "NMPA", rank: 2 },
  "fda-approved": { short: "FDA 获批", regulator: "FDA", rank: 4 },
  "fda-review": { short: "FDA 审评中", regulator: "FDA", rank: 3 },
  "fda-breakthrough": { short: "FDA 突破性器械", regulator: "FDA", rank: 2 },
  ce: { short: "CE", regulator: "其他", rank: 2 },
  hsa: { short: "HSA", regulator: "其他", rank: 4 },
  ldt: { short: "LDT", regulator: null, rank: 1 },
  rnd: { short: "研发", regulator: null, rank: 0 },
};

/** 报证筛选项，沿用旧版看板的 statusKeys 口径 */
export const STATUS_FILTERS = [
  "NMPA III类证",
  "NMPA创新通道",
  "FDA获批",
  "FDA突破性器械",
  "CE认证",
  "LDT商业化",
  "研发或申报中",
] as const;

// ---- 癌种 ----

export const CANCER_ORDER = [
  "肺",
  "肝",
  "结直肠",
  "胃",
  "食管",
  "胰腺",
  "卵巢",
  "乳腺",
  "前列腺",
  "宫颈",
  "子宫内膜",
  "胆管",
  "淋巴瘤",
  "浆细胞肿瘤",
  "膀胱",
  "头颈",
  "肛门",
];

/** 高致死且缺少成熟筛查手段的癌种，矩阵中加重显示 */
export const HIGH_MORTALITY = new Set(["肺", "肝", "胰腺", "卵巢", "食管", "胃"]);

export const SOURCE_KIND_LABEL = {
  journal: "期刊论文",
  conference: "会议摘要",
  regulator: "监管文件",
  registry: "试验注册",
  company: "企业公告",
  media: "行业报道",
  internal: "会议纪要",
} as const;

// ---- MRD ----

export const MRD_APPROACHES: MrdApproach[] = ["tumor-informed", "tumor-naive"];

export const MRD_APPROACH_LABEL: Record<MrdApproach, string> = {
  "tumor-informed": "Tumor-informed",
  "tumor-naive": "Tumor-naive",
};

export const MRD_TISSUE_ASSAYS: MrdTissueAssay[] = ["WES", "WGS", "panel"];

export const MRD_CATEGORY_LABEL: Record<MrdCategory, string> = {
  solid: "实体瘤",
  heme: "血液肿瘤",
};

export const MRD_LOD_SCALE_LABEL: Record<NonNullable<MrdLod["scale"]>, string> = {
  vaf: "VAF",
  tf: "肿瘤分数",
  cells: "克隆比例",
};

const CURRENCY_SYMBOL = { USD: "$", CNY: "¥", EUR: "€", GBP: "£" } as const;

export function formatPrice(amount: number, currency: keyof typeof CURRENCY_SYMBOL): string {
  return `${CURRENCY_SYMBOL[currency]}${amount.toLocaleString("en-US")}`;
}
