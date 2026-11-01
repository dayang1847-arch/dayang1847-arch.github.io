import{B as Ut,G as _t,I as Ot,L as jt,e as Vt,h as O,i as Wt,k as b,l as Xt,n as Gt,o as z,p as ut,q as It,w as Lt,x as dt}from"./runtime/chunk-Q5COHEMR.js";var i=document.querySelector("#universe"),C=document.querySelector("#status"),ee=document.querySelector("#pause"),Zt=document.querySelector("#reset"),ae=()=>{};try{ae=oe()}catch(j){C.textContent="\u4E09\u7EF4\u573A\u666F\u672A\u80FD\u542F\u52A8",document.querySelector("#fallback").hidden=!1,document.querySelector(".hero-controls").hidden=!0,document.documentElement.dataset.starfield="fallback",window.dispatchEvent(new CustomEvent("dc-starfield-status",{detail:{available:!1}})),console.error(j)}function oe(){let j=document.querySelector(".space-hero"),Z=()=>i.getBoundingClientRect(),h=()=>Z().width<=700,N=!0,pt=()=>document.hidden||!N||document.documentElement.dataset.immersive==="solar",k=(navigator.deviceMemory||8)<=4||navigator.connection?.saveData,M=k?22e3:h()?3e4:86e3,A=new jt({canvas:i,alpha:!1,antialias:!1,powerPreference:"low-power"});A.setClearColor(329227);let J=new Gt,v=new _t(47,1,.1,800);v.position.set(0,9,116);let E=new Xt;J.add(E);let mt=new Float32Array(M*3),ft=new Float32Array(M*3),ht=new Float32Array(M*3),Et=new Float32Array(M*4),Q=184713,a=()=>(Q=1664525*Q+1013904223>>>0,Q/4294967296),d=()=>Math.sqrt(-2*Math.log(Math.max(a(),1e-5)))*Math.cos(a()*Math.PI*2),T=Math.PI*2;for(let t=0;t<M;t++){let e=Math.pow(a(),.74)*43,l=t%3*T/3+e*.127,it=d()*(.1+.22*e/43),L=l+it,$t=a()<.13;mt.set($t?[d()*3.2,d()*1.3,d()*3.2]:[Math.cos(L)*e+d()*.4,d()*(.28+e*.034),Math.sin(L)*e+d()*.4],t*3);let U=a()*T,st=a()*T,ct=d()*(a()<.78?.46:1.5),qt=22+6.8*Math.cos(U*3);ft.set([(qt+ct*Math.cos(st))*Math.cos(U*2),11*Math.sin(U*3)+ct*Math.sin(st),(qt+ct*Math.cos(st))*Math.sin(U*2)],t*3);let _=a()*2-1,Dt=a()*T,te=Math.asin(_),Bt=a()<.4,Yt=Bt?Math.round(Dt/(T/18))*(T/18)+Math.sin(te*3)*.18+d()*.008:Dt,lt=25+d()*(Bt?.1:.42),Kt=Math.sqrt(1-_*_);ht.set([Math.cos(Yt)*Kt*lt,_*lt,Math.sin(Yt)*Kt*lt],t*3),Et.set([a(),a(),a(),a()],t*4)}let x=new ut;x.setAttribute("position",new z(mt,3)),x.setAttribute("aRing",new z(ft,3)),x.setAttribute("aGlobe",new z(ht,3)),x.setAttribute("aExtra",new z(Et,4));let w=new b(1,0,0),vt=new b(1,0,0),$=new b(1,0,0),R={uTime:{value:0},uDpr:{value:1},uWeights:{value:w},uMorph:{value:0},uPointer:{value:new b(999,999,999)},uHover:{value:0}},xt=new Ut({uniforms:R,transparent:!0,blending:Vt,depthWrite:!1,depthTest:!1,vertexShader:`
      attribute vec3 aRing;
      attribute vec3 aGlobe;
      attribute vec4 aExtra;
      uniform float uTime, uDpr, uMorph, uHover;
      uniform vec3 uWeights, uPointer;
      varying vec3 vColor;
      varying float vAlpha, vKind;
      mat2 rotate(float a) {float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
      void main() {
        vec3 g=position;
        float radius=length(g.xz);
        g.xz=rotate(uTime*.022/(.42+radius*.012))*g.xz;
        g.y+=sin(radius*.17+aExtra.x*6.283+uTime*.16)*.19;
        vec3 r=aRing;
        r.xz=rotate(uTime*.055)*r.xz;
        r.y+=sin(aExtra.x*6.283+uTime*.35)*.18;
        vec3 s=aGlobe;
        s.xz=rotate(uTime*.045)*s.xz;
        s*=1.+sin(aExtra.y*6.283+uTime*.25)*.003;
        vec3 p=g*uWeights.x+r*uWeights.y+s*uWeights.z;
        vec3 drift=vec3(sin(aExtra.x*18.+uTime*.12),cos(aExtra.y*14.+uTime*.1),sin(aExtra.z*20.));
        p+=drift*sin(uMorph*3.141593)*(2.8+aExtra.w*2.);
        vec3 diff=p-uPointer;
        float dist=length(diff);
        p+=diff/max(dist,.01)*exp(-dist*dist/90.)*uHover*2.1;
        vec4 view=modelViewMatrix*vec4(p,1.);
        gl_Position=projectionMatrix*view;
        vKind=aExtra.w;
        float dust=step(.72,vKind)*(1.-step(.995,vKind));
        float star=step(.995,vKind);
        float size=mix(.85+aExtra.y*.85,4.+aExtra.y*8.,dust);
        size=mix(size,2.+aExtra.y*3.,star);
        gl_PointSize=clamp(size*uDpr*clamp(120./-view.z,.45,2.2),.7,18.*uDpr);
        float center=exp(-radius*.1)*uWeights.x;
        vec3 outer=mix(vec3(.27,.52,.82),vec3(.62,.51,.86),aExtra.x);
        vec3 warm=mix(vec3(.85,.75,.57),vec3(1.,.91,.74),aExtra.z);
        vColor=mix(outer,warm,clamp(center*.85+aExtra.z*.25,0.,1.));
        vColor=mix(vColor,vec3(.84,.88,1.),star);
        vAlpha=mix(.34,.026,dust);
        vAlpha=mix(vAlpha,.88,star);
        vAlpha*=mix(.42,1.,clamp((-view.z-12.)/50.,0.,1.));
        vAlpha*=.94+.06*sin(aExtra.z*15.+uTime*.55);
      }`,fragmentShader:`
      varying vec3 vColor;
      varying float vAlpha, vKind;
      void main(){
        vec2 p=gl_PointCoord*2.-1.;
        float d=dot(p,p);
        if(d>1.)discard;
        float dust=step(.72,vKind)*(1.-step(.995,vKind));
        float star=step(.995,vKind);
        float alpha=mix(exp(-d*6.),exp(-d*3.2)*.7,dust);
        float rays=(exp(-abs(p.x)*32.)*exp(-abs(p.y)*5.)+exp(-abs(p.y)*32.)*exp(-abs(p.x)*5.))*.12;
        alpha+=star*(exp(-d*23.)+rays);
        gl_FragColor=vec4(vColor,alpha*vAlpha);
      }`}),wt=new dt(x,xt);wt.frustumCulled=!1,E.add(wt);let tt=new ut,gt=new Float32Array(1800*3);for(let t=0;t<1800;t++)gt.set([(a()-.5)*450,(a()-.5)*260,-100-a()*260],t*3);tt.setAttribute("position",new z(gt,3));let yt=new Lt({color:10202827,size:.19,transparent:!0,opacity:.42,depthWrite:!1});J.add(new dt(tt,yt));let Nt=matchMedia("(prefers-reduced-motion:reduce)"),P=!1,S=!1,et=document.documentElement.dataset.motion==="paused",r=0,H=0,at=0,bt=0,c=1,m=0,F=.59,q=-.25,f=.59,g=-.25,D=116,u=116,B=0,Y=0,K=0,y=0,V=!1,Jt=0,W=new Wt(0,0),Mt=new Ot,Qt=new It(new b(0,0,1),0),At=new b,p=new Map,X=0,G=0,Tt=0,Rt=116,ot=[],I=()=>document.documentElement.lang==="en"?["Spiral light \xB7 Layered stardust","Gravity streams \xB7 Continuous motion","Orbital threads \xB7 Volumetric glow"]:["\u65CB\u81C2\u6D41\u5149 \xB7 \u5206\u5C42\u661F\u5C18","\u5F15\u529B\u6D41\u7EBF \xB7 \u8FDE\u7EED\u5F62\u53D8","\u661F\u7403\u8109\u7EDC \xB7 \u7ACB\u4F53\u8F89\u5149"];function n(t,e,o,l){t.addEventListener(e,o,l),ot.push(()=>t.removeEventListener(e,o,l))}function Ht(){E.rotation.set(F,q,0),E.scale.setScalar(h()?.46*w.x+.65*(w.y+w.z):1),v.position.set(B*.7,9+Y*.4,D),v.lookAt(0,0,0),E.updateMatrixWorld(!0),Mt.setFromCamera(W,v),Mt.ray.intersectPlane(Qt,At)&&R.uPointer.value.copy(E.worldToLocal(At)),R.uHover.value=K,R.uTime.value=bt,A.render(J,v),i.dataset.frame=String(++Jt)}function rt(){if(P||S)return;let{width:t,height:e}=Z();A.setPixelRatio(Math.min(devicePixelRatio||1,h()||k?1.3:1.6)),A.setSize(t,e,!1),R.uDpr.value=A.getPixelRatio(),v.aspect=t/e,v.updateProjectionMatrix();let o=Math.min(M,h()||k?3e4:86e3);x.setDrawRange(0,o),E.position.set(h()?0:20,h()?-14:0,0),E.scale.setScalar(h()?.72:1),document.documentElement.dataset.particles=String(o),Ht(),s()}function nt(t){if(r=0,P||S||pt())return;let e=1e3/(h()||k?30:45);if(H&&t-at<e){r=requestAnimationFrame(nt);return}let o=H?Math.min((t-H)/1e3,.05):1/45;H=t,at=t,et||(bt+=o,g+=o*.008);let l=1-Math.exp(-o*5.5);if(F+=(f-F)*l,q+=(g-q)*l,D+=(u-D)*l,K+=(y-K)*l,c<1){c=Math.min(1,c+o/.95);let L=c*c*c*(c*(c*6-15)+10);w.copy(vt).lerp($,L)}R.uMorph.value=c>=1?0:c,Ht();let it=c<1||Math.abs(f-F)>2e-4||Math.abs(g-q)>2e-4||Math.abs(u-D)>.005||Math.abs(y-K)>.001;(!et||it)&&(r=requestAnimationFrame(nt))}function s(){!r&&!P&&!S&&!pt()&&(H=0,at=0,r=requestAnimationFrame(nt))}function zt(){et=document.documentElement.dataset.motion==="paused",s()}function Ct(){f=.59,g=-.25,u=116,B=Y=0,y=0,s()}for(let t of document.querySelectorAll("[data-shape]"))n(t,"click",()=>{m=Number(t.dataset.shape),vt.copy(w),$.set(m===0?1:0,m===1?1:0,m===2?1:0),c=0,Nt.matches&&(w.copy($),c=1);for(let e of document.querySelectorAll("[data-shape]"))e.setAttribute("aria-pressed",String(e===t));C.textContent=I()[m],i.dataset.shape=String(m),s()});n(Zt,"click",Ct),n(i,"pointerdown",t=>{if(t.button===0&&(i.focus({preventScroll:!0}),p.set(t.pointerId,{x:t.clientX,y:t.clientY}),X=t.clientX,G=t.clientY,V=!0,y=.2,i.setPointerCapture(t.pointerId),p.size===2)){let[e,o]=[...p.values()];Tt=Math.hypot(e.x-o.x,e.y-o.y),Rt=u}}),n(i,"pointermove",t=>{let e=Z();if(W.set((t.clientX-e.left)/e.width*2-1,-(t.clientY-e.top)/e.height*2+1),p.has(t.pointerId)&&p.set(t.pointerId,{x:t.clientX,y:t.clientY}),p.size===2){let[o,l]=[...p.values()];u=O.clamp(Rt*Tt/Math.max(1,Math.hypot(o.x-l.x,o.y-l.y)),76,165),s();return}V?(g+=(t.clientX-X)*.0045,f=O.clamp(f+(t.clientY-G)*.0045,-1.2,1.2),X=t.clientX,G=t.clientY,s()):t.pointerType!=="touch"&&(B=W.x,Y=W.y,y=1,s())});let Pt=t=>{if(p.delete(t.pointerId),V=p.size>0,V){let e=[...p.values()][0];X=e.x,G=e.y}y=t.pointerType==="touch"?0:1,s()};n(i,"pointerup",Pt),n(i,"pointercancel",Pt),n(i,"pointerleave",()=>{y=0,B=Y=0,s()}),n(i,"wheel",t=>{t.shiftKey&&(t.preventDefault(),u=O.clamp(u+t.deltaY*.035,76,165),s())},{passive:!1}),n(i,"keydown",t=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-","r","R"].includes(t.key)&&(t.preventDefault(),t.key==="ArrowLeft"&&(g-=.14),t.key==="ArrowRight"&&(g+=.14),t.key==="ArrowUp"&&(f=Math.max(-1.2,f-.12)),t.key==="ArrowDown"&&(f=Math.min(1.2,f+.12)),(t.key==="+"||t.key==="=")&&(u=Math.max(76,u-8)),t.key==="-"&&(u=Math.min(165,u+8)),t.key.toLowerCase()==="r"&&Ct(),s())}),n(i,"webglcontextlost",t=>{t.preventDefault(),S=!0,cancelAnimationFrame(r),r=0,C.textContent="\u56FE\u5F62\u8FDE\u63A5\u6682\u65F6\u4E2D\u65AD\uFF0C\u7B49\u5F85\u6062\u590D\u2026"}),n(i,"webglcontextrestored",()=>{S=!1,C.textContent=I()[m],rt()}),n(document,"visibilitychange",()=>{cancelAnimationFrame(r),r=0,H=0,document.hidden||s()}),n(window,"resize",rt,{passive:!0}),n(window,"dc-language-changed",()=>{C.textContent=I()[m]});let St=new MutationObserver(()=>{cancelAnimationFrame(r),r=0,zt()});St.observe(document.documentElement,{attributes:!0,attributeFilter:["data-motion","data-immersive"]});let kt=new IntersectionObserver(t=>{N=t[0].isIntersecting,cancelAnimationFrame(r),r=0,N&&s()},{threshold:0});kt.observe(j),ot.push(()=>St.disconnect(),()=>kt.disconnect()),n(window,"pagehide",t=>{cancelAnimationFrame(r),r=0,t.persisted||Ft()}),n(window,"pageshow",s);function Ft(){P||(P=!0,cancelAnimationFrame(r),ot.forEach(t=>t()),x.dispose(),xt.dispose(),tt.dispose(),yt.dispose(),A.dispose())}return ee.disabled=!1,Zt.disabled=!1,C.textContent=I()[m],i.dataset.shape="0",document.documentElement.dataset.renderer="three-webgl-layered",rt(),zt(),window.dispatchEvent(new CustomEvent("dc-starfield-status",{detail:{available:!0}})),Ft}
