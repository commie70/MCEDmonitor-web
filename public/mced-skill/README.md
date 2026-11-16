# mced-intel(早筛情报站 Agent Skill)

早筛产品性能、技术路线、癌种覆盖与报证进度的只读开放接口：事件时间线、企业档案、研究证据、公开信源与监测日报。
匿名访问，无需 API Key。

## 安装

把 `SKILL.md` 的 URL 交给支持 Agent Skills 的工具：

```
https://gs-mced.geneseeq.com/mced-skill/SKILL.md
```

手动安装命令(含 SHA-256 校验)见 <https://gs-mced.geneseeq.com/agent>。

## 验证

```bash
# REST：应返回事件时间线 JSON
curl "https://gs-mced.geneseeq.com/api/v1/events?limit=5"

# MCP：应返回 8 个工具
curl -X POST https://gs-mced.geneseeq.com/api/mcp \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'

# RSS：应返回 RSS 2.0 XML
curl https://gs-mced.geneseeq.com/feed.xml
```

## 注意

- 匿名只读，无写接口，不承诺 SLA，请自行缓存与降级。
- 摘要与重要性评分由模型生成；性能数字以公开原文为准，引用前请回原文核对。
- 个人与组织内部使用免费；对外商业镜像 / 转售需授权。
