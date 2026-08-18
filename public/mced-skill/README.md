# mced-intel(早筛情报站 Agent Skill)

癌症早筛竞品监测数据的只读开放接口:公司档案、前瞻队列性能、每日故事线与 AI 日报。
匿名访问,无需 API Key。

## 安装

把 `SKILL.md` 的 URL 交给支持 Agent Skills 的工具:

```
https://gs-mced.geneseeq.com/mced-skill/SKILL.md
```

或直接阅读 [`SKILL.md`](./SKILL.md) 获取全部端点与 curl 示例。

## 验证

```bash
# REST:应返回竞品公司列表 JSON
curl https://gs-mced.geneseeq.com/api/v1/companies

# MCP:应返回 4 个工具(get_top_stories / get_companies / get_company / search_items)
curl -X POST https://gs-mced.geneseeq.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# RSS:应返回 RSS 2.0 XML
curl https://gs-mced.geneseeq.com/feed.xml
```

## 注意

- 匿名只读原型,无写接口与单篇正文 API,不承诺 SLA,请自行缓存与降级。
- AI 摘要/评分由模型生成;性能数字以文献原文为准,引用前请回原文核对。
- 个人与组织内部使用免费;对外商业镜像/转售需授权。
