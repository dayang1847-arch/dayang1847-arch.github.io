import{B as ee,G as ae,I as oe,L as ie,e as Zt,h as tt,i as Nt,k as z,l as Jt,n as Qt,o as P,p as xt,q as $t,w as te,x as vt}from"./runtime/chunk-Q5COHEMR.js";var r=document.querySelector("#universe"),W=document.querySelector("#status"),pe=document.querySelector("#pause"),re=document.querySelector("#reset"),me=()=>{};try{me=he()}catch(et){W.textContent="\u4E09\u7EF4\u573A\u666F\u672A\u80FD\u542F\u52A8",document.querySelector("#fallback").hidden=!1,document.querySelector(".hero-controls").hidden=!0,document.documentElement.dataset.starfield="fallback",window.dispatchEvent(new CustomEvent("dc-starfield-status",{detail:{available:!1}})),console.error(et)}function he(){let et=document.querySelector(".space-hero"),at=()=>r.getBoundingClientRect(),M=()=>at().width<=700,ot=!0,yt=()=>document.hidden||!ot||document.documentElement.dataset.immersive==="solar",Y=(navigator.deviceMemory||8)<=4||navigator.connection?.saveData,b=Y?22e3:M()?3e4:86e3,S=new ie({canvas:r,alpha:!1,antialias:!1,powerPreference:"low-power"});S.setClearColor(329227);let it=new Qt,A=new ae(47,1,.1,800);A.position.set(0,9,116);let E=new Jt;it.add(E);let Mt=new Float32Array(b*3),Et=new Float32Array(b*3),wt=new Float32Array(b*3),gt=new Float32Array(b*4),bt=new Float32Array(b*4),rt=184713,e=()=>(rt=1664525*rt+1013904223>>>0,rt/4294967296),l=()=>Math.sqrt(-2*Math.log(Math.max(e(),1e-5)))*Math.cos(e()*Math.PI*2),T=Math.PI*2;for(let t=0;t<b;t++){let a=e(),o=-.4,i,y,m,B,C,Vt=0;if(a<.16)i=l()*2.8,m=l()*2.1,y=l()*1.3,B=.92,C=1;else if(a<.27){let c=(e()*2-1)*10.8;i=c,m=l()*(.8+1.05*(1-Math.abs(c)/10.8)),y=l()*.43,B=.75,C=.52}else if(a<.53){let c=Math.min(46,-Math.log(Math.max(e()*e(),1e-5))*9.5),g=e()*T;if(i=Math.cos(g)*c,m=Math.sin(g)*c,y=l()*(.16+c*.013),B=.25+Math.exp(-c*.13)*.5,C=.4,c>11){let $=g-2.7*Math.log(c/10.8),f=Math.asin(Math.sin($-.13));C*=1-.88*Math.exp(-f*f/.005)}}else if(a<.97){let c=e()<.72,g=(e()<.5?0:Math.PI)+(c?0:Math.PI/2),$=e()<.34,f=$?13.5+Math.floor(e()*9)*3.45+l()*.65:10.8+Math.pow(e(),1.25)*34;f=Math.max(10.8,Math.min(45,f));let jt=l()*(c?.145:.18),Ot=g+2.7*Math.log(f/10.8)+jt;i=Math.cos(Ot)*f+l()*.24,m=Math.sin(Ot)*f+l()*.24,y=l()*(.15+f*.009),B=.12+Math.exp(-f*.1)*.45;let de=Math.exp(-Math.pow((jt+.075)/.032,2));C=(c?.85:.55)*(1-.9*de),Vt=$?1:0}else{let c=15+Math.pow(e(),.7)*36,g=e()*T;i=Math.cos(g)*c,m=Math.sin(g)*c,y=l()*4.8,B=.65,C=.2}let le=Math.hypot(i,m);y+=Math.pow(Math.max(le-25,0)/23,2)*Math.sin(Math.atan2(m,i))*.9,Mt.set([i*Math.cos(o)-m*Math.sin(o),y,i*Math.sin(o)+m*Math.cos(o)],t*3),bt.set([B,C,Vt,a],t*4);let J=e()*T,mt=e()*T,ht=l()*(e()<.78?.46:1.5),Xt=22+6.8*Math.cos(J*3);Et.set([(Xt+ht*Math.cos(mt))*Math.cos(J*2),11*Math.sin(J*3)+ht*Math.sin(mt),(Xt+ht*Math.cos(mt))*Math.sin(J*2)],t*3);let Q=e()*2-1,Gt=e()*T,ue=Math.asin(Q),Lt=e()<.4,Ut=Lt?Math.round(Gt/(T/18))*(T/18)+Math.sin(ue*3)*.18+l()*.008:Gt,ft=25+l()*(Lt?.1:.42),_t=Math.sqrt(1-Q*Q);wt.set([Math.cos(Ut)*_t*ft,Q*ft,Math.sin(Ut)*_t*ft],t*3),gt.set([e(),e(),e(),e()],t*4)}let w=new xt;w.setAttribute("position",new P(Mt,3)),w.setAttribute("aRing",new P(Et,3)),w.setAttribute("aGlobe",new P(wt,3)),w.setAttribute("aExtra",new P(gt,4)),w.setAttribute("aMilky",new P(bt,4));let R=new z(1,0,0),At=new z(1,0,0),nt=new z(1,0,0),F={uTime:{value:0},uDpr:{value:1},uWeights:{value:R},uMorph:{value:0},uPointer:{value:new z(999,999,999)},uHover:{value:0}},Tt=new ee({uniforms:F,transparent:!0,blending:Zt,depthWrite:!1,depthTest:!1,vertexShader:`
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
      }`}),Rt=new vt(w,Tt);Rt.frustumCulled=!1,E.add(Rt);let st=new xt,kt=new Float32Array(1800*3);for(let t=0;t<1800;t++)kt.set([(e()-.5)*450,(e()-.5)*260,-100-e()*260],t*3);st.setAttribute("position",new P(kt,3));let Ht=new te({color:10202827,size:.19,transparent:!0,opacity:.42,depthWrite:!1});it.add(new vt(st,Ht));let ne=matchMedia("(prefers-reduced-motion:reduce)"),D=!1,I=!1,ct=document.documentElement.dataset.motion==="paused",n=0,q=0,lt=0,Ct=0,d=1,x=0,K=.59,V=-.25,v=.59,k=-.25,X=116,p=116,G=0,L=0,U=0,H=0,_=!1,se=0,j=new Nt(0,0),zt=new oe,ce=new $t(new z(0,0,1),0),Pt=new z,h=new Map,O=0,Z=0,St=0,Ft=116,ut=[],N=()=>document.documentElement.lang==="en"?["Milky Way \xB7 Barred-spiral study","Gravity streams \xB7 Continuous motion","Orbital threads \xB7 Volumetric glow"]:["\u94F6\u6CB3\u7CFB \xB7 \u68D2\u65CB\u7ED3\u6784\u793A\u610F","\u5F15\u529B\u6D41\u7EBF \xB7 \u8FDE\u7EED\u5F62\u53D8","\u661F\u7403\u8109\u7EDC \xB7 \u7ACB\u4F53\u8F89\u5149"];function s(t,a,o,i){t.addEventListener(a,o,i),ut.push(()=>t.removeEventListener(a,o,i))}function qt(){E.rotation.set(K,V,0),E.scale.setScalar(M()?.46*R.x+.65*(R.y+R.z):1),A.position.set(G*.7,9+L*.4,X),A.lookAt(0,0,0),E.updateMatrixWorld(!0),zt.setFromCamera(j,A),zt.ray.intersectPlane(ce,Pt)&&F.uPointer.value.copy(E.worldToLocal(Pt)),F.uHover.value=U,F.uTime.value=Ct,S.render(it,A),r.dataset.frame=String(++se)}function dt(){if(D||I)return;let{width:t,height:a}=at();S.setPixelRatio(Math.min(devicePixelRatio||1,M()||Y?1.3:1.6)),S.setSize(t,a,!1),F.uDpr.value=S.getPixelRatio(),A.aspect=t/a,A.updateProjectionMatrix();let o=Math.min(b,M()||Y?3e4:86e3);w.setDrawRange(0,o),E.position.set(M()?0:20,M()?-14:0,0),E.scale.setScalar(M()?.72:1),document.documentElement.dataset.particles=String(o),qt(),u()}function pt(t){if(n=0,D||I||yt())return;let a=1e3/(M()||Y?30:45);if(q&&t-lt<a){n=requestAnimationFrame(pt);return}let o=q?Math.min((t-q)/1e3,.05):1/45;q=t,lt=t,ct||(Ct+=o,k+=o*.008);let i=1-Math.exp(-o*5.5);if(K+=(v-K)*i,V+=(k-V)*i,X+=(p-X)*i,U+=(H-U)*i,d<1){d=Math.min(1,d+o/.95);let m=d*d*d*(d*(d*6-15)+10);R.copy(At).lerp(nt,m)}F.uMorph.value=d>=1?0:d,qt();let y=d<1||Math.abs(v-K)>2e-4||Math.abs(k-V)>2e-4||Math.abs(p-X)>.005||Math.abs(H-U)>.001;(!ct||y)&&(n=requestAnimationFrame(pt))}function u(){!n&&!D&&!I&&!yt()&&(q=0,lt=0,n=requestAnimationFrame(pt))}function Bt(){ct=document.documentElement.dataset.motion==="paused",u()}function Wt(){v=.59,k=-.25,p=116,G=L=0,H=0,u()}for(let t of document.querySelectorAll("[data-shape]"))s(t,"click",()=>{x=Number(t.dataset.shape),At.copy(R),nt.set(x===0?1:0,x===1?1:0,x===2?1:0),d=0,ne.matches&&(R.copy(nt),d=1);for(let a of document.querySelectorAll("[data-shape]"))a.setAttribute("aria-pressed",String(a===t));W.textContent=N()[x],r.dataset.shape=String(x),u()});s(re,"click",Wt),s(r,"pointerdown",t=>{if(t.button===0&&(r.focus({preventScroll:!0}),h.set(t.pointerId,{x:t.clientX,y:t.clientY}),O=t.clientX,Z=t.clientY,_=!0,H=.2,r.setPointerCapture(t.pointerId),h.size===2)){let[a,o]=[...h.values()];St=Math.hypot(a.x-o.x,a.y-o.y),Ft=p}}),s(r,"pointermove",t=>{let a=at();if(j.set((t.clientX-a.left)/a.width*2-1,-(t.clientY-a.top)/a.height*2+1),h.has(t.pointerId)&&h.set(t.pointerId,{x:t.clientX,y:t.clientY}),h.size===2){let[o,i]=[...h.values()];p=tt.clamp(Ft*St/Math.max(1,Math.hypot(o.x-i.x,o.y-i.y)),76,165),u();return}_?(k+=(t.clientX-O)*.0045,v=tt.clamp(v+(t.clientY-Z)*.0045,-1.2,1.2),O=t.clientX,Z=t.clientY,u()):t.pointerType!=="touch"&&(G=j.x,L=j.y,H=1,u())});let Dt=t=>{if(h.delete(t.pointerId),_=h.size>0,_){let a=[...h.values()][0];O=a.x,Z=a.y}H=t.pointerType==="touch"?0:1,u()};s(r,"pointerup",Dt),s(r,"pointercancel",Dt),s(r,"pointerleave",()=>{H=0,G=L=0,u()}),s(r,"wheel",t=>{t.shiftKey&&(t.preventDefault(),p=tt.clamp(p+t.deltaY*.035,76,165),u())},{passive:!1}),s(r,"keydown",t=>{["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","+","=","-","r","R"].includes(t.key)&&(t.preventDefault(),t.key==="ArrowLeft"&&(k-=.14),t.key==="ArrowRight"&&(k+=.14),t.key==="ArrowUp"&&(v=Math.max(-1.2,v-.12)),t.key==="ArrowDown"&&(v=Math.min(1.2,v+.12)),(t.key==="+"||t.key==="=")&&(p=Math.max(76,p-8)),t.key==="-"&&(p=Math.min(165,p+8)),t.key.toLowerCase()==="r"&&Wt(),u())}),s(r,"webglcontextlost",t=>{t.preventDefault(),I=!0,cancelAnimationFrame(n),n=0,W.textContent="\u56FE\u5F62\u8FDE\u63A5\u6682\u65F6\u4E2D\u65AD\uFF0C\u7B49\u5F85\u6062\u590D\u2026"}),s(r,"webglcontextrestored",()=>{I=!1,W.textContent=N()[x],dt()}),s(document,"visibilitychange",()=>{cancelAnimationFrame(n),n=0,q=0,document.hidden||u()}),s(window,"resize",dt,{passive:!0}),s(window,"dc-language-changed",()=>{W.textContent=N()[x]});let It=new MutationObserver(()=>{cancelAnimationFrame(n),n=0,Bt()});It.observe(document.documentElement,{attributes:!0,attributeFilter:["data-motion","data-immersive"]});let Yt=new IntersectionObserver(t=>{ot=t[0].isIntersecting,cancelAnimationFrame(n),n=0,ot&&u()},{threshold:0});Yt.observe(et),ut.push(()=>It.disconnect(),()=>Yt.disconnect()),s(window,"pagehide",t=>{cancelAnimationFrame(n),n=0,t.persisted||Kt()}),s(window,"pageshow",u);function Kt(){D||(D=!0,cancelAnimationFrame(n),ut.forEach(t=>t()),w.dispose(),Tt.dispose(),st.dispose(),Ht.dispose(),S.dispose())}return pe.disabled=!1,re.disabled=!1,W.textContent=N()[x],r.dataset.shape="0",r.dataset.galaxy="milky-way",document.documentElement.dataset.renderer="three-webgl-layered",dt(),Bt(),window.dispatchEvent(new CustomEvent("dc-starfield-status",{detail:{available:!0}})),Kt}
