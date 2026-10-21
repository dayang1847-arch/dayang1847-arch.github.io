'use strict';

// Saved source-bound recommendations. Reading a page never starts inference.
window.LumiLeadershipBrief = (() => {
  let ctx = {}, scope = {customerId:'',followed:true}, state = null, active = false, epoch = 0, busy = false, timer = null, error = '', bound = false, listener = null, delivered = '', loading = false;
  const list = value => Array.isArray(value) ? value : [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const root = () => document.getElementById('leadership-ai-slot');
  const key = value => JSON.stringify([value.customerId || '',value.followed !== false]);
  const canWrite = () => { const a=ctx.auth?.()||{}; return !a.readonly && !a.workspace_readonly && (a.mode==='local' || a.mode==='online' && a.user?.status==='approved' && !a.user?.must_change_password && ['admin','manager'].includes(a.user?.role)); };
  const path = '/api/business/leadership/brief';
  const priority = value => ({high:'重点关注',medium:'需要跟进',low:'常规更新'}[value]||'待核对');
  function link(ref) { const raw=String(ref.url||''); if (/^\/#(?:customers|projects|products|supply|workbench|decisions)(?:[/?]|$)/.test(raw)) return `<a href="${esc(raw)}">${esc(ref.title||'查看业务记录')}</a>`; try { const url=new URL(raw); if (['http:','https:'].includes(url.protocol)&&!url.username&&!url.password) return `<a href="${esc(url.href)}" target="_blank" rel="noopener noreferrer">${esc(ref.title||'查看来源')}</a>`; } catch {} return `<strong>${esc(ref.title||'业务记录')}</strong>`; }
  function view(options) {
    const value = !options || key(options)===key(scope) ? state : null, a=value?.analysis;
    const pending=['queued','running','retry_wait'].includes(a?.status), stale=!!(value?.input_stale || a?.input_stale);
    const title=pending?'AI 正在整理重要度':a?.status==='completed'&&!stale?'AI 重要度已整理':stale?'资料已更新，AI 简报待重整':'AI 重要度与跟进建议';
    const rows=list(a?.items || value?.items), citations=list(a?.citations || value?.citations);
    return `<section class="lba-panel" aria-label="AI 领导简报"><div class="lba-bar"><div><strong>${esc(title)}</strong><span>${value?.scope?.auto_refresh?'已启用变化后自动整理':'可按当前客户范围整理'}${a?.model?' · '+esc(a.model):''}</span></div><div class="lba-actions"><button type="button" class="button" data-lba="refresh" ${busy?'disabled':''}>刷新状态</button>${canWrite()?`<button type="button" class="button button-primary" data-lba="generate" ${busy||pending?'disabled':''}>${pending?'正在整理…':'AI 整理重要度'}</button>${value?.scope?.auto_refresh?`<button type="button" class="button" data-lba="disable" ${busy?'disabled':''}>暂停自动整理</button>`:''}`:''}</div></div>${error?`<p class="lba-error" role="alert">${esc(error)}</p>`:''}${a?.error?`<p class="lba-error">${esc(a.error.message || '本次整理未完成；原始动态仍可查看。')}</p>`:''}${a?.can_retry&&canWrite()?`<button class="button" type="button" data-lba="retry" ${busy?'disabled':''}>重试未完成分析</button>`:''}${stale?'<p class="lba-note">来源已变化；旧建议保留供查阅，不作为当前重要度排序。</p>':''}${rows.length?`<details class="lba-results"><summary>查看 ${rows.length} 条重要度建议与依据</summary>${rows.map(item=>`<article><header><strong>${esc(priority(item.priority))}</strong><span>${esc(item.title || item.event_title || '事件 '+item.event_id)}</span></header><p>${esc(item.reason || '')}</p><p><b>建议跟进：</b>${esc(item.owner || '负责人待分配')} · ${esc(item.action || '核对来源后安排')}</p><details><summary>查看原始依据</summary>${list(item.citation_ids).map(id=>{const ref=citations.find(r=>r.id===id);return ref?`<div>${link(ref)}<p class="lba-excerpt">${esc(ref.text || ref.excerpt || '')}</p></div>`:'<p>引用暂不可读，请刷新状态。</p>';}).join('')}</details></article>`).join('')}</details>`:''}<p class="lba-note">AI 提供重要度和跟进建议，不替代事实核验。首次整理后会在来源变化时自动更新；本范围每天最多 6 次模型请求，仍受工作空间总额度限制。${value?.input_truncated?'当前输入有截断，请结合全部动态查看。':''}${value?.scope?.daily_used!==undefined?'今日已用 '+Number(value.scope.daily_used)+' 次。':''}</p></section>`;
  }
  function paint() { if(active&&root())root().innerHTML=view(); }
  function schedule() { clearTimeout(timer); if(active&&(['queued','running','retry_wait'].includes(state?.analysis?.status)||state?.scope?.auto_refresh))timer=setTimeout(()=>read(),5000); }
  function deliver() { const fingerprint=JSON.stringify([scope,state?.analysis?.id,state?.analysis?.status,state?.input_stale,state?.analysis?.input_stale,state?.analysis?.items]); if(fingerprint!==delivered){delivered=fingerprint;listener?.(state);} }
  async function read() {
    if(!active||loading||busy)return;
    const own=epoch;loading=true;
    try { const result=await ctx.api(path+'?'+new URLSearchParams({customer_id:scope.customerId||'',followed:scope.followed===false?'0':'1'}));if(!active||own!==epoch)return;state=result;error='';paint();deliver(); }
    catch(e){if(active&&own===epoch){error=e.message||'暂时无法读取 AI 简报；上次结果仍保留。';paint();}}
    finally{if(own===epoch){loading=false;schedule();}}
  }
  async function act(action) {
    if(!active||busy)return;if(action==='refresh'){await read();return;}if(!canWrite())return;
    const own=epoch;busy=true;error='';paint();
    try { const result=await ctx.api(path+'/analyse','POST',{customer_id:scope.customerId||'',followed:scope.followed!==false,...(action==='disable'?{auto_refresh:false}:{}),...(action==='retry'?{retry:true}:{})}); if(!active||own!==epoch)return;state=result;deliver(); }
    catch(e){if(active&&own===epoch)error=e.message||'未能提交整理任务，请稍后重试。';}
    finally{if(own===epoch){busy=false;paint();await read();}}
  }
  function init(context){ctx=context||{};if(bound)return;bound=true;document.addEventListener('click',event=>{const button=event.target.closest?.('[data-lba]');if(button&&!button.disabled&&button.closest('#leadership-ai-slot')){event.preventDefault();act(button.dataset.lba);}});}
  function mount(options={}){listener=options.onResult||null;if(!active||key(scope)!==key(options)){++epoch;scope={customerId:options.customerId||'',followed:options.followed!==false};state=null;error='';busy=false;loading=false;delivered='';active=true;clearTimeout(timer);paint();read();}else{paint();schedule();}}
  function stop(){active=false;++epoch;clearTimeout(timer);timer=null;loading=false;busy=false;listener=null;}
  return {init,view,mount,stop};
})();
