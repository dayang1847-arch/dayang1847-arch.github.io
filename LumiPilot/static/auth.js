'use strict';

// Authentication remains in server cookies. This module stores only a public
// account snapshot and a short-lived challenge ID in page memory.
window.LumiAuth = (() => {
  let ctx = {}, account = {mode:'local',user:null,can_manage:false}, readiness = null;
  let active = false, loadToken = 0, loaded = false, loadError = '', mail = null, users = [], filter = 'pending', busy = false, notice = '';
  let login = {email:'',challenge:null,user:null,step:'email',error:'',info:'',busy:false}, loginTimer = null;
  const STATUS = Object.freeze({pending:'待审批',approved:'已批准',rejected:'已拒绝',disabled:'已停用'});
  const escape = value => String(value ?? '').replace(/[&<>"']/g,char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const e = value => (ctx.esc || escape)(value);
  const statusLabel = value => STATUS[value] || '状态待确认';
  const canManage = () => account.can_manage === true && (account.mode === 'local' || account.user?.role === 'admin' && account.user?.status === 'approved');
  const approved = user => user?.status === 'approved';
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
        const requests = [api('/api/auth/mail-config')];
        if (account.mode === 'online') requests.push(api('/api/auth/admin/users'));
        const results = await Promise.all(requests);if (!active || token !== loadToken) return;
        mail = results[0]?.config || results[0];users = Array.isArray(results[1]?.users) ? results[1].users : [];
      }
      loaded = true;
    } catch (err) {if (active && token === loadToken) loadError = err.message || '访问设置暂时无法读取。';}
  }
  function stop() {active = false;++loadToken;busy = false;}
  function mailForm() {
    const ready = mail?.mail_ready === true || readiness?.mail_ready === true;
    return `<section class="auth-panel" aria-labelledby="auth-mail-title"><header class="auth-panel-header"><div><div class="auth-mail-heading"><h2 id="auth-mail-title">验证码邮件服务</h2><span class="auth-readiness ${ready ? 'ready' : ''}">${ready ? '配置已具备' : '待配置'}</span></div><p>使用企业邮箱或邮件服务的 SMTP 发送邮箱验证码。</p></div></header><div class="auth-panel-body"><form id="auth-mail-form"><div class="auth-settings-grid"><label class="auth-field">SMTP 服务器<input name="smtp_host" type="text" maxlength="253" value="${e(mail?.smtp_host || '')}" placeholder="例如 smtp.example.com" required autocomplete="off"></label><label class="auth-field">端口<input name="smtp_port" type="number" min="1" max="65535" step="1" value="${e(mail?.smtp_port || 587)}" required></label><label class="auth-field">传输加密<select name="smtp_security"><option value="starttls" ${mail?.smtp_security !== 'ssl' ? 'selected' : ''}>STARTTLS · 常用端口 587</option><option value="ssl" ${mail?.smtp_security === 'ssl' ? 'selected' : ''}>SSL / TLS · 常用端口 465</option></select></label><label class="auth-field">SMTP 用户名<input name="smtp_username" maxlength="254" value="${e(mail?.smtp_username || '')}" placeholder="邮箱地址或服务账号" autocomplete="off"></label><label class="auth-field">SMTP 密码 / 授权码<input name="smtp_password" type="password" maxlength="1000" value="" placeholder="${mail?.password_configured ? '已保存 · 留空保留现有配置' : '填写邮箱授权码或服务密码'}" autocomplete="new-password"><small>${mail?.password_configured ? '已有密钥保存在服务端，不会在页面回显。' : '密钥仅保存至服务端配置，请使用发信服务的授权信息。'}</small></label><label class="auth-field">发件人邮箱<input name="smtp_from_email" type="email" maxlength="254" value="${e(mail?.smtp_from_email || '')}" placeholder="例如 lighting@example.com" required autocomplete="off"></label><label class="auth-field">发件人名称<input name="smtp_from_name" maxlength="120" value="${e(mail?.smtp_from_name || 'LumiPilot')}" required autocomplete="off"></label></div><div class="auth-settings-footer"><p>保存配置不会发送测试邮件。“配置已具备”表示必填信息完整，实际投递需通过登录验证码验证。线上服务需单独配置发信账号。</p><button class="auth-button auth-button-primary" type="submit" ${busy ? 'disabled' : ''}>${busy ? '正在保存…' : '保存邮件配置'}</button></div></form>${mail?.settings_source === 'environment' ? '<p class="auth-field-note">当前发信设置来自服务器环境变量。部署环境变量优先，需在服务器更新相应设置。</p>' : ''}</div></section>`;
  }
  function userActions(user) {
    if (user.role === 'admin') return '<span class="auth-user-lock">管理员账户</span>';
    const actions = user.status === 'pending' ? [['approved','批准'],['rejected','拒绝']] : user.status === 'approved' ? [['disabled','停用']] : [['approved',user.status === 'disabled' ? '恢复访问' : '批准']];
    return `<div class="auth-user-actions">${actions.map(([status,label]) => `<button type="button" class="auth-button ${status === 'approved' ? 'auth-button-primary' : status === 'rejected' ? 'auth-button-danger' : ''}" data-auth-action="review" data-user-id="${e(user.id)}" data-target-status="${status}" ${busy ? 'disabled' : ''}>${label}</button>`).join('')}</div>`;
  }
  function usersPanel() {
    const selected = users.filter(user => filter === 'all' || user.status === filter), pending = users.filter(user => user.status === 'pending').length;
    const filters = [['pending','待审批'],['all','全部账户'],['approved','已批准'],['rejected','已拒绝'],['disabled','已停用']];
    return `<section class="auth-panel" aria-labelledby="auth-users-title"><header class="auth-panel-header"><div><h2 id="auth-users-title">用户访问审批</h2><p>邮箱验证确认身份，管理员审批决定工作空间访问权限。</p></div><button class="auth-button" data-auth-action="reload" type="button" ${busy ? 'disabled' : ''}>刷新列表</button></header><div class="auth-users-toolbar"><nav class="auth-user-filters" aria-label="按审批状态筛选">${filters.map(([value,label]) => `<button type="button" class="${filter === value ? 'active' : ''}" data-auth-action="filter" data-filter="${value}" ${filter === value ? 'aria-current="true"' : ''}>${label}${value === 'pending' ? `<span>${pending}</span>` : ''}</button>`).join('')}</nav><span class="auth-users-count">${selected.length} 个账户</span></div>${selected.length ? `<div class="auth-users-scroll"><table class="auth-users-table"><thead><tr><th scope="col">邮箱 / 角色</th><th scope="col">访问状态</th><th scope="col">注册时间</th><th scope="col">操作</th></tr></thead><tbody>${selected.map(user => `<tr><td title="${e(user.email)}">${e(user.email)}<small class="auth-user-role">${user.role === 'admin' ? '管理员' : '工作空间成员'}</small></td><td><span class="auth-user-status ${STATUS[user.status] ? user.status : ''}">${e(statusLabel(user.status))}</span></td><td>${e(stamp(user.created_at))}</td><td>${userActions(user)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="auth-empty">${filter === 'pending' ? '暂无待审批的访问申请。新用户完成邮箱验证后会出现在这里。' : '当前筛选条件下没有账户。'}</div>`}</section><dialog id="auth-review-dialog" class="auth-review-dialog" aria-labelledby="auth-review-title"></dialog>`;
  }
  function view() {
    const heading = `<div class="page-heading"><div><p class="eyebrow">工作空间设置</p><h1>${account.mode === 'local' ? '线上部署设置' : canManage() ? '访问与邮件管理' : '我的账户'}</h1><p>${account.mode === 'local' ? '准备邮箱验证与访问审批所需的发信配置。' : canManage() ? '管理工作空间身份验证、用户审批与验证码邮件。' : '查看当前登录账号和工作空间访问状态。'}</p></div></div>`;
    if (loadError) return `<div class="auth-settings">${heading}<div class="auth-error-region" role="alert"><h2>设置暂时无法读取</h2><p>${e(loadError)}</p><button type="button" class="auth-button" data-auth-action="reload">重新读取</button></div></div>`;
    if (!loaded) return `<div class="auth-settings">${heading}<div class="auth-loading" role="status">正在读取访问设置…</div></div>`;
    const currentAccount = account.user ? `<div class="auth-account-bar"><div><strong>${e(account.user.email)}</strong><p>${account.user.role === 'admin' ? '管理员' : '工作空间成员'} · ${e(statusLabel(account.user.status))}</p></div><button class="auth-button" type="button" data-auth-action="logout" ${busy ? 'disabled' : ''}>退出登录</button></div>` : '';
    const policy = account.mode === 'local' ? '<div class="auth-policy-note"><strong>本机版继续直接使用。</strong>线上版部署后启用邮箱验证码登录；新用户验证邮箱后须由管理员批准。此处保存配置不会发布系统，也不会开放本机网络访问。</div>' : canManage() ? '<div class="auth-policy-note">首次管理员账户保持可用。停用成员后，其访问权限会立即失效；已经保存的项目和资料继续保留在工作空间。</div>' : '';
    return `<div class="auth-settings">${heading}${currentAccount}${policy}${notice ? `<div class="auth-message auth-message-success" role="status">${e(notice)}</div>` : ''}${canManage() && account.mode === 'online' ? usersPanel() : ''}${canManage() ? mailForm() : '<div class="auth-policy-note">工作空间访问由管理员审批。如需调整权限，请联系管理员。</div>'}</div>`;
  }
  function afterRender() {
    if (!active) return;
    const form = document.querySelector('#auth-mail-form');if (form) form.addEventListener('submit',saveMail);
  }
  async function saveMail(event) {
    event.preventDefault();if (!active || !canManage() || busy) return;
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
    const user = users.find(item => item.id === id);if (!canManage() || !user || user.role === 'admin' || !['approved','rejected','disabled'].includes(status)) return;
    const dialog = document.querySelector('#auth-review-dialog');if (!dialog) return;
    const labels = {approved:user.status === 'disabled' ? '恢复工作空间访问' : '批准工作空间访问',rejected:'拒绝访问申请',disabled:'停用工作空间访问'};
    const descriptions = {approved:'批准后，用户通过邮箱验证即可进入工作空间，查看和使用其中的共享项目与资料。',rejected:'用户仍可验证邮箱查看申请状态，无法进入工作空间。后续可以重新批准。',disabled:'该用户的现有登录会话将失效，后续无法进入工作空间。已有项目和资料继续保留，可再次恢复访问。'};
    dialog.innerHTML = `<div class="auth-review-dialog-body"><h2 id="auth-review-title">${labels[status]}</h2><p class="auth-dialog-email">${e(user.email)}</p><p>${descriptions[status]}</p></div><div class="auth-review-dialog-actions"><button type="button" class="auth-button" data-auth-action="close-review">取消</button><button type="button" class="auth-button ${status === 'approved' ? 'auth-button-primary' : 'auth-button-danger'}" data-auth-action="confirm-review" data-user-id="${e(id)}" data-target-status="${status}">确认${status === 'approved' ? '批准' : status === 'rejected' ? '拒绝' : '停用'}</button></div>`;
    dialog.showModal();
  }
  async function reviewUser(id,status) {
    const user = users.find(item => item.id === id);if (!active || !canManage() || busy || !user || user.role === 'admin' || !['approved','rejected','disabled'].includes(status)) return;
    const token = loadToken;document.querySelector('#auth-review-dialog')?.close();busy = true;repaint();
    try {await api('/api/auth/admin/users/'+encodeURIComponent(id)+'/status','POST',{status,expected_updated_at:user.updated_at});if (!active || token !== loadToken) return;await load();notice = `${user.email}：${statusLabel(status)}`;tell('访问权限已更新');}
    catch (err) {if (active && token === loadToken) {tell(err.message || '访问权限未能更新，请刷新列表再试',true);try {await load();} catch {}}}
    finally {busy = false;repaint();}
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
    if (action === 'close-review') document.querySelector('#auth-review-dialog')?.close();
    if (action === 'confirm-review') await reviewUser(button.dataset.userId,button.dataset.targetStatus);
    if (action === 'logout') await logout();
  });

  // The standalone login document never loads the business navigation or data.
  function loginMessage() {return login.error ? `<div class="auth-message auth-message-error" role="alert">${e(login.error)}</div>` : login.info ? `<div class="auth-message auth-message-success" role="status">${e(login.info)}</div>` : '';}
  function remaining() {return login.challenge ? Math.max(0,Math.ceil((login.challenge.resendAt-Date.now())/1000)) : 0;}
  function challengeExpired() {return !login.challenge || login.challenge.expiresAt <= Date.now();}
  function statusPage(user) {
    const status = user.status, titles = {pending:'访问申请等待审批',rejected:'访问申请未获批准',disabled:'此账户已停用'};
    const descriptions = {pending:'邮箱验证已完成。管理员批准申请后，你就可以进入照明研发工作空间。',rejected:'邮箱验证已完成，管理员尚未授予工作空间访问权限。如需重新申请，请联系管理员。',disabled:'此账户当前无法进入工作空间。需要恢复访问时，请联系管理员。'};
    return `<p class="auth-eyebrow">WORKSPACE ACCESS</p><div class="auth-status-symbol ${STATUS[status] ? status : ''}" aria-hidden="true">${status === 'pending' ? '◷' : '—'}</div><h2>${e(titles[status] || '访问状态待确认')}</h2><p class="auth-subtitle">${e(descriptions[status] || '暂时无法确认访问权限，请稍后重新验证邮箱。')}</p><p class="auth-status-email">${e(user.email)}</p>${loginMessage()}<div class="auth-status-actions">${status !== 'disabled' ? `<button type="button" class="auth-button auth-button-primary auth-button-full" data-login-action="check" ${login.busy ? 'disabled' : ''}>${login.busy ? '正在检查…' : '检查审批结果'}</button><button type="button" class="auth-button auth-button-full" data-login-action="logout" ${login.busy ? 'disabled' : ''}>退出登录</button>` : '<button type="button" class="auth-button auth-button-full" data-login-action="reset">重新验证邮箱</button>'}</div><p class="auth-status-caption">批准前，项目、知识库和工作空间功能暂不可访问。</p>`;
  }
  function loginView() {
    if (login.user && !approved(login.user)) return statusPage(login.user);
    if (readiness?.mode === 'local' || account.mode === 'local') return '<p class="auth-eyebrow">WORKSPACE ACCESS</p><h2>邮箱登录</h2><p class="auth-subtitle">线上版通过邮箱验证身份，由管理员审批工作空间访问权限。</p><div class="auth-message">当前是本机版，无需邮箱登录。线上部署和发信配置完成后，启用此登录入口。</div><label class="auth-field">邮箱地址<input type="email" placeholder="name@company.com" disabled></label><button type="button" class="auth-button auth-button-primary auth-button-full" disabled>线上部署后可发送验证码</button><div class="auth-login-row"><a class="auth-button auth-button-link" href="/">进入本机工作台</a><a class="auth-button auth-button-link" href="/#access">线上部署设置</a></div>';
    if (login.step === 'code' && login.challenge) {
      const wait = remaining();return `<p class="auth-eyebrow">EMAIL VERIFICATION</p><h2>验证你的邮箱</h2><p class="auth-subtitle">输入邮件中的六位验证码，完成身份验证。</p><div class="auth-email-display"><strong>${e(login.email)}</strong><button type="button" class="auth-button auth-button-link" data-login-action="reset" ${login.busy ? 'disabled' : ''}>更换邮箱</button></div>${loginMessage()}<form id="auth-code-form"><label class="auth-field">邮箱验证码<input class="auth-code" name="code" type="text" pattern="[0-9]{6}" minlength="6" maxlength="6" inputmode="numeric" autocomplete="one-time-code" aria-label="六位邮箱验证码" required></label><button type="submit" class="auth-button auth-button-primary auth-button-full" ${login.busy ? 'disabled' : ''}>${login.busy ? '正在验证…' : '验证并登录'}</button></form><div class="auth-login-row"><span>没有收到邮件？可检查垃圾邮件。</span><button type="button" class="auth-button auth-button-link auth-resend-button" data-login-action="resend" ${login.busy || wait > 0 ? 'disabled' : ''}>${wait > 0 ? wait+' 秒后重发' : '重新发送'}</button></div>`;
    }
    const mailReady = readiness?.mail_ready === true;
    return `<p class="auth-eyebrow">WORKSPACE ACCESS</p><h2>邮箱登录</h2><p class="auth-subtitle">使用邮箱验证码登录。首次验证后，需等待管理员批准访问。</p>${loginMessage()}${readiness && !mailReady ? '<div class="auth-message">验证码邮件服务尚未就绪，请联系管理员完成发信配置后再登录。<br><button class="auth-button auth-button-link" type="button" data-login-action="reload">重新检查邮件服务</button></div>' : ''}<form id="auth-email-form"><label class="auth-field">邮箱地址<input name="email" type="email" value="${e(login.email)}" maxlength="254" placeholder="name@company.com" autocomplete="email" required></label><button type="submit" class="auth-button auth-button-primary auth-button-full" ${login.busy || !mailReady ? 'disabled' : ''}>${login.busy ? '正在发送…' : '发送验证码'}</button></form><p class="auth-status-caption">验证码只发送到你填写的邮箱，请勿向他人提供验证码。</p>`;
  }
  function paintLogin(focus='') {
    const root = document.querySelector('#auth-login-content');if (!root) return;root.innerHTML = loginView();
    document.querySelector('#auth-email-form')?.addEventListener('submit',requestCode);
    document.querySelector('#auth-code-form')?.addEventListener('submit',verifyCode);
    if (focus) document.querySelector(`#auth-${focus}-form input`)?.focus();else if (login.user && !login.busy) root.focus();
  }
  function timer() {
    if (loginTimer !== null) clearInterval(loginTimer);
    loginTimer = setInterval(() => {
      const button = document.querySelector('.auth-resend-button');if (button) {const wait = remaining();button.textContent = wait > 0 ? wait+' 秒后重发' : '重新发送';button.disabled = login.busy || wait > 0;}
    },1000);
  }
  function loginReset(message='') {login.user = null;login.challenge = null;login.step = 'email';login.error = message;login.info = '';login.busy = false;if (loginTimer !== null) {clearInterval(loginTimer);loginTimer = null;}paintLogin('email');}
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
    const form = event.target;if (form.reportValidity && !form.reportValidity()) return;const code = String(form.elements.code.value || '').trim();
    if (!/^[0-9]{6}$/.test(code)) {login.error = '请输入邮件中的六位数字验证码。';paintLogin('code');return;}
    if (challengeExpired()) {login.error = '验证码已过期，请重新发送。';paintLogin('code');return;}
    login.busy = true;login.error = '';login.info = '';form.elements.code.value = '';paintLogin();
    try {
      const result = await api('/api/auth/verify-code','POST',{email:login.email,challenge_id:login.challenge.id,code});
      login.user = result?.user || (await api('/api/auth/me')).user;
      if (!login.user) throw new Error('暂时无法确认登录结果，请重新验证邮箱。');
      if (approved(login.user)) {location.replace('/');return;}
      login.challenge = null;if (loginTimer !== null) {clearInterval(loginTimer);loginTimer = null;}
      const me = login.user.status === 'disabled' ? null : await api('/api/auth/me');if (me) setAuth(me);
    } catch (err) {login.error = err.message || '验证码验证失败，请重新输入。';}
    finally {login.busy = false;paintLogin(login.user ? '' : 'code');}
  }
  async function checkApproval() {
    if (login.busy) return;login.busy = true;login.error = '';login.info = '';paintLogin();
    try {
      const me = await api('/api/auth/me');setAuth(me);
      if (!me.user) {loginReset('登录会话已结束，请重新验证邮箱。');return;}
      login.user = me.user;if (approved(me.user)) {location.replace('/');return;}
      login.info = me.user.status === 'pending' ? '申请仍在等待审批。管理员批准后，可再次检查结果。' : '已读取当前访问状态。';
    } catch (err) {login.error = err.message || '审批状态暂时无法读取，请稍后重试。';}
    finally {login.busy = false;paintLogin();}
  }
  async function loginLogout() {
    if (login.busy) return;login.busy = true;paintLogin();
    try {await api('/api/auth/logout','POST',{});setAuth({...account,user:null,csrf_token:null,can_manage:false});loginReset();}
    catch (err) {login.error = err.message || '退出未完成，请重试。';login.busy = false;paintLogin();}
  }
  async function startLogin() {
    try {
      await bootstrap();login.user = account.user;login.email = account.user?.email || login.email;login.error = '';
      if (account.mode === 'online' && approved(account.user)) {location.replace('/');return;}
    } catch (err) {setAuth({mode:'online',user:null,can_manage:false});login.error = err.message || '登录服务暂时不可用，请稍后再试。';readiness = {mode:'online',mail_ready:false};}
    paintLogin();
  }
  document.addEventListener('click',async event => {
    if (document.body?.dataset?.authPage !== 'login') return;
    const button = event.target?.closest?.('[data-login-action]');if (!button || button.disabled || login.busy) return;
    if (button.dataset.loginAction === 'reset') loginReset();
    if (button.dataset.loginAction === 'resend') await requestCode();
    if (button.dataset.loginAction === 'check') await checkApproval();
    if (button.dataset.loginAction === 'reload') {login.email = String(document.querySelector('#auth-email-form')?.elements?.email?.value || login.email).trim();login.busy = true;await startLogin();login.busy = false;paintLogin();}
    if (button.dataset.loginAction === 'logout') await loginLogout();
  });
  if (document.body?.dataset?.authPage === 'login') startLogin();
  return {init,setAuth,bootstrap,load,view,afterRender,stop,get account(){return account;},get mode(){return account.mode;},get user(){return account.user;},get canManage(){return canManage();}};
})();
