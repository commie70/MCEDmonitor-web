const DEFAULT_BASE_URL = "https://api.weixinzs.org/api";
const PAGE_SIZE = 50;
const MAX_PAGES = 100;
const MAX_ARTICLES = 500;
const MAX_RESPONSE_BYTES = 2 * 1024 * 1024;
import { fetchPublic, readCappedBody, validatePublicUrl } from "./lib-network-security.mjs";

function isObject(value) {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function responseData(payload) {
  return isObject(payload?.data) || Array.isArray(payload?.data) ? payload.data : payload;
}

function responseItems(payload, keys) {
  const data = responseData(payload);
  if (Array.isArray(data)) return data;
  if (!isObject(data)) return null;
  for (const key of keys) {
    if (Array.isArray(data[key])) return data[key];
  }
  return null;
}

function payloadError(payload) {
  if (!isObject(payload)) return null;
  const failedCode =
    payload.code !== undefined && ![0, 200, "0", "200"].includes(payload.code)
      ? payload.code
      : null;
  if (payload.success !== false && !payload.error && failedCode === null) return null;
  const detail =
    payload.error?.message ||
    payload.error ||
    payload.message ||
    payload.msg ||
    (failedCode === null ? "request failed" : `API code ${failedCode}`);
  return String(detail).slice(0, 240);
}

function accountUsername(value) {
  return String(
    value?.account?.username ||
      value?.accountUsername ||
      value?.username ||
      value?.subscription?.account?.username ||
      ""
  ).trim();
}

function accountName(value) {
  return String(
    value?.account?.nickname ||
      value?.sourceName ||
      value?.accountName ||
      value?.nickname ||
      value?.subscription?.account?.nickname ||
      ""
  ).trim();
}

function subscriptionId(value) {
  const id = value?.subscriptionId ?? value?.subscription_id ?? value?.subscription?.id ?? value?.id;
  return id === undefined || id === null ? "" : String(id);
}

function toIso(value) {
  if (value === undefined || value === null || value === "") return null;
  const numeric = typeof value === "number" ? value : /^\d{10,13}$/.test(String(value)) ? Number(value) : null;
  const date = numeric === null ? new Date(value) : new Date(numeric < 1e12 ? numeric * 1000 : numeric);
  return Number.isNaN(date.getTime()) ? null : date.toISOString();
}

function safeArticleUrl(value) {
  try {
    const raw = String(value || "");
    if (Buffer.byteLength(raw, "utf8") > 2048) return null;
    const url = new URL(raw);
    if (!["http:", "https:"].includes(url.protocol) || url.hostname !== "mp.weixin.qq.com") return null;
    if (url.username || url.password) return null;
    url.protocol = "https:";
    url.hash = "";
    return url.toString();
  } catch {
    return null;
  }
}

async function requestJson(fetchImpl, url, apiKey, label) {
  let lastError;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const request = fetchImpl === globalThis.fetch ? fetchPublic : fetchImpl;
      const response = await request(url, {
        method: "GET",
        headers: {
          Authorization: `Bearer ${apiKey}`,
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(30_000),
        redirect: "manual",
      });
      if (response.ok) return JSON.parse(await readCappedBody(response, `${label}_response`, MAX_RESPONSE_BYTES));
      const detail = (await readCappedBody(response, `${label}_error`, 8 * 1024).catch(() => "")).replace(/\s+/g, " ").slice(0, 240);
      const error = new Error(`${label} HTTP ${response.status}${detail ? `: ${detail}` : ""}`);
      if (response.status < 500 || attempt === 1) throw error;
      lastError = error;
    } catch (error) {
      lastError = error;
      const status = / HTTP (\d{3})/.exec(String(error?.message || ""))?.[1];
      if ((status && Number(status) < 500) || attempt === 1) throw error;
    }
  }
  throw lastError || new Error(`${label} request failed`);
}

function pageInfo(payload, page) {
  const data = responseData(payload);
  const candidates = [
    isObject(data) ? data.pagination : null,
    isObject(data) ? data.pageInfo : null,
    isObject(payload) ? payload.pagination : null,
    data,
    payload,
  ].filter(isObject);
  for (const candidate of candidates) {
    const totalPages = Number(candidate.totalPages ?? candidate.total_pages);
    if (Number.isFinite(totalPages)) {
      return { hasNext: page < totalPages, totalPages };
    }
    if (typeof candidate.hasNextPage === "boolean") {
      return { hasNext: candidate.hasNextPage, totalPages: null };
    }
  }
  return null;
}

export async function collectWeixinArticles({
  source,
  apiKey,
  baseUrl = DEFAULT_BASE_URL,
  since,
  until,
  discoveredAt = new Date().toISOString(),
  fetchImpl = globalThis.fetch,
} = {}) {
  if (!source || !Array.isArray(source.accounts) || !source.accounts.length) {
    throw new Error("WeixinZS source.accounts is required");
  }
  if (typeof apiKey !== "string" || !apiKey.trim()) {
    throw new Error("WEIXINZS_API_KEY is required");
  }
  if (typeof fetchImpl !== "function") throw new Error("fetch implementation is required");

  const endpoint = new URL(String(baseUrl || DEFAULT_BASE_URL).replace(/\/+$/, "") + "/");
  if (endpoint.protocol !== "https:") throw new Error("WEIXINZS_BASE_URL must use HTTPS");
  if (fetchImpl === globalThis.fetch) await validatePublicUrl(endpoint);

  const subscriptionPayload = await requestJson(
    fetchImpl,
    new URL("v1/subscriptions", endpoint),
    apiKey.trim(),
    source.source_id
  );
  const subscriptionError = payloadError(subscriptionPayload);
  if (subscriptionError) throw new Error(`${source.source_id} subscriptions: ${subscriptionError}`);
  const subscriptions = responseItems(subscriptionPayload, ["subscriptions", "items", "list", "records"]);
  if (!subscriptions) throw new Error(`${source.source_id} subscriptions response schema is invalid`);
  const subscriptionsByUsername = new Map(
    subscriptions.map((subscription) => [accountUsername(subscription), subscription]).filter(([username]) => username)
  );
  const subscriptionAccounts = new Map(
    subscriptions.map((subscription) => [subscriptionId(subscription), subscription]).filter(([id]) => id)
  );
  const expectedAccounts = new Map(source.accounts.map((account) => [account.username, account]));
  const inactive = source.accounts.flatMap((account) => {
    const subscription = subscriptionsByUsername.get(account.username);
    const status = subscription?.status || "missing";
    return status === "following" ? [] : [`${account.name}:${status}`];
  });
  if (inactive.length) {
    throw new Error(`WeixinZS fixed subscriptions are not following: ${inactive.join(", ")}`);
  }

  const hits = [];
  const seenUrls = new Set();
  for (let page = 1; page <= MAX_PAGES; page++) {
    const url = new URL("v1/articles", endpoint);
    url.searchParams.set("page", String(page));
    url.searchParams.set("pageSize", String(PAGE_SIZE));
    if (since) url.searchParams.set("startDate", String(since));
    if (until) url.searchParams.set("endDate", String(until));
    const payload = await requestJson(fetchImpl, url, apiKey.trim(), source.source_id);
    const articleError = payloadError(payload);
    if (articleError) throw new Error(`${source.source_id} articles: ${articleError}`);
    const articles = responseItems(payload, ["articles", "items", "list", "records"]);
    if (!articles) throw new Error(`${source.source_id} articles response schema is invalid`);
    if (articles.length > PAGE_SIZE) throw new Error(`${source.source_id} article page exceeds ${PAGE_SIZE} items`);
    const pagination = pageInfo(payload, page);
    if (!pagination) throw new Error(`${source.source_id} articles pagination schema is invalid`);
    if (pagination.totalPages > MAX_PAGES) {
      throw new Error(`${source.source_id} pagination exceeds ${MAX_PAGES} pages`);
    }

    for (const article of articles) {
      const subscription = subscriptionAccounts.get(subscriptionId(article));
      const username = accountUsername(article) || accountUsername(subscription);
      const expected = expectedAccounts.get(username);
      const articleUrl = safeArticleUrl(article.url || article.articleUrl || article.article_url);
      const title = String(article.title || "").trim().slice(0, 500);
      if (!expected || !articleUrl || !title || seenUrls.has(articleUrl)) continue;
      seenUrls.add(articleUrl);
      const owner = String(accountName(article) || accountName(subscription) || expected.name).slice(0, 200);
      const articleId = article.id ?? article.articleId ?? article.article_id;
      hits.push({
        company: source.coverage.companies.find((value) => value !== "*") || "待识别",
        product: source.coverage.products.find((value) => value !== "*") || "多癌早筛",
        title,
        url: articleUrl,
        source_label: owner,
        published_at: toIso(article.publishTime ?? article.publish_time ?? article.publishedAt),
        discovered_at: discoveredAt,
        snippet: String(article.summary || article.description || "").trim().slice(0, 2000),
        content: "",
        source: {
          source_id: `${source.source_id}:${username}`,
          editorial_owner: owner,
          tier: "discovery",
          authority_scope: [],
          source_type: "media",
        },
        event_type_hint: null,
        has_new_content_cursor: true,
        legacy_ids: articleId === undefined || articleId === null ? [] : [`weixinzs:${articleId}`],
      });
      if (hits.length > MAX_ARTICLES) throw new Error(`${source.source_id} exceeds ${MAX_ARTICLES} retained articles`);
    }
    if (!pagination.hasNext) break;
    if (page === MAX_PAGES) throw new Error(`${source.source_id} pagination exceeds ${MAX_PAGES} pages`);
  }
  return hits;
}
