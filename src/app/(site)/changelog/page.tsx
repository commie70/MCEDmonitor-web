import type { Metadata } from "next";
import { readFile } from "node:fs/promises";
import path from "node:path";
import { Empty, PageHeader, Panel } from "@/components/ui";
import { fullDate } from "@/lib/dates";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "更新日志" };

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

const TAG_TONE: Record<string, string> = {
  数据更新: "bg-accent-soft text-accent-ink",
  功能更新: "bg-sunken text-ink-2",
  里程碑: "bg-self-soft text-self",
  采集异常: "bg-warn-soft text-warn",
  发布暂停: "bg-warn-soft text-warn",
};

/** public/changelog.json 由 scripts/build-changelog.mjs 在每次监测运行后生成。 */
async function readChangelog(): Promise<ChangelogGroup[]> {
  try {
    const raw = await readFile(path.join(process.cwd(), "public", "changelog.json"), "utf8");
    const groups = (JSON.parse(raw) as { groups?: ChangelogGroup[] }).groups;
    return Array.isArray(groups) ? groups : [];
  } catch {
    return [];
  }
}

export default async function ChangelogPage() {
  const groups = await readChangelog();

  return (
    <div className="max-w-[900px]">
      <PageHeader title="更新日志" />
      {groups.length ? (
        <ol className="grid gap-6">
          {groups.map((group) => (
            <li key={group.date} className="grid grid-cols-1 gap-2 sm:grid-cols-[132px_minmax(0,1fr)] sm:gap-4">
              <time dateTime={group.date} className="pt-[2px] text-[13px] font-bold tabular-nums text-ink sm:sticky sm:top-4 sm:self-start">
                {fullDate(group.date)}
                <span className="ml-2 font-normal text-ink-3 sm:ml-0 sm:block">{group.weekday}</span>
              </time>
              <Panel className="divide-y divide-line">
                {group.entries.map((entry, index) => (
                  <article key={index} className="px-4 py-3">
                    <div className="flex flex-wrap items-baseline gap-x-2 gap-y-1">
                      {entry.tags.map((tag) => (
                        <span
                          key={tag}
                          className={cn(
                            "rounded-[4px] px-[6px] py-px text-[11px] font-semibold leading-[18px]",
                            TAG_TONE[tag] ?? "bg-sunken text-ink-2"
                          )}
                        >
                          {tag}
                        </span>
                      ))}
                      <h2 className="text-[14px] font-semibold leading-[1.5] text-ink">{entry.title}</h2>
                    </div>
                    {entry.detail && <p className="mt-1 text-[12.5px] leading-[1.7] text-ink-2 [overflow-wrap:anywhere]">{entry.detail}</p>}
                  </article>
                ))}
              </Panel>
            </li>
          ))}
        </ol>
      ) : (
        <Empty>还没有更新记录</Empty>
      )}
    </div>
  );
}
