"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_COMPETITORS,
  ROUTE_COLORS,
  STUDY_TONE,
  type Competitor,
  type RouteKey,
  type StatusTone,
  type Study,
  type StudyType,} from "../shared/competitors";
import { ALL_ITEMS, FEATURED_ITEMS } from "../shared/data";
import type { NewsItem } from "../shared/types";

/**
 * 主题页 — 复刻模板站 / topics 的三段式：* 公司与产品 / 技术方向 / 研究类型。
 * 展示数据全部来自 shared/competitors.ts 与 shared/data.ts。
 */

type StudyTone = (typeof STUDY_TONE)[keyof typeof STUDY_TONE];

const PILL_TONE: Record<StatusTone, string> = {
  emerald:
    "bg-[color-mix(in_srgb,var(--accent-emerald)_12%,transparent)] text-mc-emerald-fg",
  cyan:"bg-[color-mix(in_srgb,var(--accent-cyan)_10%,transparent)] text-mc-cyan-fg",amber:
    "bg-[color-mix(in_srgb,var(--accent-amber)_14%,transparent)] text-mc-amber-fg",
  violet: "bg-[color-mix(in_srgb,#8f6fe0_14%,transparent)] text-[#8f6fe0]",neutral: "bg-mc-surface2 text-mc-ink1",
  muted: "bg-mc-surface1 text-mc-ink2",};

const STUDY_BADGE: Record<StudyTone, string> = {
  rose: "bg-[color-mix(in_srgb,var(--accent-rose)_10%,transparent)] text-mc-rose-fg",
  emerald: PILL_TONE.emerald,
  cyan: PILL_TONE.cyan,amber: PILL_TONE.amber,
  ink: "bg-mc-ink text-mc-page",};

const CARD_CLASS =
  "cursor-pointer bg-mc-card border border-mc-line rounded-xl p-[14px] shadow-mc-card transition-colors hover:border-mc-line-strong";

function truncate(s: string,n:number): string {
  return s.length > n ? `${s.slice(0,n)}…` : s;
}/** 演示新闻池：精选 + 全部动态，按 id 去重(精选优先) */
const NEWS_POOL: NewsItem[] = (() => {
  const seen = new Set<string>();
  const pool: NewsItem[] = [];
  for (const item of [...FEATURED_ITEMS, ...ALL_ITEMS]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    pool.push(item);
  }
  return pool;
})();

const ASCII_KW = /^[A-Za-z0-9-]+$/;

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}/** 关键词命中： ASCII 词按词边界(避免 RNA 命中 miRNA),CJK 直接包含 */
function hitText(haystack: string, kw: string): boolean {
  const hay = haystack.toLowerCase();
  const k = kw.toLowerCase();
  if (!ASCII_KW.test(kw)) return hay.includes(k);
  return new RegExp(`(?<![a-z0-9])${escapeRe(k)}(?![a-z0-9])`).test(hay);
}

function itemText(item: NewsItem, withTags: boolean): string {
  const parts = [item.title, ...(item.summary ?? [])];
  if (withTags) parts.push(...(item.tags ?? []));
  return parts.join("\n");
}/** 公司可匹配别名：全名 + 切分出的 ≥2 字符词段(如 觅瑞 Mirxes → 觅瑞 / Mirxes) */
function companyTerms(c: Competitor): string[] {
  const parts = c.co.split(/[\s/·()]+/).filter((p) => p.length >= 2);
  return [c.co, ...parts];
}

function companyHits(c: Competitor, item: NewsItem): boolean {
  const hay = itemText(item, true);
  return companyTerms(c).some((t) => hitText(hay, t));
}// ---- 板块二：技术方向 ----

interface TopicDef {
  key: string;
  name: string;
  /** ROUTE_COLORS 语义色；概念卡为 undefined(用 bg-mc-cyan) */
  color?: string;
  companies: Competitor[];
  news: NewsItem[];
}

type ConceptKey = "too" | "mrd" | "wgs";

const CONCEPTS:{ key: ConceptKey; name: string; keywords: string[] }[] = [
  { key: "too",name: "组织溯源 TOO/CSO", keywords: ["TOO", "溯源"] },{ key: "mrd",name: "MRD 微小残留", keywords: ["MRD"] },{ key: "wgs",name: "低深度 WGS", keywords: ["WGS", "低深度"] },];

function conceptCompanies(key: ConceptKey): Competitor[] {
  switch (key) {
    case "too":
      return ALL_COMPETITORS.filter((c) =>
        c.studies.some((s) => s.perf.includes("TOO")),
      );
    case "mrd":
      return ALL_COMPETITORS.filter((c) => c.layout.includes("MRD"));
    case "wgs":
      return ALL_COMPETITORS.filter(
        (c) => c.panel.includes("低深度 WGS") || c.panel.includes("浅层 WGS"),
      );
  }
}

function conceptNews(keywords: string[]): NewsItem[] {
  return NEWS_POOL.filter((item) => {
    const hay = itemText(item, false);
    return keywords.some((k) => hitText(hay, k));
  }).slice(0, 8);
}

function routeNews(route: RouteKey): NewsItem[] {
  const cos = ALL_COMPETITORS.filter((c) => c.routes.includes(route));
  return NEWS_POOL.filter((item) => {
    if (hitText(itemText(item, true), route)) return true;
    return cos.some((c) => companyHits(c, item));
  }).slice(0, 8);
}

function buildTopics(): TopicDef[] {
  const routes: TopicDef[] = (Object.keys(ROUTE_COLORS) as RouteKey[]).map(
    (r) => ({
      key: `route-${r}`,name: r,
      color: ROUTE_COLORS[r],
      companies: ALL_COMPETITORS.filter((c) => c.routes.includes(r)),news: routeNews(r),}),
  );
  const concepts: TopicDef[] = CONCEPTS.map((c) => ({
    key: `concept-${c.key}`,name: c.name,
    companies: conceptCompanies(c.key),news: conceptNews(c.keywords),}));
  return [...routes, ...concepts];
}// ---- 板块三：研究类型 ----

const TIER_ORDER: StudyType[] = [
  "病例对照",
  "前瞻队列",
  "前瞻注册",
  "前瞻干预",
  "RCT",
];

/** 「前瞻 + 回顾注册汇总」归入「前瞻注册」 */
function tierOf(t: StudyType): StudyType {
  return t === "前瞻 + 回顾注册汇总" ? "前瞻注册" : t;
}

interface TierEntry {
  c: Competitor;
  s: Study;
}

function buildTiers():{ tier: StudyType; entries: TierEntry[] }[] {
  const map = new Map<StudyType, TierEntry[]>(TIER_ORDER.map((t) => [t, []]));
  for (const c of ALL_COMPETITORS) {
    for (const s of c.studies) {
      map.get(tierOf(s.type))?.push({ c, s });
    }
  }
  return TIER_ORDER.map((tier) => ({ tier, entries: map.get(tier) ?? [] }));
}// ---- 子组件 ----

function SectionHead({ title,note }:{ title: string; note: string }) {
  return (
    <div>
      <h2 className="m-0 text-[16px] font-extrabold text-mc-ink">
        {title}
      </h2>
      <p className="m-0 mt-[4px] mb-[12px] max-w-[760px] text-[12px] leading-[1.6] text-mc-ink2">
        {note}
      </p>
    </div>
  );
}

function StudyRows({ studies }:{ studies: Study[] }) {
  return (
    <div className="flex flex-col gap-[9px]">
      {studies.map((s, i) => (
        <div
          key={`${s.name}-${i}`}
          className="flex items-start gap-[10px] rounded-lg border border-mc-line bg-mc-surface0 p-[9px_11px]"
        >
          <span
            className={cn(
              "mt-[1px] shrink-0 whitespace-nowrap rounded-[6px] px-[8px] py-[2px] text-[10.5px] font-bold",
              STUDY_BADGE[STUDY_TONE[s.type]],
            )}
          >
            {s.type}
          </span>
          <div className="text-[12px] leading-[1.6] text-mc-ink1">
            <div>
              <span className="font-bold text-mc-ink">{s.name}</span>:{s.perf}
            </div>
            <div className="mt-[2px] text-[11px] text-mc-ink2">
              入组人群 / 例数：{s.pop}
            </div>
            <div className="mt-[2px] text-[11px] text-mc-ink2">
              更新 {s.updatedAt}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

function CompanyCard({
  c,
  open, onToggle,}:{
  c: Competitor;
  open: boolean;
  onToggle: () => void;
}) {
  const proStudy = c.studies.find((s) => s.type !== "病例对照");
  const ccStudy = c.studies.find((s) => s.type === "病例对照");

  return (
    <div className={CARD_CLASS} onClick={onToggle}>
      {/* 头部：公司名 + 本司徽章 + MCED / 单癌徽章 */}
      <div className="flex items-start justify-between gap-[8px]">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-[6px]">
            <span className="text-[13.5px] font-bold text-mc-ink">{c.co}</span>
            {c.self && (
              <span className="rounded-[9px] bg-mc-cyan px-[7px] py-[1px] text-[10px] font-semibold text-mc-accent-contrast">
                本司
              </span>
            )}
          </div>
          <span className="mt-[2px] block text-[11px] text-mc-ink1">
            {c.en} · {c.region}
          </span>
        </div>
        <span
          className={cn(
            "shrink-0 rounded-[9px] px-[7px] py-[2px] text-[10px] font-bold",
            c.mced ? "bg-[#8b5cf6] text-white" : "bg-mc-surface2 text-mc-ink1",
          )}
        >
          {c.mced ? "MCED" : "单癌"}
        </span>
      </div>

      {/* 产品与布局 */}
      <div className="mt-[8px] text-[13px] font-semibold text-mc-cyan">
        {c.product}
      </div>
      <div className="mt-[2px] line-clamp-2 text-[12px] leading-[1.5] text-mc-ink1">
        {c.layout}
      </div>

      {/* 技术路线 */}
      <div className="mt-[8px] flex flex-wrap gap-[5px]">
        {c.routes.map((r) => (
          <span
            key={r}
            className="rounded-[5px] px-[7px] py-[2px] text-[10.5px] font-semibold text-white"
            style={{ background: ROUTE_COLORS[r] }}
          >
            {r}
          </span>
        ))}
      </div>

      {/* 性能摘要：前瞻 / 注册队列一行 + 病例对照一行 */}
      {(proStudy || ccStudy) && (
        <div className="mt-[9px] flex flex-col gap-[4px]">
          {proStudy && (
            <div className="text-[11.5px] leading-[1.5] text-mc-ink1">
              <span className="font-semibold text-mc-ink">
                {proStudy.type}
              </span>
              :{proStudy.name} — {truncate(proStudy.perf, 80)}
            </div>
          )}
          {ccStudy && (
            <div className="text-[11.5px] leading-[1.5] text-mc-ink1">
              <span className="font-semibold text-mc-ink">{ccStudy.type}</span>
              :{ccStudy.name} — {truncate(ccStudy.perf, 80)}
            </div>
          )}
        </div>
      )}

      {/* 底部 */}
      <div className="mt-[9px] flex items-center justify-between">
        <span className="text-[10.5px] text-mc-ink2">更新 {c.updatedAt}</span>
        <ChevronDown
          size={14}
          className={cn(
            "text-mc-ink2 transition-transform",
            open && "rotate-180",
          )}/>
      </div>

      {/* 展开区：全部研究 + status pills */}
      {open && (
        <div
          className="mt-[10px] cursor-default border-t border-mc-line-soft pt-[10px]"
          onClick={(e) => e.stopPropagation()}
        >
          <StudyRows studies={c.studies}/>
          {c.status.length > 0 && (
            <div className="mt-[10px] flex flex-wrap gap-[5px]">
              {c.status.map((s) => (
                <span
                  key={`${s.label}-${s.scope}`}
                  className={cn(
                    "rounded-[5px] px-[8px] py-[2px] text-[10.5px] font-semibold",
                    PILL_TONE[s.tone],
                  )}
                >
                  {s.label}
                  <span className="font-normal opacity-85"> · {s.scope}</span>
                </span>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TopicCard({
  t,
  open, onToggle,}:{
  t: TopicDef;
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div
      className={cn(
        CARD_CLASS,
        "self-start cursor-default",
        open && "col-span-full",
      )}
    >
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-[8px] text-left"
        aria-expanded={open}
        onClick={onToggle}
      >
        <span
          className={cn(
            "h-[9px] w-[9px] shrink-0 rounded-full",
            t.color === undefined && "bg-mc-cyan",
          )}
          style={t.color !== undefined ? { background: t.color } : undefined}/>
        <span className="text-[13px] font-bold text-mc-ink">{t.name}</span>
        <span className="ml-auto text-[11px] text-mc-ink2">
          {t.companies.length} 家
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-mc-ink2 transition-transform",
            open && "rotate-180",
          )}/>
      </button>

      {open && (
        <div className="mt-[10px] cursor-default border-t border-mc-line-soft pt-[10px]">
          <div className="mb-[6px] text-[11px] font-semibold text-mc-ink1">
            相关企业({t.companies.length})
          </div>
          <div className="flex flex-wrap gap-[5px]">
            {t.companies.map((c) => (
              <span
                key={c.id}
                className="rounded-full bg-mc-surface2 px-[8px] py-[2px] text-[11px] text-mc-ink1"
              >
                {c.co}
              </span>
            ))}
          </div>
          <div className="mt-[12px] mb-[6px] text-[11px] font-semibold text-mc-ink1">
            相关技术新闻精选
          </div>
          {t.news.length === 0 ? (
            <div className="text-[11.5px] text-mc-ink2">
              本期演示新闻中暂无该方向条目
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-x-[24px] gap-y-[10px] max-[760px]:grid-cols-1">
              {t.news.map((item) => (
                <div key={item.id} className="min-w-0 border-b border-mc-line-soft pb-[9px]">
                  {item.url ? (
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="text-[13px] font-semibold leading-[1.5] text-mc-ink transition-colors hover:text-mc-cyan-fg hover:underline"
                    >
                      {item.title} ↗
                    </a>
                  ) : (
                    <Link
                      href={`/items/${encodeURIComponent(item.id)}`}
                      className="text-[13px] font-semibold leading-[1.5] text-mc-ink transition-colors hover:text-mc-cyan-fg hover:underline"
                    >
                      {item.title}
                    </Link>
                  )}
                  <div className="mt-[2px] text-[11px] text-mc-ink2">
                    {item.source} · {item.date}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function TierCard({
  tier,
  entries,
  open, onToggle,}:{
  tier: StudyType;
  entries: TierEntry[];
  open: boolean;
  onToggle: () => void;
}) {
  return (
    <div className={CARD_CLASS} onClick={onToggle}>
      <div className="flex flex-wrap items-center gap-x-[9px] gap-y-[5px]">
        <span
          className={cn(
            "shrink-0 whitespace-nowrap rounded-[6px] px-[9px] py-[3px] text-[11px] font-bold",
            STUDY_BADGE[STUDY_TONE[tier]],
          )}
        >
          {tier}
        </span>
        <span className="text-[12px] font-semibold text-mc-ink">
          {entries.length} 项研究
        </span>
        <span className="min-w-0 flex-1 text-[11.5px] text-mc-ink2">
          {entries
            .slice(0, 2)
            .map((e) => truncate(e.s.name, 40))
            .join(" / ")}
        </span>
        <ChevronDown
          size={14}
          className={cn(
            "shrink-0 text-mc-ink2 transition-transform",
            open && "rotate-180",
          )}/>
      </div>

      {open && (
        <div
          className="mt-[10px] flex cursor-default flex-col gap-[9px] border-t border-mc-line-soft pt-[10px]"
          onClick={(e) => e.stopPropagation()}
        >
          {entries.map(({ c, s }, i) => (
            <div
              key={`${c.id}-${s.name}-${i}`}
              className="rounded-lg border border-mc-line bg-mc-surface0 p-[9px_11px]"
            >
              <div className="text-[12.5px] leading-[1.5]">
                <span className="font-bold text-mc-ink">{c.co}</span>
                <span className="text-mc-ink1"> · {s.name}</span>
              </div>
              <div className="mt-[3px] text-[12px] leading-[1.6] text-mc-ink1">
                {s.perf}
              </div>
              <div className="mt-[3px] text-[11px] text-mc-ink2">
                入组人群 / 例数：{s.pop}
              </div>
              <div className="mt-[2px] text-[11px] text-mc-ink2">
                更新 {s.updatedAt}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}// ---- 页面 ----

export function TopicsPage() {
  const [openCompanies, setOpenCompanies] = useState<ReadonlySet<string>>(
    new Set(),
  );
  const [openTopic, setOpenTopic] = useState<string | null>(null);
  const [openTiers, setOpenTiers] = useState<ReadonlySet<string>>(new Set());

  const topics = useMemo(() => buildTopics(), []);
  const tiers = useMemo(() => buildTiers(), []);

  const toggleIn = (
    set: ReadonlySet<string>,apply: (next: ReadonlySet<string>) => void,
    id: string,
  ) => {
    const next = new Set(set);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    apply(next);
  };

  return (
    <div className="grid gap-6">
      <header className="pt-[6px]">
        <h1 className="m-0 text-[23px] font-bold leading-[1.2] tracking-[-0.01em] text-mc-ink">
          主题
        </h1>
        <p className="mt-[5px] max-w-[700px] text-[12px] leading-[1.6] text-mc-ink2">
          公司与产品、技术方向、研究类型——按主题看早筛竞品，点击卡片展开对应精选集。
        </p>
        <hr className="mt-[10px] mb-[8px] border-0 border-t border-mc-line-soft" />
      </header>

      {/* 板块一：公司与产品 */}
      <section>
        <SectionHead
          title="公司与产品"
          note="19 家受监测企业的业务概要与核心产品：主打技术路线与队列性能(特异性 / 灵敏度 / TOO，含更新时间)。"
        />
        <div className="grid grid-cols-2 gap-[14px] max-[960px]:grid-cols-1">
          {ALL_COMPETITORS.map((c) => (
            <CompanyCard
              key={c.id}
              c={c}
              open={openCompanies.has(c.id)}
              onToggle={() =>
                toggleIn(openCompanies, setOpenCompanies, c.id)
              }/>
          ))}
        </div>
      </section>

      {/* 板块二：技术方向 */}
      <section>
        <SectionHead
          title="技术方向"
          note="竞品产品技术路线与高频关键词，展开查看相关企业与技术新闻精选。"
        />
        <div className="grid grid-cols-3 items-start gap-[14px] max-[960px]:grid-cols-1">
          {topics.map((t) => (
            <TopicCard
              key={t.key}
              t={t}
              open={openTopic === t.key}
              onToggle={() => setOpenTopic(openTopic === t.key ? null : t.key)}/>
          ))}
        </div>
      </section>

      {/* 板块三：研究类型 */}
      <section>
        <SectionHead
          title="研究类型"
          note="受监测公司核心产品的 definitive 研究(论文 / 会议披露)，按证据等级分层。可信度：病例对照(高估)→ 前瞻队列 / 注册 / 干预(真实场景)→ RCT(人群效果)。"
        />
        <div className="flex flex-col gap-[10px]">
          {tiers.map(({ tier, entries }) => (
            <TierCard
              key={tier}
              tier={tier}
              entries={entries}
              open={openTiers.has(tier)}
              onToggle={() => toggleIn(openTiers, setOpenTiers, tier)}/>
          ))}
        </div>
      </section>
    </div>
  );
}
