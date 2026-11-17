#!/usr/bin/env node

/**
 * MCED 增量监测编排入口。
 *
 * 顺序固定为：权威信源/单一发现面采集 → 正文与日期 → 事件识别 → 证据门禁
 * → 重要性档位 → 人工复核门禁 → 事件账本与公开读模型事务写入。
 *
 * 公开报告是事件账本的投影(public/monitor/daily-report.json)，两级门禁全部自动判定：
 *   - 运行级(lib-release-gate.mjs)：固定验收集通过即开放，没有观察期；
 *     门禁未开时照常采集、建账(影子运行)，新事件留在账本里，已放行的事件不撤下；
 *     门禁开放后同一条命令自动放行，不需要人工切换。
 *   - 事件级：证据置信度、重要性等级；高风险事件须经独立模型复核一致(或仲裁解决)。
 * --mode shadow 强制影子运行；--mode publish 在门禁未开时直接报错。
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanScrapedMarkdown, scrapeMarkdown, scrapeRenderedHtml } from "./lib-content-enrich.mjs";
import {
  atomicWriteBundle,
  classifyEventType,
  evidenceIdentity,
  loadJson,
  loadLedger,
  mergeCandidate,
  normalizeUrl,
  pendingRetryHits,
  projectPublicReport,
  recallCandidateEvents,
  recordPendingCandidate,
  knownUrls,
  recordRejectedCandidate,
  releaseEligibleEvents,
  stalledCandidates,
  validateLedger,
  validateSourceRegistry,
} from "./lib-monitor-ledger.mjs";
import { createMonitorLlm, providerConfiguration } from "./lib-monitor-llm.mjs";
import {
  isSourceDue,
  recordSourceFailure,
  recordSourceSuccess,
  sourceHasCoverageGap,
  validateMonitorRunOptions,
} from "./lib-monitor-schedule.mjs";
import { loadReleaseGate, publicRelease } from "./lib-release-gate.mjs";
import { extractOfficialLinks, selectNewLinks, stripHtml } from "./lib-official-links.mjs";
import { collectWeixinArticles } from "./lib-weixinzs-monitor.mjs";
import { inferItemDate } from "./lib-stale.mjs";
import {
  fetchPublic,
  readCappedBody,
  publicErrorCode,
  validatePublicUrl,
} from "./lib-network-security.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "scripts", "monitor-sources.json");
const LEDGER_PATH = path.join(ROOT, "scripts", "monitor-ledger.json");
const HISTORY_PATH = path.join(ROOT, "scripts", "monitor-history.jsonl");
const REPORT_PATH = path.join(ROOT, "public", "monitor", "daily-report.json");
const SHADOW_REPORT_PATH = path.join(ROOT, ".monitor", "shadow-report.json");

const ANYSEARCH_DEFAULT_URL = "https://api.anysearch.com/mcp";
const ANYSEARCH_CLIENT = "mced-monitor/3.0";
const FETCH_TIMEOUT_MS = 30_000;
const FETCH_GAP_MS = 350;
const MAX_RETRIES = 3;
// 每个企业新闻源只看列表最前面的 12 条，一次运行最多取 8 条未见过的。
const OFFICIAL_LINK_WINDOW = 12;
const MAX_OFFICIAL_LINKS = 8;
const MAX_DISCOVERY_RESULTS = 5;
const MAX_CONTENT_CHARS = 12_000;
const MAX_COLLECTED_HITS = 2_000;
const MAX_RETRY_HITS = 500;
// CI 任务 60 分钟超时；被超时终止的运行不会落盘，下次从同一游标重来、再次超时。
// 所以到达预算后把剩余候选存为可重放的 pending，本次照常写账本，下次运行接着处理。
const RUN_BUDGET_MS = Math.max(1, Number(process.env.MCED_RUN_BUDGET_MINUTES) || 35) * 60_000;

let lastRequestAt = 0;
const args = validateMonitorRunOptions(parseArgs(process.argv.slice(2)));
const startedAt = Date.now();
const runAt = new Date().toISOString();

main().catch(async (error) => {
  const failure = {
    ts: new Date().toISOString(),
    status: "fatal",
    stage: error.stage || "orchestration",
    error_category: error.name || "Error",
    error_code: publicErrorCode(error, error.stage || "orchestration"),
    duration_ms: Date.now() - startedAt,
  };
  await fs.appendFile(HISTORY_PATH, `${JSON.stringify(failure)}\n`, "utf8").catch(() => {});
  console.error(`[mced-monitor] fatal: ${failure.error_code}`);
  process.exitCode = 1;
});

async function main() {
  const registry = validateSourceRegistry(await loadJson(CONFIG_PATH));
  const ledger = await loadLedger(LEDGER_PATH);
  ledger.last_publication_event_ids = [];
  const requestedMode = args.mode || registry.release_mode || "auto";
  if (!new Set(["auto", "shadow", "publish"]).has(requestedMode)) {
    throw new Error(`unsupported mode ${requestedMode}`);
  }
  const modelConfig = providerConfiguration();
  const gate = await loadReleaseGate(ROOT);
  const acceptance = gate.acceptance;
  if (requestedMode === "publish" && !gate.gate_open) {
    throw new Error(`publish_gate: ${gate.reason}`);
  }
  const gateOpen = requestedMode === "shadow" ? false : gate.gate_open;
  const mode = gateOpen ? "publish" : "shadow";
  const release = publicRelease({
    ...gate,
    gate_open: gateOpen,
    reason: gateOpen ? null : gate.reason || "shadow_mode",
  });

  const collectionSince = String(ledger.last_successful_run_at || ledger.monitoring_baseline).slice(0, 10);
  const context = {
    registry,
    ledger,
    collectionSince,
    errors: [],
    coverageGaps: [],
    timings: {},
  };

  console.log(
    `[mced-monitor] mode=${mode} gate=${release.reason || "open"} since=${collectionSince} sources=${registry.sources.length} discovery=${registry.discovery_queries.length}`
  );

  const collectedAt = Date.now();
  const retryHits = pendingRetryHits(ledger).slice(0, MAX_RETRY_HITS);
  const hits = [...retryHits, ...(await collectHits(context))];
  if (hits.length > MAX_COLLECTED_HITS) throw new Error("collected_hit_budget_exceeded");
  context.timings.collection_ms = Date.now() - collectedAt;

  const processedAt = Date.now();
  const llm = createMonitorLlm();
  const metrics = {
    collected_hits: hits.length,
    canonical_duplicates: 0,
    first: 0,
    update: 0,
    duplicate: 0,
    backfill: 0,
    pending: 0,
    rejected: 0,
    failed: 0,
    moa_escalations: 0,
    model_calls: 0,
    provider_configuration: modelConfig,
    acceptance_passed: acceptance.passed,
    acceptance_fixture_sha256: acceptance.fixtureSha256,
  };

  // 试跑(--dry-run --limit N)只抓取约 2N 条命中的正文，均匀取样以覆盖各类信源。
  const sampleStep = Number.isFinite(args.limit) ? Math.max(1, Math.floor(hits.length / (args.limit * 2))) : 1;
  const enrichedAt = Date.now();
  const candidates = await enrichHits(
    hits.filter((_, index) => index % sampleStep === 0),
    context
  );
  context.timings.enrichment_ms = Date.now() - enrichedAt;
  const uniqueCandidates = dedupeCandidates(candidates, metrics);
  const limitedCandidates = Number.isFinite(args.limit)
    ? uniqueCandidates.slice(0, args.limit)
    : uniqueCandidates;

  const candidateStatesBefore = new Map(
    ledger.candidates.map((candidate) => [candidate.id, `${candidate.status}:${candidate.stage}`])
  );
  metrics.deferred = 0;
  for (const candidate of limitedCandidates) {
    if (Date.now() - startedAt > RUN_BUDGET_MS) {
      recordPendingCandidate(ledger, baseCandidate(candidate), {
        stage: "run_budget",
        errorCategory: "run_budget_exceeded",
        incrementRetry: false,
      });
      metrics.pending++;
      metrics.deferred++;
      continue;
    }
    await processCandidate(candidate, { ...context, llm, modelConfig, metrics });
  }
  context.timings.processing_ms = Date.now() - processedAt - context.timings.enrichment_ms;

  ledger.last_successful_run_at = runAt;
  metrics.released = gateOpen ? releaseEligibleEvents(ledger, runAt) : 0;
  validateLedger(ledger);

  let digest = null;
  const projection = (extra) =>
    projectPublicReport(ledger, {
      generatedAt: runAt,
      sourceCount: new Set(registry.discovery_queries.map((query) => query.company)).size + 1,
      manualTasks: buildManualTasks(registry),
      errors: context.errors,
      gateOpen,
      release,
      ...extra,
    });
  let report = projection({ metrics: {} });
  const verifiedDaily = report.views.daily_event_ids
    .map((id) => report.stories.find((story) => story.id === id))
    .filter(Boolean)
    .map((story) => ({
      id: story.id,
      company: story.company,
      product: story.product,
      event_type: story.event_type,
      occurred_at: story.occurred_at,
      summary: story.summary,
      reason: story.reason,
      score_breakdown: story.score_breakdown,
      evidence_summary: story.evidence_summary,
    }));

  if (!args.skipLlm && verifiedDaily.length && modelConfig.synthesizer.configured) {
    try {
      digest = await llm.digest(verifiedDaily);
      metrics.model_calls++;
    } catch (error) {
      context.errors.push(runError("digest", "kimi", error));
    }
  }

  context.timings.total_ms = Date.now() - startedAt;
  const runMetrics = {
    ...metrics,
    ...context.timings,
    coverage_gaps: context.coverageGaps.length,
    candidate_total: ledger.candidates.length,
    event_total: ledger.events.length,
    evidence_total: ledger.evidence.length,
    review_backlog: ledger.events.filter((event) => event.review_status === "pending").length,
    stalled_candidates: stalledCandidates(ledger).length,
    errors: context.errors.length,
    estimated_model_cost: null,
    gate_open: gateOpen,
  };
  report = projection({ digest, metrics: runMetrics });

  if (args.dryRun) {
    const tally = (values) =>
      values.reduce((counts, value) => ({ ...counts, [value]: (counts[value] || 0) + 1 }), {});
    console.log(`[mced-monitor] dry-run: ${JSON.stringify({ ...runMetrics, provider_configuration: undefined })}`);
    console.log(
      `[mced-monitor] dry-run errors: ${JSON.stringify(tally(context.errors.map((error) => `${error.stage}:${error.error_code}`)))}`
    );
    for (const error of context.errors) {
      console.log(`[mced-monitor]   ${`${error.stage}:${error.error_code}`.padEnd(28)} ${error.source_id}`);
    }
    console.log(
      `[mced-monitor] dry-run candidates: ${JSON.stringify(
        tally(
          ledger.candidates
            .map((candidate) => [candidate.id, `${candidate.status}:${candidate.stage}`])
            .filter(([id, state]) => candidateStatesBefore.get(id) !== state)
            .map(([, state]) => state)
        )
      )}`
    );
    // 逐条列出本次试跑处理过的候选，便于判断 pending / rejected 是否合理。
    for (const candidate of ledger.candidates) {
      const state = `${candidate.status}:${candidate.stage}`;
      if (candidateStatesBefore.get(candidate.id) === state) continue;
      console.log(`[mced-monitor]   ${state.padEnd(28)} ${candidate.company} | ${String(candidate.title).slice(0, 90)} | ${candidate.url}`);
    }
    return;
  }

  // 公开报告始终由门禁过滤后的投影写出；影子运行另存一份完整投影供本地核对(不入库)。
  const targetReport = REPORT_PATH;
  await atomicWriteBundle([
    { path: LEDGER_PATH, value: ledger },
    { path: REPORT_PATH, value: report },
    ...(gateOpen
      ? []
      : [{ path: SHADOW_REPORT_PATH, value: projection({ digest, metrics: runMetrics, gateOpen: true }) }]),
  ]);
  await fs.appendFile(
    HISTORY_PATH,
    `${JSON.stringify({
      ts: runAt,
      status: "success",
      mode,
      report: path.relative(ROOT, targetReport),
      ...runMetrics,
      candidate_errors: context.errors,
    })}\n`,
    "utf8"
  );
  console.log(
    `[mced-monitor] ${hits.length} hits → first ${metrics.first} / update ${metrics.update} / duplicate ${metrics.duplicate} / backfill ${metrics.backfill} / pending ${metrics.pending}; ${path.relative(
      ROOT,
      targetReport
    )}`
  );
}

async function collectHits(context) {
  if (args.skipCollection) return [];
  const hits = [];
  for (const source of context.registry.sources.filter((entry) => entry.enabled)) {
    const supported =
      source.type === "pubmed_query" ||
      source.type === "openfda_query" ||
      (source.type === "official_web" && !args.skipOfficial) ||
      source.type === "weixinzs_articles";
    if (!supported || !isSourceDue(source, context.ledger, runAt)) continue;
    let cursorAt = null;
    try {
      let collected = [];
      if (["pubmed_query", "openfda_query", "weixinzs_articles"].includes(source.type)) {
        const sourceRun = context.ledger.source_runs?.[source.source_id];
        cursorAt =
          sourceRun?.cursor_at ||
          sourceRun?.last_success_at ||
          `${context.collectionSince}T00:00:00.000Z`;
      }
      if (source.type === "pubmed_query") {
        collected = await collectPubMed(source, {
          ...context,
          collectionSince: cursorAt.slice(0, 10),
        });
      } else if (source.type === "openfda_query") {
        collected = await collectOpenFda(source, {
          ...context,
          collectionSince: cursorAt.slice(0, 10),
        });
      } else if (source.type === "official_web") {
        collected = await collectOfficialWeb(source, context);
      } else if (source.type === "weixinzs_articles") {
        collected = await collectWeixinArticles({
          source,
          apiKey: process.env[source.api_key_env || "WEIXINZS_API_KEY"],
          baseUrl: process.env.WEIXINZS_BASE_URL,
          since: cursorAt,
          until: runAt,
          discoveredAt: runAt,
        });
      }
      if (hits.length + collected.length > MAX_COLLECTED_HITS) throw new Error("collected_hit_budget_exceeded");
      for (const hit of collected) hits.push(hit);
      recordSourceSuccess(context.ledger, source, runAt, collected.length);
    } catch (error) {
      recordSourceFailure(context.ledger, source, runAt, error, { cursorAt });
      if (
        sourceHasCoverageGap(source, context.ledger) &&
        !context.coverageGaps.includes(source.source_id)
      ) {
        context.coverageGaps.push(source.source_id);
        context.errors.push(
          runError(
            "coverage",
            source.source_id,
            new Error("source failed at least three consecutive collection attempts")
          )
        );
      }
      context.errors.push(runError("collection", source.source_id, error));
    }
  }

  const isKnownUrl = urlIsKnown(knownUrls(context.ledger));
  if (!args.skipDiscovery && context.registry.discovery_provider?.enabled) {
    for (const query of context.registry.discovery_queries.filter((entry) => entry.enabled)) {
      try {
        // 搜索每次都会返回同一批热门链接；已有结论的不再当作新候选重复抓取、重复分析。
        const discovered = (await collectAnySearch(query, context)).filter((hit) => !isKnownUrl(hit.url));
        if (hits.length + discovered.length > MAX_COLLECTED_HITS) throw new Error("collected_hit_budget_exceeded");
        for (const hit of discovered) hits.push(hit);
      } catch (error) {
        context.coverageGaps.push(query.query_id);
        context.errors.push(runError("discovery", query.query_id, error));
      }
    }
  }
  return hits;
}

async function collectPubMed(source, context) {
  const retmax = Math.min(Number(context.registry.retmax_per_query || 8), 50);
  const query = `(${source.query}) AND ("${context.collectionSince}"[Date - Publication] : "3000"[Date - Publication])`;
  const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  searchUrl.search = new URLSearchParams({
    db: "pubmed",
    retmode: "json",
    sort: "pub date",
    retmax: String(retmax),
    term: query,
  });
  const idsJson = await fetchJson(searchUrl, source.source_id);
  const ids = (idsJson.esearchresult?.idlist || [])
    .map(String)
    .filter((id) => /^\d{1,12}$/.test(id))
    .slice(0, retmax);
  if (!ids.length) return [];

  const summaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
  summaryUrl.search = new URLSearchParams({ db: "pubmed", retmode: "json", id: ids.join(",") });
  const summary = await fetchJson(summaryUrl, source.source_id);
  const result = summary.result || {};
  return (result.uids || []).map(String).filter((uid) => ids.includes(uid)).slice(0, retmax).flatMap((uid) => {
    const document = result[uid];
    if (!document) return [];
    const doiValue = String((document.articleids || []).slice(0, 50).find((entry) => entry.idtype === "doi")?.value || "");
    const doi = /^10\.\d{4,9}\/[-._;()/:A-Z0-9]{1,240}$/i.test(doiValue) ? doiValue : null;
    return [
      {
        company: source.coverage.companies[0],
        product: source.coverage.products[0],
        title: stripHtml(document.title || "").slice(0, 500),
        url: doi ? `https://doi.org/${doi}` : `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
        source_label: String(document.fulljournalname || document.source || "PubMed").slice(0, 200),
        published_at: toIso(document.pubdate),
        discovered_at: runAt,
        snippet: `PMID ${uid}`,
        content: "",
        source,
        event_type_hint: "publication",
        has_new_content_cursor: true,
        legacy_ids: [`pmid:${uid}`],
      },
    ];
  });
}

async function collectOpenFda(source, context) {
  const hits = [];
  for (const endpoint of ["pma", "de%20novo"]) {
    const search = `applicant:"${source.applicant}" AND decision_date:[${context.collectionSince.replaceAll(
      "-",
      ""
    )} TO 99991231]`;
    const url = `https://api.fda.gov/device/${endpoint}.json?search=${encodeURIComponent(
      search
    )}&sort=decision_date:desc&limit=8`;
    const json = await fetchJson(url, source.source_id, { tolerate404: true });
    for (const result of (json?.results || []).slice(0, 8)) {
      const pma = String(result.pma_number || result.pma_submission_number || "").slice(0, 100);
      hits.push({
        company: source.coverage.companies[0],
        product: source.coverage.products[0],
        title: `${result.tradename || source.coverage.products[0]} — ${
          result.decision_code || result.decision || "FDA 审评动态"
        }`.slice(0, 500),
        url: `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=${encodeURIComponent(pma)}`,
        source_label: `openFDA ${endpoint === "pma" ? "PMA" : "De Novo"} (${pma || "—"})`,
        published_at: toIso(result.decision_date),
        discovered_at: runAt,
        snippet: String(result.generic_name || "").slice(0, 2000),
        content: JSON.stringify(result).slice(0, MAX_CONTENT_CHARS),
        source,
        event_type_hint: "regulatory_decision",
        has_new_content_cursor: true,
        legacy_ids: pma ? [`fda:${pma}`] : [],
      });
    }
  }
  return hits;
}

async function collectOfficialWeb(source, context) {
  let links = extractOfficialLinks(await fetchText(source.url, source.source_id), source.url);
  // 列表由脚本渲染时静态 HTML 里没有链接：改取浏览器渲染后的页面。
  if (!links.length && process.env.FIRECRAWL_API_KEY) {
    links = extractOfficialLinks(await scrapeRenderedHtml(source.url), source.url);
  }
  // 新闻源里一条新闻链接都认不出，是信源坏了(改版、搬家、被拦截)，不是「没有新内容」。
  if (!links.length) throw new Error("listing_has_no_news_links");
  const isKnown = urlIsKnown(knownUrls(context.ledger));
  return selectNewLinks(links, isKnown, {
    window: OFFICIAL_LINK_WINDOW,
    max: MAX_OFFICIAL_LINKS,
  })
    .map((link) => ({
      company: source.coverage.companies[0],
      product: source.coverage.products[0],
      title: link.title,
      url: link.url,
      source_label: source.editorial_owner,
      published_at: link.published_at,
      discovered_at: runAt,
      snippet: "",
      content: "",
      source,
      event_type_hint: classifyEventType({ title: link.title }),
      has_new_content_cursor: false,
      legacy_ids: [],
    }));
}

async function collectAnySearch(query, context) {
  const endpoint = process.env.ANYSEARCH_BASE_URL || ANYSEARCH_DEFAULT_URL;
  const headers = {
    "Content-Type": "application/json",
    "X-Anysearch-Client": ANYSEARCH_CLIENT,
  };
  if (process.env.ANYSEARCH_API_KEY) headers.Authorization = `Bearer ${process.env.ANYSEARCH_API_KEY}`;
  const response = await throttledFetch(endpoint, query.query_id, {
    method: "POST",
    headers,
    body: JSON.stringify({
      jsonrpc: "2.0",
      id: query.query_id,
      method: "tools/call",
      params: {
        name: "search",
        arguments: { query: query.query, max_results: MAX_DISCOVERY_RESULTS },
      },
    }),
  });
  if (!response.ok) throw new Error(`AnySearch HTTP ${response.status}`);
  const payload = JSON.parse(await readCappedBody(response, `${query.query_id}_response`));
  if (payload.error) throw new Error(payload.error.message || "AnySearch RPC error");
  const markdown = (payload.result?.content || [])
    .slice(0, 20)
    .filter((item) => item.type === "text")
    .map((item) => String(item.text || "").slice(0, 10_000))
    .join("\n")
    .slice(0, 120_000);
  return parseAnySearchMarkdown(markdown).slice(0, MAX_DISCOVERY_RESULTS).map((result) => ({
    company: query.company,
    product: query.product,
    title: result.title,
    url: result.url,
    source_label: hostOf(result.url),
    published_at: null,
    discovered_at: runAt,
    snippet: result.snippet,
    content: "",
    source: sourceForUrl(result.url, query.company, context.registry),
    event_type_hint: classifyEventType({ title: result.title }),
    has_new_content_cursor: false,
    legacy_ids: [],
  }));
}

async function enrichHits(hits, context) {
  const enriched = [];
  for (const hit of hits) {
    const dateFromHit = normalizeInferredDate(hit.published_at);
    // 超出运行预算后不再抓正文：这些候选会被延后，正文留给下次运行抓取。
    if (args.skipContent || hit.content || Date.now() - startedAt > RUN_BUDGET_MS) {
      enriched.push({ ...hit, published_at: dateFromHit, content_status: hit.content ? "fetched" : "not_fetched" });
      continue;
    }
    try {
      await validatePublicUrl(hit.url);
    } catch (error) {
      context.errors.push(runError("url_validation", hit.source.source_id, error));
      continue;
    }
    try {
      const content = await fetchEvidenceContent(hit.url, { allowDirectFallback: hit.source.tier !== "discovery" });
      const inferred = inferItemDate({
        url: hit.url,
        title: hit.title,
        snippet: hit.snippet,
        content,
      });
      enriched.push({
        ...hit,
        content,
        content_status: "fetched",
        published_at: dateFromHit || normalizeInferredDate(inferred),
      });
    } catch (error) {
      context.errors.push(runError("content", hit.source.source_id, error));
      enriched.push({ ...hit, published_at: dateFromHit, content_status: "failed" });
    }
  }
  return enriched;
}

function dedupeCandidates(hits, metrics) {
  const unique = new Map();
  for (const hit of hits) {
    try {
      const identity = evidenceIdentity(hit);
      if (unique.has(identity.id)) {
        metrics.canonical_duplicates++;
        continue;
      }
      unique.set(identity.id, { ...hit, id: `cand_${identity.id.slice(4)}` });
    } catch {
      metrics.failed++;
    }
  }
  return [...unique.values()];
}

/** 链接是否已有结论；无法规范化的地址按已知处理，不进入候选。 */
function urlIsKnown(known) {
  return (url) => {
    try {
      return known.has(normalizeUrl(url));
    } catch {
      return true;
    }
  };
}

/** 模型处理之前的候选形态：事件类型取确定性规则，其余字段留空。 */
function baseCandidate(candidate) {
  return {
    ...candidate,
    event_type: candidate.event_type_hint || classifyEventType(candidate),
    occurred_at: null,
    facts: {},
    importance: { relevance: 0, impact: 0, actionability: 0 },
    summary: "",
    reason: "",
    risk_flags: [],
    analyses: [],
  };
}

async function processCandidate(candidate, context) {
  const candidateEvidenceId = evidenceIdentity(candidate).id;
  const existingEvidence = context.ledger.evidence.find(
    (evidence) => evidence.id === candidateEvidenceId
  );
  const base = baseCandidate(candidate);

  if (existingEvidence) {
    const existingEvent = context.ledger.events.find((event) => event.evidence_ids.includes(existingEvidence.id));
    if (existingEvent) {
      base.event_type = existingEvent.event_type;
      base.occurred_at = existingEvent.occurred_at;
      base.published_at = base.published_at || existingEvent.published_at;
      base.facts = existingEvent.fact_revisions.at(-1)?.facts || {};
      base.importance = existingEvent.importance;
      const merged = mergeCandidate(context.ledger, base, { now: runAt });
      context.metrics[merged.status]++;
      return;
    }
  }

  if (args.skipLlm || !context.modelConfig.qwen.configured) {
    recordPendingCandidate(context.ledger, base, {
      stage: "model_configuration",
      errorCategory: args.skipLlm ? "llm_skipped" : "provider_configuration_missing",
      incrementRetry: false,
    });
    context.metrics.pending++;
    return;
  }

  try {
    if (
      ["failed", "not_fetched"].includes(base.content_status) &&
      looksLikeVisual(base.url) &&
      context.modelConfig.vision.configured
    ) {
      const vision = await context.llm.extractVision(
        { id: base.id, title: base.title, url: base.url, snippet: base.snippet },
        [base.url]
      );
      base.content = vision.text;
      base.content_status = "vision_extracted";
      base.analyses.push(...vision.analyses);
      context.metrics.model_calls += vision.analyses.length;
    }

    if (["failed", "not_fetched"].includes(base.content_status)) {
      // 抓取失败算一次尝试：正文始终取不到的页面到上限后搁置，不再每次运行都去抓。
      // 没去抓(超出预算、--skip-content)不算。
      recordPendingCandidate(context.ledger, base, {
        stage: "content_extraction",
        errorCategory: `content_${base.content_status}`,
        incrementRetry: base.content_status === "failed",
      });
      context.metrics.pending++;
      return;
    }

    const analyzed = await context.llm.analyzeCandidate({
      id: base.id,
      title: base.title,
      url: base.url,
      source_id: base.source.source_id,
      editorial_owner: base.source.editorial_owner,
      published_at: base.published_at,
      discovered_at: base.discovered_at,
      snippet: base.snippet,
      content: base.content,
    });
    context.metrics.model_calls += analyzed.analyses.length;
    context.metrics.moa_escalations += analyzed.analyses.filter((analysis) =>
      ["glm", "kimi"].includes(analysis.provider)
    ).length;

    if (analyzed.status === "rejected") {
      recordRejectedCandidate(context.ledger, base, {
        stage: analyzed.stage,
        analyses: analyzed.analyses,
      });
      context.metrics.rejected++;
      return;
    }
    if (analyzed.status !== "ready") {
      recordPendingCandidate(context.ledger, base, {
        stage: analyzed.stage,
        errorCategory: "model_uncertain",
        analyses: analyzed.analyses,
      });
      context.metrics.pending++;
      return;
    }

    const extraction = analyzed.extraction;
    const ready = {
      ...base,
      company: extraction.company || base.company,
      product: extraction.product || base.product,
      event_type: extraction.event_type,
      occurred_at: extraction.occurred_at,
      published_at: extraction.published_at || base.published_at,
      facts: Object.fromEntries(extraction.facts.map((fact) => [fact.name, fact.value])),
      risk_flags: extraction.risk_flags,
      importance: analyzed.importance,
      summary: analyzed.summary,
      reason: analyzed.reason,
      model_review: analyzed.model_review,
      analyses: [...base.analyses, ...analyzed.analyses],
    };
    const recalled = recallCandidateEvents(context.ledger, ready);
    let matcherResult = null;
    if (recalled.length) {
      const matched = await context.llm.judgeMatch(
        {
          id: ready.id,
          title: ready.title,
          event_type: ready.event_type,
          occurred_at: ready.occurred_at,
          published_at: ready.published_at,
          facts: ready.facts,
          evidence_ref: evidenceIdentity(ready).id,
        },
        recalled,
        {
          highRisk:
            ready.risk_flags.length > 0 ||
            ["regulatory_decision", "clinical_readout"].includes(ready.event_type) ||
            analyzed.importance.relevance +
              analyzed.importance.impact +
              analyzed.importance.actionability >=
              80,
        }
      );
      ready.analyses.push(...matched.analyses);
      context.metrics.model_calls += matched.analyses.length;
      context.metrics.moa_escalations += matched.analyses.filter((analysis) =>
        ["glm", "kimi"].includes(analysis.provider)
      ).length;
      if (matched.relation === "pending") {
        recordPendingCandidate(context.ledger, ready, {
          stage: "event_match_conflict",
          errorCategory: "model_uncertain",
          analyses: ready.analyses,
        });
        context.metrics.pending++;
        return;
      }
      matcherResult = matched;
    }
    const merged = mergeCandidate(context.ledger, ready, { matcherResult, now: runAt });
    context.metrics[merged.status] = (context.metrics[merged.status] || 0) + 1;
  } catch (error) {
    recordPendingCandidate(context.ledger, base, {
      stage: "model_processing",
      errorCategory: error.name || "model_error",
      errorMessage: publicErrorCode(error, "model_processing_failed"),
      analyses: base.analyses,
    });
    context.errors.push(runError("model_processing", base.source.source_id, error, base.id));
    context.metrics.failed++;
    context.metrics.pending++;
  }
}

function sourceForUrl(rawUrl, company, registry) {
  const host = hostOf(rawUrl);
  const matches = registry.sources.filter((source) => {
    try {
      const sourceHost = hostOf(source.url);
      return host === sourceHost || host.endsWith(`.${sourceHost}`) || sourceHost.endsWith(`.${host}`);
    } catch {
      return false;
    }
  });
  const rank = { authoritative: 3, trusted: 2, discovery: 1 };
  const ranked = matches.sort((a, b) => rank[b.tier] - rank[a.tier])[0];
  if (!ranked) {
    return {
      source_id: `discovery:anysearch:${host}`,
      editorial_owner: host,
      tier: "discovery",
      authority_scope: [],
      source_type: "media",
    };
  }
  const pressReleaseWire = ranked.source_id === "discovery:pr-newswire";
  return {
    source_id: pressReleaseWire ? `${ranked.source_id}:${slug(company)}` : ranked.source_id,
    editorial_owner: pressReleaseWire ? company : ranked.editorial_owner,
    tier: ranked.tier,
    authority_scope: ranked.coverage.event_types,
    source_type: ranked.source_type || ranked.type,
  };
}

async function fetchEvidenceContent(url, { allowDirectFallback = true } = {}) {
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      return await scrapeMarkdown(url);
    } catch {
      if (!allowDirectFallback) throw new Error("discovery_content_fetch_failed");
    }
  }
  if (!allowDirectFallback) throw new Error("discovery_content_fetch_unavailable");
  const html = await fetchText(url, "evidence-content");
  return cleanScrapedMarkdown(stripHtml(html).slice(0, MAX_CONTENT_CHARS));
}

async function fetchJson(url, label, { tolerate404 = false } = {}) {
  const response = await throttledFetch(url, label);
  if (tolerate404 && response.status === 404) return null;
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
  return JSON.parse(await readCappedBody(response, label));
}

async function fetchText(url, label) {
  const response = await throttledFetch(url, label);
  if (!response.ok) throw new Error(`${label} HTTP ${response.status}`);
  return readCappedBody(response, label);
}

async function throttledFetch(url, label, init = {}) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const gap = Date.now() - lastRequestAt;
    if (gap < FETCH_GAP_MS) await sleep(FETCH_GAP_MS - gap);
    lastRequestAt = Date.now();
    const response = await fetchPublic(url, {
      ...init,
      headers: {
        "User-Agent": "mced-intel-monitor/3.0 (evidence-first competitor monitoring)",
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (response.status !== 429 || attempt === MAX_RETRIES) return response;
    // 没有 Retry-After 头时 Number(null) 是 0：必须先判断头是否存在，否则 429 会被立刻连续重试。
    const retryAfter = Number.parseFloat(response.headers.get("retry-after") ?? "");
    const waitMs = retryAfter > 0 ? Math.min(retryAfter * 1000, 30_000) : 2 ** attempt * 1500;
    console.warn(`[mced-monitor] ${label} rate limited; retry in ${waitMs}ms`);
    await sleep(waitMs);
  }
  throw new Error(`${label} request failed`);
}

function parseAnySearchMarkdown(markdown) {
  const results = [];
  const pattern = /###\s*\d+\.\s*(.+?)\n-\s*\*\*URL\*\*:\s*(\S+)\n([\s\S]*?)(?=\n###|\n##|$)/g;
  let match;
  while ((match = pattern.exec(markdown))) {
    results.push({
      title: match[1].replace(/\.\.\.$/, "").trim().slice(0, 500),
      url: match[2].trim(),
      snippet: match[3].replace(/\s+/g, " ").trim().slice(0, 500),
    });
  }
  return results.filter((result) => result.title && /^https:/.test(result.url));
}

function buildManualTasks(registry) {
  const manualSources = registry.sources.filter(
    (source) => source.enabled && source.type === "manual_registry"
  );
  return registry.discovery_queries.flatMap((query) =>
    manualSources.map((source) => ({
      company: query.company,
      channel: source.editorial_owner,
      category: source.coverage.event_types.includes("regulatory_decision") ? "regulatory" : "academic",
      label: `${source.editorial_owner} · ${query.company} ${query.product}`,
      url: source.url,
    }))
  );
}

function runError(stage, sourceId, error, candidateId = null) {
  return {
    candidate_id: candidateId,
    source_id: sourceId,
    stage,
    error_category: error.name || "Error",
    error_code: publicErrorCode(error, stage),
    retry_count: 0,
  };
}

function normalizeInferredDate(value) {
  if (!value) return null;
  const date = String(value).trim();
  if (/^\d{4}-\d{2}$/.test(date)) return `${date}-01T00:00:00.000Z`;
  if (/^\d{4}-\d{2}-\d{2}$/.test(date)) return `${date}T00:00:00.000Z`;
  const parsed = Date.parse(date);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function toIso(value) {
  if (!value) return null;
  const compact = String(value).match(/^(\d{4})(\d{2})(\d{2})$/);
  if (compact) return `${compact[1]}-${compact[2]}-${compact[3]}T00:00:00.000Z`;
  return normalizeInferredDate(value);
}

function hostOf(url) {
  return new URL(url).hostname.toLowerCase().replace(/^www\./, "");
}

function slug(value) {
  return String(value)
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "");
}

function looksLikeVisual(url) {
  try {
    return /\.(png|jpe?g|webp|gif|pdf)$/i.test(new URL(url).pathname);
  } catch {
    return false;
  }
}

function parseArgs(argv) {
  const options = {};
  for (let index = 0; index < argv.length; index++) {
    const arg = argv[index];
    if (arg === "--mode") options.mode = argv[++index];
    else if (arg === "--skip-llm") options.skipLlm = true;
    else if (arg === "--skip-discovery") options.skipDiscovery = true;
    else if (arg === "--skip-official") options.skipOfficial = true;
    else if (arg === "--skip-content") options.skipContent = true;
    else if (arg === "--skip-collection") options.skipCollection = true;
    else if (arg === "--limit") options.limit = Number(argv[++index]);
    else if (arg === "--dry-run") options.dryRun = true;
    else throw new Error(`unknown argument ${arg}`);
  }
  return options;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
