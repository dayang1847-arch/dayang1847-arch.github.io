import { Box, ChevronDown, Layers3, Package, Plus, Search } from 'lucide-react';
import { useState } from 'react';
import type { Product, SceneType } from '../../shared/types';
import { CATEGORIES } from '../../shared/scenes';
import { FileText } from 'lucide-react';
import { PUBLIC_DEMO } from '../public-demo';
import ModelThumbnail from '../engine/thumbnails';
export default function ProductLibrary({products,sceneType,selectedKey,onSelect,onAdd,onEdit,onIES}:{products:Product[];sceneType:SceneType;selectedKey:string|null;onSelect:(p:Product)=>void;onAdd:()=>void;onEdit:(p:Product)=>void;onIES:(p:Product)=>void}){
  const [filter,setFilter]=useState('全部'),[query,setQuery]=useState(''),[drafts,setDrafts]=useState(false);
  const latest=[...new Map([...products].sort((a,b)=>a.version-b.version).map(p=>[p.id,p])).values()];
  const available=latest.filter(p=>p.sceneTypes.includes(sceneType)),visible=available.filter(p=>(drafts||p.status==='ready')&&(filter==='全部'||p.category===filter)&&`${p.name} ${p.model}`.toLowerCase().includes(query.toLowerCase()));
  return <aside className="library-panel"><div className="library-title"><span><Layers3 size={17}/>产品仓库</span><span className="count-pill">{String(available.filter(p=>p.status==='ready').length).padStart(2,'0')}</span></div><p className="library-description">选择一盏灯，探索一种可能。</p>
    <div className="search-field"><Search size={14}/><input aria-label="搜索灯具产品" value={query} onChange={e=>setQuery(e.target.value)} placeholder="搜索名称或型号"/></div>
    <div className="category-chips">{CATEGORIES.map(c=><button key={c} className={filter===c?'active':''} onClick={()=>setFilter(c)}>{c}</button>)}</div>
    <div className="library-subheading"><span>{sceneType==='indoor'?'室内':'户外'}照明产品</span><label title="显示未完善的产品"><input type="checkbox" checked={drafts} onChange={e=>setDrafts(e.target.checked)}/>草稿</label></div>
    <div className="product-list">{visible.map(p=><article key={`${p.id}@${p.version}`} className={`product-card ${selectedKey===`${p.id}@${p.version}`?'selected':''}`}><button className="product-card-main" onClick={()=>p.status==='draft'?onEdit(p):onSelect(p)} aria-label={`选择 ${p.name}`}><div className="product-art"><ModelThumbnail product={p}/><span className="product-tag">{p.sample?'演示样品':p.status==='draft'?'草稿':'自有产品'}</span><span className="product-category">{p.category}</span></div><div className="product-copy"><strong>{p.name}</strong><small>{p.model} <span>·</span> {p.watts??'—'} W <span>·</span> {p.cct} K</small></div><div className="product-card-footer"><span>{p.photometry?`${Math.round(p.photometry.lumens).toLocaleString()} lm`:'配光待上传'}</span><span>{p.cctRange?'可调色温':'固定色温'}</span></div></button><div className="product-links">{p.photometry&&<button onClick={()=>onIES(p)} aria-label={`查看 ${p.name}的 IES 文件`}><FileText size={12}/>查看 IES</button>}{!p.sample&&<button onClick={()=>onEdit(p)}>编辑资料</button>}</div></article>)}{!visible.length&&<div className="empty-state"><Package size={25}/><p>这里还没有匹配的灯具</p><button className="text-button" onClick={onAdd}>新增产品</button></div>}</div>
    <div className="library-bottom"><>{PUBLIC_DEMO?<a className="add-product" href={import.meta.env.BASE_URL+'LUMINA-local.zip'} download><Package size={17}/><span>下载完整本地版</span></a>:<button className="add-product" onClick={onAdd}><Plus size={17}/><span>新增产品</span><small>3D + IES</small></button>}</><p><Box size={11}/>{PUBLIC_DEMO?'内置灯具 · 演示配光':'模型与配光保存在本机'}</p></div></aside>;
}
