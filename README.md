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
| 精选 / 全部动态 | 日报投影与完整发布事件时间线；日期随服务器(东八区)自动前移 |
| 热点榜 | 监测窗口内事件按 L1–L3、重要性总分、事件时间排序；搜索引擎重复不加分 |
| 监测日报 | 仅展示本期首次发布 / 实质更新且达到 L1/L2、通过证据与人工复核门禁的事件 |
| 早筛产品看板 | 19 家国内外企业技术路线、报证进度、性能对照(特异性 / 灵敏度 + 检出分期 + TOO)，数据均出自发表文献、监管审评资料与会议摘要 |
| 主题 | 公司与产品 / 技术方向 / 研究类型三维聚合 |
| 文章详情页 | 卡片点击进入，Firecrawl 抓回原页正文并清洗为 Markdown 渲染，附「打开原文」与「导出 Markdown」 |
| Agent 接入 | 竞品数据库以 Agent Skill / MCP / RSS / REST API 四种形态开放 |
| 收藏 / 更新日志 / 反馈 / 关于 | 收藏仅存本机浏览器;更新日志由构建脚本自动生成 |

## 增量监测管线(`npm run monitor`)

```
固定权威 / 可信信源 + AnySearch / 微信公众号候选发现面
  → 规范 URL、正文 SHA-256、信源编辑主体与日期
  → 公司 + 产品 + 事件类型 + 事件日期确定性召回
  → 同事件 / 实质更新判断，合并到 scripts/monitor-ledger.json
  → 权威原始证据或两个可信独立信源门禁
  → Qwen 固定档位判断；高风险由 GLM 独立复核，冲突由 Kimi 仲裁
  → 程序相加重要性：相关性 0/10/20/30 + 影响 0/15/30/40/50 + 行动 0/10/20
  → L1/L2/L3 + 人工复核门禁 → 可重建的公开读模型
```

`scripts/monitor-ledger.json` 是事件身份、事实版本和证据关系的唯一事实源；31 天窗口只控制页面查询，不参与“是否已出现”的判断。单个信源或模型失败只让对应候选保持 `pending`；账本读取、Schema 校验或事务写入失败会终止整次运行并保留最后有效账本和报告。

### Provider 配置与部署后修改

密钥只从环境变量或 GitHub Actions Secrets 读取，禁止写入仓库。四家模型使用 OpenAI-compatible `chat/completions`，base URL 与模型 ID 集中由环境变量控制：

| 职责 | Base URL | API key | 可选模型覆盖 |
| --- | --- | --- | --- |
| Qwen 默认处理 | `DASHSCOPE_BASE_URL` | `DASHSCOPE_API_KEY` | `QWEN_MONITOR_MODEL` |
| DeepSeek 视觉 | `DEEPSEEK_BASE_URL` | `DEEPSEEK_API_KEY` | `DEEPSEEK_VISION_MODEL` |
| GLM 独立复核 | `GLM_BASE_URL` | `GLM_API_KEY` | `GLM_REVIEW_MODEL` |
| Kimi 仲裁 / 综合 | `KIMI_BASE_URL` | `MOONSHOT_API_KEY` | `KIMI_SYNTHESIS_MODEL` |

四个 base URL 已在代码中提供默认值，仍可通过表中的环境变量覆盖。发现服务默认使用 `https://api.anysearch.com/mcp`；`ANYSEARCH_API_KEY` 可选，`ANYSEARCH_BASE_URL` 可覆盖。`FIRECRAWL_API_KEY` 仅用于已知证据 URL 的正文抓取。

证据优先流水线和影子验收期内维持公开日报的旧兼容生成器都使用同一组 Qwen 配置：`DASHSCOPE_API_KEY`、`QWEN_MONITOR_MODEL` 与可选的 `DASHSCOPE_BASE_URL`。项目不再读取 `OPENAI_API_KEY`；删除 GitHub Actions 中同名的 Repository variable 或 Repository secret 不影响监控。

微信公众号通过 WeixinZS 固定监控“早筛网”“有趣的胖子万里挑一”“循因缉药”“诊断科学”，每 144 小时查询一次订阅后新文章。配置 `WEIXINZS_API_KEY`，可选用 `WEIXINZS_BASE_URL` 覆盖默认的 `https://api.weixinzs.org/api`。该接口不回填订阅前历史文章；公众号只生成 `discovery` 候选，不能单独证明获批、临床性能或研究结论。

部署后要改 provider URL 或模型时，不改代码：在 GitHub 仓库 `Settings → Secrets and variables → Actions` 中修改对应 **Variables**（URL / 模型 ID）和 **Secrets**（API key），再从已认证的 `gh` CLI 向默认分支发送 `repository_dispatch`：`gh api --method POST repos/commie70/MCEDmonitor-web/dispatches -f event_type=daily-monitor`。微信公众号监控须把 `WEIXINZS_API_KEY` 建为 **Repository secret**；若要换接口地址，把 `WEIXINZS_BASE_URL` 建为 **Repository variable**。Vercel、EdgeOne 或 Docker 部署同样修改运行环境变量后重新部署。流水线不会因某家失败而静默切换到另一模型。

当前默认 `shadow`：新流水线写本地忽略目录 `.monitor/shadow-report.json`，旧生成器暂时维持公开 `daily-report.json`。先用 `npm run monitor:acceptance` 对 120 个固定输入和四家 provider 契约做真实验收；之后至少三个验收通过的影子周期覆盖七天，`npm run monitor -- --mode publish` 才会解除硬门禁。需要在 GitHub Actions 中同时生成验收记录时，发送 `gh api --method POST repos/commie70/MCEDmonitor-web/dispatches -f event_type=daily-monitor-acceptance`；该事件始终使用默认分支工作流，不接受可选 ref。

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
npm test           # Node 内置测试(含 120 个固定验收输入)
npm run check      # lint + typecheck + test + build
npm run monitor    # 新账本流水线，默认 shadow
npm run monitor:legacy # 影子期旧公开报告生成器
npm run monitor:review -- --event <id> --approve # 最小人工复核 CLI
npm run monitor:acceptance # 120 案例 + 四家 provider 真实契约验收
npm run changelog  # 由监测历史生成 public/changelog.json
npm run skill:hash # 重算 Agent Skill 的 SHA-256(Agent 接入页安装命令校验用)
node scripts/enrich-content.mjs 24   # 手动补抓更多故事线正文
```

## 开放接口 (Agent / RSS 可订阅)

- `GET /api/v1/companies[/{id}]` — 竞品公司摘要 / 单家完整性能库
- `GET /api/v1/prospective` — 前瞻队列性能对照
- `GET /api/v1/stories` · `GET /api/v1/items` — 发布事件 / 可追溯证据(支持分页，旧字段兼容一个周期)
- `GET /api/v1/daily` — 当日 AI 日报 + 本期 L1/L2 首次发布 / 实质更新
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
| `get_top_stories` | 当前监测窗口重要性最高的前 10 个发布事件(含证据置信度与评分明细) |
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
  mced-daily-monitor.mjs   # 增量证据优先编排入口
  mced-daily-monitor-legacy.mjs # 影子期旧公开报告生成器
  lib-monitor-ledger.mjs   # 事件身份、证据门禁、四态、评分与事务写入
  lib-monitor-llm.mjs      # 固定模型职责、严格 Schema 与选择性 MoA
  monitor-ledger.json      # Git 管理的唯一事实源
  monitor-acceptance.json  # 发布硬门禁使用的验收记录
  review-monitor-event.mjs # 最小人工复核 CLI
  lib-content-enrich.mjs   # Firecrawl 正文抓取与清洗
  lib-stale.mjs            # 发布日期推断(旧文判定)
  build-changelog.mjs      # 更新日志构建
  sync-skills.mjs          # 同步 clone-website 技能到 Codex / Kimi
tests/                     # 120 个固定验收输入 + node:test
public/monitor/            # 公开报告；影子报告仅写入本地 .monitor/
docs/                      # 克隆期侦察与设计参考资料
```

## 致谢

- 空白模板：[ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template)(MIT)
- 设计原型：[AIHOT](https://aihot.virxact.com/) · 公众号「数字生命卡兹克」
- License：MIT
