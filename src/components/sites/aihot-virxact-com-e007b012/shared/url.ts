/**
 * URL 与 API 响应的公共边界(客户端/服务端均可安全引用,无 node 依赖)。
 */

/** 仅允许 http(s) 链接;javascript:/data: 等其他协议返回 null,调用方应省略链接。 */
export function safeHttpUrl(value: unknown): string | null {
  if (typeof value !== "string" || !value) return null;
  try {
    const u = new URL(value);
    return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
  } catch {
    return null;
  }
}

/** 匿名只读 API 的边缘缓存策略(数据随部署 / 日报更新,短窗口即可)。 */
export const API_CACHE_HEADERS = {
  "Cache-Control": "public, s-maxage=60, stale-while-revalidate=300",
} as const;
