import test from 'node:test';
import assert from 'node:assert/strict';
import { zipSync, strToU8 } from 'fflate';
import { BrowserDemoStore } from '../src/public-demo';
const memory=()=>{const data=new Map<string,string>();return {getItem:(key:string)=>data.get(key)||null,setItem:(key:string,value:string)=>{data.set(key,value);}};};
test('public demo seeds only sample products and persists a visitor’s own layouts',async()=>{
  const storage=memory(),demo=new BrowserDemoStore(storage),state=await demo.request('/api/state');assert.equal(state.products.length,8);assert.ok(state.products.every((p:any)=>p.sample&&!p.assetId));
  const plan=state.plans[0];plan.fixtures[0].position[0]=2.5;await demo.request('/api/plans','POST',plan);
  const restored=new BrowserDemoStore(storage);assert.equal(restored.state.plans.find(p=>p.id===plan.id)!.fixtures[0].position[0],2.5);
  const diagnostics=await restored.request('/api/control/diagnostics');assert.equal(diagnostics.runtime.kind,'browser');assert.equal(diagnostics.runtime.memoryMB,null);assert.equal(diagnostics.devices.length,64);
  const bad=structuredClone(plan);bad.fixtures[0].productId='missing';await assert.rejects(()=>demo.request('/api/plans','POST',bad),/无效/);
});
test('browser control reports confirmations and failures without contacting a gateway',async()=>{
  const demo=new BrowserDemoStore(memory()),plan=demo.state.plans[0];let feedback=0;const unsubscribe=demo.subscribe(()=>feedback++);
  await demo.request('/api/devices/auto-bind','POST',plan);await demo.request('/api/devices/apply','POST',plan);assert.equal(demo.state.devices.devices[0].level,100);assert.ok(feedback>=3);
  const success=demo.state.logs.at(-1)!;assert.equal(success.state,'confirmed');assert.equal((success.request as any).wireFrame,null);assert.equal((success.request as any).commands[0].shortAddress,0);
  await demo.request('/api/devices/configure','POST',{behavior:'failure'});plan.fixtures[0].level=30;await assert.rejects(()=>demo.request('/api/devices/apply','POST',plan),/拒绝/);assert.equal(demo.state.devices.devices[0].level,100);assert.equal(demo.state.logs.at(-1)!.state,'failed');
  await demo.request('/api/devices/configure','POST',{behavior:'normal',deviceId:'mock-0-0',online:false});await assert.rejects(()=>demo.request('/api/devices/apply','POST',plan),/离线/);assert.equal(demo.state.devices.devices[0].level,100);unsubscribe();
});
test('public scheme bundles import independent copies and reject private-model bundles',async()=>{
  const demo=new BrowserDemoStore(memory()),plan=demo.state.plans[0],blob=await demo.blob(`/api/export?planId=${plan.id}`),file=new File([blob],'demo.zip');
  const imported=await demo.importBundle(file);assert.equal(imported.plans,1);assert.notEqual(imported.plan.id,plan.id);assert.notEqual(imported.plan.fixtures[0].id,plan.fixtures[0].id);assert.notEqual(imported.plan.fixtures[0].productId,plan.fixtures[0].productId);
  const count=demo.state.plans.length,bytes=zipSync({'manifest.json':strToU8(JSON.stringify({schemaVersion:1,products:[],plans:[],assets:{private:{files:[]}}}))});await assert.rejects(()=>demo.importBundle(new File([bytes],'private.zip')),/内置样品/);assert.equal(demo.state.plans.length,count);
  const broken={schemaVersion:1,products:demo.state.products,plans:[{...plan,camera:{position:[null,0,1],target:[0,0,0]}}],assets:{}};const invalid=zipSync({'manifest.json':strToU8(JSON.stringify(broken))});await assert.rejects(()=>demo.importBundle(new File([invalid],'invalid.zip')),/镜头坐标/);assert.equal(demo.state.plans.length,count);
});
test('public IES download corresponds to selected product version and local-only features fail clearly',async()=>{
  const demo=new BrowserDemoStore(memory()),p=demo.state.products[0],url=`/api/products/${p.id}/ies?version=${p.version}`;
  const info=await demo.request(url),bytes=await demo.blob(url+'&download=1');assert.equal(await bytes.text(),info.text);assert.match(info.filename,/DEMO\.ies$/);assert.equal(info.source,'generated');
  await assert.rejects(()=>demo.request('/api/uploads','POST'),/完整本地版/);
});
