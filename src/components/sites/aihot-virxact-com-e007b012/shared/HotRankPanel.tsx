import type { HotBadge,HotEvent } from "./types";

const MONO_STACK = "font-[ui-monospace,SFMono-Regular,Menlo,monospace]";

const KICKER_CLASS = `${MONO_STACK} text-xs font-bold tracking-[0.12em] text-mc-cyan-fg`;

const BADGE_BASE =
  "inline-block whitespace-nowrap rounded px-[7px] py-px text-[11px] font-bold leading-[1.6]";

const BADGE_STYLES: Record<HotBadge, string> = {
  "爆": "bg-[color-mix(in_srgb,var(--accent-rose-fg)_16%,transparent)] text-mc-rose-fg","新": "bg-[color-mix(in_srgb,var(--accent-cyan-fg)_14%,transparent)] text-mc-cyan-fg","发酵中": "bg-[color-mix(in_srgb,var(--accent-amber-fg)_16%,transparent)] text-mc-amber-fg",};

const RANK_COLORS = ["text-mc-rank1", "text-mc-rank2", "text-mc-rank3"];

function Badge({ label }:{ label:HotBadge }) {
  return (
    <span className={`${BADGE_BASE} ${BADGE_STYLES[label]}`}>{label}</span>
  );
}

const fmt = (n:number): string => String(Math.round(n * 100) / 100);

function Sparkline({ values }:{ values:number[] }) {
  if (values.length === 0) return null;
  const n = values.length;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = max - min;
  const coords = values.map((v, i) => ({
    x:n > 1 ? 4 + (i / (n - 1)) * 96 : 52,
    y: range > 0 ? 26 - ((v - min) / range) * 22 : 15,}));
  const points = coords.map((p) => `${fmt(p.x)},${fmt(p.y)}`).join(" ");
  const end = coords[coords.length - 1];

  return (
    <svg
      viewBox="0 0 104 32"
      aria-hidden="true"
      className="block h-8 w-[104px] max-[960px]:h-auto max-[960px]:w-16"
    >
      <polyline
        points={points}
        fill="none"
        stroke="var(--accent-cyan-fg)"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle
        cx={fmt(end.x)}
        cy={fmt(end.y)}
        r={3}
        fill="var(--surface-card)"
        stroke="var(--accent-cyan-fg)"
        strokeWidth={2}/>
    </svg>
  );
}

export function HotRankPanel({
  events,
  heroDescription = "过去 48 小时最热的早筛竞品事件，按精选报道与讨论热度实时排序。",
  methodNote,}:{
  events:HotEvent[];
  heroDescription?: string;
  methodNote?: React.ReactNode;
}) {
  return (
    <div className="mx-auto w-[min(1120px,calc(100%_-_48px))] pb-[72px] pt-12 max-[960px]:w-[calc(100%_-_28px)] max-[960px]:pb-[88px] max-[960px]:pt-7">
      <section className="mb-8 max-w-[760px]">
        <span className={KICKER_CLASS}>MCED RADAR</span>
        <h1 className="m-0 mb-3 mt-[10px] text-[clamp(2rem,5vw,3.5rem)] font-extrabold leading-[1.12] tracking-[-0.035em] text-mc-ink max-[960px]:text-[2rem]">
          竞品热点榜
        </h1>
        <p className="m-0 max-w-[680px] text-base leading-[1.75] text-mc-ink1">
          {heroDescription}
        </p>
      </section>

      <section className="rounded-2xl border border-mc-line bg-mc-card shadow-mc-card">
        <div className="flex items-end justify-between gap-4 border-b border-mc-line-soft px-[22px] pb-4 pt-5 max-[960px]:px-4">
          <div>
            <span className={KICKER_CLASS}>NOW</span>
            <h2 className="m-0 mt-1 text-xl font-bold leading-[1.25] text-mc-ink">
              当前热点
            </h2>
          </div>
          <span className="text-xs text-mc-ink2">{events.length} 个事件</span>
        </div>

        <ol className="m-0 list-none p-0">
          {events.map((ev, i) => (
            <li
              key={ev.id}
              className="flex min-w-0 items-center gap-[14px] border-b border-mc-line-soft px-5 py-[15px] transition-[background] duration-[160ms] last:border-b-0 hover:bg-mc-surface1 max-[960px]:grid max-[960px]:grid-cols-[28px_64px_minmax(0,1fr)] max-[960px]:items-start max-[960px]:gap-x-[10px] max-[960px]:gap-y-[10px] max-[960px]:px-4"
            >
              <span
                className={`${MONO_STACK} w-7 flex-none text-[13px] font-bold ${
                  RANK_COLORS[i] ?? "text-mc-rankrest"
                }`}
              >
                {String(i + 1).padStart(2, "0")}
              </span>

              <div className="min-w-0 flex-1 max-[960px]:col-span-2">
                <div className="flex flex-wrap items-baseline gap-2">
                  <span className="font-bold leading-[1.5] text-mc-ink">
                    {ev.title}
                  </span>
                  {ev.badge ? <Badge label={ev.badge}/> :null}
                  {ev.stale ? (
                    <span
                      className="inline-block rounded-[4px] bg-[color-mix(in_srgb,var(--accent-rose)_12%,transparent)] px-[7px] py-[1px] text-[11px] font-bold leading-[1.6] whitespace-nowrap text-mc-rose-fg"
                      title="该故事线最新可推断时间早于当前监测窗口，为旧文"
                    >
                      旧 · {ev.stale}
                    </span>
                  ) :null}
                </div>
                <div className="mt-[5px] text-xs tabular-nums text-mc-ink2">
                  {ev.source} · {ev.ago}
                </div>
              </div>

              <div className="flex-none max-[960px]:col-start-2 max-[960px]:row-start-2">
                <Sparkline values={ev.spark}/>
              </div>

              <div className="min-w-[76px] flex-none text-right max-[960px]:col-start-3 max-[960px]:row-start-2">
                <span
                  className={`${MONO_STACK} text-xl font-bold leading-[1.25] tabular-nums text-mc-ink max-[960px]:text-lg`}
                >
                  {ev.heat}
                </span>
                <span className="block text-xs text-mc-ink2">热度值</span>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <p className="mx-1 mt-[18px] text-xs leading-[1.75] text-mc-ink2">
        {methodNote ?? (
          <>
            榜单热度 = 精选信源权重 + 讨论热度权重，按 24
            小时半衰期衰减；同一事件的多信源报道在榜单合并计算。标签含义：<Badge label="爆" />
            {" 短时间密集报道、"}
            <Badge label="新" />
            {" 首报 6 小时内、"}
            <Badge label="发酵中" />
            {" 信源仍在增加。演示数据，仅供设计预览。"}
          </>
        )}
      </p>
    </div>
  );
}
