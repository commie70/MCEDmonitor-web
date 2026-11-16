# 早筛情报站(MCED Intel)

> 持续监测国内外癌症早筛产品的**性能、技术路线、癌种覆盖与报证进度**。面向医学部、研发部、战略发展部与药企合作，以世和基因 CanScan 为对照锚点。

**[English](README.en.md)** · 线上：<https://gs-mced.geneseeq.com>

---

## 站点

| 板块 | 路由 | 内容 |
| --- | --- | --- |
| 精选 | `/` | L1 / L2 事件时间线，右侧为热点、报证动向与本司锚点 |
| 全部动态 | `/all` | 全部事件；按类型、企业、地区、来源与关键词筛选，状态在 URL 里 |
| 热点榜 | `/hot` | 31 / 90 / 365 天窗口内按等级、重要性排序 |
| 监测日报 | `/daily` | 最近一次监测运行：采集指标、本期事件、模型综述、健康状态 |
| 主题 | `/topics` | 企业、技术路线、癌种、报证、研究设计、事件类型的入口 |
| 产品看板 | `/leaderboard` | 19 家企业的性能卡片：领衔读数取自一项无症状筛查研究并注明是哪一项，另有路线、报证状态与癌种 |
| 性能对照 | `/performance` | 两张通栏大图——灵敏度 × 特异性散点、病例对照 → 前瞻队列的灵敏度落差；其下为研究对照表 |
| 报证进度 | `/regulatory` | NMPA / FDA / CE / LDT 各阶段的企业与节点 |
| 癌种覆盖 | `/coverage` | 企业 × 癌种矩阵 |
| MRD 矩阵 | `/mrd` | 25 个国内外 MRD 产品的性能卡片：技术选型、检出限、临床性能、报证支付、市价 |
| 信源库 | `/sources` | 198 条公开资料；每个数字都能回到原文 |
| 详情页 | `/companies/{id}` `/studies/{id}` `/mrd/{id}` `/items/{id}` `/sources/{id}` | 企业档案、研究证据、MRD 产品(逐格出处)、事件、信源 |
| 其他 | `/agent` `/changelog` `/feedback` `/about` `/starred` | Agent 接入、更新日志、反馈、关于、收藏(仅存本机) |

旧版地址 `/leaderboard/evidence/{企业}/{下标}` 永久重定向到 `/studies/{id}`；旧版收藏、主题设置与 REST v1 字段保持兼容。

## 数据

**证据库**(`src/data/*.json`，人工维护)：`companies`(19) · `studies`(50) · `sources`(198) · `milestones` · `pathfinder` · `mrd`(25) · `mrd-price-ranges`。
页面、REST、MCP 与 RSS 都只经 `src/data/index.ts` 读取。

- 研究按设计分层：`RCT` → `前瞻干预` → `前瞻注册` → `前瞻队列` → `病例对照`。病例对照不可外推真实筛查，不与前瞻数据同图比较。
- 每项研究、每个报证节点都指向 `sources.json` 里的公开链接(期刊 DOI / PubMed、会议摘要、试验注册、监管文件、企业公告)。
- **不出现本地文件路径**。找不到公开原文的资料，把内容重建为站内页面(`document` 字段 → `/sources/{id}`)。
- 数值与公开原文存在口径差异时写入研究的 `note`，页面与 API 一并展示。
- **MRD 矩阵**(`mrd.json`)逐格附信源：技术选型分 tumor-informed / tumor-naive，组织测序分 WES / WGS / panel；
  检出限按原文记录并标明口径(LoD95、检出阈值、企业宣称)与量纲(VAF、肿瘤分数、克隆比例)，**不在量纲之间换算**；
  出处分两层——同行评议或监管审评(实心)、企业材料或转述(描边)；价格必须写明性质、覆盖内容与时间，不换算币种。
  查不到公开出处的格子留空，页面显示「未公开」。国内没有产品级公开标价，只收录媒体报道的行业区间(`mrd-price-ranges.json`)。
- `npm test` 校验 ID 唯一、引用完整、无本地路径泄漏，以及 MRD 矩阵逐格有信源。

**事件**是两类数据的统一视图(`src/lib/events.ts`)：监测流水线放行的事件，加上证据库里的研究发表、报证节点与人工补录的里程碑。

## 监测流水线(`npm run monitor`)

```
权威 / 可信信源(PubMed、openFDA、企业官网、公众号)+ AnySearch 候选发现
  → 规范 URL、正文 SHA-256、信源编辑主体与日期
  → 公司 + 产品 + 事件类型 + 日期确定性召回 → 同事件 / 实质更新判断
  → 事件账本 scripts/monitor-ledger.json(唯一事实源)
  → 证据门禁：权威原始证据，或两个可信独立信源
  → Qwen 抽取与选档；高风险由 GLM 独立复核，冲突由 Kimi 仲裁
  → 重要性 = 相关性 0/10/20/30 + 影响 0/15/30/40/50 + 行动 0/10/20 → L1 / L2 / L3
  → 放行 → public/monitor/daily-report.json(账本的可重建投影)
```

### 发布策略：全自动

没有逐条人工批准，也没有观察期。

- **事件级**：证据置信度不为 Low、达到 L1–L3；高风险事件(L1、监管结论、临床性能数字)必须经独立模型复核，
  与主模型一致或由仲裁解决后自动放行(账本记 `reviewed_by: model:<provider>/<model>`)。复核未一致的事件停在 `pending`。
- **运行级**：固定验收集通过即放行。`npm run monitor:acceptance` 跑 120 个固定案例与四家 provider 的真实契约，
  要求语义匹配精确率 ≥ 98%、召回率 ≥ 95%。定时任务每次先执行 `-- --if-needed`：
  结果未通过、已满 30 天，或验收集、模型配置、模型链路代码(`scripts/lib-monitor-llm.mjs`)有变化时自动重跑，否则沿用。
  改过提示词或复核规则后，旧的验收结果即失效。
- **验收未通过时**照常采集建账，新事件留在账本里，下次验收通过后自动放行；已放行的事件不撤下。
- **可见性**：侧栏状态、监测日报与更新日志会标出「采集中断」与「发布暂停」。
- **运行预算**：单次运行超过 `MCED_RUN_BUDGET_MINUTES`(默认 35，定时任务设为 150)后，剩余候选存为可重放的 `pending`，下次运行接着处理；
  同一候选模型始终无法达成一致时最多重放 5 次。

`npm run monitor:review` 是可选工具：处理 `pending` 事件，或撤下一条已发布事件。

模型调用带输出上限，限流(429)按阶梯退避重试，输出非法或被截断时重试一次；
单个信源或模型失败只让对应候选保持 `pending`，不会静默换模型；账本读取、Schema 校验或事务写入失败会终止整次运行并保留最后有效的账本与报告。

### Provider 配置

密钥只从环境变量或 GitHub Actions Secrets 读取。四家模型都走 OpenAI-compatible `chat/completions`：

| 职责 | Base URL | API key | 模型覆盖 |
| --- | --- | --- | --- |
| Qwen 默认处理 | `DASHSCOPE_BASE_URL` | `DASHSCOPE_API_KEY` | `QWEN_MONITOR_MODEL` |
| DeepSeek 视觉 | `DEEPSEEK_BASE_URL` | `DEEPSEEK_API_KEY` | `DEEPSEEK_VISION_MODEL` |
| GLM 独立复核 | `GLM_BASE_URL` | `GLM_API_KEY` | `GLM_REVIEW_MODEL` |
| Kimi 仲裁 / 综述 | `KIMI_BASE_URL` | `MOONSHOT_API_KEY` | `KIMI_SYNTHESIS_MODEL` |

三家模型默认开启的深度思考已按各家文档关闭或调到最低(Qwen `enable_thinking=false`，GLM / Kimi `reasoning_effort=low`)：
抽取、选档这类带严格 Schema 的任务用不上，而它会让单次调用从几秒变成一两分钟。换模型后如果新模型不认这些参数，
把 `QWEN_ENABLE_THINKING` / `GLM_REASONING_EFFORT` / `KIMI_REASONING_EFFORT` 设为 `default` 即不发送该字段。

Base URL 有代码默认值。发现服务默认 `https://api.anysearch.com/mcp`(`ANYSEARCH_API_KEY` 可选)；`FIRECRAWL_API_KEY` 只用于抓取已知证据 URL 的正文。
公众号经 WeixinZS 监控(`WEIXINZS_API_KEY`)，只生成候选，不能单独证明获批、临床性能或研究结论。

部署后改模型或地址不需要改代码：在仓库 `Settings → Secrets and variables → Actions` 修改 Variables / Secrets，然后触发一次运行——

```bash
gh api --method POST repos/commie70/MCEDmonitor-web/dispatches -f event_type=daily-monitor
# 强制重跑模型验收
gh api --method POST repos/commie70/MCEDmonitor-web/dispatches -f event_type=daily-monitor-acceptance
```

GitHub Actions 每 3 天运行一次(`.github/workflows/daily-monitor.yml`)，把账本、公开报告、运行历史与更新日志推回 `master`，由 EdgeOne Pages 自动重新部署。

## 开放接口(匿名只读)

- `GET /api/v1/events` — 统一事件时间线；`?kind= ?company= ?level= ?since= ?q= ?origin=`
- `GET /api/v1/companies[/{id}]` · `GET /api/v1/studies[/{id}]` · `GET /api/v1/prospective` · `GET /api/v1/mrd` · `GET /api/v1/sources`
- `GET /api/v1/stories` · `GET /api/v1/items` · `GET /api/v1/daily` — 监测流水线事件、证据条目与日报
- `POST /api/mcp` — MCP(Streamable HTTP，JSON-RPC 2.0，请求体 ≤ 16KB)：
  `get_top_stories` `get_events` `get_companies` `get_company` `get_prospective` `get_study` `get_mrd_products` `search_items`
- `GET /feed.xml` — RSS 2.0，最近 30 条 L1 / L2 事件
- `/mced-skill/SKILL.md` — Agent Skill(安装命令见 `/agent`，落盘前校验 SHA-256)

```bash
codex mcp add mced-intel --url 'https://gs-mced.geneseeq.com/api/mcp'
claude mcp add --transport http mced-intel 'https://gs-mced.geneseeq.com/api/mcp'
```

## 常用命令

```bash
npm run dev                 # 开发服务器
npm run check               # lint + typecheck + test + build
npm test                    # node:test：流水线、安全回归、证据库完整性
npm run monitor             # 监测运行(自动判定放行)
npm run monitor -- --dry-run --limit 10   # 端到端试跑，不写任何文件
npm run monitor:acceptance  # 模型验收(真实调用四家 provider)
npm run monitor:project     # 由账本重建公开报告
npm run monitor:review -- --list          # 查看 pending 事件
npm run changelog           # 由运行历史生成 public/changelog.json
npm run skill:hash          # 改过 public/mced-skill/SKILL.md 后重算 SHA-256
```

## 项目结构

```
src/
  app/(site)/        # 页面(共享外壳，按请求渲染)
  app/api/           # REST v1 与 MCP
  app/feed.xml/      # RSS
  components/        # shell / feed / home / board / charts / sources / agent / feedback
  data/              # 证据库 JSON + 类型 + 读入口
  lib/               # 事件模型、监测报告读取、API 映射、日期与 URL 工具
  hooks/             # URL 查询状态、本机存储、收藏、主题
scripts/
  mced-daily-monitor.mjs        # 监测编排入口
  lib-monitor-ledger.mjs        # 事件身份、证据门禁、放行与事务写入
  lib-monitor-llm.mjs           # 固定模型职责、严格 Schema、选择性复核与仲裁
  lib-release-gate.mjs          # 发布门禁(所有报告写入方共用)
  evaluate-monitor-acceptance.mjs
  project-public-report.mjs · review-monitor-event.mjs · build-changelog.mjs
  monitor-ledger.json · monitor-sources.json · monitor-acceptance.json · monitor-history.jsonl
tests/               # node:test + 120 个固定验收案例
public/monitor/      # 公开报告
```

技术栈：Next.js 16(App Router)· React 19 · TypeScript strict · Tailwind CSS v4 · lucide-react。部署在腾讯云 EdgeOne，亦兼容 Vercel / Docker standalone。

设计与术语：[`ADR.md`](ADR.md)(流水线决策与修订)· [`CONTEXT.md`](CONTEXT.md)(统一语言)。

## 致谢

- 灵感：[AIHOT](https://aihot.virxact.com/) · 公众号「数字生命卡兹克」
- 脚手架：[ai-website-cloner-template](https://github.com/JCodesMore/ai-website-cloner-template)(MIT)
- License：MIT
