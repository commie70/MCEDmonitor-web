# BEHAVIORS — aihot.virxact.com 交互行为实录(2026-08-15 勘察)

## 滚动扫描
- 无任何滚动驱动动画;无固定头;无 scroll-snap;无 Lenis/Locomotive(`.lenis` 检测为 false,无 fixed 元素)。
- `.sidebar` 为 `position:sticky; top:0; height:100vh`,长页滚动时侧栏保持不动。
- 页面即 document 滚动,无独立滚动容器。

## 点击扫描
- **分类 pills**:均为 `<a href="/?category=xxx&page=1">`,SSR 跳转。激活项=「全部」有底部 2px 下划线(accent 色)。
- **日期分组收起**:`.timeline-day-toggle` 按钮(chevron SVG,aria-label="收起 8月15日",aria-expanded)。程序化 `.click()` 未触发状态变化(React 合成事件未响应合成 click;真实用户点击有效)。复刻版自行实现折叠。
- **收藏**:`.timeline-star` 按钮(aria-pressed,书签 SVG)。同上,程序化点击未变状态;复刻版自行实现。
- **查看大图**:卡片内按钮,原站应开 lightbox(未深入,本项目内容无图)。
- **文章卡片**:`<article>` 整卡可点(data-cardnav 类行为),跳 `/items/<id>` 详情页;本项目不建详情页。
- **主题切换**:`.sidebar-footer` 内三态分段控件(role=radiogroup,深色/跟随系统/浅色)。点击「深色」后 `<html data-theme="dark">`,整站令牌切换为暗色。默认选中「跟随系统」,系统为浅色时渲染亮色。
- **更新日志**导航项带红点徽章(「有新的更新日志」)。

## Hover 扫描(依据样式表 :hover 规则,非逐点悬停实测)
- 文章卡片:hover 时阴影 `--shadow-card-hover`(亮:0 6px 18px rgba(28,39,51,.09)),暗色无阴影;可能伴随边框加深。
- 导航项:hover 底色 `--surface-1/2`。
- 链接/「完整榜单 →」:hover 变色/下划线。

## 响应式扫描
- **1440px(桌面)**:侧栏 180px + 主栏;feed-head 工具行横排;热点卡在主内容顶部;时间线带左 gutter(HH:MM + 圆点)。
- **390px(移动)**:`.sidebar` display:none(变抽屉);`.m-tabbar` 出现(fixed bottom,54px,4 项);`app-main` padding 0 18px 82px;热点卡变紧凑(彩色名次方块行);文章卡重构(无 gutter,摘要截断,评分简化为数字);分类 pills 变横向滚动 chips;搜索折叠为图标按钮。
- 断点:约 900px 以下进入移动布局(以样式表 media query 为准,复刻版取 900px)。

## 状态清单(复刻需实现)
1. 主题三态:dark / system / light → `<html data-theme>`,默认 system(随 prefers-color-scheme)。
2. 分类过滤:全部 + 6-7 个领域分类,客户端过滤时间线条目。
3. 搜索:标题/摘要关键词过滤(客户端)。
4. 日期分组折叠/展开(默认全部展开)。
5. 收藏切换(本地 state,演示不落库)。
6. 当前热点 top5 展示(数据写死)。

## 原站内容资产(对定制化复刻的意义)
- 文章缩略图/头像均走 `img-proxy` 代理的推特图片 —— 与早筛内容无关,不下载。
- logo 为内联 SVG(AIHOT 字标)—— 品牌需替换为早筛看板自有标识(重绘字标,不复制商标)。
- favicon: favicon.ico / icon.png(128) / apple-icon.png(180)—— 本项目自行生成简化版或沿用模板默认。
