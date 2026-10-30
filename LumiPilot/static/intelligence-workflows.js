'use strict';
window.LumiIntegrated = (() => {
  let ctx={}, state={}, generation=0, timer=null, busy=false, bound=false, previousFocus=null, studioTimer=null;
  const arr=v=>Array.isArray(v)?v:[], e=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const base='/api/business/intelligence/', api=(p,m='GET',v)=>ctx.api(base+p,m,v);
  const names={products:'找产品',tenders:'找商机',design:'做方案'};
  const statuses={draft:'需求草稿',queued:'等待执行',running:'执行中',completed:'已完成',ready:'已计算 · 待采纳',saved:'已保存方案',needs_attention:'需要处理',failed:'未完成',cancelled:'已取消'};
  const markets=[['US','美国'],['MX','墨西哥'],['GB','英国'],['DE','德国'],['FR','法国'],['AU','澳大利亚'],['CA','加拿大'],['JP','日本'],['IN','印度'],['NL','荷兰'],['VN','越南']];
  const europe=[['BE','比利时'],['NL','荷兰'],['DE','德国'],['FR','法国'],['GB','英国'],['IE','爱尔兰'],['ES','西班牙'],['IT','意大利'],['PL','波兰'],['SE','瑞典'],['DK','丹麦'],['FI','芬兰'],['NO','挪威'],['PT','葡萄牙'],['AT','奥地利'],['CH','瑞士']];
  const role=()=>{const a=ctx.auth?.()||{};return a.readonly||a.workspace_readonly?'viewer':a.mode==='local'&&a.can_manage?'admin':a.user?.status==='approved'&&!a.must_change_password&&!a.user?.must_change_password?a.user.role:'viewer';};
  const can=kind=>['admin','manager',...(kind==='products'?['research','sales']:[kind==='design'?'research':'sales'])].includes(role());
  const canAdopt=()=>['admin','manager','sales'].includes(role());
  const btn=(action,title,disabled=false,id='')=>`<button type="button" class="button" data-iw="${action}" data-id="${e(id)}" ${disabled?'disabled':''}>${e(title)}</button>`;
  const field=(n,t,type='text',value='',extra='')=>`<label>${e(t)}<input name="${n}" type="${type}" value="${e(value)}" ${extra}></label>`;
  const area=(n,t,value='',extra='')=>`<label class="iw-wide">${e(t)}<textarea name="${n}" rows="3" ${extra}>${e(value)}</textarea></label>`;
  const select=(n,t,rows,value='',extra='')=>`<label>${e(t)}<select name="${n}" ${extra}>${rows.map(([k,v])=>`<option value="${e(k)}" ${k===value?'selected':''}>${e(v)}</option>`).join('')}</select></label>`;
  const projects=()=>arr(ctx.projects?.());
  const customerId=()=>state.customer?.id||'';
  const current=()=>state.items?.find(t=>t.id===state.selected);
  const when=v=>v?new Date(v).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai'}):'未记录';
  function countrySelect(kind){const rows=kind==='tenders'?europe:markets;return select('countries',kind==='tenders'?'项目履约国家（可多选）':'本次销售市场',rows,state.countries?.[0]||'',kind==='tenders'?'multiple size="4" required':'required');}
  function newForm(seed={}) {
    let content='';const kind=state.kind,c=state.customer, disabled=!can(kind);
    if(kind==='products') content=countrySelect(kind)+field('keyword','品牌 / 商品关键词','text',seed.keyword||c?.name||'','required maxlength="180"')+field('pages','最多列表页','number',1,'min="1" max="10" required')+field('limit','最多商品详情','number',20,'min="1" max="200" required');
    if(kind==='products'&&seed.research_context)content+=area('research_context','研发调研目标与来源方案',seed.research_context,'maxlength="5000"');
    if(kind==='tenders') content=countrySelect(kind)+field('keyword','照明工程检索词（建议英语或当地语言）','text','lighting','required maxlength="120"')+field('limit','本次最多公告','number',20,'min="1" max="100" required')+select('notice_scope','公告范围',[['ACTIVE','TED 当前有效公告（仍需核对类型）'],['ALL','含历史、预告、授标与更正']]);
    if(kind==='design') content=field('title','方案名称','text',seed.title||'','required maxlength="200"')+select('project_id','关联项目',[['','请选择明确项目'],...projects().map(p=>[p.id,p.name])],'','required')+area('brief','已确认的工程要求',seed.title||'','required maxlength="5000"')+area('assumptions','假设与待确认事项',seed.source?'依据公告开展初步设计；现场尺寸、安装条件、产品要求与资格仍需核实。':'','maxlength="2000"')+(seed.source?`<input type="hidden" name="source_task_id" value="${e(seed.source.task)}"><input type="hidden" name="source_notice_id" value="${e(seed.source.notice)}"><p class="iw-note iw-wide">保留来源公告，不把公告标题当作完整设计任务书。</p>`:'');
    return `<section class="iw-panel"><h3>${kind==='design'?'创建设计需求':'新建研究任务'}</h3><p class="iw-note">${kind==='products'?'使用现有产品爬虫，不复制登录会话。每次一个市场，多国分别建立任务；提交前请确认品牌关键词。':kind==='tenders'?'首版接入欧洲 TED。检索履约国家，不以采购机构总部代替项目地点；预算和公告阶段以原文为准。':'需求草稿不会调用模型。尺寸、照明指标和费用假设确认后才开始设计。'}</p>${!c&&kind!=='tenders'?'<p role="alert">请先在首页选择客户。</p>':''}<form id="iw-new"><fieldset ${disabled?'disabled':''}><div class="iw-fields">${content}</div><footer><button class="button button-primary" ${!c&&kind!=='tenders'?'disabled':''}>${kind==='design'?'保存需求草稿':'确认范围并提交'}</button></footer></fieldset></form>${disabled?'<p class="iw-note">共享查看；'+(kind==='design'?'研发':'销售')+'或管理者可维护此任务。</p>':''}</section>`;
  }
  function shell(seed){
    const c=state.customer;
    return `<header class="iw-header"><div><small>LUMIPILOT / ${e(c?.name||'公开项目研究')}</small><h2 id="iw-title">${names[state.kind]}</h2></div>${btn('close','关闭')}</header><div class="iw-body"><div class="iw-toolbar">${Object.entries(names).map(([k,v])=>btn('tab-'+k,v,false)).join('')}${btn('status','检查引擎')}${state.kind==='products'?btn('start-products','启动本机产品引擎',!can('products')):state.kind==='design'?btn('start-design','启动本机 LUMINA',!can('design')):''}<span id="iw-engine-status" role="status"></span></div><p id="iw-message" role="status"></p><div class="iw-layout"><main><div id="iw-form">${newForm(seed)}</div>${state.kind==='products'?`<section class="iw-panel"><h3>复用爬虫品牌库</h3><p class="iw-note">读取已有商品，按真实站点核对市场后采纳到当前客户。不会自动采纳新品或把研究国家写成事实。</p>${btn('brands','读取品牌库')}<div id="iw-brands"></div><div id="iw-catalog"></div></section>`:''}<div id="iw-detail"></div></main><aside class="iw-panel"><header><h3>研究任务与方案</h3>${btn('reload','刷新')}</header><div id="iw-tasks">读取中…</div><p class="iw-note">最多显示最近 80 条。关闭窗口不取消任务；请使用任务内的取消按钮。</p></aside></div></div>`;
  }
  function taskList(){const n=document.getElementById('iw-tasks');if(!n)return;const rows=arr(state.items).filter(t=>t.kind===state.kind);n.innerHTML=rows.map(t=>`<button class="iw-task ${state.selected===t.id?'selected':''}" type="button" data-iw="select" data-id="${e(t.id)}"><strong>${e(t.title)}</strong><span>${e(statuses[t.status]||t.status)} · ${e(t.countries.join(', '))}</span><small>${e(when(t.updated_at))}</small></button>`).join('')||'<p class="iw-note">尚无任务。</p>';}
  function generationForm(t){return `<form id="iw-generate" data-id="${e(t.id)}"><div class="iw-fields">${[['length','场地长度 m',8,2000],['width','场地宽度 m',6,2000],['height','安装空间高度 m',2.5,25],['targetLux','目标照度 lx',1,2000],['workplane','工作面高度 m',0,2],['maintenance','维护系数',.3,1],['hours','每日运行小时',1,24],['days','每年运行天数',1,366],['tariff','电价（元/kWh，成本情景）',0,10]].map(([n,l,min,max])=>field(n,l,'number','','required step="any" min="'+min+'" max="'+max+'"')).join('')}${select('source','设计方式',[['deepseek','DeepSeek 新方案（调用已配置模型）'],['demo','离线规则试算（不调用模型）']])}<label class="iw-wide iw-confirm"><input type="checkbox" name="confirmed" required>我已核对上述参数与假设；计算结果不自动证明工程达标。</label></div><button class="button button-primary" ${!can('design')?'disabled':''}>确认参数并生成</button></form>`;}
  function detail(){
    const n=document.getElementById('iw-detail'),t=current();if(!n)return;if(!t){n.innerHTML='';return;}
    // Keep active engineering inputs untouched by background progress refresh.
    const oldForm=n.querySelector('#iw-generate');let html=`<section class="iw-panel"><header><div><h3>${e(t.title)}</h3><p>${e(statuses[t.status]||t.status)} · ${e(t.id)}</p></div><div>${btn('refresh-task','核对进度',!can(t.kind),t.id)}${btn('cancel','取消任务',!can(t.kind)||['saved','completed','cancelled'].includes(t.status),t.id)}</div></header>`;
    if(t.research_context)html+=`<p class="iw-preserve">研发调研目标：${e(t.research_context)}</p>`;
    if(t.project_id)html+=`<p><a href="#projects/${e(t.project_id)}/overview">关联项目 →</a></p>`;
    if(t.kind==='tenders')html+=`<p class="iw-note">本次显示 ${arr(t.results).length} 条${Number.isFinite(t.total)?'，检索匹配总数 '+t.total:''}。公告类型、截止日期与中标状态须打开原文核对；并非全部正在招标。</p>`+arr(t.results).map(r=>`<article class="iw-notice"><small>${e(r.id)} · ${e(r.published_at)}</small><h4><a href="${e(r.url)}" target="_blank" rel="noopener noreferrer">${e(r.title||r.id)}</a></h4><p>采购方：${e(r.buyer||'待核实')}<br>履约地点：${e(r.place_of_performance||'原文待核对')}<br>公告类型：${e(r.notice_type)}<br>采购分类 CPV：${e(r.cpv||'未返回')}<br>截止时间原文：${e(r.deadline_raw||'未提供')}</p>${btn('adopt-notice','采纳为待确认机会',!can('tenders')||!customerId(),r.id)}${btn('design-notice','创建关联设计需求',!can('design')||!customerId(),r.id)}</article>`).join('');
    if(t.kind==='design'){
      html+=`<p class="iw-preserve">${e(t.brief)}</p><p class="iw-note">假设：${e(t.assumptions||'未登记；请在生成前核对')}<br>需求依据的项目时间：${e(t.source_project_updated_at)}</p>`;
      if(t.source)html+=`<p><a target="_blank" rel="noopener noreferrer" href="${e(t.source.url)}">来源公告：${e(t.source.title)}</a></p>`;
      if(t.status==='draft')html+='<div id="iw-generation-slot"></div>';
      if(t.summary){const a=t.summary.analysis||{};html+=`<div class="iw-summary"><strong>${e(t.plan_name)} · v${e(t.plan_revision)}</strong><p>${e(t.summary.fixture_count)} 盏 · 平均 ${e(a.avg)} lx · 最低 ${e(a.min)} lx · 均匀度 ${e(a.uniformity)}</p><p>生成方式：${t.generation_source==='demo'?'离线规则试算':'DeepSeek'}；待报价灯数 ${e(t.summary.unknown_price_quantity??'未记录')}。${t.summary.sample_prices?'含演示价格，须另行询价。':''}</p></div><ul>${arr(t.summary.warnings).map(w=>`<li>${e(w)}</li>`).join('')}</ul>`;}
      if(t.status==='ready')html+=btn('save-plan','采纳并保存到 LUMINA',!can('design'),t.id);
      if(t.status==='saved')html+=`<div class="iw-toolbar"><a class="button" href="${base}tasks/${e(t.id)}/bundle">下载完整方案包</a><a class="button" href="${base}tasks/${e(t.id)}/report" target="_blank">下载方案摘要</a><a class="button" href="http://127.0.0.1:3046/" target="_blank" rel="noopener noreferrer">打开 LUMINA</a></div><p class="iw-note">在 LUMINA 方案菜单选择“${e(t.plan_name)}”；完整设计、清单和打印报告沿用 LUMINA 原功能。</p>`;
    }
    html+=`<details open><summary>工作日志（${arr(t.logs).length}）</summary><ol class="iw-logs">${arr(t.logs).slice(-80).map(l=>`<li><time>${e(when(l.time))}</time><span>${e(l.message)}</span></li>`).join('')}</ol></details></section>`;n.innerHTML=html;
    if(t.status==='draft'){const slot=n.querySelector('#iw-generation-slot');if(slot){if(oldForm)slot.append(oldForm);else slot.innerHTML=generationForm(t);}}
  }
  function message(v,error=false){const n=document.getElementById('iw-message');if(n){n.textContent=v;n.className=error?'iw-error':'iw-note';}}
  async function reload(){const own=generation,result=await api('tasks'+(customerId()?'?customer_id='+encodeURIComponent(customerId()):''));if(own!==generation)return;state.items=arr(result.items);taskList();detail();}
  async function status(){message('正在检查服务身份…');const own=generation,result=await api('status');if(own!==generation)return;const n=document.getElementById('iw-engine-status');if(n)n.textContent=Object.entries(result.engines).map(([k,v])=>(k==='products'?'产品爬虫':'LUMINA')+'：'+(v.available?'服务在线':'未连接')).join(' · ');message(result.notice);}
  function catalogView(){
    const n=document.getElementById('iw-catalog');if(!n)return;
    const market=document.querySelector('#iw-new [name=countries]')?.value;
    const rows=arr(state.catalog?.rows).filter(r=>!r.country||r.country===market);
    const choices=[...new Set(rows.map(r=>r.category||'待分类'))].sort();
    const shown=rows.filter(r=>!state.category||(r.category||'待分类')===state.category);
    n.innerHTML=`<p class="iw-note">当前页读取 ${arr(state.catalog?.rows).length} 条，当前市场 ${e(market)} 或待核对 ${rows.length} 条；品牌库共 ${e(state.catalog?.total)} 条。跨页商品请翻页，品类为规则建议。</p>${select('catalog_category','当前页品类建议',[['','全部品类'],...choices.map(c=>[c,c])],state.category||'')}${shown.map(r=>`<article class="iw-notice"><h4>${e(r.title||'名称缺失')}</h4><p>${e(r.country||'国家待核对')} · ${e(r.brand||'品牌待核对')}<br>品类建议：${e(r.category||'待分类')}<br>品牌归档依据：${e(r.identity_basis||'未记录')}<br>${e(r.price_text)} · ${e(r.sales_text)}<br>采集于 ${e(r.observed_at||'未记录')}</p>${r.url?`<a href="${e(r.url)}" target="_blank" rel="noopener noreferrer">商品原文</a>`:''}${btn('accept-product','核对后采纳',!canAdopt()||!customerId()||r.country!==market,r.key)}</article>`).join('')}<div class="iw-toolbar">${btn('catalog-prev','上一页',!state.offset)}${btn('catalog-next','下一页',state.offset+100>=state.catalog?.total)}</div>`;
  }
  async function loadCatalog(){const own=generation,r=await api('catalog?brand='+encodeURIComponent(state.brand)+'&offset='+state.offset);if(own!==generation)return;state.catalog=r;catalogView();}
  async function click(b){
    const a=b.dataset.iw,id=b.dataset.id;
    if(a==='close'){close();return;}
    if(a.startsWith('tab-')){state.kind=a.slice(4);state.selected='';document.getElementById('iw-form').innerHTML=newForm();document.getElementById('iw-detail').innerHTML='';document.querySelectorAll('#iw-brands,#iw-catalog').forEach(n=>n.replaceChildren());await open(state.kind,{customer:state.customer,countries:state.countries});return;}
    if(a==='start-products'||a==='start-design'){const r=await api('engines/'+(a==='start-products'?'products':'design')+'/start','POST',{});message(r.message);return;}if(a==='status')return status();if(a==='reload')return reload();
    if(a==='select'){state.selected=id;taskList();detail();return;}
    if(a==='brands'){const own=generation,r=await api('catalog');if(own!==generation)return;state.brands=arr(r.brands);document.getElementById('iw-brands').innerHTML=select('brand','品牌档案',[['','请选择已有品牌'],...state.brands.map(v=>[v.id,v.brand])]);return;}
    if(a==='catalog-next'||a==='catalog-prev'){state.offset=Math.max(0,state.offset+(a==='catalog-next'?100:-100));return loadCatalog();}
    if(a==='accept-product'){await api('catalog/accept','POST',{customer_id:customerId(),brand:state.brand,key:id,offset:state.offset,country:document.querySelector('#iw-new [name=countries]')?.value});message('已采纳到客户“产品与市场”，重复采纳保留同一记录。');return;}
    if(a==='design-notice'){const t=current(),r=t?.results.find(r=>r.id===id);if(r)return open('design',{customer:state.customer,countries:state.countries,seed:{title:r.title.slice(0,200),source:{task:t.id,notice:id}}});return;}
    if(a==='adopt-notice'){await api('tasks/'+current().id+'/adopt-notice','POST',{notice_id:id,customer_id:customerId()});message('已保存为待确认机会。请到客户“机会与行动”核实、确认并立项。');return reload();}
    if(['cancel','refresh-task','save-plan'].includes(a)){await api('tasks/'+id+'/'+({'refresh-task':'refresh'}[a]||a),'POST',{});return reload();}
  }
  async function submit(form){
    const data=new FormData(form),v=Object.fromEntries(data);let result;
    if(form.id==='iw-new'){
      const payload={kind:state.kind,customer_id:customerId(),countries:data.getAll('countries'),request_key:form.dataset.key||(form.dataset.key=crypto.randomUUID())};
      if(state.kind==='design')Object.assign(payload,{project_id:v.project_id,title:v.title,brief:v.brief,assumptions:v.assumptions,...(v.source_task_id?{source_task_id:v.source_task_id,source_notice_id:v.source_notice_id}:{})});
      else Object.assign(payload,{keyword:v.keyword,title:state.customer?.name||'',limit:Number(v.limit),...(state.kind==='tenders'?{notice_scope:v.notice_scope}:{}),...(state.kind==='products'?{pages:Number(v.pages),research_context:v.research_context||''}:{})});
      result=await api('tasks','POST',payload);form.dataset.key='';
    }else{
      const t=current();result=await api('tasks/'+t.id+'/generate','POST',{...Object.fromEntries(Object.entries(v).filter(([k])=>k!=='source'&&k!=='confirmed').map(([k,v])=>[k,Number(v)])),source:v.source,confirmed:data.has('confirmed'),expected_version:t.version});
    }
    state.selected=result.item.id;message('已保存任务，工作日志会自动更新。');await reload();
  }
  // Show the existing identity-checked application, not a second editor.
  // Only a fixed local origin may be embedded. Online/read-only roles cannot
  // use the frame to bypass department permissions or reach their own loopback.
  async function openStudio(options={}){
    const product=options.engine==='products',kind=product?'products':'design',title=product?'爬虫技能启动台':'LUMINA 照明方案台',engineName=product?'产品启动台':'LUMINA',recordsLabel=product?'商品采纳与日志':'项目方案与日志',expectedURL=product?'http://127.0.0.1:8765':'http://127.0.0.1:3046';
    close();previousFocus=document.activeElement;const own=++generation;
    const dialog=document.createElement('dialog');dialog.id='iw-studio';dialog.className='iw-studio';dialog.setAttribute('aria-label',title);
    dialog.innerHTML=`<header class="iw-studio-header"><button type="button" class="button" data-studio="back">← 返回情报操作台</button><div><strong>${e(title)}</strong><span>${e(options.customer?.name||'')}${product&&options.countries?.length?' · 市场参考：'+e(options.countries.join(', ')):''}</span></div><button type="button" class="button" data-studio="records">${e(recordsLabel)}</button><a id="iw-studio-external" class="button" hidden target="_blank" rel="noopener noreferrer">独立窗口打开</a></header><div class="iw-studio-content"><section id="iw-studio-state" role="status"><h2>正在连接${e(engineName)}…</h2><p>${product?'只打开原工作台；请在其中确认品牌和国家后启动采集。':'打开设计界面不会自动生成方案或调用模型。'}</p></section></div>`;
    const content=dialog.querySelector('.iw-studio-content'),notice=dialog.querySelector('#iw-studio-state');
    const live=()=>own===generation&&dialog.isConnected;
    let checking=false;
    const show=(title,body,retry=false,start=false)=>{if(!live())return;notice.hidden=false;notice.innerHTML=`<h2>${e(title)}</h2><p>${e(body)}</p>${retry?'<button type="button" class="button" data-studio="retry">重新连接</button>':''}${start?'<button type="button" class="button button-primary" data-studio="start">启动本机 ${e(engineName)} 并进入</button>':''}`;};
    async function connect(){
      if(!live()||checking)return false;checking=true;
      try{
        const result=await api('status');if(!live())return false;
        const engine=result.engines?.[kind];
        if(!engine?.available||engine.url!==expectedURL){
          show(engineName+' 尚未就绪',engine?.message||'请启动本机 '+engineName+'，再重新连接。',true,true);return false;
        }
        show('正在打开'+engineName+'…','首次加载可能需要几秒。');
        const frame=document.createElement('iframe');frame.title=product?'爬虫技能启动台完整操作界面':'LUMINA 完整照明设计界面';frame.className='iw-studio-frame';frame.hidden=true;frame.allow='fullscreen';
        const external=dialog.querySelector('#iw-studio-external');external.href=engine.url+(product?'/launchpad':'/');external.hidden=false;
        frame.addEventListener('load',()=>{if(!live())return;clearTimeout(studioTimer);notice.hidden=true;frame.hidden=false;});
        // If the service disappears after health verification, retain a usable
        // return/retry path instead of leaving the user inside an empty pane.
        studioTimer=setTimeout(()=>{if(live()&&frame.hidden){frame.remove();show('界面加载较慢','可以重新连接，或使用右上角的独立窗口打开。',true);}},20000);
        content.querySelector('iframe')?.remove();frame.src=engine.url+(product?'/launchpad?embed=lumipilot':'/');content.append(frame);return true;
      }catch(error){show('无法连接'+engineName,error.message,true,true);return false;}finally{checking=false;}
    }
    dialog.addEventListener('cancel',ev=>{ev.preventDefault();close();});
    dialog.addEventListener('click',async ev=>{
      const b=ev.target.closest('[data-studio]');if(!b||b.disabled)return;
      if(b.dataset.studio==='back'){close();return;}
      if(b.dataset.studio==='records'){await open(kind,options);return;}
      if(b.dataset.studio==='retry'){clearTimeout(studioTimer);await connect();return;}
      if(b.dataset.studio==='start'){
        b.disabled=true;
        try{
          await api('engines/'+kind+'/start','POST',{});if(!live())return;
          show('正在启动'+engineName+'…','启动器正在检查本机资源；就绪后自动进入，不启动业务任务。');
          let attempts=0;
          const poll=async()=>{if(!live())return;if(await connect())return;if(!live())return;if(++attempts>=15){show(engineName+' 尚未启动完成','请检查本机启动器，然后重新连接。',true,true);return;}show('正在等待'+engineName+'就绪…','完成启动检查后自动进入。');studioTimer=setTimeout(poll,2000);};
          studioTimer=setTimeout(poll,2000);
        }catch(error){show('启动未完成',error.message,true,true);}
      }
    });
    document.body.append(dialog);dialog.showModal();
    const auth=ctx.auth?.()||{};
    if(auth.mode!=='local'||auth.readonly||auth.workspace_readonly||!can(kind)){
      show('请在本机'+(product?'销售':'研发')+'或管理者工作台打开','完整界面使用本机'+engineName+'。当前账号可从“'+recordsLabel+'”查看共享成果。');return;
    }
    await connect();
  }
  async function open(kind,options={}){
    close();if(!names[kind])return;previousFocus=document.activeElement;state={kind,customer:options.customer,countries:options.countries||[],items:[],offset:0,selected:options.selectedTask||''};const own=++generation;
    const dialog=document.createElement('dialog');dialog.id='iw-dialog';dialog.className='iw-dialog';dialog.setAttribute('aria-labelledby','iw-title');dialog.innerHTML=shell(options.seed);dialog.addEventListener('cancel',ev=>{ev.preventDefault();close();});document.body.append(dialog);dialog.showModal();
    try{await reload();if(own!==generation)return;timer=setInterval(()=>reload().catch(error=>message(error.message,true)),4000);}catch(error){if(own===generation)message(error.message,true);}
  }
  function close(){++generation;clearInterval(timer);timer=null;clearTimeout(studioTimer);studioTimer=null;const studio=document.getElementById('iw-studio');studio?.close();studio?.remove();const d=document.getElementById('iw-dialog');d?.close();d?.remove();previousFocus?.focus?.();}
  function init(context){ctx=context;if(bound)return;bound=true;window.addEventListener('hashchange',close);document.addEventListener('click',async ev=>{const b=ev.target.closest?.('#iw-dialog [data-iw]');if(!b||b.disabled||busy)return;ev.preventDefault();busy=true;const own=generation;try{await click(b);}catch(error){if(own===generation)message(error.message,true);}finally{busy=false;}});document.addEventListener('submit',async ev=>{if(!ev.target.matches('#iw-new,#iw-generate'))return;ev.preventDefault();if(busy)return;busy=true;const own=generation;try{await submit(ev.target);}catch(error){if(own===generation)message(error.message,true);}finally{busy=false;}});document.addEventListener('change',async ev=>{if(ev.target.matches('#iw-brands [name=brand]')){state.brand=ev.target.value;state.offset=0;state.category='';try{await loadCatalog();}catch(error){message(error.message,true);}}if(ev.target.matches('#iw-new [name=countries]')){state.category='';catalogView();}if(ev.target.matches('#iw-catalog [name=catalog_category]')){state.category=ev.target.value;catalogView();}});}
  return {init,open,openStudio,openProductStudio:options=>openStudio({...options,engine:'products'}),close};
})();
