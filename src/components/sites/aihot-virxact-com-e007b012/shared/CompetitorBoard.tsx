"use client";

import { Fragment, useMemo, useState } from "react";
import { ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  ALL_COMPETITORS,
  ROUTE_COLORS,
  STUDY_TONE,
  type Competitor,
  type RouteKey,
  type StatusTone,} from "./competitors";

type StudyTone = (typeof STUDY_TONE)[keyof typeof STUDY_TONE];

/** 性能文本分段高亮：特异性 / 灵敏度 / TOO·CSO / 样本量 n 四色低饱和背景 */
type PerfTone = "spec" | "sens" | "too" | "n" | null;
interface PerfSeg {
  text: string;
  tone: PerfTone;
}

const PERF_KEY_RE =
  /(特异性|灵敏度|TOO\s*top[-–]?[12]?|TOO|CSO|[nN]\s*=\s*[\d,]+)/g;

function splitPerf(text: string): PerfSeg[] {
  const matches:{ index:number; keyword: string }[] = [];
  let m: RegExpExecArray | null;
  PERF_KEY_RE.lastIndex = 0;
  while ((m = PERF_KEY_RE.exec(text))) {
    matches.push({ index: m.index, keyword: m[1] });
  }
  if (!matches.length) return [{ text, tone:null }];
  const segs: PerfSeg[] = [];
  if (matches[0].index > 0)
    segs.push({ text: text.slice(0, matches[0].index), tone:null });
  matches.forEach((cur, i) => {
    const end = i + 1 < matches.length ? matches[i + 1].index : text.length;
    let seg = text.slice(cur.index, end);
    // 分隔符 / 空白移出高亮尾部
    const trail = seg.match(/[\s,;/、，；]+$/)?.[0] ?? "";
    if (trail) seg = seg.slice(0, seg.length - trail.length);
    const tone: PerfTone = cur.keyword.startsWith("特异")
      ? "spec"
      : cur.keyword.startsWith("灵敏")
        ? "sens"
        : cur.keyword.startsWith("TOO") || cur.keyword.startsWith("CSO")
          ? "too"
          : "n";
    if (seg) segs.push({ text: seg, tone });
    if (trail) segs.push({ text: trail, tone:null });
  });
  return segs;
}

const PERF_TONE_CLASS: Record<Exclude<PerfTone,null>, string> = {
  spec: "bg-[color-mix(in_srgb,var(--accent-cyan)_14%,transparent)] text-mc-cyan-fg",
  sens: "bg-[color-mix(in_srgb,var(--accent-emerald)_16%,transparent)] text-mc-emerald-fg",
  too: "bg-[color-mix(in_srgb,var(--accent-amber)_18%,transparent)] text-mc-amber-fg",n:"bg-mc-surface2 text-mc-ink1",};

function PerfText({ text }:{ text: string }) {
  return (
    <>
      {splitPerf(text).map((seg, i) =>
        seg.tone ? (
          <mark
            key={i}
            className={cn(
              "rounded-[3px] px-[3px] py-[0.5px] font-semibold",
              PERF_TONE_CLASS[seg.tone],
            )}
          >
            {seg.text}
          </mark>
        ) : (
          <Fragment key={i}>{seg.text}</Fragment>
        ),
      )}
    </>
  );
}

function PerfLegend() {
  const items:{ label: string; tone: Exclude<PerfTone,null> }[] = [
    { label: "特异性", tone: "spec" },{ label: "灵敏度", tone: "sens" },{ label: "TOO / CSO", tone: "too" },{ label: "样本量 n", tone: "n" },];
  return (
    <span className="ml-2 inline-flex flex-wrap items-center gap-[6px] align-middle">
      {items.map((it) => (
        <mark
          key={it.label}
          className={cn(
            "rounded-[3px] px-[4px] py-[0.5px] text-[10.5px] font-semibold",
            PERF_TONE_CLASS[it.tone],
          )}
        >
          {it.label}
        </mark>
      ))}
    </span>
  );
}

const ROUTE_KEYS = Object.keys(ROUTE_COLORS) as RouteKey[];

const CANCER_OPTIONS = [
  "肺",
  "肝",
  "结直肠",
  "胃",
  "食管",
  "胰腺",
  "卵巢",
  "乳腺",
  "前列腺",
  "宫颈",
  "子宫内膜",
  "胆管",
  "淋巴瘤",
  "膀胱",
  "头颈",
  "肛门",
] as const;

const STATUS_OPTIONS = [
  "NMPA III类证",
  "NMPA创新通道",
  "FDA获批",
  "FDA突破性器械",
  "CE认证",
  "LDT商业化",
  "研发或申报中",
] as const;

const MCED_VALUE = "__MCED__";

const PILL_TONE: Record<StatusTone, string> = {
  emerald:
    "bg-[color-mix(in_srgb,var(--accent-emerald)_12%,transparent)] text-mc-emerald-fg",
  cyan:"bg-[color-mix(in_srgb,var(--accent-cyan)_10%,transparent)] text-mc-cyan-fg",amber:
    "bg-[color-mix(in_srgb,var(--accent-amber)_14%,transparent)] text-mc-amber-fg",
  violet: "bg-[color-mix(in_srgb,#8f6fe0_14%,transparent)] text-[#8f6fe0]",neutral: "bg-mc-surface2 text-mc-ink1",
  muted: "bg-mc-surface1 text-mc-ink2",};

const STUDY_BADGE: Record<StudyTone, string> = {
  rose: "bg-[color-mix(in_srgb,var(--accent-rose)_10%,transparent)] text-mc-rose-fg",
  emerald: PILL_TONE.emerald,
  cyan: PILL_TONE.cyan,amber: PILL_TONE.amber,
  ink: "bg-mc-ink text-mc-page",};

const TH_CLASS =
  "sticky top-0 z-[2] bg-mc-bg1 border-b-2 border-mc-line text-left p-[12px_13px] text-[12px] text-mc-ink1 font-semibold whitespace-nowrap";

const TD_CLASS = "p-[12px_13px] align-top border-b border-mc-line";

const SELECT_CLASS =
  "min-h-[34px] rounded-lg border border-mc-line-strong bg-mc-card px-[11px] py-[7px] text-[13px] text-mc-ink1 cursor-pointer min-w-[150px]";

const GROUP_TITLE_CLASS =
  "text-[11.5px] font-semibold tracking-[0.3px] text-mc-ink1";

const SECTION_TITLE_CLASS = "text-[12.5px] font-semibold text-mc-ink mb-[11px]";

export function CompetitorBoard() {
  const [routeSel, setRouteSel] = useState<ReadonlySet<RouteKey>>(new Set());
  const [cancer, setCancer] = useState("");
  const [status, setStatus] = useState("");
  const [region, setRegion] = useState("");
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(new Set());

  const stats = useMemo(() => {
    const routes = new Set<RouteKey>();
    let mced = 0;
    let nmpa3 = 0;
    let fda = 0;
    for (const c of ALL_COMPETITORS) {
      for (const r of c.routes) routes.add(r);
      if (c.mced) mced += 1;
      if (c.hasNMPA3) nmpa3 += 1;
      if (c.hasFDA) fda+= 1;
    }
    return [
      { value: ALL_COMPETITORS.length, label: "调研企业" },{ value: mced, label: "多癌种 (MCED) 产品" },{ value: routes.size, label: "技术路线" },{ value:nmpa3, label: "NMPA III类证" },{ value: fda, label: "FDA突破性 / 获批" },];
  },[]);

  const filtered = useMemo(
    () =>
      ALL_COMPETITORS.filter((c) => {
        if (routeSel.size > 0 && !c.routes.some((r) => routeSel.has(r)))
          return false;
        if (cancer === MCED_VALUE) {
          if (!c.mced) return false;
        } else if (cancer !== "" && !c.cancers.includes(cancer)) {
          return false;
        }
        if (status !== "" && !c.statusKeys.includes(status)) return false;
        if (region !== "" && c.region !== region) return false;
        return true;
      }),
    [routeSel, cancer, status, region],
  );

  const groups = useMemo(() => {
    const foreign = filtered.filter((c) => c.region === "国外");
    const domesticSelf = filtered.filter((c) => c.region === "国内" && c.self);
    const domesticRest = filtered.filter((c) => c.region === "国内" && !c.self);
    return [
      { label: "国外", list: foreign },{ label: "国内", list: [...domesticSelf, ...domesticRest] },];
  },[filtered]);

  const toggleRoute = (k: RouteKey) => {
    setRouteSel((prev) => {
      const next = new Set(prev);
      if (next.has(k)) next.delete(k);
      else next.add(k);
      return next;
    });
  };

  const toggleRow = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const resetFilters = () => {
    setRouteSel(new Set());
    setCancer("");
    setStatus("");
    setRegion("");
  };

  const renderRow = (c: Competitor) => {
    const open = expanded.has(c.id);
    return (
      <Fragment key={c.id}>
        <tr
          className={cn(
            "cursor-pointer transition-colors hover:bg-mc-surface0",
            c.self &&
              "[background:linear-gradient(90deg,rgba(var(--theme-accent-rgb),.10),transparent_70%)]",
          )}
          onClick={() => toggleRow(c.id)}
        >
          <td className={TD_CLASS}>
            <div className="flex items-start gap-[6px]">
              <ChevronRight
                size={11}
                className={cn(
                  "mt-[3px] shrink-0 text-mc-ink2 transition-transform",
                  open && "rotate-90",
                )}/>
              <div>
                <div className="flex items-center gap-[6px]">
                  <span className="font-bold text-[13.5px] text-mc-ink">
                    {c.co}
                  </span>
                  {c.self && (
                    <span className="bg-mc-cyan text-mc-accent-contrast text-[10px] px-[7px] py-[1px] rounded-[9px] font-semibold">
                      本司
                    </span>
                  )}
                </div>
                <span className="block text-[11px] text-mc-ink1 mt-[2px]">
                  {c.en} · {c.region}
                </span>
              </div>
            </div>
          </td>
          <td className={TD_CLASS}>
            <div className="flex flex-wrap gap-[5px]">
              {c.routes.map((r) => (
                <span
                  key={r}
                  className="text-[11px] px-[8px] py-[2px] rounded-[5px] text-white font-semibold whitespace-nowrap"
                  style={{ background: ROUTE_COLORS[r] }}
                >
                  {r}
                </span>
              ))}
            </div>
          </td>
          <td className={cn(TD_CLASS, "text-[12.5px] text-mc-ink1 leading-[1.5]")}>
            {c.layout}
          </td>
          <td className={TD_CLASS}>
            <div className="flex flex-col gap-[4px]">
              {c.status.map((s) => (
                <span
                  key={`${s.label}-${s.scope}`}
                  className={cn(
                    "inline-block w-fit text-[11px] px-[8px] py-[2px] rounded-[5px] font-semibold",
                    PILL_TONE[s.tone],
                  )}
                >
                  {s.label}
                  <span className="font-normal opacity-85"> · {s.scope}</span>
                </span>
              ))}
            </div>
          </td>
          <td className={cn(TD_CLASS, "font-semibold text-mc-ink")}>
            {c.product}
          </td>
          <td className={TD_CLASS}>
            <div className="text-[12px] font-semibold text-mc-ink1 mb-[5px]">
              {c.cancerLabel}
            </div>
            <div className="flex flex-wrap gap-[5px]">
              {c.cancers.map((cc) => (
                <span
                  key={cc}
                  className="text-[11px] px-[7px] py-[2px] rounded-full bg-mc-surface2 text-mc-ink1 whitespace-nowrap"
                >
                  {cc}
                </span>
              ))}
            </div>
          </td>
          <td className={TD_CLASS}>
            <div className="text-[11.5px] text-mc-ink1 leading-[1.5]">
              {c.src}
            </div>
            <span className="block text-[11px] text-mc-ink2 mt-[3px]">
              更新：{c.updatedAt}
            </span>
          </td>
        </tr>
        {open && (
          <tr>
            <td colSpan={7} className="p-0">
              <div className="p-[16px_18px_20px] bg-mc-surface0 border-b border-mc-line">
                <div className={SECTION_TITLE_CLASS}>
                  ■ 性能(特异性 / 灵敏度 + 检出分期 + TOO)
                  <PerfLegend />
                </div>
                <div className="flex flex-col gap-[9px] mb-[14px]">
                  {c.studies.map((s, i) => (
                    <div
                      key={`${s.name}-${i}`}
                      className="flex gap-[11px] items-start bg-mc-card border border-mc-line rounded-lg p-[9px_12px]"
                    >
                      <span
                        className={cn(
                          "text-[11px] font-bold px-[9px] py-[3px] rounded-[6px] whitespace-nowrap min-w-[80px] text-center mt-[1px] shrink-0",
                          STUDY_BADGE[STUDY_TONE[s.type]],
                        )}
                      >
                        {s.type}
                      </span>
                      <div className="text-[12.5px] text-mc-ink1 leading-[1.6]">
                        <div>
                          <span className="font-bold text-mc-ink">{s.name}</span>:
                          <PerfText text={s.perf}/>
                        </div>
                        <div className="block text-[11px] text-mc-ink2 mt-[3px]">
                          入组人群 / 例数：<PerfText text={s.pop}/>
                        </div>
                        <div className="text-[11px] text-mc-ink2 mt-[2px]">
                          更新：{s.updatedAt}
                        </div>
                        {s.evidence && (
                          <div className="break-all text-[10.5px] text-mc-ink2 [font-family:ui-monospace,SFMono-Regular,Menlo,monospace] opacity-75">
                            证据：{s.evidence}
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
                <div className={SECTION_TITLE_CLASS}>■ 测序 / 技术参数</div>
                <div className="bg-mc-card border border-mc-line rounded-lg p-[9px_12px]">
                  <div className="text-[10.5px] text-mc-ink1 mb-[3px]">
                    检测平台 / panel
                  </div>
                  <div className="text-[12.5px] font-semibold text-mc-ink leading-[1.6]">
                    {c.panel}
                  </div>
                </div>
                <div className="text-[11.5px] text-mc-ink2 mt-[11px] italic">
                  研究类型可信度：病例对照(高估；即便前瞻采样也归此类)→
                  前瞻队列 / 前瞻注册 / 前瞻干预(真实场景)→ RCT(人群效果)。TOO
                  已标注 top-1 / top-2。
                </div>
              </div>
            </td>
          </tr>
        )}
      </Fragment>
    );
  };

  return (
    <div className="grid gap-[16px]">
      {/* 统计卡 strip */}
      <div className="grid grid-cols-5 max-[960px]:grid-cols-2 gap-[14px]">
        {stats.map((s) => (
          <div
            key={s.label}
            className="bg-mc-card border border-mc-line rounded-xl p-[16px_14px] text-center shadow-mc-card"
          >
            <div className="text-[30px] font-extrabold leading-none text-mc-cyan">
              {s.value}
            </div>
            <div className="mt-[7px] text-[12.5px] text-mc-ink1">{s.label}</div>
          </div>
        ))}
      </div>

      {/* 筛选卡 */}
      <div className="bg-mc-card border border-mc-line rounded-xl p-[15px_17px] flex flex-wrap gap-[22px] items-start">
        <div className="flex flex-col gap-2">
          <div className={GROUP_TITLE_CLASS}>技术路线</div>
          <div className="flex flex-wrap gap-[7px]">
            {ROUTE_KEYS.map((k) => {
              const selected = routeSel.has(k);
              const color = ROUTE_COLORS[k];
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => toggleRoute(k)}
                  className={cn(
                    "inline-flex items-center gap-[6px] rounded-full border border-mc-line-strong bg-mc-card px-[13px] py-[5px] text-[12.5px] text-mc-ink1 cursor-pointer transition select-none",
                    selected ? "font-semibold" : "hover:border-mc-emphasis",
                  )}
                  style={
                    selected
                      ? {
                          background: color,
                          borderColor: "transparent",
                          color: "#fff",}
                      : undefined
                  }
                >
                  <span
                    className="h-[9px] w-[9px] shrink-0 rounded-full"
                    style={{
                      background: selected
                        ? "rgba(255,255,255,.85)"
                        : color,}}/>
                  {k}
                </button>
              );
            })}
          </div>
        </div>
        <div className="flex flex-col gap-2">
          <div className={GROUP_TITLE_CLASS}>癌种覆盖</div>
          <select
            value={cancer}
            onChange={(e) => setCancer(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">全部</option>
            <option value={MCED_VALUE}>多癌种 (MCED)</option>
            {CANCER_OPTIONS.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <div className={GROUP_TITLE_CLASS}>报证状态</div>
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">全部</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-2">
          <div className={GROUP_TITLE_CLASS}>地区</div>
          <select
            value={region}
            onChange={(e) => setRegion(e.target.value)}
            className={SELECT_CLASS}
          >
            <option value="">全部</option>
            <option value="国外">国外</option>
            <option value="国内">国内</option>
          </select>
        </div>
        <button
          type="button"
          onClick={resetFilters}
          className="self-end rounded-lg border border-mc-line bg-mc-card px-[15px] py-[7px] text-[13px] text-mc-ink1 hover:bg-mc-surface1 transition"
        >
          清除筛选
        </button>
      </div>

      {/* 企业总表 */}
      <div className="bg-mc-card border border-mc-line rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1200px] border-collapse">
            <thead>
              <tr>
                <th className={cn(TH_CLASS, "w-[175px]")}>公司</th>
                <th className={cn(TH_CLASS, "w-[150px]")}>主力技术路线</th>
                <th className={TH_CLASS}>产品布局</th>
                <th className={cn(TH_CLASS, "w-[185px]")}>
                  报证审批进度(获批适应症)
                </th>
                <th className={cn(TH_CLASS, "w-[135px]")}>主力产品</th>
                <th className={cn(TH_CLASS, "w-[230px]")}>
                  适用概况(覆盖癌种)
                </th>
                <th className={cn(TH_CLASS, "w-[185px]")}>信源与更新</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={7}>
                    <div className="py-10 text-center text-mc-ink1">
                      无匹配企业，请调整筛选条件
                    </div>
                  </td>
                </tr>
              )}
              {groups.map(
                (g) =>
                  g.list.length > 0 && (
                    <Fragment key={g.label}>
                      <tr>
                        <td
                          colSpan={7}
                          className="bg-mc-surface2 font-bold text-[12.5px] tracking-[0.5px] text-mc-ink p-[8px_14px] border-b border-mc-line"
                        >
                          {g.label}({g.list.length})
                        </td>
                      </tr>
                      {g.list.map(renderRow)}
                    </Fragment>
                  ),
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 表后脚注 */}
      <p className="text-[11.5px] text-mc-ink1 mt-[14px] leading-[1.7]">
        性能格式：特异性 / 灵敏度(含 I 期 / 早期，进展期癌前病变),TOO 标注
        top-1 / top-2。<span className="text-mc-rose-fg">病例对照</span>
        普遍高估；前瞻『采样』不等同真实无症状筛查队列。ASCEND-2、DELFI-L101、THUNDER、PROMISE
        按病例对照归类；仅
        <span className="font-semibold">前瞻队列 / 前瞻注册 / 前瞻干预</span>与{" "}
        <span className="font-semibold">RCT</span> 可外推真实筛查。经典落差： CancerSEEK 70% → DETECT-A 27.1%;Galleri CCGA
        51.5% → 前瞻；CanScan 87.4% → 53.5%。Clear-C 可分析人数已按 MedComm
        2023 论文口径修正为 4,245。NMPA 早筛 III
        类证：常卫清(CRC)、觅小卫(胃癌)共 2 张。
      </p>
    </div>
  );
}
