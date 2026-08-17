import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import Markdown from "react-markdown";
import {
  articleMarkdown,
  findArticle,
} from "@/components/sites/aihot-virxact-com-e007b012/shared/article";
import { ExportMarkdownButton } from "@/components/sites/aihot-virxact-com-e007b012/shared/ExportMarkdownButton";
import { SiteShell } from "@/components/sites/aihot-virxact-com-e007b012/shared/SiteShell";

export const dynamic = "force-dynamic";

interface PageProps {
  params: Promise<{ id: string }>;
}

export async function generateMetadata({ params }: PageProps) {
  const { id } = await params;
  const article = await findArticle(decodeURIComponent(id));
  return { title: article ? `${article.title} · 早筛情报站` : "条目详情 · 早筛情报站" };
}

/**
 * 文章页 — 模板站 /items/{id} 复刻:
 * 站内卡片 → 本页(抓回内容渲染);页尾「打开原文」指向信源、「导出 Markdown」下载 .md。
 */
export default async function ItemPage({ params }: PageProps) {
  const { id } = await params;
  const article = await findArticle(decodeURIComponent(id));

  if (!article) {
    return (
      <SiteShell>
        <div className="mx-auto max-w-[760px] pt-[48px]">
          <Link
            href="/daily"
            className="inline-flex items-center gap-[6px] text-[12.5px] font-semibold text-mc-cyan-fg hover:underline"
          >
            <ArrowLeft size={14} aria-hidden /> 返回监测日报
          </Link>
          <div className="mt-[18px] rounded-xl border border-dashed border-mc-emphasis bg-mc-surface0 p-[28px_20px] text-center">
            <p className="text-[15px] font-semibold text-mc-ink">未找到该条目</p>
            <p className="mx-auto mt-2 max-w-[520px] text-[12.5px] leading-[1.7] text-mc-ink1">
              条目可能已随日报更新下线；请从「监测日报」或「热点榜」的最新卡片进入。
            </p>
          </div>
        </div>
      </SiteShell>
    );
  }

  const filename = `mced-${article.id.replace(/[^\w-]+/g, "_").slice(0, 60)}.md`;

  return (
    <SiteShell>
      <div className="mx-auto max-w-[760px] pt-[10px]">
      <Link
        href="/daily"
        className="inline-flex items-center gap-[6px] text-[12.5px] font-semibold text-mc-cyan-fg hover:underline"
      >
        <ArrowLeft size={14} aria-hidden /> 返回监测日报
      </Link>

      <article className="mt-[14px] rounded-xl border border-mc-line bg-mc-card p-[22px_24px_20px] shadow-mc-card max-[960px]:p-[16px]">
        <div className="flex flex-wrap items-center gap-x-[10px] gap-y-[4px] text-[11.5px] tracking-[0.04em] text-mc-ink2 uppercase">
          <span className="font-semibold">{article.source}</span>
          {article.categoryLabel && (
            <span className="rounded-[3px] bg-mc-surface2 px-[6px] py-[2px] font-semibold text-mc-ink1">
              {article.categoryLabel}
            </span>
          )}
          {article.company && <span>{article.company}</span>}
          {(article.date || article.time) && (
            <span className="tabular-nums normal-case">
              {article.date}
              {article.time ? ` ${article.time}` : ""}
            </span>
          )}
        </div>

        <h1 className="m-0 mt-[10px] text-[21px] font-extrabold leading-[1.4] tracking-[-0.01em] text-mc-ink max-[960px]:text-[17.5px]">
          {article.title}
        </h1>

        <div className="mt-[14px] flex flex-wrap items-center gap-[8px]">
          {article.url && (
            <a
              href={article.url}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-[6px] rounded-[8px] border border-mc-line-strong bg-mc-card px-[12px] py-[6px] text-[12.5px] font-semibold text-mc-cyan-fg transition hover:border-mc-emphasis hover:underline"
            >
              <ExternalLink size={14} aria-hidden />
              打开原文
            </a>
          )}
          <ExportMarkdownButton
            filename={filename}
            markdown={articleMarkdown(article)}
          />
          {article.score != null && (
            <span className="ml-auto text-[12px] font-semibold tabular-nums text-mc-emerald-fg">
              监测评分 {article.score}/100
            </span>
          )}
        </div>

        {article.summary.length > 0 && (
          <div className="mt-[16px] grid gap-[10px] text-[14px] leading-[1.75] text-mc-ink1">
            {article.summary.map((p, i) => (
              <p key={i} className="m-0">
                {p}
              </p>
            ))}
          </div>
        )}

        {article.content ? (
          <section className="mt-[18px]">
            <div className="md-body text-[13.5px] leading-[1.75] text-mc-ink1">
              <Markdown>{article.content}</Markdown>
            </div>
          </section>
        ) : article.snippet ? (
          <blockquote className="mt-[16px] rounded-[8px] border border-mc-line bg-mc-surface0 px-[14px] py-[10px] text-[13px] leading-[1.7] text-mc-ink2">
            <span className="mb-[4px] block text-[11px] font-bold tracking-[0.08em] text-mc-ink1">
              抓回内容(节选,全文抓取暂不可用)
            </span>
            {article.snippet}
          </blockquote>
        ) :null}

        {article.reason && (
          <>
            <hr className="mt-[16px] border-0 border-t border-dashed border-mc-line-strong" />
            <p className="m-0 pt-[10px] text-[12.5px] leading-[1.65] text-mc-note-fg">
              <span className="font-bold">关注理由：</span>
              {article.reason}
            </p>
          </>
        )}

        {article.note && (
          <p className="m-0 mt-[10px] text-[12px] leading-[1.6] text-mc-ink2">
            备注:{article.note}
          </p>
        )}
      </article>
      </div>
    </SiteShell>
  );
}
