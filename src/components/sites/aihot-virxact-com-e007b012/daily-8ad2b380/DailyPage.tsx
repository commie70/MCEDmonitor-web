"use client";

import { useEffect, useMemo, useState } from "react";
import { ExternalLink, RefreshCw, SearchCheck } from "lucide-react";
import { cn } from "@/lib/utils";

interface MonitorItem {
  id: string;
  company: string;
  product: string;
  category: "regulatory" | "academic" | "research" | "market";
  title: string;
  source: string;
  date: string;
  url: string;
  note?: string;
}

interface ManualTask {
  company: string;
  channel: string;
  category: string;
  label: string;
  url: string;
}

interface StoryItem {
  id: string;
  category: string;
  channel: string;
  title: string;
  source: string;
  date: string;
  url: string;
  note?: string;
}

interface Story {
  id: string;
  company: string;
  product: string;
  title: string;
  heat:number;
  badges: ("爆" | "新" | "发酵中")[];
  /** 「旧文」月份(YYYY-MM，最新可推断证据早于监测窗口起点) */
  stale_month?: string | null;
  sources_count:number;
  categories: string[];
  last_seen: string;
  spark:number[];
  items: StoryItem[];
  summary?: string;
  score?:number;
  reason?: string;
}

interface MonitorDigest {
  markdown: string;
  model: string;
  generated_at: string;
}

interface MonitorReport {
  generated_at: string;
  window_since: string;
  watches:number;
  categories:{ key: MonitorItem["category"]; label: string; count:number }[];
  items: MonitorItem[];
  stories: Story[];
  digest: MonitorDigest | null;
  manual_tasks: ManualTask[];
  errors:{ company: string; channel: string; message: string }[];
}

const CATEGORY_META: Record<
  MonitorItem["category"],{ label: string; tone: string; desc: string }
> = {
  regulatory:{
    label: "报证审批",
    tone: "bg-[color-mix(in_srgb,var(--accent-emerald)_12%,transparent)] text-mc-emerald-fg",
    desc: "openFDA 器械数据库(PMA / De Novo)自动命中 + NMPA / CMDE 人工核查通道",},academic:{
    label: "学术动态",
    tone: "bg-[color-mix(in_srgb,var(--accent-cyan)_10%,transparent)] text-mc-cyan-fg",
    desc: "ASCO / ESMO / AACR 摘要检索通道(会议摘要无开放接口，每日生成检索链接)",}, research:{
    label: "新研究",
    tone: "bg-[color-mix(in_srgb,var(--accent-amber)_14%,transparent)] text-mc-amber-fg",
    desc: "PubMed(NCBI E-utilities)按公司 / 产品检索式自动监测",}, market:{
    label: "市场动态",
    tone: "bg-[color-mix(in_srgb,var(--accent-rose)_10%,transparent)] text-mc-rose-fg",
    desc: "Google News RSS 按公司 / 产品检索词自动监测",},};

const CATEGORY_ORDER: MonitorItem["category"][] = [
  "regulatory",
  "academic",
  "research",
  "market",
];

function fmtDateTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  const pad = (n:number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}/** 故事主类别：按 报证>学术>研究>市场 优先级归属 */
function primaryCategory(story: Story): MonitorItem["category"] {
  for (const key of CATEGORY_ORDER) {
    if (story.categories?.includes?.(key)) return key;
  }
  return "market";
}

export function DailyPage() {
  const [report, setReport] = useState<MonitorReport | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    fetch("/monitor/daily-report.json",{ cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => setReport(json as MonitorReport))
      .catch(() => setFailed(true));
  },[]);

  const items = report?.items ?? [];

  const storiesByCategory = useMemo(() => {
    const map: Record<MonitorItem["category"], Story[]> = {
      regulatory: [],academic: [],
      research: [],
      market: [],};
    for (const story of report?.stories ?? []) {
      map[primaryCategory(story)].push(story);
    }
    return map;
  },[report]);

  const scrollToCategory = (key: string) => {
    document
      .getElementById(`cat-${key}`)
      ?.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const manualCompanies = useMemo(() => {
    if (!report) return [];
    const map = new Map<string, ManualTask[]>();
    for (const t of report.manual_tasks) {
      const list = map.get(t.company) || [];
      list.push(t);
      map.set(t.company, list);
    }
    return [...map.entries()];
  },[report]);

  return (
    <div className="grid gap-4">
      <header className="pt-[6px]">
        <h1 className="m-0 text-[23px] font-bold leading-[1.2] tracking-[-0.01em] text-mc-ink">
          监测日报
        </h1>
        <p className="mt-[5px] max-w-[900px] text-[12px] leading-[1.6] text-mc-ink2">
          每日自动监测竞品榜 19 家企业与行业总览：报证审批、学术动态、新研究、市场动态。
          {report
            ? `本期窗口 ${report.window_since} 至今 · 生成于 ${fmtDateTime(report.generated_at)} · 监测 ${report.watches} 个对象`
            : "正在读取最新监测报告…"}
        </p>
        <hr className="mt-[10px] mb-[8px] border-0 border-t border-mc-line-soft" />
      </header>

      {failed && (
        <div className="rounded-xl border border-dashed border-mc-emphasis bg-mc-surface0 p-[28px_20px] text-center">
          <p className="text-[14px] font-semibold text-mc-ink">还没有监测报告</p>
          <p className="mx-auto mt-2 max-w-[560px] text-[12.5px] leading-[1.7] text-mc-ink1">
            在项目根目录运行{" "}
            <code className="rounded bg-mc-surface2 px-[6px] py-[2px] text-[12px] text-mc-ink">
              npm run monitor
            </code>{" "}
            生成首份日报(PubMed + Google News + openFDA 三路自动监测，增量窗口自动续跑)，页面会自动读取{" "}
            <code className="rounded bg-mc-surface2 px-[6px] py-[2px] text-[12px] text-mc-ink">
              public/monitor/daily-report.json
            </code>
            。
          </p>
        </div>
      )}

      {report && (
        <>
          {/* 分类统计卡(页内锚点跳转) */}
          <div className="grid grid-cols-4 gap-[14px] max-[960px]:grid-cols-2">
            {CATEGORY_ORDER.map((key) => {
              const meta = CATEGORY_META[key];
              const count =
                report.categories.find((c) => c.key === key)?.count ?? 0;
              return (
                <a
                  key={key}
                  href={`#cat-${key}`}
                  onClick={(e) => {
                    e.preventDefault();
                    scrollToCategory(key);
                  }}
                  className="rounded-xl border border-mc-line bg-mc-card p-[14px] text-left shadow-mc-card transition hover:border-mc-line-strong"
                >
                  <div className="flex items-center justify-between">
                    <span
                      className={cn(
                        "rounded-[5px] px-[8px] py-[2px] text-[11px] font-bold",
                        meta.tone
                      )}
                    >
                      {meta.label}
                    </span>
                    <span className="text-[24px] font-extrabold leading-none text-mc-ink">
                      {count}
                    </span>
                  </div>
                  <p className="mt-[8px] text-[11px] leading-[1.5] text-mc-ink2">
                    {meta.desc}
                  </p>
                </a>
              );
            })}
          </div>

          {/* AI 日报 */}
          {report.digest?.markdown && (
            <section className="rounded-xl border border-mc-line bg-mc-card p-[16px_18px] shadow-mc-card">
              <div className="flex items-center gap-[10px]">
                <span className="rounded-[5px] bg-[color-mix(in_srgb,var(--accent-cyan)_10%,transparent)] px-[8px] py-[2px] text-[11px] font-bold text-mc-cyan-fg">
                  AI 日报
                </span>
                <span className="text-[11px] text-mc-ink2">
                  {report.digest.model} 生成 · 引用数字请回原文核对
                </span>
              </div>
              <p className="mt-[10px] whitespace-pre-line text-[13.5px] leading-[1.8] text-mc-ink1">
                {report.digest.markdown}
              </p>
            </section>
          )}

          {/* 故事线聚类(L1)+ AI 研判(L2)：按四类分板块，锚点承接统计卡 */}
          {CATEGORY_ORDER.map((key) => {
            const meta = CATEGORY_META[key];
            const stories = storiesByCategory[key];
            return (
              <section
                key={key}
                id={`cat-${key}`}
                className="scroll-mt-4 rounded-xl border border-mc-line bg-mc-card shadow-mc-card"
              >
                <div className="flex items-center gap-[10px] border-b border-mc-line-soft px-4 py-[11px]">
                  <span
                    className={cn(
                      "rounded-[5px] px-[8px] py-[2px] text-[11px] font-bold",
                      meta.tone
                    )}
                  >
                    {meta.label}
                  </span>
                  <span className="text-[12px] text-mc-ink2">
                    {stories.length} 条故事线 · 按热度排序 · 摘要 / 评分由 AI 生成
                  </span>
                </div>
                {stories.length === 0 && (
                  <p className="p-[20px] text-center text-[12.5px] text-mc-ink2">
                    本窗口内该类别暂无故事线命中。
                  </p>
                )}
                <ul className="m-0 list-none p-[4px_0_6px]">
                  {stories.slice(0, 12).map((story) => (
                    <li
                      key={story.id}
                      className="px-4 py-[12px] transition-colors hover:bg-mc-surface0"
                    >
                      <div className="flex items-start gap-[12px]">
                        <div className="w-[52px] flex-none text-center">
                          <span className="text-[18px] font-extrabold tabular-nums leading-none text-mc-cyan">
                            {story.heat}
                          </span>
                          <span className="mt-[2px] block text-[10px] text-mc-ink2">热度</span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-[8px]">
                            <a
                              href={story.items[0]?.url}
                              target="_blank"
                              rel="noreferrer"
                              className="text-[14px] font-bold leading-[1.5] text-mc-ink transition-colors hover:text-mc-cyan-fg"
                            >
                              {story.title}
                            </a>
                            {story.stale_month && (
                              <span
                                className="rounded-[4px] bg-[color-mix(in_srgb,var(--accent-rose)_12%,transparent)] px-[7px] py-[1px] text-[10.5px] font-bold text-mc-rose-fg"
                                title="该故事线最新可推断时间早于当前监测窗口，为旧文"
                              >
                                旧 · {story.stale_month}
                              </span>
                            )}
                            {story.badges.map((b) => (
                              <span
                                key={b}
                                className="rounded-[4px] bg-[color-mix(in_srgb,var(--accent-amber)_14%,transparent)] px-[7px] py-[1px] text-[10.5px] font-bold text-mc-amber-fg"
                              >
                                {b}
                              </span>
                            ))}
                            {typeof story.score === "number" && story.score > 0 && (
                              <span className="rounded-[4px] bg-[color-mix(in_srgb,var(--accent-emerald)_12%,transparent)] px-[7px] py-[1px] text-[10.5px] font-bold text-mc-emerald-fg">
                                相关性 {story.score}
                              </span>
                            )}
                          </div>
                          <div className="mt-[3px] text-[11.5px] text-mc-ink2">
                            {story.company} · {story.product} · {story.sources_count} 家信源
                            {story.last_seen && ` · 最新 ${story.last_seen}`}
                          </div>
                          {story.summary && (
                            <p className="mt-[6px] text-[12.5px] leading-[1.65] text-mc-ink1">
                              {story.summary}
                            </p>
                          )}
                          {story.reason && (
                            <p className="mt-[6px] text-[12px] leading-[1.6] text-mc-note">
                              <span className="font-bold">关注理由：</span>
                              {story.reason}
                            </p>
                          )}
                          {story.sources_count > 1 && (
                            <div className="mt-[6px] text-[11.5px] text-mc-ink2">
                              另有 {story.sources_count - 1} 家信源报道：{story.items.slice(1, 4).map((it) => (
                                <a
                                  key={it.id}
                                  href={it.url}
                                  target="_blank"
                                  rel="noreferrer"
                                  className="ml-[6px] text-mc-cyan-fg hover:underline"
                                >
                                  {it.source}
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            );
          })}

          {/* 命中条目 */}
          <section className="rounded-xl border border-mc-line bg-mc-card shadow-mc-card">
            <div className="flex items-center gap-[10px] border-b border-mc-line-soft px-4 py-[11px]">
              <span className="text-[15px] font-extrabold tracking-[0.04em] text-mc-ink">
                本期命中
              </span>
              <span className="text-[12px] text-mc-ink2">
                {items.length} 条原始命中(未聚类)
              </span>
            </div>
            {items.length === 0 && (
              <p className="p-[28px_20px] text-center text-[13px] text-mc-ink1">
                本窗口内该类别无新增命中；会议摘要与 NMPA 动态请走下方人工核查通道。
              </p>
            )}
            <ul className="m-0 list-none p-[4px_0_6px]">
              {items.map((item) => (
                <li
                  key={item.id}
                  className="flex items-start gap-[12px] px-4 py-[10px] transition-colors hover:bg-mc-surface0"
                >
                  <span
                    className={cn(
                      "mt-[2px] shrink-0 rounded-[5px] px-[7px] py-[2px] text-[10.5px] font-bold whitespace-nowrap",
                      CATEGORY_META[item.category].tone
                    )}
                  >
                    {CATEGORY_META[item.category].label}
                  </span>
                  <div className="min-w-0 flex-1">
                    <a
                      href={item.url}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-start gap-[5px] text-[14px] font-semibold leading-[1.5] text-mc-ink transition-colors hover:text-mc-cyan-fg"
                    >
                      <span className="min-w-0">{item.title}</span>
                      <ExternalLink size={13} className="mt-[3px] shrink-0 opacity-60" />
                    </a>
                    <div className="mt-[4px] flex flex-wrap items-center gap-x-[10px] gap-y-[2px] text-[11.5px] text-mc-ink2">
                      <span className="font-semibold text-mc-ink1">
                        {item.company}
                      </span>
                      <span>{item.product}</span>
                      <span>{item.source}</span>
                      {item.note && <span>{item.note}</span>}
                    </div>
                  </div>
                  <span className="shrink-0 text-[12px] tabular-nums text-mc-ink2">
                    {item.date}
                  </span>
                </li>
              ))}
            </ul>
          </section>

          {/* 人工核查通道 */}
          <section className="rounded-xl border border-mc-line bg-mc-card shadow-mc-card">
            <div className="flex items-center gap-[10px] border-b border-mc-line-soft px-4 py-[11px]">
              <SearchCheck size={16} className="text-mc-ink1" />
              <span className="text-[15px] font-extrabold tracking-[0.04em] text-mc-ink">
                待人工核查通道
              </span>
              <span className="text-[12px] text-mc-ink2">
                NMPA 与会议摘要无开放接口，按公司生成当日检索链接(覆盖 报证审批 / 学术动态)
              </span>
            </div>
            <ul className="m-0 list-none p-[4px_0_6px]">
              {manualCompanies.map(([company, tasks]) => (
                <li
                  key={company}
                  className="flex flex-wrap items-center gap-[8px] px-4 py-[7px] transition-colors hover:bg-mc-surface0"
                >
                  <span className="w-[120px] shrink-0 truncate text-[12.5px] font-semibold text-mc-ink">
                    {company}
                  </span>
                  {tasks.map((t) => (
                    <a
                      key={t.channel}
                      href={t.url}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-full border border-mc-line-strong bg-mc-card px-[10px] py-[3px] text-[11.5px] text-mc-ink1 transition-colors hover:border-mc-emphasis hover:text-mc-cyan-fg"
                      title={t.label}
                    >
                      {t.channel}
                    </a>
                  ))}
                </li>
              ))}
            </ul>
          </section>

          {/* 信源与自动化说明 */}
          <section className="rounded-xl border border-mc-line bg-mc-card p-[14px_16px] shadow-mc-card">
            <div className="flex items-center gap-[8px] text-[13px] font-bold text-mc-ink">
              <RefreshCw size={14} className="text-mc-ink1" />
              信源与每日自动化
            </div>
            <ul className="mt-[8px] list-none space-y-[4px] text-[12px] leading-[1.7] text-mc-ink1">
              <li>
                · 自动信道： NCBI E-utilities(PubMed，新研究)、Google News
                RSS(市场动态)、openFDA 器械库(报证审批，限有 FDA 路径公司)；
                会议摘要与 NMPA 走人工核查通道。
              </li>
              <li>
                · 增量机制：水位记在{" "}
                <code className="rounded bg-mc-surface2 px-[5px] py-[1px] text-mc-ink">
                  scripts/monitor-state.json
                </code>
                ，每次运行自上次成功时间起算；可用{" "}
                <code className="rounded bg-mc-surface2 px-[5px] py-[1px] text-mc-ink">
                  npm run monitor -- --days 14
                </code>{" "}
                手动回补窗口。
              </li>
              <li>
                · 每日定时(macOS cron 示例， 06:47 自动跑):{" "}
                <code className="break-all rounded bg-mc-surface2 px-[5px] py-[1px] text-mc-ink">
                  47 6 * * * cd 项目目录 && /usr/bin/env node
                  scripts/mced-daily-monitor.mjs
                </code>
              </li>
              <li>
                · 监测对象与检索式维护在{" "}
                <code className="rounded bg-mc-surface2 px-[5px] py-[1px] text-mc-ink">
                  scripts/monitor-sources.json
                </code>
                (竞品榜 19 家 + 行业总览)。
              </li>
            </ul>
            {report.errors.length > 0 && (
              <p className="mt-[8px] text-[11.5px] text-mc-rose-fg">
                本次运行 {report.errors.length} 个信道报错(详见报告 JSON errors 字段)。
              </p>
            )}
          </section>
        </>
      )}
    </div>
  );
}
