import { forwardRef, useEffect, useImperativeHandle, useRef, useState } from 'react';
import * as THREE from 'three/webgpu';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { TransformControls } from 'three/addons/controls/TransformControls.js';
import { createRenderer } from './renderer';
import { buildEnvironment, configureEnvironment } from './environment';
import { FullIESLight, FullIESLightNode, cctColor } from './ies-light';
import { loadModel, calibrateModel, releaseModel } from './models';
import { fixtureEmitter, rotate, photometricBasis } from '../../shared/photometry';
import { CAMERA_STOPS, sceneSlots } from '../../shared/scenes';
import type { ScenePlan, Product, Fixture, CameraPose, AnalysisResult, Vec3, Mode } from '../../shared/types';

export interface ViewerHandle {capture():Promise<string>;camera():CameraPose;setCamera(pose:CameraPose):void;reset():void;focus(id:string):void}
interface Props { plan:ScenePlan;products:Product[];selected:string|null;mode:Mode;editing:boolean;touring:boolean;quality:'low'|'medium'|'high';transform:'translate'|'rotate';analysis:AnalysisResult|null;maintenance:number;onSelect:(id:string|null)=>void;onSlot:(id:string)=>void;onChange:(id:string,patch:Partial<Fixture>)=>void;onStats:(s:{fps:number;backend:string;triangles:number})=>void;onError:(error:string)=>void;onTourStop:()=>void }
type Entry={group:THREE.Group;light:FullIESLight;productKey:string;release:()=>void};
type Runtime={renderer:THREE.WebGPURenderer;scene:THREE.Scene;camera:THREE.PerspectiveCamera;controls:OrbitControls;gizmo:TransformControls;environment:ReturnType<typeof buildEnvironment>;entries:Map<string,Entry>;markers:THREE.Group;heatmap:THREE.Mesh;alive:boolean;captures:((data:string)=>void)[];loads:Set<string>;generation:number};

function heatTexture(result:AnalysisResult){
  const {plane,values,max}=result,c=document.createElement('canvas');c.width=plane.nx;c.height=plane.ny;
  const ctx=c.getContext('2d')!,image=ctx.createImageData(c.width,c.height);
  for(let i=0;i<values.length;i++){const color=heatColor(values[i],max),n=i*4;image.data[n]=color[0];image.data[n+1]=color[1];image.data[n+2]=color[2];image.data[n+3]=215;}
  ctx.putImageData(image,0,0);const t=new THREE.CanvasTexture(c);t.minFilter=THREE.LinearFilter;t.magFilter=THREE.LinearFilter;t.colorSpace=THREE.SRGBColorSpace;return t;
}
export function heatColor(value:number,max:number):[number,number,number]{
  const stops=[[25,40,95],[29,98,160],[34,165,150],[144,206,79],[249,226,70],[255,147,47],[232,62,59]];
  const scaled=Math.min(1,Math.max(0,max?value/max:0))*(stops.length-1),i=Math.min(stops.length-2,Math.floor(scaled)),t=scaled-i;
  return stops[i].map((v,j)=>Math.round(v+(stops[i+1][j]-v)*t)) as [number,number,number];
}
export default forwardRef<ViewerHandle,Props>(function Viewer(props,ref){
  const canvasHost=useRef<HTMLDivElement>(null),runtime=useRef<Runtime|null>(null),latest=useRef(props);latest.current=props;
  const [ready,setReady]=useState(false),[failure,setFailure]=useState('');
  useImperativeHandle(ref,()=>({
    capture:()=>new Promise((resolve,reject)=>{if(!runtime.current)return reject(new Error('场景尚未就绪'));runtime.current.captures.push(resolve);}),
    camera:()=>{const r=runtime.current;return r?{position:r.camera.position.toArray() as Vec3,target:r.controls.target.toArray() as Vec3}:CAMERA_STOPS[props.plan.sceneType][0];},
    setCamera:pose=>{const r=runtime.current;if(r){r.camera.position.set(...pose.position);r.controls.target.set(...pose.target);r.controls.update();}},
    reset:()=>{const r=runtime.current;if(r){const p=CAMERA_STOPS[latest.current.plan.sceneType][0];r.camera.position.set(...p.position);r.controls.target.set(...p.target);r.controls.update();}},
    focus:id=>{const r=runtime.current,f=latest.current.plan.fixtures.find(f=>f.id===id);if(!r||!f)return;r.controls.target.set(...f.position);r.camera.position.set(f.position[0]+3,f.position[1]+2,f.position[2]+4);r.controls.update();},
  }),[props.plan.sceneType]);

  useEffect(()=>{
    const host=canvasHost.current!;let disposed=false,local:Runtime|null=null;setReady(false);setFailure('');
    (async()=>{
      const renderer=await createRenderer({antialias:true,alpha:false,forceWebGL:new URLSearchParams(location.search).has('webgl')});
      renderer.library.addLight(FullIESLightNode as any,FullIESLight as any);
      renderer.setPixelRatio(Math.min(devicePixelRatio,1.5));renderer.setSize(host.clientWidth,host.clientHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFShadowMap;
      renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=.3;
      if(disposed){renderer.dispose();return;}
      const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(42,host.clientWidth/host.clientHeight,.05,250);
      const cameraPose=latest.current.plan.camera||CAMERA_STOPS[latest.current.plan.sceneType][0];camera.position.set(...cameraPose.position);
      const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(...cameraPose.target);controls.enableDamping=true;controls.dampingFactor=.06;controls.minDistance=2;controls.maxDistance=latest.current.plan.sceneType==='indoor'?40:110;controls.maxPolarAngle=Math.PI*.49;controls.update();
      const environment=buildEnvironment(latest.current.plan.sceneType);scene.add(environment.group);configureEnvironment(scene,environment,latest.current.plan.sceneType,latest.current.plan.environment);
      const markers=new THREE.Group();scene.add(markers);
      for(const slot of sceneSlots(latest.current.plan.sceneType)){
        const marker=new THREE.Mesh(new THREE.SphereGeometry(latest.current.plan.sceneType==='indoor'?.14:.25,12,8),new THREE.MeshBasicMaterial({color:0xddeb83,transparent:true,opacity:.8,depthTest:false}));marker.position.set(...slot.position);marker.userData.slotId=slot.id;marker.renderOrder=5;markers.add(marker);
      }
      const heatmap=new THREE.Mesh(new THREE.PlaneGeometry(1,1),new THREE.MeshBasicMaterial({transparent:true,opacity:.88,side:THREE.DoubleSide,depthWrite:false}));heatmap.visible=false;heatmap.renderOrder=4;scene.add(heatmap);
      const gizmo=new TransformControls(camera,renderer.domElement);gizmo.setSize(.65);scene.add(gizmo.getHelper());
      gizmo.addEventListener('dragging-changed',(e:any)=>{controls.enabled=!e.value;});
      gizmo.addEventListener('mouseUp',()=>{const o=gizmo.object;if(o){latest.current.onChange(o.userData.fixtureId,{position:o.position.toArray() as Vec3,rotation:[o.rotation.x,o.rotation.y,o.rotation.z].map(v=>v*180/Math.PI) as Vec3});}});
      local={renderer,scene,camera,controls,gizmo,environment,entries:new Map(),markers,heatmap,alive:true,captures:[],loads:new Set(),generation:0};runtime.current=local;host.appendChild(renderer.domElement);
      const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2();let down=[0,0];
      renderer.domElement.addEventListener('pointerdown',e=>{down=[e.clientX,e.clientY];});
      renderer.domElement.addEventListener('pointerup',e=>{
        if(Math.hypot(e.clientX-down[0],e.clientY-down[1])>5||gizmo.dragging)return;
        const rect=renderer.domElement.getBoundingClientRect();mouse.set((e.clientX-rect.left)/rect.width*2-1,-(e.clientY-rect.top)/rect.height*2+1);raycaster.setFromCamera(mouse,camera);
        const hits=raycaster.intersectObjects([...local!.entries.values()].map(v=>v.group).concat(latest.current.editing?[markers]:[]),true);
        for(const h of hits){let o:THREE.Object3D|null=h.object;while(o){if(o.userData.slotId){latest.current.onSlot(o.userData.slotId);return;}if(o.userData.fixtureId){latest.current.onSelect(o.userData.fixtureId);return;}o=o.parent;}}
        if(latest.current.editing)latest.current.onSelect(null);
      });
      controls.addEventListener('start',()=>{if(latest.current.touring)latest.current.onTourStop();});
      const resize=new ResizeObserver(()=>{const w=host.clientWidth,h=host.clientHeight;if(w&&h){renderer.setSize(w,h);camera.aspect=w/h;camera.updateProjectionMatrix();}});resize.observe(host);
      let last=performance.now(),statTime=last,frames=0,tourStart=last,wasTour=false;
      renderer.setAnimationLoop((time)=>{
        if(!local?.alive)return;
        const p=latest.current;
        if(p.touring){
          if(!wasTour)tourStart=time;
          const stops=CAMERA_STOPS[p.plan.sceneType],elapsed=(time-tourStart)/9000,i=Math.floor(elapsed)%stops.length,t=elapsed%1,smooth=t*t*(3-2*t),from=stops[i],to=stops[(i+1)%stops.length];
          camera.position.lerpVectors(new THREE.Vector3(...from.position),new THREE.Vector3(...to.position),smooth);controls.target.lerpVectors(new THREE.Vector3(...from.target),new THREE.Vector3(...to.target),smooth);
        }
        wasTour=p.touring;controls.update();environment.group.traverse(o=>{if(o.userData.ceiling)o.visible=camera.position.y<6;});renderer.render(scene,camera);
        for(const resolve of local.captures.splice(0)){try{resolve(renderer.domElement.toDataURL('image/png'));}catch{resolve('');}}
        frames++;if(time-statTime>1200){p.onStats({fps:Math.round(frames*1000/(time-statTime)),backend:(renderer.backend as any).isWebGPUBackend?'WebGPU':'WebGL 2',triangles:renderer.info.render.triangles});frames=0;statTime=time;}
        last=time;
      });
      (local as any).observer=resize;setReady(true);
    })().catch(e=>{if(!disposed){setFailure(e.message||'3D 初始化失败');latest.current.onError(e.message||'3D 初始化失败');}});
    return()=>{
      disposed=true;setReady(false);if(!local)return;local.alive=false;local.generation++;local.renderer.setAnimationLoop(null);(local as any).observer?.disconnect();local.gizmo.dispose();local.controls.dispose();for(const e of local.entries.values())e.release();local.environment.release();local.markers.traverse(o=>{if(o instanceof THREE.Mesh){o.geometry.dispose();(o.material as THREE.Material).dispose();}});local.heatmap.geometry.dispose();const mat=local.heatmap.material as THREE.MeshBasicMaterial;mat.map?.dispose();mat.dispose();local.renderer.dispose();local.renderer.domElement.remove();if(runtime.current===local)runtime.current=null;
    };
  },[props.plan.sceneType]);

  useEffect(()=>{
    const r=runtime.current;if(!r||!ready)return;
    configureEnvironment(r.scene,r.environment,props.plan.sceneType,props.plan.environment);
    const quality={low:{ratio:1,shadows:2},medium:{ratio:1.25,shadows:4},high:{ratio:Math.min(devicePixelRatio,2),shadows:8}}[props.quality];r.renderer.setPixelRatio(quality.ratio);
    const currentIds=new Set(props.plan.fixtures.map(f=>f.id));
    for(const [id,entry]of r.entries)if(!currentIds.has(id)){if(r.gizmo.object===entry.group)r.gizmo.detach();r.scene.remove(entry.group,entry.light,entry.light.target);entry.release();r.entries.delete(id);}
    const update=(entry:Entry,f:Fixture,p:Product)=>{
      entry.group.position.set(...f.position);entry.group.rotation.set(...f.rotation.map(v=>v*Math.PI/180) as Vec3);entry.light.position.set(...fixtureEmitter(f,p));entry.light.configure(f,p,props.maintenance);
      const i=props.plan.fixtures.findIndex(v=>v.id===f.id);entry.light.castShadow=i<quality.shadows;entry.light.shadow.mapSize.set(props.quality==='high'?1024:512,props.quality==='high'?1024:512);entry.light.shadow.normalBias=.03;
      entry.group.traverse(o=>{if(o instanceof THREE.Mesh&&o.userData.emitter){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)if(m instanceof THREE.MeshStandardMaterial){m.emissive.copy(cctColor(f.cct));m.emissiveIntensity=f.level/100*3;}}});
      if(r.gizmo.object===entry.group)r.gizmo.getHelper().updateMatrixWorld();
    };
    for(const f of props.plan.fixtures){
      const p=props.products.find(p=>p.id===f.productId&&p.version===f.productVersion);if(!p?.photometry)continue;
      const key=`${p.id}@${p.version}`,old=r.entries.get(f.id);
      if(old&&old.productKey===key){update(old,f,p);continue;}
      if(old){r.scene.remove(old.group,old.light,old.light.target);old.release();r.entries.delete(f.id);}
      const token=`${f.id}:${key}`;if(r.loads.has(token))continue;r.loads.add(token);const generation=r.generation;
      loadModel(p).then(model=>{
        r.loads.delete(token);
        const now=latest.current.plan.fixtures.find(v=>v.id===f.id);if(!r.alive||r.generation!==generation||!now||`${now.productId}@${now.productVersion}`!==key){releaseModel(model);return;}
        const group=calibrateModel(model,p);group.userData.fixtureId=f.id;const light=new FullIESLight(p),entry:Entry={group,light,productKey:key,release:()=>{releaseModel(group);light.release();}};
        r.entries.set(f.id,entry);r.scene.add(group,light,light.target);update(entry,now,p);
        if(latest.current.selected===f.id&&latest.current.editing)r.gizmo.attach(group);
      }).catch(e=>{r.loads.delete(token);latest.current.onError(`${p.name}：${e.message}`);});
    }
  },[ready,props.plan.fixtures,props.products,props.plan.environment,props.quality,props.maintenance]);
  useEffect(()=>{
    const r=runtime.current;if(!r||!ready)return;r.markers.visible=props.editing;
    const selected=props.selected?r.entries.get(props.selected):null;
    r.gizmo.setMode(props.transform);if(props.editing&&selected)r.gizmo.attach(selected.group);else r.gizmo.detach();
    for(const [id,e]of r.entries)e.group.traverse(o=>{if(o instanceof THREE.Mesh){const mats=Array.isArray(o.material)?o.material:[o.material];for(const m of mats)if(m instanceof THREE.MeshStandardMaterial&&!o.userData.emitter){m.emissive.setHex(id===props.selected?0x26351a:0x000000);m.emissiveIntensity=.25;}}});
  },[ready,props.selected,props.editing,props.transform]);
  useEffect(()=>{
    const r=runtime.current;if(!r||!ready)return;const result=props.analysis;
    r.heatmap.visible=props.mode==='analysis'&&!!result&&result.revision===props.plan.revision;
    if(!result)return;
    const mat=r.heatmap.material as THREE.MeshBasicMaterial;mat.map?.dispose();mat.map=heatTexture(result);mat.needsUpdate=true;
    r.heatmap.scale.set(result.plane.width,result.plane.depth,1);
    if(result.plane.kind==='vertical'){r.heatmap.rotation.set(0,0,0);r.heatmap.position.set(0,result.plane.height,result.plane.z+.03);}
    else{r.heatmap.rotation.set(-Math.PI/2,0,0);r.heatmap.position.set(0,result.plane.height+.025,0);}
  },[ready,props.analysis,props.mode,props.plan.revision]);
  return <div className="viewer-canvas" ref={canvasHost} aria-label="照明三维场景">{!ready&&!failure&&<div className="scene-loading"><div className="loading-orbit"/><span>正在构建光的空间</span><small>本地模型 · 真实配光</small></div>}{failure&&<div className="scene-loading"><strong>3D 场景加载失败</strong><p>{failure}</p><button onClick={()=>location.href=location.pathname+'?webgl'}>使用兼容模式重新打开</button></div>}</div>;
});
