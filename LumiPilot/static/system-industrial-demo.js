// One deterministic teaching case drives geometry, labels and screens. No business I/O.
export const MODULE_NAMES={collection:'情报采集',market:'市场判断',research:'研发与工艺',procurement:'采购协同',process:'工程方案',database:'共同档案'}; // `process` retains old focus URLs.
export const CASE_TITLE='曲线中庭照明 · 从空间需求到客户提案';
const beat=(title,logic,result,tags)=>({title,logic,result,tags});
export const DEMO={
 collection:{steps:[
  beat('渠道原件进入','先保留渠道、对象、期间与原文，再提取字段。','8 份渠道原件',['教学案例','原文保留']),
  beat('提取与关联字段','将每条字段关联到原件；不把缺失填为零。','字段与原文逐条关联',['来源可查','缺失留空']),
  beat('按对象与来源去重','同一对象、同一来源的重复记录合并，依据继续保留。','8 份原件 → 7 条去重记录',['1 条重复','保留依据']),
  beat('缺失与冲突分流','可复查、缺失、冲突分别存放；待确认记录不冒充通过。','5 条可复查 · 1 条缺失 · 1 条冲突',['缺失待补','冲突保留']),
  beat('原文与字段单向归档','核对结果连同原文进入档案；该连接只向档案传递。','带来源和质量状态入库',['单向入库','未执行真实采集'])]},
 market:{steps:[
  beat('建立同口径时间序列','把同一市场、产品和期间的观察按时间排列，缺期留空。','销量示例序列 · 缺失不连线',['固定教学数据','不是实际销量']),
  beat('比较趋势与波动','比较原始序列与三期移动平均，区分短期波动和持续变化。','观察序列 → 平滑趋势',['不同口径排除','不补造历史']),
  beat('分析销售与客户反馈','将销量变化与历史提案、维护异议和成交 / 失单原因对照；同时查找需求相关角色。','产品变化 ＋ 客户反馈',['相关不等于因果','标签次数示意']),
  beat('形成机会与销售假设','并行核实产品需求与关键人职责；历史经验只提出联系和推品建议，公开职位不等于决策权限。','产品需求 × 关键人职责 → 销售待核实',['需求待核实','假设有来源']),
  beat('推进提案并跟踪结果','观察、客户核实、方案提案和结果分别记录，反馈回存。','客户核实 → 方案提案 → 结果待反馈',['未表示成交','销售分析闭环'])]},
 research:{steps:[
  beat('需求与设计方案','调用相似设计的依据与失败记录，核对本次空间、安装及维护条件；不直接照搬旧方案。','设计输入 → 结构 / 光学方案',['设计有边界','维护与安装']),
  beat('电路方案与器件裕量','用历史应力与验证依据核对必要裕量，减少经验不足导致的过度保守；未知项仍待验证。','A 裕量不足 · B 待验证 · C 依据缺失',['电路有依据','未知不通过']),
  beat('散热方案与边界','参考历史热问题与整改路径，重新核对环境、接触条件及散热结构；旧试验不替代本次验证。','热源 → 导热 → 散热 → 环境',['相对温升示意','非实测温度']),
  beat('SMT / DIP 工艺验证','贴装光源板与驱动器件，再插装焊接；核对设备、极性与高度。','SMT → DIP → 工艺检查',['光源 / 驱动','工艺归入研发']),
  beat('装配与试验反馈','组装光源、驱动和散热部件；异常返回方案设计，整改后复验。','异常 → 设计整改 v2 → 待复验',['失败有去向','整改≠通过']),
  beat('包装与交付核对','核对灯具、附件、标识和包装清单，再形成交付资料。','形成交付资料 · 放行待核对',['材料与 MVA 分列','不自动批准'])]},
 procurement:{steps:[
  beat('观察大宗期货变化','对照铝、铜、钢的示例指数走势；期货观察和正式报价分开。','铝 / 铜 / 钢 · 教学指数',['非实时行情','不是采购报价']),
  beat('传导到材料成本','按示例材料权重观察价格敏感性，材料与制造费用分列。','材料指数变化 → 成本敏感性',['示例权重','MVA 不重复计材']),
  beat('对齐供应报价条件','对齐数量、MOQ、税运和交期，再比较；缺项不能凭单价排名。','A 税运待补 · B 可比 · C 交期排除',['同条件比较','采用待确认']),
  beat('核对供货与替代风险','调用历史质量与履约偏差，核对本次供货及器件差异；替代建议由研发复核。','替代提议 → 研发待复核',['不自动下单','建议≠批准']),
  beat('形成采购与报价依据','将行情观察、供应报价及适用条件分别归档，支撑提案。','供货与报价条件归档',['行情 / 报价分开','客户结果回存'])]},
 process:{steps:[
  beat('展开曲线中庭场景','参考相似中庭的布局与现场问题，先核对本次几何、安装高度及任务范围。','四层曲线中庭沙盘',['场景方案','光分布示意']),
  beat('放置灯具','把灯具位置与方向对应到曲线中庭场景。','6 组环灯布置',['位置是输入']),
  beat('光分布逐点叠加','各灯的示意光分布叠加，观察覆盖不均的位置。','发现回廊暗区',['仅相对分布','无照度数值']),
  beat('调整布灯覆盖','沿中庭曲线调整灯位，观察同一分布模型下暗区变化。','布灯变化 → 覆盖变化',['暗区需复核','不表示达标']),
  beat('形成客户方案资料','汇总布灯、灯具清单及条件；真实计算进入完整照明设计台。','支持客户方案与技术答疑',['提案就绪示意','非正式计算报告'])]},
 database:{steps:[
  beat('各部门判断与结果回流','情报单向入库；业务部门保存选择、依据、验证和实际结果，成交与失单都保留。','共同积累案例',['失败也归档']),
  beat('关联对象与版本','记录问题、条件、候选与选择、判断依据、验证过程、实际结果和适用范围；版本不覆盖。','v1 → v2，旧版仍保留',['对象 / 版本 / 条件']),
  beat('保留冲突与失败','成功、失败、缺失和冲突分开保存，避免误用。','带状态的历史经验',['入库≠批准']),
  beat('检索并核对适用性','相似案例先比较工况、规格、国家与期间；不适用排除，缺失待补，再提出带依据的建议。','历史参考 → 当前适用核对',['双向调用','相似≠适用']),
  beat('整理学习样本','人工验证与纠正继续回存，形成新人可学习的案例；训练样本另行整理、评估。','经验积累 → 下次复用；训练另行建设',['未执行训练','人工纠正回流'])]}
};
export const clamp=v=>Math.max(0,Math.min(1,v));
export const smooth=v=>{v=clamp(v);return v*v*(3-2*v);};
export function newDemo(module='research'){return {module,time:0,playing:false,started:false,ended:false,single:null};}
export function startDemo(state,module=state.module,single=null,reduced=false){return {module:DEMO[module]?module:'research',time:single===null?0:single*4,playing:!reduced,started:true,ended:reduced,single};}
export function advanceDemo(state,dt){if(!state.playing)return state;const end=state.single===null?DEMO[state.module].steps.length*4:(state.single+1)*4;const time=Math.min(end,state.time+Math.max(0,Math.min(dt,.1)));return {...state,time,ended:time>=end,playing:time<end};}
export function snapshotDemo(s){const count=DEMO[s.module].steps.length,step=s.single??Math.min(count-1,Math.floor(s.time/4));const phase=s.started?(s.ended?1:clamp((s.time-step*4)/4)):0;const beat=DEMO[s.module].steps[step];return {...s,step,phase,count,progress:s.started?(step+phase)/count:0,beat,status:s.ended?'已停留':s.playing?'演示中':s.started?'已暂停':'待播放'};}
export const CANDIDATES=[{id:'A',rating:70,stress:60,required:20,evidence:true},{id:'B',rating:90,stress:60,required:20,evidence:true},{id:'C',rating:null,stress:60,required:20,evidence:false}];
export function candidateStatus(c){return !Number.isFinite(c.rating)||!c.evidence?'pending':c.rating-c.stress<c.required?'failed':'review';}
export const QUOTES=[{id:'A',tax:null,freight:null,lead:20,moq:1000},{id:'B',tax:true,freight:1,lead:20,moq:1000},{id:'C',tax:true,freight:1,lead:40,moq:1000}];
export function quoteStatus(q){return q.tax===null||q.freight===null?'pending':q.lead>30||q.moq>1000?'excluded':'comparable';}
export function teachingRecordPositions(step,p){return Array.from({length:8},(_,i)=>{let x=(i%4)*.42-.63,y=Math.floor(i/4)*.38-.19,status='source',visible=true;if(step>=2){if(i===1){x=-.63;y=-.19;status='duplicate';visible=p<.92;}else status='record';}if(step>=3){status=i===6?'missing':i===7?'conflict':i===1?'duplicate':'verified';if(i>=6)x=1.15;if(i===7)y=.36;visible=i!==1;}return {id:i,x,y,status,visible};});}
// Dimensionless teaching field only. No lux, compliance thresholds or measured photometry.
export function atriumFixturePositions(adjustment=0){const a=smooth(adjustment),initial=[-.35,0,.35,2.6,2.95,3.3],final=[0,Math.PI/3,Math.PI*2/3,Math.PI,Math.PI*4/3,Math.PI*5/3];return initial.map((t,i)=>{const angle=t+(final[i]-t)*a;return {x:.65*Math.cos(angle),y:.42*Math.sin(angle)};});}
export function atriumField(x,y,adjustment=0){return atriumFixturePositions(adjustment).reduce((v,p)=>v+Math.exp(-((x-p.x)**2/.17+(y-p.y)**2/.12)),0);}
export function demoLampOpening(frame){if(!frame.started||frame.module!=='research')return null;if(frame.step<2)return 0;if(frame.step<4)return 1;if(frame.step===4)return 1-smooth(frame.phase/.6);return 0;}
export function resultTags(frame){if(frame.module==='research'&&frame.step===1)return CANDIDATES.map((c,i)=>frame.phase<.2+i*.22?{text:`核对 ${c.id}`,status:'info'}:{text:`${c.id} ${{failed:'裕量不足',review:'待验证',pending:'依据缺失'}[candidateStatus(c)]}`,status:candidateStatus(c)});if(frame.module==='procurement'&&frame.step===2)return QUOTES.map((q,i)=>frame.phase<.2+i*.22?{text:`对齐 ${q.id}`,status:'info'}:{text:`${q.id} ${{pending:'税运待补',excluded:'交期排除',comparable:'同条件可比'}[quoteStatus(q)]}`,status:quoteStatus(q)});return frame.beat.tags.map(text=>({text,status:/缺失|冲突|待|未|不表示|≠/.test(text)?'pending':'info'}));}

export const PERIODS=['P1','P2','P3','P4','P5','P6'];
export const SALES_SERIES=[{name:'产品 A',values:[42,45,46,53,59,67]},{name:'产品 B',values:[53,51,null,49,48,44]}];
export function movingAverage(values,n=3){return values.map((_,i)=>i<n-1||values.slice(i-n+1,i+1).some(x=>x===null)?null:values.slice(i-n+1,i+1).reduce((a,b)=>a+b,0)/n);}
export const FEEDBACK=[['维护',12],['外观',5],['交付',8]];
export const COMMODITIES=[{name:'铝',color:'#617d99',values:[100,104,102,109,111,108],weight:.55},{name:'铜',color:'#b78a5d',values:[100,98,103,105,109,113],weight:.25},{name:'钢',color:'#829185',values:[100,101,99,103,102,104],weight:.20}];
export function materialBasket(period){return COMMODITIES.reduce((s,c)=>s+c.values[period]*c.weight,0);}
