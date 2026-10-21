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
    const c=customer(), p=S.people?.summary||{}, product=S.products?.summary||{}, readonly=!editable();
    const rows=arr(S.customers).filter(c=>[c.name,c.website,c.group_name,c.id].join(' ').toLowerCase().includes(String(S.query||'').toLowerCase()));
    // Searching does not silently change the selected company. Keep its
    // option visible even when the current query matches a different name.
    if(c&&!rows.some(row=>row.id===c.id))rows.unshift(c);
    return `<section id="intelligence-console-root" class="ic-console" aria-labelledby="ic-title">
      <header class="ic-heading"><div><span class="ic-kicker">LUMIPILOT / CUSTOMER INTELLIGENCE</span><h1 id="ic-title">情报操作台</h1><p>从客户出发，找到关键人物，发现产品与渠道机会。</p></div><div class="ic-heading-actions">${button('preflight','演示前检查',S.checking)}<a class="button" href="#workbench?view=brief">${icon('LayoutDashboard')}查看经营简报</a></div></header>
      ${readinessView()}
      ${S.error?`<p class="ic-error" role="alert">${esc(S.error)} ${button('refresh','重新读取')}</p>`:''}
      <section class="ic-customer" aria-label="研究客户"><div><strong>先选客户，再开始研究</strong><span>两项研究使用同一客户档案，保留各自的国家、来源与历史。</span></div><div class="ic-customer-fields"><label>查找客户<input id="ic-search" type="search" maxlength="160" placeholder="公司名称、官网或客户编号" value="${esc(S.query||'')}"></label><label>研究客户<select id="ic-customer" aria-label="研究客户"><option value="">请选择客户</option>${rows.map(c=>`<option value="${esc(c.id)}" ${c.id===S.customerId?'selected':''}>${esc(c.name)} · ${esc(c.id.slice(-6))}</option>`).join('')}</select></label>${editable()?'<a class="button" href="#customers?new=research">研究新客户</a>':'<a class="button" href="#customer-directory">查看客户</a>'}</div>${c?`<p class="ic-identity"><strong>${esc(c.name)}</strong><span>${esc(c.group_name||'集团待核实')} · ${esc(c.owner||'负责人待分配')}</span><a href="#customers/${esc(c.id)}/overview">客户档案 →</a></p>`:`<p class="ic-muted">${S.listLoaded?rows.length?'请选择明确的公司主体；同名客户保留独立编号。':'没有匹配的客户，可先研究或建立新客户档案。':'正在读取本机客户档案…'}</p>`}</section>
      <div class="ic-research-grid">
        <section class="ic-research-card ic-people" aria-labelledby="ic-people-title"><header><span class="ic-source ic-linkedin">in</span><div><span class="ic-kicker">PEOPLE INTELLIGENCE</span><h2 id="ic-people-title">找人 <small>LinkedIn 人物研究</small></h2></div>${status(S.people,'people')}</header><p class="ic-card-description">找到该联系谁，整理公开职务、工作地区和可见履历。</p><footer>${button('people',readonly?'查看人物操作台':'打开人物操作台',!c,true)}${c?`<a href="#customers/${esc(c.id)}/people">关键人物与报告 →</a>`:''}</footer><div class="ic-metrics">${metric(p.unique,'研究档案')}${metric(p.read,'本次取得本人资料')}${metric(p.dated,'本次含日期履历')}</div><div class="ic-output-tags"><span>国家与职能分类</span><span>DeepSeek 核对</span><span>员工框架报告</span></div><div class="ic-scope-note">先确认公司主体。人员工作国家依据本人所在地核对，与公司经营国家及产品销售市场分开。</div>${S.people?.task?.status==='paused'?'<p class="ic-paused">当前任务已暂停。打开操作台只查看原资料，不会继续采集。</p>':'<p class="ic-muted">遇到平台访问提示时保持任务暂停；已有资料与日志可继续查看。</p>'}</section>
        <section class="ic-research-card ic-products" aria-labelledby="ic-products-title"><header><span class="ic-source ic-amazon">a<span>↗</span></span><div><span class="ic-kicker">PRODUCT INTELLIGENCE</span><h2 id="ic-products-title">找产品 <small>Amazon 与线上渠道</small></h2></div>${status(S.products,'products')}</header><p class="ic-card-description">按销售国家发现品牌、渠道和商品，再按品类整理销售线索。</p><footer><details class="ic-market-picker"><summary>销售市场 <span>${arr(S.countries).length?S.countries.map(code=>markets.find(m=>m[0]===code)?.[1]||code).map(esc).join('、'):'选择国家 · 可多选'}</span></summary><fieldset class="ic-markets"><legend>本次销售市场 <span>可多选</span></legend>${markets.map(([code,name])=>`<label><input type="checkbox" data-ic-market aria-label="${name}" value="${code}" ${arr(S.countries).includes(code)?'checked':''}>${name}</label>`).join('')}</fieldset></details>${button('products',readonly?'查看产品操作台':'打开产品操作台',!c||!arr(S.countries).length,true)}</footer><p class="ic-muted">${arr(S.countries).length?'已选 '+S.countries.map(code=>markets.find(m=>m[0]===code)?.[1]||code).map(esc).join('、'):'请选择销售市场；不会用客户总部国家代替。'} · 更多市场可在操作台补充。</p><div class="ic-output-tags"><span>照明品类</span><span>价格与规格</span><span>公开销量与榜单</span></div>${c?`<a class="ic-products-saved" href="#customers/${esc(c.id)}/products">已保存产品与市场 →</a>`:''}</section>
      </div>
      <section class="ic-progress" aria-labelledby="ic-progress-title"><header><div><h2 id="ic-progress-title">任务与已保存成果</h2><p>任务状态、网页采集和 AI 整理分别记录。打开首页不会开始采集。</p></div>${button('refresh','刷新已保存状态',S.loading)}<a href="#jobs">全部后台任务 →</a></header>${taskRow(S.people,'people','人物研究')}${taskRow(S.products,'products','产品与渠道研究')}<div class="ic-saved-products">最近产品任务：${Number.isFinite(product.pages)?esc(product.pages):'—'} 个已读页面 · ${Number.isFinite(product.unique)?esc(product.unique):'—'} 个商品预览 · ${Number.isFinite(product.accepted)?esc(product.accepted):'—'} 个已采纳商品。预览、销量线索与正式入库分别核对。</div></section>
      <div class="ic-next-links"><a href="#customer-directory">客户管理与后续行动 →</a><a href="#projects">产品机会确认后，进入项目 →</a>${c?`<a href="#customers/${esc(c.id)}/opportunities">查看此客户机会 →</a>`:''}</div>
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
    try {
      const result=await ctx.api('/api/business/customers','GET');if(!active||own!==epoch)return;
      S.customers=arr(result.customers).filter(c=>valid(c.id));S.listLoaded=true;
      if(S.customerId&&!customer()){S.error='链接中的客户不存在或不可访问，请重新选择。';S.customerId='';}
      await summaries(own);
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
  function stop() {++epoch;active=false;for(const control of checks)control.abort();checks.clear();closeProduct();}
  function init(context) {
    ctx=context||{};if(bound)return;bound=true;window.addEventListener('hashchange',closeProduct);
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
        if(node.dataset.icAction==='people'&&customer()){
          if(!window.LumiCustomerPeopleDatabase?.open)throw Error('人物操作台未加载，请刷新页面。');
          await window.LumiCustomerPeopleDatabase.open({customerId:S.customerId});
        }
        else if(node.dataset.icAction==='products')await openProduct();
        else if(node.dataset.icAction==='preflight')await preflight();
        else if(node.dataset.icAction==='refresh'){if(!S.listLoaded){await load({query:{customer:S.customerId,markets:arr(S.countries).join(',')}});paint();}else await summaries(epoch);}
      }catch(error){if(active){S.error=error.message;paint();}}
    });
  }
  return {init,load,view,stop};
})();
