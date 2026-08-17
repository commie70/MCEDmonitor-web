"use client";

import { useState } from "react";
import { CopyButton } from "./CopyButton";

/**
 * Agent 接入 — 以模板站 aihot.virxact.com/agent 的真实结构与交互复现
 * (kimi-cu 实测：四选项分栏 + 折叠区块 + 共享许可区)。
 * 部署域名经 NEXT_PUBLIC_SITE_ORIGIN 覆盖，默认 gs-mced.vercel.app.
 */

const ORIGIN = process.env.NEXT_PUBLIC_SITE_ORIGIN ?? "https://gs-mced.vercel.app";

const CODE = "rounded bg-mc-surface2 px-[5px] py-[1px] text-[11.5px] text-mc-ink";
const CARD = "rounded-xl border border-mc-line bg-mc-card shadow-mc-card";
const H2 = "text-[19px] font-extrabold tracking-[-0.01em] text-mc-ink";

type TabKey = "skill" | "mcp" | "rss" | "rest";
const TABS:{ key: TabKey; label: string }[] = [
  { key: "skill", label: "Agent Skill" },{ key: "mcp", label: "MCP" },{ key: "rss", label: "RSS" },{ key: "rest", label: "REST API" },];

const INSTALL_PROMPT = `请安装早筛情报站 Skill:${ORIGIN}/mced-skill/SKILL.md
装完告诉我是否需要开启新会话。`;

const UNIVERSAL_CMD = `mkdir -p ~/.agents/skills/mced-intel \\
  && curl -fsSL ${ORIGIN}/mced-skill/SKILL.md -o /tmp/mced-intel-SKILL.md \\
  && curl -fsSL ${ORIGIN}/mced-skill/SKILL.md.sha256 -o /tmp/mced-intel-SKILL.md.sha256 \\
  && (cd /tmp && shasum -a 256 -c mced-intel-SKILL.md.sha256) \\
  && mv /tmp/mced-intel-SKILL.md ~/.agents/skills/mced-intel/SKILL.md`;

const CLAUDE_CMD = `mkdir -p ~/.claude/skills \\
  && ln -sfn ~/.agents/skills/mced-intel ~/.claude/skills/mced-intel`;

const MCP_URL = `${ORIGIN}/api/mcp`;

const MCP_CONFIG = `{
  "mcpServers":{
    "mced-intel":{
      "type": "http",
      "url": "${MCP_URL}"
    }
  }
}`;

const CLAUDE_MCP_CMD = `claude mcp add --transport http mced-intel '${MCP_URL}'`;
const CODEX_MCP_CMD = `codex mcp add mced-intel --url '${MCP_URL}'`;

const MCP_TOOLS:{ name: string; desc: string }[] = [
  { name: "get_top_stories", desc: "当前监测窗口热度最高的前 10 条故事线(含 AI 摘要与评分)" },{ name: "get_companies", desc: "19 家受监测公司摘要列表(产品 / 路线 / 报证状态)" },{ name: "get_company", desc: "按 id 取单家完整性能库(研究 / 数字 / 出处 / 更新时间)" },{ name: "search_items", desc: "按关键词与类别检索原始命中条目(最多 10 条)" },];

const REST_ENDPOINTS:{ method: string; path: string; desc: string }[] = [
  { method: "GET",path: "/api/v1/companies", desc: "公司摘要列表(19 家，含路线 / 报证 / 更新时间)" },{ method: "GET",path: "/api/v1/companies/{id}", desc: "单家完整性能库：研究、数字、出处、更新时间" },{ method: "GET",path: "/api/v1/prospective", desc: "前瞻队列性能对照(18 条，非病例对照)" },{ method: "GET",path: "/api/v1/stories", desc: "当前窗口故事线：热度、徽章、AI 摘要 / 评分 / 关注理由" },{ method: "GET",path: "/api/v1/items", desc: "原始命中；支持 ?category=regulatory|academic|research|market" },{ method: "GET",path: "/api/v1/daily", desc: "当日 AI 日报 + 前 5 条高热故事线" },];

function CodeBlock({ children, copyText, label }:{ children: string; copyText?: string; label?: string }) {
  return (
    <div className="relative mt-[8px] rounded-[8px] border border-mc-line bg-mc-surface0 p-[10px_40px_10px_12px]">
      <pre className="overflow-x-auto whitespace-pre-wrap break-all text-[12px] leading-[1.7] text-mc-ink [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]">
        {children}
      </pre>
      {copyText !== undefined && (
        <div className="absolute top-[8px] right-[8px]">
          <CopyButton text={copyText} label={label ?? "复制"}/>
        </div>
      )}
    </div>
  );
}

function BlockTitle({ children }:{ children: string }) {
  return <div className="mt-[14px] text-[12.5px] font-bold text-mc-ink">{children}</div>;
}

function Disclosure({ title, children }:{ title: string; children: React.ReactNode }) {
  return (
    <details className="group rounded-[8px] border border-mc-line bg-mc-surface0">
      <summary className="cursor-pointer list-none px-[12px] py-[10px] text-[13px] font-semibold text-mc-ink transition hover:text-mc-cyan-fg [&::-webkit-details-marker]:hidden">
        <span className="mr-[6px] inline-block transition-transform group-open: rotate-90">▸</span>
        {title}
      </summary>
      <div className="border-t border-mc-line-soft px-[12px] py-[10px]">{children}</div>
    </details>
  );
}

function SkillTab() {
  return (
    <div>
      <h2 className={H2}>装一次，之后直接用中文问</h2>
      <p className="mt-[6px] text-[13px] leading-[1.7] text-mc-ink1">
        不用记端点也不用写代码。适合 Claude Code、Codex、Gemini CLI 这类支持 Agent Skills 的工具。
      </p>
      <ol className="mt-[12px] grid grid-cols-3 gap-[14px] max-[960px]:grid-cols-1">
        {[
          ["01", "把提示词发给 Agent", "安装器不猜平台、不覆盖别家 Skill，发现旧副本会停下来。"],
          ["02", "开个新会话", "多数 Agent 只在会话开始时扫描 Skill，当前对话不一定看到。"],
          ["03", "问一句验证", "看到监测窗口、中文摘要、相关性评分和站内链接，就算接上了。"],
        ].map(([n, t, d]) => (
          <li key={n} className="flex gap-[10px]">
            <span className="text-[13px] font-extrabold tabular-nums text-mc-cyan">{n}</span>
            <div>
              <div className="text-[13px] font-bold text-mc-ink">{t}</div>
              <div className="mt-[2px] text-[12px] leading-[1.6] text-mc-ink2">{d}</div>
            </div>
          </li>
        ))}
      </ol>

      <BlockTitle>安装提示词</BlockTitle>
      <CodeBlock copyText={INSTALL_PROMPT}>{INSTALL_PROMPT}</CodeBlock>

      <BlockTitle>验证问题</BlockTitle>
      <CodeBlock copyText="过去两周早筛竞品最重要的 5 件事是什么?">
        过去两周早筛竞品最重要的 5 件事是什么?
      </CodeBlock>
      <p className="mt-[8px] text-[11.5px] leading-[1.6] text-mc-ink2">
        <span className="font-bold text-mc-ink1">成功的样子：</span>
        回答注明监测窗口(当前时间倒推 1 个月)、给出 5 条中文摘要与相关性评分，标题链接到早筛情报站的热点榜或原文。
      </p>

      <h2 className={`${H2} mt-[24px]`}>装好后能直接这样问</h2>
      <ul className="mt-[10px] grid grid-cols-2 gap-[8px] max-[960px]:grid-cols-1">
        {[
          ["过去两周早筛竞品最重要的 5 件事是什么?", "对接故事线热度榜"],
          ["CanScan 的直接竞品谁在推进 FDA?", "对接公司库与报证审批分类"],
          ["给我今天的早筛日报。", "对接每日 AI 日报与四类板块"],
          ["觅瑞和燃石最新各自的监管进展?", "对接公司检索与类别过滤"],
        ].map(([q,note]) => (
          <li key={q} className="rounded-[8px] bg-mc-surface0 px-[12px] py-[8px]">
            <div className="text-[12.5px] font-semibold text-mc-ink">「{q}」</div>
            <div className="mt-[2px] text-[11px] text-mc-ink2">{note}</div>
          </li>
        ))}
      </ul>

      <div className="mt-[14px] grid gap-[8px]">
        <Disclosure title="手动安装：选择当前平台">
          <div className="text-[12px] font-bold text-mc-ink">通用 Agent Skills(Codex / Gemini CLI / OpenCode 等)</div>
          <CodeBlock copyText={UNIVERSAL_CMD}>{UNIVERSAL_CMD}</CodeBlock>
          <div className="mt-[10px] text-[12px] font-bold text-mc-ink">Claude Code(软链到同一目录)</div>
          <CodeBlock copyText={CLAUDE_CMD}>{CLAUDE_CMD}</CodeBlock>
          <p className="mt-[8px] text-[11.5px] leading-[1.6] text-mc-ink2">
            装一次即可被多个 Agent 发现；安装命令会先下载并用 SHA-256 校验文件、一致才落盘；执行前请审阅{" "}
            <a href="/mced-skill/SKILL.md" className="text-mc-cyan-fg hover:underline">SKILL.md</a> 内容。
          </p>
        </Disclosure>
        <Disclosure title="更新已有 Skill">
          <p className="text-[12.5px] leading-[1.7] text-mc-ink1">
            重新执行手动安装命令即可(同样经 SHA-256 校验后才覆盖);或把更新提示词发给 Agent:
            「把我的 mced-intel Skill 更新到最新版：{ORIGIN}/mced-skill/SKILL.md」。
            更新后开启新会话，用验证问题确认。
          </p>
        </Disclosure>
        <Disclosure title="做得到，和暂时做不到的">
          <ul className="grid gap-[6px] text-[12.5px] leading-[1.7] text-mc-ink1">
            <li>· 原生窗口为当前时间倒推 1 个月；更早的历史检索请用 <span className={CODE}>/api/v1/items</span> 搭配自己的关键词。</li>
            <li>· 返回 AI 摘要、相关性评分、关注理由与原文链接；<span className={CODE}>/api/v1/companies/{"{id}"}</span> 可取单家完整性能库。</li>
            <li>· 当前没有按 ID 获取单篇正文的 API，没有写接口；NMPA 与会议摘要只有检索链接通道。</li>
          </ul>
        </Disclosure>
        <Disclosure title="没触发?按这个顺序排查">
          <ol className="grid list-decimal gap-[6px] pl-[20px] text-[12.5px] leading-[1.7] text-mc-ink1">
            <li>文件名严格是 <span className={CODE}>SKILL.md</span>，且在当前 Agent 支持的 skills 目录。</li>
            <li>关掉旧会话，新开一个，再问上面的验证问题。</li>
            <li>让 Agent 列出它发现的 skills，确认里面有 <span className={CODE}>mced-intel</span>。</li>
            <li>仍失败：到<a href="/feedback" className="text-mc-cyan-fg hover:underline">反馈页</a>说明平台、版本和安装路径，别发 token 或本地文件。</li>
          </ol>
        </Disclosure>
      </div>
    </div>
  );
}

function McpTab() {
  return (
    <div>
      <h2 className={H2}>加一个地址， Agent 直接调用四个工具</h2>
      <p className="mt-[6px] text-[13px] leading-[1.7] text-mc-ink1">
        适合支持远程 MCP 的 Agent 与开发工具。标准 Streamable HTTP，匿名只读，不需要 token，也不会读取登录态；工具返回简洁文字与同一份结构化数据。
      </p>
      <CodeBlock copyText={MCP_URL} label="复制地址">{MCP_URL}</CodeBlock>

      <BlockTitle>通用 MCP 配置</BlockTitle>
      <CodeBlock copyText={MCP_CONFIG}>{MCP_CONFIG}</CodeBlock>

      <BlockTitle>Claude Code</BlockTitle>
      <CodeBlock copyText={CLAUDE_MCP_CMD}>{CLAUDE_MCP_CMD}</CodeBlock>

      <BlockTitle>Codex</BlockTitle>
      <CodeBlock copyText={CODEX_MCP_CMD}>{CODEX_MCP_CMD}</CodeBlock>

      <p className="mt-[10px] text-[11.5px] leading-[1.6] text-mc-ink2">
        不同客户端的配置入口名称可能不同；核心只需要 server 名称 mced-intel 与上面的 URL，不要填写 API Key。客户端若只接受本地命令而不支持远程 HTTP，需要先使用它自己的远程 MCP 代理。
      </p>

      <h2 className={`${H2} mt-[24px]`}>连上后应看到这四个工具</h2>
      <ul className="mt-[10px] grid grid-cols-2 gap-[8px] max-[960px]:grid-cols-1">
        {MCP_TOOLS.map((t) => (
          <li key={t.name} className="rounded-[8px] bg-mc-surface0 px-[12px] py-[8px]">
            <code className="text-[12px] font-bold text-mc-cyan-fg [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]">
              {t.name}
            </code>
            <div className="mt-[2px] text-[11.5px] leading-[1.5] text-mc-ink2">{t.desc}</div>
          </li>
        ))}
      </ul>

      <BlockTitle>验证一次真实调用</BlockTitle>
      <CodeBlock copyText='{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_top_stories","arguments":{}}}'>
        {`curl -X POST ${MCP_URL} \\
  -H 'Content-Type:application/json' \\
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_top_stories","arguments":{}}}'`}
      </CodeBlock>
      <p className="mt-[8px] text-[11.5px] leading-[1.6] text-mc-ink2">
        <span className="font-bold text-mc-ink1">成功的样子：</span>
        返回 JSON-RPC result,content 里是前 10 条高热故事线的 JSON(热度、徽章、AI 摘要、相关性评分)。
      </p>

      <div className="mt-[14px]">
        <Disclosure title="工具边界与恢复方式">
          <ul className="grid gap-[6px] text-[12.5px] leading-[1.7] text-mc-ink1">
            <li>· 故事线来自落盘监测报告；报告未生成时端点返回 <span className={CODE}>monitor_report_missing</span>，先运行 <span className={CODE}>npm run monitor</span>。</li>
            <li>· 未知工具或方法返回标准 JSON-RPC error(-32601 / -32602)；通知类消息不回包。</li>
            <li>· 数据按日更新；请自行缓存，避免高频重复调用。</li>
          </ul>
        </Disclosure>
      </div>
    </div>
  );
}

function RssTab() {
  return (
    <div>
      <h2 className={H2}>复制地址即可订阅</h2>
      <p className="mt-[6px] text-[13px] leading-[1.7] text-mc-ink1">
        兼容主流 RSS 2.0 阅读器与 n8n、Zapier 这类自动化工具。地址长期不变，内容随每日监测自动更新。
      </p>
      <div className="mt-[12px] rounded-[8px] border border-mc-line">
        <div className="flex flex-wrap items-center gap-[10px] px-[12px] py-[10px]">
          <div className="min-w-0 flex-1">
            <div className="text-[13px] font-bold text-mc-ink">竞品监测故事线</div>
            <div className="mt-[2px] text-[11.5px] leading-[1.5] text-mc-ink2">
              每日热度最高的 20 条故事线：标题、AI 摘要、信源与原文链接。
            </div>
          </div>
          <code className={`${CODE} break-all`}>{ORIGIN}/feed.xml</code>
          <CopyButton text={`${ORIGIN}/feed.xml`}/>
        </div>
      </div>

      <h2 className={`${H2} mt-[24px]`}>给阅读器 / Agent 的合同</h2>
      <ul className="mt-[10px] grid grid-cols-2 gap-x-[24px] gap-y-[6px] text-[12.5px] leading-[1.7] text-mc-ink1 max-[960px]:grid-cols-1">
        <li>· 建议 30 分钟或更慢的轮询间隔；内容每日随监测脚本更新。</li>
        <li>· guid 稳定：同一故事线合并多信源，不重复推送。</li>
        <li>· 摘要由 AI 生成并标注；数字与原话请回原文 URL 复核。</li>
        <li>· 「旧文」月份会写入条目标题，便于识别窗口外内容。</li>
      </ul>
    </div>
  );
}

function RestTab() {
  return (
    <div>
      <h2 className={H2}>匿名 GET，是技术入口</h2>
      <p className="mt-[6px] text-[13px] leading-[1.7] text-mc-ink1">
        六个端点直接返回 JSON，适合自己的流水线、仪表盘或内部系统对接。
      </p>
      <div className="mt-[12px] overflow-hidden rounded-[8px] border border-mc-line">
        {REST_ENDPOINTS.map((ep, i) => (
          <div
            key={ep.path}
            className={`flex flex-wrap items-baseline gap-x-[12px] px-[12px] py-[9px] ${
              i > 0 ? "border-t border-mc-line-soft" : ""
            }`}
          >
            <span className="rounded-[4px] bg-[color-mix(in_srgb,var(--accent-emerald)_12%,transparent)] px-[6px] py-[1px] text-[10.5px] font-bold text-mc-emerald-fg">
              {ep.method}
            </span>
            <code className="text-[12px] font-semibold text-mc-ink [font-family:ui-monospace,SFMono-Regular,Menlo,monospace]">
              {ep.path}
            </code>
            <span className="flex-1 text-right text-[11.5px] leading-[1.5] text-mc-ink2 max-[960px]:w-full max-[960px]:text-left">
              {ep.desc}
            </span>
          </div>
        ))}
      </div>
      <BlockTitle>示例</BlockTitle>
      <CodeBlock copyText={`curl '${ORIGIN}/api/v1/items?category=regulatory'`}>
        {`curl '${ORIGIN}/api/v1/items?category=regulatory'`}
      </CodeBlock>
      <p className="mt-[8px] text-[11.5px] leading-[1.6] text-mc-ink2">
        报告未生成时相关端点返回 503 与 <span className={CODE}>monitor_report_missing</span>；
        先运行 <span className={CODE}>npm run monitor</span>。
      </p>
    </div>
  );
}

export function AgentPage() {
  const [tab, setTab] = useState<TabKey>("skill");

  return (
    <div className="grid gap-4">
      <header className="pt-[6px]">
        <p className="text-[11.5px] text-mc-ink2">接入 / Agent 与开发者</p>
        <h1 className="m-0 mt-[4px] text-[26px] font-extrabold leading-[1.2] tracking-[-0.02em] text-mc-ink">
          让 Agent 直接使用早筛情报站
        </h1>
        <p className="mt-[6px] max-w-[860px] text-[12.5px] leading-[1.6] text-mc-ink2">
          四条接入路径都是匿名只读、无需 API Key:Agent Skill、MCP、RSS、REST API v1。
        </p>
      </header>

      {/* 状态条(模板同款徽章行) */}
      <div className="flex flex-wrap items-center gap-[8px]">
        {["匿名只读", "API v1", "MCP 0.1.0", "Skill 0.1.0"].map((s) => (
          <span key={s} className="rounded-[5px] bg-mc-surface2 px-[8px] py-[2px] text-[11px] font-semibold text-mc-ink1">
            {s}
          </span>
        ))}
        <span className="rounded-[5px] bg-[color-mix(in_srgb,var(--accent-emerald)_12%,transparent)] px-[8px] py-[2px] text-[11px] font-bold text-mc-emerald-fg">
          ● 服务正常
        </span>
      </div>

      {/* 公告条(模板迁移公告同款) */}
      <div className="flex flex-wrap items-center gap-[10px] rounded-[8px] border border-[color-mix(in_srgb,var(--accent-amber)_30%,transparent)] bg-[color-mix(in_srgb,var(--accent-amber)_8%,transparent)] px-[12px] py-[9px]">
        <span className="text-[12px] leading-[1.6] text-mc-ink1">
          <span className="font-bold text-mc-ink">原型公告</span> 本服务为开放服务原型(v0.1)：数据含经文献核验的性能库与每日自动监测结果；字段在 v0.1 内不删除、不改类型，暂不承诺 SLA。
        </span>
        <a href="/changelog" className="ml-auto shrink-0 text-[12px] font-bold text-mc-cyan-fg hover:underline">
          更新日志 →
        </a>
      </div>

      {/* 链接行(模板同款) */}
      <div className="flex flex-wrap gap-x-[16px] text-[12.5px] font-bold text-mc-cyan-fg">
        <a href="/llms.txt" className="hover:underline">llms.txt ↗</a>
        <a href="/api/mcp" className="hover:underline">MCP Server ↗</a>
        <a href="/mced-skill/SKILL.md" className="hover:underline">Skill 完整包 ↗</a>
        <a href="/mced-skill/README.md" className="hover:underline">README ↗</a>
      </div>

      {/* 分栏(模板同款 underline tabs) */}
      <nav aria-label="选择接入方式" className="flex gap-[22px] border-b border-mc-line-soft">
        {TABS.map((t) => (
          <button
            key={t.key}
            type="button"
            role="tab"
            aria-selected={tab === t.key}
            onClick={() => setTab(t.key)}
            className={
              tab === t.key
                ? "pb-[9px] pt-[7px] text-[13px] font-semibold text-mc-cyan-fg [box-shadow:inset_0_-2px_0_var(--accent-cyan)]"
                : "pb-[9px] pt-[7px] text-[13px] text-mc-ink1 transition-colors hover:text-mc-ink"
            }
          >
            {t.label}
          </button>
        ))}
      </nav>

      <p className="text-[11.5px] leading-[1.6] text-mc-ink2">
        部署域名为 <span className={CODE}>{ORIGIN}</span>
        (可用 NEXT_PUBLIC_SITE_ORIGIN 覆盖)；匿名只读，无账号与密钥。
      </p>

      {tab === "skill" && <SkillTab />}
      {tab === "mcp" && <McpTab />}
      {tab === "rss" && <RssTab />}
      {tab === "rest" && <RestTab />}

      {/* 共享许可区(模板同款 2×2) */}
      <section className="mt-[16px]">
        <h2 className={H2}>匿名接入，先确认用途许可</h2>
        <div className="mt-[12px] grid grid-cols-2 gap-x-[28px] gap-y-[16px] max-[960px]:grid-cols-1">
          {[
            ["重要事实回原文核对", "摘要、评分与日报由 AI 生成。引用数字、政策或原话前，请使用返回的原文 URL 复核。"],
            ["用途不同，许可不同", "个人与组织内部使用免费；对外商业产品、公开镜像、数据转售或批量再分发，须先取得书面授权。"],
            ["按频率合同调用", "数据来自落盘报告(public/monitor/daily-report.json)，建议按你自己的调度间隔拉取并缓存；RSS 建议 30 分钟或更慢；收到 429 后按 Retry-After 退避。"],
            ["稳定契约，不承诺 SLA", "v0.1 内不删除、不改名字段、不改变既有字段类型；关键链路请自行设置缓存、重试和降级。"],
          ].map(([t, d]) => (
            <div key={t}>
              <div className="text-[13px] font-bold text-mc-ink">{t}</div>
              <div className="mt-[3px] text-[12.5px] leading-[1.7] text-mc-ink1">{d}</div>
            </div>
          ))}
        </div>
      </section>

      {/* 页脚联系(模板同款) */}
      <footer className="mt-[8px] flex flex-wrap items-center gap-x-[16px] border-t border-mc-line-soft pt-[12px] text-[12px] text-mc-ink2">
        <span>
          接入失败、MCP 工具不可见、Skill 漏触发或需要新端点?走
          <a href="/feedback" className="ml-[4px] font-semibold text-mc-cyan-fg hover:underline">反馈页</a>。
        </span>
        <a href="mailto:yunyang.wei@geneseeq.com" className="ml-auto font-semibold text-mc-cyan-fg hover:underline">
          yunyang.wei@geneseeq.com
        </a>
      </footer>
    </div>
  );
}
