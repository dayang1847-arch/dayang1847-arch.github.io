import { WORLD, FACTIONS, UNITS, BUILDINGS } from './game-data.js';
import { ASIA_LAND, SOURCE } from './assets/asia-land.js';
import { isOnLand } from './asia-map.js';

const PALETTE = ['#35654c', '#ac5342', '#487b94', '#84648b'];
const GLYPHS = { spear: '枪', archer: '弓', cavalry: '骑', siege: '械', unique: '精', hero: '将', guard: '卫' };
const english = { spear: 'S', archer: 'A', cavalry: 'C', siege: 'E', unique: 'U', hero: 'H', guard: 'G' };
const glyphs = { farm: '穗', workshop: '坊', barracks: '营', stable: '马', arsenal: '械', housing: '民', tower: '哨', camp: '帐' };
const clamp = (n, lo, hi) => Math.max(lo, Math.min(hi, n));
const inPolygon = (point, polygon) => { let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if((a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/(b.y-a.y)+a.x)inside=!inside;}return inside; };
const regionRings = region => region.polygons || [region.polygon];
const inRegion = (point, region) => regionRings(region).some(ring=>inPolygon(point,ring)) && !(region.excludePolygons||[]).some(ring=>inPolygon(point,ring));
const polygonPath = rings => { const path=new Path2D();for(const ring of rings){if(!ring?.length)continue;path.moveTo(ring[0].x,ring[0].y);for(let i=1;i<ring.length;i++)path.lineTo(ring[i].x,ring[i].y);path.closePath();}return path; };

/** Rendering and input only. All game decisions stay in the shared authority. */
export class Battlefield {
  constructor(canvas, options = {}) {
    this.canvas = canvas; this.ctx = canvas.getContext('2d'); this.options = options;
    this.snapshot = null; this.playerId = null; this.selected = new Set(); this.positions = new Map();this.effects=[];
    this.camera = { x: WORLD.width / 2, y: WORLD.height / 2, zoom: 1 };
    this.keys = new Set(); this.drag = null; this.placement = null; this.orders = [];
    this.pointers=new Map();this.navigationMode='pan';this.wheelSensitivity=1;this.panVelocity={x:0,y:0};this.navigationButton=document.getElementById('map-pan-toggle');
    this.dpr = Math.min(devicePixelRatio || 1, 2); this.width = 0; this.height = 0;
    this.theme = document.documentElement.dataset.theme;
    this.motionQuery = matchMedia('(prefers-reduced-motion: reduce)'); this.userReducedMotion = false; this.reducedMotion = this.motionQuery.matches;
    this.motionChangeHandler = () => this.setReducedMotionPreference(this.userReducedMotion);
    if (this.motionQuery.addEventListener) this.motionQuery.addEventListener('change', this.motionChangeHandler);
    else this.motionQuery.addListener?.(this.motionChangeHandler);
    this.regionCenters=new Set((WORLD.regions||[]).map(r=>r.cityId));this.regionById=new Map((WORLD.regions||[]).map(r=>[r.id,r]));this.regionPaths=new Map((WORLD.regions||[]).map(r=>[r.id,polygonPath(regionRings(r))]));this.regionMasks=new Map((WORLD.regions||[]).filter(r=>r.excludePolygons?.length).map(r=>{const mask=polygonPath(r.excludePolygons);mask.rect(0,0,WORLD.width,WORLD.height);return[r.id,mask];}));this.zoomLabel=document.getElementById('zoom-level');
    this.terrain = document.createElement('canvas'); this.terrain.width = WORLD.width; this.terrain.height = WORLD.height;
    this.drawTerrain(); this.bind(); this.resize(); this.frame = requestAnimationFrame(t => this.draw(t));
    this.observer = new ResizeObserver(() => this.resize()); this.observer.observe(canvas);
    this.themeObserver = new MutationObserver(() => { this.theme = document.documentElement.dataset.theme; this.fogDirty = true; this.drawTerrain(); });
    this.themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });
    this.gestureObserver=new MutationObserver(()=>{if(document.querySelector('[role="dialog"]'))this.clearGesture();});
    this.gestureObserver.observe(document.getElementById('dialog-layer'),{childList:true,subtree:true});
  }
  lang() { return this.options.getLanguage?.() || 'zh'; }
  label(obj) { return this.lang() === 'en' ? obj?.nameEn || obj?.name || '' : obj?.name || ''; }
  setInteractionMode(mode) {
    if (mode !== 'pan' && mode !== 'select') return false;
    this.clearGesture(); this.navigationMode = mode; this.updateCursor(); this.updateNavigationButton();
    return true;
  }
  setWheelSensitivity(value) {
    if (![0.75, 1, 1.35].includes(value)) return false;
    this.wheelSensitivity = value; return true;
  }
  setReducedMotionPreference(value) {
    if (typeof value !== 'boolean') return false;
    this.userReducedMotion = value; this.reducedMotion = this.motionQuery.matches || value;
    if (this.reducedMotion) {
      this.panVelocity = { x: 0, y: 0 }; this.effects.length = 0;
      for (const unit of this.snapshot?.units || []) this.positions.set(unit.id, { x: unit.x, y: unit.y });
    }
    return true;
  }
  setPlayer(id) { if(this.playerId!==id)this.camera.zoom=1;this.scale=Math.max(.001,(this.fit||.001)*this.camera.zoom);this.playerId = id; }
  setSnapshot(state) {
    if(!this.reducedMotion&&this.snapshot&&state){const previous=new Map([...this.snapshot.units,...this.snapshot.cities,...this.snapshot.buildings].map(e=>[e.id,e]));const targets=new Map([...state.units,...state.cities,...state.buildings].map(e=>[e.id,e]));const now=performance.now();for(const e of targets.values()){const old=previous.get(e.id);if(old&&Number.isFinite(e.hp)&&e.hp<old.hp)this.effects.push({kind:'hit',x:e.x,y:e.y,end:now+450});if(e.type&&e.owner===this.playerId&&!e.transit&&e.order?.type==='attack'&&e.cooldown>Math.max(0,old?.cooldown||0)+.1){const target=targets.get(e.order.targetId);if(target)this.effects.push({kind:'shot',x:e.x,y:e.y,toX:target.x,toY:target.y,end:now+300,color:this.color(e.owner)});}}}
    this.snapshot = state; this.fogDirty = true;
    if (!this.playerId) this.playerId = state?.you;
    const live = new Set((state?.units || []).map(u => u.id));
    for (const id of this.positions.keys()) if (!live.has(id)) this.positions.delete(id);
    for (const id of this.selected) if (!live.has(id)) this.selected.delete(id);
  }
  setSelection(ids = []) { this.selected = new Set(ids); }
  getSelection() { return [...this.selected]; }
  setPlacement(type) { this.placement = type; this.updateCursor(); }
  resize() {
    if(this.drag)this.clearGesture();
    const box = this.canvas.getBoundingClientRect(); this.width = Math.max(1, box.width); this.height = Math.max(1, box.height);
    this.canvas.width = Math.round(this.width * this.dpr); this.canvas.height = Math.round(this.height * this.dpr);
    this.fit = Math.max(.001,Math.min((this.width - 20) / WORLD.width, (this.height - 24) / WORLD.height));
    this.scale=Math.max(.001,this.fit*this.camera.zoom);this.panVelocity={x:0,y:0};
  }
  focus(x, y, zoom) { this.panVelocity={x:0,y:0};if(Number.isFinite(zoom))this.camera.zoom=clamp(zoom,.8,16);else if(Math.hypot(x-WORLD.width/2,y-WORLD.height/2)>20)this.camera.zoom=Math.max(this.camera.zoom,1.6);this.scale=Math.max(.001,this.fit*this.camera.zoom);const hw=this.width/(2*this.scale),hh=this.height/(2*this.scale);this.camera.x=hw>=WORLD.width/2?WORLD.width/2:clamp(x,hw,WORLD.width-hw);this.camera.y=hh>=WORLD.height/2?WORLD.height/2:clamp(y,hh,WORLD.height-hh); }
  center() { const p = this.snapshot?.players.find(p => p.id === this.playerId); if (p) this.focus(p.base.x, p.base.y); else this.focus(800, 500); }
  zoom(factor) { this.panVelocity={x:0,y:0};this.camera.zoom = clamp(this.camera.zoom * factor, .8, 16);this.scale=Math.max(.001,this.fit*this.camera.zoom); }
  constrainCamera() { const mx=Math.min(this.width/(2*this.scale),WORLD.width/2)*.2,my=Math.min(this.height/(2*this.scale),WORLD.height/2)*.2;this.camera.x=clamp(this.camera.x,mx,WORLD.width-mx);this.camera.y=clamp(this.camera.y,my,WORLD.height-my); }
  updateCursor() { this.canvas.style.cursor=this.drag?.moved&&['pan','place'].includes(this.drag.mode)?'grabbing':this.placement||this.navigationMode==='select'?'crosshair':'grab'; }
  clearGesture() { const ids=[...this.pointers.keys()];this.pointers.clear();this.keys.clear();this.drag=null;this.panVelocity={x:0,y:0};for(const id of ids)if(this.canvas.hasPointerCapture(id))this.canvas.releasePointerCapture(id);this.updateCursor(); }
  updateNavigationButton() { if(!this.navigationButton)return;const en=this.lang()==='en',pan=this.navigationMode==='pan',key=`${en}:${pan}`;if(this.navigationKey===key)return;this.navigationKey=key;this.navigationButton.setAttribute('aria-pressed',String(pan));this.navigationButton.title=en?(pan?'Drag to pan. Click for box selection; Shift also selects.':'Drag to select squads. Click to return to map panning.'):(pan?'拖动平移。点击切换框选，也可按 Shift 拖动框选。':'拖动框选编队。点击切回地图平移。');this.navigationButton.querySelector('.map-mode-label').textContent=en?(pan?'Pan map':'Select squads'):(pan?'拖动地图':'框选部队'); }
  selectPoint(point,additive=false) { const entity=this.hit(this.world(point)),ids=additive?[...this.selected]:[];if(entity?.entityType==='unit'&&entity.owner===this.playerId)ids.push(entity.id);this.setSelection([...new Set(ids)]);this.options.onSelect?.(this.getSelection(),entity); }
  world(point) { return { x: (point.x - this.width / 2) / this.scale + this.camera.x, y: (point.y - this.height / 2) / this.scale + this.camera.y }; }
  screen(point) { return { x: (point.x - this.camera.x) * this.scale + this.width / 2, y: (point.y - this.camera.y) * this.scale + this.height / 2 }; }
  local(event) { const b = this.canvas.getBoundingClientRect(); return { x: event.clientX - b.left, y: event.clientY - b.top }; }
  hit(point) {
    const limit = 24 / this.scale;
    const candidates = [ ...(this.snapshot?.units || []).map(u => ({ ...u,...this.positions.get(u.id), entityType: 'unit' })), ...(this.snapshot?.buildings || []).map(b => ({ ...b, entityType: 'building' })), ...(this.snapshot?.cities || WORLD.cities).map(c => ({ ...c, entityType: 'city' })) ];
    let best = null, distance = Infinity;
    for (const object of candidates) {
      const d = Math.hypot(point.x - object.x, point.y - object.y);
      const r = object.entityType === 'unit' ? 14 / this.scale : object.entityType==='city'&&!this.regionCenters.has(object.id)&&WORLD.cities.length>50 ? (this.camera.zoom<3?6:13)/this.scale : limit;
      if (d < r && d < distance) { best = object; distance = d; }
    }
    if(best)return best;
    const region=(WORLD.regions||[]).find(r=>inRegion(point,r));
    if(region&&isOnLand(point)){const city=this.snapshot?.cities.find(c=>c.id===region.cityId);return {...region,owner:city?.owner,entityType:'region'};}
    return null;
  }
  bind() {
    this.handlers = {
      down: e => {
        if(e.button!==0&&e.button!==1&&e.pointerType!=='touch')return;
        e.preventDefault();this.canvas.focus({preventScroll:true});const p=this.local(e);this.pointer=p;
        this.panVelocity={x:0,y:0};this.pointers.set(e.pointerId,p);this.canvas.setPointerCapture(e.pointerId);
        if(e.pointerType==='touch')this.lastTouchAt=performance.now();
        if(this.pointers.size>=2){this.keys.clear();const [a,b]=[...this.pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};this.drag={mode:'pinch',moved:true,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:this.camera.zoom,anchor:this.world(mid)};this.updateCursor();return;}
        const mini=this.minimap,panning=e.button===1||this.keys.has(' ')||this.navigationMode==='pan'&&!e.shiftKey;
        const mode=mini&&p.x>=mini.x&&p.x<=mini.x+mini.w&&p.y>=mini.y&&p.y<=mini.y+mini.h?'minimap':this.placement&&e.button===0&&!this.keys.has(' ')?'place':panning?'pan':'select';
        this.drag={mode,start:p,last:p,worldStart:this.world(p),additive:e.shiftKey,moved:false,lastTime:performance.now(),velocity:{x:0,y:0},pointerId:e.pointerId,clickable:e.button===0||e.pointerType==='touch'};
        if(mode==='minimap')this.focus((p.x-mini.x)/mini.w*WORLD.width,(p.y-mini.y)/mini.h*WORLD.height);
        this.updateCursor();
      },
      move: e => {
        const p = this.local(e); this.pointer = p;
        if(!this.pointers.has(e.pointerId)||!this.drag)return;
        this.pointers.set(e.pointerId,p);const d=this.drag;
        if(d.mode==='pinch'){const [a,b]=[...this.pointers.values()];if(!b)return;const mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};this.camera.zoom=clamp(d.zoom*Math.hypot(a.x-b.x,a.y-b.y)/d.distance,.8,16);this.scale=this.fit*this.camera.zoom;this.camera.x=d.anchor.x-(mid.x-this.width/2)/this.scale;this.camera.y=d.anchor.y-(mid.y-this.height/2)/this.scale;this.constrainCamera();return;}
        if(d.pointerId!==e.pointerId)return;
        const wasMoved=d.moved;d.moved=d.moved||Math.hypot(p.x-d.start.x,p.y-d.start.y)>=6;
        if(d.mode==='minimap'){const m=this.minimap;this.focus(clamp((p.x-m.x)/m.w,0,1)*WORLD.width,clamp((p.y-m.y)/m.h,0,1)*WORLD.height);}
        if(d.moved&&['pan','place'].includes(d.mode)){const last=wasMoved?d.last:d.start,dx=(p.x-last.x)/this.scale,dy=(p.y-last.y)/this.scale,dt=clamp(performance.now()-d.lastTime,8,80);this.camera.x-=dx;this.camera.y-=dy;this.constrainCamera();d.velocity={x:d.velocity.x*.55-clamp(dx/dt,-.6/this.scale,.6/this.scale)*.45,y:d.velocity.y*.55-clamp(dy/dt,-.6/this.scale,.6/this.scale)*.45};}
        d.last=p;d.lastTime=performance.now();this.updateCursor();
      },
      up: e => {
        if(!this.pointers.has(e.pointerId)||!this.drag)return;
        const d=this.drag,p=this.local(e);if(d.mode!=='pinch'&&Math.hypot(p.x-d.last.x,p.y-d.last.y)>.1)this.handlers.move(e);if(d.start)d.moved=d.moved||Math.hypot(p.x-d.start.x,p.y-d.start.y)>=6;this.pointers.delete(e.pointerId);
        if(this.canvas.hasPointerCapture(e.pointerId))this.canvas.releasePointerCapture(e.pointerId);
        if(d.mode==='pinch'){if(this.pointers.size>=2){const [a,b]=[...this.pointers.values()],mid={x:(a.x+b.x)/2,y:(a.y+b.y)/2};this.drag={mode:'pinch',moved:true,distance:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom:this.camera.zoom,anchor:this.world(mid)};}else if(this.pointers.size){const [id,last]=[...this.pointers.entries()][0];this.drag={mode:'pan',start:last,last,moved:true,pointerId:id,lastTime:performance.now(),velocity:{x:0,y:0},clickable:false};}else this.drag=null;this.updateCursor();return;}
        if(d.pointerId!==e.pointerId)return;
        if(d.mode==='place'&&!d.moved)this.options.onPoint?.(this.world(p));
        else if(d.mode==='pan'&&!d.moved&&d.clickable)this.selectPoint(p,d.additive);
        else if(d.mode==='select') {
          let ids = d.additive ? [...this.selected] : [], entity = null;
          if (!d.moved) {
            entity = this.hit(this.world(p));
            if (entity?.entityType === 'unit' && entity.owner === this.playerId) ids.push(entity.id);
          } else {
            const a = d.worldStart, b = this.world(p);
            for (const u of this.snapshot?.units || []) {const position=this.positions.get(u.id)||u;if (u.owner === this.playerId && position.x >= Math.min(a.x,b.x) && position.x <= Math.max(a.x,b.x) && position.y >= Math.min(a.y,b.y) && position.y <= Math.max(a.y,b.y)) ids.push(u.id);}
          }
          ids = [...new Set(ids)]; this.setSelection(ids); this.options.onSelect?.(ids, entity);
        }
        if(d.moved&&['pan','place'].includes(d.mode)&&!this.reducedMotion&&performance.now()-d.lastTime<100)this.panVelocity=d.velocity;
        this.drag = null;
        this.updateCursor();
      },
      cancel:e=>{if(this.pointers.has(e.pointerId))this.clearGesture();},
      context: e => {
        e.preventDefault();this.clearGesture();const local=this.local(e),m=this.minimap;
        if(m&&local.x>=m.x&&local.x<=m.x+m.w&&local.y>=m.y&&local.y<=m.y+m.h)return;
        if (this.placement) { this.setPlacement(null);this.options.onCancelPlacement?.();this.options.onStatus?.(this.lang() === 'en' ? 'Targeting cancelled.' : '已取消目标选择。'); return; }
        const p = this.world(this.local(e)), target = this.hit(p);
        const attackable = target && target.entityType !== 'region' && target.owner !== this.playerId;
        this.options.onOrder?.({ x: clamp(p.x, 5, WORLD.width - 5), y: clamp(p.y, 5, WORLD.height - 5), targetId: attackable ? target.id : undefined });
        this.orders.push({ x: p.x, y: p.y, until: performance.now() + 900, attack: !!attackable });
      },
      wheel: e => { e.preventDefault();if(this.drag?.mode==='select'||this.drag?.mode==='pinch')return;const before = this.world(this.local(e)),pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?this.height:1);this.zoom(Math.exp(clamp(-pixels,-80,80)*.0025*this.wheelSensitivity));const after = this.world(this.local(e)); this.camera.x += before.x - after.x; this.camera.y += before.y - after.y;this.constrainCamera(); },
      double: e => {if(performance.now()-(this.lastTouchAt||-1000)<600||this.placement)return;const point=this.world(this.local(e)),object=this.hit(point);if(object?.entityType==='city'){this.focus(object.x,object.y,Math.max(this.camera.zoom,6));this.options.onSelect?.([],{...object});}else{this.zoom(1.5);this.focus(point.x,point.y);}},
      keydown: e => {
        if (['INPUT','SELECT','TEXTAREA'].includes(e.target.tagName) || document.querySelector('[role="dialog"]')) return;
        if(e.key==='Escape')this.clearGesture();
        if (['ArrowUp','ArrowDown','ArrowLeft','ArrowRight',' '].includes(e.key) && document.activeElement === this.canvas) { e.preventDefault();if(!['select','pinch'].includes(this.drag?.mode)){this.panVelocity={x:0,y:0};this.keys.add(e.key);} }
        if(document.activeElement===this.canvas&&this.drag?.mode!=='select'&&['+','=','-'].includes(e.key)){e.preventDefault();this.zoom(e.key==='-'?.85:1.2);}
      },
      keyup: e => this.keys.delete(e.key),
      blur: () => { this.keys.clear(); this.clearGesture(); },
      mode:()=>{this.setInteractionMode(this.navigationMode==='pan'?'select':'pan');this.options.onInteractionModeChange?.(this.navigationMode);}
    };
    for (const [event, key] of [['pointerdown','down'],['pointermove','move'],['pointerup','up'],['pointercancel','cancel'],['lostpointercapture','cancel'],['contextmenu','context'],['wheel','wheel'],['dblclick','double']]) this.canvas.addEventListener(event, this.handlers[key], event === 'wheel' ? { passive: false } : undefined);
    this.navigationButton?.addEventListener('click',this.handlers.mode);this.updateCursor();this.updateNavigationButton();
    window.addEventListener('keydown', this.handlers.keydown); window.addEventListener('keyup', this.handlers.keyup); window.addEventListener('blur', this.handlers.blur);
  }
  drawTerrain() {
    if(WORLD.regions?.length){this.drawAsiaTerrain();return;}
    const c = this.terrain.getContext('2d'), dark = this.theme === 'dark';
    c.clearRect(0, 0, WORLD.width, WORLD.height); c.fillStyle = dark ? '#293a2e' : '#e7e4d6'; c.fillRect(0,0,WORLD.width,WORLD.height);
    // Deterministic ink contours, keeping the actual collision terrain legible.
    let seed = 7319; const rand = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646;
    c.lineWidth = 1; c.strokeStyle = dark ? '#43544250' : '#aab39a38';
    for (let k=0;k<42;k++) {
      const x=rand()*1600,y=rand()*1000,r=45+rand()*155;
      for(let ring=0;ring<3;ring++) { c.beginPath(); for(let i=0;i<=32;i++){const a=i/32*Math.PI*2,rad=r+ring*10+Math.sin(a*3+k)*12;const px=x+Math.cos(a)*rad,py=y+Math.sin(a)*rad*.5;i?c.lineTo(px,py):c.moveTo(px,py);}c.closePath();c.stroke(); }
    }
    c.fillStyle = dark ? '#57704a25' : '#97a98317';
    for(let i=0;i<600;i++){const x=rand()*1600,y=rand()*1000;c.fillRect(x,y,1.5,1.5);}
    for (const road of WORLD.roads) {
      c.strokeStyle=dark?'#8e845345':'#c4b48970';c.lineWidth=11;c.lineCap='round';c.beginPath();c.moveTo(road.from.x,road.from.y);c.lineTo(road.to.x,road.to.y);c.stroke();
      c.strokeStyle=dark?'#b5a76d65':'#a6997680';c.lineWidth=1.3;c.setLineDash([5,8]);c.stroke();c.setLineDash([]);
    }
    // The ring road makes the eight economic cities read as a coherent theatre.
    c.strokeStyle=dark?'#96875850':'#b4a68160';c.lineWidth=5;c.beginPath();c.moveTo(420,190);c.lineTo(1180,190);c.lineTo(1250,420);c.lineTo(1250,580);c.lineTo(1180,810);c.lineTo(420,810);c.lineTo(350,580);c.lineTo(350,420);c.closePath();c.stroke();
    for(const o of WORLD.obstacles){
      if(o.kind==='mountain'){
        c.fillStyle=dark?'#455441':'#c0c8b0';c.strokeStyle=dark?'#738266':'#82916e';c.lineWidth=1.2;
        c.beginPath();c.moveTo(o.x,o.y+o.h);for(let i=0;i<=8;i++){const x=o.x+i*o.w/8,y=o.y+(i%2?o.h*.65:o.h*.15)+Math.sin(i)*9;c.lineTo(x,y);}c.lineTo(o.x+o.w,o.y+o.h);c.closePath();c.fill();c.stroke();
        for(let i=0;i<4;i++){const x=o.x+22+i*o.w/4;c.beginPath();c.moveTo(x,o.y+o.h*.4);c.lineTo(x+20,o.y+o.h*.75);c.lineTo(x-5,o.y+o.h*.64);c.stroke();}
      }else if(o.kind==='river'){
        c.fillStyle=dark?'#345e5c':'#a8c4bd';c.fillRect(o.x,o.y,o.w,o.h);c.strokeStyle=dark?'#789b8c':'#c9ded1';c.lineWidth=1;
        for(let j=0;j<o.h;j+=13){c.beginPath();c.moveTo(o.x+6,o.y+j);c.bezierCurveTo(o.x+o.w*.3,o.y+j-4,o.x+o.w*.7,o.y+j+4,o.x+o.w-6,o.y+j);c.stroke();}
      }else{
        c.fillStyle=dark?'#36503788':'#b3c3a08c';c.fillRect(o.x,o.y,o.w,o.h);
        for(let y=o.y+9;y<o.y+o.h;y+=18)for(let x=o.x+8;x<o.x+o.w;x+=19){c.fillStyle=dark?'#687e553f':'#78976655';c.beginPath();c.moveTo(x,y-6);c.lineTo(x-6,y+4);c.lineTo(x+6,y+4);c.closePath();c.fill();}
      }
    }
    c.strokeStyle=dark?'#80907055':'#99a78070';c.lineWidth=1.4;c.strokeRect(22,22,1556,956);
    c.fillStyle=dark?'#a7b29350':'#78896755';c.font='20px Georgia,serif';c.textAlign='center';c.fillText('山 河 九 城',800,57);c.font='10px Georgia,serif';c.fillText('THE NINE CITIES · AN ALTERNATE HISTORY',800,77);
  }
  drawAsiaTerrain() {
    const c=this.terrain.getContext('2d'),dark=this.theme==='dark';
    c.clearRect(0,0,1600,1000);c.fillStyle=dark?'#1c3533':'#d6e3dc';c.fillRect(0,0,1600,1000);
    const gradient=c.createLinearGradient(0,0,0,1000);gradient.addColorStop(0,dark?'#263d38':'#e3e9dd');gradient.addColorStop(1,dark?'#173530':'#cbddd5');c.fillStyle=gradient;c.fillRect(0,0,1600,1000);
    this.landPath=new Path2D();for(const ring of ASIA_LAND){if(!ring.length)continue;this.landPath.moveTo(ring[0].x,ring[0].y);for(let i=1;i<ring.length;i++)this.landPath.lineTo(ring[i].x,ring[i].y);this.landPath.closePath();}
    c.fillStyle=dark?'#394934':'#eee8d4';c.fill(this.landPath,'evenodd');c.strokeStyle=dark?'#6b7e60':'#91a284';c.lineWidth=1.4;c.stroke(this.landPath);
    c.save();c.clip(this.landPath,'evenodd');
    for(let i=0;i<(WORLD.regions||[]).length;i++)this.fillRegion(c,WORLD.regions[i],(dark?['#53654b','#51674d','#60634a','#5a684b']:['#d8d9bc','#e8dfbf','#dddac0','#d7dfc2'])[i%4]+'55');
    c.strokeStyle=dark?'#82906938':'#9aab7a45';c.lineWidth=.7;
    for(let latitude=0;latitude<=75;latitude+=15){const y=40+(80-latitude)/92*920;c.beginPath();c.moveTo(40,y);c.lineTo(1560,y);c.stroke();}
    for(let longitude=30;longitude<180;longitude+=15){const x=40+(longitude-25)/155*1520;c.beginPath();c.moveTo(x,40);c.lineTo(x,960);c.stroke();}
    c.strokeStyle=dark?'#b5b47d85':'#b09b6670';c.lineWidth=2.6;c.setLineDash([5,6]);for(const road of WORLD.roads){c.beginPath();const points=road.path||road.points||[road.from,road.to];points.forEach((p,j)=>j?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}c.setLineDash([]);
    for(const o of WORLD.obstacles){c.fillStyle=dark?'#78936830':'#77906429';if(o.kind==='mountain'){c.beginPath();c.moveTo(o.x,o.y+o.h);c.lineTo(o.x+o.w*.3,o.y);c.lineTo(o.x+o.w*.6,o.y+o.h*.55);c.lineTo(o.x+o.w*.8,o.y+o.h*.15);c.lineTo(o.x+o.w,o.y+o.h);c.closePath();c.fill();}else{c.fillRect(o.x,o.y,o.w,o.h);}}
    c.restore();c.font='italic 20px Georgia,serif';c.textAlign='center';c.fillStyle=dark?'#93b8a170':'#5b887050';c.fillText('INDIAN OCEAN',770,865);c.fillText('PACIFIC OCEAN',1380,580);c.font='14px Georgia,serif';c.fillStyle=dark?'#d6d9b660':'#57684e65';c.fillText('ASIA',840,170);c.font='9px sans-serif';c.textAlign='left';c.fillText(`NATURAL EARTH · ${SOURCE.scale}`,58,939);c.strokeStyle=dark?'#8c9d7450':'#879d7370';c.lineWidth=1;c.strokeRect(40,40,1520,920);
  }
  drawDetailTerrain() {
    const c=this.ctx,dark=this.theme==='dark',s=1/this.scale;c.fillStyle=dark?'#1c3533':'#d6e3dc';c.fillRect(0,0,WORLD.width,WORLD.height);c.fillStyle=dark?'#394934':'#eee8d4';c.fill(this.landPath,'evenodd');c.strokeStyle=dark?'#91a27c':'#91a284';c.lineWidth=.85*s;c.stroke(this.landPath);c.save();c.clip(this.landPath,'evenodd');
    for(let i=0;i<WORLD.regions.length;i++)this.fillRegion(c,WORLD.regions[i],(dark?['#53654b','#51674d','#60634a','#5a684b']:['#d8d9bc','#e8dfbf','#dddac0','#d7dfc2'])[i%4]+'55');
    c.strokeStyle=dark?'#b5b47d75':'#b09b6660';c.lineWidth=1*s;c.setLineDash([4*s,6*s]);for(const road of WORLD.roads){if(!this.isVisible(road.from,150)&&!this.isVisible(road.to,150))continue;c.beginPath();(road.path||[road.from,road.to]).forEach((p,j)=>j?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}c.setLineDash([]);c.restore();
  }
  drawShippingLanes() {
    const c=this.ctx,s=1/this.scale;c.save();c.beginPath();c.rect(0,0,WORLD.width,WORLD.height);c.clip();c.strokeStyle=this.theme==='dark'?'#89b5af66':'#4d8e8270';c.lineWidth=.9*s;c.setLineDash([3*s,7*s]);
    for(const lane of WORLD.shippingLanes||[]){const points=lane.path||[];if(points.length<2)continue;c.beginPath();points.forEach((p,j)=>j?c.lineTo(p.x,p.y):c.moveTo(p.x,p.y));c.stroke();}c.setLineDash([]);c.restore();
  }
  isVisible(point, margin=50) { const p=this.screen(point);return p.x>=-margin&&p.y>=-margin&&p.x<=this.width+margin&&p.y<=this.height+margin; }
  cityLabels(cities) {
    const key=`${this.lang()},${Math.round(this.camera.x)},${Math.round(this.camera.y)},${this.camera.zoom.toFixed(2)},${this.width},${this.height},${[...this.selected].join(',')}`;
    if(this.labelKey===key)return this.labelIds;this.labelKey=key;
    const labels=new Set(),occupied=[];
    const ranked=cities.filter(city=>this.isVisible(city,70)).sort((a,b)=>{const priority=c=>this.selected.has(c.id)?1e12:c.kind==='capital'?1e11:this.regionCenters.has(c.id)?1e10:c.port?1e9:Number(c.population||c.popMax||c.pop||0);return priority(b)-priority(a);});
    this.ctx.save();this.ctx.font='10px sans-serif';
    for(const city of ranked){const selected=this.selected.has(city.id)||this.selected.has(city.regionId),center=this.regionCenters.has(city.id);if(this.camera.zoom<1.8&&!selected&&!center)continue;const p=this.screen(city),name=this.label(this.camera.zoom<1.6&&center?this.regionById.get(city.regionId):city),w=Math.max(center?46:30,this.ctx.measureText(name).width+12),h=center||city.port||selected?60:39,box={left:p.x-w/2,right:p.x+w/2,top:p.y-20,bottom:p.y+h-20};if(!selected&&!center&&occupied.some(q=>box.left<q.right&&box.right>q.left&&box.top<q.bottom&&box.bottom>q.top))continue;labels.add(city.id);occupied.push(box);}
    this.ctx.restore();
    this.labelIds=labels;return labels;
  }
  drawCities() {
    const cities=this.snapshot?.cities||WORLD.cities,labels=this.cityLabels(cities),c=this.ctx,s=1/this.scale;
    for(const city of cities){if(!this.isVisible(city,70))continue;if(labels.has(city.id)){this.drawCity(city);continue;}c.fillStyle=city.owner?this.color(city.owner):city.port?'#51857b':'#938465';c.globalAlpha=city.owner ? .9 : .65;const r=(city.port?2.2:1.4)*s;c.beginPath();c.arc(city.x,city.y,r,0,Math.PI*2);c.fill();c.globalAlpha=1;}
  }
  drawTerritories(afterFog=false) {
    if(!this.landPath||!WORLD.regions?.length)return;
    const c=this.ctx,s=1/this.scale,dark=this.theme==='dark';c.save();c.clip(this.landPath,'evenodd');
    for(const region of WORLD.regions){const city=this.snapshot?.cities.find(c=>c.id===region.cityId),owner=city?.owner;
      const path=this.regionPaths.get(region.id);c.save();
      if(this.regionMasks.has(region.id))c.clip(this.regionMasks.get(region.id),'evenodd');
      if(!afterFog&&owner){c.fillStyle=this.color(owner)+'36';c.fill(path,'evenodd');}
      if(afterFog){c.strokeStyle=owner?this.color(owner)+'b3':dark?'#b6bf9970':'#8e9f7480';c.lineWidth=(owner?1.2:.8)*s;c.setLineDash(owner?[]:[3*s,3*s]);c.stroke(path);}
      c.restore();
    }
    c.setLineDash([]);c.restore();
  }
  fillRegion(c,region,color) { c.save();if(this.regionMasks.has(region.id))c.clip(this.regionMasks.get(region.id),'evenodd');c.fillStyle=color;c.fill(this.regionPaths.get(region.id),'evenodd');c.restore(); }
  color(id) { const p = this.snapshot?.players.find(p=>p.id===id); return p ? PALETTE[p.slot % 4] : '#a28d5e'; }
  hp(x,y,hp,maxHp,width=30) { if(!Number.isFinite(hp)||!maxHp)return;const c=this.ctx,s=1/this.scale;c.fillStyle='#26392b30';c.fillRect(x-width*s/2,y,width*s,2.5*s);c.fillStyle=hp/maxHp<.3?'#b86445':'#54784d';c.fillRect(x-width*s/2,y,width*s*clamp(hp/maxHp,0,1),2.5*s); }
  flag(x,y,owner,size=1) { const c=this.ctx,s=size/this.scale,player=this.snapshot?.players.find(p=>p.id===owner);c.strokeStyle=this.color(owner);c.lineWidth=1.2/this.scale;c.beginPath();c.moveTo(x,y);c.lineTo(x,y-15*s);c.stroke();c.fillStyle=this.color(owner);c.beginPath();c.moveTo(x,y-15*s);c.lineTo(x+10*s,y-15*s);c.lineTo(x+(player?.slot%2?10:7)*s,y-10*s);c.lineTo(x,y-10*s);c.closePath();c.fill(); }
  drawCity(city) {
    const c=this.ctx,s=1/this.scale,capital=city.kind==='capital',center=this.regionCenters.has(city.id),selected=this.selected.has(city.id),town=city.kind==='town'&&!center,geographic=Boolean(WORLD.regions?.length),compact=geographic&&this.camera.zoom<1.6,r=(capital?(compact?14:19):town?(city.port?9:7):(compact?9:13))*s,dark=this.theme==='dark';
    const color=this.color(city.owner);c.save();c.translate(city.x,city.y);
    if(selected){c.strokeStyle=dark?'#e8cb7b':'#766020';c.lineWidth=2*s;c.beginPath();c.ellipse(0,0,r+9*s,r+7*s,0,0,Math.PI*2);c.stroke();}
    if(city.owner){c.fillStyle=color+'12';c.strokeStyle=color+'35';c.lineWidth=s;c.beginPath();c.ellipse(0,0,r*2.2,r*1.7,0,0,Math.PI*2);c.fill();c.stroke();}
    if(capital){c.strokeStyle='#ad925680';c.lineWidth=s;c.setLineDash([3*s,4*s]);c.beginPath();c.arc(0,0,35*s,0,Math.PI*2);c.stroke();c.setLineDash([]);}
    c.fillStyle=dark?'#d0c9ac':'#f3eee0';c.strokeStyle=color;c.lineWidth=1.5*s;
    c.beginPath();c.rect(-r,-r*.55,r*2,r*1.25);c.fill();c.stroke();
    for(const x of [-r,r]){c.fillStyle=dark?'#d0c9ac':'#efe9d7';c.fillRect(x-3*s,-r*.75,6*s,r*1.5);c.strokeRect(x-3*s,-r*.75,6*s,r*1.5);}
    c.fillStyle=color;c.beginPath();c.moveTo(-r-5*s,-r*.6);c.lineTo(0,-r*1.28);c.lineTo(r+5*s,-r*.6);c.closePath();c.fill();
    c.fillStyle=dark?'#374839':'#d3c6a0';c.fillRect(-3*s,2*s,6*s,8*s);if(capital){c.fillStyle='#b39a5a';c.fillRect(-3*s,-r*1.5,6*s,6*s);}
    if(city.owner)this.flag(r+8*s,-2*s,city.owner,.85);
    this.hp(0,r+5*s,city.hp,city.maxHp,capital?37:28);
    const region=this.regionById.get(city.regionId);let name=compact&&region&&this.regionCenters.has(city.id)?this.label(region):this.label(city);if(compact&&this.lang()==='en'&&name==='Mainland Southeast Asia')name='SE Asia';
    c.textAlign='center';c.fillStyle=dark?'#d8dfca':'#455440';c.font=`${capital||selected?'600 ':''}${(compact?9:capital?12:10)*s}px "PingFang SC",sans-serif`;c.fillText(name,0,r+(compact?15:town?15:20)*s);
    c.font=`${8*s}px sans-serif`;c.fillStyle=dark?'#aab499':'#7d846b';
    const caption=capital?(this.lang()==='en'?'CAPITAL · 3 POINTS':'称帝之城 · 3分'):city.port?(this.lang()==='en'?'PORT · TRANSPORT':'港口 · 航运'):city.kind==='fort'?(this.lang()==='en'?'FORT · SUPPLY':'关隘 · 补给'):city.kind==='town'?(this.lang()==='en'?'TOWN':'城池'):(city.kind==='food'?(this.lang()==='en'?'GRAIN':'粮草产地'):(this.lang()==='en'?'SILVER':'银两产地'));
    if(!compact&&(!town||city.port||selected))c.fillText(caption,0,r+(town?27:32)*s);
    if(city.capture?.progress>0){const progress=city.capture.progress;c.strokeStyle=this.color(city.capture.owner);c.lineWidth=3*s;c.beginPath();c.arc(0,0,r+7*s,-Math.PI/2,-Math.PI/2+Math.PI*2*clamp(progress,0,1));c.stroke();}
    c.restore();
  }
  drawBuilding(b) {
    const c=this.ctx,s=1/this.scale,col=this.color(b.owner),dark=this.theme==='dark';c.save();c.translate(b.x,b.y);
    const base=b.type==='base',r=(base?16:10)*s;
    c.fillStyle=dark?'#c0c7a8':'#eee9d7';c.strokeStyle=col;c.lineWidth=1.3*s;
    if(b.type==='camp'){c.beginPath();c.moveTo(-r,r*.6);c.lineTo(0,-r);c.lineTo(r,r*.6);c.closePath();c.fill();c.stroke();}
    else {c.fillRect(-r,-r*.4,r*2,r*1.15);c.strokeRect(-r,-r*.4,r*2,r*1.15);c.fillStyle=col;c.beginPath();c.moveTo(-r-3*s,-r*.3);c.lineTo(0,-r);c.lineTo(r+3*s,-r*.3);c.closePath();c.fill();}
    if(base){c.fillStyle=col;c.fillRect(-r-3*s,-r*.1,5*s,r);c.fillRect(r-2*s,-r*.1,5*s,r);this.flag(r+8*s,-r*.6,b.owner,1);const p=this.snapshot?.players.find(p=>p.id===b.owner);c.fillStyle=dark?'#15271c':'#fbf4df';c.textAlign='center';c.font=`600 ${11*s}px serif`;c.fillText(this.lang()==='en'?(FACTIONS[p?.faction]?.nameEn?.[0]||'C'):(FACTIONS[p?.faction]?.name||'城'),0,5*s);}
    else {c.fillStyle=col;c.textAlign='center';c.font=`${9*s}px serif`;c.fillText(this.lang()==='en'?b.type[0].toUpperCase():(glyphs[b.type]||'营'),0,5*s);}
    this.hp(0,r+4*s,b.hp,b.maxHp,base?36:23);
    c.fillStyle=dark?'#d6dec6':'#465741';c.font=`${(base?11:8)*s}px sans-serif`;c.textAlign='center';
    const owner=this.snapshot?.players.find(p=>p.id===b.owner);if(base||this.camera.zoom>=1.5)c.fillText(base?(owner?.name||this.label(BUILDINGS.base)):this.label(BUILDINGS[b.type]),0,r+18*s);
    if(Number.isFinite(b.progress)&&b.progress<1){c.fillStyle='#b29a55';c.fillRect(-r,r+23*s,r*2*b.progress,2*s);}
    c.restore();
  }
  drawUnit(unit, now) {
    const c=this.ctx,s=1/this.scale,col=this.color(unit.owner),hero=unit.type==='hero';
    let pos=this.positions.get(unit.id);
    if(!pos){pos={x:unit.x,y:unit.y};this.positions.set(unit.id,pos);}else {const lerp=this.reducedMotion?1:.2;pos.x+=(unit.x-pos.x)*lerp;pos.y+=(unit.y-pos.y)*lerp;}
    c.save();c.translate(pos.x,pos.y);const radius=(hero?10:7)*s;
    if(unit.transit){c.fillStyle=col;c.strokeStyle=this.theme==='dark'?'#d4dcc1':'#f7f0da';c.lineWidth=s;c.beginPath();c.moveTo(-12*s,0);c.lineTo(-6*s,6*s);c.lineTo(7*s,6*s);c.lineTo(12*s,0);c.closePath();c.fill();c.stroke();c.strokeStyle=col;c.beginPath();c.moveTo(0,0);c.lineTo(0,-11*s);c.stroke();c.fillStyle=this.theme==='dark'?'#d4dcc1':'#f7f0da';c.beginPath();c.moveTo(1*s,-10*s);c.lineTo(8*s,-3*s);c.lineTo(1*s,-3*s);c.closePath();c.fill();if(this.selected.has(unit.id)){c.strokeStyle=col;c.beginPath();c.ellipse(0,2*s,16*s,12*s,0,0,Math.PI*2);c.stroke();}c.restore();return;}
    if(this.selected.has(unit.id)){c.strokeStyle=col;c.lineWidth=1.5*s;c.beginPath();c.ellipse(0,2*s,radius+5*s,radius+4*s,0,0,Math.PI*2);c.stroke();}
    c.fillStyle=col;c.beginPath();if(unit.type==='cavalry'||(unit.type==='unique'&&['han','tang','yuan'].includes(this.snapshot?.players.find(p=>p.id===unit.owner)?.faction))){c.moveTo(0,-radius);c.lineTo(radius,0);c.lineTo(0,radius);c.lineTo(-radius,0);c.closePath();}else if(unit.type==='siege'){c.rect(-radius,-radius*.7,radius*2,radius*1.4);}else{c.arc(0,0,radius,0,Math.PI*2);}c.fill();
    c.strokeStyle=this.theme==='dark'?'#b7c69e':'#f1efdf';c.lineWidth=s;c.stroke();c.fillStyle='#fcf7e6';c.textAlign='center';c.textBaseline='middle';c.font=`${hero?'600 ':''}${(hero?10:8)*s}px sans-serif`;c.fillText((this.lang()==='en'?english:GLYPHS)[unit.type]||'卫',0,.5*s);c.textBaseline='alphabetic';
    if(hero){c.strokeStyle='#bea366';c.lineWidth=1.5*s;c.beginPath();c.arc(0,0,radius+2.5*s,0,Math.PI*2);c.stroke();}
    if(this.selected.has(unit.id)||hero||unit.hp<unit.maxHp)this.hp(0,radius+5*s,unit.hp,unit.maxHp,hero?26:18);
    if(hero||this.selected.has(unit.id)){const player=this.snapshot?.players.find(p=>p.id===unit.owner),f=FACTIONS[player?.faction];const name=hero?this.label(f?.hero):unit.type==='unique'?this.label(f?.unique):this.label(UNITS[unit.type]);c.fillStyle=this.theme==='dark'?'#dfe5d2':'#344c38';c.font=`${8*s}px sans-serif`;c.fillText(name,0,-radius-7*s);}
    c.restore();
  }
  drawFog() {
    if(!this.snapshot?.visibility||!this.playerId)return;
    if(!this.fog){this.fog=document.createElement('canvas');this.fog.width=WORLD.width;this.fog.height=WORLD.height;}
    if(this.fogDirty){const f=this.fog.getContext('2d');f.clearRect(0,0,WORLD.width,WORLD.height);f.globalCompositeOperation='source-over';f.fillStyle=this.theme==='dark'?'#07150ac9':'#b0b49b8c';f.fillRect(0,0,WORLD.width,WORLD.height);f.globalCompositeOperation='destination-out';
      for(const v of this.snapshot.visibility){const r=v.r||v.radius||180;const g=f.createRadialGradient(v.x,v.y,r*.65,v.x,v.y,r);g.addColorStop(0,'#000');g.addColorStop(.8,'#000');g.addColorStop(1,'#0000');f.fillStyle=g;f.beginPath();f.arc(v.x,v.y,r,0,Math.PI*2);f.fill();}
      f.globalCompositeOperation='source-over';this.fogDirty=false;}
    this.ctx.drawImage(this.fog,0,0);
  }
  drawMinimap() {
    const c=this.ctx,w=Math.min(150,this.width*.23),h=w/WORLD.width*WORLD.height,x=14,y=this.height-h-43;this.minimap={x,y,w,h};
    c.save();c.fillStyle=this.theme==='dark'?'#1c2d24eb':'#f3f0e5eb';c.strokeStyle=this.theme==='dark'?'#758363':'#a6b391';c.lineWidth=1;c.fillRect(x-4,y-4,w+8,h+8);c.strokeRect(x-4,y-4,w+8,h+8);c.globalAlpha=.65;c.drawImage(this.terrain,x,y,w,h);c.globalAlpha=1;
    for(const city of this.snapshot?.cities||WORLD.cities){c.fillStyle=this.color(city.owner);const px=x+city.x/WORLD.width*w,py=y+city.y/WORLD.height*h;c.fillRect(px-2,py-2,city.kind==='capital'?5:3,city.kind==='capital'?5:3);}
    for(const b of this.snapshot?.buildings||[]){if(b.type!=='base')continue;c.strokeStyle=this.color(b.owner);c.lineWidth=1.5;c.strokeRect(x+b.x/WORLD.width*w-3,y+b.y/WORLD.height*h-3,6,6);}
    for(const u of this.snapshot?.units||[]){c.fillStyle=this.color(u.owner);c.fillRect(x+u.x/WORLD.width*w,y+u.y/WORLD.height*h,1.8,1.8);}
    const a=this.world({x:0,y:0}),b=this.world({x:this.width,y:this.height});c.strokeStyle=this.theme==='dark'?'#d6d7b6':'#526747';c.lineWidth=.8;c.strokeRect(x+clamp(a.x,0,1600)/1600*w,y+clamp(a.y,0,1000)/1000*h,(clamp(b.x,0,1600)-clamp(a.x,0,1600))/1600*w,(clamp(b.y,0,1000)-clamp(a.y,0,1000))/1000*h);c.restore();
  }
  draw(now) {
    const c=this.ctx,delta=Math.min((now-(this.lastTime||now))/1000,.05);this.lastTime=now;this.scale=this.fit*this.camera.zoom;
    const speed=450/this.camera.zoom;if(!['select','pinch'].includes(this.drag?.mode)){this.camera.x+=((this.keys.has('ArrowRight')?1:0)-(this.keys.has('ArrowLeft')?1:0))*speed*delta;this.camera.y+=((this.keys.has('ArrowDown')?1:0)-(this.keys.has('ArrowUp')?1:0))*speed*delta;}
    if(!this.drag&&!this.reducedMotion){this.camera.x+=this.panVelocity.x*delta*1000;this.camera.y+=this.panVelocity.y*delta*1000;const decay=Math.exp(-delta*18);this.panVelocity.x*=decay;this.panVelocity.y*=decay;if(Math.hypot(this.panVelocity.x,this.panVelocity.y)<.002)this.panVelocity={x:0,y:0};}this.constrainCamera();
    this.updateNavigationButton();
    c.setTransform(this.dpr,0,0,this.dpr,0,0);c.clearRect(0,0,this.width,this.height);c.fillStyle=this.theme==='dark'?'#293a2e':'#e7e4d6';c.fillRect(0,0,this.width,this.height);c.save();c.translate(this.width/2,this.height/2);c.scale(this.scale,this.scale);c.translate(-this.camera.x,-this.camera.y);if(this.landPath&&this.camera.zoom>1.8)this.drawDetailTerrain();else c.drawImage(this.terrain,0,0);
    this.drawTerritories();this.drawShippingLanes();this.drawFog();this.drawTerritories(true);this.drawCities();for(const b of this.snapshot?.buildings||[])if(this.isVisible(b))this.drawBuilding(b);for(const u of this.snapshot?.units||[])if(this.isVisible(u))this.drawUnit(u,now);
    if(!this.snapshot){for(let i=0;i<4;i++){const p=WORLD.spawns[i];this.drawBuilding({id:`preview-${i}`,owner:null,type:'base',x:p.x,y:p.y,hp:2400,maxHp:2400});} }
    const s=1/this.scale;for(const order of this.orders){if(order.until<now)continue;const p=(order.until-now)/900;c.strokeStyle=order.attack?'#aa563d':'#416d43';c.globalAlpha=this.reducedMotion?1:p;c.lineWidth=1.5*s;c.beginPath();c.arc(order.x,order.y,(this.reducedMotion?10:5+(1-p)*14)*s,0,Math.PI*2);c.stroke();}c.globalAlpha=1;this.orders=this.orders.filter(o=>o.until>now);
    if(this.placement&&this.pointer){const p=this.world(this.pointer);c.strokeStyle='#9f8248';c.fillStyle='#b199591f';c.setLineDash([4*s,4*s]);c.lineWidth=1.2*s;c.beginPath();c.arc(p.x,p.y,25*s,0,Math.PI*2);c.fill();c.stroke();c.setLineDash([]);}
    for(const effect of this.effects){if(effect.end<now)continue;const progress=(effect.end-now)/(effect.kind==='shot'?300:450);c.globalAlpha=progress;c.lineWidth=1.5*s;if(effect.kind==='shot'){c.strokeStyle=effect.color||'#99683b';c.beginPath();const travel=1-progress;c.moveTo(effect.x+(effect.toX-effect.x)*Math.max(0,travel-.15),effect.y+(effect.toY-effect.y)*Math.max(0,travel-.15));c.lineTo(effect.x+(effect.toX-effect.x)*travel,effect.y+(effect.toY-effect.y)*travel);c.stroke();}else{c.strokeStyle='#b96745';c.beginPath();c.arc(effect.x,effect.y,(4+(1-progress)*8)*s,0,Math.PI*2);c.stroke();}}c.globalAlpha=1;this.effects=this.effects.filter(e=>e.end>now);
    c.restore();
    if(this.drag?.mode==='select'){const a=this.drag.start,b=this.drag.last;c.fillStyle='#456b4422';c.strokeStyle='#456b44';c.lineWidth=1;c.fillRect(a.x,a.y,b.x-a.x,b.y-a.y);c.strokeRect(a.x,a.y,b.x-a.x,b.y-a.y);}
    this.drawMinimap();if(this.zoomLabel&&this.lastZoom!==this.camera.zoom){this.lastZoom=this.camera.zoom;this.zoomLabel.textContent=`${Math.round(this.camera.zoom*100)}%`;}this.frame=requestAnimationFrame(t=>this.draw(t));
  }
  destroy() { cancelAnimationFrame(this.frame);this.clearGesture();this.observer.disconnect();this.themeObserver.disconnect();this.gestureObserver.disconnect();if(this.motionQuery.removeEventListener)this.motionQuery.removeEventListener('change',this.motionChangeHandler);else this.motionQuery.removeListener?.(this.motionChangeHandler);for(const [event,key]of[['pointerdown','down'],['pointermove','move'],['pointerup','up'],['pointercancel','cancel'],['lostpointercapture','cancel'],['contextmenu','context'],['wheel','wheel'],['dblclick','double']])this.canvas.removeEventListener(event,this.handlers[key]);this.navigationButton?.removeEventListener('click',this.handlers.mode);window.removeEventListener('keydown',this.handlers.keydown);window.removeEventListener('keyup',this.handlers.keyup);window.removeEventListener('blur',this.handlers.blur); }
}
