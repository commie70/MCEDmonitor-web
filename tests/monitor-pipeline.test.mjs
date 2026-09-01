import assert from "node:assert/strict";
import fs from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import test from "node:test";

import {
  atomicWriteBundle,
  classifyEventType,
  createEmptyLedger,
  eventIsDailyEligible,
  eventIsPublic,
  estimatedJsonBytes,
  importanceFrom,
  loadLedger,
  mergeCandidate,
  normalizeUrl,
  projectPublicReport,
  pendingRetryHits,
  recordPendingCandidate,
  validateLedger,
} from "../scripts/lib-monitor-ledger.mjs";
import {
  createMonitorLlm,
  providerConfiguration,
} from "../scripts/lib-monitor-llm.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const golden = JSON.parse(
  await fs.readFile(path.join(ROOT, "tests", "monitor-golden.json"), "utf8")
);

function source(owner = "Primary Authority") {
  return {
    source_id: `authority:${owner.toLowerCase().replaceAll(" ", "-")}`,
    editorial_owner: owner,
    tier: "authoritative",
    authority_scope: ["*"],
    source_type: "regulator",
  };
}

function candidateFromCase(entry, overrides = {}) {
  const candidate = entry.candidate;
  return {
    id: `${entry.id}-${overrides.suffix || "candidate"}`,
    company: candidate.company,
    product: candidate.product,
    title: candidate.title,
    url: candidate.url,
    content: candidate.content || candidate.title,
    event_type: "other",
    occurred_at: candidate.occurred_at,
    published_at: candidate.occurred_at,
    discovered_at: "2026-08-30T00:00:00.000Z",
    source: source(),
    facts: { key_fact: candidate.fact_value || "baseline" },
    importance: { relevance: 20, impact: 30, actionability: 10 },
    summary: "固定验收摘要",
    reason: "固定验收理由",
    ...overrides,
  };
}

test("the acceptance fixture is frozen at 120 manually labelled cases", () => {
  assert.deepEqual(golden.counts, {
    url_duplicates: 40,
    semantic_event_pairs: 30,
    history_states: 30,
    importance: 20,
    total: 120,
  });
  assert.equal(golden.semantic_event_pairs.filter((entry) => entry.expected === "same_event").length, 15);
  assert.equal(golden.semantic_event_pairs.filter((entry) => entry.expected === "different_event").length, 15);
});

test("all 40 canonical URL duplicate groups merge exactly", () => {
  let merged = 0;
  for (const entry of golden.url_duplicates) {
    const normalized = new Set(entry.urls.map((url) => normalizeUrl(url)));
    assert.deepEqual([...normalized], [entry.expected_canonical], entry.id);
    merged++;
  }
  assert.equal(merged / golden.url_duplicates.length, 1);
});

test("canonical evidence URLs reject credentials, secret parameters, and oversized values", () => {
  assert.throws(() => normalizeUrl("https://user:secret@example.com/article"), /credentials/);
  assert.throws(() => normalizeUrl("https://example.com/article?api_key=secret"), /credential parameters/);
  assert.throws(() => normalizeUrl(`https://example.com/${"x".repeat(2048)}`), /too long/);
});

test("ledger size accounting includes JSON escaping and pretty-print whitespace", () => {
  const value = { text: "\0\\\"\n", nested: ["a", "b"] };
  assert.equal(
    estimatedJsonBytes(value, Number.MAX_SAFE_INTEGER),
    Buffer.byteLength(JSON.stringify(value, null, 2), "utf8")
  );
});

test("importance is programmatically summed and levelled for all 20 labels", () => {
  let exact = 0;
  for (const entry of golden.importance) {
    const importance = importanceFrom(entry);
    assert.equal(importance.total, entry.expected_total, entry.id);
    assert.equal(importance.level, entry.expected_level, entry.id);
    exact++;
  }
  assert.equal(exact / golden.importance.length, 1);
});

test("invalid model-selected importance bands fail closed", () => {
  assert.throws(
    () => importanceFrom({ relevance: 25, impact: 40, actionability: 20 }),
    /relevance/
  );
});

test("all 30 four-state history labels are reproduced", () => {
  const actual = { first: 0, update: 0, duplicate: 0, backfill: 0 };
  for (const entry of golden.history_states) {
    const ledger = createEmptyLedger();
    let result;
    if (entry.expected === "update" || entry.expected === "duplicate") {
      const seed = candidateFromCase(entry, {
        id: `${entry.id}-seed`,
        content: entry.seed.content,
        facts: { key_fact: entry.seed.fact_value },
      });
      const seeded = mergeCandidate(ledger, seed, { now: "2026-08-20T01:00:00.000Z" });
      assert.equal(seeded.status, "first", `${entry.id}: seed`);
      result = mergeCandidate(ledger, candidateFromCase(entry), {
        now: "2026-08-21T01:00:00.000Z",
      });
    } else {
      result = mergeCandidate(ledger, candidateFromCase(entry), {
        now: "2026-08-30T01:00:00.000Z",
      });
    }
    assert.equal(result.status, entry.expected, entry.id);
    actual[result.status]++;
  }
  assert.deepEqual(actual, { first: 8, update: 8, duplicate: 7, backfill: 7 });
});

test("an evidence with no event date stays pending", () => {
  const ledger = createEmptyLedger();
  const result = mergeCandidate(ledger, {
    ...candidateFromCase(golden.history_states[0]),
    occurred_at: null,
    published_at: null,
  });
  assert.equal(result.status, "pending");
  assert.equal(result.reason, "missing_event_date");
  assert.equal(ledger.events.length, 0);
});

test("two independent trusted owners satisfy the medium evidence gate", () => {
  const ledger = createEmptyLedger();
  const base = candidateFromCase(golden.history_states[0], {
    event_type: "product_launch",
    source: {
      source_id: "trusted:a",
      editorial_owner: "Trusted A",
      tier: "trusted",
      authority_scope: [],
      source_type: "media",
    },
  });
  const first = mergeCandidate(ledger, base);
  assert.equal(first.status, "pending");
  const second = mergeCandidate(ledger, {
    ...base,
    id: `${base.id}-second-owner`,
    url: `${base.url}?utm_source=second-owner&edition=2`,
    content: `${base.content}\nindependent confirmation`,
    source: {
      source_id: "trusted:b",
      editorial_owner: "Trusted B",
      tier: "trusted",
      authority_scope: [],
      source_type: "media",
    },
  });
  assert.equal(second.status, "first");
  assert.equal(second.event.evidence_confidence, "medium");
  assert.equal(second.event.evidence_ids.length, 2);
});

test("publication and daily gates separate evidence, level, state, and review", () => {
  const baseEvent = {
    publication_state: "first",
    evidence_confidence: "high",
    importance: { level: "L2" },
    review_status: "not_required",
  };
  assert.equal(eventIsPublic(baseEvent), true);
  assert.equal(eventIsDailyEligible(baseEvent), true);
  assert.equal(eventIsDailyEligible({ ...baseEvent, evidence_confidence: "low" }), false);
  assert.equal(eventIsDailyEligible({ ...baseEvent, publication_state: "duplicate" }), false);
  assert.equal(eventIsDailyEligible({ ...baseEvent, importance: { level: "L3" } }), false);
  assert.equal(eventIsDailyEligible({ ...baseEvent, review_status: "pending" }), false);
  assert.equal(eventIsPublic({ ...baseEvent, review_status: "pending" }), false);
  assert.equal(eventIsPublic({ ...baseEvent, review_status: "approved" }), true);
});

test("public reports retain only stable error codes", () => {
  const report = projectPublicReport(createEmptyLedger(), {
    errors: [{
      candidate_id: "https://user:pass@example.com/?token=sk-secret",
      source_id: "provider /Users/private",
      stage: "collection",
      error_category: "provider_error",
      message: "Bearer sk-secret /Users/private/project https://user:pass@example.com",
    }],
  });
  const serialized = JSON.stringify(report.errors);
  assert.equal(report.errors[0].error_code, "provider_error");
  assert.doesNotMatch(serialized, /sk-secret|\/Users\/private|user:pass/);
  assert.equal(Object.hasOwn(report.errors[0], "message"), false);
  assert.equal(report.errors[0].candidate_id, null);
});

test("pending-review events are absent from every public projection", () => {
  const entry = golden.history_states.find((item) => item.expected === "first");
  const ledger = createEmptyLedger();
  const merged = mergeCandidate(ledger, candidateFromCase(entry, {
    event_type: "regulatory_decision",
    importance: { relevance: 30, impact: 50, actionability: 20 },
  }));
  assert.equal(merged.event.review_status, "pending");
  const report = projectPublicReport(ledger, { generatedAt: "2026-08-30T00:00:00.000Z" });
  assert.deepEqual(report.stories, []);
  assert.deepEqual(report.items, []);
  assert.deepEqual(report.views.daily_event_ids, []);
  assert.deepEqual(report.views.hot_event_ids, []);
  assert.deepEqual(report.views.all_event_ids, []);
});

test("public projection preserves compatibility aliases while adding audit fields", () => {
  const entry = golden.history_states.find((item) => item.expected === "first");
  const ledger = createEmptyLedger();
  const merged = mergeCandidate(ledger, candidateFromCase(entry));
  const report = projectPublicReport(ledger, {
    generatedAt: "2026-08-30T00:00:00.000Z",
    sourceCount: 20,
  });
  assert.equal(report.stories.length, 1);
  const story = report.stories[0];
  assert.equal(story.score, story.score_breakdown.total);
  assert.equal(story.heat, story.score);
  assert.equal(story.sources_count, 1);
  assert.equal(story.publication_state, "first");
  assert.equal(story.evidence_confidence, "high");
  assert.equal(report.views.daily_event_ids.includes(merged.event.id), true);
});

test("duplicate evidence does not erase a material publication or republish it next run", () => {
  const entry = golden.history_states.find((item) => item.expected === "duplicate");
  const ledger = createEmptyLedger();
  const seeded = mergeCandidate(
    ledger,
    candidateFromCase(entry, {
      id: `${entry.id}-seed`,
      content: entry.seed.content,
      facts: { key_fact: entry.seed.fact_value },
    })
  );
  assert.equal(seeded.status, "first");

  const duplicate = mergeCandidate(ledger, candidateFromCase(entry));
  assert.equal(duplicate.status, "duplicate");
  assert.equal(duplicate.event.publication_state, "first");
  assert.deepEqual(ledger.last_publication_event_ids, [seeded.event.id]);

  ledger.last_publication_event_ids = [];
  const nextRunReport = projectPublicReport(ledger, {
    generatedAt: "2026-08-31T00:00:00.000Z",
  });
  assert.deepEqual(nextRunReport.views.daily_event_ids, []);
});

test("discovery-only evidence cannot create a material update on an existing verified event", () => {
  const entry = golden.history_states.find((item) => item.expected === "update");
  const ledger = createEmptyLedger();
  const seeded = mergeCandidate(
    ledger,
    candidateFromCase(entry, {
      id: `${entry.id}-verified-seed`,
      content: entry.seed.content,
      facts: { key_fact: entry.seed.fact_value },
    })
  );
  assert.equal(seeded.status, "first");

  const discovery = mergeCandidate(
    ledger,
    candidateFromCase(entry, {
      id: `${entry.id}-wechat`,
      url: `${entry.candidate.url}?source=wechat`,
      source: {
        source_id: "discovery:weixinzs:test",
        editorial_owner: "诊断科学",
        tier: "discovery",
        authority_scope: [],
        source_type: "media",
      },
    }),
    { matcherResult: { relation: "same_event", event_id: seeded.event.id } }
  );

  assert.equal(discovery.status, "pending");
  assert.equal(seeded.event.fact_revisions.length, 1);
  assert.equal(seeded.event.publication_state, "first");
});

test("a material update requires new authoritative evidence or two new trusted owners", () => {
  const entry = golden.history_states.find((item) => item.expected === "update");
  const ledger = createEmptyLedger();
  const seeded = mergeCandidate(
    ledger,
    candidateFromCase(entry, {
      id: `${entry.id}-gate-seed`,
      content: entry.seed.content,
      facts: { key_fact: entry.seed.fact_value },
    })
  );
  const trustedCandidate = (owner, suffix) =>
    candidateFromCase(entry, {
      id: `${entry.id}-${suffix}`,
      url: `${entry.candidate.url.replace(/\/$/, "")}/${suffix}`,
      source: {
        source_id: `trusted:${suffix}`,
        editorial_owner: owner,
        tier: "trusted",
        authority_scope: [],
        source_type: "media",
      },
    });

  const first = mergeCandidate(ledger, trustedCandidate("Trusted A", "trusted-a"), {
    matcherResult: { relation: "same_event", event_id: seeded.event.id },
  });
  assert.equal(first.status, "pending");
  const second = mergeCandidate(ledger, trustedCandidate("Trusted B", "trusted-b"), {
    matcherResult: { relation: "same_event", event_id: seeded.event.id },
  });
  assert.equal(second.status, "update");
  assert.equal(seeded.event.fact_revisions.length, 2);
  assert.equal(seeded.event.fact_revisions.at(-1).evidence_ids.length, 2);
});

test("two trusted owners with conflicting facts cannot corroborate an update", () => {
  const entry = golden.history_states.find((item) => item.expected === "update");
  const ledger = createEmptyLedger();
  const seeded = mergeCandidate(
    ledger,
    candidateFromCase(entry, {
      id: `${entry.id}-conflict-seed`,
      content: entry.seed.content,
      facts: { sensitivity: "70%" },
    })
  );
  const conflictingCandidate = (owner, suffix, sensitivity) =>
    candidateFromCase(entry, {
      id: `${entry.id}-conflict-${suffix}`,
      url: `${entry.candidate.url.replace(/\/$/, "")}/conflict-${suffix}`,
      facts: { sensitivity },
      source: {
        source_id: `trusted:conflict-${suffix}`,
        editorial_owner: owner,
        tier: "trusted",
        authority_scope: [],
        source_type: "media",
      },
    });

  const first = mergeCandidate(ledger, conflictingCandidate("Trusted A", "a", "80%"), {
    matcherResult: { relation: "same_event", event_id: seeded.event.id },
  });
  const second = mergeCandidate(ledger, conflictingCandidate("Trusted B", "b", "90%"), {
    matcherResult: { relation: "same_event", event_id: seeded.event.id },
  });

  assert.equal(first.status, "pending");
  assert.equal(second.status, "pending");
  assert.equal(seeded.event.fact_revisions.length, 1);
  assert.deepEqual(seeded.event.fact_revisions[0].facts, { sensitivity: "70%" });
});

test("fact formatting differences do not create a material update", () => {
  const entry = golden.history_states.find((item) => item.expected === "update");
  const ledger = createEmptyLedger();
  const seeded = mergeCandidate(
    ledger,
    candidateFromCase(entry, {
      id: `${entry.id}-normalized-seed`,
      facts: { Sensitivity: "80%" },
    })
  );
  const authoritative = mergeCandidate(
    ledger,
    candidateFromCase(entry, {
      id: `${entry.id}-normalized-followup`,
      url: `${entry.candidate.url.replace(/\/$/, "")}/normalized-followup`,
      facts: { sensitivity: "  80%  " },
    }),
    { matcherResult: { relation: "same_event", event_id: seeded.event.id } }
  );

  assert.equal(authoritative.status, "duplicate");
  assert.equal(seeded.event.fact_revisions.length, 1);
  assert.equal(seeded.event.publication_state, "first");
});

test("pre-merge pending candidates retain a bounded retry payload and are replayable", () => {
  const entry = golden.history_states[0];
  const ledger = createEmptyLedger();
  const candidate = candidateFromCase(entry, {
    id: "retryable-wechat-candidate",
    content: "",
    content_status: "failed",
  });
  recordPendingCandidate(ledger, candidate, {
    stage: "content_extraction",
    errorCategory: "content_failed",
  });

  const retries = pendingRetryHits(ledger);
  assert.equal(retries.length, 1);
  assert.equal(retries[0].url, candidate.url);
  assert.equal(retries[0].source.source_id, candidate.source.source_id);
  assert.equal(retries[0].retry_of_candidate_id, candidate.id);
  assert.equal(Object.hasOwn(retries[0], "importance"), false);

  recordPendingCandidate(
    ledger,
    {
      ...retries[0],
      id: "retryable-wechat-successor",
      event_type: retries[0].event_type_hint,
    },
    { stage: "model_processing", errorCategory: "model_error" }
  );
  assert.equal(ledger.candidates.some((item) => item.id === candidate.id), false);
  assert.equal(ledger.candidates.length, 1);
});

test("ledger validation and load reject corruption without rewriting it", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mced-ledger-test-"));
  const ledgerPath = path.join(dir, "ledger.json");
  await fs.writeFile(ledgerPath, '{"schema_version":1,"events":"broken"}\n', "utf8");
  await assert.rejects(
    () => loadLedger(ledgerPath),
    /monitoring_baseline|last_publication_event_ids|candidates|events/
  );
  assert.equal(await fs.readFile(ledgerPath, "utf8"), '{"schema_version":1,"events":"broken"}\n');
  await fs.rm(dir, { recursive: true, force: true });
});

test("bundle write prepares every file before replacing the last valid bundle", async () => {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), "mced-bundle-test-"));
  const ledgerPath = path.join(dir, "ledger.json");
  const reportPath = path.join(dir, "report.json");
  await fs.writeFile(ledgerPath, '{"version":"old-ledger"}\n', "utf8");
  await fs.writeFile(reportPath, '{"version":"old-report"}\n', "utf8");
  const circular = {};
  circular.self = circular;
  await assert.rejects(() =>
    atomicWriteBundle([
      { path: ledgerPath, value: { version: "new-ledger" } },
      { path: reportPath, value: circular },
    ])
  );
  assert.equal(await fs.readFile(ledgerPath, "utf8"), '{"version":"old-ledger"}\n');
  assert.equal(await fs.readFile(reportPath, "utf8"), '{"version":"old-report"}\n');
  await fs.rm(dir, { recursive: true, force: true });
});

test("event type classification keeps different milestones distinct", () => {
  assert.equal(classifyEventType({ title: "FDA advisory committee meeting" }), "regulatory_decision");
  assert.equal(classifyEventType({ title: "FDA approves the product" }), "regulatory_decision");
  assert.notEqual(
    "FDA advisory committee meeting",
    "FDA approves the product",
    "titles remain separate inputs even when their event type is shared"
  );
});

function jsonResponse(value, status = 200) {
  return new Response(
    JSON.stringify({ choices: [{ message: { content: JSON.stringify(value) } }] }),
    { status, headers: { "Content-Type": "application/json" } }
  );
}

const configuredEnv = {
  DASHSCOPE_BASE_URL: "https://qwen.invalid/v1",
  DASHSCOPE_API_KEY: "test-qwen",
  DEEPSEEK_BASE_URL: "https://deepseek.invalid/v1",
  DEEPSEEK_API_KEY: "test-deepseek",
  GLM_BASE_URL: "https://glm.invalid/v1",
  GLM_API_KEY: "test-glm",
  KIMI_BASE_URL: "https://kimi.invalid/v1",
  MOONSHOT_API_KEY: "test-kimi",
};

test("provider configuration exposes URLs and model IDs but never keys", () => {
  const config = providerConfiguration(configuredEnv);
  assert.equal(config.qwen.configured, true);
  assert.equal(config.qwen.model, "qwen3.8-flash");
  assert.equal(JSON.stringify(config).includes("test-qwen"), false);
});

test("the fixed Qwen path emits strict structured output and audit records", async () => {
  const queue = [
    { relevant: true, uncertain: false, reason: "direct MCED relevance", evidence_refs: ["evd-1"] },
    {
      company: "GRAIL",
      product: "Galleri",
      event_type: "product_launch",
      occurred_at: "2026-08-20T00:00:00.000Z",
      published_at: "2026-08-20T00:00:00.000Z",
      facts: [{ name: "launch", value: "market launch", evidence_ref: "evd-1" }],
      risk_flags: [],
      uncertain: false,
    },
    {
      relevance: { score: 30, rationale: "direct MCED", evidence_refs: ["evd-1"] },
      impact: { score: 15, rationale: "routine launch", evidence_refs: ["evd-1"] },
      actionability: { score: 10, rationale: "track", evidence_refs: ["evd-1"] },
      uncertain: false,
    },
    { summary: "结构化摘要", reason: "需要跟踪", evidence_refs: ["evd-1"] },
  ];
  const requests = [];
  const llm = createMonitorLlm({
    env: configuredEnv,
    now: () => "2026-08-30T00:00:00.000Z",
    fetchImpl: async (url, init) => {
      requests.push({ url, body: JSON.parse(init.body) });
      return jsonResponse(queue.shift());
    },
  });
  const result = await llm.analyzeCandidate({ id: "evd-1", title: "GRAIL launches Galleri" });
  assert.equal(result.status, "ready");
  assert.equal(result.importance.relevance, 30);
  assert.equal(result.analyses.length, 4);
  assert.equal(requests.every((request) => request.url === "https://qwen.invalid/v1/chat/completions"), true);
  assert.equal(requests.every((request) => request.body.response_format.json_schema.strict === true), true);
});

test("oversized model fields are rejected before audit persistence", async () => {
  const llm = createMonitorLlm({
    env: configuredEnv,
    fetchImpl: async () => jsonResponse({
      relevant: true,
      uncertain: false,
      reason: "x".repeat(9 * 1024),
      evidence_refs: ["evd-1"],
    }),
  });
  await assert.rejects(
    llm.analyzeCandidate({ id: "evd-1", title: "bounded provider response" }),
    /model_result_string_too_large/
  );
});

test("the DeepSeek vision role uses JSON Output with local strict validation", async () => {
  let request;
  const llm = createMonitorLlm({
    env: configuredEnv,
    fetchImpl: async (url, init) => {
      request = { url, body: JSON.parse(init.body) };
      return jsonResponse({ text: "", facts: [], uncertain: true });
    },
  });
  const result = await llm.extractVision(
    { id: "vision-smoke", title: "blank image" },
    ["data:image/png;base64,iVBORw0KGgo="]
  );
  assert.equal(request.url, "https://deepseek.invalid/v1/chat/completions");
  assert.deepEqual(request.body.response_format, { type: "json_object" });
  assert.match(request.body.messages[1].content[0].text, /JSON Schema/);
  assert.equal(result.uncertain, true);
  assert.equal(result.analyses[0].provider, "deepseek");
});

test("model schema violations fail closed instead of silently coercing", async () => {
  const llm = createMonitorLlm({
    env: configuredEnv,
    fetchImpl: async () => jsonResponse({ relevant: true, uncertain: false, reason: "x", evidence_refs: [], extra: true }),
  });
  await assert.rejects(() => llm.analyzeCandidate({ title: "test" }), /extra is not allowed/);
});

test("missing provider URL or key is explicit and does not switch models", async () => {
  const llm = createMonitorLlm({ env: {}, fetchImpl: async () => assert.fail("fetch must not run") });
  await assert.rejects(
    () => llm.analyzeCandidate({ title: "test" }),
    /provider_configuration_missing:qwen:DASHSCOPE_API_KEY/
  );
});

test("a high-risk Qwen/GLM conflict is arbitrated only by Kimi", async () => {
  const queue = [
    { relevant: true, uncertain: false, reason: "relevant", evidence_refs: ["evd-1"] },
    {
      company: "Freenome",
      product: "SimpleScreen",
      event_type: "regulatory_decision",
      occurred_at: "2026-08-20T00:00:00.000Z",
      published_at: "2026-08-20T00:00:00.000Z",
      facts: [{ name: "status", value: "approved", evidence_ref: "evd-1" }],
      risk_flags: ["regulatory_claim"],
      uncertain: false,
    },
    {
      company: "Freenome",
      product: "SimpleScreen",
      event_type: "regulatory_decision",
      occurred_at: "2026-08-21T00:00:00.000Z",
      published_at: "2026-08-20T00:00:00.000Z",
      facts: [{ name: "status", value: "approved", evidence_ref: "evd-1" }],
      risk_flags: ["regulatory_claim"],
      uncertain: false,
    },
    { selected: "glm", rationale: "primary evidence date", evidence_refs: ["evd-1"] },
    {
      relevance: { score: 20, rationale: "screening", evidence_refs: ["evd-1"] },
      impact: { score: 40, rationale: "regulatory", evidence_refs: ["evd-1"] },
      actionability: { score: 20, rationale: "respond", evidence_refs: ["evd-1"] },
      uncertain: false,
    },
    {
      relevance: { score: 20, rationale: "screening", evidence_refs: ["evd-1"] },
      impact: { score: 40, rationale: "regulatory", evidence_refs: ["evd-1"] },
      actionability: { score: 20, rationale: "respond", evidence_refs: ["evd-1"] },
      uncertain: false,
    },
    { summary: "监管摘要", reason: "立即分析", evidence_refs: ["evd-1"] },
  ];
  const urls = [];
  const llm = createMonitorLlm({
    env: configuredEnv,
    fetchImpl: async (url) => {
      urls.push(url);
      return jsonResponse(queue.shift());
    },
  });
  const result = await llm.analyzeCandidate({ id: "evd-1", title: "FDA approval" });
  assert.equal(result.status, "ready");
  assert.equal(result.extraction.occurred_at, "2026-08-21T00:00:00.000Z");
  assert.deepEqual(urls, [
    "https://qwen.invalid/v1/chat/completions",
    "https://qwen.invalid/v1/chat/completions",
    "https://glm.invalid/v1/chat/completions",
    "https://kimi.invalid/v1/chat/completions",
    "https://qwen.invalid/v1/chat/completions",
    "https://glm.invalid/v1/chat/completions",
    "https://qwen.invalid/v1/chat/completions",
  ]);
});

test("the semantic fixture remains balanced for independent MoA evaluation", () => {
  const labels = golden.semantic_event_pairs.reduce((counts, entry) => {
    counts[entry.expected] = (counts[entry.expected] || 0) + 1;
    return counts;
  }, {});
  assert.deepEqual(labels, { same_event: 15, different_event: 15 });
});

test("a freshly created ledger validates at its interface", () => {
  assert.doesNotThrow(() => validateLedger(createEmptyLedger()));
});
