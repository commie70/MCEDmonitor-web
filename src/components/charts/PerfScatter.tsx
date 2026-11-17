"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { DesignBadge } from "@/components/ui";
import type { StudyDesign } from "@/data/types";
import { useElementWidth } from "@/hooks/use-element-width";
import { cn } from "@/lib/utils";
import { textWidth } from "./text";

export interface PerfPoint {
  id: string;
  company: string;
  product: string;
  self: boolean;
  design: StudyDesign;
  prospective: boolean;
  name: string;
  spec: number;
  sens: number;
  n?: number;
  /** 直接标注在图上(前瞻 MCED 与本司)，其余靠悬停读数与下方表格 */
  label?: string;
}

/** 横轴按假阳性率(100 − 特异性)取对数：MCED 的 97–99.7% 才不会挤成一条线。 */
const FPR_MIN = 0.2;
const FPR_MAX = 50;
const SPEC_TICKS = [50, 80, 90, 95, 98, 99, 99.5];
const SENS_TICKS = [0, 20, 40, 60, 80, 100];

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

type Anchor = "start" | "middle" | "end";

/** 按容器的实际宽度定图面：宽屏上图要占满版面，窄屏上保持可读的高度。 */
function layout(width: number) {
  const compact = width < 560;
  const height = Math.round(Math.min(680, Math.max(compact ? 340 : 440, width * 0.5)));
  const margin = { top: 18, right: compact ? 14 : 28, bottom: compact ? 44 : 52, left: compact ? 50 : 60 };
  const plotW = width - margin.left - margin.right;
  const plotH = height - margin.top - margin.bottom;
  const xOf = (spec: number) => {
    const fpr = Math.min(FPR_MAX, Math.max(FPR_MIN, 100 - spec));
    const t = (Math.log(FPR_MAX) - Math.log(fpr)) / (Math.log(FPR_MAX) - Math.log(FPR_MIN));
    return margin.left + t * plotW;
  };
  const yOf = (sens: number) => margin.top + (1 - Math.min(100, Math.max(0, sens)) / 100) * plotH;
  return {
    width,
    height,
    margin,
    plotW,
    plotH,
    xOf,
    yOf,
    tick: compact ? 11 : 13,
    label: compact ? 11.5 : 13,
    radius: compact ? 5.5 : 7,
  };
}

type Layout = ReturnType<typeof layout>;

function overlap(a: Box, b: Box): number {
  const w = Math.min(a.x + a.w, b.x + b.w) - Math.max(a.x, b.x);
  const h = Math.min(a.y + a.h, b.y + b.h) - Math.max(a.y, b.y);
  return w > 0 && h > 0 ? w * h : 0;
}

/**
 * 标签避让：依次尝试标记的右、左、上、下四个位置，
 * 取与其他标记、已放置标签重叠最少且不出图的那个。
 * 四个位置都压到别的标签或标记时，这个标签不画(本司除外)——窄屏上宁可少标，
 * 读数仍可点按标记或看下方研究表。
 */
function placeLabels(points: PerfPoint[], chart: Layout) {
  const { xOf, yOf, margin, width, height, radius } = chart;
  const lineHeight = chart.label + 3;
  const gap = radius + 5;
  const marks = points.map((point) => ({
    id: point.id,
    box: { x: xOf(point.spec) - radius - 2, y: yOf(point.sens) - radius - 2, w: radius * 2 + 4, h: radius * 2 + 4 },
  }));
  const placed: Box[] = [];
  const out = new Map<string, { x: number; y: number; anchor: Anchor }>();
  // 本司先占位，其余自上而下
  const labeled = points
    .filter((point) => point.label)
    .sort((a, b) => Number(b.self) - Number(a.self) || yOf(a.sens) - yOf(b.sens));
  for (const point of labeled) {
    const w = textWidth(point.label ?? "", chart.label);
    const px = xOf(point.spec);
    const py = yOf(point.sens);
    const baseline = chart.label * 0.36;
    const candidates: { x: number; y: number; anchor: Anchor; box: Box }[] = [
      { x: px + gap, y: py + baseline, anchor: "start", box: { x: px + gap, y: py - lineHeight / 2, w, h: lineHeight } },
      { x: px - gap, y: py + baseline, anchor: "end", box: { x: px - gap - w, y: py - lineHeight / 2, w, h: lineHeight } },
      { x: px, y: py - gap, anchor: "middle", box: { x: px - w / 2, y: py - gap - lineHeight + 3, w, h: lineHeight } },
      { x: px, y: py + gap + chart.label * 0.8, anchor: "middle", box: { x: px - w / 2, y: py + gap - 2, w, h: lineHeight } },
    ];
    let best = candidates[0];
    let bestCost = Number.POSITIVE_INFINITY;
    for (const candidate of candidates) {
      const { box } = candidate;
      const outside =
        box.x < margin.left || box.x + box.w > width - 2 || box.y < 0 || box.y + box.h > height - margin.bottom
          ? 10_000
          : 0;
      const cost =
        outside +
        placed.reduce((total, other) => total + overlap(box, other), 0) +
        marks.reduce((total, mark) => total + (mark.id === point.id ? 0 : overlap(box, mark.box)), 0);
      if (cost < bestCost) {
        best = candidate;
        bestCost = cost;
      }
      if (cost === 0) break;
    }
    if (!point.self && bestCost > best.box.w * best.box.h * 0.12) continue;
    placed.push(best.box);
    out.set(point.id, { x: best.x, y: best.y, anchor: best.anchor });
  }
  return out;
}

export function PerfScatter({ points }: { points: PerfPoint[] }) {
  const router = useRouter();
  const [ref, width] = useElementWidth<HTMLDivElement>(1100);
  const [activeId, setActiveId] = useState<string | null>(null);
  const active = points.find((point) => point.id === activeId) ?? null;
  const chart = layout(width);
  const { xOf, yOf, margin, height, plotW, plotH, radius } = chart;
  const labels = placeLabels(points, chart);
  // 病例对照先画，前瞻与本司压在上层
  const ordered = [...points].sort(
    (a, b) => Number(a.prospective) - Number(b.prospective) || Number(a.self) - Number(b.self)
  );

  return (
    <figure>
      <div className="mb-3 flex flex-wrap items-center gap-x-6 gap-y-1 text-[13px] text-ink-2">
        <span className="inline-flex items-center gap-[7px]">
          <svg viewBox="0 0 14 14" className="size-[14px]" aria-hidden>
            <circle cx="7" cy="7" r="6" className="fill-mark" />
          </svg>
          前瞻 / RCT
        </span>
        <span className="inline-flex items-center gap-[7px]">
          <svg viewBox="0 0 14 14" className="size-[14px]" aria-hidden>
            <circle cx="7" cy="7" r="5" strokeWidth="1.8" className="fill-panel stroke-ink-3" />
          </svg>
          病例对照
        </span>
        <span className="inline-flex items-center gap-[7px]">
          <svg viewBox="0 0 14 14" className="size-[14px]" aria-hidden>
            <circle cx="7" cy="7" r="6" className="fill-mark-self" />
          </svg>
          世和基因
        </span>
      </div>

      {/* 预留图面高度：首帧按回退宽度绘制，实测后换成真实尺寸，下方内容不跟着跳 */}
      <div ref={ref} className="min-h-[340px] sm:min-h-[440px]">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          role="img"
          aria-label="各研究的灵敏度与特异性散点图；数值见下方研究表"
          className="block h-auto w-full"
          onPointerLeave={() => setActiveId(null)}
        >
          {SENS_TICKS.map((tick) => (
            <g key={`y${tick}`}>
              <line x1={margin.left} x2={width - margin.right} y1={yOf(tick)} y2={yOf(tick)} strokeWidth="1" className="stroke-line" />
              <text x={margin.left - 10} y={yOf(tick) + chart.tick * 0.36} textAnchor="end" fontSize={chart.tick} className="fill-ink-3">
                {tick}
              </text>
            </g>
          ))}
          {SPEC_TICKS.map((tick) => (
            <g key={`x${tick}`}>
              <line x1={xOf(tick)} x2={xOf(tick)} y1={margin.top} y2={height - margin.bottom} strokeWidth="1" className="stroke-line" />
              <text x={xOf(tick)} y={height - margin.bottom + chart.tick + 7} textAnchor="middle" fontSize={chart.tick} className="fill-ink-3">
                {tick}
              </text>
            </g>
          ))}
          <text x={margin.left + plotW / 2} y={height - 6} textAnchor="middle" fontSize={chart.label} className="fill-ink-2">
            特异性 %
          </text>
          <text
            x={14}
            y={margin.top + plotH / 2}
            textAnchor="middle"
            transform={`rotate(-90 14 ${margin.top + plotH / 2})`}
            fontSize={chart.label}
            className="fill-ink-2"
          >
            灵敏度 %
          </text>

          {ordered.map((point) => {
            const cx = xOf(point.spec);
            const cy = yOf(point.sens);
            const isActive = point.id === activeId;
            return (
              <g
                key={point.id}
                role="link"
                tabIndex={0}
                aria-label={`${point.company} ${point.name}：特异性 ${point.spec}%，灵敏度 ${point.sens}%`}
                className="cursor-pointer outline-none"
                onPointerEnter={() => setActiveId(point.id)}
                onFocus={() => setActiveId(point.id)}
                onBlur={() => setActiveId(null)}
                onClick={() => router.push(`/studies/${point.id}`)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") router.push(`/studies/${point.id}`);
                }}
              >
                <circle cx={cx} cy={cy} r={radius + 8} fill="transparent" />
                {isActive && <circle cx={cx} cy={cy} r={radius + 4.5} strokeWidth="1.6" className="fill-none stroke-ink" />}
                <circle
                  cx={cx}
                  cy={cy}
                  r={point.prospective ? radius : radius - 1}
                  strokeWidth={point.prospective ? 2 : 1.9}
                  className={cn(
                    point.prospective
                      ? cn("stroke-panel", point.self ? "fill-mark-self" : "fill-mark")
                      : cn("fill-panel", point.self ? "stroke-mark-self" : "stroke-ink-3")
                  )}
                />
              </g>
            );
          })}

          {points.map((point) => {
            const spot = labels.get(point.id);
            if (!spot || !point.label) return null;
            return (
              <text
                key={`l-${point.id}`}
                x={spot.x}
                y={spot.y}
                textAnchor={spot.anchor}
                fontSize={chart.label}
                className={cn("pointer-events-none", point.self ? "fill-ink font-semibold" : "fill-ink-2")}
              >
                {point.label}
              </text>
            );
          })}
        </svg>
      </div>

      <figcaption aria-live="polite" className="mt-2 flex min-h-[30px] flex-wrap items-center gap-x-3 gap-y-1 text-[13.5px]">
        {active && (
          <>
            <DesignBadge design={active.design} />
            <span className="font-semibold text-ink">
              {active.company} · {active.product}
            </span>
            <span className="text-ink-2">{active.name}</span>
            <span className="tabular-nums text-ink">
              特异性 {active.spec}% · 灵敏度 {active.sens}%
              {active.n ? ` · n=${active.n.toLocaleString("en-US")}` : ""}
            </span>
          </>
        )}
      </figcaption>
    </figure>
  );
}
