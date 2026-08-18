---
name: mced-intel
description: 查询癌症早筛竞品监测数据——公司/产品/性能/每日故事线/日报。
---

# mced-intel · 早筛情报站开放数据

早筛情报站的公开数据接口:癌症早筛(聚焦多癌种液体活检 MCED)竞品公司档案、
前瞻队列性能对照,以及每日监测故事线与 AI 日报。

> 匿名只读原型,无需 API Key。数据含演示与真实文献核验数据,
> 引用性能数字请回原文文献核对。

## 接入路径

### 1. REST API v1(推荐,最简单)

```bash
# 竞品公司摘要列表
curl https://gs-mced.geneseeq.com/api/v1/companies

# 单个竞品完整档案(含研究性能、panel、信源)
curl https://gs-mced.geneseeq.com/api/v1/companies/grail

# 前瞻队列性能对照(非病例对照研究)
curl https://gs-mced.geneseeq.com/api/v1/prospective

# 每日监测故事线(按热度排序,含 AI 摘要与评分)
curl https://gs-mced.geneseeq.com/api/v1/stories

# 监测条目流(可按分类过滤:regulatory|academic|research|market)
curl "https://gs-mced.geneseeq.com/api/v1/items?category=regulatory"

# 每日摘要:AI 日报 + 热度前 5 故事线
curl https://gs-mced.geneseeq.com/api/v1/daily
```

### 2. MCP(JSON-RPC 2.0,POST)

端点:`POST https://gs-mced.geneseeq.com/api/mcp`

```bash
# 初始化
curl -X POST https://gs-mced.geneseeq.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize"}'

# 列出工具
curl -X POST https://gs-mced.geneseeq.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":2,"method":"tools/list"}'

# 调用工具:get_top_stories / get_companies / get_company / search_items
curl -X POST https://gs-mced.geneseeq.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"get_top_stories","arguments":{}}}'

curl -X POST https://gs-mced.geneseeq.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"search_items","arguments":{"query":"FDA","category":"regulatory"}}}'
```

### 3. RSS

```bash
curl https://gs-mced.geneseeq.com/feed.xml
```

每日监测故事线前 20 条,适合接入阅读器或自动化流水线。

### 4. Agent Skill

把 `https://gs-mced.geneseeq.com/mced-skill/SKILL.md`(即本文件)交给支持 Agent Skills 的
工具安装,即可获得上述全部端点的调用说明。

## 数据说明

- 公司/性能数据来自公开文献与会议资料的人工核验(核验日 2026-08-16),
  各条目 `evidence` 字段标注信源;性能数字请以文献原文为准。
- 故事线摘要与评分由模型生成,属情报线索而非结论,重要事实请回原文核对。
- 原型服务不承诺 SLA;个人与组织内部使用免费,对外商业镜像/转售需授权。
