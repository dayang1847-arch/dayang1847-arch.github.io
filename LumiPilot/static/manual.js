'use strict';

// The server supplies one current manual for the UI and downloadable document.
window.LumiManual = (() => {
  let ctx, data = null, error = '', active = false, loadToken = 0, selected = '', query = '';
  const e = value => ctx.esc(value);
  const sections = () => Array.isArray(data?.sections) ? data.sections : [];
  const sectionLink = (id, q = '') => '#help?' + new URLSearchParams({section:id, ...(q ? {q} : {})});
  function href(value) {
    return typeof value === 'string' && (value === '/api/manual/export' || /^#[a-z][a-z0-9-]*(?:\?[a-zA-Z0-9=&%_.-]*)?$/.test(value)) ? value : '';
  }
  function searchText(section) {
    return [section.title,section.summary,...(section.keywords || []),
      ...(section.steps || []).flatMap(step => [step.title,step.body,...(Array.isArray(step.links)?step.links:[]).flatMap(link=>[link.label,link.note])]),
      ...(section.outputs || []),...(section.notes || [])].join(' ').toLocaleLowerCase();
  }
  function matches(section, search) {
    const words = String(search || '').trim().toLocaleLowerCase().split(/\s+/).filter(Boolean);
    const text = searchText(section);
    return words.every(word => text.includes(word));
  }
  function filtered() { return sections().filter(section => matches(section, query)); }
  function contextHref(hash) {
    const parsed=window.LumiWorkspace?.route(hash);const [rawPage,rawQuery = ''] = String(hash || '#workbench').replace(/^#/, '').split('?');const page=parsed?.page||rawPage.split('/')[0];
    const view = new URLSearchParams(rawQuery).get('view');
    if(page==='rd-solutions')return sectionLink('rd-solutions');
    if(page==='workbench'&&new URLSearchParams(rawQuery).get('case')==='smart-downlight')return sectionLink('customer-case');
    const customerTab=parsed?.query?.tab||rawPage.split('/')[2]||new URLSearchParams(rawQuery).get('tab');
    if(page==='customers'&&customerTab==='products')return sectionLink('product-market-research');
    const id = ({projects:'projects',overview:view === 'intelligence' ? 'project-intelligence' : 'overview',solution:'solution',bom:'bom',market:'market',crawler:'crawler',
      materials:view === 'logistics' ? 'logistics' : view === 'plastics' ? 'plastics' : 'materials',
      optical:view === 'spectral' ? 'spectral' : 'optical',knowledge:view === 'documents' ? 'knowledge' : 'compliance',
      workbench:'workbench',products:'products',jobs:'jobs','customer-directory':'customer-directory','sales-management':'sales-management','research-management':'research-management','procurement-management':'procurement-management',collaboration:'collaboration',customers:'customers',leadership:'leadership','material-selection':'material-selection',procurement:'procurement',decisions:'decisions',manufacturing:'manufacturing',cost:'whole-lamp-cost',access:'online-access'})[page] || 'getting-started';
    return sectionLink(id);
  }
  function timestamp(value) {
    if (!value || Number.isNaN(new Date(value).getTime())) return '本机同步';
    return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Shanghai'}).format(new Date(value));
  }
  function init(context) {ctx = context;}
  async function load() {
    active = true;
    const token = ++loadToken;
    const params = new URLSearchParams(location.hash.split('?')[1] || '');
    selected = params.get('section') || 'getting-started';
    query = (params.get('q') || '').slice(0, 200);
    data = null; error = '';
    try {
      const result = await ctx.api('/api/manual');
      if (token !== loadToken || !active) return;
      if (!Array.isArray(result?.sections) || !result.sections.length) throw new Error('说明书内容暂时不可用，请重新读取。');
      data = result;
      if (!sections().some(section => section.id === selected)) selected = sections()[0].id;
    } catch (err) {
      if (token === loadToken && active) error = err.message || '说明书暂时未能读取';
    }
  }
  function contents() {
    const list = filtered();
    return `<div class="manual-count" role="status">${query ? `找到 ${list.length} 个相关章节` : `共 ${list.length} 个使用章节`}</div><nav class="manual-toc" aria-label="使用说明目录">${list.map((section,index) => `<a href="${e(sectionLink(section.id,query))}" ${selected === section.id ? 'class="active" aria-current="page"' : ''}><span>${String(index + 1).padStart(2,'0')}</span><strong>${e(section.title)}</strong></a>`).join('')}</nav>${!list.length ? '<p class="manual-no-results">没有找到相关章节。可以尝试“报价”“光谱”或“运费”。</p>' : ''}`;
  }
  function history() {
    const changes = Array.isArray(data?.changes) ? data.changes.slice(0,8) : [];
    if (!changes.length) return '';
    const titles = Object.fromEntries(sections().map(section => [section.id,section.title]));
    return `<details class="manual-history"><summary>说明书更新记录 <span>查看近期同步内容</span></summary><ol>${changes.map(change => `<li><div><strong>${e(change.version)}</strong><time>${e(timestamp(change.updated_at))}</time></div><p>${e(change.summary || '说明书已同步')}</p>${change.sections?.length ? `<small>${e(change.sections.map(id => titles[id] || id).join(' · '))}</small>` : ''}</li>`).join('')}</ol></details>`;
  }
  function article(section) {
    if (!section) return `<div class="manual-empty"><h2>未找到相关说明</h2><p>请调整关键词，或清除搜索后从左侧目录阅读。</p><button class="button" type="button" data-manual-action="clear">清除搜索</button></div>`;
    const route = href(section.route);
    const pending = data?.review_required_sections?.includes(section.id);
    return `<article class="manual-article" aria-labelledby="manual-article-title"><header><div><p class="eyebrow">${e(section.scope || '使用指南')}</p><h2 id="manual-article-title">${e(section.title)}</h2><p class="manual-summary">${e(section.summary)}</p></div>${route && !route.startsWith('#help') ? `<a class="button button-primary" href="${e(route)}">打开相关功能 ${ctx.icon('ArrowUpRight')}</a>` : ''}</header>${pending ? '<div class="manual-review-note">此功能近期有调整，本章节的操作说明待同步核对。</div>' : ''}<section class="manual-steps" aria-label="操作步骤"><h3>操作步骤</h3><ol>${(section.steps || []).map((step,index) => `<li><span class="manual-step-number">${index + 1}</span><div><h4>${e(step.title)}</h4><p>${e(step.body)}</p>${(step.equations || []).map(eq=>`<div class="manual-equation"><strong>${e(eq.label)}</strong><p class="manual-equation-expression">${e(eq.expression)}</p><p>${e(eq.explanation)}</p></div>`).join('')}${stepLinks(step)}</div></li>`).join('')}</ol></section>${section.outputs?.length ? `<section class="manual-outcomes"><h3>完成后可以获得</h3><ul>${section.outputs.map(output => `<li>${ctx.icon('Check')}<span>${e(output)}</span></li>`).join('')}</ul></section>` : ''}${section.notes?.length ? `<section class="manual-notes"><h3>使用口径与注意事项</h3><ul>${section.notes.map(note => `<li>${e(note)}</li>`).join('')}</ul></section>` : ''}</article>`;
  }
  function stepLinks(step) {
    const links=(Array.isArray(step.links)?step.links:[]).filter(link=>link&&typeof link.label==='string'&&link.label.trim()&&href(link.href)).slice(0,6);
    return links.length?`<div class="manual-step-links" aria-label="${e(step.title)}的页面入口">${links.map(link=>`<div><a class="manual-page-link" href="${e(href(link.href))}" ${link.href==='/api/manual/export'?'download':''}>${e(link.label)} ${ctx.icon('ArrowUpRight')}</a>${link.note?`<small>${e(link.note)}</small>`:''}</div>`).join('')}</div>`:'';
  }
  function reading() {
    const list = filtered();
    const section = list.find(item => item.id === selected) || list[0];
    if (section) selected = section.id;
    return article(section) + history();
  }
  function view() {
    const head = `<div class="page-heading manual-heading"><div><p class="eyebrow">产品使用指南</p><h1>使用说明</h1><p>按工作任务查阅操作步骤、保存方式和结果口径。</p></div>${data ? `<a class="button" href="/api/manual/export" download>${ctx.icon('Download')}下载完整说明（PDF）</a>` : ''}</div>`;
    if (error) return head + `<div class="screen-error" role="alert"><h2>说明书暂时未能载入</h2><p>${e(error)}</p><button class="button" data-manual-action="reload">重新读取</button></div>`;
    if (!data) return head + '<div class="initial-loading" role="status">正在读取使用说明…</div>';
    const readingHtml = reading(), contentsHtml = contents();
    return head + `<div class="manual-version-bar"><span>${ctx.icon('BookOpen')}<strong>${e(data.title || 'LumiPilot 使用说明')}</strong></span><span>版本 ${e(data.version || '—')}</span><span>同步于 ${e(timestamp(data.updated_at))}</span><span class="manual-sync-status ${data.documentation_status === 'needs_review' ? 'pending' : ''}">${data.documentation_status === 'needs_review' ? '部分说明待更新' : '与当前版本同步'}</span></div>${data.coverage_issues?.length ? '<div class="manual-review-note manual-coverage-note">部分新增功能的操作说明尚待补充，已记录在说明维护检查中。</div>' : ''}<div class="manual-layout"><aside class="manual-sidebar"><form id="manual-search-form" role="search"><label for="manual-search">搜索操作说明</label><div><input id="manual-search" name="q" type="search" maxlength="200" value="${e(query)}" placeholder="如 BOM、IES、运费" autocomplete="off"><button class="manual-search-clear" type="button" data-manual-action="clear" aria-label="清除搜索" ${query ? '' : 'hidden'}>×</button></div></form><div id="manual-contents">${contentsHtml}</div></aside><div id="manual-reading">${readingHtml}</div></div>`;
  }
  function paintSearch() {
    if (!active || !data) return;
    // Update the reading regions, preserving search focus and selection.
    const readingEl = document.querySelector('#manual-reading'), contentsEl = document.querySelector('#manual-contents');
    if (readingEl) readingEl.innerHTML = reading();
    if (contentsEl) contentsEl.innerHTML = contents();
    const clear = document.querySelector('.manual-search-clear');
    if (clear) clear.hidden = !query;
  }
  function clearSearch() {
    query = '';
    const input = document.querySelector('#manual-search');
    if (input) {input.value = ''; input.focus();}
    paintSearch();
  }
  function stop() {active = false; ++loadToken;}
  document.addEventListener('input', event => {
    if (!active || event.target?.id !== 'manual-search') return;
    query = String(event.target.value || '').slice(0,200);
    paintSearch();
  });
  document.addEventListener('submit', event => {
    if (!active || event.target?.id !== 'manual-search-form') return;
    event.preventDefault();
    paintSearch();
  });
  document.addEventListener('click', async event => {
    if (!active) return;
    const target = event.target?.closest?.('[data-manual-action]');
    if (!target) return;
    if (target.dataset.manualAction === 'clear') clearSearch();
    if (target.dataset.manualAction === 'reload') await ctx.refresh();
  });
  return {init,load,view,stop,contextHref,matches};
})();
