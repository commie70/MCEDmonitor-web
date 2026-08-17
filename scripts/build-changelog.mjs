#!/usr/bin/env node
/**
 * build-changelog.mjs — 生成更新日志页数据源 public/changelog.json
 *
 * 输入(均可缺失，容错):
 *   scripts/monitor-history.jsonl   监测脚本运行历史(每行一个 JSON:
 *                                   {ts, window_since, items, stories, categories, errors})
 *   scripts/changelog-features.json 功能更新条目(手工维护：[{date, title, detail, tags}])
 * 输出：*   public/changelog.json  { generated_at, groups: [{ date, weekday, entries }] }
 * 副作用：*   向 package.json scripts 追加 "changelog" 脚本(已存在则跳过)
 *
 * 用法： npm run changelog
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const HISTORY_PATH = path.join(ROOT, "scripts", "monitor-history.jsonl");
const FEATURES_PATH = path.join(ROOT, "scripts", "changelog-features.json");
const OUT_PATH = path.join(ROOT, "public", "changelog.json");

/** 站点按东八区出日报，分组日期同样按东八区切分 */
const TZ = "Asia/Shanghai";

const CATEGORY_LABELS = [
  ["regulatory", "报证审批"],
  ["academic", "学术动态"],
  ["research", "新研究"],
  ["market", "市场动态"],
];

async function readJson(file, fallback) {
  try {
    return JSON.parse(await fs.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
}/** ISO 时间 → YYYY-MM-DD(东八区)；无法解析返回 null */
function dayKey(iso) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return new Intl.DateTimeFormat("en-CA",{
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    timeZone: TZ,}).format(d);
}/** ISO 时间 → HH: mm(东八区， 24 小时制) */
function timeHM(iso) {
  return new Intl.DateTimeFormat("en-US",{
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
    timeZone: TZ,}).format(new Date(iso));
}/** 日历日 → 星期(星期日~星期六)；取 UTC 正午避免时区漂移 */
function weekdayOf(dateStr) {
  return new Intl.DateTimeFormat("zh-CN",{
    weekday: "long",
    timeZone: "UTC",}).format(new Date(`${dateStr}T12:00:00Z`));
}/** 读 monitor-history.jsonl，跳过空行与坏行 */
async function loadHistory() {
  const raw = await fs.readFile(HISTORY_PATH,"utf8").catch(() => "");
  const records = [];
  for (const line of raw.split("\n")) {
    const text = line.trim();
    if (!text) continue;
    try {
      const r = JSON.parse(text);
      if (r && typeof r.ts === "string" && dayKey(r.ts)) records.push(r);
    } catch {// 跳过坏行
    }
  }
  return records;
}/** 数据更新条目：同一天多次运行合并为一条(取 ts 最后一次，标题带「截至 HH: mm」) */
function buildDataEntries(records) {
  const byDay = new Map(); // date -> { count, last }
  for (const r of records) {
    const date = dayKey(r.ts);
    const cur = byDay.get(date);
    if (!cur) {
      byDay.set(date,{ count: 1, last: r });
    } else {
      cur.count += 1;
      if (new Date(r.ts).getTime() >= new Date(cur.last.ts).getTime()) cur.last = r;
    }
  }
  return [...byDay.entries()].map(([date,{ count, last }]) => {
    const cats = last.categories ?? {};
    const catText = CATEGORY_LABELS.map(
      ([key, label]) => `${label} ${Number(cats[key] ?? 0)}`
    ).join(" / ");
    const base = `监测数据更新：${Number(last.items ?? 0)} 条原始命中、${Number(
      last.stories ?? 0
    )} 条故事线`;
    return {
      date,
      entry:{
        kind: "data",
        title: count > 1 ? `${base} · 截至 ${timeHM(last.ts)}` : base,
        detail: `窗口 ${last.window_since ?? "未知"} 至今 · ${catText} · 信道错误 ${Number(
          last.errors ?? 0
        )}`,
        tags: ["数据更新"],},};
  });
}/** 功能条目：从 changelog-features.json 原样读入(仅做形状校验) */
async function loadFeatureEntries() {
  const features = await readJson(FEATURES_PATH,[]);
  if (!Array.isArray(features)) return [];
  return features
    .filter((f) => f && typeof f.date === "string" && typeof f.title === "string")
    .map((f) => ({
      date: f.date,
      entry:{
        kind: "feature",
        title: f.title,
        detail: typeof f.detail === "string" ? f.detail : "",
        tags: Array.isArray(f.tags)
          ? f.tags.filter((t) => typeof t === "string")
          : [],},}));
}

const records = await loadHistory();
const entries = [...(await loadFeatureEntries()), ...buildDataEntries(records)];

const groupMap = new Map(); // date -> entries(功能在前，数据在后)
for (const { date, entry } of entries) {
  const list = groupMap.get(date);
  if (list) list.push(entry);
  else groupMap.set(date, [entry]);
}

const groups = [...groupMap.entries()]
  .sort((a, b) => (a[0] < b[0] ? 1 :a[0] > b[0] ? -1 : 0))
  .map(([date, list]) => ({ date, weekday: weekdayOf(date), entries: list }));

/** 中文标点归一化:汉字相邻的半角 , : ; . → 全角;汉字相邻的 / + 前后补空格(URL/域名占位保护) */
function normalizeZhPunct(input) {
  const HAN = "\\u3400-\\u9FFF\\uF900-\\uFAFF";
  const stash = [];
  const keep = (m) => `ZZHSTASH${stash.push(m) - 1}ZZ`;
  let t = input
    .replace(/https?:\/\/[^\s"'<>)\]]+/g, keep)
    .replace(/[\w-]+(?:\.[\w-]+)*\.(?:com|cn|net|org|io|gov|edu|dev|app|co)(?:\/[^\s"'<>)\]]*)?/gi, keep);
  t = t
    .replace(new RegExp(`,\\s*(?=[${HAN}])`, "gu"), "，")
    .replace(new RegExp(`(?<=[${HAN}]),(\\s*)`, "gu"), (m, _s, off, str) => (/[A-Za-z0-9]/.test(str[off + m.length] || "") ? "， " : "，"))
    .replace(new RegExp(`:\\s*(?=[${HAN}])`, "gu"), "：")
    .replace(new RegExp(`(?<=[${HAN}]):(\\s*)`, "gu"), (m, _s, off, str) => (/[A-Za-z0-9]/.test(str[off + m.length] || "") ? "： " : "："))
    .replace(new RegExp(`;(?=\\s*[${HAN}])`, "gu"), "；")
    .replace(new RegExp(`(?<=[${HAN}]);`, "gu"), "；")
    .replace(new RegExp(`(?<=[${HAN}])\\.(?![.\\d])`, "gu"), "。")
    .replace(new RegExp(`(?<![.\\d])\\.(?=[${HAN}])`, "gu"), "。")
    .replace(new RegExp(`(?<=[${HAN}])\\s*\\/\\s*`, "gu"), " / ")
    .replace(new RegExp(`\\/(?=[${HAN}])`, "gu"), " / ")
    .replace(new RegExp(`(?<=[${HAN}])\\s*\\+\\s*`, "gu"), " + ")
    .replace(new RegExp(`\\+(?=[${HAN}])`, "gu"), " + ");
  return t.replace(/ZZHSTASH(\d+)ZZ/g, (_m, i) => stash[+i]);
}

const out = { generated_at:new Date().toISOString(), groups };
await fs.mkdir(path.dirname(OUT_PATH),{ recursive: true });
await fs.writeFile(OUT_PATH, normalizeZhPunct(JSON.stringify(out,null, 2)) + "\n", "utf8");

const total = groups.reduce((n, g) => n+g.entries.length, 0);
console.log(
  `[changelog] ${groups.length} 天 / ${total} 条(数据 ${records.length} 次运行)→ ${path.relative(
    ROOT,
    OUT_PATH
  )}`
);
