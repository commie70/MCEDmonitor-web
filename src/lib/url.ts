/** URL 与 API 响应的公共边界(客户端 / 服务端均可安全引用，无 node 依赖)。 */

/** 仅允许 http(s) 链接；javascript: / data: 等其他协议返回 null，调用方应省略链接。 */
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:" ? url.toString() : null;
  } catch {
    return null;
  }
}

export function hostOf(value: string): string {
  try {
    return new URL(value).hostname.replace(/^www\./, "");
  } catch {
    return "";
  }
}

/** 匿名只读 API 的边缘缓存策略(数据随部署 / 监测运行更新，短窗口即可)。 */
export const API_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
} as const;

export const SITE_URL = "https://gs-mced.geneseeq.com";

/** 站点公开联系邮箱(反馈页与关于页)。 */
export const CONTACT_EMAIL = "yunyang.wei@geneseeq.com";
