import { useEffect, useRef } from 'react';
import { Download, Printer, X } from 'lucide-react';
import { downloadData } from '../api';

export default function ReportViewer({html,name,onClose}:{html:string;name:string;onClose:()=>void}){
  const frame=useRef<HTMLIFrameElement>(null);
  useEffect(()=>{const key=(e:KeyboardEvent)=>{if(e.key==='Escape')onClose();};window.addEventListener('keydown',key);return()=>window.removeEventListener('keydown',key);},[]);
  function download(){const url=URL.createObjectURL(new Blob([html],{type:'text/html;charset=utf-8'}));downloadData(url,`${name}-照度分析报告.html`);setTimeout(()=>URL.revokeObjectURL(url),10000);}
  return <div className="modal-backdrop"><section className="modal report-modal" role="dialog" aria-modal="true" aria-labelledby="report-title"><header className="modal-heading"><div><span className="eyebrow">LIGHTING ANALYSIS REPORT</span><h2 id="report-title">照度分析报告</h2></div><button className="icon-button" aria-label="关闭分析报告" onClick={onClose}><X size={19}/></button></header><iframe ref={frame} title="照度分析报告预览" srcDoc={html}/><footer className="modal-footer"><small className="muted">直接光分析 · 图片与灯具清单包含在报告内</small><div><button className="secondary" onClick={download}><Download size={14}/>下载 HTML 报告</button><button className="primary" onClick={()=>{frame.current?.contentWindow?.focus();frame.current?.contentWindow?.print();}}><Printer size={14}/>打印 / 保存 PDF</button></div></footer></section></div>;
}
