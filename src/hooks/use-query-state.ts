"use client";

import { usePathname, useSearchParams } from "next/navigation";
import { useCallback } from "react";

/**
 * 筛选状态放在 URL 查询串里：可分享、刷新不丢。
 *
 * 写入用原生 history.replaceState——Next 的路由会同步 useSearchParams，
 * 但不会向服务器重新请求页面，筛选因此是即时的。
 * 传 null、空串或空数组即删除该参数。
 */
export function useQueryState() {
  const pathname = usePathname();
  const params = useSearchParams();

  const get = useCallback((key: string) => params.get(key) ?? "", [params]);

  const getList = useCallback((key: string) => (params.get(key) ?? "").split(",").filter(Boolean), [params]);

  const set = useCallback(
    (patch: Record<string, string | string[] | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(patch)) {
        const text = Array.isArray(value) ? value.join(",") : value;
        if (text) next.set(key, text);
        else next.delete(key);
      }
      const query = next.toString();
      window.history.replaceState(null, "", query ? `${pathname}?${query}` : pathname);
    },
    [params, pathname]
  );

  const clear = useCallback(() => window.history.replaceState(null, "", pathname), [pathname]);

  return { get, getList, set, clear, active: params.size > 0 };
}
