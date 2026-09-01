#!/usr/bin/env node

/**
 * MCED 增量监测编排入口。
 *
 * 顺序固定为：权威信源/单一发现面采集 → 正文与日期 → 事件识别 → 证据门禁
 * → 重要性档位 → 人工复核门禁 → 事件账本与公开读模型事务写入。
 *
 * 默认 shadow：更新账本和 shadow-report.json，但不替换最后有效公开日报。
 * 切换需显式传 --mode publish，并满足 ADR 的三个影子周期/七天验收条件。
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { cleanScrapedMarkdown, scrapeMarkdown } from "./lib-content-enrich.mjs";
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
  recordRejectedCandidate,
  sha256,
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
import { collectWeixinArticles } from "./lib-weixinzs-monitor.mjs";
import { inferItemDate } from "./lib-stale.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "scripts", "monitor-sources.json");
const LEDGER_PATH = path.join(ROOT, "scripts", "monitor-ledger.json");
const HISTORY_PATH = path.join(ROOT, "scripts", "monitor-history.jsonl");
const ACCEPTANCE_PATH = path.join(ROOT, "scripts", "monitor-acceptance.json");
const GOLDEN_PATH = path.join(ROOT, "tests", "monitor-golden.json");
const REPORT_PATH = path.join(ROOT, "public", "monitor", "daily-report.json");
const SHADOW_REPORT_PATH = path.join(ROOT, "public", "monitor", "shadow-report.json");

const ANYSEARCH_DEFAULT_URL = "https://api.anysearch.com/mcp";
const ANYSEARCH_CLIENT = "mced-monitor/3.0";
const FETCH_TIMEOUT_MS = 30_000;
const MAX_FETCH_BODY_BYTES = 8 * 1024 * 1024;
const FETCH_GAP_MS = 350;
const MAX_RETRIES = 3;
const MAX_OFFICIAL_LINKS = 8;
const MAX_DISCOVERY_RESULTS = 5;
const MAX_CONTENT_CHARS = 12_000;

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
    message: String(error.message || error).slice(0, 500),
    duration_ms: Date.now() - startedAt,
  };
  await fs.appendFile(HISTORY_PATH, `${JSON.stringify(failure)}\n`, "utf8").catch(() => {});
  console.error(`[mced-monitor] fatal: ${failure.message}`);
  process.exitCode = 1;
});

async function main() {
  const registry = validateSourceRegistry(await loadJson(CONFIG_PATH));
  const ledger = await loadLedger(LEDGER_PATH);
  ledger.last_publication_event_ids = [];
  const mode = args.mode || registry.release_mode || "shadow";
  if (!new Set(["shadow", "publish"]).has(mode)) throw new Error(`unsupported mode ${mode}`);
  const modelConfig = providerConfiguration();
  const acceptance = await readAcceptanceStatus();
  if (mode === "publish") await assertPublishReady(acceptance, modelConfig);

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
    `[mced-monitor] mode=${mode} since=${collectionSince} sources=${registry.sources.length} discovery=${registry.discovery_queries.length}`
  );

  const collectedAt = Date.now();
  const hits = [...pendingRetryHits(ledger), ...(await collectHits(context))];
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

  const candidates = await enrichHits(hits, context);
  const uniqueCandidates = dedupeCandidates(candidates, metrics);
  const limitedCandidates = Number.isFinite(args.limit)
    ? uniqueCandidates.slice(0, args.limit)
    : uniqueCandidates;

  for (const candidate of limitedCandidates) {
    await processCandidate(candidate, { ...context, llm, modelConfig, metrics });
  }
  context.timings.processing_ms = Date.now() - processedAt;

  ledger.last_successful_run_at = runAt;
  validateLedger(ledger);

  let digest = null;
  let report = projectPublicReport(ledger, {
    generatedAt: runAt,
    sourceCount: new Set(registry.discovery_queries.map((query) => query.company)).size + 1,
    manualTasks: buildManualTasks(registry),
    errors: context.errors,
    metrics: {},
  });
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
    errors: context.errors.length,
    estimated_model_cost: null,
  };
  report = projectPublicReport(ledger, {
    generatedAt: runAt,
    sourceCount: new Set(registry.discovery_queries.map((query) => query.company)).size + 1,
    digest,
    manualTasks: buildManualTasks(registry),
    errors: context.errors,
    metrics: runMetrics,
  });

  if (args.dryRun) {
    console.log(`[mced-monitor] dry-run: ${JSON.stringify(runMetrics)}`);
    return;
  }

  const targetReport = mode === "publish" ? REPORT_PATH : SHADOW_REPORT_PATH;
  await atomicWriteBundle([
    { path: LEDGER_PATH, value: ledger },
    { path: targetReport, value: report },
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
      hits.push(...collected);
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

  if (!args.skipDiscovery && context.registry.discovery_provider?.enabled) {
    for (const query of context.registry.discovery_queries.filter((entry) => entry.enabled)) {
      try {
        hits.push(...(await collectAnySearch(query, context)));
      } catch (error) {
        context.coverageGaps.push(query.query_id);
        context.errors.push(runError("discovery", query.query_id, error));
      }
    }
  }
  return hits;
}

async function collectPubMed(source, context) {
  const query = `(${source.query}) AND ("${context.collectionSince}"[Date - Publication] : "3000"[Date - Publication])`;
  const searchUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi");
  searchUrl.search = new URLSearchParams({
    db: "pubmed",
    retmode: "json",
    sort: "pub date",
    retmax: String(context.registry.retmax_per_query || 8),
    term: query,
  });
  const idsJson = await fetchJson(searchUrl, source.source_id);
  const ids = idsJson.esearchresult?.idlist || [];
  if (!ids.length) return [];

  const summaryUrl = new URL("https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi");
  summaryUrl.search = new URLSearchParams({ db: "pubmed", retmode: "json", id: ids.join(",") });
  const summary = await fetchJson(summaryUrl, source.source_id);
  const result = summary.result || {};
  return (result.uids || []).flatMap((uid) => {
    const document = result[uid];
    if (!document) return [];
    const doi = (document.articleids || []).find((entry) => entry.idtype === "doi");
    return [
      {
        company: source.coverage.companies[0],
        product: source.coverage.products[0],
        title: stripHtml(document.title || ""),
        url: doi ? `https://doi.org/${doi.value}` : `https://pubmed.ncbi.nlm.nih.gov/${uid}/`,
        source_label: document.fulljournalname || document.source || "PubMed",
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
    for (const result of json?.results || []) {
      const pma = result.pma_number || result.pma_submission_number || "";
      hits.push({
        company: source.coverage.companies[0],
        product: source.coverage.products[0],
        title: `${result.tradename || source.coverage.products[0]} — ${
          result.decision_code || result.decision || "FDA 审评动态"
        }`,
        url: `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=${encodeURIComponent(pma)}`,
        source_label: `openFDA ${endpoint === "pma" ? "PMA" : "De Novo"} (${pma || "—"})`,
        published_at: toIso(result.decision_date),
        discovered_at: runAt,
        snippet: result.generic_name || "",
        content: JSON.stringify(result),
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
  const html = await fetchText(source.url, source.source_id);
  const seenUrls = new Set(context.ledger.evidence.map((evidence) => evidence.canonical_url));
  return extractOfficialLinks(html, source.url)
    .filter((link) => {
      try {
        return !seenUrls.has(normalizeUrl(link.url));
      } catch {
        return false;
      }
    })
    .slice(0, MAX_OFFICIAL_LINKS)
    .map((link) => ({
      company: source.coverage.companies[0],
      product: source.coverage.products[0],
      title: link.title,
      url: link.url,
      source_label: source.editorial_owner,
      published_at: null,
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
  const payload = await response.json();
  if (payload.error) throw new Error(payload.error.message || "AnySearch RPC error");
  const markdown = (payload.result?.content || [])
    .filter((item) => item.type === "text")
    .map((item) => item.text)
    .join("\n");
  return parseAnySearchMarkdown(markdown).map((result) => ({
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
    if (args.skipContent || hit.content) {
      enriched.push({ ...hit, published_at: dateFromHit, content_status: hit.content ? "fetched" : "not_fetched" });
      continue;
    }
    try {
      const content = await fetchEvidenceContent(hit.url);
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
      context.errors.push(runError("content", hit.source.source_id, error, hit.url));
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

async function processCandidate(candidate, context) {
  const candidateEvidenceId = evidenceIdentity(candidate).id;
  const existingEvidence = context.ledger.evidence.find(
    (evidence) => evidence.id === candidateEvidenceId
  );
  const base = {
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
      recordPendingCandidate(context.ledger, base, {
        stage: "content_extraction",
        errorCategory: `content_${base.content_status}`,
        incrementRetry: false,
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
      errorMessage: String(error.message || error).slice(0, 500),
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

function extractOfficialLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const baseHost = base.hostname.replace(/^www\./, "");
  const links = new Map();
  const anchorPattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;
  while ((match = anchorPattern.exec(html))) {
    let url;
    try {
      url = new URL(decodeEntities(match[1]), base);
    } catch {
      continue;
    }
    const host = url.hostname.replace(/^www\./, "");
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    if (host !== baseHost && !host.endsWith(`.${baseHost}`) && !baseHost.endsWith(`.${host}`)) continue;
    if (url.href === base.href || /\.(pdf|jpg|jpeg|png|gif|svg|zip)$/i.test(url.pathname)) continue;
    const title = stripHtml(decodeEntities(match[2]));
    if (title.length < 12 || /^(read more|learn more|view all|more|next|previous|home|news)$/i.test(title)) continue;
    try {
      links.set(normalizeUrl(url), { title: title.slice(0, 300), url: url.href });
    } catch {
      // Ignore malformed links from external HTML.
    }
  }
  return [...links.values()];
}

async function fetchEvidenceContent(url) {
  if (process.env.FIRECRAWL_API_KEY) {
    try {
      return await scrapeMarkdown(url);
    } catch {
      // The known URL remains the evidence target; direct fetch is the same role, not a model fallback.
    }
  }
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
    const response = await fetch(url, {
      ...init,
      headers: {
        "User-Agent": "mced-intel-monitor/3.0 (evidence-first competitor monitoring)",
        ...(init.headers || {}),
      },
      signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    });
    if (response.status !== 429 || attempt === MAX_RETRIES) return response;
    const retryAfter = Number(response.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) ? Math.min(retryAfter * 1000, 30_000) : 2 ** attempt * 1500;
    console.warn(`[mced-monitor] ${label} rate limited; retry in ${waitMs}ms`);
    await sleep(waitMs);
  }
  throw new Error(`${label} request failed`);
}

async function readCappedBody(response, label) {
  const declared = Number(response.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > MAX_FETCH_BODY_BYTES) {
    throw new Error(`${label} body too large (${declared}B)`);
  }
  const text = await response.text();
  if (Buffer.byteLength(text, "utf8") > MAX_FETCH_BODY_BYTES) {
    throw new Error(`${label} body too large`);
  }
  return text;
}

function parseAnySearchMarkdown(markdown) {
  const results = [];
  const pattern = /###\s*\d+\.\s*(.+?)\n-\s*\*\*URL\*\*:\s*(\S+)\n([\s\S]*?)(?=\n###|\n##|$)/g;
  let match;
  while ((match = pattern.exec(markdown))) {
    results.push({
      title: match[1].replace(/\.\.\.$/, "").trim(),
      url: match[2].trim(),
      snippet: match[3].replace(/\s+/g, " ").trim().slice(0, 500),
    });
  }
  return results.filter((result) => result.title && /^https?:/.test(result.url));
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
    message: String(error.message || error).slice(0, 500),
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

function stripHtml(value) {
  return String(value || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function decodeEntities(value) {
  return String(value)
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&nbsp;/g, " ");
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

async function readAcceptanceStatus() {
  const [artifact, fixtureRaw] = await Promise.all([
    loadJson(ACCEPTANCE_PATH),
    fs.readFile(GOLDEN_PATH, "utf8"),
  ]);
  const fixtureSha256 = sha256(fixtureRaw);
  return {
    artifact,
    fixtureSha256,
    passed:
      artifact.schema_version === 1 &&
      artifact.passed === true &&
      artifact.golden_fixture_sha256 === fixtureSha256,
  };
}

async function assertPublishReady(acceptance, modelConfig) {
  const missingProviders = Object.entries(modelConfig)
    .filter(([, config]) => !config.configured)
    .map(([role]) => role);
  if (missingProviders.length) {
    throw new Error(`publish_gate: providers not configured: ${missingProviders.join(", ")}`);
  }
  if (!acceptance.passed) {
    throw new Error(
      "publish_gate: live acceptance is missing, failed, or stale; run npm run monitor:acceptance"
    );
  }
  if (!acceptance.artifact.generated_at || Number.isNaN(Date.parse(acceptance.artifact.generated_at))) {
    throw new Error("publish_gate: acceptance generated_at is invalid");
  }
  const historyRaw = await fs.readFile(HISTORY_PATH, "utf8").catch((error) => {
    if (error?.code === "ENOENT") return "";
    throw error;
  });
  const history = historyRaw
    .split("\n")
    .filter(Boolean)
    .map((line, index) => {
      try {
        return JSON.parse(line);
      } catch {
        throw new Error(`publish_gate: invalid monitor history JSON at line ${index + 1}`);
      }
    });
  const acceptedAt = Date.parse(acceptance.artifact.generated_at);
  const shadowRuns = history.filter(
    (record) =>
      record.status === "success" &&
      record.mode === "shadow" &&
      record.acceptance_passed === true &&
      record.acceptance_fixture_sha256 === acceptance.fixtureSha256 &&
      Date.parse(record.ts) >= acceptedAt
  );
  const timestamps = shadowRuns.map((record) => Date.parse(record.ts)).filter(Number.isFinite);
  const coverageMs = timestamps.length ? Math.max(...timestamps) - Math.min(...timestamps) : 0;
  if (shadowRuns.length < 3 || coverageMs < 7 * 86_400_000) {
    throw new Error(
      `publish_gate: need >=3 accepted shadow runs spanning >=7 days; found ${shadowRuns.length} run(s) spanning ${(
        coverageMs / 86_400_000
      ).toFixed(1)} day(s)`
    );
  }
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
