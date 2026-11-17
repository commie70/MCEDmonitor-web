"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 元素的实际像素宽度。
 *
 * 图表按真实像素绘制(而不是靠 viewBox 等比缩放)，文字才不会随容器变窄而缩到看不清，
 * 也不会在宽屏上被放大。首帧(服务端渲染与水合)返回 fallback，挂载后改为实测值。
 */
export function useElementWidth<T extends HTMLElement>(fallback: number) {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(fallback);

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const observer = new ResizeObserver(([entry]) => {
      const next = Math.round(entry.contentRect.width);
      if (next > 0) setWidth(next);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}
