import assert from "node:assert/strict";
import fs from "node:fs/promises";
import path from "node:path";
import test from "node:test";

import {
  createEmptyLedger,
  knownUrls,
  MAX_CANDIDATE_RETRIES,
  mergeCandidate,
  normalizeUrl,
  pendingRetryHits,
  recordPendingCandidate,
  recordRejectedCandidate,
} from "../scripts/lib-monitor-ledger.mjs";
import { decodeEntities, extractOfficialLinks, selectNewLinks } from "../scripts/lib-official-links.mjs";

const ROOT = path.resolve(import.meta.dirname, "..");
const LISTING = "https://www.example-dx.com/newsroom/";
const HEADLINE = "Example Dx Announces Topline Results From Its Pivotal Screening Study";

function titles(html, base = LISTING) {
  return extractOfficialLinks(html, base).map((link) => link.title);
}

function candidate(id, url) {
  return {
    id,
    company: "Example Dx",
    product: "ExampleScreen",
    title: HEADLINE,
    url,
    content: `${HEADLINE} ${id}`,
    event_type: "other",
    occurred_at: "2026-09-01T00:00:00.000Z",
    published_at: "2026-09-01T00:00:00.000Z",
    discovered_at: "2026-09-02T00:00:00.000Z",
    source: {
      source_id: "official:example-dx",
      editorial_owner: "Example Dx",
      tier: "authoritative",
      authority_scope: ["*"],
      source_type: "official",
    },
    facts: { key_fact: id },
    importance: { relevance: 20, impact: 30, actionability: 10 },
    summary: "摘要",
    reason: "理由",
  };
}

test("navigation, section pages and pagination are not news", () => {
  const html = `
    <nav><a href="/newsroom/a-long-navigation-entry-that-reads-like-a-headline">${HEADLINE}</a></nav>
    <a href="/about-us/leadership-team/">Meet the leadership team guiding our company through its next chapter</a>
    <a href="/products/examplescreen/">A minimally invasive blood test designed to find cancer at an early stage</a>
    <a href="/newsroom/page/2/">Older announcements from the company newsroom archive</a>
    <a href="/newsroom/">Newsroom</a>
    <a href="/newsroom/#latest">Jump to the latest announcements from the company newsroom</a>
    <a href="/newsroom/annual-report.pdf">Download the annual report of the company as a document</a>
    <a href="/newsroom/example-dx-announces-topline-results/">${HEADLINE}</a>
    <footer><a href="/newsroom/footer-link-that-looks-like-a-press-release/">${HEADLINE}</a></footer>`;
  assert.deepEqual(extractOfficialLinks(html, LISTING), [
    {
      title: HEADLINE,
      url: "https://www.example-dx.com/newsroom/example-dx-announces-topline-results/",
      published_at: null,
    },
  ]);
});

test("links are taken from <main>; the whole page is used only when <main> has none", () => {
  const menu = `<header><div class="mega-menu">
      <a href="/examplescreen/">A pioneering blood test for the early detection of several common cancers</a>
    </div></header>`;
  const release = `<a href="/media-releases/example-dx-enters-thailand/">Example Dx to Advance Cancer Screening in Thailand With a New Partner</a>`;
  assert.deepEqual(titles(`${menu}<main>${release}</main>`, "https://www.example-dx.com/media-releases-overview/"), [
    "Example Dx to Advance Cancer Screening in Thailand With a New Partner",
  ]);
  assert.equal(titles(`<main><p>Latest news</p></main><section>${release}</section>`).length, 1);
});

test("a card-covering link without text takes the card's heading", () => {
  const html = `
    <div class="card">
      <a href="/newsroom/example-dx-announces-jama-publication/" aria-label="Link Complete Box"></a>
      <div><h6> Example Dx Announces JAMA Publication of Data From Its Pivotal Study </h6><span>June 2, 2025</span></div>
    </div>
    <div class="card">
      <h3>Example Dx Appoints Industry Veteran as Its New Chief Commercial Officer</h3>
      <p>Summary of the announcement.</p>
      <a href="/newsroom/example-dx-appoints-cco/">Read more</a>
    </div>
    <h2>Detect cancer early with a single blood draw at your next appointment</h2>
    <a href="/how-it-works/">Learn more</a>`;
  assert.deepEqual(titles(html), [
    "Example Dx Announces JAMA Publication of Data From Its Pivotal Study",
    "Example Dx Appoints Industry Veteran as Its New Chief Commercial Officer",
  ]);
});

test("a headline that opens with a button verb is still a headline when its path is an article", () => {
  const html = `
    <a href="/newsroom/2026/two-million-patients/">More Than 2 Million Patients Have Now Been Screened With ExampleScreen</a>
    <a href="/newsroom/2026/next-generation-test/">Next Generation ExampleScreen Test Shows Improved Sensitivity in New Study</a>
    <a href="/newsroom/2026/full-release/">Read the full press release</a>
    <a href="/examplescreen/how-it-works/">Learn more about how our multi-cancer early detection test works for you</a>`;
  assert.deepEqual(titles(html), [
    "More Than 2 Million Patients Have Now Been Screened With ExampleScreen",
    "Next Generation ExampleScreen Test Shows Improved Sensitivity in New Study",
  ]);
});

test("the title is the headline inside the link, not the date, summary or button around it", () => {
  const html = `
    <a href="/cmscontent/344.html"><div>2022-03-07</div><div><h3>聚焦两会丨董事长建言：测序仪国产化亟待更多配套政策支持</h3><p>董事长在接受采访时积极为两会建言，谈及行业发展的若干问题。</p></div></a>
    <a href="/article/detail?id=4038"><div>2022.09</div><div>又添佳绩 | 公司满分通过国际权威机构组织的室间质评考核</div><div>公司以满分的成绩通过了多次国内外知名权威机构组织的室间质评考核。</div></a>
    <a href="/news/activity/data_114.html"><p>2024-02-02</p><p>国内首个尿路上皮癌辅助诊断试剂盒获批上市</p><span>查看详情</span></a>
    <a href="/news/news-661"><span>Hot</span> 2026-11-06 关于年度危险废物污染环境防治信息公开的公示</a>`;
  assert.deepEqual(extractOfficialLinks(html, "https://www.example-dx.cn/news"), [
    {
      title: "聚焦两会丨董事长建言：测序仪国产化亟待更多配套政策支持",
      url: "https://www.example-dx.cn/cmscontent/344.html",
      published_at: "2022-03-07",
    },
    {
      title: "又添佳绩 | 公司满分通过国际权威机构组织的室间质评考核",
      url: "https://www.example-dx.cn/article/detail?id=4038",
      published_at: null,
    },
    {
      title: "国内首个尿路上皮癌辅助诊断试剂盒获批上市",
      url: "https://www.example-dx.cn/news/activity/data_114.html",
      published_at: "2024-02-02",
    },
    {
      title: "关于年度危险废物污染环境防治信息公开的公示",
      url: "https://www.example-dx.cn/news/news-661",
      published_at: "2026-11-06",
    },
  ]);
});

test("press releases hosted on a newswire count as the company's own; other off-site links do not", () => {
  const html = `
    <a href="https://www.prnewswire.com/news-releases/example-dx-receives-state-approval-302000000.html">Example Dx Receives New York State Approval for Its Blood-Based Screening Test</a>
    <a href="https://www.globenewswire.com/news-release/2025/12/23/3210083/0/en/Example-Dx-Signs-Agreement.html">Example Dx Signs European Distribution and Research Agreement With a Partner</a>
    <a href="https://www.prnewswire.com/">Read our press releases on the newswire</a>
    <a href="https://www.statnews.com/2026/01/01/example-dx-blood-test/">A blood test start-up bets on fragmentomics to find lung cancer early</a>
    <a href="https://evil.example/newsroom/example-dx-announces-results/">${HEADLINE}</a>`;
  assert.deepEqual(
    extractOfficialLinks(html, LISTING).map((link) => new URL(link.url).hostname),
    ["www.prnewswire.com", "www.globenewswire.com"]
  );
});

test("markup spread over several lines never leaks into a title", () => {
  const icon = `<svg t="1723445513616" class="icon"
      viewBox="0 0 1024 1024" version="1.1" xmlns="http://www.w3.org/2000/svg"
      width="200" height="200"><path d="M512 64 a448 448 0 1 0 0 896"></path></svg>`;
  const html = `
    <a href="/newsroom/product.php"><div>${icon}</div></a>
    <a href="/newsroom/example-dx-opens-a-second-laboratory/">
      <div>${icon}</div>
      <div>Example Dx Opens a Second Laboratory to Meet Growing Demand
        for Its Screening Test</div>
    </a>`;
  assert.deepEqual(titles(html), ["Example Dx Opens a Second Laboratory to Meet Growing Demand for Its Screening Test"]);
});

test("markup quirks do not hide or invent links", () => {
  const html = `
    <a class="card" title="ExampleScreen<sup>®</sup> data" href="/newsroom/example-dx-presents-new-data/">Example Dx to Present New Data From Two Large Studies at a Medical Congress</a>
    <a href="/newsroom/{{slug}}/">{{title}} is rendered in the browser by a script template</a>
    <a href="/newsroom/example-dx-&amp;-partner-agreement/">Example Dx &amp; Partner Sign a Multi&#8209;Year Agreement to Expand Access &#x2014; Details</a>
    <!-- <a href="/newsroom/retired-announcement/">${HEADLINE}</a> -->
    <script>document.write('<a href="/newsroom/from-script/">${HEADLINE}</a>')</script>`;
  assert.deepEqual(titles(html), [
    "Example Dx to Present New Data From Two Large Studies at a Medical Congress",
    "Example Dx & Partner Sign a Multi‑Year Agreement to Expand Access — Details",
  ]);
  assert.equal(decodeEntities("&#20013;&#x6587; &lt;b&gt; &amp;amp; &#0; &#x110000;"), "中文 <b> &amp;  ");
});

test("RSS and Atom feeds are read as listings with their own dates", () => {
  const rss = `<?xml version="1.0" encoding="utf-8"?>
    <rss version="2.0"><channel><title>Press Releases</title><link>https://investors.example-dx.com/</link>
      <item><title><![CDATA[Example Dx Prices $500 Million Convertible Notes Offering]]></title>
        <link>https://investors.example-dx.com/press-releases/2026/notes-offering/default.aspx</link>
        <pubDate>Thu, 12 Nov 2026 01:09:00</pubDate></item>
      <item><title>Example Dx &amp; Partner Announce Collaboration</title>
        <link>https://investors.example-dx.com/press-releases/2026/collaboration/default.aspx</link>
        <pubDate>Wed, 11 Nov 2026 23:30:00 -0500</pubDate></item>
      <item><title>Annual report</title><link>https://investors.example-dx.com/files/annual-report.pdf</link></item>
    </channel></rss>`;
  assert.deepEqual(extractOfficialLinks(rss, "https://investors.example-dx.com/rss/pressrelease.aspx"), [
    {
      title: "Example Dx Prices $500 Million Convertible Notes Offering",
      url: "https://investors.example-dx.com/press-releases/2026/notes-offering/default.aspx",
      published_at: "2026-11-12",
    },
    {
      title: "Example Dx & Partner Announce Collaboration",
      url: "https://investors.example-dx.com/press-releases/2026/collaboration/default.aspx",
      published_at: "2026-11-11",
    },
  ]);

  const atom = `<feed xmlns="http://www.w3.org/2005/Atom"><title>News</title>
      <entry><title type="html">Example Dx Opens a New Laboratory</title>
        <link rel="self" href="https://example-dx.com/feed/entry/1"/>
        <link rel="alternate" href="/news/example-dx-opens-a-new-laboratory"/>
        <updated>2026-10-02T08:00:00Z</updated></entry></feed>`;
  assert.deepEqual(extractOfficialLinks(atom, "https://example-dx.com/feed.atom"), [
    {
      title: "Example Dx Opens a New Laboratory",
      url: "https://example-dx.com/news/example-dx-opens-a-new-laboratory",
      published_at: "2026-10-02",
    },
  ]);
});

test("only unseen links at the top of a listing are collected", () => {
  const links = Array.from({ length: 30 }, (_, index) => ({ url: `https://example-dx.com/news/${index + 1}` }));
  const numbers = (known, limits = { window: 12, max: 8 }) =>
    selectNewLinks(links, (url) => known.has(url), limits).map((link) => Number(link.url.split("/").pop()));

  // 首次见到这个信源：只取最新的几条，不回溯整个归档。
  assert.deepEqual(numbers(new Set()), [1, 2, 3, 4, 5, 6, 7, 8]);
  // 置顶的旧条目排在最前面，不妨碍取到它后面新发布的。
  const pinned = new Set(["https://example-dx.com/news/1", "https://example-dx.com/news/4"]);
  assert.deepEqual(numbers(pinned).slice(0, 3), [2, 3, 5]);
  // 窗口里都见过了就没有新内容，窗口之外的归档永远不取。
  const seen = new Set(links.slice(0, 12).map((link) => link.url));
  assert.deepEqual(numbers(seen), []);
});

test("every URL the ledger has taken charge of is known to the collectors", () => {
  const ledger = createEmptyLedger();
  const url = (slug) => `https://www.example-dx.com/newsroom/${slug}/`;

  mergeCandidate(ledger, candidate("as-evidence", url("as-evidence")));
  recordRejectedCandidate(ledger, candidate("rejected", url("rejected")), { stage: "screen" });
  recordPendingCandidate(ledger, candidate("deferred", url("deferred")), {
    stage: "run_budget",
    errorCategory: "run_budget_exceeded",
    incrementRetry: false,
  });
  for (let attempt = 0; attempt < MAX_CANDIDATE_RETRIES; attempt++) {
    recordPendingCandidate(ledger, candidate("stalled", url("stalled")), {
      stage: "model_processing",
      errorCategory: "model_error",
    });
  }

  // 旧版流水线留下的待处理候选没有重放载荷：账本不会再处理它，只有重新采集才能救回。
  recordPendingCandidate(ledger, candidate("orphan", url("orphan")), {
    stage: "model_configuration",
    errorCategory: "provider_configuration_missing",
    incrementRetry: false,
  });
  delete ledger.candidates.find((item) => item.id === "orphan").retry_payload;

  const known = knownUrls(ledger);
  for (const slug of ["as-evidence", "rejected", "deferred", "stalled"]) {
    assert.equal(known.has(normalizeUrl(`${url(slug)}?utm_source=newsletter`)), true, slug);
  }
  for (const slug of ["never-seen", "orphan"]) assert.equal(known.has(normalizeUrl(url(slug))), false, slug);

  // 重试用尽的候选不再重放；如果列表页还能把它当作新链接采回来，上限就被绕过了。
  assert.deepEqual(
    pendingRetryHits(ledger).map((hit) => hit.retry_of_candidate_id),
    ["deferred"]
  );
});

test("a listing that yields no news links is a failed collection, and both collectors skip known URLs", async () => {
  const monitor = await fs.readFile(path.join(ROOT, "scripts", "mced-daily-monitor.mjs"), "utf8");
  assert.match(monitor, /if \(!links\.length\) throw new Error\("listing_has_no_news_links"\)/);
  assert.match(monitor, /selectNewLinks\(links, isKnown, \{/);
  assert.match(monitor, /\.filter\(\(hit\) => !isKnownUrl\(hit\.url\)\)/);
});

test("every enabled company news source is an https listing or feed", async () => {
  const registry = JSON.parse(await fs.readFile(path.join(ROOT, "scripts", "monitor-sources.json"), "utf8"));
  const official = registry.sources.filter((source) => source.type === "official_web" && source.enabled);
  assert.ok(official.length >= 15);
  for (const source of official) {
    const url = new URL(source.url);
    assert.equal(url.protocol, "https:", source.source_id);
    // 登记首页会把导航当新闻采：必须指向新闻列表或订阅源。
    assert.notEqual(url.pathname, "/", source.source_id);
  }
});
