'use strict';

// Preserve the published snapshot policy, then apply department ownership to
// legacy editors. New business pages own their field-level permission controls.
// Server authorization remains authoritative; this only explains the UI scope.
window.LumiWorkspaceAccess = (() => {
  const viewerMessage = '当前账号为只读查看者；如需修改或采集资料，请联系管理员授予编辑权限。';
  const shareMessage = '此分享提供已保存资料，业务编辑与实时采集需要完整工作台。';
  const memberMessage = '当前账号尚未分配部门，仅可查看资料；请联系管理者分配销售、研发或采购权限。';
  const departmentMessage = '当前部门可查看此资料；请由负责此项工作的部门或管理者编辑。';
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
  const allowedForms = new Set(['org-report-select','mw-customer-filter','mw-inbox-filter','project-intelligence-search','market-filter','knowledge-search','manual-search-form','project-db-filters','compliance-filter','cw-compare-form','logistics-cost-form','bh-filter','bh-customer-select','bh-news-filter']);
  const blockedInputs = '#knowledge-file,#bom-file,#ies-file,#spectral-file,#cw-import-file,#materials-auto,.candidate-select,.supplier-row-query,#quote-quantity,#quote-scrap,#quote-provider,#jlc-test-query,#concept-beam';
  const hiddenPanels = '.supplier-settings,.supplier-test,.supplier-assign,.plastic-quote-editor,.logistics-new-city,.project-db-menu,.product-version-create,#jlc-search-form';
  const selector = '[data-action],[data-project-db-action],[data-product-action],[data-crawl-action],[data-material-action],[data-logistics-action],[data-manufacturing-action],[data-supplier-action],[data-project-value-action],[data-cost-action],[data-spectral-action],[data-intelligence-action],[data-initiation-action],[data-definition-action]';
  const departmentSelector = selector + ',[data-definition-save]';
  const departmentInputs = '#knowledge-file,#project-intelligence-file,#bom-file,#ies-file,#spectral-file,#cw-import-file,#cw-import-confirm,[data-import-row],#materials-auto,.candidate-select,.supplier-row-query,#quote-quantity,#quote-scrap,#quote-provider,#jlc-test-query,#concept-beam';
  const roleCapabilities = {
    sales:['customer_write','project_sales_write','knowledge_write','review_write','ask'],
    research:['engineering_write','knowledge_write','review_write','ask'],
    procurement:['procurement_write','knowledge_write','review_write','ask'],
  };
  const engineering = ['engineering_write'], purchasing = ['procurement_write'];
  const costEditing = ['engineering_write','procurement_write'];
  const projectCreation = ['project_sales_write','engineering_write'];
  const formCapabilities = {
    'new-project-form':projectCreation, 'product-reuse-form':projectCreation,
    'spec-form':engineering, 'product-requirements-form':engineering,
    'product-version-form':engineering, 'manufacturing-form':engineering,
    'spectral-upload':engineering, 'cw-route-form':engineering, 'cw-revision-form':engineering,
    'jlc-search-form':purchasing, 'plastic-quote-form':purchasing,
    'logistics-city-form':purchasing, 'cw-quote-form':purchasing, 'cw-import-mapping':purchasing,
    'cw-scenario-form':costEditing, 'cw-logistics-form':costEditing,
    'cw-coverage-form':costEditing, 'cw-management-form':costEditing,
    'cw-actual-form':costEditing, 'cw-issue-form':costEditing,
    'sales-project-form':['customer_write'], 'project-intelligence-sales':['customer_write'],
    'project-intelligence-analysis':['customer_write'], 'project-intelligence-batch':['customer_write'],
    'project-intelligence-crawl':['customer_write'], 'project-intelligence-source':['customer_write'],
    'crawl-task-form':['customer_write'], 'jlc-config-form':['ai_manage'],
    'project-db-manage-form':['account_manage'],
  };
  let viewer = false, department = false, observer = null, capabilities = new Set();
  const changed = new Map();
  const notices = new Set();
  function remember(node) {
    if(!changed.has(node))changed.set(node,{disabled:node.disabled,hidden:node.hidden,title:node.title,aria:node.getAttribute?.('aria-disabled'),readonly:node.dataset?.accessReadonly,text:node.textContent});
  }
  function restoreControls() {
    for(const [node,before] of changed) {
      if('disabled' in node)node.disabled=before.disabled;
      node.hidden=before.hidden;node.title=before.title;
      if(before.aria == null)node.removeAttribute?.('aria-disabled');else node.setAttribute('aria-disabled',before.aria);
      if(node.dataset){if(before.readonly===undefined)delete node.dataset.accessReadonly;else node.dataset.accessReadonly=before.readonly;}
      // Only the policy's view labels are replaced; preserve app-rendered labels.
      if(['查看路线','查看报价','查看产品定义'].includes(node.textContent))node.textContent=before.text;
    }
    changed.clear();for(const note of notices)note.remove?.();notices.clear();
  }
  function lacks(required) {return Boolean(required?.length) && !required.some(cap=>capabilities.has(cap));}
  function formRequirement(form) {
    // The business hub applies capabilities itself, including per-department reviews.
    if(!form || form.id?.startsWith('bh-') || form.id?.startsWith('auth-'))return null;
    return formCapabilities[form.id];
  }
  function actionRequirement(control) {
    const d=control?.dataset || {};
    if(d.definitionSave==='generate')return ['customer_write'];
    if(d.definitionSave || d.definitionAction)return engineering;
    if(d.initiationAction)return formRequirement(control.closest?.('form')) || ['customer_write'];
    if(d.spectralAction==='choose-file')return engineering;
    if(d.projectDbAction && ['edit','rename','delete','restore'].includes(d.projectDbAction))return ['account_manage'];
    if(d.productAction==='reuse')return projectCreation;
    if(d.materialAction && ['refresh','chart-refresh'].includes(d.materialAction))return purchasing;
    if(d.logisticsAction && ['fuel','route','routes'].includes(d.logisticsAction))return purchasing;
    if(d.manufacturingAction==='upload')return ['knowledge_write'];
    if(d.manufacturingAction && ['save','fill-example'].includes(d.manufacturingAction))return engineering;
    if(d.supplierAction==='test')return ['ai_manage'];
    if(d.supplierAction==='assign')return purchasing;
    if(d.crawlAction==='knowledge')return ['knowledge_write'];
    if(d.crawlAction && ['cancel','reference'].includes(d.crawlAction))return ['customer_write'];
    if(d.intelligenceAction==='attach-document')return ['knowledge_write'];
    if(d.intelligenceAction && ['reference','remove-reference','cancel-job','retry-job','use-url','select-sources'].includes(d.intelligenceAction))return ['customer_write'];
    if(d.costAction) {
      if(costViewActions.has(d.costAction))return null;
      if(['quote-new','tier-add','tier-remove','import-preview','import-commit'].includes(d.costAction))return purchasing;
      if(['route-new','component-add','component-remove','operation-add','operation-up','operation-down','operation-remove'].includes(d.costAction))return engineering;
      if(['new','save','calculate','freeze','fork','add-line','remove-line','copy-bom','route-bind','actual-open','issue-open'].includes(d.costAction))return costEditing;
    }
    if(d.action==='new-project')return projectCreation;
    if(d.action==='upload-knowledge')return ['knowledge_write'];
    if(['upload-bom','upload-ies','save-optical','concept-ies','download-ies'].includes(d.action))return engineering;
    if(d.action==='generate')return document.querySelector('#content')?.dataset?.page==='solution'?['customer_write']:engineering;
    if(d.action==='quote')return purchasing;
    if(d.action==='add-market')return ['customer_write'];
    if(d.action==='delete-document')return ['account_manage'];
    return null;
  }
  function inputRequirement(node) {
    if(['knowledge-file','project-intelligence-file'].includes(node?.id))return ['knowledge_write'];
    if(['bom-file','ies-file','spectral-file','concept-beam'].includes(node?.id))return engineering;
    if(node?.id==='jlc-test-query')return ['ai_manage'];
    if(['cw-import-file','cw-import-confirm','materials-auto','quote-quantity','quote-scrap','quote-provider'].includes(node?.id) || node?.matches?.('.candidate-select,.supplier-row-query,[data-import-row]'))return purchasing;
    return null;
  }
  function denied(control) {
    return Boolean(control) && (lacks(formRequirement(control.closest?.('form'))) || lacks(actionRequirement(control)) || lacks(inputRequirement(control)));
  }
  function isBlocked(control) {
    if(control?.dataset?.spectralAction === 'choose-file')return true;
    if(control?.dataset?.action === 'download-ies')return true; // This generates a new concept input.
    if(control?.dataset?.costAction)return !costViewActions.has(control.dataset.costAction);
    return Object.entries(blockedActions).some(([key, values]) => values.has(control?.dataset?.[key]));
  }
  function disable(node, hide=false, note=message) {
    remember(node);
    if('disabled' in node && !node.disabled)node.disabled=true;
    if(node.getAttribute('aria-disabled') !== 'true')node.setAttribute('aria-disabled','true');
    if(node.title !== note)node.title=note;
    if(hide && !node.hidden)node.hidden=true;
  }
  function applyControls(root=document, {snapshot=false,note=message}={}) {
    root.querySelectorAll(selector).forEach(node => {if(isBlocked(node))disable(node,true,note);});
    root.querySelectorAll(hiddenPanels).forEach(node => {remember(node);if(!node.hidden)node.hidden=true;});
    root.querySelectorAll('form').forEach(form => {
      if(allowedForms.has(form.id) || !snapshot && form.id.startsWith('auth-'))return;
      form.querySelectorAll('input,textarea,select,button[type="submit"]').forEach(node => disable(node,false,note));
      remember(form);if(form.dataset.accessReadonly !== 'true')form.dataset.accessReadonly='true';
    });
    root.querySelectorAll(blockedInputs).forEach(node => disable(node,false,note));
    const auto=root.querySelector('#materials-auto')?.closest('label');if(auto && !auto.hidden){remember(auto);auto.hidden=true;}
    if(!snapshot) {
      root.querySelectorAll('[data-cost-action="route-edit"]').forEach(node => {remember(node);if(node.textContent !== '查看路线')node.textContent='查看路线';});
      root.querySelectorAll('[data-cost-action="quote-edit"]').forEach(node => {remember(node);if(node.textContent !== '查看报价')node.textContent='查看报价';});
      root.querySelectorAll('#content .heading-actions [data-action="navigate"][data-page="solution"]').forEach(node => {remember(node);if(node.textContent !== '查看产品定义')node.textContent='查看产品定义';});
    }
  }
  function applyDepartments(root=document) {
    root.querySelectorAll('form').forEach(form => {
      if(!lacks(formRequirement(form)))return;
      form.querySelectorAll('input,textarea,select,button[type="submit"],button:not([type])').forEach(node=>disable(node,false,departmentMessage));
      remember(form);if(form.dataset.accessReadonly!=='true')form.dataset.accessReadonly='true';
      if(document.createElement && form.append && !form.querySelector('.workspace-department-note')) {
        const note=document.createElement('p');note.className='inline-note workspace-department-note';note.textContent=departmentMessage;form.append(note);notices.add(note);
      }
    });
    root.querySelectorAll(departmentSelector).forEach(node=>{if(denied(node))disable(node,false,departmentMessage);});
    root.querySelectorAll(departmentInputs).forEach(node=>{if(denied(node))disable(node,false,departmentMessage);});
  }
  function apply() {
    if(!document.body)return;
    if(viewer){document.body.classList.add('lumi-account-readonly');applyControls();}
    else if(department)applyDepartments();
  }
  function setAuth(auth) {
    observer?.disconnect();observer=null;restoreControls();
    const fixedReadonly = auth?.readonly === true || auth?.workspace_readonly === true;
    const role=auth?.user?.role, online=auth?.mode==='online' && auth?.user?.status==='approved';
    message = fixedReadonly ? shareMessage : role==='member' ? memberMessage : viewerMessage;
    viewer=online && (['viewer','member'].includes(role) || fixedReadonly);
    department=online && !viewer && !['admin','manager'].includes(role);
    capabilities=new Set(Array.isArray(auth?.capabilities)?auth.capabilities:(roleCapabilities[role] || []));
    if(department)message=departmentMessage;
    document.body?.classList.remove('lumi-account-readonly');
    if((viewer || department) && typeof MutationObserver !== 'undefined') {
      observer=new MutationObserver(apply);
      observer.observe(document.documentElement,{childList:true,subtree:true,attributes:true,attributeFilter:['disabled','hidden']});
    }
    apply();
  }
  function block(event) {event.preventDefault();event.stopImmediatePropagation();const toast=document.querySelector('#toast');if(toast){toast.textContent=message;toast.className='visible';}}
  document.addEventListener('click',event => {const control=event.target?.closest?.(departmentSelector);if(viewer && isBlocked(control) || department && denied(control))block(event);},true);
  document.addEventListener('submit',event => {if(viewer && !allowedForms.has(event.target?.id) && !event.target?.id?.startsWith('auth-') || department && (lacks(formRequirement(event.target)) || denied(event.submitter)))block(event);},true);
  for(const type of ['drop','dragover'])document.addEventListener(type,event => {if(viewer || department && denied(event.target?.closest?.('[data-action],form')))block(event);},true);
  document.addEventListener('change',event => {if(viewer && event.target?.matches?.('input[type="file"],'+blockedInputs) || department && denied(event.target)){if(event.target.type==='file')event.target.value='';block(event);}},true);
  return {blockedActions,costViewActions,allowedForms,blockedInputs,hiddenPanels,selector,isBlocked,applyControls,setAuth,apply,get readonly(){return viewer;}};
})();
