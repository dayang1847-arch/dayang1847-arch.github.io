import * as THREE from 'three/webgpu';
import type { SceneType, ScenePlan } from '../../shared/types';

function texture(kind:'wood'|'stone'|'road'|'grass'){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;const ctx=canvas.getContext('2d')!;
  let seed=741;const random=()=>{seed=(seed*16807)%2147483647;return seed/2147483647;};
  const base={wood:'#716451',stone:'#b7b5a8',road:'#333b40',grass:'#344238'};ctx.fillStyle=base[kind];ctx.fillRect(0,0,512,512);
  for(let i=0;i<16000;i++){const x=random()*512,y=random()*512,a=random()*.15;ctx.fillStyle=`rgba(${random()>.5?'255,255,255':'0,0,0'},${a})`;ctx.fillRect(x,y,kind==='wood'?random()*50+5:1,kind==='wood'?.5:1);}
  if(kind==='wood'){ctx.strokeStyle='rgba(0,0,0,.2)';for(let x=0;x<512;x+=64){ctx.beginPath();ctx.moveTo(x,0);ctx.lineTo(x,512);ctx.stroke();}}
  if(kind==='stone'){ctx.strokeStyle='rgba(0,0,0,.15)';ctx.lineWidth=1;ctx.strokeRect(0,0,512,512);ctx.beginPath();ctx.moveTo(256,0);ctx.lineTo(256,512);ctx.stroke();}
  const t=new THREE.CanvasTexture(canvas);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.colorSpace=THREE.SRGBColorSpace;t.repeat.set(kind==='stone'?4:3,kind==='stone'?4:3);t.anisotropy=4;return t;
}
function labelTexture(text:string,sub:string){const c=document.createElement('canvas');c.width=1024;c.height=256;const x=c.getContext('2d')!;x.fillStyle='#b9bcb0';x.font='500 68px sans-serif';x.textAlign='center';x.fillText(text,512,115);x.fillStyle='#80887d';x.font='24px sans-serif';x.fillText(sub,512,175);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;return t;}

export function buildEnvironment(type:SceneType){
  const group=new THREE.Group();
  const materials:THREE.Material[]=[];const textures:THREE.Texture[]=[];
  const material=(color:number,metalness=0,roughness=.7,map?:THREE.Texture)=>{const m=new THREE.MeshStandardMaterial({color,metalness,roughness,...(map?{map}:{})});materials.push(m);return m;};
  const tex=(k:Parameters<typeof texture>[0])=>{const t=texture(k);textures.push(t);return t;};
  const white=material(0xd8d7ce),dark=material(0x1e2526,.1,.45),metal=material(0x535e5b,.7,.3),gold=material(0xa18964,.65,.35),wood=material(0xffffff,.05,.65,tex('wood')),stone=material(0xffffff,.08,.8,tex('stone')),green=material(0x344d3a,0,.8);
  const box=(w:number,h:number,d:number,x:number,y:number,z:number,m=white)=>{const o=new THREE.Mesh(new THREE.BoxGeometry(w,h,d),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;};
  const cyl=(r:number,h:number,x:number,y:number,z:number,m=dark,r2=r)=>{const o=new THREE.Mesh(new THREE.CylinderGeometry(r,r2,h,20),m);o.position.set(x,y,z);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;};
  const sphere=(r:number,x:number,y:number,z:number,m=green,scale:[number,number,number]=[1,1,1])=>{const o=new THREE.Mesh(new THREE.SphereGeometry(r,14,10),m);o.position.set(x,y,z);o.scale.set(...scale);o.castShadow=true;o.receiveShadow=true;group.add(o);return o;};
  const plant=(x:number,z:number,h=1.8)=>{
    cyl(.34,.45,x,.225,z,material(0x706e63),.26);cyl(.035,h*.7,x,h*.35+.35,z,wood);
    for(let i=0;i<8;i++){const a=i*2.4;const o=sphere(.32,x+Math.sin(a)*.28,h*.45+i*.07,z+Math.cos(a)*.28,green,[.45,.9,1.7]);o.rotation.set(.5*Math.sin(a),a,.5*Math.cos(a));}
  };
  if(type==='indoor'){
    box(18.7,.5,14.7,0,-.3,0,dark);box(18,.12,14,0,-.01,0,stone);
    box(18,.06,6.2,0,.08,-3.7,wood);
    box(18,4.2,.18,0,2.1,-7,white);box(.18,4.2,14,-9,2.1,0,white);
    box(6.5,4.2,.12,-5.5,2.1,-6.86,dark);
    const sign=labelTexture('LUMINA','LIGHT · MATERIAL · SPACE');textures.push(sign);const signMat=new THREE.MeshBasicMaterial({map:sign,transparent:true});materials.push(signMat);const signMesh=new THREE.Mesh(new THREE.PlaneGeometry(4.8,1.2),signMat);signMesh.position.set(-5.5,2.7,-6.77);group.add(signMesh);
    // Slats and structural beams leave the ceiling open for the overview camera.
    for(let z=-6;z<=6;z+=1.2)box(18,.07,.035,0,4.15,z,dark).userData.ceiling=true;
    for(let x=-7.5;x<=7.5;x+=3)box(.05,.07,14,x,4.2,0,dark).userData.ceiling=true;
    const glass=new THREE.MeshStandardMaterial({color:0x9cb8ba,transparent:true,opacity:.14,roughness:.12,metalness:.15,depthWrite:false,side:THREE.DoubleSide});materials.push(glass);
    box(.04,3.8,12,8.9,1.9,-.5,glass);
    [-6,-3,0,3,5.8].forEach(z=>box(.1,4,.07,8.92,2,z,metal));
    box(.06,3.4,5.3,.6,1.7,-3.65,glass);box(.08,3.5,.08,.6,1.75,-1.05,metal);box(.08,3.5,.08,.6,1.75,-6.25,metal);
    box(5.9,3.3,.04,3.65,1.65,-.9,glass);[.8,3.7,6.6].forEach(x=>box(.05,3.5,.08,x,1.75,-.9,metal));
    // Reception and sculptural product display.
    box(3,.9,1.05,-5.4,.5,-4.8,white);box(3.08,.07,1.1,-5.4,.985,-4.8,wood);
    [-6,-3,0].forEach((x,i)=>{box(.9,.08,.9,x,.04,-.7,dark);box(.8,.75,.8,x,.45,-.7,white);const sculpture=new THREE.Mesh(i===0?new THREE.TorusKnotGeometry(.24,.08,80,10):i===1?new THREE.IcosahedronGeometry(.38,0):new THREE.TorusGeometry(.3,.1,12,36),gold);sculpture.position.set(x,1.2,-.7);sculpture.rotation.set(.3,.4,0);sculpture.castShadow=true;group.add(sculpture);});
    // Exhibition panels with quiet geometric artwork.
    [-4.2,-.9].forEach((x,i)=>{box(1.7,2.1,.06,x,2.25,-6.78,dark);box(1.58,1.98,.025,x,2.25,-6.74,material(i?0x7c9185:0x9c7a5d));const s=new THREE.Mesh(new THREE.CircleGeometry(.4,40),gold);s.position.set(x+(i?.2:-.2),2.35,-6.7);group.add(s);});
    // Meeting area.
    box(4.5,.13,1.8,3.8,.83,-3.8,wood);[-1.7,1.7].forEach(dx=>box(.15,.77,1.45,3.8+dx,.4,-3.8,dark));
    const fabric=material(0x6c7469,0,.95);
    [2.2,3.8,5.4].forEach(x=>[-5.25,-2.3].forEach(z=>{box(.62,.16,.64,x,.53,z,fabric);box(.65,.64,.12,x,.87,z+(z<-3?-.28:.28),fabric);[-.23,.23].forEach(dx=>[-.23,.23].forEach(dz=>box(.035,.47,.035,x+dx,.27,z+dz,dark)));}));
    box(2.1,1.2,.07,3.8,2.3,-6.8,dark);box(1.94,1.05,.02,3.8,2.3,-6.74,material(0x303d40));
    // Lounge.
    box(6,.035,4.7,4.2,.09,3.5,material(0x73796d,0,1));
    const sofa=material(0xafa998,0,1);
    box(3.9,.62,1.12,3.9,.43,5.2,sofa);box(3.9,.7,.24,3.9,.9,5.65,sofa);[-1.85,1.85].forEach(dx=>box(.24,.65,1.22,3.9+dx,.7,5.2,sofa));
    for(let x=2.65;x<5.9;x+=1.1)box(1,.14,.83,x,.82,5.13,sofa);
    cyl(.87,.1,4, .48,3.15,wood);cyl(.11,.43,4,.22,3.15,metal);
    box(.75,.07,.48,4.15,.57,3.18,dark);cyl(.12,.21,3.65,.64,3.1,gold);
    box(1.1,.64,1.1,7,.45,3.8,sofa);box(.2,.65,1.1,7.5,.85,3.8,sofa);
    box(2,.85,.55,-6.9,.48,4.5,wood);[-7.5,-6.8,-6.1].forEach((x,i)=>cyl(.16,.4+i*.1,x,1.1+i*.05,4.5,gold));
    plant(-7.8,-5.5,2);plant(7.4,-5.9,2.5);plant(7.8,5.6,2.5);plant(-7.7,5.7,2.6);
  }else{
    const road=material(0xffffff,0,.95,tex('road')),lawn=material(0xffffff,0,1,tex('grass'));
    box(50,.7,38,0,-.45,0,dark);box(48,.15,36,0,-.03,0,lawn);
    box(9.5,.1,36,-5,.075,0,road);box(.3,.2,36,-10,.09,0,stone);box(.3,.2,36,0,.09,0,stone);
    for(let z=-16;z<=16;z+=4)box(.1,.012,1.6,-5,.132,z,white);
    [-8.8,-1.2].forEach(x=>box(.07,.012,36,x,.132,0,white));
    box(4,.12,36,8,.1,0,stone);box(7,.1,36,16,.02,0,stone);
    for(let z=-17;z<=17;z+=2.5)box(6.9,.02,.018,16,.083,z,metal);
    box(4,.12,14,3,.09,-10,stone);box(5,.12,16,3,.09,9,stone);
    // Reflecting water and the low garden pavilion.
    box(6,.22,5,16,.12,-10,dark);
    const water=new THREE.MeshPhysicalMaterial({color:0x45646b,roughness:.13,metalness:.35,clearcoat:1});materials.push(water);box(5.7,.05,4.7,16,.26,-10,water);
    box(6,.15,6,16,.12,1,wood);box(6.7,.18,6.7,16,3.1,1,dark);[13,19].forEach(x=>[-2,4].forEach(z=>box(.1,3,.1,x,1.55,z,metal)));
    box(5.8,1.1,.15,16,.7,-1.9,wood);for(let z=-1.4;z<=3.8;z+=.35)box(.06,2.8,.1,19,1.5,z,wood);
    box(4,.18,1.3,16,.76,1.7,wood);[-1.5,1.5].forEach(dx=>box(.1,.66,1,16+dx,.43,1.7,dark));
    [-13,-6,3,12].forEach((z,i)=>{
      const x=-16.5+i%2;
      box(3,.12,3,x,.13,z,stone);cyl(.13,2.7,x,1.55,z,wood,.2);
      sphere(1.7,x,3.5,z,green,[1,1.3,1]);sphere(1.1,x-1,3.1,z+.2,green);sphere(1.15,x+.9,3.15,z-.3,material(0x46553c));
    });
    [-14,-5,7,15].forEach((z,i)=>{const x=12+i%2;box(2.2,.1,2.2,x,.13,z,stone);cyl(.1,2.2,x,1.3,z,wood,.16);sphere(1.3,x,2.8,z,green,[.8,1.3,.8]);});
    [-13,-4,6,14].forEach(z=>{box(2.6,.07,.65,4,.62,z,wood);[-1,1].forEach(dx=>box(.07,.6,.5,4+dx,.3,z,dark));box(2.6,.55,.08,4,.9,z-.28,wood);});
    for(let z=-16;z<17;z+=2.3){sphere(.42,21,.35,z,green,[1.3,.8,1]);sphere(.32,1.4,.35,z,green,[1,.85,1]);}
    box(4,1.5,.14,-14.5,.9,-17.4,dark);
    const t=labelTexture('LUMINA PARK','DESIGNED FOR THE NIGHT');textures.push(t);const m=new THREE.MeshBasicMaterial({map:t,transparent:true});materials.push(m);const panel=new THREE.Mesh(new THREE.PlaneGeometry(3.6,.9),m);panel.position.set(-14.5,1,-17.3);group.add(panel);
  }
  const hemisphere=new THREE.HemisphereLight(0xdde8f0,0x3b443b,.5),sun=new THREE.DirectionalLight(0xffe4c0,2);sun.position.set(-12,20,8);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);sun.shadow.camera.left=-30;sun.shadow.camera.right=30;sun.shadow.camera.top=30;sun.shadow.camera.bottom=-30;sun.shadow.normalBias=.08;
  group.add(hemisphere,sun);
  return {group,hemisphere,sun,release(){group.traverse(o=>{if(o instanceof THREE.Mesh)o.geometry.dispose();});materials.forEach(m=>m.dispose());textures.forEach(t=>t.dispose());sun.dispose();}};
}
export function configureEnvironment(scene:THREE.Scene,environment:ReturnType<typeof buildEnvironment>,type:SceneType,time:ScenePlan['environment']){
  if(type==='indoor'){
    const studio=new THREE.Color().setRGB(2.5,2.6,2.7);scene.background=studio;scene.fog=new THREE.Fog(studio,65,130);environment.hemisphere.intensity=1.2;environment.sun.intensity=1.6;
  }else{
    const c=time==='day'?new THREE.Color().setRGB(1.4,1.7,2):new THREE.Color(time==='dusk'?0x333940:0x101c28);scene.background=c;scene.fog=new THREE.Fog(c,70,160);
    environment.hemisphere.intensity={day:2.5,dusk:.45,night:.12}[time];environment.sun.intensity={day:3,dusk:.7,night:0}[time];environment.sun.color.setHex(time==='dusk'?0xffa569:0xffe4c0);
  }
}
