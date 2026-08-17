/**
 * 早筛情报站 — 竞品榜数据集(癌症早筛企业深度调研，聚焦多癌种液体活检)
 *
 * 数据基线：用户调研看板 materials/MCED-dashboard-renew(调研日 2026-06-25)。
 * 2026-08-16 经六个并行核验组对 materials / 早筛文献与会议 / (conference + Publication)
 * 2123 份文档逐组核验，纠偏处见各条目 evidence/note 字段：* - NHS-Galleri 主要终点口径纠正(III/IV 联合降低未达；IV 期三轮合计 ↓14%)
 * - Shield MCD ASCO 2025 口径纠正(10 癌种、整体灵敏度 60%、CSO 93%)
 * - Clear-C 可分析人数 4,245(MedComm 2023 论文口径)
 * - CRC-PREVENT 发表于 JAMA 2023-10(非 2024)
 * - K-DETEK 全队列 PMID 39948555(基线所引 39962452 有误)
 * - UriFind 出处为 Clin Epigenetics 2021(非 BMC Med)
 * - 新增： PulmoSeek Plus 2023、鹍远 GUIDE 2025、PDACatch 2022、和瑞 PreCar
 *   eBioMedicine 2024、觅瑞 CADENCE 管线、PATHFINDER 2 ASCO 2026 主要分析细节
 * 「本地未见」= 信源库无对应文档，沿用基线引用，不另编数字。
 */

// ---- 技术路线(语义配色沿用调研看板) ----
export type RouteKey =
  | "甲基化"
  | "片段组学"
  | "多组学"
  | "突变"
  | "蛋白质"
  | "miRNA"
  | "RNA"
  | "FIT-DNA"
  | "AI";

export const ROUTE_COLORS: Record<RouteKey, string> = {
  "甲基化": "#168f80","片段组学": "#3b6fb6","多组学": "#8b5cf6","突变": "#c2710c","蛋白质": "#d24d6c",
  miRNA: "#0e9488",
  RNA: "#a21caf",
  "FIT-DNA": "#7c8a3b",
  AI: "#64748b",};

export type StudyType =
  | "病例对照"
  | "前瞻队列"
  | "前瞻注册"
  | "前瞻干预"
  | "RCT"
  | "前瞻 + 回顾注册汇总";

/** 研究类型徽章色调(映射站点 accent 令牌) */
export const STUDY_TONE: Record<StudyType, "rose" | "emerald" | "cyan" | "amber" | "ink"> = {
  "病例对照": "rose","前瞻队列": "emerald","前瞻注册": "cyan","前瞻干预": "amber",
  RCT: "ink",
  "前瞻 + 回顾注册汇总": "cyan",};

export interface Study {
  type: StudyType;
  /** 研究名称(含出处简称) */
  name: string;
  /** 入组人群 / 例数 */
  pop: string;
  /** 性能摘要：特异性 / 灵敏度 + 检出分期 + TOO */
  perf: string;
  /** 更新时间：文献发表或会议届次 */
  updatedAt: string;
  /** 核验证据：信源库相对路径；空则注明沿用基线 */
  evidence?: string;
}

export type StatusTone = "emerald" | "cyan" | "amber" | "violet" | "neutral" | "muted";

export interface StatusPill {
  label: string;
  tone: StatusTone;
  /** 适用范围，如「MCED」「CRC」 */
  scope: string;
}

export interface Competitor {
  id: string;
  co: string;
  /** 英文名 / 地区标注 */
  en: string;
  region:"国外" | "国内";
  /** 本司锚定(世和基因) */
  self?: boolean;
  routes: RouteKey[];
  /** 产品布局一句话 */
  layout: string;
  product: string;
  cancers: string[];
  cancerLabel: string;
  mced: boolean;
  status: StatusPill[];
  statusKeys: string[];
  hasFDA: boolean;
  hasNMPA3: boolean;
  /** 信源综述(原看板 src 字段) */
  src: string;
  /** 检测平台 / panel 参数 */
  panel: string;
  studies: Study[];
  /** 该公司条目最后更新时间(取各研究最新) */
  updatedAt: string;
}

export const COMPETITORS: Competitor[] = [
  {
    id: "grail",
    co: "GRAIL",
    en:"美国",
    region:"国外",
    routes: ["甲基化", "AI"],
    layout: "单一 MCED 血检，>50 癌种共享信号 + 组织溯源(CSO / TOO)",product: "Galleri®",
    cancers: ["肛门", "膀胱", "结直肠", "食管", "头颈", "肝", "肺", "淋巴瘤", "卵巢", "胰腺", "胃"],
    cancerLabel: ">50 癌种(12 预设高致死)",
    mced: true,
    status: [
      { label: "FDA 审查中(PMA)", tone: "cyan", scope: "MCED" },{ label: "LDT 商业化", tone: "muted", scope: "MCED" },],
    statusKeys: ["FDA获批", "LDT商业化", "研发或申报中"],
    hasFDA: true,
    hasNMPA3: false,
    src: "Ann Oncol 2021(CCGA-3);Lancet 2023(PATHFINDER);Lancet Oncol 2023(SYMPLIFY);ESMO 2025 / ASCO 2026(PATHFINDER 2);ASCO 2026 + Lancet Reg Health Eur 2026(NHS-Galleri);JPM 2026(商业化)",panel: "靶向甲基化：~1,116,720 CpG / 17.2 Mb(103,456 区域),bisulfite + 杂交捕获；靶向甲基化测序",
    updatedAt: "2026-06(ASCO 2026)",
    studies: [
      {
        type: "病例对照",name: "CCGA-3 独立验证(Ann Oncol 2021)",pop:"癌 2,823 / 非癌 1,254,n=4,077",perf: "特异性 99.5%(99.0–99.8)/ 灵敏度 51.5%(I 期 16.8%、II 期 40.4%、III 期 77.0%、IV 期 90.1%),CSO 88.7%(top 预测)",
        updatedAt: "2021-09 见刊(2021-06 在线)",
        evidence: "Publication/1. Screening and diagnosis/美国 Grail/新建文件夹/2021.06 CCGA3 Article.pdf",},{
        type: "前瞻注册",name: "PATHFINDER 2(性能可分析队列， ASCO 2026 主要分析)",pop:"≥50 岁、无癌临床疑似、符合指南筛查；440 癌 / 31,567 非癌， n=32,007(入组 35,878；数据截止 2026-02-11)",perf: "特异性 99.6% / episode 灵敏度 39.3%(全癌种)、69.8%(12 高致死)、66.2%(6 侵袭性癌);PPV 60.3%、NPV 99.2%;TOO top-2 91.3%；检出癌 53.0% 为 I–II 期；阳性似然比 108.9；诊断解决中位 48 天",
        updatedAt: "2026-06(ASCO；初始结果 ESMO 2025-10)",
        evidence: "conference/2026 ASCO AACR/PATHFINDER2-17124_Giridhar_Slides.pptx;PATHFINDER_2_FactSheet.pdf",},{
        type: "RCT",name: "NHS-Galleri 次要终点(干预臂 · 3 轮汇总)",pop:"3,051 癌 / 194,095 非癌， N=197,146",perf: "特异性 99.55% / episode 灵敏度 30.7%(全癌种)、54.7%(12 预设),PPV 52.0%、NPV 98.92%,CSO / TOO 92.5%(含 top-2)；首轮 PPV 58.0%、灵敏度 37.2% / 63.4%",
        updatedAt: "2026-06(ASCO 2026,Swanton 口头报告)",
        evidence: "conference/2026 ASCO AACR/NHS_Galleri-17101_Swanton_Slides.pptx;NHS_Galleri_Fact_Sheet.pdf",},{
        type: "RCT",name: "NHS-Galleri 主要终点(stage shift)",pop:"50–77 岁普通人群(英格兰 NHS);n≈142,000",perf: "主要终点(III/IV 期联合降低)未达(IRR 1.03,p=0.6324)；次要终点： IV 期诊断第 2/3 轮 ↓22% / ↓26%(三轮合计 ↓14%)、12 预设癌种 I–II 期 ↑16%、筛查检出率 4 倍(MCED 检出 n=937)；临床检出 ↓21%、急诊途径 ↓25%",
        updatedAt: "2026-06(ASCO 2026;Lancet Reg Health Eur 2026 本地未见)",
        evidence: "conference/2026 ASCO AACR/NHS_Galleri_Fact_Sheet.pdf",},{
        type: "前瞻队列",name: "SYMPLIFY(有症状疑癌转诊人群， Lancet Oncol 2023)",pop:"5,461 例(44 家医院)，随访至 9 个月诊断 368 癌；2 年随访更新 533 癌(509 人)",perf: "特异性 98.4% / 灵敏度 66.3%(症状人群);PPV 75.5%(2 年随访重分类后升至 84.2%)、NPV 97.6%;CSO top-1 85.2%;I 期 24.2%→IV 期 95.3%",
        updatedAt: "2023-06(Lancet Oncol;2 年随访更新沿用基线引用)",
        evidence: "Publication/1. Screening and diagnosis/美国 Grail/新建文件夹/2023.06 SYMPLIFY article.pdf",},{
        type: "前瞻队列",name: "PATHFINDER(Schrag,Lancet 2023)",pop:"≥50 岁(含额外风险与一般风险两队列)；可分析 n=6,621,12 个月随访；阳性信号 92 例(1.4%)、真阳性 35 例 / 36 癌",perf: "特异性 99.5%(精炼版) / 99.1%(研究版)；灵敏度 28.9%(受试者级 35/121，原文注明非正式终点);I 期 16.3%;CSO 88%(精炼版 top-1/2);PPV 43.1%(研究版 38%)",
        updatedAt: "2023-10(Lancet 402:1251-60)",
        evidence: "Publication/1. Screening and diagnosis/美国 Grail/新建文件夹/2023.10 PATHFINDER.pdf",},],},{
    id: "exact",
    co: "Exact Sciences / Abbott",
    en:"美国",
    region:"国外",
    routes: ["多组学", "甲基化", "蛋白质", "突变"],
    layout: "MCED(Cancerguard，源自 CancerSEEK 谱系)+ 粪便 DNA(Cologuard 1.0 / Plus,CRC)",product: "Cancerguard™ / Cologuard Plus™",
    cancers: ["胰腺", "肝", "肺", "卵巢", "结直肠", "胃"],
    cancerLabel: "多癌种(CancerSEEK 8 癌种 / Cancerguard 多癌种)",
    mced: true,
    status: [
      { label: "FDA 获批", tone: "cyan", scope: "Cologuard Plus · CRC" },{ label: "LDT 商业化", tone: "muted", scope: "Cancerguard · MCED(2025H2)" },],
    statusKeys: ["FDA获批", "LDT商业化"],
    hasFDA: true,
    hasNMPA3: false,
    src: "Science 2018(CancerSEEK)/ 2020(DETECT-A);NEJM 2024(BLUE-C);AACR 2024(ASCEND-2);JPM 2025(Cancerguard 商业化)",panel: "CancerSEEK:16 基因突变 + 8 蛋白；Cancerguard：甲基化 + 蛋白( + 突变 reflex);Cologuard Plus：多靶点粪便 DNA",
    updatedAt: "2025-01(JPM 2025)/ 2024-03(BLUE-C)",
    studies: [
      {
        type: "病例对照",name: "CancerSEEK(Cohen 2018,Cancerguard 前身)",pop:"1,005 癌(8 癌种)/ 812 健康",perf: "特异性 >99% / 灵敏度中位 70%(I 期 43%、II 期 73%、III 期 78%；卵巢 98%、肝 95%、胃 90%、乳腺仅 33%)",
        updatedAt: "2018-02(Science 359:926-930)",
        evidence: "Publication/papers/multiomics/CancerSEEK_Cohen JD, et al. Science 2018.pdf",},{
        type: "前瞻干预",name: "DETECT-A(Lennon 2020)",pop:"10,006 名 65–75 岁无癌史女性",perf: "血检特异性 98.9% / 灵敏度 27.1%(I–II 期仅 12.7%);+PET-CT 特异性 99.6%、PPV 40.6%",
        updatedAt: "2020-04(Science abb9601)",
        evidence: "Publication/papers/cohort/CancerSEEK2020_Detect-A-10.1126@science.abb9601.pdf",},{
        type: "病例对照",name: "Cancerguard 测试开发(上市版资料)",pop:"19 癌种 590 癌 / 2,434 非癌",perf: "特异性 97.4% / 灵敏度 64.1%( + 突变 reflex 使 I 期 + 28%)——注：该组合出自 2025 上市版资料，信源库未见；库内 ASCEND-2 同队列对应口径为 98.5% / 56.8%",
        updatedAt: "2025(沿用基线引用)",},{
        type: "病例对照",name: "ASCEND-2(多中心前瞻采样病例对照；AACR 2024 poster LB100)",pop:">11,000 入组中选 6,354 样本(癌 1,438 / 非癌 4,916)；测试集 729 癌 / 2,434 非癌",perf: "甲基化 + 蛋白 OR-logic：特异性 98.5% / 灵敏度 50.9%(I 期 15.4%、II 期 38.0%、III 期 67.8%、IV 期 85.5%;I+II 期 26.1%)；除乳腺 / 前列腺 56.8%;6 大侵袭性癌 63.7%。分癌种：肝 80.0%、宫颈 76.9%、胰腺 73.0%、卵巢 71.4%、胃 70.0%、结直肠 64.8%、肺 59.1%、前列腺 11.8%。按病例对照可信度归类，非真实无症状筛查队列",
        updatedAt: "2024-04(AACR 2024)",
        evidence: "conference/2024 ASCO/2024 ASCO exact sciences 行业会.pptx;Publication/1. Screening and diagnosis/美国 Exact science/2023.10 ASCEND-2 ESMO Poster.pdf",},{
        type: "前瞻注册",name: "Deep-C(Cologuard 1.0,NEJM 2014)",pop:"50–84 岁平均风险；n=9,989",perf: "特异性 87% / 灵敏度 92%(CRC)，进展期腺瘤 42%",
        updatedAt: "2014(NEJM；经引文核实)",
        evidence: "conference/JPM2024 slides-20240112-update/JPM2024 slides/IVD/exactscience-presenter-version-website-version.pdf",},{
        type: "前瞻注册",name: "BLUE-C(Cologuard Plus,NEJM 2024)",pop:"≥40 岁平均风险拟行肠镜；n=20,176(98 CRC / 2,144 进展期癌前病变)",perf: "灵敏度 93.9%(CRC,87.1–97.7)/ 特异性 90.6%(进展期肿瘤口径；阴性肠镜 92.7%)；高级别异型增生 74.6%；进展期癌前病变 43.4%;FIT 对照 67.3%",
        updatedAt: "2024-03(NEJM 390:984-993)",
        evidence: "Publication/1. Screening and diagnosis/美国 Exact science/2024.03 BLUE-C 粪便DNA肠癌筛查 Exact-Science.pdf",},],},{
    id: "guardant",
    co: "Guardant Health",
    en:"美国",
    region:"国外",
    routes: ["甲基化", "片段组学", "突变"],
    layout: "单癌种 Shield(CRC,FDA 首个一线血检)已上市 + Shield MCD 多癌种(10 癌种， FDA 突破性器械、入选 NCI Vanguard 研究)",product: "Shield™ / Shield™ MCD",
    cancers: ["结直肠", "膀胱", "食管", "胃", "肝", "肺", "卵巢", "胰腺"],
    cancerLabel: "结直肠(获批)+ 8–10 癌种(MCD：膀胱 / 结直肠 / 食管 / 胃 / 肝 / 肺 / 卵巢 / 胰腺)",
    mced: true,
    status: [
      { label: "FDA 获批(2024-07)", tone: "cyan", scope: "Shield · CRC 首个一线血检" },{ label: "FDA 突破性器械(2025-06)", tone: "amber", scope: "Shield MCD · 多癌种" },],
    statusKeys: ["FDA获批", "FDA突破性器械"],
    hasFDA: true,
    hasNMPA3: false,
    src: "NEJM 2024(ECLIPSE);FDA SSED P230009(2024-07-26 获批);ASCO 2025 / AACR 2025(Shield MCD 验证);JPM 2025(NCI Vanguard 入选)",panel: "Shield：甲基化分区 mp-cfDNA + 片段组学 + 突变；Shield MCD：甲基化为主血检(CSO / TOO 模型覆盖 10 癌种)",
    updatedAt: "2025-06(ASCO 2025)",
    studies: [
      {
        type: "病例对照",name: "Shield 早期验证(ASCO 2022 #3542,LUNAR-2 平台)",pop:"总 4,905 例(CRC 1,366 / 肺 241)",perf: "CRC 灵敏度 93.1% / 特异性 90%;TOO top-1 99%(肠)/ 98%(肺)",
        updatedAt: "2022-06(ASCO 2022)",
        evidence: "conference/2022 ASCO/2022 ASCO 早筛研究进展 v5.3.pptx",},{
        type: "前瞻注册",name: "ECLIPSE(前瞻非随机， CRC;NEJM 2024)",pop:"45–84 岁平均风险、拟行肠镜；入组 10,258 / 可分析 7,861",perf: "特异性 89.6%(≈90%，进展期肿瘤口径)/ 灵敏度 83.1%(CRC;I–III 期 87.5%)，进展期癌前病变 13.2%。FDA SSED 口径： I 期 54.5%(12/22)。2024-07-26 获批(PMA P230009)",
        updatedAt: "2024-03(NEJM 390:973-83)/ 2024-07 获批",
        evidence: "Publication/papers/cohort/ECLIPSE Guardant health.pdf;Publication/papers/cohort/Shield_FDA.pdf",},{
        type: "病例对照",name: "Shield MCD(盲法病例对照， ASCO 2025 poster #10550)",pop:"45 岁以上平均风险设定；训练 >10,000 癌 + >7,000 对照(NCT05334069)",perf: "特异性 98.6%(436/442)/ 灵敏度 60%(222/372,10 癌种；各癌种 21% 前列腺 – 96% 食管-胃；I/II 期 34%、III/IV 期 84%);CSO top-1/2 93%；无筛查手段癌种 73%、6 大侵袭性癌 74%。FDA 突破性器械(2025-06，沿用基线)+ NCI Vanguard 研究依据",
        updatedAt: "2025-06(ASCO 2025)",
        evidence: "conference/2025 ASCO + PREEMPT freenome/2025 ASCO早筛相关内容v4.1.pptx",},{
        type: "病例对照",name: "Shield MCD(盲法病例对照， AACR 2025 #6425)",pop:"778 例可评(40–78 岁，中位 62;55% 女性);10 癌种",perf: "特异性 98.5%(397/403)/ 灵敏度 59.7%(224/375;I/II 期 34.6%、III/IV 期 84.2%);CSO top-1/2 89%；另 #6365:12 癌种 CSO 分类器 top-1 88.2% / top-2 93.6%",
        updatedAt: "2025-04(AACR 2025)",
        evidence: "conference/2025 AACR/2025+AACR摘要集.pdf",},],},{
    id: "freenome",
    co: "Freenome",
    en:"美国",
    region:"国外",
    routes: ["甲基化"],
    layout: "单癌种(CRC，甲基化)已验证 → 平台外扩多癌种",product: "SimpleScreen CRC",
    cancers: ["结直肠"],
    cancerLabel: "结直肠",
    mced: false,
    status: [{ label: "FDA PMA 提交中", tone: "muted", scope: "CRC" }],
    statusKeys: ["研发或申报中"],
    hasFDA: false,
    hasNMPA3: false,
    src: "JAMA 2025(PREEMPT CRC);ASCO GI 2026",panel: "cfDNA 甲基化(单碱基分辨)；平台亦含蛋白 / 基因组特征， CRC 检测以甲基化为主",
    updatedAt: "2025-06(JAMA)",
    studies: [
      {
        type: "前瞻注册",name: "PREEMPT CRC(JAMA 2025)",pop:"45–85 岁平均风险、拟行肠镜；201 中心；n=27,010 可评 / 48,995 入组",perf: "特异性 91.5% / 灵敏度 79.2%(I 期 57.1%、II 期 100%、III 期 82.4%、IV 期 100%),NPV 90.8%、PPV 15.5%；进展期腺瘤 12.5%(未达预设终点)。改良版头对头(灵敏度 85%、癌前病变 22%、LoD ↓2.6×)信源库未见，沿用基线引用",
        updatedAt: "2025-06(JAMA,doi:10.1001/jama.2025.7515)",
        evidence: "conference/2025 ASCO + PREEMPT freenome/PREEMPT-jama_shaukat_2025_oi_250032_1748444687.1321.pdf",},],},{
    id: "delfi",
    co: "Delfi Diagnostics",
    en:"美国",
    region:"国外",
    routes: ["片段组学", "AI"],
    layout: "已上市单癌种(肺);2019 年完成多癌种片段组学病例对照研究",product: "FirstLook™ Lung",
    cancers: ["乳腺", "结直肠", "肺", "卵巢", "胰腺", "胃", "胆管"],
    cancerLabel: "肺(已上市产品);2019 研究覆盖 7 癌种",
    mced: false,
    status: [{ label: "LDT 商业化(2023)", tone: "muted", scope: "肺" }],
    statusKeys: ["LDT商业化"],
    hasFDA: false,
    hasNMPA3: false,
    src: "Nature 2019(Cristiano 多癌种);Cancer Discov 2024(DELFI-L101,PMID 38829053)",panel: "低深度 WGS 片段组学(5 Mb 非重叠窗口，短 / 长片段比 + 末端 + CNV)",
    updatedAt: "2024-11(Cancer Discov 见刊)",
    studies: [
      {
        type: "病例对照",name: "多癌种(Cristiano,Nature 2019)",pop:"236 癌(乳腺 / 结直肠 / 肺 / 卵巢 / 胰腺 / 胃 / 胆管)/ 245 健康",perf: "特异性 98% / 灵敏度 57–>99%(按癌种；全癌种 I 期 68%；联合突变 91%),TOO top-1 61% → top-2 75%",
        updatedAt: "2019-06(Nature 570:385-389)",
        evidence: "Publication/papers/fragmentation/DELFI_DNA_fragment_size_Cristiano S. et. al, Nature 2019.pdf",},{
        type: "病例对照",name: "DELFI-L101(前瞻采样病例对照；FirstLook Lung 依据)",pop:"USPSTF 2021 肺癌筛查适格；N=958(训练 576；验证 382，验证集癌 248 / 非癌 134)",perf: "观察验证：特异性 53% / 灵敏度 84%；筛查人群加权：特异性 58% / 灵敏度 80%;I 期 71%、II 期 89%、III 期 88%、IV 期 98%",
        updatedAt: "2024-06 在线 / 2024-11 见刊(Cancer Discov 14:2224-42)",
        evidence: "Publication/1. Screening and diagnosis/美国 Delfi diagnostics/2024.11 DELFI 肺癌模型.pdf",},],},{
    id: "mirxes",
    co: "觅瑞 Mirxes",
    en:"新加坡·中国",
    region:"国外",
    routes: ["miRNA"],
    layout: "单癌种血检： GASTROClear(胃)+ LungClear(肺， LDT);MCED 管线 CADENCE(NCT05633342,9 癌种，计划 n=15,000，进行中)",product: "觅小卫® / GASTROClear™",
    cancers: ["胃", "肺"],
    cancerLabel: "胃( + 肺 LDT;MCED 在研)",
    mced: false,
    status: [
      { label: "NMPA III类证(2025-10)", tone: "emerald", scope: "胃癌 · 中国首张胃癌早筛证" },{ label: "新加坡 HSA(2019)", tone: "cyan", scope: "胃" },{ label: "FDA 突破性器械", tone: "amber", scope: "胃" },],
    statusKeys: ["NMPA III类证", "FDA突破性器械"],
    hasFDA: true,
    hasNMPA3: true,
    src: "CMDE/NMPA 注册审评资料(杭州觅因);GASTROClear 文献 / 注册资料(信源库未见本地文档，沿用基线 + 公开报道)",panel: "血液 qPCR:12 个 miRNA 标志物组",
    updatedAt: "2025-10(NMPA 获批公告)",
    studies: [
      {
        type: "前瞻队列",name: "新加坡注册临床",pop:"5,282 名无症状胃癌高危人群， 3 年随访",perf: "I 期胃癌检出 87.5%，整体 NPV 99.4%(单癌种无 TOO)",
        updatedAt: "方法学 Gut 2020；队列数据见 2024 港交所招股文件",},{
        type: "前瞻注册",name: "NMPA 注册临床",pop:"7 家机构， 45–74 岁胃癌高风险；前瞻性入组 n=7,253(胃癌 130，高级别上皮内瘤变 19，阴性约 7,104)",perf: "特异性 78.27% / 胃癌灵敏度 81.54%；高级别上皮内瘤变 57.89%;PPV 6.38%、NPV 99.43%",
        updatedAt: "2025-10-09 获批(公开报道一致；信源库本地未见)",},{
        type: "前瞻 + 回顾注册汇总",name: "NMPA 注册临床补充验证",pop:"总 n=9,144(胃癌 334，高级别上皮内瘤变 25，其他胃病 / 其他癌 8,785)",perf: "特异性 78.57% / 胃癌灵敏度 84.73%；高级别上皮内瘤变 56.00%",
        updatedAt: "2025(沿用基线引用)",},],},{
    id: "epigenomics",
    co: "Epigenomics",
    en:"德国 / 美国",
    region:"国外",
    routes: ["甲基化"],
    layout: "血液单基因甲基化(SEPT9)，首个 FDA 批准的血液 CRC 筛查",product: "Epi proColon®",
    cancers: ["结直肠"],
    cancerLabel: "结直肠",
    mced: false,
    status: [{ label: "FDA 获批(2016)", tone: "cyan", scope: "CRC" }],
    statusKeys: ["FDA获批"],
    hasFDA: true,
    hasNMPA3: false,
    src: "FDA;PRESEPT(Church 2014, Gut)——信源库未见原文，沿用基线引用",panel: "血液 mSEPT9(甲基化特异性 PCR，单基因)",
    updatedAt: "2014(Gut，沿用基线)",
    studies: [
      {
        type: "前瞻队列",name: "PRESEPT(Church 2014,Gut)",pop:"50 岁以上平均风险人群；n=7,929",perf: "特异性 79% / 灵敏度 68%(CRC)，进展期腺瘤 22%",
        updatedAt: "2014(Gut；本地未见原文)",},],},{
    id: "geneoscopy",
    co: "Geneoscopy",
    en:"美国",
    region:"国外",
    routes: ["RNA", "FIT-DNA"],
    layout: "粪便 RNA(mt-sRNA)+ FIT,2024 FDA 获批",product: "ColoSense™",
    cancers: ["结直肠"],
    cancerLabel: "结直肠",
    mced: false,
    status: [{ label: "FDA 获批(2024)", tone: "cyan", scope: "CRC" }],
    statusKeys: ["FDA获批"],
    hasFDA: true,
    hasNMPA3: false,
    src: "FDA 2024;CRC-PREVENT(JAMA 2023-10 在线， PMID 见 PMC10594178)",panel: "粪便脱落细胞 mRNA 标志物 + 血红蛋白(FIT)",
    updatedAt: "2023-10(JAMA 在线)",
    studies: [
      {
        type: "前瞻队列",name: "CRC-PREVENT(JAMA 2023)",pop:"45 岁以上人群；49 州 3,800+ 内镜中心；n=8,920(CRC 36 例 0.40%、进展期腺瘤 606 例 6.8%)",perf: "特异性 88% / 灵敏度 94%(CRC)，进展期腺瘤 46%;vs FIT:94% vs 78%(CRC,P=.01)、46% vs 29%(AA,P<.001)",
        updatedAt: "2023-10-23 在线(JAMA 330(18):1760-1768)",
        evidence: "Publication/papers/cohort/CRC-PREVENT_colosense_stoolRNA_Multitarget Stool RNA Test for Colorectal Cancer Screening - PMC.pdf",},],},{
    id: "genesolutions",
    co: "Gene Solutions",
    en:"越南",
    region:"国外",
    routes: ["甲基化", "片段组学", "多组学", "AI"],
    layout: "SPOT-MAS 多模态 MCED 血检(5 癌种)；越南 LDT 商业化，定位中低收入国家人群筛查(含两项 K-DETEK 前瞻队列读出)",product: "SPOT-MAS™",
    cancers: ["肝", "乳腺", "结直肠", "肺", "胃"],
    cancerLabel: "5 癌种(肝 / 乳腺 / 结直肠 / 肺 / 胃)",
    mced: true,
    status: [{ label: "LDT 商业化", tone: "muted", scope: "MCED · 越南" }],
    statusKeys: ["LDT商业化"],
    hasFDA: false,
    hasNMPA3: false,
    src: "eLife 2023(病例对照验证集);Cancer Investigation 2023(K-DETEK 中期， NCT05227261);BMC Medicine 2025(K-DETEK 全队列， PMID 39948555)",panel: "SPOT-MAS：亚硫酸盐法多模态 cfDNA — 450 靶向区 / 18,000 CpG 甲基化 + 全基因组甲基化(2734×1Mb)+ CNA(588×5Mb)+ 片段长度 + 末端 motif，浅层 WGS ~0.55X,DNBSEQ-G400，机器学习集成",
    updatedAt: "2025-02(BMC Med)",
    studies: [
      {
        type: "病例对照",name: "SPOT-MAS 验证集(eLife 2023)",pop:"全队列 738 癌(肝 / 乳腺 / 结直肠 / 肺 / 胃)/ 1,550 健康；验证集 239 癌 / 474 健康",perf: "特异性 97.0% / 灵敏度 72.4%(5 癌种),TOO top-1 70.0%(早前 285 癌 / 222 健康先导： 95.9% / 73.9%,VMJ 2022-04)",
        updatedAt: "2023-10(eLife VoR)",
        evidence: "Publication/papers/multiomics/elife-89083-v1_越南早筛方法学.pdf",},{
        type: "前瞻队列",name: "K-DETEK 中期(Cancer Invest 2023)",pop:"13 院 + 1 所、≥40 岁无症状人群前瞻入组 n=2,795",perf: "检出 13 例(0.47%),6 真阳性 → PPV 60%,TOO top-2 83.3%(中期、随访未满， PPV 不稳定)",
        updatedAt: "2023-02(Cancer Invest 41(3):232-248)",
        evidence: "Publication/papers/cohort/Clinical validation of a ctDNA-Based Assay…27越南早筛前瞻干预.pdf",},{
        type: "前瞻队列",name: "K-DETEK 全队列(BMC Medicine 2025,PMID 39948555)",pop:"75 院 + 1 所、≥40 岁无症状人群前瞻入组 9,057 / 合格 n=9,024,12 个月随访",perf: "特异性 99.71% / 灵敏度 70.83%(早期 I–IIIA 70.59%);PPV 39.53%、NPV 99.92%;TOO top-2 仅 52.94%(覆盖 11 癌种、含 6 种无标准筛查；真实前瞻队列， TOO 较病例对照 70% 大幅回落， PPV 与 PATHFINDER 38% 相当)",
        updatedAt: "2025-02(BMC Med 23:90)",
        evidence: "Publication/Evidence/多癌种筛查专家共识2025/1-s2.0-S2095927325006565-main.pdf(综述表 1 收录同口径)",},],},];

// ---- 国内厂商 ----
export const COMPETITORS_CN: Competitor[] = [
  {
    id: "geneseeq",
    co: "世和基因",
    en:"Geneseeq",
    region:"国内",
    self: true,
    routes: ["片段组学", "多组学", "AI"],
    layout: "MERCURY™ 多组学平台： MCED(13 癌种)+ 单癌种(肺 / 胃 / 食管 / 结直肠 / 胰腺)+ MRD",product: "CanScan® 鹰眼",
    cancers: ["乳腺", "宫颈", "结直肠", "子宫内膜", "食管", "胃", "肝", "肺", "卵巢", "胰腺", "前列腺", "胆管", "淋巴瘤"],
    cancerLabel: "13 癌种",
    mced: true,
    status: [
      { label: "FDA 突破性器械(2023)", tone: "amber", scope: "MCED" },{ label: "CE 认证", tone: "violet", scope: "MCED" },],
    statusKeys: ["FDA突破性器械", "CE认证"],
    hasFDA: true,
    hasNMPA3: false,
    src: "Nature Medicine 2025(DECIPHE-Omnia，信源库未见原文，沿用基线);AACR 2024(#1266/#1263)；金陵队列 NCT06011694",panel: "低深度 WGS(MERCURY，整合基因 / 表观 / 片段特征)",
    updatedAt: "2025(Nat Med)/ 2024-04(AACR)",
    studies: [
      {
        type: "病例对照",name: "内部独立验证(AACR 2024 #1266)",pop:"677 癌 / 687 非癌(基线口径)；全研究 13 癌种共 8,343 人",perf: "特异性 97.8% / 灵敏度 87.4%(I 期≈79%、III/IV 期 >90%),TOO top-1 82.4%(沿用基线，疑出自 Nat Med 2025 全文);AACR 2024 会议口径 TOO top-2 91.7%",
        updatedAt: "2024-04(AACR 2024)/ 2025(Nat Med)",
        evidence: "conference/2024 AACR study_highlight/2024 AACR early screening study share_v4.2.pptx",},{
        type: "前瞻队列",name: "金陵队列(NCT06011694)",pop:"45–75 岁无症状平均风险人群；n=3,724",perf: "论文口径(Nat Med 2025，沿用基线)：特异性 98.1% / 灵敏度 53.5%(检出癌中约 93% 为早期)。AACR 2024 一年中期口径(#1263)：特异性 97.8% / 灵敏度 55.2%(检测范围内癌种 63.6%),PPV 17.4%(较体检提升 10 倍)，检出阳性者 0–II 期占比 14/16≈87.5%，年患癌率 0.78%",
        updatedAt: "2025(Nat Med)/ 2024-04(AACR 中期)",
        evidence: "conference/2024 AACR study_highlight/2024 AACR early screening study share_v4.2.pptx",},],},{
    id: "burningrock",
    co: "燃石医学",
    en:"Burning Rock",
    region:"国内",
    routes: ["甲基化", "AI"],
    layout: "MCED 血检(6 癌种)",product: "OverC™",
    cancers: ["肝", "肺", "食管", "结直肠", "胰腺", "卵巢"],
    cancerLabel: "6 癌种",
    mced: true,
    status: [
      { label: "NMPA 创新通道(2023-10)", tone: "emerald", scope: "MCED · 中国首款多癌早检入创新通道" },{ label: "FDA 突破性器械(2023)", tone: "amber", scope: "MCED" },{ label: "CE 认证", tone: "violet", scope: "MCED" },],
    statusKeys: ["NMPA创新通道", "FDA突破性器械", "CE认证"],
    hasFDA: true,
    hasNMPA3: false,
    src: "Ann Oncol 2023(THUNDER,PMID 36849097);The Innovation 2026(PROMISE,PMID 41737326);NMPA 创新通道公示",panel: "靶向甲基化：定制 161,984 个 CpG 位点",
    updatedAt: "2025-08(PROMISE 在线)",
    studies: [
      {
        type: "病例对照",name: "THUNDER(多中心前瞻采样病例对照；Ann Oncol 2023)",pop:"开发 / 内部验证： cfDNA n=1,693(癌 735 / 非癌 958)；前瞻独立队列 n=1,010(505/505)",perf: "MCDBT-1：特异性 98.9% / 灵敏度 69.1%(I–III 期 59.8%);TOO top-1 83.2% / top-2 91.7%。另有 MCDBT-2:75.1%@95.1%",
        updatedAt: "2023-02 在线(Ann Oncol)",
        evidence: "Publication/1. Screening and diagnosis/中国 BurningRock/BnR 2023.02 THUNDER Manuscript in AOO.pdf",},{
        type: "病例对照",name: "PROMISE(前瞻多中心病例对照，多组学；The Innovation 2026)",pop:"前瞻采血 n=1,706(癌 866 / 非癌 840)；可分析 n=1,659，训练 1,158 / 验证 501;9 癌种",perf: "多模态(甲基化 + 蛋白)特异性 98.8% / 灵敏度 75.1%;TOO top-1 73.1% / top-2 85.0%；甲基化单模态 71.2%@98.8%",
        updatedAt: "2025-08 在线(The Innovation 2026;7(1):101076)",
        evidence: "Publication/1. Screening and diagnosis/中国 BurningRock/BnR 2025 PROMISE.pdf",},],},{
    id: "singlera",
    co: "鹍远基因",
    en:"Singlera",
    region:"国内",
    routes: ["甲基化", "片段组学"],
    layout: "MCED(PanSeer,5 癌种)+ 胰腺癌(PDACatch)+ 消化道 5 癌(GUIDE/GutSeer)",product: "PanSeer / PDACatch / GutSeer",
    cancers: ["胃", "食管", "结直肠", "肺", "肝", "胰腺"],
    cancerLabel: "5 癌种( + 胰腺 PDACatch；消化道 GUIDE)",
    mced: true,
    status: [
      { label: "FDA 突破性器械", tone: "amber", scope: "PDACatch · 胰腺" },{ label: "LDT / 研发", tone: "muted", scope: "MCED" },],
    statusKeys: ["FDA突破性器械", "研发或申报中"],
    hasFDA: true,
    hasNMPA3: false,
    src: "Nature Communications 2020(泰州队列 TZL);BMC Medicine 2022(PDACatch);Mol Cancer 2025(GUIDE/GutSeer)",panel: "PanSeer：甲基化单体型(半靶向 PCR)12,000 位点 / 600 区域， LoD ~0.1%;PDACatch：胰腺癌甲基化 panel;GUIDE：甲基化 + 片段组学",
    updatedAt: "2025(Mol Cancer GUIDE)",
    studies: [
      {
        type: "病例对照",name: "PanSeer 泰州 TZL(确诊后；Nat Commun 2020)",pop:"TZL 队列 123,115 健康者；确诊后癌 223 例 + 健康对照(另 200 组织样本)",perf: "特异性 96%(93–98%)/ 灵敏度 88%(80–93%)(5 癌种：胃 / 食管 / 结直肠 / 肺 / 肝)",
        updatedAt: "2020-07(Nat Commun 11:3475)",
        evidence: "Publication/1. Screening and diagnosis/中国 Singlera/Singlera 2020.07 PanSeer 泰州队列.pdf",},{
        type: "病例对照",name: "PanSeer 泰州 TZL(确诊前 4 年；巢式回顾)",pop:"605 无症状者中 191 例采血后 4 年内确诊为 5 癌种之一",perf: "检出 95%(89–98%，最长早于临床诊断 4 年)——对照取自同队列、巢式回顾设计，方法学受质疑",
        updatedAt: "2020-07(Nat Commun)",
        evidence: "Publication/1. Screening and diagnosis/中国 Singlera/Singlera 2020.07 PanSeer 泰州队列.pdf",},{
        type: "病例对照",name: "GUIDE / GutSeer(消化道 5 癌；Mol Cancer 2025)",pop:"1,057 癌 + 1,415 非癌训练验证；独立盲测 846 人(含 198 例 I/II 期，占 66.4%)",perf: "验证集 AUC 0.950，灵敏度 82.8%@特异性 95.8%，独立测试灵敏度 81.5%；分癌种：结直肠 92.2%、肝 92.9%、胰 88.6%、食管 75.5%、胃 65.3%",
        updatedAt: "2025(Mol Cancer 24:163)",
        evidence: "conference/2025 ASCO + PREEMPT freenome/鹍远-GUIDE 相关 pdf",},{
        type: "病例对照",name: "PDACatch(胰腺导管癌；BMC Medicine 2022)",pop:"232 PDAC / 25 慢性胰腺炎 / 323 健康",perf: "56 标志物分类器 AUC 0.91(验证灵敏度 84% / 特异性 89%)",
        updatedAt: "2022-11(BMC Med 20:458)",
        evidence: "Publication/1. Screening and diagnosis/中国 Singlera/Singlera 2022.11 胰腺癌.pdf",},],},{
    id: "berry",
    co: "和瑞基因",
    en:"Berry Oncology(贝瑞旗下)",
    region:"国内",
    routes: ["多组学", "片段组学", "甲基化"],
    layout: "单癌种(肝)已上市 → 肺癌等研发；PreCar 前瞻万人队列",product: "莱思宁 (LiverScreening)",
    cancers: ["肝"],
    cancerLabel: "肝(HIFI 平台可外扩)",
    mced: false,
    status: [{ label: "LDT 商业化(2020-08)", tone: "muted", scope: "肝" }],
    statusKeys: ["LDT商业化"],
    hasFDA: false,
    hasNMPA3: false,
    src: "PreCar 项目；CSCO 2021;Cell Res 2021(HIFI);eBioMedicine 2024(PreCar 前瞻)；肝癌早筛专家共识",panel: "HIFI 平台：低深度 WGS + 5hmC 测序，整合 5hmC + 5′末端 motif + 核小体印记(NF)+ 片段分布 四类特征， logistic 回归加权模型(单癌种无 TOO)",
    updatedAt: "2024-02(eBioMedicine)",
    studies: [
      {
        type: "病例对照",name: "PreCar(万人队列·性能数据为先导病例对照)",pop:"乙肝 / 肝硬化高危万人队列；先导 500 HCC / 1,000 健康",perf: "特异性 97.9% / 灵敏度 95.4%(HCC；极早期及 AFP·DCP 阴性者仍 >90%)——信源库未见该拆分，沿用基线引用",
        updatedAt: "沿用基线(本地未见)",},{
        type: "病例对照",name: "HIFI 肝硬化队列(确诊后；Cell Res 2021)",pop:"13 家医院 11 省： 2,247 肝硬化(LC)+ 481 HCC + 476 健康；验证集 95 HCC / 100 LC",perf: "验证集 HCC vs 肝硬化：灵敏度 95.79% / 特异性 95.00%；测试集(148 HCC/1,800 LC)95.42% / 97.83%;AUC 0.995–0.996(显著优于 AFP 0.83–0.85)",
        updatedAt: "2020-11 接收(Cell Res 2021)",
        evidence: "Publication/1. Screening and diagnosis/中国 BerryGene/Berry 2020.11 HIFI 肝癌.pdf",},{
        type: "前瞻队列",name: "PreCar 前瞻监读(eBioMedicine 2024)",pop:"多中心横断面 4,367 LC + 510 HCC(16 家医院);Stage I 建模(510 HCC/2,074 LC),Stage II 前瞻监读(2,293 LC)",perf: "PreCar Score 对早期 / 极早期(BCLC A/0)灵敏度 51.32%@特异性 95.53%，联合超声后 60.53%@95.08%(超声单用仅 23.68%)；验证集全分期灵敏度 93.75%@95.4%",
        updatedAt: "2024-02(eBioMedicine 100:104962)",
        evidence: "Publication/papers/cohort/和瑞PreCar前瞻性文章.pdf",},],},{
    id: "newhorizon",
    co: "诺辉健康",
    en:"New Horizon",
    region:"国内",
    routes: ["FIT-DNA", "甲基化", "突变"],
    layout: "居家早筛：常卫清(CRC)+ 噗噗管(FIT)+ 幽幽管(胃)+ 宫证清(宫颈)",product: "常卫清®",
    cancers: ["结直肠", "胃", "宫颈"],
    cancerLabel: "结直肠( + 胃 / 宫颈研发)",
    mced: false,
    status: [{ label: "NMPA III类证(2020-11)", tone: "emerald", scope: "CRC · 中国首张癌症早筛证" }],
    statusKeys: ["NMPA III类证"],
    hasFDA: false,
    hasNMPA3: true,
    src: "MedComm 2023(Clear-C 论文， Hu et al.);CSCO 2020(会议口径)；人民日报；JPM2024 公司 deck",panel: "FIT-DNA(qPCR):KRAS 突变 + BMP3/NDRG4 甲基化 + 便隐血， 4 靶点 31 位点",
    updatedAt: "2023-07(MedComm 论文)",
    studies: [
      {
        type: "前瞻注册",name: "Clear-C(中国首个早筛注册临床；MedComm 2023)",pop:"40–74 岁高危人群、头对头 vs FIT;8 家三甲入组 5,241(2018-09–2019-11)、完成评估 4,245(80.1%;CRC 186 例 4.4%，进展期癌前病变 375 例 8.8%)",perf: "特异性 87.1%(无进展期肿瘤；肠镜阴性 90.3%)/ CRC 灵敏度 91.9%(vs FIT 62.4%,P<0.001)，进展期癌前病变 63.5%(vs FIT 30.9%),NPV 99.6%(95%CI 99.2–99.7)。注：基线「可分析 4,758」已按 MedComm 论文纠偏为 4,245",
        updatedAt: "2023-07(MedComm 4:e345)；会议口径 CSCO 2020",
        evidence: "Publication/1. Screening and diagnosis/中国 NewHorizonBio/诺辉 clear C研究.pdf",},],},{
    id: "genetron",
    co: "泛生子",
    en:"Genetron",
    region:"国内",
    routes: ["多组学", "甲基化", "突变", "蛋白质"],
    layout: "单癌种(肝)→ Mutation Capsule 平台外扩多癌种",product: "HCCscreen™",
    cancers: ["肝"],
    cancerLabel: "肝(M2P 平台可外扩)",
    mced: false,
    status: [
      { label: "FDA 突破性器械(2020-09)", tone: "amber", scope: "肝 · 国内首家" },{ label: "LDT 商业化", tone: "muted", scope: "肝" },],
    statusKeys: ["FDA突破性器械", "LDT商业化"],
    hasFDA: true,
    hasNMPA3: false,
    src: "PNAS 2019(先导);HIT 研究(前瞻，读出时间信源库未见);Sci Transl Med 2022",panel: "Mutation Capsule:cfDNA 甲基化 + 突变 + 蛋白(M2P-HCC)",
    updatedAt: "2019-03(PNAS)/ HIT 沿用基线",
    studies: [
      {
        type: "前瞻队列",name: "HIT 多中心前瞻",pop:"1,615 名 HBsAg+ 乙肝携带者(2019 启动)",perf: "特异性 93% / 灵敏度 88%(早期：<3cm 85%、3–5cm 96%),PPV 40.9% / NPV 99.3%(单癌种无 TOO)——性能数字信源库未见，沿用基线引用",
        updatedAt: "2019 启动；读出时间本地未见",
        evidence: "conference/2022 ASCO/前瞻性研究list.xlsx(仅清单条目)",},{
        type: "病例对照",name: "PNAS 先导(Qu 2019)",pop:"331 例 HBsAg+ 且超声 / AFP 正常者(验证队列);24 阳性、随访 6–8 月确认 4 例 HCC(均 <3cm)",perf: "特异性 94% / 灵敏度 100%;PPV 17%；训练队列 85% / 93%",
        updatedAt: "2019-03(PNAS 116(13):6308)",
        evidence: "Publication/1. Screening and diagnosis/2019.03 HCCscreen 突变+蛋白用于肝癌诊断.pdf",},],},{
    id: "bgi",
    co: "华大基因",
    en:"BGI / 华大数极",
    region:"国内",
    routes: ["甲基化", "多组学"],
    layout: "华常康(粪便DNA, CRC)+ GeneArc(血液， CRC)+ 肝癌 / 多癌种(扩大验证中)",product: "华常康",
    cancers: ["结直肠", "肝"],
    cancerLabel: "结直肠( + 肝；多癌种原型)",
    mced: false,
    status: [{ label: "LDT / 商业化", tone: "muted", scope: "CRC" }],
    statusKeys: ["LDT商业化"],
    hasFDA: false,
    hasNMPA3: false,
    src: "未见同行评议早筛性能全文；信源库无华大文档，沿用基线引用(不采官网口径)",panel: "华常康：粪便 DNA 甲基化(SDC2/ADHFE1/PPP2R5C);GeneArc：血液多重甲基化 PCR",
    updatedAt: "本地未见，沿用基线",
    studies: [
      {
        type: "病例对照",name: "华常康临床验证",pop:"结直肠癌临床队列",perf: "特异性 92.37% / 灵敏度 87.74%(CRC)，进展期腺瘤 66.67%(沿用基线引用)",
        updatedAt: "本地未见，沿用基线",},{
        type: "病例对照",name: "GeneArc(血液甲基化)",pop:"临床试验",perf: "灵敏度 86%(CRC)(沿用基线引用)",
        updatedAt: "本地未见，沿用基线",},],},{
    id: "geneplus",
    co: "吉因加",
    en:"GenePlus",
    region:"国内",
    routes: ["甲基化", "多组学"],
    layout: "早筛早诊系列(吉早安)+ MRD 全病程监测；国产测序平台(DNBSEQ-T7/Gene+)",product: "吉早安®",
    cancers: ["多癌种"],
    cancerLabel: "多癌种早期预警(在研)",
    mced: true,
    status: [{ label: "研发 / LDT", tone: "muted", scope: "早筛早诊" }],
    statusKeys: ["研发或申报中"],
    hasFDA: false,
    hasNMPA3: false,
    src: "未见同行评议早筛性能全文；不采官网口径",panel: "温和甲基化转化(TAPS 类，可同步检测基因组变异)+ 国产 NGS",
    updatedAt: "无(性能未公开披露)",
    studies: [
      {
        type: "病例对照",name: "吉早安 肿瘤早期预警",pop:"—",perf: "性能未公开披露(研发 / LDT 阶段)",
        updatedAt: "无",},],},{
    id: "genecast",
    co: "臻和科技",
    en:"Genecast",
    region:"国内",
    routes: ["甲基化", "片段组学", "多组学"],
    layout: "MRD(ctDNA)为核心 + 多癌种早检(THEMIS 多组学 / TOTEM 靶向甲基化， 7 癌种，已发表)",product: "THEMIS / TOTEM(研究阶段)",
    cancers: ["乳腺", "结直肠", "食管", "胃", "肝", "肺", "胰腺"],
    cancerLabel: "7 癌种(乳腺 / 结直肠 / 食管 / 胃 / 肝 / 肺 / 胰腺)",
    mced: true,
    status: [{ label: "研发 / LDT", tone: "muted", scope: "多癌早检(已发表)" }],
    statusKeys: ["研发或申报中"],
    hasFDA: false,
    hasNMPA3: false,
    src: "Nature Communications 2023(THEMIS,14:6042,PMID 37758713);BMC Cancer 2024(TOTEM,24:840);MONITOR 队列(与中国医学科学院肿瘤医院合作)",panel: "THEMIS：酶法(TET2+APOBEC3A，无亚硫酸盐)低深度全甲基化组测序 WMS,4ml 血浆 / ~2X / 60M reads，整合 甲基化 + 片段FSI+CNA(CAFF) + 末端motif(FEM);TOTEM:EM-seq 靶向甲基化(~1Mb / 82,400 CpG,57 诊断 + 873 溯源 marker，可降至 21+214)",
    updatedAt: "2024-07(TOTEM)/ 2023-09(THEMIS)",
    studies: [
      {
        type: "病例对照",name: "THEMIS(MONITOR 多中心观察性病例对照， Nat Commun 2023)",pop:"497 健康 / 780 癌(7 癌种)；测试集 健康 145 / 癌 238(34.5% 早期)",perf: "多组学(甲基化 + 片段 + CNA + 末端motif)特异性 99% / 灵敏度 83%(197/238；早期 I–II 期 73%)，整体 AUC 0.966;TOO/CSO top-1 65%(90/139)",
        updatedAt: "2023-09(Nat Commun 14:6042)",
        evidence: "Publication/1. Screening and diagnosis/中国 Genecast/Genecast 2023.09 THEMIS.pdf",},{
        type: "病例对照",name: "TOTEM(靶向甲基化， BMC Cancer 2024)",pop:"500 健康 / 733 癌(7 癌种)，训练：测试 7:3；独立验证 143 健康 + 79 肝 + 100 胃",perf: "特异性 98% 目标(测试集 100%)/ 灵敏度 67.3%(早期 I–II 期 45.7%；独立验证 55.9%),AUC 0.908;TOO top-1 77.7% / top-2 86.5%(独立验证 76.0% / 84.0%)",
        updatedAt: "2024-07 接收(BMC Cancer 24:840)",
        evidence: "Publication/1. Screening and diagnosis/臻和 2024.06 TOTEM 甲基化panel溯源.pdf",},],},{
    id: "anchordx",
    co: "基准医疗",
    en:"AnchorDx",
    region:"国内",
    routes: ["甲基化"],
    layout: "单癌种诊断 / 早检： UriFind®(膀胱，尿液 DNA 甲基化)+ PulmoSeek®(肺结节良恶性，血浆甲基化)",product: "UriFind® / PulmoSeek®",
    cancers: ["膀胱", "肺"],
    cancerLabel: "膀胱 / 肺",
    mced: false,
    status: [
      { label: "FDA 突破性器械", tone: "amber", scope: "UriFind · 膀胱" },{ label: "LDT / 受理", tone: "muted", scope: "肺" },],
    statusKeys: ["FDA突破性器械", "研发或申报中"],
    hasFDA: true,
    hasNMPA3: false,
    src: "UriFind(Clin Epigenetics 2021;13:91——基线误作 BMC Med，已纠偏);PulmoSeek(JCI 2021);PulmoSeek Plus(Lancet Digit Health 2023);FDA 突破性器械",panel: "DNA 甲基化靶向捕获测序： UriFind 尿液 cfDNA(双标志物诊断 + 五标志物风险分层);PulmoSeek 血浆 cfDNA(肺结节良恶性分类)",
    updatedAt: "2023-08(PulmoSeek Plus)",
    studies: [
      {
        type: "病例对照",name: "UriFind 膀胱癌(尿液甲基化诊断；Clin Epigenetics 2021)",pop:"可疑膀胱癌 Cohort1 192 / Cohort2 98(回顾)；血尿人群 Cohort3 174(前瞻)",perf: "双标志物模型 灵敏度 88.1%(C2)–91.2%(C3)/ 特异性 89.7%(C2)–85.7%(C3)(低级别肿瘤检出优于细胞学 / FISH)；五标志物分层识别高危 NMIBC/MIBC 灵敏度 90.5%、特异性 86.8%",
        updatedAt: "2021-04(Clin Epigenetics 13:91)",
        evidence: "Publication/1. Screening and diagnosis/中国 AnchorDx (Kindstar) / AnchorDx 2021.04 UriFind 尿液DNA甲基化.pdf",},{
        type: "病例对照",name: "PulmoSeek 肺结节良恶性(血浆甲基化；JCI 2021)",pop:"585 例 LDCT 阳性入组、529 例可分析；140 例独立验证",perf: "AUC 0.843、准确率 0.800;6–20mm 结节 灵敏度 1.000、I 期肺癌 0.971；优于 PET-CT 及 Mayo/VA 临床模型(结节良恶性分类，非无症状筛查)",
        updatedAt: "2021-05(JCI 131(9):e145973)",
        evidence: "Publication/1. Screening and diagnosis/中国 AnchorDx (Kindstar) / AnchorDx 2021.03 PulmoSeek.pdf",},{
        type: "病例对照",name: "PulmoSeek Plus(临床 + 影像 + 甲基化联合；Lancet Digit Health 2023)",pop:"1,380 人、24 家医院(NCT03181490/NCT03651986)",perf: "灵敏度 0.98@特异性 0.50(排除肺癌)，早期(0/I 期)0.98、5–10mm 结节 0.99；模型可减少 89% 不必要手术、73% 延误治疗",
        updatedAt: "2023-08(Lancet Digit Health)",
        evidence: "Publication/1. Screening and diagnosis/中国 AnchorDx (Kindstar) / AnchorDx 2023.08 PulmoSeek Plus.pdf",},],},];

/** 全部竞品(国外在前，本司锚定国内首位) */
export const ALL_COMPETITORS: Competitor[] = [...COMPETITORS, ...COMPETITORS_CN];

// ---- 前瞻队列性能对照(非病例对照研究；PROS) ----
export interface ProspectiveRow {
  co: string;
  prod: string;
  route: RouteKey[];
  type: Exclude<StudyType, "病例对照">;
  study: string;
  mced: boolean;
  canc: string;
  pop: string;
  spec: string;
  specSub?: string;
  sens: string;
  sensSub?: string;
  early: string;
  earlySub?: string;
  too: string;
  tooSub?: string;
  self?: boolean;
  /** 挂载 pf1 明细展开行 */
  detail?: "pf1";
  updatedAt: string;
}

export const PROSPECTIVE: ProspectiveRow[] = [
  {
    co: "GRAIL",prod: "Galleri®", route: ["甲基化"],
    type: "RCT", study: "NHS-Galleri 次要终点(干预臂·3轮汇总)", mced: true, canc: ">50 癌种",pop:"50–77 岁普通人群(英格兰 NHS);3,051 癌 / 194,095 非癌， N=197,146",
    spec: "99.55%", sens: "30.7%", sensSub: "全癌种；12 预设 54.7%；首轮 37.2% / 63.4%",
    early: "—", earlySub: "主要终点 III/IV 联合降低未达；IV 期 2/3 轮 ↓22% / ↓26%,I–II ↑16%",
    too: "92.5%", tooSub: "CSO / TOO 含 top-2；首轮 PPV 58.0%",
    updatedAt: "2026-06(ASCO)",},{
    co: "Exact Sciences",prod: "CancerSEEK(前身)", route: ["突变", "蛋白质"],
    type: "前瞻干预", study: "DETECT-A(Lennon 2020)", mced: true, canc: "多癌种",pop:"10,006 名 65–75 岁无癌史女性",
    spec: "98.9%", specSub: "+PET-CT 99.6%", sens: "27.1%",
    early: "12.7%", earlySub: "I–II 期", too: "—",
    updatedAt: "2020-04(Science)",},{
    co: "GRAIL",prod: "Galleri®", route: ["甲基化"],
    type: "前瞻注册", study: "PATHFINDER 2(性能可分析队列， ASCO 2026)", mced: true, canc: ">50 癌种",pop:"≥50 岁、无癌临床疑似、符合指南筛查；440 癌 / 31,567 非癌， n=32,007",
    spec: "99.6%", sens: "39.3%", sensSub: "全癌种；12 高致死 69.8%;6 侵袭性 66.2%",
    early: "—", earlySub: "检出癌 53.0% 为 I–II 期", too: "91.3%", tooSub: "top-2;PPV 60.3% / NPV 99.2%",
    updatedAt: "2026-06(ASCO)",},{
    co: "Guardant Health",prod: "Shield™", route: ["甲基化", "片段组学"],
    type: "前瞻注册", study: "ECLIPSE(NEJM 2024)", mced: false, canc: "结直肠",pop:"45–84 岁平均风险、拟行肠镜；入组 10,258 / 可分析 n=7,861",
    spec: "89.6%", specSub: "进展期肿瘤口径；阴性肠镜 —", sens: "83.1%", sensSub: "CRC;I–III 期 87.5%",
    early: "—", earlySub: "FDA SSED:I 期 54.5%(12/22)", too: "—", tooSub: "进展期癌前病变 13.2%",
    updatedAt: "2024-03(NEJM)",},{
    co: "Freenome",prod: "SimpleScreen CRC", route: ["甲基化"],
    type: "前瞻注册", study: "PREEMPT CRC(JAMA 2025)", mced: false, canc: "结直肠",pop:"45–85 岁平均风险、拟行肠镜；n=27,010 可评 / 48,995 入组",
    spec: "91.5%", sens: "79.2%", sensSub: "CRC;II 期 100%、III 期 82.4%、IV 期 100%",
    early: "57.1%", earlySub: "I 期", too: "—", tooSub: "进展期腺瘤 12.5%(未达预设终点);NPV 90.8% / PPV 15.5%",
    updatedAt: "2025-06(JAMA)",},{
    co: "Exact Sciences",prod: "Cologuard Plus™", route: ["FIT-DNA"],
    type: "前瞻注册", study: "BLUE-C(NEJM 2024)", mced: false, canc: "结直肠",pop:"≥40 岁平均风险拟行肠镜；n=20,176",
    spec: "90.6%", specSub: "进展期肿瘤口径；阴性肠镜 92.7%", sens: "93.9%", sensSub: "CRC(87.1–97.7)；高级别异型增生 74.6%",
    early: "—", earlySub: "各期相近", too: "—", tooSub: "进展期癌前病变 43.4%;FIT 对照 67.3%",
    updatedAt: "2024-03(NEJM)",},{
    co: "Exact Sciences",prod: "Cologuard 1.0", route: ["FIT-DNA"],
    type: "前瞻注册", study: "Deep-C(NEJM 2014)", mced: false, canc: "结直肠",pop:"50–84 岁平均风险；n=9,989",
    spec: "87%", sens: "92%", sensSub: "CRC",
    early: "—", too: "—", tooSub: "进展期腺瘤 42%",
    updatedAt: "2014(NEJM)",},{
    co: "觅瑞 Mirxes",prod: "觅小卫®", route: ["miRNA"],
    type: "前瞻注册", study: "NMPA 注册临床", mced: false, canc: "胃",pop:"7 家机构、45–74 岁胃癌高风险；前瞻入组 n=7,253(胃癌 130、高级别上皮内瘤变 19)",
    spec: "78.27%", sens: "81.54%", sensSub: "胃癌；高级别上皮内瘤变 57.89%",
    early: "—", too: "—", tooSub: "PPV 6.38% / NPV 99.43%",
    updatedAt: "2025-10(获批)",},{
    co: "诺辉健康",prod: "常卫清®", route: ["FIT-DNA"],
    type: "前瞻注册", study: "Clear-C(中国首个早筛注册临床；MedComm 2023)", mced: false, canc: "结直肠",pop:"40–74 岁高危、头对头 vs FIT；入组 5,241、完成评估 4,245(进展期癌前病变 375 例， 8.8%)",
    spec: "87.1%", sens: "91.9%", sensSub: "CRC；显著优于 FIT(62.4%)",
    early: "—", earlySub: "进展期癌前病变 63.5%(vs FIT 30.9%)", too: "—", tooSub: "NPV 99.6%",
    updatedAt: "2023-07(MedComm)",},{
    co: "觅瑞 Mirxes",prod: "觅小卫®", route: ["miRNA"],
    type: "前瞻 + 回顾注册汇总", study: "NMPA 注册补充验证", mced: false, canc: "胃",pop:"总 n=9,144(胃癌 334、高级别上皮内瘤变 25、其他胃病 / 癌 8,785)",
    spec: "78.57%", sens: "84.73%", sensSub: "胃癌；高级别上皮内瘤变 56.00%",
    early: "—", too: "—",
    updatedAt: "2025(沿用基线)",},{
    co: "GRAIL",prod: "Galleri®(早期版 / 精炼版)", route: ["甲基化"],
    type: "前瞻队列", study: "PATHFINDER(Schrag, Lancet 2023)", mced: true, canc: ">50 癌种", detail: "pf1",pop:"≥50 岁(含额外风险与一般风险两队列)；分析 n=6,621,12 个月随访；阳性信号 92 例(1.4%)、真阳性 35 例 / 36 癌",
    spec: "99.5%", specSub: "精炼版；早期版 99.1%", sens: "28.9%", sensSub: "受试者级 35/121；条目级 29.5%(36/122)",
    early: "16.3%", earlySub: "I 期 7/43;II 26.9% / III 36.4% / IV 75.0%",
    too: "88%", tooSub: "CSO 精炼版；PPV 43.1%(早期版 38%)",
    updatedAt: "2023-10(Lancet)",},{
    co: "Geneoscopy",prod: "ColoSense™", route: ["RNA", "FIT-DNA"],
    type: "前瞻队列", study: "CRC-PREVENT(JAMA 2023)", mced: false, canc: "结直肠",pop:"45 岁以上人群；n=8,920",
    spec: "88%", sens: "94%", sensSub: "CRC;vs FIT 78%",
    early: "—", too: "—", tooSub: "进展期腺瘤 46%(vs FIT 29%)",
    updatedAt: "2023-10(JAMA)",},{
    co: "泛生子",prod: "HCCscreen™", route: ["多组学"],
    type: "前瞻队列", study: "HIT 多中心前瞻", mced: false, canc: "肝",pop:"1,615 名 HBsAg+ 乙肝携带者",
    spec: "93%", sens: "88%", sensSub: "HCC",
    early: "85–96%", earlySub: "<3cm 85%、3–5cm 96%",
    too: "—", tooSub: "PPV 40.9% / NPV 99.3%",
    updatedAt: "沿用基线(本地未见读出)",},{
    co: "Gene Solutions",prod: "SPOT-MAS™", route: ["多组学"],
    type: "前瞻队列", study: "K-DETEK 全队列(BMC Med 2025)", mced: true, canc: "5 癌种",pop:"75 院 + 1 所、≥40 岁无症状前瞻入组 9,057 / 合格 n=9,024,12 个月随访",
    spec: "99.71%", sens: "70.83%", sensSub: "覆盖 11 癌种(含 6 种无标准筛查)",
    early: "70.59%", earlySub: "早期 I–IIIA",
    too: "52.94%", tooSub: "top-2；较病例对照 70% 大幅回落；PPV 39.53% / NPV 99.92%",
    updatedAt: "2025-02(BMC Med)",},{
    co: "Epigenomics",prod: "Epi proColon®", route: ["甲基化"],
    type: "前瞻队列", study: "PRESEPT(Church 2014,Gut)", mced: false, canc: "结直肠",pop:"50 岁以上平均风险人群；n=7,929",
    spec: "79%", sens: "68%", sensSub: "CRC",
    early: "—", too: "—", tooSub: "进展期腺瘤 22%",
    updatedAt: "2014(Gut；本地未见原文)",},{
    co: "觅瑞 Mirxes",prod: "GASTROClear™", route: ["miRNA"],
    type: "前瞻队列", study: "新加坡注册临床", mced: false, canc: "胃",pop:"5,282 名无症状胃癌高危人群， 3 年随访",
    spec: "—", sens: "—",
    early: "87.5%", earlySub: "I 期胃癌检出",
    too: "—", tooSub: "NPV 99.4%",
    updatedAt: "方法学 Gut 2020",},{
    co: "世和基因",prod: "CanScan® 鹰眼", route: ["片段组学", "多组学"], self: true,
    type: "前瞻队列", study: "金陵队列(NCT06011694)", mced: true, canc: "13 癌种",pop:"45–75 岁无症状平均风险人群；n=3,724",
    spec: "98.1%", sens: "53.5%", sensSub: "检出癌中约 93% 为早期",
    early: "~93%", earlySub: "检出癌中早期占比；前瞻 TOO 未单独报告",
    too: "—", tooSub: "病例对照 TOO top-1 82.4%(参照);AACR 2024 中期口径 97.8% / 55.2%",
    updatedAt: "2025(Nat Med)/ 2024-04(AACR 中期)",},{
    co: "GRAIL",prod: "Galleri", route: ["甲基化"],
    type: "前瞻队列", study: "SYMPLIFY(有症状疑癌转诊)", mced: true, canc: ">50 癌种",pop:"5,461 例有症状疑癌转诊人群(44 家医院)，随访至 9 个月诊断 368 癌",
    spec: "98.4%", sens: "66.3%", sensSub: "症状人群、个体水平",
    early: "—", earlySub: "I 期 24.2% → IV 期 95.3%",
    too: "85.2%", tooSub: "top-1 CSO;PPV 75.5%(2 年随访重分类后 84.2%)",
    updatedAt: "2023-06(Lancet Oncol)",},];

export const PROS_TIER_ORDER: ProspectiveRow["type"][] = [
  "RCT", "前瞻干预", "前瞻注册", "前瞻 + 回顾注册汇总", "前瞻队列",
];

// ---- PATHFINDER 1 癌种×分期灵敏度明细(Lancet 2023 附录 Table S8，条目级) ----
export const PF1_STAGES = ["I期", "II期", "III期", "IV期", "NA / 不可分期", "复发-局部", "复发-远处", "总体"] as const;

/** [pct, "检出 / 总数"] | null */
export type Pf1Cell = [number, string] | null;

export const PF1:{ c: string; n:number; r: Pf1Cell[] }[] = [
  { c: "乳腺癌",n: 22, r: [[0, "0/10"], [0, "0/3"], [0, "0/1"],null,null, [0, "0/3"], [100, "5/5"], [22.7, "5/22"]] },{ c: "前列腺癌",n: 20, r: [[0, "0/7"], [0, "0/9"], [0, "0/1"], [100, "1/1"],null, [50, "1/2"],null, [10, "2/20"]] },{ c: "淋巴瘤",n: 19, r: [[57.1, "4/7"], [80, "4/5"], [100, "1/1"], [66.7, "2/3"], [0, "0/2"], [100, "1/1"],null, [63.2, "12/19"]] },{ c: "肺癌",n: 11, r: [[0, "0/6"], [0, "0/2"], [100, "1/1"],null,null, [0, "0/2"],null, [9.1, "1/11"]] },{ c: "黑色素瘤",n: 8, r: [[0, "0/4"], [0, "0/2"],null, [0, "0/1"], [0, "0/1"],null,null, [0, "0/8"]] },{ c: "甲状腺癌",n: 6, r: [[0, "0/3"], [0, "0/1"],null,null, [0, "0/1"],null,null, [0, "0/6"]] },{ c: "子宫癌",n: 4, r: [[50, "1/2"],null, [0, "0/1"],null,null, [0, "0/1"],null, [25, "1/4"]] },{ c: "淋巴细胞白血病",n: 4, r: [null,null,null,null, [66.7, "2/3"], [0, "0/1"],null, [50, "2/4"]] },{ c: "脑 / 中枢神经系统",n: 4, r: [null,null,null,null, [0, "0/2"], [0, "0/2"],null, [0, "0/4"]] },{ c: "膀胱癌",n: 3, r: [[0, "0/1"], [0, "0/1"],null,null,null,null,null, [0, "0/3"]] },{ c: "结直肠癌",n: 3, r: [[0, "0/1"], [0, "0/1"],null, [100, "2/2"],null,null,null, [66.7, "2/3"]] },{ c: "浆细胞肿瘤",n: 3, r: [null,null,null,null, [33.3, "1/3"],null,null, [33.3, "1/3"]] },{ c: "卵巢癌",n: 2, r: [null,null, [50, "1/2"],null,null,null,null, [50, "1/2"]] },{ c: "头颈癌",n: 2, r: [null, [100, "1/1"],null, [100, "1/1"],null,null,null, [100, "2/2"]] },{ c: "胰腺癌",n: 2, r: [null, [100, "1/1"], [0, "0/1"],null,null,null,null, [50, "1/2"]] },{ c: "华氏巨球蛋白血症",n: 2, r: [null,null,null,null, [100, "2/2"],null,null, [100, "2/2"]] },{ c: "肝癌",n: 1, r: [[100, "1/1"],null,null,null,null,null,null, [100, "1/1"]] },{ c: "肝内胆管癌",n: 1, r: [null,null, [100, "1/1"],null,null,null,null, [100, "1/1"]] },{ c: "骨髓增生异常综合征",n: 1, r: [null,null,null,null, [0, "0/1"],null,null, [0, "0/1"]] },{ c: "间皮瘤",n: 1, r: [null,null, [0, "0/1"],null,null,null,null, [0, "0/1"]] },{ c: "肉瘤",n: 1, r: [null, [100, "1/1"],null,null,null,null,null, [100, "1/1"]] },{ c: "小肠癌",n: 1, r: [[100, "1/1"],null,null,null,null,null,null, [100, "1/1"]] },{ c: "肾癌",n: 1, r: [null,null, [0, "0/1"],null,null,null,null, [0, "0/1"]] },];

export const PF1_TOT: Pf1Cell[] = [
  [16.3, "7/43"], [26.9, "7/26"], [36.4, "4/11"], [75, "6/8"],
  [31.3, "5/16"], [15.4, "2/13"], [100, "5/5"], [29.5, "36/122"],
];
