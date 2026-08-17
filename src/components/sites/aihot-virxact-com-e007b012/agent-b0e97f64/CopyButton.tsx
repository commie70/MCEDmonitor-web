"use client";

import { useEffect, useRef, useState } from "react";

/**
 * 复制按钮 — 默认复制站点绝对地址(origin+path);
 * 传 text 时直接复制任意文本(提示词 / 命令)。成功后 2 秒显示「已复制」。
 */
export function CopyButton({
  path,
  text,
  label = "复制地址",}:{
  path?: string;
  text?: string;
  label?: string;
}) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  },[]);

  async function copy() {
    try {
      const value = text ?? `${window.location.origin}${path ?? ""}`;
      await navigator.clipboard.writeText(value);
      setCopied(true);
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setCopied(false), 2000);
    } catch {// 剪贴板不可用(非安全上下文等)时静默失败
    }
  }

  return (
    <button
      type="button"
      onClick={copy}
      className="shrink-0 rounded-[8px] border border-mc-line bg-mc-surface1 px-[10px] py-[4px] text-[11.5px] text-mc-ink1 transition hover:border-mc-line-strong hover:text-mc-ink"
    >
      {copied ? "已复制" : label}
    </button>
  );
}
