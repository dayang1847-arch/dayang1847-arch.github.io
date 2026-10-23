'use strict';

// Customer management and sourced research share the original customer records.
window.LumiCustomerManagement = (() => {
  let ctx = {}, bound = false, generation = 0, timer = null, busy = false, opener = null;
  const customers = new Map(), people = new Map();
  const list = v => Array.isArray(v) ? v : [];
  const esc = v => String(v ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const e = v => (ctx.esc || esc)(v);
  const split = v => String(v || '').split(/[,，;；、\n]/).map(v=>v.trim()).filter(Boolean);
  const date = value => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'medium',timeZone:'Asia/Shanghai'}).format(new Date(value)) : '尚未记录';
  const active = value => ['queued','running','retry_wait','awaiting_profile'].includes(value?.status);
  const canWrite = () => {
    const a = ctx.auth?.() || {};
    if (a.readonly || a.workspace_readonly) return false;
    if (a.mode === 'local') return a.can_manage === true;
    return a.mode === 'online' && a.user?.status === 'approved' && !a.user.must_change_password && !a.must_change_password && (Array.isArray(a.capabilities) ? a.capabilities.includes('customer_write') : ['admin','manager','sales'].includes(a.user?.role));
  };
  let S = {};
  const base = '/api/business/customer-management';
  const cp = (cid,suffix='') => '/api/business/customers/' + encodeURIComponent(cid) + (suffix ? '/' + suffix : '');
  const researchURL = (suffix='') => cp(S.customer?.id,'research') + (suffix ? '/' + suffix : '');
  const button = (action,title,attrs='',disabled=false,primary=false) => `<button type="button" class="button ${primary?'button-primary':''}" data-cm-action="${e(action)}" ${attrs} ${(busy&&action!=='close')||disabled?'disabled':''}>${e(title)}</button>`;
  const note = (text,kind='note') => `<p class="cm-${kind}" ${kind==='error'?'role="alert"':''}>${e(text)}</p>`;
  const input = (name,label,value='',extra='') => `<label>${e(label)}<input name="${e(name)}" value="${e(value)}" ${extra}></label>`;
  const area = (name,label,value='') => `<label class="cm-wide">${e(label)}<textarea name="${e(name)}" rows="3">${e(value)}</textarea></label>`;
  const selected = (a,b) => a===b?'selected':'';
  function safeURL(value) {try {const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
  const link = (url,title) => safeURL(url)?`<a href="${e(safeURL(url))}" target="_blank" rel="noopener noreferrer">${e(title || '查看来源')}</a>`:e(title || '来源网址待核对');
  const personKey = (cid,pid) => cid + '/' + pid;
  function remember(customer,rows=[]) {if(customer?.id) customers.set(customer.id,customer);for(const p of rows) if(p?.id)people.set(personKey(customer.id,p.id),p);}
  function rowActions(c) {
    remember(c);
    return `<div class="cm-row-actions" aria-label="${e(c.name)}管理"><div>${canWrite()?button('edit','编辑',`data-cid="${e(c.id)}"`)+button('target','定向',`data-cid="${e(c.id)}"`)+button('customer-research','AI 预调研',`data-cid="${e(c.id)}"`)+button('archive','删除',`data-cid="${e(c.id)}"`):button('target','开发方向',`data-cid="${e(c.id)}"`)+button('customer-history','研究历史',`data-cid="${e(c.id)}"`)}</div>${c.targeting?.priority==='high'?'<small class="cm-priority">优先开发</small>':''}</div>`;
  }
  function directoryActions(rows) {
    list(rows).forEach(c=>remember(c));
    return `<div class="cm-directory-actions">${button('duplicates','AI 客户重合分析')}${button('archived','已删除客户')}<small>管理同一份客户档案；重合提示需人工确认。</small></div>`;
  }
  function peopleActions(c,rows) {
    remember(c,rows);
    const ids=list(rows).map(p=>p.id).join(',');
    return `<div class="cm-people-tools">${button('verify-batch','AI 一键核对',`data-cid="${e(c.id)}" data-pids="${e(ids)}"`,!canWrite()||!rows.length)}${button('customer-history','核对历史',`data-cid="${e(c.id)}"`)}<small>先读取本人领英档案，再由 DeepSeek 比较；保留原文、时间和历史。</small></div>`;
  }
  function personActions(c,p) {
    remember(c,[p]);
    return `<div class="cm-person-actions">${button('verify-person','AI 核对',`data-cid="${e(c.id)}" data-pid="${e(p.id)}"`,!canWrite())}${button('person-history','核对历史',`data-cid="${e(c.id)}" data-pid="${e(p.id)}"`)}</div>`;
  }
  async function api(url,method='GET',body) {
    const own=generation,result=await ctx.api(url,method,body);
    if(own!==generation || !document.getElementById('customer-management-dialog'))throw Object.assign(new Error('管理页面已切换'),{stale:true});
    return result;
  }
  async function notify(cid) {
    document.dispatchEvent(new CustomEvent('lumipilot:customer-changed',{detail:{customerId:cid}}));
  }
  function close() {
    ++generation;clearTimeout(timer);timer=null;busy=false;S={};
    const dialog=document.getElementById('customer-management-dialog');
    if(dialog){if(dialog.open)dialog.close();dialog.remove();}
    if(opener?.isConnected)opener.focus?.();opener=null;
  }
  function show(mode,cid='',pid='') {
    close();opener=document.activeElement;
    S={mode,customer:customers.get(cid),person:people.get(personKey(cid,pid)),error:'',notice:'',loading:true,connection:null,task:null,history:[],checks:new Set(),batch:[],batchSelection:new Set(),batchTasks:[],archived:[],analyses:[],analysis:null};
    const dialog=document.createElement('dialog');dialog.id='customer-management-dialog';dialog.className='dialog cm-dialog';dialog.setAttribute('aria-labelledby','cm-title');
    dialog.addEventListener('cancel',event=>{event.preventDefault();close();});document.body.append(dialog);paint();dialog.showModal();
  }
  async function execute(operation) {
    if(busy)return;const own=generation;busy=true;S.error='';paint();
    try{await operation();}catch(error){if(!error.stale&&own===generation)S.error=error.message || '操作未完成，请重试。';}
    finally{if(own===generation){busy=false;paint();schedule();}}
  }
  function titles() {return {edit:'编辑客户',target:'客户定向与负责人',archive:'删除客户（可恢复）',archived:'已删除客户',duplicates:'AI 客户重合分析','customer-research':'AI 客户预调研','verify-person':'读取领英并 AI 核对','verify-batch':'批量核对关键人物','person-history':'人物核对历史','customer-history':'客户研究与核对历史'}[S.mode] || '客户管理';}
  function fields() {
    const original=S.customer || {},d=S.draft || {},c=d.id==='cm-edit'?{...original,...d,operating_countries:split(d.operating_countries),linkedin_search_countries:split(d.linkedin_search_countries)}:original;
    if(S.mode==='edit')return `<form id="cm-edit"><fieldset ${busy||!canWrite()?'disabled':''}><div class="cm-fields">${input('name','客户名称',c.name,'required maxlength="200"')}${input('website','官网',c.website,'type="url"')}${input('owner','销售负责人',c.owner)}${input('group_company','所属集团',c.group_company)}${input('headquarters_country','总部国家代码',c.headquarters_country,'maxlength="2"')}${input('operating_countries','经营国家（可多选）',list(c.operating_countries).join(', '),'placeholder="例如 NL, US, GB"')}${input('linkedin_search_countries','领英检索国家（可多选）',list(c.linkedin_search_countries ?? c.operating_countries).join(', '),'placeholder="例如 AU, GB"')}${area('focus','客户重点与身份依据',c.focus)}<label class="cm-check"><input type="checkbox" name="followed" ${c.followed?'checked':''}>领导关注</label></div><p class="cm-note">修改国家不会自动标记为已核实；总部、经营国家和开发目标分别记录。</p><button class="button button-primary" type="submit">保存客户</button></fieldset></form>`;
    const t=d.id==='cm-target'?{...c.targeting,...d,countries:split(d.countries),product_directions:split(d.product_directions)}:c.targeting || {};const targetOwner=d.id==='cm-target'?d.owner:c.owner;
    if(S.mode==='target')return `<form id="cm-target"><fieldset ${busy||!canWrite()?'disabled':''}><div class="cm-fields">${input('owner','销售负责人',targetOwner)}<label>开发优先级<select name="priority">${[['high','优先开发'],['normal','正常跟进'],['low','暂缓跟进']].map(([v,l])=>`<option value="${v}" ${selected(t.priority||'normal',v)}>${l}</option>`).join('')}</select></label>${input('countries','目标国家（可多选）',list(t.countries).join(', '),'placeholder="US, GB, DE"')}${input('product_directions','产品方向',list(t.product_directions).join('；'))}<div class="cm-wide"><span>目标渠道</span><div class="cm-checkboxes">${[['retail','零售'],['wholesale','批发'],['project','工程']].map(([v,l])=>`<label class="cm-check"><input type="checkbox" name="channels" value="${v}" ${list(t.channels).includes(v)?'checked':''}>${l}</label>`).join('')}</div></div>${area('notes','开发方向与沟通重点',t.notes)}</div><p class="cm-note">这是销售开发目标，不会写成客户已经营的国家、渠道或已确认需求。</p><button class="button button-primary" type="submit">保存定向与负责人</button></fieldset></form>`;
    return `<form id="cm-archive"><p>将「${e(c.name)}」移到已删除客户。档案、人物、来源和历史会保留，可在客户列表恢复。</p>${note('仍被机会、行动等业务对象引用时，系统会提示先处理关联；不会连带删除项目或原始资料。')}<fieldset ${busy||!canWrite()?'disabled':''}>${area('reason','删除原因（可选）',d.id==='cm-archive'?d.reason:'')}<button class="button cm-danger" type="submit">确认删除（可恢复）</button></fieldset></form>`;
  }
  const profileMode = task => task?.mode === 'linkedin_profile';
  const taskMode = task => profileMode(task) ? '本人领英档案' : '公开网页搜索';
  function sourcesView(task) {
    const sources=list(task?.sources);
    return `<details class="cm-sources"><summary>${profileMode(task)?'本次档案原文与读取时间':'公开来源与搜索记录'}（${sources.length}）</summary>${list(task?.searches).map(s=>`<p>${e(s.query || '')}<small>搜索于 ${e(date(s.searched_at || s.created_at))}</small></p>`).join('')}${sources.map(s=>`<article>${link(s.url,s.title || s.url)}<small>${s.retrieval_method==='linkedin_profile'?'本人档案读取于 '+e(date(s.observed_at)):'搜索于 '+e(date(s.searched_at))+' · 原文发布时间：'+e(date(s.published_at))}</small><p>${e(s.text || s.snippet || '')}</p><code>${e(s.id)}</code></article>`).join('') || '<p>本次尚未取得可核对的来源原文。</p>'}</details>`;
  }
  function profileView(task) {
    if(!profileMode(task))return '';
    const r=task.profile_read || {},phase=r.status,paused=['needs_login','needs_attention'].includes(phase),running=task.status==='awaiting_profile';
    const status={waiting_helper:'等待支持人物核对的 Edge 助手',queued:'等待读取',running:'正在读取本人职业资料',needs_login:'需要在 Edge 登录 LinkedIn',needs_attention:'需要处理档案页面',resume_requested:'已请求继续读取',cancel_requested:'正在取消读取',completed:'本人档案已读取',failed:'档案未读成',cancelled:'读取已取消'}[phase] || '等待读取';
    const connection=S.connection;
    let connectionNote='';
    if(running&&connection){
      if(!connection.connected)connectionNote=note('Edge 连接未就绪。打开连接页并保持 Edge 与本机服务运行，任务将等待连接。','warning');
      else if(!connection.capabilities?.profile_verification)connectionNote=note('当前助手 '+(connection.version||'旧版本')+' 尚不支持本人档案核对。请加载助手 0.1.7 或更新版本后，刷新 Edge 连接页。','warning');
    }
    return `<section class="cm-profile-read" aria-label="本人档案读取进度"><h4>${e(status)}</h4><p>${link(r.profile_url,'打开本次绑定的本人 LinkedIn 档案')}</p><p class="cm-time">请求于 ${e(date(r.requested_at))}${task.profile_capture?.observed_at?' · 实际读取于 '+e(date(task.profile_capture.observed_at)):''}</p>${r.message?note(r.message,paused?'warning':'note'):''}${connectionNote}${running?`<div class="cm-actions">${button('open-profile-connection','打开 Edge 连接页','',!canWrite())}${paused?button('resume-profile','处理后继续读取',`data-id="${e(task.id)}"`,!canWrite(),true):''}${button('cancel-profile','取消本次核对',`data-id="${e(task.id)}"`,!canWrite())}</div>`:''}<p class="cm-note">只读取本次绑定的本人档案。未加载或未展示的内容保留待核实，不据此认定离职；公开网页搜索需单独发起。</p></section>`;
  }
  function citedItems(items,task) {
    return list(items).map(item=>`<li>${e(typeof item==='string'?item:item.text || item.summary || '')}${list(item.citation_ids).length?`<small>依据 ${list(item.citation_ids).map(id=>{const source=list(task.sources).find(s=>s.id===id);return source?link(source.url,source.title || id):e(id);}).join(' · ')}</small>`:''}</li>`).join('');
  }
  function researchState(task) {
    if(task.status==='completed'&&task.kind==='person'&&task.source_screening?.status==='no_person_evidence')return '搜索完成 · 本人证据不足';
    return {awaiting_profile:'等待读取本人领英档案',queued:profileMode(task)?'本人档案已读取 · 等待 AI 比较':'等待联网搜索',running:profileMode(task)?'DeepSeek 正在比较新旧资料':'正在搜索与核对',completed:'核对完成',failed:'未完成',interrupted:'已中断',cancelled:'已取消'}[task.status] || '状态待核对';
  }
  function screeningView(task) {
    const s=task.source_screening;if(profileMode(task))return '';if(!s||task.kind!=='person')return task.error?.code==='citation'?note('搜索已返回，但本次模型引用未通过核对，人物档案没有因此更新。这不表示 API 密钥失效；可再次核对，旧记录仍会保留。','warning'):'';
    const count=v=>Number.isSafeInteger(v)&&v>=0?v:'未记录';
    return `<section class="cm-source-screening" aria-label="人物来源筛选"><h4>人物来源筛选</h4><p>搜索取得 ${e(count(s.total_sources))} 条网页 · 本人相关线索 ${e(count(s.relevant_sources))} 条 · 排除公司背景或其他人物 ${e(count(s.excluded_sources))} 条。</p>${s.analysis_skipped?note('未找到可对应本人完整姓名或档案链接的公开资料，已跳过模型分析。不会据公司介绍或部分同名人物补齐职位、国家或任职。','warning'):`<p>模型仅使用 ${e(count(s.model_sources))} 条本人相关来源；同名身份和具体字段仍需逐项核对引用。</p>`}<p class="cm-note">全部搜索原件与时间保留在下方；搜索完成不等于确认本人，也不证明人物不存在或已离职。</p></section>`;
  }
  function taskView(task) {
    if(!task)return note('还没有核对记录。读取本人领英档案后，DeepSeek 会对照原资料提出建议，并保存独立历史。');
    const r=task.result || {},proposals=r.proposals || {},canEditTask=!!S.person&&S.person.id===task.person_id&&S.mode!=='verify-batch',labels={title:'职务',location_text:'工作所在地',employment_status:'任职状态'},state=researchState(task);
    return `<article class="cm-research-result"><div class="cm-result-heading"><strong>${e(state)}</strong><span>${e(taskMode(task))}${task.model?' · '+e(task.model):''}</span></div><p class="cm-time">创建于 ${e(date(task.created_at))} · 核对于 ${e(date(task.checked_at))}</p>${active(task)?note('任务由本机服务执行。关闭此面板后可从核对历史继续查看。'):''}${profileView(task)}${task.error?note(task.error.message || task.error.notice || '本次未完成，未据此修改档案。','error'):''}${task.input_stale?note('人物、客户资料或核对规则已更新，旧结果保留供追溯，不能直接采纳。','warning'):''}${screeningView(task)}${r.summary?`<p>${e(r.summary)}</p>`:''}${r.identity_status?note('身份匹配：'+({matched:'公开依据匹配，仍需人工核对',ambiguous:'存在同名或身份歧义',mismatch:'与原人物存在冲突',unknown:'证据不足'}[r.identity_status] || '待核实')):''}${['findings','countries','channels','products','key_roles','opportunities'].filter(k=>list(r[k]).length).map(k=>`<section><h4>${{findings:'检索发现',countries:'国家与市场线索',channels:'渠道线索',products:'产品线索',key_roles:'应寻找的岗位',opportunities:'机会与下一步'}[k]}</h4><ul>${citedItems(r[k],task)}</ul></section>`).join('')}${list(r.conflicts).length?`<section class="cm-warning"><h4>需要核对的冲突</h4><ul>${citedItems(r.conflicts,task)}</ul></section>`:''}${list(r.gaps).length?`<section><h4>待补证据</h4><ul>${list(r.gaps).map(g=>`<li>${e(g)}</li>`).join('')}</ul></section>`:''}${list(r.comparison).length?`<section class="cm-comparison"><h4>与原档案比较</h4>${r.comparison.map(c=>`<p><strong>${e(labels[c.field] || c.field)}</strong>：原记录 ${e(c.before || '未记录')} → 本次建议 ${e(c.proposed === 'current'?'现任':c.proposed === 'past'?'曾任 / 已离职':c.proposed || '待核实')}<small> · ${c.changed?'有变化，需核对':'与原记录一致'}</small></p>`).join('')}</section>`:''}${Object.keys(proposals).length?`<section class="cm-proposals"><h4>字段修订建议</h4>${Object.entries(proposals).filter(([key])=>labels[key]).map(([key,p])=>`<label class="cm-check"><input type="checkbox" data-cm-field="${e(key)}" ${S.checks.has(key)?'checked':''} ${!canEditTask||busy||task.status!=='completed'||task.input_stale||task.can_adopt===false||!canWrite()?'disabled':''}><span><strong>${labels[key]}</strong> ${e(p.value === 'current'?'现任':p.value === 'past'?'曾任 / 已离职':p.value === 'unknown'?'待核实':p.value)}<small>依据：${list(p.citation_ids).map(id=>e(id)).join('、') || '待核对'}</small></span></label>`).join('')}${canEditTask?button('adopt','将勾选建议保存到人物档案','',!canWrite()||!S.checks.size||task.status!=='completed'||task.input_stale||task.can_adopt===false,true):button('open-person-result','打开该人物核对',`data-id="${e(task.id)}" data-pid="${e(task.person_id)}"`)}<p class="cm-note">明确勾选后才更新人物；核对记录和原始来源会保留，不自动建立上下级或决策权关系。</p></section>`:''}${sourcesView(task)}${list(task.adoptions).length?`<details><summary>采纳历史（${task.adoptions.length}）</summary>${task.adoptions.map(a=>`<p>${e(date(a.adopted_at || a.created_at))} · ${e(list(a.fields).join('、') || '已记录修订')}</p>`).join('')}</details>`:''}</article>`;
  }
  function researchView() {
    const isPerson=S.mode==='verify-person'||S.mode==='person-history';
    return `<div class="cm-research-actions">${button(isPerson?'start-person':'start-customer',isPerson?'读取领英并 AI 核对':'开始 AI 预调研','',!canWrite()||active(S.task),true)}${isPerson?button('start-person-web','仅搜索公开网页（补充）','',!canWrite()||active(S.task)):''}${button('refresh-history','刷新历史')}</div>${note(isPerson?'默认由 Edge 读取已保存的本人 LinkedIn 档案，再由 DeepSeek 比较新旧职业资料。只使用本次读取原文作为新证据；明确采纳后才修改人物。公开网页搜索是独立补充，不会代替本人档案读取。':'通过 DeepSeek 官方搜索接口检索公开网页，再由模型依据来源分析。网页可能过时或存在同名；核对完成不等于独立身份认证。')}${taskView(S.task)}${S.history.length?`<details class="cm-history" open><summary>历次记录（${S.history.length}）</summary>${S.history.map(t=>`<button class="cm-history-row" type="button" data-cm-action="history-open" data-id="${e(t.id)}"><span>${e(t.kind==='person'?(people.get(personKey(t.customer_id,t.person_id))?.name || '人物核对'):'客户预调研')} · ${e(taskMode(t))} · ${e(researchState(t))}</span><small>${e(date(t.checked_at || t.created_at))} →</small></button>`).join('')}</details>`:''}`;
  }
  function batchView() {
    return `${note('选择当前筛选范围内的人物；每批最多核对 5 人，由 Edge 依次读取各自已保存的领英档案，再由 DeepSeek 比较，逐人保存来源和历史。不会自动修改人物档案。')}<div class="cm-batch-list">${S.batch.map(p=>`<label class="cm-check"><input type="checkbox" data-cm-batch="${e(p.id)}" ${S.batchSelection.has(p.id)?'checked':''} ${busy?'disabled':''}><span><strong>${e(p.name)}</strong><small>${e(p.title || '职位待核实')}</small></span></label>`).join('')}</div>${button('start-batch','核对选中人物（'+S.batchSelection.size+'）','',!canWrite()||!S.batchSelection.size||S.batchSelection.size>5,true)}${S.batchTasks.map(t=>`<section><h4>${e(people.get(personKey(S.customer.id,t.person_id))?.name || '人物核对')}</h4>${taskView(t)}</section>`).join('')}`;
  }
  function duplicatesView() {
    const a=S.analysis;
    const assessment=v=>({possible_duplicate:'可能重复，待核对',likely_duplicate:'重合较高，待人工确认',distinct:'不同客户',related_entities:'关联公司，保持独立',insufficient_evidence:'证据不足，保留独立档案',same_entity:'疑似同一主体，须核对'}[v]||'待核对');
    return `${note('比较名称、官网与公司标识，给出可能重合及身份冲突。相似不是同一法律主体；系统不会自动合并、删除或迁移记录。')}${button('start-duplicates',a?'重新分析当前客户':'开始 AI 重合分析','',!canWrite()||active(a),true)}${a?`<p class="cm-time">分析于 ${e(date(a.finished_at || a.updated_at || a.created_at))} · ${e({queued:'等待分析',running:'正在分析',completed:'已完成',failed:'未完成'}[a.status]||a.status)} · ${e(a.model||'规则筛选')}</p>${active(a)?note('已核对 '+(a.completed_count||0)+' / '+(a.total_count||0)+' 组；限定最多50家客户、20组候选，不会合并资料。'):''}${a.engine!=='cloud_model'||a.ai_status!=='ok'?note(a.error?.message||'当前仅有规则筛选提示，尚未完成 AI 核对，不作为同一客户的确认依据。','warning'):''}${a.error&&a.engine==='cloud_model'?note(a.error.message||'部分模型分析未完成','error'):''}${a.truncated_count?note('另有 '+a.truncated_count+' 家客户不在本次50家范围内，请调整范围后再研究。'):''}${a.input_stale?note('客户资料已变化，以下是历史提示，请重新分析。','warning'):''}${list(a.pairs).map(p=>{
      const ids=list(p.customer_ids),ai=p.ai||{};
      return `<article class="cm-overlap"><h4>${ids.map((id,i)=>e(customers.get(id)?.name||list(p.customer_names)[i]||id)).join(' ↔ ')}</h4><p><strong>${e(assessment(ai.assessment||p.assessment))}</strong> · 规则重合度 ${typeof p.overlap_score==='number'?Math.round(p.overlap_score*100)+'%':'待计算'}</p>${ai.reason?`<p>${e(ai.reason)}</p>`:''}${list(p.reasons).length?`<ul>${list(p.reasons).map(x=>`<li>${e(typeof x==='string'?x:x.text||x.reason||'')}</li>`).join('')}</ul>`:''}${list(p.conflicts).length||list(ai.conflicts).length?note('冲突：'+[...list(p.conflicts),...list(ai.conflicts)].map(x=>typeof x==='string'?x:x.text).join('；'),'warning'):''}${list(ai.questions||p.questions).length?`<p>待核对：${e(list(ai.questions||p.questions).join('；'))}</p>`:''}<details><summary>查看比较依据</summary>${list(a.citations).filter(c=>list(p.citation_ids).includes(c.id)).map(c=>`<p><strong>${e(c.title||c.id)}</strong></p><p>${e(c.text||'')}</p>`).join('')}</details><div class="cm-actions">${ids.map(id=>`<a class="button" href="#customers/${e(id)}/overview">打开 ${e(customers.get(id)?.name||'客户')}</a>`).join('')}</div><small>仅给出合并提示，档案保持独立。</small></article>`;
    }).join('')||(active(a)?note('正在比较现有客户，结果保存后显示。'):note('本次未发现足够依据的重合候选。'))}`:''}${S.analyses.length?`<details class="cm-history"><summary>分析历史（${S.analyses.length}）</summary>${S.analyses.map(a=>button('duplicate-open',date(a.finished_at||a.created_at),`data-id="${e(a.id)}"`)).join('')}</details>`:''}`;
  }
  function archivedView() {
    return `${note('已删除客户仍保留原人物、来源及历史。恢复不会自动重启采集或订阅任务。')}${S.archived.map(c=>`<article class="cm-archived-row"><div><strong>${e(c.name)}</strong><small>删除于 ${e(date(c.deleted_at))}</small></div>${button('restore','恢复客户',`data-cid="${e(c.id)}" data-version="${Number(c.version)}"`,!canWrite())}</article>`).join('') || '<p class="cm-empty">没有已删除客户。</p>'}`;
  }
  function paint() {
    const dialog=document.getElementById('customer-management-dialog');if(!dialog)return;
    dialog.innerHTML=`<header class="cm-header"><div><p>LUMIPILOT · 客户管理</p><h2 id="cm-title">${e(titles())}</h2>${S.customer?`<small>${e(S.customer.name)}${S.person?' / '+e(S.person.name):''}</small>`:''}</div>${button('close','关闭','aria-label="关闭客户管理"')}</header><div class="cm-body" aria-busy="${busy}">${S.error?note(S.error,'error'):''}${S.notice?note(S.notice,'success'):''}${S.loading?'<p class="cm-empty">正在读取档案与历史…</p>':['edit','target','archive'].includes(S.mode)?fields():S.mode==='archived'?archivedView():S.mode==='duplicates'?duplicatesView():S.mode==='verify-batch'?batchView():researchView()}</div>`;
  }
  async function history() {
    const url=researchURL()+(S.person?'?person_id='+encodeURIComponent(S.person.id):'');
    const r=await api(url);S.history=list(r.research);if(!S.task)S.task=S.history[0] || null;
  }
  async function connectionStatus() {
    try {S.connection=await api('/api/linkedin-connector/status');} catch(error) {if(error.stale)throw error;S.connection=null;}
  }
  async function startResearch(kind,pid,mode='linkedin_profile') {
    if(!canWrite())throw new Error('人物核对与客户预调研由销售或管理者发起。');
    const r=await api(researchURL(),'POST',{kind,...(pid?{person_id:pid,mode}:{}),force:true});S.task=r.research;S.checks.clear();await history();if(profileMode(S.task))await connectionStatus();
  }
  async function openAction(mode,cid,pid,pids) {
    show(mode,cid,pid);
    await execute(async()=>{
      if(mode==='archived'){S.archived=list((await api(base+'/archived')).customers);S.archived.forEach(c=>remember(c));}
      else if(mode==='duplicates'){const r=await api(base+'/duplicates');S.analyses=list(r.analyses);S.analysis=r.analysis || S.analyses[0] || null;}
      else {
        const detail=await api(cp(cid));S.customer=detail.customer;remember(detail.customer,detail.people);
        if(pid)S.person=list(detail.people).find(p=>p.id===pid);if(pid&&!S.person)throw new Error('此人物已不在当前客户档案，请刷新后重试。');
        if(mode==='verify-batch'){S.batch=list(pids).map(id=>people.get(personKey(cid,id))).filter(Boolean);S.batchSelection=new Set(S.batch.slice(0,5).map(p=>p.id));}
        else if(!['edit','target','archive'].includes(mode)){await history();if(mode==='verify-person')await startResearch('person',pid);else if(profileMode(S.task))await connectionStatus();}
      }
      S.loading=false;
    });
    if(S.loading){S.loading=false;paint();}
  }
  function schedule() {
    clearTimeout(timer);timer=null;
    if(!document.getElementById('customer-management-dialog')||busy)return;
    if(!active(S.task)&&!active(S.analysis)&&!S.batchTasks.some(active))return;
    const own=generation;
    timer=setTimeout(async()=>{
      timer=null;if(own!==generation)return;
      try {
        if(active(S.task)){S.task=(await api(researchURL(S.task.id))).research;await history();if(profileMode(S.task))await connectionStatus();}
        if(active(S.analysis))S.analysis=(await api(base+'/duplicates/'+encodeURIComponent(S.analysis.id))).analysis;
        for(let i=0;i<S.batchTasks.length;++i)if(active(S.batchTasks[i]))S.batchTasks[i]=(await api(researchURL(S.batchTasks[i].id))).research;
        if(own===generation){paint();schedule();}
      }catch(error){if(!error.stale&&own===generation){S.error=error.message;paint();}}
    },2000);
  }
  async function action(node) {
    const a=node.dataset.cmAction;
    if(a==='start-person'||a==='start-customer')await startResearch(a==='start-person'?'person':'customer',a==='start-person'?S.person?.id:null);
    else if(a==='start-person-web')await startResearch('person',S.person?.id,'web_search');
    else if(a==='open-profile-connection'){if(!canWrite())throw new Error('人物核对由销售或管理者发起。');const r=await api('/api/linkedin-connector/open','POST',{});await connectionStatus();S.notice=r.opened?'已打开 Edge 连接页，请保持该页运行。':'已有连接页，请在 Edge 刷新该页并检查助手版本。';}
    else if(a==='resume-profile'||a==='cancel-profile'){if(!canWrite())throw new Error('人物核对由销售或管理者发起。');const r=await api(researchURL(node.dataset.id)+'/profile-action','POST',{action:a==='resume-profile'?'resume':'cancel'});if(S.task?.id===node.dataset.id)S.task=r.research;const i=S.batchTasks.findIndex(t=>t.id===node.dataset.id);if(i>=0)S.batchTasks[i]=r.research;await history();}
    else if(a==='refresh-history'){await history();if(S.task)S.task=(await api(researchURL(S.task.id))).research;if(profileMode(S.task))await connectionStatus();}
    else if(a==='open-person-result'){S.mode='person-history';S.person=people.get(personKey(S.customer.id,node.dataset.pid));if(!S.person)throw new Error('人物已不在当前客户档案，请刷新后查看。');S.task=(await api(researchURL(node.dataset.id))).research;S.checks.clear();await history();}
    else if(a==='history-open'){S.task=(await api(researchURL(node.dataset.id))).research;S.checks.clear();if(profileMode(S.task))await connectionStatus();}
    else if(a==='start-duplicates'){if(!canWrite())throw new Error('当前部门仅可查看分析。');S.analysis=(await api(base+'/duplicates','POST',{refresh:!!S.analysis})).analysis;const r=await api(base+'/duplicates');S.analyses=list(r.analyses);}
    else if(a==='duplicate-open')S.analysis=(await api(base+'/duplicates/'+encodeURIComponent(node.dataset.id))).analysis;
    else if(a==='restore'){
      if(!canWrite())throw new Error('客户恢复由销售或管理者维护。');
      await api(base+'/customers/'+encodeURIComponent(node.dataset.cid)+'/restore','POST',{expected_version:Number(node.dataset.version)});
      S.archived=list((await api(base+'/archived')).customers);S.notice='客户已恢复；历史资料保留，采集任务没有自动重启。';await notify(node.dataset.cid);
    } else if(a==='adopt') {
      if(!canWrite()||!S.task||!S.checks.size||S.task.status!=='completed'||S.task.input_stale||S.task.can_adopt===false)throw new Error('请先核对本次建议与来源，再勾选要保存的字段。');
      const r=await api(researchURL(S.task.id)+'/adopt','POST',{input_hash:S.task.input_hash,expected_version:S.customer.version,fields:[...S.checks]});
      S.task=r.research;S.checks.clear();const d=await api(cp(S.customer.id));S.customer=d.customer;remember(d.customer,d.people);S.person=list(d.people).find(p=>p.id===S.person.id);await history();S.notice='已保存所选人物修订，核对与采纳历史均已保留。';await notify(S.customer.id);
    } else if(a==='start-batch') {
      if(!canWrite()||S.batchSelection.size<1||S.batchSelection.size>5)throw new Error('每批请选择1至5位人物。');
      for(const pid of S.batchSelection){const r=await api(researchURL(),'POST',{kind:'person',person_id:pid,mode:'linkedin_profile',force:true});const prior=S.batchTasks.findIndex(t=>t.person_id===pid);if(prior>=0)S.batchTasks[prior]=r.research;else S.batchTasks.push(r.research);}
      await connectionStatus();S.notice='已建立 '+S.batchTasks.length+' 位人物的核对任务；不会自动覆盖人物档案。';
    }
  }
  async function submit(form) {
    if(!canWrite())throw new Error('客户管理由销售或管理者维护。');
    const data=new FormData(form),v=Object.fromEntries(data),c=S.customer;
    if(form.id==='cm-edit') {
      const r=await api(cp(c.id),'POST',{expected_version:c.version,name:v.name,website:v.website,owner:v.owner,group_company:v.group_company,headquarters_country:v.headquarters_country.trim().toUpperCase(),operating_countries:split(v.operating_countries).map(x=>x.toUpperCase()),linkedin_search_countries:split(v.linkedin_search_countries).map(x=>x.toUpperCase()),focus:v.focus,followed:data.has('followed')});
      S.customer=r.customer;S.draft=null;remember(S.customer);S.notice='客户信息已保存。';await notify(c.id);
    } else if(form.id==='cm-target') {
      const r=await api(base+'/customers/'+encodeURIComponent(c.id)+'/targeting','POST',{expected_version:c.version,owner:v.owner,targeting:{countries:split(v.countries).map(x=>x.toUpperCase()),channels:data.getAll('channels'),product_directions:split(v.product_directions),priority:v.priority,notes:v.notes}});
      S.customer=r.customer;S.draft=null;remember(S.customer);S.notice='开发定向与负责人已保存，与已核实经营事实分开记录。';await notify(c.id);
    } else if(form.id==='cm-archive') {
      await api(base+'/customers/'+encodeURIComponent(c.id)+'/archive','POST',{expected_version:c.version,reason:v.reason});
      S.mode='archived';S.customer=null;S.draft=null;S.archived=list((await api(base+'/archived')).customers);S.archived.forEach(c=>remember(c));S.notice='客户已移到已删除客户，资料与历史保留，可恢复。';await notify(c.id);
    }
  }
  function init(context) {
    ctx=context || {};if(bound)return;bound=true;
    window.addEventListener('hashchange',close);
    document.addEventListener('click',event=>{
      const node=event.target.closest?.('[data-cm-action]');if(!node||node.disabled)return;event.preventDefault();
      const a=node.dataset.cmAction;if(a==='close'){close();return;}
      if(['edit','target','archive','archived','duplicates','customer-research','verify-person','verify-batch','person-history','customer-history'].includes(a)){void openAction(a,node.dataset.cid,node.dataset.pid,split(node.dataset.pids));return;}
      if(!document.getElementById('customer-management-dialog'))return;
      void execute(()=>action(node));
    });
    document.addEventListener('change',event=>{
      const el=event.target;if(!el.closest?.('#customer-management-dialog')||busy)return;
      if(el.dataset.cmField!==undefined){if(el.checked)S.checks.add(el.dataset.cmField);else S.checks.delete(el.dataset.cmField);paint();}
      if(el.dataset.cmBatch!==undefined){if(el.checked)S.batchSelection.add(el.dataset.cmBatch);else S.batchSelection.delete(el.dataset.cmBatch);paint();}
    });
    document.addEventListener('submit',event=>{if(!['cm-edit','cm-target','cm-archive'].includes(event.target.id))return;event.preventDefault();const f=new FormData(event.target);S.draft={id:event.target.id,...Object.fromEntries(f),channels:f.getAll('channels'),followed:f.has('followed')};void execute(()=>submit(event.target));});
  }
  return {init,rowActions,directoryActions,peopleActions,personActions,close};
})();
