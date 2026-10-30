/* Comparable source series and conditional stocking signals. No credentials. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.BulkMonitorCore=api;})(typeof window!=='undefined'?window:this,()=>{
'use strict';
const DAY=86400000,fold=s=>String(s??'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
const day=s=>typeof s==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s+'T00:00:00Z').toISOString().slice(0,10)===s;
function publicURL(value){const u=new URL(value);if(u.protocol!=='https:'||u.username||u.password||u.port||!u.hostname.includes('.')||/^[\d.]+$/.test(u.hostname)||u.hostname.includes(':')||/localhost|\.local$|\.internal$/.test(u.hostname))throw Error('只接受公开HTTPS网址');for(const k of u.searchParams.keys())if(/key|token|secret|password|auth|signature/i.test(k))throw Error('网址含凭据');u.hash='';return u.href;}
const sameHost=(u,v)=>{const h=new URL(v).hostname,a=new URL(u).hostname;return a===h||a.endsWith('.'+h.replace(/^www\./,''));};
const dateIn=(d,t)=>[...String(t).matchAll(/(20\d{2})[-/年.](\d{1,2})[-/月.](\d{1,2})日?/g)].some(m=>m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0')===d);
const numIn=(n,t)=>(String(t).replace(/(\d),(?=\d{3}(?:\D|$))/g,'$1').match(/\d+(?:\.\d+)?/g)||[]).some(x=>Number(x)===n);
function identity(r){return JSON.stringify([r.item_id,r.match_type,r.source_id,r.grade,r.unit,r.currency,r.tax_basis,r.freight_basis,r.region]);}
function validateRecord(raw,item,source,today){
 if(!day(today)||!raw||!day(raw.date)||raw.date>today||typeof raw.price!=='number'||!Number.isFinite(raw.price)||raw.price<=0)throw Error('价格或来源日期无效');
 if(raw.currency!=='CNY'||!['元/吨','元/平方米','元/克','元/千克'].includes(raw.unit))throw Error('币种或单位未确认');
 const evidence=typeof raw.evidence==='string'?raw.evidence.trim():'';if(evidence.length<10||evidence.length>6000||!source.content.includes(evidence)||!numIn(raw.price,evidence)||!dateIn(raw.date,evidence)||!fold(evidence).includes(fold(raw.unit)))throw Error('价格、日期或单位无法在连续原文定位');
 const url=publicURL(source.url);if(!sameHost(url,item.url))throw Error('不是所选提供商的来源');
 const exact=raw.match_type==='exact',label=exact?(item.aliases||[item.grade||item.material]):item.proxy_aliases||[];
 if(!label.length||!label.some(a=>fold(evidence).includes(fold(a))))throw Error('牌号未匹配，不能用通用品种替代');
 if(!exact&&!item.proxy_aliases?.length)throw Error('未配置代理指标');
 if(raw.tax_basis!=='unknown'&&!((raw.tax_basis==='included'&&/含税/.test(evidence))||(raw.tax_basis==='excluded'&&/不含税|未税/.test(evidence))))throw Error('税费依据缺失');
 return{item_id:item.id,match_type:exact?'exact':'proxy',grade:exact?(item.grade||item.material):item.proxy_aliases[0],source_id:item.source_id,source_url:url,unit:raw.unit,currency:'CNY',tax_basis:raw.tax_basis||'unknown',freight_basis:'unknown',region:null,origin:'deepseek_unverified',fetched_at:new Date().toISOString(),history:[{date:raw.date,price:raw.price}],evidence};
}
function mergeRecord(previous,next){if(!previous)return structuredClone(next);if(identity(previous)!==identity(next))throw Error('来源或计价口径变化，不能拼接历史');const map=new Map((previous.history||[]).map(p=>[p.date,p.price]));const last=[...map.keys()].sort().at(-1);for(const p of next.history||[]){if(last&&p.date<last&&!map.has(p.date))throw Error('来源日期倒退');if(map.has(p.date)&&map.get(p.date)!==p.price)throw Error('同日价格冲突，保留原值');const prev=map.get(last);if(last&&p.date>last&&prev&&Math.abs(p.price/prev-1)>.5)throw Error('价格变动超过50%，需要复核');map.set(p.date,p.price);}return{...next,history:[...map].sort((a,b)=>a[0].localeCompare(b[0])).slice(-400).map(([date,price])=>({date,price}))};}
function evaluate(record,today,config={}){
 const none=reason=>({kind:'insufficient',title:'资料待补齐',reason,actionable:false});
 if(!day(today)||!record)return none('尚无该牌号可比价格记录');if(record.last_refresh_ok===false)return none('本次采集失败，旧值仅供查看');
 const rows=record.history;if(!Array.isArray(rows)||!rows.length)return none('没有历史数据');const map=new Map();
 for(const p of rows){if(!day(p.date)||p.date>today||typeof p.price!=='number'||!Number.isFinite(p.price)||p.price<=0)return none('价格序列含无效值或未来日期');if(map.has(p.date)&&map.get(p.date)!==p.price)return none('同一日期出现冲突价格');map.set(p.date,p.price);}
 const points=[...map].sort((a,b)=>a[0].localeCompare(b[0])).map(([date,price])=>({date,price})),last=points.at(-1),age=(Date.parse(today)-Date.parse(last.date))/DAY;
 if(age>4)return{...none('来源已超过4个日历日未更新'),kind:'stale',date:last.date,price:last.price};
 const window=points.filter(p=>(Date.parse(last.date)-Date.parse(p.date))/DAY<=90),span=(Date.parse(last.date)-Date.parse(window[0].date))/DAY;
 if(window.length<20||span<28)return{...none('至少需要20个有效日期且跨越28天，才判断90天窗口内的相对位置'),date:last.date,price:last.price,count:window.length};
 const prices=window.map(p=>p.price),min=Math.min(...prices),max=Math.max(...prices),position=max>min?(last.price-min)/(max-min):null;
 const ma=n=>prices.slice(-n).reduce((a,b)=>a+b,0)/n,change5=last.price/prices.at(-6)-1;
 const low=position!==null&&position<=.2,rising=change5>=.02&&ma(5)>ma(20);
 let kind=low&&rising?'low_rising':low?'relative_low':rising?'rise_risk':'observe';
 const title={low_rising:'相对低位出现反弹',relative_low:'近期相对低位',rise_risk:'价格上涨风险',observe:'继续观察'}[kind];
 const proxy=record.match_type!=='exact',unverified=record.origin==='deepseek_unverified',actionable=!proxy&&!unverified&&kind!=='observe';
 return{kind,title:(proxy?'代理指标：':'')+title,date:last.date,price:last.price,count:window.length,from:window[0].date,to:last.date,min,max,position,change5,ma5:ma(5),ma20:ma(20),actionable,reason:position===null?'窗口内价格未变，不判断低位':`当前处于已记录区间的${(position*100).toFixed(1)}%；最近5个观测间隔${(change5*100).toFixed(2)}%`,caveat:proxy?'通用指标，不能据此认定所选牌号低点':unverified?'AI价格尚待人工核对，暂不触发备料提醒':'相对低位和上涨信号均不保证后续走势',supply:stocking(config)};
}
function stocking(c={}){const keys=['monthly','stock','onOrder','allocated','lead','safety'];if(!String(c.unit||'').trim()||keys.some(k=>c[k]===null||c[k]===undefined||c[k]===''||!Number.isFinite(Number(c[k]))||Number(c[k])<0)||Number(c.monthly)<=0)return null;const use=Number(c.monthly)/30,net=Number(c.stock)+Number(c.onOrder)-Number(c.allocated),target=use*(Number(c.lead)+Number(c.safety));return{coverageDays:Math.max(0,net)/use,replenish:Math.max(0,target-net),targetDays:Number(c.lead)+Number(c.safety),unit:c.unit};}
function fingerprint(item,signal){return[item,signal.kind,signal.date,signal.price].join(':');}
async function refresh(items,previous,api,model,{today,signal,onProgress=()=>{}}){
 const records=structuredClone(previous||[]),attempts=[],check=()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};
 if(items.length<1||items.length>3)throw Error('一次勾选1至3项');
 for(const item of items){check();try{onProgress('查找并读取 '+item.material+' '+(item.grade||''));let targets=[];
  if(item.access==='public')targets=[{url:item.url}];else{const found=await api.search((item.material+' '+(item.grade||'')+' 价格 '+today).slice(0,70),new URL(item.url).hostname.replace(/^www\./,''),3,signal);check();targets=found.slice(0,1);}
  if(!targets.length)throw Error('没有可读取的公开报价页，需要授权导出或具体来源');let accepted=null;
  for(const t of targets){const source=await api.read(publicURL(t.url),signal);check();source.content=source.content.slice(0,60000);source.id='B1';const result=await api.extractBulk(source,model,item,today,signal);check();accepted=validateRecord(result.record,item,source,today);}
  if(!accepted)throw Error('没有具备完整引文的牌号价格');const i=records.findIndex(r=>r.item_id===item.id);const next=mergeRecord(i<0?null:records[i],accepted);if(i<0)records.push(next);else records[i]=next;attempts.push({id:item.id,ok:true,message:'已提取待人工核对，未触发自动备料'});
 }catch(e){check();if([401,402,429].includes(e.status))throw e;attempts.push({id:item.id,ok:false,message:e.message});}}
 return{records,attempts};
}
return{day,publicURL,identity,validateRecord,mergeRecord,evaluate,stocking,fingerprint,refresh};
});
