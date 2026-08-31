import type { MonitorReport, MonitorStory } from "./monitor-report";
import type {
  CategoryKey,
  DayGroupDef,
  HotEvent,
  NewsItem,
  SourceType,
} from "./types";

const CATEGORY_BY_EVENT_TYPE: Record<string, CategoryKey> = {
  regulatory_decision: "regulatory",
  clinical_readout: "clinical",
  publication: "publication",
  conference_disclosure: "conference",
  product_launch: "product",
  partnership: "funding",
  corporate: "funding",
  other: "opinion",
};

const SOURCE_TYPE_MAP: Record<string, SourceType> = {
  official: "official",
  journal: "journal",
  conference: "conference",
  regulator: "regulator",
  social: "social",
  media: "media",
};

function storyDate(story: MonitorStory): string {
  return String(story.occurred_at || story.published_at || story.last_seen || "").slice(0, 10);
}

function storyTime(story: MonitorStory): string {
  const value = story.discovered_at || story.published_at || story.occurred_at;
  if (!value) return "00:00";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "00:00";
  return new Intl.DateTimeFormat("zh-CN", {
    timeZone: "Asia/Shanghai",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).format(date);
}

export function monitorStoryToNewsItem(story: MonitorStory): NewsItem {
  const lead = story.items[0];
  const eventType = story.event_type || "other";
  return {
    id: lead?.id || story.id,
    date: storyDate(story),
    time: storyTime(story),
    source: `${story.company} · ${lead?.source || "多信源"}`,
    url: lead?.url,
    sourceType: SOURCE_TYPE_MAP[lead?.source_type || "media"] || "media",
    category: CATEGORY_BY_EVENT_TYPE[eventType] || "opinion",
    featured:
      story.level === "L1" ||
      story.level === "L2" ||
      (story.level === undefined && story.score >= 60),
    score: story.score,
    publicationState: story.publication_state,
    level: story.level,
    evidenceConfidence: story.evidence_confidence,
    scoreBreakdown: story.score_breakdown,
    reviewStatus: story.review_status,
    title: story.title,
    summary: story.summary ? [story.summary] : [],
    otherSources: Math.max(0, story.sources_count - 1),
    reason: story.reason,
    tags: [story.company, story.product, eventType, story.level, story.evidence_confidence].filter(
      (value): value is string => Boolean(value)
    ),
  };
}

export function monitorStoryToHotEvent(story: MonitorStory): HotEvent {
  const lead = story.items[0];
  const eventDate = storyDate(story);
  const ageDays = eventDate
    ? Math.max(0, Math.floor((Date.now() - Date.parse(eventDate)) / 86_400_000))
    : null;
  return {
    id: lead?.id || story.id,
    title: story.title,
    badge: story.badges[0],
    stale: story.stale_month,
    source: `${story.company} · ${lead?.source || "多信源"}`,
    ago: ageDays === null ? "时间不详" : ageDays === 0 ? "今天" : `${ageDays}天前`,
    heat: story.score,
    level: story.level,
    evidenceConfidence: story.evidence_confidence,
    spark: story.spark,
    sources: story.sources_count,
  };
}

export function monitorStoriesForView(
  report: MonitorReport,
  view: "daily" | "hot" | "all"
): MonitorStory[] {
  const viewKeys = {
    daily: "daily_event_ids",
    hot: "hot_event_ids",
    all: "all_event_ids",
  } as const;
  const ids = report.views?.[viewKeys[view]];
  if (!ids) return report.stories;
  const byId = new Map(report.stories.map((story) => [story.id, story]));
  return ids.map((id) => byId.get(id)).filter((story): story is MonitorStory => Boolean(story));
}

export function monitorDayGroups(items: NewsItem[]): DayGroupDef[] {
  return [...new Set(items.map((item) => item.date).filter(Boolean))]
    .sort((a, b) => b.localeCompare(a))
    .map((date) => {
      const parsed = new Date(`${date}T12:00:00+08:00`);
      return {
        date,
        label: new Intl.DateTimeFormat("zh-CN", {
          timeZone: "Asia/Shanghai",
          month: "numeric",
          day: "numeric",
        }).format(parsed),
        weekday: new Intl.DateTimeFormat("zh-CN", {
          timeZone: "Asia/Shanghai",
          weekday: "long",
        }).format(parsed),
      };
    });
}
