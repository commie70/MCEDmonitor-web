# 早筛情报站(MCED Intel)

> 癌症早筛竞品产品新闻监测 + 信息看板 — 面向医学部、研发部、战略发展部、药企合作的竞争情报站点。

**[English](README.en.md)**

---

## How to

1. **空白模板**：本项目以 [JCodesMore/ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template) 为脚手架(Next.js 16 + React 19 + Tailwind v4 + shadcn/ui)。
2. **整站克隆**：用模板自带的 `/clone-website` 工作流(侦察 → 设计令牌提取 → 组件规格 → 并行构建 → 组装 QA)，将 [AIHOT](https://aihot.virxact.com/)(AI 圈资讯监测站，灵感源自公众号「数字生命卡兹克」)像素级复刻为本地 Next.js 代码库。
3. **领域重构**：在克隆骨架上，依据本地调研材料(早筛文献与会议资料库)与远程信源监测结果，将模板重构为早筛竞品监控站——页面信息架构、数据模型、监测管线、Agent 开放接口均为原创重构，模板原始内容已浓缩为上述链接。

## 功能概览

| 板块 | 说明 |
| --- | --- |
| 精选 / 全部动态 | 编辑精选与全量时间线，日期随服务器(东八区)自动前移 |
| 热点榜 | 监测窗口内故事线按热度排序：Σ(信道权重 × 半衰期)+ 跨引擎命中加成 |
| 监测日报 | 报证审批 / 学术动态 / 新研究 / 市场动态四类故事线，AI 摘要与评分，旧文红色时间戳标记 |
| 早筛产品看板 | 19 家国内外企业技术路线、报证进度、性能对照(特异性 / 灵敏度 + 检出分期 + TOO)，数据均出自发表文献、监管审评资料与会议摘要 |
| 主题 | 公司与产品 / 技术方向 / 研究类型三维聚合 |
| 文章详情页 | 卡片点击进入，Firecrawl 抓回原页正文并清洗为 Markdown 渲染，附「打开原文」与「导出 Markdown」 |
| Agent 接入 | 竞品数据库以 Agent Skill / MCP / RSS / REST API 四种形态开放 |
| 收藏 / 更新日志 / 反馈 / 关于 | 收藏仅存本机浏览器;更新日志由构建脚本自动生成 |

## 监测管线(`npm run monitor`)

```
PubMed / Google News / openFDA / Tavily / AnySearch / Brave / Firecrawl / Exa
  → L1 公司内标题相似度故事线聚类，热度 = Σ信道权重 × 0.5^(age/24h) + 跨引擎命中加成
  → L2 LLM(gpt-5.6-luna，xhigh)中文摘要、相关性评分、关注理由、当日 AI 日报
  → Firecrawl 正文富化(故事线首条目抓原页落盘)
  → 发布日期推断(正文头部 > URL > 采集端)，早于窗口起点标记「旧文」
  → public/monitor/daily-report.json(31 天滚动窗口)
```

密钥经环境变量提供：`OPENAI_API_KEY`、`TAVILY_API_KEY`、`ANYSEARCH_API_KEY`、`BRAVE_API_KEY`、`FIRECRAWL_API_KEY`、`EXA_API_KEY`(可选)，均不入库。

## 技术栈

- **Next.js 16**(App Router，`output: standalone`)· React 19 · TypeScript strict
- **Tailwind CSS v4**(oklch 设计令牌，亮/暗/跟随系统三态主题)
- **shadcn/ui** 基座 · lucide-react 图标 · react-markdown
- 部署目标：腾讯云 EdgeOne(亦兼容 Vercel / Docker standalone)

## 常用命令

```bash
npm run dev        # 开发服务器
npm run build      # 生产构建
npm run lint       # ESLint
npm run typecheck  # TypeScript
npm run check      # lint + typecheck + build
npm run monitor    # 跑一遍每日监测(参数见 scripts/mced-daily-monitor.mjs 头部注释)
npm run changelog  # 由监测历史生成 public/changelog.json
npm run skill:hash # 重算 Agent Skill 的 SHA-256(Agent 接入页安装命令校验用)
node scripts/enrich-content.mjs 24   # 手动补抓更多故事线正文
```

## 开放接口 (Agent / RSS 可订阅)

- `GET /api/v1/companies[/{id}]` — 竞品公司摘要 / 单家完整性能库
- `GET /api/v1/prospective` — 前瞻队列性能对照
- `GET /api/v1/stories` · `GET /api/v1/items` — 监测故事线 / 原始条目(支持分页)
- `GET /api/v1/daily` — 当日 AI 日报 + 高热故事线
- `POST /api/mcp` — MCP(JSON-RPC 2.0 子集，16KB 请求上限)
- `GET /feed.xml` — RSS 2.0

### MCP 使用说明

本站 MCP 端点为匿名只读:`POST https://gs-mced.geneseeq.com/api/mcp`(JSON-RPC 2.0 子集，请求体 ≤16KB，无需账号与密钥)。

**接入方式(任选其一):**

```jsonc
// mcp.json / 各 Agent 的 MCP 配置
{
  "mcpServers": {
    "mced-intel": { "type": "http", "url": "https://gs-mced.geneseeq.com/api/mcp" }
  }
}
```

或把这句话直接发给你的 Agent:

```
安装这里的MCP：https://gs-mced.geneseeq.com/agent
```

```bash
# Codex CLI
codex mcp add mced-intel --url 'https://gs-mced.geneseeq.com/api/mcp'

# Claude Code
claude mcp add --transport http mced-intel 'https://gs-mced.geneseeq.com/api/mcp'
```

**可用工具(tools/list):**

| 工具 | 说明 |
| --- | --- |
| `get_top_stories` | 当前监测窗口热度最高的前 10 条故事线(含 AI 摘要与评分) |
| `get_companies` | 19 家受监测公司摘要列表(产品 / 路线 / 报证状态) |
| `get_company` | 按 id 取单家完整性能库(研究 / 数字 / 出处 / 更新时间) |
| `search_items` | 按关键词与类别检索原始命中条目(最多 10 条) |

**curl 自测:**

```bash
curl -X POST https://gs-mced.geneseeq.com/api/mcp \
  -H 'Content-Type: application/json' \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_top_stories","arguments":{}}}'
```

RSS 订阅地址:`https://gs-mced.geneseeq.com/feed.xml`。

## 项目结构

```
src/
  app/                 # 路由：页面 + /api/v1/* + /api/mcp + /feed.xml + /items/[id]
  components/sites/    # 页面组件(按模板站拓扑组织)+ shared/(数据与工具)
scripts/
  mced-daily-monitor.mjs   # 每日监测主脚本
  lib-content-enrich.mjs   # Firecrawl 正文抓取与清洗
  lib-stale.mjs            # 发布日期推断(旧文判定)
  build-changelog.mjs      # 更新日志构建
  sync-skills.mjs          # 同步 clone-website 技能到 Codex / Kimi
public/monitor/            # 落盘监测报告(daily-report.json)
docs/                      # 克隆期侦察与设计参考资料
```

## 致谢

- 空白模板：[ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template)(MIT)
- 设计原型：[AIHOT](https://aihot.virxact.com/) · 公众号「数字生命卡兹克」
- License：MIT
