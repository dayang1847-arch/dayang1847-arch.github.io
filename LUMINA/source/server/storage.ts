import { promises as fs } from 'node:fs';
import path from 'node:path';
import { randomUUID, createHash } from 'node:crypto';
import { zipSync, unzipSync, strToU8, strFromU8 } from 'fflate';
import { z } from 'zod';
import { seedProducts, makePlan } from '../shared/scenes';
import type { BundleManifest, Catalog, Product, ScenePlan } from '../shared/types';

const vec=z.tuple([z.number().finite(),z.number().finite(),z.number().finite()]);
const range=z.tuple([z.number().min(1000).max(20000),z.number().min(1000).max(20000)]).refine(v=>v[0]<=v[1]);
export const calibrationSchema=z.object({scale:z.number().positive().max(1000),origin:vec,rotation:vec,emitter:vec,direction:vec.refine(v=>Math.hypot(...v)>.0001),c0:z.number().finite(),material:z.enum(['original','black','white','aluminum','brass']),emissiveMeshes:z.array(z.string().max(200)).max(500)});
export const productInputSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9-]+$/).optional(),name:z.string().trim().min(1).max(120),model:z.string().trim().min(1).max(120),category:z.enum(['筒灯','射灯','线性灯','路灯','庭院灯','投光灯']),watts:z.number().positive().max(10000).nullable(),cct:z.number().min(1000).max(20000),cctRange:range.nullable(),sceneTypes:z.array(z.enum(['indoor','outdoor'])).min(1).max(2),assetId:z.string().regex(/^[a-zA-Z0-9-]+$/).optional(),calibration:calibrationSchema,status:z.enum(['draft','ready'])});
const fixtureSchema=z.object({id:z.string().min(1).max(160),productId:z.string().min(1).max(160),productVersion:z.number().int().positive(),position:vec,rotation:vec,level:z.number().min(0).max(100),cct:z.number().min(1000).max(20000),group:z.string().max(80),slotId:z.string().max(100).optional()});
export const planSchema=z.object({id:z.string().regex(/^[a-zA-Z0-9-]+$/),schemaVersion:z.literal(1),name:z.string().trim().min(1).max(160),sceneType:z.enum(['indoor','outdoor']),fixtures:z.array(fixtureSchema).max(500),presets:z.array(z.object({id:z.string().max(160),name:z.string().max(100),values:z.array(z.object({id:z.string(),level:z.number().min(0).max(100),cct:z.number().min(1000).max(20000)})).max(500)})).max(50),environment:z.enum(['day','dusk','night']),camera:z.object({position:vec,target:vec}).optional(),revision:z.number().int().nonnegative(),savedAt:z.string().optional()});
const sha=(v:Uint8Array)=>createHash('sha256').update(v).digest('hex');
const SAFE_ID=/^[a-zA-Z0-9-]+$/;
const SAFE_FILE=/^(source\.(step|stp|iges|igs|glb)|mesh\.json|photometry\.ies|thumbnail\.png|asset\.json)$/;
export class Store {
  root:string;
  catalog:Catalog={schemaVersion:1,products:[]};
  plans:ScenePlan[]=[];
  private writes=Promise.resolve();
  constructor(root:string){this.root=path.resolve(root);}
  async init(){
    await fs.mkdir(path.join(this.root,'assets'),{recursive:true});await fs.mkdir(path.join(this.root,'plans'),{recursive:true});
    try{this.catalog=JSON.parse(await fs.readFile(path.join(this.root,'catalog.json'),'utf8'));if(this.catalog.schemaVersion!==1)throw new Error('不支持的产品库版本');}
    catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;this.catalog={schemaVersion:1,products:seedProducts()};await this.atomic('catalog.json',this.catalog);}
    const files=await fs.readdir(path.join(this.root,'plans'));
    this.plans=await Promise.all(files.filter(f=>f.endsWith('.json')).map(async f=>planSchema.parse(JSON.parse(await fs.readFile(path.join(this.root,'plans',f),'utf8')))));
    if(!this.plans.length){await this.savePlan(makePlan('indoor'));await this.savePlan(makePlan('outdoor'));}
  }
  atomic(relative:string,value:unknown){
    const op=this.writes.then(async()=>{const dest=path.join(this.root,relative),temp=dest+`.${randomUUID()}.tmp`;await fs.mkdir(path.dirname(dest),{recursive:true});await fs.writeFile(temp,JSON.stringify(value));await fs.rename(temp,dest);});
    this.writes=op.catch(()=>{});return op;
  }
  assetDir(id:string){if(!SAFE_ID.test(id))throw new Error('无效的资产编号');return path.join(this.root,'assets',id);}
  async addProduct(p:Product){
    const next={...this.catalog,products:[...this.catalog.products,p]};await this.atomic('catalog.json',next);this.catalog=next;return p;
  }
  validatePlan(plan:ScenePlan,products=this.catalog.products){
    const keys=new Map(products.map(p=>[`${p.id}@${p.version}`,p]));const ids=new Set<string>();
    for(const f of plan.fixtures){
      if(ids.has(f.id))throw new Error('方案中灯具编号重复');ids.add(f.id);
      const p=keys.get(`${f.productId}@${f.productVersion}`);if(!p||p.status!=='ready')throw new Error('方案引用了不存在或未就绪的产品版本');
      if(!p.sceneTypes.includes(plan.sceneType))throw new Error('灯具不适用于此场景');
      if(p.cctRange&&(f.cct<p.cctRange[0]||f.cct>p.cctRange[1]))throw new Error('灯具色温超出产品范围');
      if(!p.cctRange&&f.cct!==p.cct)throw new Error('固定色温产品不能改变色温');
    }
    for(const pre of plan.presets){if(pre.values.some(v=>!ids.has(v.id)))throw new Error('照明预设引用了不存在的灯具');}
  }
  async savePlan(input:ScenePlan){
    const plan=planSchema.parse(input) as ScenePlan;this.validatePlan(plan);
    const saved={...plan,savedAt:new Date().toISOString()};await this.atomic(`plans/${plan.id}.json`,saved);
    this.plans=[...this.plans.filter(p=>p.id!==plan.id),saved];return saved;
  }
  async exportBundle(planId?:string){
    const plans=planId?this.plans.filter(p=>p.id===planId):this.plans;
    if(!plans.length)throw new Error('没有可导出的方案');
    const refs=new Set(plans.flatMap(p=>p.fixtures.map(f=>`${f.productId}@${f.productVersion}`)));
    const products=planId?this.catalog.products.filter(p=>refs.has(`${p.id}@${p.version}`)):this.catalog.products;
    const out:Record<string,Uint8Array>={},assets:BundleManifest['assets']={};
    for(const id of new Set(products.map(p=>p.assetId).filter(Boolean) as string[])){
      const files=await fs.readdir(this.assetDir(id));assets[id]={files:[]};
      for(const name of files.filter(n=>SAFE_FILE.test(n))){const data=await fs.readFile(path.join(this.assetDir(id),name));out[`assets/${id}/${name}`]=data;assets[id].files.push({name,size:data.length,sha256:sha(data)});}
    }
    const manifest:BundleManifest={schemaVersion:1,products,plans,assets};out['manifest.json']=strToU8(JSON.stringify(manifest));return zipSync(out,{level:6});
  }
  async importBundle(buffer:Uint8Array){
    let total=0;
    const files=unzipSync(buffer,{filter:file=>{total+=file.originalSize;if(total>512*1024*1024||file.originalSize>220*1024*1024)throw new Error('导入包解压后超过大小上限');return true;}});
    if(!files['manifest.json'])throw new Error('导入包缺少 manifest.json');
    const manifest=JSON.parse(strFromU8(files['manifest.json'])) as BundleManifest;
    if(manifest.schemaVersion!==1||!Array.isArray(manifest.products)||!Array.isArray(manifest.plans)||!manifest.assets||manifest.products.length>2000||manifest.plans.length>200)throw new Error('不支持的方案包格式');
    const photometrySchema=z.object({version:z.string(),labels:z.record(z.string(),z.string()),vertical:z.array(z.number().finite()).min(2).max(2000),horizontal:z.array(z.number().finite()).min(1).max(2000),candela:z.array(z.array(z.number().nonnegative().finite()).max(2000)).max(2000),watts:z.number().nonnegative().nullable(),lumens:z.number().nonnegative().finite(),absolute:z.boolean(),dimensions:vec,units:z.literal('meter'),peak:z.number().nonnegative().finite(),filename:z.string()});
    const ps=z.object({...productInputSchema.shape,id:z.string().regex(SAFE_ID),version:z.number().int().positive(),sample:z.boolean(),createdAt:z.string(),photometry:photometrySchema.optional(),modelFormat:z.enum(['cad','glb']).optional(),thumbnail:z.string().optional()});
    const products=manifest.products.map(p=>ps.parse(p) as Product);
    const plans=manifest.plans.map(p=>planSchema.parse(p) as ScenePlan);
    if(new Set(products.map(p=>`${p.id}@${p.version}`)).size!==products.length)throw new Error('方案包包含重复产品版本');
    for(const p of products){if(p.status==='ready'&&!p.photometry)throw new Error('就绪产品缺少配光');if(p.photometry&&(p.photometry.candela.length!==p.photometry.horizontal.length||p.photometry.candela.some(r=>r.length!==p.photometry!.vertical.length)))throw new Error('配光矩阵尺寸错误');if(p.assetId&&!manifest.assets[p.assetId])throw new Error('方案包缺少产品资产');if(!p.sample&&p.status==='ready'&&!p.assetId)throw new Error('产品缺少模型');}
    for(const plan of plans)this.validatePlan(plan,products);
    const allowed=new Set(['manifest.json']);
    for(const [id,asset] of Object.entries(manifest.assets)){
      if(!SAFE_ID.test(id)||!Array.isArray(asset.files))throw new Error('无效的资产路径');
      for(const f of asset.files){const key=`assets/${id}/${f.name}`;if(!SAFE_FILE.test(f.name)||!files[key]||files[key].length!==f.size||sha(files[key])!==f.sha256)throw new Error('资产缺失或完整性校验失败');allowed.add(key);}
    }
    if(Object.keys(files).some(n=>!allowed.has(n)))throw new Error('方案包存在未声明的文件');
    const assetIds=new Map(Object.keys(manifest.assets).map(id=>[id,randomUUID()])),productIds=new Map(products.map(p=>[p.id,`import-${randomUUID()}`]));
    const importedProducts=products.map(p=>({...p,id:productIds.get(p.id)!,assetId:p.assetId?assetIds.get(p.assetId):undefined,thumbnail:p.assetId&&p.thumbnail?`/api/assets/${assetIds.get(p.assetId)}/thumbnail.png`:undefined}));
    const importedPlans=plans.map(p=>{
      const ids=new Map(p.fixtures.map(f=>[f.id,randomUUID()]));return {...p,id:`import-${randomUUID()}`,name:p.name+' · 导入',fixtures:p.fixtures.map(f=>({...f,id:ids.get(f.id)!,productId:productIds.get(f.productId)!})),presets:p.presets.map(pre=>({...pre,id:randomUUID(),values:pre.values.map(v=>({...v,id:ids.get(v.id)!}))})),savedAt:new Date().toISOString()};
    });
    // All validation happens before writing. A transaction marker makes interrupted imports recoverable.
    const transaction=`import-${randomUUID()}`,stage=path.join(this.root,transaction);
    await fs.mkdir(stage,{recursive:true});
    try{
      for(const [oldId,newId]of assetIds){const dir=path.join(stage,newId);await fs.mkdir(dir);for(const f of manifest.assets[oldId].files)await fs.writeFile(path.join(dir,f.name),files[`assets/${oldId}/${f.name}`]);}
      for(const newId of assetIds.values())await fs.rename(path.join(stage,newId),this.assetDir(newId));
      const next={...this.catalog,products:[...this.catalog.products,...importedProducts]};
      // Persist a recovery journal before updating the two indexes.
      await this.atomic('pending-import.json',{catalog:next,plans:importedPlans});
      await this.atomic('catalog.json',next);this.catalog=next;
      for(const p of importedPlans)await this.savePlan(p);
      await fs.rm(path.join(this.root,'pending-import.json'),{force:true});
      return {products:importedProducts.length,plans:importedPlans.length,plan:importedPlans[0]};
    }finally{await fs.rm(stage,{force:true,recursive:true});}
  }
  async recover(){
    try{const pending=JSON.parse(await fs.readFile(path.join(this.root,'pending-import.json'),'utf8'));await this.atomic('catalog.json',pending.catalog);this.catalog=pending.catalog;for(const p of pending.plans)await this.savePlan(p);await fs.rm(path.join(this.root,'pending-import.json'));}
    catch(e){if((e as NodeJS.ErrnoException).code!=='ENOENT')throw e;}
  }
}
