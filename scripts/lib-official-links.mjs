import { normalizeUrl } from "./lib-monitor-ledger.mjs";

/**
 * 从企业新闻源里取出新闻稿链接。信源可以是新闻列表页(HTML)，也可以是 RSS / Atom。
 *
 * 列表页上绝大多数同站链接是导航：管理团队、产品介绍、投资者关系、新闻栏目首页……
 * 它们排在 DOM 最前面，如果照单全收，每次运行取到的都是导航页，真正的新闻稿反而轮不到，
 * 还会把「Leadership Team」这类页面送进模型、个别被当成事件发布。
 * 这里按三类信号打分，达到门槛才算候选：标题像不像一句新闻标题、路径像不像文章、是不是站点栏目页。
 *
 * 返回的 title 会成为事件的公开标题，所以只取页面上写给人看的文字，不从链接地址里拼。
 */

const MAIN = /<main\b[^>]*>([\s\S]*)<\/main\s*>/i;
// 只去掉 <nav> 与 <footer>。<header> 不能去：文章卡片常把标题链接放在 <article><header> 里。
const CHROME_BLOCKS = /<(nav|footer)\b[\s\S]*?<\/\1\s*>/gi;
// 属性值里可能含有 ">"(如 title="Galleri<sup>®</sup> …")，所以属性按带引号的片段整体匹配。
const ANCHOR = /<a\b((?:[^>"']|"[^"]*"|'[^']*')*)>([\s\S]*?)<\/a>/gi;
const HREF = /\bhref\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const LABEL = /\b(?:aria-label|title)\s*=\s*(?:"([^"]*)"|'([^']*)')/i;
const HEADING = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/i;
const HEADINGS = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1\s*>/gi;
// 前端模板占位符(如 {{title}})：页面内容由脚本填充，静态 HTML 里没有真实链接。
const TEMPLATE_PLACEHOLDER = /\{\{|%7B%7B/i;
const BINARY_FILE = /\.(pdf|jpe?g|png|gif|svg|webp|zip|docx?|xlsx?|pptx?|mp4)$/i;
// 按钮文字(「Read the full release」「查看详情」)以祈使动词开头，再长也不是标题。
const BUTTON_LABEL =
  /^(?:(?:read|learn|view|see|find out|download|continue|click|more|next|previous)(?:\s|$)|(?:home|news)$|阅读|查看|了解|点击|更多|详情)/i;
const TAG = /<(\/)?([a-z][a-z0-9]*)\b(?:[^>"']|"[^"]*"|'[^']*')*?(\/)?>/gi;
const VOID_ELEMENTS = new Set(["area", "base", "br", "col", "embed", "hr", "img", "input", "link", "meta", "source", "track", "wbr"]);
const FEED = /^\s*(?:<\?xml\b[^>]*>\s*)?(?:<!--[\s\S]*?-->\s*)*<(?:rss|feed|rdf:RDF)\b/i;

// 企业把自己的新闻稿发在通稿平台上，新闻页只放外链(DELFI、鹍远都是这样)。
// 除这几家通稿平台外，站外链接是媒体报道或合作方页面，不算企业自己的发布。
const NEWSWIRE_HOSTS = ["prnewswire.com", "businesswire.com", "globenewswire.com", "accesswire.com"];

const NEWS_SEGMENT =
  /(?:^|[/_-])(news|newsroom|press|releases?|media|announcements?|blog|articles?|stor(?:y|ies)|insights?|updates?|xinwen|xwzx|gsxw|gsdt|dongtai|zixun)(?:$|[/_.-])/i;
const DATE_SEGMENT = /(?:^|\/)(?:19|20)\d{2}(?:[/-]?\d{1,2}){0,2}(?:\/|-|$)/;
const SECTION_SEGMENT =
  /(?:^|\/)(about(?:-us)?|team|leadership|management|board|governance|careers?|jobs|contact(?:-us)?|privacy(?:-policy)?|terms|legal|cookies?|sitemap|login|faq|products?|our-products|solutions|services|patients?|providers?|physicians?|health-systems|investors?|financials?|annual-reports|sec-filings|stock-information)(?:\/|$)/i;
const PAGINATION = /(?:[?&](?:page|p|offset|start)=\d+)|(?:\/page\/\d+\/?$)/i;

// 列表里常见的「2026-11-06 标题」「标题 2026.11.06」：日期是发布日期，不属于标题。
const DATE_TEXT = String.raw`((?:19|20)\d{2})\s*[-./年]\s*(\d{1,2})\s*[-./月]\s*(\d{1,2})\s*日?`;
const LEADING_DATE = new RegExp(String.raw`^(?:(?:hot|new|top|置顶|最新)\s+)?${DATE_TEXT}\s*`, "i");
const TRAILING_DATE = new RegExp(String.raw`\s*${DATE_TEXT}$`);
const ANY_DATE = new RegExp(String.raw`(?<!\d)${DATE_TEXT}(?!\d)`);
const BLOCK_BREAK = "\u0000";
const BLOCK_BOUNDARY = /<\/?(?:div|p|li|ul|ol|h[1-6]|section|article|header|time|br|dt|dd|td|tr|figure|figcaption)\b[^>]*>/gi;
const MONTHS = ["jan", "feb", "mar", "apr", "may", "jun", "jul", "aug", "sep", "oct", "nov", "dec"];

const MIN_SCORE = 3;
const MIN_TITLE_CHARS = 12;
// 卡片标题与整卡链接之间只隔着几层容器，隔得更远的标题属于别的区块。
const CARD_HEADING_REACH = 1500;

export function stripHtml(value) {
  return String(value || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function codePoint(value, radix) {
  const code = Number.parseInt(value, radix);
  return Number.isInteger(code) && code > 0 && code <= 0x10ffff ? String.fromCodePoint(code) : "";
}

export function decodeEntities(value) {
  return String(value)
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => codePoint(hex, 16))
    .replace(/&#(\d+);/g, (_, decimal) => codePoint(decimal, 10))
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&");
}

function plainText(markup) {
  return stripHtml(decodeEntities(stripHtml(markup)));
}

function isoDay(year, month, day) {
  const y = Number(year);
  const m = Number(month);
  const d = Number(day);
  if (!(m >= 1 && m <= 12 && d >= 1 && d <= 31)) return null;
  return `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

/** 把列表项里的日期从标题上拆下来。 */
function splitListingDate(text) {
  for (const pattern of [LEADING_DATE, TRAILING_DATE]) {
    const match = pattern.exec(text);
    const day = match && isoDay(match[1], match[2], match[3]);
    if (day) return { title: text.replace(pattern, "").trim(), published_at: day };
  }
  return { title: text, published_at: null };
}

/**
 * 链接里写给人看的标题。新闻卡片常把日期、标题、摘要、「查看详情」一起包在同一个链接里：
 * 有标题元素就取标题元素；否则按块拆开，取第一块像标题的文字(日期块、按钮文字都不够长)。
 */
function anchorTitle(inner) {
  const whole = plainText(inner);
  const published_at = splitListingDate(whole).published_at ?? firstDay(whole);
  const heading = HEADING.exec(inner);
  const headed = heading ? splitListingDate(plainText(heading[2])).title : "";
  if (usable(headed)) return { title: headed, published_at };
  // 先把空白折叠成空格再按块切：标记里本来就有换行，按换行切会把一个标签(如多行的 <svg>)切成两半，
  // 剩下的半截标签去不掉，会被当成文字。
  const blocks = inner.replace(/\s+/g, " ").replace(BLOCK_BOUNDARY, BLOCK_BREAK).split(BLOCK_BREAK).map(plainText).filter(Boolean);
  if (blocks.length < 2) return { title: splitListingDate(whole).title, published_at };
  const title = blocks.map((block) => splitListingDate(block).title).find(usable) ?? "";
  return { title, published_at };
}

function firstDay(text) {
  const match = ANY_DATE.exec(text);
  return match ? isoDay(match[1], match[2], match[3]) : null;
}

/** 一句新闻标题：英文至少 5 个词、35 个字符；中日韩文字至少 12 个字。导航标签达不到。 */
function looksLikeHeadline(title) {
  const cjk = (title.match(/[㐀-鿿豈-﫿]/g) || []).length;
  if (cjk >= 12) return true;
  return title.length >= 35 && title.split(/\s+/).filter(Boolean).length >= 5;
}

/** 以按钮动词开头的短语不是标题；够得上一句标题的(「More Than 2 Million Patients …」)留给路径信号去证实。 */
function usable(title) {
  if (title.length < MIN_TITLE_CHARS || TEMPLATE_PLACEHOLDER.test(title)) return false;
  return !BUTTON_LABEL.test(title) || looksLikeHeadline(title);
}

/**
 * 从链接走到标题的这段标记有没有走出链接所在的容器。
 * 往后走时遇到多余的闭合标签、往前走时遇到多余的开始标签，都说明已经离开了这张卡片。
 * slack 是允许退出的层数：按钮常被包在一两层容器里。
 */
function staysInside(fragment, backward, slack) {
  const steps = [];
  for (const [, closing, name, selfClosing] of fragment.matchAll(TAG)) {
    if (selfClosing || VOID_ELEMENTS.has(name.toLowerCase())) continue;
    steps.push(closing ? -1 : 1);
  }
  let depth = 0;
  for (const step of backward ? steps.reverse().map((value) => -value) : steps) {
    depth += step;
    if (depth < -slack) return false;
  }
  return true;
}

/**
 * 链接自己没有可用文字时，标题在它所在卡片的标题元素里。
 * 没有任何文字的链接是覆盖整张卡片的空链接：标题在它之后(同一容器内)，其次在它之前。
 * 有文字的是卡片末尾的按钮(「Read more」「查看详情」)：标题只会在它之前。
 * 两个方向都不越过相邻的链接，以免拿到别的条目的标题。
 */
function cardHeading(body, start, end, isButton) {
  if (!isButton) {
    const after = body.slice(end, end + CARD_HEADING_REACH);
    const nextAnchor = after.search(/<a\b/i);
    const scope = nextAnchor < 0 ? after : after.slice(0, nextAnchor);
    const following = HEADING.exec(scope);
    if (following && staysInside(scope.slice(0, following.index), false, 0)) return plainText(following[2]);
  }
  const before = body.slice(Math.max(0, start - CARD_HEADING_REACH), start);
  const previousAnchor = before.toLowerCase().lastIndexOf("</a");
  const scope = previousAnchor < 0 ? before : before.slice(previousAnchor);
  const preceding = [...scope.matchAll(HEADINGS)].at(-1);
  if (!preceding) return "";
  const between = scope.slice(preceding.index + preceding[0].length);
  return staysInside(between, true, isButton ? 2 : 0) ? plainText(preceding[2]) : "";
}

function pathSignals(url, listing) {
  let path;
  try {
    path = decodeURIComponent(url.pathname).toLowerCase();
  } catch {
    path = url.pathname.toLowerCase();
  }
  const listingPath = listing.pathname.replace(/\/+$/, "").toLowerCase();
  const under =
    bareHost(url) === bareHost(listing) &&
    listingPath.length > 1 &&
    path.startsWith(`${listingPath}/`) &&
    path.length > listingPath.length + 1;
  // 列表页自己可能就在 /about-us/newsroom/ 这样的栏目下：栏目判断只看列表路径之后的部分。
  const rest = under ? path.slice(listingPath.length) : path;

  let article = 0;
  if (under) article += 2;
  if (NEWS_SEGMENT.test(rest)) article += 2;
  if (DATE_SEGMENT.test(rest)) article += 2;
  let section = 0;
  if (SECTION_SEGMENT.test(rest)) section -= 4;
  if (PAGINATION.test(`${path}${url.search}`)) section -= 4;
  return { article, section };
}

function bareHost(url) {
  return url.hostname.toLowerCase().replace(/^www\./, "");
}

function barePath(url) {
  return url.pathname.replace(/\/+$/, "");
}

function sameSite(host, baseHost) {
  return host === baseHost || host.endsWith(`.${baseHost}`) || baseHost.endsWith(`.${host}`);
}

function isNewswire(host) {
  return NEWSWIRE_HOSTS.some((wire) => host === wire || host.endsWith(`.${wire}`));
}

/**
 * 页面有 <main> 时只在其中找：按 HTML 语义它就是去掉导航、页眉、页脚之后的正文，
 * 比逐个剔除导航块可靠(下拉大菜单里的产品介绍链接文字很长，单看文字像标题)。
 * <main> 里一条都认不出时(列表放在了 <main> 外面)，退回整页、只去掉 <nav> 与 <footer>。
 */
function extractHtmlLinks(html, base) {
  const page = String(html || "")
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ");
  const main = MAIN.exec(page);
  const links = main ? linksIn(main[1], base) : [];
  return links.length ? links : linksIn(page.replace(CHROME_BLOCKS, " "), base);
}

function linksIn(body, base) {
  const baseHost = bareHost(base);
  const links = new Map();
  ANCHOR.lastIndex = 0;
  let match;
  while ((match = ANCHOR.exec(body))) {
    const href = HREF.exec(match[1]);
    const rawHref = href ? href[1] ?? href[2] : "";
    if (!rawHref || TEMPLATE_PLACEHOLDER.test(rawHref)) continue;
    let url;
    try {
      url = new URL(decodeEntities(rawHref), base);
    } catch {
      continue;
    }
    if (url.protocol !== "https:" && url.protocol !== "http:") continue;
    const host = bareHost(url);
    const wire = isNewswire(host);
    if (!wire && !sameSite(host, baseHost)) continue;
    if (BINARY_FILE.test(url.pathname)) continue;
    // 指回列表页自身(含页内锚点)的链接不是文章。
    if (host === baseHost && barePath(url) === barePath(base) && url.search === base.search) continue;

    let { title, published_at } = anchorTitle(match[2]);
    let fromCard = false;
    if (!usable(title)) {
      const label = LABEL.exec(match[1]);
      const labelled = label ? plainText(label[1] ?? label[2]) : "";
      const isButton = plainText(match[2]).length > 0;
      title = looksLikeHeadline(labelled) ? labelled : cardHeading(body, match.index, ANCHOR.lastIndex, isButton);
      fromCard = true;
    }
    if (!usable(title)) continue;

    const headline = looksLikeHeadline(title);
    const signals = pathSignals(url, base);
    // 站外通稿、取自卡片的标题、以按钮动词开头的文字，单凭文字不足为证：
    // 必须同时是一句标题、且路径本身像文章。
    if ((wire || fromCard || BUTTON_LABEL.test(title)) && !(headline && signals.article > 0)) continue;
    if ((headline ? 3 : 0) + signals.article + signals.section < MIN_SCORE) continue;
    try {
      const key = normalizeUrl(url.href);
      if (!links.has(key)) links.set(key, { title: title.slice(0, 300), url: url.href, published_at });
    } catch {
      // Ignore malformed links from external HTML.
    }
  }
  return [...links.values()];
}

function feedText(value) {
  return plainText(String(value || "").replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1"));
}

/** RSS 用 RFC 822 日期，Atom 用 ISO 8601。只取日历日，不做时区换算。 */
function feedDay(value) {
  const text = feedText(value);
  const iso = /^((?:19|20)\d{2})-(\d{2})-(\d{2})/.exec(text);
  if (iso) return isoDay(iso[1], iso[2], iso[3]);
  const rfc = /(\d{1,2})\s+([a-z]{3})[a-z]*\.?\s+((?:19|20)\d{2})/i.exec(text);
  const month = rfc ? MONTHS.indexOf(rfc[2].toLowerCase()) : -1;
  return month < 0 ? null : isoDay(rfc[3], month + 1, rfc[1]);
}

function feedLink(entry) {
  const text = /<link\b[^>]*>([\s\S]*?)<\/link>/i.exec(entry);
  if (text && feedText(text[1])) return feedText(text[1]);
  const tags = entry.match(/<link\b[^>]*>/gi) || [];
  const preferred = tags.find((tag) => /\brel\s*=\s*["']alternate["']/i.test(tag)) || tags.find((tag) => !/\brel\s*=/i.test(tag));
  const href = preferred ? HREF.exec(preferred) : null;
  return href ? decodeEntities(href[1] ?? href[2]) : "";
}

function extractFeedLinks(xml, base) {
  const links = new Map();
  for (const [entry] of String(xml).matchAll(/<(item|entry)\b[\s\S]*?<\/\1\s*>/gi)) {
    const title = feedText(/<title\b[^>]*>([\s\S]*?)<\/title>/i.exec(entry)?.[1]);
    const date = /<(pubDate|dc:date|published|updated)\b[^>]*>([\s\S]*?)<\/\1\s*>/i.exec(entry)?.[2];
    let url;
    try {
      url = new URL(feedLink(entry), base);
    } catch {
      continue;
    }
    if ((url.protocol !== "https:" && url.protocol !== "http:") || BINARY_FILE.test(url.pathname) || !title) continue;
    try {
      const key = normalizeUrl(url.href);
      if (!links.has(key)) links.set(key, { title: title.slice(0, 300), url: url.href, published_at: feedDay(date) });
    } catch {
      // Ignore malformed links from external feeds.
    }
  }
  return [...links.values()];
}

/**
 * @returns {{ title: string, url: string, published_at: string | null }[]}
 *   按信源给出的顺序排列；published_at 为 YYYY-MM-DD，信源没有标注时为 null。
 */
export function extractOfficialLinks(body, baseUrl) {
  const base = new URL(baseUrl);
  return FEED.test(String(body || "").slice(0, 2000)) ? extractFeedLinks(body, base) : extractHtmlLinks(body, base);
}

/**
 * 新发布的内容总在列表最前面(置顶的一两条除外)，所以只看最前面的 window 条，取其中还没见过的。
 * 这样不必假设列表严格按时间排序，也不会一次次运行把整个归档往回翻——
 * 归档是一次性的历史回填，不该由日常监测逐页去做。
 *
 * @param {{ url: string }[]} links  extractOfficialLinks 的结果
 * @param {(url: string) => boolean} isKnown
 * @param {{ window: number, max: number }} limits
 */
export function selectNewLinks(links, isKnown, { window, max }) {
  return links
    .slice(0, window)
    .filter((link) => !isKnown(link.url))
    .slice(0, max);
}
