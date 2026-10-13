import { useEffect, useRef, useState } from 'react';
import { Activity, FileDown, Layers, RefreshCw, SlidersHorizontal } from 'lucide-react';
import type { AnalysisPlane, AnalysisResult, Product, ScenePlan } from '../../shared/types';
import { intensityAt } from '../../shared/photometry';
import { heatColor } from '../engine/Viewer';
import { SCENE_INFO } from '../../shared/scenes';
export interface AnalysisSettings {kind:AnalysisPlane['kind'];height:number;width:number;depth:number;z:number;maintenance:number;contours:boolean}
export function defaultAnalysis(plan:ScenePlan):AnalysisSettings {const info=SCENE_INFO[plan.sceneType];return {kind:plan.sceneType==='indoor'?'work':'ground',height:plan.sceneType==='indoor'?.8:.16,width:info.width-1,depth:info.depth-1,z:plan.sceneType==='indoor'?-6.5:-17,maintenance:.8,contours:true};}
export function drawHeatmap(canvas:HTMLCanvasElement,r:AnalysisResult,contours=true){
  const {plane:p}=r,ctx=canvas.getContext('2d')!,dpr=2,w=canvas.clientWidth||300,h=canvas.clientHeight||240;canvas.width=w*dpr;canvas.height=h*dpr;ctx.scale(dpr,dpr);ctx.fillStyle='#121718';ctx.fillRect(0,0,w,h);
  const pad=27,pw=w-pad*2,ph=h-pad*2;
  const temp=document.createElement('canvas');temp.width=p.nx;temp.height=p.ny;const tx=temp.getContext('2d')!,im=tx.createImageData(p.nx,p.ny);
  r.values.forEach((v,i)=>{const c=heatColor(v,r.max);im.data.set([...c,255],i*4);});tx.putImageData(im,0,0);ctx.imageSmoothingEnabled=true;ctx.drawImage(temp,pad,pad,pw,ph);
  if(contours){ctx.strokeStyle='rgba(255,255,255,.52)';ctx.lineWidth=.6;
    for(const ratio of [.2,.4,.6,.8]){const level=r.max*ratio;ctx.beginPath();for(let j=0;j<p.ny-1;j++)for(let i=0;i<p.nx-1;i++){
      const vals=[r.values[j*p.nx+i],r.values[j*p.nx+i+1],r.values[(j+1)*p.nx+i+1],r.values[(j+1)*p.nx+i]],points=[[i,j],[i+1,j],[i+1,j+1],[i,j+1]],hits:number[][]=[];
      for(let e=0;e<4;e++){const next=(e+1)%4;if((vals[e]<level)!==(vals[next]<level)){const t=(level-vals[e])/(vals[next]-vals[e]);hits.push([points[e][0]+(points[next][0]-points[e][0])*t,points[e][1]+(points[next][1]-points[e][1])*t]);}}
      for(let k=0;k+1<hits.length;k+=2){ctx.moveTo(pad+hits[k][0]/(p.nx-1)*pw,pad+hits[k][1]/(p.ny-1)*ph);ctx.lineTo(pad+hits[k+1][0]/(p.nx-1)*pw,pad+hits[k+1][1]/(p.ny-1)*ph);}
    }ctx.stroke();}
  }
  ctx.strokeStyle='#6d7975';ctx.lineWidth=1;ctx.strokeRect(pad,pad,pw,ph);ctx.fillStyle='#9ba79e';ctx.font='10px sans-serif';ctx.textAlign='center';ctx.fillText(`${p.width.toFixed(1)} m`,w/2,h-7);ctx.save();ctx.translate(10,h/2);ctx.rotate(-Math.PI/2);ctx.fillText(`${p.depth.toFixed(1)} m`,0,0);ctx.restore();
}
export function Polar({product}: {product:Product}){
  const ref=useRef<HTMLCanvasElement>(null);
  useEffect(()=>{const c=ref.current;if(!c||!product.photometry)return;const ctx=c.getContext('2d')!,d=product.photometry,w=260,h=190;c.width=w*2;c.height=h*2;ctx.scale(2,2);ctx.clearRect(0,0,w,h);const cx=w/2,cy=88,r=72;
    ctx.strokeStyle='#3c4542';ctx.lineWidth=.6;for(let i=1;i<=4;i++){ctx.beginPath();ctx.arc(cx,cy,r*i/4,0,Math.PI*2);ctx.stroke();}ctx.beginPath();ctx.moveTo(cx-r,cy);ctx.lineTo(cx+r,cy);ctx.moveTo(cx,cy-r);ctx.lineTo(cx,cy+r);ctx.stroke();
    for(const [cp,color]of [[0,'#d5e785'],[90,'#71b3dc']] as const){ctx.strokeStyle=color;ctx.lineWidth=1.7;ctx.beginPath();for(let angle=-180;angle<=180;angle+=2){const v=intensityAt(d,Math.abs(angle),angle<0?cp+180:cp)/Math.max(1,d.peak)*r,a=angle*Math.PI/180;const x=cx+Math.sin(a)*v,y=cy+Math.cos(a)*v;if(angle===-180)ctx.moveTo(x,y);else ctx.lineTo(x,y);}ctx.stroke();}
    ctx.fillStyle='#c0c8c1';ctx.font='10px sans-serif';ctx.fillText('C0–180',35,184);ctx.fillText('C90–270',153,184);ctx.fillStyle='#d5e785';ctx.fillRect(21,177,9,2);ctx.fillStyle='#71b3dc';ctx.fillRect(139,177,9,2);
  },[product]);return <canvas ref={ref} className="polar-canvas" aria-label="灯具配光曲线"/>;
}
export default function AnalysisPanel({result,settings,onSettings,busy,onReport,revision}:{result:AnalysisResult|null;settings:AnalysisSettings;onSettings:(patch:Partial<AnalysisSettings>)=>void;busy:boolean;onReport:()=>void;revision:number}){
  const ref=useRef<HTMLCanvasElement>(null),[probe,setProbe]=useState<{x:number;y:number;v:number}|null>(null);
  const valid=result&&result.revision===revision;
  useEffect(()=>{if(ref.current&&result)drawHeatmap(ref.current,result,settings.contours);},[result,settings.contours]);
  return <aside className="right-panel analysis-panel"><div className="panel-heading"><span><Activity size={16}/> IES 照度分析</span><span className="tiny-badge">直接光</span></div>
    <div className="panel-scroll"><div className="analysis-intro">用真实配光，读懂空间中的光。</div>
    <div className="metric-grid"><div><span>平均照度</span><strong>{valid?result.avg.toFixed(0):'—'}<small>lx</small></strong></div><div><span>均匀度 U₀</span><strong>{valid?result.uniformity.toFixed(2):'—'}</strong></div><div><span>最低照度</span><strong>{valid?result.min.toFixed(0):'—'}<small>lx</small></strong></div><div><span>最高照度</span><strong>{valid?result.max.toFixed(0):'—'}<small>lx</small></strong></div></div>
    <div className="section-label"><Layers size={13}/> 计算面</div><div className="segmented compact">{[['work','工作面'],['ground','地面'],['vertical','垂直面']].map(([key,name])=><button key={key} className={settings.kind===key?'active':''} onClick={()=>onSettings({kind:key as AnalysisPlane['kind'],height:key==='work'?.8:key==='ground'?.16:1.8,depth:key==='vertical'?3:settings.depth})}>{name}</button>)}</div>
    <div className="field-grid"><label>高度 / 中心高度 m<input type="number" step=".1" min="0" max="20" value={settings.height} onChange={e=>onSettings({height:Number(e.target.value)})}/></label><label>宽度 m<input type="number" min="1" max="100" value={settings.width} onChange={e=>onSettings({width:Number(e.target.value)})}/></label><label>{settings.kind==='vertical'?'面高度 m':'深度 m'}<input type="number" min="1" max="100" value={settings.depth} onChange={e=>onSettings({depth:Number(e.target.value)})}/></label>{settings.kind==='vertical'&&<label>位置 Z m<input type="number" value={settings.z} step=".1" onChange={e=>onSettings({z:Number(e.target.value)})}/></label>}</div>
    <div className="range-label"><span><SlidersHorizontal size={12}/> 维护系数</span><b>{settings.maintenance.toFixed(2)}</b></div><input type="range" min=".5" max="1" step=".01" value={settings.maintenance} onChange={e=>onSettings({maintenance:Number(e.target.value)})}/>
    <div className="section-label space-between"><span>照度分布</span><label className="inline-check"><input type="checkbox" checked={settings.contours} onChange={e=>onSettings({contours:e.target.checked})}/>等照度线</label></div>
    <div className="heatmap-wrap"><canvas ref={ref} aria-label="照度热图，移动指针读取照度" onPointerMove={e=>{if(!valid)return;const rect=e.currentTarget.getBoundingClientRect(),x=(e.clientX-rect.left-27)/(rect.width-54),y=(e.clientY-rect.top-27)/(rect.height-54);if(x<0||x>1||y<0||y>1){setProbe(null);return;}const p=result.plane,i=Math.round(x*(p.nx-1)),j=Math.round(y*(p.ny-1));setProbe({x:(x-.5)*p.width,y:(y-.5)*p.depth,v:result.values[j*p.nx+i]});}} onPointerLeave={()=>setProbe(null)}/>{busy&&<div className="heatmap-pending"><RefreshCw size={16} className="spin"/> 计算中</div>}</div>
    <div className="heat-legend"><span>0</span><div/><span>{valid?Math.round(result.max):'—'} lx</span></div><div className="probe-text">{probe?`X ${probe.x.toFixed(2)} · ${settings.kind==='vertical'?'Y':'Z'} ${probe.y.toFixed(2)} m ｜ ${probe.v.toFixed(1)} lx`:'将指针移到热图上，读取位置照度'}</div>
    <p className="analysis-note">仅统计人工照明的直接光。未计入反射、遮挡、日光和 UGR。{valid&&<><br/>方案版本 {result.revision} · {result.duration.toFixed(0)} ms</>}</p>
    <button className="primary full" onClick={onReport} disabled={!valid||busy}><FileDown size={15}/>导出分析报告</button></div></aside>;
}
