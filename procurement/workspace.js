'use strict';
/* Group existing views without moving private data or duplicating connection state. */
window.WUI=(()=>{
 const groups=[
  {id:'overview',title:'采购总览',en:'PROCUREMENT OVERVIEW',icon:'grid',description:'采购资料、市场参考和协同进展，一处查看。',views:[['overview','总览','overview']]},
  {id:'library',title:'物料与供应商',en:'MATERIALS & SUPPLIERS',icon:'box',description:'查找标准参数、核对供应商，并在同一工作区管理选型字段。',views:[['selection','物料选型','selection'],['suppliers','供应商档案','suppliers'],['parameters','参数管理','parameters']]},
  {id:'ingest',title:'数据导入',en:'DATA IMPORT',icon:'file',description:'上传图册或采集网页，共用自己的 DeepSeek 连接，核对后加入选型库。',views:[['upload','PDF 图册','pdf'],['research','网页采集','web']]},
  {id:'collaboration',title:'采购协同',en:'PROCUREMENT COLLABORATION',icon:'layers',description:'从需求聚合、统一询报价到任务跟进，按流程推进。',views:[['demand','需求聚合','demand'],['quotes','询报价','quotes'],['tasks','任务跟进','tasks']]},
  {id:'cost',title:'成本与行情',en:'COST INTELLIGENCE',icon:'trend',description:'保留公开行情出处，用自己的DeepSeek一键刷新，查看材料变化与成本影响。',views:[['cost','成本与行情','cost']]},
  {id:'settings',title:'系统设置',en:'LOCAL SERVICE SETTINGS',icon:'link',description:'可选本机邮箱与报价分析服务；在线采集连接统一在“数据导入”配置。',views:[['settings','本机服务','settings']]}
 ];
 const last=Object.fromEntries(groups.map(g=>[g.id,g.views[0][0]]));let part='standard';
 const group=page=>groups.find(g=>g.views.some(v=>v[0]===page))||groups.find(g=>g.id===page)||groups[0];
 function resolve(page){if(groups.some(g=>g.id===page))return last[page];return groups.some(g=>g.views.some(v=>v[0]===page))?page:'overview';}
 function readURL(){const q=new URLSearchParams(location.search),view=q.get('view')||'overview',g=groups.find(g=>g.id===view);if(q.get('part')==='display')part='display';else part='standard';return g?(g.views.find(v=>v[2]===q.get('tab'))?.[0]||last[g.id]):resolve(view);}
 function syncURL(page,replace=false){const g=group(page),v=g.views.find(v=>v[0]===page);last[g.id]=page;try{const u=new URL(location.href);u.searchParams.set('view',g.id);u.searchParams.delete('tab');u.searchParams.delete('part');if(g.views.length>1)u.searchParams.set('tab',v[2]);if(page==='parameters'&&part==='display')u.searchParams.set('part','display');if(u.href!==location.href)history[replace?'replaceState':'pushState']({},'',u.href);}catch{/* file:// previews retain functional navigation without URL history. */}}
 const tabs=g=>g.views.length>1?`<nav class="wui-tabs" aria-label="${esc(g.title)}功能切换">${g.views.map(([id,label])=>`<button type="button" data-wui-page="${id}" aria-pressed="${state.page===id}" class="${state.page===id?'active':''}">${label}${id==='tasks'?` <span class="count">${taskCount()}</span>`:''}</button>`).join('')}</nav>`:'';
 function frame(page,body){const g=group(page);return tabs(g)+(g.id==='ingest'?`<div class="wui-import-status"><span>选择来源 → 解析资料 → 核对入库</span><button class="link" data-page="selection">查看物料选型 →</button></div>${window.PAI?PAI.connectionPanel({collapsible:true}):'<p role="alert">DeepSeek连接组件尚未载入。</p>'}`:'')+(g.id==='collaboration'?'<p class="notice neutral wui-demo">业务演示样例 · 需求、报价和任务使用模拟记录；与真实供应商档案及选型候选分开。</p>':'')+body;}
 function parameterPage(){return `<section class="card wui-parameter-tabs"><div><h2>参数管理</h2><p>标准字段决定如何入库和检索；卡片展示决定哪些字段显示在选型卡片。</p></div><nav aria-label="参数管理类型"><button class="btn ${part==='standard'?'primary':''}" data-wui-param="standard" aria-pressed="${part==='standard'}">标准字段</button><button class="btn ${part==='display'?'primary':''}" data-wui-param="display" aria-pressed="${part==='display'}">卡片展示</button></nav></section>`+(part==='standard'?(window.SPM?SPM.settings():'正在加载标准字段…'):(window.PF?PF.settings():'正在加载展示配置…'));}
 function guide(){return '<p class="sub">从六个主入口进入，同一工作区内切换功能；原来的页面链接会自动定位到对应页签。</p>'+groups.map((g,i)=>'<div class="helpstep"><span class="num">'+(i+1)+'</span><div><strong>'+g.title+'</strong><p>'+g.description+(g.views.length>1?' 包含：'+g.views.map(v=>v[1]).join('、')+'。':'')+'</p></div></div>').join('')+'<div class="notice neutral">图册、网页和行情刷新共用同一DeepSeek连接，可在数据导入或行情页配置。原册、个人候选与自定义标准仍在当前浏览器；刷新会清除页面Key。采购协同为业务样例，本机邮箱服务仍需自行配置与实测。</div>';}
 function bind(root){root.querySelectorAll('[data-wui-page]').forEach(b=>b.onclick=()=>go(b.dataset.wuiPage));root.querySelectorAll('[data-wui-param]').forEach(b=>b.onclick=()=>{part=b.dataset.wuiParam;syncURL('parameters');render();});}
 return{guide,groups,navs:groups.map(g=>[g.id,g.icon,g.title]),groupFor:page=>group(page).id,resolve,readURL,syncURL,frame,parameterPage,bind,info:page=>{const g=group(page);return[g.title,g.en,g.description];},beforeNavigate:()=>window.PAI?.captureForm(),actions:()=>`${group(state.page).id==='collaboration'?btn(icon('refresh',13)+' 重置演示','reset'):''}${btn(icon('spark',13)+' 使用指南','guide')}`};
})();
pageInfo.parameters=['参数管理','PARAMETER MANAGEMENT','标准字段、别名和卡片展示统一管理。'];
window.addEventListener('popstate',()=>{WUI.beforeNavigate();state.page=WUI.readURL();persist();render();});
state.page=WUI.readURL();WUI.syncURL(state.page,true);render();
