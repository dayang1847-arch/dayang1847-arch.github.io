import test from 'node:test';
import assert from 'node:assert/strict';
import { promises as fs } from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createApp } from '../server/index';
import { DEFAULT_CALIBRATION } from '../shared/types';
import { samplePhotometry, serializeIES, parseIES } from '../shared/photometry';
function multipart(filename:string,bytes:Buffer){const boundary='lumina-file-test';return {headers:{'content-type':`multipart/form-data; boundary=${boundary}`},payload:Buffer.concat([Buffer.from(`--${boundary}\r\nContent-Disposition: form-data; name="file"; filename="${filename}"\r\nContent-Type: application/octet-stream\r\n\r\n`),bytes,Buffer.from(`\r\n--${boundary}--\r\n`)])};}
test('each product version returns its own IES, original downloads preserve bytes and published assets are immutable',async()=>{
  const dir=await fs.mkdtemp(path.join(os.tmpdir(),'lumina-ies-'));const {app,store}=await createApp(dir);
  try{
    const sample=await app.inject({url:'/api/products/DL-01/ies?version=1'});assert.equal(sample.json().source,'generated');assert.ok(Math.abs(parseIES(sample.json().text).lumens-960)<.01);
    const {assetId}=(await app.inject({method:'POST',url:'/api/assets/new'})).json();
    await fs.writeFile(path.join(store.assetDir(assetId),'mesh.json'),'{}');
    const original=Buffer.from('\uFEFF'+serializeIES(samplePhotometry('筒灯',1000,10)).replace(/\n/g,'\r\n'));
    const upload=await app.inject({method:'POST',url:`/api/assets/${assetId}/ies`,...multipart('original.ies',original)});assert.equal(upload.statusCode,200);
    const input={name:'Owned lamp',model:'OWN-1',category:'筒灯',watts:10,cct:3000,cctRange:null,sceneTypes:['indoor'],assetId,calibration:DEFAULT_CALIBRATION,status:'ready'};
    const created=await app.inject({method:'POST',url:'/api/products',payload:input});assert.equal(created.statusCode,200);const p=created.json();
    const raw=await app.inject({url:`/api/products/${p.id}/ies?version=1`});assert.equal(raw.json().filename,'original.ies');assert.equal(raw.json().source,'original');
    const download=await app.inject({url:`/api/products/${p.id}/ies?version=1&download=1`});assert.deepEqual(download.rawPayload,original);
    const forbidden=await app.inject({method:'POST',url:`/api/assets/${assetId}/ies`,...multipart('other.ies',original)});assert.equal(forbidden.statusCode,400);
    const clone=(await app.inject({method:'POST',url:`/api/assets/${assetId}/clone`})).json();
    const second=Buffer.from(serializeIES(samplePhotometry('筒灯',2000,20)));
    await app.inject({method:'POST',url:`/api/assets/${clone.assetId}/ies`,...multipart('second.ies',second)});
    const updated=await app.inject({method:'POST',url:'/api/products',payload:{...input,id:p.id,assetId:clone.assetId}});assert.equal(updated.json().version,2);
    assert.deepEqual((await app.inject({url:`/api/products/${p.id}/ies?version=1&download=1`})).rawPayload,original);
    assert.deepEqual((await app.inject({url:`/api/products/${p.id}/ies?version=2&download=1`})).rawPayload,second);
    assert.equal((await app.inject({url:`/api/products/${p.id}/ies?version=99`})).statusCode,404);
  }finally{await app.close();await fs.rm(dir,{force:true,recursive:true});}
});
