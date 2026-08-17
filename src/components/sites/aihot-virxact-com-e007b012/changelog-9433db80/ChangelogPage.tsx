"use client";

import { useEffect, useState } from "react";
import { History } from "lucide-react";
import { useChangelogUnread } from "../shared/use-changelog-unread";

interface ChangelogEntry {
  kind: "data" | "feature";
  title: string;
  detail: string;
  tags: string[];
}

interface ChangelogGroup {
  date: string;
  weekday: string;
  entries: ChangelogEntry[];
}

interface ChangelogFile {
  generated_at: string;
  groups: ChangelogGroup[];
}/** 徽章色调：与站点 color-mix 徽章一致；未列出的 tag 用中性色 */
const TAG_TONES: Record<string, string> = {
  "数据更新": "bg-[color-mix(in_srgb,var(--accent-emerald)_12%,transparent)] text-mc-emerald-fg","功能更新": "bg-[color-mix(in_srgb,var(--accent-cyan)_10%,transparent)] text-mc-cyan-fg","里程碑": "bg-[color-mix(in_srgb,var(--accent-amber)_14%,transparent)] text-mc-amber-fg",};
const TAG_FALLBACK = "bg-mc-surface2 text-mc-ink1";
const TAG_BASE =
  "inline-flex items-center rounded-[3px] px-[7px] py-[3px] text-[10.5px] leading-none font-semibold tracking-[0.04em]";
const CODE_CLASS = "rounded bg-mc-surface2 px-[5px] py-[1px] text-[11.5px]";

/** "2026-08-17" + "星期一" → "2026年8月17日 星期一" */
function fmtGroupDate(date: string, weekday: string) {
  const [y, m, d] = date.split("-").map((s) => Number.parseInt(s, 10));
  if (!y || !m || !d) return `${date} ${weekday}`;
  return `${y}年${m}月${d}日 ${weekday}`;
}/**
 * 更新日志页 — 日期分组式(参照模板站 / changelog)。
 * 数据源 public/changelog.json，由 scripts/build-changelog.mjs 生成。
 */
export function ChangelogPage() {
  const [data, setData] = useState<ChangelogFile | null>(null);
  const [failed, setFailed] = useState(false);
  const { markSeen } = useChangelogUnread();

  useEffect(() => {
    fetch("/changelog.json",{ cache: "no-store" })
      .then((res) => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        return res.json();
      })
      .then((json) => {
        setData(json as ChangelogFile);
        // 用户已打开更新日志：消除侧栏红点
        markSeen();
      })
      .catch(() => setFailed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  },[]);

  const groups = data?.groups ?? [];
  const empty = failed || (data !== null && groups.length === 0);

  return (
    <div className="grid gap-4">
      <header className="pt-[6px]">
        <h1 className="m-0 text-[23px] font-bold leading-[1.2] tracking-[-0.01em] text-mc-ink">
          更新日志
        </h1>
        <p className="mt-[5px] max-w-[700px] text-[12px] leading-[1.6] text-mc-ink2">
          本项目数据更新与功能更新的自动化记录。数据更新由监测脚本每日运行后自动生成；功能更新随施工追加。
        </p>
        <hr className="mt-[10px] mb-[8px] border-0 border-t border-mc-line-soft" />
      </header>

      {empty ? (
        <div className="rounded-xl border border-dashed border-mc-emphasis bg-mc-surface0 p-[28px_20px] text-center">
          <History size={18} className="mx-auto text-mc-ink2" />
          <p className="mt-[10px] text-[14px] font-semibold text-mc-ink">
            还没有更新记录
          </p>
          <p className="mx-auto mt-2 max-w-[520px] text-[12.5px] leading-[1.7] text-mc-ink1">
            本页数据来自 <code className={CODE_CLASS}>public/changelog.json</code>
            ，尚未生成。请先运行 <code className={CODE_CLASS}>npm run changelog</code>{" "}
            生成；数据更新条目取自{" "}
            <code className={CODE_CLASS}>scripts/monitor-history.jsonl</code>。
          </p>
        </div>
      ) : groups.length === 0 ? (
        <p className="m-0 text-[12px] text-mc-ink2">加载中…</p>
      ) : (
        groups.map((group) => (
          <section key={group.date} className="grid content-start gap-[10px]">
            <h2 className="m-0 text-[15px] font-extrabold text-mc-ink">
              {fmtGroupDate(group.date, group.weekday)}
            </h2>
            <div className="grid gap-[10px]">
              {group.entries.map((entry, index) => (
                <article
                  key={`${group.date}-${index}`}
                  className="rounded-xl border border-mc-line bg-mc-card p-[14px_16px] shadow-mc-card"
                >
                  <div className="flex flex-wrap items-center gap-[6px]">
                    {entry.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`${TAG_BASE} ${TAG_TONES[tag] ?? TAG_FALLBACK}`}
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                  <h3 className="m-0 mt-[8px] text-[14px] font-bold leading-[1.5] text-mc-ink">
                    {entry.title}
                  </h3>
                  <p className="m-0 mt-[6px] text-[12.5px] leading-[1.7] text-mc-ink1">
                    {entry.detail}
                  </p>
                </article>
              ))}
            </div>
          </section>
        ))
      )}

      <aside className="rounded-xl border border-mc-line bg-mc-card p-[14px_16px] shadow-mc-card">
        <p className="m-0 text-[12.5px] leading-[1.9] text-mc-ink1">
          自动化链路：<code className={CODE_CLASS}>npm run monitor</code> →{" "}
          <code className={CODE_CLASS}>scripts/monitor-history.jsonl</code> →{" "}
          <code className={CODE_CLASS}>npm run changelog</code> →{" "}
          <code className={CODE_CLASS}>public/changelog.json</code>
          。功能更新条目维护在{" "}
          <code className={CODE_CLASS}>scripts/changelog-features.json</code>
          ，随施工追加后重新生成即可。
        </p>
      </aside>
    </div>
  );
}
