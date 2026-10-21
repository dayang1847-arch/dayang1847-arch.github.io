'use strict';

// Public benchmarks are observations, never supplier quotations or BOM edits.
window.LumiMaterials = (() => {
  const data = {snapshot:{materials:[],providers:[],last_refresh:null,refresh_after_seconds:60,notice:''},workspace:'quotes',tab:'all',active:false,auto:false,timer:null,pending:null,requestType:null,error:'',errorType:null,epoch:0,historyPending:false,calc:{material:'',grams:'',loss:'0',quantity:''},initialized:false};
  const chart={id:'aluminum',window:120,type:'candle',ma:true,cache:{},errors:{},pending:{},hover:null,viewport:null};
  const financial={instance:null,host:null,series:null,observer:null,resize:null,crosshair:null,key:null,rows:[]};
  const chartColors={up:'#d34350',down:'#148866',flat:'#7b8ca4',line:'#2563eb',ma5:'#c38b25',ma20:'#8b66be'};
  const marketLabels = {futures_continuous:'连续期货',spot_benchmark:'现货基准',reference_only:'仅来源参考'};
  const query = selector => document.querySelector(selector);
  const finite = value => typeof value === 'number' && Number.isFinite(value);
  const material = id => data.snapshot.materials.find(row => row.id === id);
  const unitLabel = unit => ({ton:'吨',kg:'kg',barrel:'桶'}[unit]||'单位待核实');
  const massPrice = row => row?.unit==='kg'?row.price:row?.unit==='ton'?row.price/1000:null;
  const hasPrice = row => finite(row?.price)&&row.price>0&&row.currency==='CNY'&&['ton','kg','barrel'].includes(row.unit)&&row.market_type!=='reference_only';
  const chartUnit = () => chart.cache[chart.id]?.unit||material(chart.id)?.native_unit||material(chart.id)?.unit||'ton';
  const message = error => error && typeof error === 'object' ? String(error.message || '来源获取失败') : error ? String(error) : '';
  const action = (name,label,extra='',cls='button') => `<button type="button" class="${cls}" data-material-action="${name}" ${extra}>${label}</button>`;
  const sourceLink = (url,label='来源网页') => {const safe=safeUrl(url);return safe?`<a href="${esc(safe)}" target="_blank" rel="noopener noreferrer">${esc(label)} ${icon('ArrowUpRight')}</a>`:'';};
  const references = row => (Array.isArray(row?.reference_links)?row.reference_links:[]).slice(0,20).filter(link=>link&&safeUrl(link.url));
  const referenceLinks = row => {const links=references(row);return links.length?`<div class="materials-related-links">${links.map(link=>sourceLink(link.url,link.label||'补充来源')).join('')}</div>`:'';};
  function time(value){
    if(!value)return '时间未提供';
    if(/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return String(value)+'（仅日期）';
    const parsed=new Date(value);
    if(!Number.isFinite(parsed.getTime()))return '时间待核实';
    return new Intl.DateTimeFormat('zh-CN',{year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hour12:false,timeZone:'Asia/Shanghai'}).format(parsed);
  }
  function priceIssue(row){
    if(!row || !finite(row.price) || row.price<=0)return '尚无可用报价';
    if(row.market_type==='reference_only')return '此来源尚未取得可用行情';
    if(row.currency!=='CNY' || !['ton','kg'].includes(row.unit))return row.unit==='barrel'?'桶价不换算重量成本':'币种或单位尚未核实';
    const rate=massPrice(row);
    if(row.price_per_kg!=null && (!finite(row.price_per_kg) || Math.abs(row.price_per_kg-rate)>Math.max(0.001,Math.abs(rate)*0.000001)))return '吨价与千克换算不一致，暂停测算';
    return '';
  }
  const priceText = row => !row || !finite(row.price) || row.price<=0 ? '未取得价格' : row.currency==='CNY' && ['ton','kg','barrel'].includes(row.unit) ? num(row.price,2)+' 元/'+unitLabel(row.unit) : num(row.price,2)+'（币种 / 单位待核实）';
  const freshness = row => tag(row.freshness_label||({recent:'近期源时点',outdated:'源时点较早',unknown:'更新时间待核实',missing:'无价格'}[row.freshness]||'状态待核实'),row.freshness==='recent'?'blue':row.freshness==='outdated'?'amber':'');
  function rows(){
    return data.snapshot.materials.filter(row=>data.tab==='all'||data.tab==='metal'&&row.group==='metal'||data.tab==='plastic'&&row.group==='plastic'||data.tab==='other'&&['energy','chemical','packaging'].includes(row.group)||data.tab==='engineering'&&row.group==='plastic'&&(row.market_type==='reference_only'||/^(pc|abs|pmma|pbt)$/i.test(row.id)));
  }
  function adopt(snapshot){
    data.snapshot={...data.snapshot,...snapshot,materials:Array.isArray(snapshot.materials)?snapshot.materials:[],providers:Array.isArray(snapshot.providers)?snapshot.providers:[]};
    if(!material(data.calc.material))data.calc.material=data.snapshot.materials.find(row=>!priceIssue(row))?.id||data.snapshot.materials[0]?.id||'';
    if(!material(chart.id))chart.id=data.snapshot.materials[0]?.id||'aluminum';
    if(!data.initialized){data.calc.quantity=current()?.spec?.quantity ? String(current().spec.quantity) : '';data.initialized=true;}
  }
  async function request(refresh=false){
    if(data.pending)return data.pending;
    const epoch=data.epoch;
    clearTimeout(data.timer);data.timer=null;data.requestType=refresh?'POST':'GET';
    data.pending=(async()=>{
      try{
        const result=await api(refresh?'/api/materials/refresh':'/api/materials',refresh?'POST':'GET',refresh?{}:undefined);
        adopt(result);data.error='';data.errorType=null;
        return result;
      }catch(error){data.error=message(error);data.errorType=refresh?'POST':'GET';throw error;}
      finally{data.pending=null;data.requestType=null;if(data.active && epoch===data.epoch)paint(true);if(data.active)schedule();}
    })();
    if(data.active)paint(true);
    return data.pending;
  }
  async function load(){const requested=new URLSearchParams(location.hash.split('?')[1]||'').get('view');if(['quotes','plastics','logistics'].includes(requested))data.workspace=requested;const [result]=await Promise.all([request(false),window.LumiPlastic?.load(),window.LumiLogistics?.load()]);await requestCandles(false).catch(()=>{});return result;}
  function entry(){return `<section class="materials-entry"><span class="materials-entry-icon">${icon('Layers')}</span><div><strong>金属与塑料材料行情</strong><p>查看公开基准、来源时点和单灯重量成本敏感性</p></div><button class="button button-small" data-action="navigate" data-page="materials">材料行情 ${icon('ArrowRight')}</button></section>`;}
  function metrics(){
    const list=data.snapshot.materials,priced=list.filter(hasPrice);
    return metric('材料观察项',num(list.length),'金属、通用塑料与工程塑料','Layers')+metric('可用参考价格',num(priced.length),'含旧时点；需查看每项来源','Database')+metric('来源待接通',num(list.length-priced.length),'无价或计价口径未确认','CircleHelp')+metric('较早源时点',num(priced.filter(row=>row.freshness==='outdated').length),'刷新时间不代替行情源时间','Clock');
  }
  function candleSeries(snapshot){
    if(material(chart.id)?.market_type==='reference_only'||snapshot?.status==='not_supported')return {rows:[],issue:'当前现货来源没有已接入的OHLC历史，不合成日K。'};
    const expected=material(chart.id)?.native_unit||material(chart.id)?.unit||'ton';
    if(!snapshot||snapshot.material_id!==chart.id||snapshot.currency!=='CNY'||!['ton','kg','barrel'].includes(snapshot.unit)||snapshot.unit!==expected||snapshot.period!=='day')return {rows:[],issue:snapshot?'日K材料、币种、单位或周期未核实，暂停绘图':''};
    const valid=new Map(),conflicts=new Set();let rejected=0;
    for(const row of (Array.isArray(snapshot.candles)?snapshot.candles:[]).slice(-5000)){
      const date=String(row?.date||''),stamp=/^\d{4}-\d{2}-\d{2}$/.test(date)?new Date(date+'T00:00:00Z'):null;
      if(!stamp||!Number.isFinite(stamp.getTime())||stamp.toISOString().slice(0,10)!==date||!['open','high','low','close'].every(field=>finite(row[field])&&row[field]>0&&row[field]<=100000000)||row.high<Math.max(row.open,row.close,row.low)||row.low>Math.min(row.open,row.close)){rejected++;continue;}
      const clean={date,open:row.open,high:row.high,low:row.low,close:row.close,volume:finite(row.volume)&&row.volume>=0&&row.volume<=1000000000000000?row.volume:null};
      if(valid.has(date)&&JSON.stringify(valid.get(date))!==JSON.stringify(clean)){valid.delete(date);conflicts.add(date);rejected++;}
      if(!conflicts.has(date))valid.set(date,clean);
    }
    const list=[...valid.values()].sort((a,b)=>a.date.localeCompare(b.date));
    const series=list.map((row,index)=>({...row,ma5:index>=4?list.slice(index-4,index+1).reduce((sum,item)=>sum+item.close,0)/5:null,ma20:index>=19?list.slice(index-19,index+1).reduce((sum,item)=>sum+item.close,0)/20:null}));
    return {rows:series.slice(-chart.window),issue:rejected?'已排除 '+rejected+' 条无效或冲突记录；未补造 OHLC。':''};
  }
  function candleReadout(row){return row?`<strong>${esc(row.date)}</strong><span>开 ${num(row.open,2)}</span><span>高 ${num(row.high,2)}</span><span>低 ${num(row.low,2)}</span><span>收 ${num(row.close,2)}</span>${finite(row.volume)?`<span>量 ${num(row.volume)}</span>`:''}${chart.ma&&finite(row.ma5)?`<span class="materials-ma-five-value">MA5 ${num(row.ma5,2)}</span>`:''}${chart.ma&&finite(row.ma20)?`<span class="materials-ma-twenty-value">MA20 ${num(row.ma20,2)}</span>`:''}<small>元/${unitLabel(chartUnit())} · 源日K</small>`:'<span>暂无真实日K记录</span>';}
  function candleColor(row){return row.close>row.open?chartColors.up:row.close<row.open?chartColors.down:chartColors.flat;}
  function financialHost(list){return `<div id="materials-financial-chart" class="materials-financial-chart" role="img" aria-label="${esc(material(chart.id)?.name||chart.id)}真实日K价格及成交量，支持缩放和十字线" data-material-chart="daily" data-record-count="${list.length}"></div><div class="materials-volume-caption">${list.some(row=>finite(row.volume))?'源成交量 · 单位未核实':'成交量未提供，未补造数值'} · 滚轮缩放 / 拖动查看</div>`;}
  function chartRange(){try{return financial.instance?.timeScale().getVisibleLogicalRange()||null;}catch{return null;}}
  function destroyFinancialChart(remember=true){
    if(remember&&financial.instance)chart.viewport={key:financial.key,range:chartRange()};
    financial.observer?.disconnect();financial.observer=null;
    if(financial.resize)window.removeEventListener?.('resize',financial.resize);financial.resize=null;
    if(financial.instance){if(financial.crosshair)financial.instance.unsubscribeCrosshairMove(financial.crosshair);financial.instance.remove();}
    financial.instance=null;financial.host=null;financial.series=null;financial.crosshair=null;financial.key=null;financial.rows=[];
  }
  function crosshairDate(value){if(typeof value==='string')return value;if(value&&Number.isInteger(value.year)&&Number.isInteger(value.month)&&Number.isInteger(value.day))return `${value.year}-${String(value.month).padStart(2,'0')}-${String(value.day).padStart(2,'0')}`;return null;}
  function crosshairReadout(instance,param){
    if(!data.active||data.workspace!=='quotes'||financial.instance!==instance)return;
    const day=crosshairDate(param?.time),row=param?.point&&day?financial.rows.find(item=>item.date===day):null;
    const readout=query('#materials-chart-readout'),tooltip=query('#materials-chart-tooltip');chart.hover=row?day:null;
    if(readout)readout.innerHTML=candleReadout(row||financial.rows.at(-1));
    if(tooltip){tooltip.hidden=!row;if(row){tooltip.innerHTML=candleReadout(row);const width=financial.host?.clientWidth||financial.host?.getBoundingClientRect().width||960;tooltip.style.left=param.point.x>width/2?'12px':'auto';tooltip.style.right=param.point.x>width/2?'auto':'12px';}}
  }
  function mountFinancialChart(){
    const host=query('#materials-financial-chart'),list=candleSeries(chart.cache[chart.id]).rows,LC=window.LightweightCharts,key=chart.id+':'+chart.window;
    if(!data.active||data.workspace!=='quotes'||!host||!list.length){destroyFinancialChart();return;}
    if(!LC?.createChart){destroyFinancialChart();host.innerHTML='<div class="materials-chart-empty"><strong>本地图表组件尚未加载</strong><p>真实日K与来源记录仍保留；请检查本地图表脚本加载顺序。</p></div>';return;}
    const sameHost=financial.instance&&financial.host===host,range=sameHost&&financial.key===key?chartRange():chart.viewport?.key===key?chart.viewport.range:null;
    try{
      if(!sameHost){
        destroyFinancialChart();
        const width=Math.max(280,Math.floor(host.clientWidth||host.getBoundingClientRect().width||960)),height=Math.max(280,Math.floor(host.clientHeight||420));
        const instance=LC.createChart(host,{width,height,layout:{background:{type:'solid',color:'#ffffff'},textColor:'#59687d',fontFamily:'-apple-system, BlinkMacSystemFont, Segoe UI, sans-serif',fontSize:12,attributionLogo:true},
          grid:{vertLines:{color:'#f1f4f8'},horzLines:{color:'#e9eef5'}},rightPriceScale:{borderColor:'#dce4ef'},
          timeScale:{borderColor:'#dce4ef',timeVisible:false,secondsVisible:false,rightOffset:2,minBarSpacing:2},
          crosshair:{mode:LC.CrosshairMode?.Normal??0,vertLine:{color:'#7284a0',labelBackgroundColor:'#4e6482'},horzLine:{color:'#7284a0',labelBackgroundColor:'#4e6482'}},
          handleScale:{mouseWheel:true,pinch:true,axisPressedMouseMove:{time:true,price:true},axisDoubleClickReset:{time:true,price:true}},
          handleScroll:{mouseWheel:true,pressedMouseMove:true,horzTouchDrag:true,vertTouchDrag:false},
          localization:{locale:'zh-CN',priceFormatter:value=>num(value,2)}});
        const priceFormat={type:'custom',minMove:0.01,formatter:value=>num(value,2)};
        financial.instance=instance;financial.host=host;
        financial.series={candle:instance.addSeries(LC.CandlestickSeries,{upColor:chartColors.up,downColor:chartColors.down,borderVisible:false,wickUpColor:chartColors.up,wickDownColor:chartColors.down,priceFormat}),
          line:instance.addSeries(LC.LineSeries,{color:chartColors.line,lineWidth:2,priceFormat}),
          ma5:instance.addSeries(LC.LineSeries,{color:chartColors.ma5,lineWidth:1,lastValueVisible:false,priceLineVisible:false,crosshairMarkerVisible:false,priceFormat}),
          ma20:instance.addSeries(LC.LineSeries,{color:chartColors.ma20,lineWidth:1,lastValueVisible:false,priceLineVisible:false,crosshairMarkerVisible:false,priceFormat}),volume:null};
        financial.crosshair=param=>crosshairReadout(instance,param);instance.subscribeCrosshairMove(financial.crosshair);
        financial.resize=()=>{if(financial.instance===instance&&financial.host===host){const width=Math.floor(host.clientWidth||host.getBoundingClientRect().width||960),height=Math.floor(host.clientHeight||420);if(width>0&&height>0)instance.resize(Math.max(280,width),Math.max(280,height));}};
        if(typeof window.ResizeObserver==='function'){financial.observer=new window.ResizeObserver(financial.resize);financial.observer.observe(host);}else window.addEventListener?.('resize',financial.resize);
      }
      const instance=financial.instance,series=financial.series;
      series.candle.setData(list.map(row=>({time:row.date,open:row.open,high:row.high,low:row.low,close:row.close,color:candleColor(row),borderColor:candleColor(row),wickColor:candleColor(row)})));
      series.line.setData(list.map(row=>({time:row.date,value:row.close})));
      series.ma5.setData(list.filter(row=>finite(row.ma5)).map(row=>({time:row.date,value:row.ma5})));
      series.ma20.setData(list.filter(row=>finite(row.ma20)).map(row=>({time:row.date,value:row.ma20})));
      series.candle.applyOptions({visible:chart.type==='candle'});series.line.applyOptions({visible:chart.type==='line'});
      series.ma5.applyOptions({visible:chart.ma});series.ma20.applyOptions({visible:chart.ma});
      const volumes=list.filter(row=>finite(row.volume)).map(row=>({time:row.date,value:row.volume,color:candleColor(row)}));
      if(volumes.length){if(!series.volume)series.volume=instance.addSeries(LC.HistogramSeries,{priceFormat:{type:'volume'},lastValueVisible:false,priceLineVisible:false},1);series.volume.setData(volumes);}
      else if(series.volume){instance.removeSeries(series.volume);series.volume=null;}
      const panes=instance.panes?.();if(panes?.length>1){panes[0].setHeight(300);panes[1].setHeight(110);}
      financial.rows=list;financial.key=key;chart.hover=null;
      if(range&&finite(range.from)&&finite(range.to)&&range.to>range.from)instance.timeScale().setVisibleLogicalRange(range);else instance.timeScale().fitContent();
      crosshairReadout(instance,{});
    }catch(error){destroyFinancialChart(false);host.innerHTML='<div class="materials-chart-empty"><strong>本地图表暂时无法绘制</strong><p>真实历史未改写，请查看来源与证据后重试。</p></div>';}
  }
  function zoomFinancialChart(factor){const range=chartRange();if(!range||!finite(range.from)||!finite(range.to)||range.to<=range.from)return;const current=range.to-range.from,center=(range.from+range.to)/2,span=Math.max(Math.min(5,current),current*factor);financial.instance.timeScale().setVisibleLogicalRange({from:center-span/2,to:center+span/2});}
  function chartContent(){
    const row=material(chart.id),snapshot=chart.cache[chart.id],parsed=candleSeries(snapshot),list=parsed.rows,error=chart.errors[chart.id]||message(snapshot?.error),pending=chart.pending[chart.id],unsupported=row?.market_type==='reference_only'||snapshot?.status==='not_supported';
    const empty=unsupported?'现货只有每日报价时呈价格趋势线；不能生成开高低收。当前来源尚未取得可用的连续现货报价记录。':parsed.issue||'尚无本机日K记录。点击“更新日K”从公开来源获取真实历史；未使用报价刷新时点补造K线。';
    const chosen=list.find(item=>item.date===chart.hover)||list.at(-1);
    return `<div class="materials-chart-toolbar"><label>材料<select id="materials-chart-material" aria-label="日K材料">${data.snapshot.materials.map(item=>`<option value="${esc(item.id)}" ${item.id===chart.id?'selected':''}>${esc(item.name)}</option>`).join('')}</select></label><div class="materials-chart-periods">${[60,120,250].map(days=>action('chart-window',days+' 根',`data-days="${days}" aria-pressed="${chart.window===days}"`,chart.window===days?'selected':'')).join('')}</div><div class="materials-chart-types">${[['candle','日K'],['line','收盘线']].map(([type,label])=>action('chart-type',label,`data-type="${type}" aria-pressed="${chart.type===type}"`,chart.type===type?'selected':'')).join('')}${action('chart-ma','MA5 / MA20',`aria-pressed="${chart.ma}"`,chart.ma?'selected':'')}</div><div class="materials-chart-zoom">${action('chart-zoom-in','＋','aria-label="放大图表" title="放大图表"')}${action('chart-zoom-out','−','aria-label="缩小图表" title="缩小图表"')}${action('chart-reset','重置视图','aria-label="重置图表视图"')}</div>${action('chart-refresh',icon('RefreshCw')+'更新日K',pending?'disabled':'','button button-small')}</div><div class="materials-chart-readout" id="materials-chart-readout">${candleReadout(chosen)}</div>${pending?`<div class="materials-chart-status" role="status">${pending.type==='POST'?'正在获取历史日K…':'正在载入本机日K记录…'}</div>`:''}${error?`<div class="materials-chart-warning" role="status">${esc(error)}${list.length?'；下方保留旧日K及其原始时点。':''}</div>`:''}${parsed.issue&&list.length?`<div class="materials-chart-warning">${esc(parsed.issue)}</div>`:''}<div class="materials-chart-frame">${list.length?financialHost(list):`<div class="materials-chart-empty">${icon('ChartCandlestick')}<strong>${unsupported?'现货历史数据待接通':'日K数据待载入'}</strong><p>${esc(empty)}</p></div>`}<div class="materials-chart-tooltip" id="materials-chart-tooltip" hidden></div></div><div class="materials-chart-footer"><span>${esc(snapshot?.source_name||row?.source_name||'公开日K来源')} · 源日期 ${esc(snapshot?.quote_date||list.at(-1)?.date||'未提供')} · 本机获取 ${esc(time(snapshot?.observed_at))}</span><span>最近 ${chart.window} 根日K · 当前 ${list.length} 条真实记录 · 红涨绿跌 / 平盘灰色${chart.ma?' · MA5 / MA20':''}</span>${sourceLink(snapshot?.source_url||row?.source_url)}${action('chart-evidence','日K来源与证据','','button-link')}<span class="materials-chart-attribution">图表 <a href="https://www.tradingview.com/" target="_blank" rel="noopener noreferrer">TradingView Lightweight Charts™</a> · Copyright © 2025 TradingView, Inc. · <a href="/LumiPilot/static/vendor/lightweight-charts.NOTICE.txt" target="_blank" rel="noopener noreferrer">NOTICE</a></span></div><p class="materials-chart-notice">${esc(snapshot?.notice||'日K为连续期货合约历史口径，不能代替具体牌号的现货采购报价。窗口按真实交易记录裁切，不补造交易空白，日K与当前行情分别获取。')}</p>`;
  }
  function chartPanel(){return `<section class="panel materials-chart-panel"><div class="panel-header"><div><h3>材料价格走势</h3><p>真实历史日K与成交量 · 单品获取 · 本机记录可追溯</p></div>${tag('历史数据 · 可追溯','blue')}</div><div id="materials-chart-content">${chartContent()}</div></section>`;}
  function chartEvidence(){const snapshot=chart.cache[chart.id],series=candleSeries(snapshot).rows;if(!snapshot){toast('尚无本机日K来源记录',true);return;}const text=[`材料：${material(chart.id)?.name||chart.id}；来源代码：${snapshot.symbol||'未提供'}`,`来源：${snapshot.source_name||'未提供'}`,`源日期：${snapshot.quote_date||'未提供'}；本机获取：${time(snapshot.observed_at)}`,`周期：${snapshot.period||'未核实'}；计价：${snapshot.currency||'未核实'} / ${snapshot.unit||'未核实'}`,`源成交量单位：${snapshot.volume_unit||'未核实，保留源数值'}`,`窗口：最近 ${chart.window} 根日K；有效显示 ${series.length} 根（不补造交易空白）`,`读取状态：${snapshot.status||'未提供'}；${chart.errors[chart.id]||message(snapshot.error)||'当前未记录失败'}`,`证据编号：${snapshot.evidence_id||'尚无'}`,snapshot.evidence?`当前有效日K请求证据：\n${JSON.stringify(snapshot.evidence,null,2)}`:'',snapshot.request_url?`公开请求地址：${safeUrl(snapshot.request_url)||'未通过地址安全检查'}`:'',snapshot.notice||'连续期货历史不能代替具体牌号现货采购报价。'].filter(Boolean).join('\n\n');showSource((material(chart.id)?.name||chart.id)+' · 日K来源与证据',text,'历史日K与当前行情分别获取，获取失败保留旧证据',safeUrl(snapshot.source_url));}
  function paintChart(){const target=query('#materials-chart-content');if(!data.active||data.workspace!=='quotes'||!target)return;const host=financial.host,list=candleSeries(chart.cache[chart.id]).rows,reuse=host&&financial.instance&&list.length;target.innerHTML=chartContent();const placeholder=query('#materials-financial-chart');if(reuse&&placeholder){host.setAttribute('aria-label',placeholder.getAttribute('aria-label')||'真实日K价格及成交量');host.setAttribute('data-record-count',String(list.length));placeholder.replaceWith(host);}else destroyFinancialChart();mountFinancialChart();}
  async function requestCandles(refresh=false,id=chart.id){
    if(chart.pending[id])return chart.pending[id].promise;
    const epoch=data.epoch,entry={type:refresh?'POST':'GET',promise:null};chart.pending[id]=entry;
    entry.promise=(async()=>{try{const result=await api(`/api/materials/${encodeURIComponent(id)}/candles${refresh?'/refresh':''}`,refresh?'POST':'GET',refresh?{}:undefined),old=chart.cache[id];
      if(result.status==='failed'&&old?.candles?.length&&!result.candles?.length)chart.cache[id]={...old,status:'failed',error:result.error||'日K获取失败'};else chart.cache[id]=result;
      chart.errors[id]='';return result;
    }catch(error){chart.errors[id]=message(error);throw error;}finally{delete chart.pending[id];if(data.active&&epoch===data.epoch&&chart.id===id)paintChart();}})();
    if(data.active&&chart.id===id)paintChart();return entry.promise;
  }
  function controls(){return `<div class="materials-controls"><div class="materials-tabs" role="group" aria-label="材料类型">${[['all','全部材料'],['metal','金属'],['plastic','塑料'],['engineering','工程塑料'],['other','能源与辅材']].map(([id,label])=>action('tab',label,`data-tab="${id}" aria-pressed="${data.tab===id}"`,data.tab===id?'selected':'')).join('')}</div><label class="materials-auto"><input type="checkbox" id="materials-auto" ${data.auto?'checked':''}>每 60 秒自动获取</label></div>`;}
  function table(){
    const list=rows();
    if(!list.length)return '<div class="materials-empty">当前分类暂无材料记录；未使用示例价格填补。</div>';
    return `<div class="table-scroll"><table class="materials-table"><colgroup><col style="width:20%"><col style="width:18%"><col style="width:20%"><col style="width:30%"><col style="width:12%"></colgroup><thead><tr><th>材料 / 工程用途</th><th>基准与规格范围</th><th class="number">价格与换算</th><th>来源与时间</th><th>记录</th></tr></thead><tbody>${list.map(row=>{
      const failure=message(row.error),issue=priceIssue(row);
      return `<tr><td><strong>${esc(row.name)}</strong><small>${esc(row.application||'用途待补充')}</small></td><td>${tag(marketLabels[row.market_type]||'口径待核实',row.market_type==='futures_continuous'?'blue':'')}<small>${esc(row.grade||'具体牌号待核实')}</small>${row.contract_label?`<small>源名称：${esc(row.contract_label)}</small>`:''}</td><td class="number"><strong class="materials-price ${!hasPrice(row)?'unavailable':''}">${esc(priceText(row))}</strong>${!issue?`<small>${num(massPrice(row),4)} 元/kg · ${row.unit==='kg'?'源计价单位':'算术换算'}</small>`:`<small>${esc(issue)}</small>`}${finite(row.change_pct)?`<small>${row.change_pct>0?'+':''}${num(row.change_pct,2)}% · 较昨结算</small>`:''}</td><td><span class="materials-source-name">${esc(row.source_name||'待接入来源')}</span><small>源时点：${esc(time(row.quote_at))}</small><small>本机获取：${esc(time(row.observed_at))}</small><div class="materials-row-state">${freshness(row)}${failure?tag(finite(row.price)?'更新失败 · 保留旧值':'获取失败','amber'):''}</div>${failure?`<small class="materials-error">${esc(failure)}</small>`:''}${sourceLink(row.source_url)}${referenceLinks(row)}</td><td>${action('chart-show','查看K线',`data-id="${esc(row.id)}"`,'button-link')}${action('history','记录与口径',`data-id="${esc(row.id)}"`,'button-link')}${!issue?action('choose','用于测算',`data-id="${esc(row.id)}"`,'button-link'):''}</td></tr>`;
    }).join('')}</tbody></table></div>`;
  }
  function providerCards(){return data.snapshot.providers.map(provider=>`<article class="materials-provider"><div>${icon('Globe')}<strong>${esc(provider.name)}</strong>${tag(provider.label||provider.status||'状态待核验',provider.status==='available'||provider.status==='ok'?'blue':provider.status==='error'||provider.status==='blocked'?'amber':'')}</div><p>${esc(provider.message||'来源条件待补充')}</p>${sourceLink(provider.source_url,'查看来源条件')}${referenceLinks(provider)}</article>`).join('')||'<p class="materials-empty">暂无来源状态记录</p>';}
  function calculation(){
    const row=material(data.calc.material),issue=priceIssue(row);
    const grams=Number(data.calc.grams),loss=Number(data.calc.loss),quantity=Number(data.calc.quantity);
    const inputs=data.calc.grams.trim()!=='' && data.calc.loss.trim()!=='' && data.calc.quantity.trim()!=='' && Number.isFinite(grams) && grams>0 && grams<=1000000 && Number.isFinite(loss) && loss>=0 && loss<=100 && Number.isInteger(quantity) && quantity>0 && quantity<=100000000;
    const boundary='<p class="materials-calc-boundary">只估算原材料基准部分。加工、合金牌号差异、阻燃等级、税费、运费及供应商加价待确认；不会写入项目 BOM，也不代表采购报价。</p>';
    if(issue)return `<div class="materials-calc-empty" role="status">${icon('CircleHelp')}<strong>${esc(issue)}</strong><span>选择有明确人民币重量计价的材料后再测算。</span></div>${boundary}`;
    const warning=message(row.error),age=row.freshness==='outdated'?'旧源时点 · 仅作敏感性参考':row.freshness!=='recent'?'源时间状态待核实':'参考源时点';
    const basis=`<div class="materials-calc-basis"><strong>${esc(row.name)} · ${esc(marketLabels[row.market_type]||'基准')}</strong><span>${esc(priceText(row))} → ${num(massPrice(row),4)} 元/kg</span><small>${esc(age)}：${esc(time(row.quote_at))}${warning?'；获取失败，继续使用已保存价格':''}</small></div>`;
    if(!inputs)return basis+`<div class="materials-calc-empty" role="status"><span>请输入单灯净用量（g）、0–100% 损耗加成与正整数数量。</span></div>${boundary}`;
    const unit=massPrice(row)*grams/1000*(1+loss/100),total=unit*quantity;
    if(!Number.isFinite(total))return basis+'<p class="materials-error">输入超出可计算范围，请调整。</p>'+boundary;
    return basis+`<div class="materials-calc-values" role="status"><div><span>单灯原料参考</span><strong>${num(unit,4)} <small>元/台</small></strong></div><div><span>批量原料参考</span><strong>${num(total,2)} <small>元</small></strong></div></div><p class="materials-formula">${num(massPrice(row),4)} 元/kg × ${num(grams,2)} g ÷ 1000 × (1 + ${num(loss,2)}%) × ${num(quantity)} 台</p>${boundary}`;
  }
  function calculator(){return `<section class="panel materials-calculator" id="materials-calculator"><div class="panel-header"><div><h3>单灯材料敏感性</h3><p>手动输入用量，检查材料基准波动的影响</p></div>${icon('Calculator')}</div><div class="panel-body"><label class="field">测算材料<select id="material-calc-material" aria-label="选择测算材料">${data.snapshot.materials.map(row=>`<option value="${esc(row.id)}" ${row.id===data.calc.material?'selected':''}>${esc(row.name)}${priceIssue(row)?' · 暂不可测算':''}</option>`).join('')}</select></label><div class="materials-calc-inputs"><label class="field">单灯净用量 g<input data-material-input="grams" type="number" min="0.001" max="1000000" step="any" value="${esc(data.calc.grams)}" placeholder="填写重量"></label><label class="field">损耗加成 %<input data-material-input="loss" type="number" min="0" max="100" step="any" value="${esc(data.calc.loss)}"></label><label class="field">生产数量 台<input data-material-input="quantity" type="number" min="1" max="100000000" step="1" value="${esc(data.calc.quantity)}" placeholder="填写数量"></label></div><div id="material-calc-result">${calculation()}</div></div></section>`;}
  const tableNote = () => esc(data.snapshot.notice||'连续期货反映合约行情；现货基准反映对应采价口径。均不直接等于灯具零件采购价格。');
  function refreshStatus(){return `${icon(data.pending?'RefreshCw':'Clock')}<span>${data.pending?data.requestType==='POST'?'正在获取公开行情…':'正在载入本机记录…':data.error?(data.errorType==='POST'?'公开行情获取失败':'本机记录载入失败')+'；下方仍为已有本机记录：'+esc(data.error):'本机缓存 · 最近刷新 '+esc(time(data.snapshot.last_refresh))}</span><small>每分钟更新本机数据新旧标签；获取时间与源时点分别记录</small>`;}
  function marketContent(){return `<div class="materials-refresh-status" id="materials-refresh-status" role="status">${refreshStatus()}</div>${chartPanel()}<div class="metrics materials-metrics" id="materials-metrics">${metrics()}</div><div class="materials-layout"><section class="panel materials-data"><div class="panel-header"><div><h3>材料行情观察</h3><p>原料基准用于成本趋势研究，具体规格仍需供应商确认</p></div>${tag('来源可追溯','blue')}</div>${controls()}<div id="materials-table-region">${table()}</div><div class="materials-table-note" id="materials-table-note">${tableNote()}</div></section><aside>${calculator()}<section class="panel materials-sources"><div class="panel-header"><h3>行情来源与接入条件</h3>${icon('ShieldCheck')}</div><div class="panel-body" id="materials-providers">${providerCards()}</div></section></aside></div>`;}
  function content(){const tabs=[['quotes','行情趋势','TrendingUp'],['plastics','粒子应用与采购','Layers'],['logistics','物流与运费','Truck']];return `<div class="materials-workspace-tabs" role="group" aria-label="材料工作区">${tabs.map(([id,label,symbol])=>action('workspace',icon(symbol)+label,`data-workspace="${id}" aria-pressed="${data.workspace===id}"`,data.workspace===id?'selected':'')).join('')}</div>`+(data.workspace==='plastics'?`<div id="materials-plastic-workspace">${window.LumiPlastic?.view()||'粒子资料正在准备'}</div>`:data.workspace==='logistics'?`<div id="materials-logistics-workspace">${window.LumiLogistics?.view()||'物流资料正在准备'}</div>`:marketContent());}
  function pageHeading(){return heading('材料行情与采购','大宗行情看趋势，具体牌号看应用与报价，物流费用按公路里程和实际油价测算。',(data.workspace==='quotes'?action('refresh',icon('RefreshCw')+'更新公开行情',data.pending?'disabled':'','button button-primary'):'')+'<button class="button" data-action="navigate" data-page="bom">'+icon('ArrowRight')+'BOM 与成本</button>');}
  function view(){return `<div id="materials-heading">${pageHeading()}</div><div id="materials-workspace">${content()}</div>`;}
  function paint(partial=false){if(!partial&&data.active&&query('#materials-heading'))query('#materials-heading').innerHTML=pageHeading();const host=query('#materials-workspace');if(data.active && host){if(partial){[['materials-metrics',metrics],['materials-refresh-status',refreshStatus],['materials-table-region',table],['materials-table-note',tableNote],['materials-providers',providerCards]].forEach(([id,render])=>{const target=query('#'+id);if(target)target.innerHTML=render();});paintCalculation();}else {destroyFinancialChart();host.innerHTML=content();mountFinancialChart();}}document.querySelectorAll('[data-material-action="refresh"]').forEach(button=>{button.disabled=Boolean(data.pending);});}
  function paintCalculation(){const target=query('#material-calc-result');if(target)target.innerHTML=calculation();}
  function stop(){window.LumiPlastic?.remember();window.LumiLogistics?.remember();destroyFinancialChart();data.active=false;data.epoch++;chart.hover=null;clearTimeout(data.timer);data.timer=null;}
  function schedule(){clearTimeout(data.timer);data.timer=null;if(data.active&&!data.pending&&data.workspace==='quotes'){const seconds=data.auto?Math.max(60,Number(data.snapshot.refresh_after_seconds)||60):60;data.timer=setTimeout(async()=>{if(!data.active)return;try{await request(data.auto);}catch{}},seconds*1000);}}
  function afterRender(){data.active=true;const help=query('#context-help');if(help&&window.LumiManual)help.href=window.LumiManual.contextHref('#materials?view='+data.workspace);mountFinancialChart();schedule();}
  async function history(id){
    if(data.historyPending)return;const row=material(id);if(!row)return;data.historyPending=true;
    try{
      const [result,proof]=await Promise.all([api(`/api/materials/${encodeURIComponent(id)}/history`),/^[a-f0-9]{16}$/.test(row.evidence_id||'')?api(`/api/materials/evidence/${row.evidence_id}`).catch(()=>null):Promise.resolve(null)]),records=Array.isArray(result.history)?result.history:[];
      const text=[`材料：${row.name}`,`行情类型：${marketLabels[row.market_type]||'待核实'}`,`源名称：${row.contract_label||'未提供'}；交易所：${row.exchange||'未提供'}`,`规格范围：${row.grade||'未提供'}`,`工程用途：${row.application||'未提供'}`,`当前保存价格：${priceText(row)}`,`源时点：${time(row.quote_at)}（源日历时间，不自动推定交易日）`,`获取时间：${time(row.observed_at)}`,`固定延迟：${finite(row.delay_seconds)?row.delay_seconds+' 秒':'来源未承诺，不能宣称实时 SLA'}`,`覆盖边界：${row.coverage_note||'具体牌号、加工和采购条款待核验'}`,message(row.error)?`最近获取失败：${message(row.error)}；已有值保留原源时点。`:'',...references(row).map(link=>`补充来源：${link.label||'来源网页'} ${safeUrl(link.url)}（仅提供链接，未自动读取报价）`),`证据编号：${row.evidence_id||'尚无'}`,proof?`请求证据：${JSON.stringify(proof,null,2)}`:'','本机真实观察记录（不补造缺失日期，不代表连续历史走势）',...records.slice(0,100).map(item=>`${time(item.quote_at)} | ${priceText(item)} | 获取 ${time(item.observed_at)} | 证据 ${item.evidence_id||'未记录'}`),...(!records.length?['尚无已保存价格观察；未生成示例曲线。']:[])].filter(line=>line!==null).join('\n\n');
      if(data.active){showSource(String(row.name)+' · 记录与口径',text,'本机材料观察 · 采购价格需单独询价',safeUrl(row.source_url));const dialog=query('#source-dialog-content');if(dialog&&references(row).length)dialog.insertAdjacentHTML('beforeend',referenceLinks(row));}
    }catch(error){toast(message(error),true);}finally{data.historyPending=false;}
  }
  document.addEventListener('click',async event=>{
    const button=event.target.closest('[data-material-action]');if(!button)return;const name=button.dataset.materialAction;
    if(name==='workspace'){window.LumiPlastic?.remember();window.LumiLogistics?.remember();data.workspace=['quotes','plastics','logistics'].includes(button.dataset.workspace)?button.dataset.workspace:'quotes';const help=query('#context-help');if(help&&window.LumiManual)help.href=window.LumiManual.contextHref('#materials?view='+data.workspace);paint();schedule();return;}
    if(name==='tab'){data.tab=['all','metal','plastic','engineering','other'].includes(button.dataset.tab)?button.dataset.tab:'all';paint();return;}
    if(name==='choose'){data.calc.material=button.dataset.id;paint();query('#materials-calculator')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});return;}
    if(name==='history'){await history(button.dataset.id);return;}
    if(name==='chart-show'){if(!material(button.dataset.id))return;chart.id=button.dataset.id;chart.hover=null;paintChart();query('#materials-chart-content')?.scrollIntoView?.({block:'nearest',behavior:'smooth'});await requestCandles(false).catch(()=>{});return;}
    if(name==='chart-window'){chart.window=[60,120,250].includes(Number(button.dataset.days))?Number(button.dataset.days):120;chart.hover=null;paintChart();return;}
    if(name==='chart-type'){chart.type=button.dataset.type==='line'?'line':'candle';chart.hover=null;paintChart();return;}
    if(name==='chart-ma'){chart.ma=!chart.ma;paintChart();return;}
    if(name==='chart-zoom-in'){zoomFinancialChart(0.8);return;}
    if(name==='chart-zoom-out'){zoomFinancialChart(1.25);return;}
    if(name==='chart-reset'){financial.instance?.timeScale().fitContent();chart.viewport=null;return;}
    if(name==='chart-evidence'){chartEvidence();return;}
    if(name==='chart-refresh'){try{const result=await requestCandles(true),status=result.refresh_result?.status||result.status;if(status==='failed'||status==='source_nodata'||result.error)toast('日K获取失败：'+(message(result.refresh_result)||message(result.error)||'旧记录已保留'),true);else if(status==='not_supported')toast('此材料尚无可接通的历史日K来源',true);else if(status==='cached')toast('已复用本机日K记录，请核对源日期');else if(status==='busy')toast('已有日K获取正在进行');else if(status==='ok')toast('历史日K已更新，请核对来源与最新日期');else toast('日K记录已载入，请核对来源状态');}catch(error){toast(message(error),true);}return;}
    if(name==='refresh'){try{const requestType=data.pending?data.requestType:'POST',result=await request(true),status=result.refresh_result?.status,detail=message(result.refresh_result);if(status==='failed'||status==='partial')toast((status==='partial'?'部分获取失败：':'获取失败：')+(detail||'请查看各项来源状态'),true);else if(status==='cached')toast('一分钟内复用已保存记录，请核对源时点');else if(status==='busy')toast('已有刷新正在进行，请稍后查看记录');else if(status==='ok')toast('公开行情获取已完成，请核对每项源时点');else toast(requestType==='GET'?'本机记录已载入；未重复启动公开行情获取':'已载入返回记录，请核对各项来源状态');}catch(error){toast(message(error),true);}}
  });
  document.addEventListener('change',event=>{
    if(event.target.id==='materials-auto'){data.auto=Boolean(event.target.checked);schedule();}
    if(event.target.id==='material-calc-material'){data.calc.material=event.target.value;paintCalculation();}
    if(event.target.id==='materials-chart-material'&&material(event.target.value)){chart.id=event.target.value;chart.hover=null;paintChart();requestCandles(false).catch(()=>{});}
  });
  document.addEventListener('input',event=>{const field=event.target.dataset?.materialInput;if(['grams','loss','quantity'].includes(field)){data.calc[field]=String(event.target.value);paintCalculation();}});
  return {load,view,entry,afterRender,stop};
})();
