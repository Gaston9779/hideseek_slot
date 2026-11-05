export interface Rng { next(): number }
export class SeededRng implements Rng { constructor(private state=1) {} next(){ this.state = (this.state * 1664525 + 1013904223) >>> 0; return this.state / 4294967296; } }
export class CryptoRng implements Rng { next(){ const a=new Uint32Array(1); crypto.getRandomValues(a); return a[0]! / 4294967296; } }
