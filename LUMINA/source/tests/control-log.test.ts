import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index';
test('technical backend reports actual adapter, addresses, command payload, latency, failure and persistent logs',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lumina-control-'));let server=await createApp(dir);
  try{
    const plan=server.store.plans.find(p=>p.sceneType==='indoor')!;
    await server.app.inject({method:'POST',url:'/api/devices/auto-bind',payload:plan});
    const apply=await server.app.inject({method:'POST',url:'/api/devices/apply',payload:plan});assert.equal(apply.statusCode,200);
    let d=(await server.app.inject({url:'/api/control/diagnostics'})).json();assert.equal(d.simulated,true);assert.equal(d.adapter.name,'SimulatedAdapter');assert.equal(d.adapter.deviceCount,64);assert.equal(d.runtime.dataPath,dir);
    let log=d.logs.find((l:any)=>l.operation==='lighting.apply');assert.equal(log.state,'confirmed');assert.ok(log.durationMs>=180);assert.equal(log.request.wireFrame,null);assert.equal(log.request.commands[0].shortAddress,0);assert.equal(log.request.commands[0].outputPercent,100);assert.equal(log.response.acknowledgement,'simulated-state-confirmation');
    await server.app.inject({method:'POST',url:'/api/devices/configure',payload:{behavior:'failure'}});const failed=await server.app.inject({method:'POST',url:'/api/devices/apply',payload:plan});assert.equal(failed.statusCode,400);
    d=(await server.app.inject({url:'/api/control/diagnostics'})).json();log=d.logs.at(-1);assert.equal(log.state,'failed');assert.match(log.error,/拒绝/);assert.equal(server.devices.state.devices[0].level,100);
    const count=d.logs.length;await server.app.close();server=await createApp(dir);d=(await server.app.inject({url:'/api/control/diagnostics'})).json();assert.equal(d.logs.length,count);assert.equal(d.logs.at(-1).state,'failed');
  }finally{await server.app.close();await fs.rm(dir,{recursive:true,force:true});}
});
