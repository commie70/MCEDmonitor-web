# TimelineFeed 规格(日期分组时间线 + 卡片流 + 折叠 + 收藏态)

## 总览
- **目标文件:** `src/components/sites/aihot-virxact-com-e007b012/shared/TimelineFeed.tsx`
- **截图:** `docs/design-references/aihot-virxact-com-e007b012/root-8a5edab2/desktop-1440-full.png`(8月15日/14日分组)
- **交互模型:** 点击(日期折叠、卡片收藏——收藏态由本组件托管)
- **导出:** `export function TimelineFeed(props: TimelineFeedProps)`;"use client"

## Props
```ts
import type { DayGroupDef, NewsItem } from "./types";
interface TimelineFeedProps {
  items: NewsItem[];       // 父组件已过滤
  dayGroups: DayGroupDef[]; // 来自 data.ts 的 DAY_GROUPS
  variant: "featured" | "all";
}
```
- 内部 state: `collapsed: Record<string, boolean>`(默认全展开)、`starred: Set<string>`(收藏切换)。
- 按 dayGroups 顺序分组;组内按 time 倒序;过滤后为 0 条的组**整个不渲染**。

## DOM 结构与精确样式(桌面)
```
<div timeline>            grid, gap:22px; 自定义属性 --tl-time-w:64px; --tl-rail-w:22px; --tl-dot-top:20px
  <section day>           grid, gap:10px
    <div day-head>        grid cols [64px 22px 1fr]; position:sticky; top:0; z-index:2; background:var(--bg-0)
      <h2 date/>          右对齐 15px/800 ls -.01em text-0,文本「8月15日」
      <button toggle/>    22×22 chevron,grid-column:2,justify-self:center
      <span meta/>        11.5px text-2,文本「星期六 · 3 条」
    <div items>           relative; ::before 竖轨线
      <div item>          grid cols [64px 22px 1fr]; padding-bottom:12px(末项 0)
        <span time/>      右对齐 mono 12.5px/600 text-1 tabular-nums, padding-top:16px(dot-top − 4)
        <div rail> dot    7px 圆点,见下
        <ArticleCard/>
```
- 竖轨线(items 容器 ::before,用绝对定位 div 实现):`left:calc(64px + 11px); top:6px; bottom:6px; width:1px; background:var(--border-strong)`。
- 圆点: `position:absolute; left:50%; transform:translateX(-50%); top:20px; width:7px; height:7px; border-radius:999px; background:var(--accent-cyan)`(**若该条目 starred 则 `var(--accent-amber)`**);`box-shadow:0 0 0 3px var(--bg-0)`。
- 折叠按钮: 22×22,`border:1px solid transparent; border-radius:4px; color:var(--text-2)`;hover `color:var(--text-0); background:var(--surface-1); border-color:var(--border)`;ChevronDown 14px,`transition:transform .2s`;折叠时 `rotate(-90deg)`。aria-expanded、aria-label「收起/展开 8月15日」。
- 折叠态:items 容器 `display:none`(或条件渲染)。
- 空态(过滤后无任何条目): `padding:28px 20px; text-align:center; border:1px dashed var(--border-emphasis); border-radius:12px; background:var(--surface-0); color:var(--text-1); font-size:13px`,文本「没有匹配的动态,试试更换分类或关键词。」。

## 响应式(≤960px,max-[960px]: 变体)
- timeline gap 14px;--tl-dot-top 视觉改 16px(圆点 top 16px,time padding-top 10px)。
- day-head: cols 改 `[86px 1fr]`(64+22 合并);toggle 移到第 1 列第 1 行居中;date 移到第 2 列左对齐 `font-size:16px; font-weight:700`;meta **隐藏**。
- item: cols 不变(64/22/1fr);padding-bottom 8px。
- time: `font-size:12px; color:var(--text-2)`。
- 卡片样式由 ArticleCard 自己的移动端规则负责。

## 行为
- 折叠/展开按 date key 独立。
- 收藏切换只改本地 Set;starred 的条目圆点变琥珀色(见上),卡片收藏按钮态由 ArticleCard 处理。
- 卡片点击不跳转(演示版无详情页)。
