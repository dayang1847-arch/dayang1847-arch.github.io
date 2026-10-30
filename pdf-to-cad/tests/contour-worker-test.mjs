// Full worker RPC contract using synthetic PDF bytes and the real CAD/PDF WASM engines.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import {createRequire} from 'node:module';
import * as mupdf from 'mupdf';
import { inspect_dwg } from '../vendor/cad/pdf_cad_wasm.js';

const originalFetch=globalThis.fetch;
globalThis.fetch=async (resource,options)=>{
  const url=resource instanceof URL ? resource : new URL(String(resource));
  if(url.protocol==='file:') return new Response(await fs.readFile(url),{headers:{'Content-Type':'application/wasm'}});
  return originalFetch(resource,options);
};
globalThis.self=globalThis;
// The pinned Potrace ESM bundle probes Node's legacy globals during initialization.
globalThis.require=createRequire(import.meta.url);
globalThis.__dirname=new URL('.',import.meta.url).pathname;
const pending=new Map();
let nextId=1;
let readyResolve,readyReject;
const ready=new Promise((resolve,reject)=>{readyResolve=resolve;readyReject=reject;});
globalThis.postMessage=message=>{
  if(message.type==='ready')return readyResolve();
  if(message.type==='fatal')return readyReject(new Error(message.error));
  const callback=pending.get(message.id);
  assert.ok(callback,'Unexpected worker reply');
  pending.delete(message.id);
  message.ok?callback.resolve(message.result):callback.reject(new Error(message.error));
};
await import('../worker-source.mjs');
await ready;
function rpc(type,payload={}) {
  return new Promise((resolve,reject)=>{
    const id=nextId++;
    pending.set(id,{resolve,reject});
    self.onmessage({data:{id,type,payload}});
  });
}

const buffer=new mupdf.Buffer();
const writer=new mupdf.DocumentWriter(buffer,'pdf','');
const device=writer.beginPage([0,0,300,240]);
const path=new mupdf.Path();
path.moveTo(70,55);path.lineTo(225,55);path.lineTo(225,75);path.lineTo(200,90);
path.lineTo(180,170);path.lineTo(115,170);path.lineTo(95,90);path.lineTo(70,75);path.closePath();
const stroke=new mupdf.StrokeState({lineWidth:1.2,lineCap:'Round',lineJoin:'Round',miterLimit:4});
device.strokePath(path,stroke,[1,0,0,1,0,0],mupdf.ColorSpace.DeviceRGB,[0,0,0],1);
writer.endPage();device.destroy();writer.close();
const bytes=new Uint8Array(buffer.asUint8Array());
path.destroy();stroke.destroy();writer.destroy();buffer.destroy();
const loaded=await rpc('inspect',{name:'synthetic-lamp.pdf',bytes});
const doc=loaded.documents[0];
assert.equal(doc.pageCount,1);
const item=await rpc('extractContour',{docId:doc.id,pageIndex:0,region:{x:.18,y:.16,width:.62,height:.61},dpi:300,threshold:160});
assert.equal(item.calibrated,false);
assert.ok(item.pointsMm.length>5);
assert.ok(item.widthMm>50 && item.widthMm<58);
assert.ok(item.heightMm>37 && item.heightMm<44);
await assert.rejects(rpc('exportContours',{items:[{contourId:item.contourId}],format:'dwg'}),/校准/);
const measured=await rpc('calibrateContour',{contourId:item.contourId,point1:[0,0],point2:[item.widthMm,0],valueMm:70});
assert.ok(Math.abs(measured.widthMm-70)<1e-9);
assert.ok(measured.calibrated);
assert.equal(measured.basePoints,undefined);
const rotated=await rpc('rotateContour',{contourId:item.contourId});
assert.ok(Math.abs(rotated.heightMm-70)<1e-9);
assert.ok(rotated.calibrated);
assert.ok(Math.abs(rotated.calibration.measurementMm-70)<1e-9);
const second=await rpc('extractContour',{docId:doc.id,pageIndex:0,region:{x:.18,y:.16,width:.62,height:.61},dpi:300,threshold:160});
await rpc('calibrateContour',{contourId:second.contourId,point1:[0,0],point2:[second.widthMm,0],valueMm:50});
const items=[{contourId:item.contourId,label:'灯杯 T70'},{contourId:second.contourId,label:'灯杯 T50'}];
const dwg=await rpc('exportContours',{items,format:'dwg'});
assert.equal(new TextDecoder().decode(dwg.bytes.slice(0,6)),'AC1027');
const manifest=JSON.parse(inspect_dwg(dwg.bytes));
assert.equal(manifest.units,4);
assert.ok(manifest.entities>10);
assert.ok(!manifest.types.HATCH && !manifest.types.INSERT);
const dxf=await rpc('exportContours',{items,format:'dxf'});
assert.match(new TextDecoder().decode(dxf.bytes),/\bLINE\b/);
const pdf=await rpc('exportContours',{items,format:'pdf'});
const pdfDoc=mupdf.Document.openDocument(pdf.bytes,'application/pdf');
assert.equal(pdfDoc.countPages(),1);
const pdfPage=pdfDoc.loadPage(0),text=pdfPage.toStructuredText();
assert.match(text.asText(),/T70/);
assert.match(text.asText(),/T50/);
text.destroy();pdfPage.destroy();pdfDoc.destroy();
await rpc('resetContourCalibration',{contourId:item.contourId});
await assert.rejects(rpc('exportContours',{items,format:'pdf'}),/校准/);
await rpc('removeContour',{contourId:second.contourId});
await assert.rejects(rpc('calibrateContour',{contourId:second.contourId,point1:[0,0],point2:[1,1],valueMm:3}),/清空/);
await rpc('clear');
await assert.rejects(rpc('extractContour',{docId:doc.id,pageIndex:0,region:{x:.1,y:.1,width:.8,height:.8}}),/清空/);
await assert.rejects(rpc('calibrateContour',{contourId:item.contourId,point1:[0,0],point2:[1,1],valueMm:3}),/清空/);
console.log('Worker extraction → per-part calibration → combined DWG/DXF/PDF → reset/clear passed.');
