import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three/webgpu';
import { createRenderer } from '../engine/renderer';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { loadModel, calibrateModel, releaseModel } from '../engine/models';
import type { Product, Vec3 } from '../../shared/types';
export interface PreviewHandle {capture():Promise<string>;bounds():{center:Vec3;max:Vec3;min:Vec3}|null}
export default forwardRef<PreviewHandle,{product:Product;onMeshes:(names:string[])=>void;onPick:(name:string,point:Vec3)=>void;onError:(e:string)=>void}>(function ProductPreview({product,onMeshes,onPick,onError},ref){
  const host=useRef<HTMLDivElement>(null),state=useRef<any>(null),latest=useRef({product,onMeshes,onPick,onError});latest.current={product,onMeshes,onPick,onError};
  const [loading,setLoading]=useState(true);
  useImperativeHandle(ref,()=>({capture:()=>new Promise(resolve=>{if(!state.current)return resolve('');state.current.capture=resolve;}),bounds:()=>state.current?.bounds||null}),[]);
  useEffect(()=>{
    let alive=true;const h=host.current!;setLoading(true);
    (async()=>{
      const renderer=await createRenderer({antialias:true});renderer.setSize(h.clientWidth,h.clientHeight);renderer.setPixelRatio(1.5);renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1;if(!alive){renderer.dispose();return;}
      const scene=new THREE.Scene();scene.background=new THREE.Color(0x232b2a);scene.add(new THREE.HemisphereLight(0xe5f2eb,0x30362f,2));const key=new THREE.DirectionalLight(0xffeed6,4);key.position.set(4,8,5);scene.add(key);const rim=new THREE.DirectionalLight(0x9dcfe6,3);rim.position.set(-3,2,-5);scene.add(rim);
      const camera=new THREE.PerspectiveCamera(40,h.clientWidth/h.clientHeight,.001,10000),controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=true;
      const source=await loadModel(latest.current.product);if(!alive){releaseModel(source);renderer.dispose();controls.dispose();return;}
      const box=new THREE.Box3().setFromObject(source),center=box.getCenter(new THREE.Vector3()),bounds={center:center.toArray() as Vec3,min:box.min.toArray() as Vec3,max:box.max.toArray() as Vec3};
      const names:string[]=[];source.traverse(o=>{if(o instanceof THREE.Mesh&&o.name)names.push(o.name);});latest.current.onMeshes([...new Set(names)]);
      let model:THREE.Group|null=null,previous='',framed=false;
      const arrow=new THREE.ArrowHelper(new THREE.Vector3(0,-1,0),new THREE.Vector3(),.5,0xdaed87);scene.add(arrow);
      const grid=new THREE.GridHelper(6,20,0x697367,0x3c4740);scene.add(grid);
      h.appendChild(renderer.domElement);state.current={renderer,scene,camera,controls,bounds,capture:null};
      const resize=new ResizeObserver(()=>{renderer.setSize(h.clientWidth,h.clientHeight);camera.aspect=h.clientWidth/h.clientHeight;camera.updateProjectionMatrix();});resize.observe(h);
      const ray=new THREE.Raycaster(),mouse=new THREE.Vector2();let down=[0,0];renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});renderer.domElement.addEventListener('pointerup',e=>{if(!model||Math.hypot(e.clientX-down[0],e.clientY-down[1])>4)return;const r=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-r.left)/r.width*2-1,-(e.clientY-r.top)/r.height*2+1);ray.setFromCamera(mouse,camera);const hit=ray.intersectObject(model,true)[0];if(hit)latest.current.onPick(hit.object.name,hit.point.toArray() as Vec3);});
      renderer.setAnimationLoop(()=>{
        const p=latest.current.product,signature=JSON.stringify(p.calibration);
        if(signature!==previous){
          if(model){scene.remove(model);releaseModel(model);}const copy=source.clone(true);copy.traverse(o=>{if(o instanceof THREE.Mesh)o.material=Array.isArray(o.material)?o.material.map(m=>m.clone()):o.material.clone();});model=calibrateModel(copy,p);scene.add(model);previous=signature;
          const calibrated=new THREE.Box3().setFromObject(model),size=calibrated.getSize(new THREE.Vector3()).length(),at=calibrated.getCenter(new THREE.Vector3());
          arrow.position.set(...p.calibration.emitter);arrow.setDirection(new THREE.Vector3(...p.calibration.direction).normalize());arrow.setLength(Math.max(size*.3,.1));grid.position.y=calibrated.min.y-.002;grid.scale.setScalar(Math.max(size/4,.05));
          if(!framed){camera.position.copy(at).add(new THREE.Vector3(size*.9,size*.55,size*1.4));controls.target.copy(at);camera.near=Math.max(.0001,size/1000);camera.far=Math.max(100,size*20);camera.updateProjectionMatrix();framed=true;}
        }
        controls.update();renderer.render(scene,camera);if(state.current?.capture){state.current.capture(renderer.domElement.toDataURL('image/png'));state.current.capture=null;}
      });
      state.current.cleanup=()=>{renderer.setAnimationLoop(null);resize.disconnect();controls.dispose();if(model)releaseModel(model);releaseModel(source);grid.geometry.dispose();(grid.material as THREE.Material).dispose();renderer.dispose();renderer.domElement.remove();};setLoading(false);
    })().catch(e=>{if(alive){setLoading(false);latest.current.onError(e.message);}});
    return()=>{alive=false;state.current?.cleanup?.();state.current=null;};
  },[product.assetId,product.modelFormat]);
  return <div className="product-preview" ref={host}>{loading&&<div className="preview-loading"><div className="loading-orbit"/>加载模型</div>}<div className="preview-caption">拖动旋转 · 点击零件选择发光面与发光中心</div></div>;
});
