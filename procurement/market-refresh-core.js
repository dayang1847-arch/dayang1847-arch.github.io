/* Browser reference overlays only; no credentials or source bodies are persisted. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MarketRefreshCore=api;})(typeof window!=='undefined'?window:this,()=>{
 'use strict';
 const definitions=[['copper','铜','sunsirs_metals',['铜']],['aluminum','铝','sunsirs_metals',['铝']],['pc','PC','sunsirs_plastics',['PC']],['pmma','PMMA','sunsirs_plastics',['PMMA']],['abs','ABS','sunsirs_plastics',['ABS']],['ps','PS','sunsirs_plastics',['PS']],['pp','PP(拉丝)','sunsirs_plastics',['PP(拉丝)','PP（拉丝）','聚丙烯拉丝']],['lldpe','LLDPE','sunsirs_plastics',['LLDPE']],['pvc','PVC','sunsirs_plastics',['PVC']],['copper-futures','铜（期货连续）','sina_copper',['沪铜连续','沪铜主连','CU0']],['aluminum-futures','铝（期货连续）','sina_aluminum',['沪铝连续','沪铝主连','AL0']]].map(([id,material,source_id,aliases])=>({id,material,source_id,aliases,kind:id.endsWith('futures')?'futures_close':'spot_reference'}));
 const sources={sunsirs_metals:{name:'生意社 · 有色日榜',host:'100ppi.com',url:'https://top.100ppi.com/zdb/detail-day---12.html'},sunsirs_plastics:{name:'生意社 · 橡塑日榜',host:'100ppi.com',url:'https://top.100ppi.com/zdb/detail-day---15.html'},sina_copper:{name:'新浪财经 · 沪铜连续日线',host:'finance.sina.com.cn',symbol:'CU0',url:'https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_data=/InnerFuturesNewService.getDailyKLine?symbol=CU0'},sina_aluminum:{name:'新浪财经 · 沪铝连续日线',host:'finance.sina.com.cn',symbol:'AL0',url:'https://stock2.finance.sina.com.cn/futures/api/jsonp.php/var%20_data=/InnerFuturesNewService.getDailyKLine?symbol=AL0'}};
 const fold=v=>String(v??'').normalize('NFKC').toLowerCase().replace(/\s+/g,'');
 const day=s=>{if(typeof s!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(s))return null;const n=Date.parse(s+'T00:00:00Z');return Number.isFinite(n)&&new Date(n).toISOString().slice(0,10)===s?n:null;};
 function url(value,host){let u;try{u=new URL(value);}catch{throw Error('来源网址无效');}if(u.protocol!=='https:'||u.username||u.password||u.port||u.hash||!(u.hostname===host||u.hostname.endsWith('.'+host)))throw Error('只接受原提供商的HTTPS公开来源');for(const k of u.searchParams.keys())if(/key|token|secret|password|auth|signature/i.test(k))throw Error('来源网址含凭据字段');return u.href;}
 function providerURL(value,provider){const href=url(value,provider.host),u=new URL(href);if(provider.host==='100ppi.com'&&(u.hostname!=='top.100ppi.com'||!/^\/zdb\/detail-day(?:-[0-9]*)+\.html$/.test(u.pathname)||u.search))throw Error('仅采用生意社大宗日榜，厂商报价不混入参考指数');return href;}
 const has=(text,alias)=>{const s=String(text).normalize('NFKC'),a=String(alias).normalize('NFKC');if(/^[a-z0-9]+$/i.test(a))return new RegExp('(^|[^a-z0-9])'+a+'($|[^a-z0-9])','i').test(s);return fold(s).includes(fold(a));};
 function numberIn(n,text){return (String(text).replace(/(\d),(?=\d{3}(?:\D|$))/g,'$1').match(/[+-]?\d+(?:\.\d+)?/g)||[]).some(x=>Number(x)===n);}
 function dateIn(date,text){return [...String(text).matchAll(/(20\d{2})\s*[-/年.]\s*(\d{1,2})\s*[-/月.]\s*(\d{1,2})(?:日)?/g)].some(m=>m[1]+'-'+m[2].padStart(2,'0')+'-'+m[3].padStart(2,'0')===date);}
 function validateQuote(raw,target,source,today,baseline){
  const provider=sources[target.source_id];if(!raw||raw.id!==target.id||raw.kind!==target.kind)throw Error('品种或价格类型不符');providerURL(source.url,provider);const ev=typeof raw.evidence==='string'?raw.evidence.trim():'';
  if(ev.length<8||ev.length>6000||!fold(source.content).includes(fold(ev)))throw Error('找不到完整原文引文');
  if(typeof raw.price!=='number'||!Number.isFinite(raw.price)||raw.price<=0||raw.price>1e9||!numberIn(raw.price,ev))throw Error('价格无对应原文数值');
  const row=target.kind==='spot_reference'?ev.split(/\r?\n/).find(line=>target.aliases.some(a=>has(line,a))&&numberIn(raw.price,line)):ev;
  if(!row)throw Error('材料名称与价格不在同一原文行，需人工核对');
  const unit=fold(raw.unit);if(raw.currency!=='CNY'||!['元/吨','元/吨(人民币)','人民币元/吨','cny/吨','rmb/吨'].includes(unit)||!/(?:人民币\s*)?元\s*[\/／]\s*吨|(?:CNY|RMB)\s*[\/／]\s*吨/i.test(row)||/(?:万|千|百)\s*元|美元|美金|USD|日元|JPY|港元|HKD|元\s*[\/／]\s*(?:公斤|千克|kg)/i.test(row))throw Error('币种或吨价单位未明确对应，未换汇或换算');
  if(day(raw.source_date)===null||day(today)===null||day(raw.source_date)>day(today)||!dateIn(raw.source_date,ev))throw Error('价格日期无依据或超出当前日期');
  if((day(today)-day(raw.source_date))/86400000>4)throw Error('来源超过4个日历日，未作为刷新结果');if(baseline&&raw.source_date<baseline.date)throw Error('来源比现有记录更旧');
  const symbol=new URL(source.url).searchParams.get('symbol');const aliasOK=target.aliases.some(a=>has(ev,a))||target.kind==='futures_close'&&symbol===provider.symbol;
  if(!aliasOK)throw Error('品种名称或连续合约无法对应');
  if(target.kind==='spot_reference'&&/期货|结算价|收盘|futures|\bclose\b/i.test(ev))throw Error('现货参考与期货口径混杂');
  if(target.kind==='futures_close'&&(!/收盘|\bclose\b/i.test(ev)||!(target.aliases.some(a=>has(ev,a))||symbol===provider.symbol)))throw Error('连续合约收盘字段不明确');
  if(target.kind==='spot_reference'&&!ev.split(/\r?\n/).some(line=>target.aliases.some(a=>has(line,a))&&numberIn(raw.price,line)))throw Error('材料名称与价格不在同一原文行，需人工核对');
  if(baseline&&raw.source_date===baseline.date&&raw.price!==baseline.price)throw Error('同日价格冲突，保留原值待核对');
  if(baseline&&Math.abs(raw.price/baseline.price-1)>.5)throw Error('相对现有记录变动超过50%，保留原值待核对');
  return{id:target.id,material:target.material,kind:target.kind,price:raw.price,date:raw.source_date,currency:'CNY',unit:'元/吨',source_id:target.source_id,source_name:provider.name,source_url:source.url,evidence:ev,source_sha256:source.sha256,source_truncated:Boolean(source.truncated),fetched_at:source.fetched_at,origin:'browser_deepseek',verification:'ai_extracted_unverified',grade:null,tax_included:null,freight_included:null,region:null,previous_price:null,change_pct:null};
 }
 function validateCache(cache,base,today){if(!cache||cache.schema_version!=='browser-market-ai-1'||!Array.isArray(cache.records)||cache.records.length>11||JSON.stringify(cache).length>150000||typeof cache.last_attempt_at!=='string'||!Number.isFinite(Date.parse(cache.last_attempt_at))||!cache.attempts||typeof cache.attempts!=='object'||Array.isArray(cache.attempts))throw Error('个人行情缓存格式无效');const ids=new Set();for(const r of cache.records){const t=definitions.find(x=>x.id===r.id),b=base.records.find(x=>x.id===r.id);if(!t||!b||ids.has(r.id)||r.origin!=='browser_deepseek'||r.verification!=='ai_extracted_unverified'||typeof r.evidence!=='string'||r.evidence.length>6000||day(r.date)===null||r.date>today||r.currency!=='CNY'||r.unit!=='元/吨'||!Number.isFinite(r.price)||r.price<=0||r.price>1e9||!Number.isFinite(Date.parse(r.fetched_at))||!/^[a-f0-9]{64}$/.test(r.source_sha256)||r.kind!==t.kind||r.source_id!==t.source_id||[r.grade,r.tax_included,r.freight_included,r.region].some(v=>v!==null))throw Error('个人行情记录未通过校验');providerURL(r.source_url,sources[t.source_id]);ids.add(r.id);}for(const [id,a]of Object.entries(cache.attempts)){if(!definitions.some(t=>t.id===id)||!a||!['updated','unchanged','failed'].includes(a.status)||typeof a.message!=='string'||a.message.length>1000||!Number.isFinite(Date.parse(a.at)))throw Error('行情尝试记录无效');}return cache;}
 function overlay(base,cache){const out=structuredClone(base);if(!cache)return out;for(const r of cache.records){const i=out.records.findIndex(b=>b.id===r.id);if(i<0||r.date<=out.records[i].date)continue;const b=out.records[i];out.records[i]={...b,...r,history:[...(b.history||[]).filter(h=>h.date<r.date),{date:r.date,price:r.price}].slice(-31)};}return out;}
 async function refresh(base,ids,api,model,{signal,today,now=new Date().toISOString(),digest,onProgress=()=>{}}){
  if(!Array.isArray(ids)||!ids.length||ids.length>11||new Set(ids).size!==ids.length||ids.some(id=>!definitions.some(d=>d.id===id))||day(today)===null)throw Error('刷新范围无效');
  const wanted=definitions.filter(t=>ids.includes(t.id)),updates=[],attempts={},usage={total_tokens:0},check=()=>{if(signal?.aborted)throw new DOMException('Aborted','AbortError');};
  for(const source_id of [...new Set(wanted.map(t=>t.source_id))]){
   check();const conf=sources[source_id],ts=wanted.filter(t=>t.source_id===source_id);let sourceURL=conf.url;
   for(let round=0;round<2;round++){
    check();let valid=0;
    try{
     onProgress('读取 '+conf.name+(round?' · 同源替代页':''));const page=await api.read(sourceURL,signal);check();if(typeof page?.content!=='string'||!page.content.trim())throw Error('来源没有可用正文');
     const content=page.content.slice(0,60000),src={id:'market-'+source_id,url:sourceURL,content,sha256:await digest(content),fetched_at:now,truncated:page.content.length>60000};onProgress('DeepSeek 提炼 · '+conf.name);
     const parsed=await api.extractMarket(src,model,ts.map(({id,material,kind})=>({id,material,kind})),today,signal);check();usage.total_tokens+=Number.isFinite(parsed.usage?.total_tokens)?parsed.usage.total_tokens:0;
     const raw=parsed.records;if(!Array.isArray(raw)||raw.length>20)throw Error('模型行情结构无效');
     for(const t of ts){try{const rs=raw.filter(r=>r.id===t.id);if(rs.length!==1)throw Error(rs.length?'重复行情存在歧义':'来源未明确列出该品种');const b=base.records.find(r=>r.id===t.id);if(!b)throw Error('基础行情缺少此品种');const v=validateQuote(rs[0],t,src,today,b);valid++;if(v.date===b.date){attempts[t.id]={status:'unchanged',message:'已定位引文，来源未发布更新日期；不改旧值',at:now};}else{updates.push(v);attempts[t.id]={status:'updated',message:'原文引文与基本字段定位通过；AI提炼仍待人工核对',at:now};}}catch(ex){attempts[t.id]={status:'failed',message:String(ex.message).slice(0,1000),at:now};}}
    }catch(ex){check();if([401,402,429].includes(ex.status))throw ex;for(const t of ts)attempts[t.id]={status:'failed',message:String(ex.message||'来源处理失败').slice(0,1000),at:now};if(ex.status>=500)break;}
    if(valid||round===1)break;
    try{onProgress('查找同源公开页面 · '+conf.name);const candidates=await api.search(ts.map(t=>t.material).join(' ')+' '+today+' '+(ts[0].kind==='futures_close'?'连续合约 收盘 元/吨':'商品参考价 元/吨'),conf.host,3,signal);check();const candidate=candidates.find(r=>{try{return providerURL(r.url,conf)!==sourceURL;}catch{return false;}});if(!candidate)break;sourceURL=providerURL(candidate.url,conf);}catch(ex){check();if([401,402,429].includes(ex.status))throw ex;break;}
   }
  }
  check();return{updates,attempts,usage,model,at:now};
 }
 function mergeResult(previous,result){const next=previous?structuredClone(previous):{schema_version:'browser-market-ai-1',records:[],attempts:{},last_attempt_at:result.at,last_success_at:null};next.last_attempt_at=result.at;Object.assign(next.attempts,result.attempts);for(const r of result.updates){const i=next.records.findIndex(x=>x.id===r.id);if(i<0)next.records.push(r);else next.records[i]=r;}if(result.updates.length||Object.values(result.attempts).some(a=>a.status==='unchanged'))next.last_success_at=result.at;return next;}
 return{definitions,sources,day,validateQuote,validateCache,overlay,refresh,mergeResult};
});
