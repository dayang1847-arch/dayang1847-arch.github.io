import {CHANNEL_MARKS,drawChannelBadge} from './system-industrial-channels.js?v=82408b67ba10';
import {buildAtrium,buildDesignRig} from './system-industrial-atrium.js?v=82408b67ba10';
import {smooth,clamp,teachingRecordPositions,atriumFixturePositions,atriumField,candidateStatus,CANDIDATES,quoteStatus,QUOTES} from './system-industrial-demo.js?v=82408b67ba10';
// Purpose-built workpieces and routes. Every pose is a pure function of the same frame.
export function buildIndustrialEffects(T,{root,stationGroups:stations,box,cyl,material,screen}){
 const navy=material('#344e6d',.3,.45),paper=material('#eef0e9',0,.9),metal=material('#abb8c5',.65,.38),pcb=material('#326959',.1,.6),black=material('#26323d',.2,.5),gold=material('#b59b6b',.6,.4),blue=material('#3676b9',.25,.45),amber=material('#b28a43',.2,.6),red=material('#ae6262',.15,.6),purple=material('#807198',.2,.5);
 const geos=new Set(),mats=new Set(),textures=new Set();const actors={};for(const id of Object.keys(stations).concat('database')){actors[id]=new T.Group();root.add(actors[id]);}
 const palette={source:paper,record:paper,duplicate:metal,missing:amber,conflict:red,verified:blue,failed:red,pending:amber,review:blue,excluded:metal,comparable:blue};
 function plaque(parent,text,x,y,z,w=.7,h=.22,color='#344e6d'){
  const canvas=document.createElement('canvas');canvas.width=768;canvas.height=192;const c=canvas.getContext('2d');c.fillStyle='#f0f3f5';c.fillRect(0,0,768,192);c.fillStyle=color;c.font='600 66px sans-serif';c.textAlign='center';c.fillText(text,384,123);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;textures.add(texture);const m=new T.MeshBasicMaterial({map:texture,toneMapped:false,side:T.DoubleSide});mats.add(m);const g=new T.PlaneGeometry(w,h);geos.add(g);const face=new T.Mesh(g,m);face.rotation.x=Math.PI/2;face.position.set(x,y,z);parent.add(face);return face;
 }
 function makeRecord(parent,label,x,y,z,w=.38){const g=new T.Group();g.position.set(x,y,z);parent.add(g);const card=box(g,w,.43,.045,paper,0,0,0,.008);for(let i=0;i<3;i++)box(g,w*.7,.016,.004,navy,0,.12-i*.09,.026,.001);plaque(g,label,0,-.226,.08,w,.13);return {g,card,origin:g.position.clone()};}
 const badges=CHANNEL_MARKS.map((mark,i)=>{const x=-6.50+i*.78,y=-2.72,z=4.30;box(stations.collection,.65,.10,.44,paper,x,y,z);box(stations.collection,.32,.33,.045,metal,x,y,4.03);cyl(stations.collection,.024,.24,metal,x,y,4.16);const canvas=document.createElement('canvas');canvas.width=512;canvas.height=320;drawChannelBadge(canvas.getContext('2d'),mark);const texture=new T.CanvasTexture(canvas);texture.colorSpace=T.SRGBColorSpace;texture.anisotropy=8;textures.add(texture);const mat=new T.MeshBasicMaterial({map:texture,toneMapped:false});mats.add(mat);const geo=new T.PlaneGeometry(.60,.38);geos.add(geo);const face=new T.Mesh(geo,mat);face.rotation.x=Math.PI/2;face.position.set(x,y-.056,z);face.userData.benchAction='channel';face.userData.benchId=mark.id;stations.collection.add(face);return {mark,face,x,y};});
 const documents=Array.from({length:8},(_,i)=>makeRecord(actors.collection,String(i+1),-5.35+(i%4)*.42-.63,-1.7+Math.floor(i/4)*.38-.19,4.16));
 // Two explicit compare/constraint/quote trays; statuses never rely on color alone.
 const compare=Array.from({length:4},(_,i)=>makeRecord(actors.market,['A','B','C','D'][i],-5.05+(i%2)*1.02,1.2+Math.floor(i/2)*.58,4.4,.68));
 const candidates=Array.from({length:3},(_,i)=>makeRecord(actors.research,['A','B','C'][i],-1.7+i*.9,2.55,4.43,.64));
 const quotes=Array.from({length:3},(_,i)=>makeRecord(actors.procurement,['A','B','C'][i],-2.9+i*1.02,-2.2,4.65,.68));
 // A compact manufacturing lane is physically owned by R&D, beside the lamp.
 const lane=stations.research;box(lane,2.48,1.22,.13,metal,1.28,-1.65,3.68);box(lane,2.4,1.14,.04,paper,1.28,-1.65,3.77);
 const chips=[];for(const [index,x]of [.53,1.52].entries()){box(lane,.84,.80,.055,pcb,x,-1.65,3.84);for(let i=0;i<(index?6:8);i++){const xx=x-.27+(i%3)*.26,yy=-1.9+Math.floor(i/3)*.22;const m=box(lane,.12,.1,index?.07:.045,index?black:paper,xx,yy,3.91);chips.push({m,x:xx,y:yy,z:3.91});}}
 plaque(lane,'灯板 SMT',.53,-2.28,3.91,.72,.18);plaque(lane,'驱动 SMT / DIP',1.56,-2.28,3.91,1.0,.18);
 const dip=[];for(let i=0;i<3;i++){const g=new T.Group();lane.add(g);g.position.set(1.25+i*.25,-1.35,4.04);cyl(g,.075,.23,black,0,0,.09);for(const x of [-.03,.03])cyl(g,.008,.16,gold,x,0,-.08);dip.push({g,z:4.04});}
 // Pick head stays above the PCB; a probe touches the dedicated inspection pad only.
 cyl(lane,.045,1.15,metal,2.35,-1.07,4.38);box(lane,.68,.12,.09,navy,2.07,-1.07,4.94);const head=box(lane,.13,.14,.2,black,1.82,-1.07,4.81);
 const probe=box(lane,.14,.14,.32,black,2.27,-1.78,4.23);cyl(lane,.012,.13,gold,2.27,-1.78,4.02);box(lane,.32,.33,.04,metal,2.27,-1.78,3.85);
 // Hollow carton with real hinged flaps, rather than a solid block covering its contents.
 const pack=new T.Group();lane.add(pack);pack.position.set(1.55,-3.38,3.61);const cardboard=material('#bca98a',0,.93);box(pack,1.85,.8,.04,cardboard,0,0,0);for(const x of [-.91,.91])box(pack,.035,.8,.50,cardboard,x,0,.25);for(const y of [-.38,.38])box(pack,1.82,.035,.50,cardboard,0,y,.25);
 const flaps=[];for(const side of [-1,1]){const g=new T.Group();pack.add(g);g.position.set(0,side*.4,.51);box(g,1.82,.4,.025,cardboard,0,-side*.2,0);flaps.push({g,side});}
 const packed=box(pack,1.4,.43,.12,metal,0,0,.14);plaque(lane,'包装 / 附件 / 标识',1.55,-3.82,4.0,1.5,.2);
 // Curve-atrium engineering model references the existing LUMINA Jakarta case.
 const fixtures={};const atrium=buildAtrium(T,{parent:stations.process,box,cyl,material,geometries:geos,fixtures}),roadGroup=atrium.group,poles=atrium.luminaires;
 const ring=buildDesignRig(T,{parent:stations.research,box,cyl,material,geometries:geos});
 const grid=[];for(let iy=0;iy<13;iy++)for(let ix=0;ix<19;ix++){const x=-1.35+ix*2.7/18,y=-.82+iy*1.64/12;const m=material('#758898',0,.8,{transparent:true,opacity:0,depthWrite:false});const tile=box(roadGroup,.14,.13,.004,m,x,y,.086,.001);tile.userData.demoDynamicMaterial=true;grid.push({tile,m,x,y});}
 plaque(stations.process,'曲线中庭 · 光分布示意',4.8,-1.89,4.05,2.4,.22);
 // Shared archive workpieces: new versions coexist, with failures kept separately.
 const archives=Array.from({length:5},(_,i)=>makeRecord(actors.database,['来源','v1','v2','冲突','样本'][i],-.9+i*.45,-3.67,3.65+i*.025));
 const ports={collection:[-5.35,-3.05,3.62],market:[-4.2,.98,4.15],research:[.1,-.5,4.15],procurement:[-1.8,-3.22,3.92],process:[4.8,-2.6,3.70],database:[0,-4.42,3.03],design:[2.55,1.15,4.35],sales:[6.7,-3.75,3.7]};
 const routes=[];
 function route(from,to,color=blue){const a=new T.Vector3(...ports[from]),b=new T.Vector3(...ports[to]);const c=new T.CatmullRomCurve3([a,new T.Vector3(a.x,-3.9,3.63),new T.Vector3(b.x,-4.05,3.63),b]);const geo=new T.TubeGeometry(c,48,.014,6,false);geos.add(geo);const tube=new T.Mesh(geo,color);root.add(tube);const ballGeo=new T.SphereGeometry(.045,10,8);geos.add(ballGeo);const dots=Array.from({length:3},()=>{const d=new T.Mesh(ballGeo,color);root.add(d);return d;});const r={from,to,c,tube,dots};routes.push(r);return r;}
 const forward={},back={};for(const id of ['collection','market','research','procurement','process']){forward[id]=route(id,'database');if(id!=='collection')back[id]=route('database',id,purple);}
 const toDesign=route('procurement','research',purple),toSales=route('market','sales'),schemeSales=route('process','sales');
 const correction=route('research','design',red);
 const outcome=(status)=>palette[status]||paper;
 function routeActive(r,f){if(!f.started||f.ended)return false;if(f.module==='database'){if(f.step===0)return r===forward[r.from];if(f.step===3)return r===back[r.to];return false;}if(f.module==='collection')return f.step===4&&r===forward.collection;if(f.module==='procurement'&&f.step===3)return r===toDesign;if(f.module==='research'&&f.step===4&&f.phase>.32&&f.phase<.7)return r===correction;if(f.module==='market'&&f.step===4)return r===toSales;if(f.module==='process'&&f.step===4)return r===schemeSales;return (f.step===0&&r===back[f.module])||(f.step===f.count-1&&r===forward[f.module]);}
 let previousField='';
 function update(f){
  badges.forEach(b=>b.face.material.color.set(!f.started||f.module!=='collection'||b.mark.id===f.channel?'#ffffff':'#c9d2dc'));
  for(const [id,g]of Object.entries(actors))g.visible=f.started&&id===f.module;
  const p=smooth(f.phase);
  for(const [i,d]of documents.entries()){const pose=teachingRecordPositions(f.step,p),q=pose[i];d.g.visible=q.visible;const baseX=-5.35+(i%4)*.42-.63,baseY=-1.7+Math.floor(i/4)*.38-.19;let x=-5.35+q.x,y=-1.7+q.y,z=4.16;if(f.step===0){const badge=badges.find(b=>b.mark.id===f.channel)||badges[0];const t=clamp(p*1.25-i*.025);x=badge.x+(x-badge.x)*t;y=badge.y+(y-badge.y)*t;z=4.16+.5*Math.sin(t*Math.PI);}if(f.step===2&&i===1){x=baseX+(x-baseX)*p;y=baseY+(y-baseY)*p;}if(f.step===3){x=baseX+(x-baseX)*p;y=baseY+(y-baseY)*p;}if(f.step===4){const q=forward.collection.c.getPoint(clamp(p-i*.02));x=q.x;y=q.y;z=q.z+.05;d.g.visible=i!==1&&p<.96;}d.g.position.set(x,y,z);d.card.material=outcome(q.status);}
  compare.forEach((d,i)=>{d.g.visible=f.step>=3;const excluded=f.step>=1&&i>=2;d.g.position.copy(d.origin);d.g.position.x+=excluded?1.3*(f.step===1?p:1):0;d.g.position.z+=f.step===0?.55*(1-p):0;d.card.material=i===3&&excluded?amber:excluded?metal:(f.step>=2?blue:paper);});
  candidates.forEach((d,i)=>{d.g.visible=f.step===1;d.g.position.copy(d.origin);const active=f.step>1||(f.step===1&&f.phase>=.2+i*.22);d.g.position.z+=active&&i===1?.12:0;d.g.position.y+=active&&i!==1?(f.step===1?p:1)*.3:0;d.card.material=active?outcome(candidateStatus(CANDIDATES[i])):paper;});
  quotes.forEach((d,i)=>{d.g.visible=false;d.g.position.copy(d.origin);d.g.position.z+=f.step===1?.55*(1-clamp(p*1.3-i*.1)):0;d.card.material=(f.step>2||(f.step===2&&f.phase>=.2+i*.22))?outcome(quoteStatus(QUOTES[i])):paper;d.g.position.y+=(f.step>=2&&i!==1)?-.3*(f.step===2?p:1):0;});
  ring.update?.(f);const manufacturing=f.started&&f.module==='research';
  chips.forEach(({m,z},i)=>{m.position.z=z+(manufacturing&&f.step===3?.6*(1-clamp(f.phase*4-i*.055)):0);});
  dip.forEach(({g,z},i)=>g.position.z=z+(manufacturing&&f.step===3?.65*(1-clamp((f.phase-.5)*3-i*.14)):0));
  head.position.x=manufacturing&&f.step===3?.3+p*1.4:1.82;head.position.z=4.81-(manufacturing&&f.step===3?.45*Math.sin(p*Math.PI*6)**2:0);
  probe.position.z=4.23-(manufacturing&&f.step===4?.10*Math.sin(p*Math.PI*2)**2:0);
  packed.position.z=.14+(manufacturing&&f.step===5?.7*(1-smooth(p/.5)):0);
  for(const {g,side}of flaps)g.rotation.x=side*(manufacturing&&f.step===5?(1-smooth((p-.4)/.6))*.95:.95);
  const roadActive=f.started&&f.module==='process',adjust=roadActive?(f.step>3?1:f.step===3?p:0):0,xs=atriumFixturePositions(adjust);
  poles.forEach((g,i)=>{g.position.x=xs[i].x;g.position.y=xs[i].y;g.position.z=1.14+(roadActive&&f.step===1?.4*(1-clamp(p*1.6-i*.08)):0);});
  const fieldKey=roadActive&&f.step>=2?`${f.step}:${p.toFixed(2)}`:'off';if(fieldKey!==previousField){previousField=fieldKey;grid.forEach(({m,x,y},i)=>{const value=atriumField(x,y,adjust),show=roadActive&&f.step>=2&&(f.step>2||i/grid.length<p);m.opacity=show?.72:0;m.color.set(value<.42?'#b69266':value<.8?'#608fa6':'#85bbc1');});}
  archives.forEach((d,i)=>{d.g.position.copy(d.origin);d.card.material=i===3?red:i===4?amber:paper;if(f.step===0)d.g.position.z+=.7*(1-clamp(p*1.3-i*.07));if(f.step===1&&i===2)d.g.position.x+=.18*p;if(f.step===2&&i===3)d.g.position.x+=.6*p;if(f.step===3)d.g.position.z+=.25*Math.sin(p*Math.PI);if(f.step===4&&i===4)d.g.position.y-=.3*p;});
  for(const r of routes){const show=routeActive(r,f);r.tube.visible=show;r.dots.forEach((d,i)=>{d.visible=show&&!f.ended;d.position.copy(r.c.getPoint((f.phase+i/3)%1));});}
 }
 function dispose(){for(const g of geos)g.dispose();for(const m of mats)m.dispose();for(const t of textures)t.dispose();}
 return {update,dispose,roadGroup,grid,poles,actors,routes,ring};
}
