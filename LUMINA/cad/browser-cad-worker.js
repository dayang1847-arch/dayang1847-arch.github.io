/* OpenCascade executes in a separate browser worker; cancelling terminates it. */
importScripts('./occt-import-js.js');
self.onmessage=async({data:{bytes,format,quality}})=>{
  try{
    const lib=await occtimportjs({locateFile:()=>new URL('./occt-import-js.wasm',self.location.href).href});
    const options={linearUnit:'meter',linearDeflectionType:'bounding_box_ratio',linearDeflection:quality==='low'?.006:.002,angularDeflection:.35};
    const result=/\.i(gs|ges)$/i.test(format)?lib.ReadIgesFile(new Uint8Array(bytes),options):lib.ReadStepFile(new Uint8Array(bytes),options);
    if(!result.success||!result.meshes?.length)throw new Error('CAD 文件未包含可显示的表面，或文件无法解析。');
    const triangles=result.meshes.reduce((sum,m)=>sum+m.index.array.length/3,0);
    if(triangles>1500000)throw new Error('模型超过 150 万三角面，请简化转换或精简结构件后重试。');
    const json=JSON.stringify(result);if(new TextEncoder().encode(json).length>220*1024*1024)throw new Error('展示网格超过大小上限，请简化模型。');
    self.postMessage({json,triangles,meshCount:result.meshes.length});
  }catch(e){self.postMessage({error:e.message||'浏览器模型转换失败'});}
};
