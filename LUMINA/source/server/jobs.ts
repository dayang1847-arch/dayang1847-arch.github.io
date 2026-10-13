import { fork, type ChildProcess } from 'node:child_process';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import { promises as fs } from 'node:fs';
import type { ConversionJob } from '../shared/types';
import type { Store } from './storage';
export class ConversionQueue {
  jobs=new Map<string,ConversionJob>(); private current?:{job:ConversionJob;child:ChildProcess;timer:NodeJS.Timeout};
  private queue:{job:ConversionJob;source:string;quality:string}[]=[];
  constructor(private store:Store,private emit:(event:unknown)=>void){}
  enqueue(assetId:string,filename:string,source:string,quality='normal'){
    const job:ConversionJob={id:randomUUID(),assetId,filename,state:'queued',createdAt:new Date().toISOString()};this.jobs.set(job.id,job);this.queue.push({job,source,quality});this.emit({type:'job',job});this.next();return job;
  }
  private update(job:ConversionJob,patch:Partial<ConversionJob>){Object.assign(job,patch);this.emit({type:'job',job});}
  private next(){
    if(this.current)return;const next=this.queue.shift();if(!next)return;const {job,source,quality}=next;
    this.update(job,{state:'converting'});
    const child=fork(fileURLToPath(new URL('./cad-worker.cjs',import.meta.url)),[],{stdio:['ignore','ignore','pipe','ipc'],execArgv:['--max-old-space-size=2048']});
    const finish=(patch:Partial<ConversionJob>)=>{
      if(this.current?.job.id!==job.id)return;clearTimeout(this.current.timer);this.update(job,patch);this.current=undefined;this.next();
    };
    const timer=setTimeout(()=>{child.kill('SIGKILL');finish({state:'error',error:'转换超过 120 秒，已停止。可选择简化转换后重试。'});},120000);
    this.current={job,child,timer};
    child.on('message',(msg:any)=>{if(msg.stage)this.update(job,{state:'writing'});else if(msg.done)finish({state:'ready',meshCount:msg.meshCount,triangles:msg.triangles});else if(msg.error)finish({state:'error',error:msg.error});});
    child.on('error',e=>finish({state:'error',error:e.message}));child.on('exit',()=>finish({state:'error',error:'转换进程意外退出，请重试。'}));
    child.send({source,target:path.join(this.store.assetDir(job.assetId),'mesh.json'),format:path.extname(source),quality});
  }
  cancel(id:string){
    const job=this.jobs.get(id);if(!job)throw new Error('转换任务不存在');
    if(this.current?.job.id===id){const {child,timer}=this.current;clearTimeout(timer);child.kill('SIGKILL');this.current=undefined;this.update(job,{state:'cancelled'});this.next();}
    else if(job.state==='queued'){this.queue=this.queue.filter(v=>v.job.id!==id);this.update(job,{state:'cancelled'});}
    return job;
  }
  async retry(id:string,quality='low'){const job=this.jobs.get(id);if(!job)throw new Error('转换任务不存在');if(['queued','converting','writing'].includes(job.state))throw new Error('转换任务正在运行');const files=await fs.readdir(this.store.assetDir(job.assetId)),source=files.find(f=>/^source\.(step|stp|iges|igs)$/.test(f));if(!source)throw new Error('原始文件不存在');return this.enqueue(job.assetId,job.filename,path.join(this.store.assetDir(job.assetId),source),quality);}
  close(){if(this.current){clearTimeout(this.current.timer);this.current.child.kill('SIGKILL');}this.queue=[];}
}
