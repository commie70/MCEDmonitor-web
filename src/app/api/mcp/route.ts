import { NextResponse } from "next/server";
import { ALL_COMPETITORS } from "@/components/sites/aihot-virxact-com-e007b012/shared/competitors";
import { readMonitorReport } from "@/components/sites/aihot-virxact-com-e007b012/shared/monitor-report";

export const dynamic = "force-dynamic";

/**
 * MCP 原型 — 无状态 JSON-RPC 2.0 子集(仅 POST)。
 * 支持 initialize / tools/list / tools/call;notification 返回 202。
 * 边界:请求体 ≤16KB、严格 JSON-RPC 2.0 信封校验、调度异常兜底。
 */

const MAX_BODY_BYTES = 16 * 1024;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: {
    name?: string;
    arguments?: Record<string, unknown>;
  };
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

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

async function callTool(
  name: string,args: Record<string, unknown>
): Promise<unknown> {
  switch (name) {
    case "get_top_stories":{
      const report = await readMonitorReport();
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
      const report = await readMonitorReport();
      if (!report) return { error: "monitor_report_missing", hint: "npm run monitor" };
      const query =
        typeof args.query === "string" ? args.query.slice(0, 200).toLowerCase() : "";
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

/** 读取并校验有界 JSON-RPC 2.0 信封;任何一步不合法都直接返回错误响应。 */
async function parseEnvelope(
  request: Request
): Promise<JsonRpcRequest | NextResponse> {
  const contentType = (request.headers.get("content-type") ?? "").toLowerCase();
  if (!contentType.includes("application/json")) {
    return jsonError(null, -32600, "Invalid Request: content-type must be application/json", 415);
  }
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_BODY_BYTES) {
    return jsonError(null, -32600, "Invalid Request: body too large", 413);
  }
  let raw: string;
  try {
    raw = await request.text();
  } catch {
    return jsonError(null, -32700, "Parse error");
  }
  if (Buffer.byteLength(raw, "utf8") > MAX_BODY_BYTES) {
    return jsonError(null, -32600, "Invalid Request: body too large", 413);
  }
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    return jsonError(null, -32700, "Parse error");
  }
  if (!isPlainObject(value)) {
    return jsonError(null, -32600, "Invalid Request: expected a JSON-RPC object");
  }
  if (value.jsonrpc !== "2.0") {
    return jsonError(null, -32600, 'Invalid Request: jsonrpc must be "2.0"');
  }
  if (typeof value.method !== "string" || !value.method) {
    return jsonError(null, -32600, "Invalid Request: method must be a non-empty string");
  }
  const id = value.id;
  if (id !== undefined && id !== null && typeof id !== "string" && typeof id !== "number") {
    return jsonError(null, -32600, "Invalid Request: id must be a string, number, or null");
  }
  return {
    jsonrpc: "2.0",
    id: id as string | number | null | undefined,
    method: value.method,
    params: isPlainObject(value.params)
      ? (value.params as JsonRpcRequest["params"])
      : undefined,
  };
}

export async function POST(request: Request) {
  const parsed = await parseEnvelope(request);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed;

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
      const name = typeof body.params?.name === "string" ? body.params.name : "";
      const args = isPlainObject(body.params?.arguments)
        ? (body.params.arguments as Record<string, unknown>)
        : {};
      try {
        const result = await callTool(name,args);
        if (result === null) {
          return jsonError(id, -32602, `Unknown tool: ${name}`);
        }
        return jsonResult(id, textContent(result));
      } catch {
        return jsonError(id, -32603, "Internal error");
      }
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
