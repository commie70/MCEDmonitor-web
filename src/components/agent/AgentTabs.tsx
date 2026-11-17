"use client";

import Link from "next/link";
import { ChevronRight } from "lucide-react";
import type { ReactNode } from "react";
import { CopyButton } from "@/components/actions";
import { useQueryState } from "@/hooks/use-query-state";
import { cn } from "@/lib/utils";

export interface AgentTool {
  name: string;
  description: string;
}

type TabKey = "skill" | "mcp" | "rss" | "rest";

const TABS: { key: TabKey; label: string }[] = [
  { key: "skill", label: "Agent Skill" },
  { key: "mcp", label: "MCP" },
  { key: "rss", label: "RSS" },
  { key: "rest", label: "REST API" },
];

const REST_ENDPOINTS: { path: string; desc: string }[] = [
  { path: "/api/v1/events", desc: "统一事件时间线；?company= &kind= &level= &since= &q=" },
  { path: "/api/v1/companies", desc: "企业摘要：路线、产品、癌种、报证状态" },
  { path: "/api/v1/companies/{id}", desc: "单家完整档案：报证节点与全部研究" },
  { path: "/api/v1/studies", desc: "研究证据；?company= &design=" },
  { path: "/api/v1/studies/{id}", desc: "单项研究：人群、性能、公开信源" },
  { path: "/api/v1/prospective", desc: "前瞻研究性能对照，不含病例对照" },
  { path: "/api/v1/mrd", desc: "MRD 产品矩阵；?approach= &tissue= &region= &category=" },
  { path: "/api/v1/sources", desc: "信源库；?kind=" },
  { path: "/api/v1/stories", desc: "监测流水线已发布事件" },
  { path: "/api/v1/items", desc: "事件证据条目；?category=" },
  { path: "/api/v1/daily", desc: "监测日报：综述与本期事件" },
];

const VERIFY_QUESTION = "过去两周早筛竞品最重要的 5 件事是什么?";

function Code({ children, copy, label }: { children: string; copy?: string; label?: string }) {
  return (
    <div className="relative mt-2 rounded-lg border border-line bg-sunken">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all py-[10px] pl-3 pr-[84px] font-mono text-[12px] leading-[1.7] text-ink">
        {children}
      </pre>
      <CopyButton text={copy ?? children} label={label} className="absolute right-2 top-[7px] h-[26px] px-[10px] text-[12px]" />
    </div>
  );
}

function Block({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="mt-5 first:mt-0">
      <h2 className="text-[13px] font-bold text-ink">{title}</h2>
      {children}
    </section>
  );
}

function Fold({ title, children }: { title: string; children: ReactNode }) {
  return (
    <details className="group rounded-lg border border-line bg-panel">
      <summary className="flex cursor-pointer list-none items-center gap-[6px] px-3 py-[9px] text-[13px] font-semibold text-ink transition hover:text-accent-ink [&::-webkit-details-marker]:hidden">
        <ChevronRight size={14} aria-hidden className="transition-transform group-open:rotate-90" />
        {title}
      </summary>
      <div className="border-t border-line px-3 pb-3 pt-1">{children}</div>
    </details>
  );
}

const inlineCode = "rounded bg-sunken px-[5px] py-px font-mono text-[11.5px] text-ink";

export function AgentTabs({ origin, tools }: { origin: string; tools: AgentTool[] }) {
  const query = useQueryState();
  const current = TABS.find((tab) => tab.key === query.get("tab"))?.key ?? "skill";

  const skillUrl = `${origin}/mced-skill/SKILL.md`;
  const mcpUrl = `${origin}/api/mcp`;
  const feedUrl = `${origin}/feed.xml`;

  const installPrompt = `请安装早筛情报站 Skill:${skillUrl}\n装完告诉我是否需要开启新会话。`;
  // 校验文件按文件名 SKILL.md 记录哈希，所以下载到独立临时目录并保留原文件名。
  const universalCmd = `tmp="$(mktemp -d)" \\
  && curl -fsSL ${skillUrl} -o "$tmp/SKILL.md" \\
  && curl -fsSL ${skillUrl}.sha256 -o "$tmp/SKILL.md.sha256" \\
  && (cd "$tmp" && shasum -a 256 -c SKILL.md.sha256) \\
  && mkdir -p ~/.agents/skills/mced-intel \\
  && mv "$tmp/SKILL.md" ~/.agents/skills/mced-intel/SKILL.md`;
  const claudeSkillCmd = `mkdir -p ~/.claude/skills \\
  && ln -sfn ~/.agents/skills/mced-intel ~/.claude/skills/mced-intel`;
  const mcpConfig = `{
  "mcpServers": {
    "mced-intel": {
      "type": "http",
      "url": "${mcpUrl}"
    }
  }
}`;
  const mcpCall = `{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_top_stories","arguments":{}}}`;

  return (
    <>
      <div role="tablist" aria-label="接入方式" className="mb-5 flex gap-5 border-b border-line">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            role="tab"
            aria-selected={current === tab.key}
            onClick={() => query.set({ tab: tab.key === "skill" ? null : tab.key })}
            className={cn(
              "-mb-px border-b-2 pb-2 pt-1 text-[13.5px] transition",
              current === tab.key
                ? "border-accent font-semibold text-accent-ink"
                : "border-transparent text-ink-2 hover:text-ink"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {current === "skill" && (
        <div role="tabpanel">
          <Block title="发给 Agent">
            <Code>{installPrompt}</Code>
          </Block>
          <Block title="新开会话后验证">
            <Code>{VERIFY_QUESTION}</Code>
          </Block>
          <div className="mt-5 grid gap-2">
            <Fold title="手动安装">
              <Block title="通用 Agent Skills(Codex / Gemini CLI / OpenCode)">
                <Code>{universalCmd}</Code>
              </Block>
              <Block title="Claude Code">
                <Code>{claudeSkillCmd}</Code>
              </Block>
              <p className="mt-3 text-[12px] leading-[1.7] text-ink-3">
                文件经 SHA-256 校验一致后才落盘；更新时重新执行同一条命令。
              </p>
            </Fold>
            <Fold title="没有触发">
              <ol className="mt-2 grid list-decimal gap-[6px] pl-5 text-[13px] leading-[1.7] text-ink-2">
                <li>
                  文件名是 <code className={inlineCode}>SKILL.md</code>，且位于当前 Agent 的 skills 目录。
                </li>
                <li>关掉旧会话，新开一个再问。</li>
                <li>
                  让 Agent 列出已发现的 skills，确认其中有 <code className={inlineCode}>mced-intel</code>。
                </li>
                <li>
                  仍然失败，到
                  <Link href="/feedback" className="mx-1 text-accent-ink hover:underline">
                    反馈
                  </Link>
                  说明平台、版本与安装路径。
                </li>
              </ol>
            </Fold>
          </div>
        </div>
      )}

      {current === "mcp" && (
        <div role="tabpanel">
          <Block title="Streamable HTTP · 匿名只读">
            <Code label="复制地址">{mcpUrl}</Code>
          </Block>
          <Block title="通用配置">
            <Code>{mcpConfig}</Code>
          </Block>
          <Block title="Codex">
            <Code>{`codex mcp add mced-intel --url '${mcpUrl}'`}</Code>
          </Block>
          <Block title="Claude Code">
            <Code>{`claude mcp add --transport http mced-intel '${mcpUrl}'`}</Code>
          </Block>
          <Block title={`${tools.length} 个工具`}>
            <ul className="mt-2 grid gap-2 sm:grid-cols-2">
              {tools.map((tool) => (
                <li key={tool.name} className="rounded-lg border border-line bg-panel px-3 py-2">
                  <code className="font-mono text-[12px] font-bold text-accent-ink">{tool.name}</code>
                  <p className="mt-[3px] text-[12px] leading-[1.6] text-ink-2">{tool.description}</p>
                </li>
              ))}
            </ul>
          </Block>
          <Block title="验证一次调用">
            <Code>{`curl -X POST ${mcpUrl} \\\n  -H 'Content-Type: application/json' \\\n  -d '${mcpCall}'`}</Code>
          </Block>
        </div>
      )}

      {current === "rss" && (
        <div role="tabpanel">
          <Block title="RSS 2.0 · 最近 30 条 L1 / L2 事件">
            <Code label="复制地址">{feedUrl}</Code>
          </Block>
        </div>
      )}

      {current === "rest" && (
        <div role="tabpanel">
          <Block title="匿名 GET · JSON">
            <ul className="mt-2 divide-y divide-line overflow-hidden rounded-lg border border-line bg-panel">
              {REST_ENDPOINTS.map((endpoint) => (
                <li key={endpoint.path} className="flex flex-wrap items-baseline gap-x-3 gap-y-[2px] px-3 py-[9px]">
                  <code className="font-mono text-[12px] font-semibold text-ink">{endpoint.path}</code>
                  <span className="text-[12px] leading-[1.6] text-ink-3 sm:ml-auto">{endpoint.desc}</span>
                </li>
              ))}
            </ul>
          </Block>
          <Block title="示例">
            <Code>{`curl '${origin}/api/v1/events?kind=regulatory&since=2026-01-01'`}</Code>
          </Block>
        </div>
      )}
    </>
  );
}
