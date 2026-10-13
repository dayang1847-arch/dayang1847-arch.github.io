import Fastify from 'fastify';
import multipart from '@fastify/multipart';
import staticFiles from '@fastify/static';
import websocket from '@fastify/websocket';
import { promises as fs, createReadStream } from 'node:fs';
import { randomUUID } from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';
import { Store, productInputSchema, planSchema } from './storage';
import { ConversionQueue } from './jobs';
import { SimulatedAdapter } from './devices';
import { parseIES, serializeIES } from '../shared/photometry';
import type { Product, Fixture, ScenePlan } from '../shared/types';

const projectRoot=fileURLToPath(new URL('../',import.meta.url));
export async function createApp(dataDir=process.env.LIGHTING_DATA_DIR||path.join(projectRoot,'data'),dev=false){
  const app=Fastify({logger:false,bodyLimit:4*1024*1024});
  const store=new Store(dataDir);await store.init();await store.recover();
  const clients=new Set<any>();
  const emit=(event:unknown)=>{const value=JSON.stringify(event);for(const socket of clients)if(socket.readyState===1)socket.send(value);};
  const queue=new ConversionQueue(store,emit),devices=new SimulatedAdapter(store,emit);await devices.init();
  await app.register(multipart,{limits:{fileSize:100*1024*1024,files:1,fields:10}});
  await app.register(websocket);
  app.addHook('onRequest',async(req,reply)=>{
    const origin=req.headers.origin;if(origin){let host='';try{host=new URL(origin).hostname;}catch{}if(!['127.0.0.1','localhost','[::1]'].includes(host)){throw Object.assign(new Error('此本地应用仅接受本机页面请求'),{statusCode:403});}}
    reply.header('X-Content-Type-Options','nosniff');
  });
  app.setErrorHandler((error,req,reply)=>{const message=error instanceof z.ZodError?'参数格式错误：'+error.issues.map(i=>`${i.path.join('.')} ${i.message}`).slice(0,3).join('；'):error instanceof Error?error.message:'操作失败';reply.code((error as any).statusCode||400).send({error:message});});
  app.get('/api/health',async()=>({ok:true,version:'1.0.0'}));
  app.get('/api/state',async()=>({products:store.catalog.products,plans:store.plans,devices:devices.status(),jobs:[...queue.jobs.values()],dataPath:store.root}));
  app.get('/api/products/:id/ies',async(req,reply)=>{
    const {id}=req.params as {id:string},query=req.query as {version?:string;download?:string};
    const p=store.catalog.products.find(p=>p.id===id&&p.version===Number(query.version||1));
    if(!p?.photometry)return reply.code(404).send({error:'此产品版本尚未上传 IES'});
    const bytes=p.sample?Buffer.from(serializeIES(p.photometry)):await fs.readFile(path.join(store.assetDir(p.assetId!),'photometry.ies'));const text=bytes.toString('utf8');
    const filename=p.sample?`${p.model}-DEMO.ies`:p.photometry.filename;
    if(query.download==='1'){reply.header('Content-Disposition',`attachment; filename*=UTF-8''${encodeURIComponent(filename)}`).type('application/octet-stream');return reply.send(bytes);}
    return {filename,text,source:p.sample?'generated':'original',productId:p.id,version:p.version};
  });
  app.get('/api/events',{websocket:true},(socket)=>{clients.add(socket);socket.send(JSON.stringify({type:'devices',state:devices.status()}));socket.on('close',()=>clients.delete(socket));});
  app.post('/api/products',async req=>{
    const input=productInputSchema.parse(req.body);let photometry:Product['photometry'],format:Product['modelFormat'],hasThumbnail=false;
    if(input.assetId){
      const files=await fs.readdir(store.assetDir(input.assetId));
      hasThumbnail=files.includes('thumbnail.png');
      if(files.includes('photometry.ies')){let originalName=`${input.model}.ies`;try{originalName=JSON.parse(await fs.readFile(path.join(store.assetDir(input.assetId),'asset.json'),'utf8')).iesFilename||originalName;}catch{}photometry=parseIES(await fs.readFile(path.join(store.assetDir(input.assetId),'photometry.ies'),'utf8'),originalName);}
      if(files.includes('source.glb'))format='glb';else if(files.includes('mesh.json'))format='cad';
    }
    if(input.status==='ready'&&(!photometry||!format))throw new Error('请先完成模型转换和 IES 上传，再保存为可用产品。');
    const id=input.id||`product-${randomUUID()}`,previous=store.catalog.products.filter(p=>p.id===id),version=previous.reduce((m,p)=>Math.max(m,p.version),0)+1;
    const product:Product={...input,id,version,sample:false,photometry,modelFormat:format,createdAt:new Date().toISOString(),thumbnail:input.assetId&&hasThumbnail?`/api/assets/${input.assetId}/thumbnail.png`:undefined};
    if(product.cctRange&&(product.cct<product.cctRange[0]||product.cct>product.cctRange[1]))throw new Error('额定色温必须在可调范围内');
    await store.addProduct(product);emit({type:'catalog'});return product;
  });
  app.post('/api/plans',async req=>{const plan=planSchema.parse(req.body) as ScenePlan;const saved=await store.savePlan(plan);emit({type:'plans'});return saved;});
  app.delete('/api/plans/:id',async req=>{const {id}=req.params as {id:string};if(!/^[a-zA-Z0-9-]+$/.test(id))throw new Error('方案编号错误');if(!store.plans.some(p=>p.id===id))throw new Error('方案不存在');await fs.rm(path.join(store.root,'plans',`${id}.json`),{force:true});store.plans=store.plans.filter(p=>p.id!==id);emit({type:'plans'});return {ok:true};});
  app.post('/api/uploads',async req=>{
    const file=await req.file();if(!file)throw new Error('请选择模型文件');
    const ext=path.extname(file.filename).toLowerCase();if(!['.step','.stp','.iges','.igs','.glb'].includes(ext))throw new Error('支持 STEP、IGES 和 GLB 模型');
    const bytes=await file.toBuffer();if(!bytes.length)throw new Error('模型文件为空');
    if(ext==='.glb'&&(bytes.length<12||bytes.toString('ascii',0,4)!=='glTF'||bytes.readUInt32LE(4)!==2||bytes.readUInt32LE(8)!==bytes.length))throw new Error('GLB 文件头错误，请上传 glTF 2.0 二进制模型');
    const assetId=randomUUID(),dir=store.assetDir(assetId);await fs.mkdir(dir,{recursive:true});
    const source=path.join(dir,`source${ext}`);await fs.writeFile(source,bytes);await fs.writeFile(path.join(dir,'asset.json'),JSON.stringify({filename:file.filename,format:ext}));
    if(ext==='.glb')return {assetId,format:'glb',job:null};
    return {assetId,format:'cad',job:queue.enqueue(assetId,file.filename,source)};
  });
  app.post('/api/assets/:id/ies',async req=>{
    const {id}=req.params as {id:string},dir=store.assetDir(id);await fs.mkdir(dir,{recursive:true});
    if(store.catalog.products.some(p=>p.assetId===id))throw new Error('已保存产品的资产不能改写，请先复制资产。');
    const file=await req.file({limits:{fileSize:10*1024*1024}});if(!file||!file.filename.toLowerCase().endsWith('.ies'))throw new Error('请选择 .ies 配光文件');
    const bytes=await file.toBuffer(),photometry=parseIES(bytes.toString('utf8'),file.filename);await fs.writeFile(path.join(dir,'photometry.ies'),bytes);let metadata:any={};try{metadata=JSON.parse(await fs.readFile(path.join(dir,'asset.json'),'utf8'));}catch{}await fs.writeFile(path.join(dir,'asset.json'),JSON.stringify({...metadata,iesFilename:file.filename}));return {photometry};
  });
  app.post('/api/ies/parse',async req=>{const file=await req.file({limits:{fileSize:10*1024*1024}});if(!file)throw new Error('请选择 IES');return {photometry:parseIES((await file.toBuffer()).toString('utf8'),file.filename)};});
  app.post('/api/assets/new',async()=>{const assetId=randomUUID();await fs.mkdir(store.assetDir(assetId),{recursive:true});return {assetId};});
  app.post('/api/assets/:id/clone',async req=>{const {id}=req.params as {id:string},assetId=randomUUID();await fs.cp(store.assetDir(id),store.assetDir(assetId),{recursive:true});return {assetId};});
  app.post('/api/assets/:id/thumbnail',async req=>{
    const {id}=req.params as {id:string},input=z.object({data:z.string().max(3000000)}).parse(req.body);
    if(store.catalog.products.some(p=>p.assetId===id))throw new Error('已保存产品的资产不能改写，请先复制资产。');
    if(!input.data.startsWith('data:image/png;base64,'))throw new Error('缩略图必须是 PNG');
    const bytes=Buffer.from(input.data.split(',')[1],'base64');if(bytes.length<8||bytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('PNG 图片无效');await fs.writeFile(path.join(store.assetDir(id),'thumbnail.png'),bytes);return {ok:true};
  });
  app.get('/api/assets/:id/:filename',async(req,reply)=>{
    const {id,filename}=req.params as {id:string;filename:string};if(!/^(source\.(step|stp|iges|igs|glb)|mesh\.json|photometry\.ies|thumbnail\.png|asset\.json)$/.test(filename))return reply.code(404).send({error:'文件不存在'});
    const file=path.join(store.assetDir(id),filename);try{await fs.access(file);}catch{return reply.code(404).send({error:'文件不存在'});}
    const mime=filename.endsWith('.png')?'image/png':filename.endsWith('.json')?'application/json':filename.endsWith('.glb')?'model/gltf-binary':'application/octet-stream';reply.type(mime);return reply.send(createReadStream(file));
  });
  app.get('/api/jobs',async()=>[...queue.jobs.values()]);
  app.post('/api/jobs/:id/cancel',async req=>queue.cancel((req.params as {id:string}).id));
  app.post('/api/jobs/:id/retry',async req=>{
    const id=(req.params as {id:string}).id,job=queue.jobs.get(id);
    if(job&&store.catalog.products.some(p=>p.assetId===job.assetId))throw new Error('已保存产品的转换资产不能改写，请先复制资产。');
    return queue.retry(id);
  });
  app.get('/api/export',async(req,reply)=>{const {planId}=req.query as {planId?:string};const bytes=await store.exportBundle(planId);reply.header('Content-Disposition',`attachment; filename="lumina-${planId?'scene':'library'}.zip"`).type('application/zip');return reply.send(Buffer.from(bytes));});
  app.post('/api/import',async req=>{const file=await req.file();if(!file||!file.filename.toLowerCase().endsWith('.zip'))throw new Error('请选择系统导出的 ZIP 包');const result=await store.importBundle(await file.toBuffer());emit({type:'catalog'});emit({type:'plans'});return result;});
  app.get('/api/devices',async()=>devices.status());
  app.get('/api/control/diagnostics',async()=>({simulated:true,adapter:{name:'SimulatedAdapter',transport:'本机进程内模拟',connected:devices.state.connected,behavior:devices.state.behavior,bus:0,deviceCount:devices.state.devices.length,boundCount:devices.state.bindings.length,supported:['connect','disconnect','discover','capabilities','setLevel','setCCT','applyScene','status']},runtime:{node:process.version,platform:process.platform,uptime:Math.round(process.uptime()),memoryMB:Math.round(process.memoryUsage().rss/1024/1024),dataPath:store.root},devices:devices.state.devices,bindings:devices.state.bindings,logs:devices.logs}));
  app.post('/api/devices/discover',async()=>devices.audit('gateway.discover',{},async()=>({devices:await devices.discover()})));
  app.post('/api/devices/configure',async req=>{const options=z.object({connected:z.boolean().optional(),behavior:z.enum(['normal','timeout','failure']).optional(),deviceId:z.string().optional(),online:z.boolean().optional()}).parse(req.body);return devices.audit('gateway.configure',options,()=>devices.configure(options));});
  app.post('/api/devices/bind',async req=>{const {fixtureId,deviceId}=z.object({fixtureId:z.string(),deviceId:z.string().nullable()}).parse(req.body);return devices.audit('device.bind',{fixtureId,deviceId},()=>devices.bind(deviceId?{fixtureId,deviceId}:null,fixtureId));});
  app.post('/api/devices/auto-bind',async req=>{const plan=planSchema.parse(req.body) as ScenePlan;store.validatePlan(plan);return devices.audit('scene.bind',{planId:plan.id,fixtureCount:plan.fixtures.length},()=>devices.autoBind(plan.fixtures,store.catalog.products));});
  app.post('/api/devices/apply',async req=>{
    const plan=planSchema.parse(req.body) as ScenePlan;store.validatePlan(plan);
    const commands=plan.fixtures.flatMap((f:Fixture)=>{const binding=devices.status().bindings.find(b=>b.fixtureId===f.id);if(!binding)return [];const product=store.catalog.products.find(p=>p.id===f.productId&&p.version===f.productVersion)!;return [{id:binding.deviceId,level:f.level,...(product.cctRange?{cct:f.cct}:{})}];});
    if(!commands.length)throw new Error('请先将场景灯具绑定到模拟设备');await devices.applyScene(commands);return {state:devices.status(),applied:commands.length,unbound:plan.fixtures.length-commands.length};
  });
  app.addHook('onClose',async()=>{queue.close();for(const socket of clients)socket.close();});
  if(dev){
    const {createServer:createViteServer}=await import('vite');
    const vite=await createViteServer({root:projectRoot,server:{middlewareMode:true,hmr:false},appType:'spa'});
    app.get('/*',async(req,reply)=>{reply.hijack();vite.middlewares(req.raw,reply.raw,()=>{reply.raw.statusCode=404;reply.raw.end('Not found');});});
    app.addHook('onClose',async()=>{await vite.close();});
  }else{
    await app.register(staticFiles,{root:path.join(projectRoot,'dist'),prefix:'/'});
    app.setNotFoundHandler((req,reply)=>req.url.startsWith('/api/')?reply.code(404).send({error:'接口不存在'}):reply.sendFile('index.html'));
  }
  return {app,store,devices,queue};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const dev=process.argv.includes('--dev');
  const {app}=await createApp(undefined,dev);const port=Number(process.env.LIGHTING_PORT||3040);
  try{await app.listen({host:'127.0.0.1',port});console.log(`LUMINA 照明演示系统已启动：http://127.0.0.1:${port}`);}
  catch(e){console.error('启动失败：'+(e as Error).message);process.exit(1);}
  process.on('SIGINT',async()=>{await app.close();process.exit(0);});process.on('SIGTERM',async()=>{await app.close();process.exit(0);});
}
