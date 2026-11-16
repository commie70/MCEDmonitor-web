import { MRD_APPROACH_LABEL, MRD_LOD_SCALE_LABEL } from "@/data/meta";
import type {
  MrdApproach,
  MrdClinical,
  MrdEvidence,
  MrdLod,
  MrdPrice,
  MrdProduct,
  MrdStatus,
} from "@/data/types";
import type { EventLink } from "@/lib/event-model";
import { cn } from "@/lib/utils";

/** 卡片与产品页共用的展示件：不读数据，服务端与客户端都能引入。 */

export type Linked<T> = Omit<T, "sources"> & { links: EventLink[] };

export type MatrixProduct = Omit<MrdProduct, "lod" | "clinical" | "statuses" | "prices" | "sources"> & {
  lod: Linked<MrdLod>[];
  clinical: Linked<MrdClinical>[];
  statuses: Linked<MrdStatus>[];
  prices: Linked<MrdPrice>[];
  links: EventLink[];
};

export const EVIDENCE_LABEL: Record<MrdEvidence, string> = {
  "peer-reviewed": "同行评议",
  regulator: "监管审评",
  vendor: "企业材料 / 转述",
};

/** 出处的分量：同行评议与监管审评实心，企业材料描边。 */
export function EvidenceDot({ evidence, className }: { evidence: MrdEvidence; className?: string }) {
  return (
    <span
      role="img"
      aria-label={EVIDENCE_LABEL[evidence]}
      title={EVIDENCE_LABEL[evidence]}
      className={cn(
        "inline-block size-[8px] shrink-0 rounded-full border-[1.5px]",
        evidence === "vendor" ? "border-ink-3 bg-transparent" : "border-mark bg-mark",
        className
      )}
    />
  );
}

export function ApproachChip({ approach }: { approach: MrdApproach }) {
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center whitespace-nowrap rounded-[5px] border px-[6px] py-px text-[11px] font-semibold leading-[18px]",
        approach === "tumor-informed" ? "border-ink bg-ink text-panel" : "border-line-strong text-ink-2"
      )}
    >
      {MRD_APPROACH_LABEL[approach]}
    </span>
  );
}

/** 技术选型一句话：组织测序 → 血浆追踪。 */
export function assayLine(product: Pick<MatrixProduct, "tissue" | "tracking">): string {
  return [product.tissue, product.tracking].filter(Boolean).join(" → ");
}

/**
 * 检出限的口径：量纲、统计口径与投入量。
 * 不同量纲(VAF、肿瘤分数、克隆比例)的数值不能比大小，所以口径紧跟数值、与它同等醒目。
 */
export function lodBasis(entry: Pick<MrdLod, "scale" | "basis" | "input">): string {
  return [entry.scale && MRD_LOD_SCALE_LABEL[entry.scale], entry.basis, entry.input].filter(Boolean).join(" · ");
}

/** 临床读数。治疗前检出率单列，不并入对复发的灵敏度。 */
export function clinicalReadings(entry: Linked<MrdClinical>): { label: string; value: string }[] {
  return [
    { label: "灵敏度", value: entry.sensitivity },
    { label: "特异性", value: entry.specificity },
    { label: "治疗前检出", value: entry.baselineDetection },
    { label: "提前期", value: entry.leadTime },
    { label: "HR", value: entry.hazardRatio },
  ].filter((reading): reading is { label: string; value: string } => Boolean(reading.value));
}

export function clinicalContext(entry: Pick<MrdClinical, "cancer" | "setting" | "n">): string {
  return [entry.cancer, entry.setting, entry.n && `n=${entry.n.toLocaleString("en-US")}`].filter(Boolean).join(" · ");
}
