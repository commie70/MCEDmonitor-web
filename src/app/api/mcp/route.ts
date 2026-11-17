import { NextResponse } from "next/server";
import { STUDIES, getCompany, getStudy } from "@/data";
import { apiCompanies, apiCompany, apiEvent, apiMrdInstitutionPrices, apiMrdPriceRanges, apiMrdProducts, apiProspective, apiStudy } from "@/lib/api";
import { dateKey } from "@/lib/dates";
import { hotEvents } from "@/lib/events";
import { loadEvents } from "@/lib/load-events";
import { MCP_SERVER_VERSION, MCP_TOOLS } from "@/lib/mcp-tools";
import { readBoundedBody } from "@/lib/read-bounded-body.mjs";

export const dynamic = "force-dynamic";

/**
 * MCP 端点 — 无状态 JSON-RPC 2.0 子集(仅 POST)，匿名只读。
 * 支持 initialize / tools/list / tools/call；notification 返回 202。
 * 边界：请求体 ≤16KB、严格 JSON-RPC 2.0 信封校验、并发上限、调度异常兜底。
 */

const MAX_BODY_BYTES = 16 * 1024;
const MAX_ACTIVE_REQUESTS = 16;
let activeRequests = 0;

interface JsonRpcRequest {
  jsonrpc: "2.0";
  id?: string | number | null;
  method: string;
  params?: { name?: string; arguments?: Record<string, unknown> };
}

function jsonResult(id: string | number | null, result: unknown) {
  return NextResponse.json({ jsonrpc: "2.0", id, result });
}

function jsonError(id: string | number | null, code: number, message: string, status = 200) {
  return NextResponse.json({ jsonrpc: "2.0", id, error: { code, message } }, { status });
}

function textContent(data: unknown) {
  return { content: [{ type: "text", text: JSON.stringify(data, null, 2) }] };
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function text(value: unknown, max = 200): string {
  return typeof value === "string" ? value.slice(0, max) : "";
}

async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  switch (name) {
    case "get_top_stories": {
      const { events, report, today } = await loadEvents();
      return {
        generated_at: report?.generated_at ?? null,
        window_since: report?.window_since ?? null,
        top_stories: (report?.stories ?? []).slice(0, 10),
        top_events: hotEvents(events, today, 90).slice(0, 10).map(apiEvent),
      };
    }
    case "get_events": {
      const { events } = await loadEvents();
      const company = text(args.company);
      const kind = text(args.kind);
      const level = text(args.level);
      const since = text(args.since, 10);
      const needle = text(args.query).toLowerCase();
      const limit = Math.max(1, Math.min(Math.floor(Number(args.limit)) || 20, 50));
      const matches = events.filter(
        (event) =>
          (!company || event.companyId === company) &&
          (!kind || event.kind === kind) &&
          (!level || event.level === level) &&
          (!since || dateKey(event.date) >= dateKey(since)) &&
          (!needle || `${event.title} ${event.summary} ${event.company} ${event.product}`.toLowerCase().includes(needle))
      );
      return { count: matches.length, events: matches.slice(0, limit).map(apiEvent) };
    }
    case "get_companies": {
      const companies = apiCompanies();
      return { count: companies.length, companies };
    }
    case "get_company": {
      const id = text(args.id);
      const company = getCompany(id);
      return company ? apiCompany(company) : { error: "not_found", id };
    }
    case "get_prospective": {
      const prospective = apiProspective();
      return { count: prospective.length, prospective };
    }
    case "get_study": {
      const id = text(args.id);
      if (!id) {
        return {
          count: STUDIES.length,
          studies: STUDIES.map((study) => ({ id: study.id, company_id: study.companyId, type: study.design, name: study.name })),
        };
      }
      const study = getStudy(id);
      return study ? { company_id: study.companyId, ...apiStudy(study) } : { error: "not_found", id };
    }
    case "get_mrd_products": {
      const products = apiMrdProducts({
        category: text(args.category) || undefined,
        approach: text(args.approach) || undefined,
        tissue: text(args.tissue) || undefined,
        tracking: text(args.tracking) || undefined,
        q: text(args.q) || undefined,
        region: text(args.region) || undefined,
      });
      return { count: products.length, products, price_ranges: apiMrdPriceRanges(), institution_prices: apiMrdInstitutionPrices() };
    }
    case "search_items": {
      const { events, report } = await loadEvents();
      const query = text(args.query).toLowerCase();
      const category = text(args.category) || null;
      const items = (report?.items ?? [])
        .filter((item) => (category ? item.category === category : true))
        .filter((item) => item.title.toLowerCase().includes(query) || item.source.toLowerCase().includes(query))
        .slice(0, 10);
      const matched = events
        .filter((event) => `${event.title} ${event.summary} ${event.company}`.toLowerCase().includes(query))
        .slice(0, 10)
        .map(apiEvent);
      return { count: items.length, items, events: matched };
    }
    default:
      return null;
  }
}

/** 读取并校验有界 JSON-RPC 2.0 信封；任何一步不合法都直接返回错误响应。 */
async function parseEnvelope(request: Request): Promise<JsonRpcRequest | NextResponse> {
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
    raw = await readBoundedBody(request, MAX_BODY_BYTES);
  } catch (error) {
    if (error instanceof RangeError && error.message === "body too large") {
      return jsonError(null, -32600, "Invalid Request: body too large", 413);
    }
    if (error instanceof RangeError && error.message === "body timeout") {
      return jsonError(null, -32600, "Invalid Request: body timeout", 408);
    }
    return jsonError(null, -32700, "Parse error");
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
    params: isPlainObject(value.params) ? (value.params as JsonRpcRequest["params"]) : undefined,
  };
}

async function handlePost(request: Request) {
  const parsed = await parseEnvelope(request);
  if (parsed instanceof NextResponse) return parsed;
  const body = parsed;
  const id = body.id ?? null;
  const isNotification = body.id === undefined;

  switch (body.method) {
    case "initialize":
      return jsonResult(id, {
        protocolVersion: "2025-03-26",
        capabilities: { tools: {} },
        serverInfo: { name: "mced-intel", version: MCP_SERVER_VERSION },
      });
    case "ping":
      return jsonResult(id, {});
    case "tools/list":
      return jsonResult(id, { tools: MCP_TOOLS });
    case "tools/call": {
      const name = typeof body.params?.name === "string" ? body.params.name : "";
      const args = isPlainObject(body.params?.arguments) ? body.params.arguments : {};
      try {
        const result = await callTool(name, args);
        if (result === null) return jsonError(id, -32602, `Unknown tool: ${name}`);
        return jsonResult(id, textContent(result));
      } catch {
        return jsonError(id, -32603, "Internal error");
      }
    }
    case "notifications/initialized":
      return new Response(null, { status: 202 });
    default:
      if (isNotification) return new Response(null, { status: 202 });
      return jsonError(id, -32601, "Method not found");
  }
}

export async function POST(request: Request) {
  if (activeRequests >= MAX_ACTIVE_REQUESTS) {
    return jsonError(null, -32600, "Too many active requests", 429);
  }
  activeRequests++;
  try {
    return await handlePost(request);
  } finally {
    activeRequests--;
  }
}

/** 浏览器直接打开时给出可读提示，而不是 405。 */
export function GET() {
  return NextResponse.json(
    {
      name: "mced-intel",
      version: MCP_SERVER_VERSION,
      transport: "POST JSON-RPC 2.0",
      tools: MCP_TOOLS.map((tool) => tool.name),
      docs: "/agent",
    },
    { headers: { Allow: "GET, POST" } }
  );
}
