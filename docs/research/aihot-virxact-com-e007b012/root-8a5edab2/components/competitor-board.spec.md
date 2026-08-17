# CompetitorBoard 规格(竞品榜:统计 + 筛选 + 企业总表 + 展开详情)

## 总览
- **目标文件:** `src/components/sites/aihot-virxact-com-e007b012/shared/CompetitorBoard.tsx`
- **参考:** 用户草图看板结构(企业表格 + 行展开),视觉用本站 AIHOT 设计令牌重绘
- **交互模型:** 点击(行展开/收起、筛选 chips、下拉、分段、清除)
- **导出:** `export function CompetitorBoard()`;"use client"
- **数据源:** `./competitors` 的 `ALL_COMPETITORS`、`ROUTE_COLORS`、`STUDY_TONE`、`Competitor` 类型。数据文件已存在,直接 import,勿改。

## 页面内结构(自上而下)

### 1. 统计卡 strip
- 5 张卡,grid `grid-cols-5 max-[960px]:grid-cols-2`,gap 14px。
- 卡: `bg-mc-card border border-mc-line rounded-xl p-[16px_14px] text-center shadow-mc-card`。
- 数字: `text-[30px] font-extrabold leading-none text-mc-cyan`;标签: `mt-[7px] text-[12.5px] text-mc-ink1`。
- 统计口径(从 ALL_COMPETITORS 现算):调研企业数;多癌种(MCED)产品数(mced=true);技术路线数(所有 routes 去重);NMPA III类证(hasNMPA3);FDA突破性/获批(hasFDA)。

### 2. 筛选卡
- 容器: `bg-mc-card border border-mc-line rounded-xl p-[15px_17px] flex flex-wrap gap-[22px] items-start`。
- 各组: `<div> flex flex-col gap-2`,组题 `text-[11.5px] font-semibold tracking-[0.3px] text-mc-ink1`。
- **技术路线(多选 chips)**:ROUTE_COLORS 的 9 个 key。chip: `inline-flex items-center gap-[6px] rounded-full border border-mc-line-strong bg-mc-card px-[13px] py-[5px] text-[12.5px] text-mc-ink1 cursor-pointer transition select-none`;前置 9px 圆点(style background 用 ROUTE_COLORS 值——语义色,允许内联 style 仅此处);选中态: 文字反白,背景为该路线色(`color:#fff; border-color:transparent; font-weight:600`),圆点变 `bg-white/80`。hover(未选中): `border-mc-emphasis`。
- **癌种覆盖 select**:选项「全部」+「多癌种 (MCED)」(值 __MCED__)+ 固定癌种序:肺/肝/结直肠/胃/食管/胰腺/卵巢/乳腺/前列腺/宫颈/子宫内膜/胆管/淋巴瘤/膀胱/头颈/肛门。样式见下方 select 共用。
- **报证状态 select**:全部 / NMPA III类证 / NMPA创新通道 / FDA获批 / FDA突破性器械 / CE认证 / LDT商业化 / 研发或申报中(按 statusKeys 匹配)。
- **地区 select**:全部 / 国外 / 国内。
- select 共用: `min-h-[34px] rounded-lg border border-mc-line-strong bg-mc-card px-[11px] py-[7px] text-[13px] text-mc-ink1 cursor-pointer min-w-[150px]`。
- **清除筛选按钮**(align-self-end): `rounded-lg border border-mc-line bg-mc-card px-[15px] py-[7px] text-[13px] text-mc-ink1 hover:bg-mc-surface1`。
- 筛选逻辑:路线=任一命中;癌种=__MCED__ 时取 mced=true,否则 cancers 包含;状态=statusKeys 包含;地区相等。全部条件 AND。

### 3. 企业总表(table card)
- 容器: `bg-mc-card border border-mc-line rounded-xl overflow-hidden`;内层 `overflow-x-auto`;table `w-full min-w-[1200px] border-collapse`。
- thead th: `sticky top-0 z-[2] bg-mc-bg1 border-b-2 border-mc-line text-left p-[12px_13px] text-[12px] text-mc-ink1 font-semibold whitespace-nowrap`。列:公司(175px)/主力技术路线(150px)/产品布局/报证审批进度(获批适应症)(185px)/主力产品(135px)/适用概况(覆盖癌种)(230px)/信源与更新(185px)。
- **地区分组行**: `<tr>` 全宽 td `bg-mc-surface2 font-bold text-[12.5px] tracking-[0.5px] text-mc-ink p-[8px_14px] border-b border-mc-line`,文本「国外(9)」「国内(10)」。顺序:国外组在前;国内组内 self(世和基因)排最前。组内其余顺序按 ALL_COMPETITORS 原顺序(国外保持数据顺序)。
- **主行**(cursor:pointer,点击切换展开):
  - hover `bg-mc-surface0`;caret `▸`/`▾`(用文本或 ChevronRight 11px,展开旋转 90 度,transition .18s)。
  - **self 锚定行**(世和基因):背景 `linear-gradient(90deg, rgba(var(--theme-accent-rgb),.10), transparent 70%)`(arbitrary);公司名后加徽章「本司」`bg-mc-cyan text-mc-accent-contrast text-[10px] px-[7px] py-[1px] rounded-[9px] font-semibold`。
  - 公司单元格:名 `font-bold text-[13.5px]`;下方 `en · region` `text-[11px] text-mc-ink1`。
  - 技术路线:彩色小方块标签 — `font-size:11px; padding:2px 8px; border-radius:5px; color:#fff; font-weight:600; white-space:nowrap`,背景=ROUTE_COLORS(内联 style 允许,语义色)。
  - 报证审批:每 pill `inline-block w-fit text-[11px] px-[8px] py-[2px] rounded-[5px] font-semibold`,后缀 scope 用更浅同色系文字(`· scope`,opacity .85 font-normal)。tone→样式映射:
    - emerald: `bg-[color-mix(in_srgb,var(--accent-emerald)_12%,transparent)] text-mc-emerald-fg`
    - cyan: 同构换 --accent-cyan / mc-cyan-fg
    - amber: 同构换 --accent-amber / mc-amber-fg
    - violet: `bg-[rgba(112,72,196,.10)] text-[#7048c4]`(暗色文字改 #b9a3e8,可用 `dark:` 不行——改用 CSS 变量方案:定义在本文件不行,直接两组类 `text-[#7048c4] dark:text…` 不允许。方案:violet 也用 color-mix 但基于固定 hex 并在两种主题下都可读:#7048c4 亮 / 暗色用同一文字色 #8f6fe0。写法 `bg-[color-mix(in_srgb,#8f6fe0_14%,transparent)] text-[#8f6fe0]`,亮色下 #8f6fe0 可读性可接受)
    - neutral: `bg-mc-surface2 text-mc-ink1`
    - muted: `bg-mc-surface1 text-mc-ink2`
  - 主力产品: `font-semibold text-mc-ink`。
  - 适用概况: cancerLabel `text-[12px] font-semibold text-mc-ink1 mb-[5px]`;癌种 chips `text-[11px] px-[7px] py-[2px] rounded-full bg-mc-surface2 text-mc-ink1 whitespace-nowrap`,flex wrap gap 5px。
  - 信源与更新: src `text-[11.5px] text-mc-ink1`;下方 `更新:{updatedAt}` `text-[11px] text-mc-ink2 mt-[3px]`。
- **展开详情行**(默认收起;`<tr>` 内 td colspan=7,padding 0;展开时显示):
  - 面板: `p-[16px_18px_20px] bg-mc-surface0 border-b border-mc-line`。
  - 小节标题: `text-[12.5px] font-semibold text-mc-ink mb-[11px]`,文本「■ 性能(按研究类型,统一为 特异性 / 灵敏度 + 早期 + 癌前病变 + TOO)」。
  - 每条研究一行卡片: `flex gap-[11px] items-start bg-mc-card border border-mc-line rounded-lg p-[9px_12px]`(纵向 stack gap 9px):
    - 类型徽章: `text-[11px] font-bold px-[9px] py-[3px] rounded-[6px] whitespace-nowrap min-w-[80px] text-center mt-[1px]`,tone 由 STUDY_TONE 映射:rose=`bg-[color-mix(in_srgb,var(--accent-rose)_10%,transparent)] text-mc-rose-fg`、emerald/cyan/amber 同构、ink=`bg-mc-ink text-mc-page`。
    - 正文: `text-[12.5px] text-mc-ink1`;研究名 `font-bold text-mc-ink` 前缀「{name}」;perf 紧随其后;pop 另起 `block text-[11px] text-mc-ink2 mt-[2px]`,前缀「入组人群 / 例数:」;右侧(或 pop 同行尾部)`更新:{study.updatedAt}` `text-[11px] text-mc-ink2`;若 study.evidence 存在,再加一行 `证据:{evidence}` `text-[10.5px] text-mc-ink2/70 font-mono 风格 break-all`(用 `font-[ui-monospace,SFMono-Regular,Menlo,monospace]`)。
  - 「■ 测序 / 技术参数」小节:panel 文本框 `bg-mc-card border border-mc-line rounded-lg p-[9px_12px]`,k=「检测平台 / panel」`text-[10.5px] text-mc-ink1 mb-[3px]`,v=`text-[12.5px] font-semibold text-mc-ink`。
  - 方法学备注: `text-[11.5px] text-mc-ink2 mt-[11px] italic`,文本「研究类型可信度:病例对照(高估;即便前瞻采样也归此类)→ 前瞻队列/前瞻注册/前瞻干预(真实场景)→ RCT(人群效果)。TOO 已标注 top-1 / top-2。」
- 无匹配: `<tr><td colspan=7>` 居中 `py-10 text-mc-ink1`「无匹配企业,请调整筛选条件」。

### 4. 表后脚注
- `text-[11.5px] text-mc-ink1 mt-[14px] leading-[1.7]`,文本:
  「性能格式:特异性 / 灵敏度(含 I 期/早期,进展期癌前病变),TOO 标注 top-1 / top-2。病例对照普遍高估;前瞻『采样』不等同真实无症状筛查队列。ASCEND-2、DELFI-L101、THUNDER、PROMISE 按病例对照归类;仅前瞻队列/前瞻注册/前瞻干预与 RCT 可外推真实筛查。经典落差:CancerSEEK 70% → DETECT-A 27.1%;Galleri CCGA 51.5% → 前瞻;CanScan 87.4% → 53.5%。Clear-C 可分析人数已按 MedComm 2023 论文口径修正为 4,245。NMPA 早筛 III 类证:常卫清(CRC)、觅小卫(胃癌)共 2 张。」

## 行为
- 行展开状态: `Set<string>`(competitor id),点击主行 toggle;可同时展开多行。
- 筛选全客户端,无需 URL 同步。

## 响应式
- 统计卡 ≤960px 2 列;表 min-width 1200px 横向滚动;筛选卡 wrap。
