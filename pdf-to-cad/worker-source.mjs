// All document bytes remain in this worker's memory; no file upload endpoint.
import * as mupdf from 'mupdf';
import { potrace, init as initPotrace } from 'esm-potrace-wasm';
import { unzipSync } from 'fflate';
import { createExtractorFromData } from 'node-unrar-js';
import initCad, { dxf_to_dwg, inspect_dwg } from './vendor/cad/pdf_cad_wasm.js';
import { vectorPageToDxf, svgToDxf } from './geometry.mjs';

const documents = new Map();
const MAX_FILE = 60 * 1024 * 1024;
const MAX_TOTAL = 200 * 1024 * 1024;
let storedBytes = 0;
let storedPages = 0;
let unrarBinary;
const ready = Promise.all([
  initCad({ module_or_path: new URL('./vendor/cad/pdf_cad_wasm_bg.wasm', import.meta.url) }),
  initPotrace(),
]);
ready.then(() => postMessage({type:'ready',version:'MuPDF 1.28.1 · Potrace · acadrust 0.5.5'}))
  .catch(error => postMessage({type:'fatal',error:error.message || String(error)}));

function safeName(name) { return name.replace(/\\/g,'/').split('/').pop().replace(/[\x00-\x1f]/g,'') || 'drawing.pdf'; }
function checkBytes(bytes) {
  if (!bytes.length || bytes.length > MAX_FILE) throw new Error('单份 PDF 不得超过 60 MB / Maximum 60 MB per PDF.');
}
function pageInfo(page) {
  const bounds = page.getBounds();
  const width = bounds[2]-bounds[0], height=bounds[3]-bounds[1];
  let paths=0, images=0, imageArea=0;
  const device = new mupdf.Device({
    fillPath(path,evenOdd,matrix,colorspace){paths++;path.destroy();colorspace.destroy();},
    strokePath(path,stroke,matrix,colorspace){paths++;path.destroy();stroke.destroy();colorspace.destroy();},
    fillImage(image,matrix){ images++;imageArea+=Math.abs(matrix[0]*matrix[3]-matrix[1]*matrix[2]);image.destroy(); },
    fillImageMask(image,matrix,colorspace){images++;imageArea+=Math.abs(matrix[0]*matrix[3]-matrix[1]*matrix[2]);image.destroy();colorspace.destroy();},
  });
  try { page.run(device,mupdf.Matrix.identity); device.close(); } finally {device.destroy();}
  const st=page.toStructuredText();
  let text;
  try {text=st.asText().trim();} finally {st.destroy();}
  const coverage=Math.min(1,imageArea/(width*height));
  const kind=images ? (paths||text ? 'mixed':'scan'):'vector';
  return {kind,recommendedMode:kind==='scan'||coverage>.65?'scan':'vector',widthMm:width*25.4/72,heightMm:height*25.4/72,widthPt:width,heightPt:height,paths,images,imageCoverage:coverage};
}
function render(page,dpi=110,maxPixels=4500000) {
  const bounds=page.getBounds();
  const w=bounds[2]-bounds[0],h=bounds[3]-bounds[1];
  const scale=Math.min(dpi/72,Math.sqrt(maxPixels/(w*h)));
  return page.toPixmap(mupdf.Matrix.scale(scale,scale),mupdf.ColorSpace.DeviceRGB,false,true);
}
function preview(page) {
  const pix=render(page);
  try {return new Uint8Array(pix.asPNG());} finally {pix.destroy();}
}

async function unpack(name,bytes) {
  const lower=name.toLowerCase();
  if(lower.endsWith('.pdf')) return [{name:safeName(name),bytes}];
  if(lower.endsWith('.zip')) {
    let total=0,count=0;
    const entries=unzipSync(bytes,{filter(file){
      if(!file.name.toLowerCase().endsWith('.pdf'))return false;
      total+=file.originalSize;count++;
      if(total>MAX_TOTAL || file.originalSize>MAX_FILE || count>50) throw new Error('压缩包超过 50 份 PDF 或 200 MB 解压限制。');
      return true;
    }});
    return Object.entries(entries).map(([name,bytes])=>({name:safeName(name),bytes}));
  }
  if(lower.endsWith('.rar')) {
    unrarBinary ??= await fetch(new URL('./vendor/unrar/unrar.wasm',import.meta.url)).then(r=>{if(!r.ok)throw new Error('RAR 引擎加载失败');return r.arrayBuffer();});
    const extractor=await createExtractorFromData({data:bytes.buffer.slice(bytes.byteOffset,bytes.byteOffset+bytes.byteLength),wasmBinary:unrarBinary});
    let total=0;
    const headers=[...extractor.getFileList().fileHeaders].filter(f=>!f.flags.directory&&f.name.toLowerCase().endsWith('.pdf'));
    for(const f of headers){total+=f.unpSize;if(total>MAX_TOTAL||f.unpSize>MAX_FILE||headers.length>50)throw new Error('压缩包超过 50 份 PDF 或 200 MB 解压限制。');}
    const result=[];
    // Consume the lazy iterator completely so the existing WASM extractor frees it.
    for(const file of extractor.extract({files:headers.map(f=>f.name)}).files) {
      if(file.extraction)result.push({name:safeName(file.fileHeader.name),bytes:new Uint8Array(file.extraction)});
    }
    return result;
  }
  throw new Error('请选择 PDF、RAR 或 ZIP / Select PDF, RAR or ZIP.');
}

async function inspect(payload) {
  const files=await unpack(payload.name,new Uint8Array(payload.bytes));
  if(!files.length)throw new Error('压缩包中没有 PDF / No PDF files found.');
  const created=[];
  try {
    for(const file of files) {
      checkBytes(file.bytes);
      if(storedBytes+file.bytes.length>MAX_TOTAL || documents.size>=50)throw new Error('每次最多 50 份 PDF / 200 MB，请清空后分批转换。');
      const doc=mupdf.Document.openDocument(file.bytes,'application/pdf');
      let registered=false;
      try {
        if(doc.needsPassword())throw new Error('PDF 需要密码，请先解除密码保护。');
        const count=doc.countPages();
        if(storedPages+count>100)throw new Error('每次最多 100 页，请分批转换。');
        const pages=[];let firstPreview;
        for(let i=0;i<count;i++) {
          const page=doc.loadPage(i);
          try {pages.push(pageInfo(page));if(i===0)firstPreview=preview(page);}finally{page.destroy();}
        }
        const id=crypto.randomUUID();
        const item={id,name:file.name,pageCount:count,pages,preview:firstPreview};
        documents.set(id,{doc,byteLength:file.bytes.length,pages});
        storedBytes+=file.bytes.length;storedPages+=count;registered=true;
        created.push(item);
      }finally{if(!registered)doc.destroy();}
    }
    return {documents:created};
  }catch(error){
    for(const item of created){const record=documents.get(item.id);record.doc.destroy();storedBytes-=record.byteLength;storedPages-=record.pages.length;documents.delete(item.id);}
    throw error;
  }
}

async function convert({documentId,pageIndex,options}) {
  const record=documents.get(documentId);
  if(!record)throw new Error('文件已清空，请重新载入。');
  if(!Number.isInteger(pageIndex)||pageIndex<0||pageIndex>=record.pages.length)throw new Error('页码无效');
  const scale=Number(options.scale),dpi=Number(options.dpi),threshold=Number(options.threshold);
  if(!Number.isFinite(scale)||scale<=0||scale>1000||!Number.isFinite(dpi)||dpi<100||dpi>600||!Number.isFinite(threshold)||threshold<40||threshold>240)throw new Error('转换参数无效');
  const page=record.doc.loadPage(pageIndex);
  try {
    const info=record.pages[pageIndex];
    const mode=options.mode==='scan'||(options.mode==='auto'&&info.recommendedMode==='scan')?'scan':'vector';
    let converted;
    if(mode==='scan') {
      const bounds=page.getBounds(),w=bounds[2]-bounds[0],h=bounds[3]-bounds[1];
      if(w*h*(dpi/72)**2>30000000)throw new Error('扫描渲染超过 3000 万像素，请降低 DPI。');
      const pix=render(page,dpi,30000000);
      let image;
      try {
        const width=pix.getWidth(),height=pix.getHeight(),channels=pix.getNumberOfComponents();
        const source=pix.getPixels(),rgba=new Uint8ClampedArray(width*height*4);
        for(let i=0,j=0;i<source.length;i+=channels,j+=4){
          const gray=source[i]*.299+source[i+1]*.587+source[i+2]*.114;
          const value=gray<threshold?0:255;
          rgba[j]=rgba[j+1]=rgba[j+2]=value;rgba[j+3]=255;
        }
        image=new ImageData(rgba,width,height);
      }finally{pix.destroy();}
      const svg=await potrace(image,{extractcolors:false,posterizelevel:2,turdsize:2,turnpolicy:4,alphamax:1,opticurve:1,opttolerance:.2,pathonly:false});
      converted=svgToDxf(svg,w,h,options);
      converted.warnings.unshift('扫描件生成独立轮廓线段，可能存在双边轮廓；文字未恢复为原生文字。');
    } else {
      if(info.recommendedMode==='scan')throw new Error('此页主体为扫描图，矢量模式会遗漏图纸。请选择自动或扫描模式。');
      converted=vectorPageToDxf(page,options);
    }
    if(converted.entityCount<=0)throw new Error('未检测到可编辑线段，不生成空 CAD。');
    const dwg=dxf_to_dwg(converted.dxf);
    const manifest=JSON.parse(inspect_dwg(dwg));
    if(manifest.entities!==converted.entityCount) {
      // The neutral reader may count only model-space entities; compare the explicit field when present.
      const count=manifest.entity_count??manifest.entities;
      if(typeof count==='number'&&count!==converted.entityCount)throw new Error('DWG 回读图元数量不匹配，已停止交付。');
    }
    return {...converted,dwg,preview:preview(page),mode,dwgVersion:'AC1027',verification:manifest,
      measurementMm:converted.calibration?.measurementMm,measurementErrorMm:converted.calibration?.errorMm};
  }finally{page.destroy();}
}

async function dispatch(type,payload) {
  if(type==='inspect')return inspect(payload);
  if(type==='convert')return convert(payload);
  if(type==='preview'){
    const record=documents.get(payload.documentId);
    if(!record||!Number.isInteger(payload.pageIndex)||payload.pageIndex<0||payload.pageIndex>=record.pages.length)throw new Error('页码无效');
    const page=record.doc.loadPage(payload.pageIndex);
    try{return {preview:preview(page)};}finally{page.destroy();}
  }
  if(type==='clear'){
    for(const value of documents.values())value.doc.destroy();
    documents.clear();storedBytes=storedPages=0;
    return {cleared:true};
  }
  throw new Error('未知操作');
}
let sequence=Promise.resolve();
self.onmessage=({data})=>{
  const {id,type,payload}=data;
  sequence=sequence.then(async()=>{
    try{await ready;const result=await dispatch(type,payload||{});postMessage({id,ok:true,result});}
    catch(error){postMessage({id,ok:false,error:error.message||String(error)});}
  });
};
