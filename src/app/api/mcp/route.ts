import { readFile } from "node:fs/promises";
import path from "node:path";
import { NextResponse } from "next/server";
import { ALL_COMPETITORS } from "@/components/sites/aihot-virxact-com-e007b012/shared/competitors";

export const dynamic = "force-dynamic";

/**
 * MCP 原型 — 无状态 JSON-RPC 2.0 子集(仅 POST)。
 * 支持 initialize / tools/list / tools/call;notification 返回 202。
 */

interface JsonRpcRequest {
  jsonrpc?: string;
  id?: string | number | null;
  method?: string;
  params?:{
    name?: string;
    arguments?: Record<string, unknown>;
  };
}

interface MonitorItem {
  id: string;
  company: string;
  product: string;
  category: string;
  channel: string;
  title: string;
  source: string;
  date: string;
  url: string;
  note: string;
}

interface MonitorStory {
  id: string;
  company: string;
  product: string;
  title: string;
  heat:number;
  badges: string[];
  sources_count:number;
  categories: string[];
  last_seen: string;
  summary: string;
  score:number;
  reason: string;
}

interface MonitorReport {
  generated_at: string;
  window_since: string;
  items: MonitorItem[];
  stories: MonitorStory[];
}

async function readReport(): Promise<MonitorReport | null> {
  try {
    const raw = await readFile(
      path.join(process.cwd(), "public", "monitor", "daily-report.json"),
      "utf8"
    );
    return JSON.parse(raw) as MonitorReport;
  } catch {
    return null;
  }
}

const TOOLS = [
  {
    name: "get_top_stories",
    description:"获取当前监测窗口内热度最高的前 10 条早筛竞品故事线(含 AI 摘要与评分)。",
    inputSchema:{
      type: "object",properties:{},additionalProperties: false,},},{
    name: "get_companies",
    description:"获取癌症早筛竞品公司摘要列表(技术路线、产品、适应癌种、监管状态)。",
    inputSchema:{
      type: "object",properties:{},additionalProperties: false,},},{
    name: "get_company",
    description:"按公司 id 获取单个竞品的完整档案(含研究性能、检测 panel、信源出处)。",
    inputSchema:{
      type: "object",properties:{
        id:{ type: "string", description:"公司 id，如 grail、geneseeq" },}, required: ["id"],additionalProperties: false,},},{
    name: "search_items",
    description:"在监测条目(新闻 / 文献)的标题与信源中做大小写不敏感搜索，最多返回 10 条。",
    inputSchema:{
      type: "object",properties:{
        query:{ type: "string", description:"搜索关键词" }, category:{
          type: "string",
          enum: ["regulatory", "academic", "research", "market"],
          description:"可选分类过滤",},}, required: ["query"],additionalProperties: false,},},] as const;

function jsonResult(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function jsonError(
  id: string | number | null,
  code:number,
  message: string,
  status = 200
) {
  return NextResponse.json(
    { jsonrpc: "2.0", id, error:{ code, message } },{ status }
  );
}

function textContent(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data,null, 2) }] };
}

async function callTool(
  name: string,args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "get_top_stories":{
      const report = await readReport();
      if (!report) return { error: "monitor_report_missing", hint: "npm run monitor" };
      return {
        generated_at: report.generated_at,
        window_since: report.window_since,
        top_stories: report.stories.slice(0, 10),};
    }
    case "get_companies":{
      return {
        count: ALL_COMPETITORS.length,
        companies: ALL_COMPETITORS.map((c) => ({
          id: c.id,
          co: c.co,
          en: c.en, region: c.region, self: c.self ?? false,
          routes: c.routes,product: c.product,
          cancerLabel: c.cancerLabel,
          mced: c.mced,
          statusKeys: c.statusKeys,
          updatedAt: c.updatedAt,})),};
    }
    case "get_company":{
      const id = typeof args.id === "string" ? args.id : "";
      const company = ALL_COMPETITORS.find((c) => c.id === id);
      if (!company) return { error: "not_found", id };
      return company;
    }
    case "search_items":{
      const report = await readReport();
      if (!report) return { error: "monitor_report_missing", hint: "npm run monitor" };
      const query = typeof args.query === "string" ? args.query.toLowerCase() : "";
      const category =
        typeof args.category === "string" ? args.category :null;
      const matches = report.items
        .filter((item) => (category ? item.category === category : true))
        .filter(
          (item) =>
            item.title.toLowerCase().includes(query) ||
            item.source.toLowerCase().includes(query)
        )
        .slice(0, 10);
      return { count: matches.length, items: matches };
    }
    default:
      return null;
  }
}

export async function POST(request: Request) {
  let body: JsonRpcRequest;
  try {
    body = (await request.json()) as JsonRpcRequest;
  } catch {
    return jsonError(null, -32700, "Parse error");
  }

  const id = body.id ?? null;
  const isNotification = body.id === undefined;

  switch (body.method) {
    case "initialize":
      return jsonResult(id,{
        protocolVersion:"2025-03-26",
        capabilities:{ tools:{} }, serverInfo:{ name: "mced-intel", version:"0.1.0" },});
    case "tools/list":
      return jsonResult(id,{ tools: TOOLS });
    case "tools/call":{
      const name = body.params?.name ?? "";
      const args = body.params?.arguments ?? {};
      const result = await callTool(name,args);
      if (result === null) {
        return jsonError(id, -32602, `Unknown tool: ${name}`);
      }
      return jsonResult(id, textContent(result));
    }
    case "notifications/initialized":
      return new Response(null,{ status: 202 });
    default:
      if (isNotification) {
        return new Response(null,{ status: 202 });
      }
      return jsonError(id, -32601, "Method not found");
  }
}
