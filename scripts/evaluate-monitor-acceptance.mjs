#!/usr/bin/env node

/**
 * 模型链路固定验收：确定性测试 + 语义匹配准确率 + 四个 provider 的契约冒烟。
 * 结果写入 scripts/monitor-acceptance.json，是发布门禁(lib-release-gate.mjs)的唯一依据。
 *
 *   npm run monitor:acceptance                  强制重跑
 *   npm run monitor:acceptance -- --if-needed   定时任务用：现有结果仍然有效时跳过
 *
 * 现有结果失效的情形：未通过、验收集已变、模型链路代码已变、模型配置已变、或已超过 MAX_AGE_DAYS 天。
 */

import { spawn } from "node:child_process";
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  atomicWriteJson,
  sha256,
} from "./lib-monitor-ledger.mjs";
import {
  createMonitorLlm,
  providerConfiguration,
} from "./lib-monitor-llm.mjs";
import { publicErrorCode } from "./lib-network-security.mjs";
import { readAcceptanceStatus } from "./lib-release-gate.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const FIXTURE_PATH = path.join(ROOT, "tests", "monitor-golden.json");
const TEST_PATH = path.join(ROOT, "tests", "monitor-pipeline.test.mjs");
const OUT_PATH = path.join(ROOT, "scripts", "monitor-acceptance.json");
const MAX_AGE_DAYS = 30;
const ONE_PIXEL_PNG =
  "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=";

const fixtureRaw = await fs.readFile(FIXTURE_PATH, "utf8");
const fixture = JSON.parse(fixtureRaw);
const fixtureSha256 = sha256(fixtureRaw);
// 门禁按「当前验收集 + 当前模型链路代码」认这份结果，两个哈希都由门禁库计算。
const current = await readAcceptanceStatus(ROOT);
const providerConfig = providerConfiguration();
const generatedAt = new Date().toISOString();

if (process.argv.includes("--if-needed") && stillValid(current)) {
  console.log(`[monitor-acceptance] 沿用 ${current.artifact.generated_at} 的通过结果`);
  process.exit(0);
}

const result = {
  schema_version: 1,
  generated_at: generatedAt,
  golden_fixture_sha256: fixtureSha256,
  pipeline_sha256: current.pipelineSha256,
  passed: false,
  provider_configuration: providerConfig,
  deterministic_suite: { passed: false },
  provider_smoke: {
    qwen: false,
    deepseek: false,
    glm: false,
    kimi: false,
  },
  semantic_matching: {
    total: fixture.semantic_event_pairs.length,
    true_positive: 0,
    false_positive: 0,
    false_negative: 0,
    true_negative: 0,
    precision: 0,
    recall: 0,
    predictions: [],
  },
  thresholds: {
    deterministic_suite: true,
    semantic_precision_min: 0.98,
    semantic_recall_min: 0.95,
    all_provider_smokes: true,
  },
  error: null,
};

try {
  const missing = Object.entries(providerConfig)
    .filter(([, config]) => !config.configured)
    .map(([role, config]) => `${role}: ${config.required_env.join(" + ")}`);
  if (missing.length) {
    throw new Error(`provider configuration missing: ${missing.join("; ")}`);
  }

  await runNodeTests();
  result.deterministic_suite.passed = true;

  const llm = createMonitorLlm();
  for (const [index, entry] of fixture.semantic_event_pairs.entries()) {
    const existingId = `golden_${entry.id}`;
    const match = await llm.judgeMatch(
      {
        id: `${entry.id}-candidate`,
        company: entry.company,
        title: entry.right.title,
        url: entry.right.url,
        event_type: "other",
        occurred_at: null,
        published_at: null,
        facts: { title: entry.right.title },
      },
      [
        {
          id: existingId,
          company: entry.company,
          title: entry.left.title,
          url: entry.left.url,
          event_type: "other",
          occurred_at: null,
          published_at: null,
          facts: { title: entry.left.title },
        },
      ],
      { highRisk: index === 0 }
    );
    // 账本只在关系为同一事件且 event_id 指向既有事件时合并，验收按同一口径计。
    const predictedSame =
      ["same_event", "material_update"].includes(match.relation) && match.event_id === existingId;
    const expectedSame = entry.expected === "same_event";
    if (predictedSame && expectedSame) result.semantic_matching.true_positive++;
    else if (predictedSame) result.semantic_matching.false_positive++;
    else if (expectedSame) result.semantic_matching.false_negative++;
    else result.semantic_matching.true_negative++;
    result.semantic_matching.predictions.push({
      id: entry.id,
      expected: entry.expected,
      predicted: match.relation,
      selected_event_id: match.event_id,
      analyses: match.analyses,
    });
    if (match.analyses.some((analysis) => analysis.provider === "qwen")) {
      result.provider_smoke.qwen = true;
    }
    if (match.analyses.some((analysis) => analysis.provider === "glm")) {
      result.provider_smoke.glm = true;
    }
    if (match.analyses.some((analysis) => analysis.provider === "kimi")) {
      result.provider_smoke.kimi = true;
    }
  }

  const vision = await llm.extractVision(
    { id: "provider-smoke-vision", title: "one-pixel provider contract smoke test" },
    [ONE_PIXEL_PNG]
  );
  result.provider_smoke.deepseek = vision.analyses.some(
    (analysis) => analysis.provider === "deepseek"
  );

  const digest = await llm.digest([
    {
      id: "provider-smoke-digest",
      company: "Acceptance fixture",
      product: "Provider contract",
      event_type: "other",
      occurred_at: generatedAt,
      summary: "固定验收集的 provider 契约测试。",
      reason: "验证 Kimi 严格结构化综合路径。",
      score_breakdown: { relevance: 10, impact: 15, actionability: 0, total: 25 },
      evidence_summary: [],
    },
  ]);
  result.provider_smoke.kimi = result.provider_smoke.kimi || digest.model === providerConfig.synthesizer.model;

  const semantic = result.semantic_matching;
  semantic.precision = ratio(semantic.true_positive, semantic.true_positive + semantic.false_positive);
  semantic.recall = ratio(semantic.true_positive, semantic.true_positive + semantic.false_negative);
  result.passed =
    result.deterministic_suite.passed &&
    semantic.precision >= result.thresholds.semantic_precision_min &&
    semantic.recall >= result.thresholds.semantic_recall_min &&
    Object.values(result.provider_smoke).every(Boolean);
} catch (error) {
  result.error = {
    name: error?.name || "Error",
    error_code: publicErrorCode(error, "acceptance_failed"),
  };
}

await atomicWriteJson(OUT_PATH, result);
console.log(
  `[monitor-acceptance] passed=${result.passed} precision=${result.semantic_matching.precision.toFixed(
    3
  )} recall=${result.semantic_matching.recall.toFixed(3)} → ${path.relative(ROOT, OUT_PATH)}`
);
if (!result.passed) {
  if (result.error) console.error(`[monitor-acceptance] ${result.error.error_code}`);
  process.exitCode = 1;
}

function stillValid({ artifact: previous, passed }) {
  if (!passed) return false;
  const ageDays = (Date.parse(generatedAt) - Date.parse(previous.generated_at)) / 86_400_000;
  if (!(ageDays >= 0 && ageDays <= MAX_AGE_DAYS)) return false;
  return Object.entries(providerConfig).every(([role, config]) => {
    const before = previous.provider_configuration?.[role];
    return (
      before?.provider === config.provider &&
      before.model === config.model &&
      before.base_url === config.base_url &&
      (before.thinking ?? null) === config.thinking &&
      (before.reasoning ?? null) === config.reasoning
    );
  });
}

function ratio(numerator, denominator) {
  return denominator ? numerator / denominator : 0;
}

function runNodeTests() {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, ["--test", TEST_PATH], {
      cwd: ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    });
    let stderr = "";
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve();
      else reject(new Error(`deterministic acceptance suite failed: ${stderr.slice(-500)}`));
    });
  });
}
