/** Small canvas particle system (additive glow sprites). Pre-rendered tinted sprites keep it cheap. */
const sprites=new Map<string,HTMLCanvasElement>();
function sprite(color:string,star:boolean){const key=color+star;let c=sprites.get(key);if(c)return c;c=document.createElement('canvas');c.width=c.height=64;const g=c.getContext('2d')!;const r=g.createRadialGradient(32,32,0,32,32,32);r.addColorStop(0,'#fff');r.addColorStop(.25,color);r.addColorStop(1,color+'00');g.fillStyle=r;g.fillRect(0,0,64,64);if(star){g.fillStyle='#fff';g.globalAlpha=.95;g.beginPath();g.moveTo(32,2);g.quadraticCurveTo(34,30,62,32);g.quadraticCurveTo(34,34,32,62);g.quadraticCurveTo(30,34,2,32);g.quadraticCurveTo(30,30,32,2);g.fill();}sprites.set(key,c);return c;}
interface P{x:number,y:number,vx:number,vy:number,life:number,max:number,size:number,color:string,star:boolean,g:number}
export class Particles{
 private list:P[]=[];constructor(private cap=260){}
 emit(x:number,y:number,color:string,n:number,speed=160,size=26,opt:{up?:number,gravity?:number,star?:boolean,spread?:number}={}){for(let i=0;i<n;i++){if(this.list.length>=this.cap)this.list.shift();const life=.55+Math.random()*.6,a=Math.random()*Math.PI*2,v=speed*(.35+Math.random()*.9)*(opt.spread??1);this.list.push({x:x+(Math.random()-.5)*14,y:y+(Math.random()-.5)*14,vx:Math.cos(a)*v,vy:Math.sin(a)*v-(opt.up??0),life,max:life,size:size*(.5+Math.random()*.9),color,star:opt.star??Math.random()<.55,g:opt.gravity??140});}}
 update(dt:number){for(const p of this.list){p.life-=dt;p.x+=p.vx*dt;p.y+=p.vy*dt;p.vy+=p.g*dt;}this.list=this.list.filter(p=>p.life>0);}
 draw(ctx:CanvasRenderingContext2D){if(!this.list.length)return;ctx.save();ctx.globalCompositeOperation='lighter';for(const p of this.list){const k=p.life/p.max;ctx.globalAlpha=Math.min(1,k*1.5);const s=p.size*(.4+k*.8);ctx.drawImage(sprite(p.color,p.star),p.x-s/2,p.y-s/2,s,s);}ctx.restore();}
 get count(){return this.list.length;}
 clear(){this.list=[];}
}
