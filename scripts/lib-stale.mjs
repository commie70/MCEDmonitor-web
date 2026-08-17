/**
 * 条目发布日期推断(旧文判定共用):
 * 优先级 A = 正文/摘要头部的显式日期(取该区域内最近的一个);
 * 优先级 B = 标题中的显式日期;
 * 优先级 C = URL 路径中的 /2023/12/20 或 2023-12-20;
 * 都没有 → null(调用方回退到采集端日期)。
 * 采集端日期(如 Brave 的索引时间)不作为 A 级证据——它常常只是“最近被抓到”的时间。
 * 返回 "YYYY-MM-DD" 或 "YYYY-MM";忽略未来日期与非法日期。
 */

const EN_MONTHS = {
  jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
  jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
};

const pad = (v) => String(v).padStart(2, "0");

function todayIso() {
  return new Date().toISOString().slice(0, 10);
}

function* textDates(text) {
  // ISO / 斜杠:2023-12-20、2023/12/20、2023-12、2023/12
  for (const m of String(text).matchAll(
    /\b(20\d{2})[-/.](0?[1-9]|1[0-2])(?:[-/.](0?[1-9]|[12]\d|3[01]))?\b/g
  )) {
    yield m[3] ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : `${m[1]}-${pad(m[2])}`;
  }
  // 中文:「2023年12月20日」「2023年12月」
  for (const m of String(text).matchAll(
    /(20\d{2})\s*年\s*(0?[1-9]|1[0-2])\s*月(?:\s*(0?[1-9]|[12]\d|3[01])\s*日)?/g
  )) {
    yield m[3] ? `${m[1]}-${pad(m[2])}-${pad(m[3])}` : `${m[1]}-${pad(m[2])}`;
  }
  // 英文:June 4, 2025 / June 4 2025 / Jun 2025 / June 2025
  for (const m of String(text).matchAll(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?\s+(\d{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/gi
  )) {
    yield `${m[3]}-${pad(EN_MONTHS[m[1].slice(0, 3).toLowerCase()])}-${pad(m[2])}`;
  }
  // 英文:4 June 2025
  for (const m of String(text).matchAll(
    /\b(\d{1,2})(?:st|nd|rd|th)?\s+(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?,?\s+(20\d{2})\b/gi
  )) {
    yield `${m[3]}-${pad(EN_MONTHS[m[2].slice(0, 3).toLowerCase()])}-${pad(m[1])}`;
  }
  // 英文:June 2025(无日)
  for (const m of String(text).matchAll(
    /\b(jan(?:uary)?|feb(?:ruary)?|mar(?:ch)?|apr(?:il)?|may|jun(?:e)?|jul(?:y)?|aug(?:ust)?|sep(?:t(?:ember)?)?|oct(?:ober)?|nov(?:ember)?|dec(?:ember)?)\.?,?\s+(20\d{2})\b/gi
  )) {
    yield `${m[2]}-${pad(EN_MONTHS[m[1].slice(0, 3).toLowerCase()])}`;
  }
}

function sane(date) {
  if (!date) return false;
  const m = date.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/);
  if (!m) return false;
  const month = Number(m[2]);
  const day = Number(m[3] || 1);
  if (month < 1 || month > 12 || day < 1 || day > 31) return false;
  return date <= todayIso(); // 忽略未来日期
}

/**
 * @param {{url?:string,title?:string,snippet?:string,content?:string}} item
 * @returns {string|null} "YYYY-MM-DD" 或 "YYYY-MM"
 */
export function inferItemDate(item) {
  // A:正文(content 优先)+ 摘要的头部区域,取最近的一个显式日期
  const head = `${item.content || ""}\n${item.snippet || ""}`.slice(0, 600);
  const fromHead = [...textDates(head)].filter(sane).sort();
  if (fromHead.length) return fromHead[fromHead.length - 1];
  // B:标题
  const fromTitle = [...textDates(item.title || "")].filter(sane).sort();
  if (fromTitle.length) return fromTitle[fromTitle.length - 1];
  // C:URL 路径
  const u = String(item.url || "").match(
    /(20\d{2})[\/\-_](0?[1-9]|1[0-2])(?:[\/\-_](0?[1-9]|[12]\d|3[01]))?/
  );
  if (u && sane(`${u[1]}-${pad(u[2])}`)) {
    return u[3] ? `${u[1]}-${pad(u[2])}-${pad(u[3])}` : `${u[1]}-${pad(u[2])}`;
  }
  return null;
}

/** 故事线 latest 日期 → 旧文月份(早于窗口起点月份时返回 "YYYY-MM",否则 null) */
export function staleMonthOf(latestDate, sinceMonth) {
  if (!latestDate) return null;
  const month = latestDate.slice(0, 7);
  return month < sinceMonth ? month : null;
}
