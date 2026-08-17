#!/usr/bin/env node
/**
 * 手动补抓:为 public/monitor/daily-report.json 前 N 条故事线首条目抓取原页正文并落盘。
 * 用法: node scripts/enrich-content.mjs [N=12]
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { enrichReport } from "./lib-content-enrich.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "monitor", "daily-report.json");
const limit = Number(process.argv[2]) || 12;

const report = JSON.parse(await fs.readFile(OUT, "utf8"));
const result = await enrichReport(report, { maxItems: limit });
await fs.writeFile(OUT, JSON.stringify(report,null, 2), "utf8");
console.log(
  `[enrich] enriched=${result.enriched} failed=${result.failed}${result.skipped ? " (未配置 FIRECRAWL_API_KEY,已跳过)" : ""}`
);
