// Recognisable channel marks drawn as vector badges; no account or platform API calls.
export const CHANNEL_MARKS=[{id:'linkedin',name:'LinkedIn',color:'#0a66c2'},{id:'amazon',name:'Amazon',color:'#273545'},{id:'shopee',name:'Shopee',color:'#ee4d2d'},{id:'lazada',name:'Lazada',color:'#4033af'}];
export function drawChannelBadge(c,mark){
 c.fillStyle='#f6f8fa';c.fillRect(0,0,512,320);const x=200,y=40;c.fillStyle=mark.color;
 if(mark.id==='linkedin'){c.fillRect(x,y,112,112);c.fillStyle='#fff';c.font='bold 95px sans-serif';c.fillText('in',x+12,y+91);}
 if(mark.id==='amazon'){c.fillStyle='#273545';c.font='bold 138px sans-serif';c.fillText('a',x+13,y+112);c.strokeStyle='#ef9d34';c.lineWidth=9;c.beginPath();c.moveTo(x+2,y+118);c.bezierCurveTo(x+35,y+141,x+87,y+136,x+118,y+112);c.stroke();c.beginPath();c.moveTo(x+95,y+111);c.lineTo(x+120,y+110);c.lineTo(x+115,y+132);c.stroke();}
 if(mark.id==='shopee'){c.fillRect(x+8,y+25,104,108);c.lineWidth=7;c.strokeStyle=mark.color;c.beginPath();c.arc(x+60,y+27,26,Math.PI,0);c.stroke();c.fillStyle='#fff';c.font='75px sans-serif';c.fillText('S',x+34,y+112);}
 if(mark.id==='lazada'){const points=[[x+60,y],[x+119,y+33],[x+119,y+107],[x+60,y+143],[x,y+107],[x,y+33]];c.fillStyle='#ed6893';c.beginPath();points.forEach(([a,b],i)=>i?c.lineTo(a,b):c.moveTo(a,b));c.closePath();c.fill();c.fillStyle='#f79548';c.beginPath();c.moveTo(x,y+33);c.lineTo(x+60,y+67);c.lineTo(x+60,y+143);c.lineTo(x,y+107);c.closePath();c.fill();c.fillStyle='#fff';c.font='bold 89px sans-serif';c.fillText('L',x+37,y+114);}
 c.fillStyle=mark.color;c.font='600 45px sans-serif';c.textAlign='center';c.fillText(mark.name,256,253);c.textAlign='left';
}
