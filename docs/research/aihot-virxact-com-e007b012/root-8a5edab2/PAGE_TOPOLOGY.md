# PAGE_TOPOLOGY — https://aihot.virxact.com/ (精选 feed 页)

站点性质:AI 行业动态聚合看板(服务端渲染 + 单条 106KB 内联 `<style>`,语义化 class,非 Tailwind)。
目标复刻形态:同一布局骨架 + 早筛竞品新闻监测内容(定制化复刻)。

## 页面骨架(桌面 1440px)

```
body
└── .app-shell.app-shell-main           display:grid; grid-template-columns: 180px + 1fr(隐式)
    ├── aside.sidebar#app-sidebar        position:sticky; top:0; height:100vh; width:180px
    │   ├── a.sidebar-brand              inline SVG logo(viewBox 454 488 548 106, fill var(--text-0))
    │   ├── div.divider                  1px 分隔线
    │   ├── nav.side-nav                 grid, gap:4px, overflow:auto —— 分组:内容(精选/全部AI动态/热点榜/AI日报/主题/收藏) 模型(模型榜) 更多(Agent接入/关于/更新日志●/反馈)
    │   └── div.sidebar-footer           主题三态切换(moon/monitor/sun 图标分段控件) + ICP 备案链接
    ├── main.app-main                    padding:24px 28px 72px
    │   └── div.page.page-theme-feed     grid, gap:16px, max-width≈1198px
    │       ├── header.feed-head         h1「精选」+ 日期副标题(2026年8月15日星期六 · AI 筛选的今日重点)
    │       │   └── 工具行:分类 pills(全部/模型/产品/行业/论文/教程/观点,激活项下划线) + 右侧搜索框+深青色按钮
    │       ├── section.hot-card         「当前热点」白卡片:标题+「完整榜单 →」,1-5 名列表(名次彩色:1 rose/2 橙/3 琥珀/4-5 灰),右侧「120 热度」
    │       └── section.timeline         日期分组(8月15日 ▾ 星期六·3条 …)
    │           └── div.timeline-day     左侧时间 gutter(HH:MM + 圆点),右侧 article 卡片流
    │               └── article          白卡片:
    │                   ├── 顶行:来源大写灰字(ANTHROPIC:NEWSROOM(网页)) [+@handle] [✦精选 琥珀徽章] …… 右侧 ● AI评分 65/100 + 收藏书签图标
    │                   ├── 标题(17px 粗体,链接)
    │                   ├── 摘要段(灰)
    │                   ├── [可选] 引用块(浅灰圆角盒) / 缩略图(圆角图,「查看大图 1/N」按钮)
    │                   ├── 「另有 N 家信源报道」小灰字
    │                   └── 虚线分隔 + 「推荐理由:…」(label 深青灰 #42707c,6% 底色块)
    └── nav.m-tabbar                     桌面 display:none;移动端 fixed 底部标签栏(4 项,54px,z-900)
```

## 移动端(390px)差异

- sidebar display:none(变 fixed 抽屉,z-1000,由汉堡触发——演示版可简化为不实现抽屉)
- 顶部出现移动页眉:logo + 当日日期;「今日热点」卡片改为紧凑行(彩色名次方块)
- 分类 pills 变滚动 chips 行;搜索折叠为图标
- 文章卡片重构:无时间 gutter;顶行=来源 + 评分数字;摘要 3 行截断;推荐理由进 `note` 底色块
- 底部 .m-tabbar fixed(首页/榜/日报/更多 4 图标)
- app-main padding:0 18px 82px(给 tabbar 让位)

## 交互模型总览

| 区块 | 模型 |
| --- | --- |
| 侧栏导航 | 静态链接(SSR 路由);本项目仅实现精选页,其余为视觉呈现 |
| 主题切换 | 点击三态(深色/跟随系统/浅色),写 `<html data-theme>` |
| 分类 pills | 点击切换(原站为 query 参数 SSR;本项目改客户端过滤) |
| 搜索框 | 输入+按钮(本项目:客户端标题/摘要过滤) |
| 当前热点 | 静态展示(原站跳 /hot;本项目仅展示) |
| 日期分组 | 点击 chevron 收起/展开(.timeline-day-toggle, aria-expanded) |
| 文章卡片 | 原站整卡点击跳详情;本项目不建详情页,卡片静态展示 |
| 收藏按钮 | 点击切换(.timeline-star, aria-pressed) |
| 查看大图 | 原站开 lightbox;本项目内容不带图则省略 |
| 滚动 | 无滚动驱动动画、无 Lenis;仅 sidebar sticky |

## 设计令牌(已从内联 CSS 提取,详见 ahot-inline.decoded.css)

- 亮色 `:root[data-theme=light]`:bg-0 `#f4f5f6`;surface-card `#fff`;text-0 `#1c2733`;text-1 `#5c6672`;text-2 `#6b7684`;border `#e2e4e7`;accent-cyan `#135e6b`(主色,深青);accent-amber `#b8873a`;accent-rose `#b3402a`;accent-emerald `#2f7d5c`;rank-1 `#b3402a` rank-2 `#a3642f` rank-3 `#96702e` rank-rest `#6b7684`;note-fg `#42707c`(推荐理由)
- 暗色 `:root`(默认即暗):bg-0 `#10151c`;bg-1 `#171d26`;sidebar `#0c1117`;text-0 `#e8ebf2`;text-1 `#98a2b3`;accent-cyan `#4fa3b3`;note-fg `#8fb8a8`
- 共享:radius 12/8/16;space 4/8/12/16/24/32;feed 容器 720(原站居中窄栏,本站主页 1198 宽版);字号 xs.75 sm.8125 base.875 md1 lg1.125 xl1.25 2xl1.5rem
- 字体:系统栈 `system-ui,-apple-system,"Segoe UI","PingFang SC","Hiragino Sans GB","HarmonyOS Sans SC","Microsoft YaHei",sans-serif`;mono `ui-monospace,SFMono-Regular,...`
- 卡片阴影:亮 `0 1px 2px rgba(28,39,51,.05)`,hover `0 6px 18px rgba(28,39,51,.09)`;暗色无阴影
