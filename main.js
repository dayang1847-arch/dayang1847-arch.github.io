(() => {
  const root = document.documentElement;
  const copy = {
  "zh": {
    "filterProcurement": "采购协同",
    "procurementStatus": "实际供应商 · STEP / 粒子库 / 智能核价",
    "procurementUpdate": "更新：2026-10-24 · 行情 / 注塑页签切换修复 · 手动刷新",
    "procurementName": "采衡",
    "procurementTitle": "采购协同工作台",
    "procurementSummary": "铜、铝、锡、热轧卷板行情看板：价格卡片、年度与近两周走势、单品种曲线及交易日明细，支持手动DeepSeek刷新。物料选型、注塑核价与28条脱敏报价参考共用结构化资料；内部粒子价格保持本机导入。",
    "procurementSourcingTag": "实际供应商 / 选型目录",
    "procurementDemandTag": "上传目录 / 关联入库",
    "procurementCostTag": "STEP / 粒子价格 / 报价复核",
    "procurementEnter": "进入采购工作台",
    "procurementAccess": "自带 Key · 自采候选仅存当前浏览器 · 中文界面",
    "procurementDescription": "行情看板使用新浪连续合约日线，明确区别具体主力月份、现货及采购结算价。四品种手动刷新通过DeepSeek官方Fetch读取；结构化日线取c收盘字段，正文来源再提炼并核对引文。曲线可切换范围、隐藏品种并悬停或按方向键读数；CSV保留真实有记录日期，缺口不补值。刷新失败、过期、同日冲突和日期倒退保留原值。 六个工作区管理物料选型、实际供应商、数据导入、采购协同，以及成本模型与行情监控。已有6家企业档案、1,023条公开目录记录与164类标准字段。注塑沿用8家已有供应商和90条设备规格；供应商实名商务档案保持本机导入，不编造费率。智能核价统一报价反向复核、按参数计价、STEP图纸方案与粒子价格/历史案例。报价和工艺支持XLSX、文字PDF、TXT/CSV、PNG/JPEG与粘贴文字，DeepSeek生成有出处的待核对草稿。STEP/STP在浏览器本地按需加载OpenCascade读取尺寸、闭合网格体积和包络面积，结合月需求、周期/压力范围比选1/2/4/8穴和已有吨位机台，列出产能、锁模初筛及所选费率的测算。粒子按材料种类、牌号、改性、供应商、密度、元/kg价格、税运条件及有效期管理；通用行情仅作参考。历史图纸与报价的核对结果作为检索上下文，不声称微调训练。原料、加工、其它费用和成本加成分列；含料范围、数量、税费、有效期及费用覆盖未齐时不判断报价合理性。快速档案复用及高级核算保留。Key仅在页面内存；私人档案通过JSON备份，不上传GitHub。采购协同报价与任务仍为模拟。 粒子库新增内部材料货号、原始名称、颜色和来源标识，统一元/g与元/kg并保留单元格出处；报价参考独立保存版本、原值、公式及冲突，不冒充实测工艺。私有整理包可在浏览器导入、检索并带入核价；不随公开网页发布商业价格。 28条用户授权的脱敏报价参考现已在线共享，移除客户、项目、料号、原文件名及自由文本，保留工艺和成本要素；内部粒子采购价仍由本机私有JSON导入。",
    "procurementLimit": "STEP体积为网格估算，包络面积不是精确投影；壁厚、倒扣、模具布局、冷却和机台注射量/尺寸尚待工程核实。AI周期、压力和穴数为待验证建议，未计算模具投资，不能认定经济最优。实际付费AI与图片识读需用自己的账号验证；资料缺口不会补成商业事实。",
    "procurementPreviewAlt": "采衡行情看板：铜铝锡钢价格卡片、历史走势与DeepSeek手动刷新",
    "guideProcurement": "同一工作区可直接切换“行情与线材情景”和“注塑成本”，浏览器返回会恢复对应页签。 行情：进入“成本模型与行情监控 → 行情与线材情景”，顶部点“手动刷新 · DeepSeek”，在展开的连接区填自己的Key、读取并选择模型，勾选本次发送说明后再次刷新。来源未更新时显示检查结果，不生成周末价格；结果仅存当前浏览器，发布快照不会自动改写。 进入“成本模型与行情监控 → 注塑成本 → 智能核价 / 报价复核”。先在高级核算导入本机费率库，或复用已核对的费率模板。在粒子价格 / 历史案例按牌号录入实际元/kg报价、密度、税运和有效期；公开元/吨行情可带入参考草稿，但不能当作指定牌号采购价。反向复核：上传报价或粘贴原文，连接自己的DeepSeek、读取模型并确认发送，逐项核对草稿；补齐数量、周期、穴数与费用条件后比较模型区间。参数核价：填净重、周期、穴数和数量，选择机台/粒子记录，检查原料、加工、其它费用和加成明细。STEP方案：选12MB以内STEP/STP，在本机解析后明确选择实体及分型方向；确认密度、月需求、可分配小时，取得待核对周期/压力范围，生成1/2/4/8穴及已有吨位机台的初筛与测算。可带入某个穴数继续核价；设备尺寸、射胶量、模具投资与试模另行核实。报价资料限5份、总文字60,000字符，文字PDF每批最多5页；扫描PDF请先OCR，XLS另存XLSX。PNG/JPEG及图纸预览需选择账号可用的官方图片Flash模型。核对工艺可保存历史案例用于检索；AI估算不得直接作为实测案例。导出价格/案例库和核价明细备份；原始文件与未授权报价不上传GitHub；授权脱敏报价参考可在线共享，Key刷新清除。快速档案复用、批量核价和高级核算继续可用。 私有整理包在“粒子价格 / 历史案例 → 导入粒子 / 报价JSON”选择，按材料货号或名称检索，点“用于核价（带入牌号）”；报价参考可点“带入参数待核对”。导入参考保留未知日期、供应商和税运状态，须核对后使用。 28条用户授权的脱敏报价参考现已在线共享，移除客户、项目、料号、原文件名及自由文本，保留工艺和成本要素；内部粒子采购价仍由本机私有JSON导入。",
    "guideProcurementLink": "打开采购工作台 ↗",
    "projectViews": "访问",
    "siteViews": "网站访问",
    "metricsAbout": "统计说明",
    "metricsLoading": "访问统计加载中",
    "metricsUnavailable": "统计暂不可用",
    "metricsStarted": "自 {date} 起累计",
    "metricsPending": "等待首次访问记录",
    "metricsCount": "{count} 次访问",
    "metricsNote": "从本次启用后累计，不补算历史访问。网站记录首页打开次数；作品记录本站作品入口打开次数（含登录入口）。刷新会累加；切换语言或筛选不会累加。访问次数并非独立访客。",
    "pdfCadName": "PDF 转 CAD · 图纸工坊",
    "pdfCadTitle": "矢量与扫描图纸转换",
    "pdfCadStatus": "在线转换",
    "pdfCadSummary": "在浏览器中将 PDF 图纸转换为 DWG / DXF，支持独立线条、一键描轮廓、标注校准与按格式下载。",
    "pdfCadFormatTag": "DWG / DXF",
    "pdfCadScanTag": "矢量与扫描件",
    "pdfCadPrivacyTag": "文件本地处理",
    "pdfCadEnter": "开始转换",
    "pdfCadAccess": "无需账号 · 图纸不上传 · 不展示历史记录",
    "pdfCadDescription": "导入 PDF，或包含 PDF 的 RAR / ZIP 压缩包，选择转换模式、按已知标注选取两点校准，在当前浏览器内生成独立线条组成的 DWG / DXF，并分别批量打包下载。",
    "pdfCadLimit": "扫描件转换为可编辑轮廓，文字和尺寸仍需人工校正。转换任务仅保留在当前会话，刷新后清空。",
    "pdfCadPreviewAlt": "原创合成蓝图：PDF 图纸转换为可编辑的 CAD 线条",
    "guidePdfCad": "导入 PDF 或包含 PDF 的 RAR / ZIP，选择矢量或扫描模式，按一条已知尺寸选取两个端点并校准后开始转换。结果可逐页下载，或按 DWG / DXF 分别打包。扫描件输出轮廓，需复核线条与尺寸。图纸仅在当前浏览器处理，不上传、不展示历史；刷新后清空当前任务，请先下载结果。",
    "guidePdfCadLink": "进入图纸工坊 ↗",
    "works": "项目作品",
    "scope": "使用说明",
    "publicStatus": "可在线浏览",
    "lumiTitle": "客户情报与照明方案工作台",
    "lumiDescription": "本机整合领英人物研究、Amazon 等渠道产品采集、TED 照明采购公告和 LUMINA 照明设计入口，按客户与项目追溯来源、任务和版本。线上需账号密码登录，仅浏览已发布资料；实时采集、编辑与模型调用使用完整本机服务。",
    "lightingRD": "客户情报",
    "certification": "产品研究",
    "engineeringCosts": "工程协作",
    "enterLumi": "进入 LumiPilot",
    "manual": "使用说明",
    "lumiAccess": "账号密码登录 · 线上只读 · 实时采集在本机",
    "projectCount": "已保存研发项目",
    "marketCount": "市场资料记录",
    "brandCount": "品牌与企业条目",
    "authStatus": "账号密码登录",
    "tospoTitle": "Outdoor Lighting · 户外照明展示",
    "tospoDescription": "围绕公司介绍、户外照明产品与工程案例，整理 TOSPO 的产品展示与项目浏览体验。通过统一的展示入口，了解企业背景、产品系列和不同应用场景。",
    "companyIntro": "公司介绍",
    "outdoorLighting": "户外照明",
    "productShowcase": "产品展示",
    "projectReferences": "工程案例",
    "enterTospo": "访问 TOSPO",
    "tospoAccess": "账号密码登录 · 登录页在新标签页打开",
    "tospoDecisionDescription": "通过公司、产品和工程案例了解户外照明展示。 进入网站后，使用账号和密码登录查看展示内容。",
    "footerGuide": "整站使用说明",
    "title": "DC Web",
    "home": "DC Web 首页",
    "navigation": "主导航",
    "aboutNav": "关于",
    "skip": "跳到正文",
    "themeDark": "切换到深色主题",
    "themeLight": "切换到浅色主题",
    "switchLanguage": "Switch to English",
    "luminaTitle": "场地布灯、成本与 IES 分析系统",
    "luminaDescription": "内置23款演示灯具，支持办公、园区、工厂、商城、运动场、楼宇及市政道路规划。可本机提取街区地图路网，核对尺寸后布灯；通过访问码调用云端DeepSeek进行文字规划、草图识别和参数补充，密钥仅保存在云端。IES核算布灯、照度、电费与采购，对比高光效、感应及DALI全周期成本，保留实际操作日志、产品导入、报告和方案打包。尺寸及隐藏布局需确认；设备与D4i反馈为模拟。 新增独立采购方案页：根据当前演示方案的灯具数量生成四种配置，比较初购预算、年电费、长期合计与简单回本期，支持 CSV 和完整对比导出。阶梯价由演示规则生成，光效、溢价和工程费为可调整假设，数据保存在浏览器中。",
    "sceneDemo": "三维场景",
    "iesAnalysis": "IES 照度分析",
    "intelligentControl": "智能控制",
    "enterLumina": "体验 LUMINA",
    "luminaAccess": "仅供在线演示 · 无需安装 · 不提供应用下载",
    "luminaScenes": "场景选型",
    "luminaSamples": "演示灯具",
    "luminaModes": "体验模式",
    "luminaPreviewAlt": "LUMINA 办公展厅三维灯光演示，包含产品仓库、照明预设和巡游控制",
    "collectionDescription": "照明工程、市场分析、研发决策、采购协同与交互应用。",
    "collectionUnit": "个项目",
    "collectionHint": "选择一个项目，继续探索",
    "filterLabel": "项目分类",
    "filterAll": "全部项目",
    "filterResearch": "研发工具",
    "filterMarket": "市场分析",
    "marketName": "照明市场工作台",
    "marketTitle": "商品爬虫与推品分析",
    "marketStatus": "交互演示",
    "marketSummary": "从多来源商品采集到客户与友商规格对比，为目标市场整理推品依据与规格建议。",
    "marketCrawlTag": "多来源采集",
    "marketCompareTag": "友商规格对比",
    "marketRecommendTag": "AI 推品分析",
    "marketExplore": "了解功能与使用方式",
    "marketEnter": "进入在线演示",
    "marketAccess": "账号密码登录 · 样例采集与浏览器内分析",
    "marketCrawlDescription": "商品爬虫：采集 Amazon、Shopee 与品牌官网商品，支持暂停与恢复，按品牌、市场和品类归档，并导出 Excel / Markdown 报告。",
    "marketAnalysisDescription": "推品分析：以客户产品为基线，对比目标市场同品类友商的规格与资料覆盖；结合产品逻辑选择，通过 DeepSeek 整理推品依据、核心规格、电路概念与外观提示词。",
    "marketRuntime": "以上为完整工作台功能。在线演示可操作样例采集、导入 CSV 并在浏览器内计算规格、对比同市场商品、完成问卷生成规则建议，以及导出 CSV / Markdown；不执行实时采集或调用 DeepSeek。",
    "guideMarket": "使用账号和密码登录，选择市场和品类运行样例采集，可暂停、继续并查看日志；也可导入 CSV，在当前浏览器计算规格、筛选和对比商品，完成问卷后生成规则建议并导出 CSV / Markdown。演示不执行实时采集或调用 DeepSeek。访问域名已调整，原域名保存的导入记录不会自动迁移，可先导出后再导入。",
    "guideMarketLink": "登录照明市场工作台 ↗",
    "filterShowcase": "产品展示",
    "filterSimulation": "场景仿真",
    "searchLabel": "搜索项目",
    "searchPlaceholder": "搜索项目或关键词",
    "clearSearch": "清除搜索",
    "tagsLabel": "项目领域",
    "projectDetails": "项目详情",
    "emptyTitle": "没有找到匹配的项目",
    "emptyDescription": "试试其他关键词，或查看全部项目。",
    "resetProjects": "清除筛选，查看全部",
    "resultsAll": "展示全部 {total} 个项目",
    "resultsFiltered": "找到 {count} / {total} 个项目",
    "lumiSummary": "找人、找产品、找商机、做方案，以统一情报界面连接客户研究与照明工程。",
    "tospoSummary": "从企业背景到户外灯具与工程案例，浏览产品系列及不同应用场景。",
    "luminaSummary": "从文字、草图和街区地图规划照明，核算 IES；独立采购页对比 MOQ 阶梯价、高光效升级、电费与回本期。",
    "lumiPreviewAlt": "LumiPilot 情报操作台，左侧找人和找产品，右侧商机与照明方案",
    "personalStatus": "个人学习项目",
    "vietquestName": "越语冒险",
    "vietquestTitle": "越南语闯关学习系统",
    "vietquestDescription": "面向中文零基础学习者，把越南语日常交流与照明商务沟通编成 42 课。通过听音、选择和句子排序积累知识，按星级解锁地图，并用错题复习巩固记忆。",
    "vietnameseDaily": "日常越南语",
    "lightingBusiness": "照明商务",
    "pronunciationLogic": "发音与词源",
    "vietquestAccess": "无需账号 · 进度保存在当前浏览器 · 支持手机主屏幕安装",
    "courseUnits": "课程单元",
    "courseLessons": "课程关卡",
    "courseQuestions": "互动题目",
    "filterLearning": "语言学习",
    "showSearch": "打开项目搜索",
    "hideSearch": "收起项目搜索",
    "enterVietquest": "开始学习",
    "practiceVietquest": "练习发音",
    "vietquestSummary": "通过听音、选择与句子排序学习日常越南语和照明商务沟通，按关卡逐步积累。",
    "vietquestPreviewAlt": "成年男性学习者探索越南街景，沿金色星星闯关路线前进",
    "tospoVisitLabel": "访问 TOSPO 登录入口（账号密码登录）",
    "filterStrategy": "策略游戏",
    "wanchaoName": "万朝逐鹿",
    "wanchaoTitle": "跨朝代攻城与实时战略",
    "wanchaoSummary": "选择秦、汉、唐、宋、元或明，在 500 座真实地名城池间发展主城、征募军队并争夺王都。",
    "wanchaoDescription": "六朝各有专属兵种与名将，在真实地名与经纬度构成的 500 城沙盘中建设主城、发展经济、攻城掠地并争夺王都。单人练兵直接在浏览器中运行；朋友联机需要另行部署并配置服务器地址。",
    "wanchaoPreviewAlt": "万朝逐鹿的史诗风格战争封面插画",
    "wanchaoStatus": "练兵可用",
    "wanchaoAccess": "单人练兵立即可用 · 朋友联机需另行配置服务器",
    "sixDynasties": "六朝阵营",
    "fiveHundredCities": "500 座城池",
    "realtimeStrategy": "实时战略",
    "dynastyFactions": "朝代阵营",
    "realCityNames": "真实地名城池",
    "enterWanchao": "进入游戏",
    "guideTitle": "DC Web 使用说明书",
    "guideSubtitle": "整站浏览 · 项目使用 · 访问与数据",
    "guideBrowseTitle": "开始浏览",
    "guideBrowseStep1": "按分类选择项目，或搜索名称与关键词。手机端点击搜索图标展开输入框。",
    "guideBrowseStep2": "点击项目按钮进入应用；展开「项目详情」查看完整介绍与访问说明。",
    "guideBrowseStep3": "右上角可以切换中英文和深浅色主题。语言切换会保留当前筛选与关键词。",
    "guideProjectsTitle": "各项目怎样使用",
    "guideLumi": "使用原账号密码登录后，浏览新版情报操作台与已发布项目资料。界面以找人、找产品为重点，商机与方案位于右侧。线上保持只读；人物与产品实时采集、TED 研究和 LUMINA 本机操作需要完整服务。",
    "guideLumiLink": "登录后查看工作台使用指南 ↗",
    "guideTospo": "浏览公司介绍、户外灯具和工程案例。从项目入口打开账号登录页，登录页在新标签页打开；可回到项目入口返回作品集。",
    "guideTospoLink": "前往账号登录入口 ↗",
    "guideLumina": "选择场景或上传草图、地图。道路可离线提取并叠加核对；在“DeepSeek连接”输入演示访问码可在线规划、识别图片和补充参数。确认场地尺寸与AI假设后生成布灯、照度、节能成本及采购方案。支持产品导入、报告导出与方案打包；不提供应用下载，设备仅模拟。",
    "guideLuminaLink": "进入在线演示 ↗",
    "guideVietquest": "按课程学习词句，通过听音、选择和句子排序闯关，再用错题复习巩固。发音训练可查阅音标与发音规则，设备提供的越南语声音可能不同。",
    "guideVietquestLink": "进入学习首页 ↗",
    "guideWanchao": "选择朝代后进入单人练兵，学习建设、征兵与攻城操作。单人模式直接在浏览器运行；与朋友联机需要另行部署并配置服务器。",
    "guideWanchaoLink": "进入游戏与玩法指南 ↗",
    "guideDataTitle": "访问与数据说明",
    "guideLocalData": "LUMINA 的方案与模拟设备记录、越语冒险的学习进度保存在当前浏览器。切换设备或清除浏览器数据后，原记录可能无法继续使用；需要保留方案时，先使用项目内提供的导出功能。",
    "guideEvidence": "资料日期、来源和计算范围以项目内部记录为准。LumiPilot 的概念模型与待核验标记保留原义；LUMINA 的照度分析仅计算人工直接光。工程应用前，请核对输入与适用条件。",
    "protectedStats": "登录工作台后查看项目、资料与统计。",
    "openLuminaPurchase": "采购与节能对比"
  },
  "en": {
    "filterProcurement": "Procurement",
    "procurementStatus": "Actual suppliers · STEP / Resins / Cost review",
    "procurementUpdate": "Updated Oct 24, 2026 · Market / injection tab fix · Manual refresh",
    "procurementName": "Chaiheng",
    "procurementTitle": "Procurement collaboration workspace",
    "procurementSummary": "Track copper, aluminum, tin and hot-rolled coil with price cards, annual and two-week trends, individual charts and daily close tables. Refresh manually through your own DeepSeek account. Material selection and injection costing retain 28 anonymized quote references; internal resin prices stay in local imports.",
    "procurementSourcingTag": "Actual suppliers / material catalog",
    "procurementDemandTag": "Catalog upload / Supplier linkage",
    "procurementCostTag": "STEP / Resin prices / Quote review",
    "procurementEnter": "Open procurement workspace",
    "procurementAccess": "Your key · Candidates saved in this browser · Chinese UI",
    "procurementDescription": "The market board uses Sina continuous-contract daily closes, distinct from individual main contracts, spot references and supplier settlement prices. Manual refresh uses official DeepSeek Fetch; structured data uses the c close field, while text sources require evidence-backed extraction. Change ranges, toggle curves, inspect tooltips with pointer or arrow keys, and export recorded daily closes. Failures, staleness, same-date conflicts and date regressions retain previous values. Six workspaces include Material Selection with actual supplier records, data imports, procurement collaboration, and Cost Models & Market Monitoring. The catalog retains six company records, 1,023 public entries and 164 standard fields. Injection costing uses eight actual suppliers and 90 equipment rows; private rates are imported locally. Quote review, parameter costing, STEP options and resin/process libraries share the same evidence. Read XLSX, text PDFs, TXT/CSV, PNG/JPEG or pasted content into reviewed DeepSeek drafts. An on-demand browser-local OpenCascade worker reads STEP/STP dimensions, closed-mesh volume and envelope areas. Monthly demand and explicit cycle/pressure ranges compare 1/2/4/8 cavities against recorded machine tonnages, capacity, clamp screening and selected-rate costs. Resin records retain grade, modification, supplier, density, CNY/kg, tax, freight and validity; generic market prices remain references. Reviewed process cases are retrieved as context, not model training. Material, processing, other expenses and markup are separate. Incomplete scope, quantity, tax, validity or coverage prevents a comparable quote verdict. Quick profiles and advanced costing remain available. Keys stay in page memory; private archives are local and backed up with JSON. Procurement collaboration quotes and tasks remain simulations. Resin archives also retain internal material codes, original names, colors and source codes, normalize CNY/g to CNY/kg, and preserve cell evidence. Quote references keep versions, original values, formulas and conflicts separate from measured production cases. Import private JSON locally, search and use parameters for costing; commercial prices are excluded from public releases. The online library now includes 28 user-authorized anonymized quote references, with customer, project, part identifiers, original filenames and free text removed. Technical and cost fields remain; internal resin prices still require a private local JSON import.",
    "procurementLimit": "STEP volume is mesh-derived and envelope area is not the precise silhouette. Wall thickness, undercuts, mold layout, cooling, shot capacity and machine dimensions require engineering verification. AI cycle, pressure and cavity options are estimates; mold investment is not optimized. Paid AI and vision require validation with your own account.",
    "procurementPreviewAlt": "Chaiheng market board: copper, aluminum, tin and steel prices, historical trends and manual DeepSeek refresh",
    "guideProcurement": "Switch directly between Markets and Injection Costs in the same workspace; browser Back restores the corresponding tab. For markets, open Cost Models & Market Monitoring > Markets. Click Manual Refresh / DeepSeek, connect your key, read and select a model, consent and refresh. An unchanged source is reported without inventing weekend prices. Results stay in the current browser and do not rewrite the published snapshot. Open Cost Models & Market Monitoring > Injection Costs > Smart Costing / Quote Review. Import private rates in Advanced Costing or reuse reviewed templates. Add grade-specific resin prices in CNY/kg with density, tax, freight and validity. Public CNY/ton quotes can populate reference drafts only. For quote review, prepare source files or text, connect your own DeepSeek model, consent and verify the extracted fields before comparing cost ranges under matching quantity and scope. Parameter costing takes net mass, cycle, cavities, quantity and selected rates. STEP options read a part up to 12 MB locally; select the entity and parting direction, confirm density, monthly demand and available hours, then obtain reviewable cycle/pressure ranges. Compare 1/2/4/8 cavities, tonnage candidates and selected-rate costs. Machine dimensions, shot capacity, mold investment and trial results still require verification. Sources are limited to five files, 60,000 text characters and five selected PDF pages; scan PDFs need OCR and XLS must be saved as XLSX. PNG/JPEG and drawing previews require an account-supported official vision Flash model. Save verified processes for retrieval, not training; estimates cannot directly become actual production cases. Export libraries and calculations for backup. Files and private quotes are not uploaded to GitHub; keys clear on refresh. Quick profiles, batch reuse and advanced costing remain available. In Resin Prices / Process Cases, import the private resin / quote JSON. Search by material code or name and use the resin or quote parameters for costing. Dates, supplier identities and tax/freight conditions remain pending where the source is silent. The online library now includes 28 user-authorized anonymized quote references, with customer, project, part identifiers, original filenames and free text removed. Technical and cost fields remain; internal resin prices still require a private local JSON import.",
    "guideProcurementLink": "Open procurement workspace ↗",
    "projectViews": "Views",
    "siteViews": "Website views",
    "metricsAbout": "About the counts",
    "metricsLoading": "Loading view counts",
    "metricsUnavailable": "View counts temporarily unavailable",
    "metricsStarted": "Counted since {date}",
    "metricsPending": "Waiting for the first recorded view",
    "metricsCount": "{count} page views",
    "metricsNote": "Counts start when this feature is enabled; historical views are not included. Website views count homepage openings. Project views count openings of this site’s project entry pages, including login entries. Refreshing adds a view; changing language or filters does not. These are page views, not unique visitors.",
    "pdfCadName": "PDF to CAD · Drawing Workshop",
    "pdfCadTitle": "Vector and scanned drawing conversion",
    "pdfCadStatus": "Online conversion",
    "pdfCadSummary": "Convert PDF drawings to DWG / DXF in your browser, with independent lines, one-click outlining, dimension calibration and batch downloads by format.",
    "pdfCadFormatTag": "DWG / DXF",
    "pdfCadScanTag": "Vector & scanned PDFs",
    "pdfCadPrivacyTag": "Local file processing",
    "pdfCadEnter": "Start converting",
    "pdfCadAccess": "No account · Drawings stay local · No conversion history",
    "pdfCadDescription": "Import a PDF or a RAR / ZIP containing PDFs, choose the mode and calibrate two points against a known dimension, then create DWG / DXF files with independent lines in your browser and download ZIPs by format.",
    "pdfCadLimit": "Scanned PDFs become editable contours. Text and dimensions need manual correction. Conversion tasks stay in the current session and clear on refresh.",
    "pdfCadPreviewAlt": "Original synthetic blueprint showing a PDF drawing converted into editable CAD lines",
    "guidePdfCad": "Import a PDF or a RAR / ZIP containing PDFs. Choose vector or scan mode, calibrate two endpoints against a known dimension and start conversion. Download individual pages or a ZIP for each of DWG and DXF. Scan output contains contours; check its lines and dimensions. Drawings are processed only in your browser, with no upload or history. Download your results before refreshing, which clears the current tasks.",
    "guidePdfCadLink": "Open Drawing Workshop ↗",
    "works": "Selected work",
    "scope": "User guide",
    "publicStatus": "Public preview",
    "lumiTitle": "Customer intelligence and lighting proposals",
    "lumiDescription": "The local workspace joins public professional research, Amazon and channel collection, TED lighting-procurement notices and LUMINA design entry points. Customer and project records retain sources, task logs and scheme versions. The online portfolio requires an account and presents published records read-only; live collection and model calls use the full local services.",
    "lightingRD": "Customer intelligence",
    "certification": "Product research",
    "engineeringCosts": "Engineering collaboration",
    "enterLumi": "Explore LumiPilot",
    "manual": "User guide",
    "lumiAccess": "Account required · Read-only online · Live collection runs locally",
    "projectCount": "Saved R&D projects",
    "marketCount": "Market records",
    "brandCount": "Brand & company entries",
    "authStatus": "Account & password required",
    "tospoTitle": "Outdoor Lighting · Product showcase",
    "tospoDescription": "A presentation of TOSPO’s company background, outdoor lighting products and project references. Explore the business, product ranges and lighting applications through one website.",
    "companyIntro": "Company background",
    "outdoorLighting": "Outdoor lighting",
    "productShowcase": "Product showcase",
    "projectReferences": "Project references",
    "enterTospo": "Visit TOSPO",
    "tospoAccess": "Account required · Login opens in a new tab",
    "tospoDecisionDescription": "Explore outdoor lighting through company information, products and project references. Sign in with your website account and password to view the showcase.",
    "footerGuide": "Website user guide",
    "title": "DC Web",
    "home": "DC Web home",
    "navigation": "Main navigation",
    "aboutNav": "About",
    "skip": "Skip to content",
    "themeDark": "Switch to dark theme",
    "themeLight": "Switch to light theme",
    "switchLanguage": "切换到中文版",
    "luminaTitle": "Site-based lighting, costs and IES analysis",
    "luminaDescription": "Includes 23 sample luminaires for indoor, outdoor, commercial, sports, building and municipal lighting. Extract street-map road networks in the browser and verify dimensions before layout. An access code enables live DeepSeek planning, image analysis and parameter suggestions through a protected cloud service; the API key stays on the server. IES calculations cover layouts, direct illuminance, energy and purchasing, with efficient, sensor and DALI lifecycle comparisons. Operation logs, product imports, reports and scheme bundles remain available. Dimensions and hidden layouts require review; devices and D4i feedback are simulated. A separate procurement page compares four configurations using the current demo plan quantities, with MOQ price tiers, upfront budgets, annual energy bills, lifecycle totals, simple payback and CSV/report exports. Price tiers are generated demo estimates; efficacy, premiums and engineering costs are editable assumptions. Comparison data stays in the browser.",
    "sceneDemo": "3D scenes",
    "iesAnalysis": "IES analysis",
    "intelligentControl": "Lighting control",
    "enterLumina": "Try LUMINA",
    "luminaAccess": "Online demonstration only · No installation or app downloads",
    "luminaScenes": "Scene options",
    "luminaSamples": "Sample luminaires",
    "luminaModes": "Experience modes",
    "luminaPreviewAlt": "LUMINA office showroom with 3D lighting, product library, lighting presets and camera controls",
    "collectionDescription": "Lighting engineering, market research, R&D decisions, procurement demos and interactive applications.",
    "collectionUnit": "projects",
    "collectionHint": "Pick a project to explore",
    "filterLabel": "Project categories",
    "filterAll": "All projects",
    "filterResearch": "R&D tools",
    "filterMarket": "Market research",
    "marketName": "Lighting Market Console",
    "marketTitle": "Product crawling & recommendation analysis",
    "marketStatus": "Interactive demo",
    "marketSummary": "Collect product listings and compare customer and peer specifications to develop recommendations for a target market.",
    "marketCrawlTag": "Multi-source collection",
    "marketCompareTag": "Peer spec comparison",
    "marketRecommendTag": "AI product planning",
    "marketExplore": "Explore features & access",
    "marketEnter": "Enter demo",
    "marketAccess": "Account required · Sample collection and browser analysis",
    "marketCrawlDescription": "Product crawler: collect Amazon, Shopee and brand-site listings, pause and resume tasks, organize products by brand, market and category, and export Excel / Markdown reports.",
    "marketAnalysisDescription": "Product planning: use the customer’s products as a baseline and compare specifications and data coverage with same-category peers in the target market. Select product logic, then use DeepSeek to develop recommendation reasons, core specifications, circuit concepts and visual prompts.",
    "marketRuntime": "The features above describe the full workspace. The online demo supports sample collection, CSV import and browser-based specification calculations, same-market comparisons, a questionnaire with rule-based recommendations, and CSV / Markdown export. It does not collect live data or call DeepSeek.",
    "guideMarket": "Sign in with the website account and password. Run sample collection, pause or resume tasks, import CSV files, calculate and compare specifications, complete the questionnaire and export CSV or Markdown. The demo does not run live collection or call DeepSeek. The access domain has changed; previous browser imports remain on the former domain and require export and re-import.",
    "guideMarketLink": "Sign in to Lighting Market Console ↗",
    "filterShowcase": "Showcases",
    "filterSimulation": "Simulation",
    "searchLabel": "Search projects",
    "searchPlaceholder": "Search projects or keywords",
    "clearSearch": "Clear search",
    "tagsLabel": "Project topics",
    "projectDetails": "Project details",
    "emptyTitle": "No matching projects",
    "emptyDescription": "Try another keyword or explore all projects.",
    "resetProjects": "Clear filters and show all",
    "resultsAll": "Showing all {total} projects",
    "resultsFiltered": "{count} of {total} projects found",
    "lumiSummary": "Find people, products and lighting opportunities, then develop proposals in one focused workspace.",
    "tospoSummary": "Explore company information, outdoor luminaires and project references across lighting applications.",
    "luminaSummary": "Plan lighting from text, sketches and street maps; compare MOQ price tiers, high-efficacy upgrades, energy bills and payback on a separate procurement page.",
    "lumiPreviewAlt": "LumiPilot intelligence workspace with people and product research on the left and opportunities and lighting proposals on the right",
    "personalStatus": "Personal learning project",
    "vietquestName": "VietQuest",
    "vietquestTitle": "Vietnamese learning through levels",
    "vietquestDescription": "A 42-lesson course for Chinese-speaking beginners, covering daily conversations and lighting business communication. Build knowledge through listening, choices and sentence ordering, unlock levels with stars, and revisit mistakes through spaced practice.",
    "vietnameseDaily": "Daily Vietnamese",
    "lightingBusiness": "Lighting business",
    "pronunciationLogic": "Sounds & word origins",
    "vietquestAccess": "No account required · Progress stays in your browser · Supports mobile home-screen installation",
    "courseUnits": "Course units",
    "courseLessons": "Lesson levels",
    "courseQuestions": "Interactive questions",
    "filterLearning": "Language learning",
    "showSearch": "Open project search",
    "hideSearch": "Hide project search",
    "enterVietquest": "Start learning",
    "practiceVietquest": "Pronunciation",
    "vietquestSummary": "Learn daily Vietnamese and lighting business communication through listening, choices and sentence ordering.",
    "vietquestPreviewAlt": "An adult male learner explores Vietnam along a golden trail of level stars",
    "tospoVisitLabel": "Visit the TOSPO entry page (account and password required)",
    "filterStrategy": "Strategy games",
    "wanchaoName": "Clash of Dynasties",
    "wanchaoTitle": "Cross-dynasty conquest and real-time strategy",
    "wanchaoSummary": "Choose Qin, Han, Tang, Song, Yuan or Ming. Develop your citadel, recruit armies and contest the capital across 500 cities with real place names.",
    "wanchaoDescription": "Six dynasties have distinct units and historical commanders. Build a citadel, grow an economy and capture cities on a 500-city map using real place names and coordinates. Single-player practice runs directly in the browser; playing with friends requires a separately deployed and configured server.",
    "wanchaoPreviewAlt": "Epic war cover illustration for Clash of Dynasties",
    "wanchaoStatus": "Practice available",
    "wanchaoAccess": "Single-player practice is ready · Multiplayer requires a separately configured server",
    "sixDynasties": "Six dynasties",
    "fiveHundredCities": "500 cities",
    "realtimeStrategy": "Real-time strategy",
    "dynastyFactions": "Dynasty factions",
    "realCityNames": "Cities with real place names",
    "enterWanchao": "Enter game",
    "guideTitle": "DC Web User Guide",
    "guideSubtitle": "Browse the site · Use the projects · Access & data",
    "guideBrowseTitle": "Getting started",
    "guideBrowseStep1": "Choose a category or search project names and keywords. On mobile, tap the search icon to open the input.",
    "guideBrowseStep2": "Use a project button to open the app. Expand Project details for its full description and access notes.",
    "guideBrowseStep3": "Switch the language or light/dark theme at the top right. Your current category and search stay in place when the language changes.",
    "guideProjectsTitle": "Using each project",
    "guideLumi": "Sign in with your existing account to browse the updated intelligence workspace and published project records. People and product research lead the interface, with opportunities and lighting proposals on the right. Online access remains read-only; live research and the local LUMINA workflow require the full services.",
    "guideLumiLink": "Sign in to read the workspace guide ↗",
    "guideTospo": "Explore company information, outdoor luminaires and project references. Open the account login in a new tab from the project entry page; return to that entry page to go back to the portfolio.",
    "guideTospoLink": "Open the TOSPO entry page ↗",
    "guideLumina": "Choose a scene or upload a sketch or map. Extract road traces locally and review their overlay. Enter the demonstration access code in DeepSeek Connection for online planning, image analysis and parameter suggestions. Verify dimensions and AI assumptions before calculating layouts, direct illuminance, costs and purchasing. Product imports, reports and scheme bundles remain available; no app download or physical-device connection is provided.",
    "guideLuminaLink": "Open the online demo ↗",
    "guideVietquest": "Learn words and phrases, then complete listening, choice and sentence-ordering lessons. Review mistakes and explore phonetic notation and pronunciation rules. Available Vietnamese voices depend on your device.",
    "guideVietquestLink": "Open the learning home ↗",
    "guideWanchao": "Choose a dynasty and enter single-player practice to learn building, recruiting and siege commands. Practice runs in your browser; playing with friends requires a separately deployed and configured server.",
    "guideWanchaoLink": "Open the game and its play guide ↗",
    "guideDataTitle": "Access and data",
    "guideLocalData": "LUMINA schemes and simulated device records, and VietQuest learning progress, stay in the current browser. They may not follow you to another device or survive clearing browser data. Use the project’s export features first when you need to keep a scheme.",
    "guideEvidence": "Check source dates, references and calculation scope within each project. LumiPilot retains concept-model and verification labels. LUMINA illuminance analysis covers direct artificial light only. Verify inputs and applicability before engineering use.",
    "protectedStats": "Sign in to the workspace to view projects, records and statistics.",
    "openLuminaPurchase": "Procurement & energy comparison"
  }
};
  const siteGuide = document.querySelector('#site-guide');
  document.querySelectorAll('[data-open-guide]').forEach(link => link.addEventListener('click', event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    siteGuide.open = true;
    const target = document.querySelector(link.getAttribute('href'));
    (target?.matches('.guide-project') ? target : siteGuide.querySelector('summary')).focus({preventScroll:true});
  }));
  function openLinkedGuide() {
    const target = document.getElementById(location.hash.slice(1));
    if (location.hash === '#scope' || (target && siteGuide.contains(target))) siteGuide.open = true;
  }
  openLinkedGuide();
  window.addEventListener('hashchange', openLinkedGuide);
  const themeButton = document.querySelector('.theme-toggle');
  const languageSwitch = document.querySelector('.language-switch');
  const dateNote = document.querySelector('#publication-date');
  const projectCards = [...document.querySelectorAll('.project-card')];
  const filters = [...document.querySelectorAll('[data-filter]')];
  const searchInput = document.querySelector('#project-search');
  const searchClear = document.querySelector('.search-clear');
  const results = document.querySelector('#project-results');
  const projectTools = document.querySelector('.project-tools');
  const searchToggle = document.querySelector('.mobile-search-toggle');
  const viewCounters = [...document.querySelectorAll('[data-view-project]')];
  const metricsStatus = document.querySelector('#metrics-status');
  const metricsEndpoint = 'https://dc-workspaces-access.dayang0509.chatgpt.site/_metrics/views';
  let viewState = 'loading';
  let viewData = null;
  let viewRequest = 0;
  let activeFilter = 'all';
  const normalize = value => value.normalize('NFKC').toLocaleLowerCase().trim();
  // Search both dictionaries so a query survives language changes.
  const searchIndex = new Map(projectCards.map(card => {
    const keys = [...card.querySelectorAll('[data-i18n]')].filter(node => !node.closest('[data-view-project]')).map(node => node.dataset.i18n);
    const text = [card.querySelector('h2').textContent, card.dataset.keywords || '',
      ...Object.values(copy).flatMap(dictionary => keys.map(key => dictionary[key] || ''))].join(' ');
    return [card, normalize(text)];
  }));
  function updateProjects() {
    const terms = normalize(searchInput.value).split(/\s+/).filter(Boolean);
    let count = 0;
    projectCards.forEach(card => {
      const visible = (activeFilter === 'all' || card.dataset.category === activeFilter)
        && terms.every(term => searchIndex.get(card).includes(term));
      card.hidden = !visible;
      if (visible) count++;
    });
    filters.forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.filter === activeFilter));
      const total = projectCards.filter(card => button.dataset.filter === 'all' || card.dataset.category === button.dataset.filter).length;
      button.querySelector('.filter-count').textContent = total;
    });
    const key = activeFilter === 'all' && !terms.length ? 'resultsAll' : 'resultsFiltered';
    results.textContent = copy[language][key].replace('{count}', count).replace('{total}', projectCards.length);
    document.querySelector('#collection-count').textContent = String(projectCards.length).padStart(2,'0');
    document.querySelector('.project-empty').hidden = count > 0;
    searchClear.hidden = !searchInput.value;
    searchToggle.dataset.hasQuery = String(Boolean(searchInput.value));
    updateSearchToggle();
  }
  function updateSearchToggle() {
    const isOpen = projectTools.dataset.searchOpen === 'true';
    searchToggle.setAttribute('aria-expanded', String(isOpen));
    searchToggle.setAttribute('aria-label', copy[language][isOpen ? 'hideSearch' : 'showSearch']);
  }
  function saved(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function remember(key,value) { try { localStorage.setItem(key,value); } catch { /* Controls work without storage. */ } }
  const query = new URLSearchParams(location.search).get('lang');
  let language = ['zh','en'].includes(query) ? query : saved('dayang-language') === 'en' ? 'en' : 'zh';
  const initialLanguage = language;
  let theme = saved('dayang-theme') === 'dark' ? 'dark' : 'light';
  function updateDate() { dateNote.textContent = copy[language].protectedStats; }
  function updateTheme() {
    root.dataset.theme = theme;
    const label = copy[language][theme === 'dark' ? 'themeLight' : 'themeDark'];
    themeButton.setAttribute('aria-label',label);
    themeButton.title = label;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#101721' : '#f7f8fa';
  }
  function updateLanguage() {
    root.lang = language === 'en' ? 'en' : 'zh-CN';
    document.title = copy[language].title;
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = copy[language][node.dataset.i18n]; });
    document.querySelectorAll('[data-i18n-alt]').forEach(node => { node.alt = copy[language][node.dataset.i18nAlt]; });
    document.querySelectorAll('[data-i18n-aria]').forEach(node => { node.setAttribute('aria-label',copy[language][node.dataset.i18nAria]); });
    const next = language === 'en' ? 'zh' : 'en';
    const url = new URL(location.href);
    url.searchParams.set('lang',next);
    languageSwitch.href = url.href;
    languageSwitch.textContent = language === 'en' ? '中文' : 'EN';
    languageSwitch.lang = language === 'en' ? 'zh-CN' : 'en';
    languageSwitch.hreflang = languageSwitch.lang;
    languageSwitch.setAttribute('aria-label',copy[language].switchLanguage);
    languageSwitch.title = copy[language].switchLanguage;
    updateTheme();
    updateDate();
    document.querySelectorAll('[data-i18n-placeholder]').forEach(node => { node.placeholder = copy[language][node.dataset.i18nPlaceholder]; });
    document.querySelectorAll('[data-game-link]').forEach(link => { link.setAttribute('href', `${link.dataset.gameLink}?lang=${language}`); });
    document.querySelectorAll('[data-lumi-link]').forEach(link => { const [path, hash] = link.dataset.lumiLink.split('#'); link.setAttribute('href', `${path}?lang=${language}${hash ? '#' + hash : ''}`); });
    document.querySelectorAll('[data-market-link]').forEach(link => { link.setAttribute('href', `${link.dataset.marketLink}?lang=${language}`); });
    document.querySelectorAll('[data-tospo-link]').forEach(link => { link.setAttribute('href', `${link.dataset.tospoLink}?lang=${language}`); });
    document.querySelectorAll('[data-pdf-cad-link]').forEach(link => { link.setAttribute('href', `${link.dataset.pdfCadLink}?lang=${language}`); });
    updateProjects();
    renderViewCounts();
  }
  updateLanguage();
  projectTools.hidden = false;
  searchToggle.addEventListener('click', () => {
    const isOpen = projectTools.dataset.searchOpen !== 'true';
    projectTools.dataset.searchOpen = String(isOpen);
    updateSearchToggle();
    if (isOpen) searchInput.focus();
  });
  filters.forEach(button => button.addEventListener('click', () => {
    activeFilter = button.dataset.filter;
    updateProjects();
  }));
  searchInput.addEventListener('input', updateProjects);
  document.querySelector('.project-search').addEventListener('submit', event => event.preventDefault());
  searchClear.addEventListener('click', () => {
    searchInput.value = '';
    updateProjects();
    searchInput.focus();
  });
  document.querySelector('.reset-projects').addEventListener('click', () => {
    activeFilter = 'all';
    searchInput.value = '';
    updateProjects();
    filters[0].focus();
  });
  themeButton.hidden = false;
  languageSwitch.hidden = false;
  languageSwitch.addEventListener('click',event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    language = language === 'en' ? 'zh' : 'en';
    const url = new URL(location.href); url.searchParams.set('lang',language);
    history.pushState(null,'',url);
    remember('dayang-language',language); updateLanguage();
  });
  window.addEventListener('popstate',() => {
    const value = new URLSearchParams(location.search).get('lang');
    language = ['zh','en'].includes(value) ? value : initialLanguage;
    remember('dayang-language',language); updateLanguage();
  });
  themeButton.addEventListener('click',() => { theme = theme === 'dark' ? 'light' : 'dark';remember('dayang-theme',theme);updateTheme(); });

  function renderViewCounts() {
    const dictionary = copy[language];
    const locale = language === 'zh' ? 'zh-CN' : 'en';
    const fullFormat = new Intl.NumberFormat(locale);
    const compactFormat = new Intl.NumberFormat(locale, { notation: 'compact', maximumFractionDigits: 1 });
    const stateLabel = dictionary[viewState === 'error' ? 'metricsUnavailable' : 'metricsLoading'];
    let period = '';
    if (viewState === 'ready') {
      const date = viewData.startedAt && new Intl.DateTimeFormat(locale, { dateStyle: 'medium' }).format(new Date(viewData.startedAt));
      period = date ? dictionary.metricsStarted.replace('{date}', date) : dictionary.metricsPending;
    }
    metricsStatus.textContent = period || stateLabel;
    viewCounters.forEach(counter => {
      const count = viewState === 'ready' ? viewData.counts[counter.dataset.viewProject] : null;
      const label = count === null ? stateLabel : dictionary.metricsCount.replace('{count}', fullFormat.format(count));
      counter.querySelector('[data-view-count]').textContent = count === null ? '—' : (count < 10000 ? fullFormat : compactFormat).format(count);
      counter.querySelector('[data-view-accessible]').textContent = label;
      counter.setAttribute('aria-label', label);
      counter.setAttribute('aria-busy', String(viewState === 'loading'));
      counter.title = period ? `${label} · ${period}` : label;
      counter.dataset.viewState = viewState;
    });
  }

  async function loadViewCounts(recordView = false) {
    const request = ++viewRequest;
    viewState = 'loading';
    renderViewCounts();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);
    try {
      const options = { credentials: 'omit', mode: 'cors', cache: 'no-store', signal: controller.signal };
      if (recordView && globalThis.crypto?.randomUUID) {
        options.method = 'POST';
        options.keepalive = true;
        options.referrerPolicy = 'no-referrer';
        options.headers = { 'Content-Type': 'text/plain' };
        options.body = JSON.stringify({ project: 'home', eventId: crypto.randomUUID() });
      }
      const response = await fetch(metricsEndpoint, options);
      if (!response.ok) throw new Error('View counts unavailable');
      const data = await response.json();
      if (!data || (data.startedAt !== null && (typeof data.startedAt !== 'string' || !Number.isFinite(Date.parse(data.startedAt))))
        || !data.counts || !viewCounters.every(counter => Number.isSafeInteger(data.counts[counter.dataset.viewProject]) && data.counts[counter.dataset.viewProject] >= 0)) {
        throw new Error('Invalid view counts');
      }
      if (request !== viewRequest) return;
      viewData = data;
      viewState = 'ready';
    } catch {
      if (request !== viewRequest) return;
      viewState = 'error';
    } finally {
      clearTimeout(timeout);
      if (request === viewRequest) renderViewCounts();
    }
  }

  // Only document loads on the public homepage add a view; UI controls do not.
  loadViewCounts(location.origin === 'https://dayang1847-arch.github.io');
  window.addEventListener('pageshow', event => { if (event.persisted) loadViewCounts(); });
})();






