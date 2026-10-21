'use strict';

// The published view uses the existing workbench and its saved records. It has
// no business writes: records stay within the publication manifest. An optional
// protected deployment forwards authentication to its authoritative server.
(() => {
  const originalFetch = window.fetch.bind(window);
  const base = new URL('./', document.baseURI);
  const authenticatedShare = document.body?.dataset?.authenticatedShare === 'true';
  const readonlyMessage = '当前链接为只读浏览；新增、编辑、上传及实时查询请在完整工作台操作。';
  const unavailableMessage = '本次发布未包含这项已保存资料，请回到项目目录查看已有内容。';
  let snapshot;
  const clone = value => JSON.parse(JSON.stringify(value));
  const json = (value, status = 200) => new Response(JSON.stringify(value), {status, headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store'}});
  const error = (code, message, status) => json({readonly:true,error:{code,message},message}, status);
  const fold = value => String(value || '').normalize('NFKC').toLocaleLowerCase();
  const any = value => !value || ['ALL','all'].includes(value);
  const array = value => Array.isArray(value) ? value : [];
  const manifest = () => snapshot?.api || {};
  function canonical(path) {
    const url = new URL(path, base);
    const params = [...url.searchParams.entries()].sort(([a,av],[b,bv]) => a.localeCompare(b) || av.localeCompare(bv));
    const query = new URLSearchParams(params).toString();
    return url.pathname + (query ? '?' + query : '');
  }
  function getEntry(path) {
    const api = manifest(), key = canonical(path);
    if(Object.hasOwn(api, path))return api[path];
    if(Object.hasOwn(api, key))return api[key];
    const match = Object.keys(api).find(candidate => canonical(candidate) === key);
    return match === undefined ? undefined : api[match];
  }
  function catalogue(path) {
    const direct = getEntry(path);
    if(direct !== undefined)return direct;
    const candidate = Object.keys(manifest()).find(key => new URL(key,base).pathname === path);
    return candidate === undefined ? undefined : manifest()[candidate];
  }
  function applicable(row, product, smart) {
    const products = array(row.products);
    if(row.dimension === 'radio' && !smart && product !== 'smart')return false;
    if(product === 'smart')return row.dimension === 'radio' && products.includes('smart');
    return any(product) || products.includes(product) || products.includes('ALL') || (smart && row.dimension === 'radio' && products.includes('smart'));
  }
  function filteredCompliance(source, params) {
    const value = clone(source), country=params.get('country') || 'ALL', product=params.get('product') || 'ALL', dimension=params.get('dimension') || 'ALL', query=params.get('q') || '', smart=params.get('smart') === '1';
    const terms = fold(query).trim().split(/\s+/).filter(Boolean);
    value.countries = array(value.countries).filter(profile => any(country) || profile.code === country).map(profile => ({...profile,requirements:array(profile.requirements).filter(row => applicable(row,product,smart) && (any(dimension) || row.dimension === dimension) && terms.every(term => fold(profile.name+' '+profile.code+' '+JSON.stringify(row)).includes(term)))})).filter(profile => profile.requirements.length || profile.code === country);
    value.technical_basics = array(value.technical_basics).filter(row => applicable(row,product,smart));
    value.filters = {country,product,dimension,q:query,smart};
    value.counts = {...value.counts,visible_markets:value.countries.length,visible_requirements:value.countries.reduce((sum,row) => sum+row.requirements.length,0)};
    return value;
  }
  function filteredKnowledge(source, params) {
    const country=params.get('country'), category=params.get('category'), sourceKind=params.get('source_kind') || 'all', query=fold(params.get('q')).trim();
    const words = [...new Set((query.match(/[a-z0-9]+|[\u4e00-\u9fff]+/g) || []).flatMap(term => /[\u4e00-\u9fff]/.test(term) ? [term,...Array.from({length:Math.max(0,term.length-1)},(_,i) => term.slice(i,i+2))] : [term]))];
    const entries = array(source.entries).filter(row => (sourceKind !== 'uploaded' || row.source_type === 'uploaded') && (any(country) || [country,'ALL'].includes(row.country || 'ALL')) && (any(category) || (row.knowledge_kind === 'market_access' ? applicable({products:row.product_categories,dimension:row.dimension},category,false) : [category,'ALL'].includes(row.category || 'ALL')))).map(row => ({...row,score:words.length ? words.reduce((score,term) => score+(fold(row.title).includes(term) ? 3 : fold(row.text || row.excerpt || row.summary).includes(term) ? 1 : 0),0) : 1})).filter(row => row.score > 0).sort((a,b) => b.score-a.score || Number(a.source_type!=='uploaded')-Number(b.source_type!=='uploaded'));
    return {...clone(source),entries,documents:array(source.documents).filter(row => any(country) || [country,'ALL'].includes(row.country || 'ALL'))};
  }
  function filteredMarket(source, params) {
    const rows = Array.isArray(source) ? source : array(source.products), country=params.get('country'), category=params.get('category'), query=fold(params.get('q')).trim(), dataset=params.get('dataset') || 'all';
    const projectId=params.get('project_id'), project=projectId ? array(catalogue('/api/projects')?.projects).find(row=>row.id===projectId) : null;
    const requested=Number(params.get('limit') || 100), limit=Number.isInteger(requested) && requested>0 ? Math.min(500,requested) : 100;
    const selected=rows.filter(row => (!projectId || project && row.country===project.country && row.category===project.category) && (any(country) || row.country === country) && (any(category) || row.category === category) && (dataset === 'all' || (dataset === 'collected') === Boolean(row.collected_at)) && (!query || fold([row.name,row.brand,row.category_label,row.country,row.market_label].join(' ')).includes(query))).slice(0,limit);
    return Array.isArray(source) ? selected : {...clone(source),products:selected};
  }
  function publishedSourcePlan(projectId) {
    const project=array(catalogue('/api/projects')?.projects).find(row=>row.id===projectId);
    if(!project)return undefined;
    const country=project.country, category=project.category, sources=[], byHost=new Map();
    const notice='仅从原公开资料整理，未重新访问网站；不代表当前可售或完整渠道覆盖。';
    const host=url=>{try{const value=new URL(url);return value.protocol==='https:'&&!value.username&&!value.password?value.hostname.toLowerCase():'';}catch{return '';}};
    // A registry headquarters country or a Global catalogue cannot establish
    // availability in the project's sales country. Use explicit market fields.
    for(const row of array(catalogue('/api/crawler/sources')?.sources)){
      if(row.country!==country)continue;
      const value=clone(row), key=host(value.homepage)||host(value.default_url);
      if(!key || !value.id || byHost.has(key))continue;
      value.role=value.role || (value.kind==='marketplace-page'?'marketplace':'brand');
      value.historical_count=0;
      value.notice=[value.notice,notice].filter(Boolean).join(' ');
      value.scope_basis='published-sales-country';
      sources.push(value);byHost.set(key,value);
    }
    const catalogueRows=catalogue('/api/market/products');
    const products=Array.isArray(catalogueRows)?catalogueRows:array(catalogueRows?.products);
    const seen=new Set();
    for(const row of [...products,...array(project.market_references)]){
      if(row.country!==country || row.category!==category)continue;
      const key=host(row.url), identity=String(row.id||'')+'|'+String(row.url||'');
      if(!key || seen.has(identity))continue;
      seen.add(identity);
      let source=byHost.get(key);
      if(!source){
        source={id:'published-site-'+key,name:key,country,homepage:'https://'+key+'/',default_url:row.url,
          available:false,modes:[],historical_count:0,scope_basis:'published-product-url',notice};
        sources.push(source);byHost.set(key,source);
      }
      source.historical_count++;
    }
    return {country,sources,coverage:{known:sources.length,available:sources.filter(row=>row.available).length,
      historical:sources.filter(row=>row.historical_count>0).length,notice},source_mode:'published_records_only'};
  }
  function findData(url) {
    const api = manifest(), path=url.pathname;
    // A newer interface must also open against an older, approved publication.
    // Missing collections are explicitly unpublished, never imported from the
    // operator's live database or presented as a completed collection.
    if (path.startsWith('/api/business/') && catalogue(path) === undefined) {
      const absent = {readonly:true,published:false,notice:'原公开快照未包含此类业务记录；本机资料未自动公开。'};
      const resource=path.slice('/api/business/'.length);
      if(resource==='customers')return {...absent,customers:[]};
      if(['products','jobs','actions','opportunities','decisions','suppliers','materials','standards','material-relations','procurement-records','settlement-rules'].includes(resource))return {...absent,items:[],jobs:[]};
      if(resource==='imports/templates')return {...absent,templates:[]};
      if(resource==='news')return {...absent,events:[],jobs:[],pending_actions:[],human_actions:[]};
      if(resource==='workbench')return {...absent,actions:[],opportunities:[],decisions:[],jobs:[]};
      if(resource==='production-focus')return {...absent,materials:[],suppliers:[],alerts:[]};
      if(/^projects\/[a-f0-9]{12}\/product-links$/.test(resource))return {...absent,items:[]};
    }
    // These filters run against the published catalogue, never the public web.
    if(path === '/api/compliance') {const source=catalogue(path);return source === undefined ? undefined : filteredCompliance(source,url.searchParams);}
    if(path === '/api/knowledge') {const source=catalogue(path);return source === undefined ? undefined : filteredKnowledge(source,url.searchParams);}
    if(path === '/api/crawler/jobs') {const source=catalogue(path), projectId=url.searchParams.get('project_id');return source === undefined ? undefined : {...clone(source),jobs:array(source.jobs).filter(row=>!projectId || row.project_id===projectId)};}
    if(path === '/api/market/products') {const source=catalogue(path);return source === undefined ? undefined : filteredMarket(source,url.searchParams);}
    if(path === '/api/knowledge/documents') {const source=catalogue(path), country=url.searchParams.get('country');return source === undefined ? undefined : {...clone(source),documents:array(source.documents).filter(row => any(country) || [country,'ALL'].includes(row.country || 'ALL'))};}
    const exact=getEntry(path+url.search);
    if(exact !== undefined)return exact;
    const sourcePlan=path.match(/^\/api\/projects\/([a-f0-9]{12})\/sources$/);
    if(sourcePlan)return publishedSourcePlan(sourcePlan[1]);
    // Exported history/candles are immutable. A display parameter cannot turn
    // them into a new live fetch; the chart still shows the original source date.
    if(/^\/api\/materials\/[a-z_]+\/(candles|history)$/.test(path))return catalogue(path);
    if(!url.search && Object.hasOwn(api,path))return api[path];
    return undefined;
  }
  function fileUrl(path) {
    const relative=snapshot?.file_map?.[path] || snapshot?.file_map?.[canonical(path)];
    if(typeof relative !== 'string' || !relative || /^(?:[a-z]+:|\/)/i.test(relative) || relative.split('/').includes('..'))return '';
    const url=new URL(relative,base);
    return url.origin === base.origin && url.pathname.startsWith(base.pathname) ? url.href : '';
  }
  const ready=originalFetch(new URL('share-data.json',base).href,{cache:'no-cache'}).then(async response => {
    if(!response.ok) {
      if(authenticatedShare && response.status === 401)throw new Error('登录已失效，请重新登录后查看授权资料。');
      if(authenticatedShare && response.status === 403)throw new Error('当前账户尚未获准查看授权资料，请在账户页面检查审批状态。');
      throw new Error(authenticatedShare ? '授权资料暂未载入，请刷新页面后重试。' : '公开资料暂未载入，请刷新页面后重试。');
    }
    const value=await response.json();
    if(value?.schema_version !== 1 || !value.api || typeof value.api !== 'object')throw new Error(authenticatedShare ? '授权资料清单格式无法读取。' : '公开资料清单格式无法读取。');
    snapshot=value;
    if(document.body?.dataset.interfaceUpdate === 'true') {
      const response=await originalFetch(new URL('interface-data.json',base).href,{cache:'no-cache'});
      if(!response.ok)throw new Error('最新版界面说明未载入，请刷新后重试。');
      const current=await response.json();
      if(current.schema_version!==1 || !Array.isArray(current.manual?.sections))throw new Error('界面发布资料格式无效。');
      // Documentation is program content. The public business snapshot and
      // its original timestamps/files remain byte-for-byte unchanged on disk.
      snapshot.api['/api/manual']=current.manual;
      snapshot.file_map={...snapshot.file_map,'/api/manual/export':'./files/LumiPilot-current-manual.pdf'};
    }
    applyReadonly();
    return {published_at:value.published_at,readonly:true};
  });
  // init() consumes the same promise through intercepted auth requests. Keep a
  // handler here so a failed static asset does not become an unhandled rejection.
  ready.catch(() => {});
  window.LumiShare={ready,readonly:true,authenticated:authenticatedShare,get publication(){return snapshot ? {published_at:snapshot.published_at,schema_version:1} : null;},fileUrl};
  window.fetch=async (input, options={}) => {
    const url=new URL(typeof input === 'string' || input instanceof URL ? input : input.url,base);
    if(url.origin !== base.origin || !url.pathname.startsWith('/api/'))return originalFetch(input,options);
    // Only the Worker/server can authenticate users. Preserve Request bodies,
    // cookies, CSRF headers and status responses for every identity endpoint.
    if(authenticatedShare && url.pathname.startsWith('/api/auth/'))return originalFetch(input,options);
    const method=String(options.method || input?.method || 'GET').toUpperCase();
    if(method !== 'GET')return error('share_readonly',readonlyMessage,405);
    try {await ready;} catch(err) {return error('share_unavailable',err.message,503);}
    if(url.pathname === '/api/auth/me')return json({mode:'local',user:null,can_manage:false,csrf_token:null,readonly:true});
    if(url.pathname === '/api/auth/status')return json({mode:'local',readonly:true,mail_ready:false});
    if(url.pathname.startsWith('/api/auth/'))return error('share_readonly',readonlyMessage,403);
    const asset=fileUrl(url.pathname+url.search) || fileUrl(url.pathname);
    if(asset)return originalFetch(asset,{...options,method:'GET',credentials:authenticatedShare ? 'same-origin' : 'omit'});
    const value=findData(url);
    return value === undefined ? error('share_record_not_published',unavailableMessage,404) : json(value);
  };

  const {allowedForms,blockedInputs,hiddenPanels,selector,isBlocked,applyControls}=window.LumiWorkspaceAccess;
  function setText(node,text) {if(node && node.textContent !== text)node.textContent=text;}
  function markDisabled(node,hide=false) {
    if('disabled' in node && !node.disabled)node.disabled=true;
    if(node.getAttribute('aria-disabled') !== 'true')node.setAttribute('aria-disabled','true');
    if(node.title !== readonlyMessage)node.title=readonlyMessage;
    if(hide && !node.hidden)node.hidden=true;
  }
  function time(value) {
    const date=new Date(value);
    return Number.isFinite(date.getTime()) ? new Intl.DateTimeFormat('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Shanghai'}).format(date) : '日期未提供';
  }
  function escape(value) {return String(value ?? '').replace(/[&<>"']/g,c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function savedOptical() {
    const frame=document.querySelector('#optical-frame');
    if(!frame)return;
    const projects=array(catalogue('/api/projects')?.projects), id=document.querySelector('#project-picker')?.value, project=projects.find(row => row.id === id), optical=project?.optical, summary=optical?.summary || optical;
    const host=frame.closest('.optical-workbench') || frame.parentElement;
    const scene=optical?.scene || {};
    const source={concept:'概念配光输入',demo:'合成配光样例','uploaded-unverified':'上传光度文件 · 来源待核验'}[optical?.source_type || project?.photometry?.source_type] || '来源需核验';
    host.innerHTML=`<div class="share-optical-saved"><span class="share-readonly-label">已保存分析</span><h3>${summary ? '直接光照度结果与输入依据' : '尚未保存光学场景'}</h3><p>${summary ? '上方指标来自当前项目已保存的光学摘要。' : '当前项目未保存照度结果，数值保持未知。'} ${optical?.spec_changed ? '产品定义已改变，旧结果的适用性需要重新核对。' : ''}</p><dl><div><dt>光度输入</dt><dd>${escape(project?.photometry?.filename || optical?.filename || '尚未保存')}</dd></div><div><dt>来源口径</dt><dd>${escape(source)}</dd></div><div><dt>计算范围</dt><dd>直接光；未计反射、遮挡、日光和 UGR</dd></div></dl>${Object.keys(scene).length ? `<details><summary>查看保存的场景条件</summary><pre>${escape(JSON.stringify(scene,null,2))}</pre></details>` : ''}<p class="inline-note">导入光度文件、调整场景和重新计算需要完整工作台服务。</p></div>`;
    setText(document.querySelector('#optical-preview-state'),'只读显示已保存结果；指标与光度输入仍需工程核验。');
    setText(document.querySelector('#optical-input-label'),`目标 ${project?.spec?.power_w ?? '未知'} W / ${project?.spec?.luminous_flux_lm ?? '未知'} lm · ${project?.photometry?.filename ? '已保存输入：'+project.photometry.filename : '光度原件待补充'}`);
    document.querySelector('.optical-toolbar')?.setAttribute('hidden','');
  }
  function applyReadonly() {
    if(!document.body)return;
    document.body.classList.add('lumi-share-view');
    const shell=document.querySelector('.main-shell'), topbar=document.querySelector('.topbar');
    if(shell && topbar && !document.querySelector('#share-publication-note')) {
      const note=document.createElement('div');note.id='share-publication-note';note.className='share-publication-note';
      note.innerHTML=authenticatedShare ? '<span>授权查看 · 本链接仅提供已保存资料，原始来源时点保持不变</span><a href="#access">账户与访问 ↗</a>' : '<span>最新版界面 · 公开资料只读浏览，实时采集需完整后台</span><a href="http://127.0.0.1:8790/#workbench?view=intelligence" target="_blank" rel="noopener">打开本机完整工作台 ↗</a>';
      topbar.insertAdjacentElement('afterend',note);
    }
    if(!authenticatedShare)document.querySelectorAll('a[href="#access"],[data-page="access"]').forEach(node => {if(!node.hidden)node.hidden=true;});
    // Authentication forms may mutate accounts, while business forms remain read-only.
    applyControls(document,{snapshot:!authenticatedShare,note:readonlyMessage});
    const consoleRoot=document.querySelector('#intelligence-console-root');
    if(consoleRoot && !consoleRoot.querySelector('.share-console-scope')) {
      const scope=document.createElement('div');scope.className='notice share-console-scope';scope.setAttribute('role','note');
      scope.textContent='此页使用本机最新版情报操作台。原公开资料未包含客户人物与产品研究库，因此不会展示本机私有客户或虚构采集成果。请打开本机完整工作台执行 LinkedIn、Amazon 采集和 DeepSeek 分析。';
      consoleRoot.querySelector('.ic-heading')?.insertAdjacentElement('afterend',scope);
    }
    document.querySelectorAll('[data-intelligence-action="retry-job"],[data-intelligence-action="select-sources"]').forEach(node=>markDisabled(node,true));
    document.querySelectorAll('a[href]').forEach(link => {
      const href=link.getAttribute('href');
      if(!href?.startsWith('/api/') || authenticatedShare && href.startsWith('/api/auth/'))return;
      const asset=fileUrl(href);
      if(asset){link.href=asset;link.dataset.shareFile='true';return;}
      link.dataset.shareUnavailable='true';
      link.removeAttribute('href');
      markDisabled(link);
      if(!link.classList.contains('share-unavailable-link'))link.classList.add('share-unavailable-link');
      link.title='此文件未包含在本次发布中。';
    });
    setText(document.querySelector('.workspace-name small'),'照明研发资料工作空间');
    const stamp=time(snapshot?.published_at);
    setText(document.querySelector('.local-pill'),'只读浏览 · 资料更新于 '+stamp);
    const note=document.querySelector('.sidebar-note');
    if(note && note.dataset.shareNote !== 'true') {note.dataset.shareNote='true';note.innerHTML=`<span class="status-dot"></span><strong>${authenticatedShare ? '授权资料' : '公开资料'} · 只读浏览</strong><p>查看项目、知识索引与已保存分析。实时采集与资料维护在完整工作台完成。</p><span class="version">LUMIPILOT / SHARED VIEW</span>`;}
    const dbNote=document.querySelector('.project-db-tabs > span');if(dbNote)setText(dbNote,'进入项目查看研发记录，展开档案核对来源。');
    const editable=document.querySelector('#spec-form')?.closest('.panel')?.querySelector('.panel-header .tag');if(editable)setText(editable,'已保存目标');
    document.querySelectorAll('#content .heading-actions [data-action="navigate"][data-page="solution"]').forEach(node => setText(node,'查看产品定义'));
    setText(document.querySelector('#crawl-refresh-state'),'发布时已保存的任务记录');
    setText(document.querySelector('.project-source-coverage small'),'仅按原公开资料中的明确销售国整理来源；未重新访问网站，不代表完整渠道覆盖。');
    setText(document.querySelector('.project-source-plan .references-empty'),'原公开资料未保存本销售国来源清单；此页不自动检索或补充网站。');
    const chartNote=document.querySelector('#materials-refresh-status > small');if(chartNote)setText(chartNote,'仅显示已保存行情与原始源时点；本链接不实时获取价格');
    if(!authenticatedShare && location.hash.split('?')[0] === '#access')location.replace('#projects');
    if(snapshot)savedOptical();
  }
  function announce() {
    const toast=document.querySelector('#toast');
    if(toast){toast.textContent=readonlyMessage;toast.className='visible';window.setTimeout(() => {toast.className='';},3600);}
  }
  document.addEventListener('click',event => {
    const target=event.target.closest?.(selector+',a[data-share-unavailable]');
    if(!target || (!isBlocked(target) && !target.dataset.shareUnavailable))return;
    event.preventDefault();event.stopImmediatePropagation();announce();
  },true);
  document.addEventListener('submit',event => {
    if(allowedForms.has(event.target?.id) || authenticatedShare && event.target?.id?.startsWith('auth-'))return;
    event.preventDefault();event.stopImmediatePropagation();announce();
  },true);
  document.addEventListener('drop',event => {event.preventDefault();event.stopImmediatePropagation();announce();},true);
  document.addEventListener('dragover',event => {event.preventDefault();event.stopImmediatePropagation();},true);
  document.addEventListener('change',event => {
    if(event.target.matches?.('input[type="file"],'+blockedInputs)) {event.preventDefault();event.stopImmediatePropagation();if(event.target.type === 'file')event.target.value='';}
  },true);
  // Prevent the existing optical view from navigating a server-only iframe
  // before the mutation observer can replace it with the saved-result view.
  const html=Object.getOwnPropertyDescriptor(Element.prototype,'innerHTML');
  if(html?.set && html.configurable)Object.defineProperty(Element.prototype,'innerHTML',{...html,set(value){html.set.call(this,typeof value === 'string' && value.includes('id="optical-frame"') ? value.replace(/src="\/lab\?embed=1"/g,'src="about:blank"') : value);}});
  const observer=new MutationObserver(applyReadonly);
  observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden','href']});
  document.addEventListener('DOMContentLoaded',applyReadonly,{once:true});
  applyReadonly();
})();
