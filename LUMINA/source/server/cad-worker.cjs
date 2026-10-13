const fs = require('node:fs');
const occt = require('occt-import-js');
process.on('message', async ({source, target, format, quality}) => {
  try {
    const lib = await occt();
    const bytes = fs.readFileSync(source);
    const options = {linearUnit:'meter',linearDeflectionType:'bounding_box_ratio',linearDeflection:quality==='low'?.006:.002,angularDeflection:.35};
    const result = /\.i(gs|ges)$/i.test(format) ? lib.ReadIgesFile(bytes, options) : lib.ReadStepFile(bytes, options);
    if (!result.success || !result.meshes?.length) throw new Error('CAD 文件未包含可显示的表面，或文件无法解析。');
    let triangles = result.meshes.reduce((n,m)=>n+m.index.array.length/3,0);
    if(triangles>1500000)throw new Error('模型超过 150 万三角面，请选择简化转换或精简结构件后重试。');
    process.send({stage:'writing'});
    const json=JSON.stringify(result);
    if(Buffer.byteLength(json)>220*1024*1024)throw new Error('展示网格超过大小上限，请简化模型。');
    fs.writeFileSync(target+'.tmp',json);fs.renameSync(target+'.tmp',target);
    process.send({done:true,meshCount:result.meshes.length,triangles});
  } catch(error) { process.send({error:error.message || '模型转换失败'}); }
  finally { process.exit(0); }
});
