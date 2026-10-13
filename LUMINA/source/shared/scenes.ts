import { DEFAULT_CALIBRATION, type Product, type SceneType, type ScenePlan, type Slot, type Vec3, type CameraPose } from './types';
import { samplePhotometry } from './photometry';
export const SCENE_INFO = {
  indoor: {name:'办公展厅',english:'THE LIGHT GALLERY',description:'光，赋予空间新的表达',dimensions:'18 × 14 m',groups:['展示区','会议区','休憩区'],width:18,depth:14,height:4.2},
  outdoor: {name:'户外园区',english:'THE NIGHT LANDSCAPE',description:'让每一段夜色，都恰到好处',dimensions:'48 × 36 m',groups:['道路','步道','景观区'],width:48,depth:36,height:8},
};
export const CATEGORIES = ['全部','筒灯','射灯','线性灯','路灯','庭院灯','投光灯'] as const;
export function seedProducts():Product[] {
  const defs:[string,string,Product['category'],number,number,number,[number,number]|null,SceneType[]][]=[
    ['DL-01','简光 · 深藏筒灯','筒灯',12,960,3000,[2700,6500],['indoor']],
    ['SP-01','聚光 · 轨道射灯','射灯',18,1440,3000,[2700,6500],['indoor']],
    ['LN-01','流光 · 线性吊灯','线性灯',32,3200,4000,[2700,6500],['indoor']],
    ['DL-02','柔光 · 广角筒灯','筒灯',20,2000,4000,null,['indoor']],
    ['ST-01','远光 · 园区路灯','路灯',80,11200,4000,[3000,5700],['outdoor']],
    ['GD-01','微光 · 庭院灯','庭院灯',18,1620,3000,null,['outdoor']],
    ['FL-01','映光 · 景观投光灯','投光灯',35,3500,3000,[2700,6500],['outdoor']],
    ['LN-02','漫光 · 户外线性灯','线性灯',24,1920,3000,null,['outdoor']],
  ];
  return defs.map(([model,name,category,watts,lm,cct,cctRange,sceneTypes])=>({id:model,version:1,name,model,category,watts,cct,cctRange,sceneTypes,status:'ready',sample:true,photometry:samplePhotometry(category,lm,watts),calibration:{...structuredClone(DEFAULT_CALIBRATION),emitter:category==='路灯'?[1.2,0,0]:[0,0,0]},createdAt:'2026-10-13T00:00:00Z'}));
}
export function sceneSlots(type:SceneType):Slot[] {
  const slots:Slot[]=[];
  const add=(id:string,position:Vec3,category:Slot['category'],group:string,rotation:Vec3=[0,0,0])=>slots.push({id,position,category,group,rotation,label:`${group} · ${category}`});
  if(type==='indoor'){
    [-6,-3,0].forEach((x,i)=>[-4,-1,2].forEach((z,j)=>add(`display-${i}-${j}`,[x,3.9,z],'筒灯','展示区')));
    [-5.5,-2.5].forEach((x,i)=>add(`spot-${i}`,[x,3.8,-5.2],'射灯','展示区',[30,0,0]));
    [1.8,4.8].forEach((x,i)=>add(`meeting-${i}`,[x,3.1,-2.2],'线性灯','会议区'));
    [2.8,5.8].forEach((x,i)=>[2.4,4.8].forEach((z,j)=>add(`lounge-${i}-${j}`,[x,3.9,z],'筒灯','休憩区')));
  }else{
    [-14,-4,6,16].forEach((z,i)=>{ add(`road-west-${i}`,[-10,7,z],'路灯','道路');add(`road-east-${i}`,[0,7,z],'路灯','道路',[0,180,0]); });
    [-14,-7,0,7,14].forEach((z,i)=>add(`path-${i}`,[10,1.1,z],'庭院灯','步道'));
    [[16,-12],[16,-1],[16,10],[-16,-8],[-16,8]].forEach(([x,z],i)=>add(`landscape-${i}`,[x,.35,z],'投光灯','景观区',[110,i*35,0]));
  }
  return slots;
}
export function makePlan(type:SceneType):ScenePlan {
  const slots=sceneSlots(type);
  const fixtures=slots.map((s,i)=>({id:`${type}-fixture-${i}`,productId:s.category==='筒灯'?'DL-01':s.category==='射灯'?'SP-01':s.category==='线性灯'?'LN-01':s.category==='路灯'?'ST-01':s.category==='庭院灯'?'GD-01':'FL-01',productVersion:1,position:[...s.position] as Vec3,rotation:[...s.rotation] as Vec3,level:100,cct:s.category==='路灯'?4000:3000,group:s.group,slotId:s.id}));
  return {id:`default-${type}`,schemaVersion:1,name:`${SCENE_INFO[type].name} · 默认方案`,sceneType:type,fixtures,environment:type==='indoor'?'day':'night',revision:1,presets:[
    {id:'bright',name:'明亮工作',values:fixtures.map(f=>({id:f.id,level:100,cct:4000}))},
    {id:'warm',name:'温暖氛围',values:fixtures.map(f=>({id:f.id,level:60,cct:3000}))},
    {id:'focus',name:'重点展示',values:fixtures.map(f=>({id:f.id,level:f.group==='展示区'||f.group==='景观区'?100:35,cct:3000}))},
    {id:'off',name:'全部关闭',values:fixtures.map(f=>({id:f.id,level:0,cct:f.cct}))},
  ]};
}
export const CAMERA_STOPS:Record<SceneType,CameraPose[]>={
  indoor:[{position:[20,17,23],target:[0,1,0]},{position:[-6,2.3,6],target:[-3,1.6,-4]},{position:[7,2.1,3],target:[3.5,1,-2.5]},{position:[7,2.2,6],target:[3.2,1.2,3.8]}],
  outdoor:[{position:[36,27,38],target:[0,0,0]},{position:[-5,2.5,18],target:[-5,2,-12]},{position:[12,2.2,13],target:[10,1,-12]},{position:[23,4,12],target:[14,1,0]}],
};
