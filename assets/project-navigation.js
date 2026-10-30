(() => {
  'use strict';

  function currentLanguage() {
    const language = document.documentElement.lang.toLowerCase();
    if (language === 'en' || language.startsWith('en-')) return 'en';
    if (language === 'zh' || language.startsWith('zh-')) return 'zh';
    try {
      return localStorage.getItem('dayang-language') === 'en' ? 'en' : 'zh';
    } catch {
      return 'zh';
    }
  }

  function localizedFallback(href, language) {
    const hashIndex = href.indexOf('#');
    const pathAndQuery = hashIndex === -1 ? href : href.slice(0, hashIndex);
    const hash = hashIndex === -1 ? '' : href.slice(hashIndex);
    const queryIndex = pathAndQuery.indexOf('?');
    const path = queryIndex === -1 ? pathAndQuery : pathAndQuery.slice(0, queryIndex);
    const query = new URLSearchParams(queryIndex === -1 ? '' : pathAndQuery.slice(queryIndex + 1));
    query.set('lang', language);
    return `${path}?${query.toString()}${hash}`;
  }

  function canGoBack() {
    if (window.navigation && typeof window.navigation.canGoBack === 'boolean') {
      return window.navigation.canGoBack;
    }
    return window.history.length > 1 && Boolean(document.referrer);
  }

  function initialize() {
    const links = Array.from(document.querySelectorAll('a[data-dc-back]'));
    if (!links.length) return;
    const fallbacks = links.map(link => link.getAttribute('href') || '../#works');

    function updateLanguage() {
      const language = currentLanguage();
      links.forEach((link, index) => {
        const label = link.querySelector('[data-dc-back-label]');
        if (label) label.textContent = language === 'en' ? 'Go back' : '返回上一页';
        link.setAttribute('title', language === 'en'
          ? 'Go back; return to the portfolio if no previous page is available.'
          : '返回上一页；没有上一页时返回作品集。');
        link.setAttribute('href', localizedFallback(fallbacks[index], language));
      });
    }

    links.forEach(link => {
      link.addEventListener('click', event => {
        if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
        if (!canGoBack()) return;
        event.preventDefault();
        window.history.back();
      });
    });

    updateLanguage();
    new MutationObserver(updateLanguage).observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['lang'],
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
