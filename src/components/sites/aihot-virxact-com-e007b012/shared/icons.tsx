/**
 * 早筛情报站 — 品牌标识(自定义，非原站商标)
 * 雷达圆环 + 琥珀色信号点，呼应「监测」语义。
 */
export function BrandMark({ size = 26 }:{ size?:number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 32 32"
      role="img"
      aria-label="早筛情报站"
      className="shrink-0"
    >
      <circle
        cx="16"
        cy="16"
        r="11"
        fill="none"
        stroke="var(--text-0)"
        strokeWidth="2.4"
      />
      <circle cx="16" cy="16" r="4.6" fill="var(--text-0)" />
      <circle cx="23.4" cy="8.6" r="3.1" fill="var(--accent-amber)" />
    </svg>
  );
}

export function BrandLogo() {
  return (
    <span className="flex items-center gap-2.5">
      <BrandMark />
      <span className="flex flex-col leading-none">
        <span className="text-[17px] font-extrabold tracking-[0.14em] text-mc-ink">
          早筛情报站
        </span>
        <span className="mt-1 text-[9px] font-semibold tracking-[0.32em] text-mc-ink2">
          MCED·INTEL
        </span>
      </span>
    </span>
  );
}
