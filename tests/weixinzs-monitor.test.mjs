import assert from "node:assert/strict";
import test from "node:test";

import { collectWeixinArticles } from "../scripts/lib-weixinzs-monitor.mjs";
import {
  isSourceDue,
  recordSourceFailure,
  recordSourceSuccess,
  sourceHasCoverageGap,
  validateMonitorRunOptions,
} from "../scripts/lib-monitor-schedule.mjs";
import {
  createEmptyLedger,
  validateLedger,
  validateSourceRegistry,
} from "../scripts/lib-monitor-ledger.mjs";

const accounts = [
  { name: "早筛网", username: "gh_757596492666" },
  { name: "有趣的胖子万里挑一", username: "gh_514ef6e078a8" },
  { name: "循因缉药", username: "gh_95e48d6f2116" },
  { name: "诊断科学", username: "gh_f9c6851f9a3d" },
];

const source = {
  source_id: "discovery:weixinzs-mced",
  editorial_owner: "WeixinZS 微信公众号监控",
  tier: "discovery",
  type: "weixinzs_articles",
  source_type: "media",
  url: "https://api.weixinzs.org/api/v1/articles",
  accounts,
  coverage: {
    companies: ["待识别"],
    products: ["多癌早筛"],
    event_types: ["publication", "clinical_readout", "partnership", "corporate", "other"],
  },
  enabled: true,
  poll_interval_hours: 144,
};

function jsonResponse(value, status = 200) {
  return new Response(JSON.stringify(value), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

function followingSubscriptions() {
  const subscriptionIds = [1761, 1760, 1759, 1758];
  return accounts.map((account, index) => ({
    id: subscriptionIds[index],
    status: "following",
    account: { nickname: account.name, username: account.username },
  }));
}

test("WeixinZS collector verifies the fixed subscriptions and maps new posts to discovery hits", async () => {
  const requests = [];
  const fetchImpl = async (url, init) => {
    requests.push({ url: String(url), init });
    if (String(url).endsWith("/v1/subscriptions")) {
      return jsonResponse({ data: { subscriptions: followingSubscriptions() } });
    }
    return jsonResponse({
      data: {
        articles: [
          {
            id: 901,
            title: "多癌早筛研究发布最新前瞻性队列结果",
            summary: "研究团队公布多癌检测队列摘要。",
            coverUrl: "https://mmbiz.qpic.cn/cover.jpg",
            url: "http://mp.weixin.qq.com/s/new-diagnostics-science-article#rd",
            publishTime: "2026-09-01T02:03:04.000Z",
            sourceName: "诊断科学",
            subscriptionId: 1758,
            account: { nickname: "诊断科学", username: "gh_f9c6851f9a3d" },
          },
        ],
        hasNextPage: false,
        totalPages: 1,
      },
    });
  };

  const hits = await collectWeixinArticles({
    source,
    apiKey: "test-key",
    baseUrl: "https://api.weixinzs.org/api/",
    since: "2026-08-26T00:00:00.000Z",
    until: "2026-09-01T08:00:00.000Z",
    discoveredAt: "2026-09-01T08:00:00.000Z",
    fetchImpl,
  });

  assert.equal(requests.length, 2);
  for (const request of requests) {
    assert.equal(request.init.headers.Authorization, "Bearer test-key");
    assert.equal(request.init.headers["Content-Type"], "application/json");
  }
  const articleUrl = new URL(requests[1].url);
  assert.equal(articleUrl.pathname, "/api/v1/articles");
  assert.equal(articleUrl.searchParams.get("page"), "1");
  assert.equal(articleUrl.searchParams.get("pageSize"), "50");
  assert.equal(articleUrl.searchParams.get("startDate"), "2026-08-26T00:00:00.000Z");
  assert.equal(articleUrl.searchParams.get("endDate"), "2026-09-01T08:00:00.000Z");

  assert.deepEqual(hits, [
    {
      company: "待识别",
      product: "多癌早筛",
      title: "多癌早筛研究发布最新前瞻性队列结果",
      url: "https://mp.weixin.qq.com/s/new-diagnostics-science-article",
      source_label: "诊断科学",
      published_at: "2026-09-01T02:03:04.000Z",
      discovered_at: "2026-09-01T08:00:00.000Z",
      snippet: "研究团队公布多癌检测队列摘要。",
      content: "",
      source: {
        source_id: "discovery:weixinzs-mced:gh_f9c6851f9a3d",
        editorial_owner: "诊断科学",
        tier: "discovery",
        authority_scope: [],
        source_type: "media",
      },
      event_type_hint: null,
      has_new_content_cursor: true,
      legacy_ids: ["weixinzs:901"],
    },
  ]);
});

test("WeixinZS collector fails closed when any fixed account is not following", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    return jsonResponse({
      data: {
        subscriptions: followingSubscriptions().map((subscription) =>
          subscription.account.username === "gh_757596492666"
            ? { ...subscription, status: "processing" }
            : subscription
        ),
      },
    });
  };

  await assert.rejects(
    () =>
      collectWeixinArticles({
        source,
        apiKey: "test-key",
        since: "2026-08-26T00:00:00.000Z",
        discoveredAt: "2026-09-01T08:00:00.000Z",
        fetchImpl,
      }),
    /早筛网.*processing/
  );
  assert.equal(calls, 1);
});

test("WeixinZS collector follows pagination, filters non-whitelisted accounts, and retries one 5xx", async () => {
  let articleCalls = 0;
  const fetchImpl = async (url) => {
    if (String(url).endsWith("/v1/subscriptions")) {
      return jsonResponse({ subscriptions: followingSubscriptions() });
    }
    articleCalls++;
    if (articleCalls === 1) return jsonResponse({ error: "temporary" }, 503);
    if (articleCalls === 2) {
      return jsonResponse({
        items: [
          {
            id: "unknown-1",
            title: "不应进入项目的其他账号文章",
            url: "https://mp.weixin.qq.com/s/unknown",
            publishTime: "2026-09-01T00:00:00.000Z",
            account: { nickname: "其他账号", username: "gh_unknown" },
          },
        ],
        hasNextPage: true,
        totalPages: 2,
      });
    }
    return jsonResponse({
      items: [
        {
          id: "zaodx-1",
          title: "早筛网多癌行业进展",
          url: "https://mp.weixin.qq.com/s/zaodx-new",
          publishTime: "2026-09-01T01:00:00.000Z",
          account: { nickname: "早筛网", username: "gh_757596492666" },
        },
      ],
      hasNextPage: false,
      totalPages: 2,
    });
  };

  const hits = await collectWeixinArticles({
    source,
    apiKey: "test-key",
    since: "2026-08-26T00:00:00.000Z",
    discoveredAt: "2026-09-01T08:00:00.000Z",
    fetchImpl,
  });

  assert.equal(articleCalls, 3);
  assert.deepEqual(hits.map((hit) => hit.title), ["早筛网多癌行业进展"]);
});

test("source cadence persists success and retries failures on the next scheduler run", () => {
  const ledger = { source_runs: {} };
  const firstRun = "2026-09-01T00:00:00.000Z";
  assert.equal(isSourceDue(source, ledger, firstRun), true);

  recordSourceSuccess(ledger, source, firstRun, 2);
  assert.equal(isSourceDue(source, ledger, "2026-09-06T23:59:59.000Z"), false);
  assert.equal(isSourceDue(source, ledger, "2026-09-07T00:00:00.000Z"), true);
  assert.equal(ledger.source_runs[source.source_id].item_count, 2);

  recordSourceFailure(ledger, source, "2026-09-07T00:05:00.000Z", new Error("HTTP 503"), {
    cursorAt: "2026-09-01T00:00:00.000Z",
  });
  assert.equal(isSourceDue(source, ledger, "2026-09-07T00:06:00.000Z"), true);
  assert.equal(ledger.source_runs[source.source_id].consecutive_failures, 1);
  assert.equal(ledger.source_runs[source.source_id].cursor_at, "2026-09-01T00:00:00.000Z");
  assert.match(ledger.source_runs[source.source_id].last_error, /HTTP 503/);
});

test("source health raises a coverage gap after three failures and clears on success", () => {
  const ledger = { source_runs: {} };
  recordSourceFailure(ledger, source, "2026-09-01T00:00:00.000Z", new Error("failure 1"), {
    cursorAt: "2026-08-31T00:00:00.000Z",
  });
  recordSourceFailure(ledger, source, "2026-09-07T00:00:00.000Z", new Error("failure 2"), {
    cursorAt: "2026-08-31T00:00:00.000Z",
  });
  assert.equal(sourceHasCoverageGap(source, ledger, "2026-09-13T00:00:00.000Z"), false);
  recordSourceFailure(ledger, source, "2026-09-13T00:00:00.001Z", new Error("failure 3"), {
    cursorAt: "2026-08-31T00:00:00.000Z",
  });
  assert.equal(sourceHasCoverageGap(source, ledger), true);
  assert.equal(ledger.source_runs[source.source_id].cursor_at, "2026-08-31T00:00:00.000Z");

  recordSourceSuccess(ledger, source, "2026-09-04T00:00:00.000Z", 0);
  assert.equal(sourceHasCoverageGap(source, ledger), false);
  assert.equal(ledger.source_runs[source.source_id].cursor_at, "2026-09-04T00:00:00.000Z");
});

test("persistent monitor runs reject --limit so cursors cannot skip unprocessed hits", () => {
  assert.throws(
    () => validateMonitorRunOptions({ limit: 1, dryRun: false }),
    /--limit requires --dry-run/
  );
  assert.doesNotThrow(() => validateMonitorRunOptions({ limit: 1, dryRun: true }));
  assert.doesNotThrow(() => validateMonitorRunOptions({ dryRun: false }));
});

test("WeixinZS collector rejects HTTP-200 error envelopes without advancing as an empty success", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    if (calls === 1) return jsonResponse({ data: { subscriptions: followingSubscriptions() } });
    return jsonResponse({ success: false, error: { message: "permission denied" } });
  };

  await assert.rejects(
    () =>
      collectWeixinArticles({
        source,
        apiKey: "test-key",
        since: "2026-08-26T00:00:00.000Z",
        discoveredAt: "2026-09-01T08:00:00.000Z",
        fetchImpl,
      }),
    /permission denied/
  );
  assert.equal(calls, 2);
});

test("WeixinZS collector fails closed when pagination exceeds the safety cap", async () => {
  let calls = 0;
  const fetchImpl = async () => {
    calls++;
    if (calls === 1) return jsonResponse({ subscriptions: followingSubscriptions() });
    return jsonResponse({ items: [], hasNextPage: true, totalPages: 101 });
  };

  await assert.rejects(
    () =>
      collectWeixinArticles({
        source,
        apiKey: "test-key",
        since: "2026-08-26T00:00:00.000Z",
        discoveredAt: "2026-09-01T08:00:00.000Z",
        fetchImpl,
      }),
    /pagination exceeds 100 pages/
  );
  assert.equal(calls, 2);
});

test("registry and ledger validation enforce the WeixinZS discovery-only contract", () => {
  const registry = {
    schema_version: 1,
    sources: [source],
    discovery_queries: [],
  };
  assert.equal(validateSourceRegistry(registry), registry);
  assert.throws(
    () => validateSourceRegistry({ ...registry, sources: [{ ...source, tier: "trusted" }] }),
    /must use discovery tier/
  );

  const ledger = createEmptyLedger();
  recordSourceSuccess(ledger, source, "2026-09-01T00:00:00.000Z", 1);
  assert.equal(validateLedger(ledger), ledger);
  ledger.source_runs[source.source_id].next_due_at = "not-a-date";
  assert.throws(() => validateLedger(ledger), /next_due_at/);
});
