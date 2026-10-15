const language = new URLSearchParams(location.search).get('lang') === 'en' ? 'en' : 'zh';
const isEnglish = language === 'en';
const labels = isEnglish ? {
  skip: 'Skip to guide', brand: 'Drawing Workshop', back: 'Back to workbench', eyebrow: 'USER GUIDE · READ & DOWNLOAD',
  download: 'Download PDF guide ↓', downloadShort: 'Download this guide as PDF ↓', contourQuick: 'Go to contour extraction →',
  sessionNote: 'Read in a separate tab; keep your workbench open', contents: 'CONTENTS', footer: 'Drawing Workshop · PDF to CAD', top: 'Back to top ↑',
} : {
  skip: '跳到说明正文', brand: '图纸工坊', back: '返回工作台', eyebrow: '产品说明书 · 在线阅读与下载',
  download: '下载 PDF 说明书 ↓', downloadShort: '下载本语言 PDF ↓', contourQuick: '查看轮廓提取流程 →',
  sessionNote: '说明书独立打开，原工作台可继续保留', contents: '目录', footer: '图纸工坊 · PDF 转 CAD', top: '回到顶部 ↑',
};
document.documentElement.lang = isEnglish ? 'en' : 'zh-CN';
document.title = isEnglish ? 'PDF to CAD User Guide · Drawing Workshop' : 'PDF 转 CAD 使用说明书 · 图纸工坊';
document.querySelectorAll('[data-guide]').forEach(node => { node.textContent = labels[node.dataset.guide]; });
document.querySelectorAll('[data-workbench]').forEach(node => { node.href = `./?lang=${language}`; });
document.querySelectorAll('[data-pdf], #guide-pdf').forEach(node => { node.href = `./user-guide-${language}.pdf`; });
document.querySelector('#guide-tools').setAttribute('aria-label', isEnglish ? 'Guide tools' : '说明书工具');
document.querySelector('#guide-toc-nav').setAttribute('aria-label', isEnglish ? 'Guide contents' : '说明书目录');
const languageLink = document.querySelector('#guide-language');
languageLink.textContent = isEnglish ? '中文' : 'EN';
languageLink.lang = isEnglish ? 'zh-CN' : 'en';
languageLink.href = `?lang=${isEnglish ? 'zh' : 'en'}${location.hash}`;
const themeButton = document.querySelector('#theme-toggle');
themeButton.setAttribute('aria-label', isEnglish ? 'Switch light and dark theme' : '切换深浅主题');
themeButton.addEventListener('click', () => {
  const root = document.documentElement;
  const currentDark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  root.dataset.theme = currentDark ? 'light' : 'dark';
});
function node(tag, text, className) {
  const element = document.createElement(tag);
  if (text !== undefined) element.textContent = text;
  if (className) element.className = className;
  return element;
}
function addCalibrationFigure(section) {
  const figure = node('figure', undefined, 'calibration-figure');
  const drawing = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  drawing.setAttribute('viewBox', '0 0 600 200');
  drawing.setAttribute('role', 'img');
  drawing.setAttribute('aria-label', isEnglish ? 'Synthetic contour: calibrate the width between points A and B to 60 millimetres, then collect parts at their relative scale.' : '合成轮廓示意：在 A、B 两点间校准 60 毫米，再按相对比例汇总零件。');
  // Hand-authored synthetic geometry; never derived from customer files.
  drawing.innerHTML = '<path d="M55 58H235V76H226C222 124 185 120 178 163H112C105 120 68 124 64 76H55Z" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linejoin="round"/><path d="M55 22V52M235 22V52M55 31H235" stroke="currentColor" stroke-width="1.2" fill="none"/><circle cx="55" cy="58" r="4.5" fill="#2263e6"/><circle cx="235" cy="58" r="4.5" fill="#269565"/><g font-family="sans-serif" font-size="13" fill="currentColor"><text x="136" y="22" text-anchor="middle">60 mm</text><text x="41" y="79">A</text><text x="241" y="79">B</text><text x="291" y="106" font-size="27">→</text></g><path d="M365 78H485V90H479C476 122 452 120 447 149H403C398 120 374 122 371 90H365Z M502 57H582V65H578C576 87 560 85 557 105H527C524 85 508 87 506 65H502Z" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/><path d="M349 170H590" stroke="currentColor" opacity=".25" stroke-dasharray="4 5"/>';
  figure.append(drawing, node('figcaption', isEnglish ? 'Synthetic example only. Select endpoints on the extracted contour and enter the stated measurement. Actual model dimensions must come from the source drawing.' : '合成演示图：在提取轮廓上点选端点，输入原图标注长度。实际型号尺寸以源图为准。'));
  section.append(figure);
}
async function renderGuide() {
  const response = await fetch('./manual-content.json?v=20261015-guide-1');
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  const all = await response.json();
  const content = all[language];
  document.querySelector('#guide-title').textContent = content.title;
  document.querySelector('#guide-subtitle').textContent = content.subtitle;
  document.querySelector('#guide-version').textContent = `${isEnglish ? 'Version' : '版本'} ${all.version}`;
  const body = document.querySelector('#guide-content');
  const toc = document.querySelector('#guide-toc');
  body.replaceChildren();
  for (const section of content.sections) {
    const element = node('section', undefined, 'guide-section');
    element.id = section.id;
    element.setAttribute('aria-labelledby', `${section.id}-heading`);
    const heading = node('h2', section.title);
    heading.id = `${section.id}-heading`;
    element.append(heading);
    for (const paragraph of section.paragraphs || []) element.append(node('p', paragraph));
    if (section.id === 'part-calibration') addCalibrationFigure(element);
    if (section.steps?.length) {
      const steps = node('ol');
      for (const step of section.steps) steps.append(node('li', step));
      element.append(steps);
    }
    if (section.table) {
      const wrap = node('div', undefined, 'table-wrap');
      const table = node('table', undefined, section.table.headers.length === 3 ? 'three-cols' : 'two-cols');
      const head = node('thead'), headRow = node('tr'), tableBody = node('tbody');
      for (const label of section.table.headers) { const th = node('th', label); th.scope = 'col'; headRow.append(th); }
      head.append(headRow);
      for (const row of section.table.rows) { const tr = node('tr'); for (const cell of row) tr.append(node('td', cell)); tableBody.append(tr); }
      table.append(head, tableBody); wrap.append(table); element.append(wrap);
    }
    if (section.note) element.append(node('p', section.note, 'guide-note'));
    body.append(element);
    const item = node('li'), link = node('a', section.title);
    link.href = `#${section.id}`; item.append(link); toc.append(item);
  }
  if ('IntersectionObserver' in window) {
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        toc.querySelectorAll('a').forEach(link => { if (link.hash === `#${entry.target.id}`) link.setAttribute('aria-current', 'location'); else link.removeAttribute('aria-current'); });
      }
    }, { rootMargin: '-90px 0px -65% 0px', threshold: 0 });
    document.querySelectorAll('.guide-section').forEach(section => observer.observe(section));
  }
  if (location.hash) { const target = document.getElementById(decodeURIComponent(location.hash.slice(1))); target?.scrollIntoView(); }
}
renderGuide().catch(() => {
  const status = document.querySelector('#guide-loading');
  if (status) status.textContent = isEnglish ? 'The online guide could not load. Use the PDF download above, or reload this guide tab.' : '在线说明书暂时无法载入。请使用上方 PDF 下载，或刷新说明书标签页重试。';
});
