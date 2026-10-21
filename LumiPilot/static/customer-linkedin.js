'use strict';

// The browser helper reads visible LinkedIn pages. Results are saved as a preview.
window.LumiCustomerLinkedIn = (() => {
  let ctx = {}, active = false, token = 0, epoch = 0, busy = false, polling = false, timer = null, bound = false, heartbeatTimer = null, heartbeatBusy = false, reconnectFailures = 0;
  const pending = new Map();
  const relayWaits = new Map();
  const list = value => Array.isArray(value) ? value : [];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const e = value => (ctx.esc || escape)(value);
  const lostReaders = new Set(['run_missing','run_not_owned','task_tab_closed']);
  const terminal = run => ['completed','partial','failed','cancelled'].includes(run?.status);
  const runId = run => run?.id || run?.run_id || '';
  const rows = run => list(run?.candidates || run?.records);
  const recordId = row => row.id || row.record_id || '';
  const normalized = value => String(value || '').normalize('NFKC').trim().toLocaleLowerCase();
  const commonCountries = ['中国','美国','英国','荷兰','德国','法国','越南','印度','日本','澳大利亚','阿联酋','加拿大'];
  function countries(values) {
    const seen = new Set();
    return list(values).filter(value => typeof value === 'string').map(value => value.trim()).filter(value => {
      const key = normalized(value); if (!key || seen.has(key)) return false; seen.add(key); return true;
    });
  }
  const customerCountries = value => countries(value?.linkedin_search_countries ?? value?.operating_countries ?? (value?.country ? [value.country] : []));
  const countriesFrom = value => countries(Array.isArray(value?.company_countries) ? value.company_countries : typeof value?.company_country === 'string' ? [value.company_country] : []);
  const countryAliases = [['AU','Australia','澳大利亚','澳洲'],['US','United States','USA','美国'],['GB','United Kingdom','UK','英国'],['CN','China','中国'],['NL','Netherlands','荷兰'],['DE','Germany','德国'],['FR','France','法国'],['VN','Vietnam','越南'],['IN','India','印度'],['JP','Japan','日本'],['AE','United Arab Emirates','UAE','阿联酋'],['CA','Canada','加拿大']];
  const countryKey = value => countryAliases.find(row => row.some(alias => normalized(alias) === normalized(value)))?.[0] || normalized(value);
  const countriesKey = values => JSON.stringify([...new Set(countries(values).map(countryKey))].sort());
  function savedCompanySuggestion() {
    if (S.changingCompany || S.forceCompanySearch) return null;
    const c = S.company, run = S.run, query = run && !terminal(run) ? run.query : S.query;
    if (!c || c.status !== 'confirmed' || !/^\d{1,20}$/.test(c.company_id || '') || (c.customer_id && c.customer_id !== S.customer.id)) return null;
    if (run && !terminal(run) && (run.company || rows(run).length || run.stage !== 'company_search' || !['running','waiting_company','needs_attention','awaiting_browser'].includes(run.status))) return null;
    const words = value => normalized(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').match(/[\p{L}\p{N}]+/gu) || [];
    const wanted = words(query), actual = words(c.name);
    if (!wanted.length || !actual.some((_,i) => wanted.every((word,j) => actual[i+j] === word))) return null;
    const scope = run && !terminal(run) ? countriesFrom(run) : S.companyCountries;
    return countriesKey(scope) === countriesKey(countriesFrom(c)) ? c : null;
  }
  function validateCountries(values) {
    const result = countries(values);
    if (result.length > 30) throw new Error('公司经营所在地最多选择 30 个国家或地区。');
    if (result.some(value => value.length > 100)) throw new Error('每个国家或地区请控制在 100 字以内。');
    return result;
  }
  const rowConflicts = row => [...list(row?.conflicts),...list(row?.values?.conflicts)];
  const statuses = {awaiting_browser:'等待浏览器',running:'正在读取',waiting_company:'待确认公司',needs_login:'需要登录 LinkedIn',needs_attention:'需要在浏览器处理',completed:'已完成，待核对',partial:'部分完成',failed:'未完成',cancelled:'已取消'};
  const stale = () => Object.assign(new Error('客户页面已切换'), {stale:true});
  const fresh = customer => ({customer:customer || {},query:customer?.name || '',companyCountries:[],countriesInitialized:false,countryDraft:'',company:null,companyChoices:new Map(),companyGroups:[],changingCompany:false,companyDraft:'',forceCompanySearch:false,changeRunId:'',focusCompany:false,runs:[],run:null,loaded:false,connection:'unknown',connectionVersion:'',connectionCapabilities:{},connectionCheckedAt:'',connectionIssue:'',connectionLost:false,connectorStatus:'connector_offline',serviceStatus:'unknown',maxCandidates:20,maxProfiles:5,maxPages:2,employmentScope:'current',countryFilter:'',functionFilter:'',employmentFilter:'',reviewFilter:'',screenAfterAnalysis:false,analysisSelection:new Set(),selection:new Set(),autoStarted:new Set(),taskIssue:null,error:'',notice:'',paused:false});
  let S = fresh();
  const root = () => document.querySelector('#customer-linkedin-root');
  const supportedOrigin = () => location.protocol === 'http:' && ['127.0.0.1','localhost'].includes(location.hostname) && location.port === '8790';
  const isEdge = () => /Edg(?:A|iOS)?\//.test(navigator.userAgent || '');
  const usesRelay = () => supportedOrigin() && ctx.auth?.().mode === 'local';
  const workbenchURL = () => location.origin + '/#customers/' + encodeURIComponent(S.customer.id) + '/people';
  const connectionFailure = () => !isEdge() ? '未收到 Edge 助手响应。采集需在已安装助手的 Microsoft Edge 标签页中操作；内置浏览器和其它浏览器不能调用 Edge 扩展。' : '未收到 Edge 助手响应。请在当前 Edge 标签页刷新工作台；系统会自动重试，仍无响应时再检查扩展是否启用。';
  const relayFailure = status => status === 'helper_unavailable' ? 'Edge 连接页已打开，但助手尚未响应。请查看 Edge 连接页的具体提示；已安装的无需重复安装；公司搜索与地点识别修复需要加载 0.1.5。' : 'Edge 连接服务尚未启动。点击“启动 Edge 连接服务”，之后可继续在当前浏览器操作。';
  const bridgeError = message => Object.assign(new Error(message),{bridgeFailure:true});
  const path = suffix => '/api/business/customers/' + encodeURIComponent(S.customer.id) + '/linkedin' + (suffix ? '/' + suffix : '');
  function canWrite() {
    const a = ctx.auth?.() || {};
    if (a.readonly || a.workspace_readonly) return false;
    if (a.mode === 'local') return true;
    if (a.mode !== 'online' || a.user?.status !== 'approved' || a.user?.must_change_password) return false;
    return Array.isArray(a.capabilities) ? a.capabilities.includes('customer_write') : ['admin','manager','sales'].includes(a.user?.role);
  }
  const canEditSearch = () => active && !busy && canWrite() && S.loaded && !S.changingCompany && (!S.run || terminal(S.run));
  function safeURL(value) {
    try { const u = new URL(String(value || '')); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; }
  }
  function link(url, label) { const u = safeURL(url); return u ? `<a href="${e(u)}" target="_blank" rel="noopener noreferrer">${e(label || u)}</a>` : `<span>${e(label || '来源待核对')}</span>`; }
  const note = (text, kind = 'note') => `<p class="cli-${kind}" ${kind === 'error' ? 'role="alert"' : ''}>${e(text)}</p>`;
  const button = (action, label, attrs = '', disabled = false) => `<button type="button" class="button ${action === 'analyse' ? 'button-primary' : ''}" data-cli-action="${action}" ${attrs} ${busy || disabled ? 'disabled' : ''}>${e(label)}</button>`;
  const date = value => { const d = new Date(value); return value && !Number.isNaN(d.getTime()) ? new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'medium',timeZone:'Asia/Shanghai'}).format(d) : '时间未记录'; };
  function setCustomer(customer) {
    if (!customer?.id) return;
    if (customer.id !== S.customer.id) { stop(); S = fresh(customer); } else S.customer = customer;
  }
  async function request(suffix = '', method = 'GET', body) {
    const ownToken = token, cid = S.customer.id, result = await ctx.api(path(suffix), method, body);
    if (!active || ownToken !== token || cid !== S.customer.id) throw stale();
    if (result.company_groups) S.companyGroups = list(result.company_groups);
    if (result.company_group) S.companyGroups = [result.company_group,...S.companyGroups.filter(g=>g.id!==result.company_group.id)];
    return result;
  }
  function relayDelay(ms, ownToken) {
    return new Promise((resolve,reject) => {
      const id = setTimeout(() => { relayWaits.delete(id); if (!active || token !== ownToken) reject(stale()); else resolve(); },ms);
      relayWaits.set(id,reject);
    });
  }
  async function relayAPI(suffix, method = 'GET', body) {
    const ownToken = token;
    try {
      const result = await ctx.api('/api/linkedin-connector/' + suffix,method,body);
      if (!active || ownToken !== token) throw stale();
      S.serviceStatus = 'online';
      return result;
    } catch (error) {
      if (!active || ownToken !== token || error.stale) throw stale();
      S.serviceStatus = error.status ? 'online' : 'offline';
      if (!error.status) error.message = '本机服务暂时无法访问。服务恢复后会自动检查连接，已保存资料保留。';
      throw Object.assign(error,{bridgeFailure:true});
    }
  }
  async function ensureRelay(open) {
    let status = await relayAPI('status');
    S.connectorStatus = status.status;
    if (!status.connected && open && canWrite()) {
      await relayAPI('open','POST',{});
      const ownToken = token;
      for (let i = 0; i < 20 && !status.connected; ++i) {
        await relayDelay(1000,ownToken); status = await relayAPI('status'); S.connectorStatus = status.status;
      }
    }
    if (!status.connected) throw bridgeError(relayFailure(status.status));
    return status;
  }
  async function relayCommand(command, payload) {
    const ownToken = token;
    const queued = await relayAPI('commands','POST',{command,payload,request_id:crypto.randomUUID()});
    let item = queued.command;
    if (!item || !/^[a-f0-9]{32}$/.test(item.id || '')) throw bridgeError('连接服务未返回有效的操作编号，请检查连接后重试。');
    const id = item.id;
    for (let i = 0; i < 100; ++i) {
      if (item.status === 'completed') return item.result;
      if (['failed','expired','cancelled'].includes(item.status)) {
        const code = item.error?.code;
        if (['run_not_owned','run_missing','task_tab_closed','active_run','invalid_state','invalid_company','invalid_limits','invalid_scope','cancel_sync_incomplete','cancel_helper_update_required','workspace_cancel_requested'].includes(code)) {
          const message = lostReaders.has(code) ? '原采集任务的 Edge 页面归属已丢失或属于另一标签页。连接服务本身正常；正在保留资料并解除旧任务阻塞。' : item.error?.message || '请先处理原采集任务。';
          throw Object.assign(new Error(message),{code});
        }
        throw bridgeError(item.error?.message || 'Edge 操作未完成，已保存的资料保留。请检查连接后重试。');
      }
      await relayDelay(500,ownToken);
      item = (await relayAPI('commands/' + id)).command;
      if (!item || item.id !== id) throw bridgeError('连接响应编号不一致，已停止接收。');
    }
    throw bridgeError('Edge 操作超时，已保存的资料保留。请检查连接页后刷新任务进度。');
  }
  function bridge(command, payload = {}) {
    if (usesRelay()) return relayCommand(command,payload);
    if (!supportedOrigin()) return Promise.reject(new Error('请在 Microsoft Edge 中打开本机 8790 工作台后连接助手。'));
    const requestId = crypto.randomUUID ? crypto.randomUUID() : Array.from(crypto.getRandomValues(new Uint8Array(20)), n => n.toString(16).padStart(2,'0')).join('');
    return new Promise((resolve,reject) => {
      const timeout = setTimeout(() => { pending.delete(requestId); reject(Object.assign(new Error(command === 'ping' ? connectionFailure() : '助手任务暂时无响应，已保存记录不会丢失；连接恢复后会同步原任务进度。'),{bridgeFailure:true})); }, command==='ping'?5000:15000);
      pending.set(requestId,{resolve,reject,timeout,token});
      window.postMessage({type:'LP_LINKEDIN_REQUEST',requestId,command,payload},location.origin);
    });
  }
  async function connect({quiet = false, open = false} = {}) {
    if (!quiet) { S.connection = 'checking'; refreshConnectionView(); }
    const ownToken = token;
    try {
      const status = usesRelay() ? await ensureRelay(open) : null;
      const result = status && !canWrite() ? {available:status.connected,version:status.version,capabilities:status.capabilities} : await bridge('ping');
      if (ownToken !== token || !active) throw stale();
      if (result?.available !== true) throw new Error('助手尚未就绪，请在 Edge 中检查扩展状态。');
      S.connection = 'connected'; S.connectionVersion = result.version || ''; S.connectionCapabilities = result.capabilities || {};
      S.connectionCheckedAt = new Date().toISOString();
      if (S.connectionIssue && S.error === S.connectionIssue) {
        const issue = S.connectionIssue; S.error = '';
        const alert = root()?.querySelector(':scope > .cli-error'); if (alert?.textContent === issue) alert.remove();
      }
      S.connectionIssue = ''; reconnectFailures = 0;
      if (S.connectionLost) { S.connectionLost = false; S.paused = false; S.error = ''; }
      return true;
    } catch (error) {
      if (error.stale || ownToken !== token) throw stale();
      S.connection = 'disconnected'; S.connectionVersion = ''; S.connectionIssue = error.message || connectionFailure(); ++reconnectFailures;
      if (S.notice === 'Edge 连接服务已就绪，可继续在当前浏览器操作。' || S.notice === 'Edge 助手已连接。') {
        S.notice = '';
        const notice = root()?.querySelector(':scope > .cli-success'); if (notice) notice.remove();
      }
      if (usesRelay()) error.bridgeFailure = true;
      throw error;
    }
  }
  function setRun(run) {
    if (!runId(run)) throw new Error('未读到有效任务，请刷新已保存记录。');
    if (run.customer_id && run.customer_id !== S.customer.id) throw new Error('任务所属客户不一致，已停止展示。');
    const changed = runId(S.run) !== runId(run);
    S.run = run;
    S.runs = [run,...S.runs.filter(r => runId(r) !== runId(run))];
    if (changed) { S.companyChoices.clear(); S.taskIssue = null; S.selection.clear(); S.analysisSelection.clear(); S.countryFilter = ''; S.functionFilter = ''; S.employmentFilter = ''; S.reviewFilter = ''; S.screenAfterAnalysis = false; S.companyCountries = countriesFrom(run); S.countriesInitialized = true; S.countryDraft = ''; }
    if (run.analysis?.input_stale) { S.analysisSelection.clear(); S.screenAfterAnalysis = false; }
    if (S.screenAfterAnalysis && run.analysis?.status === 'completed' && !run.analysis.input_stale) { S.reviewFilter = 'checked'; S.screenAfterAnalysis = false; }
    for (const id of [...S.selection]) if (!rows(run).some(r => recordId(r) === id && allowed(r))) S.selection.delete(id);
  }
  async function notifyCustomer(customer) {
    if (!customer || customer.id !== S.customer.id) return;
    const ownToken = token;
    S.customer = customer;
    try { await ctx.onCustomer?.(customer); }
    catch (error) { if (error.stale) throw error; if (ownToken === token) S.error = '操作已保存，但客户资料刷新未完成。请刷新已保存记录。'; }
    if (ownToken !== token || !active) throw stale();
  }
  function payload(run = S.run) {
    const company = run?.company ? Object.fromEntries(['key','name','company_id','url','query'].filter(key => run.company[key] !== undefined).map(key => [key,run.company[key]])) : null;
    return {run_id:runId(run),customer_id:S.customer.id,query:run?.query || S.query,company_countries:countriesFrom(run),location_countries:list(run?.location_countries),max_pages:run?.max_pages || 2,max_profiles:run?.max_profiles || 5,max_candidates:run?.max_candidates || 20,employment_scope:run?.employment_scope || 'current',...(company ? {company} : {})};
  }
  async function capture(snapshot, expectedId, ownEpoch = epoch) {
    if (ownEpoch !== epoch || expectedId !== runId(S.run)) return;
    if (!snapshot || snapshot.run_id !== expectedId || snapshot.customer_id !== S.customer.id) throw new Error('浏览器结果与当前客户任务不匹配，已停止接收。');
    if (!Number.isSafeInteger(snapshot.sequence) || snapshot.sequence < 0) throw new Error('浏览器进度序号无效，请重新连接。');
    if (snapshot.sequence <= Number(S.run?.sequence ?? -1)) return;
    const fields = ['sequence','status','stage','message','companies','company','candidates','errors','pages_read','profiles_read','profiles_attempted','profiles_skipped','pause_code'];
    const body = Object.fromEntries(fields.filter(key => snapshot[key] !== undefined).map(key => [key,snapshot[key]]));
    const result = await request('runs/' + encodeURIComponent(expectedId) + '/capture','POST',body);
    if (ownEpoch === epoch && expectedId === runId(S.run)) {
      setRun(result.run);
      if (result.run.pause_code === 'task_tab_closed') await closeUnavailableReader({code:'task_tab_closed'},expectedId);
      if (result.run.company?.status === 'confirmed') { S.company = result.run.company; if (expectedId === S.changeRunId) finishCompanyChange(); }
      if (result.customer?.id === S.customer.id) S.customer = result.customer;
    }
  }
  async function refresh() {
    const result = await request();
    S.runs = list(result.runs); S.company = result.company || null; S.loaded = true;
    if (!S.run && !S.countriesInitialized) { S.companyCountries = customerCountries(result.customer || S.customer); if (!S.companyCountries.length && (result.customer || S.customer).linkedin_search_countries === undefined) S.companyCountries = countriesFrom(S.company); S.countriesInitialized = true; }
    if (result.customer) await notifyCustomer(result.customer);
    if (S.run) { const result = await request('runs/' + encodeURIComponent(runId(S.run))); setRun(result.run); }
    else { const unfinished = S.runs.find(r => !terminal(r)); if (unfinished) setRun(unfinished); else if (S.runs[0]?.interruption) setRun(S.runs[0]); }
  }
  function refreshConnectionView() {
    const region = root()?.querySelector('#cli-connection-region');
    if (region) region.outerHTML = connectionView();
  }
  function armHeartbeat(delay) {
    if (heartbeatTimer !== null || !active || !root() || !supportedOrigin() || !S.loaded || busy || ['unknown','checking'].includes(S.connection)) return;
    const wait = delay ?? (S.connection === 'connected' ? 30000 : Math.min(60000, 5000 * 2 ** Math.min(reconnectFailures, 4)));
    const ownToken = token;
    heartbeatTimer = setTimeout(async () => {
      heartbeatTimer = null;
      if (!active || ownToken !== token || !root()) return;
      if (document.visibilityState === 'hidden' || busy || polling || heartbeatBusy) { armHeartbeat(30000); return; }
      heartbeatBusy = true;
      try { await connect({quiet:true}); } catch (error) { if (error.stale) return; }
      finally {
        if (active && ownToken === token) { heartbeatBusy = false; refreshConnectionView(); schedule(); armHeartbeat(); }
      }
    }, wait);
  }
  function paint() {
    if (!active || !root()) return;
    const field = root().querySelector('#cli-company-query'), focused = field && document.activeElement === field;
    const selection = focused ? [field.selectionStart,field.selectionEnd] : null;
    root().outerHTML = view();
    const next = root().querySelector('#cli-company-query');
    if (next && !busy && (focused || S.focusCompany)) { next.focus({preventScroll:focused}); if (selection) next.setSelectionRange(...selection); S.focusCompany = false; }
    schedule(); armHeartbeat();
  }
  function finishCompanyChange() { S.changingCompany = false; S.forceCompanySearch = false; S.changeRunId = ''; S.companyDraft = ''; S.focusCompany = false; if (S.company?.name) S.query = S.company.name; }
  async function stopForCompanyChange() {
    if (!S.run || terminal(S.run)) return;
    if (S.run.campaign_id) throw new Error('请先在人物操作台停止当前研究任务，再更换公司。');
    const id = runId(S.run);
    await connect({open:true});
    await bridge('cancel',{run_id:id,customer_id:S.customer.id});
    const result = await request('runs/' + encodeURIComponent(id) + '/cancel','POST',{});
    setRun(result.run); if (result.customer) await notifyCustomer(result.customer);
  }
  // Progress polling must not replace the form, candidate list or the user's focus.
  const pollLayoutKey = () => JSON.stringify([S.run?.id,S.run?.status,S.run?.company,S.run?.companies,S.run?.candidates,S.run?.analysis,S.run?.accepted_record_ids,S.error,S.notice,S.paused,S.taskIssue,S.connection]);
  function paintPolled(before, layout) {
    if (!active || !root()) return;
    if (layout !== pollLayoutKey()) { paint(); return; }
    if (before !== JSON.stringify(S.run)) {
      const region = root().querySelector('[aria-label="LinkedIn 采集进度"]');
      if (region) {
        const expanded = region.querySelector('.cli-error-history')?.open;
        region.outerHTML = runView();
        const history = root().querySelector('[aria-label="LinkedIn 采集进度"] .cli-error-history');
        if (history && expanded) history.open = true;
      }
    }
    schedule(); armHeartbeat();
  }
  async function closeUnavailableReader(error, id = runId(S.run)) {
    if (!lostReaders.has(error?.code) || !id || id !== runId(S.run) || S.run?.campaign_id) return false;
    S.paused = true; S.taskIssue = {runId:id,code:error.code};
    const result = await request('runs/' + encodeURIComponent(id) + '/interrupt','POST',{code:error.code});
    if (id !== runId(S.run)) return true;
    setRun(result.run); if (result.customer) await notifyCustomer(result.customer);
    S.error = ''; S.notice = ''; return true;
  }
  function recoveryView() {
    const issue = S.taskIssue?.runId === runId(S.run) ? S.taskIssue : S.run?.interruption;
    if (!lostReaders.has(issue?.code)) return '';
    return `<section class="cli-run" role="status" aria-label="采集任务恢复"><strong>旧浏览器任务已中断，资料已保留</strong><p>${e(issue.code === 'run_not_owned' ? '旧任务属于另一页面，此页不会接管它。可在当前连接下重新采集。' : '助手更新、浏览器重启或任务页关闭后，临时会话可能失效。原候选、来源和历史仍可查看。')}</p>${button('restart-reader','重新采集（保留历史）','',!canWrite())}<p class="cli-limits">使用原人数、页数和任职范围，沿用当前客户国家；不会自动重发 AI 分析。</p></section>`;
  }
  async function execute(fn, write = true) {
    if (!active || busy) return;
    if (write && !canWrite()) { S.error = '当前部门可查看已保存结果；采集、确认公司和加入客户由销售或管理员 / 领导操作。'; paint(); return; }
    const ownToken = token; ++epoch; busy = true; S.error = ''; S.notice = ''; paint();
    try { await fn(); } catch (error) { if (!error.stale && ownToken === token) { try { if (!await closeUnavailableReader(error)) { if (usesRelay() && error.bridgeFailure) { S.connection = 'disconnected'; S.connectionIssue = error.message; S.connectionLost = true; } else S.error = error.message || '操作未完成，请重试。'; } } catch (failure) { if (!failure.stale && ownToken === token) S.error = failure.message || '旧任务状态保存未完成，请重试恢复。'; } } }
    finally { if (ownToken === token) { busy = false; paint(); } }
  }
  function schedule() {
    clearTimeout(timer); timer = null;
    if (active && !busy && !polling && root() && ['queued','running','retry_wait'].includes(S.run?.analysis?.status)) { timer = setTimeout(pollAnalysis,2500); return; }
    if (!active || busy || polling || S.paused || !['awaiting_browser','running'].includes(S.run?.status) || !root() || !canWrite() || S.connection !== 'connected') return;
    timer = setTimeout(poll,2500);
  }
  async function pollAnalysis() {
    timer = null;
    if (!active || busy || polling || !S.run) return;
    const ownToken = token, ownEpoch = epoch, id = runId(S.run), before = JSON.stringify(S.run), layout = pollLayoutKey(); polling = true;
    try { const result = await request('runs/' + encodeURIComponent(id)); if (ownToken === token && ownEpoch === epoch && id === runId(S.run)) setRun(result.run); }
    catch (error) { if (!error.stale && ownToken === token) { S.error = 'AI 进度暂时无法读取，请刷新已保存记录。'; S.run.analysis = {...S.run.analysis,status:'unknown'}; } }
    finally { if (ownToken === token) { polling = false; paintPolled(before,layout); } }
  }
  async function poll() {
    timer = null;
    if (!active || busy || polling || !S.run || terminal(S.run) || !canWrite()) return;
    const ownToken = token, ownEpoch = epoch, id = runId(S.run), before = JSON.stringify(S.run), layout = pollLayoutKey(); polling = true;
    try { const snapshot = await bridge('status',{run_id:id,customer_id:S.customer.id}); if (ownToken === token && ownEpoch === epoch) await capture(snapshot,id,ownEpoch); }
    catch (error) { if (!error.stale && ownToken === token && ownEpoch === epoch) { try { if (!await closeUnavailableReader(error,id)) { S.error = error.message || '浏览器任务暂时无法读取，请重新连接。'; S.paused = true; if (error.bridgeFailure) { S.connection = 'disconnected'; S.connectionIssue = S.error; S.connectionLost = true; } } } catch (failure) { if (!failure.stale && ownToken === token) S.error = failure.message || '旧任务状态保存未完成，请重试恢复。'; } } }
    finally { if (ownToken === token) { polling = false; paintPolled(before,layout); } }
  }
  async function start(reuseSaved = false) {
    if (!S.query.trim()) throw new Error('请输入要在 LinkedIn 搜索的公司名称。');
    if (S.query.trim().length > 200) throw new Error('公司名称请控制在 200 字以内。');
    if (S.run && !terminal(S.run)) throw new Error('已有未结束任务，请继续或取消后再开始。');
    S.companyCountries = validateCountries([...S.companyCountries,S.countryDraft]); S.countryDraft = ''; S.countriesInitialized = true;
    const savedCompany = reuseSaved === true && !S.forceCompanySearch && S.company?.status === 'confirmed' && /^\d+$/.test(S.company?.company_id || '') && normalized(S.query) === normalized(S.company.name) && countriesKey(S.companyCountries) === countriesKey(countriesFrom(S.company)) ? S.company : null;
    for (const [value,label,max] of [[S.maxCandidates,'查询人数',100],[S.maxProfiles,'详细档案人数',50],[S.maxPages,'搜索页数',10]]) if (!Number.isSafeInteger(value) || value < 1 || value > max) throw new Error(label + '须为 1 至 ' + max + ' 的整数。');
    if (S.maxProfiles > S.maxCandidates) throw new Error('详细档案人数不能大于查询人数。');
    if (S.employmentScope === 'all' && (S.maxPages < 2 || S.maxCandidates < 2)) throw new Error('查询现任及曾任人员至少需要 2 页、2 人，以覆盖两类检索。');
    await connect({open:true});
    if ((S.companyCountries.length || customerCountries(S.customer).length) && S.connectionCapabilities.people_location_filter !== true && !/^[1-9]\./.test(S.connectionVersion)) throw new Error('按客户国家应用 Locations 需要 0.1.11 助手。请更新原扩展文件夹并 Reload，再重新连接。');
    if (!supportsExpanded() && (S.employmentScope !== 'current' || S.maxPages > 3 || S.maxProfiles > 10 || S.maxCandidates !== 30)) throw new Error('请将 Edge 助手更新至 0.1.2 后使用人数设置与曾任人员查询。下载更新包并在扩展页重新加载。');
    const result = await request('runs','POST',{expected_version:S.customer.version,query:S.query.trim(),company_countries:[...S.companyCountries],...(S.companyCountries.length ? {location_countries:[...S.companyCountries]} : {}),max_pages:S.maxPages,max_profiles:S.maxProfiles,max_candidates:S.maxCandidates,employment_scope:S.employmentScope});
    setRun(result.run); if (result.customer) await notifyCustomer(result.customer);
    const id = runId(S.run);
    if (S.forceCompanySearch) S.changeRunId = id;
    if (savedCompany) {
      const selected = await request('runs/' + encodeURIComponent(id) + '/company','POST',{company:savedCompany});
      setRun(selected.run); S.company = selected.company || selected.run.company || savedCompany;
      if (selected.customer?.id === S.customer.id) S.customer = selected.customer;
    }
    S.paused = false; const snapshot = await bridge('start',payload()); await capture(snapshot,id);
    S.notice = '已开始查找公司人物。新搜索先列出公司候选，由你确认后才读取人物。';
  }
  function accepted(row) { return !!row.accepted || !!row.accepted_at || row.status === 'accepted' || list(S.run?.accepted_record_ids).includes(recordId(row)); }
  function allowed(row) {
    const values = row.values || row;
    const company = S.run?.company;
    return !!recordId(row) && !accepted(row) && company?.status === 'confirmed' && ['search_filter_matched','profile_claimed_current','search_filter_past','profile_claimed_past'].includes(values.membership_status) && /^\d+$/.test(values.company_id || '') && String(values.company_id) === String(company.company_id) && !rowConflicts(row).length && [row,values].every(item => item.valid !== false && item.acceptable !== false && item.eligible !== false && !['invalid','rejected','failed'].includes(item.status));
  }
  function ready() { return ['completed','partial','needs_attention'].includes(S.run?.status); }
  function supportsExpanded() { return S.connectionCapabilities.employment_scope === true || /^0\.(?:[2-9]|1\.(?:[2-9]|\d{2,}))/.test(S.connectionVersion) || /^[1-9]\./.test(S.connectionVersion); }
  async function cancelOccupying() {
    const ownToken=token,current=S.run,targets=new Map();
    await connect();
    if(S.connectionCapabilities.cancel_active!==true)throw new Error('一键取消需要助手0.1.15。请在 Edge 扩展页重新加载已更新的助手，再刷新连接服务页；权限没有增加。');
    const result=await bridge('cancel_active',{});
    if(result?.status!=='cancelled'||!Array.isArray(result.cancelled_runs)||result.cancelled_runs.length>256||result.cancelled_runs.some(r=>!r||!/^([a-f0-9]{16})$/.test(r.run_id||'')||!/^([a-f0-9]{16})$/.test(r.customer_id||'')))throw new Error('未收到有效的浏览器停止确认，未显示取消成功。请检查连接后重试。');
    for(const row of result.cancelled_runs)targets.set(row.customer_id+'/'+row.run_id,row);
    if(current&&!terminal(current))targets.set(S.customer.id+'/'+runId(current),{customer_id:S.customer.id,run_id:runId(current)});
    for(const row of targets.values()){
      const base='/api/business/customers/'+encodeURIComponent(row.customer_id),runPath=base+'/linkedin/runs/'+encodeURIComponent(row.run_id);
      let saved;
      try{saved=await ctx.api(runPath,'GET');}catch(error){if(error.status===404)continue;throw error;}
      if(saved.run?.customer_id!==row.customer_id||runId(saved.run)!==row.run_id)throw new Error('返回的后台任务归属不一致，未修改该记录。');
      if(saved.run.campaign_id)await ctx.api(base+'/linkedin-campaigns/'+encodeURIComponent(saved.run.campaign_id)+'/action','POST',{action:'cancel'});
      if(!terminal(saved.run))await ctx.api(runPath+'/cancel','POST',{});
    }
    if(!active||ownToken!==token)throw stale();
    await refresh();S.paused=false;S.error='';S.notice='已取消当前 Edge 连接占用的未结束采集任务，保留人物、来源和历史。可以重新开始当前客户采集；不会自动启动新任务。';
  }
  async function startConfirmedScope(result, sourceId) {
    setRun(result.run); S.company=result.run.company;
    if(result.customer?.id===S.customer.id)S.customer=result.customer;
    // A new reader ID avoids coupling to an extension checkpoint lost on Reload.
    try { await bridge('cancel',{run_id:sourceId,customer_id:S.customer.id}); }
    catch(error) { if(!lostReaders.has(error.code))throw error; }
    const snapshot=await bridge('start',payload());
    await capture(snapshot,runId(S.run));S.paused=false;
  }
  async function action(node) {
    const name = node.dataset.cliAction;
    if (name === 'connect') { await connect({open:true}); S.paused = false; S.notice = usesRelay() ? 'Edge 连接服务已就绪，可继续在当前浏览器操作。' : 'Edge 助手已连接。'; }
    else if (name === 'refresh') await refresh();
    else if (name === 'filter-keyroles') { S.functionFilter = 'key_roles'; S.reviewFilter = 'checked'; }
    else if (name === 'filter-reset') { S.countryFilter = ''; S.functionFilter = ''; S.employmentFilter = ''; S.reviewFilter = ''; }
    else if (name === 'selection-clear') S.selection.clear();
    else if (name === 'select-matching') {
      if (!canWrite() || !ready() || S.run?.analysis?.status !== 'completed' || S.run.analysis.input_stale) throw new Error('请先完成当前证据的 AI 核对，再批量勾选。');
      S.selection = new Set(filteredRows().filter(row => allowed(row) && reviewState(row) === 'classified').map(recordId));
      S.notice = '已仅勾选当前筛选内、信息齐全且可入库的人物；请核对后点击加入客户。未直接入库。';
    }
    else if (name === 'analyse' || name === 'analyse-retry') {
      if (!ready() || !rows(S.run).length) throw new Error('请先完成或暂停采集，再核对已保存人物。');
      S.screenAfterAnalysis = true;
      const result = await request('runs/' + encodeURIComponent(runId(S.run)) + '/analyse','POST',name === 'analyse-retry' || S.run.analysis?.status === 'failed' && S.run.analysis?.can_retry ? {retry:true} : {});
      if (result.run) setRun(result.run); else setRun({...S.run,analysis:result.analysis});
      S.analysisSelection.clear(); S.notice = result.analysis?.status === 'completed' || S.run.analysis?.status === 'completed' ? '已显示本次核对与筛选结果。请按国家、职能、任职状态缩小范围，核对依据后再勾选入库。' : '已提交 DeepSeek / 已配置模型核对。完成后显示已归类人物；缺少依据保留待核实，不会自动加入客户。';
    } else if (name === 'analysis-save') {
      const analysis = S.run?.analysis;
      if (analysis?.status !== 'completed' || analysis.input_stale || !S.analysisSelection.size) throw new Error('请选择当前有效的分类建议。');
      const result = await request('runs/' + encodeURIComponent(runId(S.run)) + '/analysis-save','POST',{analysis_id:analysis.id,input_hash:analysis.input_hash,record_ids:[...S.analysisSelection]});
      if (result.run) setRun({...result.run,analysis:result.analysis || result.run.analysis}); else await refresh();
      S.analysisSelection.clear(); if (result.customer) await notifyCustomer(result.customer);
      S.notice = '分类建议已保存，保留 AI 来源与核对记录；人物归属、身份冲突仍按原始证据判断。';
      await ctx.onAccepted?.(result.customer || S.customer);
    }
    else if (name === 'open-run') { const result = await request('runs/' + encodeURIComponent(node.dataset.id)); setRun(result.run); S.paused = true; }
    else if (name === 'change-company') {
      S.companyDraft = S.changingCompany ? S.companyDraft : normalized(S.query) === normalized(S.company?.name) ? S.customer.name || S.query : S.query || S.customer.name || '';
      S.changingCompany = true; S.focusCompany = true;
    }
    else if (name === 'search-company') {
      if (!S.changingCompany) return;
      const query = S.companyDraft.trim();
      if (!query || query.length > 200) throw new Error('请输入 1 至 200 字的公司名称。');
      const scope = validateCountries([...S.companyCountries,S.countryDraft]);
      await stopForCompanyChange();
      const latest = await request(); if (latest.customer) await notifyCustomer(latest.customer);
      S.companyCountries = scope; S.countryDraft = ''; S.query = query; S.forceCompanySearch = true;
      await start(); S.notice = '已重新查询公司，请选择正确主体；确认前保留原公司的记录。';
    }
    else if (name === 'cancel-company-change') {
      if (!S.changingCompany) return;
      // Only cancel a search started by this editor, never an older collection.
      if (S.changeRunId && runId(S.run) === S.changeRunId && !terminal(S.run)) await action({dataset:{cliAction:'cancel'}});
      const latest = await request(); S.company = latest.company || null;
      if (latest.customer) await notifyCustomer(latest.customer);
      finishCompanyChange(); S.query = S.company?.name || S.customer.name || '';
      S.notice = '已取消更换；原公司、已采人物及历史记录保留。';
    }
    else if (name === 'use-saved-company') {
      // Re-read the customer's confirmation before cancelling anything. Never
      // inject a historical choice into the helper's live autocomplete list.
      const latest = await request(); S.company = latest.company || null;
      if (latest.customer) await notifyCustomer(latest.customer);
      if (S.run && !terminal(S.run)) {
        const current = list(latest.runs).find(run => runId(run) === runId(S.run));
        if (!current || terminal(current)) throw new Error('原任务状态已变化，请刷新已保存记录。');
        setRun(current);
      }
      const company = savedCompanySuggestion();
      if (!company) throw new Error('已确认公司或本次查询范围已变化，请刷新后重新核对。');
      const prior = S.run;
      await connect({open:true});
      if (prior && !terminal(prior)) {
        const id = runId(prior);
        // Stop the browser first; a failed stop must not create a second reader.
        await bridge('cancel',{run_id:id,customer_id:S.customer.id});
        const cancelled = await request('runs/' + encodeURIComponent(id) + '/cancel','POST',{});
        setRun(cancelled.run);
        if (cancelled.customer) await notifyCustomer(cancelled.customer);
        S.maxPages = prior.max_pages || 2; S.maxProfiles = prior.max_profiles || 5; S.maxCandidates = prior.max_candidates || 20; S.employmentScope = prior.employment_scope || 'current';
        S.companyCountries = countriesFrom(prior);
      }
      S.query = company.name;
      await start(true);
      S.notice = '已使用此客户确认过的公司编号开始读取；原任务与证据保留在历史中。';
    }
    else if (name === 'choose-companies') {
      const selections = list(S.run?.companies).filter(c=>S.companyChoices.get(c.key)?.checked).map(company=>({company,country_tags:(S.companyChoices.get(company.key)?.tags||'').split(/[,，;；、\n]+/).map(v=>v.trim()).filter(Boolean)}));
      if (!selections.length || S.run.status!=='waiting_company') throw new Error('请至少勾选一家本次读取的公司。');
      await connect({open:true}); const id=runId(S.run);
      if(selections.some(s=>!s.company.company_id)&&S.connectionCapabilities.company_scope_restore!==true)throw new Error('所选公司须重新核对编号，请加载0.1.16助手后确认；当前选择保留。');
      const result=await request('runs/'+encodeURIComponent(id)+'/company','POST',{selections});
      await startConfirmedScope(result,id);
      S.notice=`已确认 ${selections.length} 家公司，先采集 ${S.company.name}。各家公司独立保存；完成后可继续下一家。`;
    } else if (name === 'next-company') {
      if (!S.run?.company_group_id || !terminal(S.run) || S.run.status==='cancelled') throw new Error('请先完成或处理当前公司的采集。');
      await connect({open:true});
      const group=S.companyGroups.find(g=>g.id===S.run.company_group_id),i=group?.items.findIndex(item=>item.run_id===runId(S.run)),next=group?.items[i+1];
      if(next&&!next.company.company_id&&S.connectionCapabilities.company_scope_restore!==true)throw new Error('下一家公司须先解析公司编号，需要加载0.1.16助手。当前资料与所选标签保留。');
      const result=await request('runs/'+encodeURIComponent(runId(S.run))+'/next-company','POST',{});
      setRun(result.run); S.company=result.run.company; if(result.customer)await notifyCustomer(result.customer);
      if(!S.company.company_id && S.connectionCapabilities.company_scope_restore!==true)throw new Error('该主体尚未取得数字编号，需加载0.1.16助手后继续；所选公司与国家标签已保存。');
      const snapshot=await bridge('start',payload()); await capture(snapshot,runId(S.run)); S.paused=false;
      S.notice='已开始下一家公司；上一家的人物、来源和国家标签保留在研究范围与历史中。';
    }
    else if (name === 'start-scope-reader') {
      if(S.run?.status!=='awaiting_browser'||!S.run.company_group_id)throw new Error('当前公司已有读取进度，请继续原任务。');
      await connect({open:true});
      if(!S.run.company.company_id&&S.connectionCapabilities.company_scope_restore!==true)throw new Error('请加载0.1.16助手以核对该公司编号。');
      let snapshot=await bridge('start',payload());
      if(snapshot.status==='waiting_company')snapshot=await bridge('choose_company',{run_id:runId(S.run),customer_id:S.customer.id,company:payload().company});
      await capture(snapshot,runId(S.run));S.paused=false;
    }
    else if (name === 'choose-company') {
      const company = list(S.run?.companies)[Number(node.dataset.index)];
      if (!company || S.run?.status !== 'waiting_company') throw new Error('请先读取公司候选。');
      await connect({open:true}); const id = runId(S.run);
      const tags=(S.companyChoices.get(company.key)?.tags||'').split(/[,，;；、\n]+/).map(v=>v.trim()).filter(Boolean);
      if(tags.length&&!company.company_id&&S.connectionCapabilities.company_scope_restore!==true)throw new Error('请加载0.1.16助手后保存带标签的独立公司范围。');
      const result = await request('runs/' + encodeURIComponent(id) + '/company','POST',tags.length?{selections:[{company,country_tags:tags}]}:{company});
      if(result.company_group){await startConfirmedScope(result,id);return;}
      setRun(result.run); S.company = result.company || result.run.company || company;
      if (S.company.status === 'confirmed' && id === S.changeRunId) finishCompanyChange();
      if (result.customer?.id === S.customer.id) S.customer = result.customer;
      const snapshot = await bridge('choose_company',{run_id:id,customer_id:S.customer.id,company:payload().company}); await capture(snapshot,id); S.paused = false;
    } else if (name === 'restart-reader') {
      const prior = S.run, issue = S.taskIssue?.runId === runId(prior) ? S.taskIssue : prior?.interruption;
      if (!prior || !lostReaders.has(issue?.code) || prior.campaign_id) throw new Error('此任务没有可重建的浏览器中断记录。');
      if (!terminal(prior)) await closeUnavailableReader({code:issue.code});
      S.query = prior.query || S.customer.name; S.maxPages = prior.max_pages || 2; S.maxProfiles = prior.max_profiles || 5; S.maxCandidates = prior.max_candidates || 20; S.employmentScope = prior.employment_scope || 'current';
      S.companyCountries = customerCountries(S.customer); if (!S.companyCountries.length && S.customer.linkedin_search_countries === undefined) S.companyCountries = countriesFrom(prior);
      S.countryDraft = ''; await start();
    } else if (name === 'resume') {
      if (!S.run || terminal(S.run)) return;
      await connect({open:true}); const id = runId(S.run);
      const snapshot = await bridge('resume',payload()); await capture(snapshot,id); S.paused = false;
      S.notice = usesRelay() ? '已请求继续读取；请保持 Edge 连接页和 LinkedIn 任务页开启。' : '已请求继续读取；请保持 Edge 和本工作台页面开启。';
    } else if (name === 'cancel-occupying') {
      await cancelOccupying();
    } else if (name === 'cancel') {
      if (!S.run || terminal(S.run)) return;
      const id = runId(S.run), result = await request('runs/' + encodeURIComponent(id) + '/cancel','POST',{}); setRun(result.run);
      try { if (S.connection === 'connected') await bridge('cancel',{run_id:id,customer_id:S.customer.id}); }
      catch (error) { if (error.stale) throw error; S.notice = '任务取消已保存；未收到浏览器确认，请检查 LinkedIn 标签页。'; }
      if (!S.notice) S.notice = '任务已取消，已保存的证据仍可查看。';
    } else if (name === 'accept') {
      const ids = [...S.selection].filter(id => rows(S.run).some(row => recordId(row) === id && allowed(row)));
      if (!ready() || !ids.length) throw new Error('请先完成采集并勾选核对过的人物。');
      const result = await request('runs/' + encodeURIComponent(runId(S.run)) + '/accept','POST',{record_ids:ids,expected_version:S.customer.version});
      setRun(result.run); S.selection.clear(); await notifyCustomer(result.customer);
      S.notice = `已将 ${Number(result.accepted_count) || 0} 位人物加入客户。公司成员关系与职能分组已保留依据，上下级和决策权仍需核对。`;
      if (list(result.conflicts).some(item => item.resolution === 'current_membership_preserved_pending_review')) S.notice += ' 部分曾任线索与现任档案并存：已保留历史线索及原现任记录，请人工核对。';
      try { await ctx.onAccepted?.(result.customer); } catch (error) { if (error.stale) throw error; S.error = '人物已保存，人物框架刷新未完成；请刷新客户页面。'; }
    }
  }
  function connectionView() {
    if (usesRelay()) return relayConnectionView();
    const connected = S.connection === 'connected', outsideEdge = !isEdge(), stable = connected && /^0\.1\.[3-9]$|^0\.(?:[2-9]|1\.\d{2,})|^[1-9]\./.test(S.connectionVersion);
    return `<div id="cli-connection-region" aria-live="polite"><div class="cli-connection"><span class="cli-connection-dot ${connected ? 'ready' : ''}" aria-hidden="true"></span><strong>${connected ? 'Edge 助手已连接' : S.connection === 'checking' ? '正在检查 Edge 助手…' : 'Edge 助手尚未连接'}</strong>${connected && S.connectionVersion ? `<span class="cli-badge">助手版本 ${e(S.connectionVersion)}</span>` : ''}${button('connect',connected ? '检查连接' : '重新连接')}</div>${connected ? `<p class="cli-limits">连接心跳每30秒检查；回到本页会自动复查。${S.connectionCheckedAt ? '最近检查：'+e(date(S.connectionCheckedAt))+'。' : ''}</p>` : note(S.connectionIssue || (outsideEdge ? '采集请使用已安装助手的 Microsoft Edge。此页面仍可查看已保存资料。' : '正在等待本机 Edge 助手；暂时无响应会自动重试。'),'warning')}${!connected && outsideEdge && supportedOrigin() ? `<div class="cli-actions"><a class="button" href="microsoft-edge:${e(workbenchURL())}">在 Edge 打开客户</a><span class="cli-limits">若系统未打开 Edge，请复制当前客户网址到 Edge。</span></div>` : ''}${connected && !supportsExpanded() ? note('当前助手需更新至 0.1.2，才能按人数查询并读取曾任人员。已保存任务和 AI 核对仍可使用。','warning') : connected && !stable ? note('助手0.1.3增加独立心跳应答，可避免采集繁忙时误报断开。更新后只需在扩展页重新加载一次。','warning') : ''}<details class="cli-setup"><summary>连接排查与助手更新</summary><ol><li>在已安装助手的同一个 Microsoft Edge 标签页打开 ${link(workbenchURL(),'本机客户工作台')}，再进入“补充资料 → LinkedIn”。内置浏览器不能调用 Edge 扩展。</li><li>旧页面出现更新提示时，保存输入后点击刷新。若曾安装助手，不需要反复下载安装。</li><li>仅首次安装或确需更新时，<a class="cli-download" href="${e(path('extension'))}" download>下载 LinkedIn 采集助手</a>，将ZIP解压到固定文件夹。Edge 地址栏输入 <code>edge://extensions</code>，开启开发者模式，选择“加载解压缩的扩展”。更新同一路径后点一次 Reload，再刷新工作台。</li><li>连接检查只检查助手，不检查 LinkedIn 登录。任务提示需登录或验证时，在 LinkedIn 页面完成后继续原任务。助手不读取密码。</li></ol>${!supportedOrigin() ? note('当前地址不支持助手，请使用本机8790工作台。') : ''}</details></div>`;
  }
  function relayConnectionView() {
    const connected = S.connection === 'connected', checking = S.connection === 'checking';
    const service = S.serviceStatus === 'online' ? '可用' : S.serviceStatus === 'offline' ? '暂不可用' : '检查中';
    const login = S.run?.status === 'needs_login' ? '需要登录或验证' : '由采集任务单独检查';
    const issue = S.connectionIssue || relayFailure(S.connectorStatus);
    return `<div id="cli-connection-region" class="cli-relay-connection" aria-live="polite"><div class="cli-connection"><span class="cli-connection-dot ${connected ? 'ready' : ''}" aria-hidden="true"></span><strong>${connected ? 'Edge 助手已连接 · 本机连接服务' : checking ? '正在连接 Edge 服务…' : S.serviceStatus === 'offline' ? '本机服务暂不可用' : S.connectorStatus === 'helper_unavailable' ? '连接页在线 · 等待 Edge 助手' : 'Edge 连接服务尚未启动'}</strong>${connected && S.connectionVersion ? `<span class="cli-badge">助手 ${e(S.connectionVersion)}</span>` : ''}${button('connect',connected ? '检查连接' : '启动 Edge 连接服务','',!canWrite())}</div>${connected && S.connectionVersion === '0.1.12' ? note('采集调度更新已准备好：请在 Edge 扩展页 Reload 一次并刷新连接页，确认助手 0.1.13 后使用提速流程。已保存候选和历史保留；旧临时任务失效时使用“重新采集（保留历史）”。','warning') : ''}<div class="cli-connection-stages"><span>本机服务 <strong>${service}</strong></span><span>Edge 助手 <strong>${connected ? '可用' : checking ? '检查中' : '待连接'}</strong></span><span>LinkedIn <strong>${e(login)}</strong></span></div>${connected ? `<p class="cli-limits">当前浏览器可直接操作；采集由 Edge 执行。请保留 Edge 的「LumiPilot 连接服务」和 LinkedIn 任务页。最近检查：${e(date(S.connectionCheckedAt))}。</p>` : note(issue,'warning')}<details class="cli-setup"><summary>连接说明与首次安装</summary><ol><li>点击“启动 Edge 连接服务”，系统会打开专用 Edge 连接页。请使用 0.1.5 或更新助手。旧版更新原文件夹后只需在扩展页点一次 Reload，无需重新安装；无需把客户页面复制到 Edge。</li><li>连接页在线后，可以继续在内置浏览器、Chrome 或 Edge 输入公司、确认公司和预览人物。切换客户不会关闭专用连接页。</li><li>请保持 Edge 连接页与 LinkedIn 任务页开启。电脑休眠或服务重启后会重新检查；如果原连接页被关闭，原任务的浏览器归属可能丢失，已保存候选保留，按具体提示处理原任务或重新采集。</li><li>LinkedIn 登录与助手连接分别检查；需要登录或验证时，在助手打开的 LinkedIn 任务页完成后继续。助手不读取密码。</li><li>仅首次尚未安装时，<a class="cli-download" href="${e(path('extension'))}" download>下载 LinkedIn 采集助手</a>。在 Edge 地址栏输入 <code>edge://extensions</code>，开启开发者模式并“加载解压缩的扩展”；已安装的无需重复安装。</li></ol></details></div>`;
  }
  function companyView() {
    if (S.run?.status !== 'waiting_company') return '';
    const candidates=list(S.run.companies),excluded=list(S.run.excluded_companies),count=candidates.filter(c=>S.companyChoices.get(c.key)?.checked).length;
    return `<section class="cli-company-confirm"><h4>先确认是哪家公司（可多选分公司）</h4><p>支持 Schreder / Schréder 等重音写法。可多选名称匹配的主体；同名不代表同一公司或已验证集团关系，请结合公司页核对。</p>${countriesFrom(S.run).length ? note('这是辅助确认线索，本次国家检索范围：'+countriesFrom(S.run).join('、')+'。下方每家公司另设分类标签；标签不会覆盖员工本人工作国家。') : ''}<div class="cli-company-grid">${candidates.map((c,i) => {
      const draft=S.companyChoices.get(c.key)||{checked:false,tags:''};
      return `<article class="${draft.checked?'cli-company-selected':''}"><label class="cli-company-choice"><input type="checkbox" data-cli-company-choice="${e(c.key)}" ${draft.checked?'checked':''} ${busy||!canWrite()?'disabled':''}><strong>${e(c.name||'待核对公司')}</strong></label><p class="cli-limits">独立公司编号：${e(c.company_id||'待浏览器核对')}</p>${c.location_text?`<p>地区原文：${e(c.location_text)}</p>`:'<p>公司地区待核实</p>'}${list(c.country_evidence).map(ref=>`<p>${e(ref.country)} · ${e(ref.quote||'')}</p>${link(ref.url,'地区来源')}`).join('')}${c.url?link(c.url,'查看 LinkedIn 公司页'):''}<label class="cli-branch-country-label">国家分类标签（可多项）<input type="text" data-cli-company-tags="${e(c.key)}" value="${e(draft.tags)}" placeholder="例如：比利时；或 澳大利亚、新西兰" maxlength="500" ${busy||!canWrite()?'disabled':''}></label><small>请按公司资料填写，逗号分隔；留空显示待核实。标签记录为人工分类。</small>${button('choose-company','仅采集这家公司',`data-index="${i}"`,!canWrite())}</article>`;
    }).join('')}</div>${candidates.length?`<div class="cli-company-scope-submit">${button('choose-companies',`确认所选范围并开始（${count}）`,'',!canWrite()||!count)}<p class="cli-limits">每家公司沿用当前预算：最多 ${Number(S.run.max_pages)||0} 页、${Number(S.run.max_candidates)||0} 人、${Number(S.run.max_profiles)||0} 份档案。先采首家，完成后继续下一家；不会自动增加预算或跳过访问限制。</p></div>`:note('没有读取到匹配的公司；不会使用无关推荐补齐。请核对公司名称与 LinkedIn 页面后重试。','warning')}${excluded.length?`<details class="cli-evidence"><summary>已排除无关或地区冲突候选（${excluded.length}）</summary>${excluded.map(c=>`<p>${e(c.name||'未命名主体')} · ${e(c.reason==='country_evidence_conflict'?'明确公司地区来源与范围冲突':'名称、查询上下文不匹配或重复主体')}</p>`).join('')}<p>历史采集原记录保留；这些候选不可选取，不可用于自动合并公司。</p></details>`:''}</section>`;
  }
  function companyGroupView() {
    const group=S.companyGroups.find(g=>g.id===S.run?.company_group_id); if(!group)return '';
    const current=group.items.findIndex(item=>item.run_id===runId(S.run)),next=group.items[current+1];
    return `<section class="cli-company-scope" aria-label="多主体研究范围"><h4>已选公司与国家标签</h4><p class="cli-limits">各主体独立采集；同一员工按档案链接去重，并保留来源公司的任职线索。标签属于公司分类，非员工所在地。</p><div class="cli-company-scope-list">${group.items.map(item=>{
      const run=S.runs.find(r=>runId(r)===item.run_id),currentItem=item.run_id===runId(S.run);
      return `<article ${currentItem?'aria-current="step"':''}><div><strong>${e(item.company.name)}</strong><span class="cli-badge">${list(item.country_tags).map(code=>({BE:'比利时',GB:'英国',NL:'荷兰',AU:'澳大利亚',NZ:'新西兰',CN:'中国',US:'美国',DE:'德国',AE:'阿联酋'}[code]||code)).map(e).join(' · ')||'国家待核实'}</span></div><p class="cli-limits">${e(item.company.company_id||'编号待核对')} · ${e(group.status==='cancelled'&&!item.run_id?'范围已取消':run?statuses[run.status]||run.status:item.status==='pending'?'待采集':statuses[item.status]||'待采集')}</p>${item.run_id&&!currentItem?button('open-run','查看该公司结果',`data-id="${e(item.run_id)}"`):''}</article>`;
    }).join('')}</div>${S.run.status==='awaiting_browser'?button('start-scope-reader','启动当前公司采集','',!canWrite()):''}${next&&terminal(S.run)&&S.run.status!=='cancelled'&&group.status!=='cancelled'?button('next-company',`继续采集：${next.company.name}`,'',!canWrite()):''}<p class="cli-limits">取消当前任务会同时取消此范围中尚未开始的公司，已有资料保留。</p></section>`;
  }
  function savedCompanyView() {
    if (S.changingCompany) return `<section class="cli-company-confirm cli-company-change" aria-label="更换公司"><h4>更换公司</h4><p>输入正确名称重新查询，再选择公司主体。新确认前保留原公司，已有的人物和任务历史保留。</p><p class="cli-limits">本次检索：${e(S.companyCountries.join("、") || "不限国家")} · 候选上限 ${e(S.maxCandidates)} 人；保留原人数与页数设置。</p><label for="cli-company-query">公司名称<input id="cli-company-query" type="text" value="${e(S.companyDraft)}" maxlength="200" ${busy || !canWrite() ? 'disabled' : ''}></label><div class="cli-actions">${button('search-company',S.run && !terminal(S.run) ? '结束原任务并重新查询' : '重新查询公司','',!canWrite())}${button('cancel-company-change','取消更换','',!canWrite())}</div></section>`;
    const c = savedCompanySuggestion(); if (!c) return S.company?.status === 'confirmed' ? `<section class="cli-company-confirm" aria-label="已保存公司"><p>已保存公司：${e(S.company.name)}</p>${button('change-company','更换公司','',!canWrite())}</section>` : '';
    return `<section class="cli-company-confirm cli-saved-company" aria-label="已确认公司推荐"><h4>此前选择的公司（可更换）</h4><div class="cli-company-grid"><article><h5>${e(c.name)}</h5><p>LinkedIn 公司编号：${e(c.company_id)}</p><p>此前已由用户确认${c.confirmed_at ? ' · '+e(date(c.confirmed_at)) : ''}</p>${c.url || c.company_url ? link(c.url || c.company_url,'查看已保存公司来源') : ''}<div class="cli-actions">${button('use-saved-company','使用这家公司采集','',!canWrite())}${button('change-company','更换公司','',!canWrite())}</div></article></div><p class="cli-limits">只有点击“使用这家公司采集”才复用此编号；新搜索仍列出候选供选择。保留本次人数、页数与国家范围。若有未完成的公司搜索，将结束该搜索并保留历史，再建立新任务。</p></section>`;
  }
  function errorHistoryView(run) {
    const errors=list(run.errors);if(!errors.length)return '';
    const stages={company_search:'搜索公司',company_directory:'查找公司候选',company_identity:'核对所选公司编号',resolve_company:'核对公司',location_filter:'应用国家 Locations',interrupted:'已中断，资料保留',results:'读取搜索结果',profile:'读取个人档案',awaiting_review:'等待核对'};
    return `<details class="cli-evidence cli-error-history"><summary>历史异常与跳过记录（${errors.length}）</summary>${errors.map(raw=>{const err=typeof raw==='string'?{message:raw}:raw,resolved=err.status==='resolved'&&err.resolved_at,skipped=err.status==='skipped';return `<article><strong>${e(skipped?(err.stage==='results'?'已跳过，未计入已读搜索页':'已跳过，未计入已读档案'):resolved?'已恢复':'历史记录，恢复情况未记录')}</strong><p>${e(err.message||err.error||'页面读取未完成')}</p><p class="cli-limits">步骤：${e(stages[err.stage]||err.stage||'未记录')} · 发生：${e(err.observed_at?date(err.observed_at):'未记录')}${resolved?' · 恢复：'+e(date(err.resolved_at)):''}</p>${err.url?link(err.url,'查看当时页面'):'<span class="cli-limits">页面网址未记录</span>'}</article>`;}).join('')}</details>`;
  }
  function runView() {
    const run = S.run;
    if (!run) return '';
    const structureRetry=run.status==='needs_attention'&&run.pause_code==='result_structure_unrecognized';
    const companyRetry=run.status==='needs_attention'&&run.stage==='company_search'&&['company_no_match','page_not_ready'].includes(run.pause_code);
    const attention=['needs_login','needs_attention'].includes(run.status),resume=attention||S.paused||(run.status==='waiting_company'&&S.error),stages={company_search:'搜索公司',company_directory:'查找公司候选',company_identity:'核对所选公司编号',resolve_company:'核对公司',location_filter:'应用国家 Locations',interrupted:'已中断，资料保留',results:'读取搜索结果',profile:'读取个人档案',awaiting_review:'等待核对'};
    return `<section class="cli-run" aria-label="LinkedIn 采集进度"><div class="cli-run-title"><div><h4>${e(statuses[run.status] || '状态待核对')}</h4><p>${e(run.message || '已保存此任务的读取进度。')}</p><p class="cli-limits">当前步骤：${e(stages[run.stage]||run.stage||'未记录')} · 最后同步：${e(run.updated_at?date(run.updated_at):'未记录')}${run.profiles_skipped?' · 未读取档案 '+e(run.profiles_skipped)+' 份':''}</p></div><div class="cli-actions"><button type="button" class="button" data-crawl-log-open data-customer-id="${e(S.customer.id)}" data-task-kind="people" data-task-id="${e(run.id)}">工作日志</button>${!terminal(run) ? (resume?button('resume',companyRetry ? '重新查询公司' : structureRetry ? '重新读取当前页' : attention ? '我已处理，继续' : '继续任务','',!canWrite()):'') + button('cancel','取消任务','',!canWrite()) : ''}</div></div><div class="cli-counts"><div><strong>${Number(run.pages_read) || 0}</strong><span>已读搜索页</span></div><div><strong>${Number(run.profiles_read) || 0}</strong><span>已读个人档案</span></div><div><strong>${rows(run).length}</strong><span>人物候选</span></div></div>${countriesFrom(run).length ? `<p class="cli-country-hint">本次公司地区提示：${e(countriesFrom(run).join('、'))}（用户选择，待核对）</p>` : ''}${list(run.location_countries).length ? `<p class="cli-country-hint">Locations 检索范围：${e(run.location_countries.join('、'))}（客户选择；本人工作国家另按来源核对）</p>` : ''}${run.company ? `<p class="cli-company-current">本次公司：${link(run.company.url || run.company.company_url,run.company.name || '已确认主体')}${list(run.company.country_tags).length?` · 公司分类：${e(run.company.country_tags.join('、'))}（人工标签）`:''}</p>` : ''}${attention?note(run.message||'当前页面需要处理，请核对后继续。','error'):''}${attention ? note(companyRetry?'本次没有取得匹配公司。请在 LinkedIn 当前公司筛选框核对查询词与页面，随后点击“重新查询公司”；不会接受默认推荐或猜造主体。':structureRetry?'当前结果页未识别到职业卡片。请检查 LinkedIn 页面；页面恢复后可重新读取，原候选保留。':'请切到助手打开的 LinkedIn 标签页，完成登录或页面提示，再回到此处点击“我已处理，继续”。') : ''}${!terminal(run) ? note(usesRelay() ? '采集期间请保持本机服务、Edge 连接页与 LinkedIn 任务页开启；当前工作台可切换客户，回到此任务同步进度。' : '采集期间请保持本机服务、Edge 和本工作台页面开启。离开后可从历史任务继续并同步已读取内容。') : ''}${S.paused && !terminal(run) ? note('本页进度同步已暂停。点击“继续任务”重新连接并同步。') : ''}${errorHistoryView(run)}${companyView()}</section>`;
  }
  function evidenceView(row) {
    const evidence = list(row.evidence);
    return `<details class="cli-evidence"><summary>查看来源证据（${evidence.length}）</summary>${evidence.map(ev => `<div>${link(ev.url || ev.source_url,ev.title || '原始页面')}${ev.excerpt || ev.text ? `<p>${e(ev.excerpt || ev.text)}</p>` : ''}${ev.observed_at ? `<small>${e(date(ev.observed_at))}</small>` : ''}</div>`).join('')}${!evidence.length ? note('此候选暂无详细摘录，请打开原始档案核对。') : ''}</details>`;
  }
  function experiencesView(row) {
    const experiences = list(row.experiences || row.values?.experiences);
    return experiences.length ? `<details class="cli-evidence"><summary>已读取任职经历（${experiences.length}）</summary>${experiences.map(item => `<div><strong>${e(item.title || '职务待核对')}</strong><p>${e(item.company || '公司待核对')} · ${e([item.start_date,item.end_date].filter(Boolean).join(' — ') || item.date_text || '时间待核对')}</p></div>`).join('')}</details>` : '';
  }
  const functionLabel = value => ({engineering:'研发 / 技术',product:'产品 / 产品管理',procurement:'采购',sales:'销售 / 市场',operations:'运营 / 生产',finance:'财务',management:'管理',other:'其他',unknown:'待核实'}[value] || value || '待核实');
  const countryLabel = value => !value || value === 'unknown' ? '待核实' : value;
  const workCountry = row => row.current_work_country || row.values?.current_work_country || {code:'',name:'',status:'unknown'};
  const workCountryName = row => ['source_reported','ai_inferred'].includes(workCountry(row).status) ? workCountry(row).name || workCountry(row).code : '待核实';
  function workCountryView(row) {
    const country=workCountry(row);
    return `<p class="cli-work-country">当前工作国家：${e(workCountryName(row))} · ${['source_reported','ai_inferred'].includes(country.status)?(country.derived?'AI 根据本人地点分析，待核验':'本人地点原文，未经外部认证'):'缺少明确本人当前地点依据'}</p>${list(country.evidence).length?`<details class="cli-evidence"><summary>工作国家依据与读取时间</summary>${country.derived?`<p>AI 地点识别：${e(country.location_text)} → ${e(country.name)}。AI分析依据：${e(country.resolution?.reason||'待核对')}。</p>`:''}${list(country.evidence).map(ref=>`${link(ref.url,'个人地点来源')}<p>${e(ref.excerpt || ref.quote || '')}</p><small>${e(date(ref.observed_at || country.observed_at))}</small>`).join('')}</details>`:''}`;
  }
  const employmentLabel = value => ({current:'现任线索',past:'曾任 / 已离职线索',unknown:'任职待核实'}[value] || '任职待核实');
  function classification(row) {
    const id = recordId(row), analysis = S.run?.analysis;
    const saved = S.run?.saved_classifications;
    const persisted = Array.isArray(saved) ? saved.find(r => r.record_id === id) : saved?.[id];
    const current = ['queued','running','retry_wait','completed','failed'].includes(analysis?.status) && !analysis.input_stale ? list(analysis.items).find(r => r.record_id === id) : null;
    return current || (persisted?.input_stale ? null : persisted) || {};
  }
  const keyFunctions = ['engineering','product','procurement','finance','management'];
  function reviewState(row) {
    if (rowConflicts(row).length) return 'conflict';
    const c = classification(row);
    if (!c.record_id) return 'unreviewed';
    const v = row.values || row, company = S.run?.company;
    if (!company || company.status !== 'confirmed' || !['search_filter_matched','profile_claimed_current','search_filter_past','profile_claimed_past'].includes(v.membership_status) || String(v.company_id || '') !== String(company.company_id || '')) return 'needs_review';
    if (!['source_reported','ai_inferred'].includes(workCountry(row).status) || !workCountry(row).code || !c.function || c.function === 'unknown' || !c.employment_status || c.employment_status === 'unknown' || list(c.gaps).length) return 'needs_review';
    return 'classified';
  }
  const reviewLabel = row => ({conflict:'存在冲突 · 需核对',unreviewed:'待 AI 核对',needs_review:'已归类 · 待补证据',classified:'分类信息齐全 · 待人工确认'}[reviewState(row)]);
  function filterView() {
    const unique = key => [...new Set(rows(S.run).map(row => functionLabel(classification(row).function)))].sort();
    const countryOptions=[...new Map(rows(S.run).map(row=>{const country=workCountry(row);return ['source_reported','ai_inferred'].includes(country.status)&&country.code?[country.code,country.name||country.code]:['unknown','待核实'];})).entries()];
    const countrySelect=`<label>工作国家 / 地区<select id="cli-country-filter" aria-label="工作国家 / 地区"><option value="">全部</option>${countryOptions.map(([code,name])=>`<option value="${e(code)}" ${S.countryFilter===code?'selected':''}>${e(name)}</option>`).join('')}</select></label>`;
    const select = (id,label,items,value) => `<label>${label}<select id="${id}" aria-label="${label}"><option value="">全部</option>${id === 'cli-function-filter' ? `<option value="key_roles" ${value === 'key_roles' ? 'selected' : ''}>研发 / 产品 / 采购 / 财务 / 管理</option>` : ''}${items.map(item => `<option value="${e(item)}" ${value === item ? 'selected' : ''}>${e(item)}</option>`).join('')}</select></label>`;
    return `<div class="cli-filters" aria-label="人物分类筛选">${countrySelect}${select('cli-function-filter','职能',unique('function'),S.functionFilter)}<label>任职范围<select id="cli-employment-filter" aria-label="任职范围"><option value="">全部</option>${['current','past','unknown'].map(value => `<option value="${value}" ${value === S.employmentFilter ? 'selected' : ''}>${employmentLabel(value)}</option>`).join('')}</select></label><label>核对结果<select id="cli-review-filter" aria-label="核对结果">${[['','全部人物'],['checked','已有有效归类'],['classified','分类信息齐全'],['needs_review','待补证据'],['conflict','存在冲突'],['unreviewed','待 AI 核对'],['accepted','已加入客户']].map(([value,label])=>`<option value="${value}" ${value===S.reviewFilter?'selected':''}>${label}</option>`).join('')}</select></label></div>`;
  }
  function filteredRows() { return rows(S.run).filter(row => {
    const c = classification(row), v = row.values || row, review = reviewState(row);
    return (!S.countryFilter || (['source_reported','ai_inferred'].includes(workCountry(row).status)?workCountry(row).code:'unknown') === S.countryFilter) && (!S.functionFilter || (S.functionFilter === 'key_roles' ? keyFunctions.includes(c.function) : functionLabel(c.function) === S.functionFilter)) && (!S.employmentFilter || (c.employment_status || v.employment_status || 'unknown') === S.employmentFilter) && (!S.reviewFilter || (S.reviewFilter === 'checked' ? !!c.record_id : S.reviewFilter === 'accepted' ? accepted(row) : review === S.reviewFilter));
  }); }
  function candidateAIView(row) {
    const c = classification(row), a = S.run?.analysis;
    if (!c.record_id) return `<p class="cli-ai-status">${e(reviewLabel(row))}</p>`;
    const refs = [...list(a?.citations),...list(c.citations)].filter((ref,index,all)=>list(c.citation_ids).includes(ref.id) && all.findIndex(r=>r.id===ref.id)===index);
    return `<section class="cli-person-ai" aria-label="人物 AI 核对结果"><strong>${e(reviewLabel(row))}</strong><p>${e(c.reason || '根据已采集原文归类，仍需核对。')}</p>${list(c.gaps).length?`<details class="cli-ai-gaps"><summary>待补证据（${list(c.gaps).length}）</summary><ul>${list(c.gaps).map(gap=>`<li>${e(gap)}</li>`).join('')}</ul></details>`:''}<details class="cli-evidence"><summary>查看 AI 引用依据（${refs.length}）</summary>${refs.map(ref=>`<div>${link(ref.url,ref.title||'人物原文')}<p>${e(ref.text||ref.excerpt||'')}</p></div>`).join('')||note('引用暂未载入，请刷新后核对。')}</details></section>`;
  }
  function analysisView() {
    if (!S.run || !rows(S.run).length) return '';
    const a = S.run.analysis, running = ['queued','running','retry_wait'].includes(a?.status), usable = a?.status === 'completed' && !a.input_stale;
    const labels = {queued:'等待分析',running:'正在核对',retry_wait:'等待重试',completed:'核对已完成',failed:'核对未完成',unknown:'进度待刷新'};
    return `<section class="cli-analysis" aria-label="AI 人物核对"><div class="cli-results-heading"><div><h4>DeepSeek 核对与筛选</h4><p>使用已配置的 DeepSeek 或兼容模型，核对本次采集原文。国家只按本人当前地点原文归类，模型不能用公司总部、国籍或历史履历补齐。职能是分类建议。</p></div>${button('analyse',running ? '正在核对…' : 'DeepSeek 一键核对与筛选','',!canWrite() || !ready() || running)}</div>${a ? `<p role="status">${e(labels[a.status] || '状态待核对')} · ${Number(a.completed_count) || 0} / ${Number(a.total_count) || rows(S.run).length} 人${a.model ? ' · ' + e(a.model) : ''}</p>` : ''}${a?.input_stale ? note('采集证据已变化，旧分析已过期。请重新核对后保存分类。','warning') : ''}${a?.error ? note(a.error.message || '模型核对未完成；原始资料仍可查看。','error') : ''}${a?.can_retry ? button('analyse-retry','重试未完成分析','',!canWrite()) : ''}${usable ? `<details class="cli-analysis-details"><summary>逐人核对与保存分类建议（${list(a.items).length}）</summary><div class="cli-analysis-list">${list(a.items).map(item => { const row = rows(S.run).find(r => recordId(r) === item.record_id); return `<article><label><input type="checkbox" data-cli-analysis="${e(item.record_id)}" ${S.analysisSelection.has(item.record_id) ? 'checked' : ''} ${busy || !canWrite() ? 'disabled' : ''}><strong>${e(row?.name || '人物待核对')}</strong></label><p>${e(countryLabel(item.country))} · ${e(functionLabel(item.function))} · ${e(employmentLabel(item.employment_status))}</p><p>${e(item.reason || '')}</p>${list(item.gaps).length ? note(list(item.gaps).join('；'),'warning') : ''}<details class="cli-evidence"><summary>查看 AI 引用依据</summary>${list(item.citation_ids).map(id => { const ref = list(a.citations).find(r => r.id === id); return ref ? `<div>${link(ref.url,ref.title || '原文')}<p>${e(ref.text || ref.excerpt || '')}</p></div>` : note('引用资料暂不可见，请刷新后核对。'); }).join('')}</details></article>`; }).join('')}</div>${button('analysis-save',`保存勾选分类建议（${S.analysisSelection.size}）`,'',!canWrite() || !S.analysisSelection.size)}</details>` : ''}<p class="cli-limits">一键核对不会重新访问 LinkedIn，也不等于外部事实认证。无依据保留待核实；身份冲突须查看原文处理。保存分类与将人物加入客户是两个独立操作。</p></section>`;
  }
  function candidatesView() {
    if (!S.run || !rows(S.run).length) return ready() ? note('本次未读取到可展示的人物。这不表示该公司没有员工，可核对 LinkedIn 页面后重新采集。') : '';
    return `<section class="cli-results"><div class="cli-results-heading"><div><h4>人物候选 · 核对后加入客户</h4><p>现任与曾任分开记录；按工作所在地和职能筛选，未知信息保留待核实。</p></div>${button('accept',`将勾选人物加入客户（${S.selection.size}）`,'',!canWrite() || !ready() || !S.selection.size)}</div>${analysisView()}${filterView()}<div class="cli-screen-actions">${button('filter-keyroles','只看开发相关岗位','',!rows(S.run).some(row=>classification(row).record_id))}${button('filter-reset','显示全部人物')}${button('select-matching','仅勾选信息齐全的匹配人物','',!canWrite() || S.run?.analysis?.status!=='completed' || S.run.analysis?.input_stale || !filteredRows().some(row=>allowed(row)&&reviewState(row)==='classified'))}${button('selection-clear','清空勾选','',!S.selection.size)}</div><p class="cli-limits">批量勾选只替换本次勾选，不直接入库；缺少工作地区、任职依据或有冲突的人仍可查看和人工核对。</p><p class="cli-limits">显示 ${filteredRows().length} / ${rows(S.run).length} 人；勾选跨筛选保留，入库只包含已勾选且可接纳的人物。</p><div class="cli-people">${filteredRows().map(row => {
      const v = row.values || row, id = recordId(row), scope = row.read_scope || v.read_scope, conflicts = rowConflicts(row), membership = row.membership_status || v.membership_status;
      const membershipLabel = {search_filter_matched:'当前公司筛选命中',profile_claimed_current:'档案声明当前任职',search_filter_past:'曾任公司筛选命中',profile_claimed_past:'档案记录历史任职',unknown:'归属尚未确认'}[membership] || '待核对当前任职';
      const functionHint = v.department || v.function_hint || v.function || row.department || '待核对', inferred = !v.department && !!v.function_hint || (v.department_basis || row.department_basis) === 'inferred';
      return `<article class="cli-person"><header><label><input type="checkbox" data-cli-record="${e(id)}" ${S.selection.has(id) ? 'checked' : ''} ${busy || !canWrite() || !ready() || !allowed(row) ? 'disabled' : ''}><strong>${e(row.name || v.name || '待核对人物')}</strong></label><span class="cli-badge">${scope === 'profile' ? '已读个人档案' : '搜索结果'}</span></header><p class="cli-person-title">${e(v.title || v.headline || row.title || row.headline || '职务待核对')}</p><dl><dt>任职线索</dt><dd>${e(v.company_claim || v.company || S.run.company?.name || '待核对')} · ${e(membershipLabel)}</dd><dt>职能线索</dt><dd>${e(functionHint)}${inferred ? '（根据职务推断）' : ''}</dd><dt>任职状态</dt><dd>${e(employmentLabel(v.employment_status))}</dd><dt>工作所在地</dt><dd>${e(v.location_text || '原文未提供')}</dd><dt>AI 分类</dt><dd>${e(countryLabel(classification(row).country))} · ${e(functionLabel(classification(row).function))}（建议）</dd><dt>读取时间</dt><dd>${e(date(row.observed_at || v.observed_at || row.evidence?.[0]?.observed_at || row.captured_at))}</dd></dl>${workCountryView(row)}${candidateAIView(row)}${link(v.profile_url || v.linkedin_url || row.profile_url || row.source_url,'打开 LinkedIn 档案')}${v.membership_notice ? note(v.membership_notice) : ''}${conflicts.map(c => note(typeof c === 'string' ? c : c.message || '存在待核对冲突','warning')).join('')}${list(row.warnings).map(w => note(typeof w === 'string' ? w : w.message || '有待核对事项','warning')).join('')}${experiencesView(row)}${evidenceView(row)}${accepted(row) ? note('已加入客户档案。','success') : !allowed(row) ? note(!['search_filter_matched','profile_claimed_current','search_filter_past','profile_claimed_past'].includes(membership) || !v.company_id || String(v.company_id) !== String(S.run.company?.company_id) ? '缺少明确公司归属，暂不能加入客户；请先确认公司并核对任职证据。' : conflicts.length ? '存在身份或任职冲突，暂不能加入客户；请核对来源后处理。' : '此候选尚不符合入库条件，请核对证据。','warning') : ''}</article>`;
    }).join('')}</div></section>`;
  }
  function historyView() {
    return `<details class="cli-history"><summary>领英采集历史（${S.runs.length}）</summary>${S.runs.map(run => `<div><span>${e(run.query || S.customer.name)} · ${e(statuses[run.status] || '状态待核对')}<small>${e(date(run.created_at || run.updated_at))}</small></span>${button('open-run','查看',`data-id="${e(runId(run))}"`)}</div>`).join('')}${!S.runs.length ? note('暂无已保存的领英采集任务。') : ''}</details>`;
  }
  function countryPickerView() {
    const selected = new Set(S.companyCountries.map(normalized));
    return `<div class="cli-country-picker" role="group" aria-labelledby="cli-country-title" aria-describedby="cli-country-note"><div class="cli-country-title"><strong id="cli-country-title">领英检索国家 / 地区（沿用客户资料）</strong><span>${S.companyCountries.length} / 30</span></div><div class="cli-country-options">${commonCountries.map((country,i) => `<label class="cli-country-option" for="cli-country-${i}"><input id="cli-country-${i}" type="checkbox" data-cli-country="${e(country)}" ${selected.has(normalized(country)) ? 'checked' : ''}><span>${e(country)}</span></label>`).join('')}</div><div class="cli-country-selected" aria-label="已选经营所在地">${S.companyCountries.map(country => `<span class="cli-country-tag"><span>${e(country)}</span>${button('country-remove','×',`data-country="${e(country)}" aria-label="移除经营所在地 ${e(country)}"`,!canEditSearch())}</span>`).join('') || '<span class="cli-country-empty">尚未选择；可以留空后结合公司页核对。</span>'}</div><div class="cli-country-custom"><label for="cli-company-country">其他国家或地区<input id="cli-company-country" type="text" value="${e(S.countryDraft)}" maxlength="100" placeholder="输入一项后添加" aria-describedby="cli-country-note"></label>${button('country-add','添加','',!canEditSearch())}</div></div>`;
  }
  function changeCountries(values, focusId = '') {
    if (!canEditSearch()) return;
    try { S.companyCountries = validateCountries(values); S.countriesInitialized = true; S.countryDraft = ''; S.error = ''; }
    catch (error) { S.error = error.message; }
    paint(); if (focusId) document.getElementById(focusId)?.focus();
  }
  function scopeView() {
    return `<div class="cli-query-scope"><label for="cli-employment-scope">人员范围<select id="cli-employment-scope">${[['current','现任人员'],['past','曾任 / 已离职人员'],['all','现任与曾任人员']].map(([value,label]) => `<option value="${value}" ${S.employmentScope === value ? 'selected' : ''}>${label}</option>`).join('')}</select></label><label for="cli-max-candidates">查询人数上限<input id="cli-max-candidates" type="number" min="1" max="100" step="1" value="${S.maxCandidates}" required></label><label for="cli-max-profiles">详细档案人数<input id="cli-max-profiles" type="number" min="1" max="50" step="1" value="${S.maxProfiles}" required></label><label for="cli-max-pages">搜索页数上限<input id="cli-max-pages" type="number" min="1" max="10" step="1" value="${S.maxPages}" required></label></div>`;
  }
  function searchSettingsView() { return `<form id="cli-start"><fieldset ${busy || !canWrite() || !S.loaded || S.changingCompany || (S.run && !terminal(S.run)) ? 'disabled' : ''}><div class="cli-start-controls"><label for="cli-query">公司名称<input id="cli-query" name="query" type="text" value="${e(S.query)}" maxlength="200" required placeholder="例如 Signify"></label><button type="submit" class="button button-primary">一键采集领英人物</button></div>${scopeView()}${countryPickerView()}</fieldset></form><p id="cli-country-note" class="cli-limits">自动带入建档时选择的国家，应用到 LinkedIn Locations 缩小人物检索范围；可在此调整本次范围。搜索条件不代替本人地点证据，不代表国籍或产品销售市场。</p><p class="cli-limits">查询人数是本次候选上限，详细档案人数是本次尝试打开履历的上限，超时或不可读的档案不计入已读数；实际结果受可见页面、页数与登录状态影响。不会保证覆盖全体员工。</p>`; }
  function view(customer) {
    if (customer) setCustomer(customer);
    if (!S.customer.id) return '';
    return `<section id="customer-linkedin-root" class="customer-linkedin" aria-busy="${busy}"><header class="cli-heading"><div><span class="cli-eyebrow">LinkedIn · 公司人物研究</span><h3>从公司找到关键人物</h3><p>先设置公司名与客户所选国家，再核对公司、读取人物；可用 AI 整理职能和任职线索。</p></div><span class="cli-badge">${canWrite() ? '销售维护 · 全员共享查看' : '共享查看'}</span></header>${S.error ? note(S.error,'error') : ''}${S.notice ? `<p class="cli-success" role="status">${e(S.notice)}</p>` : ''}${!canWrite() ? note('当前部门可查看已保存资料；采集与确认入库由销售或管理员 / 领导维护。') : ''}${canWrite()?`<div class="cli-quick-cancel">${button('cancel-occupying','一键取消未结束任务')}<span>停止当前 Edge 连接占用的采集，保留已抓取资料；不会自动重启。</span></div>`:''}${connectionView()}${recoveryView()}${S.changingCompany ? '' : searchSettingsView()}${!S.loaded ? note('正在读取此客户的领英采集记录…') : ''}${savedCompanyView()}${runView()}${companyGroupView()}${candidatesView()}<div class="cli-history-tools">${button('refresh','刷新已保存记录')}</div>${historyView()}</section>`;
  }
  async function mount(customer, options = {}) {
    setCustomer(customer); if (!S.customer.id) return;
    if (!active) { active = true; ++token; S.loaded = false; }
    const ownToken = token, query = typeof options.autoStart === 'string' ? options.autoStart.trim() : '';
    const optionCountries = Array.isArray(options.companyCountries) ? countries(options.companyCountries) : typeof options.companyCountry === 'string' ? countries([options.companyCountry]) : null;
    const autoKey = JSON.stringify([normalized(query),optionCountries === null ? null : countriesKey(optionCountries)]);
    const applyOptions = canWrite() && (!query || !S.autoStarted.has(autoKey));
    if (applyOptions) {
      if (query) S.query = query;
      if (optionCountries !== null) { S.companyCountries = optionCountries; S.countriesInitialized = true; S.countryDraft = ''; }
    }
    if (!S.loaded && !busy) await execute(async () => { await refresh(); try { await connect(); } catch (error) { if (error.stale) throw error; } },false);
    else schedule();
    // A saved run may be loaded during refresh; a new caller's explicit choices
    // belong to the next search, not to that historical checkpoint.
    if (ownToken === token && active && canWrite() && typeof options.initialQuery === 'string' && (!S.run || terminal(S.run))) { S.query = options.initialQuery.trim().slice(0,200); paint(); }
    if (ownToken === token && active && applyOptions && optionCountries !== null) { S.companyCountries = optionCountries; S.countriesInitialized = true; paint(); }
    if (query && ownToken === token && active && !busy && !S.autoStarted.has(autoKey)) {
      S.autoStarted.add(autoKey);
      if (S.connection === 'connected' && canWrite() && (!S.run || terminal(S.run))) await execute(start);
      else { S.notice = '请先连接 Edge 助手，完成后点击“一键采集领英人物”。'; paint(); }
    }
  }
  function stop() {
    active = false; ++token; ++epoch; clearTimeout(timer); timer = null; busy = false; polling = false; clearTimeout(heartbeatTimer); heartbeatTimer = null; heartbeatBusy = false; reconnectFailures = 0;
    for (const item of pending.values()) { clearTimeout(item.timeout); item.reject(stale()); } pending.clear();
    for (const [id,reject] of relayWaits) { clearTimeout(id); reject(stale()); } relayWaits.clear();
  }
  function bind() {
    if (bound) return; bound = true;
    document.addEventListener('visibilitychange',() => {
      if (!active || document.visibilityState === 'hidden') return;
      clearTimeout(heartbeatTimer); heartbeatTimer = null; armHeartbeat(0);
    });
    window.addEventListener('message',event => {
      if (event.source !== window || event.origin !== location.origin || event.data?.type !== 'LP_LINKEDIN_RESPONSE') return;
      const item = pending.get(event.data.requestId); if (!item) return;
      pending.delete(event.data.requestId); clearTimeout(item.timeout);
      if (item.token !== token || !active) { item.reject(stale()); return; }
      if (event.data.error) { const code = event.data.error?.code; item.reject(Object.assign(new Error(typeof event.data.error === 'string' ? event.data.error : event.data.error.message || '浏览器助手未完成操作。'),{code,bridgeFailure:!lostReaders.has(code)})); }
      else item.resolve(event.data.result);
    });
    document.addEventListener('input',event => { const el=event.target; if(active&&!busy&&canWrite()&&S.run?.status==='waiting_company'&&el.dataset.cliCompanyTags!==undefined&&el.closest?.('#customer-linkedin-root')) { const prior=S.companyChoices.get(el.dataset.cliCompanyTags)||{};S.companyChoices.set(el.dataset.cliCompanyTags,{...prior,tags:el.value});return; } if (active && !busy && canWrite() && S.changingCompany && event.target.id === 'cli-company-query' && event.target.closest?.('#customer-linkedin-root')) { S.companyDraft = event.target.value; return; } if (!canEditSearch() || !event.target.closest?.('#customer-linkedin-root')) return; if (event.target.id === 'cli-query') S.query = event.target.value; if (event.target.id === 'cli-company-country') S.countryDraft = event.target.value;
      const field = {'cli-max-candidates':'maxCandidates','cli-max-profiles':'maxProfiles','cli-max-pages':'maxPages'}[event.target.id]; if (field) S[field] = Number(event.target.value);
    });
    document.addEventListener('keydown',event => {
      if (event.target.id === 'cli-company-query' && event.key === 'Enter' && !event.isComposing && event.target.closest?.('#customer-linkedin-root')) { event.preventDefault(); execute(() => action({dataset:{cliAction:'search-company'}})); return; }
      if (event.target.id !== 'cli-company-country' || event.key !== 'Enter' || !event.target.closest?.('#customer-linkedin-root')) return;
      event.preventDefault(); changeCountries([...S.companyCountries,S.countryDraft],'cli-company-country');
    });
    document.addEventListener('change',event => {
      const el = event.target;
      if (el.closest?.('#customer-linkedin-root')) {
        if(active&&!busy&&canWrite()&&S.run?.status==='waiting_company'&&el.dataset.cliCompanyChoice!==undefined){const key=el.dataset.cliCompanyChoice;if(list(S.run.companies).some(c=>c.key===key)){S.companyChoices.set(key,{tags:'',...S.companyChoices.get(key),checked:el.checked});paint();}return;}
        if (el.id === 'cli-employment-scope' && canEditSearch()) { S.employmentScope = el.value; return; }
        const filter = {'cli-country-filter':'countryFilter','cli-function-filter':'functionFilter','cli-employment-filter':'employmentFilter','cli-review-filter':'reviewFilter'}[el.id];
        if (filter) { S[filter] = el.value; paint(); document.getElementById(el.id)?.focus(); return; }
        if (el.dataset.cliAnalysis !== undefined && active && !busy && canWrite() && S.run?.analysis?.status === 'completed' && !S.run.analysis.input_stale) {
          const id = el.dataset.cliAnalysis; if (list(S.run.analysis.items).some(item => item.record_id === id)) { if (el.checked) S.analysisSelection.add(id); else S.analysisSelection.delete(id); paint(); } return;
        }
      }
      if (el.dataset.cliCountry !== undefined && el.closest?.('#customer-linkedin-root')) {
        const values = el.checked ? [...S.companyCountries,el.dataset.cliCountry] : S.companyCountries.filter(value => normalized(value) !== normalized(el.dataset.cliCountry));
        changeCountries(values,el.id); return;
      }
      if (!active || busy || !canWrite() || !ready() || !el.closest?.('#customer-linkedin-root') || el.dataset.cliRecord === undefined) return;
      const row = rows(S.run).find(r => recordId(r) === el.dataset.cliRecord);
      if (row && allowed(row)) { if (el.checked) S.selection.add(recordId(row)); else S.selection.delete(recordId(row)); paint(); }
    });
    document.addEventListener('submit',event => { if (!active || event.target.id !== 'cli-start') return; event.preventDefault(); if (S.changingCompany) return; if (!busy) { if (canEditSearch()) S.query = event.target.elements.namedItem('query').value; execute(start); } });
    document.addEventListener('click',event => {
      const node = event.target.closest?.('[data-cli-action]');
      if (!active || !node || node.disabled || !node.closest('#customer-linkedin-root')) return;
      event.preventDefault();
      if (node.dataset.cliAction === 'country-add') { changeCountries([...S.companyCountries,S.countryDraft],'cli-company-country'); return; }
      if (node.dataset.cliAction === 'country-remove') { changeCountries(S.companyCountries.filter(value => normalized(value) !== normalized(node.dataset.country)),'cli-company-country'); return; }
      execute(() => action(node),!['connect','refresh','open-run','filter-keyroles','filter-reset'].includes(node.dataset.cliAction));
    });
  }
  function init(context) { ctx = context || {}; bind(); }
  return {init,view,mount,stop,changeCompany:() => execute(() => action({dataset:{cliAction:'change-company'}})),isChangingCompany:() => S.changingCompany};
})();
