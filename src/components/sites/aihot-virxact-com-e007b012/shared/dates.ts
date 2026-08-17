/**
 * 东八区(北京时间)日期工具 — 服务器端每次请求计算，页面时间戳随服务器走。
 * 注意：勿在模块顶层缓存结果，必须在每次请求 / 渲染时调用。
 */

const TZ = "Asia/Shanghai";

function nowCst(): Date {// 以目标时区的墙钟重建 Date，避免依赖服务器本地时区设置
  return new Date(new Date().toLocaleString("en-US",{ timeZone: TZ }));
}

export function todayCstIso(): string {
  const d = nowCst();
  const pad = (n:number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function addDaysIso(iso: string, delta:number): string {
  const d = new Date(`${iso}T00:00:00+08:00`);
  d.setDate(d.getDate() + delta);
  const pad = (n:number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}/** "8月17日" */
export function dayLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00+08:00`);
  return `${d.getMonth() + 1}月${d.getDate()}日`;
}

const WEEKDAYS = ["星期日", "星期一", "星期二", "星期三", "星期四", "星期五", "星期六"];

/** "星期一" */
export function weekdayLabel(iso: string): string {
  return WEEKDAYS[new Date(`${iso}T00:00:00+08:00`).getDay()];
}/** "2026年8月17日星期一" */
export function fullDateLabel(iso: string): string {
  const d = new Date(`${iso}T00:00:00+08:00`);
  return `${d.getFullYear()}年${d.getMonth() + 1}月${d.getDate()}日${weekdayLabel(iso)}`;
}
