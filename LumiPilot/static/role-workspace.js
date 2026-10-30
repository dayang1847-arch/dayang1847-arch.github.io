'use strict';

// Role-specific presentation only. Every operation is still authorized by the server.
window.LumiRoleWorkspace = (() => {
  const profiles = {
    manager: {label:'管理员 / 领导',short:'管理者',home:'workbench?view=intelligence',icon:'ClipboardCheck',title:'把客户机会与生产决策连起来',description:'销售找对人、做对产品；生产提高成本确定性、推动物料平台化和标准化。',primary:['leadership','decisions','customers','overview'],group:'全局管理',shortcuts:[['customers','重点客户','查看人物、产品与客户策略','Users'],['decisions','会审决策','审阅部门意见与方案取舍','ClipboardCheck'],['access','团队权限','分配职责，管理账户访问','Users']]},
    sales: {label:'销售',short:'销售',home:'workbench?view=intelligence',icon:'Users',title:'找对人，做对产品',description:'核实谁参与决策、通过什么关系接近、何时沟通；结合客户产品动作准备有依据的提案。',primary:['customers','overview','solution','market','decisions'],group:'销售工作',shortcuts:[['market','市场与渠道','整理竞品与客户机会','Search'],['projects','销售项目','维护客户需求与产品范围','Database'],['decisions','跨部门会审','提交业务判断，查看会审结论','ClipboardCheck']]},
    research: {label:'研发',short:'研发',home:'workbench?view=intelligence',icon:'Lightbulb',title:'优先复用，推动物料标准化',description:'申请新料先评估已有候选，存量物料逐步合并；研发验证适用范围，采购提供供应与成本依据。',primary:['material-selection','overview','solution','optical','bom','decisions'],group:'研发工作',shortcuts:[['projects','研发项目','查看产品要求与工程记录','Database'],['optical','光学验证','检查配光与光质量依据','ScanLine'],['cost?view=route','工艺与成本','维护制造路线与加工增值成本','Factory']]},
    procurement: {label:'采购',short:'采购',home:'workbench?view=intelligence',icon:'Factory',title:'提高成本确定性，集中采购需求',description:'核对原料行情与结算规则，比较采购行动对成本、利润、现金和库存的影响。',primary:['procurement','bom','materials','decisions','overview'],group:'采购工作',shortcuts:[['cost?view=procurement','采购报价','核对 BOM、报价与计价条件','Layers'],['materials','原料与物流','查看行情、材料与运费依据','TrendingUp'],['decisions','跨部门会审','说明供应商选择与采购条件','ClipboardCheck']]},
    viewer: {label:'只读查看',short:'只读',home:'workbench?view=intelligence',icon:'BookOpen',title:'查看团队进展与共享依据',description:'浏览客户动态、项目资料与已保存会审结果。',primary:['leadership','customers','overview','decisions','knowledge'],group:'共享工作',shortcuts:[['customers','客户资料','查看客户、人物与产品信息','Users'],['projects','项目资料','查看已保存方案与工程依据','Database'],['decisions','会审记录','了解各部门意见与决策','ClipboardCheck']]},
    member: {label:'待分配部门',short:'待分配',home:'workbench?view=intelligence',icon:'BookOpen',title:'共享资料已开放查看',description:'当前为只读权限；由管理员分配销售、研发或采购职责后，开放对应编辑功能。',primary:['leadership','customers','overview','decisions','knowledge'],group:'共享工作',shortcuts:[['customers','客户资料','查看客户与产品策略','Users'],['projects','项目资料','查看工程与采购依据','Database'],['access','我的账户','查看当前权限与登录信息','Users']]}
  };
  const defaults = {sales:['customer_write','project_sales_write','knowledge_write','review_write','ask'],research:['engineering_write','knowledge_write','review_write','ask'],procurement:['procurement_write','knowledge_write','review_write','ask']};
  let account = {}, ctx = {}, links = [], shared = null;
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const icon = name => ctx.icon?.(name) || '';
  const readonly = auth => auth?.readonly === true || auth?.workspace_readonly === true;
  function role(auth = account) {
    if(readonly(auth))return 'viewer';
    if(auth?.mode === 'local' && auth.can_manage === true)return 'manager';
    if(auth?.mode !== 'online' || auth.user?.status !== 'approved' || auth.user?.must_change_password)return 'viewer';
    const name = auth.user?.role;
    return ['admin','manager'].includes(name) ? 'manager' : Object.hasOwn(profiles,name) ? name : 'viewer';
  }
  function can(capability) {
    if(readonly(account))return false;
    if(account.mode === 'local')return account.can_manage === true;
    if(account.user?.status !== 'approved' || account.user?.must_change_password || ['viewer','member'].includes(role()))return false;
    if(Array.isArray(account.capabilities))return account.capabilities.includes(capability);
    return role() === 'manager' || (defaults[role()] || []).includes(capability);
  }
  const home = auth => profiles[role(auth)].home;
  function createGroup(label,items) {
    const group = document.createElement('div');group.className='role-nav-group';
    const title = document.createElement('div');title.className='nav-group-label';title.textContent=label;group.append(title);
    for(const page of items){const link=links.find(a=>a.dataset.page===page);if(link)group.append(link);}
    return group;
  }
  function setMenu(open) {
    const sidebar=document.querySelector('.sidebar'),toggle=document.querySelector('#role-menu-toggle');
    if(sidebar)sidebar.dataset.menuOpen=String(open);
    if(toggle){toggle.setAttribute('aria-expanded',String(open));toggle.setAttribute('aria-label',open?'收起工作导航':'展开工作导航');}
  }
  function navigation() {
    const profile=profiles[role()],nav=document.querySelector('#main-nav');if(!nav)return;
    if(!links.length)links=[...nav.querySelectorAll('a[data-page]')];
    nav.replaceChildren();nav.setAttribute('aria-label',profile.label+'工作导航');
    const primary=['workbench','customer-directory','rd-solutions','projects','supply'];
    nav.append(createGroup('工作导航',primary));
    shared=document.createElement('details');shared.className='role-shared-nav';
    const summary=document.createElement('summary');summary.innerHTML=`资料与设置<span class="chevron">${icon('ChevronDown')}</span>`;
    const content=document.createElement('div');content.className='role-shared-links';
    for(const page of ['knowledge','jobs']){const link=links.find(a=>a.dataset.page===page);if(link)content.append(link);}
    const support=createGroup('帮助与账户',['help','access']);support.classList.add('role-support-nav');
    content.append(support);shared.append(summary,content);nav.append(shared);
    const brand=document.querySelector('.brand');if(brand)brand.href='#'+profile.home;
    setMenu(false);
  }
  function context(route) {
    const aliases={'customer-directory':'customers','sales-management':'customers','research-management':'material-selection','procurement-management':'procurement',collaboration:'decisions'};
    const key=aliases[route.page]||route.page,r=role();
    if(r==='viewer'||r==='member')return {mode:'readonly',title:r==='member'?'待分配部门 · 当前只读':'共享资料 · 只读查看',note:readonly(account)?'当前分享提供已保存资料，业务编辑需进入完整工作台。':'可查看和下载共享资料；修改请联系负责部门或管理员。'};
    if(['help','access'].includes(key))return {mode:'edit',title:key==='help'?'操作说明':'账户与权限',note:key==='help'?'按当前页面查阅步骤、输出与使用范围。':r==='manager'?'管理团队账户与权限，部门成员共享查看、按职责编辑。':'权限由管理员分配，可在这里管理自己的登录信息。'};
    if(r==='manager')return {mode:can('account_manage')?'edit':'readonly',title:account.mode==='local'?'本机维护 · 全部权限':can('account_manage')?'全局管理 · 全部权限':'管理工作 · 按当前授权操作',note:account.mode==='local'?'本机工作台直接使用；部署在线版后，按登录账户分配部门权限。':can('account_manage')?'可维护各部门资料、确认会审结论并管理团队权限。':'当前可操作范围以服务端授权为准。'};
    if(key==='decisions')return {mode:can('review_write')?'review':'shared',title:can('review_write')?'部门协作 · 可提交会审意见':'共享查看 · 会审记录',note:'查看全部方案与部门意见，最终确认由管理员 / 领导完成。'};
    if(key==='leadership')return {mode:'shared',title:'共享查看 · 客户动态',note:'查看人员、产品变化与跟进事项；客户关注与情报由销售维护。'};
    if(['knowledge'].includes(key)||key==='manufacturing'&&route.workspace==='knowledge')return {mode:can('knowledge_write')?'edit':'shared',title:can('knowledge_write')?'共享知识 · 可补充资料':'共享查看 · 知识资料',note:can('knowledge_write')?'各部门均可上传依据与检索资料，客户和项目关联分别保留。':'可检索已保存资料，上传需相应授权。'};
    if(['projects','overview'].includes(key))return {mode:can('project_sales_write')||can('engineering_write')?'edit':'shared',title:'共享项目 · 按职责维护',note: r==='sales'?'维护客户需求与销售立项；工程记录由研发、采购报价由采购补充。':r==='research'?'维护工程要求与验证记录；客户与销售目标由销售补充。':'查看项目与工程方案；报价与采购条件在成本核算中维护。'};
    if(['cost','bom','manufacturing'].includes(key))return {mode:can('engineering_write')||can('procurement_write')?'edit':'shared',title: can('engineering_write')||can('procurement_write')?'成本协作 · 分工编辑':'共享查看 · 研发与采购维护',note:r==='research'?'研发维护 BOM、工艺与验证依据；采购维护供应报价与商务条件。':r==='procurement'?'采购维护报价与采购条件；BOM、工艺及工程验证由研发维护。':'可查看 BOM、供应报价与制造成本，修改由研发或采购完成。'};
    const owners={customers:['customer_write','销售','客户档案、人物、动态与策略由销售维护；各部门可补充资料、提问和提交会审意见。'],market:['customer_write','销售','市场线索与采集任务由销售维护；各部门共享查看来源依据。'],crawler:['customer_write','销售','公开采集任务由销售维护，模型与接口配置由管理员管理。'],'material-selection':['engineering_write','研发','研发维护料号、规格与复用验证；采购提供报价与供应依据。'],solution:['engineering_write','研发与销售','研发维护工程定义；销售维护产品范围与客户策略，操作按字段职责开放。'],optical:['engineering_write','研发','研发维护光度输入与计算；其他部门可查看已保存验证依据。'],procurement:['procurement_write','采购','供应商、采购记录、评价标准与结算条件由采购维护。'],materials:['procurement_write','采购','材料报价与行情采集由采购维护；各部门可查看材料与物流依据。']};
    const [cap,owner,note]=owners[key]||['','对应部门','共享查看资料，按部门职责完成编辑。'];
    const editable=can(cap)||(key==='solution'&&can('customer_write'));
    return {mode:editable?'edit':'shared',title:editable?'本部门工作 · 可按职责编辑':`共享查看 · ${owner}维护`,note};
  }
  function update(route) {
    document.body.dataset.workspacePage=route.page;
    const profile=profiles[role()],box=document.querySelector('#role-workspace');
    if(!box)return;
    const pageContext=context(route),isHome=false;
    const shortcuts=profile.shortcuts.map(item=>account.mode==='local'&&item[0]==='access'?['access','部署与访问','准备团队登录与账号权限','Users']:item);
    box.hidden=['rd-solutions','leadership','workbench','customer-directory','products','jobs'].includes(route.page)||route.primary==='supply';box.className='role-workspace'+(isHome?'':' role-workspace-compact')+(route.page==='leadership'?' role-workspace-dashboard':'');
    box.innerHTML=(isHome?`<div class="role-workspace-heading"><div><span class="role-kicker">${escape(profile.label)}工作台</span><h2>${escape(profile.title)}</h2><p>${escape(profile.description)}</p></div><span class="role-scope-badge">${icon(role()==='manager'?'ClipboardCheck':'Users')}${role()==='manager'?'全局管理':['viewer','member'].includes(role())?'只读访问':'共享查看 · 按部门编辑'}</span></div><div class="role-shortcuts">${shortcuts.map(([href,title,note,symbol])=>`<a class="role-shortcut" href="#${escape(href)}"><span class="role-shortcut-icon">${icon(symbol)}</span><div><strong>${escape(title)}</strong><small>${escape(note)}</small></div>${icon('ArrowRight')}</a>`).join('')}</div>`:'')+`<div class="role-page-context" data-mode="${pageContext.mode}">${icon(pageContext.mode==='shared'||pageContext.mode==='readonly'?'BookOpen':'ClipboardCheck')}<strong>${escape(pageContext.title)}</strong><span>${escape(pageContext.note)}</span></div>`;
    const section=route.primary||route.section;
    document.querySelectorAll('#main-nav > .role-nav-group a').forEach(a=>{const selected=a.dataset.page===section;a.classList.toggle('active',selected);if(selected)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');});
    if(shared?.querySelector(`a[data-page="${route.page}"]`))shared.dataset.current='true';else if(shared)delete shared.dataset.current;
    const usesProject=route.scope==='project'&&!!route.projectId;
    const picker=document.querySelector('#project-picker'),label=document.querySelector('.project-picker-label');
    if(picker)picker.hidden=!usesProject;if(label)label.hidden=!usesProject;
    const create=document.querySelector('.topbar-actions [data-action="new-project"]');
    if(create)create.hidden=!usesProject||!(can('project_sales_write')||can('engineering_write'));
  }
  function setAuth(auth) {
    account=auth||{};const profile=profiles[role()];
    document.body.dataset.workspaceRole=role();navigation();
    const identity=document.querySelector('#workspace-identity');
    if(identity)identity.innerHTML=`<span class="role-identity-icon">${icon(profile.icon)}</span><div class="role-identity-copy"><strong>${escape(profile.label)}</strong><small>${account.mode==='local'?'本机工作空间':'团队共享工作空间'}</small></div>${account.user?.email?`<span class="role-identity-account" title="${escape(account.user.email)}">${escape(account.user.email)}</span>`:''}`;
    const accountLink=document.querySelector('#role-account-link');
    if(accountLink){accountLink.innerHTML=icon('Users')+escape(profile.label);accountLink.setAttribute('aria-label',profile.label+' · 查看账户权限');}
    const mode=document.querySelector('.sidebar-note');
    if(mode)mode.innerHTML=`<span class="status-dot"></span><strong>${account.mode==='local'?'本机运行 · 本地保存':'团队共享 · 统一保存'}</strong><p>${account.mode==='local'?'在线部署后按登录角色分配权限。':'共享查看资料，按部门职责编辑。'}</p>`;
  }
  function init(context={}) {
    ctx=context;
    document.querySelector('#role-menu-toggle')?.addEventListener('click',()=>setMenu(document.querySelector('#role-menu-toggle')?.getAttribute('aria-expanded')!=='true'));
    document.querySelector('#main-nav')?.addEventListener('click',event=>{if(event.target.closest('a'))setMenu(false);});
    document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.querySelector('.sidebar')?.dataset.menuOpen==='true'){setMenu(false);document.querySelector('#role-menu-toggle')?.focus();}});
  }
  return {init,setAuth,update,home,role,context};
})();
