# FeedHeader 规格(页面头 + 分类 pills + 搜索 + 可选来源下拉)

## 总览
- **目标文件:** `src/components/sites/aihot-virxact-com-e007b012/shared/FeedHeader.tsx`
- **截图:** `docs/design-references/aihot-virxact-com-e007b012/root-8a5edab2/desktop-1440-full.png`(顶部区)、`.../all-a0f25776/desktop-1440-full.png`(带来源下拉)
- **交互模型:** 点击(pills/按钮)+ 输入(搜索框)
- **导出:** `export function FeedHeader(props: FeedHeaderProps)`;"use client"

## Props
```ts
interface FeedHeaderProps {
  title: string;            // 「精选」/「全部动态」
  subtitle: string;         // 「2026年8月15日星期六 · 今日竞品重点动态」
  categories: { key: string; label: string }[];  // 不含「全部」
  activeCategory: string;   // "all" 或 CategoryKey
  onCategoryChange: (key: string) => void;
  searchValue: string;
  onSearchChange: (v: string) => void;
  /** /all 页传入则显示来源下拉 */
  sourceTypes?: { key: string; label: string }[];
  activeSourceType?: string;
  onSourceTypeChange?: (key: string) => void;
}
```

## DOM 结构与精确样式
```
<header class="pt-[6px]">
  <div> flex 行(title+subtitle 在左)  <!-- 原站 header-row -->
  <hr/>  分隔线
  <div> 工具行: <nav> pills </nav>  <form> [select] + search </form>
</header>
```
- h1: `margin:0; font-size:23px; font-weight:700; letter-spacing:-.01em; line-height:1.2; color:var(--text-0)`。
- subtitle: `font-size:12px; margin-top:5px; line-height:1.6; color:var(--text-2)`。
- 分隔线: `border-top:1px solid var(--border-soft); margin:10px 0 8px`(border-0 其余边)。
- 工具行: `display:flex; align-items:center; flex-wrap:wrap; gap:8px 12px`。
- **分类 pills**(`<nav>` inline-flex,`gap:22px; border-bottom:1px solid var(--border-soft)`):首项「全部」(key "all")+ categories 顺序渲染为 `<button type="button">`:
  - item: `padding:7px 1px 9px; font-size:13px; line-height:1; color:var(--text-1); transition:color .12s,box-shadow .12s`
  - hover: `color:var(--text-0)`
  - active: `color:var(--accent-cyan-fg); font-weight:600; box-shadow:inset 0 -2px 0 var(--accent-cyan)`
- **搜索表单**: `margin-left:auto; display:flex; align-items:center; gap:6px`,onSubmit preventDefault 后无需动作(父组件已实时过滤)。
  - input(type="search"): `min-height:34px; padding:6px 12px; border-radius:8px; border:1px solid var(--border-strong); background:var(--surface-0); color:var(--text-1); font-size:12.5px; outline:none; width:180px`(flex `0 1 180px`,min-width 100px);placeholder「搜索标题、摘要…」`color:var(--text-2)`;focus: `border-color:rgba(var(--theme-accent-rgb),.3); background:var(--surface-2); box-shadow:0 0 0 3px rgba(var(--theme-accent-rgb),.12)`。
  - 提交按钮: `min-height:34px; padding:5px 16px; border-radius:8px; border:1px solid var(--theme-accent); background:var(--theme-accent); color:var(--theme-accent-contrast); font-size:13px; font-weight:600`;hover `background:var(--theme-accent-hover)`;active `scale(.98)`。文本「搜索」。
- **来源下拉**(仅传入 sourceTypes 时):容器 `position:relative; width:128px`;`<select>`: `width:100%; min-height:38px; padding:8px 36px 8px 12px; appearance:none; border-radius:8px; border:1px solid var(--border-strong); background:var(--surface-card); color:var(--text-1); font-size:12.5px; cursor:pointer`;右侧 ChevronDown 图标 14px 绝对定位 right 12px 垂直居中 `color:var(--text-2)`;非 "all" 选中态: `border-color:rgba(var(--theme-accent-rgb),.42); background:rgba(var(--theme-accent-rgb),.08); color:var(--accent-cyan-fg); font-weight:600`。

## 响应式(≤960px)
- h1 改 `font-size:21px`;工具行改为整行:pills 容器 `width:100%; overflow-x:auto; flex-wrap:nowrap; scrollbar-width:none; padding:0 18px 2px; margin:0 -18px; mask-image:linear-gradient(90deg,transparent,#000 18px,#000 calc(100% - 32px),transparent)`,各 pill `flex-shrink:0`。
- 搜索表单整行:`margin-left:0; width:100%`,input `flex:1`。
- 实现方式:用 Tailwind `max-[960px]:` 变体写上述覆盖。

## 文本内容
- pills: 「全部」+ props.categories(产品发布/监管获批/临床数据/会议摘要/文献/融资合作/行业观点)。
