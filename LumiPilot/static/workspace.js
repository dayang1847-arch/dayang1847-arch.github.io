'use strict';

// Shared presentation decisions only: no DOM, requests, storage, or project writes.
window.LumiWorkspace = (() => {
  const titles = Object.freeze({
    overview:'项目工作台', projects:'项目数据库', solution:'产品方案', optical:'光学验证', bom:'成本核算',
    market:'市场与来源', materials:'材料与物流', knowledge:'照明知识库', help:'使用说明', access:'访问设置'
  });
  const pages = new Set([...Object.keys(titles), 'crawler', 'manufacturing', 'cost']);
  const projectSections = new Set(['overview', 'solution', 'optical', 'bom']);
  const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
  const count = value => typeof value === 'number' && Number.isSafeInteger(value) && value >= 0 ? value : null;
  const number = value => typeof value === 'number' && Number.isFinite(value);
  const text = value => typeof value === 'string' && value.trim().length > 0;

  function route(hash) {
    const raw = typeof hash === 'string' ? hash.replace(/^#/, '') : '';
    const split = raw.indexOf('?');
    const requested = split < 0 ? raw : raw.slice(0, split);
    const query = new URLSearchParams(split < 0 ? '' : raw.slice(split + 1));
    const page = requested ? (pages.has(requested) ? requested : 'overview') : 'projects';
    let section = page, workspace = '';
    if(page === 'projects')section = 'overview';
    if(page === 'crawler')section = 'market';
    if(page === 'cost'){section='bom';workspace=['overview','procurement','route','compare'].includes(query.get('view'))?query.get('view'):'overview';}
    if(page === 'manufacturing') {
      workspace = query.get('view') === 'knowledge' ? 'knowledge' : 'cost';
      section = workspace === 'knowledge' ? 'knowledge' : 'bom';
    }
    const scope = page === 'help' ? 'help' : page === 'access' ? 'settings' : page === 'projects' ? 'catalog' : projectSections.has(section) ? 'project' : 'shared';
    return {page, section, scope, title:page === 'projects' ? titles.projects : titles[section], group:scope, workspace};
  }

  function stage(id, label, href, status, labelStatus, note, ready = false) {
    return {id, label, href, status, labelStatus, note, tone:ready ? 'blue' : 'amber', ready};
  }

  function definitionStage(project) {
    if(project.sales||project.sales_brief){const spec=project.spec||{},ready=Array.isArray(spec.power_options_w)&&spec.power_options_w.length>0;return stage('definition','销售产品范围','#solution',ready?'saved':'missing',ready?'产品范围已保存':'待填写产品范围','项目可包含多个瓦数、色温与光通量；未知规格及具体对应组合继续补充。',ready);}
    const spec = record(project.spec) ? project.spec : {};
    const saved = number(spec.power_w) && spec.power_w > 0 &&
      number(spec.luminous_flux_lm) && spec.luminous_flux_lm > 0 &&
      number(spec.cct_k) && spec.cct_k > 0 && number(spec.cri) && spec.cri >= 0 && spec.cri <= 100;
    return saved
      ? stage('definition','产品定义','#solution','saved','目标已保存','功率、光通量、色温和显色为目标规格；仍需样机验证。',true)
      : stage('definition','产品定义','#solution','missing','待完善产品定义','保存目标功率、光通量、色温和显色要求，作为后续分析依据。');
  }

  function marketStage(project) {
    const refs = Array.isArray(project.market_references) ? project.market_references.filter(record) : [];
    const usable = refs.filter(ref => !ref.deleted && ref.status !== 'deleted');
    if(!usable.length)return stage('market','市场参考','#market',refs.length ? 'stale' : 'missing',
      refs.length ? '市场引用需更新' : '待补市场参考',
      refs.length ? '原关联参考已失效，请补充可追溯来源。' : '从共享市场库选择参考，保存到当前项目；目录线索与商品证据分别核对。');
    const manual = usable.every(ref => ref.evidence_type === 'manual-benchmark');
    return stage('market','市场参考','#market','saved',manual ? '已关联目录参考' : '已关联市场参考',
      `${usable.length} 条有效关联${refs.length > usable.length ? '，另有失效引用' : ''}；${manual ? '手工目录线索不代表已核验商品或在售情况。' : '来源、规格和当地适用性仍需核验。'}`,true);
  }

  function solutionStage(project) {
    if(project.sales||project.sales_brief){const brief=project.sales_brief;if(!brief)return stage('solution','项目销售方案','#solution','missing','待整理销售方案','按销售目标、产品范围与当地竞品整理资料，未知信息保留待确认。');const stale=brief.status==='needs_refresh';return stage('solution','项目销售方案','#solution',stale?'stale':'saved',stale?'销售方案需更新':'销售方案已保存',stale?'销售规格、目标或依据有变化，请重新生成。':'已整理项目销售信息；报价与具体产品组合仍需核对。',!stale);}
    const plan = record(project.plan) ? project.plan : null;
    const deleted = Array.isArray(plan?.references) && plan.references.some(ref => record(ref) && ref.deleted);
    if(plan?.status === 'needs_refresh' || deleted)return stage('solution','方案草案','#solution','stale','方案需重新生成',
      '目标、分析或引用有变化；旧草案保留为历史参考，请重新生成并核对来源。');
    if(!plan || !(plan.status === 'current' || text(plan.summary) || Array.isArray(plan.sections) && plan.sections.length))
      return stage('solution','方案草案','#solution','missing','待生成方案草案','根据当前产品定义和关联资料生成初稿；草案需工程评审。');
    return stage('solution','方案草案','#solution','saved','草案已保存','知识检索与工程规则草案；不是设计验证、生产批准或认证结论。',true);
  }

  function opticalStage(project) {
    const optical = record(project.optical) ? project.optical : null;
    const input = record(project.photometry) ? project.photometry : null;
    if(optical?.spec_changed || input?.spec_changed || ['spec_changed','needs_input'].includes(project.optical_input_status))
      return stage('optical','光学预览','#optical','stale','光学输入需更新',
        '目标规格已变化，请核对或替换输入并重新计算；已有摘要不能当作当前目标的验证。');
    const summary = record(optical?.summary) ? optical.summary : optical;
    if(!summary || !number(summary.avgLux) || summary.avgLux < 0)
      return stage('optical','光学预览','#optical','missing',input ? '配光已保存 · 待计算' : '待建立光学预览',
        input ? '光度文件已保存，尚无有效照度计算摘要；文件上传不证明测量来源。' : '导入 IES / LDT 或建立概念配光，再保存直接光场景预览。');
    const source = optical.source_type || summary.sourceType || input?.source_type;
    const provenance = source === 'concept' ? '概念配光，非实测' : source === 'demo' ? '合成样例，非实测' :
      source === 'uploaded-unverified' ? '上传文件，来源待核验' : '输入来源与适用性待核验';
    return stage('optical','光学预览','#optical','saved','预览已保存',
      `${provenance}；仅直接光，未计反射、遮挡、日光与 UGR，不代表工程通过。`,true);
  }

  function bomStage(project) {
    const quote = record(project.quote) ? project.quote : null;
    const bom = Array.isArray(project.bom) ? project.bom : [];
    if(!quote)return stage('bom','BOM 与报价','#bom','missing',bom.length ? '待查询核价' : '待导入 BOM',
      project.bom_source === 'generated_demo' ? '已有规则生成的演示 BOM 骨架；需导入真实工程 BOM 并核对物料和报价。' :
        bom.length ? `${bom.length} 行 BOM 已保存；查询候选，人工确认规格及价格口径。` : '导入工程 BOM，再建立供应来源、候选和价格证据。');
    if(quote.spec_changed || quote.status === 'needs_refresh')return stage('bom','BOM 与报价','#bom','stale','材料报价需更新',
      '保存的报价已标记失效，请按当前规格和采购条件重新核价。');
    const provider = record(quote.provider) ? quote.provider : {};
    const summary = record(quote.summary) ? quote.summary : {};
    const pending = count(summary.pending_count), external = count(summary.external_count);
    const unresolved = `${pending === null ? '待确认行数未知' : `${pending} 行待确认 / 未定价`}；${external === null ? '外部询价行数未知' : `${external} 行外部询价`}`;
    if(provider.is_demo === true || provider.code === 'demo_catalog')return stage('bom','BOM 与报价','#bom','demo','演示核价 · 待真实报价',
      `已保存演示价格；${unresolved}。演示金额不代表实际采购报价或整灯成本。`);
    if(provider.is_demo !== false)return stage('bom','BOM 与报价','#bom','unconfirmed','报价来源待核验',
      `报价来源尚未明确区分演示与供应接口；${unresolved}。`);
    const terms = record(quote.price_terms) ? quote.price_terms : {};
    const confirmed = terms.confirmed === true && terms.currency === 'CNY' && terms.unit === 'piece' &&
      summary.currency === 'CNY' && summary.price_unit === 'piece';
    if(!confirmed)return stage('bom','BOM 与报价','#bom','unconfirmed','价格币种 / 单位待确认',
      `已保存供应接口记录，CNY / 每件计价尚未完整确认；${unresolved}，不将原值认定为人民币材料金额。`);
    const empty = summary.line_count === 0 || summary.priced_count === 0 || Array.isArray(quote.lines) && quote.lines.length === 0;
    if(summary.complete !== true || pending !== 0 || external !== 0 || empty)return stage('bom','BOM 与报价','#bom','partial','材料报价待补齐',
      `已保存接口材料参考；${unresolved}${empty ? '，尚无已定价物料' : ''}。未决项不计入小计，不能代表整灯成本。`);
    return stage('bom','BOM 与报价','#bom','saved','接口材料参考已保存',
      '当前报价行已记录，币种和每件计价已确认；仍需核对采购条件，不代表结构、加工、测试、税运齐全的整灯成本。',true);
  }

  function manufacturingStage(options) {
    const total = count(options.manufacturingCount);
    if(total === null)return stage('manufacturing','加工成本','#manufacturing','unknown','加工记录待读取',
      '本项目已保存估算条数未知；不视为零条或完成，请进入工艺测算核对。');
    if(total === 0)return stage('manufacturing','加工成本','#manufacturing','missing','待补加工估算',
      '尚无已保存单工序估算；填写真实费率、节拍、良率及费用包含项后计算。');
    return stage('manufacturing','加工成本','#manufacturing','saved','单工序估算已保存',
      `${total} 条人工条件估算参考；不是完整路线 MVA 或工厂正式报价。`,true);
  }

  // ready means saved inputs for progressing through this prototype, never approval.
  function stages(project, options = {}) {
    const p = record(project) ? project : {}, opts = record(options) ? options : {};
    if(p.sales||p.sales_brief)return [definitionStage(p),marketStage(p),solutionStage(p),stage('review','销售确认','#overview?view=intelligence','review','待业务确认','确认客户需求、价格条件、产品组合与当地竞品依据。')];
    return [definitionStage(p), marketStage(p), solutionStage(p), opticalStage(p), bomStage(p), manufacturingStage(opts),
      stage('review','工程评审','#knowledge','review','待工程评审','补齐实测、可靠性和适用认证资料；草案、预览、报价与估算都不代表工程通过。')];
  }

  function nextStep(project, options = {}) {
    return stages(project, options).find(item => !item.ready);
  }

  function projectStatus(project, options = {}) {
    const next = nextStep(project, options);
    return {label:next.labelStatus, tone:next.tone, note:next.note};
  }

  return Object.freeze({route, stages, nextStep, projectStatus});
})();
