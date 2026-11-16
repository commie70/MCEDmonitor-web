"use client";

import { Check, Copy, Download } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const buttonClass =
  "inline-flex h-[30px] items-center gap-[6px] rounded-full border border-line bg-panel px-3 text-[12.5px] text-ink-2 transition hover:border-accent hover:text-accent-ink";

export function CopyButton({ text, label = "复制", className }: { text: string; label?: string; className?: string }) {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
    } catch {
      return;
    }
    setCopied(true);
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => setCopied(false), 1600);
  };

  return (
    <button type="button" onClick={copy} className={cn(buttonClass, className)}>
      {copied ? <Check size={13} aria-hidden /> : <Copy size={13} aria-hidden />}
      <span aria-live="polite">{copied ? "已复制" : label}</span>
    </button>
  );
}

/** 把文本存成本地文件(Markdown / JSON)。 */
export function DownloadButton({
  filename,
  content,
  type = "text/markdown;charset=utf-8",
  label,
  className,
}: {
  filename: string;
  content: string;
  type?: string;
  label: string;
  className?: string;
}) {
  const download = () => {
    const url = URL.createObjectURL(new Blob([content], { type }));
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
  };
  return (
    <button type="button" onClick={download} className={cn(buttonClass, className)}>
      <Download size={13} aria-hidden />
      {label}
    </button>
  );
}
