(() => {
  'use strict';
  const script = document.currentScript;
  const endpoint = script.dataset.endpoint;
  const siteRoot = new URL('../', script.src);
  const relativePath = location.pathname.startsWith(siteRoot.pathname)
    ? location.pathname.slice(siteRoot.pathname.length) : '';
  const page = script.dataset.viewPage || relativePath.split('/')[0].toLowerCase() || 'home';
  const snapshotURL = new URL('./views-history.json', script.src).href;
  const cacheKey = 'dc-web:view-counts:' + endpoint;
  const isPublic = location.origin === 'https://dayang1847-arch.github.io';
  const eventId = globalThis.crypto?.randomUUID?.();
  let recordPending = isPublic && Boolean(eventId);
  let current = null;
  let busy = true;
  let failed = false;
  let counters = [];
  let inFlight = null;
  let retryTimer = null;
  let retries = 0;
  const retryDelays = [2000, 8000, 30000];
  const labels = {
    zh: {
      loading: '正在读取访问次数',
      unavailable: '暂时无法更新访问次数，请稍后重试。',
      visit: '访问',
      count: '{count} 次访问',
      retry: '重新读取'
    },
    en: {
      loading: 'Loading page views',
      unavailable: 'Page views could not be updated. Please try again.',
      visit: 'Views',
      count: '{count} page views',
      retry: 'Reload counts'
    }
  };

  const language = () => document.documentElement.lang.startsWith('en') ? 'en' : 'zh';
  const validCounts = data => data && data.counts && typeof data.counts === 'object'
    && !Array.isArray(data.counts)
    && Object.keys(data.counts).length > 0
    && Object.entries(data.counts).every(([id, count]) => /^[a-z0-9][a-z0-9-]{0,63}$/.test(id)
      && Number.isSafeInteger(count) && count >= 0);

  function acceptCounts(data, persist = false) {
    if (!validCounts(data)) return false;
    const counts = {...current?.counts};
    for (const [id, count] of Object.entries(data.counts)) {
      counts[id] = Math.max(counts[id] || 0, count);
    }
    current = {...data, counts};
    if (persist) {
      try { localStorage.setItem(cacheKey, JSON.stringify({counts})); }
      catch { /* Counts still work when browser storage is unavailable. */ }
    }
    return true;
  }

  try { acceptCounts(JSON.parse(localStorage.getItem(cacheKey))); }
  catch { /* Invalid or unavailable browser storage is ignored. */ }

  function render() {
    const lang = language();
    const copy = labels[lang];
    const formatter = new Intl.NumberFormat(lang === 'zh' ? 'zh-CN' : 'en');
    for (const counter of counters) {
      const stored = current?.counts[counter.dataset.viewProject];
      const count = stored ?? (current?.mode === 'live' ? 0 : undefined);
      const value = counter.querySelector('[data-view-count]');
      const label = counter.querySelector('[data-i18n="projectViews"]');
      if (label) label.textContent = copy.visit;
      const text = Number.isSafeInteger(count) ? formatter.format(count) : '—';
      if (value) value.textContent = text;
      const description = Number.isSafeInteger(count)
        ? copy.count.replace('{count}', text) : (busy ? copy.loading : copy.unavailable);
      counter.dataset.viewState = current ? 'ready' : (busy ? 'loading' : 'error');
      counter.setAttribute('aria-busy', String(busy));
      counter.setAttribute('aria-label', description);
      counter.title = description;
    }
    const status = document.querySelector('#metrics-status');
    if (status) {
      status.hidden = !failed && Boolean(current);
      status.textContent = failed ? copy.unavailable : copy.loading;
    }
    const retry = document.querySelector('[data-metrics-retry]');
    if (retry) {
      retry.textContent = copy.retry;
      retry.disabled = busy;
      retry.hidden = !failed;
    }
  }

  function configureCards() {
    let added = false;
    for (const card of document.querySelectorAll('.project-card')) {
      if (card.querySelector('[data-view-project]')) continue;
      const link = card.querySelector('a.primary[href]');
      if (!link) continue;
      const url = new URL(link.href, location.href);
      if (url.origin !== location.origin || !url.pathname.startsWith(siteRoot.pathname)) continue;
      const id = url.pathname.slice(siteRoot.pathname.length).split('/')[0].toLowerCase();
      if (!/^[a-z0-9][a-z0-9-]{0,63}$/.test(id)) continue;
      let footer = card.querySelector('.project-footer');
      if (!footer) {
        footer = document.createElement('div');
        footer.className = 'project-footer';
        (card.querySelector('.project-content') || card).append(footer);
      }
      const counter = document.createElement('span');
      counter.className = 'project-views';
      counter.dataset.viewProject = id;
      const label = document.createElement('span');
      label.dataset.i18n = 'projectViews';
      label.setAttribute('aria-hidden', 'true');
      const value = document.createElement('strong');
      value.dataset.viewCount = '';
      value.setAttribute('aria-hidden', 'true');
      counter.append(label, value);
      footer.append(counter);
      added = true;
    }
    counters = [...document.querySelectorAll('[data-view-project]')];
    return added;
  }

  async function requestCounts() {
    clearTimeout(retryTimer);
    busy = true;
    render();
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
      if (!endpoint) throw new Error('No counter endpoint');
      const options = {
        mode: 'cors', credentials: 'omit', cache: 'no-store',
        referrerPolicy: 'no-referrer', signal: controller.signal
      };
      if (recordPending) {
        options.method = 'POST';
        options.keepalive = true;
        options.headers = {'Content-Type': 'text/plain'};
        options.body = JSON.stringify({project: page, eventId});
      }
      const response = await fetch(endpoint, options);
      if (!response.ok || !acceptCounts(await response.json(), true)) {
        throw new Error('Counts unavailable');
      }
      recordPending = false;
      failed = false;
      retries = 0;
    } catch {
      failed = true;
      if (retries < retryDelays.length) {
        retryTimer = setTimeout(fetchCounts, retryDelays[retries++]);
      }
    } finally {
      clearTimeout(timeout);
      busy = false;
      render();
    }
  }

  function fetchCounts() {
    if (inFlight) return inFlight;
    inFlight = requestCounts().finally(() => { inFlight = null; });
    return inFlight;
  }

  // Start recording before entry-page login scripts or meta refresh can navigate away.
  fetchCounts();
  async function initialize() {
    configureCards();
    render();
    const grid = document.querySelector('#project-grid');
    if (grid) {
      new MutationObserver(() => { if (configureCards()) render(); })
        .observe(grid, {childList: true, subtree: true});
    }
    document.querySelector('[data-metrics-retry]')?.addEventListener('click', fetchCounts);
    window.addEventListener('dc-language-changed', render);
    window.addEventListener('online', () => { if (failed) fetchCounts(); });
    window.addEventListener('pageshow', event => { if (event.persisted) fetchCounts(); });
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && failed) fetchCounts();
    });
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 5000);
    try {
      const response = await fetch(snapshotURL, {
        credentials: 'omit', cache: 'no-cache', signal: controller.signal
      });
      if (response.ok) {
        const data = await response.json();
        if (current?.mode !== 'live') acceptCounts(data);
      }
    } catch { /* Keep the last successfully read counts visible. */ }
    finally { clearTimeout(timeout); render(); }
  }
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, {once: true});
  } else initialize();
})();
