'use strict';

// The published view uses the existing workbench and its saved records. It has
// no application server: requests must stay within the publication manifest.
(() => {
  const originalFetch = window.fetch.bind(window);
  const base = new URL('./', document.baseURI);
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
    const requested=Number(params.get('limit') || 100), limit=Number.isInteger(requested) && requested>0 ? Math.min(500,requested) : 100;
    const selected=rows.filter(row => (any(country) || row.country === country) && (any(category) || row.category === category) && (dataset === 'all' || (dataset === 'collected') === Boolean(row.collected_at)) && (!query || fold([row.name,row.brand,row.category_label,row.country,row.market_label].join(' ')).includes(query))).slice(0,limit);
    return Array.isArray(source) ? selected : {...clone(source),products:selected};
  }
  function findData(url) {
    const api = manifest(), path=url.pathname;
    // These filters run against the published catalogue, never the public web.
    if(path === '/api/compliance') {const source=catalogue(path);return source === undefined ? undefined : filteredCompliance(source,url.searchParams);}
    if(path === '/api/knowledge') {const source=catalogue(path);return source === undefined ? undefined : filteredKnowledge(source,url.searchParams);}
    if(path === '/api/market/products') {const source=catalogue(path);return source === undefined ? undefined : filteredMarket(source,url.searchParams);}
    if(path === '/api/knowledge/documents') {const source=catalogue(path), country=url.searchParams.get('country');return source === undefined ? undefined : {...clone(source),documents:array(source.documents).filter(row => any(country) || [country,'ALL'].includes(row.country || 'ALL'))};}
    const exact=getEntry(path+url.search);
    if(exact !== undefined)return exact;
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
    if(!response.ok)throw new Error('公开资料暂未载入，请刷新页面后重试。');
    const value=await response.json();
    if(value?.schema_version !== 1 || !value.api || typeof value.api !== 'object')throw new Error('公开资料清单格式无法读取。');
    snapshot=value;
    applyReadonly();
    return {published_at:value.published_at,readonly:true};
  });
  // init() consumes the same promise through intercepted auth requests. Keep a
  // handler here so a failed static asset does not become an unhandled rejection.
  ready.catch(() => {});
  window.LumiShare={ready,readonly:true,get publication(){return snapshot ? {published_at:snapshot.published_at,schema_version:1} : null;},fileUrl};
  window.fetch=async (input, options={}) => {
    const url=new URL(typeof input === 'string' || input instanceof URL ? input : input.url,base);
    if(url.origin !== base.origin || !url.pathname.startsWith('/api/'))return originalFetch(input,options);
    const method=String(options.method || input?.method || 'GET').toUpperCase();
    if(method !== 'GET')return error('share_readonly',readonlyMessage,405);
    try {await ready;} catch(err) {return error('share_unavailable',err.message,503);}
    if(url.pathname === '/api/auth/me')return json({mode:'local',user:null,can_manage:false,csrf_token:null,readonly:true});
    if(url.pathname === '/api/auth/status')return json({mode:'local',readonly:true,mail_ready:false});
    if(url.pathname.startsWith('/api/auth/'))return error('share_readonly',readonlyMessage,403);
    const asset=fileUrl(url.pathname+url.search) || fileUrl(url.pathname);
    if(asset)return originalFetch(asset,{...options,method:'GET',credentials:'omit'});
    const value=findData(url);
    return value === undefined ? error('share_record_not_published',unavailableMessage,404) : json(value);
  };

  const blockedActions={
    action:new Set(['new-project','upload-knowledge','upload-bom','upload-ies','generate','quote','add-market','delete-document','save-optical','concept-ies','download-ies','sample-bom','compliance-documents']),
    projectDbAction:new Set(['edit','rename','delete','restore','manage-reload','view-trash']),
    productAction:new Set(['reuse']),
    crawlAction:new Set(['cancel','knowledge','reference','brand']),
    materialAction:new Set(['refresh','chart-refresh']),
    logisticsAction:new Set(['fuel','route','routes']),
    manufacturingAction:new Set(['save','upload','fill-example']),
    supplierAction:new Set(['test','assign']),
    projectValueAction:new Set(['clear-value']),
  };
  const costViewActions=new Set(['reload','revision-open','revision-close','quote-close','route-close','actual-close','issue-close','import-close']);
  const allowedForms=new Set(['market-filter','knowledge-search','manual-search-form','project-db-filters','compliance-filter','cw-compare-form','logistics-cost-form']);
  const blockedInputs='#knowledge-file,#bom-file,#ies-file,#spectral-file,#cw-import-file,#materials-auto,.candidate-select,.supplier-row-query,#quote-quantity,#quote-scrap,#quote-provider,#jlc-test-query,#concept-beam';
  const hiddenPanels='.supplier-settings,.supplier-test,.supplier-assign,.plastic-quote-editor,.logistics-new-city,.project-db-menu,.product-version-create,#jlc-search-form';
  const selector='[data-action],[data-project-db-action],[data-product-action],[data-crawl-action],[data-material-action],[data-logistics-action],[data-manufacturing-action],[data-supplier-action],[data-project-value-action],[data-cost-action],[data-spectral-action]';
  function isBlocked(control) {
    if(control?.dataset?.spectralAction === 'choose-file')return true;
    if(control?.dataset?.costAction)return !costViewActions.has(control.dataset.costAction);
    return Object.entries(blockedActions).some(([key,values]) => values.has(control?.dataset?.[key]));
  }
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
      note.innerHTML='<span>仅供浏览 · 后台采集、保存、上传需服务器</span><a href="/">返回作品集 ↗</a>';
      topbar.insertAdjacentElement('afterend',note);
    }
    document.querySelectorAll('a[href="#access"],[data-page="access"]').forEach(node => {if(!node.hidden)node.hidden=true;});
    document.querySelectorAll(selector).forEach(control => {if(isBlocked(control))markDisabled(control,true);});
    document.querySelectorAll(hiddenPanels).forEach(node => {if(!node.hidden)node.hidden=true;});
    document.querySelectorAll('form').forEach(form => {
      if(allowedForms.has(form.id))return;
      form.querySelectorAll('input,textarea,select,button[type="submit"]').forEach(node => markDisabled(node));
      if(form.dataset.shareReadonly !== 'true')form.dataset.shareReadonly='true';
    });
    document.querySelectorAll(blockedInputs).forEach(node => markDisabled(node));
    const auto=document.querySelector('#materials-auto')?.closest('label');if(auto && !auto.hidden)auto.hidden=true;
    document.querySelectorAll('a[href]').forEach(link => {
      const href=link.getAttribute('href');
      if(!href?.startsWith('/api/'))return;
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
    if(note && note.dataset.shareNote !== 'true') {note.dataset.shareNote='true';note.innerHTML='<span class="status-dot"></span><strong>公开资料 · 只读浏览</strong><p>查看项目、知识索引与已保存分析。实时采集与资料维护在完整工作台完成。</p><span class="version">LUMIPILOT / SHARED VIEW</span>';}
    const dbNote=document.querySelector('.project-db-tabs > span');if(dbNote)setText(dbNote,'进入项目查看研发记录，展开档案核对来源。');
    const editable=document.querySelector('#spec-form')?.closest('.panel')?.querySelector('.panel-header .tag');if(editable)setText(editable,'已保存目标');
    document.querySelectorAll('#content .heading-actions [data-action="navigate"][data-page="solution"]').forEach(node => setText(node,'查看产品定义'));
    setText(document.querySelector('#crawl-refresh-state'),'发布时已保存的任务记录');
    const chartNote=document.querySelector('#materials-refresh-status > small');if(chartNote)setText(chartNote,'仅显示已保存行情与原始源时点；本链接不实时获取价格');
    if(location.hash.split('?')[0] === '#access')location.replace('#projects');
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
    if(allowedForms.has(event.target?.id))return;
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
