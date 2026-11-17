import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import Markdown from "react-markdown";
import { ArrowLeft, ArrowUpRight } from "lucide-react";
import { DownloadButton } from "@/components/actions";
import { EventRow } from "@/components/feed/EventRow";
import { StarButton } from "@/components/feed/StarButton";
import { KindTag, LevelMark, Panel, SectionTitle, SourceLink } from "@/components/ui";
import { getStudy } from "@/data";
import { isExternal } from "@/data/meta";
import { fullDate } from "@/lib/dates";
import { eventMarkdown, eventsOfCompany, findEvent } from "@/lib/events";
import { loadEvents } from "@/lib/load-events";
import { SITE_URL, hostOf, safeHttpUrl } from "@/lib/url";
import { cn } from "@/lib/utils";

interface Props {
  params: Promise<{ id: string }>;
}

function decode(id: string): string {
  try {
    return decodeURIComponent(id);
  } catch {
    return id;
  }
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const { events } = await loadEvents();
  const event = findEvent(events, decode(id));
  return event ? { title: event.title, description: event.summary || undefined } : { title: "事件" };
}

const TIER_LABEL: Record<string, string> = { authoritative: "权威", trusted: "可信", discovery: "发现" };

/** 抓回的正文只在确有内容时展示；反爬占位页不算。 */
function usableContent(content: string | undefined): string | null {
  if (!content || content.length < 400) return null;
  if (/^(Oops|Access Denied|Just a moment|403|404)/i.test(content.trim())) return null;
  return content;
}

export default async function EventPage({ params }: Props) {
  const { id } = await params;
  const { events, report } = await loadEvents();
  const event = findEvent(events, decode(id));
  if (!event) notFound();

  const story = event.origin === "monitor" ? report?.stories.find((item) => item.id === event.id) : undefined;
  const study = event.studyId ? getStudy(event.studyId) : undefined;
  const primary = event.links.find((link) => isExternal(link.href));
  const related = event.companyId
    ? eventsOfCompany(events, event.companyId)
        .filter((item) => item.id !== event.id)
        .slice(0, 5)
    : [];
  const breakdown = story?.score_breakdown;
  const evidence = story?.items.filter((item) => safeHttpUrl(item.url)) ?? [];
  const content = usableContent(story?.items.find((item) => usableContent(item.content))?.content);

  return (
    <div className="max-w-[820px]">
      <Link href="/all" className="inline-flex items-center gap-[6px] text-[12.5px] text-ink-3 transition hover:text-accent-ink">
        <ArrowLeft size={14} aria-hidden />
        全部动态
      </Link>

      <article className="mt-3">
        <div className="flex flex-wrap items-center gap-x-[10px] gap-y-1 text-[12.5px] text-ink-3">
          <KindTag kind={event.kind} />
          {event.companyId ? (
            <Link
              href={`/companies/${event.companyId}`}
              className={cn("font-semibold hover:text-accent-ink", event.self ? "text-self" : "text-ink-2")}
            >
              {event.company}
            </Link>
          ) : (
            <span className="font-semibold text-ink-2">{event.company}</span>
          )}
          {event.product && <span>{event.product}</span>}
          <time dateTime={event.date} className="tabular-nums">
            {fullDate(event.date)}
          </time>
          {event.state === "first" && <span className="font-semibold text-self">新</span>}
          {event.state === "update" && <span className="font-semibold text-self">更新</span>}
          <LevelMark level={event.level} />
          {event.confidence && <span>证据 {event.confidence === "high" ? "High" : "Medium"}</span>}
        </div>

        <h1 className="mt-2 text-[22px] font-bold leading-[1.45] tracking-[-0.01em] text-ink">{event.title}</h1>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {primary && (
            <a
              href={primary.href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex h-[30px] items-center gap-[6px] rounded-full bg-ink px-3 text-[12.5px] font-semibold text-panel transition hover:opacity-85"
            >
              打开原文
              <ArrowUpRight size={13} aria-hidden />
            </a>
          )}
          {study && (
            <Link
              href={`/studies/${study.id}`}
              className="inline-flex h-[30px] items-center rounded-full border border-line bg-panel px-3 text-[12.5px] text-ink-2 transition hover:border-accent hover:text-accent-ink"
            >
              研究证据
            </Link>
          )}
          <DownloadButton
            filename={`mced-${event.id.replace(/[^\w-]+/g, "_").slice(0, 60)}.md`}
            content={eventMarkdown(event, SITE_URL)}
            label="导出 Markdown"
          />
          <StarButton
            id={event.id}
            title={event.title}
            source={[event.company, event.product].filter(Boolean).join(" · ")}
            date={event.date}
            className="border border-line bg-panel"
          />
        </div>

        {event.summary && <p className="mt-5 text-[15px] leading-[1.85] text-ink-2">{event.summary}</p>}

        {event.why && (
          <p className="mt-4 border-l-2 border-accent pl-3 text-[14px] leading-[1.75] text-ink-2">{event.why}</p>
        )}

        {breakdown && (
          <dl className="mt-5 grid grid-cols-4 divide-x divide-line overflow-hidden rounded-xl border border-line bg-panel">
            {[
              { label: "重要性", value: `${breakdown.total}`, max: 100 },
              { label: "竞争相关性", value: `${breakdown.relevance}`, max: 30 },
              { label: "竞争影响", value: `${breakdown.impact}`, max: 50 },
              { label: "行动价值", value: `${breakdown.actionability}`, max: 20 },
            ].map((cell) => (
              <div key={cell.label} className="px-3 py-3 text-center">
                <dd className="text-[18px] font-bold leading-none tabular-nums text-ink">
                  {cell.value}
                  <span className="text-[11px] font-normal text-ink-3"> / {cell.max}</span>
                </dd>
                <dt className="mt-[6px] text-[11.5px] text-ink-3">{cell.label}</dt>
              </div>
            ))}
          </dl>
        )}

        <section className="mt-6">
          <SectionTitle>信源</SectionTitle>
          {evidence.length > 0 ? (
            <Panel>
              <ul className="divide-y divide-line">
                {evidence.map((item) => {
                  const tier = story?.evidence_summary?.find((entry) => entry.id === item.id)?.tier;
                  return (
                    <li key={item.id} className="flex items-start gap-3 px-4 py-[10px]">
                      <span className="mt-[2px] w-[34px] shrink-0 text-[11.5px] text-ink-3">{tier ? TIER_LABEL[tier] ?? tier : ""}</span>
                      <div className="min-w-0 flex-1">
                        <a
                          href={safeHttpUrl(item.url) ?? "#"}
                          target="_blank"
                          rel="noreferrer noopener"
                          className="text-[13.5px] leading-[1.55] text-ink transition hover:text-accent-ink"
                        >
                          {item.title}
                          <ArrowUpRight size={12} aria-hidden className="ml-1 inline opacity-50" />
                        </a>
                        <div className="mt-[2px] text-[11.5px] text-ink-3">
                          {(item.editorial_owner || item.source || hostOf(item.url)).replace(/^www\./, "")}
                          {item.published_at ? ` · ${item.published_at.slice(0, 10)}` : ""}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </Panel>
          ) : event.links.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {event.links.map((link) => (
                <SourceLink key={link.href + link.label} link={link} className="px-[10px] py-[3px] text-[12.5px]" />
              ))}
            </div>
          ) : (
            <p className="text-[13px] text-ink-3">该节点暂无可公开核对的信源</p>
          )}
        </section>

        {content && (
          <details className="mt-6 rounded-xl border border-line bg-panel">
            <summary className="px-4 py-3 text-[13px] font-semibold text-ink">抓回正文</summary>
            <div className="prose-mc border-t border-line px-4 py-4">
              <Markdown>{content}</Markdown>
            </div>
          </details>
        )}
      </article>

      {related.length > 0 && event.companyId && (
        <section className="mt-9">
          <SectionTitle href={`/companies/${event.companyId}`} more="企业档案">
            {event.company}
          </SectionTitle>
          <Panel className="px-4">
            {related.map((item) => (
              <EventRow key={item.id} event={item} dateStyle="full" dense />
            ))}
          </Panel>
        </section>
      )}
    </div>
  );
}
