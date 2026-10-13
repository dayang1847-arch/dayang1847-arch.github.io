(() => {
  const root = document.documentElement;
  const copy = {
  "zh": {
    "works": "项目作品",
    "scope": "阅读说明",
    "workCount": "02 / 项目入口",
    "publicStatus": "可在线浏览",
    "lumiTitle": "照明研发与采购决策工作台",
    "lumiDescription": "以照明 OEM/ODM 产品为主线，将市场资料、国家认证、光学验证、电子 BOM 与制造成本连接在同一工作空间，帮助团队核对方案输入、资料依据和待确认事项。",
    "lightingRD": "照明研发",
    "certification": "国家准入",
    "knowledgeSearch": "知识检索",
    "engineeringCosts": "工程核价",
    "enterLumi": "进入 LumiPilot ↗",
    "manual": "使用说明 →",
    "lumiAccess": "无需安装或登录 · 浏览已有公开资料与已保存分析",
    "marketNode": "市场与来源",
    "marketNodeDetails": "品牌 · 产品 · 公开资料",
    "knowledgeNode": "知识与约束",
    "knowledgeNodeDetails": "国家认证 · 工艺原理",
    "sameEvidence": "同一产品，保留同一组依据",
    "decisionTitle": "方案 · 光学 · BOM · 成本",
    "decisionDescription": "查看目标规格、保存结果与数据口径。 缺失输入保持未知，已有来源可追溯。",
    "projectCount": "已保存研发项目",
    "marketCount": "市场资料记录",
    "brandCount": "品牌与企业条目",
    "authStatus": "账号密码登录",
    "tospoTitle": "Outdoor Lighting · 户外照明展示",
    "tospoDescription": "围绕公司介绍、户外照明产品与工程案例，整理 TOSPO 的产品展示与项目浏览体验。通过统一的展示入口，了解企业背景、产品系列和不同应用场景。",
    "companyIntro": "公司介绍",
    "outdoorLighting": "户外照明",
    "productShowcase": "产品展示",
    "projectReferences": "工程案例",
    "enterTospo": "账号密码访问 ↗",
    "tospoAccess": "使用网站账号和密码登录 · 网站在新窗口打开",
    "companyNode": "企业与产品",
    "companyNodeDetails": "公司介绍 · 户外灯具",
    "projectsNode": "项目与应用",
    "projectsNodeDetails": "工程案例 · 照明场景",
    "tospoDecisionTitle": "从产品，到应用场景",
    "tospoDecisionDescription": "通过公司、产品和工程案例了解户外照明展示。 进入网站后，使用账号和密码登录查看展示内容。",
    "tospoDate": "独立网站 · 账号密码登录访问",
    "exploreTitle": "按业务主题查看",
    "exploreLabel": "LumiPilot / 浏览入口",
    "marketLink": "市场与公开来源 ↗",
    "marketLinkDetails": "竞品资料、品牌名录与采集记录",
    "knowledgeLink": "国家认证与知识 ↗",
    "knowledgeLinkDetails": "按国家、产品及要求查阅依据",
    "opticalLink": "产品与光学记录 ↗",
    "opticalLinkDetails": "目标规格、已保存分析与来源口径",
    "materialsLink": "材料与工程成本 ↗",
    "materialsLinkDetails": "已保存行情、粒子关系与工艺知识",
    "scopeDescription": "本作品集提供两个项目入口。LumiPilot 沿用现有工作台界面，发布当前已保存资料的只读版本；页面保留概念模型、历史记录与待核验资料的标记，发布时点不改变原始价格和法规来源日期。实时采集、上传、业务保存和账号审批需要完整后端服务。TOSPO 户外照明展示由独立网站提供，需使用网站账号和密码登录。请在具体项目内核对来源、适用范围及工程验证状态。",
    "footerGuide": "LumiPilot 使用说明 ↗",
    "title": "DC Web",
    "home": "DC Web 首页",
    "navigation": "主导航",
    "aboutNav": "关于",
    "skip": "跳到正文",
    "themeDark": "切换到深色主题",
    "themeLight": "切换到浅色主题",
    "switchLanguage": "Switch to English"
  },
  "en": {
    "works": "Selected work",
    "scope": "Reading notes",
    "workCount": "02 / Project links",
    "publicStatus": "Public preview",
    "lumiTitle": "Lighting R&D and procurement decision workspace",
    "lumiDescription": "A workspace connecting market research, certification requirements, optical analysis, electronic BOMs and manufacturing costs for lighting OEM/ODM products. It helps teams review inputs, supporting evidence and unresolved questions.",
    "lightingRD": "Lighting R&D",
    "certification": "Market access",
    "knowledgeSearch": "Knowledge search",
    "engineeringCosts": "Engineering costs",
    "enterLumi": "Explore LumiPilot ↗",
    "manual": "User guide →",
    "lumiAccess": "No installation or login required · Browse published data and saved analyses",
    "marketNode": "Markets & sources",
    "marketNodeDetails": "Brands · Products · Public sources",
    "knowledgeNode": "Knowledge & constraints",
    "knowledgeNodeDetails": "Certification · Manufacturing processes",
    "sameEvidence": "One product, one consistent set of evidence",
    "decisionTitle": "Design · Optics · BOM · Cost",
    "decisionDescription": "Review target specifications, saved results and data definitions. Missing inputs remain unknown; available sources remain traceable.",
    "projectCount": "Saved R&D projects",
    "marketCount": "Market records",
    "brandCount": "Brand & company entries",
    "authStatus": "Account & password required",
    "tospoTitle": "Outdoor Lighting · Product showcase",
    "tospoDescription": "A presentation of TOSPO’s company background, outdoor lighting products and project references. Explore the business, product ranges and lighting applications through one website.",
    "companyIntro": "Company background",
    "outdoorLighting": "Outdoor lighting",
    "productShowcase": "Product showcase",
    "projectReferences": "Project references",
    "enterTospo": "Sign in to TOSPO ↗",
    "tospoAccess": "Sign in with your website account and password · Opens in a new tab",
    "companyNode": "Company & products",
    "companyNodeDetails": "Company background · Outdoor luminaires",
    "projectsNode": "Projects & applications",
    "projectsNodeDetails": "Project references · Lighting applications",
    "tospoDecisionTitle": "From products to applications",
    "tospoDecisionDescription": "Explore outdoor lighting through company information, products and project references. Sign in with your website account and password to view the showcase.",
    "tospoDate": "Independent website · Account and password access",
    "exploreTitle": "Explore by topic",
    "exploreLabel": "LumiPilot / Topic links",
    "marketLink": "Markets & public sources ↗",
    "marketLinkDetails": "Competitive research, brands and source records",
    "knowledgeLink": "Certification & knowledge ↗",
    "knowledgeLinkDetails": "Browse evidence by country, product and requirement",
    "opticalLink": "Products & optical records ↗",
    "opticalLinkDetails": "Specifications, saved analyses and source definitions",
    "materialsLink": "Materials & engineering costs ↗",
    "materialsLinkDetails": "Saved market data, material relationships and processes",
    "scopeDescription": "This website provides two project links. LumiPilot is a read-only snapshot of saved records using the existing workspace interface. Concept models, historical records and items requiring verification retain their labels; publication does not change the original dates of price or regulatory sources. Live collection, uploads, editing and account approval require the full backend. TOSPO is an independent website requiring a website account and password. Review sources, applicability and engineering verification status within each project.",
    "footerGuide": "LumiPilot user guide ↗",
    "title": "DC Web",
    "home": "DC Web home",
    "navigation": "Main navigation",
    "aboutNav": "About",
    "skip": "Skip to content",
    "themeDark": "Switch to dark theme",
    "themeLight": "Switch to light theme",
    "switchLanguage": "切换到中文版"
  }
};
  const themeButton = document.querySelector('.theme-toggle');
  const languageSwitch = document.querySelector('.language-switch');
  const dateNote = document.querySelector('#publication-date');
  function saved(key) { try { return localStorage.getItem(key); } catch { return null; } }
  function remember(key,value) { try { localStorage.setItem(key,value); } catch { /* Controls work without storage. */ } }
  const query = new URLSearchParams(location.search).get('lang');
  let language = ['zh','en'].includes(query) ? query : saved('dayang-language') === 'en' ? 'en' : 'zh';
  const initialLanguage = language;
  let theme = saved('dayang-theme') === 'dark' ? 'dark' : 'light';
  let publicationDate = null;
  let publicationFailed = false;
  function updateDate() {
    if (publicationDate) {
      const date = new Intl.DateTimeFormat(language === 'en' ? 'en-GB' : 'zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hour12:false,timeZone:'Asia/Shanghai'}).format(publicationDate);
      dateNote.textContent = language === 'en' ? `Published ${date} (UTC+8) · Original source dates retained` : `资料发布于 ${date} · 保留原始来源日期`;
    } else if (publicationFailed) {
      dateNote.textContent = language === 'en' ? 'Statistics are unavailable. You can still explore the workspace.' : '资料统计暂未载入，可直接进入工作台查看。';
    } else {
      dateNote.textContent = language === 'en' ? 'Source dates are recorded within each project.' : '各项资料的日期见原始记录';
    }
  }
  function updateTheme() {
    root.dataset.theme = theme;
    const label = copy[language][theme === 'dark' ? 'themeLight' : 'themeDark'];
    themeButton.setAttribute('aria-label',label);
    themeButton.title = label;
    document.querySelector('meta[name="theme-color"]').content = theme === 'dark' ? '#101721' : '#f7f8fa';
  }
  function updateLanguage() {
    root.lang = language === 'en' ? 'en' : 'zh-CN';
    document.title = copy[language].title;
    document.querySelectorAll('[data-i18n]').forEach(node => { node.textContent = copy[language][node.dataset.i18n]; });
    document.querySelectorAll('[data-i18n-aria]').forEach(node => { node.setAttribute('aria-label',copy[language][node.dataset.i18nAria]); });
    const next = language === 'en' ? 'zh' : 'en';
    const url = new URL(location.href);
    url.searchParams.set('lang',next);
    languageSwitch.href = url.href;
    languageSwitch.textContent = language === 'en' ? '中文' : 'EN';
    languageSwitch.lang = language === 'en' ? 'zh-CN' : 'en';
    languageSwitch.hreflang = languageSwitch.lang;
    languageSwitch.setAttribute('aria-label',copy[language].switchLanguage);
    languageSwitch.title = copy[language].switchLanguage;
    updateTheme();
    updateDate();
  }
  updateLanguage();
  themeButton.hidden = false;
  languageSwitch.hidden = false;
  languageSwitch.addEventListener('click',event => {
    if (event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
    event.preventDefault();
    language = language === 'en' ? 'zh' : 'en';
    const url = new URL(location.href); url.searchParams.set('lang',language);
    history.pushState(null,'',url);
    remember('dayang-language',language); updateLanguage();
  });
  window.addEventListener('popstate',() => {
    const value = new URLSearchParams(location.search).get('lang');
    language = ['zh','en'].includes(value) ? value : initialLanguage;
    remember('dayang-language',language); updateLanguage();
  });
  themeButton.addEventListener('click',() => { theme = theme === 'dark' ? 'light' : 'dark';remember('dayang-theme',theme);updateTheme(); });
  fetch('./LumiPilot/share-data.json',{cache:'no-cache'}).then(response => {
    if (!response.ok) throw new Error('Published data unavailable');
    return response.json();
  }).then(data => {
    const api = data.api || {};
    const projects = api['/api/projects']?.projects;
    const source = api['/api/market/products'];
    const market = Array.isArray(source) ? source : source?.products;
    const brands = api['/api/brands']?.brands;
    for (const [id,records] of [['project-count',projects],['market-count',market],['brand-count',brands]]) {
      if (Array.isArray(records)) document.getElementById(id).textContent = records.length.toLocaleString('en-US');
    }
    const date = new Date(data.published_at);
    if (Number.isFinite(date.getTime())) publicationDate = date;
    updateDate();
  }).catch(() => { publicationFailed = true;updateDate(); });
})();
