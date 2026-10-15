'use strict';

// One control policy for authenticated viewers and published snapshots.
// Server authorization remains authoritative; this only explains the UI scope.
window.LumiWorkspaceAccess = (() => {
  const viewerMessage = '当前账号为只读查看者；如需修改或采集资料，请联系管理员授予编辑权限。';
  const shareMessage = '此分享提供已保存资料，业务编辑与实时采集需要完整工作台。';
  let message = viewerMessage;
  const blockedActions = {
    action:new Set(['new-project','upload-knowledge','upload-bom','upload-ies','generate','quote','add-market','delete-document','save-optical','concept-ies','sample-bom','compliance-documents']),
    projectDbAction:new Set(['edit','rename','delete','restore','manage-reload','view-trash']),
    productAction:new Set(['reuse']), crawlAction:new Set(['cancel','knowledge','reference','brand']),
    materialAction:new Set(['refresh','chart-refresh']), logisticsAction:new Set(['fuel','route','routes']),
    manufacturingAction:new Set(['save','upload','fill-example']), supplierAction:new Set(['test','assign']),
    projectValueAction:new Set(['clear-value']),
    intelligenceAction:new Set(['reference','remove-reference','cancel-job','attach-document','use-url']),
    definitionAction:new Set(['add-row','remove-row','add-option']),
    initiationAction:new Set(['add-power','add-competitor','remove-competitor']),
  };
  const costViewActions = new Set(['reload','revision-open','quote-edit','route-edit','revision-close','quote-close','route-close','actual-close','issue-close','import-close']);
  const allowedForms = new Set(['project-intelligence-search','market-filter','knowledge-search','manual-search-form','project-db-filters','compliance-filter','cw-compare-form','logistics-cost-form']);
  const blockedInputs = '#knowledge-file,#bom-file,#ies-file,#spectral-file,#cw-import-file,#materials-auto,.candidate-select,.supplier-row-query,#quote-quantity,#quote-scrap,#quote-provider,#jlc-test-query,#concept-beam';
  const hiddenPanels = '.supplier-settings,.supplier-test,.supplier-assign,.plastic-quote-editor,.logistics-new-city,.project-db-menu,.product-version-create,#jlc-search-form';
  const selector = '[data-action],[data-project-db-action],[data-product-action],[data-crawl-action],[data-material-action],[data-logistics-action],[data-manufacturing-action],[data-supplier-action],[data-project-value-action],[data-cost-action],[data-spectral-action],[data-intelligence-action],[data-initiation-action],[data-definition-action]';
  let viewer = false, observer = null;
  function isBlocked(control) {
    if(control?.dataset?.spectralAction === 'choose-file')return true;
    if(control?.dataset?.action === 'download-ies')return true; // This generates a new concept input.
    if(control?.dataset?.costAction)return !costViewActions.has(control.dataset.costAction);
    return Object.entries(blockedActions).some(([key, values]) => values.has(control?.dataset?.[key]));
  }
  function disable(node, hide=false, note=message) {
    if('disabled' in node && !node.disabled)node.disabled=true;
    if(node.getAttribute('aria-disabled') !== 'true')node.setAttribute('aria-disabled','true');
    if(node.title !== note)node.title=note;
    if(hide && !node.hidden)node.hidden=true;
  }
  function applyControls(root=document, {snapshot=false,note=message}={}) {
    root.querySelectorAll(selector).forEach(node => {if(isBlocked(node))disable(node,true,note);});
    root.querySelectorAll(hiddenPanels).forEach(node => {if(!node.hidden)node.hidden=true;});
    root.querySelectorAll('form').forEach(form => {
      if(allowedForms.has(form.id) || !snapshot && form.id.startsWith('auth-'))return;
      form.querySelectorAll('input,textarea,select,button[type="submit"]').forEach(node => disable(node,false,note));
      if(form.dataset.accessReadonly !== 'true')form.dataset.accessReadonly='true';
    });
    root.querySelectorAll(blockedInputs).forEach(node => disable(node,false,note));
    const auto=root.querySelector('#materials-auto')?.closest('label');if(auto && !auto.hidden)auto.hidden=true;
    if(!snapshot) {
      root.querySelectorAll('[data-cost-action="route-edit"]').forEach(node => {if(node.textContent !== '查看路线')node.textContent='查看路线';});
      root.querySelectorAll('[data-cost-action="quote-edit"]').forEach(node => {if(node.textContent !== '查看报价')node.textContent='查看报价';});
      root.querySelectorAll('#content .heading-actions [data-action="navigate"][data-page="solution"]').forEach(node => {if(node.textContent !== '查看产品定义')node.textContent='查看产品定义';});
    }
  }
  function apply() {
    if(!viewer || !document.body)return;
    document.body.classList.add('lumi-account-readonly');
    applyControls();
  }
  function setAuth(auth) {
    const fixedReadonly = auth?.readonly === true || auth?.workspace_readonly === true;
    message = fixedReadonly ? shareMessage : viewerMessage;
    viewer=auth?.mode === 'online' && auth?.user?.status === 'approved' && (auth.user.role === 'viewer' || fixedReadonly);
    if(!viewer) {
      document.body?.classList.remove('lumi-account-readonly');
      observer?.disconnect();observer=null;return;
    }
    if(!observer && typeof MutationObserver !== 'undefined') {
      observer=new MutationObserver(apply);
      observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden']});
    }
    apply();
  }
  function block(event) {event.preventDefault();event.stopImmediatePropagation();const toast=document.querySelector('#toast');if(toast){toast.textContent=message;toast.className='visible';}}
  document.addEventListener('click',event => {if(viewer && isBlocked(event.target?.closest?.(selector)))block(event);},true);
  document.addEventListener('submit',event => {if(viewer && !allowedForms.has(event.target?.id) && !event.target?.id?.startsWith('auth-'))block(event);},true);
  for(const type of ['drop','dragover'])document.addEventListener(type,event => {if(viewer)block(event);},true);
  document.addEventListener('change',event => {if(viewer && event.target?.matches?.('input[type="file"],'+blockedInputs)){if(event.target.type === 'file')event.target.value='';block(event);}},true);
  return {blockedActions,costViewActions,allowedForms,blockedInputs,hiddenPanels,selector,isBlocked,applyControls,setAuth,apply,get readonly(){return viewer;}};
})();
