# MCED 固定权威信源与监控方案提案

状态：已确认，分阶段实施中  
核对日期：2026-09-01

## 1. 监控边界

- 根实体固定为已确认的公司、商品、平台别名和研究编号，不承担持续发现未知公司这一 SLA。
- 本轮主竞品库只新增 ClearNote Health、Harbinger Health、GC Genome、SeekIn 和博尔诚。
- 新增条目及研究/次级队列都必须是多癌产品、平台或多癌临床研究。
- 博尔诚仅把“卫常早臻”和“康早臻”建成商品实体；其他联检名称只作为技术覆盖或管线记录。
- 正式事件仍需权威原始证据，或两个相互独立的可信白名单来源；搜索结果和微信公众号只能生成候选。

## 2. 建议批准的公共权威源

| 类别 | 固定入口 | 采集方式 | 建议间隔 | 用途与边界 |
| --- | --- | --- | --- | --- |
| PubMed | `https://eutils.ncbi.nlm.nih.gov/entrez/eutils/esearch.fcgi`、`esummary.fcgi` | E-utilities JSON/XML API；按公司、商品、平台、研究编号的精确别名检索 | 96 小时 | 同行评议论文和已进入 PubMed 的会议论文；同一论文的多个索引不算独立证据 |
| Crossref | `https://api.crossref.org/works` | REST API；按 DOI、标题、作者和更新时间补足 early-online/会议补充刊 | 96 小时 | DOI 元数据与发布日期；只作元数据权威源，不代替论文结论 |
| Europe PMC | `https://www.ebi.ac.uk/europepmc/webservices/rest/search` | REST API；作为 PubMed 漏收、PMC 全文和预印本入口 | 96 小时 | 建议启用；预印本必须标记 `preprint`，不能按同行评议论文发布 |
| ClinicalTrials.gov | `https://clinicaltrials.gov/api/v2/studies` | API v2；精确研究编号 + 实体别名查询，解析 sponsor、collaborator、locations、lastUpdatePostDate | 48 小时 | 研究状态、终点、样本量和医院站点；注册结果不是同行评议结论 |
| ChiCTR | `https://www.chictr.org.cn/searchprojEN.html` | 定向查询；无稳定公开 API 时保留人工/半自动核验 | 48 小时 | 中国临床研究及医院站点 |
| WHO ICTRP | `https://www.who.int/tools/clinical-trials-registry-platform/the-ictrp-search-portal` | 聚合检索和人工兜底 | 48 小时 | 补足非 ClinicalTrials.gov/ChiCTR 注册；不与原注册表重复计证据 |
| FDA/openFDA | `https://api.fda.gov/device/`、`https://www.accessdata.fda.gov/scripts/cdrh/cfdocs/cfpma/pma.cfm` | openFDA API + 原始 PMA 页面 | 48 小时 | 已提交后的公开审评/决定；公司声称的提交需回指 FDA 或标为单方声明 |
| FDA 咨询会 | `https://www.fda.gov/advisory-committees/advisory-committee-calendar` | 日历 HTML 差异 + 实体关键词 | 48 小时 | 咨询会日期、材料和结论 |
| NMPA 数据查询 | `https://www.nmpa.gov.cn/datasearch/home-index.html` | 官方数据查询；CI 遇 WAF 时生成手工任务 | 48 小时 | 注册证和适用范围；当前从 CI 直连可能返回 HTTP 412 |
| CMDE | `https://www.cmde.org.cn/` | 公示/审评公告 HTML 差异 + 人工核验 | 48 小时 | 创新器械、优先审评和技术审评动态 |
| ASCO | `https://www.asco.org/abstracts` | 官方摘要检索；会议窗口按实体别名、研究编号和作者检索 | 平时 336 小时；窗口期 48 小时 | 摘要编号和原文为权威证据 |
| AACR | `https://www.aacr.org/professionals/meetings/` | 从年度会议页解析 Abstracts 页面，再跟踪 Cancer Research supplement | 平时 336 小时；窗口期 48 小时 | 年度 URL 动态解析，不在配置里永久写死年份 |
| ESMO | `https://www.esmo.org/meeting-calendar` | 从会议日历解析 Abstracts 页面和 Annals of Oncology abstract book | 平时 336 小时；窗口期 48 小时 | 年度 URL 动态解析 |

会议窗口定义维持已确认口径：摘要解禁前 7 天至会后 14 天。ASCO GI、DDW、WCLC、AASLD/EASL 等专病会议不做常年全量扫描；只有公司官网预告、已登记研究或既有证据指向该会议时，才动态加入当年窗口。

## 3. 五家新增公司的固定入口

### 3.1 ClearNote Health

| 作用 | URL | 采集方式 |
| --- | --- | --- |
| 公司发布 | `https://www.clearnotehealth.com/feed/` | RSS；仅保留 Avantect MCD/多癌相关项目，过滤胰腺癌和卵巢癌单癌产品 |
| 站点结构兜底 | `https://www.clearnotehealth.com/sitemap_index.xml` | sitemap 差异 |
| NCI Vanguard 一手证据 | `https://prevention.cancer.gov/news-and-events/news/nci-selects-two-assays-vanguard-study-multi-cancer-detection-tests` | 固定页面哈希/日期 |
| 临床研究 | `https://clinicaltrials.gov/api/v2/studies` | 查询 `Avantect Multi-Cancer Detection Test`；已知研究编号进入实体注册表 |

实体别名建议：`ClearNote Health`、`Bluestar Genomics`、`Avantect MCD`、`Avantect Multi-Cancer Detection Test`。

### 3.2 Harbinger Health

| 作用 | URL | 采集方式 |
| --- | --- | --- |
| 公司新闻 | `https://harbinger-health.com/category/press-releases/feed/` | RSS |
| 新闻列表兜底 | `https://harbinger-health.com/news-insights/?category=press-releases` | HTML 差异 |
| 科学/平台基线 | `https://harbinger-health.com/the-science/` | 页面哈希 |
| 临床研究 | `https://clinicaltrials.gov/api/v2/studies` | 精确监控 NCT05435066、NCT07046260，并按实体别名发现后续研究 |

实体别名建议：`Harbinger Health`、`Harbinger HX`、`HarbingerHx`、`Cancer ORigin Epigenetics`、`RESOLVE`。只收多癌检测用途。

### 3.3 GC Genome

| 作用 | URL | 采集方式 |
| --- | --- | --- |
| 公司发布 | `https://gc-genome.com/feed/` | RSS + 多癌关键词过滤 |
| 新闻列表 | `https://gc-genome.com/company-2/news/` | HTML 兜底 |
| 产品页 | `https://m.gcgenome.com/product/healthcheckup-ai-CANCERCH` | 页面哈希/产品字段抽取 |

实体别名建议：`GC Genome`、`GC지놈`、`ai-CANCERCH`、`아이캔서치`。

### 3.4 SeekIn

| 作用 | URL | 采集方式 |
| --- | --- | --- |
| 站点增量 | `https://www.seekincancer.com/sitemap.xml` | sitemap URL/lastmod 差异；该站无可用公开 RSS |
| OncoSeek 产品页 | `https://www.seekincancer.com/oncoseek` | 页面哈希 |
| SeekInCare 产品页 | `https://www.seekincancer.com/seekincare` | 页面哈希 |
| 博客/发布 | `https://www.seekincancer.com/blog/` 前缀 | 从 sitemap 解析新增文章，不依赖会重定向的博客列表页 |

实体别名建议：`SeekIn`、`SeekIn Inc.`、`OncoSeek`、`OncoSeek 2.0`、`SeekInCare`。

### 3.5 博尔诚

| 作用 | URL | 采集方式 |
| --- | --- | --- |
| 多癌分类 | `https://www.biochainbj.com/category/检测服务/多癌血液早检` | HTML 链接/页面哈希差异；站点没有可用 RSS、REST API 或 sitemap |
| 卫常早臻 | `https://www.biochainbj.com/product/39.html` | 商品页哈希；商品实体 |
| 康早臻 | `https://www.biochainbj.com/product/40.html` | 商品页哈希；商品实体 |
| 技术平台 | `https://www.biochainbj.com/创新科技` | 技术数字和癌种覆盖变化；仅形成管线更新 |
| 公司新闻 | `https://www.biochainbj.com/category/新闻中心` | HTML 链接差异 + 多癌实体过滤 |

实体别名建议：`博尔诚`、`BioChain (Beijing) Science & Technology`、`卫常早臻`、`康早臻`。其余“肝肺癌联检、胃肠食管癌联检、消化五癌、六癌”等只进入 `pipeline_coverage`，不生成商品实体。

## 4. 现有注册表中应同步修正的 URL

| 现有问题 | 建议入口 | 结果 |
| --- | --- | --- |
| AnchorDx `/news/` 为 404 | `https://anchordx.com/en/news/activity` | 已验证 HTTP 200 |
| Guardant IR HTML 对 CI 返回 403 | `https://guardanthealth.com/newsroom/press-releases/`；RSS 兜底 `https://guardanthealth.com/feed/` | 已验证 HTTP 200 |
| Burning Rock IR HTML 对 CI 返回 403 | `https://ir.brbiotech.com/rss/news-releases.xml` | 已验证 RSS 200 |
| Berry 当前只指向首页且曾返回 403 | `https://www.berrygenomics.com/column/93/` | 新闻中心已验证 HTTP 200 |
| Genetron 当前指向 About 页面 | `https://www.genetronhealth.com/en/app/news-company.html` | 改为公司新闻列表 |
| Gene Solutions 偶发无法直接抓取 `/news/` | 保留 `https://genesolutions.com/news/`，同时监控 `https://genesolutions.com/our-test/spot-mas` | 新闻 + 产品双入口 |

其他现有公司先保留当前专用新闻页；没有 RSS 的站点使用 HTML 或 sitemap 差异，不再把公司首页上的所有站内链接视为新闻。

## 5. 医院合作方监控

医院不是预先维护一张全球固定列表，而是动态关系边：

1. 从 ClinicalTrials.gov/ChiCTR 的 `sponsor`、`collaborator`、`locations` 获取机构。
2. 从 PubMed/Europe PMC 的作者单位和利益冲突声明补充机构。
3. 只有出现原始证据后，才创建医院来源；来源 URL 必须是医院、大学或癌症中心官方域名。
4. 关系角色限定为联合研发、牵头单位、招募中心、样本提供、商业落地或渠道合作，不能把“入组中心”自动写成“联合研发”。
5. 活跃合作医院每 144 小时检查一次；普通机构页面每 336 小时检查一次。研究结束或 12 个月无新证据后转为休眠，但保留历史关系。

## 6. 可信媒体与发现源建议

### 建议保留为 `trusted`，但不能单独证明临床性能/获批

- GenomeWeb — `https://www.genomeweb.com/`
- MedTech Dive — `https://www.medtechdive.com/`
- Fierce Biotech — `https://www.fiercebiotech.com/`
- STAT — `https://www.statnews.com/`
- The Cancer Letter — `https://cancerletter.com/`
- 动脉网 — `https://www.vbdata.cn/`，仅用于融资、并购、合作和商业化
- 医药魔方 — `https://bydrug.pharmcube.com/`，仅用于产业和产品发现

### 建议降为 `discovery`

- PR Newswire/Business Wire：新闻稿分发不构成独立编辑主体。
- 早筛网 `https://www.zaodx.com/`、IVD 从业者网 `https://www.iivd.net/`：适合发现中文产品和会议线索，结论必须回到原始来源。

### 建议从固定白名单移除

- South China Morning Post、Patient Care Online：与本项目的稳定命中率和专业垂直度较低，保留只会增加无关候选。

所有可信媒体只运行“实体精确别名 + 事件词”查询，每 144 小时一次，不抓取整个站点首页。

## 7. 微信公众号方案（已确认）

生产端使用 WeixinZS 的订阅文章接口，每 144 小时查询订阅后新文章。账号白名单固定为：

| 公众号 | 原始 ID |
| --- | --- |
| 早筛网 | `gh_757596492666` |
| 有趣的胖子万里挑一 | `gh_514ef6e078a8` |
| 循因缉药 | `gh_95e48d6f2116` |
| 诊断科学 | `gh_f9c6851f9a3d` |

- 每次采集先核对四个订阅均为 `following`；缺失或仍在处理时本轮失败关闭并记录覆盖错误。
- 只接收白名单账号和 `mp.weixin.qq.com` 原文链接；以后新增的其他订阅不会自动进入项目。
- 接口不回填订阅前历史文章。2026-09-01 实测订阅端点和文章端点均返回 HTTP 200，四个账号均为 `following`，订阅后新文章数暂为 0。
- 微信文章固定为 `discovery`，不提供权威范围；获批、临床性能和研究结论仍须回到权威原始证据，或满足两个独立可信白名单来源门禁。
- API key 只通过 `WEIXINZS_API_KEY` 注入；`WEIXINZS_BASE_URL` 可覆盖默认端点，仓库不得保存真实 key。

## 8. 调度与健康检查

GitHub Actions 建议每天启动一次轻量调度器，但每个来源按自己的 `next_due_at` 决定是否真正发请求。这样能准确实现 48/96/144/336 小时间隔，避免 `*/2` 在跨月时失真，也能在一次任务失败后于次日重试。

来源注册表建议新增：

- `entity_ids`、`product_ids`、`aliases`
- `collector`: `rss`、`sitemap`、`html_listing`、`pubmed`、`crossref`、`europe_pmc`、`clinicaltrials_v2`、`openfda`、`manual`
- `poll_interval_hours`、`active_windows`
- `cursor_mode`: `etag`、`last_modified`、`content_hash`、`published_at`、`api_updated_at`
- `evidence_scope` 和 `publication_limits`

账本保存每个来源的 `last_checked_at`、`last_success_at`、`next_due_at`、游标、连续失败次数和最后错误。来源超过两个应运行周期未成功时生成覆盖告警；失败不得删除既有事件或推进成功游标。

## 9. 已确认实施项

按以下方案实施：

1. 公共权威源采用 PubMed + Crossref + Europe PMC、ClinicalTrials.gov + ChiCTR/ICTRP、FDA + NMPA/CMDE、ASCO + AACR + ESMO。
2. 五家新增公司的 URL 和采集方式采用第 3 节方案。
3. 同步修正第 4 节已失效或过宽的现有公司 URL。
4. 可信媒体采用第 6 节精简名单；移除 SCMP 和 Patient Care Online。
5. 微信公众号采用第 7 节 WeixinZS 固定白名单方案，只进入候选层。
6. 全网搜索退出常规运行，仅每 6 个月执行一次实体、别名和信源完整性审计。

确认后再把本提案写入 ADR，并实现新的实体注册表、来源调度、ClinicalTrials/会议/关系采集器和看板数据。
