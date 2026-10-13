import { PUBLIC_DEMO, demoStore } from './public-demo';
export async function api<T=any>(url:string,method='GET',body?:unknown):Promise<T>{
  if(PUBLIC_DEMO)return demoStore().request(url,method,body);
  const form=body instanceof FormData;
  const res=await fetch(url,{method,headers:body&&!form?{'Content-Type':'application/json'}:undefined,body:body?(form?body:JSON.stringify(body)):undefined});
  const data=await res.json();if(!res.ok)throw new Error(data.error||'本地服务请求失败');return data;
}
export function upload(url:string,file:File,onProgress?:(v:number)=>void):Promise<any>{
  if(PUBLIC_DEMO)return url==='/api/import'?demoStore().importBundle(file):Promise.reject(new Error('产品导入需要完整本地版，请下载后使用。'));
  return new Promise((resolve,reject)=>{const xhr=new XMLHttpRequest(),form=new FormData();form.append('file',file);xhr.open('POST',url);xhr.upload.onprogress=e=>{if(e.lengthComputable)onProgress?.(Math.round(e.loaded/e.total*100));};xhr.onerror=()=>reject(new Error('本地服务连接失败'));xhr.onload=()=>{try{const data=JSON.parse(xhr.responseText);if(xhr.status>=200&&xhr.status<300)resolve(data);else reject(new Error(data.error||'上传失败'));}catch{reject(new Error('上传结果无法读取'));}};xhr.send(form);});
}
export async function requestBlob(url:string){
  if(PUBLIC_DEMO)return demoStore().blob(url);
  const res=await fetch(url);if(!res.ok){const data=await res.json();throw new Error(data.error||'文件读取失败');}return res.blob();
}
export async function downloadFile(url:string,filename:string){const object=URL.createObjectURL(await requestBlob(url));downloadData(object,filename);setTimeout(()=>URL.revokeObjectURL(object),10000);}
export function downloadData(data:string,filename:string){const a=document.createElement('a');a.href=data;a.download=filename;a.click();}
