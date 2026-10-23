'use strict';

// Authentication remains in server cookies. This module stores only a public
// account snapshot and a short-lived challenge ID in page memory.
window.LumiAuth = (() => {
  let ctx = {}, account = {mode:'local',user:null,can_manage:false}, readiness = null;
  let active = false, loadToken = 0, loaded = false, loadError = '', mail = null, users = [], filter = 'pending', busy = false, notice = '';
  let login = {email:'',challenge:null,user:null,method:'password',screen:'login',step:'email',error:'',info:'',busy:false}, loginTimer = null;
  let userDialog = null;
  const STATUS = Object.freeze({pending:'待审批',approved:'已批准',rejected:'已拒绝',disabled:'已停用'});
  const ROLE_DUTIES = Object.freeze({
    sales:{label:'销售',short:'客户、动态与策略',edit:'维护客户、人物与产品动态、订阅和客户策略，以及项目销售需求。',review:'提交本部门会审意见，跟进客户策略修改；最终确认由管理员 / 领导完成。'},
    research:{label:'研发',short:'产品工程、能力与物料',edit:'维护产品工程、工厂能力、BOM、物料与选型。',review:'提交本部门会审意见，提供技术与制造依据；最终确认由管理员 / 领导完成。'},
    procurement:{label:'采购',short:'供应商、采购与价格',edit:'维护供应商、采购记录、价格与结算口径。',review:'提交本部门会审意见，提供供应与成本依据；最终确认由管理员 / 领导完成。'},
    manager:{label:'管理员 / 领导',short:'全部业务、账户与最终确认',edit:'可编辑全部业务，管理账户审批、权限分配和 AI 设置。',review:'参与各部门会审并作最终确认；已确认的客户策略条目需通过新版本调整。'},
  });
  const escape = value => String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const e = value => (ctx.esc || escape)(value);
  const statusLabel = value => STATUS[value] || '状态待确认';
  const canManage = () => account.can_manage === true && (account.mode === 'local' || ['admin','manager'].includes(account.user?.role) && account.user?.status === 'approved' && !account.user?.must_change_password);
  const approved = user => user?.status === 'approved';
  const workspaceReadonly = () => readiness?.workspace_readonly === true || readiness?.readonly === true || account.workspace_readonly === true || account.readonly === true;
  const accountRoles = () => {if (workspaceReadonly()) return ['viewer'];const roles = readiness?.account_roles;if (!Array.isArray(roles)) return ['viewer','sales','research','procurement','manager'];return [...new Set(roles.filter(role => ['viewer','sales','research','procurement','manager'].includes(role)))];};
  const mailSettingsAvailable = () => !workspaceReadonly() && readiness?.mail_config_available !== false;
  const roleLabel = role => workspaceReadonly() && ['viewer','member'].includes(role) ? '只读用户' : ({admin:'管理员 / 领导',manager:'管理员 / 领导',sales:'销售',research:'研发',procurement:'采购',member:'待分配部门（只读）',viewer:'只读用户'}[role] || '角色待确认');
  const canWrite = () => !workspaceReadonly() && (account.can_write === true || account.can_write === undefined && approved(account.user) && ['admin','manager','sales','research','procurement'].includes(account.user?.role) && !account.user?.must_change_password);
  const passwordBounds = () => ({min:Number(readiness?.password_policy?.min_length) || 12,max:Number(readiness?.password_policy?.max_length) || 128});
  const passwordHint = () => {const {min,max} = passwordBounds();return `${min}–${max} 个字符，可使用字母、数字、空格和符号。`;};
  function passwordError(password,confirmation) {const {min,max} = passwordBounds(),count = [...password].length;if (count < min || count > max) return `密码需为 ${min}–${max} 个字符。`;if (password !== confirmation) return '两次输入的密码不一致，请重新填写。';return ''; }
  const loginMethods = () => Array.isArray(readiness?.login_methods) ? readiness.login_methods : ['email_code'];
  const hasPassword = () => loginMethods().includes('password');
  function clearSecrets(form) {if (!form?.elements) return;for (const key of ['password','confirm_password','current_password','new_password']) if (form.elements[key]) form.elements[key].value = ''; }
  function clearDialog() {const dialog = document.querySelector('#auth-review-dialog');if (dialog) {clearSecrets(dialog.querySelector?.('form'));if (dialog.open) dialog.close();dialog.innerHTML = ''; }userDialog = null;}
  const stamp = value => {if (!value || Number.isNaN(new Date(value).getTime())) return '—';return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Shanghai'}).format(new Date(value));};
  async function defaultApi(path,method='GET',body) {
    const headers = body !== undefined ? {'Content-Type':'application/json'} : {};
    if (method !== 'GET' && account.csrf_token) headers['X-CSRF-Token'] = account.csrf_token;
    const response = await fetch(path,{method,credentials:'same-origin',cache:'no-store',headers,body:body === undefined ? undefined : JSON.stringify(body)});
    let payload;try {payload = await response.json();} catch {throw new Error('服务暂时无法响应，请稍后再试。');}
    if (!response.ok) {const error = new Error(payload.message || payload.error?.message || '操作未完成，请稍后再试。');error.status = response.status;error.code = payload.error?.code || payload.code;throw error;}
    return payload;
  }
  const api = (path,method,body) => (ctx.api || defaultApi)(path,method,body);
  function init(context) {ctx = context || {};if (ctx.auth) setAuth(ctx.auth);}
  function setAuth(payload) {account = payload || {mode:'online',user:null,can_manage:false};}
  async function bootstrap() {
    const [status,me] = await Promise.all([api('/api/auth/status'),api('/api/auth/me')]);
    readiness = status;setAuth(me);return me;
  }
  function repaint() {if (active) {if (ctx.render) ctx.render();else if (ctx.refresh) ctx.refresh();}}
  function tell(message,error=false) {(ctx.showNotice || ctx.toast || (() => {}))(message,error);}
  async function load() {
    active = true;const token = ++loadToken;loaded = false;loadError = '';notice = '';mail = null;users = [];
    try {
      await bootstrap();if (!active || token !== loadToken) return;
      if (canManage()) {
        const [mailResult,userResult] = await Promise.all([mailSettingsAvailable() ? api('/api/auth/mail-config') : Promise.resolve(null),account.mode === 'online' ? api('/api/auth/admin/users') : Promise.resolve(null)]);if (!active || token !== loadToken) return;
        mail = mailResult?.config || mailResult;users = Array.isArray(userResult?.users) ? userResult.users : [];
      }
      if(account.mode === 'local' && canManage())await window.LumiOnlineAccounts?.load(api);
      loaded = true;
    } catch (err) {if (active && token === loadToken) loadError = err.message || '访问设置暂时无法读取。';}
  }
  function stop() {window.LumiOnlineAccounts?.stop();clearDialog();active = false;++loadToken;busy = false;}
  function mailForm() {
    if (!mailSettingsAvailable()) return '';
    const ready = mail?.mail_ready === true || readiness?.mail_ready === true;
    return `<section class="auth-panel" aria-labelledby="auth-mail-title"><header class="auth-panel-header"><div><div class="auth-mail-heading"><h2 id="auth-mail-title">验证码邮件服务</h2><span class="auth-readiness ${ready ? 'ready' : ''}">${ready ? '配置已具备' : '待配置'}</span></div><p>使用企业邮箱或邮件服务的 SMTP 发送邮箱验证码。</p></div></header><div class="auth-panel-body"><form id="auth-mail-form"><div class="auth-settings-grid"><label class="auth-field">SMTP 服务器<input name="smtp_host" type="text" maxlength="253" value="${e(mail?.smtp_host || '')}" placeholder="例如 smtp.example.com" required autocomplete="off"></label><label class="auth-field">端口<input name="smtp_port" type="number" min="1" max="65535" step="1" value="${e(mail?.smtp_port || 587)}" required></label><label class="auth-field">传输加密<select name="smtp_security"><option value="starttls" ${mail?.smtp_security !== 'ssl' ? 'selected' : ''}>STARTTLS · 常用端口 587</option><option value="ssl" ${mail?.smtp_security === 'ssl' ? 'selected' : ''}>SSL / TLS · 常用端口 465</option></select></label><label class="auth-field">SMTP 用户名<input name="smtp_username" maxlength="254" value="${e(mail?.smtp_username || '')}" placeholder="邮箱地址或服务账号" autocomplete="off"></label><label class="auth-field">SMTP 密码 / 授权码<input name="smtp_password" type="password" maxlength="1000" value="" placeholder="${mail?.password_configured ? '已保存 · 留空保留现有配置' : '填写邮箱授权码或服务密码'}" autocomplete="new-password"><small>${mail?.password_configured ? '已有密钥保存在服务端，不会在页面回显。' : '密钥仅保存至服务端配置，请使用发信服务的授权信息。'}</small></label><label class="auth-field">发件人邮箱<input name="smtp_from_email" type="email" maxlength="254" value="${e(mail?.smtp_from_email || '')}" placeholder="例如 lighting@example.com" required autocomplete="off"></label><label class="auth-field">发件人名称<input name="smtp_from_name" maxlength="120" value="${e(mail?.smtp_from_name || 'LumiPilot')}" required autocomplete="off"></label></div><div class="auth-settings-footer"><p>保存配置不会发送测试邮件。“配置已具备”表示必填信息完整，实际投递需通过登录验证码验证。线上服务需单独配置发信账号。</p><button class="auth-button auth-button-primary" type="submit" ${busy ? 'disabled' : ''}>${busy ? '正在保存…' : '保存邮件配置'}</button></div></form>${mail?.settings_source === 'environment' ? '<p class="auth-field-note">当前发信设置来自服务器环境变量。部署环境变量优先，需在服务器更新相应设置。</p>' : ''}</div></section>`;
  }
  function userActions(user) {
    if (user.role === 'admin') return '<span class="auth-user-lock">管理员账户</span>';
    const actions = user.status === 'pending' ? [['approved','批准'],['rejected','拒绝']] : user.status === 'approved' ? [['disabled','停用']] : [['approved',user.status === 'disabled' ? '恢复访问' : '批准']];
    return `<div class="auth-user-actions">${actions.map(([status,label]) => `<button type="button" class="auth-button ${status === 'approved' ? 'auth-button-primary' : status === 'rejected' ? 'auth-button-danger' : ''}" data-auth-action="review" data-user-id="${e(user.id)}" data-target-status="${status}" ${busy ? 'disabled' : ''}>${label}</button>`).join('')}<button type="button" class="auth-button" data-auth-action="role" data-user-id="${e(user.id)}" ${busy ? 'disabled' : ''}>权限</button><button type="button" class="auth-button" data-auth-action="reset-password" data-user-id="${e(user.id)}" ${busy ? 'disabled' : ''}>重设密码</button></div>`;
  }
  function roleGuide() {
    if (workspaceReadonly()) return '';
    return `<section class="auth-role-guide" aria-labelledby="auth-role-guide-title"><div class="auth-role-guide-heading"><h3 id="auth-role-guide-title">四类协作角色</h3><p>共享查看，按部门编辑。以下为职责说明；请在具体账户的“权限”中分配角色。</p></div><dl class="auth-role-grid">${Object.entries(ROLE_DUTIES).map(([role,details]) => `<div class="auth-role-card" data-auth-role-description="${role}"><dt>${e(details.label)}</dt><dd>${e(details.edit)}</dd><dd class="auth-role-review">${role === 'manager' ? '负责会审最终确认' : '提交本部门会审意见'}</dd></div>`).join('')}</dl><p class="auth-role-guide-note">新账户默认只读；原未分配部门的账户仍为只读。分配角色不改变审批状态。</p></section>`;
  }
  function ownPermissions() {
    if (!account.user || account.mode !== 'online') return '';
    const role = account.user.role === 'admin' ? 'manager' : account.user.role,details = ROLE_DUTIES[role];
    const usable = approved(account.user) && !account.user.must_change_password;
    const writable = usable && canWrite() && details;
    const viewText = !usable ? '完成账户审批与密码要求后，才可查看工作空间资料。' : '查看和下载已授权的共享业务资料。';
    const editText = workspaceReadonly() ? canManage() ? '本分享部署的业务资料全部只读；你可管理访问账号、审批和临时密码。' : '本分享部署仅提供已保存资料的只读查看，不能编辑或实时采集。' : writable ? details.edit : role === 'member' ? '当前未分配部门，仅可只读查看；需要编辑时请联系管理员分配部门。' : role === 'viewer' ? '当前为只读用户，没有业务编辑权限。' : '当前账户未获得业务编辑权限，请联系管理员确认。';
    const reviewText = writable ? details.review : '可查看已保存的会审结果，不能提交会审意见或作最终确认。';
    return `<section class="auth-panel auth-permissions" aria-labelledby="auth-permissions-title"><header class="auth-panel-header"><div><h2 id="auth-permissions-title">我的权限</h2><p>当前角色：${e(roleLabel(account.user.role))}。角色由管理员分配。</p></div></header><dl class="auth-permission-grid"><div><dt>共享查看</dt><dd>${e(viewText)}</dd></div><div><dt>我的编辑职责</dt><dd>${e(editText)}</dd></div><div><dt>会审权限</dt><dd>${e(reviewText)}</dd></div></dl>${writable ? '<p class="auth-permission-note">销售、研发和采购均可上传资料、进行客户资料问答，并查看其他部门已保存的工作成果。</p>' : ''}</section>`;
  }
  function usersPanel() {
    const selected = users.filter(user => filter === 'all' || user.status === filter), pending = users.filter(user => user.status === 'pending').length;
    const filters = [['pending','待审批'],['all','全部账户'],['approved','已批准'],['rejected','已拒绝'],['disabled','已停用']];
    return `<section class="auth-panel" aria-labelledby="auth-users-title"><header class="auth-panel-header"><div><h2 id="auth-users-title">用户访问审批</h2><p>${workspaceReadonly() ? '审批决定是否可查看授权资料；本分享部署仅提供只读用户角色。' : '审批决定是否可进入工作空间，角色决定各部门可编辑的内容。'}</p></div><div class="auth-header-actions"><button class="auth-button auth-button-primary" data-auth-action="create-user" type="button" ${busy ? 'disabled' : ''}>新增账户</button><button class="auth-button" data-auth-action="reload" type="button" ${busy ? 'disabled' : ''}>刷新列表</button></div></header>${roleGuide()}<div class="auth-users-toolbar"><nav class="auth-user-filters" aria-label="按审批状态筛选">${filters.map(([value,label]) => `<button type="button" class="${filter === value ? 'active' : ''}" data-auth-action="filter" data-filter="${value}" ${filter === value ? 'aria-current="true"' : ''}>${label}${value === 'pending' ? `<span>${pending}</span>` : ''}</button>`).join('')}</nav><span class="auth-users-count">${selected.length} 个账户</span></div>${selected.length ? `<div class="auth-users-scroll"><table class="auth-users-table"><thead><tr><th scope="col">邮箱 / 角色</th><th scope="col">访问状态</th><th scope="col">账号认证</th><th scope="col">注册时间</th><th scope="col">操作</th></tr></thead><tbody>${selected.map(user => `<tr><td title="${e(user.email)}">${e(user.email)}<small class="auth-user-role">${e(roleLabel(user.role))}</small></td><td><span class="auth-user-status ${STATUS[user.status] ? user.status : ''}">${e(statusLabel(user.status))}</span></td><td><span class="auth-credential-state">${user.password_set ? user.must_change_password ? '临时密码 · 待修改' : '密码已设置' : '未设置密码'}</span><small class="auth-user-role">${user.email_verified === true ? '邮箱已验证' : '邮箱未验证'}</small></td><td>${e(stamp(user.created_at))}</td><td>${userActions(user)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="auth-empty">${filter === 'pending' ? loginMethods().includes('email_code') ? '暂无待审批的访问申请。新用户注册或完成邮箱验证后会出现在这里。' : '暂无待审批的访问申请。新用户注册后会出现在这里。' : '当前筛选条件下没有账户。'}</div>`}</section><dialog id="auth-review-dialog" class="auth-review-dialog" aria-labelledby="auth-review-title"></dialog>`;
  }
  function ownPasswordPanel() {
    if (!account.user || account.mode !== 'online') return '';
    if (!account.user.password_set) return `<section class="auth-panel" aria-labelledby="auth-password-title"><header class="auth-panel-header"><div><h2 id="auth-password-title">账号密码</h2><p>${workspaceReadonly() ? '当前账户尚未设置密码，请联系管理员。' : '当前账户通过邮箱验证码登录，尚未设置密码。'}</p></div></header><div class="auth-panel-body"><p class="auth-field-note">如需账号密码登录，请联系管理员设置临时密码；首次使用时须修改为自己的密码。</p></div></section>`;
    const {min,max} = passwordBounds();
    return `<section class="auth-panel" aria-labelledby="auth-password-title"><header class="auth-panel-header"><div><h2 id="auth-password-title">修改我的密码</h2><p>密码修改后，当前账户所有设备上的登录会话将失效，需要重新登录。</p></div></header><div class="auth-panel-body"><form id="auth-own-password-form"><div class="auth-settings-grid"><label class="auth-field">当前密码<input name="current_password" type="password" maxlength="${max}" required autocomplete="current-password"></label><div class="auth-field-note auth-password-note">${e(passwordHint())}<br>请勿使用其他服务的相同密码。</div><label class="auth-field">新密码<input name="new_password" type="password" minlength="${min}" maxlength="${max}" required autocomplete="new-password"></label><label class="auth-field">确认新密码<input name="confirm_password" type="password" minlength="${min}" maxlength="${max}" required autocomplete="new-password"></label></div><div class="auth-settings-footer"><p>管理员创建或重设的密码为临时密码。账号以邮箱作为标识，设置密码不代表邮箱已完成验证。</p><button class="auth-button auth-button-primary" type="submit" ${busy ? 'disabled' : ''}>${busy ? '正在提交…' : '修改密码并重新登录'}</button></div></form></div></section>`;
  }
  function view() {
    const heading = `<div class="page-heading"><div><p class="eyebrow">工作空间设置</p><h1>${account.mode === 'local' ? '线上部署设置' : canManage() ? '账户与访问管理' : '我的账户'}</h1><p>${account.mode === 'local' ? '设置线上分享账号并自动同步；完整服务器的访问审批和验证码邮件另行配置。' : canManage() ? workspaceReadonly() ? '管理授权资料的访问账号、审批与临时密码。' : '管理账号、权限审批、临时密码与验证码邮件。' : '查看当前账户、访问权限并管理自己的密码。'}</p></div></div>`;
    if (loadError) return `<div class="auth-settings">${heading}<div class="auth-error-region" role="alert"><h2>设置暂时无法读取</h2><p>${e(loadError)}</p><button type="button" class="auth-button" data-auth-action="reload">重新读取</button></div></div>`;
    if (!loaded) return `<div class="auth-settings">${heading}<div class="auth-loading" role="status">正在读取访问设置…</div></div>`;
    const currentAccount = account.user ? `<div class="auth-account-bar"><div><strong>${e(account.user.email)}</strong><p>${e(roleLabel(account.user.role))} · ${e(statusLabel(account.user.status))} · ${account.user.email_verified === true ? '邮箱已验证' : '邮箱作为账号标识'}</p></div><button class="auth-button" type="button" data-auth-action="logout" ${busy ? 'disabled' : ''}>退出登录</button></div>` : '';
    const policy = account.mode === 'local' ? '<div class="auth-policy-note"><strong>本机版继续直接使用。</strong>下方“线上账号设计台”用于管理 GitHub 入口所连接的 LumiPilot 分享账号，保存后自动同步，无需重新发布网页。验证码邮件配置用于完整服务器，两者分别管理。线上分享仅展示已保存资料，不能执行采集或 AI；本机数据、模型密钥与浏览器会话不会随账号同步。<p><a href="#workbench?view=intelligence">回到情报操作台，执行演示前检查 →</a></p></div>' : workspaceReadonly() ? '<div class="auth-policy-note">本链接提供已保存资料的授权只读查看。管理员可创建和审批账号、重设密码；所有账户均无法在这里新增、编辑或采集业务资料。停用账户或重设密码会使现有登录会话失效。</div>' : canManage() ? '<div class="auth-policy-note">只读用户可查看与下载共享资料；销售、研发和采购按职责编辑并提交本部门会审意见，管理员 / 领导拥有全部业务权限并负责最终确认。角色调整即时生效；停用账户或重设密码会使现有登录会话失效。初始管理员账户不可在列表中降权、停用或重设密码。</div>' : '';
    return `<div class="auth-settings">${heading}${currentAccount}${ownPermissions()}${policy}${notice ? `<div class="auth-message auth-message-success" role="status">${e(notice)}</div>` : ''}${canManage() && account.mode === 'online' ? usersPanel() : ''}${account.mode==='local'&&canManage()?window.LumiOnlineAccounts?.view()||'':''}${ownPasswordPanel()}${canManage() && mailSettingsAvailable() ? mailForm() : workspaceReadonly() ? '' : '<div class="auth-policy-note">工作空间访问由管理员审批。如需调整权限，请联系管理员。</div>'}</div>`;
  }
  function afterRender() {
    if (!active) return;
    if(account.mode==='local'&&canManage())window.LumiOnlineAccounts?.mount();
    document.querySelector('#auth-mail-form')?.addEventListener('submit',saveMail);
    document.querySelector('#auth-own-password-form')?.addEventListener('submit',changeOwnPassword);
    const dialog = document.querySelector('#auth-review-dialog');
    dialog?.addEventListener('cancel',event => {event.preventDefault();clearDialog();});
    dialog?.addEventListener('close',() => {if (dialog.open) return;clearSecrets(dialog.querySelector?.('form'));dialog.innerHTML = '';userDialog = null;});
  }
  async function saveMail(event) {
    event.preventDefault();if (!active || !canManage() || !mailSettingsAvailable() || busy) return;
    const form = event.target;if (typeof form.reportValidity === 'function' && !form.reportValidity()) return;
    const payload = {};
    for (const key of ['smtp_host','smtp_security','smtp_username','smtp_from_email','smtp_from_name']) payload[key] = String(form.elements[key].value || '').trim();
    payload.smtp_port = Number(form.elements.smtp_port.value);payload.smtp_password = String(form.elements.smtp_password.value || '');form.elements.smtp_password.value = '';
    const token = loadToken;busy = true;notice = '';repaint();
    try {await api('/api/auth/mail-config','POST',payload);payload.smtp_password = '';if (!active || token !== loadToken) return;await load();notice = '邮件配置已保存。请在实际线上环境通过登录验证码确认邮件投递。';tell('邮件配置已保存');}
    catch (err) {payload.smtp_password = '';if (active && token === loadToken) tell(err.message || '邮件配置未能保存',true);}
    finally {busy = false;repaint();}
  }
  function openReview(id,status) {
    const user = users.find(item => item.id === id);if (busy || !canManage() || !user || user.role === 'admin' || !['approved','rejected','disabled'].includes(status)) return;
    const dialog = document.querySelector('#auth-review-dialog');if (!dialog) return;
    clearDialog();
    const labels = {approved:user.status === 'disabled' ? '恢复工作空间访问' : '批准工作空间访问',rejected:'拒绝访问申请',disabled:'停用工作空间访问'};
    const descriptions = {approved:workspaceReadonly() ? '批准后，用户完成账号认证即可查看本链接提供的已保存资料。账号仅有只读权限。' : `批准后，用户完成账号认证即可进入工作空间。当前角色为${roleLabel(user.role)}；可通过“权限”调整。`,rejected:'用户仍可登录查看申请状态，无法进入工作空间。后续可以重新批准。',disabled:'该用户的现有登录会话将失效，后续无法进入工作空间。已有项目和资料继续保留，可再次恢复访问。'};
    dialog.innerHTML = `<div class="auth-review-dialog-body"><h2 id="auth-review-title">${labels[status]}</h2><p class="auth-dialog-email">${e(user.email)}</p><p>${e(descriptions[status])}</p></div><div class="auth-review-dialog-actions"><button type="button" class="auth-button" data-auth-action="close-review">取消</button><button type="button" class="auth-button ${status === 'approved' ? 'auth-button-primary' : 'auth-button-danger'}" data-auth-action="confirm-review" data-user-id="${e(id)}" data-target-status="${status}">确认${status === 'approved' ? '批准' : status === 'rejected' ? '拒绝' : '停用'}</button></div>`;
    dialog.showModal();
  }
  async function reviewUser(id,status) {
    const user = users.find(item => item.id === id);if (!active || !canManage() || busy || !user || user.role === 'admin' || !['approved','rejected','disabled'].includes(status)) return;
    const token = loadToken;clearDialog();busy = true;repaint();
    try {await api('/api/auth/admin/users/'+encodeURIComponent(id)+'/status','POST',{status,expected_updated_at:user.updated_at});if (!active || token !== loadToken) return;await load();notice = `${user.email}：${statusLabel(status)}`;tell('访问权限已更新');}
    catch (err) {if (active && token === loadToken) {tell(err.message || '访问权限未能更新，请刷新列表再试',true);try {await load();} catch {}}}
    finally {busy = false;repaint();}
  }
  function openUserDialog(kind,id,values={},error='') {
    if (!active || !canManage() || busy || !['create','role','password'].includes(kind)) return;
    const user = users.find(item => item.id === id);if (kind !== 'create' && (!user || user.role === 'admin')) return;
    const dialog = document.querySelector('#auth-review-dialog');if (!dialog) return;
    clearDialog();userDialog = {kind,id};
    const {min,max} = passwordBounds(),title = {create:'新增工作空间账户',role:'调整账户权限',password:'重设临时密码'}[kind];
    const choices = accountRoles(),selectedRole = choices.includes(values.role || user?.role) ? values.role || user?.role : choices.includes('viewer') ? 'viewer' : choices[0];
    const roles = `<label class="auth-field">分配工作空间角色<select name="role">${choices.map(role => `<option value="${role}" ${selectedRole === role ? 'selected' : ''}>${e(roleLabel(role))} · ${e(ROLE_DUTIES[role]?.short || '查看与下载')}</option>`).join('')}</select><small>${workspaceReadonly() ? '本分享部署仅开放只读角色。' : '共享查看，按部门编辑。三部门提交本部门会审意见，管理员 / 领导负责最终确认。新账户默认只读。'}</small></label>`;
    const password = `<label class="auth-field">${kind === 'create' ? '初始临时密码' : '新的临时密码'}<input name="password" type="password" minlength="${min}" maxlength="${max}" autocomplete="new-password" required><small>${e(passwordHint())}</small></label><label class="auth-field">确认临时密码<input name="confirm_password" type="password" minlength="${min}" maxlength="${max}" autocomplete="new-password" required></label>`;
    const content = kind === 'create' ? `<label class="auth-field">账号邮箱<input name="email" type="email" value="${e(values.email || '')}" maxlength="254" placeholder="name@company.com" autocomplete="off" required><small>邮箱用作账号标识；创建账户不代表邮箱已验证。</small></label>${roles}<label class="auth-field">访问状态<select name="status"><option value="pending" ${values.status !== 'approved' ? 'selected' : ''}>待审批</option><option value="approved" ${values.status === 'approved' ? 'selected' : ''}>已批准 · 创建后允许登录</option></select></label>${password}` : kind === 'role' ? roles : password;
    const note = kind === 'role' ? workspaceReadonly() ? '本分享部署仅提供只读查看权限，账号无法编辑或实时采集业务资料。审批状态保持不变。' : '角色调整即时生效，审批状态保持不变。原未分配部门的账户仍为只读，分配销售、研发或采购后才可按职责编辑。' : '临时密码需由你自行告知用户，不会自动发邮件。用户首次登录必须修改密码；重设密码会使现有登录失效。';
    dialog.innerHTML = `<form id="auth-user-dialog-form"><div class="auth-review-dialog-body"><h2 id="auth-review-title">${title}</h2>${user ? `<p class="auth-dialog-email">${e(user.email)}</p>` : ''}${error ? `<div class="auth-message auth-message-error" role="alert">${e(error)}</div>` : ''}${content}<p class="auth-field-note">${note}</p></div><div class="auth-review-dialog-actions"><button type="button" class="auth-button" data-auth-action="close-review">取消</button><button type="submit" class="auth-button auth-button-primary">${kind === 'create' ? '创建账户' : kind === 'role' ? '保存权限' : '重设密码'}</button></div></form>`;
    dialog.querySelector?.('#auth-user-dialog-form')?.addEventListener('submit',saveUserDialog);
    // querySelector on document also supports environments which expose forms globally.
    if (!dialog.querySelector) document.querySelector('#auth-user-dialog-form')?.addEventListener('submit',saveUserDialog);
    dialog.showModal();dialog.querySelector?.('input,select')?.focus();
  }
  async function saveUserDialog(event) {
    event.preventDefault();if (!active || !canManage() || busy || !userDialog) return;
    const form = event.target,{kind,id} = userDialog,user = users.find(item => item.id === id);
    if (kind !== 'create' && (!user || user.role === 'admin')) {clearSecrets(form);clearDialog();return;}
    const values = {email:String(form.elements.email?.value || '').trim(),role:String(form.elements.role?.value || ''),status:String(form.elements.status?.value || '')};
    let password = String(form.elements.password?.value || ''),confirmation = String(form.elements.confirm_password?.value || '');clearSecrets(form);
    let error = kind === 'role' ? '' : passwordError(password,confirmation);confirmation = '';
    if (kind === 'create' && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(values.email)) error = '请填写有效的账号邮箱。';
    if (kind !== 'password' && !accountRoles().includes(values.role)) error = '请选择此部署允许的账户角色。';
    if (kind === 'create' && !['pending','approved'].includes(values.status)) error = '请选择账户访问状态。';
    if (error) {password = '';openUserDialog(kind,id,values,error);return;}
    const token = loadToken;let payload,path;
    if (kind === 'create') {path = '/api/auth/admin/users';payload = {...values,password};}
    else {path = '/api/auth/admin/users/'+encodeURIComponent(id)+'/'+(kind === 'role' ? 'role' : 'password');payload = {expected_updated_at:user.updated_at,[kind === 'role' ? 'role' : 'password']:kind === 'role' ? values.role : password};}
    password = '';clearDialog();busy = true;repaint();
    try {await api(path,'POST',payload);if (payload.password !== undefined) payload.password = '';if (!active || token !== loadToken) return;await load();notice = kind === 'create' ? '账户已创建。请自行告知用户临时密码，首次登录须修改密码。' : kind === 'role' ? '账户角色已更新，权限调整即时生效。' : '临时密码已重设，现有登录已失效。请告知用户重新登录并修改密码。';tell('账户设置已保存');}
    catch (err) {if (payload.password !== undefined) payload.password = '';if (active && token === loadToken) {tell(err.message || '账户设置未能保存，请刷新后重试',true);await load();}}
    finally {if (payload.password !== undefined) payload.password = '';busy = false;repaint();}
  }
  async function changeOwnPassword(event) {
    event.preventDefault();if (!active || busy || !account.user?.password_set) return;
    const form = event.target;let current = String(form.elements.current_password.value || ''),password = String(form.elements.new_password.value || ''),confirmation = String(form.elements.confirm_password.value || '');clearSecrets(form);
    const error = !current ? '请填写当前密码。' : passwordError(password,confirmation);confirmation = '';
    if (error) {current = '';password = '';tell(error,true);return;}
    const payload = {current_password:current,new_password:password};current = '';password = '';const token = loadToken;busy = true;repaint();
    try {await api('/api/auth/password/change','POST',payload);payload.current_password = '';payload.new_password = '';if (!active || token !== loadToken) return;setAuth({mode:'online',user:null,can_manage:false,can_write:false,csrf_token:null});location.assign('/login?reason=password-changed');}
    catch (err) {if (active && token === loadToken) tell(err.message || '密码修改未完成，请重新输入',true);}
    finally {payload.current_password = '';payload.new_password = '';busy = false;repaint();}
  }
  async function logout() {
    if (busy) return;busy = true;
    try {await api('/api/auth/logout','POST',{});setAuth({mode:'online',user:null,can_manage:false});location.assign('/login');}
    catch (err) {tell(err.message || '退出未完成，请重试',true);busy = false;repaint();}
  }
  document.addEventListener('click',async event => {
    if (!active) return;const button = event.target?.closest?.('[data-auth-action]');if (!button || button.disabled) return;
    const action = button.dataset.authAction;
    if (action === 'filter' && ['pending','all','approved','rejected','disabled'].includes(button.dataset.filter)) {filter = button.dataset.filter;repaint();}
    if (action === 'reload' && !busy) {busy = true;repaint();await load();busy = false;repaint();}
    if (action === 'review') openReview(button.dataset.userId,button.dataset.targetStatus);
    if (action === 'close-review') clearDialog();
    if (action === 'create-user') openUserDialog('create');
    if (action === 'role') openUserDialog('role',button.dataset.userId);
    if (action === 'reset-password') openUserDialog('password',button.dataset.userId);
    if (action === 'confirm-review') await reviewUser(button.dataset.userId,button.dataset.targetStatus);
    if (action === 'logout') await logout();
  });

  // The standalone login document never loads the business navigation or data.
  function loginMessage() {return login.error ? `<div class="auth-message auth-message-error" role="alert">${e(login.error)}</div>` : login.info ? `<div class="auth-message auth-message-success" role="status">${e(login.info)}</div>` : '';}
  function remaining() {return login.challenge ? Math.max(0,Math.ceil((login.challenge.resendAt-Date.now())/1000)) : 0;}
  function challengeExpired() {return !login.challenge || login.challenge.expiresAt <= Date.now();}
  function statusPage(user) {
    const status = user.status, titles = {pending:'访问申请等待审批',rejected:'访问申请未获批准',disabled:'此账户已停用'};
    const descriptions = {pending:'账户已登记。管理员批准申请后，你就可以进入照明研发工作空间。',rejected:'管理员尚未授予工作空间访问权限。如需重新申请，请联系管理员。',disabled:'此账户当前无法进入工作空间。需要恢复访问时，请联系管理员。'};
    return `<p class="auth-eyebrow">WORKSPACE ACCESS</p><div class="auth-status-symbol ${STATUS[status] ? status : ''}" aria-hidden="true">${status === 'pending' ? '◷' : '—'}</div><h2>${e(titles[status] || '访问状态待确认')}</h2><p class="auth-subtitle">${e(descriptions[status] || '暂时无法确认访问权限，请稍后重新登录。')}</p><p class="auth-status-email">${e(user.email)}</p>${loginMessage()}<div class="auth-status-actions">${status !== 'disabled' ? `<button type="button" class="auth-button auth-button-primary auth-button-full" data-login-action="check" ${login.busy ? 'disabled' : ''}>${login.busy ? '正在检查…' : '检查审批结果'}</button><button type="button" class="auth-button auth-button-full" data-login-action="logout" ${login.busy ? 'disabled' : ''}>退出登录</button>${user.password_set ? `<button type="button" class="auth-button auth-button-link" data-login-action="change-password" ${login.busy ? 'disabled' : ''}>修改账号密码</button>` : ''}` : '<button type="button" class="auth-button auth-button-full" data-login-action="reset">重新登录</button>'}</div><p class="auth-status-caption">批准前，项目、知识库和工作空间功能暂不可访问。</p>`;
  }
  function methodTabs() {
    if (!(hasPassword() && loginMethods().includes('email_code'))) return '';
    return `<div class="auth-login-methods" role="group" aria-label="选择登录方式"><button type="button" class="${login.method === 'password' ? 'active' : ''}" data-login-action="method" data-method="password" aria-pressed="${login.method === 'password'}" ${login.busy ? 'disabled' : ''}>账号密码</button><button type="button" class="${login.method === 'email_code' ? 'active' : ''}" data-login-action="method" data-method="email_code" aria-pressed="${login.method === 'email_code'}" ${login.busy ? 'disabled' : ''}>邮箱验证码</button></div>`;
  }
  function forcedPasswordView() {
    const {min,max} = passwordBounds(),requiredChange = login.user.must_change_password === true;
    return `<p class="auth-eyebrow">ACCOUNT SECURITY</p><h2>${requiredChange ? '设置自己的密码' : '修改账号密码'}</h2><p class="auth-subtitle">${requiredChange ? '当前使用管理员设置的临时密码。修改后重新登录，方可继续使用账户。' : '修改后需要重新登录；账户的访问审批状态保持不变。'}</p><div class="auth-email-display"><strong>${e(login.user.email)}</strong></div>${loginMessage()}<form id="auth-force-password-form"><label class="auth-field">${requiredChange ? '当前临时密码' : '当前密码'}<input name="current_password" type="password" maxlength="${max}" autocomplete="current-password" required></label><label class="auth-field">新密码<input name="new_password" type="password" minlength="${min}" maxlength="${max}" autocomplete="new-password" required><small>${e(passwordHint())}</small></label><label class="auth-field">确认新密码<input name="confirm_password" type="password" minlength="${min}" maxlength="${max}" autocomplete="new-password" required></label><button type="submit" class="auth-button auth-button-primary auth-button-full" ${login.busy ? 'disabled' : ''}>${login.busy ? '正在修改…' : '修改密码并重新登录'}</button></form><div class="auth-login-row"><span>修改会使此账户现有登录失效。</span><button type="button" class="auth-button auth-button-link" data-login-action="logout" ${login.busy ? 'disabled' : ''}>退出登录</button></div>${requiredChange ? '' : '<div class="auth-login-row"><button type="button" class="auth-button auth-button-link" data-login-action="back-status">返回审批状态</button></div>'}`;
  }
  function passwordView() {
    const {min,max} = passwordBounds(),register = login.screen === 'register';
    return `<p class="auth-eyebrow">WORKSPACE ACCESS</p><h2>${register ? '申请工作空间账户' : '登录工作空间'}</h2><p class="auth-subtitle">${register ? '设置账号密码后提交访问申请，管理员批准前无法查看工作空间资料。' : '使用邮箱作为账号登录。首次申请须由管理员批准访问。'}</p>${register ? '' : methodTabs()}${loginMessage()}${readiness?.password_ready === false ? '<div class="auth-message">管理员账号密码尚未初始化，请联系管理员在服务器完成初始化。普通用户仍可提交注册申请。</div>' : ''}<form id="${register ? 'auth-register-form' : 'auth-password-form'}"><label class="auth-field">账号邮箱<input name="email" type="email" value="${e(login.email)}" maxlength="254" placeholder="name@company.com" autocomplete="username" required></label><label class="auth-field">${register ? '设置密码' : '密码'}<input name="password" type="password" ${register ? `minlength="${min}"` : ''} maxlength="${max}" autocomplete="${register ? 'new-password' : 'current-password'}" required>${register ? `<small>${e(passwordHint())}</small>` : ''}</label>${register ? `<label class="auth-field">确认密码<input name="confirm_password" type="password" minlength="${min}" maxlength="${max}" autocomplete="new-password" required></label>` : ''}<button type="submit" class="auth-button auth-button-primary auth-button-full" ${login.busy ? 'disabled' : ''}>${login.busy ? '正在提交…' : register ? '注册并提交访问申请' : '登录'}</button></form><div class="auth-login-row"><span>${register ? '已有账户？' : '首次访问？'}</span><button class="auth-button auth-button-link" type="button" data-login-action="${register ? 'back-login' : 'register'}" ${login.busy ? 'disabled' : ''}>${register ? '返回登录' : '注册账户'}</button></div><p class="auth-status-caption">${register ? '新账户默认为只读用户；邮箱作为账号标识，注册不代表邮箱已验证。' : '忘记密码请联系管理员重设；临时密码首次登录时须修改。'}</p>`;
  }
  function loginView() {
    if (login.user?.status !== 'disabled' && (login.user?.must_change_password === true || login.user?.password_set && login.screen === 'change-password')) return forcedPasswordView();
    if (login.user && !approved(login.user)) return statusPage(login.user);
    if (readiness?.mode === 'local' || account.mode === 'local') return '<p class="auth-eyebrow">WORKSPACE ACCESS</p><h2>账号登录</h2><p class="auth-subtitle">线上版支持账号密码或邮箱验证码登录，由管理员审批访问权限。</p><div class="auth-message">当前是本机版，无需邮箱登录。服务器部署并初始化管理员密码后可使用账号登录；邮箱验证码需要额外配置发信服务。</div><div class="auth-login-row"><a class="auth-button auth-button-link" href="/">进入本机工作台</a><a class="auth-button auth-button-link" href="/#access">线上部署设置</a></div><p class="auth-status-caption">配置邮件服务后，线上部署后可发送验证码。</p>';
    if (login.method === 'password' && hasPassword()) return passwordView();
    if (login.step === 'code' && login.challenge) {
      const wait = remaining();return `<p class="auth-eyebrow">EMAIL VERIFICATION</p><h2>验证你的邮箱</h2><p class="auth-subtitle">输入邮件中的六位验证码，完成身份验证。</p><div class="auth-email-display"><strong>${e(login.email)}</strong><button type="button" class="auth-button auth-button-link" data-login-action="reset" ${login.busy ? 'disabled' : ''}>更换邮箱</button></div>${loginMessage()}<form id="auth-code-form"><label class="auth-field">邮箱验证码<input class="auth-code" name="code" type="text" pattern="[0-9]{6}" minlength="6" maxlength="6" inputmode="numeric" autocomplete="one-time-code" aria-label="六位邮箱验证码" required></label><button type="submit" class="auth-button auth-button-primary auth-button-full" ${login.busy ? 'disabled' : ''}>${login.busy ? '正在验证…' : '验证并登录'}</button></form><div class="auth-login-row"><span>没有收到邮件？可检查垃圾邮件。</span><button type="button" class="auth-button auth-button-link auth-resend-button" data-login-action="resend" ${login.busy || wait > 0 ? 'disabled' : ''}>${wait > 0 ? wait+' 秒后重发' : '重新发送'}</button></div>${hasPassword() ? '<div class="auth-login-row"><button type="button" class="auth-button auth-button-link" data-login-action="method" data-method="password">返回账号密码登录</button></div>' : ''}`;
    }
    const mailReady = readiness?.mail_ready === true;
    return `<p class="auth-eyebrow">WORKSPACE ACCESS</p><h2>邮箱登录</h2><p class="auth-subtitle">使用邮箱验证码登录。首次验证后，需等待管理员批准访问。</p>${methodTabs()}${loginMessage()}${readiness && !mailReady ? '<div class="auth-message">验证码邮件服务尚未就绪，请联系管理员完成发信配置后再登录。<br><button class="auth-button auth-button-link" type="button" data-login-action="reload">重新检查邮件服务</button></div>' : ''}<form id="auth-email-form"><label class="auth-field">邮箱地址<input name="email" type="email" value="${e(login.email)}" maxlength="254" placeholder="name@company.com" autocomplete="email" required></label><button type="submit" class="auth-button auth-button-primary auth-button-full" ${login.busy || !mailReady ? 'disabled' : ''}>${login.busy ? '正在发送…' : '发送验证码'}</button></form><p class="auth-status-caption">验证码只发送到你填写的邮箱，请勿向他人提供验证码。</p>`;
  }
  function paintLogin(focus='') {
    const root = document.querySelector('#auth-login-content');if (!root) return;root.innerHTML = loginView();
    const footer = document.querySelector('.auth-login-footer');if (footer && Array.isArray(readiness?.login_methods) && !loginMethods().includes('email_code')) footer.textContent = '使用账号密码登录。新账户需由管理员审批，默认仅可查看资料。';
    document.querySelector('#auth-email-form')?.addEventListener('submit',requestCode);
    document.querySelector('#auth-code-form')?.addEventListener('submit',verifyCode);
    document.querySelector('#auth-password-form')?.addEventListener('submit',submitPassword);
    document.querySelector('#auth-register-form')?.addEventListener('submit',submitRegistration);
    document.querySelector('#auth-force-password-form')?.addEventListener('submit',changeForcedPassword);
    if (focus) document.querySelector(`#auth-${focus}-form input`)?.focus();else if (login.user && !login.busy) root.focus();
  }
  function timer() {
    if (loginTimer !== null) clearInterval(loginTimer);
    loginTimer = setInterval(() => {
      const button = document.querySelector('.auth-resend-button');if (button) {const wait = remaining();button.textContent = wait > 0 ? wait+' 秒后重发' : '重新发送';button.disabled = login.busy || wait > 0;}
    },1000);
  }
  function loginReset(message='') {login.user = null;login.challenge = null;login.screen = 'login';login.step = 'email';login.error = message;login.info = '';login.busy = false;if (loginTimer !== null) {clearInterval(loginTimer);loginTimer = null;}paintLogin(login.method === 'password' && hasPassword() ? 'password' : 'email');}
  function rememberEmail() {const form = document.querySelector('#auth-password-form') || document.querySelector('#auth-register-form') || document.querySelector('#auth-email-form');if (form?.elements?.email) login.email = String(form.elements.email.value || '').trim();clearSecrets(form);}
  async function acceptLogin(result) {
    login.user = result?.user || null;
    if (login.user?.status !== 'disabled') {const me = await api('/api/auth/me');setAuth(me);login.user = me.user || login.user;}
    if (!login.user) throw new Error('暂时无法确认登录结果，请重新登录。');
    login.challenge = null;if (loginTimer !== null) {clearInterval(loginTimer);loginTimer = null;}
    if (approved(login.user) && !login.user.must_change_password && result?.access_granted !== false && account.access_granted !== false) location.replace('/');
  }
  async function submitPassword(event) {
    event.preventDefault();if (login.busy || !hasPassword()) return;
    const form = event.target;login.email = String(form.elements.email.value || '').trim();let password = String(form.elements.password.value || '');clearSecrets(form);
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.email) || !password) {password = '';login.error = '请填写账号邮箱和密码。';paintLogin('password');return;}
    const payload = {email:login.email,password};password = '';login.busy = true;login.error = '';login.info = '';paintLogin();
    try {const result = await api('/api/auth/password-login','POST',payload);payload.password = '';await acceptLogin(result);}
    catch (err) {login.error = err.message || '登录未完成，请检查账号和密码后重试。';}
    finally {payload.password = '';login.busy = false;paintLogin(login.user ? '' : 'password');}
  }
  async function submitRegistration(event) {
    event.preventDefault();if (login.busy || !hasPassword()) return;
    const form = event.target;login.email = String(form.elements.email.value || '').trim();let password = String(form.elements.password.value || ''),confirmation = String(form.elements.confirm_password.value || '');clearSecrets(form);
    const error = !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.email) ? '请填写有效的账号邮箱。' : passwordError(password,confirmation);confirmation = '';
    if (error) {password = '';login.error = error;paintLogin('register');return;}
    const payload = {email:login.email,password};password = '';login.busy = true;login.error = '';login.info = '';paintLogin();
    try {const result = await api('/api/auth/register','POST',payload);payload.password = '';await acceptLogin(result);if (!login.user) throw new Error('注册结果暂时无法确认，请稍后尝试登录。');}
    catch (err) {login.error = err.message || '申请未完成，请稍后重试。';}
    finally {payload.password = '';login.busy = false;paintLogin(login.user ? '' : 'register');}
  }
  async function changeForcedPassword(event) {
    event.preventDefault();if (login.busy || !login.user?.password_set || login.user.status === 'disabled') return;
    const form = event.target;let current = String(form.elements.current_password.value || ''),password = String(form.elements.new_password.value || ''),confirmation = String(form.elements.confirm_password.value || '');clearSecrets(form);
    const error = !current ? '请填写当前密码。' : passwordError(password,confirmation);confirmation = '';
    if (error) {current = '';password = '';login.error = error;paintLogin();return;}
    const payload = {current_password:current,new_password:password};current = '';password = '';login.busy = true;login.error = '';login.info = '';paintLogin();
    try {await api('/api/auth/password/change','POST',payload);payload.current_password = '';payload.new_password = '';setAuth({...account,user:null,csrf_token:null,can_manage:false,can_write:false});login.method = 'password';loginReset();login.info = '密码已修改，现有登录已失效。请使用新密码重新登录。';}
    catch (err) {login.error = err.message || '密码修改未完成，请重新输入。';}
    finally {payload.current_password = '';payload.new_password = '';login.busy = false;paintLogin();}
  }
  async function requestCode(event) {
    event?.preventDefault?.();if (login.busy || readiness?.mail_ready !== true || event?.type !== 'submit' && remaining() > 0) return;
    if (event?.target?.elements?.email) {if (event.target.reportValidity && !event.target.reportValidity()) return;login.email = String(event.target.elements.email.value || '').trim();}
    if (!login.email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(login.email)) {login.error = '请填写有效的邮箱地址。';paintLogin('email');return;}
    login.busy = true;login.error = '';login.info = '';paintLogin();
    try {
      const result = await api('/api/auth/request-code','POST',{email:login.email});
      if (!result?.challenge_id) throw new Error('验证码发送状态暂时无法确认，请稍后重试。');
      const expires = Math.max(1,Math.min(1800,Number(result.expires_in) || 600)), wait = Math.max(0,Math.min(300,Number(result.resend_after) || 60));
      login.challenge = {id:result.challenge_id,expiresAt:Date.now()+expires*1000,resendAt:Date.now()+wait*1000};login.step = 'code';login.info = '验证码已发送，请查看邮箱。';timer();
    } catch (err) {login.error = err.message || '验证码发送失败，请稍后重试。';}
    finally {login.busy = false;paintLogin(login.step === 'code' ? 'code' : 'email');}
  }
  async function verifyCode(event) {
    event.preventDefault();if (login.busy || !login.challenge) return;
    const form = event.target;if (form.reportValidity && !form.reportValidity()) return;let code = String(form.elements.code.value || '').trim();form.elements.code.value = '';
    if (!/^[0-9]{6}$/.test(code)) {login.error = '请输入邮件中的六位数字验证码。';paintLogin('code');return;}
    if (challengeExpired()) {login.error = '验证码已过期，请重新发送。';paintLogin('code');return;}
    const payload = {email:login.email,challenge_id:login.challenge.id,code};code = '';login.busy = true;login.error = '';login.info = '';paintLogin();
    try {const result = await api('/api/auth/verify-code','POST',payload);payload.code = '';await acceptLogin(result);}
    catch (err) {login.error = err.message || '验证码验证失败，请重新输入。';}
    finally {payload.code = '';login.busy = false;paintLogin(login.user ? '' : 'code');}
  }
  async function checkApproval() {
    if (login.busy) return;login.busy = true;login.error = '';login.info = '';paintLogin();
    try {
      const me = await api('/api/auth/me');setAuth(me);
      if (!me.user) {loginReset('登录会话已结束，请重新登录。');return;}
      login.user = me.user;if (approved(me.user) && !me.user.must_change_password && me.access_granted !== false) {location.replace('/');return;}
      login.info = me.user.status === 'pending' ? '申请仍在等待审批。管理员批准后，可再次检查结果。' : '已读取当前访问状态。';
    } catch (err) {login.error = err.message || '审批状态暂时无法读取，请稍后重试。';}
    finally {login.busy = false;paintLogin();}
  }
  async function loginLogout() {
    if (login.busy) return;login.busy = true;paintLogin();
    try {await api('/api/auth/logout','POST',{});setAuth({...account,user:null,csrf_token:null,can_manage:false,can_write:false});loginReset();}
    catch (err) {login.error = err.message || '退出未完成，请重试。';login.busy = false;paintLogin();}
  }
  async function startLogin(preserveMethod=false) {
    try {
      await bootstrap();if (!preserveMethod) login.method = hasPassword() ? 'password' : 'email_code';login.user = account.user;login.email = account.user?.email || login.email;login.error = '';
      if (account.mode === 'online' && approved(account.user) && !account.user.must_change_password && account.access_granted !== false) {location.replace('/');return;}
      if (new URLSearchParams(location.search || '').get('reason') === 'password-changed' && !account.user) login.info = '密码已修改，请使用新密码重新登录。';
    } catch (err) {setAuth({mode:'online',user:null,can_manage:false});login.error = err.message || '登录服务暂时不可用，请稍后再试。';readiness = {mode:'online',mail_ready:false};}
    paintLogin();
  }
  document.addEventListener('click',async event => {
    if (document.body?.dataset?.authPage !== 'login') return;
    const button = event.target?.closest?.('[data-login-action]');if (!button || button.disabled || login.busy) return;
    const action = button.dataset.loginAction;
    if (action === 'change-password' && login.user?.password_set && login.user.status !== 'disabled') {login.screen = 'change-password';login.error = '';login.info = '';paintLogin();}
    if (action === 'back-status' && !login.user?.must_change_password) {clearSecrets(document.querySelector('#auth-force-password-form'));login.screen = 'login';login.error = '';login.info = '';paintLogin();}
    if (action === 'method' && loginMethods().includes(button.dataset.method) && !login.user) {rememberEmail();login.method = button.dataset.method;loginReset();}
    if (action === 'register' && hasPassword() && !login.user) {rememberEmail();login.screen = 'register';login.error = '';login.info = '';paintLogin('register');}
    if (action === 'back-login' && !login.user) {rememberEmail();loginReset();}
    if (action === 'reset') {rememberEmail();loginReset();}
    if (action === 'resend') await requestCode();
    if (action === 'check') await checkApproval();
    if (action === 'reload') {rememberEmail();login.busy = true;await startLogin(true);login.busy = false;paintLogin();}
    if (action === 'logout') await loginLogout();
  });
  if (document.body?.dataset?.authPage === 'login') startLogin();
  return {init,setAuth,bootstrap,load,view,afterRender,stop,get account(){return account;},get mode(){return account.mode;},get user(){return account.user;},get canManage(){return canManage();},get canWrite(){return canWrite();}};
})();
