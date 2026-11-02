// Scale model inspired by LUMINA's case-jakarta-atrium: four curved galleries,
// an open void, timber fins and planted pendant rings. Not a measured building copy.
export function buildAtrium(T,{parent,box,cyl,material,geometries,fixtures}){
 const group=new T.Group();parent.add(group);group.position.set(4.8,-.7,3.85);
 const stone=material('#d7d8d0',.08,.65),edge=material('#e8e6df',.12,.5),wood=material('#a38c6e',.05,.85),steel=material('#82929d',.65,.38),green=material('#647c63',0,.9),light=material('#e7dfbf',.1,.35),glass=material('#bed0d3',.05,.2,{transparent:true,opacity:.27,depthWrite:false,side:T.DoubleSide});
 function mesh(g,mat,parent=group){geometries.add(g);const m=new T.Mesh(g,mat);m.castShadow=m.receiveShadow=true;parent.add(m);return m;}
 function arcShape(rx,ry,ix,iy,start=-.12,end=Math.PI+ .12){const s=new T.Shape();const count=80;for(let i=0;i<=count;i++){const t=start+(end-start)*i/count,x=rx*Math.cos(t),y=ry*Math.sin(t);i?s.lineTo(x,y):s.moveTo(x,y);}for(let i=count;i>=0;i--){const t=start+(end-start)*i/count;s.lineTo(ix*Math.cos(t),iy*Math.sin(t));}s.closePath();return s;}
 function curve(rx,ry,z,start=-.12,end=Math.PI+.12){return new T.CatmullRomCurve3(Array.from({length:81},(_,i)=>{const t=start+(end-start)*i/80;return new T.Vector3(rx*Math.cos(t),ry*Math.sin(t),z);}));}
 box(group,3.27,2.13,.08,steel);box(group,3.10,1.96,.04,stone,0,0,.06);
 // Front removed for a readable architectural section; every gallery has its own void.
 for(let floor=0;floor<4;floor++){const z=.12+floor*.48,rx=1.48-floor*.025,ry=.94-floor*.014;const slab=mesh(new T.ExtrudeGeometry(arcShape(rx,ry,.80+floor*.018,.47+floor*.01),{depth:.055,bevelEnabled:false,curveSegments:48}),stone);slab.position.z=z;
  for(const r of [[rx,ry],[.83+floor*.018,.5+floor*.01]]){mesh(new T.TubeGeometry(curve(r[0],r[1],z+.075),80,.014,6,false),edge);mesh(new T.TubeGeometry(curve(r[0],r[1],z+.28),80,.009,6,false),steel);}
  const rail=mesh(new T.ExtrudeGeometry(arcShape(.84+floor*.018,.51+floor*.01,.835+floor*.018,.505+floor*.01),{depth:.19,bevelEnabled:false}),glass);rail.position.z=z+.075;
  for(let j=0;j<13;j++){const a=j*Math.PI/12;box(group,.022,.022,.2,steel,(.835+floor*.018)*Math.cos(a),(.5+floor*.01)*Math.sin(a),z+.175,.003);}
 }
 for(const x of [-1.35,1.35])for(const y of [.1,.76])cyl(group,.025,1.65,steel,x,y,.89);
 for(let i=0;i<26;i++){const a=.12+i*(Math.PI-.24)/25;box(group,.027,.025,1.43,wood,1.39*Math.cos(a),.85*Math.sin(a),.85,.004);}
 const roof=mesh(new T.ExtrudeGeometry(arcShape(1.45,.94,.9,.56),{depth:.035,bevelEnabled:false}),edge);roof.position.z=1.88;
 // Small lounge and foliage anchor the scale of the open ground-floor atrium.
 box(group,.47,.19,.12,wood,-.25,-.30,.15);for(const x of [-.52,.52]){cyl(group,.10,.12,stone,x,.28,.15);for(let j=0;j<5;j++)cyl(group,.033,.13+j*.008,green,x+.045*Math.cos(j*1.25),.28+.045*Math.sin(j*1.25),.25);}
 const luminaires=[];for(let i=0;i<6;i++){const g=new T.Group();group.add(g);const ring=mesh(new T.TorusGeometry(.115,.018,8,32),steel,g);ring.position.z=0;const leafRing=mesh(new T.TorusGeometry(.105,.025,6,32),green,g);leafRing.position.z=.018;const diffuser=mesh(new T.TorusGeometry(.095,.014,6,32),light,g);diffuser.position.z=-.025;for(const x of [-.075,.075])cyl(g,.003,.46,steel,x,0,.24);luminaires.push(g);}
 fixtures.atrium={group,luminaires};return {group,luminaires};
}
export function buildDesignRig(T,{parent,box,cyl,material,geometries}){
 const group=new T.Group();parent.add(group);group.position.set(-.3,.85,4.48);
 const steel=material('#aab5bc',.7,.38),boardMat=material('#386e60',.1,.6),diffuser=material('#dcded6',.15,.4),black=material('#344654',.2,.55),copper=material('#b89a67',.65,.4);
 box(group,2.0,1.25,.12,steel,0,0,0);const fins=[];for(let i=0;i<13;i++)fins.push(box(group,.075,.82,.32,steel,-.82+i*.135,.12,.20));
 const pcb=box(group,1.5,.75,.045,boardMat,0,-.1,.39);const optics=box(group,1.60,.83,.035,diffuser,0,-.1,.57);const chips=[];
 for(let i=0;i<9;i++)chips.push(box(group,.10,.10,.04,diffuser,-.5+(i%3)*.5,-.34+Math.floor(i/3)*.22,.44));
 box(group,.49,.76,.22,steel,1.35,0,.11);box(group,.25,.35,.08,black,1.35,-.1,.26);for(const y of [-.27,.16])cyl(group,.05,.15,black,1.45,y,.27);
 for(let i=0;i<5;i++)box(group,.05,.53,.006,copper,-.58+i*.29,-.10,.416,.001);
 const currentCurve=new T.CatmullRomCurve3([[1.55,-.1,.34],[1,-.1,.34],[.68,-.42,.45],[0,-.42,.46],[0,-.1,.46]].map(p=>new T.Vector3(...p)));
 const cg=new T.TubeGeometry(currentCurve,30,.016,6,false);geometries.add(cg);group.add(new T.Mesh(cg,copper));
 const sphere=new T.SphereGeometry(.038,12,8);geometries.add(sphere);const current=Array.from({length:3},()=>{const m=new T.Mesh(sphere,material('#4f82ac',.2,.5));group.add(m);return m;});
 const heat=[];for(let i=0;i<4;i++){const m=new T.Mesh(sphere,material('#b68b63',.1,.6));group.add(m);heat.push(m);}
 return {group,pose(a){a=Math.max(0,Math.min(1,a));optics.position.z=.57+.43*Math.min(1,a/.55);pcb.position.z=.39;chips.forEach(m=>m.position.z=.44);},update(f){const circuit=f.started&&f.module==='research'&&f.step===1,thermal=f.started&&f.module==='research'&&f.step===2;current.forEach((m,i)=>{m.visible=circuit;m.position.copy(currentCurve.getPoint((f.phase+i/3)%1));});heat.forEach((m,i)=>{m.visible=thermal;const t=(f.phase+i/4)%1;m.position.set(-.55+i*.36,-.1,.35+t*.8);m.scale.setScalar(1+t);});fins.forEach((m,i)=>{m.userData.demoDynamicMaterial=true;m.material.color.set(thermal&&i<Math.ceil(f.phase*13)?'#b99c7a':'#aab5bc');});}};
}
