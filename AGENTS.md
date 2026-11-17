<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->

# 早筛情报站(MCED Intel)

## What This Is
持续监测国内外癌症早筛产品的性能、技术路线、癌种覆盖与报证进度的情报站点，面向医学部、研发部、战略发展部与药企合作，以世和基因 CanScan 为对照锚点。两部分组成：

- **证据库**：`src/data/*.json`(企业 / 研究 / 信源 / 里程碑 / MRD 产品矩阵)，人工维护，是页面、REST、MCP 与 RSS 的唯一数据来源。
- **监测流水线**：`scripts/`，采集 → 事件账本 → 模型抽取与独立复核 → 自动放行到 `public/monitor/daily-report.json`。

流水线决策见 `ADR.md`，术语见 `CONTEXT.md`，使用说明见 `README.md`。

## Tech Stack
- **Framework:** Next.js 16 (App Router, React 19, TypeScript strict)
- **Styling:** Tailwind CSS v4，设计令牌在 `src/app/globals.css`
- **Icons:** Lucide React
- **Pipeline:** Node ≥ 24 原生 `fetch` + `node:test`，无额外运行时依赖
- **Deployment:** 腾讯云 EdgeOne(GitHub Actions 推回 `master` 后自动部署)

## Commands
- `npm run dev` — Start dev server
- `npm run check` — lint + typecheck + test + build
- `npm test` — 流水线、安全回归与证据库完整性
- `npm run monitor -- --dry-run --limit 10` — 端到端试跑，不写文件
- `npm run monitor:acceptance` — 模型验收(真实调用四家 provider)
- `npm run monitor:project` — 由账本重建公开报告

## Code Style
- TypeScript strict mode, no `any`
- Named exports, PascalCase components, camelCase utils
- Tailwind utility classes, no inline styles
- 2-space indentation
- Responsive: mobile-first

## Design Principles
- **让布局说话** — 不加可有可无的副标题、说明文字和二级标签。
- **证据分层可见** — 研究设计的可信度用视觉重量表达(实心 → 描边)，病例对照不与前瞻数据同图比较。
- **墨青是唯一强调色**，陶土橙只留给本司锚定(世和基因)。
- **筛选状态放在 URL 里** — 可分享、刷新不丢(`src/hooks/use-query-state.ts`)。

## Data Rules
- 任何展示信源的地方都不得出现本地文件路径；信源必须是 `src/data/sources.json` 里的公开链接。
- 找不到公开原文的资料，把内容重建为站内页面(`document` 字段，路由 `/sources/{id}`)。
- 数值与公开原文有口径差异时，写进研究的 `note`，不要静默改数。
- MRD 矩阵(`mrd.json`)逐格附信源；检出限按原文口径记录，不在 VAF、肿瘤分数等量纲之间换算；价格写明性质、覆盖内容与时间，不换算币种；查不到公开出处就留空，不凭印象填。
- 客户端组件只从 `@/data/meta`、`@/data/types`、`@/lib/event-model` 引入；数据 JSON 只在服务端经 `@/data` 读取。

## Publishing Rules
- 监测事件全自动发布：模型验收通过即放行，高风险事件由独立模型复核把关。不得引入逐条人工批准或观察期。
- 写公开报告的脚本都必须经 `scripts/lib-release-gate.mjs` 取门禁状态。
- 流水线改动后先跑 `npm test`，涉及模型调用的再跑 `npm run monitor:acceptance`。

## Project Structure
```
src/
  app/(site)/       # 页面(共享外壳)
  app/api/          # REST v1 + MCP
  components/       # shell / feed / home / board / charts / sources / agent / feedback
  data/             # 证据库 JSON、类型与读入口
  lib/              # 事件模型、报告读取、API 映射、工具函数
  hooks/            # URL 查询状态、本机存储、收藏、主题
scripts/            # 监测流水线与构建脚本
tests/              # node:test + 120 个固定验收案例
public/             # 公开报告、Agent Skill、llms.txt
docs/               # 脚手架期的克隆调研资料(clone-website 技能使用)
```

## MOST IMPORTANT NOTES
- When launching agent teams, ALWAYS have each teammate work in their own worktree branch and merge everyone's work at the end, resolving any merge conflicts smartly since you are basically serving the orchestrator role and have full context to our goals, work given, work achieved, and desired outcomes.
- 本项目仅维护 Codex CLI 与 Kimi Code 两套 agent 配置:`.codex/` 与 `.kimi-code/`;`AGENTS.md` 为两者共享的单一事实源。
- After editing `.codex/skills/clone-website/SKILL.md`, run `node scripts/sync-skills.mjs` to regenerate the skill for both platforms.
- After editing `public/mced-skill/SKILL.md`, run `npm run skill:hash` to regenerate `SKILL.md.sha256` — the install command on the Agent 接入 page verifies it before writing.

@docs/research/INSPECTION_GUIDE.md
