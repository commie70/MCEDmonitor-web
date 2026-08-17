#!/usr/bin/env node
/**
 * 一次性:用最新推断规则(lib-stale.mjs)重算 daily-report.json 的 last_seen / stale_month。
 * 故事线条目缺的 snippet / content 从扁平 items 同 id 条目借。
 * 用法: node scripts/restale-report.mjs
 */
import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { inferItemDate, staleMonthOf } from "./lib-stale.mjs";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const OUT = path.join(ROOT, "public", "monitor", "daily-report.json");

const report = JSON.parse(await fs.readFile(OUT, "utf8"));
const sinceMonth = String(report.window_since || "").slice(0, 7);
const flatById = new Map((report.items || []).map((i) => [i.id, i]));

let changed = 0;
for (const s of report.stories) {
  const dates = s.items
    .map((si) => {
      const flat = flatById.get(si.id) || {};
      return (
        inferItemDate({
          url: si.url,
          title: si.title,
          snippet: si.snippet || flat.snippet,
          content: si.content || flat.content,
        }) ||
        si.date ||
        null
      );
    })
    .filter(Boolean)
    .sort();
  const latest = dates.length ? dates[dates.length - 1] : "";
  const stale = staleMonthOf(latest, sinceMonth);
  if (s.last_seen !== latest || (s.stale_month ?? null) !== stale) changed++;
  s.last_seen = latest;
  s.stale_month = stale;
}

await fs.writeFile(OUT, JSON.stringify(report,null, 2), "utf8");
console.log(
  `[restale] since ${sinceMonth}, stories=${report.stories.length}, changed=${changed}`
);
for (const s of report.stories) {
  console.log(`  ${s.stale_month ? `旧 · ${s.stale_month}` : "  —  "} | ${s.last_seen || "日期不详"} | ${s.company} · ${s.title.slice(0, 40)}`);
}
