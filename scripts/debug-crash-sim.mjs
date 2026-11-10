// Verifies the ?debugMobile=1 breadcrumb recovery: crash the renderer process mid-SPIN (CDP Page.crash), then load the game again
// in the same browser context and read the previous-session verdict. usage: node scripts/debug-crash-sim.mjs [url]
import {chromium,devices} from 'playwright';
const url=(process.argv[2]??'http://localhost:4180/')+'?debugMobile=1';const dev={...devices['iPhone 13']};delete dev.defaultBrowserType;
const b=await chromium.launch({args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']});const ctx=await b.newContext(dev);
const p1=await ctx.newPage();await p1.goto(url);await p1.waitForSelector('body[data-ready="true"]',{timeout:60000});
await p1.tap('#spin');await p1.waitForFunction(()=>document.querySelector('#spin').classList.contains('busy'));await p1.waitForTimeout(1500);   // breadcrumbs are flushed on spin:start/end and every 1 s
const cdp=await ctx.newCDPSession(p1);void cdp.send('Page.crash').catch(()=>{});await new Promise(r=>setTimeout(r,1500));p1.close({runBeforeUnload:false}).catch(()=>{});await new Promise(r=>setTimeout(r,500));
setTimeout(()=>{console.log('TIMEOUT');process.exit(2);},90000);const p2=await ctx.newPage();await p2.goto(url);await p2.waitForSelector('body[data-ready="true"]',{timeout:60000});
const out=await p2.evaluate(()=>({overlay:document.querySelector('#mobile-debug-prev')?.textContent,last:JSON.parse(localStorage.getItem('skull-hunt-mobile-debug:v2')).slice(-2,-1)[0].entries.slice(-4).map(e=>e.event)}));
console.log(JSON.stringify(out,null,1));await b.close();process.exit(/WITHOUT pagehide/.test(out.overlay)?0:1);
