"use client";

import Link from "next/link";
import { useElementWidth } from "@/hooks/use-element-width";
import { cn } from "@/lib/utils";
import { fitText, textWidth } from "./text";

export interface GapPoint {
  id: string;
  name: string;
  prospective: boolean;
  sens: number;
}

export interface GapRow {
  product: string;
  company: string;
  self: boolean;
  mced: boolean;
  points: GapPoint[];
}

const TICKS = [0, 20, 40, 60, 80, 100];

/**
 * 证据落差：同一产品从病例对照(空心)到前瞻真实筛查(实心)的灵敏度。
 * 只标注两端——病例对照值与最近一次前瞻值；中间各点悬停可见，数值也在下方研究表中。
 * 按容器实际宽度绘制：标签列宽取自最长的产品名，行高与字号不随容器缩放。
 */
export function EvidenceGap({ rows }: { rows: GapRow[] }) {
  const [ref, width] = useElementWidth<HTMLDivElement>(1100);
  const compact = width < 560;
  const nameSize = compact ? 13 : 15;
  const subSize = compact ? 11 : 12.5;
  const valueSize = compact ? 12.5 : 14;
  const tickSize = compact ? 11 : 13;
  const radius = compact ? 5.5 : 7;
  const rowHeight = compact ? 54 : 68;
  const top = tickSize + 18;
  const right = compact ? 18 : 32;
  const widest = Math.max(
    ...rows.map((row) => Math.max(textWidth(row.product, nameSize) * 1.06, textWidth(row.company, subSize)))
  );
  const left = Math.round(Math.min(widest + 26, width * (compact ? 0.4 : 0.26)));
  const height = top + rows.length * rowHeight + 6;
  const xOf = (value: number) => left + (Math.min(100, Math.max(0, value)) / 100) * (width - left - right);

  return (
    <div ref={ref}>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label="同一产品病例对照与前瞻研究的灵敏度落差"
        className="block h-auto w-full"
      >
        {TICKS.map((tick) => (
          <g key={tick}>
            <line x1={xOf(tick)} x2={xOf(tick)} y1={top - 6} y2={height - 4} strokeWidth="1" className="stroke-line" />
            <text x={xOf(tick)} y={tickSize} textAnchor="middle" fontSize={tickSize} className="fill-ink-3">
              {tick}
            </text>
          </g>
        ))}
        {rows.map((row, index) => {
          const y = top + index * rowHeight + rowHeight / 2;
          const values = row.points.map((point) => point.sens);
          const first = row.points.find((point) => !point.prospective);
          const last = [...row.points].reverse().find((point) => point.prospective);
          // 两端数值挨得太近时，病例对照值改标在线下方，避免两个数字叠在一起。
          const crowded = Boolean(first && last && Math.abs(xOf(first.sens) - xOf(last.sens)) < valueSize * 3.2);
          return (
            <g key={row.product}>
              {index > 0 && (
                <line x1={0} x2={width} y1={y - rowHeight / 2} y2={y - rowHeight / 2} strokeWidth="1" className="stroke-line" />
              )}
              <text
                x={left - 16}
                y={y - 2}
                textAnchor="end"
                fontSize={nameSize}
                className={cn("font-semibold", row.self ? "fill-self" : "fill-ink")}
              >
                {fitText(row.product, left - 22, nameSize * 1.06)}
              </text>
              <text x={left - 16} y={y + subSize + 4} textAnchor="end" fontSize={subSize} className="fill-ink-3">
                {fitText(row.company, left - 22, subSize)}
              </text>
              <line
                x1={xOf(Math.min(...values))}
                x2={xOf(Math.max(...values))}
                y1={y}
                y2={y}
                strokeWidth="3"
                strokeLinecap="round"
                className="stroke-line-strong"
              />
              {row.points.map((point) => (
                <Link key={point.id} href={`/studies/${point.id}`} aria-label={`${point.name}：灵敏度 ${point.sens}%`}>
                  <title>{`${point.name} · 灵敏度 ${point.sens}%`}</title>
                  <circle cx={xOf(point.sens)} cy={y} r={radius + 8} fill="transparent" />
                  <circle
                    cx={xOf(point.sens)}
                    cy={y}
                    r={point.prospective ? radius : radius - 1}
                    strokeWidth={point.prospective ? 2 : 1.9}
                    className={
                      point.prospective
                        ? cn("stroke-panel", row.self ? "fill-mark-self" : "fill-mark")
                        : cn("fill-panel", row.self ? "stroke-mark-self" : "stroke-ink-3")
                    }
                  />
                </Link>
              ))}
              {first && (
                <text
                  x={xOf(first.sens)}
                  y={crowded ? y + radius + valueSize + 3 : y - radius - 7}
                  textAnchor="middle"
                  fontSize={valueSize}
                  className="fill-ink-3 tabular-nums"
                >
                  {first.sens}
                </text>
              )}
              {last && (
                <text
                  x={xOf(last.sens)}
                  y={y - radius - 7}
                  textAnchor="middle"
                  fontSize={valueSize + 1}
                  className="fill-ink font-bold tabular-nums"
                >
                  {last.sens}
                </text>
              )}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
