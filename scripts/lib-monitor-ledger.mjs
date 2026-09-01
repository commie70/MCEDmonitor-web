import { createHash, randomUUID } from "node:crypto";
import fs from "node:fs/promises";
import path from "node:path";

export const LEDGER_SCHEMA_VERSION = 1;
export const MONITORING_BASELINE = "2026-08-16T17:20:18.787Z";

export const EVENT_TYPES = new Set([
  "regulatory_decision",
  "clinical_readout",
  "publication",
  "conference_disclosure",
  "product_launch",
  "partnership",
  "corporate",
  "other",
]);

export const PUBLICATION_STATES = new Set([
  "first",
  "update",
  "duplicate",
  "backfill",
]);

export const REVIEW_STATUSES = new Set([
  "not_required",
  "pending",
  "approved",
  "rejected",
]);

const RELEVANCE_VALUES = new Set([0, 10, 20, 30]);
const IMPACT_VALUES = new Set([0, 15, 30, 40, 50]);
const ACTIONABILITY_VALUES = new Set([0, 10, 20]);
const TRACKING_PARAMETERS = new Set([
  "fbclid",
  "gclid",
  "mc_cid",
  "mc_eid",
  "ref",
  "referrer",
  "source",
]);

const CATEGORY_BY_EVENT_TYPE = {
  regulatory_decision: "regulatory",
  conference_disclosure: "academic",
  clinical_readout: "research",
  publication: "research",
  product_launch: "market",
  partnership: "market",
  corporate: "market",
  other: "market",
};

const RETRYABLE_CANDIDATE_STAGES = new Set([
  "model_configuration",
  "content_extraction",
  "model_processing",
  "screen_conflict",
  "extraction_conflict",
  "importance_conflict",
  "event_match_conflict",
]);

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function nonEmptyString(value) {
  return typeof value === "string" && value.trim().length > 0;
}

function optionalIso(value, label) {
  if (value === null || value === "" || value === undefined) return;
  assert(nonEmptyString(value) && !Number.isNaN(Date.parse(value)), `${label} must be ISO-8601 or null`);
}

function validateAnalyses(analyses, label) {
  assert(Array.isArray(analyses), `${label} must be an array`);
  for (const [index, analysis] of analyses.entries()) {
    const auditLabel = `${label}[${index}]`;
    assert(isObject(analysis), `${auditLabel} must be an object`);
    assert(nonEmptyString(analysis.provider), `${auditLabel}.provider is required`);
    assert(nonEmptyString(analysis.model), `${auditLabel}.model is required`);
    assert(nonEmptyString(analysis.prompt_version), `${auditLabel}.prompt_version is required`);
    assert(nonEmptyString(analysis.schema_version), `${auditLabel}.schema_version is required`);
    optionalIso(analysis.generated_at, `${auditLabel}.generated_at`);
    assert(analysis.generated_at, `${auditLabel}.generated_at is required`);
    assert(Object.hasOwn(analysis, "result"), `${auditLabel}.result is required`);
  }
}

export function sha256(value) {
  return createHash("sha256").update(String(value ?? ""), "utf8").digest("hex");
}

export function normalizeUrl(rawUrl) {
  const url = new URL(rawUrl);
  assert(url.protocol === "http:" || url.protocol === "https:", "evidence URL must use http(s)");

  url.hash = "";
  url.hostname = url.hostname.toLowerCase().replace(/^www\./, "");
  url.pathname = url.pathname
    .replace(/[\u200B-\u200D\uFEFF]/g, "")
    .replace(/\/{2,}/g, "/");
  if (url.pathname !== "/") url.pathname = url.pathname.replace(/\/+$/, "");

  for (const key of [...url.searchParams.keys()]) {
    if (key.toLowerCase().startsWith("utm_") || TRACKING_PARAMETERS.has(key.toLowerCase())) {
      url.searchParams.delete(key);
    }
  }
  url.searchParams.sort();
  return url.toString();
}

export function evidenceIdentity({ url, content, title, snippet }) {
  const canonicalUrl = normalizeUrl(url);
  const contentSha256 = sha256(String(content || `${title || ""}\n${snippet || ""}`).trim());
  return {
    id: `evd_${sha256(`${canonicalUrl}\n${contentSha256}`).slice(0, 24)}`,
    canonical_url: canonicalUrl,
    content_sha256: contentSha256,
  };
}

function normalizeFingerprintPart(value) {
  return String(value || "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[®™©]/g, "")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .trim();
}

function normalizedFactValue(value) {
  if (Array.isArray(value)) return value.map(normalizedFactValue);
  if (isObject(value)) {
    return Object.fromEntries(
      Object.entries(value)
        .sort(([left], [right]) => left.localeCompare(right))
        .map(([key, child]) => [key.normalize("NFKC").trim().toLowerCase(), normalizedFactValue(child)])
    );
  }
  if (typeof value === "string") return value.normalize("NFKC").trim().replace(/\s+/g, " ");
  return value;
}

function materialFactHash(candidate) {
  if (!isObject(candidate.facts)) return null;
  const facts = Object.fromEntries(
    Object.entries(candidate.facts).filter(([, value]) => value !== null && value !== undefined && value !== "")
  );
  return Object.keys(facts).length ? sha256(JSON.stringify(normalizedFactValue(facts))) : null;
}

export function eventFingerprint(candidate) {
  const eventDate = String(candidate.occurred_at || candidate.published_at || "").slice(0, 10);
  return [
    normalizeFingerprintPart(candidate.company),
    normalizeFingerprintPart(candidate.product),
    candidate.event_type,
    eventDate,
  ].join("|");
}

export function classifyEventType({ title = "", category = "market" } = {}) {
  const value = String(title).toLowerCase();
  if (/fda|nmpa|cmde|批准|获批|审评|breakthrough|clearance|approval|pma\b|de novo/.test(value)) {
    return "regulatory_decision";
  }
  if (/asco|esmo|aacr|wclc|conference|congress|会议|大会|poster|abstract/.test(value)) {
    return "conference_disclosure";
  }
  if (/trial|study|sensitivity|specificity|clinical|队列|临床|灵敏度|特异性|readout/.test(value)) {
    return "clinical_readout";
  }
  if (/journal|publication|published|pubmed|nature|lancet|期刊|发表|论文/.test(value) || category === "research") {
    return "publication";
  }
  if (/launch|commercializ|推出|上市|发布产品/.test(value)) return "product_launch";
  if (/partner|collaborat|agreement|合作|联盟/.test(value)) return "partnership";
  if (/financ|restructur|layoff|acqui|merger|融资|重组|收购|财报/.test(value)) return "corporate";
  return "other";
}

export function importanceFrom({ relevance, impact, actionability, rationales = {} }) {
  assert(RELEVANCE_VALUES.has(relevance), "importance.relevance must be 0, 10, 20, or 30");
  assert(IMPACT_VALUES.has(impact), "importance.impact must be 0, 15, 30, 40, or 50");
  assert(ACTIONABILITY_VALUES.has(actionability), "importance.actionability must be 0, 10, or 20");

  const total = relevance + impact + actionability;
  const level = total >= 80 ? "L1" : total >= 60 ? "L2" : total >= 40 ? "L3" : null;
  return {
    relevance,
    impact,
    actionability,
    total,
    level,
    rationales: {
      relevance: String(rationales.relevance || ""),
      impact: String(rationales.impact || ""),
      actionability: String(rationales.actionability || ""),
    },
  };
}

function validateImportance(value, label) {
  assert(isObject(value), `${label} must be an object`);
  const computed = importanceFrom(value);
  assert(value.total === computed.total, `${label}.total must equal the three dimensions`);
  assert(value.level === computed.level, `${label}.level does not match total`);
}

export function createEmptyLedger({ baseline = MONITORING_BASELINE } = {}) {
  optionalIso(baseline, "monitoring_baseline");
  return {
    schema_version: LEDGER_SCHEMA_VERSION,
    monitoring_baseline: baseline,
    last_successful_run_at: null,
    last_publication_event_ids: [],
    source_runs: {},
    candidates: [],
    evidence: [],
    events: [],
  };
}

export function validateSourceRegistry(registry) {
  assert(isObject(registry), "source registry must be an object");
  assert(registry.schema_version === 1, "source registry schema_version must be 1");
  assert(Array.isArray(registry.sources), "source registry sources must be an array");
  assert(Array.isArray(registry.discovery_queries), "source registry discovery_queries must be an array");

  const ids = new Set();
  for (const [index, source] of registry.sources.entries()) {
    const label = `sources[${index}]`;
    assert(isObject(source), `${label} must be an object`);
    assert(nonEmptyString(source.source_id), `${label}.source_id is required`);
    assert(!ids.has(source.source_id), `${label}.source_id must be unique`);
    ids.add(source.source_id);
    assert(nonEmptyString(source.editorial_owner), `${label}.editorial_owner is required`);
    assert(["authoritative", "trusted", "discovery"].includes(source.tier), `${label}.tier is invalid`);
    assert(nonEmptyString(source.type), `${label}.type is required`);
    assert(nonEmptyString(source.url), `${label}.url is required`);
    normalizeUrl(source.url);
    assert(isObject(source.coverage), `${label}.coverage is required`);
    assert(Array.isArray(source.coverage.companies), `${label}.coverage.companies must be an array`);
    assert(Array.isArray(source.coverage.products), `${label}.coverage.products must be an array`);
    assert(Array.isArray(source.coverage.event_types), `${label}.coverage.event_types must be an array`);
    for (const eventType of source.coverage.event_types) {
      assert(EVENT_TYPES.has(eventType), `${label}.coverage.event_types contains invalid ${eventType}`);
    }
    assert(typeof source.enabled === "boolean", `${label}.enabled must be boolean`);
    if (source.poll_interval_hours !== undefined) {
      assert(
        Number.isFinite(source.poll_interval_hours) && source.poll_interval_hours > 0,
        `${label}.poll_interval_hours must be a positive number`
      );
    }
    if (source.type === "weixinzs_articles") {
      assert(source.tier === "discovery", `${label} WeixinZS sources must use discovery tier`);
      assert(Array.isArray(source.accounts) && source.accounts.length > 0, `${label}.accounts is required`);
      const usernames = new Set();
      for (const [accountIndex, account] of source.accounts.entries()) {
        const accountLabel = `${label}.accounts[${accountIndex}]`;
        assert(isObject(account), `${accountLabel} must be an object`);
        assert(nonEmptyString(account.name), `${accountLabel}.name is required`);
        assert(/^gh_[A-Za-z0-9]+$/.test(account.username), `${accountLabel}.username is invalid`);
        assert(!usernames.has(account.username), `${accountLabel}.username must be unique`);
        usernames.add(account.username);
      }
    }
  }
  return registry;
}

export function validateLedger(ledger) {
  assert(isObject(ledger), "ledger must be an object");
  assert(ledger.schema_version === LEDGER_SCHEMA_VERSION, `unsupported ledger schema ${ledger.schema_version}`);
  optionalIso(ledger.monitoring_baseline, "monitoring_baseline");
  optionalIso(ledger.last_successful_run_at, "last_successful_run_at");
  assert(
    Array.isArray(ledger.last_publication_event_ids),
    "ledger.last_publication_event_ids must be an array"
  );
  assert(Array.isArray(ledger.candidates), "ledger.candidates must be an array");
  assert(Array.isArray(ledger.evidence), "ledger.evidence must be an array");
  assert(Array.isArray(ledger.events), "ledger.events must be an array");

  const sourceRuns = ledger.source_runs ?? {};
  assert(isObject(sourceRuns), "ledger.source_runs must be an object");
  for (const [sourceId, run] of Object.entries(sourceRuns)) {
    const label = `source_runs[${sourceId}]`;
    assert(nonEmptyString(sourceId), "source_runs keys must be non-empty");
    assert(isObject(run), `${label} must be an object`);
    optionalIso(run.last_checked_at, `${label}.last_checked_at`);
    assert(run.last_checked_at, `${label}.last_checked_at is required`);
    optionalIso(run.last_success_at, `${label}.last_success_at`);
    optionalIso(run.cursor_at, `${label}.cursor_at`);
    optionalIso(run.next_due_at, `${label}.next_due_at`);
    optionalIso(run.first_failure_at, `${label}.first_failure_at`);
    assert(
      Number.isInteger(run.consecutive_failures) && run.consecutive_failures >= 0,
      `${label}.consecutive_failures is invalid`
    );
    if (run.consecutive_failures > 0) {
      assert(run.first_failure_at, `${label}.first_failure_at is required after a failure`);
    }
    assert(run.last_error === null || typeof run.last_error === "string", `${label}.last_error is invalid`);
    assert(Number.isInteger(run.item_count) && run.item_count >= 0, `${label}.item_count is invalid`);
  }

  const evidenceIds = new Set();
  for (const [index, evidence] of ledger.evidence.entries()) {
    const label = `evidence[${index}]`;
    assert(isObject(evidence), `${label} must be an object`);
    assert(nonEmptyString(evidence.id), `${label}.id is required`);
    assert(!evidenceIds.has(evidence.id), `${label}.id must be unique`);
    evidenceIds.add(evidence.id);
    assert(nonEmptyString(evidence.canonical_url), `${label}.canonical_url is required`);
    assert(normalizeUrl(evidence.canonical_url) === evidence.canonical_url, `${label}.canonical_url is not normalized`);
    assert(/^[a-f0-9]{64}$/.test(evidence.content_sha256), `${label}.content_sha256 is invalid`);
    assert(nonEmptyString(evidence.editorial_owner), `${label}.editorial_owner is required`);
    assert(["authoritative", "trusted", "discovery"].includes(evidence.tier), `${label}.tier is invalid`);
    assert(Array.isArray(evidence.authority_scope), `${label}.authority_scope must be an array`);
    for (const eventType of evidence.authority_scope) {
      assert(eventType === "*" || EVENT_TYPES.has(eventType), `${label}.authority_scope contains invalid ${eventType}`);
    }
    optionalIso(evidence.published_at, `${label}.published_at`);
    optionalIso(evidence.discovered_at, `${label}.discovered_at`);
  }

  const eventIds = new Set();
  for (const [index, event] of ledger.events.entries()) {
    const label = `events[${index}]`;
    assert(isObject(event), `${label} must be an object`);
    assert(nonEmptyString(event.id), `${label}.id is required`);
    assert(!eventIds.has(event.id), `${label}.id must be unique`);
    eventIds.add(event.id);
    assert(nonEmptyString(event.fingerprint), `${label}.fingerprint is required`);
    assert(nonEmptyString(event.company), `${label}.company is required`);
    assert(nonEmptyString(event.product), `${label}.product is required`);
    assert(nonEmptyString(event.title), `${label}.title is required`);
    assert(EVENT_TYPES.has(event.event_type), `${label}.event_type is invalid`);
    assert(PUBLICATION_STATES.has(event.publication_state), `${label}.publication_state is invalid`);
    assert(REVIEW_STATUSES.has(event.review_status), `${label}.review_status is invalid`);
    assert(["high", "medium", "low"].includes(event.evidence_confidence), `${label}.evidence_confidence is invalid`);
    assert(Array.isArray(event.evidence_ids), `${label}.evidence_ids must be an array`);
    assert(event.evidence_ids.length > 0, `${label}.evidence_ids must not be empty`);
    for (const id of event.evidence_ids) assert(evidenceIds.has(id), `${label} references missing evidence ${id}`);
    assert(Array.isArray(event.fact_revisions), `${label}.fact_revisions must be an array`);
    assert(event.fact_revisions.length > 0, `${label}.fact_revisions must not be empty`);
    for (const [revisionIndex, revision] of event.fact_revisions.entries()) {
      const revisionLabel = `${label}.fact_revisions[${revisionIndex}]`;
      assert(isObject(revision), `${revisionLabel} must be an object`);
      assert(nonEmptyString(revision.id), `${revisionLabel}.id is required`);
      optionalIso(revision.recorded_at, `${revisionLabel}.recorded_at`);
      assert(revision.recorded_at, `${revisionLabel}.recorded_at is required`);
      assert(isObject(revision.facts), `${revisionLabel}.facts must be an object`);
      assert(Array.isArray(revision.evidence_ids), `${revisionLabel}.evidence_ids must be an array`);
      assert(revision.evidence_ids.length > 0, `${revisionLabel}.evidence_ids must not be empty`);
      for (const id of revision.evidence_ids) {
        assert(event.evidence_ids.includes(id), `${revisionLabel} references evidence outside its event ${id}`);
      }
    }
    validateAnalyses(event.analyses, `${label}.analyses`);
    assert(Array.isArray(event.legacy_ids), `${label}.legacy_ids must be an array`);
    validateImportance(event.importance, `${label}.importance`);
    optionalIso(event.occurred_at, `${label}.occurred_at`);
    optionalIso(event.published_at, `${label}.published_at`);
    optionalIso(event.discovered_at, `${label}.discovered_at`);
  }
  for (const id of ledger.last_publication_event_ids) {
    assert(eventIds.has(id), `last_publication_event_ids references missing event ${id}`);
  }
  assert(
    new Set(ledger.last_publication_event_ids).size === ledger.last_publication_event_ids.length,
    "last_publication_event_ids must be unique"
  );

  const candidateIds = new Set();
  for (const [index, candidate] of ledger.candidates.entries()) {
    const label = `candidates[${index}]`;
    assert(isObject(candidate), `${label} must be an object`);
    assert(nonEmptyString(candidate.id), `${label}.id is required`);
    assert(!candidateIds.has(candidate.id), `${label}.id must be unique`);
    candidateIds.add(candidate.id);
    assert(nonEmptyString(candidate.company), `${label}.company is required`);
    assert(nonEmptyString(candidate.product), `${label}.product is required`);
    assert(nonEmptyString(candidate.title), `${label}.title is required`);
    assert(nonEmptyString(candidate.url), `${label}.url is required`);
    normalizeUrl(candidate.url);
    assert(EVENT_TYPES.has(candidate.event_type), `${label}.event_type is invalid`);
    assert(nonEmptyString(candidate.fingerprint), `${label}.fingerprint is required`);
    optionalIso(candidate.discovered_at, `${label}.discovered_at`);
    assert(["pending", "rejected", "promoted"].includes(candidate.status), `${label}.status is invalid`);
    assert(nonEmptyString(candidate.stage), `${label}.stage is required`);
    assert(Number.isInteger(candidate.retry_count) && candidate.retry_count >= 0, `${label}.retry_count is invalid`);
    assert(Array.isArray(candidate.evidence_ids), `${label}.evidence_ids must be an array`);
    for (const id of candidate.evidence_ids) {
      assert(evidenceIds.has(id), `${label} references missing evidence ${id}`);
    }
    validateAnalyses(candidate.analyses, `${label}.analyses`);
    if (candidate.retry_payload !== undefined && candidate.retry_payload !== null) {
      assert(isObject(candidate.retry_payload), `${label}.retry_payload must be an object`);
      assert(nonEmptyString(candidate.retry_payload.url), `${label}.retry_payload.url is required`);
      assert(isObject(candidate.retry_payload.source), `${label}.retry_payload.source is required`);
    }
    assert(
      candidate.material_fact_hash === null ||
        candidate.material_fact_hash === undefined ||
        /^[a-f0-9]{64}$/.test(candidate.material_fact_hash),
      `${label}.material_fact_hash is invalid`
    );
    if (candidate.status === "promoted") {
      assert(eventIds.has(candidate.event_id), `${label} references missing event ${candidate.event_id}`);
    }
  }
  return ledger;
}

function authoritySupports(evidence, eventType) {
  if (evidence.tier !== "authoritative") return false;
  const scope = evidence.authority_scope || [];
  return scope.includes("*") || scope.includes(eventType);
}

export function computeEvidenceConfidence(evidenceList, eventType) {
  if (evidenceList.some((evidence) => authoritySupports(evidence, eventType))) return "high";
  const trustedOwners = new Set(
    evidenceList
      .filter((evidence) => evidence.tier === "trusted")
      .map((evidence) => evidence.editorial_owner)
  );
  return trustedOwners.size >= 2 ? "medium" : "low";
}

function isHighRisk(candidate, importance) {
  return Boolean(
    importance.level === "L1" ||
      candidate.risk_flags?.includes("regulatory_claim") ||
      candidate.risk_flags?.includes("clinical_number") ||
      candidate.event_type === "regulatory_decision" ||
      candidate.event_type === "clinical_readout"
  );
}

function requiresHumanReview(candidate, importance) {
  return isHighRisk(candidate, importance);
}

function factsHash(facts) {
  return sha256(JSON.stringify(normalizedFactValue(facts || {})));
}

function hasMaterialChange(event, candidate) {
  const latest = event.fact_revisions.at(-1);
  if (!latest) return true;
  return factsHash(latest.facts) !== factsHash(candidate.facts || {});
}

function rememberPublication(ledger, event) {
  if (!ledger.last_publication_event_ids.includes(event.id)) {
    ledger.last_publication_event_ids.push(event.id);
  }
}

function normalizeDateTime(value) {
  if (!value) return null;
  const parsed = Date.parse(value);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

function createEvidence(candidate, identity) {
  const source = candidate.source || {};
  return {
    ...identity,
    source_id: source.source_id || "unregistered",
    editorial_owner: source.editorial_owner || new URL(candidate.url).hostname.replace(/^www\./, ""),
    tier: source.tier || "discovery",
    authority_scope: Array.isArray(source.authority_scope)
      ? source.authority_scope
      : Array.isArray(source.coverage?.event_types)
        ? source.coverage.event_types
        : [],
    source_type: source.source_type || source.type || "media",
    title: String(candidate.title || ""),
    source_label: String(candidate.source_label || source.label || source.editorial_owner || "web"),
    url: candidate.url,
    published_at: normalizeDateTime(candidate.published_at),
    discovered_at: normalizeDateTime(candidate.discovered_at) || new Date().toISOString(),
    snippet: String(candidate.snippet || ""),
    content: String(candidate.content || ""),
    content_status: candidate.content_status || (candidate.content ? "fetched" : "not_fetched"),
  };
}

function upsertCandidateRecord(ledger, candidate, patch) {
  const retryOf = candidate.retry_of_candidate_id;
  if (nonEmptyString(retryOf) && retryOf !== candidate.id) {
    const retryIndex = ledger.candidates.findIndex((item) => item.id === retryOf);
    if (retryIndex >= 0) ledger.candidates.splice(retryIndex, 1);
  }
  const existing = ledger.candidates.find((item) => item.id === candidate.id);
  const next = {
    id: candidate.id,
    company: candidate.company,
    product: candidate.product,
    title: candidate.title,
    url: candidate.url,
    event_type: candidate.event_type,
    fingerprint: eventFingerprint(candidate),
    material_fact_hash: materialFactHash(candidate),
    discovered_at: normalizeDateTime(candidate.discovered_at) || new Date().toISOString(),
    status: "pending",
    stage: "collected",
    error_category: null,
    retry_count: existing?.retry_count || 0,
    evidence_ids: existing?.evidence_ids || [],
    analyses: existing?.analyses || [],
    ...existing,
    ...patch,
  };
  if (existing) Object.assign(existing, next);
  else ledger.candidates.push(next);
  return next;
}

function candidateRetryPayload(candidate) {
  return {
    company: candidate.company,
    product: candidate.product,
    title: candidate.title,
    url: candidate.url,
    source_label: candidate.source_label,
    published_at: candidate.published_at,
    discovered_at: candidate.discovered_at,
    snippet: candidate.snippet,
    content: candidate.content,
    content_status: candidate.content_status,
    source: candidate.source,
    event_type_hint: candidate.event_type_hint || candidate.event_type,
    has_new_content_cursor: Boolean(candidate.has_new_content_cursor),
    legacy_ids: Array.isArray(candidate.legacy_ids) ? candidate.legacy_ids : [],
  };
}

export function pendingRetryHits(ledger) {
  return ledger.candidates
    .filter((candidate) => candidate.status === "pending")
    .filter((candidate) => RETRYABLE_CANDIDATE_STAGES.has(candidate.stage))
    .filter((candidate) => isObject(candidate.retry_payload))
    .map((candidate) => ({
      ...candidate.retry_payload,
      retry_of_candidate_id: candidate.id,
    }));
}

export function recordPendingCandidate(
  ledger,
  candidate,
  {
    stage,
    errorCategory,
    errorMessage = "",
    analyses = candidate.analyses || [],
    incrementRetry = true,
  }
) {
  const existing = ledger.candidates.find((item) => item.id === candidate.id);
  return upsertCandidateRecord(ledger, candidate, {
    status: "pending",
    stage,
    error_category: errorCategory,
    error_message: errorMessage,
    analyses,
    retry_payload: candidateRetryPayload(candidate),
    retry_count: (existing?.retry_count || 0) + (incrementRetry ? 1 : 0),
  });
}

export function recordRejectedCandidate(ledger, candidate, { stage, analyses = candidate.analyses || [] }) {
  return upsertCandidateRecord(ledger, candidate, {
    status: "rejected",
    stage,
    error_category: null,
    error_message: "",
    analyses,
  });
}

export function recallCandidateEvents(ledger, candidate, { limit = 8 } = {}) {
  const company = normalizeFingerprintPart(candidate.company);
  const product = normalizeFingerprintPart(candidate.product);
  const eventDate = String(candidate.occurred_at || candidate.published_at || "").slice(0, 10);
  return ledger.events
    .filter((event) => normalizeFingerprintPart(event.company) === company)
    .filter(
      (event) =>
        normalizeFingerprintPart(event.product) === product ||
        event.event_type === candidate.event_type
    )
    .filter((event) => {
      if (!eventDate) return true;
      const existingDate = String(event.occurred_at || event.published_at || "").slice(0, 10);
      if (!existingDate) return true;
      return Math.abs(Date.parse(eventDate) - Date.parse(existingDate)) <= 45 * 86_400_000;
    })
    .sort(compareEvents)
    .slice(0, limit)
    .map((event) => ({
      id: event.id,
      company: event.company,
      product: event.product,
      event_type: event.event_type,
      title: event.title,
      occurred_at: event.occurred_at,
      published_at: event.published_at,
      latest_facts: event.fact_revisions.at(-1)?.facts || {},
      evidence_ids: event.evidence_ids,
    }));
}

function findEventForCandidate(ledger, candidate, evidence, matcherResult) {
  const exactEvidenceEvent = ledger.events.find((event) => event.evidence_ids.includes(evidence.id));
  if (exactEvidenceEvent) return exactEvidenceEvent;

  const canonicalUrlEvent = ledger.events.find((event) =>
    event.evidence_ids.some(
      (evidenceId) =>
        ledger.evidence.find((entry) => entry.id === evidenceId)?.canonical_url === evidence.canonical_url
    )
  );
  if (canonicalUrlEvent) return canonicalUrlEvent;

  const byLegacy = ledger.events.find((event) =>
    (candidate.legacy_ids || []).some((id) => event.legacy_ids.includes(id))
  );
  if (byLegacy) return byLegacy;

  const fingerprint = eventFingerprint(candidate);
  const exactFingerprint = ledger.events.find((event) => event.fingerprint === fingerprint);
  if (exactFingerprint) return exactFingerprint;

  if (matcherResult?.relation === "same_event" || matcherResult?.relation === "material_update") {
    return ledger.events.find((event) => event.id === matcherResult.event_id) || null;
  }
  return null;
}

function newEventId() {
  return `evt_${randomUUID()}`;
}

function normalizeImportance(candidate) {
  if (candidate.importance) return importanceFrom(candidate.importance);
  return importanceFrom({ relevance: 0, impact: 0, actionability: 0 });
}

function makeFactRevision(candidate, evidenceIds, now) {
  return {
    id: `rev_${randomUUID()}`,
    recorded_at: now,
    facts: candidate.facts || {},
    summary: String(candidate.summary || ""),
    reason: String(candidate.reason || ""),
    evidence_ids: [...new Set(Array.isArray(evidenceIds) ? evidenceIds : [evidenceIds])],
  };
}

function candidateHasVerifiableDate(candidate) {
  return Boolean(normalizeDateTime(candidate.occurred_at) || normalizeDateTime(candidate.published_at));
}

export function mergeCandidate(ledger, candidate, { matcherResult = null, now = new Date().toISOString() } = {}) {
  validateLedger(ledger);
  assert(isObject(candidate), "candidate must be an object");
  assert(nonEmptyString(candidate.id), "candidate.id is required");
  assert(nonEmptyString(candidate.company), "candidate.company is required");
  assert(nonEmptyString(candidate.product), "candidate.product is required");
  assert(nonEmptyString(candidate.title), "candidate.title is required");
  assert(nonEmptyString(candidate.url), "candidate.url is required");
  assert(EVENT_TYPES.has(candidate.event_type), "candidate.event_type is invalid");

  if (!candidateHasVerifiableDate(candidate) && !candidate.has_new_content_cursor) {
    upsertCandidateRecord(ledger, candidate, {
      status: "pending",
      stage: "date_verification",
      error_category: "missing_event_date",
      retry_count: (ledger.candidates.find((item) => item.id === candidate.id)?.retry_count || 0) + 1,
    });
    return { status: "pending", reason: "missing_event_date", event: null };
  }

  const identity = evidenceIdentity(candidate);
  let evidence = ledger.evidence.find((item) => item.id === identity.id);
  if (!evidence) {
    evidence = createEvidence(candidate, identity);
    ledger.evidence.push(evidence);
  }

  const record = upsertCandidateRecord(ledger, candidate, {
    evidence_ids: [
      ...new Set([...(ledger.candidates.find((item) => item.id === candidate.id)?.evidence_ids || []), evidence.id]),
    ],
    analyses: candidate.analyses || [],
  });

  let event = findEventForCandidate(ledger, candidate, evidence, matcherResult);
  if (event) {
    const evidenceWasPresent = event.evidence_ids.includes(evidence.id);
    const material = !evidenceWasPresent && hasMaterialChange(event, candidate);
    if (material) {
      const fingerprint = eventFingerprint(candidate);
      const supportingRecords = ledger.candidates.filter(
        (item) =>
          item.fingerprint === fingerprint &&
          (item.id === record.id ||
            (record.material_fact_hash &&
              item.material_fact_hash === record.material_fact_hash &&
              item.status === "pending" &&
              item.stage === "evidence_gate"))
      );
      const supportingEvidenceIds = [
        ...new Set(supportingRecords.flatMap((item) => item.evidence_ids || [])),
      ];
      const supportingEvidence = ledger.evidence.filter((item) => supportingEvidenceIds.includes(item.id));
      const updateConfidence = computeEvidenceConfidence(supportingEvidence, event.event_type);
      if (updateConfidence === "low") {
        record.status = "pending";
        record.stage = "evidence_gate";
        record.error_category = "insufficient_update_evidence";
        validateLedger(ledger);
        return { status: "pending", reason: "insufficient_update_evidence", event };
      }

      event.evidence_ids = [...new Set([...event.evidence_ids, ...supportingEvidenceIds])];
      const relatedEvidence = ledger.evidence.filter((item) => event.evidence_ids.includes(item.id));
      event.evidence_confidence = computeEvidenceConfidence(relatedEvidence, event.event_type);
      event.analyses.push(...(candidate.analyses || []));
      event.discovered_at = normalizeDateTime(candidate.discovered_at) || event.discovered_at;
      event.fact_revisions.push(makeFactRevision(candidate, supportingEvidenceIds, now));
      event.publication_state = "update";
      event.title = candidate.title || event.title;
      event.occurred_at = normalizeDateTime(candidate.occurred_at) || event.occurred_at;
      event.published_at = normalizeDateTime(candidate.published_at) || event.published_at;
      event.importance = normalizeImportance(candidate);
      event.review_status = requiresHumanReview(candidate, event.importance) ? "pending" : "not_required";
      event.last_material_update_at = now;
      for (const supportingRecord of supportingRecords) {
        supportingRecord.status = "promoted";
        supportingRecord.stage = "merged_update";
        supportingRecord.event_id = event.id;
        supportingRecord.error_category = null;
      }
      rememberPublication(ledger, event);
      validateLedger(ledger);
      return { status: "update", reason: "material_facts_changed", event };
    }

    if (!evidenceWasPresent) event.evidence_ids.push(evidence.id);
    const relatedEvidence = ledger.evidence.filter((item) => event.evidence_ids.includes(item.id));
    event.evidence_confidence = computeEvidenceConfidence(relatedEvidence, event.event_type);
    event.analyses.push(...(candidate.analyses || []));
    event.discovered_at = normalizeDateTime(candidate.discovered_at) || event.discovered_at;

    record.status = "promoted";
    record.stage = "merged_duplicate";
    record.event_id = event.id;
    validateLedger(ledger);
    return { status: "duplicate", reason: evidenceWasPresent ? "same_evidence" : "no_new_facts", event };
  }

  const fingerprint = eventFingerprint(candidate);
  const relatedRecords = ledger.candidates.filter(
    (item) =>
      item.fingerprint === fingerprint &&
      (item.id === record.id ||
        (record.material_fact_hash &&
          item.material_fact_hash === record.material_fact_hash &&
          item.status === "pending" &&
          item.stage === "evidence_gate"))
  );
  const relatedEvidenceIds = [
    ...new Set(relatedRecords.flatMap((item) => item.evidence_ids || [])),
  ];
  const relatedEvidence = ledger.evidence.filter((item) => relatedEvidenceIds.includes(item.id));
  const confidence = computeEvidenceConfidence(relatedEvidence, candidate.event_type);
  const importance = normalizeImportance(candidate);
  if (confidence === "low") {
    record.status = "pending";
    record.stage = "evidence_gate";
    record.error_category = "insufficient_evidence";
    validateLedger(ledger);
    return { status: "pending", reason: "insufficient_evidence", event: null };
  }

  const occurredAt = normalizeDateTime(candidate.occurred_at);
  const publishedAt = normalizeDateTime(candidate.published_at);
  const eventTime = occurredAt || publishedAt;
  const publicationState = Date.parse(eventTime) < Date.parse(ledger.monitoring_baseline) ? "backfill" : "first";
  event = {
    id: newEventId(),
    legacy_ids: [...new Set(candidate.legacy_ids || [])],
    fingerprint,
    company: candidate.company,
    product: candidate.product,
    title: candidate.title,
    event_type: candidate.event_type,
    category: CATEGORY_BY_EVENT_TYPE[candidate.event_type],
    occurred_at: occurredAt,
    published_at: publishedAt,
    discovered_at: normalizeDateTime(candidate.discovered_at) || now,
    publication_state: publicationState,
    first_published_at: publicationState === "first" ? now : null,
    last_material_update_at: now,
    fact_revisions: [makeFactRevision(candidate, relatedEvidenceIds, now)],
    evidence_ids: relatedEvidenceIds,
    importance,
    evidence_confidence: confidence,
    review_status: requiresHumanReview(candidate, importance) ? "pending" : "not_required",
    analyses: [...(candidate.analyses || [])],
  };
  ledger.events.push(event);
  if (publicationState === "first") rememberPublication(ledger, event);
  for (const relatedRecord of relatedRecords) {
    relatedRecord.status = "promoted";
    relatedRecord.stage = publicationState === "first" ? "merged_first" : "merged_backfill";
    relatedRecord.event_id = event.id;
    relatedRecord.error_category = null;
  }
  validateLedger(ledger);
  return { status: publicationState, reason: "new_verified_event", event };
}

export function mergeCandidates(ledger, candidates, { matcherResults = new Map(), now = new Date().toISOString() } = {}) {
  const metrics = { first: 0, update: 0, duplicate: 0, backfill: 0, pending: 0, failed: 0 };
  const results = [];
  for (const candidate of candidates) {
    try {
      const result = mergeCandidate(ledger, candidate, {
        matcherResult: matcherResults.get(candidate.id) || null,
        now,
      });
      metrics[result.status] = (metrics[result.status] || 0) + 1;
      results.push({ candidate_id: candidate.id, ...result });
    } catch (error) {
      metrics.failed++;
      upsertCandidateRecord(ledger, candidate, {
        status: "pending",
        stage: "merge_failed",
        error_category: error?.name || "merge_error",
        error_message: String(error?.message || error),
        retry_count: (ledger.candidates.find((item) => item.id === candidate.id)?.retry_count || 0) + 1,
      });
      results.push({ candidate_id: candidate.id, status: "failed", reason: String(error?.message || error), event: null });
    }
  }
  return { metrics, results };
}

export function eventIsPublic(event) {
  if (event.evidence_confidence === "low") return false;
  if (!event.importance.level) return false;
  if (event.review_status === "rejected") return false;
  return true;
}

export function eventIsDailyEligible(event) {
  if (!eventIsPublic(event)) return false;
  if (!new Set(["first", "update"]).has(event.publication_state)) return false;
  if (!new Set(["L1", "L2"]).has(event.importance.level)) return false;
  if (event.review_status === "pending") return false;
  return true;
}

function compareEvents(a, b) {
  const levelRank = { L1: 3, L2: 2, L3: 1 };
  const byLevel = (levelRank[b.importance.level] || 0) - (levelRank[a.importance.level] || 0);
  if (byLevel) return byLevel;
  const byScore = b.importance.total - a.importance.total;
  if (byScore) return byScore;
  return String(b.occurred_at || b.published_at || "").localeCompare(
    String(a.occurred_at || a.published_at || "")
  );
}

function evidenceToItem(evidence, event) {
  const eventDate = event.occurred_at || event.published_at || evidence.published_at || "";
  return {
    id: evidence.id,
    legacy_ids: [],
    event_id: event.id,
    company: event.company,
    product: event.product,
    category: event.category,
    event_type: event.event_type,
    channel: evidence.source_id,
    title: evidence.title || event.title,
    source: evidence.source_label || evidence.editorial_owner,
    editorial_owner: evidence.editorial_owner,
    source_type: evidence.source_type,
    date: String(eventDate).slice(0, 10),
    occurred_at: event.occurred_at,
    published_at: evidence.published_at,
    discovered_at: evidence.discovered_at,
    url: evidence.url,
    note: "",
    snippet: evidence.snippet || "",
    content: evidence.content || undefined,
    content_status: evidence.content_status,
  };
}

function sparkFor(event, days, generatedAt) {
  const values = new Array(days).fill(0);
  const date = event.occurred_at || event.published_at;
  if (!date) return values;
  const age = Math.floor((Date.parse(generatedAt) - Date.parse(date)) / 86_400_000);
  if (age >= 0 && age < days) values[days - 1 - age] = 1;
  return values;
}

function eventToStory(event, evidence, generatedAt, windowDays) {
  const eventEvidence = evidence.filter((item) => event.evidence_ids.includes(item.id));
  const items = eventEvidence.map((item) => evidenceToItem(item, event));
  const latestRevision = event.fact_revisions.at(-1) || {};
  const independentOwners = new Set(eventEvidence.map((item) => item.editorial_owner));
  const eventDate = event.occurred_at || event.published_at || "";
  return {
    id: event.id,
    legacy_ids: event.legacy_ids,
    company: event.company,
    product: event.product,
    title: event.title,
    event_type: event.event_type,
    publication_state: event.publication_state,
    level: event.importance.level,
    evidence_confidence: event.evidence_confidence,
    score_breakdown: event.importance,
    review_status: event.review_status,
    occurred_at: event.occurred_at,
    published_at: event.published_at,
    discovered_at: event.discovered_at,
    heat: event.importance.total,
    score: event.importance.total,
    badges: event.publication_state === "first" ? ["新"] : event.publication_state === "update" ? ["更新"] : [],
    sources_count: independentOwners.size,
    evidence_summary: eventEvidence.map((item) => ({
      id: item.id,
      editorial_owner: item.editorial_owner,
      source_id: item.source_id,
      tier: item.tier,
      url: item.url,
    })),
    categories: [event.category],
    first_seen: String(eventDate).slice(0, 10),
    last_seen: String(eventDate).slice(0, 10),
    spark: sparkFor(event, windowDays, generatedAt),
    items,
    summary: latestRevision.summary || "",
    reason: latestRevision.reason || "",
    stale_month: null,
  };
}

export function projectPublicReport(
  ledger,
  {
    generatedAt = new Date().toISOString(),
    windowDays = 31,
    digest = null,
    manualTasks = [],
    errors = [],
    metrics = {},
    sourceCount = 0,
  } = {}
) {
  validateLedger(ledger);
  const windowSince = new Date(Date.parse(generatedAt) - windowDays * 86_400_000).toISOString().slice(0, 10);
  const events = ledger.events.filter(eventIsPublic).sort(compareEvents);
  const stories = events.map((event) => eventToStory(event, ledger.evidence, generatedAt, windowDays));
  const storyById = new Map(stories.map((story) => [story.id, story]));
  const publicationIds = new Set(ledger.last_publication_event_ids);
  const dailyIds = events
    .filter((event) => publicationIds.has(event.id) && eventIsDailyEligible(event))
    .map((event) => event.id);
  const hotIds = events
    .filter((event) => String(event.occurred_at || event.published_at || "").slice(0, 10) >= windowSince)
    .map((event) => event.id);
  const dailyStories = dailyIds.map((id) => storyById.get(id)).filter(Boolean);
  const items = stories.flatMap((story) => story.items);
  const categoryLabels = {
    regulatory: "报证审批",
    academic: "学术动态",
    research: "新研究",
    market: "市场动态",
  };
  const categories = Object.entries(categoryLabels).map(([key, label]) => ({
    key,
    label,
    count: dailyStories.filter((story) => story.categories.includes(key)).length,
  }));
  return {
    schema_version: 2,
    generated_at: generatedAt,
    window_since: windowSince,
    watches: sourceCount,
    categories,
    items,
    stories,
    digest,
    manual_tasks: manualTasks,
    errors,
    views: {
      daily_event_ids: dailyIds,
      hot_event_ids: hotIds,
      all_event_ids: events.map((event) => event.id),
    },
    metrics,
  };
}

function legacyImportance(score = 0, reason = "") {
  if (score >= 80) {
    return importanceFrom({
      relevance: 30,
      impact: score >= 95 ? 50 : 40,
      actionability: score >= 90 ? 20 : 10,
      rationales: { relevance: reason, impact: reason, actionability: reason },
    });
  }
  if (score >= 60) {
    return importanceFrom({
      relevance: 30,
      impact: 30,
      actionability: score >= 70 ? 10 : 0,
      rationales: { relevance: reason, impact: reason, actionability: reason },
    });
  }
  if (score >= 40) {
    return importanceFrom({
      relevance: 20,
      impact: 15,
      actionability: 10,
      rationales: { relevance: reason, impact: reason, actionability: reason },
    });
  }
  return importanceFrom({ relevance: 10, impact: 15, actionability: 0 });
}

function sourceForLegacyItem(item, sourceByHost) {
  const host = new URL(item.url).hostname.toLowerCase().replace(/^www\./, "");
  const registered = sourceByHost.get(host);
  if (registered) {
    return {
      source_id: registered.source_id,
      editorial_owner: registered.editorial_owner,
      tier: registered.tier,
      authority_scope: registered.coverage.event_types,
      source_type: registered.source_type || registered.type,
      label: item.source,
    };
  }
  if (item.channel === "fda") {
    return {
      source_id: "fda:openfda",
      editorial_owner: "U.S. Food and Drug Administration",
      tier: "authoritative",
      authority_scope: ["regulatory_decision"],
      source_type: "regulator",
      label: item.source,
    };
  }
  if (item.channel === "pubmed") {
    return {
      source_id: "nih:pubmed",
      editorial_owner: item.source || "NIH/NLM",
      tier: "authoritative",
      authority_scope: ["publication"],
      source_type: "journal",
      label: item.source,
    };
  }
  return {
    source_id: `legacy:${item.channel || "web"}:${host}`,
    editorial_owner: host,
    tier: "trusted",
    authority_scope: [],
    source_type: "media",
    label: item.source,
  };
}

export function migrateLegacyReport(report, { registry = null, now = report.generated_at || new Date().toISOString() } = {}) {
  const ledger = createEmptyLedger();
  const sourceByHost = new Map();
  for (const source of registry?.sources || []) {
    try {
      sourceByHost.set(new URL(source.url).hostname.toLowerCase().replace(/^www\./, ""), source);
    } catch {
      // Registry validation owns malformed URL reporting; migration stays best effort.
    }
  }

  const flatById = new Map((report.items || []).map((item) => [item.id, item]));
  for (const story of report.stories || []) {
    const eventType = classifyEventType({ title: story.title, category: story.categories?.[0] });
    const occurredAt = story.last_seen ? normalizeDateTime(story.last_seen) : null;
    const event = {
      id: newEventId(),
      legacy_ids: [story.id, ...(story.items || []).map((item) => item.id)],
      fingerprint: eventFingerprint({
        company: story.company,
        product: story.product,
        event_type: eventType,
        occurred_at: occurredAt,
      }),
      company: story.company,
      product: story.product,
      title: story.title,
      event_type: eventType,
      category: CATEGORY_BY_EVENT_TYPE[eventType],
      occurred_at: occurredAt,
      published_at: occurredAt,
      discovered_at: now,
      publication_state: "backfill",
      first_published_at: null,
      last_material_update_at: now,
      fact_revisions: [],
      evidence_ids: [],
      importance: legacyImportance(story.score, story.reason),
      evidence_confidence: "low",
      review_status: "approved",
      analyses: [
        {
          provider: "legacy",
          model: "legacy-single-score",
          prompt_version: "legacy-v2",
          schema_version: "legacy",
          generated_at: report.generated_at,
          result: { migrated_score: story.score || 0 },
        },
      ],
    };

    for (const storyItem of story.items || []) {
      const item = { ...flatById.get(storyItem.id), ...storyItem };
      if (!item.url) continue;
      const candidate = {
        url: item.url,
        title: item.title || story.title,
        snippet: item.snippet || "",
        content: item.content || "",
        published_at: item.date ? normalizeDateTime(item.date) : occurredAt,
        discovered_at: now,
        source_label: item.source,
        source: sourceForLegacyItem(item, sourceByHost),
      };
      const identity = evidenceIdentity(candidate);
      let evidence = ledger.evidence.find((entry) => entry.id === identity.id);
      if (!evidence) {
        evidence = createEvidence(candidate, identity);
        ledger.evidence.push(evidence);
      }
      if (!event.evidence_ids.includes(evidence.id)) event.evidence_ids.push(evidence.id);
    }

    if (!event.evidence_ids.length) continue;
    event.evidence_confidence = computeEvidenceConfidence(
      ledger.evidence.filter((evidence) => event.evidence_ids.includes(evidence.id)),
      event.event_type
    );
    event.fact_revisions.push({
      id: `rev_${randomUUID()}`,
      recorded_at: now,
      facts: { legacy_title: story.title },
      summary: story.summary || "",
      reason: story.reason || "",
      evidence_ids: [...event.evidence_ids],
    });
    ledger.events.push(event);
  }
  ledger.last_successful_run_at = now;
  validateLedger(ledger);
  return ledger;
}

export async function loadJson(filePath) {
  return JSON.parse(await fs.readFile(filePath, "utf8"));
}

export async function loadLedger(filePath) {
  return validateLedger(await loadJson(filePath));
}

export async function atomicWriteJson(filePath, value) {
  await atomicWriteBundle([{ path: filePath, value }]);
}

export async function atomicWriteBundle(entries) {
  assert(Array.isArray(entries) && entries.length > 0, "atomicWriteBundle requires entries");
  const nonce = `${process.pid}-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  const prepared = [];
  try {
    for (const entry of entries) {
      const targetPath = path.resolve(entry.path);
      await fs.mkdir(path.dirname(targetPath), { recursive: true });
      const tempPath = `${targetPath}.tmp-${nonce}`;
      const backupPath = `${targetPath}.bak-${nonce}`;
      const serialized = `${JSON.stringify(entry.value, null, 2)}\n`;
      await fs.writeFile(tempPath, serialized, { encoding: "utf8", flag: "wx" });
      JSON.parse(await fs.readFile(tempPath, "utf8"));
      prepared.push({ targetPath, tempPath, backupPath, hadTarget: false, installed: false });
    }

    for (const item of prepared) {
      try {
        await fs.rename(item.targetPath, item.backupPath);
        item.hadTarget = true;
      } catch (error) {
        if (error?.code !== "ENOENT") throw error;
      }
      await fs.rename(item.tempPath, item.targetPath);
      item.installed = true;
    }

    await Promise.all(
      prepared.filter((item) => item.hadTarget).map((item) => fs.unlink(item.backupPath).catch(() => {}))
    );
  } catch (error) {
    for (const item of [...prepared].reverse()) {
      if (item.installed) await fs.unlink(item.targetPath).catch(() => {});
      if (item.hadTarget) await fs.rename(item.backupPath, item.targetPath).catch(() => {});
      await fs.unlink(item.tempPath).catch(() => {});
    }
    throw error;
  }
}
