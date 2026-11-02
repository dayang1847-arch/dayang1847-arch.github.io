// Embedded pages expose only their measured size; business records stay in the host.
if(new URLSearchParams(location.search).get('embed')==='1'){
 document.body.classList.add('sp-embedded');
 let last=0,pending=false;
 function measure(){pending=false;const shell=document.querySelector('.sp-shell');const height=Math.ceil(shell.getBoundingClientRect().height)+2;if(height===last||height<200)return;last=height;window.parent.postMessage({type:'lumipilot-principle-size',height},location.origin);}
 function schedule(){if(pending)return;pending=true;requestAnimationFrame(measure);}
 const resize=new ResizeObserver(schedule);resize.observe(document.querySelector('.sp-shell'));
 window.addEventListener('message',e=>{if(e.origin===location.origin&&e.source===window.parent&&e.data?.type==='lumipilot-principle-measure'){last=0;schedule();}});
 document.fonts?.ready.then(schedule);window.addEventListener('load',schedule,{once:true});window.addEventListener('pagehide',()=>resize.disconnect(),{once:true});schedule();
}
