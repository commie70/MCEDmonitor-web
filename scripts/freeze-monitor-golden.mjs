#!/usr/bin/env node

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { normalizeUrl } from "./lib-monitor-ledger.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPORT_PATH = path.join(ROOT, "public", "monitor", "daily-report.json");
const OUT_PATH = path.join(ROOT, "tests", "monitor-golden.json");

const report = JSON.parse(await fs.readFile(REPORT_PATH, "utf8"));
const storyById = new Map(report.stories.map((story) => [story.id, story]));

const duplicateGroups = new Map();
for (const item of report.items) {
  const canonical = normalizeUrl(item.url);
  const group = duplicateGroups.get(canonical) || [];
  group.push(item);
  duplicateGroups.set(canonical, group);
}
const urlDuplicates = [...duplicateGroups.entries()]
  .filter(([, items]) => items.length > 1)
  .sort(([a], [b]) => a.localeCompare(b))
  .map(([expectedCanonical, items], index) => ({
    id: `url-${String(index + 1).padStart(2, "0")}`,
    expected_canonical: expectedCanonical,
    urls: items.map((item) => item.url),
    legacy_ids: items.map((item) => item.id),
  }));

if (urlDuplicates.length !== 40) {
  throw new Error(`expected 40 duplicate URL groups, found ${urlDuplicates.length}`);
}

const sameStoryIds = [
  "story:1abvz5n",
  "story:wsxwyw",
  "story:rruo90",
  "story:j3w4yl",
  "story:dqnujj",
  "story:1ywup0w",
  "story:1d8n7ba",
  "story:1j3dnab",
  "story:iwn036",
  "story:ntho86",
  "story:d3ie7z",
  "story:15983fp",
  "story:oyxtp2",
  "story:d22zob",
  "story:1cdn80b",
];

const differentStoryPairs = [
  ["story:1e2qxn0", "story:13099vx"],
  ["story:dqnujj", "story:1c43yb8"],
  ["story:rruo90", "story:1gb6fz3"],
  ["story:iwn036", "story:ntho86"],
  ["story:j3w4yl", "story:d8m84d"],
  ["story:1t5peic", "story:1d8n7ba"],
  ["story:106boy2", "story:12gs723"],
  ["story:1abvz5n", "story:1ywup0w"],
  ["story:wsxwyw", "story:d22zob"],
  ["story:15983fp", "story:ierkkn"],
  ["story:oyxtp2", "story:12cuokx"],
  ["story:1gx8cjc", "story:tkiw5y"],
  ["story:1cdn80b", "story:is1fa"],
  ["story:d3ie7z", "story:7tlx0d"],
  ["story:1j3dnab", "story:1cey6xa"],
];

const samePairs = sameStoryIds.map((storyId, index) => {
  const story = storyById.get(storyId);
  if (!story || story.items.length < 2) throw new Error(`missing same-event source story ${storyId}`);
  return {
    id: `event-same-${String(index + 1).padStart(2, "0")}`,
    expected: "same_event",
    company: story.company,
    left: { title: story.items[0].title, url: story.items[0].url },
    right: { title: story.items[1].title, url: story.items[1].url },
  };
});

const differentPairs = differentStoryPairs.map(([leftId, rightId], index) => {
  const left = storyById.get(leftId);
  const right = storyById.get(rightId);
  if (!left || !right) throw new Error(`missing different-event source story ${leftId}/${rightId}`);
  return {
    id: `event-different-${String(index + 1).padStart(2, "0")}`,
    expected: "different_event",
    company: left.company,
    left: { title: left.title, occurred_at: left.last_seen || null },
    right: { title: right.title, occurred_at: right.last_seen || null },
  };
});

const firstStoryIds = [
  "story:1gb6fz3",
  "story:xtnbtz",
  "story:1l7dvmu",
  "story:1ugutbd",
  "story:15icwrp",
  "story:1de0n2x",
  "story:47qsai",
  "story:1aq958r",
];
const backfillStoryIds = [
  "story:1c43yb8",
  "story:dqnujj",
  "story:14nl2ot",
  "story:15983fp",
  "story:1cdn80b",
  "story:1cey6xa",
  "story:1et4z4k",
];

function storyCase(storyId, expected, index) {
  const story = storyById.get(storyId);
  if (!story) throw new Error(`missing history source story ${storyId}`);
  const source = story.items[0];
  const historicalDate = (story.last_seen || "2020-01-01").length === 7
    ? `${story.last_seen}-01`
    : story.last_seen || "2020-01-01";
  return {
    id: `history-${expected}-${String(index + 1).padStart(2, "0")}`,
    expected,
    source_story_id: storyId,
    candidate: {
      company: story.company,
      product: story.product,
      title: story.title,
      url: source.url,
      occurred_at:
        expected === "first"
          ? `2026-08-${String(17 + index).padStart(2, "0")}T00:00:00.000Z`
          : `${historicalDate}T00:00:00.000Z`,
    },
  };
}

const firstCases = firstStoryIds.map((id, index) => storyCase(id, "first", index));
const backfillCases = backfillStoryIds.map((id, index) => storyCase(id, "backfill", index));

const updateCases = sameStoryIds.slice(0, 8).map((storyId, index) => {
  const story = storyById.get(storyId);
  return {
    id: `history-update-${String(index + 1).padStart(2, "0")}`,
    expected: "update",
    source_story_id: storyId,
    seed: { fact_value: `baseline-${index}`, content: story.items[0].title },
    candidate: {
      company: story.company,
      product: story.product,
      title: story.title,
      url: story.items[0].url,
      occurred_at: "2026-08-20T00:00:00.000Z",
      fact_value: `material-update-${index}`,
      content: `${story.items[0].title}\n新增关键事实 ${index}`,
    },
  };
});

const duplicateCases = sameStoryIds.slice(8, 15).map((storyId, index) => {
  const story = storyById.get(storyId);
  return {
    id: `history-duplicate-${String(index + 1).padStart(2, "0")}`,
    expected: "duplicate",
    source_story_id: storyId,
    seed: { fact_value: `same-${index}`, content: story.items[0].title },
    candidate: {
      company: story.company,
      product: story.product,
      title: story.title,
      url: story.items[0].url,
      occurred_at: "2026-08-20T00:00:00.000Z",
      fact_value: `same-${index}`,
      content: story.items[0].title,
    },
  };
});

const importanceLabels = [
  ["story:1abvz5n", 30, 40, 20],
  ["story:wsxwyw", 30, 40, 20],
  ["story:1t5peic", 30, 15, 10],
  ["story:rruo90", 30, 40, 20],
  ["story:j3w4yl", 30, 50, 20],
  ["story:dqnujj", 10, 15, 10],
  ["story:1c43yb8", 20, 30, 10],
  ["story:1ywup0w", 30, 40, 20],
  ["story:1d8n7ba", 30, 40, 20],
  ["story:1j3dnab", 20, 40, 20],
  ["story:iwn036", 20, 40, 10],
  ["story:1cqzrp1", 20, 15, 10],
  ["story:ntho86", 20, 40, 20],
  ["story:d3ie7z", 20, 30, 10],
  ["story:15983fp", 20, 15, 10],
  ["story:1rhrhh9", 10, 15, 10],
  ["story:oyxtp2", 20, 30, 10],
  ["story:d22zob", 30, 40, 20],
  ["story:1oog0qn", 30, 40, 20],
  ["story:js852s", 10, 0, 0],
];

const importance = importanceLabels.map(([storyId, relevance, impact, actionability], index) => {
  const story = storyById.get(storyId);
  if (!story) throw new Error(`missing importance source story ${storyId}`);
  const total = relevance + impact + actionability;
  return {
    id: `importance-${String(index + 1).padStart(2, "0")}`,
    source_story_id: storyId,
    title: story.title,
    relevance,
    impact,
    actionability,
    expected_total: total,
    expected_level: total >= 80 ? "L1" : total >= 60 ? "L2" : total >= 40 ? "L3" : null,
  };
});

const golden = {
  schema_version: 1,
  frozen_from: {
    report_generated_at: report.generated_at,
    report_git_commit: "e903a195",
    note: "人工确定标签；URL 输入由冻结报告机械摘录，不由新实现反向生成。",
  },
  counts: {
    url_duplicates: urlDuplicates.length,
    semantic_event_pairs: samePairs.length + differentPairs.length,
    history_states: firstCases.length + updateCases.length + duplicateCases.length + backfillCases.length,
    importance: importance.length,
    total:
      urlDuplicates.length +
      samePairs.length +
      differentPairs.length +
      firstCases.length +
      updateCases.length +
      duplicateCases.length +
      backfillCases.length +
      importance.length,
  },
  url_duplicates: urlDuplicates,
  semantic_event_pairs: [...samePairs, ...differentPairs],
  history_states: [...firstCases, ...updateCases, ...duplicateCases, ...backfillCases],
  importance,
};

if (golden.counts.total !== 120) throw new Error(`expected 120 cases, found ${golden.counts.total}`);
await fs.mkdir(path.dirname(OUT_PATH), { recursive: true });
await fs.writeFile(OUT_PATH, `${JSON.stringify(golden, null, 2)}\n`, "utf8");
console.log(`[monitor-golden] froze ${golden.counts.total} cases → ${path.relative(ROOT, OUT_PATH)}`);
