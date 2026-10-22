'use strict';
(() => {
  const local = ['127.0.0.1', 'localhost'].includes(location.hostname) && location.port === '8923';
  let token = '', config = null, error = '', models = [], mails = [], message = null, result = null, busy = false;
  let analyzeText = '供应商：青禾线缆（模拟）\n料号：WL-2201\n规格：22AWG UL1015 红线\n含税单价：0.46 元/米，税率13%，含运费，交期7天。';
  const field = (label, id, value = '', type = 'text', extra = '') => `<label class="field">${label}<input id="${id}" type="${type}" value="${esc(value)}" ${extra}></label>`;
  const button = (label, id, primary = false) => `<button class="btn ${primary ? 'primary' : ''}" data-connection="${id}" ${busy ? 'disabled' : ''}>${label}</button>`;
  const check = kind => {
    const c = config?.checks?.[kind];
    return c ? status((c.ok ? '上次测试通过 · ' : '上次测试失败 · ') + new Date(c.at * 1000).toLocaleString('zh-CN'), c.ok ? '' : 'orange') : status('尚未实测', 'gray');
  };
  async function api(path, data) {
    if (!local) throw Error('请先打开本机后台，在线展示页不能保存密钥。');
    if(busy)document.querySelectorAll('[data-connection]').forEach(b=>b.disabled=true);
    const res = await fetch('/api/' + path, {method: data === undefined ? 'GET' : 'POST',
      headers: {'Content-Type': 'application/json', 'X-CSRF-Token': token},
      body: data === undefined ? undefined : JSON.stringify(data), signal: AbortSignal.timeout(65000)});
    const payload = await res.json();
    if (!res.ok) throw Error(payload.error || '请求未完成。');
    return payload;
  }
  async function refresh() {
    if (!token) { const s = await fetch('/api/session', {cache: 'no-store'}); token = (await s.json()).token; }
    config = await api('status');
    if (config.service !== 'chaiheng-local') throw Error('当前端口不是采购后台。');
    error = '';
  }
  function renderPage() {
    if (!local) return `<div class="hero"><div class="heroleft"><div class="heroicon">${icon('link',22)}</div><div><h2>可选：在本机连接邮箱与 DeepSeek</h2><p>邮箱使用本机后台；本机报价分析配置与“数据导入”的在线连接独立，按需要选择。</p></div></div><a class="btn primary" href="http://127.0.0.1:8923/?view=settings" target="_blank" rel="noopener">打开本机后台 →</a></div><div class="twocol"><section class="card"><div class="cardhead"><h2>开始使用</h2><span class="badge">本地部署</span></div><div class="cardbody">${[['1','下载部署包','包含工作台页面、本机服务和启动文件，无需 npm 安装。'],['2','启动后台服务','Mac 双击“启动采购后台.command”；需要 Python 3.10 或更高版本，停止服务可关闭终端。'],['3','配置与实测','打开本机后台，在系统设置中保存邮箱授权码和 DeepSeek API Key，再分别测试连接。']].map(([n,t,p])=>`<div class="helpstep"><span class="num">${n}</span><div><strong>${t}</strong><p>${p}</p></div></div>`).join('')}<a class="btn primary" href="./local-service.zip" download style="margin-top:18px">${icon('download',13)} 下载本地部署包</a></div></section><section class="card"><div class="cardhead"><h2>连接能力与边界</h2>${icon('shield')}</div><div class="cardbody"><div class="helpstep"><span class="num">邮</span><div><strong>IMAP SSL 只读邮箱</strong><p>登录测试、最近邮件标题、正文查看、EML 文件导入。不会发送、删除邮件，也不会把邮件标记为已读。需要邮箱开启 IMAP，并提供服务商允许的授权码；暂未实现 OAuth 邮箱登录。</p></div></div><div class="helpstep"><span class="num">AI</span><div><strong>DeepSeek 官方 API</strong><p>本机保存密钥、读取模型列表、验证连接，并在确认后提取报价字段。调用文本生成会按你的 DeepSeek 账号计费，提取结果仍需人工核对。</p></div></div><div class="notice">邮箱及本机 DeepSeek 的连接状态请在本机后台查看；它们与在线采集的页面 Key 独立。在线页不会跨站读取本机服务，网站未预置账号或密钥。</div></div></section></div>`;
    if (!config) return `<section class="card"><div class="cardhead"><h2>连接本机服务</h2></div><div class="cardbody"><p class="smalltext">${esc(error || '正在建立本机会话…')}</p>${button('重试连接','refresh',true)}</div></section>`;
    return `<div class="hero"><div class="heroleft"><div class="heroicon">${icon('link',22)}</div><div><h2>本机后台已运行</h2><p>127.0.0.1:8923 · 连接参数保存到本机受限权限文件，密钥不会回显或写入 GitHub。</p></div></div>${button('刷新连接状态','refresh')}</div><div class="twocol"><section class="card"><div class="cardhead"><div><h2>邮箱连接 · IMAP SSL</h2><p>收件箱只读，授权码替代普通登录密码</p></div>${status(config.mail_password_set?'已配置':'未配置',config.mail_password_set?'':'gray')}</div><div class="cardbody"><div class="connection-templates">快速填写服务器：<button class="link" data-mail-template="imap.qq.com">QQ 邮箱</button><button class="link" data-mail-template="imap.163.com">163 邮箱</button><button class="link" data-mail-template="imap.exmail.qq.com">腾讯企业邮</button></div><div class="formgrid">${field('IMAP 服务器','mail-host',config.mail.host,'text','autocomplete="off" placeholder="imap.example.com"')}${field('SSL 端口','mail-port',config.mail.port,'number','min="1" max="65535"')}${field('邮箱账号','mail-username',config.mail.username,'text','autocomplete="off"')}${field(config.mail_password_set?'授权码（留空保留）':'邮箱授权码','mail-password','','password','autocomplete="new-password"')}</div><div class="connection-actions">${button('保存邮箱配置','mail-save',true)}${button('测试邮箱登录','mail-test')}${button('读取最近 10 封','mail-list')}${button('移除邮箱配置','mail-clear')}</div><div class="smalltext">${check('mail')}</div><p class="smalltext">仅支持邮箱服务商开放的 IMAP SSL 账号授权方式。企业邮箱可能需管理员启用；微软等要求 OAuth 的账号暂不支持。不会发送、删除或更改已读状态。</p></div></section><section class="card"><div class="cardhead"><div><h2>DeepSeek API 连接</h2><p>官方接口 · https://api.deepseek.com</p></div>${status(config.deepseek_key_set?'已配置':'未配置',config.deepseek_key_set?'':'gray')}</div><div class="cardbody">${field(config.deepseek_key_set?'API Key（留空保留现有密钥）':'API Key','deepseek-key','','password','autocomplete="new-password" placeholder="在本机填写，不要粘贴到聊天或公开文件"')}<label class="field sectiongap">模型（以接口返回列表为准）<input id="deepseek-model" list="deepseek-model-options" value="${esc(config.model)}" placeholder="先读取模型，再选择并保存" autocomplete="off"><datalist id="deepseek-model-options">${models.map(m=>`<option value="${esc(m)}"></option>`).join('')}</datalist></label><div class="connection-actions">${button('保存 API 配置','deepseek-save',true)}${button('读取模型列表','deepseek-models')}${button('测试 API 连接','deepseek-test')}${button('移除 API 配置','deepseek-clear')}</div><div class="smalltext">${check('deepseek')}</div>${models.length?`<div class="chips sectiongap">${models.map(m=>`<button class="chip" data-model="${esc(m)}">${esc(m)}</button>`).join('')}</div>`:''}<p class="smalltext">“测试 API 连接”只读取模型列表；“分析报价文本”会向官方接口发送当前文本，可能产生 API 费用。密钥保存为本机权限受限文件，并非系统钥匙串。</p></div></section></div><section class="card sectiongap"><div class="cardhead"><div><h2>本地报价邮件</h2><p>手动读取 / 导入 · 不执行定时同步或外发</p></div><label class="btn filelabel">导入 .eml<input type="file" id="mail-eml" accept=".eml,message/rfc822"></label></div>${mails.length?`<div class="tablewrap"><table><thead><tr><th>主题</th><th>发件人</th><th>日期</th><th></th></tr></thead><tbody>${mails.map(m=>`<tr><td>${esc(m.subject||'无主题')}</td><td>${esc(m.from)}</td><td>${esc(m.date)}</td><td><button class="rowaction" data-mail-uid="${esc(m.uid)}">查看正文 →</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">保存邮箱配置后读取最近邮件，或导入本机 EML 文件。正文只在点击查看后读取。</div>'}${message?`<div class="cardbody"><div class="notice neutral">当前邮件：${esc(message.subject)}<br>发件人：${esc(message.from)}${message.truncated?'<br>内容已截断，附件不解析。':''}</div><pre class="connection-pre">${esc(message.body||'未找到可显示的正文。')}</pre>${button('将这封正文放入分析区','mail-to-analysis')}</div>`:''}</section><section class="card sectiongap"><div class="cardhead"><div><h2>报价文本字段提取</h2><p>DeepSeek 真实请求 · 输出仅供人工核对，不自动定点或提交审批</p></div><span class="badge">内容由你确认后发送</span></div><div class="cardbody"><textarea id="connection-analysis" class="quotearea" aria-label="发送至 DeepSeek 的报价文本">${esc(analyzeText)}</textarea><label class="checklabel"><input type="checkbox" id="deepseek-consent"><span>我同意将当前文本发送至 DeepSeek 官方 API，并理解可能产生费用。请先删除不应外发的内容。</span></label>${button('分析报价文本','analyze',true)}${result?`<div class="notice neutral">模型：${esc(result.model)} · 结果待人工确认 · 本次用量：${esc(result.usage?.total_tokens??'接口未提供')} tokens</div><pre class="connection-pre">${esc(JSON.stringify(result.fields,null,2))}</pre>`:''}</div></section><div class="notice">连接配置与演示数据相互独立；“重置演示”不会清除邮箱或 API 密钥。移除连接需点击各自的“移除配置”。邮件正文及提取结果只保留在当前页面内存。</div>`;
  }
  function draw() { if(state.page==='settings') render(); }
  async function run(id) {
    if (busy) return;
    try {
      if(id==='mail-save') { const d={host:$('#mail-host').value,port:$('#mail-port').value,username:$('#mail-username').value,password:$('#mail-password').value}; busy=true; config=await api('mail/config',d); }
      else if(id==='deepseek-save') { const d={api_key:$('#deepseek-key').value,model:$('#deepseek-model').value}; busy=true; config=await api('deepseek/config',d); }
      else if(id==='mail-clear'||id==='deepseek-clear') {
        modal('移除本机连接配置', '<p class="sub">将清除该连接的本地密钥与配置。邮件和 DeepSeek 账号本身不受影响。</p>',btn('取消','close')+`<button class="btn primary" data-confirm-connection-clear="${id}">确认移除</button>`);
        $('[data-confirm-connection-clear]').onclick=async()=>{closeModal();try{config=await api(id==='mail-clear'?'mail/clear':'deepseek/clear',{});if(id==='mail-clear'){mails=[];message=null;}else{models=[];result=null;}draw();toast('本机连接配置已移除。');}catch(e){toast(e.message)}};return;
      }
      else if(id==='refresh') {busy=true;await refresh();}
      else if(id==='mail-test') {busy=true;const r=await api('mail/test',{});toast(r.message);await refresh();}
      else if(id==='mail-list') {busy=true;mails=(await api('mail/list',{})).messages;}
      else if(id==='deepseek-models'||id==='deepseek-test') {busy=true;const r=await api(id==='deepseek-test'?'deepseek/test':'deepseek/models',{});models=r.models;if(r.message)toast(r.message);await refresh();}
      else if(id==='mail-to-analysis') {analyzeText=message.body;result=null;}
      else if(id==='analyze') {analyzeText=$('#connection-analysis').value;const consent=$('#deepseek-consent').checked;if(!consent)throw Error('请先勾选发送至 DeepSeek 的确认。');busy=true;result=await api('deepseek/analyze',{content:analyzeText,consent:true});await refresh();}
      busy=false;draw();if(['mail-save','deepseek-save'].includes(id))toast('配置已保存到本机，尚需连接实测。');
    } catch(e) {busy=false;error=e.message;if(local&&token){try{config=await api('status');}catch{}}draw();toast(e.name==='TimeoutError'?'连接超时，请检查网络或配置。':e.message);}
  }
  function bindPage(root=document) {
    root.querySelectorAll('[data-connection]').forEach(el=>el.onclick=()=>run(el.dataset.connection));
    root.querySelectorAll('[data-mail-template]').forEach(el=>el.onclick=()=>{$('#mail-host').value=el.dataset.mailTemplate;$('#mail-port').value='993';});
    root.querySelectorAll('[data-model]').forEach(el=>el.onclick=()=>{$('#deepseek-model').value=el.dataset.model;});
    root.querySelectorAll('[data-mail-uid]').forEach(el=>el.onclick=async()=>{try{message=await api('mail/read',{uid:el.dataset.mailUid});draw();}catch(e){toast(e.message)}});
    const upload=root.querySelector('#mail-eml');if(upload)upload.onchange=async()=>{const f=upload.files[0];if(!f)return;if(f.size>262144){toast('EML 文件最多支持 256 KiB，附件不解析。');return;}try{message=await api('mail/parse-eml',{raw:await f.text()});draw();toast('邮件已在本机解析，未发送至外部服务。');}catch(e){toast(e.message)}};
    const box=root.querySelector('#connection-analysis');if(box)box.oninput=()=>{analyzeText=box.value;};
    if(local)root.querySelectorAll('[data-portfolio-back]').forEach(a=>{a.href='https://dayang1847-arch.github.io/#procurement';a.onclick=null;});
  }
  window.PC={renderPage,bind:bindPage};
  if(new URLSearchParams(location.search).get('view')==='settings')go('settings');
  if(local)refresh().then(draw).catch(e=>{error=e.message;draw();});
})();
