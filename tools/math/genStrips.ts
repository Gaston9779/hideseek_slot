/** Deterministic strip layout generator (design aid, NOT used at runtime). Output is pasted/committed as literal arrays in src/math/v2/strips.ts. */
export const ORDER=['SKULL','BLASTER','GARGOYLE','MAUSOLEUM','CHEST','LANTERN','GHOST','TOMB','KEY','POTION','WILD','SCATTER'] as const;
export function spread(counts:number[],reelIdx:number):string[]{
 const L=counts.reduce((a,b)=>a+b,0);const items:{pos:number,s:string,i:number}[]=[];
 counts.forEach((c,i)=>{for(let k=0;k<c;k++)items.push({pos:((k+.5)*L/c+(i*7+reelIdx*5)*L/97)%L,s:ORDER[i],i});});
 items.sort((a,b)=>a.pos-b.pos||a.i-b.i);const out:(string|null)[]=Array(L).fill(null);
 for(const it of items){let p=Math.round(it.pos)%L;for(let d=0;d<L;d++){const c=[(p+d)%L,(p-d+L)%L];const f=c.find(x=>out[x]===null&&out[(x+1)%L]!==it.s&&out[(x-1+L)%L]!==it.s)??c.find(x=>out[x]===null);if(f!==undefined){out[f]=it.s;break;}}}
 return out as string[];
}
