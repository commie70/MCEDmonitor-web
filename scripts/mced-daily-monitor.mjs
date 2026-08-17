#!/usr/bin/env node
/**
 * 早筛情报站 — 竞品每日自动监测脚本 v2(L1-L3)
 *
 * 采集(L3，均免密钥或环境变量供 key):
 *   新研究   → NCBI E-utilities(PubMed)
 *   市场动态 → Google News RSS
 *   官网动态 → Tavily Search(TAVILY_API_KEY，公司官网 / 权威媒体报道)
 *   国内动态 → AnySearch CLI(ANYSEARCH_API_KEY；公众号 / 行业媒体等中文信源)
 *   报证审批 → openFDA 器械库(pma/de novo)
 *   学术动态 → ASCO/ESMO/AACR 人工核查链接(无开放接口)
 *
 * 加工(L1)：公司内标题相似度故事线聚类；热度 = Σ信道权重 × 0.5^(age_h/24);
 *   徽章：爆(≥3 信源且集中)/ 新(≤12h)/ 发酵中(跨≥2 天且仍活跃)；逐日趋势 spark。
 * 加工(L2):LLM(默认 gpt-5.6-luna, reasoning xhigh,OPENAI_API_KEY)为高热故事
 *   生成 中文摘要 / 相关性评分 / 关注理由；并生成当日 AI 日报。
 *
 * 用法： node scripts/mced-daily-monitor.mjs [--since YYYY-MM-DD] [--days N] [--skip-llm] [--limit-llm N]
 * 输出： public/monitor/daily-report.json；水位 scripts/monitor-state.json
 */

import fs from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { spawn } from "node:child_process";

const ROOT = path.join(path.dirname(fileURLToPath(import.meta.url)), "..");
const CONFIG_PATH = path.join(ROOT, "scripts", "monitor-sources.json");
const STATE_PATH = path.join(ROOT, "scripts", "monitor-state.json");
const OUT_PATH = path.join(ROOT, "public", "monitor", "daily-report.json");
const ANYSEARCH_CLI = "/Users/redspectre/.agents/skills/anysearch/scripts/anysearch_cli.py";

const FETCH_GAP_MS = 550;
const MAX_RETRIES = 4;
const LLM_MODEL = process.env.OPENAI_MONITOR_MODEL || "gpt-5.6-luna";
const LLM_REASONING = process.env.OPENAI_MONITOR_REASONING || "xhigh";
const CHANNEL_WEIGHT = { pubmed: 3, fda: 5,news: 2, tavily: 2.5,anysearch: 2.5, brave: 2.5, firecrawl: 2.5 };
const ROLLING_WINDOW_DAYS = 31; // 监测窗口：当前时间倒推 1 个月
const EN_MONTHS = { jan: 1, feb: 2, mar: 3,apr: 4, may: 5, jun: 6, jul: 7,aug: 8, sep: 9, oct: 10,nov: 11, dec: 12 };
const STOPWORDS = new Set([
  "the", "and", "for", "with", "from", "that", "this", "are", "was", "were", "has", "have",
  "inc", "ltd", "corp", "company", "news", "latest", "update", "announces", "announced",
  "的", "了", "与", "和", "在", "于", "是", "为", "对", "或", "及", "其", "公司", "最新", "宣布",
]);

let lastRequestAt = 0;
const args = parseArgs(process.argv.slice(2));

const config = JSON.parse(await fs.readFile(CONFIG_PATH,"utf8"));
// 窗口语义：当前时间倒推 1 个月(31 天);--since/--days 可覆盖
const since = args.since || daysAgo(ROLLING_WINDOW_DAYS);
// 早于窗口起点的命中标记为「旧文」(保留展示并附时间戳，不剔除)
const sinceMonth = since.slice(0, 7);

const watches = config.watches || [];
const items = [];
const errors = [];

console.log(`[mced-monitor] window since ${since},${watches.length} watches`);

// ---------- L3 采集 ----------
for (const w of watches) {
  if (w.pubmed) await collectPubMed(w);
  if (w.news) await collectNews(w);
  if (w.fda_applicant) await collectFda(w);
  if (w.official) await collectTavily(w);
  if (w.domestic) await collectAnySearch(w);
  if (w.official || w.domestic) {
    await collectBrave(w);
    await collectFirecrawl(w);
  }
}// ---------- L1 聚类 + 热度 ----------
const manualTasks = buildManualTasks(watches);
const flat = dedupe(items)
  .filter((i) => !i.date || i.date <= todayIso())
  .map(retagCategory)
  .sort((a, b) => (a.date < b.date ? 1 : -1));
const stories = buildStories(flat, since);

const categories = [
  { key: "regulatory", label: "报证审批" },{ key: "academic", label: "学术动态" },{ key: "research", label: "新研究" },{ key: "market", label: "市场动态" },].map((c) => ({ ...c, count: flat.filter((i) => i.category === c.key).length }));

// ---------- L2 LLM 增强 ----------
let digest = null;
if (!args.skipLlm && process.env.OPENAI_API_KEY && stories.length) {
  const topN = stories.slice(0,args.limitLlm ?? 10);
  for (const story of topN) {
    const ai = await llmJudgeStory(story);
    if (ai) Object.assign(story,ai);
  }
  digest = await llmDigest(topN.filter((s) => s.summary));
} else if (!process.env.OPENAI_API_KEY) {
  console.warn("[mced-monitor] OPENAI_API_KEY 缺失，跳过 L2");
}// ---------- 报告 ----------
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

const report = {
  generated_at:new Date().toISOString(),
  window_since: since,
  watches: watches.length,
  categories,
  items: flat,
  stories,
  digest,
  manual_tasks: manualTasks,
  errors,};

await fs.mkdir(path.dirname(OUT_PATH),{ recursive: true });
await fs.writeFile(OUT_PATH, normalizeZhPunct(JSON.stringify(report,null, 2)), "utf8");
await fs.writeFile(
  STATE_PATH, JSON.stringify({ lastRunAt:new Date().toISOString() },null, 2),
  "utf8"
);

// 运行历史(更新日志页「数据更新」来源)
const HISTORY_PATH = path.join(ROOT, "scripts", "monitor-history.jsonl");
await fs.appendFile(
  HISTORY_PATH, JSON.stringify({
    ts: report.generated_at,
    window_since: since,
    items: flat.length,
    stories: stories.length,
    categories: Object.fromEntries(categories.map((c) => [c.key, c.count])),
    errors: errors.length,}) + "\n",
  "utf8"
);

console.log(
  `[mced-monitor] ${flat.length} items / ${stories.length} stories (${categories
    .map((c) => `${c.label}:${c.count}`)
    .join(" / ")}) → ${path.relative(ROOT, OUT_PATH)}`
);
if (errors.length) console.warn(`[mced-monitor] ${errors.length} channel errors, see report.errors`);

// ================= collectors =================

async function collectPubMed(w) {
  try {
    const term = `(${w.pubmed}) AND ("${since}"[Date - Publication] : "3000"[Date - Publication])`;
    const idsJson = await fetchJson(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi?db=pubmed&retmode=json&sort=pub+date&retmax=${config.retmax_per_query || 8}&term=${encodeURIComponent(term)}`,
      "ESearch"
    );
    const ids = idsJson.esearchresult?.idlist || [];
    if (!ids.length) return;
    const sumJson = await fetchJson(
      `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esummary.fcgi?db=pubmed&retmode=json&id=${ids.join(",")}`,
      "ESummary"
    );
    const result = sumJson.result || {};
    for (const uid of result.uids || []) {
      const doc = result[uid];
      if (!doc) continue;
      const doi = (doc.articleids || []).find((x) => x.idtype === "doi");
      items.push({
        id: `pmid:${doc.uid}`,
        company: w.company,product: w.product,
        category: "research",
        channel: "pubmed",
        title: stripHtml(doc.title || ""),
        source: doc.fulljournalname || doc.source || "PubMed",
        date:normalizeDate(doc.pubdate),
        url: doi ? `https://doi.org/${doi.value}` : `https://pubmed.ncbi.nlm.nih.gov/${doc.uid}/`,
        note: `PMID ${doc.uid}`,});
    }
  } catch (err) {
    errors.push({ company: w.company, channel: "pubmed", message: String(err.message || err) });
  }
}

async function collectNews(w) {
  try {
    const xml = await fetchText(
      `https://news.google.com/rss/search?q=${encodeURIComponent(w.news + " when: 31d")}&hl=zh-CN&gl=CN&ceid=CN:zh`,
      "GoogleNews"
    );
    for (const it of parseRssItems(xml).slice(0, 5)) {
      if (it.date && it.date < since) continue;
      items.push({
        id: `news:${stableId(it.title + it.link)}`,
        company: w.company,product: w.product,
        category: "market",
        channel: "news",
        title: it.title,
        source: it.source || "Google News",
        date: it.date || "",
        url: it.link,note: "",});
    }
  } catch (err) {
    errors.push({ company: w.company, channel: "news", message: String(err.message || err) });
  }
}

async function collectFda(w) {
  for (const ep of ["pma", "de%20novo"]) {
    try {
      const search = `applicant:"${w.fda_applicant}" AND decision_date:[${since.replaceAll("-", "")} TO 99991231]`;
      const json = await fetchJson(
        `https://api.fda.gov/device/${ep}.json?search=${encodeURIComponent(search)}&sort=decision_date:desc&limit=5`,
        `openFDA-${ep}`,
        true
      );
      if (!json) continue;
      for (const r of json.results || []) {
        items.push({
          id: `fda:${r.pma_number || r.pma_submission_number || stableId(JSON.stringify(r))}`,
          company: w.company,product: w.product,
          category: "regulatory",
          channel: "fda",
          title: `${r.tradename || w.product} — ${r.decision_code || r.decision || "FDA 审评动态"}`,
          source: `openFDA ${ep === "pma" ? "PMA" : "De Novo"}(${r.pma_number || "—"})`,
          date:normalizeDate(r.decision_date),
          url: `https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm?id=${r.pma_number || ""}`,note: r.generic_name || "",});
      }
    } catch (err) {
      errors.push({ company: w.company, channel: `fda-${ep}`, message: String(err.message || err) });
    }
  }
}

async function collectTavily(w) {
  if (!process.env.TAVILY_API_KEY) {
    errors.push({ company: w.company, channel: "tavily", message: "TAVILY_API_KEY 缺失" });
    return;
  }
  try {
    const res = await throttledFetch("https://api.tavily.com/search", "Tavily",{
      method: "POST",
      headers:{ "Content-Type": "application/json" }, body: JSON.stringify({
        api_key:process.env.TAVILY_API_KEY,
        query: w.official,
        max_results: 4,
        days: Math.max(1, Math.ceil((Date.now() - new Date(since)) / 86400000)),
        search_depth: "basic",}),});
    if (!res.ok) throw new Error(`Tavily HTTP ${res.status}`);
    const json = await res.json();
    for (const r of json.results || []) {
      const date = normalizeDate(r.published_date || "");
      // 旧文保留展示(条目标注「旧」)，不再按窗口剔除
      items.push({
        id: `tavily:${stableId(r.url)}`,
        company: w.company,product: w.product,
        category: "market",
        channel: "tavily",
        title: stripHtml(r.title || ""),
        source: hostOf(r.url),
        date,
        url: r.url,note: "",
        snippet: stripHtml((r.content || "").slice(0, 240)),});
    }
  } catch (err) {
    errors.push({ company: w.company, channel: "tavily", message: String(err.message || err) });
  }
}

async function collectAnySearch(w) {
  try {
    const out = await runCli("python", [ANYSEARCH_CLI, "search", w.domestic, "--max_results", "4"]);
    for (const r of parseAnySearchMarkdown(out).slice(0, 4)) {
      items.push({
        id: `anysearch:${stableId(r.url)}`,
        company: w.company,product: w.product,
        category: "market",
        channel: "anysearch",
        title: r.title,
        source: hostOf(r.url),
        date: "",
        url: r.url,note: "",
        snippet: r.snippet.slice(0, 240),});
    }
  } catch (err) {
    errors.push({ company: w.company, channel: "anysearch", message: String(err.message || err) });
  }
}

async function collectBrave(w) {
  if (!process.env.BRAVE_API_KEY) {
    errors.push({ company: w.company, channel: "brave", message: "BRAVE_API_KEY 缺失" });
    return;
  }
  try {
    const q = w.official || w.domestic;
    const url = `https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(q)}&count=5&freshness=pm`;
    const res = await throttledFetch(url, "Brave",{
      headers:{ "X-Subscription-Token":process.env.BRAVE_API_KEY, Accept: "application/json" },});
    if (!res.ok) throw new Error(`Brave HTTP ${res.status}`);
    const json = await res.json();
    for (const r of (json.web?.results || []).slice(0, 5)) {
      const date = normalizeDate(r.age || "");
      // 旧文保留展示(条目标注「旧」)，不再按窗口剔除
      items.push({
        id: `brave:${stableId(r.url)}`,
        company: w.company,product: w.product,
        category: "market",
        channel: "brave",
        title: stripHtml(r.title || ""),
        source: hostOf(r.url),
        date,
        url: r.url,note: "",
        snippet: stripHtml(r.description || "").slice(0, 240),});
    }
  } catch (err) {
    errors.push({ company: w.company, channel: "brave", message: String(err.message || err) });
  }
}

async function collectFirecrawl(w) {
  if (!process.env.FIRECRAWL_API_KEY) {
    errors.push({ company: w.company, channel: "firecrawl", message: "FIRECRAWL_API_KEY 缺失" });
    return;
  }
  try {
    const q = w.official || w.domestic;
    const res = await throttledFetch("https://api.firecrawl.dev/v2/search", "Firecrawl",{
      method: "POST",
      headers:{
        Authorization:`Bearer ${process.env.FIRECRAWL_API_KEY}`,
        "Content-Type": "application/json",}, body: JSON.stringify({ query: q, limit: 5 }),});
    if (!res.ok) throw new Error(`Firecrawl HTTP ${res.status}`);
    const json = await res.json();
    for (const r of (json.data?.web || []).slice(0, 5)) {
      items.push({
        id: `firecrawl:${stableId(r.url)}`,
        company: w.company,product: w.product,
        category: "market",
        channel: "firecrawl",
        title: stripHtml(r.title || ""),
        source: hostOf(r.url),
        date: "",
        url: r.url,note: "",
        snippet: stripHtml(r.description || "").slice(0, 240),});
    }
  } catch (err) {
    errors.push({ company: w.company, channel: "firecrawl", message: String(err.message || err) });
  }
}// ================= L1 聚类 + 热度 =================

/** 关键词归位：监管 / 学术类新闻从 market 划入对应类别(确定性规则，可审计) */
function retagCategory(item) {
  if (item.category !== "market") return item;
  const t = item.title.toLowerCase();
  if (/fda|nmpa|获批|批准|审评|认定|ce 认证|注册证|breakthrough|pma|clearance|approva/.test(t))
    return { ...item, category: "regulatory" };
  if (/asco|esmo|aacr|wclc|摘要|abstract|会议|大会|poster/.test(t))
    return { ...item, category: "academic" };
  return item;
}/**
 * 推断条目月份(用于「旧文」标记):
 * 优先 item.date；否则 URL 中的 / 2025/06/ 或 2025-06-12；否则文本中的「2025年6月」/「June 2025」。
 * 返回 "YYYY-MM" 或 null(无法推断)。
 */
function inferMonth(url, title, snippet) {
  const u = String(url || "");
  let m = u.match(/(20\d{2})[\/\-_](0?[1-9]|1[0-2])(?:[\/\-_]|$)/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  const text = `${title || ""} ${snippet || ""}`;
  m = text.match(/(20\d{2})\s*年\s*(0?[1-9]|1[0-2])\s*月/);
  if (m) return `${m[1]}-${m[2].padStart(2, "0")}`;
  m = text.match(/\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)[a-z]*\.?\s+,?\s*(20\d{2})\b/i);
  if (m) return `${m[2]}-${String(EN_MONTHS[m[1].slice(0, 3).toLowerCase()]).padStart(2, "0")}`;
  m = text.match(/\b(20\d{2})-(0[1-9]|1[0-2])-\d{2}\b/);
  if (m) return `${m[1]}-${m[2]}`;
  return null;
}

function itemMonth(it) {
  if (it.date) return it.date.slice(0, 7);
  return inferMonth(it.url, it.title, it.snippet);
}

function tokensOf(title) {
  const latin = title.toLowerCase().match(/[a-z0-9][a-z0-9+.-]{1,}/g) || [];
  const cjk = title.match(/[一-鿿]/g) || [];
  const bigrams = [];
  for (let i = 0; i < cjk.length - 1; i++) bigrams.push(cjk[i] + cjk[i + 1]);
  return new Set([...latin,...bigrams].filter((t) => !STOPWORDS.has(t)));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let inter = 0;
  for (const t of a) if (b.has(t)) inter++;
  return inter / (a.size + b.size - inter);
}

function buildStories(flat, since) {
  const byCompany = new Map();
  for (const i of flat) {
    const list = byCompany.get(i.company) || [];
    list.push(i);
    byCompany.set(i.company, list);
  }
  const stories = [];
  const windowDays = Math.max(1, Math.ceil((Date.parse(todayIso()) - Date.parse(since)) / 86400000) + 1);

  for (const [company, list] of byCompany) {
    const clusters = [];
    for (const item of list) {
      const toks = tokensOf(item.title);
      let hit = null;
      for (const c of clusters) {
        if (jaccard(toks, c.toks) >= 0.3) { hit = c; break; }
      }
      if (hit) {
        hit.items.push(item);
        toks.forEach((t) => hit.toks.add(t));
      } else {
        clusters.push({ toks, items: [item] });
      }
    }
    for (const c of clusters) {
      const sorted = c.items.sort((a, b) => (a.date < b.date ? 1 : -1));
      const lead = sorted[0];
      const spark = new Array(windowDays).fill(0);
      let heat = 0;
      for (const it of sorted) {// 无日期条目按 72h 折算(常青页不应享受新条目权重)
        const ageH = it.date
          ? Math.max(0, (Date.now() - Date.parse(it.date)) / 3600000)
          : 72;
        heat += (CHANNEL_WEIGHT[it.channel] || 1) * Math.pow(0.5,ageH/24);
        if (it.date) {
          const idx = Math.round((Date.parse(todayIso()) - Date.parse(it.date)) / 86400000);
          if (idx >= 0 && idx < windowDays) spark[windowDays - 1 - idx] += 1;
        }
      }
      const dates = [...new Set(sorted.map((i) => i.date).filter(Boolean))];
      const lastDated = sorted.find((i) => i.date);
      const ageLastH = lastDated
        ? (Date.now() - Date.parse(lastDated.date)) / 3600000
        : 72;
      // 跨引擎命中频率加成：多一个独立检索信道命中，+1.0(命中频率越高排名越前)
      const channelCount = new Set(sorted.map((i) => i.channel)).size;
      heat += (channelCount - 1) * 1.0;
      const badges = [];
      if (sorted.length >= 3 && dates.length <= 3) badges.push("爆");
      if (ageLastH <= 12) badges.push("新");
      if (dates.length >= 2 && ageLastH <= 24) badges.push("发酵中");
      // 「旧文」判定：故事线最新可推断月份早于窗口起点月份
      const months = sorted.map(itemMonth).filter(Boolean).sort();
      const latestMonth = months.length ? months[months.length - 1] :null;
      const staleMonth = latestMonth && latestMonth < sinceMonth ? latestMonth :null;
      stories.push({
        id: `story:${stableId(company + lead.title)}`,
        company,product: lead.product,
        title: lead.title,
        heat: Math.round(heat * 10) / 10,
        badges,
        stale_month: staleMonth,
        sources_count: sorted.length,
        categories: [...new Set(sorted.map((i) => i.category))],
        first_seen: sorted[sorted.length - 1]?.date || "",
        last_seen: lastDated?.date || "",
        spark,
        items: sorted.map((i) => ({
          id: i.id, category: i.category, channel: i.channel, title: i.title,
          source: i.source, date: i.date, url: i.url,note: i.note || "",})),});
    }
  }
  return stories.sort((a, b) => b.heat - a.heat);
}// ================= L2 LLM =================

async function llmJudgeStory(story) {
  const titles = story.items.map((i) => `- [${i.date || "日期不详"}] ${i.title}(${i.source})`).join("\n");
  const body = {
    model: LLM_MODEL,
    reasoning_effort: LLM_REASONING,
    response_format:{ type: "json_object" }, messages: [
      {
        role: "system",
        content:
          "你是癌症早筛行业竞争情报分析师，读者是世和基因医学部(自家产品 CanScan 鹰眼， MCED 多癌早检)。只输出 JSON。",},{
        role: "user",
        content: `公司：${story.company}(${story.product})\n故事线标题：${story.title}\n信源：\n${titles}\n\n输出 JSON:{"summary":"≤80字中文客观摘要","score":0-100与早筛竞品监测的相关性(纯噪声0-20、弱相关30-50、值得关注60-75、重要动态80-95、里程碑96-100),"reason":"≤50字，为什么世和应关注"}`,},],};
  try {
    const json = await openaiChat(body, `llm-story:${story.company}`);
    const text = json.choices?.[0]?.message?.content || "";
    const parsed = JSON.parse(text);
    return {
      summary: String(parsed.summary || ""),
      score: Number(parsed.score) || 0,
      reason: String(parsed.reason || ""),};
  } catch (err) {
    errors.push({ company: story.company, channel: "llm", message: String(err.message || err) });
    return null;
  }
}

async function llmDigest(topStories) {
  if (!topStories.length) return null;
  const briefs = topStories
    .map(
      (s, i) =>
        `${i + 1}. [热度${s.heat}|评分${s.score}|最新${s.last_seen || "日期不详(可能为常青资料，非当日新闻)"}] ${s.title} — ${s.summary}`
    )
    .join("\n");
  const body = {
    model: LLM_MODEL,
    reasoning_effort: LLM_REASONING,
    messages: [
      {
        role: "system",
        content: "你是癌症早筛行业竞争情报分析师，为世和基因医学部撰写每日竞品监测日报。",},{
        role: "user",
        content: `基于以下当日高热故事线，写 200-350 字中文日报：开头一句总览，然后 3-5 条要点(每条一行，以「· 」开头，含公司名与一句点评)，结尾一句趋势判断。注意：标注「日期不详」的条目多为常青资料而非当日新闻，表述时不要写成"今日发生"。纯文本，不用标题和加粗。\n\n${briefs}`,},],};
  try {
    const json = await openaiChat(body, "llm-digest");
    return {
      markdown: json.choices?.[0]?.message?.content?.trim() || "",
      model: LLM_MODEL,
      generated_at:new Date().toISOString(),};
  } catch (err) {
    errors.push({ company: "日报", channel: "llm", message: String(err.message || err) });
    return null;
  }
}

async function openaiChat(body, label) {
  const res = await throttledFetch("https://api.openai.com/v1/chat/completions", label,{
    method: "POST",
    headers:{
      Authorization:`Bearer ${process.env.OPENAI_API_KEY}`,
      "Content-Type": "application/json",}, body: JSON.stringify(body),}, 120000);
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`${label} HTTP ${res.status} ${text.slice(0, 160)}`);
  }
  return res.json();
}// ================= manual tasks =================

function buildManualTasks(watches) {
  const tasks = [];
  const g = (q) => `https://www.google.com/search?q=${encodeURIComponent(q)}`;
  for (const w of watches) {
    if (w.company === "行业总览") continue;
    const term = `${w.company} ${w.product.replace(/[®™]/g, "")}`;
    tasks.push(
      { company: w.company, channel: "NMPA", category: "regulatory", label: "NMPA/CMDE 审评公示检索", url: g(`site:nmpa.gov.cn OR site:cmde.org.cn ${term}`) },{ company: w.company, channel: "Scholar", category: "research", label: "Google Scholar 近一年", url: `https://scholar.google.com/scholar?as_ylo=${since.slice(0, 4)}&q=${encodeURIComponent(term)}` },{ company: w.company, channel: "ASCO", category: "academic", label: "ASCO 摘要检索", url: g(`site:meetings.asco.org OR site:ascopubs.org ${term}`) },{ company: w.company, channel: "ESMO", category: "academic", label: "ESMO 摘要检索", url: g(`site:annalsofoncology.org OR site:esmo.org abstract ${term}`) },{ company: w.company, channel: "AACR", category: "academic", label: "AACR 摘要检索", url: g(`site:aacrjournals.org abstract ${term}`) }
    );
  }
  return tasks;
}// ================= helpers =================

async function fetchJson(url, label, tolerate404 = false) {
  const res = await throttledFetch(url, label);
  if (tolerate404 && res.status === 404) return null;
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
  return res.json();
}

async function fetchText(url, label) {
  const res = await throttledFetch(url, label);
  if (!res.ok) throw new Error(`${label} HTTP ${res.status}`);
  return res.text();
}

async function throttledFetch(url, label, init = {}, timeoutMs = 30000) {
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const gap = Date.now() - lastRequestAt;
    if (gap < FETCH_GAP_MS) await sleep(FETCH_GAP_MS - gap);
    lastRequestAt = Date.now();
    const res = await fetch(url,{
      ...init,
      headers:{ "User-Agent": "mced-intel-monitor/2.0 (competitor daily watch)", ...(init.headers || {}) }, signal: AbortSignal.timeout(timeoutMs),});
    if (res.status !== 429 || attempt === MAX_RETRIES) return res;
    const retryAfter = Number(res.headers.get("retry-after"));
    const waitMs = Number.isFinite(retryAfter) && retryAfter > 0
      ? retryAfter * 1000
      : [2500, 5000, 9000, 15000][attempt];
    console.warn(`[mced-monitor] ${label} 429, retry in ${Math.ceil(waitMs / 1000)}s`);
    await sleep(waitMs);
  }
  throw new Error(`${label} request failed`);
}

function runCli(cmd,argv, timeoutMs = 60000) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd,argv,{ env:process.env });
    let out = "", err = "";
    const timer = setTimeout(() => { child.kill(); reject(new Error("cli timeout")); }, timeoutMs);
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) resolve(out);
      else reject(new Error(err.slice(0, 200) || `cli exit ${code}`));
    });
    child.on("error", (e) => { clearTimeout(timer); reject(e); });
  });
}

function parseAnySearchMarkdown(md) {
  const out = [];
  const re = /###\s*\d+\.\s*(.+?)\n-\s*\*\*URL\*\*:\s*(\S+)\n([\s\S]*?)(?=\n###|\n##|$)/g;
  let m;
  while ((m = re.exec(md))) {
    out.push({
      title: m[1].replace(/\.\.\.$/, "").trim(),
      url: m[2].trim(),
      snippet: m[3].replace(/\s+/g, " ").trim(),});
  }
  return out.filter((r) => r.title && r.url.startsWith("http"));
}

function parseRssItems(xml) {
  const out = [];
  const re = /<item>([\s\S]*?)<\/item>/g;
  let m;
  while ((m = re.exec(xml))) {
    const block = m[1];
    const pick = (tag) => {
      const t = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)</${tag}>`));
      return t ? decodeEntities(t[1].replace(/<!\[CDATA\[|\]\]>/g, "")).trim() : "";
    };
    out.push({ title:pick("title"), link:pick("link"), date:normalizeDate(pick("pubDate")), source:pick("source") });
  }
  return out.filter((i) => i.title && i.link);
}

function decodeEntities(s) {
  return s.replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
}

function hostOf(url) {
  try { return new URL(url).hostname.replace(/^www\./, ""); } catch { return "web"; }
}

function normalizeDate(v) {
  if (!v) return "";
  const s = String(v).trim();
  if (/^\d{8}$/.test(s)) return `${s.slice(0, 4)}-${s.slice(4, 6)}-${s.slice(6, 8)}`;
  // 相对时间("2 weeks ago" / "1 month ago",Brave age 字段)
  const rel = s.match(/(\d+)\s+(hour|day|week|month)s?\s+ago/i);
  if (rel) {
    const n = Number(rel[1]);
    const unit = rel[2].toLowerCase();
    const ms = unit === "hour" ? n * 3600000
      : unit === "day" ? n * 86400000
        : unit === "week" ? n * 7 * 86400000
          :n * 30 * 86400000;
    return new Date(Date.now() - ms).toISOString().slice(0, 10);
  }
  const d = new Date(s);
  if (Number.isNaN(d.getTime())) return "";
  return d.toISOString().slice(0, 10);
}

function dedupe(list) {
  const map = new Map();
  for (const i of list) if (!map.has(i.id)) map.set(i.id, i);
  return [...map.values()];
}

function stripHtml(v) {
  return String(v || "").replace(/<[^>]+>/g, "").replace(/\s+/g, " ").trim();
}

function stableId(input) {
  let h = 2166136261;
  const s = String(input || "");
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

function daysAgo(n) { return new Date(Date.now() - n * 86400000).toISOString().slice(0, 10); }
function todayIso() { return new Date().toISOString().slice(0, 10); }

function parseArgs(argv) {
  const out = {};
  for (let i = 0; i < argv.length; i++) {
    if (argv[i] === "--since") out.since = argv[++i];
    else if (argv[i] === "--days") out.since = daysAgo(Number(argv[++i]) || 7);
    else if (argv[i] === "--skip-llm") out.skipLlm = true;
    else if (argv[i] === "--limit-llm") out.limitLlm = Number(argv[++i]) || 10;
  }
  return out;
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }
