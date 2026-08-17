# HotRankPanel 规格(热点榜页:hero + 排名面板 + 迷你趋势线)

## 总览
- **目标文件:** `src/components/sites/aihot-virxact-com-e007b012/shared/HotRankPanel.tsx`
- **截图:** `docs/design-references/aihot-virxact-com-e007b012/hot-ec540172/desktop-1440-full.png`
- **交互模型:** 静态展示 + hover(行/标题变色)
- **导出:** `export function HotRankPanel({ events }: { events: HotEvent[] })`;服务端组件即可

## DOM 结构
```
<div page>            width:min(1120px,100% - 48px); margin:0 auto; padding:48px 0 72px
  <section hero>      max-width:760px; margin-bottom:32px
    <span kicker/>    「MCED RADAR」
    <h1/>             「竞品热点榜」
    <p/>              描述
  <section panel>     白卡
    <div head>        「NOW / 当前热点」 + 「9 个事件」
    <ol> rows </ol>
  <p method-note/>
</div>
```

## 精确样式
- kicker: `font-family:ui-monospace,SFMono-Regular,Menlo,monospace; font-size:12px; font-weight:700; letter-spacing:.12em; color:var(--accent-cyan-fg)`。
- h1: `margin:10px 0 12px; font-size:clamp(2rem,5vw,3.5rem); line-height:1.12; letter-spacing:-.035em; color:var(--text-0); font-weight:800`。
- hero p: `margin:0; max-width:680px; font-size:16px; line-height:1.75; color:var(--text-1)`;文本「过去 48 小时最热的早筛竞品事件,按精选报道与讨论热度实时排序。」
- panel: `border:1px solid var(--border); border-radius:16px; background:var(--surface-card); box-shadow:var(--shadow-card)`。
- head: `display:flex; align-items:flex-end; justify-content:space-between; gap:16px; padding:20px 22px 16px; border-bottom:1px solid var(--border-soft)`。
  - eyebrow「NOW」:同 kicker 样式;下接 h2「当前热点」`margin:4px 0 0; font-size:20px; line-height:1.25; font-weight:700; color:var(--text-0)`。
  - 右侧「{N} 个事件」: `font-size:12px; color:var(--text-2)`。
- rows(`<ol> list-none`):行 `display:flex; align-items:center; gap:14px; min-width:0; padding:15px 20px; border-bottom:1px solid var(--border-soft); transition:background .16s`;末行无 border;hover `background:var(--surface-1)`。
- 名次: `flex:none; width:28px; font-family:mono; font-size:13px; font-weight:700; color:var(--rank-rest)`;1/2/3 名分别 `var(--rank-1)/(--rank-2)/(--rank-3)`。两位数字「01」…「09」。
- 内容 `flex:1; min-width:0`:
  - 标题行 `display:flex; align-items:baseline; gap:8px; flex-wrap:wrap`:标题(普通 span,不跳转)`font-weight:700; line-height:1.5; color:var(--text-0)`,hover `var(--accent-cyan-fg)`;badge(可选):
    - 爆: `background:color-mix(in srgb,var(--accent-rose-fg) 16%,transparent); color:var(--accent-rose-fg)`
    - 新: `background:color-mix(in srgb,var(--accent-cyan-fg) 14%,transparent); color:var(--accent-cyan-fg)`
    - 发酵中: `background:color-mix(in srgb,var(--accent-amber-fg) 16%,transparent); color:var(--accent-amber-fg)`
    - 共用: `display:inline-block; padding:1px 7px; border-radius:4px; font-size:11px; font-weight:700; line-height:1.6; white-space:nowrap`
  - meta: `margin-top:5px; font-size:12px; color:var(--text-2); font-variant-numeric:tabular-nums`,格式「{source} · {ago}」。
- 迷你趋势线(右侧):104×32 `<svg viewBox="0 0 104 32">`,把 `spark: number[]` 归一化(最小值→y=26,最大值→y=4)映射为 `<polyline>`:`fill:none; stroke:var(--accent-cyan-fg); stroke-width:2; stroke-linecap/join:round`;末点 `<circle r="3">` `fill:var(--surface-card); stroke:var(--accent-cyan-fg); stroke-width:2`。flex:none。
- 热度列: `flex:none; min-width:76px; text-align:right`;数字 `font-family:mono; font-size:20px; font-weight:700; line-height:1.25; color:var(--text-0); font-variant-numeric:tabular-nums`;下方 label「热度值」`font-size:12px; color:var(--text-2)`(块级)。
- method-note: `margin:18px 4px 0; font-size:12px; line-height:1.75; color:var(--text-2)`;文本:「榜单热度 = 精选信源权重 + 讨论热度权重,按 24 小时半衰期衰减;同一事件的多信源报道在榜单合并计算。标签含义:爆 = 短时间密集报道、新 = 首报 6 小时内、发酵中 = 信源仍在增加。演示数据,仅供设计预览。」其中「爆」「新」「发酵中」各用对应 badge 样式内联渲染。

## 响应式(≤960px)
- page: `width:calc(100% - 28px); padding:28px 0 88px`;h1 `font-size:2rem`。
- head/rows padding 左右改 16px。
- 行改 grid: `grid-template-columns:28px 64px minmax(0,1fr)`;名次第 1 列;内容跨第 2-3 列第一行;spark 第 2 列第二行(width 64px,viewBox 同比缩放);热度列第 3 列第二行右对齐(数字 18px,label 与数字同行基线排列 gap 5px)。

## 内容
- props 传 `HOT_EVENTS`(./data),顺序渲染;「9 个事件」= events.length。
