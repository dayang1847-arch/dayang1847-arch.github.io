import * as THREE from 'three/webgpu';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { DRACOLoader } from 'three/addons/loaders/DRACOLoader.js';
import { clone } from 'three/addons/utils/SkeletonUtils.js';
import type { Product } from '../../shared/types';

const cached=new Map<string,Promise<THREE.Group>>();
const mat=(color:number,metalness=0,roughness=.5)=>new THREE.MeshStandardMaterial({color,metalness,roughness});
function mesh(geometry:THREE.BufferGeometry,material:THREE.Material|THREE.Material[],x=0,y=0,z=0,name=''){const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.name=name;m.castShadow=true;m.receiveShadow=true;return m;}
export function sampleModel(p:Product):THREE.Group {
  const g=new THREE.Group(),dark=mat(0x23272a,.65,.27),white=mat(0xe5e7e2,.25,.3),emit=new THREE.MeshStandardMaterial({color:0xffffff,emissive:0xffd7a5,emissiveIntensity:3,roughness:.4});
  if(p.category==='筒灯'){
    g.add(mesh(new THREE.CylinderGeometry(.17,.17,.1,32),white,0,.06,0,'灯体'));
    g.add(mesh(new THREE.CylinderGeometry(.135,.105,.12,32),dark,0,-.025,0,'反射罩'));
    g.add(mesh(new THREE.CircleGeometry(.105,32),emit,0,-.086,0,'发光面'));g.children.at(-1)!.rotation.x=Math.PI/2;
  }else if(p.category==='射灯'){
    g.add(mesh(new THREE.BoxGeometry(.06,.07,.45),dark,0,.12,0,'轨道'));
    g.add(mesh(new THREE.CylinderGeometry(.105,.105,.3,32),dark,0,-.08,0,'灯体'));
    g.add(mesh(new THREE.CircleGeometry(.085,32),emit,0,-.235,0,'发光面'));g.children.at(-1)!.rotation.x=Math.PI/2;
  }else if(p.category==='线性灯'){
    g.add(mesh(new THREE.BoxGeometry(1.8,.09,.12),dark,0,.05,0,'灯体'));
    g.add(mesh(new THREE.BoxGeometry(1.76,.015,.095),emit,0,-.001,0,'发光面'));
    [-.65,.65].forEach(x=>g.add(mesh(new THREE.CylinderGeometry(.006,.006,.8,5),dark,x,.48,0,'吊线')));
  }else if(p.category==='路灯'){
    g.add(mesh(new THREE.CylinderGeometry(.07,.14,7,12),dark,0,-3.5,0,'灯杆'));
    g.add(mesh(new THREE.BoxGeometry(1.3,.075,.1),dark,.6,-.05,0,'灯臂'));
    g.add(mesh(new THREE.BoxGeometry(.72,.14,.35),dark,1.2,-.05,0,'灯体'));
    g.add(mesh(new THREE.BoxGeometry(.6,.012,.28),emit,1.2,-.127,0,'发光面'));
    g.add(mesh(new THREE.CylinderGeometry(.24,.28,.15,16),dark,0,-6.925,0,'底座'));
  }else if(p.category==='庭院灯'){
    g.add(mesh(new THREE.CylinderGeometry(.1,.12,1.1,16),dark,0,-.55,0,'灯柱'));
    g.add(mesh(new THREE.CylinderGeometry(.22,.22,.08,24),dark,0,.06,0,'灯帽'));
    g.add(mesh(new THREE.CylinderGeometry(.16,.16,.12,24),emit,0,-.04,0,'发光面'));
  }else{
    g.add(mesh(new THREE.BoxGeometry(.35,.18,.26),dark,0,.12,0,'灯体'));
    g.add(mesh(new THREE.BoxGeometry(.3,.012,.22),emit,0,.023,0,'发光面'));
    g.add(mesh(new THREE.BoxGeometry(.04,.23,.04),dark,0,.3,0,'支架'));
  }
  return g;
}
function cadModel(data:any):THREE.Group {
  const meshes=data.meshes.map((m:any,i:number)=>{
    const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.Float32BufferAttribute(m.attributes.position.array,3));
    if(m.attributes.normal)geometry.setAttribute('normal',new THREE.Float32BufferAttribute(m.attributes.normal.array,3));
    geometry.setIndex(m.index.array);if(!m.attributes.normal)geometry.computeVertexNormals();
    const materials:THREE.Material[]=[];const defaultColor=m.color||[.55,.57,.59];
    materials.push(new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(...defaultColor as [number,number,number],THREE.SRGBColorSpace),metalness:.45,roughness:.4}));
    if(m.brep_faces?.length){
      for(const face of m.brep_faces){const color=face.color||defaultColor;const n=materials.length;materials.push(new THREE.MeshStandardMaterial({color:new THREE.Color().setRGB(...color as [number,number,number],THREE.SRGBColorSpace),metalness:.45,roughness:.4}));geometry.addGroup(face.first*3,(face.last-face.first+1)*3,n);}
    }
    return mesh(geometry,materials.length>1?materials:materials[0],0,0,0,m.name||`零件 ${i+1}`);
  });
  const node=(root:any):THREE.Group=>{const g=new THREE.Group();g.name=root.name||'装配';for(const index of root.meshes||[])g.add(meshes[index]);for(const child of root.children||[])g.add(node(child));return g;};
  return node(data.root);
}
export async function loadModel(p:Product):Promise<THREE.Group>{
  const key=p.sample?`${p.id}@${p.version}`:`${p.assetId}:${p.modelFormat}`;
  if(!cached.has(key))cached.set(key,(async()=>{
    if(p.sample)return sampleModel(p);
    if(!p.assetId)throw new Error('产品尚未上传模型');
    if(p.modelFormat==='glb'){
      const loader=new GLTFLoader();
      // Draco decoder binaries are served locally; no CDN is needed.
      const draco=new DRACOLoader().setDecoderPath(import.meta.env.BASE_URL+'decoders/draco/');loader.setDRACOLoader(draco);
      try{const gltf=await loader.loadAsync(`/api/assets/${p.assetId}/source.glb`);const wrapper=new THREE.Group();wrapper.add(gltf.scene);return wrapper;}finally{draco.dispose();}
    }
    const res=await fetch(`/api/assets/${p.assetId}/mesh.json`);if(!res.ok)throw new Error('模型转换尚未完成');return cadModel(await res.json());
  })().catch(e=>{cached.delete(key);throw e;}));
  const original=await cached.get(key)!,copy=clone(original) as THREE.Group;
  copy.traverse(o=>{if(o instanceof THREE.Mesh){o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();o.castShadow=true;o.receiveShadow=true;}});
  return copy;
}
export function calibrateModel(model:THREE.Group,p:Product):THREE.Group {
  const offset=new THREE.Group();offset.add(model);model.position.set(...p.calibration.origin.map(v=>-v) as [number,number,number]);
  offset.scale.setScalar(p.calibration.scale);const frame=new THREE.Group();frame.rotation.set(...p.calibration.rotation.map(v=>v*Math.PI/180) as [number,number,number]);frame.add(offset);
  const materialColors:Record<string,number>={black:0x202427,white:0xe8e7e2,aluminum:0x9a9e9f,brass:0xac8050};
  model.traverse(o=>{if(!(o instanceof THREE.Mesh))return;const materials=Array.isArray(o.material)?o.material:[o.material];for(const m of materials){if(!(m instanceof THREE.MeshStandardMaterial))continue;if(p.calibration.material!=='original'){m.color.setHex(materialColors[p.calibration.material]||0x999999);m.metalness=p.calibration.material==='white'?.2:.65;m.roughness=.35;}if(p.calibration.emissiveMeshes.includes(o.name)){m.emissive.setHex(0xffd8a5);m.emissiveIntensity=3;o.userData.emitter=true;}else if(m.emissiveIntensity>0&&!m.emissive.equals(new THREE.Color(0)))o.userData.emitter=true;}});
  return frame;
}
export function releaseModel(g:THREE.Object3D){g.traverse(o=>{if(o instanceof THREE.Mesh){const materials=Array.isArray(o.material)?o.material:[o.material];materials.forEach(m=>m.dispose());}});}
