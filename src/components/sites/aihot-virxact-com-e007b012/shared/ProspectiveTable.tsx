"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  PF1,
  PF1_STAGES,
  PF1_TOT,
  PROS_TIER_ORDER,
  PROSPECTIVE,
  ROUTE_COLORS,
  studyEvidenceHref,} from "./competitors";
import type { Pf1Cell, ProspectiveRow } from "./competitors";

type SegKey = "all" | "mced" | "single";
type SortKey = "spec" | "sens";
type SortState = { key: SortKey; dir: "desc" | "asc" } | null;

const SEGMENTS:{ key: SegKey; label: string }[] = [
  { key: "all", label: "全部" },{ key: "mced", label: "只看 MCED" },{ key: "single", label: "只看单癌种" },];

/** 研究类型徽章色调 */
const TYPE_BADGE: Record<ProspectiveRow["type"], string> = {
  RCT: "bg-mc-ink text-mc-page","前瞻队列": "bg-[color-mix(in_srgb,var(--accent-emerald)_12%,transparent)] text-mc-emerald-fg","前瞻注册": "bg-[color-mix(in_srgb,var(--accent-cyan)_10%,transparent)] text-mc-cyan-fg",
  "前瞻 + 回顾注册汇总":
    "bg-[color-mix(in_srgb,var(--accent-cyan)_10%,transparent)] text-mc-cyan-fg","前瞻干预": "bg-[color-mix(in_srgb,var(--accent-amber)_14%,transparent)] text-mc-amber-fg",};

const TH_BASE =
  "sticky top-0 z-[2] bg-mc-bg1 border-b-2 border-mc-line text-left p-[11px_12px] text-[11.5px] text-mc-ink1 font-semibold whitespace-nowrap";

/** 取字符串第一个数字("85–96%"→85,"—"→-1) */
function firstNum(s: string):number {
  const m = s.match(/\d+(?:\.\d+)?/);
  return m ? parseFloat(m[0]) : -1;
}

function clampPct(pct:number):number {
  return Math.min(100, Math.max(0,pct));
}

function SubNote({ text }:{ text?: string }) {
  if (!text) return null;
  return (
    <span className="block text-[10.5px] font-normal text-mc-ink2 mt-[2px] whitespace-normal max-w-[165px] leading-[1.45]">
      {text}
    </span>
  );
}

function ValueCell({ value, sub }:{ value: string; sub?: string }) {
  return (
    <>
      <span
        className={
          value === "—"
            ? "font-bold text-mc-ink2/50"
            : "font-bold text-mc-ink whitespace-nowrap"
        }
      >
        {value}
      </span>
      <SubNote text={sub}/>
    </>
  );
}

function Pf1Td({ cell, total }:{ cell: Pf1Cell; total?: boolean }) {
  if (!cell) {
    return (
      <td
        className={cn(
          "bg-mc-surface2 rounded-[4px]",
          total && "border-t-2 border-mc-line-strong"
        )}/>
    );
  }
  const [pct, frac] = cell;
  const main = Number.isInteger(pct) ? String(pct) :pct.toFixed(1);
  return (
    <td
      className={cn(
        "text-center p-[3px_6px] rounded-[4px] min-w-[54px] leading-[1.25]",
        total && "border-t-2 border-mc-line-strong"
      )}
      style={{ background: `hsl(${clampPct(pct) * 1.3}, 68%,87%)` }}
    >
      <span className="font-bold text-[11px] text-[#1f2a37]">{main}%</span>
      <span className="block text-[9px] text-[#5b6472] opacity-80">{frac}</span>
    </td>
  );
}

function Pf1Detail() {
  return (
    <tr>
      <td colSpan={10} className="bg-mc-bg1 p-[14px_16px_16px]">
        <p className="text-[12px] text-mc-ink1 mb-[10px] leading-[1.6]">
          柳叶刀 2023 附录 Table S8，按癌症条目级(36 检出 / 122 总)。
          <span className="font-bold text-mc-rose-fg">
            分期断崖： I 期 16.3% → IV 期 75%
          </span>
          ；总体 29.5% 被淋巴瘤(63%)、华氏巨球(100%)等血液 / 淋巴系统拉高，而高发实体瘤
          乳腺 22.7%、前列腺 10%、肺 9.1% 在早期几乎不可检出。行按癌种 n 降序。
        </p>
        <div className="overflow-x-auto">
          <table className="border-separate border-spacing-[2px] text-[11px]">
            <thead>
              <tr>
                <th className="bg-[#135e6b] text-white font-semibold p-[5px_7px] whitespace-nowrap rounded-[4px] text-[10.5px] text-left min-w-[118px]">
                  癌种
                </th>
                {PF1_STAGES.map((s) => (
                  <th
                    key={s}
                    className="bg-[#135e6b] text-white font-semibold p-[5px_7px] whitespace-nowrap rounded-[4px] text-[10.5px]"
                  >
                    {s}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {PF1.map((row) => (
                <tr key={row.c}>
                  <td className="text-left font-semibold text-mc-ink p-[4px_8px] whitespace-nowrap">
                    {row.c}
                    <span className="text-mc-ink2 font-normal text-[10px] ml-[4px]">
                      n={row.n}
                    </span>
                  </td>
                  {row.r.map((cell, i) => (
                    <Pf1Td key={i} cell={cell}/>
                  ))}
                </tr>
              ))}
              <tr className="font-bold">
                <td className="bg-mc-surface2 text-left p-[4px_8px] whitespace-nowrap rounded-[4px] border-t-2 border-mc-line-strong">
                  总计(条目级)
                </td>
                {PF1_TOT.map((cell, i) => (
                  <Pf1Td key={i} cell={cell} total />
                ))}
              </tr>
            </tbody>
          </table>
        </div>
      </td>
    </tr>
  );
}

export function ProspectiveTable() {
  const [seg, setSeg] = useState<SegKey>("all");
  const [sort, setSort] = useState<SortState>(null);
  const [pf1Open, setPf1Open] = useState(false);

  const filtered = useMemo(
    () =>
      PROSPECTIVE.filter((r) =>
        seg === "all" ? true : seg === "mced" ? r.mced : !r.mced
      ),
    [seg]
  );

  /** 默认序：按 PROS_TIER_ORDER 分组，组内 self 排最前，其余按原序 */
  const groups = useMemo(
    () =>
      PROS_TIER_ORDER.map((tier) => {
        const rows = filtered.filter((r) => r.type === tier);
        return {
          tier,
          rows: [...rows.filter((r) => r.self), ...rows.filter((r) => !r.self)],};
      }).filter((g) => g.rows.length > 0),
    [filtered]
  );

  /** 排序激活时不分组、平铺排序；-1(—)恒排最后 */
  const sortedRows = useMemo(() => {
    if (!sort) return null;
    const sign = sort.dir === "desc" ? -1 : 1;
    return [...filtered].sort((a, b) => {
      const va = firstNum(a[sort.key]);
      const vb = firstNum(b[sort.key]);
      if (va === -1 && vb === -1) return 0;
      if (va === -1) return 1;
      if (vb === -1) return -1;
      return (va - vb) * sign;
    });
  },[filtered, sort]);

  function toggleSort(key: SortKey) {
    setSort((prev) => {
      if (!prev || prev.key !== key) return { key, dir: "desc" };
      if (prev.dir === "desc") return { key, dir: "asc" };
      return null;
    });
  }

  function renderSortableTh(label: string, key: SortKey) {
    const active = sort?.key === key;
    return (
      <th
        className={cn(TH_BASE, "cursor-pointer select-none")}
        onClick={() => toggleSort(key)}
      >
        {label}
        <span
          className={cn(
            "text-[9px] ml-[3px]",active ? "text-mc-cyan" : "text-mc-ink2/70"
          )}
        >
          {active ? (sort.dir === "desc" ? "▼" : "▲") : "⇅"}
        </span>
      </th>
    );
  }

  function renderRow(r: ProspectiveRow, idx:number) {
    const hasDetail = r.detail === "pf1";
    const sensNum = firstNum(r.sens);
    return (
      <Fragment key={`${r.co}-${r.study}-${idx}`}>
        <tr
          className={cn(
            "hover:bg-mc-surface0",
            hasDetail && "cursor-pointer",
            r.self &&
              "[background:linear-gradient(90deg,rgba(var(--theme-accent-rgb),.10),transparent_70%)]"
          )}
          onClick={hasDetail ? () => setPf1Open((v) => !v) : undefined}
        >
          <td className="p-[10px_12px] align-top">
            <div className="flex items-start gap-[2px]">
              {hasDetail && (
                <ChevronRight
                  size={11}
                  className={cn(
                    "text-mc-ink2 transition mt-[3px] shrink-0",pf1Open && "rotate-90"
                  )}/>
              )}
              <div>
                <span className="font-bold text-mc-ink">{r.co}</span>
                {r.self && (
                  <span className="bg-mc-cyan text-mc-accent-contrast text-[10px] px-[7px] py-[1px] rounded-[9px] font-semibold ml-[6px]">
                    本司
                  </span>
                )}
                <span className="block text-[11px] font-normal text-mc-ink1 mt-[2px]">
                  {r.prod}
                </span>
              </div>
            </div>
          </td>
          <td className="p-[10px_12px] align-top">
            <span
              className={cn(
                "inline-block text-[10.5px] font-bold px-[8px] py-[2px] rounded-[6px] whitespace-nowrap",
                TYPE_BADGE[r.type]
              )}
            >
              {r.type}
            </span>
            <span className="block text-[10.5px] font-normal text-mc-ink2 mt-[4px] max-w-[165px] whitespace-normal leading-[1.45]">
              {r.study}
            </span>
            {r.evidenceRef && (
              <Link
                href={studyEvidenceHref(r.evidenceRef)}
                onClick={(event) => event.stopPropagation()}
                className="mt-[5px] inline-flex text-[10.5px] font-semibold text-mc-cyan-fg hover:underline"
              >
                打开证据
              </Link>
            )}
          </td>
          <td className="p-[10px_12px] align-top">
            {r.mced ? (
              <span
                className="inline-block text-[10px] font-bold text-white px-[7px] py-[1px] rounded-[9px] mr-[5px]"
                style={{ background: "#8b5cf6" }}
              >
                MCED
              </span>
            ) : (
              <span className="inline-block text-[10px] font-bold bg-mc-surface2 text-mc-ink1 px-[7px] py-[1px] rounded-[9px] mr-[5px]">
                单癌
              </span>
            )}
            <span className="text-[11.5px] text-mc-ink1">{r.canc}</span>
          </td>
          <td className="p-[10px_12px] align-top">
            {r.route.length > 0 ? (
              <div className="flex flex-wrap gap-[4px]">
                {r.route.map((rt) => (
                  <span
                    key={rt}
                    className="text-[10.5px] px-[7px] py-[2px] rounded-[5px] text-white font-semibold whitespace-nowrap"
                    style={{ background: ROUTE_COLORS[rt] }}
                  >
                    {rt}
                  </span>
                ))}
              </div>
            ) : (
              <span className="text-mc-ink2/50">—</span>
            )}
          </td>
          <td className="p-[10px_12px] align-top">
            <span className="text-[11.5px] text-mc-ink1 max-w-[235px] leading-[1.5] block">
              {r.pop}
            </span>
          </td>
          <td className="p-[10px_12px] align-top">
            <ValueCell value={r.spec} sub={r.specSub}/>
          </td>
          <td className="p-[10px_12px] align-top">
            <span
              className={
                r.sens === "—"
                  ? "font-bold text-mc-ink2/50"
                  : "font-bold text-mc-ink whitespace-nowrap"
              }
            >
              {r.sens}
            </span>
            {sensNum >= 0 && (
              <div className="h-[5px] rounded-[3px] bg-mc-surface2 mt-[5px] max-w-[115px] overflow-hidden">
                <div
                  style={{
                    display: "block",
                    height: "100%",
                    borderRadius: 3,
                    width: `${clampPct(sensNum)}%`,
                    background: "linear-gradient(90deg,#3b6fb6,#168f80)",}}/>
              </div>
            )}
            <SubNote text={r.sensSub}/>
          </td>
          <td className="p-[10px_12px] align-top">
            <ValueCell value={r.early} sub={r.earlySub}/>
          </td>
          <td className="p-[10px_12px] align-top">
            <ValueCell value={r.too} sub={r.tooSub}/>
          </td>
          <td className="p-[10px_12px] align-top">
            <span className="text-[11px] text-mc-ink2 whitespace-nowrap">
              {r.updatedAt}
            </span>
          </td>
        </tr>
        {hasDetail && pf1Open && <Pf1Detail />}
      </Fragment>
    );
  }

  return (
    <div className="mt-[30px]">
      <div className="flex items-baseline gap-[12px] flex-wrap">
        <h2 className="text-[18px] font-extrabold text-mc-ink">
          前瞻与注册研究性能对照
        </h2>
        <span className="text-[11.5px] font-semibold px-[10px] py-[2px] rounded-[9px] bg-mc-bg2 text-mc-ink1">
          真实筛查、注册与干预场景 · 按研究定义解读
        </span>
      </div>
      <p className="text-[12.5px] text-mc-ink1 mt-[6px] mb-[13px] leading-[1.6]">
        收录前瞻队列、注册研究、前瞻干预和 RCT；混合注册汇总单独标记。
        各研究的人群、终点与性能分母不同，不能把有症状转诊、无症状筛查、RCT stage shift
        和病例富集的注册汇总直接横向排名。早期 / 癌前列保留原研究定义，TOO 标注 top-1 或 top-2。
      </p>

      <div className="flex gap-[18px] items-center flex-wrap mb-[12px]">
        <div className="inline-flex border border-mc-line rounded-[9px] overflow-hidden bg-mc-card">
          {SEGMENTS.map((s) => (
            <button
              key={s.key}
              type="button"
              onClick={() => setSeg(s.key)}
              className={cn(
                "px-[15px] py-[7px] text-[12.5px] text-mc-ink1 border-r border-mc-line last:border-r-0 transition cursor-pointer",
                seg === s.key && "bg-mc-bg2 text-mc-ink font-semibold"
              )}
            >
              {s.label}
            </button>
          ))}
        </div>
        <span className="text-[11.5px] text-mc-ink2">
          仅可按整体特异性与整体灵敏度排序；定义不一的早期 / 癌前和 TOO 指标不排序
        </span>
      </div>

      <div className="bg-mc-card border border-mc-line rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] border-collapse">
            <thead>
              <tr>
                <th className={TH_BASE}>公司(产品)</th>
                <th className={TH_BASE}>研究</th>
                <th className={TH_BASE}>覆盖</th>
                <th className={TH_BASE}>路线</th>
                <th className={TH_BASE}>入组人群·例数</th>
                {renderSortableTh("特异性", "spec")}
                {renderSortableTh("灵敏度", "sens")}
                <th className={TH_BASE}>早期 / 癌前指标</th>
                <th className={TH_BASE}>TOO</th>
                <th className={TH_BASE}>更新</th>
              </tr>
            </thead>
            <tbody>
              {sortedRows
                ? sortedRows.map((r, i) => renderRow(r, i))
                : groups.map((g) => (
                    <Fragment key={g.tier}>
                      <tr>
                        <td
                          colSpan={10}
                          className="bg-mc-surface2 font-bold text-[12px] tracking-[0.4px] text-mc-ink p-[7px_13px]"
                        >
                          {g.tier}({g.rows.length})
                        </td>
                      </tr>
                      {g.rows.map((r, i) => renderRow(r, i))}
                    </Fragment>
                  ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="text-[11.5px] text-mc-ink1 mt-[13px] leading-[1.7]">
        口径说明：特异性 / 灵敏度可能为 episode、个体或人口校正口径，以每行副注和证据页为准；
        “早期 / 癌前”可能表示 I 期灵敏度、stage 0/I、进展期癌前病变灵敏度或检出病例的分期构成，故不排序。
        SYMPLIFY 为有症状转诊人群；NHS-Galleri 的 stage shift 是人群效果终点；二者均不能与无症状单臂筛查直接比较。
      </p>
    </div>
  );
}
