/**
 * 证据库里的日期精度不一(YYYY / YYYY-MM / YYYY-MM-DD)，这里统一处理排序与展示。
 * 所有函数都是纯函数，客户端与服务端通用。
 */

const TZ = "Asia/Shanghai";

/** 可比较的排序键：缺失的月 / 日补 00，同月内精确到日的事件排在只知道月份的之前。 */
export function dateKey(date: string | null | undefined): string {
  if (!date) return "0000-00-00";
  const [y = "0000", m = "00", d = "00"] = date.slice(0, 10).split("-");
  return `${y}-${m.padStart(2, "0")}-${d.padStart(2, "0")}`;
}

export function compareDateDesc(a: string | null | undefined, b: string | null | undefined): number {
  return dateKey(b).localeCompare(dateKey(a));
}

export function yearOf(date: string | null | undefined): string {
  return date ? date.slice(0, 4) : "";
}

/** "2026-11" | "2026" — 用于按月分组；只有年份的条目归入该年。 */
export function monthKey(date: string | null | undefined): string {
  if (!date) return "";
  return date.length >= 7 ? date.slice(0, 7) : date.slice(0, 4);
}

export function monthLabel(key: string): string {
  if (!key) return "日期不详";
  const [y, m] = key.split("-");
  return m ? `${y}年${Number(m)}月` : `${y}年`;
}

/** 行内日期：有日显示「11月5日」，否则「6月」或年份。 */
export function shortDate(date: string | null | undefined): string {
  if (!date) return "—";
  const [y, m, d] = date.slice(0, 10).split("-");
  if (m && d) return `${Number(m)}月${Number(d)}日`;
  if (m) return `${Number(m)}月`;
  return y;
}

export function fullDate(date: string | null | undefined): string {
  if (!date) return "日期不详";
  const [y, m, d] = date.slice(0, 10).split("-");
  if (m && d) return `${y}年${Number(m)}月${Number(d)}日`;
  if (m) return `${y}年${Number(m)}月`;
  return `${y}年`;
}

/** 日列：「05」或空串(只知道月份 / 年份)。 */
export function dayOf(date: string | null | undefined): string {
  return date && date.length >= 10 ? date.slice(8, 10) : "";
}

/** ISO 时间戳 → 东八区日历日 YYYY-MM-DD。 */
export function cstDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return String(iso).slice(0, 10);
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(parsed);
}

export function cstDateTime(iso: string | null | undefined): string {
  if (!iso) return "";
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return "";
  const time = new Intl.DateTimeFormat("en-GB", {
    timeZone: TZ,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).format(parsed);
  return `${cstDate(iso)} ${time}`;
}

export function weekday(date: string): string {
  const parsed = new Date(`${date.slice(0, 10)}T12:00:00+08:00`);
  if (Number.isNaN(parsed.getTime())) return "";
  return new Intl.DateTimeFormat("zh-CN", { timeZone: TZ, weekday: "long" }).format(parsed);
}

/** 距 now 的整天数；日期不完整时按当月 / 当年第一天计。 */
export function daysBetween(date: string | null | undefined, now: string): number | null {
  if (!date) return null;
  const [y, m = "01", d = "01"] = date.slice(0, 10).split("-");
  const then = Date.parse(`${y}-${m}-${d}T00:00:00+08:00`);
  const ref = Date.parse(`${now.slice(0, 10)}T00:00:00+08:00`);
  if (Number.isNaN(then) || Number.isNaN(ref)) return null;
  return Math.floor((ref - then) / 86_400_000);
}
