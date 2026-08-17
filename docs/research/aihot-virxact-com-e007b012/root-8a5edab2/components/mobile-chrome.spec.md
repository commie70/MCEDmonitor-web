# MobileChrome 规格(移动顶栏 + 抽屉导航 + 底部标签栏,≤960px)

## 总览
- **目标文件:** `src/components/sites/aihot-virxact-com-e007b012/shared/MobileChrome.tsx`
- **截图:** `docs/design-references/aihot-virxact-com-e007b012/root-8a5edab2/aihot-mobile-390-light.png`
- **交互模型:** 点击(汉堡开抽屉、遮罩/关闭按钮关抽屉、标签切换)
- **导出:** `export function MobileChrome()`;"use client"

## DOM 结构
```
<> 
  <header> 移动顶栏 (sticky)
  <nav> 底部标签栏 (fixed)
  {open && 抽屉 + 遮罩}
</>
```
全部 `min-[961px]:hidden`。

## 移动顶栏(.app-mobile-bar)
- `position:sticky; top:0; z-index:30; display:grid; grid-template-columns:44px 1fr 44px; align-items:center; gap:8px; padding:8px 12px; border-bottom:1px solid var(--border); background:color-mix(in srgb,var(--bg-0) 98%,transparent)`。
- 左:汉堡按钮 44×44,`border-radius:12px; border:1px solid var(--border-strong); background:var(--surface-card); box-shadow:var(--shadow-soft)`,Menu 图标(lucide)20px,active `scale(.94)`。aria-label="打开导航"。
- 中:品牌(Link href="/"):`<BrandMark size={22}/>` + 「早筛情报站」15px/700/ls .04em,`color:var(--text-0)`,水平居中 flex。
- 右:44px 空占位。

## 抽屉(汉堡点击打开)
- 遮罩: `position:fixed; inset:0; background:rgba(0,0,0,.5); z-index:999; opacity 0→1 transition .14s`;点击关闭。
- 抽屉: `position:fixed; top:0; left:0; bottom:0; width:min(86vw,320px); z-index:1000; background:var(--sidebar-bg); border-right:1px solid var(--border); padding:14px 14px 18px; display:grid; grid-template-rows:auto auto 1fr auto; gap:8px; transform:translateX(-100%)→0; transition:transform .19s cubic-bezier(.32,.72,0,1); overflow-y:auto`。
- 内容:首行 = `<BrandLogo/>` + 右侧关闭按钮(X 图标,44×44,hover bg surface-1);divider;同 NAV_GROUPS 导航(样式同 SiteSidebar 的 side-link,但 `min-height:44px; padding:10px 12px; gap:10px`);底部 ThemeToggle(与 SiteSidebar 相同实现,可复用其样式)+ filing 文本「内部演示 · 数据截至 2026-08-15」。
- 打开时 `document.body.style.overflow="hidden"`,关闭恢复。点击抽屉内有效链接后关闭抽屉。
- 实现提示:为允许关闭过渡,可用 `mounted`(是否渲染)+ `open`(是否滑入)两个 state;简化可接受:仅 open 状态、直接条件渲染(无离场动画)。

## 底部标签栏(.m-tabbar)
- `position:fixed; left:0; right:0; bottom:0; z-index:900; display:grid; grid-template-columns:repeat(4,1fr); background:var(--surface-card); border-top:1px solid var(--border); padding:4px 6px calc(env(safe-area-inset-bottom,0px) + 4px)`(env 直接写 arbitrary 即可,如 `pb-[calc(env(safe-area-inset-bottom,0px)+4px)]`)。
- 数据:`MOBILE_TABS`(./nav):精选(/)、动态(/all)、热点(/hot)、更多(未开放,渲染 button 无动作)。
- tab: `display:flex; flex-direction:column; align-items:center; gap:3px; min-height:44px; padding:4px 0; color:var(--text-2)`;图标 22×22;label `font-size:11px; font-weight:600; line-height:1`。
- active(usePathname):`color:var(--theme-accent)`;图标 `strokeWidth:2.4`;label `font-weight:700`。

## 文本内容
- 导航/标签数据来自 `./nav`;品牌组件来自 `./icons`。

## 响应式
- 仅 ≤960px 显示;≥961px 整体隐藏。
