/**
 * 关于页 — 参照模板站 aihot.virxact.com/about 的居中极简自述版式(不含二维码)。
 */

const LINKS:{ label: string; href: string }[] = [
  { label: "世和早筛医学部 Github", href: "https://github.com/canscan-gs" },{ label: "世和基因官网", href: "https://zh.geneseeq.com/" },];

const REPO_URL = "https://github.com/commie70/MCEDmonitor-web";

/** GitHub mark — lucide-react 1.x 已移除品牌图标，内联官方 SVG */
function GithubIcon({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" className={className}>
      <path d="M12 .5C5.65.5.5 5.65.5 12c0 5.08 3.29 9.39 7.86 10.91.58.11.79-.25.79-.56 0-.27-.01-1.17-.02-2.12-3.2.7-3.87-1.36-3.87-1.36-.52-1.33-1.28-1.68-1.28-1.68-1.04-.71.08-.7.08-.7 1.15.08 1.76 1.19 1.76 1.19 1.03 1.75 2.69 1.25 3.34.95.1-.74.4-1.25.72-1.53-2.55-.29-5.23-1.28-5.23-5.68 0-1.26.45-2.28 1.19-3.09-.12-.29-.52-1.46.11-3.05 0 0 .97-.31 3.17 1.18a11.1 11.1 0 0 1 5.77 0c2.2-1.49 3.17-1.18 3.17-1.18.63 1.59.23 2.76.11 3.05.74.81 1.19 1.83 1.19 3.09 0 4.41-2.69 5.38-5.25 5.67.41.35.77 1.05.77 2.12 0 1.53-.01 2.76-.01 3.14 0 .31.21.67.8.56A11.52 11.52 0 0 0 23.5 12C23.5 5.65 18.35.5 12 .5Z" />
    </svg>
  );
}

export function AboutPage() {
  return (
    <div className="mx-auto max-w-[640px] px-4 pt-[72px] pb-[48px] text-center max-[960px]:pt-[40px]">
      <h1 className="m-0 text-[28px] font-extrabold leading-[1.3] tracking-[-0.01em] text-mc-ink">
        嗨，我是{" "}
        <span className="bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
          Commie.
        </span>
      </h1>

      <p className="mt-[16px] text-[15px] leading-[1.9] text-mc-ink1">
        这个站来自<strong className="font-bold text-mc-ink">世和早筛</strong>，愿景是让信息呈现一目了然。
      </p>

      {/* 三句自述，复刻模板站引用效果；友情链接与引用线左对齐 */}
      <div className="mx-auto mt-[26px] inline-block text-left">
        <blockquote className="border-l-[3px] border-[color-mix(in_srgb,var(--accent-cyan)_45%,transparent)] pl-[16px]">
          <p className="text-[15px] leading-[2] text-mc-ink1">每天抓早筛圈的动静。</p>
          <p className="text-[15px] leading-[2] text-mc-ink1">AI 打时间戳、去噪音、评分。</p>
          <p className="text-[15px] leading-[2] text-mc-ink1">每一眼注意力都花得值得。</p>
        </blockquote>

        <h2 className="mt-[40px] text-[15px] font-extrabold tracking-[0.04em] text-mc-ink">
          友情链接
        </h2>
        <ul className="mt-[12px] grid gap-[10px]">
          <li>
            <a
              href={REPO_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-[6px] text-[13.5px] font-semibold text-mc-cyan-fg hover:underline"
            >
              <GithubIcon className="size-[14px]" />
              本站Github ↗
            </a>
          </li>
          {LINKS.map((l) => (
            <li key={l.href}>
              <a
                href={l.href}
                target="_blank"
                rel="noreferrer"
                className="text-[13.5px] font-semibold text-mc-cyan-fg hover:underline"
              >
                {l.label} ↗
              </a>
            </li>
          ))}
        </ul>
      </div>

      <p className="mt-[40px] border-t border-mc-line-soft pt-[16px] text-[12.5px] leading-[1.8] text-mc-ink2">
        <strong className="font-bold text-mc-ink1">灵感来源 / 致谢</strong>：公众号 · 「数字生命卡兹克」 ·{" "}
        <a
          href="https://aihot.virxact.com/"
          target="_blank"
          rel="noreferrer"
          className="font-semibold text-mc-cyan-fg hover:underline"
        >
          AIHOT
        </a>
      </p>
    </div>
  );
}
