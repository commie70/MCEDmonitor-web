import { designRank, isProspective, type Company, type Study } from "@/data";
import type { StudyDesign } from "@/data/types";
import { compareDateDesc } from "@/lib/dates";

/** 百分数读数；原文是 ">99%" 这类界值时照原文显示。 */
export function pctText(value: number | undefined, label?: string): string {
  if (typeof value !== "number") return "—";
  return label && /[<>≥≤]/.test(label) ? label : `${value}%`;
}

export function shortStudyName(study: Pick<Study, "name">): string {
  return study.name.split("(")[0].trim();
}

/** 性能卡片上领衔的读数：数字属于某一项研究，卡片必须同时写明是哪一项。 */
export interface Headline {
  id: string;
  design: StudyDesign;
  prospective: boolean;
  name: string;
  n?: number;
  spec: string;
  sens: string;
  /** 早期 / 癌前 / TOO 等次要读数，已带标签 */
  extras: string[];
  note?: string;
}

function hasNumbers(study: Study): boolean {
  return typeof study.metrics.sens === "number" || typeof study.metrics.spec === "number";
}

function complete(study: Study): boolean {
  return typeof study.metrics.sens === "number" && typeof study.metrics.spec === "number";
}

/**
 * 选哪项研究代表一家企业：
 * 只在无症状筛查研究里选(诊断用途与有症状转诊人群不能代表筛查性能)；
 * 先看与企业主线一致的范围(MCED 企业取多癌种研究)，再按证据等级，
 * 同级取灵敏度与特异性齐全的，最后取最近的。
 */
export function headlineStudy(company: Pick<Company, "mced">, studies: Study[]): Study | null {
  const scope = company.mced ? "mced" : "single";
  const ranked = studies
    .filter((study) => !study.diagnostic && !study.symptomatic && hasNumbers(study))
    .sort(
      (a, b) =>
        Number(a.scope !== scope) - Number(b.scope !== scope) ||
        designRank(a.design) - designRank(b.design) ||
        Number(!complete(a)) - Number(!complete(b)) ||
        compareDateDesc(a.date, b.date)
    );
  return ranked[0] ?? null;
}

export function toHeadline(study: Study): Headline {
  const { metrics } = study;
  const extras = [
    typeof metrics.early === "number" && `${metrics.earlyLabel ?? "早期"} ${metrics.early}%`,
    typeof metrics.precancer === "number" && `癌前 ${metrics.precancer}%`,
    typeof metrics.too === "number" && `TOO ${metrics.too}%${metrics.tooLabel ? `(${metrics.tooLabel})` : ""}`,
  ].filter((value): value is string => Boolean(value));
  return {
    id: study.id,
    design: study.design,
    prospective: isProspective(study.design),
    name: shortStudyName(study),
    n: metrics.n,
    spec: pctText(metrics.spec, metrics.specLabel),
    sens: pctText(metrics.sens),
    extras,
    note: study.note,
  };
}
