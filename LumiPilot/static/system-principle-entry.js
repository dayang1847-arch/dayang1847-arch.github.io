'use strict';
// Read-only contextual views, mounted inside the existing business workspace.
window.LumiSystemPrinciple=(()=>{
 const origin=location.origin;
 const warmed=new Set();
 function warm(){if(navigator.connection?.saveData||/2g/.test(navigator.connection?.effectiveType||''))return;for(const name of ['system-industrial.js?v=82408b67ba10','system-industrial-scene.js?v=82408b67ba10','vendor/streetlight/model.js?v=82408b67ba10']){if(warmed.has(name))continue;warmed.add(name);const link=document.createElement('link');link.rel='modulepreload';link.href='/LumiPilot/static/'+name;link.fetchPriority='low';document.head.append(link);}}
 const allowed=new Set(['overview','collection','database','market','research','procurement','process']);
 const names={overview:'系统协作',collection:'情报采集',database:'共同档案',market:'市场判断',research:'研发与工艺',procurement:'采购协同',process:'工程方案'};
 function entry(focus='overview',open=false){if(!allowed.has(focus))focus='overview';const url=`/LumiPilot/static/system-principle.html?v=82408b67ba10&embed=1&mode=reference&focus=${focus}`;return `<details class="lp-system-entry" data-lp-system="${focus}" ${open?'open':''}><summary><span><small>LUMIPILOT / ${names[focus]}</small><strong>${focus==='overview'?'让历史经验参与每一次判断，怎样支持销售拿单？':'本模块的问题、经验与判断'}</strong></span><span class="lp-system-toggle"><span class="lp-system-expand">查看动态原理</span><span class="lp-system-collapse">收起原理</span><i aria-hidden="true">⌄</i></span></summary><div class="lp-system-entry-tools"><p>以共同档案为经验底座，查看信息获取、适用性核对、专业判断与结果回存。</p><a href="/LumiPilot/static/system-principle.html?v=82408b67ba10&mode=reference&focus=${focus}" target="_blank" rel="noopener">独立查看 ↗</a></div><iframe ${open?'src':'data-src'}="${url}" title="LumiPilot协作原理 · ${names[focus]}" loading="lazy" scrolling="no"></iframe></details>`;}
 function bind(n){const summary=n.querySelector('summary');summary.addEventListener('pointerenter',warm,{once:true});summary.addEventListener('focusin',warm,{once:true});const frame=n.querySelector('iframe');frame.addEventListener('load',()=>frame.contentWindow?.postMessage({type:'lumipilot-principle-visible',visible:n.open},origin));n.addEventListener('toggle',()=>{if(!n.isConnected)return;if(n.open&&frame.dataset.src){frame.src=frame.dataset.src;delete frame.dataset.src;}frame.contentWindow?.postMessage({type:'lumipilot-principle-visible',visible:n.open},origin);if(n.open)frame.contentWindow?.postMessage({type:'lumipilot-principle-measure'},origin);});}
 function attach(){const content=document.getElementById('content');if(!content)return;let host,focus,open=false;
  const home=content.querySelector('#intelligence-console-root');
  if(home){host=home;focus='overview';open=false;}
  else if(content.querySelector('#rd-root')){host=content.querySelector('#rd-root');focus='research';}
  else if(content.querySelector('#customer-product-research-root')){host=content.querySelector('#customer-product-research-root');focus='collection';}
  else {const page=content.dataset.page;if(['procurement','supply','material-selection','materials','cost'].includes(page)){host=content;focus='procurement';}else if(page==='crawler'){host=content;focus='collection';}else if(page==='market'){host=content;focus='market';}else if(page==='manufacturing'){host=content;focus='research';}else if(['projects','products','knowledge'].includes(page)){host=content;focus='database';}}
  if(!host||host.querySelector(':scope > .lp-system-entry'))return;
  const shell=document.createElement('div');shell.innerHTML=entry(focus,open);const n=shell.firstElementChild;
  const heading=home?home.querySelector('.ic-header-zone'):host.querySelector(':scope > .page-heading, :scope > .rd-task-header, :scope > header');
  if(heading)heading.after(n);else host.prepend(n);bind(n);
 }
 window.addEventListener('message',e=>{if(e.origin!==origin)return;if(e.data?.type==='lumipilot-principle-open-lumina'){const trusted=[...document.querySelectorAll('.lp-system-entry iframe')].some(f=>f.contentWindow===e.source);if(trusted)window.LumiIntegrated?.openStudio({});return;}if(e.data?.type!=='lumipilot-principle-size')return;const height=e.data.height;if(!Number.isFinite(height)||height<200||height>16000)return;for(const frame of document.querySelectorAll('.lp-system-entry iframe')){if(frame.contentWindow===e.source){frame.style.height=Math.ceil(height)+'px';frame.dataset.sized='true';break;}}});
 let queued=false;const observer=new MutationObserver(()=>{if(!queued){queued=true;queueMicrotask(()=>{queued=false;attach();});}});
 function start(){const n=document.getElementById('content');if(n){observer.observe(n,{childList:true,subtree:true});attach();}}
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
 return {entry,attach};
})();
