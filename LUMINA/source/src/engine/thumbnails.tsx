import { useEffect, useState } from 'react';
import * as THREE from 'three/webgpu';
import { loadModel, releaseModel, calibrateModel } from './models';
import { createRenderer } from './renderer';
import type { Product } from '../../shared/types';
import { Box } from 'lucide-react';

let rendererPromise:Promise<THREE.WebGPURenderer>|null=null;
let queue=Promise.resolve();const cache=new Map<string,Promise<string>>();
async function renderer(){
  if(!rendererPromise)rendererPromise=(async()=>{const r=await createRenderer({antialias:true,forceWebGL:true});r.setSize(400,240);r.setPixelRatio(1);r.toneMapping=THREE.ACESFilmicToneMapping;r.toneMappingExposure=1;return r;})();
  return rendererPromise;
}
function thumbnail(p:Product){
  const key=`${p.id}@${p.version}`;if(cache.has(key))return cache.get(key)!;
  const result=new Promise<string>((resolve,reject)=>{queue=queue.then(async()=>{
    let model:THREE.Group|undefined;
    try{
      const r=await renderer(),scene=new THREE.Scene();scene.background=new THREE.Color(0xf1f2f4);scene.add(new THREE.HemisphereLight(0xffffff,0x8994a5,2.5));const light=new THREE.DirectionalLight(0xffffff,4);light.position.set(4,6,5);scene.add(light);const rim=new THREE.DirectionalLight(0xffffff,2);rim.position.set(-4,3,-4);scene.add(rim);
      model=calibrateModel(await loadModel(p),p);scene.add(model);
      const box=new THREE.Box3().setFromObject(model),center=box.getCenter(new THREE.Vector3()),size=box.getSize(new THREE.Vector3()),diameter=Math.max(size.y,size.x/1.66,size.z,.1);
      const camera=new THREE.PerspectiveCamera(35,400/240,.0001,1000);camera.position.copy(center).add(new THREE.Vector3(diameter*1.1,diameter*.65,diameter*1.8));camera.lookAt(center);
      await r.compileAsync(scene,camera);r.render(scene,camera);resolve(r.domElement.toDataURL('image/png'));
    }catch(e){cache.delete(key);reject(e);}finally{if(model)releaseModel(model);}
  }).catch(()=>{});});cache.set(key,result);return result;
}
export default function ModelThumbnail({product}:{product:Product}){
  const [src,setSrc]=useState(product.thumbnail||'');
  useEffect(()=>{let active=true;if(product.thumbnail){setSrc(product.thumbnail);return;}if(product.status==='ready')thumbnail(product).then(img=>{if(active)setSrc(img);}).catch(()=>{});return()=>{active=false;};},[product]);
  return src?<img src={src} alt={`${product.name}的三维模型`} onError={()=>setSrc('')}/>:<div className="thumbnail-loading"><Box size={24}/></div>;
}
