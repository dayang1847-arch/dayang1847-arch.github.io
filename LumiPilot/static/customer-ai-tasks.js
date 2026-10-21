'use strict';

// Saved customer analyses are reviewable drafts. They never update customer facts.
window.LumiCustomerAITasks = (() => {
  let ctx = {}, active = false, generation = 0, busy = false, timer = null, bound = false;
  const types = {career_summary:'人物职业摘要',product_digest:'产品资料整理',opportunity_brief:'客户机会摘要'};
  const statuses = {queued:'排队中',running:'正在分析',retry_wait:'等待重试',completed:'已完成 · 待核对草案',failed:'未完成'};
  const ongoing = task => ['queued','running','retry_wait'].includes(task?.status);
  const list = value => Array.isArray(value) ? value : [];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const e = value => (ctx.esc || escape)(value);
  const fresh = customer => ({customer:customer || {},tasks:[],loaded:false,paused:false,error:'',notice:'',savedNotice:'',truncated:false});
  let S = fresh();
  const root = () => { const node = document.querySelector('#customer-ai-tasks-root'); return node?.dataset.customerId === String(S.customer.id) ? node : null; };
  const path = suffix => '/api/business/customers/' + encodeURIComponent(S.customer.id) + '/ai-tasks' + (suffix ? '/' + suffix : '');
  const stale = () => Object.assign(new Error('客户页面已切换'),{stale:true});
  function canWrite() {
    const auth = ctx.auth?.() || {};
    if (auth.readonly || auth.workspace_readonly) return false;
    if (['local','local_demo'].includes(auth.mode)) return true;
    return auth.mode === 'online' && auth.user?.status === 'approved' && !auth.user?.must_change_password && (list(auth.capabilities).includes('customer_write') || ['sales','admin','manager'].includes(auth.user?.role));
  }
  function setCustomer(customer) {
    if (!customer?.id) return;
    if (customer.id !== S.customer.id) { stop(); S = fresh(customer); } else S.customer = customer;
  }
  async function request(suffix = '',method = 'GET',body) {
    const own = generation, cid = S.customer.id;
    const result = await ctx.api(path(suffix),method,body);
    if (!active || own !== generation || cid !== S.customer.id || !root()) throw stale();
    return result;
  }
  function validate(task) {
    if (!task?.id || (task.customer_id && task.customer_id !== S.customer.id)) throw new Error('任务所属客户不一致，请刷新当前客户资料。');
    return task;
  }
  function upsert(task) { validate(task); S.tasks = [task,...S.tasks.filter(row => row.id !== task.id)]; }
  async function refresh() {
    const result = await request();
    const tasks = list(result.tasks).map(validate);
    S.tasks = tasks; S.loaded = true; S.paused = false; S.savedNotice = result.notice || ''; S.truncated = result.truncated === true;
  }
  function schedule() {
    clearTimeout(timer); timer = null;
    if (!active || busy || S.paused || !root() || !S.tasks.some(ongoing)) return;
    timer = setTimeout(() => { timer = null; if (!root()) { stop(); return; } execute(refresh,false); },5000);
  }
  function paint() {
    const node = root();
    if (!active || !node) return;
    const opened = new Set([...node.querySelectorAll('details[open][data-cat-detail]')].map(item => item.dataset.catDetail));
    const focused = document.activeElement?.closest('[data-cat-action]');
    const focusKey = focused && node.contains(focused) ? [focused.dataset.catAction,focused.dataset.id || '',focused.dataset.type || ''] : null;
    node.outerHTML = view();
    for (const item of root().querySelectorAll('details[data-cat-detail]')) item.open = opened.has(item.dataset.catDetail);
    if (focusKey) [...root().querySelectorAll('[data-cat-action]')].find(item => item.dataset.catAction === focusKey[0] && (item.dataset.id || '') === focusKey[1] && (item.dataset.type || '') === focusKey[2])?.focus();
    schedule();
  }
  async function execute(fn,write = true) {
    if (!active || busy || !root()) return;
    if (write && !canWrite()) { S.error = '当前部门可查看分析草案；新建与重试由销售或管理员 / 领导操作。'; paint(); return; }
    const own = generation;
    busy = true; S.error = ''; S.notice = ''; paint();
    try { await fn(); }
    catch (error) { if (!error.stale && own === generation) { S.error = error.message || '任务暂时无法读取，请手动刷新。'; S.paused = true; } }
    finally { if (own === generation) { busy = false; paint(); } }
  }
  const button = (action,label,attrs = '',disabled = false) => `<button type="button" class="button" data-cat-action="${action}" ${attrs} ${busy || disabled ? 'disabled' : ''}>${e(label)}</button>`;
  function date(value) {
    const parsed = new Date(value);
    return value && !Number.isNaN(parsed.getTime()) ? new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Shanghai'}).format(parsed) + '（北京时间）' : '时间未记录';
  }
  function sourceLink(url) {
    if (typeof url === 'string' && /^\/api\/knowledge\/documents\/[a-f0-9]{16}\/file$/.test(url)) return `<a href="${e(url)}" target="_blank" rel="noopener noreferrer">打开来源</a>`;
    try { const value = new URL(String(url || '')); return ['http:','https:'].includes(value.protocol) && !value.username && !value.password ? `<a href="${e(value.href)}" target="_blank" rel="noopener noreferrer">打开来源</a>` : ''; } catch { return ''; }
  }
  function resultView(task) {
    if (!task.result) return '';
    const result = task.result, citations = list(result.citations).length ? list(result.citations) : list(task.citations);
    const citationButton = id => {
      const index = citations.findIndex(item => String(item.id) === String(id));
      return index < 0 ? '<span>依据缺失，待核对</span>' : `<button type="button" class="bh-small-button" data-cat-source="${e(id)}" data-id="${e(task.id)}" title="${e(citations[index].title || '资料片段')}">依据 ${index + 1}</button>`;
    };
    return `<details class="bh-card" data-cat-detail="result:${e(task.id)}"><summary>查看分析草案（事实 ${list(result.facts).length} · 推断 ${list(result.inferences).length} · 建议 ${list(result.recommendations).length}）</summary><div class="cat-result"><p class="bh-note">待核对草案：事实为资料中的陈述；推断与建议需人工判断，结果不会自动写入客户主档或人物关系。</p>${[['facts','事实'],['inferences','推断'],['recommendations','建议']].map(([key,label]) => `<section aria-label="${label}"><h4>${label}</h4>${list(result[key]).length ? `<ul class="bh-list">${list(result[key]).map(item => `<li>${e(typeof item === 'string' ? item : item?.text || '')}<span class="bh-evidence">${list(item?.citation_ids).map(citationButton).join(' ')}</span></li>`).join('')}</ul>` : '<p class="bh-muted">本次未形成此类内容。</p>'}</section>`).join('')}<details class="bh-card" data-cat-detail="sources:${e(task.id)}"><summary>查看原文与依据（${citations.length}）</summary>${citations.map((item,index) => `<article class="bh-result-row" data-cat-citation="${e(item.id)}"><strong>${e(item.title || '资料片段 ' + (index + 1))}</strong>${item.locator ? `<p class="bh-muted">原文位置：${e(item.locator)}</p>` : ''}<p class="bh-source-text">${e(item.text || '原文未提供')}</p>${sourceLink(item.url)}</article>`).join('')}</details>${typeof result.model === 'string' && result.model ? `<p class="bh-muted">分析模型：${e(result.model)}</p>` : ''}</div></details>`;
  }
  function taskView(task) {
    const state = statuses[task.status] || '状态待核对';
    return `<article class="bh-card" data-cat-task="${e(task.id)}"><header><strong>${e(task.label || types[task.task_type] || '客户分析')}</strong><span class="bh-badge ${task.status === 'failed' ? 'danger' : task.status === 'completed' ? 'success' : ''}">${e(state)}</span></header><p class="bh-muted">输入版本：${e(task.input_version ?? '未记录')} · 已执行 ${e(task.attempts ?? 0)} 次${task.updated_at ? ` · 更新于 ${e(date(task.updated_at))}` : ''}</p>${task.input_stale ? '<p class="bh-note">客户资料已变化。这份草案基于旧输入，请新建任务分析最新资料。</p>' : ''}${task.error ? `<p class="bh-error" role="alert">${e(task.error.message || '分析未完成，请核对模型配置或资料后重试。')}</p>` : ''}${task.status === 'retry_wait' ? '<p class="bh-muted">服务暂时繁忙，后台将在等待后重试；可离开此页面。</p>' : ''}${ongoing(task) ? '<p class="bh-muted">任务由后台继续处理；服务运行时，关闭网页不影响已提交任务。</p>' : ''}${list(task.input_gaps).length ? `<details data-cat-detail="gaps:${e(task.id)}"><summary>输入资料缺口</summary><ul class="bh-list">${task.input_gaps.map(gap => `<li>${e(gap)}</li>`).join('')}</ul></details>` : ''}${resultView(task)}${task.status === 'failed' && task.can_retry === true && canWrite() ? `<div class="bh-actions">${button('retry','重试此任务',`data-id="${e(task.id)}"`)}</div>` : ''}</article>`;
  }
  function view(customer) {
    if (customer) setCustomer(customer);
    if (!S.customer.id) return '';
    return `<section id="customer-ai-tasks-root" class="bh-panel" data-customer-id="${e(S.customer.id)}" aria-busy="${busy}"><header class="bh-toolbar"><div><h3>客户资料分析</h3><p class="bh-muted">把已保存的人物、产品与客户资料整理成有依据的草案。</p></div>${button('refresh','刷新任务')}</header>${S.error ? `<p class="bh-error" role="alert">${e(S.error)}${S.paused ? ' 自动刷新已暂停，已保存内容仍可查看。' : ''}</p>` : ''}${S.notice ? `<p class="bh-note" role="status">${e(S.notice)}</p>` : ''}<p class="bh-note">${e(S.savedNotice || '使用已配置的模型分析所需资料片段，结果保留为草案；不会自动修改客户主档。')}</p>${!canWrite() ? '<p class="bh-muted">共享查看；新建和重试分析由销售或管理员 / 领导操作。</p>' : ''}<div class="bh-actions">${Object.entries(types).map(([key,label]) => button('create',label,`data-type="${key}"`,!canWrite() || !S.loaded)).join('')}</div><div class="cat-tasks">${S.tasks.length ? S.tasks.map(taskView).join('') : `<p class="bh-empty">${S.loaded ? '暂无分析任务。先保存客户资料，再选择需要整理的内容。' : '正在读取已保存任务…'}</p>`}</div>${S.truncated ? '<p class="bh-muted">当前展示最近 100 个任务。</p>' : ''}</section>`;
  }
  async function action(node) {
    if (node.dataset.catAction === 'refresh') { await refresh(); return; }
    if (node.dataset.catAction === 'create') {
      const task_type = node.dataset.type;
      if (!Object.hasOwn(types,task_type)) throw new Error('请选择有效的分析类型。');
      const result = await request('','POST',{task_type}); upsert(result.task); S.paused = false;
      S.notice = result.deduplicated ? '相同资料已有分析任务，已打开保存记录。' : '分析任务已保存，将由后台处理。';
    } else if (node.dataset.catAction === 'retry') {
      const task = S.tasks.find(item => item.id === node.dataset.id);
      if (!task || task.status !== 'failed' || task.can_retry !== true) throw new Error('此任务当前不能重试，请刷新查看最新状态。');
      const result = await request(encodeURIComponent(task.id) + '/retry','POST',{}); upsert(result.task); S.paused = false; S.notice = '已提交重试，仍保留为待核对草案。';
    }
  }
  function bind() {
    if (bound) return; bound = true;
    document.addEventListener('click',event => {
      const node = event.target.closest?.('[data-cat-action], [data-cat-source]');
      if (!node || !active || !root()?.contains(node)) return;
      event.preventDefault();
      if (node.hasAttribute('data-cat-source')) {
        const card = [...root().querySelectorAll('[data-cat-task]')].find(item => item.dataset.catTask === node.dataset.id);
        const citation = [...(card?.querySelectorAll('[data-cat-citation]') || [])].find(item => item.dataset.catCitation === node.dataset.catSource);
        if (citation) { citation.closest('details').open = true; citation.scrollIntoView?.({block:'nearest',behavior:'smooth'}); }
        return;
      }
      execute(() => action(node),node.dataset.catAction !== 'refresh');
    });
  }
  async function mount(customer) {
    setCustomer(customer);
    if (!root()) { stop(); return; }
    if (active) { schedule(); return; }
    active = true; ++generation;
    await execute(refresh,false);
  }
  function stop() { active = false; ++generation; busy = false; clearTimeout(timer); timer = null; }
  function init(context) { ctx = context || {}; bind(); }
  return {init,view,mount,stop};
})();
