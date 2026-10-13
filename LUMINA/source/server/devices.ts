import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import type { ControlLog, DeviceBinding, DeviceCapability, DeviceInfo, DeviceState, Fixture, Product } from '../shared/types';
import { clamp } from '../shared/photometry';
import type { Store } from './storage';
export interface LightingAdapter {
  connect():Promise<void>; disconnect():Promise<void>; discover():Promise<DeviceInfo[]>;
  capabilities(id:string):DeviceCapability; setLevel(id:string,level:number):Promise<void>;
  setCCT(id:string,cct:number):Promise<void>; applyScene(commands:{id:string;level:number;cct?:number}[]):Promise<void>;
  status():DeviceState;
}
export class SimulatedAdapter implements LightingAdapter {
  logs:ControlLog[]=[];
  state:DeviceState={simulated:true,connected:true,behavior:'normal',bindings:[],devices:Array.from({length:64},(_,i)=>({id:`mock-0-${i}`,gateway:'mock-gateway',bus:0,address:i,name:`模拟灯具 ${String(i+1).padStart(2,'0')}`,online:true,level:0,cct:3000,capability:{dimming:true,cctRange:i%4===3?null:[2700,6500],d4i:i%3===0},telemetry:{power:0,energy:12.4+i*.3,hours:320+i*4,temperature:32,fault:null}}))};
  constructor(private store:Store,private emit:(event:unknown)=>void){}
  async init(){const defaults=this.state.devices;try{const s=JSON.parse(await fs.readFile(path.join(this.store.root,'devices.json'),'utf8'));if(s.simulated===true){this.state=s;this.state.devices.push(...defaults.filter(d=>!this.state.devices.some(existing=>existing.id===d.id)));}}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}try{this.logs=JSON.parse(await fs.readFile(path.join(this.store.root,'control-log.json'),'utf8'));this.logs=this.logs.map(l=>l.state==='pending'?{...l,state:'failed',error:'服务重启时尚未确认的命令，未补发',finishedAt:new Date().toISOString()}:l);}catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}}
  private async logStart(operation:string,request:unknown){const log:ControlLog={id:randomUUID(),operation,request,source:'simulation',state:'pending',requestedAt:new Date().toISOString()};this.logs=[...this.logs,log].slice(-200);await this.store.atomic('control-log.json',this.logs);this.emit({type:'control',log});return log;}
  private async logFinish(log:ControlLog,state:'confirmed'|'failed',response?:unknown,error?:string){Object.assign(log,{state,response,error,finishedAt:new Date().toISOString(),durationMs:Date.now()-new Date(log.requestedAt).getTime()});await this.store.atomic('control-log.json',this.logs);this.emit({type:'control',log});}
  async audit<T>(operation:string,request:unknown,action:()=>Promise<T>):Promise<T>{const log=await this.logStart(operation,request);try{const result=await action();await this.logFinish(log,'confirmed',typeof result==='object'&&result&&'simulated' in result?{connected:this.state.connected,bindings:this.state.bindings.length}:result);return result;}catch(e){await this.logFinish(log,'failed',undefined,(e as Error).message);throw e;}}
  private async publish(){await this.store.atomic('devices.json',this.state);this.emit({type:'devices',state:this.state});}
  async connect(){this.state.connected=true;await this.publish();}
  async disconnect(){this.state.connected=false;await this.publish();}
  async discover(){if(!this.state.connected)throw new Error('模拟网关未连接');return this.state.devices;}
  capabilities(id:string){const d=this.state.devices.find(d=>d.id===id);if(!d)throw new Error('设备不存在');return d.capability;}
  private check(id:string,cct?:number){if(!this.state.connected)throw new Error('模拟网关离线');const d=this.state.devices.find(d=>d.id===id);if(!d||!d.online)throw new Error('设备离线或不存在');if(cct!==undefined&&(!d.capability.cctRange||cct<d.capability.cctRange[0]||cct>d.capability.cctRange[1]))throw new Error(`${d.name} 不支持此色温`);return d;}
  private async send(commands:{id:string;level:number;cct?:number}[]){
    const log=await this.logStart('lighting.apply',{commands:commands.map(c=>{const d=this.state.devices.find(d=>d.id===c.id);return {deviceId:c.id,gateway:d?.gateway,bus:d?.bus,shortAddress:d?.address,outputPercent:c.level,...(c.cct!==undefined?{cctKelvin:c.cct}:{})};}),wireFrame:null});
    try{
      if(new Set(commands.map(c=>c.id)).size!==commands.length)throw new Error('命令包含重复设备');
      const targets=commands.map(c=>({d:this.check(c.id,c.cct),c}));
      await new Promise(resolve=>setTimeout(resolve,this.state.behavior==='timeout'?1200:180));
      if(this.state.behavior==='timeout')throw new Error('模拟命令超时，设备状态未更新');
      if(this.state.behavior==='failure')throw new Error('模拟网关拒绝命令，设备状态未更新');
      for(const {c}of targets)this.check(c.id,c.cct);
      for(const {d,c}of targets){d.level=clamp(c.level,0,100);if(c.cct!==undefined)d.cct=c.cct;d.telemetry.power=Number(((d.luminaireData?.ratedPower||36)*d.level/100).toFixed(1));d.telemetry.temperature=32+d.level*.08;}
      this.state.lastCommand={success:true,message:`已确认 ${commands.length} 台模拟设备的状态`,at:new Date().toISOString()};await this.publish();
      await this.logFinish(log,'confirmed',{devices:targets.map(({d})=>({id:d.id,level:d.level,cct:d.cct,online:d.online})),acknowledgement:'simulated-state-confirmation'});
    }catch(e){this.state.lastCommand={success:false,message:(e as Error).message,at:new Date().toISOString()};await this.publish();await this.logFinish(log,'failed',undefined,(e as Error).message);throw e;}
  }
  async setLevel(id:string,level:number){await this.send([{id,level}]);}
  async setCCT(id:string,cct:number){const d=this.state.devices.find(d=>d.id===id);await this.send([{id,level:d?.level||0,cct}]);}
  async applyScene(commands:{id:string;level:number;cct?:number}[]){await this.send(commands);}
  status(){return this.state;}
  async configure(options:{connected?:boolean;behavior?:DeviceState['behavior'];deviceId?:string;online?:boolean}){if(options.connected!==undefined)this.state.connected=options.connected;if(options.behavior)this.state.behavior=options.behavior;if(options.deviceId){const d=this.state.devices.find(d=>d.id===options.deviceId);if(!d)throw new Error('设备不存在');d.online=!!options.online;}await this.publish();return this.state;}
  async bind(binding:DeviceBinding|null,fixtureId:string){
    if(binding&&!this.state.devices.some(d=>d.id===binding.deviceId))throw new Error('设备不存在');
    if(binding&&this.state.bindings.some(b=>b.deviceId===binding.deviceId&&b.fixtureId!==fixtureId))throw new Error('此设备已绑定其他灯具');
    this.state.bindings=this.state.bindings.filter(b=>b.fixtureId!==fixtureId);if(binding)this.state.bindings.push(binding);await this.publish();return this.state;
  }
  async autoBind(fixtures:Fixture[],products:Product[]){
    const used=new Set(this.state.bindings.filter(b=>!fixtures.some(f=>f.id===b.fixtureId)).map(b=>b.deviceId));
    const result:DeviceBinding[]=[];
    for(const f of fixtures){const p=products.find(p=>p.id===f.productId&&p.version===f.productVersion);const d=this.state.devices.find(d=>!used.has(d.id)&&(p?.cctRange?d.capability.cctRange&&p.cctRange[0]>=d.capability.cctRange[0]&&p.cctRange[1]<=d.capability.cctRange[1]:!d.capability.cctRange||p&&p.cct>=d.capability.cctRange[0]&&p.cct<=d.capability.cctRange[1]));if(!d)throw new Error('可绑定且色温能力匹配的模拟设备不足');used.add(d.id);if(p){d.luminaireData={model:p.model,manufacturer:p.photometry?.labels.MANUFAC||'本地产品仓库',ratedPower:p.watts,luminousFlux:p.photometry?.lumens||0,nominalCCT:p.cct};if(!p.cctRange)d.cct=p.cct;}result.push({fixtureId:f.id,deviceId:d.id});}
    this.state.bindings=[...this.state.bindings.filter(b=>!fixtures.some(f=>f.id===b.fixtureId)),...result];await this.publish();return this.state;
  }
}
