"use strict";
// Generic browser-local inputs retain the previous key without attaching them to a project.
window.LumiProjectValue = (() => {
  const STORAGE_KEY='lumipilot.competition.value.v1.workspace';
  const numberFields=[['baselineMinutes','原流程耗时','分钟 / 次'],['assistedMinutes','使用后耗时（含复核）','分钟 / 次'],['monthlyRuns','每月处理次数','次 / 月'],['hourlyRate','人工成本','元 / 小时'],['monthlyOperatingCost','每月运行成本','元 / 月'],['initialInvestment','一次性投入','元']];
  let ctx,initialized=false,listenersBound=false,mountedForm=null,storageError='';
  let valueInputs=emptyInputs();
  const text=value=>typeof value==='string'?value:'';
  const e=value=>ctx.esc(value);
  const n=(value,digits=1)=>Number.isFinite(value)?new Intl.NumberFormat('zh-CN',{maximumFractionDigits:digits}).format(value):'—';
  function emptyInputs(){return {...Object.fromEntries(numberFields.map(([name])=>[name,''])),recordType:'assumption',recordSource:''};}
  function numeric(value){if(typeof value==='number')return Number.isFinite(value)?value:null;if(typeof value!=='string'||!value.trim()||!/^\+?(?:\d+(?:\.\d*)?|\.\d+)(?:e[+-]?\d+)?$/i.test(value.trim()))return null;const parsed=Number(value);return Number.isFinite(parsed)?parsed:null;}
  // A blank condition is unknown, never a zero cost or a measured saving.
  // Negative net value remains visible; only positive monthly value can repay an investment.
  function calculateValue(inputs={}){
    const missing=[],errors=[],values={};
    for(const [name,label] of numberFields){const raw=inputs[name];if(raw==null||typeof raw==='string'&&!raw.trim()){missing.push(label);continue;}const value=numeric(raw);if(value===null||value<0){errors.push(`${label}须为有限且不小于 0 的数值`);continue;}if(name==='baselineMinutes'&&value<=0){errors.push('原流程耗时须大于 0');continue;}values[name]=value;}
    if(missing.length||errors.length)return {valid:false,missing,errors};
    const savedMinutesPerRun=values.baselineMinutes-values.assistedMinutes;
    const monthlySavedHours=savedMinutesPerRun*values.monthlyRuns/60;
    const monthlyLaborValue=monthlySavedHours*values.hourlyRate;
    const monthlyNetBenefit=monthlyLaborValue-values.monthlyOperatingCost;
    const annualNetBenefit=monthlyNetBenefit*12-values.initialInvestment;
    const timeChangePercent=savedMinutesPerRun/values.baselineMinutes*100;
    const paybackMonths=monthlyNetBenefit>0?values.initialInvestment/monthlyNetBenefit:null;
    if(![savedMinutesPerRun,monthlySavedHours,monthlyLaborValue,monthlyNetBenefit,annualNetBenefit,timeChangePercent,...(paybackMonths===null?[]:[paybackMonths])].every(Number.isFinite))return {valid:false,missing:[],errors:['计算结果超出可表示范围，请检查输入量级']};
    return {valid:true,missing:[],errors:[],values,savedMinutesPerRun,monthlySavedHours,monthlyLaborValue,monthlyNetBenefit,annualNetBenefit,timeChangePercent,paybackMonths};
  }
  function normalizedInputs(value){const clean=emptyInputs();if(!value||typeof value!=='object'||Array.isArray(value))return clean;for(const [name] of numberFields){const raw=value[name];if(typeof raw==='string'&&raw.length<=100)clean[name]=raw;else if(typeof raw==='number'&&Number.isFinite(raw))clean[name]=String(raw);}clean.recordType=value.recordType==='trial'?'trial':'assumption';clean.recordSource=text(value.recordSource).slice(0,1200);return clean;}
  function readInputs(){storageError='';try{const raw=localStorage.getItem(STORAGE_KEY);if(raw&&raw.length<=12000)valueInputs=normalizedInputs(JSON.parse(raw));}catch{storageError='本机保存暂不可用；仍可在本页测算和导出。';}}
  function saveInputs(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(valueInputs));storageError='';}catch{storageError='本机保存暂不可用；仍可在本页测算和导出。';}}
  function init(context){ctx=context;if(!initialized){readInputs();initialized=true;}}
  function attribution(){if(valueInputs.recordType==='trial'&&valueInputs.recordSource.trim())return {label:'试点记录（用户填写，未独立核验）',notice:'记录来源已填写；节时与收益仍需结合样本、正确性和复核记录核验。',isVerified:false};if(valueInputs.recordType==='trial')return {label:'假设测算 · 试点来源待补充',notice:'尚未填写记录来源，当前结果不计作试点证据。',isVerified:false};return {label:'假设测算',notice:'输入是假设条件，不代表已实现的节时、降本或经济产出。',isVerified:false};}
  function valueResults(){
    const result=calculateValue(valueInputs),provenance=attribution();
    if(!result.valid)return `<div class="project-value-empty"><strong>${e(provenance.label)}</strong><p>${e(result.errors.length?result.errors.join('；'):'完整填写 6 项条件后显示测算结果；零费用请显式填 0。')}</p><small>${e(provenance.notice)}</small></div>`;
    const metrics=[['每月工时变化',n(result.monthlySavedHours,2)+' 小时',result.monthlySavedHours<0?'负值表示使用后耗时增加':'含人工复核后的时间差'],['每月净价值','¥ '+n(result.monthlyNetBenefit,2),'人工价值 − 每月运行成本'],['首年净价值','¥ '+n(result.annualNetBenefit,2),'12 × 每月净价值 − 一次性投入'],['投入回收期',result.paybackMonths===null?'不具备回收条件':n(result.paybackMonths,2)+' 个月','仅在每月净价值大于 0 时计算']];
    return `<div class="project-value-summary"><span class="project-value-status">${e(provenance.label)}</span><span>每次时间变化 ${e(n(result.savedMinutesPerRun,2))} 分钟 · ${e(n(result.timeChangePercent,1))}%</span></div><div class="project-value-metrics">${metrics.map(([title,value,note])=>`<div><span>${title}</span><strong>${e(value)}</strong><small>${note}</small></div>`).join('')}</div><p class="project-value-notice">${e(provenance.notice)} 工时折算为人工价值；是否形成现金节省需另行确认。</p>`;
  }
  function action(name,label){return `<button type="button" class="button button-small" data-project-value-action="${name}">${label}</button>`;}
  function view(){return `<details id="project-value" class="panel project-value"><summary>效率与价值测算</summary><div class="project-value-body"><p class="project-value-context">通用本机测算 · 未关联具体项目，不自动计作经营成果。</p><form id="project-value-form" novalidate><div class="project-value-inputs">${numberFields.map(([name,label,unit])=>`<label><span>${label}</span><div><input type="number" name="${name}" value="${e(valueInputs[name])}" min="${name==='baselineMinutes'?'0.000001':'0'}" step="any" inputmode="decimal" placeholder="待填写"><small>${unit}</small></div></label>`).join('')}</div><div class="project-value-provenance"><label><span>记录性质</span><select name="recordType"><option value="assumption" ${valueInputs.recordType==='assumption'?'selected':''}>假设测算</option><option value="trial" ${valueInputs.recordType==='trial'?'selected':''}>试点记录</option></select></label><label><span>记录来源 / 样本范围</span><input type="text" name="recordSource" maxlength="1200" value="${e(valueInputs.recordSource)}" placeholder="如：试点日期、样本数量、原流程记录与复核方法"></label></div></form><div id="project-value-results" aria-live="polite">${valueResults()}</div><details class="project-value-formulas"><summary>查看计算口径与验证条件</summary><p>月工时差 =（原流程分钟 − 使用后分钟）× 月次数 ÷ 60；月人工价值 = 月工时差 × 人工元 / 小时；月净价值 = 月人工价值 − 月运行成本；首年净价值 = 月净价值 × 12 − 一次性投入。</p><p>使用后耗时应包含资料整理、人工复核和返工。试点需保留同类任务的前后记录、样本数量、输出正确性、遗漏与实际费用。负收益会如实显示；测算不自动证明效率或质量提升。</p></details><div class="project-value-footer"><span id="project-value-storage-note">${e(storageError||'仅在本机保存测算条件，保留已有输入。')}</span><div>${action('export-value','导出价值测算')}${action('clear-value','清空测算条件')}</div></div></div></details>`;}
  function exportValue(){return {inputs:normalizedInputs(valueInputs),calculation:{scope:'通用本机测算，未关联具体项目，不自动计作经营成果。',attribution:attribution(),monthlySavedHours:'(baselineMinutes - assistedMinutes) * monthlyRuns / 60',monthlyLaborValue:'monthlySavedHours * hourlyRate',monthlyNetBenefit:'monthlyLaborValue - monthlyOperatingCost',annualNetBenefit:'monthlyNetBenefit * 12 - initialInvestment',paybackMonths:'initialInvestment / monthlyNetBenefit，仅月净价值大于0时计算',notice:'使用后耗时包含人工复核和返工。工时折算为人工价值；现金节省和实际成果需另行核验。'},result:calculateValue(valueInputs)};}
  function currentForm(){return mountedForm && mountedForm.isConnected!==false && document.querySelector('#project-value-form')===mountedForm?mountedForm:null;}
  function paintValue(){if(!currentForm())return;const output=document.querySelector('#project-value-results');if(output)output.innerHTML=valueResults();const note=document.querySelector('#project-value-storage-note');if(note)note.textContent=storageError||'仅在本机保存测算条件，保留已有输入。';}
  function afterRender(){
    mountedForm=document.querySelector('#project-value-form');
    if(listenersBound)return;listenersBound=true;
    document.addEventListener('click',event=>{
      const form=currentForm(),b=event.target.closest?.('[data-project-value-action]'),panel=form?.closest?.('#project-value');
      if(!form||!panel||!b||b.closest?.('#project-value')!==panel)return;
      if(b.dataset.projectValueAction==='export-value')ctx.download('LumiPilot-价值测算.json',JSON.stringify(exportValue(),null,2),'application/json;charset=utf-8');
      else if(b.dataset.projectValueAction==='clear-value'){
        valueInputs=emptyInputs();saveInputs();
        for(const field of form.elements||[])if(Object.hasOwn(valueInputs,field.name))field.value=valueInputs[field.name];
        paintValue();ctx.toast('已清空本区测算条件。');
      }
    });
    const onInput=event=>{
      const form=currentForm(),field=event.target;
      if(!form||field.closest?.('#project-value-form')!==form||!Object.hasOwn(valueInputs,field.name))return;
      valueInputs[field.name]=field.name==='recordType'?(field.value==='trial'?'trial':'assumption'):String(field.value).slice(0,field.name==='recordSource'?1200:100);
      saveInputs();paintValue();
    };
    document.addEventListener('input',onInput);document.addEventListener('change',onInput);
    document.addEventListener('submit',event=>{if(currentForm()&&event.target===currentForm())event.preventDefault();});
  }
  return {init,view,afterRender,calculateValue,exportValue};
})();
