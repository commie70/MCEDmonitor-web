---
name: mced-intel
description: 查询癌症早筛(MCED / 单癌种)竞品情报——事件时间线、企业档案、研究性能、报证进度与公开信源。
---

# mced-intel · 早筛情报站开放数据

早筛情报站持续监测国内外早筛产品的**性能、技术路线、癌种覆盖与报证进度**。
本 Skill 说明如何读取它的公开数据：统一事件时间线、19 家企业档案、研究证据库、MRD 产品矩阵、公开信源库与监测日报。

匿名只读，无需 API Key。所有性能数字都附公开信源链接，引用前请回原文核对。

## 回答约定

- 回答「最近发生了什么」类问题时，先取 `/api/v1/events`，注明时间范围，给出等级(L1 > L2 > L3)、
  中文摘要与信源链接；标题链接到 `https://gs-mced.geneseeq.com/items/{id}`。
- 比较产品性能时注明研究设计：`RCT` / `前瞻干预` / `前瞻注册` / `前瞻队列` 可用于真实筛查场景对照，
  `病例对照` 不可外推，不要与前瞻数据并列比较。
- `note` 字段非空表示该数字与公开原文存在口径差异或出处受限，转述时必须带上。
- 比较 MRD 产品时：检出限(`lod`)按原文记录，`scale` 相同(`vaf` 变异频率 / `tf` 肿瘤分数 / `cells` 克隆比例)
  才可比较，不要在 VAF 与肿瘤分数之间换算；`evidence` 为 `vendor` 的数值是企业宣称，未经同行评议。
  `baselineDetection` 是治疗前血浆的检出率，不是对复发的灵敏度(`sensitivity`)。
  价格(`prices`)要连同 `basis`(价格性质)、`covers`(覆盖内容)与 `asOf` 一起转述，不换算币种。

## 1. REST API v1(推荐)

```bash
# 统一事件时间线：监测流水线事件 + 证据库里程碑，时间倒序
# 过滤：kind=regulatory|readout|publication|conference|launch|deal|corporate|policy|other
#       company=<企业 id>  level=L1,L2  since=YYYY-MM-DD  q=<关键词>  origin=monitor|archive
curl "https://gs-mced.geneseeq.com/api/v1/events?kind=regulatory&since=2026-01-01"

# 企业摘要列表(技术路线 / 产品 / 癌种 / 报证状态)
curl https://gs-mced.geneseeq.com/api/v1/companies

# 单家完整档案(报证节点 + 全部研究的人群、性能与公开信源)
curl https://gs-mced.geneseeq.com/api/v1/companies/grail

# 研究证据；company=<企业 id>  design=<研究设计>
curl "https://gs-mced.geneseeq.com/api/v1/studies?company=geneseeq"
curl https://gs-mced.geneseeq.com/api/v1/studies/grail-pathfinder2

# 前瞻研究性能对照(不含病例对照)
curl https://gs-mced.geneseeq.com/api/v1/prospective

# MRD 产品矩阵：技术选型、检出限、临床性能、报证与支付、公开价格
# 过滤：approach=tumor-informed|tumor-naive  tissue=WES|WGS|panel  region=国内|国外  category=solid|heme
curl "https://gs-mced.geneseeq.com/api/v1/mrd?approach=tumor-informed"

# 信源库；kind=journal|conference|registry|regulator|company|media|internal
curl "https://gs-mced.geneseeq.com/api/v1/sources?kind=journal"

# 监测流水线已发布事件、证据条目与日报
curl https://gs-mced.geneseeq.com/api/v1/stories
curl "https://gs-mced.geneseeq.com/api/v1/items?category=regulatory"
curl https://gs-mced.geneseeq.com/api/v1/daily
```

## 2. MCP(Streamable HTTP，JSON-RPC 2.0)

端点：`POST https://gs-mced.geneseeq.com/api/mcp`

工具：`get_top_stories` · `get_events` · `get_companies` · `get_company` · `get_prospective` · `get_study` · `get_mrd_products` · `search_items`

```bash
curl -X POST https://gs-mced.geneseeq.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

curl -X POST https://gs-mced.geneseeq.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_events","arguments":{"kind":"regulatory","since":"2026-01-01"}}}'
```

## 3. RSS

```bash
curl https://gs-mced.geneseeq.com/feed.xml
```

最近 30 条 L1 / L2 事件，guid 稳定。

## 数据说明

- 企业、研究与报证数据来自公开文献、会议摘要、试验注册与监管文件，逐条附公开链接；
  个别只有现场记录的资料在站内重建为页面(`/sources/{id}`)。
- 监测事件由模型流水线抽取并经独立模型复核，摘要与重要性评分是情报线索而非结论。
- 不承诺 SLA；请自行缓存。个人与组织内部使用免费，对外商业镜像 / 转售需授权。
