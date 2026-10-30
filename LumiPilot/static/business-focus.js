'use strict';

// Read-only views of saved business evidence. Department write controls stay in the workbench.
window.LumiBusinessFocus = (() => {
  const rows = value => Array.isArray(value) ? value : [];
  const esc = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const count = value => Number.isInteger(value) && value >= 0 ? String(value) : '待核对';
  const note = value => `<p class="bf-note">${esc(value)}</p>`;
  function stamp(value){if(/^\d{4}(?:-\d{2})?$/.test(value || ''))return value;const date=new Date(value);return Number.isNaN(date.getTime())?String(value || '未记录'):new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Shanghai'}).format(date)+'（北京时间）';}
  const list = values => rows(values).length ? `<ul class="bf-list">${rows(values).map(v => `<li>${esc(v)}</li>`).join('')}</ul>` : '';
  const route = (href, title) => `<a class="bf-link" href="#${href}">${title}<span aria-hidden="true"> →</span></a>`;
  const jump = (target, title) => `<button type="button" class="bf-link" data-bh-action="focus-jump" data-value="${target}">${title}<span aria-hidden="true"> →</span></button>`;
  const tab = (target, title) => `<button type="button" class="bf-link" data-bh-action="tab" data-value="${target}">${title}<span aria-hidden="true"> →</span></button>`;
  function sources(evidence) {
    const content = rows(evidence).slice(0, 4).map(e => {
      let url = '';
      try { const parsed = new URL(e.url); if (['http:', 'https:'].includes(parsed.protocol) && !parsed.username && !parsed.password) url = parsed.href; } catch {}
      return `<div>${url ? `<a href="${esc(url)}" target="_blank" rel="noopener noreferrer">${esc(e.title || '查看来源')}</a>` : `<span>${esc(e.title || '已登记依据')}</span>`}${e.excerpt ? `<p>${esc(e.excerpt)}</p>` : ''}</div>`;
    }).join('');
    return content ? `<details class="bf-evidence"><summary>查看依据</summary>${content}</details>` : note('支撑依据待补充');
  }
  const section = (title, subtitle, body) => `<section class="bf-section" aria-label="${esc(title)}"><div class="bf-heading"><h3>${esc(title)}</h3>${note(subtitle)}</div>${body}</section>`;
  const card = (label, title, body, action='') => `<article class="bf-card"><span class="bf-kicker">${esc(label)}</span><h4>${esc(title)}</h4>${body}${action}</article>`;
  const unavailable = (error, target) => section('业务判断依据', '当前摘要未能载入；已有档案和业务操作仍可使用。', note(error || '请刷新重试，暂不显示统计结论。') + (target ? tab(target, '查看已保存资料') : ''));
  function customer(data, mode='overview', error='') {
    if (!data) return unavailable(error, mode === 'overview' ? 'people' : 'overview');
    const people = data.people || {}, products = data.products || {};
    if (mode === 'overview') return section('找对人，做对产品', '从已保存的客户事实出发，明确联系路径和产品提案的下一步。', `<div class="bf-grid">${card('找对人', '谁参与这笔业务的决策', note(`${rows(people.roles).filter(r => r.status === 'supported').length} / 4 类角色有职责依据；职位线索仍须核实参与范围。`) + list(rows(people.gaps).slice(0, 2)), tab('people', '梳理联系人与切入话题'))}${card('做对产品', '客户的产品动作意味着什么', note(`${rows(products.signals).length} 条已记录产品线索，${rows(products.proposal_tasks).length} 项提案调查任务；来源完整性须逐条核对。`) + list(rows(products.gaps).slice(0, 2)), tab('products', '查看产品动作与提案'))}</div>`);
    if (mode === 'people') {
      const labels = {supported:'有职责依据 · 范围待核实',lead_only:'职位线索 · 待核实',missing:'待寻找岗位'};
      const roles = rows(people.roles).map(r => card(r.label, labels[r.status] || '待核实', rows(r.contacts).length ? `<ul class="bf-list">${r.contacts.map(p => `<li><strong>${esc(p.name)}</strong> · ${esc(p.title || '职位待核实')}<p>${esc(p.basis)}</p></li>`).join('')}</ul>` + sources(r.contacts.flatMap(p=>rows(p.evidence))) + note(r.next_step) : note(r.recommended_position) + note(r.next_step))).join('');
      const contacts = rows(people.contacts).slice(0, 12).map(p => `<article class="bf-contact"><h4>${esc(p.name)} <small>${esc(p.title)}</small></h4>${note(p.timing_note)}<div class="bf-grid"><div><strong>通过什么关系接近</strong>${rows(p.paths).length ? rows(p.paths).map(path => note(path.label) + note(path.notice) + sources(path.evidence)).join('') : note('尚无有证据的接近路径；先核实已有联系与引荐意愿。')}</div><div><strong>围绕什么业务话题</strong>${list(p.topics)}${sources(p.evidence)}</div></div></article>`).join('');
      const signals = rows(people.signals).slice(0, 6).map(s => card('联系时机线索', s.fact, note(s.time_status === 'recorded' ? `观测时间：${stamp(s.observed_at)}` : '发生时间未核实') + note(s.time_note) + note(s.action) + sources(s.evidence))).join('');
      return section('找对人：联系谁、怎么接近、何时沟通', '角色分类帮助安排核实顺序；不自动认定上下级、采购审批权或引荐关系。', `<div class="bf-grid bf-roles">${roles}</div>${contacts ? `<details class="bf-details"><summary>联系路径与沟通话题（${rows(people.contacts).length} 位已登记人物）</summary>${contacts}</details>` : note('没有已登记人物，先寻找对应岗位或到“发现与采集”收集公开职业资料。')}${signals ? `<div class="bf-grid">${signals}</div>` : note('暂无可追溯的任职变化线索。')}${list(people.gaps)}${note('重点建设：完整 LinkedIn 组织架构覆盖、职业画像与自动履历变化分析。')}${tab('crawl','补充公开人物资料')}`);
    }
    const tasks = rows(products.proposal_tasks).slice(0, 6).map(t => card('待调查的产品提案', t.title, note(t.trigger) + list(t.investigate) + sources(t.evidence))).join('');
    const signals = rows(products.signals).slice(0, 6).map(s => card('已记录的产品动作', s.fact, note(s.time_status === 'recorded' ? `观测时间：${stamp(s.observed_at)}` : '发生时间未核实') + note(s.time_note) + note(s.topic) + sources(s.evidence))).join('');
    return section('做对产品：从客户动作到产品提案', '先核对产品、市场与渠道，再结合已有产品和工厂能力准备方案。', `<div class="bf-grid">${tasks || card('下一步', '补齐产品与渠道依据', list(products.gaps), tab('crawl','发现产品与新闻页面'))}</div>${signals ? `<details class="bf-details"><summary>查看支撑提案的产品动作</summary><div class="bf-grid">${signals}</div></details>` : ''}${list(products.gaps)}${note('首次发现不等于新品发布；评论数不等于销量。提案仍需验证规格、成本与制造能力。')}${tab('strategy','形成客户策略并会审')}`);
  }
  function production(data, mode, error='') {
    if (!data) return unavailable(error);
    if (mode === 'material-selection') {
      const m=data.materials || {}, c=m.counts || {}, merge=m.merge || {}, reviews=m.reviews || {};
      const pending = Number.isInteger(reviews.counts?.proposed) && Number.isInteger(reviews.counts?.reviewing) ? reviews.counts.proposed + reviews.counts.reviewing : null;
      return section('物料平台化与标准化', '研发先验证能否复用，采购汇总需求与报价，工程会审确认替代范围。', `<div class="bf-grid">${card('控制新增', '申请新料之前，先评估老料', `<div class="bf-numbers"><span><b>${count(c.total)}</b>已登记料号</span><span><b>${count(c.verified)}</b>有验证记录</span><span><b>${count(c.pending_verification)}</b>待验证</span></div>` + note('候选有规格冲突时须说明；新增料号保留未复用原因。'), jump('reuse','查找可复用物料'))}${card('整合存量', '把相近物料送入合并会审', note(merge.status === 'evaluated' ? `${count(merge.group_count)} 组候选，涉及 ${count(merge.involved_material_count)} 个料号。` : merge.notice || '尚不能确定候选数量。') + note('候选组内仍须逐对验证，不能直接作为已减少的 SKU。') + (pending !== null ? note(`${count(pending)} 条关系待会审。`) : ''), jump('merge','查看合并候选与会审'))}</div>${list([...(data.gaps || []),...(m.gaps || [])])}${note('目标链条：物料标准化 → 采购 SKU 收敛 → 单个料号需求集中 → 提升议价空间。实际变化和收益需真实业务数据验证。')}`);
    }
    const c=data.cost || {}, history=c.history || {}, settlement=c.settlement || {}, plans=c.saved_cost_plans || {};
    return section('提高成本与利润的确定性', '把行情依据、供应商结算规则和订单需求放在同一条决策路径中。', `<div class="bf-grid">${card('1 · 观察依据', '历史行情与结算条件是否齐全', note(`${count(history.series_count)} 条已保存行情序列；其中 ${count(history.verified_series_count)} 条附有可核对来源。`) + note(`${count(settlement.rule_count)} 条结算规则；已检查 ${count(settlement.assessed_count)} 条，其中 ${count(settlement.reference_ready_count)} 条在当前结算期可计算公式参考价。`) + note('可计算仍须核对合同、计价期间与实际付款条件。') + (rows(history.items).length ? sources(history.items.map(h=>({title:h.label || h.id,url:h.source_url,excerpt:`已保存观测：${h.first_date || '起始日期未知'} — ${h.last_date || '结束日期未知'}；${count(h.observation_count)} 条。刷新状态：${({ok:'已取得',success:'已取得',failed:'失败',running:'进行中',unknown:'未记录'})[h.refresh_status] || '请到行情页核对'}。`}))) : ''), jump('settlement','核对上月计价与结算规则') + '<br>' + route('materials','查看历史行情与来源'))}${card('2 · 比较行动', '锁价、分批采购与重新询标', note('输入采购需求、报价和涨跌假设，分别比较采购现金、生产耗用、期末库存与订单毛利。') + note('现金与库存反映资金暴露；融资、仓储、保证金等费用需另补依据。'), jump('scenario','测算采购情景'))}</div><div class="bf-boundary"><strong>当前可用</strong><span>历史行情、结算公式与条件化情景比较。</span><strong>重点建设</strong><span>未来几个月的大宗商品趋势判断，须保留预测依据和不确定性。</span></div>${list([...(data.gaps || []),...(c.gaps || [])])}${note(`${count(plans.total_count)} 个已保存整灯成本方案；采购情景目前为当次计算，暂不保存情景历史，也不生成采购承诺。`)}${route('material-selection','推进物料平台化与需求集中')}`);
  }
  function leadership() {
    return section('核心业务目标', '销售找对人、做对产品；生产提高成本确定性、推动物料平台化和标准化。', `<div class="bf-grid bf-objectives">${card('销售 · 找对人','建立可核实的联系路径',note('核实技术、采购、预算和最终决策角色，跟进任职变化。'),route('customers?tab=people','查看联系人与切入话题'))}${card('销售 · 做对产品','把产品动作转成客户提案',note('查看规格、价格和渠道变化，明确提案依据与待确认条件。'),route('customers?tab=products','查看产品机会'))}${card('生产 · 成本确定性','让行情依据进入采购决策',note('比较采购支出、耗用、库存和毛利对不同价格假设的响应。'),route('procurement?focus=scenario','比较采购情景'))}${card('生产 · 物料标准化','减少重复建料，集中采购需求',note('老料复用与存量合并须经工程验证，保留历史料号与 BOM。'),route('material-selection?focus=reuse','评估复用与合并'))}</div>${note('完整 LinkedIn 组织架构、职业画像与自动履历变化分析，以及未来商品趋势预测仍在重点建设范围。实际降本与效率收益待真实业务数据验证。')}`);
  }
  return {customer,production,leadership};
})();
