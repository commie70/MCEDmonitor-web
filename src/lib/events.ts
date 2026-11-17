import {
  COMPANIES,
  MILESTONES,
  STAGE_META,
  STUDIES,
  getCompany,
  isProspective,
  resolveSources,
  sourceHref,
  type Company,
  type EventKind,
  type IntelLevel,
  type RegStage,
  type Source,
  type Study,
} from "@/data";
import { cstDate } from "./dates";
import type { EventLink, IntelEvent } from "./event-model";
import { hostOf, safeHttpUrl } from "./url";

export * from "./event-model";

/**
 * 事件构建器：把证据库与监测公开报告映射成统一事件(依赖数据本体，仅服务端使用)。
 */

function linksOf(sources: Source[]): EventLink[] {
  return sources.map((source) => ({ label: source.label, href: sourceHref(source), kind: source.kind }));
}

// ---- 证据库 → 事件 ----

const STAGE_LEVEL: Record<RegStage, IntelLevel | null> = {
  "nmpa-approved": "L1",
  "fda-approved": "L1",
  "fda-review": "L1",
  "nmpa-innovative": "L2",
  "fda-breakthrough": "L2",
  hsa: "L2",
  ce: "L3",
  ldt: "L3",
  rnd: null,
};

function studyKind(sources: Source[]): EventKind {
  if (sources.some((source) => source.kind === "journal")) return "publication";
  if (sources.some((source) => source.kind === "conference")) return "conference";
  return "readout";
}

function studyLevel(study: Study, company: Company): IntelLevel {
  if (study.design === "RCT" || study.design === "前瞻注册" || study.design === "前瞻干预") return "L1";
  if (isProspective(study.design) || company.self) return "L2";
  return "L3";
}

function studyEvents(): IntelEvent[] {
  return STUDIES.flatMap((study) => {
    const company = getCompany(study.companyId);
    if (!company || !study.date) return [];
    const sources = resolveSources(study.sources);
    return [
      {
        id: `study-${study.id}`,
        origin: "archive" as const,
        date: study.date,
        kind: studyKind(sources),
        companyId: company.id,
        company: company.name,
        product: company.product,
        region: company.region,
        self: company.self,
        title: study.name,
        summary: study.performance,
        why: "",
        level: studyLevel(study, company),
        score: null,
        confidence: "high" as const,
        state: null,
        links: linksOf(sources),
        studyId: study.id,
        sourceCount: sources.length,
        legacyIds: [],
      },
    ];
  });
}

function statusEvents(): IntelEvent[] {
  return COMPANIES.flatMap((company) =>
    company.statuses.flatMap((status, index) => {
      const level = STAGE_LEVEL[status.stage];
      if (!status.date || !level) return [];
      const sources = resolveSources(status.sources);
      return [
        {
          id: `reg-${company.id}-${index}`,
          origin: "archive" as const,
          date: status.date,
          kind: (status.stage === "ldt" ? "launch" : "regulatory") as EventKind,
          companyId: company.id,
          company: company.name,
          product: company.product,
          region: company.region,
          self: company.self,
          title: `${STAGE_META[status.stage].short} · ${status.scope}`,
          summary: "",
          why: "",
          level,
          score: null,
          confidence: "high" as const,
          state: null,
          links: linksOf(sources),
          sourceCount: sources.length,
          legacyIds: [],
        },
      ];
    })
  );
}

function milestoneEvents(): IntelEvent[] {
  return MILESTONES.map((milestone) => {
    const company = milestone.companyId ? getCompany(milestone.companyId) : undefined;
    const sources = resolveSources(milestone.sources);
    return {
      id: `ms-${milestone.id}`,
      origin: "archive" as const,
      date: milestone.date,
      kind: milestone.kind,
      companyId: company?.id ?? null,
      company: company?.name ?? milestone.company ?? "行业",
      product: milestone.product,
      region: company?.region ?? null,
      self: company?.self ?? false,
      title: milestone.title,
      summary: milestone.summary,
      why: milestone.why,
      level: milestone.level,
      score: null,
      confidence: milestone.confidence,
      state: null,
      links: linksOf(sources),
      sourceCount: sources.length,
      legacyIds: [],
    };
  });
}

/**
 * 证据库里程碑。人工补录事件已覆盖的报证节点(同一企业、同一天)不再重复派生。
 */
export function archiveEvents(): IntelEvent[] {
  const curated = milestoneEvents();
  const covered = new Set(curated.map((event) => `${event.companyId}|${event.date}`));
  const derived = [...studyEvents(), ...statusEvents()].filter(
    (event) => !(event.id.startsWith("reg-") && covered.has(`${event.companyId}|${event.date}`))
  );
  return [...curated, ...derived];
}

// ---- 监测报告 → 事件 ----

interface StoryLike {
  id: string;
  legacy_ids?: string[];
  company: string;
  product: string;
  title: string;
  event_type?: string;
  publication_state?: string;
  level?: IntelLevel | null;
  evidence_confidence?: string;
  occurred_at?: string | null;
  published_at?: string | null;
  last_seen?: string;
  score: number;
  sources_count: number;
  summary: string;
  reason: string;
  items: { id: string; url: string; source: string; editorial_owner?: string; source_type?: string }[];
}

const KIND_BY_EVENT_TYPE: Record<string, EventKind> = {
  regulatory_decision: "regulatory",
  clinical_readout: "readout",
  publication: "publication",
  conference_disclosure: "conference",
  product_launch: "launch",
  partnership: "deal",
  corporate: "corporate",
  other: "other",
};

const SOURCE_KIND: Record<string, Source["kind"]> = {
  official: "company",
  journal: "journal",
  conference: "conference",
  regulator: "regulator",
  media: "media",
  social: "media",
};

const companyByName = new Map(COMPANIES.map((company) => [company.name, company]));

/** 去掉抓取标题里的站点尾巴，如 " | Targeted Oncology - …"、" - GRAIL"。 */
export function cleanTitle(title: string): string {
  return title
    .replace(/[​-‍﻿]/g, "")
    .replace(/(\s+\|\s+[^|]{2,80}){1,2}$/g, "")
    .replace(/\s+[-–—]\s+[A-Z][\w .&']{1,30}$/g, "")
    .replace(/\s*\.\.\.$/, "…")
    .trim();
}

export function monitorEvents(stories: StoryLike[]): IntelEvent[] {
  return stories.map((story) => {
    const company = companyByName.get(story.company);
    const seen = new Set<string>();
    const links: EventLink[] = [];
    for (const item of story.items) {
      const href = safeHttpUrl(item.url);
      if (!href) continue;
      const host = hostOf(href);
      if (seen.has(host)) continue;
      seen.add(host);
      const owner = item.editorial_owner || item.source || host;
      links.push({
        label: /\./.test(owner) ? owner.replace(/^www\./, "") : owner,
        href,
        kind: SOURCE_KIND[item.source_type ?? "media"] ?? "media",
      });
    }
    const state = story.publication_state;
    return {
      id: story.id,
      origin: "monitor" as const,
      date: cstDate(story.occurred_at || story.published_at || story.last_seen || ""),
      kind: KIND_BY_EVENT_TYPE[story.event_type ?? "other"] ?? "other",
      companyId: company?.id ?? null,
      company: story.company,
      product: story.product,
      region: company?.region ?? null,
      self: company?.self ?? false,
      title: cleanTitle(story.title),
      summary: story.summary,
      why: story.reason,
      level: story.level ?? null,
      score: story.score,
      confidence:
        story.evidence_confidence === "high" || story.evidence_confidence === "medium"
          ? story.evidence_confidence
          : null,
      state: state === "first" || state === "update" || state === "backfill" ? state : null,
      links,
      sourceCount: story.sources_count,
      legacyIds: [...(story.legacy_ids ?? []), ...story.items.map((item) => item.id)],
    };
  });
}

export function eventsOfCompany(events: IntelEvent[], companyId: string): IntelEvent[] {
  return events.filter((event) => event.companyId === companyId);
}
