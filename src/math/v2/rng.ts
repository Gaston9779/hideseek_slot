/** RNG abstraction. Game logic only calls int(n): uniform integer in [0,n) with rejection sampling (no modulo bias). Nothing adaptive: no history is ever passed in. */
export interface Rng{int(n:number):number}
export class SeededRng implements Rng{
 private a:number;private b:number;private c:number;private d:number;
 /** sfc32 seeded through splitmix32 — reproducible simulation PRNG (NOT for production play). */
 constructor(seed:number=1){let s=(seed>>>0)^0x9e3779b9;const sm=()=>{s=(s+0x9e3779b9)>>>0;let z=s;z=Math.imul(z^(z>>>16),0x85ebca6b);z=Math.imul(z^(z>>>13),0xc2b2ae35);return (z^(z>>>16))>>>0;};this.a=sm();this.b=sm();this.c=sm();this.d=sm();for(let i=0;i<12;i++)this.u32();}
 u32():number{const t=(((this.a+this.b)>>>0)+this.d)>>>0;this.d=(this.d+1)>>>0;this.a=this.b^(this.b>>>9);this.b=(this.c+(this.c<<3))>>>0;this.c=((this.c<<21)|(this.c>>>11))>>>0;this.c=(this.c+t)>>>0;return t;}
 int(n:number){if(!Number.isInteger(n)||n<=0||n>4294967296)throw new RangeError('int(n): n must be an integer in 1..2^32');const lim=4294967296-(4294967296%n);let x:number;do{x=this.u32();}while(x>=lim);return x%n;}
}
/** Production source: Web Crypto, same rejection sampling. */
export class CryptoRng implements Rng{
 private buf=new Uint32Array(64);private i=64;
 private u32(){if(this.i>=64){crypto.getRandomValues(this.buf);this.i=0;}return this.buf[this.i++]!;}
 int(n:number){if(!Number.isInteger(n)||n<=0||n>4294967296)throw new RangeError('int(n): n must be an integer in 1..2^32');const lim=4294967296-(4294967296%n);let x:number;do{x=this.u32();}while(x>=lim);return x%n;}
}
