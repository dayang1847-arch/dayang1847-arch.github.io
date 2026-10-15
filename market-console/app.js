(() => {
  'use strict';
  const E = globalThis.MarketDemoEngine;
  const samples = globalThis.MarketDemoData.products;
  const $ = selector => document.querySelector(selector);
  const $$ = selector => [...document.querySelectorAll(selector)];
  const copy = {
    zh: {
      skip:'跳到工作区',backPortfolio:'返回作品集 ↗',workflow:'研究流程',navCollect:'样例采集',navLibrary:'商品资料库',navCompare:'规格对比',navReport:'推品与报告',localMode:'浏览器本地演示',localNote:'虚构样例，无需账号。导入与分析均在当前浏览器完成。',resetDemo:'重置演示数据',marketResearch:'市场分析',interactiveDemo:'交互演示',toggleTheme:'切换深浅色主题',title:'照明市场工作台',intro:'把商品资料，变成可追溯的推品依据。',demoMode:'可操作演示',demoNotice:'采集使用虚构样例回放；规格计算、CSV 导入与报告导出可实际操作。推品建议由本地规则生成。',scopeTitle:'研究范围',scopeHint:'所有步骤共享当前范围',targetMarket:'目标市场',category:'产品品类',marketAU:'澳大利亚 · AU',marketVN:'越南 · VN',marketUK:'英国 · UK',categoryFloodlight:'投光灯',categoryStreetlight:'道路灯',categoryHighbay:'工矿灯',overview:'研究概览',archivedProducts:'当前范围商品',scopeRecords:'已入库记录',customerBaseline:'客户品类基线',globalCatalog:'保留全部市场目录',marketPeers:'目标市场友商',sameCategory:'仅当前市场与品类',efficacyGap:'光效中位数差距',gapMeaning:'友商相对客户 · %',stepCollect:'STEP 01 / COLLECTION',collectHeading:'从一次采集开始',collectIntro:'选择样例来源，观察任务进度与商品归档。可随时暂停和继续。',sampleReplay:'样例回放',collectionSource:'采集来源',allSources:'全部样例来源',brandSite:'品牌官网',samplePool:'可回放商品',samplePoolNote:'包含当前范围内的客户与友商样例',startCollection:'开始样例采集',collectionNote:'仅回放内置数据，不请求 Amazon、Shopee 或品牌官网。',taskProgress:'任务进度',pause:'暂停',resume:'继续采集',stopTask:'结束任务',viewLibrary:'查看商品库 →',taskLog:'任务日志',stepLibrary:'STEP 02 / PRODUCT LIBRARY',libraryHeading:'有结构，才有依据',libraryIntro:'筛选样例或导入自己的规格表。导入文件只在当前浏览器读取。',csvTemplate:'CSV 模板',importCSV:'导入 CSV',searchProducts:'搜索型号或品牌',brand:'品牌',allBrands:'全部品牌',customerBrand:'客户样例',peerA:'友商样例 A',peerB:'友商样例 B',exportCSV:'导出当前 CSV',productTable:'商品规格表',model:'型号 / 品牌',source:'来源',power:'功率 W',lumens:'光通量 lm',efficacy:'光效 lm/W',cri:'显色指数',ip:'防护',price:'标价',noProducts:'当前筛选下没有商品。可以运行样例采集或导入 CSV。',libraryNote:'样例品牌与数值均为虚构。空值表示资料缺失；标价保留各自币种，不跨币种计算中位数。',csvCompatibility:'CSV 可由 Excel 打开；模板表头为英文。',compareNext:'对比规格 →',stepCompare:'STEP 03 / SPECIFICATION INSIGHTS',compareHeading:'先看差距，再定方向',compareIntro:'以客户同品类的全球目录为基线，只对比目标市场的同品类友商。',planNext:'开始推品分析 →',customerMedian:'客户基线中位数',peerMedian:'目标市场友商中位数',calculationMethod:'计算口径与数据覆盖',methodDescription:'中位数只使用有效数值，空值不按 0 处理。光效先逐条计算 lm ÷ W，再取中位数；功率须大于 0。差距 =（友商中位数 ÷ 客户中位数 − 1）× 100%。两组不混入其他品类，友商不混入其他市场，价格不跨币种比较。',stepReport:'STEP 04 / PRODUCT PLANNING',reportHeading:'把对比，变成下一步',reportIntro:'选择五项设计方向，根据当前商品计算参考规格，生成可导出的推品简报。',localRules:'本地规则计算',decisionPosition:'01 · 产品定位',positionValue:'价值优先',positionPerformance:'性能优先',positionPremium:'高端定位',decisionPower:'02 · 功率与光通量',priorityEfficiency:'优先提高光效',priorityOutput:'优先提高光通量',priorityBalanced:'靠近市场典型规格',decisionControl:'03 · 控制方式',controlBasic:'基础开关控制',controlReady:'预留智能控制接口',controlSmart:'研究联网控制方案',decisionThermal:'04 · 散热与寿命',thermalBalanced:'平衡尺寸与散热',thermalLife:'优先寿命验证',thermalCompact:'优先紧凑外形',decisionEvidence:'05 · 资料缺口',evidenceConservative:'仅采用已有规格证据',evidenceCollect:'先补资料再做定案',planningNote:'参考规格来自当前目标市场商品；其他选择作为设计约束，不代表已验证的成本、寿命或控制能力。',generateReport:'生成推品简报',reportEmptyTitle:'先选方向，再生成建议',reportEmptyDescription:'简报将包含参考规格、客户与友商依据、设计约束、验证清单和外观提示词。',evidenceBrief:'EVIDENCE / PRODUCT BRIEF',generatedTitle:'推品分析简报',exportMarkdown:'导出 Markdown',exportEvidence:'导出依据 CSV',footerNote:'样例回放 · 本地计算 · 可导出报告',idle:'等待开始',running:'正在采集',paused:'已暂停',completed:'已完成',cancelled:'已结束',idleCaption:'已有少量样例可用于比较，启动采集后将补充所选范围的样例商品。',taskCaption:'{market} / {category} · {source}',taskCount:'已处理 {processed} / {total} 条',readyLog:'初始样例已就绪，可直接查看商品与规格对比。',startLog:'已创建样例采集任务，共 {count} 条。',savedLog:'已归档：{model}',pausedLog:'已保存当前位置，等待继续。',resumedLog:'从上次进度继续采集。',completedLog:'任务完成：新增 {added} 条，更新 {updated} 条。',cancelledLog:'任务已结束，已处理商品保留在资料库中。',recoveredLog:'上次任务已暂停，可继续或结束。',nothingToCollect:'当前来源没有匹配样例，请切换来源。',libraryCount:'当前筛选 {count} 条 · 工作区共 {total} 条',originSample:'虚构样例',originImported:'CSV 导入',customerShort:'客户',peerShort:'友商',metricPower:'功率',metricLumens:'光通量',metricEfficacy:'光效',metricCri:'显色指数',coverage:'有效覆盖：客户 {customer} / {customerTotal}，友商 {peer} / {peerTotal}',comparisonSummary:'本次比较：客户 {customer} 条（同品类全部市场），友商 {peer} 条（仅 {market}）。',missingBaseline:'当前没有客户基线，无法计算相对差距；可导入客户规格表。',missingPeer:'当前没有有效友商记录，请采集样例或导入目标市场规格。',referenceSpecs:'01 · 参考商品规格',referenceEvidence:'02 · 选择依据',designConstraints:'03 · 设计约束',validationChecklist:'04 · 待验证事项',visualPrompt:'05 · 外观提示词',referenceLine:'参考型号：{model} · {brand} · {market}。规格逐项来自这条记录，未拼接多个型号。',noReference:'当前范围缺少可用参考商品。请补齐规格后重新生成。',rationaleEfficiency:'在有有效功率与光通量的目标市场友商中，选择逐条计算光效最高的记录。',rationaleOutput:'在有光通量数据的目标市场友商中，选择光通量最高的记录。',rationaleBalanced:'计算功率、光通量、光效、显色指数与友商中位数的相对距离，选择最接近典型规格的记录。',sourceCounts:'本次依据包含 {sample} 条虚构样例、{imported} 条导入记录。',reportCoverage:'{metric}：客户中位数 {customer} {unit}（{customerCount}/{customerTotal}），友商 {peer} {unit}（{peerCount}/{peerTotal}）；差距 {delta}。',validationSpecs:'核对原始规格、测试条件与缺失字段，使用 IES / 实测结果验证光学表现。',validationCost:'补齐 BOM、供应商报价与目标市场准入资料后，再评估成本和认证可行性。',validationControl:'控制与散热选择属于设计输入，需要后续电气、热学和可靠性验证。',validationGaps:'目前存在规格缺口；先补齐缺失项，再决定最终方案。',validationCollect:'优先补采目标市场资料，扩大样本并复核规格覆盖后再定案。',reportCaveat:'此简报由浏览器规则计算，未调用 DeepSeek。样例不代表真实品牌或市场表现；参考规格不等于已完成产品设计，不构成成本、寿命或认证承诺。',copyPrompt:'复制提示词',promptCopied:'提示词已复制。',copyUnavailable:'当前浏览器无法自动复制，请手动选中提示词复制。',promptText:'工业照明产品外观概念：{category}，应用市场 {market}。参考功率 {power} W，光通量 {lumens} lm，防护等级 {ip}。设计方向：{position}；{control}；{thermal}。中性背景，呈现灯体结构、散热结构与安装方式。用于概念探索，工程指标待验证。',resetConfirm:'重置为初始演示数据？当前导入记录与采集进度将从本浏览器移除。',resetDone:'已恢复初始演示数据。',importSuccess:'已导入 {count} 条商品，重复 ID 已更新。',importError:'CSV 导入失败，请检查模板字段与数值格式。',fileTooLarge:'请选择小于 1 MB、最多 5,000 条记录的 CSV 文件。',noImportRows:'文件内没有商品记录。',storageUnavailable:'当前浏览器无法持久保存；本次操作仍可继续。',downloadReady:'报告已导出。',reportRegenerate:'研究范围、数据或设计方向已变化，请重新生成简报。',missing:'缺失',referenceNote:'参考数值',templateDownloaded:'CSV 模板已下载，修改后可重新导入。'
    },
    en: {
      skip:'Skip to workspace',backPortfolio:'Back to portfolio ↗',workflow:'Research workflow',navCollect:'Sample collection',navLibrary:'Product library',navCompare:'Spec comparison',navReport:'Planning & reports',localMode:'Runs in your browser',localNote:'Fictional samples, no account. Imports and analysis stay in this browser.',resetDemo:'Reset demo data',marketResearch:'Market research',interactiveDemo:'Interactive demo',toggleTheme:'Toggle light / dark theme',title:'Lighting Market Console',intro:'Turn product records into traceable planning evidence.',demoMode:'Interactive demo',demoNotice:'Collection replays fictional samples. Specification calculations, CSV imports and report exports work with your selections. Recommendations use local rules.',scopeTitle:'Research scope',scopeHint:'Shared across all steps',targetMarket:'Target market',category:'Product category',marketAU:'Australia · AU',marketVN:'Vietnam · VN',marketUK:'United Kingdom · UK',categoryFloodlight:'Floodlights',categoryStreetlight:'Streetlights',categoryHighbay:'High bays',overview:'Research overview',archivedProducts:'Products in scope',scopeRecords:'Archived records',customerBaseline:'Customer baseline',globalCatalog:'All markets, same category',marketPeers:'Target-market peers',sameCategory:'Same market and category',efficacyGap:'Median efficacy gap',gapMeaning:'Peers relative to customer · %',stepCollect:'STEP 01 / COLLECTION',collectHeading:'Start with a collection',collectIntro:'Choose a sample source, follow progress and archive products. Pause and resume at any time.',sampleReplay:'Sample replay',collectionSource:'Collection source',allSources:'All sample sources',brandSite:'Brand website',samplePool:'Available samples',samplePoolNote:'Customer and peer samples in the current scope',startCollection:'Start sample collection',collectionNote:'Replays built-in data without requesting Amazon, Shopee or brand websites.',taskProgress:'Task progress',pause:'Pause',resume:'Resume',stopTask:'End task',viewLibrary:'View library →',taskLog:'Task log',stepLibrary:'STEP 02 / PRODUCT LIBRARY',libraryHeading:'Structure brings evidence',libraryIntro:'Filter the samples or import your own specifications. Imported files are read only in this browser.',csvTemplate:'CSV template',importCSV:'Import CSV',searchProducts:'Search model or brand',brand:'Brand',allBrands:'All brands',customerBrand:'Customer sample',peerA:'Peer sample A',peerB:'Peer sample B',exportCSV:'Export filtered CSV',productTable:'Product specifications',model:'Model / brand',source:'Source',power:'Power W',lumens:'Output lm',efficacy:'Efficacy lm/W',cri:'CRI',ip:'IP rating',price:'Listed price',noProducts:'No products match these filters. Run a sample collection or import a CSV.',libraryNote:'Sample brands and numbers are fictional. Blank values indicate missing evidence. Prices retain their currencies and are not compared across currencies.',csvCompatibility:'CSV files open in Excel. Template headers use English.',compareNext:'Compare specifications →',stepCompare:'STEP 03 / SPECIFICATION INSIGHTS',compareHeading:'Find the gap, then a direction',compareIntro:'Use the customer’s complete category catalog as the baseline, and compare only same-category peers in the target market.',planNext:'Start product planning →',customerMedian:'Customer baseline median',peerMedian:'Target-market peer median',calculationMethod:'Calculation method & coverage',methodDescription:'Medians use valid numbers only; missing values are not zero. Efficacy is calculated as lm ÷ W for each product before taking the median; power must be positive. Gap = (peer median ÷ customer median − 1) × 100%. Categories are kept separate, peers are restricted to one market, and prices are not compared across currencies.',stepReport:'STEP 04 / PRODUCT PLANNING',reportHeading:'Make the comparison actionable',reportIntro:'Make five design decisions, calculate reference specifications from the current products and export a planning brief.',localRules:'Local calculation rules',decisionPosition:'01 · Product positioning',positionValue:'Value first',positionPerformance:'Performance first',positionPremium:'Premium positioning',decisionPower:'02 · Power & light output',priorityEfficiency:'Prioritize efficacy',priorityOutput:'Prioritize light output',priorityBalanced:'Typical market specifications',decisionControl:'03 · Control approach',controlBasic:'Basic switching',controlReady:'Prepare a control interface',controlSmart:'Explore connected control',decisionThermal:'04 · Thermal & lifetime',thermalBalanced:'Balance size and cooling',thermalLife:'Prioritize lifetime validation',thermalCompact:'Prioritize compact housing',decisionEvidence:'05 · Evidence gaps',evidenceConservative:'Use available specifications only',evidenceCollect:'Collect more before deciding',planningNote:'Reference specifications come from a target-market product. Other choices become design constraints; they do not prove cost, lifetime or control capabilities.',generateReport:'Generate planning brief',reportEmptyTitle:'Choose a direction, then a reference',reportEmptyDescription:'The brief includes reference specs, customer and peer evidence, design constraints, validation steps and a visual prompt.',evidenceBrief:'EVIDENCE / PRODUCT BRIEF',generatedTitle:'Product planning brief',exportMarkdown:'Export Markdown',exportEvidence:'Export evidence CSV',footerNote:'Sample replay · Local calculations · Exportable reports',idle:'Ready',running:'Collecting',paused:'Paused',completed:'Completed',cancelled:'Ended',idleCaption:'A small set of samples is ready to compare. Collection adds the remaining products for your selected scope.',taskCaption:'{market} / {category} · {source}',taskCount:'Processed {processed} / {total}',readyLog:'Initial samples are ready. Open the library or compare specifications.',startLog:'Created a sample collection with {count} records.',savedLog:'Archived: {model}',pausedLog:'Progress saved. Ready to resume.',resumedLog:'Resuming from the last checkpoint.',completedLog:'Completed: {added} added, {updated} updated.',cancelledLog:'Task ended. Processed records remain in the library.',recoveredLog:'Your previous task is paused. Resume it or end it.',nothingToCollect:'No samples match this source. Choose another source.',libraryCount:'{count} filtered records · {total} in workspace',originSample:'Fictional sample',originImported:'CSV import',customerShort:'Customer',peerShort:'Peers',metricPower:'Power',metricLumens:'Light output',metricEfficacy:'Efficacy',metricCri:'CRI',coverage:'Valid coverage: customer {customer} / {customerTotal}, peers {peer} / {peerTotal}',comparisonSummary:'Comparing {customer} customer records (all markets, same category) with {peer} peer records (only {market}).',missingBaseline:'There is no customer baseline. Import customer specifications to calculate relative gaps.',missingPeer:'No valid peer evidence is available. Collect samples or import target-market specifications.',referenceSpecs:'01 · Reference specifications',referenceEvidence:'02 · Selection evidence',designConstraints:'03 · Design constraints',validationChecklist:'04 · Validation checklist',visualPrompt:'05 · Visual prompt',referenceLine:'Reference model: {model} · {brand} · {market}. Every specification comes from this record rather than a combination of models.',noReference:'No eligible reference product is available. Complete the specifications and generate again.',rationaleEfficiency:'Select the target-market peer with the highest per-product efficacy among records with valid power and output.',rationaleOutput:'Select the target-market peer with the highest recorded light output.',rationaleBalanced:'Compare each product’s relative distance from the peer medians for power, output, efficacy and CRI, then select the closest typical record.',sourceCounts:'Evidence includes {sample} fictional sample records and {imported} imported records.',reportCoverage:'{metric}: customer median {customer} {unit} ({customerCount}/{customerTotal}), peers {peer} {unit} ({peerCount}/{peerTotal}); gap {delta}.',validationSpecs:'Verify source specifications, test conditions and missing fields. Validate optics with IES files and measurements.',validationCost:'Obtain BOMs, supplier quotes and market-access requirements before assessing cost and certification feasibility.',validationControl:'Control and cooling selections are design inputs that require electrical, thermal and reliability validation.',validationGaps:'Some specifications are incomplete. Fill the gaps before choosing a final design.',validationCollect:'Expand target-market research and check specification coverage before making a final decision.',reportCaveat:'This brief uses browser-based rules and does not call DeepSeek. Samples do not represent real brands or market performance. Reference specifications are not a completed design or a cost, lifetime or certification commitment.',copyPrompt:'Copy prompt',promptCopied:'Prompt copied.',copyUnavailable:'Automatic copy is unavailable. Select and copy the prompt manually.',promptText:'Industrial lighting concept: {category}, for {market}. Reference power {power} W, output {lumens} lm, IP rating {ip}. Design direction: {position}; {control}; {thermal}. Neutral background, show the housing, thermal structure and installation approach. Concept exploration; engineering performance requires validation.',resetConfirm:'Restore the initial demo? Imported records and collection progress will be removed from this browser.',resetDone:'Initial demo data restored.',importSuccess:'Imported {count} products. Matching IDs were updated.',importError:'CSV import failed. Check the template fields and number formats.',fileTooLarge:'Choose a CSV smaller than 1 MB with no more than 5,000 records.',noImportRows:'The file contains no product records.',storageUnavailable:'This browser cannot save persistently. You can continue this session.',downloadReady:'Report exported.',reportRegenerate:'Scope, evidence or design choices changed. Generate the brief again.',missing:'Missing',referenceNote:'Reference values',templateDownloaded:'CSV template downloaded. Edit it and import it again.'
    }
  };
  copy.zh.preservedLog='保留已导入规格：{model}';
  copy.en.preservedLog='Preserved imported specifications: {model}';
  copy.zh.completedLog='任务完成：新增 {added} 条，更新 {updated} 条，保留导入记录 {preserved} 条。';
  copy.en.completedLog='Completed: {added} added, {updated} updated, {preserved} imported records preserved.';
  copy.zh.importBusy='采集任务已开始，请先结束任务后再导入。';
  copy.en.importBusy='A collection has started. End the task before importing.';
  copy.zh.keepData='保留数据';copy.en.keepData='Keep data';
  copy.zh.confirmReset='确认重置';copy.en.confirmReset='Confirm reset';
  copy.zh.workspaceFull='采集后将超过 5,000 条记录上限，请先导出并整理工作区数据。';
  copy.en.workspaceFull='This collection would exceed 5,000 workspace records. Export and organize your data first.';
  const STORAGE = 'dc-market-demo-v1';
  let storageWarning = false;
  function stored(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function remember(key, value) { try { localStorage.setItem(key, value); return true; } catch { return false; } }
  const queryLanguage = new URLSearchParams(location.search).get('lang');
  let language = ['zh','en'].includes(queryLanguage) ? queryLanguage : stored('dayang-language') === 'en' ? 'en' : 'zh';
  let theme = stored('dayang-theme') === 'dark' ? 'dark' : 'light';
  let view = ['collect','library','compare','report'].includes(location.hash.slice(1)) ? location.hash.slice(1) : 'collect';
  let currentReport = null;
  let timer = null;
  let toastTimer = null;
  let state = seed();
  function seed() {
    const seen = new Set();
    const products = samples.filter(record => {
      if (record.role === 'customer') return true;
      const group = record.market + record.category;
      if (seen.has(group)) return false;
      seen.add(group); return true;
    }).map(record => ({...record}));
    return {version:1, products, origins:Object.assign(Object.create(null),Object.fromEntries(products.map(record=>[record.id,'sample']))), scope:{market:'AU',category:'floodlight'},task:null};
  }
  try {
    const saved = JSON.parse(stored(STORAGE));
    if (saved?.version === 1 && Array.isArray(saved.products) && saved.products.length <= 5000) {
      E.parseCSV(E.exportCSV(saved.products));
      state.products = saved.products;
      state.origins = Object.assign(Object.create(null),saved.origins && typeof saved.origins === 'object' ? saved.origins : {});
      if (['AU','VN','UK'].includes(saved.scope?.market) && ['floodlight','streetlight','highbay'].includes(saved.scope?.category)) state.scope=saved.scope;
      if (saved.task && ['running','paused','completed','cancelled'].includes(saved.task.status)
          && Array.isArray(saved.task.ids) && saved.task.ids.every(id=>samples.some(record=>record.id===id))
          && Number.isFinite(saved.task.progress) && saved.task.progress>=0 && saved.task.progress<=100
          && Number.isInteger(saved.task.processed) && saved.task.processed>=0 && saved.task.processed<=saved.task.ids.length
          && Array.isArray(saved.task.logs)) {
        state.task=saved.task;
        state.task.logs=state.task.logs.slice(-30);
        if (state.task.status === 'running') {state.task.status='paused'; state.task.logs.push({time:Date.now(),key:'recoveredLog',values:{}});}
      }
    }
  } catch { /* A damaged or outdated local snapshot falls back to the initial demo. */ }
  $('#market-select').value=state.scope.market;
  $('#category-select').value=state.scope.category;
  if (state.task) $('#collection-source').value=state.task.source || 'all';
  const t = (key, values={}) => String(copy[language][key] || key).replace(/\{(\w+)\}/g, (_,name)=>String(values[name]??''));
  const fmt = (value,digits=1) => typeof value==='number' && Number.isFinite(value) ? new Intl.NumberFormat(language==='zh'?'zh-CN':'en-GB',{maximumFractionDigits:digits}).format(value) : '—';
  const pct = value => value === null || !Number.isFinite(value) ? '—' : (value>0?'+':'')+fmt(value)+'%';
  const marketName = market => t({AU:'marketAU',VN:'marketVN',UK:'marketUK'}[market]);
  const categoryName = category => t({floodlight:'categoryFloodlight',streetlight:'categoryStreetlight',highbay:'categoryHighbay'}[category]);
  const brandName = brand => t({customer:'customerBrand','peer-a':'peerA','peer-b':'peerB'}[brand] || brand);
  const sourceName = source => source==='all'?t('allSources'):source==='brand'?t('brandSite'):source==='amazon'?'Amazon':'Shopee';
  const metricName = key => t({powerW:'metricPower',lumens:'metricLumens',efficacy:'metricEfficacy',cri:'metricCri'}[key]);
  const busy = () => ['running','paused'].includes(state.task?.status);
  function node(tag, className, text) { const element=document.createElement(tag); if(className)element.className=className; if(text!==undefined)element.textContent=text; return element; }
  function toast(message) { clearTimeout(toastTimer); $('#toast').textContent=message; $('#toast').hidden=false; toastTimer=setTimeout(()=>{$('#toast').hidden=true;},5500); }
  function save() { if (!remember(STORAGE,JSON.stringify(state)) && !storageWarning) {storageWarning=true;toast(t('storageUnavailable'));} }
  function invalidateReport() { currentReport=null; }
  function scopeRecords() { return E.selectProducts(state.products,state.scope); }
  function comparison() { return E.compareProducts(state.products,state.scope); }
  function libraryRecords() {
    const records=E.selectProducts(state.products,{...state.scope,brand:$('#brand-filter').value,source:$('#source-filter').value});
    const terms=$('#product-search').value.normalize('NFKC').toLocaleLowerCase().trim().split(/\s+/).filter(Boolean);
    return records.filter(record=>{
      const searchable=[record.model,record.id,record.brand,brandName(record.brand),sourceName(record.source),record.market,record.ip].join(' ').normalize('NFKC').toLocaleLowerCase();
      return terms.every(term=>searchable.includes(term));
    });
  }
  function renderStats() {
    const result=comparison();
    $('#stat-products').textContent=fmt(scopeRecords().length,0);
    $('#stat-customer').textContent=fmt(result.customer.count,0);
    $('#stat-peers').textContent=fmt(result.peers.count,0);
    $('#stat-gap').textContent=pct(result.metrics.find(metric=>metric.key==='efficacy').deltaPct);
  }
  function renderTask() {
    const task=state.task;
    const pool=E.selectProducts(samples,{...state.scope,source:$('#collection-source').value});
    $('#sample-count').textContent=fmt(pool.length,0);
    $('#task-status').textContent=t(task?.status || 'idle');
    $('#task-status').dataset.status=task?.status || 'idle';
    $('#task-caption').textContent=task?t('taskCaption',{market:marketName(task.market),category:categoryName(task.category),source:sourceName(task.source)}):t('idleCaption');
    const progress=task?.progress || 0;
    $('#task-progress').setAttribute('aria-valuenow',String(progress));
    $('#task-progress > span').style.width=progress+'%';
    $('#task-percent').textContent=fmt(progress,0)+'%';
    $('#task-records').textContent=t('taskCount',{processed:task?.processed || 0,total:task?.ids.length || 0});
    $('#pause-collection').textContent=t(task?.status==='paused'?'resume':'pause');
    $('#pause-collection').disabled=!busy();
    $('#cancel-collection').disabled=!busy();
    $('#start-collection').disabled=busy() || pool.length===0;
    ['#market-select','#category-select','#collection-source','#import-file','#generate-report'].forEach(selector=>{$(selector).disabled=busy();});
    const logs=task?.logs?.length ? task.logs : [{time:null,key:'readyLog',values:{}}];
    $('#task-log').replaceChildren(...logs.slice(-7).map(log=>{
      const li=node('li');
      if(log.time){const time=node('time','',new Intl.DateTimeFormat(language==='zh'?'zh-CN':'en-GB',{hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false}).format(new Date(log.time)));time.dateTime=new Date(log.time).toISOString();li.append(time);}
      li.append(node('span','',t(log.key,log.values)));return li;
    }));
  }
  function renderLibrary() {
    const records=libraryRecords();
    $('#library-count').textContent=t('libraryCount',{count:fmt(records.length,0),total:fmt(state.products.length,0)});
    $('#library-empty').hidden=records.length>0;
    $('#export-products').disabled=records.length===0;
    $('#product-rows').replaceChildren(...records.map(record=>{
      const row=node('tr');const name=node('td','',record.model);
      name.append(node('small','',brandName(record.brand)+' · '+t(state.origins[record.id]==='imported'?'originImported':'originSample')));row.append(name);
      const source=node('td');source.append(node('span','source-pill',sourceName(record.source)));row.append(source);
      for(const value of [fmt(record.powerW),fmt(record.lumens),fmt(E.efficacy(record)),fmt(record.cri),record.ip||'—',record.price===null?'—':record.currency+' '+fmt(record.price)]) row.append(node('td','',value));
      return row;
    }));
  }
  function renderComparison() {
    const result=comparison();
    $('#comparison-metrics').replaceChildren(...result.metrics.map(metric=>{
      const card=node('div','comparison-card');const heading=node('div','metric-heading');
      heading.append(node('h3','',metricName(metric.key)+' · '+metric.unit),node('span','',pct(metric.deltaPct)));card.append(heading);
      const max=Math.max(metric.customerMedian || 0,metric.peerMedian || 0,1);
      for(const [label,value,kind] of [['customerShort',metric.customerMedian,'customer'],['peerShort',metric.peerMedian,'peer']]){
        const line=node('div','metric-line '+kind);const track=node('div','metric-track');track.setAttribute('aria-hidden','true');
        const bar=node('span');bar.style.width=value===null?'0%':Math.max(0,Math.min(100,value/max*100))+'%';track.append(bar);
        line.append(node('span','',t(label)),track,node('strong','',fmt(value)));card.append(line);
      }
      card.append(node('p','coverage-note',t('coverage',{customer:metric.customerCoverage.present,customerTotal:metric.customerCoverage.total,peer:metric.peerCoverage.present,peerTotal:metric.peerCoverage.total})));return card;
    }));
    $('#comparison-note').textContent=t('comparisonSummary',{customer:result.customer.count,peer:result.peers.count,market:marketName(state.scope.market)})+(result.customer.count===0?' '+t('missingBaseline'):'')+(result.peers.count===0?' '+t('missingPeer'):'');
  }
  function answerLabels(choices) {
    return [t({value:'positionValue',performance:'positionPerformance',premium:'positionPremium'}[choices.positioning]),t({efficiency:'priorityEfficiency',output:'priorityOutput',balanced:'priorityBalanced'}[choices.priority]),t({basic:'controlBasic',ready:'controlReady',smart:'controlSmart'}[choices.control]),t({balanced:'thermalBalanced',life:'thermalLife',compact:'thermalCompact'}[choices.thermal]),t({conservative:'evidenceConservative',collect:'evidenceCollect'}[choices.evidence])];
  }
  function reportParts() {
    if(!currentReport)return null;
    const report=currentReport;
    const result=report.result;
    const records=[...result.comparison.customer.records,...result.comparison.peers.records];
    const imported=records.filter(record=>report.origins[record.id]==='imported').length;
    const rationale={ 'highest-peer-efficacy':'rationaleEfficiency','highest-peer-output':'rationaleOutput','closest-to-peer-medians':'rationaleBalanced' };
    const evidence=[t('sourceCounts',{sample:records.length-imported,imported})];
    if(result.reference)evidence.push(t('referenceLine',{model:result.reference.model,brand:brandName(result.reference.brand),market:marketName(result.reference.market)}));
    else evidence.push(t('noReference'));
    evidence.push(...result.rationaleCodes.map(code=>t(rationale[code])));
    for(const metric of result.comparison.metrics)evidence.push(t('reportCoverage',{metric:metricName(metric.key),customer:fmt(metric.customerMedian),peer:fmt(metric.peerMedian),unit:metric.unit,customerCount:metric.customerCoverage.present,customerTotal:metric.customerCoverage.total,peerCount:metric.peerCoverage.present,peerTotal:metric.peerCoverage.total,delta:pct(metric.deltaPct)}));
    if(result.comparison.customer.count===0)evidence.push(t('missingBaseline'));
    const constraints=answerLabels(report.choices);
    const validation=[t('validationSpecs'),t('validationCost'),t('validationControl')];
    if(result.caveatCodes.includes('incomplete-specifications'))validation.push(t('validationGaps'));
    if(report.choices.evidence==='collect')validation.push(t('validationCollect'));
    const specs=[['metricPower',result.suggested.powerW,'W'],['metricLumens',result.suggested.lumens,'lm'],['metricEfficacy',result.suggested.efficacy,'lm/W'],['metricCri',result.suggested.cri,'Ra'],['ip',result.suggested.ip,'']];
    const prompt=t('promptText',{category:categoryName(report.scope.category),market:marketName(report.scope.market),power:fmt(result.suggested.powerW),lumens:fmt(result.suggested.lumens),ip:result.suggested.ip||t('missing'),position:constraints[0],control:constraints[2],thermal:constraints[3]});
    return {evidence,constraints,validation,specs,prompt,records};
  }
  function renderReport() {
    $('#report-empty').hidden=Boolean(currentReport);
    $('#generated-report').hidden=!currentReport;
    if(!currentReport)return;
    const parts=reportParts();
    $('#report-scope').textContent=marketName(currentReport.scope.market)+' / '+categoryName(currentReport.scope.category)+' · '+new Intl.DateTimeFormat(language==='zh'?'zh-CN':'en-GB',{dateStyle:'medium',timeStyle:'short'}).format(new Date(currentReport.createdAt));
    const body=$('#report-body');body.replaceChildren();
    const specSection=node('section','report-section');specSection.append(node('h4','',t('referenceSpecs')));
    if(currentReport.result.reference){const list=node('dl','suggested-specs');for(const [label,value,unit]of parts.specs){const item=node('div');const dd=node('dd','',typeof value==='string'?value:fmt(value));if(unit)dd.append(node('small','',unit));item.append(node('dt','',t(label)),dd);list.append(item);}specSection.append(list);}else specSection.append(node('p','',t('noReference')));
    body.append(specSection);
    for(const [heading,items]of [['referenceEvidence',parts.evidence],['designConstraints',parts.constraints],['validationChecklist',parts.validation]]){
      const section=node('section','report-section');const ul=node('ul');ul.append(...items.map(item=>node('li','',item)));section.append(node('h4','',t(heading)),ul);body.append(section);
    }
    if(currentReport.result.reference){
      const section=node('section','report-section');const pre=node('div','prompt-box',parts.prompt);pre.id='visual-prompt';
      const tools=node('div','prompt-tools');const button=node('button','text-button',t('copyPrompt'));button.type='button';button.addEventListener('click',async()=>{try{await navigator.clipboard.writeText(parts.prompt);toast(t('promptCopied'));}catch{toast(t('copyUnavailable'));}});tools.append(button);section.append(node('h4','',t('visualPrompt')),pre,tools);body.append(section);
    }
    body.append(node('p','report-caveat',t('reportCaveat')));
  }
  function render() {renderStats();renderTask();renderLibrary();renderComparison();renderReport();}
  function updateTheme(){document.documentElement.dataset.theme=theme;document.querySelector('meta[name="theme-color"]').content=theme==='dark'?'#101d22':'#f5f7f8';}
  function updateLanguage() {
    document.documentElement.lang=language==='zh'?'zh-CN':'en';
    document.title=language==='zh'?'照明市场工作台 · DC Web':'Lighting Market Console · DC Web';
    $$('[data-i18n]').forEach(element=>{element.textContent=t(element.dataset.i18n);});
    $$('[data-i18n-aria]').forEach(element=>{element.setAttribute('aria-label',t(element.dataset.i18nAria));});
    $$('[data-i18n-placeholder]').forEach(element=>{element.placeholder=t(element.dataset.i18nPlaceholder);});
    $('#language-toggle').textContent=language==='zh'?'EN':'中文';
    $('#language-toggle').lang=language==='zh'?'en':'zh-CN';
    $('#language-toggle').setAttribute('aria-label',language==='zh'?'Switch to English':'切换到中文版');
    $('#home-link').href='../?lang='+language;
    render();updateTheme();
  }
  function setView(next,{focus=true}={}) {
    if(!['collect','library','compare','report'].includes(next))next='collect';
    view=next;
    $$('[data-view]').forEach(button=>{if(button.dataset.view===view)button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');});
    $$('.work-panel').forEach(panel=>{panel.hidden=panel.id!=='panel-'+view;});
    history.replaceState(null,'','#'+view);
    if(focus)$('#'+view+'-heading').focus({preventScroll:true});
  }
  function logTask(key,values={}) {
    state.task.logs.push({time:Date.now(),key,values});
    state.task.logs=state.task.logs.slice(-30);
    $('#task-live').textContent=t(key,values);
  }
  function stopTimer(){if(timer){clearInterval(timer);timer=null;}}
  function startTimer(){
    stopTimer();
    timer=setInterval(()=>{
      const task=state.task;if(task?.status!=='running'){stopTimer();return;}
      task.progress=Math.min(100,task.progress+10);
      const target=Math.floor(task.ids.length*task.progress/100);
      while(task.processed<target){
        const sample=samples.find(record=>record.id===task.ids[task.processed]);
        const index=state.products.findIndex(record=>record.id===sample.id);
        if(index>=0 && state.origins[sample.id]==='imported'){
          task.preserved=(task.preserved||0)+1;task.processed++;logTask('preservedLog',{model:state.products[index].model});continue;
        }
        if(index<0){state.products.push({...sample});task.added++;}else{state.products[index]={...sample};task.updated++;}
        state.origins[sample.id]='sample';task.processed++;logTask('savedLog',{model:sample.model});
      }
      invalidateReport();
      if(task.progress===100){task.status='completed';logTask('completedLog',{added:task.added,updated:task.updated,preserved:task.preserved||0});stopTimer();}
      save();render();
    },600);
  }
  $('#collection-form').addEventListener('submit',event=>{
    event.preventDefault();if(busy())return;
    const source=$('#collection-source').value;const records=E.selectProducts(samples,{...state.scope,source});
    if(!records.length){toast(t('nothingToCollect'));return;}
    const existingIds=new Set(state.products.map(record=>record.id));
    if(state.products.length+records.filter(record=>!existingIds.has(record.id)).length>5000){toast(t('workspaceFull'));return;}
    state.task={...state.scope,source,ids:records.map(record=>record.id),progress:0,processed:0,status:'running',added:0,updated:0,preserved:0,logs:[]};
    invalidateReport();logTask('startLog',{count:records.length});save();render();startTimer();
  });
  $('#pause-collection').addEventListener('click',()=>{
    if(!busy())return;
    if(state.task.status==='running'){stopTimer();state.task.status='paused';logTask('pausedLog');}
    else{state.task.status='running';logTask('resumedLog');startTimer();}
    save();renderTask();
  });
  $('#cancel-collection').addEventListener('click',()=>{if(!busy())return;stopTimer();state.task.status='cancelled';logTask('cancelledLog');save();renderTask();});
  ['#market-select','#category-select'].forEach(selector=>$(selector).addEventListener('change',()=>{
    if(busy())return;
    state.scope={market:$('#market-select').value,category:$('#category-select').value};
    state.task=null;invalidateReport();save();render();
  }));
  $('#collection-source').addEventListener('change',renderTask);
  $$('[data-view]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.view)));
  $$('[data-go]').forEach(button=>button.addEventListener('click',()=>setView(button.dataset.go)));
  window.addEventListener('hashchange',()=>{
    const next=location.hash.slice(1);
    if(['collect','library','compare','report'].includes(next))setView(next);
  });
  $('#product-search').addEventListener('input',renderLibrary);
  ['#brand-filter','#source-filter'].forEach(selector=>$(selector).addEventListener('change',renderLibrary));
  $('#language-toggle').addEventListener('click',()=>{language=language==='zh'?'en':'zh';remember('dayang-language',language);const url=new URL(location.href);url.searchParams.set('lang',language);history.replaceState(null,'',url);updateLanguage();});
  $('#theme-toggle').addEventListener('click',()=>{theme=theme==='dark'?'light':'dark';remember('dayang-theme',theme);updateTheme();});
  function download(filename,text,type) {
    const url=URL.createObjectURL(new Blob([text],{type}));const link=node('a');link.href=url;link.download=filename;document.body.append(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  const fileBase=()=>'lighting-market-'+state.scope.market+'-'+state.scope.category;
  $('#export-products').addEventListener('click',()=>{download(fileBase()+'.csv',E.exportCSV(libraryRecords()),'text/csv;charset=utf-8');toast(t('downloadReady'));});
  $('#download-template').addEventListener('click',()=>{download('lighting-market-template.csv',E.exportCSV(samples.filter(record=>record.market==='AU' && record.category==='floodlight').slice(0,4)),'text/csv;charset=utf-8');toast(t('templateDownloaded'));});
  $('#import-file').addEventListener('change',async event=>{
    const file=event.target.files[0];if(!file)return;
    try{
      if(busy())return;
      if(file.size>1024*1024)throw new Error(t('fileTooLarge'));
      const contents=await file.text();
      if(busy()){toast(t('importBusy'));return;}
      const records=E.parseCSV(contents);
      if(!records.length)throw new Error(t('noImportRows'));
      const merged=new Map(state.products.map(record=>[record.id,record]));records.forEach(record=>merged.set(record.id,record));
      if(merged.size>5000)throw new Error(t('fileTooLarge'));
      state.products=[...merged.values()];records.forEach(record=>{state.origins[record.id]='imported';});
      state.scope={market:records[0].market,category:records[0].category};state.task=null;
      $('#market-select').value=state.scope.market;$('#category-select').value=state.scope.category;
      $('#brand-filter').value='all';$('#source-filter').value='all';$('#product-search').value='';
      invalidateReport();save();render();toast(t('importSuccess',{count:records.length}));
    }catch(error){toast(t('importError')+' '+error.message);}finally{event.target.value='';}
  });
  const choiceIds=['positioning','priority','control','thermal','evidence'];
  choiceIds.forEach(id=>$('#'+id).addEventListener('change',()=>{if(currentReport){invalidateReport();renderReport();toast(t('reportRegenerate'));}}));
  $('#planning-form').addEventListener('submit',event=>{
    event.preventDefault();if(busy())return;
    const choices=Object.fromEntries(choiceIds.map(id=>[id,$('#'+id).value]));
    currentReport={result:E.buildRecommendation(state.products,{...state.scope,priority:choices.priority}),scope:{...state.scope},choices,origins:{...state.origins},createdAt:new Date().toISOString()};
    renderReport();$('#generated-title').setAttribute('tabindex','-1');$('#generated-title').focus({preventScroll:true});$('#generated-report').scrollIntoView({behavior:'auto',block:'start'});
  });
  const md = value => String(value).replace(/[\r\n]+/g,' ').replace(/[\\`*_{}\[\]<>#|]/g,'\\$&');
  function markdownReport(){
    const parts=reportParts();if(!parts)return '';
    const lines=['# '+t('generatedTitle'),'',marketName(currentReport.scope.market)+' / '+categoryName(currentReport.scope.category),'',currentReport.createdAt,'',t('reportCaveat'),'', '## '+t('referenceSpecs'),''];
    parts.specs.forEach(([label,value,unit])=>lines.push('- '+t(label)+': '+md(typeof value==='string'?value:fmt(value))+' '+unit));
    for(const[title,items]of[['referenceEvidence',parts.evidence],['designConstraints',parts.constraints],['validationChecklist',parts.validation]]){lines.push('','## '+t(title),'');items.forEach(item=>lines.push('- '+md(item)));}
    if(currentReport.result.reference)lines.push('','## '+t('visualPrompt'),'',parts.prompt);
    return lines.join('\n')+'\n';
  }
  $('#export-markdown').addEventListener('click',()=>{if(!currentReport)return;download(fileBase()+'-brief-'+language+'.md',markdownReport(),'text/markdown;charset=utf-8');toast(t('downloadReady'));});
  $('#export-report-csv').addEventListener('click',()=>{if(!currentReport)return;download(fileBase()+'-evidence.csv',E.exportCSV(reportParts().records),'text/csv;charset=utf-8');toast(t('downloadReady'));});
  let resetOrigin=null;
  function closeReset(){
    $('#reset-confirmation').hidden=true;
    if(resetOrigin)resetOrigin.focus({preventScroll:true});
  }
  function resetDemo(){
    resetOrigin=document.activeElement;$('#reset-confirmation').hidden=false;$('#reset-cancel').focus({preventScroll:true});
  }
  $('#reset-cancel').addEventListener('click',closeReset);
  $('#reset-confirm').addEventListener('click',()=>{
    stopTimer();state=seed();invalidateReport();$('#market-select').value='AU';$('#category-select').value='floodlight';$('#collection-source').value='all';$('#brand-filter').value='all';$('#source-filter').value='all';$('#product-search').value='';save();render();toast(t('resetDone'));
    closeReset();
  });
  document.addEventListener('keydown',event=>{if(event.key==='Escape' && !$('#reset-confirmation').hidden)closeReset();});
  $('#reset-demo').addEventListener('click',resetDemo);
  $$('[data-reset-demo]').forEach(button=>button.addEventListener('click',resetDemo));
  updateLanguage();setView(view,{focus:false});
})();
