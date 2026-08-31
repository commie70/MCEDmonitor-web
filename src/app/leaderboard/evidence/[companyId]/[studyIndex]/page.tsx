import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ExternalLink } from "lucide-react";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";
import {
  ALL_COMPETITORS,
  ROUTE_COLORS,
} from "@/components/sites/aihot-virxact-com-e007b012/shared/competitors";

interface EvidencePageProps {
  params: Promise<{ companyId: string; studyIndex: string }>;
}

interface ParsedSource {
  kind: "web" | "zotero" | "materials";
  label: string;
  locator: string;
  href?: string;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return ALL_COMPETITORS.flatMap((company) =>
    company.studies.map((_, studyIndex) => ({
      companyId: company.id,
      studyIndex: String(studyIndex),
    })),
  );
}

function getRecord(companyId: string, rawStudyIndex: string) {
  const studyIndex = Number(rawStudyIndex);
  const company = ALL_COMPETITORS.find((item) => item.id === companyId);
  if (!company || !Number.isInteger(studyIndex) || studyIndex < 0) return null;
  const study = company.studies[studyIndex];
  if (!study) return null;
  return { company, study, studyIndex };
}

function sourceLabel(locator: string): string {
  const leaf = locator.split("/").at(-1) ?? locator;
  return leaf.replace(/\.(pdf|pptx|xlsx|docx)$/i, "");
}

function parseSources(evidence?: string): ParsedSource[] {
  if (!evidence) return [];
  return evidence
    .split(";")
    .map((item) => item.trim())
    .filter(Boolean)
    .map((locator) => {
      if (locator.startsWith("http://") || locator.startsWith("https://")) {
        const url = new URL(locator);
        return {
          kind: "web" as const,
          label: url.hostname.replace(/^www\./, ""),
          locator,
          href: locator,
        };
      }
      if (locator.startsWith("zotero:")) {
        const cleanLocator = locator.slice("zotero:".length);
        return {
          kind: "zotero" as const,
          label: sourceLabel(cleanLocator),
          locator: cleanLocator,
        };
      }
      return {
        kind: "materials" as const,
        label: sourceLabel(locator),
        locator,
      };
    });
}

export async function generateMetadata({ params }: EvidencePageProps): Promise<Metadata> {
  const { companyId, studyIndex } = await params;
  const record = getRecord(companyId, studyIndex);
  if (!record) return { title: "证据未找到 · 早筛情报站" };
  return {
    title: `${record.company.co} · ${record.study.name} · 证据`,
    description: `${record.study.pop}；${record.study.perf}`,
  };
}

export default async function EvidencePage({ params }: EvidencePageProps) {
  const { companyId, studyIndex } = await params;
  const record = getRecord(companyId, studyIndex);
  if (!record) notFound();

  const { company, study } = record;
  const sources = parseSources(study.evidence);

  return (
    <SiteShell>
      <article className="mx-auto max-w-[920px] py-[8px] pb-[40px]">
        <Link
          href="/leaderboard"
          className="inline-flex text-[12px] font-semibold text-mc-cyan-fg hover:underline"
        >
          ← 返回早筛产品看板
        </Link>

        <header className="mt-[18px] border-b border-mc-line pb-[16px]">
          <div className="flex flex-wrap items-center gap-[7px]">
            <span className="rounded-full bg-mc-surface2 px-[9px] py-[3px] text-[11px] font-semibold text-mc-ink1">
              结构化 HTML 证据卡
            </span>
            <span className="text-[11px] text-mc-ink2">更新：{study.updatedAt}</span>
          </div>
          <h1 className="mt-[10px] text-[25px] font-extrabold leading-[1.25] text-mc-ink">
            {study.name}
          </h1>
          <p className="mt-[6px] text-[13px] text-mc-ink1">
            {company.co} · {company.product} · {study.type}
          </p>
        </header>

        <div className="mt-[18px] grid gap-[14px] md:grid-cols-2">
          <section className="rounded-xl border border-mc-line bg-mc-card p-[16px]">
            <h2 className="text-[14px] font-bold text-mc-ink">研究对象与性能分母</h2>
            <p className="mt-[8px] text-[13px] leading-[1.75] text-mc-ink1">{study.pop}</p>
          </section>
          <section className="rounded-xl border border-mc-line bg-mc-card p-[16px]">
            <h2 className="text-[14px] font-bold text-mc-ink">关键结果与口径</h2>
            <p className="mt-[8px] text-[13px] leading-[1.75] text-mc-ink1">{study.perf}</p>
          </section>
        </div>

        <section className="mt-[14px] rounded-xl border border-mc-line bg-mc-card p-[16px]">
          <h2 className="text-[14px] font-bold text-mc-ink">产品与检测技术</h2>
          <div className="mt-[9px] flex flex-wrap gap-[5px]">
            {company.routes.map((route) => (
              <span
                key={route}
                className="rounded-[5px] px-[8px] py-[2px] text-[11px] font-semibold text-white"
                style={{ background: ROUTE_COLORS[route] }}
              >
                {route}
              </span>
            ))}
          </div>
          <p className="mt-[9px] text-[13px] leading-[1.75] text-mc-ink1">{company.panel}</p>
        </section>

        <section className="mt-[14px] rounded-xl border border-mc-line bg-mc-card p-[16px]">
          <h2 className="text-[14px] font-bold text-mc-ink">证据来源</h2>
          {sources.length > 0 ? (
            <ul className="mt-[9px] grid gap-[9px]">
              {sources.map((source) => (
                <li key={`${source.kind}-${source.locator}`} className="rounded-lg bg-mc-surface0 p-[11px]">
                  <div className="flex flex-wrap items-center justify-between gap-[8px]">
                    <span className="text-[12px] font-semibold text-mc-ink">{source.label}</span>
                    <span className="rounded-full bg-mc-surface2 px-[7px] py-[2px] text-[10px] text-mc-ink2">
                      {source.kind === "web"
                        ? "公开网页"
                        : source.kind === "zotero"
                          ? "Zotero 本地原文"
                          : "本地信源库"}
                    </span>
                  </div>
                  {source.href ? (
                    <a
                      href={source.href}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-[5px] inline-flex items-center gap-[4px] break-all text-[11px] text-mc-cyan-fg hover:underline"
                    >
                      打开公开来源 <ExternalLink size={11} />
                    </a>
                  ) : (
                    <code className="mt-[5px] block break-all text-[10.5px] leading-[1.6] text-mc-ink2">
                      {source.kind === "materials"
                        ? `@../materials/早筛文献与会议/${source.locator}`
                        : source.locator}
                    </code>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-[8px] text-[12px] leading-[1.7] text-mc-ink2">
              当前条目尚未定位到可公开跳转或本地可追溯的原始文件；页面仅保留看板已标注的来源摘要。
            </p>
          )}
        </section>

        <aside className="mt-[14px] rounded-xl border border-mc-line bg-mc-bg1 p-[14px] text-[11.5px] leading-[1.7] text-mc-ink2">
          本页是从论文、会议材料或监管资料抽取的结构化证据摘要，不替代原文。病例对照、症状人群、无症状筛查、注册试验和 RCT
          的分母与终点不同；横向比较前请先核对本页“研究对象与性能分母”及原始来源。
        </aside>
      </article>
    </SiteShell>
  );
}
