'use strict';

// Home only reads saved records. Source visits and paid analysis stay behind
// the existing research tools and their explicit confirmation steps.
window.LumiIntelligence = (() => {
  let ctx = {}, epoch = 0, bound = false, active = false, entry = 0;
  let S = {};
  const checks = new Set();
  const root = () => document.getElementById('intelligence-console-root');
  const valid = value => /^[a-f0-9]{16}$/.test(String(value || ''));
  const arr = value => Array.isArray(value) ? value : [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const markets = [['US','美国'],['GB','英国'],['DE','德国'],['FR','法国'],['AU','澳大利亚'],['CA','加拿大'],['JP','日本'],['IN','印度'],['CN','中国'],['VN','越南']];
  const labels = {paused:'已暂停',needs_attention:'需要处理',needs_login:'等待登录或验证',running:'运行中',queued:'排队中',completed:'已完成',partial:'部分完成',failed:'未完成',cancelled:'已停止',exhausted:'可见结果已用尽',waiting_company:'等待确认公司',awaiting_browser:'等待浏览器'};
  const date = value => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'}).format(new Date(value)) : '时间未记录';
  const metric = (value, label) => `<div><strong>${Number.isFinite(value) ? esc(value) : '—'}</strong><span>${esc(label)}</span></div>`;
  const icon = name => ctx.icon?.(name) || '';
  function editable() {
    const a = ctx.auth?.() || {};
    if (a.readonly || a.workspace_readonly || a.must_change_password) return false;
    if (a.mode === 'local') return a.can_manage === true;
    if (a.mode !== 'online' || a.user?.status !== 'approved' || a.user?.must_change_password || ['viewer','member'].includes(a.user?.role)) return false;
    return Array.isArray(a.capabilities) ? a.capabilities.includes('customer_write') : ['admin','manager','sales'].includes(a.user?.role);
  }
  const customer = () => S.customers?.find(c => c.id === S.customerId);
  const button = (action, label, disabled=false, primary=false) => `<button type="button" class="button ${primary?'button-primary':''}" data-ic-action="${action}" ${disabled?'disabled':''}>${esc(label)}</button>`;
  function status(data, kind) {
    if (S.loading) return '<span class="ic-status">读取已保存记录…</span>';
    if (!customer()) return '<span class="ic-status">先选择客户</span>';
    if (S.errors?.[kind]) return '<span class="ic-status ic-attention">状态暂不可用</span>';
    if (!data?.task) return '<span class="ic-status">尚无采集任务</span>';
    return `<span class="ic-status ${['paused','needs_attention','needs_login','failed','partial'].includes(data.task.status)?'ic-attention':''}">${esc(labels[data.task.status]||'状态待核对')}</span>`;
  }
  function logButton(data, kind) {
    return `<button type="button" class="button" data-crawl-log-open data-customer-id="${esc(S.customerId)}" data-task-kind="${kind}" data-task-id="${esc(data?.task?.id||'')}" ${!valid(data?.task?.id)?'disabled':''}>工作日志 / 演示</button>`;
  }
  function taskRow(data, kind, title) {
    const exists = data?.task;
    return `<article class="ic-task"><div class="ic-task-icon">${icon(kind==='people'?'Users':'ShoppingCart')}</div><div><h3>${esc(title)}</h3><p>${exists?`${esc(data.task.title)} · ${esc(date(data.task.created_at))}`:S.loading?'正在读取本机任务记录':S.errors?.[kind]?'请稍后刷新已保存状态':customer()?'此客户还没有相应任务':'选择客户后查看任务与成果'}</p>${S.errors?.[kind]?`<p class="ic-error">${esc(S.errors[kind])}</p>`:''}</div>${status(data,kind)}${logButton(data,kind)}</article>`;
  }
  function readinessView() {
    if (!S.preflight && !S.checking) return '';
    return `<section class="ic-preflight" aria-labelledby="ic-preflight-title"><header><div><h2 id="ic-preflight-title">演示前检查</h2><p>当前入口：${esc(location.origin)} · ${S.checkedAt ? esc(date(S.checkedAt)) : '检查中'}</p></div>${button('preflight',S.checking?'检查中…':'重新检查',S.checking)}</header><p class="ic-muted">只读取服务状态，不启动采集或 AI。配置具备不代表联网成功；已保存结果可从下方客户入口查看。</p><ul aria-live="polite">${arr(S.preflight).map(r=>`<li><strong>${esc(r.title)}</strong><span class="ic-check-state ${r.state==='blocked'?'ic-attention':''}">${esc(r.state==='pass'?'可用':r.state==='blocked'?'需处理':'待实测')}</span><p>${esc(r.message)}</p></li>`).join('')}</ul>${S.checking?'<p role="status">正在检查当前入口，每项最多等待 12 秒…</p>':''}<p class="ic-muted">云端只读分享无法执行实时采集。完整云端功能需要 Python 后端与独立配置；本机密钥和 Edge 登录不会自动同步到服务器。</p><a href="#help?section=online-access">部署条件与演示检查说明 →</a></section>`;
  }
  async function preflight() {
    if (S.checking || !active) return;
    const own=epoch;
    S.checking=true;S.preflight=[];S.checkedAt=new Date().toISOString();paint();
    async function read(path) {
      if(!active||own!==epoch)throw Error('cancelled');
      const control=new AbortController();checks.add(control);
      const timer=setTimeout(()=>control.abort(),12000);
      try {
        const response=await fetch(path,{credentials:'same-origin',cache:'no-store',signal:control.signal});
        if(!response.ok || !String(response.headers.get('content-type')||'').includes('application/json'))throw Error('invalid_response');
        return await response.json();
      } finally {clearTimeout(timer);checks.delete(control);}
    }
    const add=(title,state,message)=>{if(active&&own===epoch){S.preflight.push({title,state,message});paint();}};
    try {
      let auth;
      try {auth=await read('/api/auth/status');if(!['local','online'].includes(auth?.mode))throw Error('invalid_mode');}
      catch {add('当前服务','blocked','认证接口不可用，无法确认运行环境。请检查当前网址和本机服务。');return;}
      if(!active||own!==epoch)return;
      const readonly=!!window.LumiShare || auth.readonly===true || auth.workspace_readonly===true || auth.deployment==='cloudflare_readonly';
      add('运行方式',readonly?'blocked':'pass',readonly?'当前为只读快照，只能展示本次已发布资料；不能进行实时采集或 AI 分析。':auth.mode==='local'?'本机完整工作台；当前检查不会开放公网访问。':'已识别线上应用；数据和模型配置以此服务器为准。');
      if(auth.mode==='online')add('账号登录',auth.password_ready===false||auth.admin_initialized===false?'blocked':'unverified',auth.password_ready===false||auth.admin_initialized===false?'管理员密码尚未初始化。请先完成初始化和实际登录，不能把登录页当成可用演示入口。':'请确认当前账号已批准且拥有所需部门权限；此检查不修改账号。');
      if(readonly)return;
      await Promise.all([
        (async()=>{try{const h=await read('/api/health');if(h.status!=='ok'||!['local_demo','local','online'].includes(h.mode)||auth.mode==='online'&&h.mode!=='online')throw Error();add('应用后台','pass','健康接口正常。第三方网站与模型仍需在对应任务中实测。');}catch{add('应用后台','blocked','未取得有效健康响应；请确认完整服务运行，而非仅有静态页面。');}})(),
        (async()=>{try{const a=await read('/api/business/ai/status');add('AI 辅助分析',a.enabled===true&&a.configured===true?'unverified':'blocked',a.enabled===true&&a.configured===true?'此服务已配置并启用模型；本检查未发送模型请求，联网与余额状态待实测。':'此服务尚未配置或启用模型。由管理员在 AI 设置中完成连接测试。');}catch{add('AI 辅助分析','blocked','无法读取模型状态，请检查登录、权限和后台。');}})(),
        (async()=>{if(auth.mode!=='local'){add('LinkedIn 执行端','blocked','云服务器不能直接调用本机 Edge 助手。请在已连接的本机工作台执行，或展示已保存人物资料与日志。');return;}try{const a=await read('/api/linkedin-connector/status');add('Edge 连接',a.connected===true?'unverified':'blocked',a.connected===true?'本机助手有响应；这不证明 LinkedIn 会话可访问。遇到平台限制保持暂停，演示已有记录。':'本机连接页或助手未就绪。已保存资料仍可查看，不会自动重启任务。');}catch{add('Edge 连接','blocked','连接状态暂不可读；请检查本机服务和 Edge 连接页。');}})(),
        (async()=>{try{const m=await read('/api/manual');add('使用说明',m.documentation_status==='current'?'pass':'unverified',m.documentation_status==='current'?'说明与当前程序同步；完整说明使用 PDF 下载，实际下载可在帮助页验证。':'说明状态需核对，请在帮助页检查同步状态与 PDF。');}catch{add('使用说明','blocked','使用说明接口不可读；请确认部署包包含说明及 PDF 生成依赖。');}})()
      ]);
    } finally {if(active&&own===epoch){S.checking=false;paint();}}
  }
  function view() {
    if(S.customerCase)return window.LumiCustomerCase?.view()||'<p>案例模块未载入，请刷新页面。</p>';
    const c=customer(), p=S.people?.summary||{}, product=S.products?.summary||{}, readonly=!editable();
    const rows=arr(S.customers).filter(c=>[c.name,c.website,c.group_name,c.id].join(' ').toLowerCase().includes(String(S.query||'').toLowerCase()));
    // Searching does not silently change the selected company. Keep its
    // option visible even when the current query matches a different name.
    if(c&&!rows.some(row=>row.id===c.id))rows.unshift(c);
    const marketPicker=`<details class="ic-market-picker"><summary>销售市场 <span>${arr(S.countries).length?S.countries.map(code=>markets.find(m=>m[0]===code)?.[1]||code).map(esc).join('、'):'可多选'}</span></summary><fieldset class="ic-markets"><legend>本次销售市场 <span>可多选 · 入口参考</span></legend>${markets.map(([code,name])=>`<label><input type="checkbox" data-ic-market aria-label="${name}" value="${code}" ${arr(S.countries).includes(code)?'checked':''}>${name}</label>`).join('')}</fieldset></details>`;
    return `<section id="intelligence-console-root" class="ic-console" aria-labelledby="ic-title">
      <div class="ic-header-zone"><header class="ic-heading"><h1 id="ic-title">情报操作台</h1><p>让客户情报，进入下一步行动。</p></header><section class="ic-customer" aria-label="研究客户"><div class="ic-customer-fields"><label class="ic-search-label"><span class="sr-only">查找客户</span><input id="ic-search" type="search" aria-label="查找客户" maxlength="160" placeholder="搜索客户名称、官网或编号" value="${esc(S.query||'')}"></label><label>当前客户<select id="ic-customer" aria-label="研究客户"><option value="">请选择客户</option>${rows.map(c=>`<option value="${esc(c.id)}" ${c.id===S.customerId?'selected':''}>${esc(c.name)} · ${esc(c.id.slice(-6))}</option>`).join('')}</select></label>${marketPicker}${editable()?'<a class="ic-new-customer" href="#customers?new=research">研究新客户'+icon('ArrowRight')+'</a>':'<a class="ic-new-customer" href="#customer-directory">查看客户'+icon('ArrowRight')+'</a>'}</div>${c?`<p class="ic-identity"><strong>${esc(c.name)}</strong><span>${esc(c.group_name||'集团待核实')} · ${esc(c.owner||'负责人待分配')}</span><a href="#customers/${esc(c.id)}/overview">客户档案 →</a></p>`:`<p class="ic-muted">${S.listLoaded?rows.length?'请选择明确的客户主体，再开始研究。':(window.LumiShare?'本次分享未包含客户档案，可查看已发布项目资料。':readonly?'当前暂无可查看的客户资料。':'没有匹配的客户，可先研究或手动建档。'):'正在读取客户档案…'}</p>`}</section></div>
      ${readinessView()}${S.error?`<p class="ic-error" role="alert">${esc(S.error)} ${button('refresh','重新读取')}</p>`:''}
      <div class="ic-home-layout"><section class="ic-primary-work" aria-labelledby="ic-customer-work-title"><div class="ic-primary-heading"><h2 id="ic-customer-work-title">客户情报</h2>${button('joint','人物 + 产品联合研究',false,true)}</div><div class="ic-research-grid">
        <section class="ic-research-card ic-people" aria-labelledby="ic-people-title"><span class="ic-source">${icon('Users')}</span><div class="ic-tool-copy"><h2 id="ic-people-title">找人</h2><p class="ic-card-description">找到目标联系人，整理公开职务、工作地区和可见履历。</p><details class="ic-tool-details"><summary>资料概况与使用口径</summary>${status(S.people,'people')}<div class="ic-metrics">${metric(p.unique,'研究档案')}${metric(p.read,'本次取得本人资料')}${metric(p.dated,'本次含日期履历')}</div><p class="ic-scope-note">人员工作国家依据本人所在地核对，与公司经营国家、产品销售市场分开。</p>${S.people?.task?.status==='paused'?'<p class="ic-paused">当前任务已暂停。打开操作台只查看原资料，不会继续采集。</p>':'<p class="ic-muted">遇到平台访问提示保持暂停；已有资料与日志可查看。</p>'}</details></div><footer>${button('people',readonly?'查看人物操作台':'打开人物操作台',!c,true)}${c?`<a href="#customers/${esc(c.id)}/people">关键人物与报告 ${icon('ArrowRight')}</a>`:''}</footer></section>
        <section class="ic-research-card ic-products" aria-labelledby="ic-products-title"><span class="ic-source">${icon('Layers')}</span><div class="ic-tool-copy"><h2 id="ic-products-title">找产品</h2><p class="ic-card-description">直接进入爬虫技能启动台，配置国家、品牌和渠道，采集商品并分析品类。</p><details class="ic-tool-details"><summary>渠道研究与已保存产品</summary>${status(S.products,'products')}<p class="ic-muted">首页国家仅作参考，请在启动台确认采集范围；不会用总部国家代替销售市场。</p>${button('legacy-products','更多渠道研究',!c||!arr(S.countries).length)}${c?`<a class="ic-products-saved" href="#customers/${esc(c.id)}/products">已保存产品与市场 →</a>`:''}</details></div><footer>${button('products',readonly?'查看产品操作台':'打开产品操作台',!c,true)}${button('integrated-products','商品采纳与日志',!c)}</footer></section>
      </div></section>
      <aside class="ic-opportunity-work" aria-labelledby="ic-opportunity-title"><h2 id="ic-opportunity-title">机会与方案</h2><section class="ic-research-card ic-tenders" aria-labelledby="ic-tenders-title"><span class="ic-source">${icon('Globe')}</span><div class="ic-tool-copy"><h2 id="ic-tenders-title">找商机</h2><p class="ic-card-description">按项目履约国家研究采购公告，核对要求与参与路径，采纳为待确认机会。</p></div><footer>${button('integrated-tenders','打开商机操作台')}</footer></section><section class="ic-research-card ic-design" aria-labelledby="ic-design-title"><span class="ic-source">${icon('FileText')}</span><div class="ic-tool-copy"><h2 id="ic-design-title">做方案</h2><p class="ic-card-description">直接进入 LUMINA 完整设计界面，布置灯具、计算照度并导出方案。</p></div><footer>${button('lumina','打开照明方案台',!c)}${button('integrated-design','项目方案与日志',!c)}</footer></section><p class="ic-open-note">${icon('Info')}<span>打开界面不会自动开始采集。<br>公告、计算与正式审核分别核对。</span></p></aside>
      <section class="ic-progress" aria-labelledby="ic-progress-title"><header><h2 id="ic-progress-title">最近任务</h2><div>${button('refresh','刷新已保存状态',S.loading)}<a href="#jobs">全部后台任务 ${icon('ArrowRight')}</a></div></header>${taskRow(S.people,'people','人物研究')}${taskRow(S.products,'products','产品与渠道研究')}<details class="ic-task-summary"><summary>查看采集口径与数量</summary><p>任务状态、网页采集和 AI 整理分别记录。最近产品任务：${Number.isFinite(product.pages)?esc(product.pages):'—'} 个已读页面 · ${Number.isFinite(product.unique)?esc(product.unique):'—'} 个商品预览 · ${Number.isFinite(product.accepted)?esc(product.accepted):'—'} 个已采纳商品。</p></details></section></div>
      <footer class="ic-next-links"><div><a class="button" href="#workbench?view=intelligence&case=smart-downlight${S.customerId?'&customer='+encodeURIComponent(S.customerId):''}${arr(S.countries).length?'&markets='+encodeURIComponent(S.countries.join(',')):''}">客户案例 · 北美智能筒灯</a>${button('preflight','演示前检查',S.checking)}<a href="#workbench?view=brief">查看经营简报</a><a href="#customer-directory">客户管理</a><a href="#workbench?view=tasks">我的工作</a><a href="#workbench?view=decisions">待决策</a></div><span>人物、商品与方案沿用原资料和版本</span></footer>
    </section>`;
  }

  function paint() {
    const n=root();if(!active||!n)return;
    const marketOpen=root()?.querySelector('.ic-market-picker')?.open,search=document.activeElement?.id==='ic-search', input=document.getElementById('ic-search'), pos=search?input.selectionStart:null;
    n.outerHTML=view();if(marketOpen){const picker=root()?.querySelector('.ic-market-picker');if(picker)picker.open=true;}if(search){const next=document.getElementById('ic-search');next?.focus();next?.setSelectionRange?.(pos,pos);}
  }
  async function summaries(own) {
    if (!customer()) return;
    S.loading=true;S.people=S.products=null;S.errors={};paint();
    const cid=S.customerId;
    await Promise.all(['people','products'].map(async kind=>{
      try {
        const result=await ctx.api(`/api/business/customers/${cid}/crawl-logs?kind=${kind}&limit=1`,'GET');
        if(!active||own!==epoch||cid!==S.customerId)return;
        if(result.customer?.id!==cid||result.task&&(!valid(result.task.id)||result.task.kind!==kind))throw Error('返回记录不属于所选客户或研究类型，未显示。');
        S[kind]=result;
      } catch(error) {if(active&&own===epoch)S.errors[kind]=error.message||'已保存状态暂不可用';}
    }));
    if(active&&own===epoch){S.loading=false;paint();}
  }
  async function load(route={}) {
    stop();active=true;const own=epoch;
    S={customers:[],customerId:valid(route.query?.customer)?route.query.customer:'',countries:String(route.query?.markets||'').split(',').filter(code=>markets.some(m=>m[0]===code)),query:'',people:null,products:null,errors:{},listLoaded:false,loading:false,error:''};
    if(route.query?.case==='smart-downlight'){S.customerCase=true;await window.LumiCustomerCase?.reset(route.query);return;}
    try {
      const result=await ctx.api('/api/business/customers','GET');if(!active||own!==epoch)return;
      S.customers=arr(result.customers).filter(c=>valid(c.id));S.listLoaded=true;
      if(S.customerId&&!customer()){S.error='链接中的客户不存在或不可访问，请重新选择。';S.customerId='';}
      await summaries(own);
      if(active&&own===epoch&&route.query?.tool==='design'&&customer())await window.LumiIntegrated?.open('design',{customer:customer(),countries:S.countries,selectedTask:route.query.task});
    } catch(error) {if(active&&own===epoch)S.error=error.message||'客户暂不可用';}
  }
  function closeProduct() {const dialog=document.getElementById('ic-product-dialog');if(dialog){window.LumiCustomerProductResearch?.stop();dialog.close?.();dialog.remove();}}
  async function openProduct() {
    const c=customer();if(!c||!S.countries.length)return;closeProduct();
    const tool=window.LumiCustomerProductResearch;if(!tool)throw Error('产品操作台未加载，请刷新页面。');
    const options={entryToken:'home-'+(++entry),entryCountries:[...S.countries]};
    const dialog=document.createElement('dialog');dialog.id='ic-product-dialog';dialog.className='ic-product-dialog';dialog.setAttribute('aria-labelledby','ic-product-dialog-title');
    dialog.innerHTML=`<header class="ic-product-header"><div><small>情报操作台 / 找产品</small><h2 id="ic-product-dialog-title">${esc(c.name)} · 产品与渠道操作台</h2></div>${button('close-products','关闭')}</header><div class="ic-product-body">${tool.view(c,options)}</div>`;
    dialog.addEventListener('cancel',event=>{event.preventDefault();closeProduct();});document.body.append(dialog);dialog.showModal?.();await tool.mount(c,options);
  }
  function stop() {++epoch;active=false;for(const control of checks)control.abort();checks.clear();closeProduct();window.LumiIntegrated?.close();}
  function init(context) {
    ctx=context||{};window.LumiCustomerCase?.init(ctx);window.LumiIntegrated?.init(ctx);window.LumiJointResearch?.init(ctx);if(bound)return;bound=true;window.addEventListener('hashchange',closeProduct);
    document.addEventListener('input',event=>{if(event.target.id==='ic-search'&&active){S.query=event.target.value;paint();}});
    document.addEventListener('change',event=>{
      if(!active||!event.target.closest?.('#intelligence-console-root'))return;
      if(event.target.id==='ic-customer'){
        const id=event.target.value;if(id&&!S.customers.some(c=>c.id===id))return;
        location.hash='#workbench?view=intelligence'+(id?'&customer='+encodeURIComponent(id):'');
      }else if(event.target.matches('[data-ic-market]')){S.countries=[...document.querySelectorAll('[data-ic-market]:checked')].map(n=>n.value);paint();}
    });
    document.addEventListener('click',async event=>{
      const node=event.target.closest?.('[data-ic-action]');if(!node||node.disabled)return;event.preventDefault();
      if(node.dataset.icAction==='close-products'){closeProduct();return;}if(!active||!root())return;
      try {
        if(node.dataset.icAction==='joint'){await window.LumiJointResearch?.open({customerId:S.customerId,countries:S.countries});}
        else if(node.dataset.icAction==='people'&&customer()){
          if(!window.LumiCustomerPeopleDatabase?.open)throw Error('人物操作台未加载，请刷新页面。');
          await window.LumiCustomerPeopleDatabase.open({customerId:S.customerId});
        }
        else if(node.dataset.icAction==='products'){if(!window.LumiIntegrated?.openProductStudio)throw Error('产品启动台入口未加载，请刷新页面。');await window.LumiIntegrated.openProductStudio({customer:customer(),countries:S.countries});}
        else if(node.dataset.icAction==='legacy-products')await openProduct();
        else if(node.dataset.icAction==='lumina')await window.LumiIntegrated?.openStudio({customer:customer()});
        else if(node.dataset.icAction.startsWith('integrated-'))await window.LumiIntegrated?.open(node.dataset.icAction.slice(11),{customer:customer(),countries:S.countries});
        else if(node.dataset.icAction==='preflight')await preflight();
        else if(node.dataset.icAction==='refresh'){if(!S.listLoaded){await load({query:{customer:S.customerId,markets:arr(S.countries).join(',')}});paint();}else await summaries(epoch);}
      }catch(error){if(active){S.error=error.message;paint();}}
    });
  }
  return {init,load,view,stop};
})();
