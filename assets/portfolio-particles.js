import{B as ce,G as le,I as ue,L as de,e as ae,h as Y,i as oe,k as P,l as ie,n as ne,o as z,p as yt,q as re,w as se,x as vt}from"./runtime/chunk-Q5COHEMR.js";var n=document.querySelector("#universe"),B=document.querySelector("#status"),ye=document.querySelector("#pause"),he=document.querySelector("#reset"),ve=()=>{};try{ve=ge()}catch(nt){B.textContent="\u4E09\u7EF4\u573A\u666F\u672A\u80FD\u542F\u52A8",document.querySelector("#fallback").hidden=!1,document.querySelector(".hero-controls").hidden=!0,document.documentElement.dataset.starfield="fallback",window.dispatchEvent(new CustomEvent("dc-starfield-status",{detail:{available:!1}})),console.error(nt)}function ge(){let nt=document.querySelector(".space-hero"),K=()=>n.getBoundingClientRect(),y=()=>K().width<=700,rt=!0,gt=()=>document.hidden||!rt||document.documentElement.dataset.immersive==="solar",V=(navigator.deviceMemory||8)<=4||navigator.connection?.saveData,A=V?22e3:y()?3e4:86e3,S=new de({canvas:n,alpha:!1,antialias:!1,powerPreference:"low-power"});S.setClearColor(329227);let st=new ne,T=new le(47,1,.1,800);T.position.set(0,9,116);let v=new ie;st.add(v);let wt=new Float32Array(A*3),bt=new Float32Array(A*3),At=new Float32Array(A*3),Tt=new Float32Array(A*4),Rt=new Float32Array(A*4),ct=184713,a=()=>(ct=1664525*ct+1013904223>>>0,ct/4294967296),l=()=>Math.sqrt(-2*Math.log(Math.max(a(),1e-5)))*Math.cos(a()*Math.PI*2),R=Math.PI*2,G=46,L=210;for(let t=0;t<A;t++){let e=a(),o=-.4,i,E,m,q,C,jt=0;if(e<.16)i=l()*2.8,m=l()*2.1,E=l()*1.3,q=.92,C=1;else if(e<.27){let c=(a()*2-1)*10.8;i=c,m=l()*(.8+1.05*(1-Math.abs(c)/10.8)),E=l()*.43,q=.75,C=.52}else if(e<.53){let c=Math.min(46,-Math.log(Math.max(a()*a(),1e-5))*9.5),b=a()*R;if(i=Math.cos(b)*c,m=Math.sin(b)*c,E=l()*(.16+c*.013),q=.25+Math.exp(-c*.13)*.5,C=.4,c>11){let it=b-2.7*Math.log(c/10.8),f=Math.asin(Math.sin(it-.13));C*=1-.88*Math.exp(-f*f/.005)}}else if(e<.97){let c=a()<.72,b=(a()<.5?0:Math.PI)+(c?0:Math.PI/2),it=a()<.34,f=it?13.5+Math.floor(a()*9)*3.45+l()*.65:10.8+Math.pow(a(),1.25)*34;f=Math.max(10.8,Math.min(45,f));let te=l()*(c?.145:.18),ee=b+2.7*Math.log(f/10.8)+te;i=Math.cos(ee)*f+l()*.24,m=Math.sin(ee)*f+l()*.24,E=l()*(.15+f*.009),q=.12+Math.exp(-f*.1)*.45;let Ee=Math.exp(-Math.pow((te+.075)/.032,2));C=(c?.85:.55)*(1-.9*Ee),jt=it?1:0}else{let c=15+Math.pow(a(),.7)*36,b=a()*R;i=Math.cos(b)*c,m=Math.sin(b)*c,E=l()*4.8,q=.65,C=.2}let xe=Math.hypot(i,m);E+=Math.pow(Math.max(xe-25,0)/23,2)*Math.sin(Math.atan2(m,i))*.9,wt.set([i*Math.cos(o)-m*Math.sin(o),E,i*Math.sin(o)+m*Math.cos(o)],t*3),Rt.set([q,C,jt,e],t*4);let at=a()*R,xt=a()*R,Mt=l()*(a()<.78?.46:1.5),Ot=22+6.8*Math.cos(at*3);bt.set([(Ot+Mt*Math.cos(xt))*Math.cos(at*2),11*Math.sin(at*3)+Mt*Math.sin(xt),(Ot+Mt*Math.cos(xt))*Math.sin(at*2)],t*3);let ot=a()*2-1,Nt=a()*R,Me=Math.asin(ot),Jt=a()<.4,Qt=Jt?Math.round(Nt/(R/18))*(R/18)+Math.sin(Me*3)*.18+l()*.008:Nt,Et=25+l()*(Jt?.1:.42),$t=Math.sqrt(1-ot*ot);At.set([Math.cos(Qt)*$t*Et,ot*Et,Math.sin(Qt)*$t*Et],t*3),Tt.set([a(),a(),a(),a()],t*4)}let g=new yt;g.setAttribute("position",new z(wt,3)),g.setAttribute("aRing",new z(bt,3)),g.setAttribute("aGlobe",new z(At,3)),g.setAttribute("aExtra",new z(Tt,4)),g.setAttribute("aMilky",new z(Rt,4));let H=new P(1,0,0),Ht=new P(1,0,0),lt=new P(1,0,0),F={uTime:{value:0},uDpr:{value:1},uWeights:{value:H},uMorph:{value:0},uPointer:{value:new P(999,999,999)},uHover:{value:0}},kt=new ce({uniforms:F,transparent:!0,blending:ae,depthWrite:!1,depthTest:!1,vertexShader:`
      attribute vec3 aRing;
      attribute vec3 aGlobe;
      attribute vec4 aExtra;
      attribute vec4 aMilky;
      uniform float uTime, uDpr, uMorph, uHover;
      uniform vec3 uWeights, uPointer;
      varying vec3 vColor;
      varying float vAlpha, vKind;
      mat2 rotate(float a) {float s=sin(a),c=cos(a);return mat2(c,-s,s,c);}
      void main() {
        vec3 g=position;
        float radius=length(g.xz);
        g.xz=rotate(uTime*.014)*g.xz;
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
        vec3 diskColor=mix(vec3(.38,.54,.78),vec3(.67,.77,1.),aExtra.x);
        diskColor=mix(diskColor,vec3(.35,.62,1.),aMilky.z*.45);
        vec3 milkyColor=mix(diskColor,vec3(1.,.87,.68),aMilky.x);
        vColor=mix(vColor,milkyColor,uWeights.x);
        vColor=mix(vColor,vec3(.88,.92,1.),star);
        vAlpha=mix(.34,.026,dust);
        vAlpha=mix(vAlpha,.88,star);
        vAlpha*=mix(.42,1.,clamp((-view.z-12.)/50.,0.,1.));
        vAlpha*=mix(1.,aMilky.y,uWeights.x);
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
      }`}),Ct=new vt(g,kt);Ct.frustumCulled=!1,v.add(Ct);let ut=new yt,Pt=new Float32Array(1800*3);for(let t=0;t<1800;t++)Pt.set([(a()-.5)*450,(a()-.5)*260,-100-a()*260],t*3);ut.setAttribute("position",new z(Pt,3));let zt=new se({color:10202827,size:.19,transparent:!0,opacity:.42,depthWrite:!1});st.add(new vt(ut,zt));let me=matchMedia("(prefers-reduced-motion:reduce)"),W=!1,X=!1,dt=document.documentElement.dataset.motion==="paused",s=0,D=0,ht=0,St=0,h=1,x=0,U=.59,Z=-.25,M=.59,k=-.25,I=116,d=116,_=0,j=0,O=0,w=0,N=!1,pe=0,J=new oe(0,0),Ft=new ue,fe=new re(new P(0,0,1),0),Dt=new P,p=new Map,Q=0,$=0,qt=0,Yt=116,tt=!1,Bt=0,Wt=116,mt=[],et=()=>document.documentElement.lang==="en"?["Milky Way \xB7 Barred-spiral study","Gravity streams \xB7 Continuous motion","Orbital threads \xB7 Volumetric glow"]:["\u94F6\u6CB3\u7CFB \xB7 \u68D2\u65CB\u7ED3\u6784\u793A\u610F","\u5F15\u529B\u6D41\u7EBF \xB7 \u8FDE\u7EED\u5F62\u53D8","\u661F\u7403\u8109\u7EDC \xB7 \u7ACB\u4F53\u8F89\u5149"];function r(t,e,o,i){t.addEventListener(e,o,i),mt.push(()=>t.removeEventListener(e,o,i))}function Xt(){v.rotation.set(U,Z,0),v.scale.setScalar(y()?.46*H.x+.65*(H.y+H.z):1),T.position.set(_*.7,9+j*.4,I),T.lookAt(0,0,0),v.updateMatrixWorld(!0),Ft.setFromCamera(J,T),Ft.ray.intersectPlane(fe,Dt)&&F.uPointer.value.copy(v.worldToLocal(Dt)),F.uHover.value=O,F.uTime.value=St,S.render(st,T),n.dataset.frame=String(++pe),n.dataset.cameraDistance=I.toFixed(2)}function pt(){if(W||X)return;let{width:t,height:e}=K();S.setPixelRatio(Math.min(devicePixelRatio||1,y()||V?1.3:1.6)),S.setSize(t,e,!1),F.uDpr.value=S.getPixelRatio(),T.aspect=t/e,T.updateProjectionMatrix();let o=Math.min(A,y()||V?3e4:86e3);g.setDrawRange(0,o),v.position.set(y()?0:20,y()?-14:0,0),v.scale.setScalar(y()?.72:1),document.documentElement.dataset.particles=String(o),Xt(),u()}function ft(t){if(s=0,W||X||gt())return;let e=1e3/(y()||V?30:45);if(D&&t-ht<e){s=requestAnimationFrame(ft);return}let o=D?Math.min((t-D)/1e3,.05):1/45;D=t,ht=t,dt||(St+=o,k+=o*.008);let i=1-Math.exp(-o*5.5);if(U+=(M-U)*i,Z+=(k-Z)*i,I+=(d-I)*i,O+=(w-O)*i,h<1){h=Math.min(1,h+o/.95);let m=h*h*h*(h*(h*6-15)+10);H.copy(Ht).lerp(lt,m)}F.uMorph.value=h>=1?0:h,Xt();let E=h<1||Math.abs(M-U)>2e-4||Math.abs(k-Z)>2e-4||Math.abs(d-I)>.005||Math.abs(w-O)>.001;(!dt||E)&&(s=requestAnimationFrame(ft))}function u(){!s&&!W&&!X&&!gt()&&(D=0,ht=0,s=requestAnimationFrame(ft))}function It(){dt=document.documentElement.dataset.motion==="paused",u()}function Kt(){M=.59,k=-.25,d=116,_=j=0,w=0,u()}for(let t of document.querySelectorAll("[data-shape]"))r(t,"click",()=>{x=Number(t.dataset.shape),Ht.copy(H),lt.set(x===0?1:0,x===1?1:0,x===2?1:0),h=0,me.matches&&(H.copy(lt),h=1);for(let e of document.querySelectorAll("[data-shape]"))e.setAttribute("aria-pressed",String(e===t));B.textContent=et()[x],n.dataset.shape=String(x),u()});r(he,"click",Kt),r(n,"pointerdown",t=>{if(t.button===0&&(n.focus({preventScroll:!0}),p.set(t.pointerId,{x:t.clientX,y:t.clientY}),Q=t.clientX,$=t.clientY,N=!0,w=.2,n.setPointerCapture(t.pointerId),p.size===2)){let[e,o]=[...p.values()];qt=Math.hypot(e.x-o.x,e.y-o.y),Yt=d}}),r(n,"pointermove",t=>{let e=K();if(J.set((t.clientX-e.left)/e.width*2-1,-(t.clientY-e.top)/e.height*2+1),p.has(t.pointerId)&&p.set(t.pointerId,{x:t.clientX,y:t.clientY}),!tt){if(p.size===2){let[o,i]=[...p.values()];d=Y.clamp(Yt*qt/Math.max(1,Math.hypot(o.x-i.x,o.y-i.y)),G,L),u();return}N?(k+=(t.clientX-Q)*.0045,M=Y.clamp(M+(t.clientY-$)*.0045,-1.2,1.2),Q=t.clientX,$=t.clientY,u()):t.pointerType!=="touch"&&(_=J.x,j=J.y,w=1,u())}});let Vt=t=>{if(p.delete(t.pointerId),N=p.size>0,N){let e=[...p.values()][0];Q=e.x,$=e.y}w=t.pointerType==="touch"?0:1,u()};r(n,"pointerup",Vt),r(n,"pointercancel",Vt),r(n,"pointerleave",()=>{w=0,_=j=0,u()}),r(n,"wheel",t=>{if(t.metaKey||!Number.isFinite(t.deltaY)||t.deltaY===0)return;let e=t.deltaMode===1?16:t.deltaMode===2?K().height:1,o=Y.clamp(t.deltaY*e,-160,160),i=Y.clamp(d*Math.exp(o*.0015),G,L);Math.abs(i-d)<.001&&!t.ctrlKey||(t.preventDefault(),d=i,u())},{passive:!1});let Gt=t=>Math.hypot(t[0].clientX-t[1].clientX,t[0].clientY-t[1].clientY);r(n,"touchstart",t=>{t.touches.length===2&&(t.cancelable&&t.preventDefault(),tt=!0,Bt=Math.max(1,Gt(t.touches)),Wt=d,w=0)},{passive:!1}),r(n,"touchmove",t=>{!tt||t.touches.length!==2||(t.cancelable&&t.preventDefault(),d=Y.clamp(Wt*Bt/Math.max(1,Gt(t.touches)),G,L),u())},{passive:!1});let Lt=t=>{t.touches.length<2&&(tt=!1)};r(n,"touchend",Lt),r(n,"touchcancel",Lt),r(n,"keydown",t=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-","r","R"].includes(t.key)&&(t.preventDefault(),t.key==="ArrowLeft"&&(k-=.14),t.key==="ArrowRight"&&(k+=.14),t.key==="ArrowUp"&&(M=Math.max(-1.2,M-.12)),t.key==="ArrowDown"&&(M=Math.min(1.2,M+.12)),(t.key==="+"||t.key==="=")&&(d=Math.max(G,d-8)),t.key==="-"&&(d=Math.min(L,d+8)),t.key.toLowerCase()==="r"&&Kt(),u())}),r(n,"webglcontextlost",t=>{t.preventDefault(),X=!0,cancelAnimationFrame(s),s=0,B.textContent="\u56FE\u5F62\u8FDE\u63A5\u6682\u65F6\u4E2D\u65AD\uFF0C\u7B49\u5F85\u6062\u590D\u2026"}),r(n,"webglcontextrestored",()=>{X=!1,B.textContent=et()[x],pt()}),r(document,"visibilitychange",()=>{cancelAnimationFrame(s),s=0,D=0,document.hidden||u()}),r(window,"resize",pt,{passive:!0}),r(window,"dc-language-changed",()=>{B.textContent=et()[x]});let Ut=new MutationObserver(()=>{cancelAnimationFrame(s),s=0,It()});Ut.observe(document.documentElement,{attributes:!0,attributeFilter:["data-motion","data-immersive"]});let Zt=new IntersectionObserver(t=>{rt=t[0].isIntersecting,cancelAnimationFrame(s),s=0,rt&&u()},{threshold:0});Zt.observe(nt),mt.push(()=>Ut.disconnect(),()=>Zt.disconnect()),r(window,"pagehide",t=>{cancelAnimationFrame(s),s=0,t.persisted||_t()}),r(window,"pageshow",u);function _t(){W||(W=!0,cancelAnimationFrame(s),mt.forEach(t=>t()),g.dispose(),kt.dispose(),ut.dispose(),zt.dispose(),S.dispose())}return ye.disabled=!1,he.disabled=!1,B.textContent=et()[x],n.dataset.shape="0",n.dataset.galaxy="milky-way",document.documentElement.dataset.renderer="three-webgl-layered",pt(),It(),window.dispatchEvent(new CustomEvent("dc-starfield-status",{detail:{available:!0}})),_t}
