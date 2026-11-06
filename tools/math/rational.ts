/** Minimal exact rational arithmetic on BigInt (no floating point inside the proof path). */
const gcd=(a:bigint,b:bigint):bigint=>{a=a<0n?-a:a;b=b<0n?-b:b;while(b){[a,b]=[b,a%b];}return a;};
export class Q{
 constructor(public n:bigint,public d:bigint=1n){if(d<0n){n=-n;d=-d;}const g=gcd(n,d)||1n;this.n=n/g;this.d=d/g;}
 static of(n:number|bigint,d:number|bigint=1){return new Q(BigInt(n),BigInt(d));}
 add(o:Q){return new Q(this.n*o.d+o.n*this.d,this.d*o.d);} mul(o:Q){return new Q(this.n*o.n,this.d*o.d);} sub(o:Q){return new Q(this.n*o.d-o.n*this.d,this.d*o.d);}
 div(o:Q){return new Q(this.n*o.d,this.d*o.n);}
 num(){const s=this.n<0n;let n=s?-this.n:this.n;const i=n/this.d;let r=n%this.d;let f=0;for(let k=0;k<15;k++){r*=10n;f=f*10+Number(r/this.d);r%=this.d;}return (s?-1:1)*(Number(i)+f/1e15);}
 toString(dp=10){const s=this.n<0n;const n=s?-this.n:this.n;const i=n/this.d;let r=n%this.d;let f='';for(let k=0;k<dp;k++){r*=10n;f+=String(r/this.d);r%=this.d;}return `${s?'-':''}${i}.${f}`;}
 frac(){return `${this.n}/${this.d}`;}
}
