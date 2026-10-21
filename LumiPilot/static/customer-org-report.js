'use strict';

// A single guided entry reuses saved customers and the existing LinkedIn preview.
window.LumiCustomerOrgReport = (() => {
  let ctx = {}, bound = false, generation = 0, busy = false, timer = null, opener = null;
  let S = {};
  const list = value => Array.isArray(value) ? value : [];
  const escape = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const e = value => (ctx.esc || escape)(value);
  const idOK = value => /^[a-f0-9]{16}$/.test(String(value || ''));
  const base = cid => '/api/business/customers/' + encodeURIComponent(cid);
  const reportsPath = cid => base(cid) + '/org-reports';
  const root = () => document.getElementById('customer-org-report-dialog');
  const isOpen = () => !!root();
  const canWrite = () => {
    const a = ctx.auth?.() || {};
    if (a.readonly || a.workspace_readonly || a.must_change_password) return false;
    if (a.mode === 'local') return a.can_manage === true;
    return a.mode === 'online' && a.user?.status === 'approved' && !a.user.must_change_password && (Array.isArray(a.capabilities) ? a.capabilities.includes('customer_write') : ['sales','admin','manager'].includes(a.user?.role));
  };
  const countryNames = {CN:'中国',US:'美国',GB:'英国',NL:'荷兰',DE:'德国',FR:'法国',VN:'越南',IN:'印度',JP:'日本',AU:'澳大利亚',AE:'阿联酋',CA:'加拿大'};
  const split = value => [...new Set(String(value || '').split(/[,，;；、\n]/).map(v => v.trim()).filter(Boolean))];
  const date = value => value && !Number.isNaN(Date.parse(value)) ? new Intl.DateTimeFormat('zh-CN',{dateStyle:'medium',timeStyle:'medium',timeZone:'Asia/Shanghai'}).format(new Date(value)) : '时间未记录';
  const note = (text, kind = 'note') => `<p class="cor-${kind}" ${kind === 'error' ? 'role="alert"' : ''}>${e(text)}</p>`;
  const button = (action, text, attrs = '', disabled = false, primary = false) => `<button type="button" class="button ${primary ? 'button-primary' : ''}" data-cor-action="${action}" ${attrs} ${busy || disabled ? 'disabled' : ''}>${e(text)}</button>`;
  const employment = value => ({current:'现任',past:'曾任 / 已离职',unknown:'任职待核实'}[value] || '任职待核实');
  const reportState = value => ({queued:'等待整理',running:'正在整理',completed:'已保存报告',failed:'未完成',interrupted:'已中断'}[value] || '状态待核实');
  const pending = report => ['queued','running'].includes(report?.status);
  const countryName = code => countryNames[code] || (code === 'unknown' ? '工作国家待核实' : code);
  function safeURL(value) { try { const u = new URL(String(value || '')); return ['http:','https:'].includes(u.protocol) && !u.username && !u.password ? u.href : ''; } catch { return ''; } }
  const link = (url, title) => safeURL(url) ? `<a href="${e(safeURL(url))}" target="_blank" rel="noopener noreferrer">${e(title || '查看来源')}</a>` : `<span>${e(title || '来源网址未记录')}</span>`;
  const currentCountry = person => person?.current_work_country?.status === 'source_reported' ? person.current_work_country.code : 'unknown';
  const stale = () => Object.assign(new Error('人员报告页面已切换'),{stale:true});
  async function api(url, method = 'GET', body) {
    const own = generation, cid = S.customer?.id, result = await ctx.api(url,method,body);
    if (!isOpen() || own !== generation || cid !== S.customer?.id) throw stale();
    return result;
  }
  function checkedReport(response,cid,rid = '') {
    const report = response?.report;
    if (!report || report.customer_id !== cid || !idOK(report.id) || (rid && report.id !== rid)) throw new Error('报告与当前客户或所选版本不匹配，请刷新重试。');
    return report;
  }
  function close() {
    ++generation; clearTimeout(timer); timer = null; busy = false;
    window.LumiCustomerLinkedIn?.stop();
    const dialog = root(); if (dialog) { if (dialog.open) dialog.close(); dialog.remove(); }
    S = {}; if (opener?.isConnected) opener.focus?.(); opener = null;
  }
  function selectOptions(rows, value, title = '请选择') {
    return `<option value="">${title}</option>` + rows.map(([v,t]) => `<option value="${e(v)}" ${v === value ? 'selected' : ''}>${e(t)}</option>`).join('');
  }
  function countryHints() {
    if (S.mode === 'existing') { const customer = S.customers.find(c => c.id === S.selectedCustomer); const codes = list(customer?.linkedin_search_countries ?? customer?.operating_countries ?? (customer?.country ? [customer.country] : [])); return note('领英检索国家：' + (codes.map(countryName).join('、') || '未选择（不限国家）') + '。自动沿用客户资料；如需修改请编辑客户。检索选择不会写成已核实的个人工作地。'); }
    const values = [...new Set([...Object.keys(countryNames),...S.hints])];
    return `<fieldset class="cor-country-hints" ${busy ? 'disabled' : ''}><legend>领英检索国家 / 地区（可多选）</legend><div>${values.map(code => `<label class="cor-check"><input type="checkbox" data-cor-hint="${e(code)}" value="${e(code)}" ${S.hints.includes(code) ? 'checked' : ''}>${e(countryName(code))}</label>`).join('')}</div><div class="cor-inline"><label>其他国家代码<input id="cor-other-country" value="${e(S.hintDraft)}" maxlength="2" placeholder="例如 SG"></label>${button('add-hint','添加')}</div><small>保存到客户资料，采集自动应用 LinkedIn Locations；人员工作国家仍按本人地点原文核对；不会写成已核实的经营范围。</small></fieldset>`;
  }
  function customerStep() {
    const matching = S.customers.filter(c => c.name?.trim().toLocaleLowerCase() === S.newName.trim().toLocaleLowerCase());
    return `<div class="cor-intro"><h3>先确认研究哪家公司</h3><p>可以继续已有客户，也可以独立建档。集团、子公司和同名公司保留各自记录。</p></div><div class="cor-tabs" role="group" aria-label="选择客户方式">${button('mode-existing','选择已有客户',`aria-pressed="${S.mode === 'existing'}"`)}${button('mode-new','建立新客户',`aria-pressed="${S.mode === 'new'}"`,!canWrite())}</div>${S.mode === 'new' ? `<form id="cor-new-customer"><fieldset ${busy || !canWrite() ? 'disabled' : ''}><div class="cor-fields"><label>客户公司名称<input name="name" data-cor-draft="newName" value="${e(S.newName)}" maxlength="200" required placeholder="例如 Signify"></label><label>官方网站（可选）<input name="website" data-cor-draft="newWebsite" value="${e(S.newWebsite)}" type="url" placeholder="https://"></label></div>${matching.length ? note('已有 '+matching.length+' 个同名客户，请先核对主体。此次仍会建立独立档案，不会自动合并。','warning') : ''}${countryHints()}<button class="button button-primary" type="submit">建立档案并继续</button></fieldset></form>` : `<form id="org-report-select"><label>现有客户<select name="customer_id" required>${selectOptions(S.customers.map(c => [c.id,c.name]),S.selectedCustomer,'请选择客户')}</select></label>${countryHints()}<div class="cor-actions"><button class="button button-primary" type="submit" ${busy || !S.customers.length ? 'disabled' : ''}>继续研究此客户</button></div></form>${!S.customers.length ? note('暂无客户。销售或管理者可以先建立新客户。') : ''}`}`;
  }
  function collectStep() {
    const people = list(S.detail?.people);
    return `<div class="cor-step-heading"><div><h3>${e(S.customer.name)} · 采集与核对人员</h3><p>先确认 LinkedIn 公司主体，再调整人数、页数和现任 / 曾任范围。AI 分类与候选入库都需要明确操作。</p></div><div class="cor-actions">${button('to-customer','更换客户')}${button('to-report',people.length ? '使用已保存人员整理报告' : '查看报告与覆盖情况','',false,true)}</div></div>${note('候选预览不等于已加入客户。报告只纳入已采纳的人物；没有上下级依据时，按职能整理人员框架。')}${canWrite() ? (window.LumiCustomerLinkedIn?.view(S.customer) || note('人物采集模块尚未加载，请刷新工作台。','warning')) : note('当前角色共享查看。采集、AI 分类和确认入库由销售或管理者维护。')}`;
  }
  function evidenceView(refs) {
    return list(refs).map(ref => `<article class="cor-source">${link(ref.url,ref.title || ref.id || '原始来源')}<p>${e(ref.excerpt || ref.quote || ref.text || '')}</p><small>来源记录时间：${e(date(ref.observed_at || ref.collected_at))}${ref.searched_at ? ' · 搜索于 '+e(date(ref.searched_at)) : ''}</small></article>`).join('');
  }
  function verificationHistory(person,sources) {
    const history = list(person.verification_history); if (!history.length) return '<small>尚无核对历史</small>';
    return `<details class="cor-verification"><summary>核对历史（${history.length}）</summary>${history.map(h => `<article><strong>${e(h.mode === 'linkedin_profile' ? '本人领英读取与 AI 比较' : h.mode === 'web_search' ? '公开网页补充核对' : '已保存核对')}</strong><p>${e(h.summary || '')}</p><small>核对状态：${e({completed:'已完成',failed:'未完成',interrupted:'已中断',cancelled:'已取消',queued:'等待处理',running:'处理中',awaiting_profile:'等待读取本人档案'}[h.status] || '待核实')} · 请求于 ${e(date(h.created_at))} · 核对于 ${e(date(h.checked_at))}</small>${h.identity_status ? `<p class="cor-muted">身份判断：${e({matched:'公开依据匹配，仍需人工核对',ambiguous:'存在同名歧义',mismatch:'存在身份冲突',unknown:'证据不足'}[h.identity_status] || '待核实')}</p>` : ''}${list(h.adopted_fields).length ? `<p>已采纳字段：${e(h.adopted_fields.join('、'))}</p>` : '<p class="cor-muted">此记录未修改人物字段。</p>'}${h.error ? note(h.error.message || '本次核对未完成。','warning') : ''}${evidenceView(list(h.source_ids).map(id => sources.get(id)).filter(Boolean))}</article>`).join('')}</details>`;
  }
  function peopleTable(people,sources) {
    if (!list(people).length) return note('此范围没有已保存人物。未采纳候选和未知信息不会自动补齐。');
    return `<div class="cor-table-scroll" tabindex="0"><table><thead><tr><th>人物与职务</th><th>职能与任职</th><th>工作所在地</th><th>来源与核对历史</th></tr></thead><tbody>${people.map(p => {const refs = list(p.evidence_ids).map(id => sources.get(id)).filter(Boolean);return `<tr><td><strong>${e(p.name)}</strong><br>${e(p.title || '职务待核实')}</td><td>${e(p.department || p.function_hint || p.function || '职能待核实')}<br><small>${e(employment(p.employment_status))}</small></td><td>${e(countryName(currentCountry(p)))}<br><small>${e(p.location_text || '地点原文未记录')}</small></td><td>${link(p.profile_url,'职业档案')}${refs.length ? `<details><summary>依据（${refs.length}）</summary>${evidenceView(refs)}</details>` : list(p.evidence).length ? `<details><summary>依据（${p.evidence.length}）</summary>${evidenceView(p.evidence)}</details>` : '<small>依据待补充</small>'}${verificationHistory(p,sources)}</td></tr>`;}).join('')}</tbody></table></div>`;
  }
  function reportPreview(report) {
    if (!report) return note('还没有人员框架报告。选择范围后生成；已有采集资料会被复用，不会自动重新搜索。');
    const people = list(report.people), byId = new Map(people.map(p => [p.id,p])), sources = new Map(list(report.sources).map(ref => [ref.id,ref]));
    const groups = list(report.groups).filter(group => /^(department|function|function_hint|ai_function):/.test(group.key || '')), lines = list(report.reporting_lines), others = list(report.other_relations);
    const ai = report.ai || {};
    return `<article class="cor-report" aria-label="已保存人员框架报告"><header><div><h3>${e(report.customer?.name || S.customer.name)} · 人员框架报告</h3><small>${e(reportState(report.status))} · 生成于 ${e(date(report.generated_at))}${report.completed_at ? ' · 完成于 '+e(date(report.completed_at)) : ''}</small></div><div class="cor-downloads">${['docx','markdown','html'].map(format => report.status === 'completed' && idOK(report.id) ? `<a class="button" href="${e(reportsPath(S.customer.id)+'/'+report.id+'/export?format='+format+(format === 'html' ? '&view=print' : ''))}" ${format === 'html' ? 'target="_blank" rel="noopener noreferrer"' : 'download'}>${{docx:'导出 Word',markdown:'导出 Markdown',html:'打印 / 保存 PDF'}[format]}</a>` : `<button class="button" disabled>${{docx:'导出 Word',markdown:'导出 Markdown',html:'打印 / 保存 PDF'}[format]}</button>`).join('')}</div></header><p class="cor-muted">打印版在新标签页打开后，使用浏览器“打印”保存为 PDF。</p>${report.input_stale ? note('客户或人员资料已更新。本报告保留生成时的快照，重新生成后才能包含新的资料。','warning') : ''}${pending(report) ? note('报告由本机服务继续整理。此处显示已保存规则快照；完成后可下载，不会自动修改人物档案。') : ''}${report.error ? note(report.error.message || report.error,'warning') : ''}${coverageView(report.coverage)}${groups.length ? `<section><h4>按职能整理的人员框架</h4><p class="cor-muted">分组表示岗位线索，不表示真实部门编制、职级或决策权。</p><div class="cor-groups">${groups.map(group => {const members = list(group.person_ids).map(id => byId.get(id)).filter(Boolean);return `<section><h5>${e(group.label || '职能待核实')}</h5><small>${group.inferred ? '岗位 / AI 职能线索，需核对' : '已登记部门或职能'}</small>${members.map(p => `<p><strong>${e(p.name)}</strong><span>${e(p.title || '职务待核实')} · ${e(employment(p.employment_status))}</span></p>`).join('') || '<p>人员明细见下表。</p>'}</section>`;}).join('')}</div></section>` : ''}<section><h4>报告人物（${people.length}）</h4>${peopleTable(people,sources)}</section><section><h4>有证据确认的汇报关系（${lines.length}）</h4>${note('仅显示报告明确确认并保留来源的关系，不按职位高低推断上下级。')}${relationsView(lines,byId,sources)}</section>${others.length ? `<details><summary>其他关系与待核实线索（${others.length}）</summary>${relationsView(others,byId,sources)}</details>` : ''}${aiView(ai,byId,sources)}${list(report.gaps).length ? `<section><h4>覆盖缺口与下一步核对</h4><ul>${report.gaps.map(g => `<li>${e(typeof g === 'string' ? g : g.message || g.text || '')}</li>`).join('')}</ul></section>` : ''}${list(report.duplicate_warnings).length ? `<section><h4>可能重合的人物记录</h4><p class="cor-muted">仅提示人工核对，没有合并档案。</p><ul>${report.duplicate_warnings.map(v => `<li>${e(typeof v === 'string' ? v : v.message || v.notice || '')}</li>`).join('')}</ul></section>` : ''}<details class="cor-sources"><summary>来源索引与摘录（${list(report.sources).length}）</summary><p class="cor-muted">来源保留记录时间与索引；导出中的长历史原文可能显示限长摘录，完整内容保留在软件报告快照。</p>${evidenceView(report.sources)}</details></article>`;
  }
  function coverageView(coverage) {
    if (!coverage || typeof coverage !== 'object') return '';
    const labels = {saved_people:'已保存人物',scoped_people:'本报告人物',unaccepted_candidates:'未采纳候选',unknown_work_country:'工作国家待核实',unknown_employment:'任职待核实',confirmed_reporting_lines:'已证实汇报关系',people_without_sources:'缺少原文依据',ai_uncovered_people:'未纳入 AI 分析'};
    const items = Object.entries(labels).filter(([key]) => Number.isFinite(coverage[key]));
    const basisNote = coverage.candidate_count_basis === 'per_run_records_not_unique_people' ? note('未采纳候选按采集任务记录计数，跨任务可能重复，不等于未识别员工人数。') : '';
    return (items.length ? `<div class="cor-metrics">${items.map(([key,label]) => `<div><strong>${e(coverage[key])}</strong><span>${label}</span></div>`).join('')}</div>` : '') + basisNote;
  }
  function relationsView(relations,byId,sources) {
    return relations.length ? `<ul class="cor-relations">${relations.map(r => `<li><strong>${e(byId.get(r.from_person_id)?.name || r.from_name || '未登记人物')} → ${e(byId.get(r.to_person_id)?.name || r.to_name || r.target_company || '关联对象待核实')}</strong><p>${e(r.notes || r.description || '')}</p><small>${e(r.status === 'confirmed' ? '已确认，有依据' : '待核实线索')}</small>${evidenceView(list(r.evidence_ids).map(id => sources.get(id)).filter(Boolean))}</li>`).join('')}</ul>` : note('尚无具备明确来源的已确认上下级关系。人员框架仍可按职能查看。');
  }
  function aiView(ai,byId,sources) {
    if (!ai || !ai.status || ai.status === 'not_requested') return note('本报告使用已保存资料按规则整理，未发起 AI 分析。');
    const status = {queued:'等待 AI 整理',running:'AI 正在整理',completed:'AI 辅助整理已完成',partial:'AI 部分完成，规则报告已保留',failed:'AI 未完成，规则报告已保留',disabled:'AI 未启用，规则报告已保留',not_requested:'未使用 AI'}[ai.status] || 'AI 整理状态待核实';
    return `<section class="cor-ai"><h4>${status}</h4>${ai.notice ? note(ai.notice, ['failed','partial'].includes(ai.status) ? 'warning' : 'note') : ''}${ai.error ? note(ai.error.message || '本次 AI 未完成，规则报告可继续使用。','warning') : ''}<p class="cor-muted">已分析 ${Number(ai.covered_people) || 0} 人 · 已执行 ${Number(ai.completed_requests) || 0} 次模型请求${ai.model ? ' · '+e(ai.model) : ''}</p>${list(ai.items).length ? `<ul>${ai.items.map(v => `<li><strong>${e(byId.get(v.record_id)?.name || '已保存人物')}</strong> · ${e({product:'产品',engineering:'研发 / 工程',procurement:'采购',sales:'销售',operations:'运营 / 供应链',finance:'财务',management:'管理',other:'其他职能',unknown:'职能待核实'}[v.function] || '职能待核实')}<p>${e(v.reason || '')}</p>${list(v.gaps).length ? `<p class="cor-muted">待核实：${e(v.gaps.join('；'))}</p>` : ''}${(() => {const refs = list(v.citation_ids).map(id => sources.get(id)).filter(Boolean);return refs.length ? `<details><summary>分析依据（${refs.length}）</summary>${evidenceView(refs)}</details>` : '';})()}</li>`).join('')}</ul>` : ''}<small>AI 仅解释已有证据，不自动搜索、不确认上下级、不修改人物。</small></section>`;
  }
  function reportStep() {
    const saved = list(S.detail?.people), options = [...new Set(saved.map(currentCountry))].sort();
    return `<div class="cor-step-heading"><div><h3>${e(S.customer.name)} · 整理人员框架</h3><p>已保存 ${saved.length} 位人物。选择报告范围，留下来源、采集时间和核对历史。</p></div><div class="cor-actions">${button('to-collect','继续采集与核对','',!canWrite())}${button('refresh','刷新已保存资料')}</div></div><form id="cor-generate"><fieldset ${busy || !canWrite() || pending(S.report) ? 'disabled' : ''}><div class="cor-fields"><label>报告任职范围<select name="employment_scope">${[['all','全部已保存人物'],['current','现任'],['past','曾任 / 已离职'],['unknown','任职待核实']].map(([v,t]) => `<option value="${v}" ${S.scope === v ? 'selected' : ''}>${t}</option>`).join('')}</select></label><div><span class="cor-label">本人当前工作国家（可多选）</span><div class="cor-checkboxes">${options.map(code => `<label class="cor-check"><input type="checkbox" name="country_codes" value="${e(code)}" ${S.workCountries.includes(code) ? 'checked' : ''}>${e(countryName(code))}</label>`).join('') || '<small>尚无人物地点资料</small>'}</div><small>不勾选表示全部；只按本人当前地点依据筛选，不用总部或研究提示补齐国家。</small></div></div><label class="cor-check cor-ai-toggle"><input type="checkbox" name="include_ai" ${S.includeAI ? 'checked' : ''}><span>使用 DeepSeek / 已配置模型辅助整理<small>仅比较报告已有资料，不联网搜索。每 5 人最多 1 次，本轮最多分析 50 人 / 10 次；其余仍纳入规则报告。会使用已配置模型额度。</small></span></label><div class="cor-actions"><button class="button button-primary" type="submit">生成并保存报告</button>${S.report ? button('regenerate','基于当前资料重新生成','',!canWrite() || pending(S.report)) : ''}</div></fieldset></form>${!canWrite() ? note('当前角色可查看和下载已完成报告。生成报告、调用 AI 由销售或管理者维护。') : ''}${S.reports.length ? `<label class="cor-history-label">历史报告<select id="cor-report-history">${S.reports.map(r => `<option value="${e(r.id)}" ${S.report?.id === r.id ? 'selected' : ''}>${e(date(r.generated_at))} · ${e(reportState(r.status))}</option>`).join('')}</select></label>` : ''}${reportPreview(S.report)}`;
  }
  function paint() {
    const dialog = root(); if (!dialog) return;
    dialog.innerHTML = `<header class="cor-header"><div><span>LUMIPILOT / 客户研究</span><h2 id="cor-title">客户员工框架报告</h2><p>从确认公司到整理可追溯的人员框架。</p></div><button type="button" class="button" data-cor-action="close">关闭</button></header><nav class="cor-steps" aria-label="人员报告流程">${['确认客户','采集与核对','整理与导出'].map((label,i) => `<span ${S.step === i+1 ? 'aria-current="step"' : ''}><b>${i+1}</b>${label}</span>`).join('')}</nav><div class="cor-body" aria-busy="${busy}">${S.error ? note(S.error,'error') : ''}${S.notice ? note(S.notice,'success') : ''}${S.loading ? note('正在读取已保存客户资料…') : S.step === 1 ? customerStep() : S.step === 2 ? collectStep() : reportStep()}<p class="cor-boundary">这是已保存职业资料形成的人员框架，不代表完整员工名录或正式组织架构。未知任职、地点和关系保留待核实。</p></div>`;
    if (S.step === 2 && !S.loading && canWrite() && S.customer) void window.LumiCustomerLinkedIn?.mount(S.customer,{companyCountries:[...S.hints]});
  }
  function schedule() {
    clearTimeout(timer); timer = null;
    if (!isOpen() || S.step !== 3 || !pending(S.report)) return;
    const own = generation, cid = S.customer.id, rid = S.report.id;
    timer = setTimeout(async () => {
      if (own !== generation || !isOpen() || busy || S.step !== 3) { schedule(); return; }
      try { const r = await api(reportsPath(cid)+'/'+encodeURIComponent(rid)); if (own !== generation || rid !== S.report?.id) return; S.report = checkedReport(r,cid,rid); S.reports = S.reports.map(v => v.id === rid ? S.report : v); S.error = ''; paint(); }
      catch (error) { if (!error.stale && own === generation) { S.error = error.message || '暂时无法更新报告状态，请稍后刷新。'; paint(); } }
      finally { if (own === generation) schedule(); }
    },5000);
  }
  async function execute(operation) {
    if (busy) return; const own = generation; busy = true; S.error = ''; paint();
    try { await operation(); } catch (error) { if (!error.stale && own === generation) S.error = error.message || '操作未完成，请重试。'; }
    finally { if (own === generation) { busy = false; paint(); schedule(); } }
  }
  async function loadCustomer(cid) {
    if (!idOK(cid)) throw new Error('请选择有效的客户档案。');
    const own = generation, results = await Promise.all([ctx.api(base(cid)),ctx.api(reportsPath(cid))]);
    if (own !== generation || !isOpen()) throw stale();
    const detail = results[0]; if (detail.customer?.id !== cid) throw new Error('客户资料不匹配，请刷新重试。');
    S.hints = list(detail.customer.linkedin_search_countries ?? detail.customer.operating_countries ?? (detail.customer.country ? [detail.customer.country] : []));
    S.customer = detail.customer; S.detail = detail; S.selectedCustomer = cid; S.reports = list(results[1].reports);
    if (S.report && S.report.customer_id !== cid) S.report = null;
    if (!S.report && S.reports.length) {const rid = S.reports[0].id, loaded = await api(reportsPath(cid)+'/'+encodeURIComponent(rid)); S.report = checkedReport(loaded,cid,rid);}
  }
  async function reportRefresh() {
    const rid = S.report?.id; await loadCustomer(S.customer.id);
    if (rid) S.report = checkedReport(await api(reportsPath(S.customer.id)+'/'+encodeURIComponent(rid)),S.customer.id,rid);
  }
  async function generate(force = false) {
    if (!canWrite()) throw new Error('生成报告由销售或管理员 / 领导维护。');
    if (pending(S.report)) throw new Error('当前报告仍在整理，请完成后再生成。');
    const response = await api(reportsPath(S.customer.id),'POST',{employment_scope:S.scope,country_codes:[...S.workCountries],include_ai:S.includeAI,...(force ? {force:true} : {})});
    S.report = checkedReport(response,S.customer.id); S.reports = [S.report,...S.reports.filter(r => r.id !== S.report.id)]; S.notice = '已保存本次资料快照；报告完成后可导出。人物主档未被报告生成操作修改。';
  }
  async function action(node) {
    const name = node.dataset.corAction;
    if (name === 'mode-existing' || name === 'mode-new') { if (name === 'mode-new' && !canWrite()) throw new Error('客户建档由销售或管理者维护。'); S.mode = name === 'mode-new' ? 'new' : 'existing'; }
    else if (name === 'add-hint') { const code = S.hintDraft.trim().toUpperCase(); if (!/^[A-Z]{2}$/.test(code)) throw new Error('请输入两位国家代码，例如 SG。'); if (!S.hints.includes(code)) { if (S.hints.length >= 30) throw new Error('公司地区提示最多 30 项。'); S.hints.push(code); } S.hintDraft = ''; }
    else if (name === 'to-customer') {window.LumiCustomerLinkedIn?.stop(); S.step = 1;}
    else if (name === 'to-report') {window.LumiCustomerLinkedIn?.stop(); await reportRefresh(); S.step = 3; S.notice = '';}
    else if (name === 'to-collect') {if (!canWrite()) throw new Error('采集由销售或管理者维护。'); S.step = 2; S.notice = '';}
    else if (name === 'refresh') {await reportRefresh(); S.notice = '已读取当前保存资料；历史报告仍保留原快照。';}
    else if (name === 'regenerate') await generate(true);
  }
  async function open({customerId = ''} = {}) {
    close(); opener = document.activeElement; const own = generation;
    S = {step:1,mode:'existing',loading:true,error:'',notice:'',customers:[],selectedCustomer:'',customer:null,detail:null,reports:[],report:null,hints:[],hintDraft:'',newName:'',newWebsite:'',scope:'all',workCountries:[],includeAI:false};
    const dialog = document.createElement('dialog'); dialog.id = 'customer-org-report-dialog'; dialog.className = 'dialog cor-dialog'; dialog.setAttribute('aria-labelledby','cor-title'); dialog.addEventListener('cancel',event => {event.preventDefault(); close();}); document.body.append(dialog); document.dispatchEvent(new CustomEvent('lumipilot:org-report-open')); paint(); dialog.showModal?.();
    await execute(async () => {const result = await api('/api/business/customers'); S.customers = list(result.customers); if (customerId) { if (!S.customers.some(c => c.id === customerId)) throw new Error('此客户不存在或无权访问，请重新选择。'); await loadCustomer(customerId); S.step = 3; } S.loading = false;});
    if (own === generation && isOpen() && S.loading) {S.loading = false; paint();}
  }
  function init(context) {
    ctx = context || {}; if (bound) return; bound = true;
    window.addEventListener('hashchange',close);
    document.addEventListener('click',event => {const entry = event.target.closest?.('[data-org-report-open]'); if (entry && !entry.disabled && !entry.closest('#customer-org-report-dialog')) {event.preventDefault(); void open({customerId:entry.dataset.customerId || ''}); return;} const node = event.target.closest?.('[data-cor-action]'); if (!node || node.disabled || !node.closest('#customer-org-report-dialog')) return; event.preventDefault(); if (node.dataset.corAction === 'close') {close(); return;} void execute(() => action(node));});
    document.addEventListener('input',event => {const el = event.target; if (!el.closest?.('#customer-org-report-dialog') || busy) return; if (el.dataset.corDraft) S[el.dataset.corDraft] = el.value; if (el.id === 'cor-other-country') S.hintDraft = el.value;});
    document.addEventListener('change',event => {
      const el = event.target; if (!el.closest?.('#customer-org-report-dialog') || busy) return;
      if (el.dataset.corHint !== undefined) {S.hints = el.checked ? [...new Set([...S.hints,el.value])] : S.hints.filter(c => c !== el.value);}
      if (el.name === 'customer_id') { S.selectedCustomer = el.value; paint(); }
      if (el.name === 'employment_scope') S.scope = el.value;
      if (el.name === 'include_ai') S.includeAI = el.checked;
      if (el.name === 'country_codes') S.workCountries = el.checked ? [...new Set([...S.workCountries,el.value])] : S.workCountries.filter(c => c !== el.value);
      if (el.id === 'cor-report-history') void execute(async () => {if (!S.reports.some(r => r.id === el.value)) throw new Error('报告记录已变化，请刷新。'); S.report = checkedReport(await api(reportsPath(S.customer.id)+'/'+encodeURIComponent(el.value)),S.customer.id,el.value);});
    });
    document.addEventListener('submit',event => {
      if (!event.target.closest?.('#customer-org-report-dialog') || !['org-report-select','cor-new-customer','cor-generate'].includes(event.target.id)) return;
      event.preventDefault(); const form = event.target, values = new FormData(form);
      void execute(async () => {
        if (form.id === 'cor-generate') {S.scope = String(values.get('employment_scope') || 'all'); S.workCountries = values.getAll('country_codes'); S.includeAI = values.has('include_ai'); await generate();}
        else if (form.id === 'org-report-select') {await loadCustomer(String(values.get('customer_id') || '')); S.step = canWrite() ? 2 : 3;}
        else {
          if (!canWrite()) throw new Error('客户建档由销售或管理者维护。');
          const name = String(values.get('name') || '').trim(), website = String(values.get('website') || '').trim(); if (!name || name.length > 200) throw new Error('请输入不超过 200 字的客户公司名称。'); if (website && !safeURL(website)) throw new Error('请输入有效的公开官网网址。');
          const response = await api('/api/business/customers','POST',{name,website,linkedin_search_countries:[...S.hints],focus:'人员框架研究；公司主体、任职与关系以来源核对为准。',followed:false});
          if (!idOK(response.customer?.id)) throw new Error('未取得新客户编号，请刷新客户列表后核对。');
          S.customers = [response.customer,...S.customers]; await loadCustomer(response.customer.id); S.step = 2; S.notice = '已建立独立客户档案并保存领英检索国家；后续采集自动沿用 Locations 范围。';
          document.dispatchEvent(new CustomEvent('lumipilot:customer-created',{detail:{customer:response.customer}}));
        }
      });
    });
  }
  return {init,open,isOpen,close,stop:close};
})();
