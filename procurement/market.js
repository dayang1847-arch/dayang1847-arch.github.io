'use strict';
(() => {
  const local = ['127.0.0.1','localhost'].includes(location.hostname) && location.port === '8923';
  const order = ['copper','aluminum','pc','pmma','abs','ps','pp','lldpe','pvc','copper-futures','aluminum-futures'];
  let data = null, error = '', busy = false, selected = 'copper', filter = 'spot', token = '';
  const dateNow = () => new Intl.DateTimeFormat('sv-SE',{timeZone:'Asia/Shanghai'}).format(new Date());
  const stale = r => (Date.parse(dateNow())-Date.parse(r.date))/86400000 > 4;
  const records = () => [...(data?.records||[])].sort((a,b)=>order.indexOf(a.id)-order.indexOf(b.id));
  const rows = () => records().filter(r=>filter==='all'||(filter==='spot'?r.kind==='spot_reference':r.kind==='futures_close'));
  const change = r => r.change_pct==null?'未提供':(r.change_pct>0?'+':'')+money(r.change_pct,2)+'%';
  const time = v => v?new Date(v).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'尚未采集';
  const button = (label,id,primary=false) => `<button class="btn ${primary?'primary':''}" data-market="${id}" ${busy?'disabled':''}>${label}</button>`;
  async function api(path, post=false) {
    if(!token) {const res=await fetch('/api/session',{cache:'no-store'});if(!res.ok)throw Error('无法建立本机会话');token=(await res.json()).token;}
    const res=await fetch('/api/'+path,{method:post?'POST':'GET',headers:{'Content-Type':'application/json','X-CSRF-Token':token},body:post?'{}':undefined,signal:AbortSignal.timeout(25000),cache:'no-store'});
    const body=await res.json();if(!res.ok)throw Error(body.error||'行情更新失败');return body;
  }
  function chart(r) {
    const h=r?.history||[];
    if(h.length<2)return '<div class="empty">该品种尚无可验证的历史数据。</div>';
    const values=h.map(p=>p.price),min=Math.min(...values),max=Math.max(...values),span=max-min||Math.max(max*.01,1);
    const points=h.map((p,i)=>`${30+i/(h.length-1)*940},${150-(p.price-min)/span*115}`).join(' ');
    return `<div class="market-chart"><div class="market-chart-head"><strong>${esc(r.material)} · ${r.kind==='spot_reference'?'两期参考价':'最近 '+h.length+' 个交易日收盘'}</strong><span>${esc(r.unit)} · 纵轴 ${money(min,2)} – ${money(max,2)}</span></div><svg viewBox="0 0 1000 180" role="img" aria-label="${esc(r.material)}从${esc(h[0].date)}的${h[0].price}到${esc(h[h.length-1].date)}的${h[h.length-1].price}，单位元每吨"><path d="M30 150H970 M30 90H970 M30 35H970" fill="none" stroke="#e6ebe1"/><polyline points="${points}" fill="none" stroke="#42725d" stroke-width="3" vector-effect="non-scaling-stroke"/><circle cx="970" cy="${150-(h[h.length-1].price-min)/span*115}" r="5" fill="#42725d"/></svg><div class="chartfoot"><span>${esc(h[0].date)} · ¥${money(h[0].price,2)}</span><span>${esc(h[h.length-1].date)} · ¥${money(h[h.length-1].price,2)}</span></div><p class="smalltext">${r.kind==='spot_reference'?'仅连接来源表的两期数据，不补齐中间日期，也不推算历史走势。':'连续合约可能含换月影响；日线接口不提供结算价或现货成交价保证。'} · <a href="${esc(r.source_url)}" target="_blank" rel="noopener">查看原始来源 ↗</a></p></div>`;
  }
  function content() {
    if(!data)return `<div class="cardbody"><p class="smalltext">${esc(error||'正在读取已采集的真实行情…')}</p>${button('重新读取','reload')}</div>`;
    const list=rows(),r=records().find(r=>r.id===selected)||list[0];
    const failures=Object.values(data.sources||{}).filter(s=>!s.ok);
    return `<div class="cardbody market-summary"><div><span class="status">公开行情 · 真实采集</span><p class="smalltext">最近采集尝试：${time(data.updated_at)}（北京时间）<br>${local?'本机更新会请求公开来源，并保存上次成功值。':'在线页展示发布时采集快照；来源日期见每一行，本机后台可重新采集。'}</p></div><div class="connection-actions">${button(local?'更新公开行情':'读取发布快照',local?'refresh':'reload',true)}${button('导出行情 CSV','csv')}<a class="btn" href="http://127.0.0.1:8923/?view=cost" target="_blank" rel="noopener">打开本机实时采集 →</a></div></div>${error?`<div class="notice market-message" role="status">${esc(error)}</div>`:''}${failures.length?`<div class="notice market-message">${failures.map(s=>esc(s.name)+'：'+esc(s.error||'上次采集失败')).join('<br>')}</div>`:''}<div class="filterbar"><div class="tabs">${[['spot','现货参考 · 9'],['futures','期货日线 · 2'],['all','全部品种']].map(([id,label])=>`<button class="tab ${filter===id?'active':''}" data-market-filter="${id}">${label}</button>`).join('')}</div><span class="smalltext">人民币 / 吨 · 缺失条件保持未知 · 超过 4 个日历日提示过期</span></div><div class="tablewrap"><table class="market-table"><thead><tr><th>监测品种 / 口径</th><th>来源日期</th><th>参考价格（元/吨）</th><th>较上一期</th><th>来源 / 状态</th><th>操作</th></tr></thead><tbody>${list.map(r=>`<tr class="${r.id===selected?'market-selected':''}"><td><strong>${esc(r.material)}</strong><small>${r.kind==='spot_reference'?'现货参考 · 非指定牌号报价':'连续合约 · 日线收盘'}</small></td><td>${esc(r.date)}<small>采集 ${time(r.fetched_at)}</small></td><td><strong>¥${money(r.price,2)}</strong></td><td class="${r.change_pct>0?'market-up':r.change_pct<0?'market-down':''}">${change(r)}<small>上期 ¥${r.previous_price==null?'未提供':money(r.previous_price,2)}</small></td><td><a href="${esc(r.source_url)}" target="_blank" rel="noopener">${esc(r.source_name)} ↗</a><small>${stale(r)?'⚠ 来源日期已过期':data.sources?.[r.source_id]?.ok===false?'⚠ 采集失败，保留旧值':'已采集 · 以来源日期为准'}</small></td><td><button class="rowaction" data-market-select="${esc(r.id)}">查看记录 →</button>${r.id==='copper'?`<br><button class="rowaction" data-market="apply-copper" ${stale(r)?'disabled':''}>带入铜价情景 →</button>`:''}</td></tr>`).join('')||'<tr><td colspan="6">暂无成功数据，不以零填充。</td></tr>'}</tbody></table></div>${chart(r)}<div class="notice neutral market-message">现货参考价与期货日线分开展示。品牌、牌号、地区、税费、运费及交付条件未在此表确认，均保持未知；不将通用 PC 参考价视为阻燃、抗 UV 改性 PC 的采购价。${local?'点击更新按需采集，无人值守定时更新尚未配置。':'此页面没有在后台持续更新；打开页面不会触发外部采集。'}</div>`;
  }
  function renderPanel() {return `<section class="card market-panel" aria-label="真实材料行情"><div class="cardhead"><div><h2>材料行情监测</h2><p>生意社公开参考价 + 新浪期货日线 · 数据与来源可追溯</p></div>${icon('trend')}</div><div id="market-content">${content()}</div></section>`;}
  function renderOverview() {if(!data)return esc(error||'正在读取公开行情…');return '<div class="market-overview-grid">'+records().filter(r=>['copper','aluminum','pc','pmma','abs','pp'].includes(r.id)).map(r=>`<div><span>${esc(r.material)} · ${esc(r.date)}</span><strong>¥${money(r.price,2)} <small>/ 吨</small></strong><small>${change(r)}${stale(r)?' · 已过期':''}</small></div>`).join('')+'</div>'; }
  function draw() {const summary=$('#market-overview');if(summary)summary.innerHTML=renderOverview();const root=$('#market-content');if(root){root.innerHTML=content();bindPage(root);}}
  async function load(refresh=false) {
    if(busy)return;busy=true;error='';draw();
    try {
      const next=local?await api(refresh?'market/refresh':'market',refresh):await (async()=>{const r=await fetch('./market-data.json',{cache:'no-store'});if(!r.ok)throw Error('发布快照读取失败');return r.json();})();
      if(next.schema_version!==1||!Array.isArray(next.records))throw Error('行情结构不兼容，未覆盖现有记录');
      data=next;if(next.rate_limited)error='更新间隔至少 60 秒，当前显示缓存。';
    }catch(e){error='更新未完成，保留已载入的数据。'+(e.name==='TimeoutError'?'来源请求超时。':e.message);}
    busy=false;draw();
  }
  function applyCopper() {
    const r=records().find(r=>r.id==='copper');if(!r||stale(r))return toast('没有可用的新近铜现货参考价。');
    modal('将公开铜价带入成本情景',`<div class="notice neutral">${esc(r.source_name)} · 来源日期 ${esc(r.date)}<br>¥${money(r.price,2)} / 吨<br>税费、运费与采购结算口径尚未确认。此操作只替换情景铜价，重量、用量与基准仍是演示参数。</div><label class="checklabel"><input type="checkbox" id="market-apply-consent"><span>我已核对来源日期，理解其为市场参考价，实际调价仍需确认合同取价口径。</span></label>`,btn('取消','close')+`<button class="btn primary" id="market-confirm-apply">确认带入情景</button>`);
    $('#market-confirm-apply').onclick=()=>{if(!$('#market-apply-consent').checked)return toast('请先确认取价口径。');try{state.cost=readCost();}catch(e){return toast(e.message);}state.cost.index=r.price;state.cost.reference={id:r.id,price:r.price,date:r.date,source:r.source_name,url:r.source_url,fetched_at:r.fetched_at};persist();closeModal();render();toast('已带入真实铜价，仍为演示用量成本情景。');};
  }
  function exportData() {
    exportCSV('材料行情-'+dateNow()+'.csv',['品种','价格类型','来源日期','参考价格','上期价格','涨跌百分比','币种','单位','牌号','含税','含运费','来源','来源网址','采集时间'],records().map(r=>[r.material,r.kind,r.date,r.price,r.previous_price??'',r.change_pct??'',r.currency,r.unit,'未知','未知','未知',r.source_name,r.source_url,r.fetched_at]),'已导出真实采集行情及来源，缺失条件保持未知。');
  }
  function bindPage(root=document) {
    root.querySelectorAll('[data-market]').forEach(el=>el.onclick=()=>{if(el.dataset.market==='apply-copper')applyCopper();else if(el.dataset.market==='csv')exportData();else load(el.dataset.market==='refresh');});
    root.querySelectorAll('[data-market-filter]').forEach(el=>el.onclick=()=>{filter=el.dataset.marketFilter;selected=rows()[0]?.id||'';draw();});
    root.querySelectorAll('[data-market-select]').forEach(el=>el.onclick=()=>{selected=el.dataset.marketSelect;draw();});
  }
  window.MP={renderPanel,renderOverview,bind:bindPage};
  if(new URLSearchParams(location.search).get('view')==='cost')go('cost');
  load();
})();
