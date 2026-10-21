'use strict';

window.LumiLightingLibrary = (() => {
  let ctx = {}, cid = '', data = null, preview = null, selected = new Set(), history = null;
  let filters = {}, error = '', notice = '', busy = false, serial = 0, chosenFile = null;
  const escape = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const e = value => (ctx.esc || escape)(value);
  const root = () => document.querySelector('#cpr-lighting-library[data-customer-id="'+cid+'"]');
  const canWrite = () => ctx.canWrite?.() === true;
  const unknown = value => value == null || value === '' ? '未公开 / 待核对' : String(value);
  const date = value => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'short',timeZone:'Asia/Shanghai'}).format(new Date(value)) : '来源时间未知';
  const origin = row => row.origin === 'legacy_import' ? '历史导入 · 待核对' : '已保存渠道商品';
  const qs = () => new URLSearchParams(Object.entries(filters).filter(([,v])=>v != null && v !== '')).toString();
  const button = (action,label,disabled=false,extra='') => `<button type="button" class="button" data-cpl-action="${action}" ${busy||disabled?'disabled':''} ${extra}>${e(label)}</button>`;
  function setCustomer(customerId) {
    if(cid === customerId)return;
    cid=customerId;data=null;preview=null;selected=new Set();history=null;filters={};error='';notice='';busy=false;chosenFile=null;++serial;
  }
  async function load(customerId=cid) {
    setCustomer(customerId);const own=cid, request=++serial;
    const result=await ctx.request('library?'+qs());
    if(cid!==own||request!==serial)return;
    if(result.customer_id!==cid)throw new Error('产品库客户范围不一致。');
    data=result;
  }
  function select(key,label,values) {
    return `<label>${e(label)}<select data-cpl-filter="${key}" ${busy?'disabled':''}><option value="">全部</option>${values.map(value=>{const [v,title]=Array.isArray(value)?value:[value,value];return `<option value="${e(v)}" ${filters[key]===v?'selected':''}>${e(title)}</option>`;}).join('')}</select></label>`;
  }
  function rowView(row) {
    const t=row.taxonomy||{},s=row.standard||{},src=row.source||{};
    const specs=[['功率',s.power_w,' W'],['光通量',s.lumens,' lm'],['色温',s.cct_k,' K'],['显指',s.cri,''],['电压',s.voltage_v,' V']].filter(([,v])=>v!=null);
    return `<article class="cpl-card"><header><span>${e(origin(row))}</span><small>${e(row.country)} · ${e(row.platform)}</small></header><h4>${e(row.name)}</h4><p>${e(row.brand||'品牌未公开')} · ${e(row.model||'型号未公开')}${row.asin?' · ASIN '+e(row.asin):''}</p><p class="cpl-category">${e(t.category_path||'尚未分类')} <small>文字规则建议 · 待核对</small></p><p>${specs.length?specs.map(([label,v,u])=>e(label+' '+v+u)).join(' · '):'标准参数尚未识别；可展开原始规格核对。'}</p><p class="cpl-price">${row.price!=null?e(row.price+' '+(row.currency||'币种未知')):'价格未公开 / 待核对'}</p><p>包装、税费与运费：${e(row.packaging||'包装未知')} / ${e(({included:'含税',excluded:'未税'})[row.tax_basis]||'税费未知')} / ${e(({included:'含运费',excluded:'不含运费'})[row.shipping_basis]||'运费未知')}</p>${row.sales_text?`<p>页面购买量声明：${e(row.sales_text)}<small>保留原周期与下限，不作为精确月销量；跨变体口径待核对。</small></p>`:''}<p>评价 ${e(unknown(row.rating))} · 评论 ${e(unknown(row.review_count))} · ${e(date(row.observed_at))}</p><a href="${e(ctx.safeURL(row.url))}" target="_blank" rel="noopener noreferrer">查看商品来源 ↗</a><details><summary>原始规格与分类依据</summary><pre>${e(JSON.stringify({specs:row.specs||{},standard_field_evidence:s.field_evidence||{},classification:t},null,2))}</pre></details><details><summary>导入 / 保存依据</summary><pre>${e(JSON.stringify(src,null,2))}</pre>${row.origin==='legacy_import'?'<p>原文件时间：'+e(row.source_time_text||'未记录')+'；历史采集结果，未在本次重新访问Amazon。</p>':''}</details>${button('history','查看历史（'+row.history_count+'）',false,`data-item="${e(row.id)}"`)}</article>`;
  }
  function previewView() {
    if(!preview)return '';
    return `<section class="cpl-import-preview"><h4>导入预览：${e(preview.filename)}</h4><p>识别 ${preview.total} 行商品。请勾选当前客户研究所需的品牌；导入保存为待核对样本，品牌归属仍须来源核实。</p><div class="cpl-brand-options">${preview.brands.map(b=>`<label><input type="checkbox" data-cpl-brand="${e(b.value)}" ${selected.has(b.value)?'checked':''} ${busy||!canWrite()?'disabled':''}>${e(b.label)}（${b.count} 行）</label>`).join('')}</div>${Object.keys(preview.rejected||{}).length?'<p>已跳过无效行：'+e(JSON.stringify(preview.rejected))+'</p>':''}<details><summary>查看前12行样本（完整导出在导入后提供）</summary>${preview.sample.map(r=>`<p>${e(r.brand||'品牌未知')} · ${e(r.name)} · ${e(r.taxonomy.category_path||'尚未分类')}</p>`).join('')}</details>${button('commit','确认导入所选品牌',!canWrite()||!selected.size)}${button('discard','关闭预览')}<p class="cpr-muted">此步骤不创建企业产品、正式客户商品或监测任务，也不认定当前在售。</p></section>`;
  }
  function view(customer) {
    setCustomer(customer.id);
    const d=data||{},counts=d.category_counts||{},paths=d.taxonomy?.categories||[];
    const levels=(key,predicate=()=>true)=>[...new Set(paths.filter(predicate).map(p=>p[key]))];
    return `<section id="cpr-lighting-library" data-customer-id="${e(cid)}" aria-busy="${busy}"><header class="cpr-map-heading"><div><h3>照明产品库</h3><p>归档商品、标准参数和三级分类，按当前客户保存与检索。</p></div><div><button type="button" class="button" data-cpr-action="section" data-section="channels">前往渠道采集</button>${button('reload','刷新产品库')}${button('export','导出当前筛选 CSV',!d.total)}</div></header>${error?`<p role="alert" class="cpr-error">${e(error)}</p>`:''}${notice?`<p role="status" class="cpr-notice">${e(notice)}</p>`:''}<p class="cpr-muted">在线采集：在“渠道地图”确认品牌与Amazon站点范围，在“采集与预览”核对并保存。保存后的商品直接出现在本库；任务预览和历史导入的事实状态分别保留。</p><details class="cpl-import" data-cpr-detail="library-import"><summary>导入爬虫技能历史商品（ZIP / XLSX）</summary><p>支持含Products工作表的历史导出，也可直接选择lighting_console_demo.zip。只读取商品表；本地规则分类，不调用模型或联网采集。文件最多20MB。</p><input type="file" id="cpl-file" accept=".xlsx,.zip" aria-label="选择历史商品文件" ${busy||!canWrite()?'disabled':''}>${button('preview','读取文件并预览品牌',!canWrite())}${chosenFile?'<p>已选择：'+e(chosenFile.name)+'</p>':''}<p>来源时间、ASIN、站点、原始规格和购买量原文保留；缺失字段保持未知。</p></details>${previewView()}${!data?'<p>正在载入当前客户产品库…</p>':`<div class="cpl-counts"><span>全部 ${d.all_total} 条商品</span><span>基础范围 ${counts.total||0} 条</span><span>分类建议 ${counts.classified||0} 条</span><span>待分类 ${counts.pending||0} 条</span></div><form id="cpl-search"><label>名称 / 型号 / ASIN<input name="q" value="${e(filters.q||'')}" maxlength="300" placeholder="例如 downlight 或 ASIN"></label><button class="button" ${busy?'disabled':''}>检索</button></form><div class="cpl-filters">${select('country','站点 / 研究市场',d.facets.country)}${select('brand','来源品牌',d.facets.brand)}${select('platform','平台 / 渠道',d.facets.platform)}${select('origin','资料来源',[['legacy_import','历史导入'],['accepted_listing','已保存渠道商品']])}${select('level1','一级品类',levels('level1'))}${select('level2','二级品类',levels('level2',p=>!filters.level1||p.level1===filters.level1))}${select('level3','三级品类',levels('level3',p=>(!filters.level1||p.level1===filters.level1)&&(!filters.level2||p.level2===filters.level2)))}${select('status','分类状态',[['suggestion','分类建议 · 待核对'],['unclassified','尚未分类']])}</div><details><summary>基础范围品类分布（分页前 ${counts.total||0} 条）</summary>${(counts.items||[]).map(r=>`<p>${e(r.path.join(' / '))}：${r.count} 条</p>`).join('')}<p>待分类：${counts.pending||0} 条</p></details><p class="cpr-muted">${e(d.notice)} 站点 / 研究市场不等于已确认实际配送市场。各市场、币种与购买量周期独立展示。</p><div class="cpl-grid">${d.items.length?d.items.map(rowView).join(''):'<p class="cpr-empty">当前范围没有商品。可导入历史文件，或从渠道地图开始采集并保存。</p>'}</div><div class="cpl-pagination">${button('prev','上一页',d.page<=1)}<span>第 ${d.page} / ${d.pages} 页 · 筛选后 ${d.total} 条</span>${button('next','下一页',d.page>=d.pages)}</div>`}${history?`<section class="cpl-history"><h4>来源观察历史（${history.total} 条）</h4>${button('close-history','关闭历史')}<p>仅并列呈现原始观察，不计算跨市场、包装或币种价差。</p>${history.items.map(r=>`<details><summary>${e(date(r.observed_at))} · ${e(unknown(r.price))} ${e(r.currency||'')}</summary><pre>${e(JSON.stringify(r,null,2))}</pre></details>`).join('')}${history.limited?'<p>仅显示最近100条。</p>':''}</section>`:''}</section>`;
  }
  async function operation(fn,write=false) {
    if(busy||!root()||write&&!canWrite())return;
    const own=cid;busy=true;error='';notice='';ctx.repaint();
    try{await fn(own);}catch(err){if(cid===own&&!err.stale)error=err.message||'操作未完成，请刷新核对。';}
    finally{if(cid===own){busy=false;ctx.repaint();}}
  }
  async function filePayload(file) {
    if(!file||file.size>20*1024*1024)throw new Error('请选择20MB以内的ZIP或XLSX文件。');
    return new Promise((resolve,reject)=>{const r=new FileReader();r.onload=()=>resolve({filename:file.name,content_base64:String(r.result).split(',')[1]});r.onerror=()=>reject(new Error('文件读取失败。'));r.readAsDataURL(file);});
  }
  function init(context) {
    ctx=context;
    document.addEventListener('click',event=>{
      const b=event.target.closest?.('[data-cpl-action]');if(!b||b.disabled||!root()?.contains(b))return;
      event.preventDefault();const action=b.dataset.cplAction;
      // Capture File before repaint replaces the input element.
      const file=document.getElementById('cpl-file')?.files?.[0] || chosenFile;
      operation(async(expectedCid)=>{
        if(action==='reload'){await load();return;}
        if(action==='prev'||action==='next'){filters.page=(data?.page||1)+(action==='next'?1:-1);history=null;await load();return;}
        if(action==='preview'){const payload=await filePayload(file);if(cid!==expectedCid||!root())return;const result=await ctx.request('library/import-preview','POST',payload);if(cid!==expectedCid)return;preview=result.batch;selected=new Set();notice='预览已就绪，尚未导入商品；请明确选择品牌。';return;}
        if(action==='commit'){if(!preview)throw new Error('请先读取文件。');const result=await ctx.request('library/imports/'+preview.id+'/commit','POST',{brands:[...selected]});preview=null;selected.clear();await load();notice='已新增 '+result.result.inserted_observations+' 条历史观察，跳过重复 '+result.result.duplicates_skipped+' 条；仍为待核对研究样本。';return;}
        if(action==='discard'){preview=null;selected.clear();return;}
        if(action==='history'){history=await ctx.request('library/items/'+encodeURIComponent(b.dataset.item)+'/history');return;}
        if(action==='close-history'){history=null;return;}
        if(action==='export'){const url=ctx.base()+'/library/export?'+qs();const response=await fetch(url,{credentials:'same-origin'});if(!response.ok)throw new Error('导出失败，请核对登录状态。');const blob=await response.blob(),href=URL.createObjectURL(blob),a=document.createElement('a');a.href=href;a.download='lighting-library.csv';a.click();setTimeout(()=>URL.revokeObjectURL(href),1000);}
      },['preview','commit'].includes(action));
    });
    document.addEventListener('change',event=>{const el=event.target;if(!root()?.contains(el))return;if(el.id==='cpl-file'){chosenFile=el.files?.[0]||null;return;}if(el.dataset.cplBrand){el.checked?selected.add(el.dataset.cplBrand):selected.delete(el.dataset.cplBrand);ctx.repaint();return;}if(el.dataset.cplFilter){operation(async()=>{const key=el.dataset.cplFilter;filters[key]=el.value;filters.page=1;if(key==='level1'){filters.level2='';filters.level3='';}if(key==='level2')filters.level3='';history=null;await load();});}});
    document.addEventListener('submit',event=>{if(event.target.id!=='cpl-search'||!root()?.contains(event.target))return;event.preventDefault();const q=new FormData(event.target).get('q');operation(async()=>{filters.q=String(q||'');filters.page=1;await load();});});
  }
  return {init,view,load};
})();
