/** Development-only startup trace. It is deliberately local: no player data leaves the device. */
export function createStartupTrace(enabled=import.meta.env.DEV){
 const t0=performance.now();const stages:{name:string;ms:number}[]=[];
 const mark=(name:string)=>{const ms=Math.round(performance.now()-t0);stages.push({name,ms});if(enabled){performance.mark(`skull-hunt:${name}`);console.info(`[startup] ${name} ${ms}ms`);}};
 const expose=()=>{if(enabled)(window as Window&{__skullStartup?:typeof stages}).__skullStartup=stages;};
 return {mark,expose,get stages(){return [...stages];}};
}
