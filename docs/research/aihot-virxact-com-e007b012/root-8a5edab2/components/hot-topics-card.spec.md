# HotTopicsCard 规格(精选页「当前热点」卡片)

## 总览
- **目标文件:** `src/components/sites/aihot-virxact-com-e007b012/shared/HotTopicsCard.tsx`
- **截图:** `docs/design-references/aihot-virxact-com-e007b012/root-8a5edab2/desktop-1440-full.png`(顶部热点卡)
- **交互模型:** 静态展示 + hover;「完整榜单 →」为 Link 到 /hot
- **导出:** `export function HotTopicsCard({ events }: { events: HotEvent[] })`;服务端组件即可(无 "use client")

## DOM 结构
```
<section aria-label="当前热点">
  <div> head: <span>当前热点</span> <Link>完整榜单 →</Link> </div>
  <ol> 5 行 </ol>
</section>
```

## 精确样式
- section: `margin-bottom:20px; border:1px solid var(--border); border-radius:12px; background:var(--surface-card); box-shadow:var(--shadow-card)`。
- head: `display:flex; align-items:center; gap:10px; padding:11px 16px; border-bottom:1px solid var(--border-soft)`。
  - 标题「当前热点」: `font-size:15px; font-weight:800; letter-spacing:.04em; color:var(--text-0)`。
  - 「完整榜单 →」(Link href="/hot"): `margin-left:auto; color:var(--accent-cyan-fg); font-size:12px; font-weight:700`;hover 下划线。
- ol: `list-style:none; padding:4px 0 6px`。
- 行: `display:flex; align-items:center; gap:12px; padding:8px 16px; transition:background .14s`;hover `background:var(--surface-0)`;最后一行 `border-radius:0 0 11px 11px`。
- 名次: `flex:none; width:20px; text-align:center; font-size:14px; font-weight:700; color:var(--rank-rest)`;第 1/2/3 名: `font-size:15px; font-weight:900`,颜色分别 `var(--rank-1)/(--rank-2)/(--rank-3)`。显示 1-5 阿拉伯数字。
- 标题(普通 `<span>`,不跳转): `flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; font-size:14px; font-weight:600; line-height:1.5; color:var(--text-0)`。
- 热度: `flex:none; display:inline-flex; align-items:center; gap:6px; font-size:13px; font-weight:600; color:var(--text-2); font-variant-numeric:tabular-nums`,格式「106 热度」。

## 内容
- props 传 `TOP_HOT`(来自 `./data`),按数组顺序渲染,不必排序。

## 响应式(≤960px)
- 行 `padding:8px 12px; gap:8px`;其余不变(标题仍截断单行)。
