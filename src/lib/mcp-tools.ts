/**
 * MCP 工具目录：/api/mcp 的 tools/list 与 Agent 接入页共用同一份定义。
 */

export const MCP_SERVER_VERSION = "1.0.0";

const EVENT_KINDS = ["regulatory", "readout", "publication", "conference", "launch", "deal", "corporate", "policy", "other"];

export const MCP_TOOLS = [
  {
    name: "get_top_stories",
    description:
      "当前最重要的早筛事件：监测流水线已发布事件(top_stories)与近 90 天按等级排序的统一事件(top_events，含报证节点与研究读出)。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_events",
    description:
      "按条件检索事件时间线(监测事件 + 证据库里程碑)，时间倒序，最多 50 条。可按企业、类型、等级、起始日期与关键词过滤。",
    inputSchema: {
      type: "object",
      properties: {
        company: { type: "string", description: "企业 id，如 grail、geneseeq" },
        kind: { type: "string", enum: EVENT_KINDS, description: "事件类型" },
        level: { type: "string", enum: ["L1", "L2", "L3"], description: "情报等级" },
        since: { type: "string", description: "起始日期 YYYY-MM-DD" },
        query: { type: "string", description: "标题 / 摘要关键词" },
        limit: { type: "integer", minimum: 1, maximum: 50 },
      },
      additionalProperties: false,
    },
  },
  {
    name: "get_companies",
    description: "受监测企业摘要列表：技术路线、产品、癌种覆盖、报证状态(含公开信源)。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_company",
    description: "按企业 id 获取完整档案：产品布局、检测 panel、报证节点、全部研究的人群 / 性能 / 公开信源。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "企业 id，如 grail、geneseeq" } },
      required: ["id"],
      additionalProperties: false,
    },
  },
  {
    name: "get_prospective",
    description: "前瞻队列 / 注册 / 干预 / RCT 研究的性能对照表(特异性、灵敏度、早期、TOO)，不含病例对照。",
    inputSchema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "get_study",
    description: "按研究 id 获取单项研究证据；不传 id 时返回全部研究的 id 与名称。",
    inputSchema: {
      type: "object",
      properties: { id: { type: "string", description: "研究 id，如 grail-pathfinder2" } },
      additionalProperties: false,
    },
  },
  {
    name: "get_mrd_products",
    description:
      "MRD(分子残留病灶)产品矩阵：技术选型(tumor-informed / tumor-naive，组织 WES / WGS / panel，血浆追踪方式)、检出限(原文口径，不换算)、临床性能、报证与支付、公开价格，逐项附公开信源。",
    inputSchema: {
      type: "object",
      properties: {
        category: { type: "string", enum: ["solid", "heme"], description: "实体瘤 / 血液肿瘤" },
        approach: { type: "string", enum: ["tumor-informed", "tumor-naive"], description: "技术路径" },
        tissue: { type: "string", enum: ["WES", "WGS", "panel"], description: "定制前的组织测序" },
        region: { type: "string", enum: ["国内", "国外"], description: "地区" },
      },
      additionalProperties: false,
    },
  },
  {
    name: "search_items",
    description: "在已发布事件及其证据条目的标题与信源中做大小写不敏感搜索，各返回最多 10 条。",
    inputSchema: {
      type: "object",
      properties: {
        query: { type: "string", description: "搜索关键词" },
        category: {
          type: "string",
          enum: ["regulatory", "academic", "research", "market"],
          description: "证据条目分类过滤(可选)",
        },
      },
      required: ["query"],
      additionalProperties: false,
    },
  },
] as const;
