import * as THREE from 'three/webgpu';
import { uniform, texture, vec2, positionWorld, atan, fract } from 'three/tsl';
import { intensityAt, photometricBasis, rotate } from '../../shared/photometry';
import type { Fixture, Product } from '../../shared/types';

export function cctColor(kelvin:number){
  const t=kelvin/100;
  const red=t<=66?255:329.698727446*Math.pow(t-60,-.1332047592);
  const green=t<=66?99.4708025861*Math.log(t)-161.1195681661:288.1221695283*Math.pow(t-60,-.0755148492);
  const blue=t>=66?255:t<=19?0:138.5177312231*Math.log(t-10)-305.0447927307;
  return new THREE.Color().setRGB(...[red,green,blue].map(v=>Math.max(0,Math.min(255,v))/255) as [number,number,number],THREE.SRGBColorSpace);
}
export class FullIESLight extends THREE.SpotLight {
  static profiles=new Map<string,{map:THREE.DataTexture;refs:number}>();
  profileKey:string;
  profile:THREE.DataTexture;
  axisX=new THREE.Vector3(1,0,0);axisY=new THREE.Vector3(0,0,1);axisZ=new THREE.Vector3(0,-1,0);
  constructor(p:Product){
    super(0xffffff,1,0,Math.PI/2,.05,2);
    this.profileKey=`${p.id}@${p.version}`;
    const cached=FullIESLight.profiles.get(this.profileKey);
    if(cached){cached.refs++;this.profile=cached.map;return;}
    const width=181,height=360,data=new Uint16Array(width*height),d=p.photometry!;
    for(let c=0;c<height;c++)for(let g=0;g<width;g++)data[c*width+g]=THREE.DataUtils.toHalfFloat(d.peak?intensityAt(d,g,c)/d.peak:0);
    this.profile=new THREE.DataTexture(data,width,height,THREE.RedFormat,THREE.HalfFloatType);
    this.profile.minFilter=THREE.LinearFilter;this.profile.magFilter=THREE.LinearFilter;this.profile.wrapT=THREE.RepeatWrapping;this.profile.needsUpdate=true;
    FullIESLight.profiles.set(this.profileKey,{map:this.profile,refs:1});
  }
  configure(f:Fixture,p:Product,maintenance:number){
    this.intensity=(p.photometry?.peak||0)*f.level/100*maintenance;
    this.color.copy(cctColor(f.cct));
    const basis=photometricBasis(p.calibration.direction,p.calibration.c0).map(v=>rotate(v,f.rotation));
    this.axisX.set(...basis[0]);this.axisY.set(...basis[1]);this.axisZ.set(...basis[2]);
    this.target.position.copy(this.position).add(this.axisZ);
  }
  release(){const p=FullIESLight.profiles.get(this.profileKey);if(p&&--p.refs===0){p.map.dispose();FullIESLight.profiles.delete(this.profileKey);}this.dispose();}
}
// Three's built-in IES node reads a single C-plane. This node samples both
// angular dimensions using the same basis and intensity table as the lux engine.
export class FullIESLightNode extends THREE.SpotLightNode {
  declare light:FullIESLight;
  px:any;py:any;pz:any;pos:any;
  constructor(light:FullIESLight){super(light);this.px=uniform(light.axisX);this.py=uniform(light.axisY);this.pz=uniform(light.axisZ);this.pos=uniform(light.position);}
  getSpotAttenuation(_builder:any,_angle:any):any {
    const light=this.light as FullIESLight;
    const ray=positionWorld.sub(this.pos).normalize();
    const gamma=ray.dot(this.pz).clamp(-1,1).acos().div(Math.PI);
    const c=fract(atan(ray.dot(this.py),ray.dot(this.px)).div(2*Math.PI).add(1));
    return texture(light.profile,vec2(gamma.mul(180/181).add(.5/181),c.add(.5/360))).r;
  }
}
