import type { AnalysisPlane, AnalysisResult, Fixture, Photometry, Product, Vec3 } from './types';

const rad = Math.PI / 180;
export const clamp = (v: number, a: number, b: number) => Math.max(a, Math.min(b, v));
export const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
export const length = (a: Vec3) => Math.hypot(...a);
export const normalize = (a: Vec3): Vec3 => { const l = length(a); return l ? a.map(v => v / l) as Vec3 : [0, -1, 0]; };
export const cross = (a: Vec3, b: Vec3): Vec3 => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
export function rotate(v: Vec3, rotation: Vec3, inverse = false): Vec3 {
  let [x,y,z] = v;
  const rx = (a: number) => { const c=Math.cos(a),s=Math.sin(a); [y,z]=[y*c-z*s,y*s+z*c]; };
  const ry = (a: number) => { const c=Math.cos(a),s=Math.sin(a); [x,z]=[x*c+z*s,-x*s+z*c]; };
  const rz = (a: number) => { const c=Math.cos(a),s=Math.sin(a); [x,y]=[x*c-y*s,x*s+y*c]; };
  if (inverse) { rx(-rotation[0]*rad); ry(-rotation[1]*rad); rz(-rotation[2]*rad); }
  else { rz(rotation[2]*rad); ry(rotation[1]*rad); rx(rotation[0]*rad); }
  return [x,y,z];
}
export function photometricBasis(direction: Vec3, c0: number): [Vec3, Vec3, Vec3] {
  const a=normalize(direction), seed:Vec3 = Math.abs(a[0]) < .95 ? [1,0,0] : [0,0,1];
  const base = normalize(seed.map((v,i)=>v-dot(seed,a)*a[i]) as Vec3), b=cross(a,base);
  const e1=base.map((v,i)=>v*Math.cos(c0*rad)+b[i]*Math.sin(c0*rad)) as Vec3;
  return [e1,cross(a,e1),a];
}
function bracket(arr: number[], value: number): [number,number,number] {
  if(arr.length===1 || value<=arr[0]) return [0,0,0];
  if(value>=arr.at(-1)!) return [arr.length-1,arr.length-1,0];
  let lo=0,hi=arr.length-1;
  while(hi-lo>1){ const mid=(lo+hi)>>1; if(arr[mid]<=value)lo=mid;else hi=mid; }
  return [lo,hi,(value-arr[lo])/(arr[hi]-arr[lo])];
}
export function intensityAt(d: Photometry, gamma: number, c: number): number {
  if(gamma<d.vertical[0]-1e-7 || gamma>d.vertical.at(-1)!+1e-7) return 0;
  const base=d.horizontal[0], span=d.horizontal.at(-1)!-base;
  let angle=((c-base)%360+360)%360;
  let horizontal=d.horizontal, values=d.candela;
  if(horizontal.length===1) angle=0;
  else if(span<=90.001){angle%=180;if(angle>90)angle=180-angle;}
  else if(span<=180.001){if(angle>180)angle=360-angle;}
  else if(span<359.999){ horizontal=[...horizontal,base+360]; values=[...values,values[0]]; }
  const [v0,v1,tv]=bracket(d.vertical,gamma),[h0,h1,th]=bracket(horizontal,angle+base);
  const a=values[h0][v0]*(1-tv)+values[h0][v1]*tv,b=values[h1][v0]*(1-tv)+values[h1][v1]*tv;
  return Math.max(0,a*(1-th)+b*th);
}
export function integrateFlux(d: Photometry): number {
  let flux=0;
  for(let g=0;g<180;g+=1){
    let mean=0;
    for(let c=0;c<360;c+=3)mean+=intensityAt(d,g+.5,c);
    flux+=(mean/120)*2*Math.PI*(Math.cos(g*rad)-Math.cos((g+1)*rad));
  }
  return flux;
}
export function parseIES(text: string, filename='灯具.ies'): Photometry {
  const lines=text.replace(/^\uFEFF/,'').replace(/\r/g,'').split('\n');
  const ti=lines.findIndex(l=>/^\s*TILT\s*=/i.test(l));
  if(ti<0)throw new Error('未找到 TILT 数据段，请上传 LM-63 IES 文件。');
  if(!/^\s*TILT\s*=\s*NONE\s*$/i.test(lines[ti]))throw new Error('第一版支持 TILT=NONE，请转换后重新上传。');
  const labels:Record<string,string>={};
  lines.slice(0,ti).forEach(l=>{const m=l.match(/^\s*\[([^\]]+)\]\s*(.*)$/);if(m)labels[m[1].toUpperCase()]=m[2].trim();});
  const nums=lines.slice(ti+1).join(' ').trim().split(/[\s,]+/).filter(Boolean).map(Number);
  if(nums.length<13 || nums.some(v=>!Number.isFinite(v)))throw new Error('IES 数据不完整或包含非法数值。');
  const [lamps,lumen,mult,nv,nh,type,units,width,len,height,ballast,,watts]=nums;
  if(type!==1)throw new Error('第一版支持 Type C 配光。');
  if(![1,2].includes(units))throw new Error('IES 尺寸单位必须为英尺或米。');
  if(!Number.isInteger(nv)||!Number.isInteger(nh)||nv<2||nh<1||nv>2000||nh>2000||nv*nh>1000000)throw new Error('IES 角度数量异常或超出上限。');
  if(nums.length<13+nv+nh+nv*nh)throw new Error('IES 光强矩阵被截断。');
  if(mult<0||ballast<0||lamps<=0||(lumen<=0&&lumen!==-1))throw new Error('IES 光源数量、光通量或光强倍率异常。');
  const vertical=nums.slice(13,13+nv),horizontal=nums.slice(13+nv,13+nv+nh);
  const validAngles=(a:number[],max:number)=>a.every((v,i)=>v>=0&&v<=max&&(i===0||v>a[i-1]));
  if(!validAngles(vertical,180)||!validAngles(horizontal,360))throw new Error('IES 角度必须递增且位于有效范围。');
  const raw=nums.slice(13+nv+nh,13+nv+nh+nv*nh);
  if(raw.some(v=>v<0))throw new Error('IES 光强不能为负数。');
  // LM-63 ballast factor applies to relative photometry; absolute photometry
  // already contains the calibrated luminaire intensity. The reserved field is not a factor.
  const absolute=lumen===-1, factor=mult*(absolute?1:ballast);
  const candela=Array.from({length:nh},(_,i)=>raw.slice(i*nv,(i+1)*nv).map(v=>v*factor));
  const d:Photometry={version:lines.find(l=>/^IES/i.test(l))?.trim()||'LM-63',labels,vertical,horizontal,candela,watts:watts>0?watts:null,lumens:0,absolute,dimensions:[width,len,height].map(v=>v*(units===1?.3048:1)) as Vec3,units:'meter',peak:raw.reduce((a,v)=>Math.max(a,v*factor),0),filename};
  d.lumens=integrateFlux(d);
  return d;
}
export function fixtureEmitter(f:Fixture,p:Product):Vec3 {
  const e=rotate(p.calibration.emitter,f.rotation);return e.map((v,i)=>v+f.position[i]) as Vec3;
}
export function luxFromFixture(point:Vec3,normal:Vec3,f:Fixture,p:Product,maintenance=.8):number {
  if(!p.photometry||f.level<=0)return 0;
  const emitter=fixtureEmitter(f,p),delta=point.map((v,i)=>v-emitter[i]) as Vec3,dist=length(delta);
  if(dist<.01)return 0;
  const ray=delta.map(v=>v/dist) as Vec3,cosine=Math.max(0,-dot(normal,ray));
  if(cosine<=0)return 0;
  const local=rotate(ray,f.rotation,true),[e1,e2,a]=photometricBasis(p.calibration.direction,p.calibration.c0);
  const gamma=Math.acos(clamp(dot(local,a),-1,1))/rad,c=Math.atan2(dot(local,e2),dot(local,e1))/rad;
  return intensityAt(p.photometry,gamma,c)*cosine/(dist*dist)*(f.level/100)*maintenance;
}
export function planePoint(plane:AnalysisPlane,x:number,y:number):{point:Vec3;normal:Vec3} {
  if(plane.kind==='vertical')return {point:[x,plane.height+y,plane.z],normal:[0,0,1]};
  return {point:[x,plane.height,y],normal:[0,1,0]};
}
export function calculateAnalysis(fixtures:Fixture[],products:Product[],plane:AnalysisPlane,maintenance:number,revision:number):AnalysisResult {
  const start=performance.now(),values:number[]=[],map=new Map(products.map(p=>[`${p.id}@${p.version}`,p]));
  const pairs=fixtures.map(f=>({f,p:map.get(`${f.productId}@${f.productVersion}`)})).filter(v=>v.p?.photometry&&v.f.level>0) as {f:Fixture;p:Product}[];
  let min=Infinity,max=0,sum=0;
  for(let j=0;j<plane.ny;j++)for(let i=0;i<plane.nx;i++){
    const x=-plane.width/2+i*plane.width/(plane.nx-1),y=-plane.depth/2+j*plane.depth/(plane.ny-1),{point,normal}=planePoint(plane,x,y);
    let v=0;for(const {f,p} of pairs)v+=luxFromFixture(point,normal,f,p,maintenance);
    values.push(v);min=Math.min(min,v);max=Math.max(max,v);sum+=v;
  }
  const avg=sum/values.length;return {revision,plane,values,min:Number.isFinite(min)?min:0,max,avg,uniformity:avg>0?min/avg:0,duration:performance.now()-start,maintenance};
}
export function samplePhotometry(category:string,lumens:number,watts:number):Photometry {
  const vertical=Array.from({length:91},(_,i)=>i*2),horizontal=Array.from({length:25},(_,i)=>i*15);
  const candela=horizontal.map(c=>vertical.map(g=>{
    if(g>=90)return 0;
    const t=g*rad;
    if(category==='射灯')return Math.exp(-Math.pow(g/14,2));
    if(category==='路灯')return Math.pow(Math.sin(t),2)*Math.pow(Math.cos(t),1.5)*(1.0+.75*Math.cos(2*c*rad))+.02*Math.cos(t);
    if(category==='投光灯')return Math.exp(-Math.pow(g/30,2))*(.7+.3*Math.cos(c*rad));
    if(category==='庭院灯')return Math.pow(Math.cos(t),.5);
    return Math.pow(Math.cos(t),category==='筒灯'?2:1);
  }));
  const d:Photometry={version:'IESNA:LM-63-2002',labels:{MANUFAC:'LUMINA · 演示样品',LUMCAT:category,TEST:'GENERATED-DEMO'},vertical,horizontal,candela,watts,lumens,absolute:true,dimensions:[.1,.1,.05],units:'meter',peak:0,filename:`演示配光-${category}.ies`};
  const factor=lumens/integrateFlux(d);d.candela=d.candela.map(row=>row.map(v=>v*factor));d.peak=d.candela.reduce((m,row)=>Math.max(m,...row),0);return d;
}
export function serializeIES(d:Photometry):string {
  return ['IESNA:LM-63-2002','[MANUFAC] LUMINA - DEMO','[LUMCAT] '+(d.labels.LUMCAT||'Sample'),'TILT=NONE',`1 -1 1 ${d.vertical.length} ${d.horizontal.length} 1 2 ${d.dimensions.join(' ')}`,'1 1 '+(d.watts||0),d.vertical.join(' '),d.horizontal.join(' '),...d.candela.map(row=>row.map(v=>v.toFixed(6)).join(' '))].join('\n');
}
