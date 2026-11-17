import type { Metadata } from "next";
import { Suspense } from "react";
import { ArrowUpRight } from "lucide-react";
import { AgentTabs } from "@/components/agent/AgentTabs";
import { PageHeader } from "@/components/ui";
import { cstDate } from "@/lib/dates";
import { MCP_SERVER_VERSION, MCP_TOOLS } from "@/lib/mcp-tools";
import { monitorHealth, readMonitorReport, type MonitorHealth } from "@/lib/monitor-report";
import { SITE_URL } from "@/lib/url";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Agent 接入" };

const ORIGIN = (process.env.NEXT_PUBLIC_SITE_ORIGIN ?? SITE_URL).replace(/\/$/, "");

const HEALTH_TEXT: Record<MonitorHealth, string> = {
  ok: "监测正常",
  degraded: "部分信源缺口",
  held: "发布暂停",
  down: "采集中断",
  unknown: "监测状态未知",
};

const FILES = [
  { label: "llms.txt", href: "/llms.txt" },
  { label: "SKILL.md", href: "/mced-skill/SKILL.md" },
  { label: "README", href: "/mced-skill/README.md" },
];

export default async function AgentPage() {
  const report = await readMonitorReport();
  const health = monitorHealth(report).state;
  const tools = MCP_TOOLS.map(({ name, description }) => ({ name, description }));

  return (
    <div className="max-w-[900px]">
      <PageHeader title="Agent 接入">
        {FILES.map((file) => (
          <a
            key={file.href}
            href={file.href}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-[3px] text-[12.5px] text-ink-2 transition hover:text-accent-ink"
          >
            {file.label}
            <ArrowUpRight size={12} aria-hidden className="opacity-60" />
          </a>
        ))}
      </PageHeader>

      <div className="mb-5 flex flex-wrap items-center gap-2 text-[11.5px] font-semibold">
        {["匿名只读", "REST v1", `MCP ${MCP_SERVER_VERSION}`].map((badge) => (
          <span key={badge} className="rounded-[5px] bg-sunken px-2 py-[2px] text-ink-2">
            {badge}
          </span>
        ))}
        <span
          className={cn(
            "inline-flex items-center gap-[6px] rounded-[5px] px-2 py-[2px]",
            health === "ok" ? "bg-accent-soft text-accent-ink" : "bg-warn-soft text-warn"
          )}
        >
          <span aria-hidden className="size-[6px] rounded-full bg-current" />
          {HEALTH_TEXT[health]}
          {report && <span className="font-normal tabular-nums">· {cstDate(report.generated_at)}</span>}
        </span>
      </div>

      <Suspense>
        <AgentTabs origin={ORIGIN} tools={tools} />
      </Suspense>
    </div>
  );
}
