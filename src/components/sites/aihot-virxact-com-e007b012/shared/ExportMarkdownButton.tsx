"use client";

import { useState } from "react";
import { FileDown } from "lucide-react";

/** 「导出 Markdown」按钮:把文章内容打包为 .md 文件下载(仅当前浏览器,不走服务器)。 */
export function ExportMarkdownButton({
  filename,
  markdown,
}:{
  filename: string;
  markdown: string;
}) {
  const [done, setDone] = useState(false);

  return (
    <button
      type="button"
      onClick={() => {
        const blob = new Blob([markdown],{ type: "text/markdown;charset=utf-8" });
        const url = URL.createObjectURL(blob);
        const a = document.createElement("a");
        a.href = url;
        a.download = filename;
        a.click();
        URL.revokeObjectURL(url);
        setDone(true);
        setTimeout(() => setDone(false), 1600);
      }}
      className="inline-flex cursor-pointer items-center gap-[6px] rounded-[8px] border border-mc-line-strong bg-mc-card px-[12px] py-[6px] text-[12.5px] font-semibold text-mc-ink1 transition hover:border-mc-emphasis hover:text-mc-cyan-fg"
    >
      <FileDown size={14} aria-hidden />
      {done ? "已导出 ✓" : "导出 Markdown"}
    </button>
  );
}
