'use strict';

// Manual inputs and the server's single-operation result remain separate from BOM costs.
window.LumiManufacturing = (() => {
  const data = {knowledge:{processes:[],notice:'',version:''},projectId:'',processId:'',workspace:'knowledge',hosted:false,query:'',drafts:{},results:{},estimates:{},loadEpoch:0,active:false,error:'',calculating:false,saving:false,loadingSample:false,sampleEpoch:0};
  const $ = selector => document.querySelector(selector);
  const modes = {cycle:'完整周期 / 有效产出',throughput:'连续产速 / 净重',piece_rate:'委外良品计件'};
  const taxes = {unknown:'税口径待确认',included:'含税',excluded:'不含税'};
  const fields = ['name','quantity_good','qty_per_lamp','cycle_seconds','cavities','availability_performance','yield_rate','throughput_kg_h','net_weight_g','rate_mode','hourly_rate','machine_rate','operators','labor_rate','average_kw','electricity_rate','overhead_rate','consumables_per_input_piece','setup_hours','setup_cost','tooling_total','tooling_lifetime_good_qty','outsourced_price_per_good_piece','material_price_per_kg','gross_material_g_per_input_piece','recoverable_scrap_g_per_input_piece','scrap_credit_per_kg','rate_date','rate_source','tax_basis','mode','materials_enabled'];
  const button = (action,label,extra='',cls='button') => `<button type="button" class="${cls}" data-manufacturing-action="${action}" ${extra}>${label}</button>`;
  const key = () => `${data.projectId || 'unassigned'}::${data.processId}`;
  const process = () => data.knowledge.processes.find(row => row.id === data.processId);
  const records = () => data.estimates[data.projectId] || [];
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const amount = value => finite(value) ? num(value,4)+' 元' : '未计入';
  const numeric = value => finite(value) ? num(value,4) : '—';
  function cancelSample() {data.loadingSample=false;++data.sampleEpoch;}
  function draft() {
    const id = key();
    if(!data.drafts[id]) {
      const d = Object.fromEntries(fields.map(field => [field,'']));
      Object.assign(d,{qty_per_lamp:'1',mode:process()?.preferred_mode || process()?.allowed_modes?.[0] || 'cycle',rate_mode:'itemized',tax_basis:'unknown',materials_enabled:false});
      data.drafts[id] = d;
    }
    return data.drafts[id];
  }
  const signature = d => JSON.stringify(d);
  function remember() {
    const form = $('#manufacturing-form');
    if(!form || form.dataset?.context !== key())return;
    const d = draft();
    for(const el of form.elements || [])if(Object.hasOwn(d,el.name))d[el.name] = el.type === 'checkbox' ? el.checked : el.value;
  }
  function setContext(context = {}) {
    remember();
    if(typeof context.hosted === 'boolean')data.hosted = context.hosted;
    if(['cost','knowledge'].includes(context.workspace) && context.workspace !== data.workspace)cancelSample();
    if(['cost','knowledge'].includes(context.workspace))data.workspace = context.workspace;
    return {workspace:data.workspace,hosted:data.hosted};
  }
  function switchWorkspace(workspace) {
    cancelSample();
    data.workspace = workspace === 'cost' ? 'cost' : 'knowledge';
    if(data.hosted)navigate(data.workspace === 'cost' ? 'manufacturing' : 'manufacturing?view=knowledge');
    else paint();
  }
  function present() {return data.active && $('#content')?.dataset?.page === 'manufacturing';}
  function hydrate(host) {if(host && typeof hydrateIcons === 'function')hydrateIcons(host);}
  function paint() {
    if(!present())return;
    const host = $('#content');
    host.innerHTML = view();
    hydrate(host);
  }
  function paintResults() {
    if(!present())return;
    const host = $('#manufacturing-result');
    if(host){host.innerHTML = resultView();hydrate(host);}
    const history = $('#manufacturing-history');
    if(history){history.innerHTML = historyView();hydrate(history);}
    const calculate = $('#manufacturing-calculate');
    if(calculate)calculate.disabled = data.calculating || data.saving || data.loadingSample;
    const save = $('[data-manufacturing-action="save"]');
    if(save)save.disabled = !canSave();
    const sample = $('[data-manufacturing-action="fill-example"]');
    if(sample){sample.disabled=data.loadingSample || data.calculating || data.saving;sample.textContent=data.loadingSample ? '正在读取示例条件…' : '填入示例注塑条件';}
  }
  async function load(projectId = current()?.id || '') {
    remember();
    cancelSample();
    const pid = String(projectId || ''), token = ++data.loadEpoch;
    data.projectId = pid;
    const requests = [api('/api/manufacturing/knowledge'),pid ? api(`/api/projects/${encodeURIComponent(pid)}/manufacturing`) : Promise.resolve({estimates:[]})];
    const loaded = await Promise.allSettled(requests);
    if(token !== data.loadEpoch || pid !== data.projectId)return null;
    const errors = [];
    if(loaded[0].status === 'fulfilled') {
      const value = loaded[0].value || {};
      data.knowledge = {...value,processes:Array.isArray(value.processes) ? value.processes : []};
      if(!process())data.processId = data.knowledge.processes[0]?.id || '';
    }else errors.push(loaded[0].reason?.message || '工艺资料未读取');
    if(loaded[1].status === 'fulfilled')data.estimates[pid] = Array.isArray(loaded[1].value?.estimates) ? loaded[1].value.estimates : [];
    else errors.push(loaded[1].reason?.message || '本机估算记录未读取');
    data.error = errors.join('；');
    if(data.processId)draft();
    return data.knowledge;
  }
  function today() {return new Date(Date.now()+8*3600*1000).toISOString().slice(0,10);}
  function validDate(value) {
    if(!/^\d{4}-\d{2}-\d{2}$/.test(value || ''))return false;
    const date = new Date(value+'T00:00:00Z');
    return !Number.isNaN(date.getTime()) && date.toISOString().slice(0,10) === value && value <= today();
  }
  function value(d,field,label,{min=0,max=1e9,integer=false,strict=false,optional=false}={}) {
    if(d[field] === '' || d[field] == null) {
      if(optional)return null;
      throw new Error(`请填写${label}；不计入的费用请明确填0`);
    }
    const number = Number(d[field]);
    if(!Number.isFinite(number) || (strict ? number <= min : number < min) || number > max || (integer && !Number.isInteger(number)))throw new Error(`${label}超出有效范围`);
    return number;
  }
  function payload(d) {
    const p = process();
    if(!p || !(p.allowed_modes || []).includes(d.mode))throw new Error('此工艺尚未配置所选测算模式');
    if(!validDate(d.rate_date))throw new Error('请填写有效且不在未来的费率日期');
    if(!String(d.rate_source || '').trim() || String(d.rate_source).length > 2000)throw new Error('请填写工厂费率或供应报价来源');
    const result = {process_id:p.id,mode:d.mode,currency:'CNY',tax_basis:d.tax_basis,rate_date:d.rate_date,rate_source:d.rate_source,quantity_good:value(d,'quantity_good','本批目标良品数量',{min:0,strict:true,integer:true}),qty_per_lamp:value(d,'qty_per_lamp','每灯该工序用件数',{min:0,strict:true,max:1e6})};
    if(!Object.hasOwn(taxes,d.tax_basis))throw new Error('请选择税费口径');
    result.tooling_total = value(d,'tooling_total','工具/模具净价值',{max:1e8});
    result.tooling_lifetime_good_qty = result.tooling_total > 0 ? value(d,'tooling_lifetime_good_qty','模具分摊寿命良品数',{min:0,strict:true,integer:true}) : null;
    if(d.mode === 'piece_rate') {
      result.outsourced_price_per_good_piece = value(d,'outsourced_price_per_good_piece','委外良品单价',{max:1e8});
      return result;
    }
    result.availability_performance = value(d,'availability_performance','生产效率百分比',{min:0,strict:true,max:100}) / 100;
    result.yield_rate = value(d,'yield_rate','良率百分比',{min:0,strict:true,max:100}) / 100;
    if(d.mode === 'cycle') {
      result.cycle_seconds = value(d,'cycle_seconds','完整名义周期秒',{min:0,strict:true,max:86400});
      result.cavities = value(d,'cavities','每周期有效产出件数',{min:1,max:1024,integer:true});
    }else {
      result.throughput_kg_h = value(d,'throughput_kg_h','成形产速kg/h',{min:0,strict:true,max:1e6});
      result.net_weight_g = value(d,'net_weight_g','单件净重量g',{min:0,strict:true,max:1e7});
    }
    result.rate_mode = d.rate_mode;
    if(d.rate_mode === 'bundled')result.hourly_rate = value(d,'hourly_rate','综合小时加工费',{max:1e8});
    else if(d.rate_mode === 'itemized')for(const [field,label] of [['machine_rate','纯机时费'],['operators','分摊作业人数'],['labor_rate','人工人时费'],['average_kw','平均功率'],['electricity_rate','电价']])result[field] = value(d,field,label,{max:field === 'operators' ? 1000 : 1e8});
    else throw new Error('请选择综合时率或分项时率');
    result.overhead_rate = value(d,'overhead_rate','额外制造间接费',{max:1e8});
    for(const [field,label] of [['consumables_per_input_piece','每毛件耗材费'],['setup_hours','换型小时'],['setup_cost','额外固定换型费']])result[field] = value(d,field,label,{max:1e8});
    if(d.materials_enabled) {
      result.net_weight_g = value(d,'net_weight_g','单件净材料重量g',{min:0,strict:true,max:1e7});
      result.gross_material_g_per_input_piece = value(d,'gross_material_g_per_input_piece','每毛件投料重量g',{min:0,strict:true,max:1e7});
      result.material_price_per_kg = value(d,'material_price_per_kg','实际原料公斤价',{max:1e8});
      if(result.gross_material_g_per_input_piece < result.net_weight_g)throw new Error('毛件投料重量不得低于净材料重量');
      for(const [field,label] of [['recoverable_scrap_g_per_input_piece','每毛件外售废料g'],['scrap_credit_per_kg','废料外售公斤抵扣价']])result[field] = value(d,field,label,{optional:true,max:1e8}) ?? 0;
    }
    return result;
  }
  function filtered() {
    const q = data.query.trim().normalize('NFKC').toLowerCase();
    return data.knowledge.processes.filter(p => !q || [p.name,p.group,p.summary,...(p.applications || [])].join(' ').normalize('NFKC').toLowerCase().includes(q));
  }
  function listView() {
    const matched = filtered();
    const groups = [...new Set(matched.map(p => p.group))];
    const rows = groups.flatMap(group => matched.filter(p => p.group === group));
    let lastGroup = '';
    return rows.map(p => {const group = p.group !== lastGroup ? `<p class="manufacturing-group">${esc(p.group)}</p>` : '';lastGroup=p.group;return group+button('process',`<strong>${esc(p.name)}</strong><small>${esc((p.applications || []).slice(0,2).join(' / '))}</small>`,`data-id="${esc(p.id)}" aria-pressed="${p.id === data.processId}"`,'manufacturing-process'+(p.id === data.processId ? ' selected' : ''));}).join('') || '<p class="manufacturing-empty">没有匹配的工艺。</p>';
  }
  function bullets(items) {return (items || []).length ? `<ul>${items.map(item => `<li>${esc(item)}</li>`).join('')}</ul>` : '<p class="manufacturing-muted">资料待补充。</p>';}
  function sources(p) {
    return (p.sources || []).map(s => {const url = safeUrl(s.url);return `<div class="manufacturing-source"><strong>${esc(s.title)}</strong><small>${esc(s.publisher || '来源待补')} · 核对日期 ${esc(s.checked_at || '未记录')}</small>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">查看原始资料 ${icon('ArrowUpRight')}</a>` : '<span>原始网址待核对</span>'}</div>`;}).join('') || '<p class="manufacturing-muted">原始来源待补充。</p>';
  }
  function knowledgeView() {
    const p = process();
    if(!p)return '<div class="manufacturing-empty">本机工艺知识尚未读取，可以重新载入。</div>';
    const checks = [['质量与工程核查',p.quality_checks],['工厂应补的资料',p.missing_evidence],['适用边界',p.boundaries]];
    return `<section class="panel manufacturing-knowledge"><div class="panel-header"><div><p class="eyebrow">${esc(p.group)} · 工艺原理参考</p><h2>${esc(p.name)}</h2><p>${esc(p.summary)}</p></div><div class="manufacturing-header-actions">${button('workspace',icon('Calculator')+'测算该工序','data-workspace="cost"','button button-primary')}</div></div><div class="manufacturing-knowledge-body"><div class="manufacturing-principle"><h3>工艺原理与应用</h3><p>${esc(p.principle)}</p><div class="manufacturing-tags">${(p.applications || []).map(a=>tag(a)).join('')}</div></div><div class="manufacturing-knowledge-grid"><section><h3>典型流程</h3>${bullets(p.steps)}</section><section><h3>成本驱动</h3>${bullets(p.cost_drivers)}</section><section class="manufacturing-formula-card"><h3>计算原则</h3>${bullets(p.formulas)}</section></div><div class="manufacturing-detail-stack">${checks.map(([title,items])=>`<details class="manufacturing-detail"><summary>${title}<span>${num((items || []).length)} 项</span></summary><div>${bullets(items)}</div></details>`).join('')}<details class="manufacturing-detail manufacturing-sources"><summary>原始来源与可追溯资料<span>${num((p.sources || []).length)} 条</span></summary><div>${sources(p)}</div></details></div></div></section>`;
  }
  function input(d,name,label,{required=true,min=0,max=1e8,step='any',hint='',type='number'}={}) {
    return `<label class="field">${label}<input name="${name}" type="${type}" value="${esc(d[name])}" ${required ? 'required' : ''} ${type === 'number' ? `min="${min}" max="${max}" step="${step}"` : type === 'date' ? `max="${today()}"` : `maxlength="${name === 'name' ? 120 : 2000}"`}>${hint ? `<small>${hint}</small>` : ''}</label>`;
  }
  function section(title,body,note='',help='') {return `<fieldset class="manufacturing-fieldset"><legend>${title}</legend>${note ? `<p class="manufacturing-form-note">${note}</p>` : ''}${help ? `<details class="manufacturing-field-help"><summary>如何填写基准与效率</summary><p>${help}</p></details>` : ''}<div class="manufacturing-fields">${body}</div></fieldset>`;}
  function formView() {
    const p = process(), d = draft(), time = d.mode !== 'piece_rate';
    const modeOptions = (p?.allowed_modes || []).map(mode=>`<option value="${esc(mode)}" ${mode === d.mode ? 'selected' : ''}>${esc(modes[mode] || mode)}</option>`).join('');
    const context = input(d,'name','估算名称（保存必填）',{type:'text',required:false}) + input(d,'quantity_good','本批目标良品 · 件',{min:1,max:1e9,step:1}) + input(d,'qty_per_lamp','每灯该工序用件数',{min:0.000001,max:1e6,hint:'仅改变每灯分摊；本批目标数量需填写该工序良品件数'}) + `<label class="field">生产或服务模式<select name="mode">${modeOptions}</select></label>`;
    let production = '';
    if(time) {
      production = d.mode === 'cycle' ? input(d,'cycle_seconds','基准完整周期 · 秒/次',{min:0.000001,max:86400})+input(d,'cavities','每周期有效产出 · 件/次',{min:1,max:1024,step:1}) : input(d,'throughput_kg_h','基准毛成形等效产速 · kg/h',{min:0.000001,max:1e6,hint:'指成形件等效重量产出，不是投料或粉末喷出量'})+input(d,'net_weight_g','单件净重量 · g',{min:0.000001,max:1e7,hint:'塑包铝只用净塑料重；不含铝芯或其它嵌件'});
      production += input(d,'availability_performance','生产效率 · %（不含良率）',{min:0.000001,max:100})+input(d,'yield_rate','工序良率 · %',{min:0.000001,max:100});
    }else production = input(d,'outsourced_price_per_good_piece','委外加工 · 元/良品件',{min:0,hint:'以合格交付件计价；报价是否包含材料另核对'});
    let rate = '';
    if(time) {
      rate = `<label class="field">费率口径<select name="rate_mode"><option value="itemized" ${d.rate_mode === 'itemized' ? 'selected' : ''}>机时 / 人工 / 电能分项</option><option value="bundled" ${d.rate_mode === 'bundled' ? 'selected' : ''}>综合小时加工费</option></select></label>`;
      rate += d.rate_mode === 'bundled' ? input(d,'hourly_rate','综合小时加工费 · 元/h',{hint:'包含的机时、人工和电能不能再加分项'}) : input(d,'machine_rate','纯机时费 · 元/h',{hint:'不含下面单列的人工、电能；折旧/维护/厂房间接是否含入需在来源写清'})+input(d,'operators','分摊作业人数 · 人',{max:1000,hint:'一人多机应填本机分摊人数'})+input(d,'labor_rate','人工 · 元/人·h')+input(d,'average_kw','生产与换型平均功率 · kW',{hint:'两窗口功率不同时须分测；首版不自动推定'})+input(d,'electricity_rate','电价 · 元/kWh');
      rate += input(d,'overhead_rate','额外制造间接费 · 元/h',{hint:'只填时率未含的生产制造费用；已含或不计填0，勿填销售/财务费用'})+input(d,'consumables_per_input_piece','耗材 · 元/毛件')+input(d,'setup_hours','额外换型时间 · h',{hint:'效率和节拍不能已包含同一换型时间'})+input(d,'setup_cost','额外固定换型费 · 元/批',{hint:'不要再计已包含在小时费的机时、人工和电能'});
    }
    const tool = input(d,'tooling_total','独立工具/模具待摊价值 · 元',{hint:'单列于MVA外；时率已含或不摊销填0；待摊余额须配剩余寿命'})+input(d,'tooling_lifetime_good_qty','对应分摊寿命 · 良品件',{required:Number(d.tooling_total)>0,min:1,max:1e9,step:1,hint:'模次寿命须乘有效穴数与预期良率，换为良品件数'});
    let material = '';
    if(time) {
      material = `<label class="manufacturing-check"><input name="materials_enabled" type="checkbox" ${d.materials_enabled ? 'checked' : ''}>另计已确认的原料投料与外售废料（可选）</label>`;
      if(d.materials_enabled)material += `<div class="manufacturing-fields">${d.mode === 'cycle' ? input(d,'net_weight_g','单件净材料重量 · g',{min:0.000001,max:1e7}) : ''}${input(d,'gross_material_g_per_input_piece','每毛件实际投料 · g',{min:0.000001,max:1e7})}${input(d,'material_price_per_kg','实际原料单价 · 元/kg',{hint:'手工填写已确认牌号价格，不自动采用期货价'})}${input(d,'recoverable_scrap_g_per_input_piece','每毛件外售废料 · g',{required:false,hint:'仅外售；内部回用不能同时计出售抵扣'})}${input(d,'scrap_credit_per_kg','外售废料抵扣价 · 元/kg',{required:false})}</div>`;
      material += '<p class="manufacturing-form-note">未填原料不计为0；原料成本单独列。良率已影响投料，不再套BOM损耗加成；未录入回收不抵扣。</p>';
    }
    const source = input(d,'rate_date','费率 / 报价日期',{type:'date'})+`<label class="field">税费口径<select name="tax_basis">${Object.entries(taxes).map(([value,label])=>`<option value="${value}" ${value === d.tax_basis ? 'selected' : ''}>${label}</option>`).join('')}</select></label>`+input(d,'rate_source','费率 / 报价证据来源',{type:'text',hint:'工艺卡/设备记录/报价文件；说明折旧、维护及厂房间接费用是否已含'});
    const efficiencyHelp = '效率=可用率×速度效率，不含良率及单列换型。实测周期/毛产速已含慢速时，速度效率取1；已含停机与慢速时，效率填100%。不得填完整OEE或已扣良率的有效节拍；连续产速需与切断后的净件口径一致。';
    return `<section class="panel manufacturing-input"><div class="panel-header"><div><h3>${esc(p?.name || '工艺')} · 单工序批次</h3><p>费率不预置；不计的费用需明确填0</p></div>${tag(data.projectId ? '本项目草稿' : '尚未选择项目')}</div><form id="manufacturing-form" data-context="${esc(key())}">${section('1 · 批次与交付口径',context)}${section('2 · 产能与良率',production,time ? '基准周期或产速与相对效率配套使用；效率不含良率及额外换型。' : '委外加工服务不叠加内部人工、能耗或耗材。',time ? efficiencyHelp : '')}${time ? section('3 · 加工费用',rate,'小时费作用于生产及额外换型时间；额外固定费用另列。') : ''}${section('4 · 工具寿命分摊',tool)}${time ? `<fieldset class="manufacturing-fieldset"><legend>5 · 原料与回收边界</legend>${material}</fieldset>` : ''}${section('费率来源与税口径',source)}<div class="manufacturing-form-actions"><div class="manufacturing-action-buttons"><button id="manufacturing-calculate" type="submit" class="button button-primary" ${data.calculating || data.saving ? 'disabled' : ''}>${icon('Calculator')}${data.calculating ? '正在计算…' : '计算该工序'}</button>${button('save',icon('ClipboardList')+'保存本项目估算',canSave() ? '' : 'disabled')}</div><span>仅保存本项目单工序估算，不更新BOM。</span></div></form></section>`;
  }
  function canSave() {
    const entry = data.results[key()];
    return !!(data.projectId && draft().name.trim() && draft().name.trim().length <= 120 && entry && !entry.error && entry.signature === signature(draft()) && !data.calculating && !data.saving && !data.loadingSample);
  }
  function resultView() {
    const entry = data.results[key()];
    if(!entry)return '<div class="manufacturing-result-empty">'+icon('Calculator')+'<strong>填写工厂条件后计算</strong><p>不会预置工厂价格、效率或良率。结果仅覆盖当前工序。</p></div>';
    const r = entry.result || {}, c = r.costs || {}, u = r.unit || {}, stale = entry.signature !== signature(draft());
    const costs = [['machine',r.inputs?.rate_mode === 'bundled' ? '综合小时加工费' : '纯机时'],['labor','人工'],['energy','电能'],['overhead','额外制造间接费'],['consumables','耗材'],['setup','额外固定换型'],['tooling','独立工具寿命分摊（MVA外）'],['external_service','委外加工服务（单列）']];
    const hasMva = r.mva_definition?.status === 'user_confirmed', internal = r.service_kind !== 'external_service';
    const resultTitle = !internal ? '委外单工序加工服务 · 外购服务单列' : hasMva ? '加工增值成本 MVA · 元/良品件' : '历史加工估算 · 重新计算后采用确认口径';
    const primaryValues = internal && hasMva ? [['每良品件 MVA',u.mva],['每灯该工序 MVA',u.mva_per_lamp]] : [['每灯该工序分摊',u.conversion_per_lamp],['每良品件加工费',u.conversion]];
    const mvaRow = hasMva ? `<tr class="manufacturing-cost-total"><td>本批加工增值成本 MVA</td><td>${internal ? finite(c.mva) ? amount(c.mva) : '待确认' : '委外服务单列'}</td></tr><tr><td>独立工具 / 模具摊销（另列）</td><td>${amount(c.tooling)}</td></tr>` : '';
    const warnings = [...new Set(r.warnings || [])];
    const taxWarning = r.tax_basis === 'unknown' ? '税口径未确认，不能直接比较含税与未税报价，不能称为净税MVA。' : r.tax_basis === 'included' ? '结果保留含税口径，未剥离税额；不能称为净税MVA或与未税报价直接比较。' : '';
    const visibleWarnings = taxWarning ? warnings.filter(w => !/税口径|净税MVA|可剥离税额/.test(w)) : warnings;
    return `${entry.error ? `<div class="manufacturing-stale" role="status">计算失败：${esc(entry.error)}。保留上次结果，请核对后重新计算。</div>` : stale ? '<div class="manufacturing-stale" role="status">输入已变更，以下是上次结果。请重新计算后保存。</div>' : ''}<div class="manufacturing-result-heading"><span>${resultTitle}</span><div class="manufacturing-unit-values">${primaryValues.map(([label,value])=>`<div><small>${label}</small><strong>${internal && hasMva && !finite(value) ? '待确认' : amount(value)}</strong></div>`).join('')}</div><p>不是完整整灯MVA；原料、独立模具及其它工序另列。</p></div><table class="manufacturing-cost-table manufacturing-summary-table"><tbody>${mvaRow}<tr><td>已填加工＋独立模具小计</td><td>${amount(c.total_conversion)}</td></tr><tr><td>原料净费用（另列）</td><td>${amount(c.material)}</td></tr><tr><td>含已填原料的制造参考</td><td>${amount(c.total_with_material)}</td></tr></tbody></table><div class="manufacturing-result-context"><p>税口径：${esc(taxes[r.tax_basis] || '待确认')} · 费率日期：${esc(r.inputs?.rate_date || '未记录')}</p>${taxWarning ? `<p class="manufacturing-warning">${esc(taxWarning)}</p>` : ''}${visibleWarnings.length ? bullets(visibleWarnings) : ''}<details class="manufacturing-result-details"><summary>费用明细与产能</summary><table class="manufacturing-cost-table"><thead><tr><th>费用构成 · CNY</th><th>本批金额</th></tr></thead><tbody>${costs.map(([id,label])=>`<tr><td>${label}</td><td>${amount(c[id])}</td></tr>`).join('')}</tbody></table><dl class="manufacturing-capacity"><div><dt>目标良品</dt><dd>${numeric(r.quantity_good)} 件</dd></div><div><dt>毛件 / 投入件</dt><dd>${numeric(r.quantity_input)} 件</dd></div><div><dt>周期次数</dt><dd>${numeric(r.shots)}</dd></div><div><dt>生产 / 换型</dt><dd>${numeric(r.production_hours)} / ${numeric(r.setup_hours)} h</dd></div><div><dt>预计良品</dt><dd>${numeric(r.estimated_good_output)} 件</dd></div><div><dt>取整多出预计良品</dt><dd>${numeric(r.overproduction_expected)} 件</dd></div><div><dt>良品产速</dt><dd>${numeric(r.good_rate_per_hour)} 件/h</dd></div></dl></details><details class="manufacturing-result-boundaries"><summary>费率证据与计算口径</summary><p>来源：${esc(r.inputs?.rate_source || '未记录')}</p><p>首版未自动剥离税额；含税与未知税口径的结果不能称为净税MVA。</p>${warnings.length ? bullets(warnings) : ''}<p>${esc(r.notice || data.knowledge.calculation_notice || '仅单工序的人工申报参考；不代表工厂正式报价或完整整灯成本。')}</p></details></div>`;
  }
  function historyView() {
    const rows = records();
    return `<section class="panel manufacturing-history"><div class="panel-header"><div><h3>本项目已保存估算</h3><p>回填保存时输入，重新计算后再保存</p></div>${tag(rows.length+' 条本机记录')}</div>${rows.length ? `<div class="table-scroll"><table><thead><tr><th>名称 / 工序</th><th>费率日期 / 税口径</th><th>每灯加工及独立模具小计</th><th>操作</th></tr></thead><tbody>${rows.map(row=>`<tr><td><strong>${esc(row.name)}</strong><small>${esc(row.process_name || row.result?.process_name || data.knowledge.processes.find(p=>p.id === row.inputs?.process_id)?.name || row.inputs?.process_id || '')}</small></td><td>${esc(row.asofbasis?.rate_date || row.inputs?.rate_date || '未记录')}<small>${esc(taxes[row.asofbasis?.tax_basis || row.inputs?.tax_basis] || '待确认')}</small></td><td class="number">${amount(row.result?.unit?.conversion_per_lamp)}</td><td>${button('load-estimate','回填',`data-id="${esc(row.id)}"`,'button-link')}</td></tr>`).join('')}</tbody></table></div>` : '<div class="manufacturing-empty">尚未保存本项目的真实条件估算；没有写入示例价格。</div>'}</section>`;
  }
  function definitionView() {
    const definitions = data.knowledge.mva_definitions || [];
    if(!definitions.length)return '';
    return `<details class="manufacturing-definitions"><summary>MVA核算口径 · 加工增值成本（用户已确认）</summary><div>${definitions.map(d=>`<section><strong>${esc(d.name)}</strong><p>${esc(d.formula)}</p><small>${esc(d.boundary)}${d.status === 'definition_only' ? ' 本版仅展示定义，未计算此口径。' : ''}</small></section>`).join('')}</div></details>`;
  }
  function view() {
    const p = process();
    const count = data.knowledge.processes.length;
    const knowledge = data.workspace === 'knowledge';
    const title = data.hosted ? knowledge ? '制造工艺知识' : '工艺加工测算' : '工艺知识与加工成本';
    const subtitle = knowledge ? '查阅成形、表面处理与电子装配原理，核对制造条件及原始来源。' : '按人工、设备、能耗等制造费用测算单工序MVA；材料、独立模具和委外单列。';
    const context = knowledge ? `${num(count)} 个工艺参考 · 工厂条件待补` : `${num(records().length)} 条本项目估算 · ${data.projectId ? esc(current()?.id === data.projectId ? current()?.name || '当前项目' : data.projectId) : '请选择项目后保存'}`;
    const controls = data.hosted ? '' : `<div class="manufacturing-tabs">${button('workspace',icon('Layers')+'工艺知识',`data-workspace="knowledge" aria-pressed="${knowledge}"`,'manufacturing-tab'+(knowledge ? ' selected' : ''))}${button('workspace',icon('Calculator')+'加工成本测算',`data-workspace="cost" aria-pressed="${!knowledge}"`,'manufacturing-tab'+(!knowledge ? ' selected' : ''))}</div>`;
    const sampleAction = !knowledge && data.projectId && data.knowledge.processes.some(p=>p.id === 'injection_moulding') ? button('fill-example',data.loadingSample ? '正在读取示例条件…' : '填入示例注塑条件',data.loadingSample || data.calculating || data.saving ? 'disabled' : '') : '';
    const actions = sampleAction+(knowledge ? '' : button('workspace',icon('Layers')+'查看工艺知识','data-workspace="knowledge"'))+button('upload',icon('Upload')+'上传工艺资料');
    const notice = knowledge ? data.knowledge.notice || '工艺原理参考，工厂费率及实际条件待补。' : 'MVA＝加工增值成本（元/良品件） · 按实际费率计算 · 材料与独立模具单列 · 仍需完整工艺路线';
    return heading(title,subtitle,actions)+`<div class="manufacturing-toolbar ${data.hosted ? 'hosted' : ''}">${controls}<span>${context}</span></div><div class="manufacturing-notice">${icon('Info')}<span>${esc(notice)}</span></div>${data.error ? `<div class="manufacturing-error" role="status">${esc(data.error)} ${button('reload','重读本机资料','','button button-small')}</div>` : ''}<div class="manufacturing-shell" data-workspace="${data.workspace}"><aside class="manufacturing-sidebar"><label class="manufacturing-search">${icon('Search')}<input id="manufacturing-query" value="${esc(data.query)}" placeholder="搜索工艺或应用" aria-label="搜索工艺或应用"></label><div id="manufacturing-process-list">${listView()}</div></aside><div class="manufacturing-main">${knowledge ? knowledgeView() : p ? `<div class="manufacturing-cost-layout">${formView()}<aside class="panel manufacturing-result-panel"><div class="panel-header"><h3>计算结果</h3>${tag('CNY · 单工序')}</div><div id="manufacturing-result">${resultView()}</div></aside></div><div id="manufacturing-history">${historyView()}</div><details class="manufacturing-route-note"><summary>完整路线与MVA核算边界</summary><p>下游报废会损失已完成的前序加工和材料。不能把各单工序每良品费用直接相加当作整灯成本；产能、物料转换、累计良率与外购服务边界需逐序核对。</p></details>` : '<div class="manufacturing-empty">没有可计算的工艺。</div>'}${definitionView()}</div></div>`;
  }
  async function calculate() {
    if(data.calculating || data.saving || data.loadingSample)return;
    remember();
    let body;
    const submitted = {...draft()}, context = key();
    try {body = payload(submitted);}catch(error){toast(error.message,true);return;}
    data.calculating = true;paintResults();
    try {
      const result = await api('/api/manufacturing/calculate','POST',body);
      data.results[context] = {result,signature:signature(submitted)};
      toast(context === key() && signature(draft()) === signature(submitted) ? '单工序计算已完成；结果未写入BOM' : '已计算提交时的条件；当前草稿保留，请按当前输入重算');
    }catch(error){if(data.results[context])data.results[context].error=error.message;toast(error.message,true);}
    finally {data.calculating=false;paintResults();}
  }
  async function save() {
    remember();
    if(!canSave()){toast('请选择项目、填写估算名称并按当前输入重新计算后保存',true);return;}
    const pid=data.projectId,context=key(),submitted={...draft()};
    let body;
    try {body={...payload(submitted),name:submitted.name.trim()};}catch(error){toast(error.message,true);return;}
    data.saving=true;paintResults();
    try {
      const saved = await api(`/api/projects/${encodeURIComponent(pid)}/manufacturing/estimates`,'POST',body);
      if(saved.project && typeof saveProject === 'function')saveProject(saved.project);
      const {project:updatedProject,...record} = saved;
      const rows = data.estimates[pid] || (data.estimates[pid]=[]), index=rows.findIndex(row=>row.id === saved.id);
      if(index < 0)rows.unshift(record);else rows[index]=record;
      toast(context === key() && signature(draft()) === signature(submitted) ? '本项目单工序估算已保存' : '提交时的估算已保存；后来输入的草稿已保留');
    }catch(error){toast(error.message,true);}
    finally {data.saving=false;paintResults();}
  }
  function loadEstimate(id) {
    const row=records().find(item=>item.id === id);
    if(!row || !data.knowledge.processes.some(p=>p.id === row.inputs?.process_id))return;
    cancelSample();
    refillInputs(row.inputs,row.name);
    paint();
  }
  function refillInputs(inputs,name) {
    data.processId=inputs.process_id;
    const d=draft();
    for(const field of fields)d[field]='';
    Object.assign(d,{qty_per_lamp:'1',rate_mode:'itemized',tax_basis:'unknown',materials_enabled:false});
    for(const field of fields)if(Object.hasOwn(inputs,field))d[field] = inputs[field] == null ? '' : String(inputs[field]);
    for(const field of ['availability_performance','yield_rate'])if(finite(inputs[field]))d[field]=String(Number((inputs[field]*100).toFixed(8)));
    d.name=name || '';
    if(!d.rate_mode)d.rate_mode='itemized';
    d.materials_enabled=inputs.material_price_per_kg != null && inputs.gross_material_g_per_input_piece != null;
    data.workspace='cost';
    delete data.results[key()];
  }
  async function fillExample() {
    if(!data.projectId || !present() || data.workspace !== 'cost' || data.loadingSample || data.calculating || data.saving)return;
    remember();
    const pid=data.projectId,epoch=data.loadEpoch,context=key(),before=signature(draft()),token=++data.sampleEpoch;
    data.loadingSample=true;paintResults();
    try {
      const inputs=await api('/api/competition/samples/mva-injection');
      if(token !== data.sampleEpoch || pid !== data.projectId || epoch !== data.loadEpoch || context !== key() || !present() || data.workspace !== 'cost')return;
      remember();
      if(signature(draft()) !== before)return;
      if(!inputs || typeof inputs !== 'object' || Array.isArray(inputs) || inputs.process_id !== 'injection_moulding' || inputs.mode !== 'cycle' || inputs.rate_mode !== 'itemized' || !data.knowledge.processes.some(p=>p.id === inputs.process_id && p.allowed_modes?.includes(inputs.mode)))throw new Error('示例注塑参数结构不完整，保留当前草稿');
      refillInputs(inputs,String(inputs.name || '').includes('模拟数据') ? inputs.name : '模拟数据 · 注塑条件演练');
      paint();
      toast('已填入示例注塑条件；请确认后计算，再保存本项目估算。费率不代表工厂条件');
    }catch(error){if(token === data.sampleEpoch && pid === data.projectId && epoch === data.loadEpoch && context === key() && present())toast(error.message,true);}
    finally {if(token === data.sampleEpoch){data.loadingSample=false;paintResults();}}
  }
  document.addEventListener('click',async event=>{
    const b=event.target.closest('[data-manufacturing-action]');
    if(!b)return;
    remember();
    const action=b.dataset.manufacturingAction;
    if(action === 'workspace')switchWorkspace(b.dataset.workspace);
    else if(action === 'process' && data.knowledge.processes.some(p=>p.id === b.dataset.id)){cancelSample();data.processId=b.dataset.id;draft();paint();}
    else if(action === 'reload'){await load(data.projectId);paint();}
    else if(action === 'save')await save();
    else if(action === 'load-estimate')loadEstimate(b.dataset.id);
    else if(action === 'fill-example')await fillExample();
    else if(action === 'upload'){if(typeof state === 'object'){state.knowledgeCountry='ALL';state.knowledgeQuery='';state.uploadCategory='ALL';}navigate('knowledge');}
  });
  document.addEventListener('input',event=>{
    if(event.target.id === 'manufacturing-query'){data.query=event.target.value;const list=$('#manufacturing-process-list');if(list){list.innerHTML=listView();hydrate(list);}return;}
    if(event.target.closest('#manufacturing-form')){cancelSample();remember();paintResults();}
  });
  document.addEventListener('change',event=>{
    if(!event.target.closest('#manufacturing-form'))return;
    cancelSample();
    remember();
    if(['mode','rate_mode','materials_enabled'].includes(event.target.name))paint();else paintResults();
  });
  document.addEventListener('submit',async event=>{if(event.target.id !== 'manufacturing-form')return;event.preventDefault();await calculate();});
  function afterRender(){data.active=true;hydrate($('#content'));}
  function stop(){remember();cancelSample();data.active=false;++data.loadEpoch;}
  return {data,load,view,afterRender,stop,setContext};
})();
