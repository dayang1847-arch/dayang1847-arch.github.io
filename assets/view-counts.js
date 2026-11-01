(() => {
  'use strict';
  const script = document.currentScript;
  const endpoint = script.dataset.endpoint;
  const siteRoot = new URL('../', script.src);
  const relativePath = location.pathname.startsWith(siteRoot.pathname) ? location.pathname.slice(siteRoot.pathname.length) : '';
  const page = script.dataset.viewPage || relativePath.split('/')[0].toLowerCase() || 'home';
  const historyURL = new URL('./views-history.json', script.src).href;
  const isPublic = location.origin === 'https://dayang1847-arch.github.io';
  const eventId = globalThis.crypto?.randomUUID?.();
  let current = null;
  let busy = true;
  let counters = [];
  const labels = {
    zh: {loading:'正在读取访问统计',live:'含已迁移的旧统计',history:'已保留旧统计，新计数暂不可用',preview:'本地预览不增加访问次数',visit:'访问',count:'{count} 次访问',retry:'重新读取',started:'自 {date} 起累计',snapshot:'历史记录 · {date}'},
    en: {loading:'Loading view counts',live:'Includes migrated historical counts',history:'Historical counts retained; new counts unavailable',preview:'Local previews do not add views',visit:'Views',count:'{count} page views',retry:'Reload counts',started:'Counted since {date}',snapshot:'Historical snapshot · {date}'}
  };
  const lang = () => document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
  const valid = data => data && ['live','snapshot'].includes(data.mode) && data.counts && Object.values(data.counts).every(n => Number.isSafeInteger(n) && n >= 0) && typeof data.startedAt === 'string' && Number.isFinite(Date.parse(data.startedAt)) && typeof data.importedAt === 'string' && Number.isFinite(Date.parse(data.importedAt));
  function render() {
    const language=lang(), copy=labels[language];
    const nf=new Intl.NumberFormat(language==='zh'?'zh-CN':'en');
    const df=new Intl.DateTimeFormat(language==='zh'?'zh-CN':'en',{year:'numeric',month:'short',day:'numeric'});
    const state=current?.mode || 'loading';
    const period=current ? (state==='live'?copy.started:copy.snapshot).replace('{date}',df.format(new Date(state==='live'?current.startedAt:current.importedAt))) : copy.loading;
    for (const counter of counters) {
      const stored=current?.counts[counter.dataset.viewProject];
      const count=stored ?? (current?.mode==='live' ? 0 : undefined);
      const label=counter.querySelector('[data-i18n="projectViews"]');
      if (label) label.textContent=copy.visit;
      const text=Number.isSafeInteger(count)?nf.format(count):'—';
      counter.querySelector('[data-view-count]').textContent=text;
      counter.dataset.viewState=state;
      counter.setAttribute('aria-busy',String(busy));
      counter.setAttribute('aria-label',Number.isSafeInteger(count)?copy.count.replace('{count}',text):copy.loading);
      counter.title=period;
    }
    const status=document.querySelector('#metrics-status');
    if (status) status.textContent=current ? `${period} · ${state==='live'?copy.live:copy.history}${isPublic?'':` · ${copy.preview}`}` : copy.loading;
    const retry=document.querySelector('[data-metrics-retry]');
    if (retry) {retry.textContent=copy.retry;retry.disabled=busy;retry.hidden=!current || state==='live';}
  }
  function configureCards() {
    let added=false;
    for (const card of document.querySelectorAll('.project-card')) {
      if (card.querySelector('[data-view-project]')) continue;
      const link=card.querySelector('a.primary[href]');
      if (!link) continue;
      const url=new URL(link.href,location.href);
      if (url.origin!==location.origin || !url.pathname.startsWith(siteRoot.pathname)) continue;
      const id=url.pathname.slice(siteRoot.pathname.length).split('/')[0].toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) continue;
      let footer=card.querySelector('.project-footer');
      if (!footer) {footer=document.createElement('div');footer.className='project-footer';(card.querySelector('.project-content')||card).append(footer);}
      const counter=document.createElement('span');
      counter.className='project-views';counter.dataset.viewProject=id;counter.setAttribute('aria-busy','true');
      const label=document.createElement('span');label.dataset.i18n='projectViews';label.setAttribute('aria-hidden','true');
      const value=document.createElement('strong');value.dataset.viewCount='';value.setAttribute('aria-hidden','true');
      counter.append(label,value);footer.append(counter);added=true;
    }
    counters=[...document.querySelectorAll('[data-view-project]')];
    return added;
  }
  async function fetchCounts(record=false) {
    if (!endpoint) {busy=false;render();return;}
    busy=true;render();
    const controller=new AbortController();
    const timeout=setTimeout(()=>controller.abort(),7000);
    try {
      const options={mode:'cors',credentials:'omit',cache:'no-store',referrerPolicy:'no-referrer',signal:controller.signal};
      if (record && isPublic && eventId) {
        options.method='POST';options.keepalive=true;
        options.headers={'Content-Type':'text/plain'};
        options.body=JSON.stringify({project:page,eventId});
      }
      const response=await fetch(endpoint,options);
      if (!response.ok) throw new Error('Counts unavailable');
      const data=await response.json();
      if (!valid(data)) throw new Error('Invalid counts');
      current=data;
    } catch { /* The verified historical snapshot stays visible during an outage. */ }
    finally {clearTimeout(timeout);busy=false;render();}
  }
  // Begin entry-page requests before any meta refresh or login redirect.
  const liveRequest=fetchCounts(true);
  async function initialize() {
    configureCards();
    const grid=document.querySelector('#project-grid');
    if (grid) new MutationObserver(()=>{if(configureCards())render();}).observe(grid,{childList:true,subtree:true});
    try {
      const response=await fetch(historyURL,{credentials:'omit',cache:'no-cache'});
      const data=await response.json();
      if (valid(data) && current?.mode!=='live') current=data;
    } catch { /* An unavailable snapshot never becomes an invented zero. */ }
    render();
    await liveRequest;
    render();
    document.querySelector('[data-metrics-retry]')?.addEventListener('click',()=>fetchCounts(false));
    window.addEventListener('dc-language-changed',render);
    window.addEventListener('pageshow',event=>{if(event.persisted)fetchCounts(false);});
  }
  if (document.readyState==='loading') document.addEventListener('DOMContentLoaded',initialize,{once:true});
  else initialize();
})();
