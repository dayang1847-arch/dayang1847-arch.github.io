import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=fileURLToPath(new URL('../',import.meta.url)),port=Number(process.env.LIGHTING_PORT||3040),url=`http://127.0.0.1:${port}`;
const npm=process.platform==='win32'?'npm.cmd':'npm';
function run(args){return new Promise((resolve,reject)=>{const child=spawn(npm,args,{cwd:root,stdio:'inherit',shell:process.platform==='win32'});child.on('exit',code=>code===0?resolve():reject(new Error(`操作未完成（退出代码 ${code}）`)));child.on('error',reject);});}
function openBrowser(){const command=process.platform==='darwin'?'open':process.platform==='win32'?'cmd':'xdg-open';const args=process.platform==='win32'?['/c','start','',url]:[url];const child=spawn(command,args,{stdio:'ignore',detached:true});child.on('error',()=>console.log(`请在浏览器打开 ${url}`));child.unref();}
try{
  const health=await fetch(url+'/api/health',{signal:AbortSignal.timeout(900)}).then(r=>r.json()).catch(()=>null);
  if(health?.version==='1.0.0'){console.log('照明系统已在运行，正在打开。');openBrowser();process.exit(0);}
  if(!existsSync(path.join(root,'node_modules'))){console.log('首次启动：正在安装本地运行资源，需要连接网络。');await run(['ci']);}
  if(!existsSync(path.join(root,'dist','index.html'))){console.log('正在准备本地应用。');await run(['run','build']);}
  const child=spawn(process.execPath,['--import','tsx','server/index.ts'],{cwd:root,stdio:'inherit',env:{...process.env,TSX_DISABLE_CACHE:'1'}});
  let opened=false;const timer=setInterval(async()=>{try{const r=await fetch(url+'/api/health',{signal:AbortSignal.timeout(1000)});if(r.ok&&!opened){opened=true;clearInterval(timer);openBrowser();}}catch{}},600);
  child.on('exit',code=>{clearInterval(timer);process.exit(code||0);});child.on('error',e=>{clearInterval(timer);console.error(e.message);process.exit(1);});
  process.on('SIGINT',()=>child.kill('SIGINT'));process.on('SIGTERM',()=>child.kill('SIGTERM'));
}catch(e){console.error('启动失败：'+e.message);process.exit(1);}
