import * as THREE from 'three/webgpu';

type Options={antialias?:boolean;alpha?:boolean;forceWebGL?:boolean};
export async function createRenderer(options:Options={}){
  const renderer=new THREE.WebGPURenderer(options);
  if(options.forceWebGL){await renderer.init();return renderer;}
  const pending=renderer.init();let timer:ReturnType<typeof setTimeout>|undefined;
  try{
    await Promise.race([pending,new Promise<never>((_,reject)=>{timer=setTimeout(()=>reject(new Error('GPU 初始化超时')),8000);})]);
    return renderer;
  }catch{
    pending.then(()=>renderer.dispose()).catch(()=>{});
    const fallback=new THREE.WebGPURenderer({...options,forceWebGL:true});await fallback.init();return fallback;
  }finally{if(timer)clearTimeout(timer);}
}
