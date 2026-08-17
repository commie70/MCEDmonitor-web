# SiteSidebar 规格(桌面侧栏,≥961px 显示)

## 总览
- **目标文件:** `src/components/sites/aihot-virxact-com-e007b012/shared/SiteSidebar.tsx`
- **截图:** `docs/design-references/aihot-virxact-com-e007b012/root-8a5edab2/desktop-1440-full.png`(左侧栏)
- **交互模型:** 点击(导航链接 + 主题三态切换)
- **导出:** `export function SiteSidebar()`;"use client"(需要 usePathname + useTheme)

## DOM 结构
```
<aside> (sticky 侧栏)
  <Link href="/"> brand 区 → <BrandLogo/> (来自 ./icons)
  <div> divider
  <nav> 三组导航 (数据来自 ./nav 的 NAV_GROUPS)
  <div> footer: <ThemeToggle/> + filing 文本
```

## 精确样式(令牌已在 globals.css 注册,直接用 Tailwind arbitrary 或 mc-* 色)
- aside: `sticky top-0 h-screen` `display:grid; grid-template-rows:auto auto 1fr auto; gap:8px; padding:24px 12px 14px` bg `var(--sidebar-bg)`,右边线 `1px solid var(--sidebar-border)`。`max-[960px]:hidden`。
- brand Link: `display:flex; align-items:center; justify-content:center; padding:6px 8px 14px`。
- divider: `height:1px; background:var(--border)`。
- nav: `display:grid; gap:4px; padding:0 4px; align-content:start; overflow-y:auto`(隐藏滚动条 `scrollbar-width:none` + `::-webkit-scrollbar{display:none}`,可用 arbitrary `[scrollbar-width:none] [&::-webkit-scrollbar]:hidden`)。
- 组标签: `padding:14px 10px 4px; font-size:10px; font-family:ui-monospace,SFMono-Regular,Menlo,monospace; letter-spacing:.14em; text-transform:uppercase; color:var(--text-2)`。文本即组名(内容/竞品/更多,中文不转大写也无视觉差异)。
- 导航项 side-link: `position:relative; display:flex; align-items:center; gap:9px; padding:8px 10px; border-radius:8px; color:var(--text-1); font-size:13px; font-weight:500`;图标 16×16(`strokeWidth` 默认 2)。
  - hover: `background:var(--surface-1); color:var(--text-0)`;transition 120ms。
  - active(usePathname 判断,`/` 精确,其余 startsWith): `background:rgba(var(--theme-accent-rgb),.1); color:var(--accent-cyan-fg); font-weight:600`,图标同色。
  - **未开放项**(href 缺失):渲染为 `<span>` 同样式,`cursor:default`,加 `title="演示版未开放"`,无 hover 态。
  - `dot: true` 项(更新日志):右侧 `margin-left:auto` 6px 圆点 `background:var(--accent-rose)`。
- footer: `display:grid; gap:4px; padding:0 4px`。
- filing 文本: `padding:0 8px 4px; font-size:10px; line-height:1.4; color:var(--text-2)`,内容「内部演示 · 数据截至 2026-08-15」。

## ThemeToggle(footer 内,可同文件私有组件)
- 容器: `position:relative; display:grid; grid-template-columns:repeat(3,1fr); height:34px; padding:3px; margin:4px 4px 8px; border-radius:999px; border:1px solid var(--border); background:var(--surface-0)`。
- 滑动 thumb: `position:absolute; top:3px; bottom:3px; left:3px; width:calc((100% - 6px)/3); border-radius:999px; background:var(--surface-2); border:1px solid var(--border-strong); box-shadow:var(--shadow-thumb); transition:transform .26s cubic-bezier(.32,.72,0,1)`;按 mode 位移:dark→`translateX(0)`、system→`translateX(100%)`、light→`translateX(200%)`。
- 三个按钮(role="radio", aria-checked):图标 Moon / Monitor / Sun(lucide,约 15px),`color:var(--text-2)`,激活 `color:var(--text-0)`;hover `var(--text-1)`。顺序:深色、跟随系统、浅色。
- 逻辑:`useTheme()`(./use-theme)。mode 初始 "system",挂载后从 localStorage 读;点击写 localStorage + `<html data-theme>`。**首次渲染一律按 system 渲染三个按钮,挂载后再更新激活态**(避免 hydration mismatch)。

## 文本内容
- 品牌:`<BrandLogo/>`(`./icons`,已存在,勿改)。
- 导航数据:`NAV_GROUPS`(`./nav`,已存在,勿改)。

## 响应式
- ≥961px:如上。≤960px:整体隐藏(由 MobileChrome 接管)。
