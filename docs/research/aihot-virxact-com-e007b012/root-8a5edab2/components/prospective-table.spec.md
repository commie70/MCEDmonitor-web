# ProspectiveTable 规格(前瞻队列性能对照 + PF1 分期明细热力表)

## 总览
- **目标文件:** `src/components/sites/aihot-virxact-com-e007b012/shared/ProspectiveTable.tsx`
- **参考:** 用户草图「前瞻队列性能对照」session;视觉用本站令牌重绘
- **交互模型:** 点击(分段过滤、列排序、PF1 行展开)
- **导出:** `export function ProspectiveTable()`;"use client"
- **数据源:** `./competitors` 的 `PROSPECTIVE`、`PROS_TIER_ORDER`、`PF1`、`PF1_STAGES`、`PF1_TOT`、`ROUTE_COLORS`、`ProspectiveRow` 类型。已存在,勿改。

## 结构

### 1. 节头
- 容器 `mt-[30px]`。
- 标题行 flex baseline gap 12px wrap:h2「前瞻队列性能对照」`text-[18px] font-extrabold text-mc-ink` + 徽章「非病例对照 · 可外推真实筛查」`text-[11.5px] font-semibold px-[10px] py-[2px] rounded-[9px] bg-mc-bg2 text-mc-ink1`。
- 描述 `text-[12.5px] text-mc-ink1 mt-[6px] mb-[13px] leading-[1.6]`:「仅收录前瞻队列 / 前瞻注册 / 前瞻干预 / RCT 证据等级的研究(病例对照见上表企业详情)。特异性 / 灵敏度统一为整体口径,早期列标注 I 期或进展期癌前病变,TOO 标注 top-1 / top-2。」

### 2. 控件行(flex gap 18px items-center wrap,mb 12px)
- 分段控件: `inline-flex border border-mc-line rounded-[9px] overflow-hidden bg-mc-card`;按钮 `px-[15px] py-[7px] text-[12.5px] text-mc-ink1 border-r border-mc-line last:border-r-0 transition`;激活 `bg-mc-bg2 text-mc-ink font-semibold`。三项:全部 / 只看 MCED / 只看单癌种。
- 提示 `text-[11.5px] text-mc-ink2`:「点击表头可按 特异性/灵敏度/早期/TOO 排序」。

### 3. 对照表(table card 同 CompetitorBoard 容器风格)
- table `w-full min-w-[1180px] border-collapse`。
- 列:公司(产品)/研究(类型+名称)/覆盖/路线/入组人群·例数/特异性/灵敏度/早期/TOO/更新。
- thead th 样式同 CompetitorBoard(sticky top-0 bg-mc-bg1 border-b-2 text-[11.5px]);特异性/灵敏度/早期/TOO 四列可排序: `cursor-pointer select-none`,后缀箭头 `▾`(激活列 `text-mc-cyan`,按当前方向 ▾/▴);点击循环:降序→升序→取消(恢复分组序)。排序数值:取字符串中第一个数字("85–96%"→85,"—"→-1 排最后)。
- **默认序**:按 PROS_TIER_ORDER 分组,组头行 `bg-mc-surface2 font-bold text-[12px] tracking-[0.4px] p-[7px_13px]`,文本「RCT(1)」「前瞻注册(7)」等;组内 self 行(世和基因)排最前,其余按数据原序。排序激活时不分组、直接平铺。
- 数据行:
  - 公司: `font-bold text-mc-ink`;self 加「本司」徽章(同 CompetitorBoard);产品名 `block text-[11px] font-normal text-mc-ink1 mt-[2px]`。有 detail 的行(pf1)公司名左侧加 caret `▸`(展开旋转 90°),整行 cursor:pointer 点击展开明细行。
  - self 行背景锚定(同 CompetitorBoard 的线性渐变)。
  - 研究: 类型徽章(同 CompetitorBoard 研究徽章样式,用 STUDY_TONE……注意:PROS 类型无「病例对照」,直接按 type 映射同名色调);研究名 `block text-[10.5px] text-mc-ink2 mt-[4px] max-w-[165px] leading-[1.45]`。
  - 覆盖: MCED 行前缀小徽章「MCED」`text-[10px] font-bold text-white bg-[#8b5cf6] px-[7px] py-[1px] rounded-[9px] mr-[5px]`(语义紫,允许内联);单癌种前缀「单癌」`bg-mc-surface2 text-mc-ink1` 同款。后接 canc `text-[11.5px] text-mc-ink1`。
  - 路线: 同 CompetitorBoard 彩色标签(ROUTE_COLORS,尺寸缩至 text-[10.5px] px-[7px] py-[2px])。
  - 人群: `text-[11.5px] text-mc-ink1 max-w-[235px] leading-[1.5]`。
  - 数值列(特异性/早期/TOO): 主值 `font-bold text-mc-ink whitespace-nowrap`;"—" 用 `text-mc-ink2/50`;副注(sub)`block text-[10.5px] font-normal text-mc-ink2 mt-[2px] whitespace-normal max-w-[165px] leading-[1.45]`。
  - **灵敏度列特殊**: 主值同上 + 迷你条形 `h-[5px] rounded-[3px] bg-mc-surface2 mt-[5px] max-w-[115px] overflow-hidden`,内条 `display:block height:100% border-radius:3px; width:数值%; background:linear-gradient(90deg,#3b6fb6,#168f80)`(语义渐变,内联 style 允许)。
  - 更新列: `text-[11px] text-mc-ink2 whitespace-nowrap`。
- 行 hover `bg-mc-surface0`。

### 4. PF1 明细展开行(detail==="pf1" 的行,点击展开)
- `<tr>` td colspan=10,`bg-mc-bg1 p-[14px_16px_16px]`。
- 说明文字 `text-[12px] text-mc-ink1 mb-[10px] leading-[1.6]`:「柳叶刀 2023 附录 Table S8,按癌症条目级(36 检出 / 122 总)。分期断崖:I 期 16.3% → IV 期 75%;总体 29.5% 被淋巴瘤(63%)、华氏巨球(100%)等血液/淋巴系统拉高,而高发实体瘤 乳腺 22.7%、前列腺 10%、肺 9.1% 在早期几乎不可检出。行按癌种 n 降序。」(其中「分期断崖:I 期 16.3% → IV 期 75%」用 font-bold text-mc-rose-fg)
- 热力表: 容器 `overflow-x-auto`;table `border-separate border-spacing-[2px] text-[11px]`。
  - 表头 th: `bg-[#135e6b] text-white font-semibold p-[5px_7px] whitespace-nowrap rounded-[4px] text-[10.5px]`(首列「癌种」左对齐 min-w-[118px])。
  - 癌种列 td: `text-left font-semibold text-mc-ink p-[4px_8px] whitespace-nowrap`,后缀 `n={n}` `text-mc-ink2 font-normal text-[10px] ml-[4px]`。
  - 数据格: null → `bg-mc-surface2` 空格;有值 → 居中 `p-[3px_6px] rounded-[4px] min-w-[54px] leading-[1.25]`;背景按数值热力:**始终用浅色底 + 深色字**(两主题一致):背景 `hsl(${Math.max(0,Math.min(100,pct))*1.3},68%,87%)`(内联 style 允许),主值 `font-bold text-[11px] text-[#1f2a37]`(pct 整数显示整数,否则 toFixed(1),加 %),副值 `block text-[9px] text-[#5b6472]/80`(如 7/43)。
  - 末行总计: `font-bold;border-top:2px solid var(--border-strong)`,癌种列文案「总计(条目级)」`bg-mc-surface2`。

### 5. 表后脚注
- `text-[11.5px] text-mc-ink1 mt-[13px] leading-[1.7]`:「前瞻对照口径:特异性 / 灵敏度为整体 episode 或个体水平(各研究定义见原文);早期列优先取 I 期(或 0–II 期 / 癌前病变,见副注);TOO 为 top-1 或 top-2 已注明。金陵队列灵敏度为论文口径;AACR 2024 中期为 97.8%/55.2%。SYMPLIFY 为有症状转诊人群,与无症状筛查不可直接相比。」

## 行为
- 分段过滤 mced 字段;排序见上;PF1 展开独立 boolean state。
- 全客户端;无 URL 同步。

## 响应式
- 表 min-width 1180px 横向滚动;控件 wrap。
