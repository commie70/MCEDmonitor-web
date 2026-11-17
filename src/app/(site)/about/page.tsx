import type { Metadata } from "next";
import { ArrowUpRight } from "lucide-react";
import { boardStats } from "@/data";
import { CONTACT_EMAIL } from "@/lib/url";

export const metadata: Metadata = { title: "关于" };

const LINKS = [
  { label: "本站 GitHub", href: "https://github.com/commie70/MCEDmonitor-web" },
  { label: "世和早筛医学部 GitHub", href: "https://github.com/canscan-gs" },
  { label: "世和基因官网", href: "https://zh.geneseeq.com/" },
];

export default function AboutPage() {
  const stats = boardStats();
  const figures = [
    { value: stats.companies, label: "企业" },
    { value: stats.studies, label: "研究" },
    { value: stats.sources, label: "公开信源" },
  ];

  return (
    <div className="mx-auto max-w-[560px] pb-10 pt-10 lg:pt-20">
      <h1 className="text-[28px] font-bold leading-[1.3] tracking-[-0.01em] text-ink">
        嗨，我是 <span className="text-self">Commie</span>。
      </h1>
      <p className="mt-4 text-[15px] leading-[1.9] text-ink-2">
        这个站来自<strong className="font-semibold text-ink">世和早筛</strong>，愿景是让信息呈现一目了然。
      </p>

      <blockquote className="mt-7 border-l-[3px] border-accent pl-4 text-[15px] leading-[2] text-ink-2">
        <p>每天抓早筛圈的动静。</p>
        <p>AI 打时间戳、去噪音、评分。</p>
        <p>每一眼注意力都花得值得。</p>
      </blockquote>

      <dl className="mt-9 grid grid-cols-3 divide-x divide-line overflow-hidden rounded-xl border border-line bg-panel">
        {figures.map((figure) => (
          <div key={figure.label} className="px-3 py-4 text-center">
            <dd className="text-[24px] font-bold leading-none tabular-nums text-ink">{figure.value}</dd>
            <dt className="mt-2 text-[12px] text-ink-3">{figure.label}</dt>
          </div>
        ))}
      </dl>

      <ul className="mt-9 grid gap-3">
        {LINKS.map((link) => (
          <li key={link.href}>
            <a
              href={link.href}
              target="_blank"
              rel="noreferrer noopener"
              className="inline-flex items-center gap-1 text-[14px] font-semibold text-accent-ink hover:underline"
            >
              {link.label}
              <ArrowUpRight size={13} aria-hidden className="opacity-70" />
            </a>
          </li>
        ))}
        <li>
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-[14px] font-semibold text-accent-ink hover:underline">
            {CONTACT_EMAIL}
          </a>
        </li>
      </ul>

      <p className="mt-10 border-t border-line pt-4 text-[12.5px] leading-[1.8] text-ink-3">
        致谢：公众号「数字生命卡兹克」·{" "}
        <a
          href="https://aihot.virxact.com/"
          target="_blank"
          rel="noreferrer noopener"
          className="font-semibold text-ink-2 hover:text-accent-ink"
        >
          AIHOT
        </a>
      </p>
    </div>
  );
}
