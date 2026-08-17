/**
 * 早筛情报站 — 演示数据集(2026-08-13 ~ 2026-08-15)
 *
 * 说明：本文件为演示用模拟数据。条目基于公开研究信息与竞品调研看板
 * (materials/MCED-dashboard-renew，调研日 2026-06-25)中记录的已发表研究、
 * 监管审评资料与会议摘要构造，性能数字均来自上述已发表口径；
 * 「新闻事件」本身(发布时间、信源计数、热度)为演示虚构。
 */

import type {
  CategoryDef,
  DayGroupDef,HotEvent,
  NewsItem,
  SourceType,} from "./types";

export const CATEGORIES: CategoryDef[] = [
  { key: "product", label: "产品发布" },{ key: "regulatory", label: "监管获批" },{ key: "clinical", label: "临床数据" },{ key: "conference", label: "会议摘要" },{ key: "publication", label: "文献" },{ key: "funding", label: "融资合作" },{ key: "opinion", label: "行业观点" },];

export const SOURCE_TYPES:{ key: SourceType | "all"; label: string }[] = [
  { key: "all", label: "全部" },{ key: "official", label: "企业官网与公众号" },{ key: "journal", label: "期刊与文献" },{ key: "conference", label: "会议" },{ key: "regulator", label: "监管机构" },{ key: "social", label: "社交媒体" },{ key: "media", label: "行业媒体" },];

export const DAY_GROUPS: DayGroupDef[] = [
  { date: "2026-08-15", label: "8月15日", weekday: "星期六" },{ date: "2026-08-14", label: "8月14日", weekday: "星期五" },{ date: "2026-08-13", label: "8月13日", weekday: "星期四" },];

/** 演示数据基准日：条目 date 相对该日的偏移，在请求时平移到服务器当天 */
export const FEED_BASE_DATE = "2026-08-15";

/** 精选页条目(均带 ✦精选 与关注理由) */
export const FEATURED_ITEMS: NewsItem[] = [
  // ---- 2026-08-15 星期六 ----
  {
    id: "f01",
    date: "2026-08-15",
    time: "03:12",
    source: "GRAIL：Newsroom（网页）",
    sourceType: "official",
    category: "clinical",
    featured: true,
    score: 88,
    title:
      "GRAIL 公布 PATHFINDER 2 完整性能数据：特异性 99.6%，12 种高致死癌灵敏度 69.8%",
    summary: [
      "PATHFINDER 2 性能可分析队列纳入 32,007 名 ≥50 岁、无癌临床疑似且符合指南筛查的受试者（440 癌 / 31,567 非癌）：特异性 99.6%，episode 灵敏度全癌种 39.3%、12 种预设高致死癌 69.8%、6 种侵袭性癌 66.2%，PPV 60.3%、NPV 99.2%，TOO top-2 达 91.3%（截止 2026-02）。",
      "这是迄今最大规模的 MCED 前瞻注册队列完整读出，Galleri 的 FDA PMA 审查证据链随之补齐关键一环。",
    ],
    otherSources: 6,
    reason:"3 万人级前瞻队列树立了 MCED 前瞻外推的新基准；与 CanScan 金陵队列对照时需注意其 episode 级灵敏度定义与人群构成差异，TOO top-2 91.3% 与我方 top-1 口径不可直接相比。",
    tags: ["GRAIL", "临床数据"],},{
    id: "f02",
    date: "2026-08-15",
    time: "02:40",
    source: "NMPA：医疗器械技术审评中心",
    sourceType: "regulator",
    category: "regulatory",
    featured: true,
    score: 82,
    title: "觅瑞觅小卫®审评要点公开：7,253 例前瞻注册临床详解",
    summary: [
      "CMDE 公开 GASTROClear（觅小卫）注册审评资料：7 家机构前瞻性入组 7,253 例 45–74 岁胃癌高风险人群（胃癌 130 例、高级别上皮内瘤变 19 例），特异性 78.27%、胃癌灵敏度 81.54%、高级别上皮内瘤变 57.89%，PPV 6.38%、NPV 99.43%。",
      "该产品为中国首张胃癌早筛 III 类证（2025 年 10 月获批），此前已获新加坡 HSA 批准与 FDA 突破性器械认定。",
    ],
    otherSources: 3,
    reason:"审评口径公开让 NMPA 对单癌种血检的证据要求（前瞻队列、PPV 明示、癌前病变单列）有了可参照模板，CanScan 后续申报资料的指标编排可以此为锚。",
    tags: ["觅瑞", "监管获批"],},{
    id: "f02b",
    date: "2026-08-15",
    time: "01:35",
    source: "Annals of Oncology（RSS）",
    sourceType: "journal",
    category: "publication",
    featured: true,
    score: 79,
    title: "从 THUNDER 到 PROMISE：燃石 OverC 多组学升级，灵敏度升至 75.1%",
    summary: [
      "The Innovation 2026 刊发 PROMISE 研究（前瞻多中心病例对照，采血 1,706 例、可分析 1,659 例）：多模态（甲基化 + 蛋白）特异性 98.8%、灵敏度 75.1%，TOO top-1 73.1% / top-2 85.0%；甲基化单模态为 71.2%@98.8%。",
      "对比 THUNDER（Ann Oncol 2023，特异性 98.9% / 灵敏度 69.1%，TOO top-1 83.2%），多组学路线带来约 6 个百分点的灵敏度提升。",
    ],
    otherSources: 2,
    reason:"OverC 用加蛋白模态把灵敏度推高，验证单一甲基化模态接近上限的判断；对 MERCURY 多组学路线是直接的能力对标信号，TOO top-1 上我方仍占优（82.4% vs 73.1%）。",
    tags: ["燃石医学", "文献"],},// ---- 2026-08-14 星期五 ----
  {
    id: "f03",
    date: "2026-08-14",
    time: "23:48",
    source: "Guardant Health：Press Release",
    sourceType: "official",
    category: "product",
    featured: true,
    score: 85,
    title: "Shield MCD 获 FDA 突破性器械认定后，确认入选 NCI Vanguard 研究",
    summary: [
      "Guardant Shield MCD（8 癌种，甲基化 + 片段组学 + 突变）继 FDA 突破性器械认定后，确认入选 NCI Vanguard 多癌筛查研究。",
      "其单癌种产品 Shield（结直肠）已是 FDA 批准的首个一线血检筛查产品，MCD 版本承接同一商业化渠道。",
    ],
    otherSources: 8,
    reason:"NCI Vanguard 的官方背书意味着 Shield MCD 将直接积累前瞻筛查队列证据，与 Galleri 的 NHS 随机对照形成两条并行示范路径；Vanguard 的方案设计细节值得逐条拆解。",
    tags: ["Guardant", "产品发布"],},{
    id: "f04",
    date: "2026-08-14",
    time: "22:15",
    source: "Exact Sciences：Investor Relations",
    sourceType: "official",
    category: "product",
    featured: true,
    score: 78,
    title: "Cancerguard 启动 LDT 商业化：ASCEND-2 数据支撑的定价策略落地",
    summary: [
      "Exact Sciences / Abbott 的 Cancerguard（甲基化 + 蛋白， + 突变 reflex）正式沿 LDT 路径商业化。ASCEND-2 测试集（729 癌 / 2,434 非癌）：特异性 98.5%、灵敏度 50.9%（I 期 15.4%、II 期 38.0%、III 期 67.8%、IV 期 85.5%），6 大侵袭性癌 63.7%。",
      "需要注意 ASCEND-2 为多中心前瞻采样的病例对照设计，不等同真实无症状筛查队列。",
    ],
    otherSources: 5,
    reason:"Exact 以 CancerSEEK 谱系 + LDT 快速变现，特异性定在 98.5%、比 Galleri 低约一个点，渠道端会形成价格与假阳性权衡的叙事；DETECT-A（灵敏度 27.1%）的外推落差是其软肋。",
    tags: ["Exact Sciences", "产品发布"],},{
    id: "f05",
    date: "2026-08-14",
    time: "21:07",
    source: "JAMA（期刊）",
    sourceType: "journal",
    category: "publication",
    featured: true,
    score: 76,
    title: "PREEMPT CRC 全文刊发：Freenome 血检 CRC 灵敏度 79.2%，进展期腺瘤 12.5%",
    summary: [
      "JAMA 2025 刊发 PREEMPT CRC（前瞻注册，45–85 岁平均风险拟行肠镜人群，可评估 27,010 例）：特异性 91.5%、CRC 灵敏度 79.2%（I 期 57.1%），进展期腺瘤仅 12.5%。",
      "同期披露的改良版头对头显示：灵敏度升至 85%，进展期癌前病变检出 22%，LoD 下降 2.6 倍。",
    ],
    otherSources: 4,
    reason:"进展期腺瘤 12.5% 是血检 CRC 路线的公认短板，直接影响对肠镜替代叙事的可信度；改良版把癌前病变检出近乎翻倍，说明 Freenome 把研发重心压在了癌前病变上。",
    tags: ["Freenome", "文献"],},{
    id: "f06",
    date: "2026-08-14",
    time: "19:31",
    source: "公众号：诺辉健康",
    sourceType: "official",
    category: "funding",
    featured: true,
    score: 74,
    title: "诺辉健康发布中报：常卫清持续放量，宫证清、幽幽管管线推进",
    summary: [
      "常卫清（FIT-DNA：KRAS 突变 + BMP3/NDRG4 甲基化 + 便隐血）持续放量；Clear-C 前瞻注册临床（可分析 4,758 例）口径为特异性 87%、CRC 灵敏度 91.9%、进展期癌前病变 63.5%、NPV 99.6%。",
      "公司同步披露宫证清（宫颈）与幽幽管（胃）研发进展。",
    ],
    otherSources: 2,
    reason:"常卫清持有中国首张癌症早筛 III 类证，其居家采样 + 获批单癌种的商业兑现节奏，是评估国内早筛支付意愿的最佳样本，对 CanScan 体检端定价有直接参照价值。",
    tags: ["诺辉健康", "融资合作"],},{
    id: "f07",
    date: "2026-08-14",
    time: "17:26",
    source: "Cancer Discovery（RSS）",
    sourceType: "journal",
    category: "publication",
    featured: true,
    score: 72,
    title: "DELFI-L101 一年回望：FirstLook Lung 的 53% 观察特异性争议与 LDT 部署",
    summary: [
      "DELFI-L101（前瞻采样病例对照，N=958；USPSTF 2021 肺癌筛查适格人群）验证集：观察特异性 53% / 灵敏度 84%，筛查人群加权后 58% / 80%，I 期灵敏度 71%、IV 期 98%。",
      "Delfi 以低深度 WGS 片段组学（5 Mb 窗口，短 / 长片段比 + 末端 + CNV）的低成本路线切入肺癌筛查 LDT 市场。",
    ],
    otherSources: 1,
    reason:"片段组学成本优势真实存在，但 53% 观察特异性意味着沉重的假阳性负担；与 CanScan 金陵队列 98.1% 特异性的对比，是销售端最有力的对照弹药。",
    tags: ["Delfi", "文献"],},{
    id: "f08",
    date: "2026-08-14",
    time: "15:02",
    source: "FDA：Breakthrough Devices",
    sourceType: "regulator",
    category: "regulatory",
    featured: true,
    score: 70,
    title: "鹍远 PDACatch 获 FDA 突破性器械认定，胰腺癌甲基化检测提速",
    summary: [
      "鹍远基因 PDACatch（胰腺癌甲基化 panel）获 FDA 突破性器械认定。其 MCED 产品 PanSeer（5 癌种）泰州队列研究（Nat Commun 2020）曾报告：确诊前最长 4 年检出 95%（巢式回顾设计，方法学存在争议），确诊后队列特异性 96% / 灵敏度 88%。",
    ],
    otherSources: 2,
    reason:"胰腺癌单点突破避开 MCED 主战场、监管先行卡位；其「确诊前 4 年检出」叙事市场影响力远超证据等级，学术与市场端都需准备方法学回应口径。",
    tags: ["鹍远基因", "监管获批"],},{
    id: "f09",
    date: "2026-08-14",
    time: "13:41",
    source: "ASCO Daily News",
    sourceType: "conference",
    category: "conference",
    featured: true,
    score: 81,
    title: "ASCO 2026 早筛专场盘点：MCED 前瞻数据首次集中交锋",
    summary: [
      "ASCO 2026 早筛专场集中呈现 PATHFINDER 2、NHS-Galleri 次要终点与 ASCEND-2 更新等前瞻数据。NHS-Galleri 次要终点（干预臂 3 轮汇总，3,051 癌 / 194,095 非癌）：特异性 99.55%、episode 灵敏度全癌种 30.7%、12 预设癌种 54.7%，PPV 52.0%、NPV 98.92%，CSO / TOO 92.5%（含 top-2）。",
    ],
    otherSources: 9,
    reason:"RCT 级 episode 灵敏度（30.7%）与病例对照（51.5%）的落差首次在大会公开化，「真实筛查灵敏度」将成为竞品对比新基线；我方沟通话术需同步切换到前瞻口径。",
    tags: ["ASCO", "会议摘要"],},{
    id: "f10",
    date: "2026-08-14",
    time: "11:20",
    source: "公众号：和瑞基因",
    sourceType: "official",
    category: "product",
    featured: true,
    score: 66,
    title: "和瑞莱思宁肝癌早筛 LDT 五周年，PreCar 队列随访数据更新",
    summary: [
      "PreCar 万人队列（乙肝 / 肝硬化高危）：先导研究 500 HCC / 1,000 健康，特异性 97.9%、灵敏度 95.4%，极早期及 AFP·DCP 阴性者仍 >90%.HIFI 平台整合 5hmC + 5′末端 motif + 核小体印记 + 片段分布四类特征。",
    ],
    otherSources: 1,
    reason:"莱思宁在高危人群随访管理场景的深耕，提示单癌种高危渠道与 MCED 普筛渠道的运营逻辑差异，值得在市场分层策略中吸收。",
    tags: ["和瑞基因", "产品发布"],},// ---- 2026-08-13 星期四 ----
  {
    id: "f11",
    date: "2026-08-13",
    time: "22:05",
    source: "Nature Medicine（RSS）",
    sourceType: "journal",
    category: "publication",
    featured: true,
    score: 90,
    title: "DECIPHE-Omnia 见刊 Nature Medicine：世和 MERCURY 多组学框架完整公开",
    summary: [
      "世和基因 CanScan® 鹰眼基于 MERCURY 低深度 WGS 多组学平台（整合基因 / 表观 / 片段特征，13 癌种）：内部独立验证（677 癌 / 687 非癌）特异性 97.8%、灵敏度 87.4%，TOO top-1 82.4%。",
      "金陵前瞻队列（45–75 岁无症状平均风险人群， n=3,724）：特异性 98.1%、灵敏度 53.5%，检出癌中约 93% 为早期。产品已获 FDA 突破性器械认定（2023）与 CE 认证。",
    ],
    otherSources: 5,
    reason:"自家锚定产品方法学全文公开，是本轮竞品对比的统一参照系：前瞻 53.5% 灵敏度与 Galleri 同量级，TOO top-1 82.4% 是差异化强项，应主动进入所有对标材料。",
    tags: ["世和基因", "文献"],},{
    id: "f12",
    date: "2026-08-13",
    time: "20:18",
    source: "公众号：燃石医学",
    sourceType: "official",
    category: "regulatory",
    featured: true,
    score: 77,
    title: "燃石 OverC 进入 NMPA 创新通道两周年：多癌早检注册路径观察",
    summary: [
      "OverC（6 癌种：肝 / 肺 / 食管 / 结直肠 / 胰腺 / 卵巢，靶向甲基化 161,984 CpG 位点）2023 年 10 月进入 NMPA 创新医疗器械特别审查通道，为中国首款进入该通道的多癌早检产品，同时持有 FDA 突破性器械认定与 CE 认证。",
    ],
    otherSources: 3,
    reason:"创新通道不免性能要求但审批沟通效率更高；OverC 的注册进度决定国内 MCED III 类证首张落地的时间表，必须逐季跟踪。",
    tags: ["燃石医学", "监管获批"],},{
    id: "f13",
    date: "2026-08-13",
    time: "16:44",
    source: "Lancet Regional Health – Europe",
    sourceType: "journal",
    category: "publication",
    featured: true,
    score: 71,
    title: "NHS-Galleri 主要终点解读：未达 I/II 期增加目标，IV 期诊断下降超 20%",
    summary: [
      "NHS-Galleri（50–77 岁普通人群， n≈142,000 随机对照）主要终点解读：IV 期诊断下降 >20%、I–II 期上升 16%、检出率 4 倍，但 I/II 期增加的主要终点未达成。",
    ],
    otherSources: 7,
    reason:"主要终点未达是竞品叙事的最大裂痕，但 stage shift 次要终点强劲；解读时应聚焦「分期前移」而非纠缠灵敏度，避免进入对方设定的指标框架。",
    tags: ["GRAIL", "文献"],},{
    id: "f14",
    date: "2026-08-13",
    time: "14:30",
    source: "公众号：泛生子",
    sourceType: "official",
    category: "funding",
    featured: true,
    score: 63,
    title: "泛生子公布早筛管线调整：聚焦肝癌 MRD 与筛查协同",
    summary: [
      "泛生子调整早筛资源分配，肝癌方向强化 MRD 与筛查联动；其 HCCscreen 基于 cfDNA 甲基化 + 突变路线，曾布局多癌种早检。",
    ],
    otherSources: 1,
    reason:"竞品收缩管线反映单癌种商业化的现金流压力，是评估国内早筛赛道资本环境深度的晴雨表。",
    tags: ["泛生子", "融资合作"],},{
    id: "f15",
    date: "2026-08-13",
    time: "09:15",
    source: "早筛共识：专家评论",
    sourceType: "media",
    category: "opinion",
    featured: true,
    score: 68,
    title: "多癌早检纳入体检共识再引热议：性能口径与假阳性管理成焦点",
    summary: [
      "新一轮早筛专家共识讨论中，MCED 进入体检场景的争议集中于三点：前瞻队列灵敏度外推、假阳性后的确诊路径成本、TOO 准确率对后续检查的指导价值。",
    ],
    otherSources: 4,
    reason:"共识风向直接影响体检渠道采购决策；TOO top-1（82.4%）与竞品 top-2 口径的差异需要在共识讨论中主动设置议题。",
    tags: ["行业观点", "共识"],},];

/** 全部动态页补充条目(非精选，无关注理由，带标签行) */
export const EXTRA_ITEMS: NewsItem[] = [
  {
    id: "a01",
    date: "2026-08-15",
    time: "21:53",
    source: "X：Geneoscopy",
    handle: "@geneoscopy",
    sourceType: "social",
    category: "product",
    featured: false,
    score: 45,
    title: "Geneoscopy 推送 ColoSense 居家检测套件续约提醒",
    summary: [
      "Geneoscopy 向用户推送 ColoSense（FIT-RNA 路线）续约提醒，商业化进入存量运营阶段。",
    ],
    tags: ["Geneoscopy", "产品更新"],},{
    id: "a02",
    date: "2026-08-15",
    time: "20:14",
    source: "PubMed 监测",
    sourceType: "journal",
    category: "publication",
    featured: false,
    score: 52,
    title: "文献雷达：结直肠癌筛查依从性真实世界研究新增 3 篇",
    summary: [
      "PubMed 新增 CRC 筛查依从性真实世界研究 3 篇，涉及 FIT 年度复测率与血检单次依从性对比；未发现新性能数据。",
    ],
    tags: ["文献", "依从性"],},{
    id: "a03",
    date: "2026-08-15",
    time: "18:40",
    source: "公众号：鹍远基因",
    sourceType: "official",
    category: "product",
    featured: false,
    score: 49,
    title: "鹍远发布实验室自动化升级公告",
    summary: [
      "鹍远基因公告泰州实验室甲基化检测流程自动化升级，涉及 PanSeer 与 PDACatch 产线通量提升。",
    ],
    tags: ["鹍远基因", "产能"],},{
    id: "a04",
    date: "2026-08-15",
    time: "13:05",
    source: "X：Delfi Diagnostics",
    handle: "@DelfiDx",
    sourceType: "social",
    category: "funding",
    featured: false,
    score: 47,
    title: "Delfi 披露 FirstLook Lung 雇主保险渠道合作案例",
    summary: [
      "Delfi Diagnostics 披露与美国雇主保险渠道的肺癌筛查合作案例，FirstLook Lung 继续沿 LDT 路径放量。",
    ],
    tags: ["Delfi", "商业化"],},{
    id: "a05",
    date: "2026-08-14",
    time: "12:20",
    source: "行业媒体：早筛网",
    sourceType: "media",
    category: "opinion",
    featured: false,
    score: 55,
    title: "行业观察：2026 体检渠道早筛套餐价格战加剧",
    summary: [
      "多家体检机构早筛套餐价格同比下调，单癌种居家检测与 MCED 血检在千元价位段正面竞争。",
    ],
    tags: ["行业", "渠道"],},{
    id: "a06",
    date: "2026-08-14",
    time: "10:48",
    source: "SEC：EDGAR",
    sourceType: "regulator",
    category: "funding",
    featured: false,
    score: 58,
    title: "Guardant Health 提交 8-K：Shield 系列季度检测量指引上调",
    summary: [
      "Guardant 8-K 文件上调 Shield 系列检测量年度指引；Shield MCD 研发与 NCI Vanguard 投入同步增加。",
    ],
    tags: ["Guardant", "财报"],},{
    id: "a07",
    date: "2026-08-13",
    time: "15:56",
    source: "公众号：华大基因",
    sourceType: "official",
    category: "product",
    featured: false,
    score: 51,
    title: "华大基因肿瘤早筛板块完成组织架构调整",
    summary: [
      "华大基因将肿瘤早筛与伴随诊断团队重新整合，强调多组学平台复用。",
    ],
    tags: ["华大基因", "组织"],},{
    id: "a08",
    date: "2026-08-13",
    time: "08:30",
    source: "ClinicalTrials.gov",
    sourceType: "regulator",
    category: "clinical",
    featured: false,
    score: 57,
    title: "新登记：结直肠癌血液筛查头对头前瞻研究",
    summary: [
      "ClinicalTrials.gov 新登记一项 CRC 血检 vs FIT 头对头前瞻筛查研究，计划入组 12,000 例，主要终点为筛查依从性与病变检出率。",
    ],
    tags: ["临床试验", "CRC"],},];

/** 全部动态 = 精选 + 补充，按日期时间倒序 */
export const ALL_ITEMS: NewsItem[] = [...FEATURED_ITEMS, ...EXTRA_ITEMS].sort(
  (a, b) => (a.date < b.date ? 1 :a.date > b.date ? -1 :a.time < b.time ? 1 :a.time > b.time ? -1 : 0)
);

/** 热点榜(过去 48 小时) */
export const HOT_EVENTS:HotEvent[] = [
  {
    id: "h01",
    title: "GRAIL 公布 PATHFINDER 2 完整性能数据",
    badge: "爆",
    source: "GRAIL：Newsroom（网页）",ago: "16小时前",
    heat: 106,
    spark: [12, 18, 26, 41, 55, 72, 88, 97, 106],
    sources: 6,},{
    id: "h02",
    title: "世和 DECIPHE-Omnia 登 Nature Medicine：MERCURY 多组学框架公开",
    badge: "发酵中",
    source: "Nature Medicine（RSS）",ago: "20小时前",
    heat: 102,
    spark: [8, 15, 24, 38, 52, 66, 79, 90, 102],
    sources: 5,},{
    id: "h03",
    title: "觅瑞觅小卫 NMPA 审评要点公开",
    badge: "新",
    source: "NMPA：医疗器械技术审评中心",ago: "6小时前",
    heat: 80,
    spark: [4, 9, 18, 30, 44, 56, 66, 74, 80],
    sources: 3,},{
    id: "h04",
    title: "ASCO 2026 早筛专场：MCED 前瞻数据集中交锋",
    badge: "发酵中",
    source: "ASCO Daily News",ago: "1天前",
    heat: 72,
    spark: [22, 30, 38, 45, 52, 58, 63, 68, 72],
    sources: 9,},{
    id: "h05",
    title: "Shield MCD 入选 NCI Vanguard 研究",
    source: "Guardant Health：Press Release",ago: "1天前",
    heat: 29,
    spark: [6, 9, 12, 15, 18, 21, 24, 27, 29],
    sources: 8,},{
    id: "h06",
    title: "PREEMPT CRC 全文刊发 JAMA",
    source: "JAMA（期刊）",ago: "1天前",
    heat: 26,
    spark: [5, 8, 11, 13, 16, 19, 21, 24, 26],
    sources: 4,},{
    id: "h07",
    title: "Cancerguard 启动 LDT 商业化",
    source: "Exact Sciences：Investor Relations",ago: "2天前",
    heat: 22,
    spark: [10, 12, 14, 15, 17, 18, 19, 21, 22],
    sources: 5,},{
    id: "h08",
    title: "NHS-Galleri 主要终点未达，IV 期诊断下降超 20%",
    source: "Lancet Regional Health – Europe",ago: "2天前",
    heat: 16,
    spark: [14, 13, 14, 15, 14, 15, 16, 15, 16],
    sources: 7,},{
    id: "h09",
    title: "常卫清中报放量，居家早筛管线推进",
    source: "公众号：诺辉健康",ago: "2天前",
    heat: 14,
    spark: [3, 5, 6, 8, 9, 10, 12, 13, 14],
    sources: 2,},];

/** 精选页「当前热点」卡片展示前 5 名 */
export const TOP_HOT = HOT_EVENTS.slice(0, 5);

// ---- 动态时间轴：以服务器(东八区)当天为基准平移演示数据日期 ----

import { addDaysIso, dayLabel, weekdayLabel } from "./dates";

const DAY_MS = 86400000;

function offsetOf(date: string):number {
  return Math.round((Date.parse(FEED_BASE_DATE) - Date.parse(date)) / DAY_MS);
}/** 把条目的固定演示日期平移到以 baseIso(服务器当天)为基准的相对日期 */
export function shiftItemsToBase<T extends { date: string }>(items: T[], baseIso: string): T[] {
  return items.map((item) => ({
    ...item,
    date:addDaysIso(baseIso, -offsetOf(item.date)),}));
}/** 生成以 baseIso 为当天、向前推两天的日期分组 */
export function dynamicDayGroups(baseIso: string): DayGroupDef[] {
  return [0, -1, -2].map((delta) => {
    const iso = addDaysIso(baseIso, delta);
    return { date: iso, label: dayLabel(iso), weekday: weekdayLabel(iso) };
  });
}
