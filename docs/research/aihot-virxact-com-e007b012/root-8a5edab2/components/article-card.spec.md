# ArticleCard 规格(时间线文章卡片,精选/全部两变体)

## 总览
- **目标文件:** `src/components/sites/aihot-virxact-com-e007b012/shared/ArticleCard.tsx`
- **截图:** `docs/design-references/aihot-virxact-com-e007b012/root-8a5edab2/desktop-1440-full.png`(卡片流)
- **交互模型:** 点击(仅收藏按钮有动作;卡片本体展示用,不跳转)
- **导出:** `export function ArticleCard(props: ArticleCardProps)`;"use client"(收藏按钮 onClick)

## Props
```ts
import type { NewsItem } from "./types";
interface ArticleCardProps {
  item: NewsItem;
  variant: "featured" | "all";
  starred: boolean;
  onToggleStar: (id: string) => void;
}
```

## DOM 结构(featured 变体)
```
<article> 卡片
  <div> head
    <div> left: <span>来源</span> [<span>@handle</span>] [<span>✦ 精选</span>] </div>
    <div> right: <span>● 监测评分 88/100</span> <button>收藏(书签图标)</button> </div>
  </div>
  <span>标题(15.5px 粗体)</span>
  [<div> 摘要段×N </div>]
  [<div> 引用块 </div>]
  [<div> 另有 N 家信源报道 </div>]
  <hr/> 虚线
  [<p> 关注理由:… </p>]
</article>
```
"all" 变体:无 ✦精选 badge、无引用块/另有信源/关注理由;摘要后改渲染标签行。

## 精确样式
- article: `padding:15px 18px 14px; border-radius:12px; border:1px solid var(--border); background:var(--surface-card); box-shadow:var(--shadow-card); transition:border-color .16s,background .16s,box-shadow .16s,transform .16s`。
  - hover: `border-color:var(--border-card-subtle-solid); background:var(--surface-card-hover); box-shadow:var(--shadow-card-hover); transform:translateY(-1px)`。
- head: `display:flex; align-items:center; justify-content:space-between; gap:10px; margin-bottom:6px`。
  - left: `display:flex; align-items:center; gap:8px; min-width:0`。
  - 来源: `font-size:12px; line-height:1.2; letter-spacing:.06em; text-transform:uppercase; color:var(--text-2); white-space:nowrap; overflow:hidden; text-overflow:ellipsis`(中文来源大写无视觉效果,忠实保留该规则)。
  - handle: `font-size:11px; color:var(--text-2)`。
  - ✦精选 badge: `display:inline-flex; align-items:center; gap:3px; font-size:10.5px; font-weight:600; line-height:1; padding:3px 7px; border-radius:3px; letter-spacing:.04em; color:var(--accent-amber-fg); background:color-mix(in srgb,var(--accent-amber) 12%,transparent)`;前缀符号用 `<span>✦</span>`(9.5px)。文本「精选」。
  - right: `display:flex; align-items:center; gap:6px; flex-shrink:0`。
  - 评分: `display:inline-flex; align-items:center; gap:4px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; font-weight:600; font-variant-numeric:tabular-nums`;前置 5px 圆点(`background:currentColor`)。颜色分档:**≥80** `var(--accent-emerald-fg)`、**≥60** `var(--accent-cyan-fg)`、其余 `var(--text-2)`。文本「监测评分 {score}/100」。
  - 收藏按钮: `padding:4px; border-radius:8px; border:1px solid transparent; background:transparent; color:var(--text-2); opacity:.55; line-height:0; transition:120ms`;卡片 hover 时 `opacity:.92`;自身 hover `background:var(--surface-1); border-color:var(--border-strong); color:var(--text-0)`;starred: `opacity:1; color:var(--accent-rose-fg)`。图标 lucide `Bookmark` 16px,starred 时 `fill="currentColor"`。aria-pressed、aria-label="收藏"。onClick 调 `onToggleStar(item.id)`。
- 标题: `display:block; font-size:15.5px; font-weight:700; line-height:1.5; color:var(--text-0); transition:color .12s`;hover `color:var(--accent-cyan-fg)`。
- 摘要: `margin-top:5px; font-size:13.5px; line-height:1.65; color:var(--text-1)`。多段:每段 `<span className="block">`,段间 `margin-top:.6em`。featured 完整显示;"all" 变体桌面 5 行截断(`line-clamp-5`)。
- 引用块(featured 且有 quote): `margin:4px 0 0; padding:6px 10px; border:1px solid var(--border); border-radius:8px; background:var(--surface-0); font-size:12px; line-height:1.5; color:var(--text-2); line-clamp-2`;作者前缀 `{source}:` 加粗 `color:var(--text-1)`。
- 另有信源: `margin-top:10px; font-size:12px; color:var(--text-2)`,文本「另有 {n} 家信源报道」。
- 虚线分隔(仅在后面还有内容时): `border:none; border-top:1px dashed var(--border-strong); margin:10px 0 0`。
- 关注理由: `padding:9px 0 0; font-size:12px; line-height:1.6; color:var(--note-fg)`;前缀「关注理由:」`font-weight:700`。
- 标签行(all 变体): `display:flex; gap:6px; flex-wrap:wrap; margin-top:8px`;每个 tag: `display:inline-flex; padding:2px; font-family:mono 同上; font-size:11.5px; line-height:1.4; color:var(--text-2)`;前缀「#」`opacity:.55`。

## 响应式(≤960px,用 max-[960px]: 变体)
- article `padding:13px`。
- head 改 `display:grid; grid-template-columns:minmax(0,1fr) auto; align-items:start; gap:8px; margin-bottom:8px`;right 区允许换行右对齐。
- 标题 `font-size:14.5px; line-height:1.55`。
- 摘要 `font-size:14px; line-height:1.65`;featured 也变 3 行截断(`line-clamp-3`);all 变体 2 行(`line-clamp-2`)。
- 关注理由改为底色块: `background:var(--note-bg); border-radius:8px; padding:8px 10px`(替代 padding 9px 0 0)。

## 内容映射(NewsItem 字段)
- source→来源;handle→@句柄;featured→✦badge(仅 featured 变体显示);score→评分;title;summary[](featured 全显);quote;otherSources;reason(仅 featured);tags(仅 all)。
