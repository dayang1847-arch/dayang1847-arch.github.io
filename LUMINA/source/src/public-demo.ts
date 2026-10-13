import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { makePlan, seedProducts } from '../shared/scenes';
import { serializeIES } from '../shared/photometry';
import type { BundleManifest, ControlDiagnostics, ControlLog, DeviceState, Product, ScenePlan } from '../shared/types';

export const PUBLIC_DEMO=import.meta.env?.VITE_PUBLIC_DEMO==='true';
export const DEMO_STORAGE_KEY='lumina-public-v1';
type State={version:1;products:Product[];plans:ScenePlan[];devices:DeviceState;logs:ControlLog[]};
type StorageLike=Pick<Storage,'getItem'|'setItem'>;
const copy=<T,>(v:T):T=>structuredClone(v);
const initial=():State=>({version:1,products:seedProducts(),plans:[makePlan('indoor'),makePlan('outdoor')],logs:[],devices:{simulated:true,connected:true,behavior:'normal',bindings:[],devices:Array.from({length:64},(_,i)=>({id:`mock-0-${i}`,gateway:'browser-demo',bus:0,address:i,name:`模拟灯具 ${String(i+1).padStart(2,'0')}`,online:true,level:0,cct:3000,capability:{dimming:true,cctRange:i%4===3?null:[2700,6500],d4i:i%3===0},telemetry:{power:0,energy:12.4+i*.3,hours:320+i*4,temperature:32,fault:null}}))}});

export class BrowserDemoStore{
  state:State;
  private started=Date.now();
  private listeners=new Set<(state:DeviceState)=>void>();
  constructor(private storage:StorageLike){
    const saved=storage.getItem(DEMO_STORAGE_KEY);this.state=saved?JSON.parse(saved):initial();
    if(this.state.version!==1||!Array.isArray(this.state.plans)||!Array.isArray(this.state.products)||this.state.devices?.simulated!==true)throw new Error('浏览器演示数据格式不受支持');
    this.state.logs=this.state.logs.map(l=>l.state==='pending'?{...l,state:'failed',error:'页面关闭前命令尚未确认，未自动补发',finishedAt:new Date().toISOString()}:l);
  }
  subscribe(listener:(state:DeviceState)=>void){this.listeners.add(listener);listener(copy(this.state.devices));return()=>{this.listeners.delete(listener);};}
  private persist(){try{this.storage.setItem(DEMO_STORAGE_KEY,JSON.stringify(this.state));}catch{throw new Error('浏览器保存空间不足或保存被禁止，请先导出方案');}}
  private publish(){this.persist();for(const listener of this.listeners)listener(copy(this.state.devices));}
  private validatePlan(value:unknown,products=this.state.products):ScenePlan{
    const p=copy(value) as ScenePlan;
    if(!p||p.schemaVersion!==1||!p.id||!p.name?.trim()||!['indoor','outdoor'].includes(p.sceneType)||!['day','dusk','night'].includes(p.environment)||!Number.isInteger(p.revision)||p.revision<0||!Array.isArray(p.fixtures)||p.fixtures.length>500||!Array.isArray(p.presets)||p.presets.length>50)throw new Error('方案格式不受支持');
    if(p.camera&&[p.camera.position,p.camera.target].some(v=>!Array.isArray(v)||v.length!==3||!v.every(Number.isFinite)))throw new Error('镜头坐标格式错误');
    const ids=new Set<string>();
    for(const f of p.fixtures){const product=products.find(pr=>pr.id===f.productId&&pr.version===f.productVersion);if(!product||product.status!=='ready'||!product.sceneTypes.includes(p.sceneType)||ids.has(f.id)||typeof f.group!=='string'||!Number.isFinite(f.level)||f.level<0||f.level>100||!Number.isFinite(f.cct)||[f.position,f.rotation].some(v=>!Array.isArray(v)||v.length!==3||!v.every(Number.isFinite)))throw new Error('方案包含无效灯具');if(product.cctRange?f.cct<product.cctRange[0]||f.cct>product.cctRange[1]:f.cct!==product.cct)throw new Error('色温超出产品能力');ids.add(f.id);}
    for(const pre of p.presets)if(!Array.isArray(pre.values)||pre.values.some(v=>!ids.has(v.id)||!Number.isFinite(v.level)||v.level<0||v.level>100||!Number.isFinite(v.cct)))throw new Error('照明预设格式错误');
    return p;
  }
  private async audit<T>(operation:string,request:unknown,action:()=>Promise<T>|T):Promise<T>{
    const log:ControlLog={id:crypto.randomUUID(),source:'simulation',operation,request:copy(request),state:'pending',requestedAt:new Date().toISOString()};this.state.logs=[...this.state.logs,log].slice(-200);this.persist();
    try{const result=await action();Object.assign(log,{state:'confirmed',response:copy(result),finishedAt:new Date().toISOString(),durationMs:Date.now()-Date.parse(log.requestedAt)});this.publish();return copy(result);}
    catch(e){Object.assign(log,{state:'failed',error:(e as Error).message,finishedAt:new Date().toISOString(),durationMs:Date.now()-Date.parse(log.requestedAt)});if(operation==='lighting.apply')this.state.devices.lastCommand={success:false,message:(e as Error).message,at:new Date().toISOString()};this.publish();throw e;}
  }
  async request(url:string,method='GET',body?:unknown):Promise<any>{
    const u=new URL(url,'https://demo.invalid'),route=u.pathname,s=this.state,d=s.devices;
    if(route==='/api/state')return copy({products:s.products,plans:s.plans,devices:d,jobs:[],dataPath:'当前浏览器'});
    if(route==='/api/jobs')return [];
    if(route==='/api/plans'&&method==='POST'){const p={...this.validatePlan(body),savedAt:new Date().toISOString()};s.plans=[...s.plans.filter(v=>v.id!==p.id),p];this.persist();return copy(p);}
    if(route==='/api/devices'&&method==='GET')return copy(d);
    if(route==='/api/control/diagnostics')return copy({simulated:true,adapter:{name:'BrowserDemoAdapter',transport:'浏览器内模拟',connected:d.connected,behavior:d.behavior,bus:0,deviceCount:d.devices.length,boundCount:d.bindings.length,supported:['connect','disconnect','discover','capabilities','setLevel','setCCT','applyScene','status']},runtime:{kind:'browser',node:'',platform:'浏览器演示',uptime:Math.round((Date.now()-this.started)/1000),memoryMB:null,dataPath:`此浏览器 / ${DEMO_STORAGE_KEY}`},devices:d.devices,bindings:d.bindings,logs:s.logs} satisfies ControlDiagnostics);
    if(route==='/api/devices/discover')return this.audit('gateway.discover',{},()=>{if(!d.connected)throw new Error('模拟网关未连接');return {devices:d.devices};});
    if(route==='/api/devices/configure')return this.audit('gateway.configure',body,()=>{const b=body as any;if(b.connected!==undefined)d.connected=!!b.connected;if(b.behavior){if(!['normal','timeout','failure'].includes(b.behavior))throw new Error('响应模式错误');d.behavior=b.behavior;}if(b.deviceId){const dev=d.devices.find(v=>v.id===b.deviceId);if(!dev)throw new Error('设备不存在');dev.online=!!b.online;}return {connected:d.connected,behavior:d.behavior};});
    if(route==='/api/devices/bind')return this.audit('device.bind',body,()=>{const b=body as {fixtureId:string;deviceId:string|null};if(b.deviceId&&!d.devices.some(v=>v.id===b.deviceId))throw new Error('设备不存在');if(b.deviceId&&d.bindings.some(v=>v.deviceId===b.deviceId&&v.fixtureId!==b.fixtureId))throw new Error('设备已绑定其他灯具');d.bindings=d.bindings.filter(v=>v.fixtureId!==b.fixtureId);if(b.deviceId)d.bindings.push({fixtureId:b.fixtureId,deviceId:b.deviceId});return {boundCount:d.bindings.length};}).then(()=>copy(d));
    if(route==='/api/devices/auto-bind'){
      const p=this.validatePlan(body);return this.audit('scene.bind',{planId:p.id,fixtureCount:p.fixtures.length},()=>{
        const used=new Set(d.bindings.filter(b=>!p.fixtures.some(f=>f.id===b.fixtureId)).map(b=>b.deviceId)),assigned=p.fixtures.map(f=>{const pr=s.products.find(pr=>pr.id===f.productId&&pr.version===f.productVersion)!;const dev=d.devices.find(v=>!used.has(v.id)&&(pr.cctRange?v.capability.cctRange&&pr.cctRange[0]>=v.capability.cctRange[0]&&pr.cctRange[1]<=v.capability.cctRange[1]:true));if(!dev)throw new Error('能力匹配的模拟设备不足');used.add(dev.id);return {f,pr,dev};});
        d.bindings=[...d.bindings.filter(b=>!p.fixtures.some(f=>f.id===b.fixtureId)),...assigned.map(({f,dev})=>({fixtureId:f.id,deviceId:dev.id}))];
        for(const {pr,dev} of assigned){dev.luminaireData={model:pr.model,manufacturer:'LUMINA · 演示样品',ratedPower:pr.watts,luminousFlux:pr.photometry?.lumens||0,nominalCCT:pr.cct};if(!pr.cctRange)dev.cct=pr.cct;}
        return {boundCount:d.bindings.length};
      }).then(()=>copy(d));
    }
    if(route==='/api/devices/apply'){
      const p=this.validatePlan(body),commands=p.fixtures.flatMap(f=>{const b=d.bindings.find(v=>v.fixtureId===f.id),pr=s.products.find(pr=>pr.id===f.productId&&pr.version===f.productVersion)!;return b?[{id:b.deviceId,level:f.level,...(pr.cctRange?{cct:f.cct}:{})}]:[];});
      if(!commands.length)throw new Error('请先绑定场景灯具');
      const request={planId:p.id,revision:p.revision,commands:commands.map(c=>{const dev=d.devices.find(v=>v.id===c.id);return {deviceId:c.id,gateway:dev?.gateway,bus:dev?.bus,shortAddress:dev?.address,outputPercent:c.level,...(c.cct===undefined?{}:{cctKelvin:c.cct})};}),wireFrame:null};
      await this.audit('lighting.apply',request,async()=>{
        const check=()=>commands.map(c=>{const dev=d.devices.find(v=>v.id===c.id);if(!d.connected||!dev?.online)throw new Error('模拟网关或设备离线');if(c.cct!==undefined&&(!dev.capability.cctRange||c.cct<dev.capability.cctRange[0]||c.cct>dev.capability.cctRange[1]))throw new Error('设备不支持此色温');return {dev,c};});
        check();await new Promise(resolve=>setTimeout(resolve,d.behavior==='timeout'?1200:180));if(d.behavior==='timeout')throw new Error('模拟命令超时，设备状态未更新');if(d.behavior==='failure')throw new Error('模拟网关拒绝命令，设备状态未更新');
        const targets=check();for(const {dev,c} of targets){dev.level=c.level;if(c.cct!==undefined)dev.cct=c.cct;dev.telemetry.power=Number(((dev.luminaireData?.ratedPower||36)*c.level/100).toFixed(1));dev.telemetry.temperature=32+c.level*.08;}
        d.lastCommand={success:true,message:`已确认 ${commands.length} 台模拟设备的状态`,at:new Date().toISOString()};return {devices:targets.map(({dev})=>({id:dev.id,level:dev.level,cct:dev.cct,online:dev.online})),acknowledgement:'simulated-state-confirmation'};
      });return copy({state:d,applied:commands.length,unbound:p.fixtures.length-commands.length});
    }
    const ies=route.match(/^\/api\/products\/([^/]+)\/ies$/);
    if(ies){const p=s.products.find(p=>p.id===decodeURIComponent(ies[1])&&p.version===Number(u.searchParams.get('version')||1));if(!p?.photometry)throw new Error('此产品版本没有 IES');return {filename:`${p.model}-DEMO.ies`,text:serializeIES(p.photometry),source:'generated',productId:p.id,version:p.version};}
    throw new Error('该功能需要完整本地版；请下载本地应用使用');
  }
  async blob(url:string){
    const u=new URL(url,'https://demo.invalid');
    if(u.pathname.endsWith('/ies'))return new Blob([(await this.request(url)).text],{type:'application/octet-stream'});
    if(u.pathname!=='/api/export')throw new Error('此文件需要完整本地版');
    const id=u.searchParams.get('planId'),plans=id?this.state.plans.filter(p=>p.id===id):this.state.plans;if(!plans.length)throw new Error('方案不存在');
    const refs=new Set(plans.flatMap(p=>p.fixtures.map(f=>`${f.productId}@${f.productVersion}`))),products=id?this.state.products.filter(p=>refs.has(`${p.id}@${p.version}`)):this.state.products;
    const manifest:BundleManifest={schemaVersion:1,products,plans,assets:{}};return new Blob([zipSync({'manifest.json':strToU8(JSON.stringify(manifest))}).slice().buffer as ArrayBuffer],{type:'application/zip'});
  }
  async importBundle(file:File){
    if(!file.name.toLowerCase().endsWith('.zip')||file.size>10*1024*1024)throw new Error('在线演示支持 10 MB 以内的演示方案 ZIP');
    let expanded=0;const files=unzipSync(new Uint8Array(await file.arrayBuffer()),{filter:f=>{expanded+=f.originalSize;if(expanded>10*1024*1024)throw new Error('演示方案解压后超过大小上限');return true;}});
    if(Object.keys(files).length!==1||!files['manifest.json'])throw new Error('含自有模型的方案请在完整本地版导入');
    const m=JSON.parse(strFromU8(files['manifest.json'])) as BundleManifest,seeds=seedProducts();
    if(m.schemaVersion!==1||!Array.isArray(m.products)||m.products.length>200||!Array.isArray(m.plans)||m.plans.length>50||Object.keys(m.assets||{}).length)throw new Error('在线演示仅支持内置样品方案');
    const map=new Map<string,string>(),products=m.products.map(p=>{const seed=seeds.find(v=>v.model===p.model&&v.category===p.category);if(!seed||p.sample!==true||p.assetId)throw new Error('自有产品请在完整本地版导入');if(!map.has(p.id))map.set(p.id,`import-${crypto.randomUUID()}`);return {...seed,id:map.get(p.id)!,version:p.version};});
    const plans=m.plans.map(p=>{this.validatePlan(p,products.map(pr=>({...pr,id:[...map].find(([,id])=>id===pr.id)![0]})));const ids=new Map(p.fixtures.map(f=>[f.id,crypto.randomUUID()]));return {...p,id:`import-${crypto.randomUUID()}`,name:p.name+' · 导入',fixtures:p.fixtures.map(f=>({...f,id:ids.get(f.id)!,productId:map.get(f.productId)!})),presets:p.presets.map(pr=>({...pr,id:crypto.randomUUID(),values:pr.values.map(v=>({...v,id:ids.get(v.id)!}))}))};});
    for(const plan of plans)this.validatePlan(plan,products);this.state.products.push(...products);this.state.plans.push(...plans);this.persist();return {products:products.length,plans:plans.length,plan:copy(plans[0])};
  }
}
let singleton:BrowserDemoStore|undefined;
export const demoStore=()=>singleton||(singleton=new BrowserDemoStore(localStorage));
