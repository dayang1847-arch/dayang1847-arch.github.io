// Fixed teaching examples only. These are not retrieved enterprise cases or model output.
export const EXPERIENCE={
 collection:{pain:'找资料费时，客户与产品线索分散',value:'降低获取信息的难度，为判断保留依据',history:'客户、产品与人员的来源记录',check:'主体、来源、期间与缺失项',decision:'可追溯记录单向入库'},
 market:{pain:'产品没选对，关键人没找对',value:'产品需求与决策角色两条线共同核实',history:'历史提案、客户异议与成交 / 失单原因',check:'市场、产品、期间及人员职责是否仍适用',decision:'形成有依据的推品与联系建议，由销售核实'},
 research:{pain:'新人经验不足，容易过度保守、反复试错',value:'用已有验证减少不确定性，保留必要设计裕量',history:'器件应力、热路径、制造路线与失败整改',check:'工况、国家适用要求、器件及设备边界',decision:'提出候选方案与验证清单，由研发确认'},
 procurement:{pain:'议价与供货经验分散，低单价未必可交付',value:'把历史履约与当前材料、报价条件一起判断',history:'同规格报价、交期偏差、质量与替代料记录',check:'规格、数量、税运、MOQ、有效期与交期',decision:'提出可比供货选择，替代料交研发复核'},
 process:{pain:'类似工程反复设计，场景经验难传承',value:'复用布局思路，重新核对新场景的适用性',history:'历史布灯、现场反馈、安装与调试问题',check:'空间几何、安装高度、配光与客户要求',decision:'形成布灯候选，在实际设计工具中重算核验'},
 database:{pain:'经验停留在个人，新人培养周期长',value:'沉淀判断过程，让下一次任务有据可循',history:'问题 → 条件 → 选择与依据 → 验证 → 实际结果',check:'版本、使用范围、失败与冲突记录',decision:'检索参考 → 差异核对 → 人工验证 → 新经验回存'}
};
export const EXPERIENCE_FIELDS=['问题','条件','候选与选择','判断依据','验证过程','实际结果','适用范围'];
export function experienceMarkup(id){const e=EXPERIENCE[id];return `<div class="ib-purpose"><small>业务痛点</small><strong>${e.pain}</strong><p>${e.value}</p></div><details class="ib-reuse"><summary>经验怎样参与本环节</summary><dl><dt>参考什么</dt><dd>${e.history}</dd><dt>先核对</dt><dd>${e.check}</dd><dt>再判断</dt><dd>${e.decision}</dd></dl><p>机制演示；未执行企业案例检索或模型推理。</p></details>`;}
export function experienceMap(names){const b=(id,sub)=>`<button type="button" data-ib-module="${id}" aria-pressed="false"><strong>${names[id]}</strong><small>${sub}</small></button>`;return `<nav class="ib-experience-map" aria-label="经验协作关系">${b('collection','外部信息获取')}<span class="ib-map-direction" aria-label="情报单向入库">单向入库 →</span><div class="ib-memory-hub">${b('database','企业经验底座')}<small>问题 · 条件 · 依据 · 验证 · 结果</small></div><span class="ib-map-direction" aria-label="各业务模块双向调用与回存">调用 ⇄ 回存</span><div class="ib-map-departments">${b('market','产品 × 关键人')}${b('research','必要裕量 × 成本')}${b('procurement','材料 × 供货条件')}${b('process','场景 × 应用效果')}</div></nav>`;}
