const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const directory=JSON.parse(fs.readFileSync(require.resolve('../supplier-directory.json'),'utf8'));
const catalog=JSON.parse(fs.readFileSync(require.resolve('../supplier-catalog.json'),'utf8'));
async function app(fail=false){
 let bad=fail,html='',opened=null;const routes=[],inputs={};
 const box={console,URL,URLSearchParams,queueMicrotask,setTimeout,structuredClone,location:{search:''},state:{page:'research'},pageInfo:{},suppliersPage:()=>'',selection:()=>'',overview:()=>'',esc:v=>String(v??''),icon:()=>'',render:()=>html=box.SM.renderPage(),go:p=>{box.state.page=p;routes.push(p);},toast:()=>{},closeModal:()=>{},modal:(title,body)=>opened={title,body},document:{querySelector:()=>({classList:{add:()=>{}}})},localStorage:{getItem:()=>null},fetch:async url=>bad?{ok:false,status:503}:{ok:true,json:async()=>structuredClone(url.includes('supplier-directory')?directory:catalog)}};
 box.window=box;vm.createContext(box);vm.runInContext(fs.readFileSync(require.resolve('../catalog.js'),'utf8'),box);vm.runInContext(fs.readFileSync(require.resolve('../supplier-directory.js'),'utf8'),box);box.SM.renderPage();await new Promise(setImmediate);
 const button=(selector,dataset={})=>{const b={dataset};box.SM.bind({querySelectorAll:s=>s===selector?[b]:[],querySelector:sel=>inputs[sel]||null});return b;};
 return{box,button,routes,inputs,html:()=>html,opened:()=>opened,recover:()=>bad=false};
}
test('Every public supplier has evidence; groups stay separate and business qualifications remain unknown',()=>{
 assert.equal(directory.suppliers.length,6);assert.equal(new Set(directory.suppliers.map(s=>s.id)).size,6);
 const docs=new Map(directory.documents.map(d=>[d.id,d]));
 for(const s of directory.suppliers){
  assert.ok(Object.values(s.procurement).every(v=>v===null));
  assert.equal(s.status,'catalog_profile_unverified');
  const related=catalog.products.filter(p=>p.supplier_id===s.id);assert.equal(s.statistics.products,related.length);assert.equal(s.statistics.specifications,related.reduce((n,p)=>n+p.specifications.length,0));
  const sources=[s.name_source,s.english_name.source,s.region.source,...s.contacts.map(x=>x.source),...s.locations.map(x=>x.source),...s.product_scope.map(x=>x.source),...s.certification_claims.map(x=>x.source),...s.related_entities.map(x=>x.source)];
  for(const ref of sources){assert.ok(docs.has(ref.document_id));assert.ok(ref.pdf_page>=1&&ref.pdf_page<=docs.get(ref.document_id).page_count);assert.ok(ref.excerpt);}
  assert.ok(s.certification_claims.every(c=>c.expiry===null&&c.verification==='catalog_claim_unverified'));
 }
 assert.equal(directory.suppliers.find(s=>s.id==='ghgm').contacts.filter(c=>c.kind==='email').length,0);
 assert.equal(directory.suppliers.find(s=>s.id==='gaochao').founded_year,null);
 assert.equal(directory.statistics.products,catalog.products.length);
 assert.equal(directory.suppliers.find(s=>s.id==='heda').catalog_status,'pending_extraction');
});
test('Management replaces fictional supplier cards and scores with actual profiles and explicit gaps',async()=>{
 const a=await app(),html=a.box.SM.renderPage();
 for(const s of directory.suppliers)assert.ok(html.includes(s.name));
 for(const fake of ['青禾线缆','远川电子','森屿精工','澄源高材','28 天后到期','重算绩效评分','A 核心'])assert.ok(!html.includes(fake));
 assert.ok(html.includes('产品待结构化'));assert.ok(html.includes('未提供记录'));
 await a.box.SM.detail('heda');assert.ok(a.opened().body.includes('heda@hedaele.com'));assert.ok(a.opened().body.includes('尚未完成产品型号'));assert.ok(!a.opened().body.includes('scorebar'));
});
test('Supplier product drill-through sets the actual catalog filter without mutating source records',async()=>{
 const a=await app();a.box.SC.renderPage();await new Promise(setImmediate);
 a.button('[data-sm-products]',{smProducts:'fulang'}).onclick();assert.equal(a.routes.at(-1),'selection');assert.equal(a.box.SC.getRows().length,94);assert.ok(a.box.SC.getRows().every(p=>p.supplier_id==='fulang'));assert.equal(catalog.products.length,1023);
});
test('Province and coverage filters include the pending Heda profile and support clearing',async()=>{
 const a=await app();a.inputs['#sm-query']={value:''};a.inputs['#sm-province']={value:'浙江'};a.box.SM.bind({querySelectorAll:()=>[],querySelector:s=>a.inputs[s]||null});a.inputs['#sm-province'].onchange();assert.deepEqual(Array.from(a.box.SM.getRows(),s=>s.id),['heda']);
 a.button('[data-sm-clear]').onclick();assert.equal(a.box.SM.getRows().length,6);
 a.inputs['#sm-coverage']={value:'pending_extraction'};a.box.SM.bind({querySelectorAll:()=>[],querySelector:s=>a.inputs[s]||null});a.inputs['#sm-coverage'].onchange();assert.equal(a.box.SM.getRows().length,1);
});
test('Failed directory load never falls back to fictional companies and can be retried',async()=>{
 const a=await app(true);assert.ok(a.box.SM.renderPage().includes('加载失败'));assert.ok(!a.box.SM.renderPage().includes('青禾线缆'));a.recover();await a.button('[data-sm-retry]').onclick();assert.equal(a.box.SM.getData().suppliers.length,6);
});
