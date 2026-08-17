/**
 * 关于页 — 参照模板站 aihot.virxact.com/about 的居中极简自述版式(不含二维码)。
 */

const LINKS:{ label: string; href: string }[] = [
  { label: "Commie。的Github页", href: "https://github.com/commie70" },{ label: "世和早筛Github站", href: "https://github.com/canscan-gs" },{ label: "世和基因官网", href: "https://zh.geneseeq.com/" },];

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
