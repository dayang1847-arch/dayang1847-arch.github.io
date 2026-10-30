import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import * as mupdf from 'mupdf';
import { createContourPdf, layoutContourPdf } from '../contour-pdf.mjs';

const part = { pointsMm:[[0,0],[50,0],[50,20],[30,70],[10,70],[0,20]], label:'灯杯 T50 - 正视外形', widthMm:50, heightMm:70, calibrated:true };
const items = Array.from({length:7}, (_,i)=>{
  const factor=(50+i*10)/50;
  return {...part,label:`灯杯 T${50+i*10} - 零件 ${i+1}`,pointsMm:part.pointsMm.map(([x,y])=>[x*factor,y*factor]),widthMm:part.widthMm*factor,heightMm:part.heightMm*factor,calibrated:i!==6};
});
const inputCopy = structuredClone(items);
const plan=layoutContourPdf(items);
assert.equal(plan.pages.length,2);
assert.equal(plan.pages[0].items.length,6);
assert.equal(plan.pages[1].items.length,1);
assert.deepEqual(items,inputCopy);
const allPlaced=plan.pages.flatMap(page=>page.items);
assert.equal(new Set(allPlaced.map(item=>item.pointsPerMm)).size,1,'All cells and pages must use one scale');
const displayedWidth=item=>Math.max(...item.pointsPt.map(p=>p[0]))-Math.min(...item.pointsPt.map(p=>p[0]));
assert(Math.abs(displayedWidth(allPlaced[2])/displayedWidth(allPlaced[0])-70/50)<1e-12,'T70 must appear 1.4 times as wide as T50');
assert(Math.abs(displayedWidth(allPlaced[6])/displayedWidth(allPlaced[0])-110/50)<1e-12,'A part on the second page must preserve the same relative scale');
for(const page of plan.pages) for(const item of page.items) {
  const x0=item.pointsPt[0][0], y0=item.pointsPt[0][1];
  assert(item.pointsPt[3][1]<y0,'CAD Y-up must be mapped to visual upwards');
  assert(Math.abs(item.pointsPt[1][0]-x0-item.widthMm*item.pointsPerMm)<1e-9);
  assert.equal(item.displayScale,item.pointsPerMm/(72/25.4));
  assert(item.pointsPt.every(([x,y])=>x>item.cell.x&&x<item.cell.x+item.cell.width&&y>item.cell.y+35&&y<item.cell.y+item.cell.height-35));
}
const bytes=createContourPdf(items);
assert(bytes instanceof Uint8Array);
assert.equal(new TextDecoder().decode(bytes.slice(0,5)),'%PDF-');
const doc=mupdf.Document.openDocument(bytes,'application/pdf');
try {
  assert.equal(doc.countPages(),2);
  let allText='';
  for(let i=0;i<doc.countPages();i++) {
    const page=doc.loadPage(i);
    const text=page.toStructuredText();
    allText+=text.asText();
    assert(Math.abs(page.getBounds()[2]-(297*72/25.4))<0.001);
    assert(Math.abs(page.getBounds()[3]-(210*72/25.4))<0.001);
    let paths=0,images=0;
    const device=new mupdf.Device({
      strokePath(path,stroke,ctm,cs) {paths++;path.destroy();stroke.destroy();cs.destroy();},
      fillText(text,ctm,cs) {text.destroy();cs.destroy();},
      fillImage(image) {images++;image.destroy();},
    });
    page.run(device,mupdf.Matrix.identity);
    device.close();device.destroy();
    assert.equal(paths,i===0?12:2,'Each cell and each part should remain vector strokes');
    assert.equal(images,0,'Contour PDF must not wrap raster images');
    if(i===0) {
      const pix=page.toPixmap(mupdf.Matrix.scale(1.5,1.5),mupdf.ColorSpace.DeviceRGB,false,true);
      const tmp=path.resolve('../tmp/pdfs');await fs.mkdir(tmp,{recursive:true});
      await fs.writeFile(path.join(tmp,'isolated-contour-sheet-test.png'),pix.asPNG());pix.destroy();
    }
    text.destroy();page.destroy();
  }
  for(const token of ['零件外形轮廓合集','灯杯 T50','已按参考尺寸校准','未校准','50 × 70 mm','显示比例','本批轮廓按同一比例排版']) assert(allText.includes(token),`Missing ${token}`);
  await fs.writeFile(path.resolve('../tmp/pdfs/isolated-contour-sheet-test.pdf'),bytes);
} finally {doc.destroy();}
assert.throws(()=>createContourPdf([]),/between/);
assert.throws(()=>createContourPdf([{...part,pointsMm:[[0,0],[1,0],[1,1]]}]),/dimensions/);
assert.throws(()=>createContourPdf([{...part,pointsMm:[[0,0],[NaN,0],[50,70]]}]),/coordinates/);
assert.throws(()=>createContourPdf([{...part,calibrated:undefined}]),/boolean/);
assert.throws(()=>createContourPdf([{...part,pointsMm:[[0,0],[25,35],[50,70]]}]),/zero area/);
assert.deepEqual(items,inputCopy);
console.log('Contour PDF: pagination, common scale across sizes and pages, bounds, Y-up mapping, calibration labels, CJK, vector paths, input validation and immutability passed.');
