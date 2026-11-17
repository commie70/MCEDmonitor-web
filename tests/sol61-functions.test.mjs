import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { filterMrdProducts } from "../src/lib/mrd-filter.mjs";
import { csvCell, toCsv } from "../src/lib/csv.mjs";
import { buildSystemStatus } from "../scripts/build-system-status.mjs";
const read = (name) => JSON.parse(readFileSync(new URL(`../src/data/${name}.json`, import.meta.url)));
const products = read("mrd");
const sources = new Set(read("sources").map((s) => s.id));

test("independent discovery/tracking filters retain newer master products and hybrid records", () => {
  assert.equal(products.length, 44);
  for (const id of ["natera-signatera-genome", "natera-latitude", "labcorp-plasma-detect-id", "genesolutions-k-track"]) assert.ok(products.some((p) => p.id === id));
  assert.ok(filterMrdProducts(products, { tissue: "WGS" }).some((p) => p.id === "personalis-next-personal"));
  assert.ok(!filterMrdProducts(products, { tracking: "WGS" }).some((p) => p.id === "personalis-next-personal"));
  assert.ok(filterMrdProducts(products, { approach: "hybrid" }).length > 0);
  assert.equal(filterMrdProducts(products, { region: "国内", q: "clonoSEQ" }).length, 0);
  assert.ok(filterMrdProducts(products, { category: "heme", tissue: "IG/TCR" }).length > 0);
});

test("research configurations and CDx cannot inherit commercial LDT cohorts", () => {
  const ldt = products.find((p) => p.id === "natera-signatera");
  assert.deepEqual(ldt.clinical.map((c) => c.n), [94, 75]);
  assert.ok(ldt.statuses.every((s) => !s.label.includes("CDx")));
  const cdx = products.find((p) => p.id === "signatera-cdx");
  assert.equal(cdx.clinical.length, 0);
  for (const input of ["10 ng", "33 ng", "66 ng"]) assert.ok(cdx.lod.some((l) => l.input?.includes(input)));
  assert.equal(products.find((p) => p.id === "foundationone-mrd").clinical.length, 0);
  assert.equal(products.find((p) => p.id === "burningrock-langwei").clinical.length, 0);
  for (const id of ["burningrock-prophet2023", "saga-tracer2025", "geneseeq-shuning-aacr2026"]) assert.equal(products.find((p) => p.id === id).recordKind, "research");
});

test("new analytical and price fields resolve sources without currency or LoD conversion", () => {
  for (const p of products) for (const entry of p.analytical || []) {
    assert.ok(entry.label && entry.value && entry.context && entry.sources.length);
    for (const id of entry.sources) assert.ok(sources.has(id));
  }
  const bgi = products.find((p) => p.id === "bgi-huajianwei").prices[0];
  assert.equal(bgi.amount, null); assert.equal(bgi.status, "historical");
  assert.ok(products.find((p) => p.id === "guardant-reveal").prices.some((p) => p.currency === "JPY"));
  const fee = read("mrd-institution-prices")[0];
  assert.equal(fee.amount, 1680); assert.ok(fee.note.includes("未指明产品"));
  assert.ok(fee.sources.every((id) => sources.has(id)));
});

test("CSV neutralizes formulas without corrupting multiline evidence and Unicode", () => {
  for (const value of ["=HYPERLINK(1)", " +1", "\t@A1", "-1+2"]) assert.ok(csvCell(value).startsWith('"\''));
  assert.equal(csvCell('甲,乙"丙\n丁'), '"甲,乙""丙\n丁"');
  assert.ok(toCsv([["企业", "来源"], ["世和", "https://example.com"]]).startsWith("\uFEFF"));
});

test("public health projection strips private data, counts active gaps and uses release gate", () => {
  const registry = { sources: [{ source_id: "one", editorial_owner: "owner", enabled: true, url: "https://secret/?key=PRIVATE" }, { source_id: "disabled", enabled: false }] };
  const ledger = { events: [{ review_status: "pending", text: "PRIVATE" }], candidates: [{ status: "pending", raw: "PRIVATE" }], source_runs: { one: { consecutive_failures: 3, last_checked_at: "2026-11-12T00:00:00.000Z", last_error: "PRIVATE" }, disabled: { consecutive_failures: 99 } } };
  const status = buildSystemStatus(registry, ledger, { gate_open: false, accepted_at: "PRIVATE" }, { errors: 2, text: "PRIVATE" });
  assert.equal(status.failedSources, 1); assert.equal(status.coverageGaps, 1); assert.equal(status.health, "failed");
  assert.equal(status.pendingCount, 1); assert.equal(status.pendingCandidates, 1); assert.equal(status.release.gate_open, false);
  assert.doesNotMatch(JSON.stringify(status), /PRIVATE|last_error|url/);
  assert.equal(buildSystemStatus(registry, { events: [], source_runs: {} }, { gate_open: true }).health, "unknown");
});
