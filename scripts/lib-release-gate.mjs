import fs from "node:fs/promises";
import path from "node:path";
import { loadJson, sha256 } from "./lib-monitor-ledger.mjs";

/**
 * 发布门禁：模型流水线产出的事件何时可以自动进入公开报告。
 *
 * 唯一条件：固定验收集通过(scripts/monitor-acceptance.json)，且这份结果对应的是
 * 当前的验收集(tests/monitor-golden.json)和当前的模型链路代码(scripts/lib-monitor-llm.mjs)
 * ——提示词或复核规则一改，旧结果即失效，下次运行自动重新验收。
 * 验收由定时任务自动执行，通过后同一次运行即开始发布，没有观察期，也不需要人工切换。
 *
 * 监测脚本、公开报告重建脚本与人工复核 CLI 都经由这里取门禁状态，
 * 不存在绕过门禁写公开报告的路径。
 */

export function releasePaths(root) {
  return {
    acceptance: path.join(root, "scripts", "monitor-acceptance.json"),
    golden: path.join(root, "tests", "monitor-golden.json"),
    pipeline: path.join(root, "scripts", "lib-monitor-llm.mjs"),
    history: path.join(root, "scripts", "monitor-history.jsonl"),
  };
}

export async function readAcceptanceStatus(root) {
  const paths = releasePaths(root);
  const [artifact, fixtureRaw, pipelineRaw] = await Promise.all([
    loadJson(paths.acceptance).catch(() => null),
    fs.readFile(paths.golden, "utf8"),
    fs.readFile(paths.pipeline, "utf8"),
  ]);
  const fixtureSha256 = sha256(fixtureRaw);
  const pipelineSha256 = sha256(pipelineRaw);
  return {
    artifact,
    fixtureSha256,
    pipelineSha256,
    passed:
      artifact?.schema_version === 1 &&
      artifact.passed === true &&
      artifact.golden_fixture_sha256 === fixtureSha256 &&
      artifact.pipeline_sha256 === pipelineSha256,
  };
}

export async function readRunHistory(root) {
  const raw = await fs.readFile(releasePaths(root).history, "utf8").catch((error) => {
    if (error?.code === "ENOENT") return "";
    throw error;
  });
  return raw
    .split("\n")
    .filter(Boolean)
    .flatMap((line) => {
      try {
        const record = JSON.parse(line);
        return record && typeof record === "object" ? [record] : [];
      } catch {
        return [];
      }
    });
}

/** @param {{ passed: boolean }} acceptance */
export function evaluateReleaseGate(acceptance) {
  return {
    gate_open: acceptance.passed === true,
    reason: acceptance.passed === true ? null : "acceptance_not_passed",
  };
}

/** 读入验收记录，给出当前门禁状态。 */
export async function loadReleaseGate(root) {
  const acceptance = await readAcceptanceStatus(root);
  return { acceptance, ...evaluateReleaseGate(acceptance) };
}

/** 写入公开报告的门禁摘要(不含验收明细)。 */
export function publicRelease(gate) {
  return {
    gate_open: gate.gate_open,
    reason: gate.reason,
    accepted_at: gate.acceptance?.artifact?.generated_at ?? null,
  };
}
