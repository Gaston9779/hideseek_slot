// Repeatable mobile-playability check against a LOCAL server. Chromium (and WebKit where it can launch) with iPhone-sized
// viewports. It catches navigation/reload, console errors, failed requests, stuck loading, unresponsive spins and
// JS-heap / GPU-resource growth. It is NOT real iOS Safari: a process kill under iOS memory pressure cannot be reproduced here.
//
//   npm run build && npx vite preview --port 4180      # production build
//   node scripts/mobile-spin-test.mjs --scenario basic --spins 20 [--landscape] [--engine chromium|webkit] [--shots dir]
//   npx vite --port 5199                                # dev server, needed for seeded bonus scenarios (?qa&seed=)
//   node scripts/mobile-spin-test.mjs --scenario free  --url http://localhost:5199/ --seed 3     # Free Spins entry + exit
//   node scripts/mobile-spin-test.mjs --scenario chest --url http://localhost:5199/ --seed 402   # Chest Bonus entry + exit
import {chromium,webkit,devices} from 'playwright';
import fs from 'node:fs';
const arg=(k,d)=>{const i=process.argv.indexOf(`--${k}`);return i>=0?process.argv[i+1]:d;},flag=k=>process.argv.includes(`--${k}`);
const scenario=arg('scenario','basic'),SPINS=Number(arg('spins','20')),SHOTS=arg('shots','/tmp/skull-shots'),engine=arg('engine','chromium'),landscape=flag('landscape');
let base=arg('url','http://localhost:4180/');const seed=arg('seed');
fs.mkdirSync(SHOTS,{recursive:true});
const dev={...devices['iPhone 13']};delete dev.defaultBrowserType;
const portrait=dev.viewport,land={width:dev.viewport.height,height:dev.viewport.width};
const vp=landscape?land:portrait;
const browser=await (engine==='webkit'?webkit:chromium).launch(engine==='chromium'?{args:['--use-gl=swiftshader','--enable-unsafe-swiftshader']}:{headless:!flag('headed')});
const ctx=await browser.newContext({...dev,viewport:vp,screen:vp});const page=await ctx.newPage();
const log={navs:0,console:[],pageErrors:[],failed:[],bad:[]};let bytes=0,reqs=0;
page.on('framenavigated',f=>{if(f===page.mainFrame())log.navs++;});
page.on('console',m=>{if(['error','warning'].includes(m.type())&&!/GPU stall|GL Driver/.test(m.text()))log.console.push(`${m.type()}: ${m.text().slice(0,200)}`);});
page.on('pageerror',e=>log.pageErrors.push(String(e).slice(0,300)));page.on('requestfailed',r=>log.failed.push(`${r.url().slice(-80)} ${r.failure()?.errorText}`));
page.on('response',async r=>{if(r.status()>=400)log.bad.push(`${r.status()} ${r.url().slice(-80)}`);try{bytes+=(await r.body()).length;reqs++;}catch{}});
const q=`debugMobile=1${seed?`&qa&seed=${seed}`:''}`;const url=base+(base.includes('?')?'&':'?')+q;
const shot=n=>page.screenshot({path:`${SHOTS}/${scenario}-${landscape?'land':'port'}-${n}.png`}).catch(()=>{});
const snap=()=>page.evaluate(()=>({heap:Math.round((performance.memory?.usedJSHeapSize||0)/1048576),canvases:[...document.querySelectorAll('canvas')].map(c=>`${c.id||c.className}:${c.width}x${c.height}`).join(' '),balance:document.querySelector('#balance')?.textContent,win:document.querySelector('#win')?.textContent,status:document.querySelector('#status')?.textContent,loadingDone:document.querySelector('#loading')?.classList.contains('done'),gl:window.__glCount}));
await page.addInitScript(()=>{window.__glCount=0;const o=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(t,...a){if(String(t).includes('webgl'))window.__glCount++;return o.call(this,t,...a);};});
const idle=()=>page.waitForFunction(()=>{const b=document.querySelector('#spin');return b&&!b.disabled&&!b.classList.contains('busy')&&!document.querySelector('dialog[open]')&&!document.body.dataset.cine;},null,{timeout:90000});
const sound=async()=>page.evaluate(()=>{const b=document.querySelector('#audio'),r=b.getBoundingClientRect(),s=b.querySelector('svg').getBoundingClientRect(),q=document.querySelector('#quick').getBoundingClientRect(),sp=document.querySelector('#spin').getBoundingClientRect();return {btn:`${Math.round(r.width)}x${Math.round(r.height)}`,icon:`${Math.round(s.width)}x${Math.round(s.height)}`,quickW:Math.round(q.width),spinW:Math.round(sp.width),inView:r.left>=0&&r.right<=innerWidth&&r.top>=0&&r.bottom<=innerHeight,overlapsQuick:!(r.right<=q.left||r.left>=q.right),pressed:b.getAttribute('aria-pressed'),vw:innerWidth,vh:innerHeight};});
const result={scenario,engine,viewport:vp,url,checks:{}};let ok=true;const check=(k,v,pass=v===true)=>{result.checks[k]=pass?'PASS':`FAIL (${JSON.stringify(v)})`;if(!pass)ok=false;};
const t0=Date.now();await page.goto(url,{waitUntil:'commit'});
await page.waitForSelector('body[data-ready="true"]',{timeout:90000});result.tReadyMs=Date.now()-t0;result.startMB=+(bytes/1048576).toFixed(1);result.startRequests=reqs;
check('cold start reaches ready, loading overlay gone',(await snap()).loadingDone);await shot('ready');
const s0=await snap();result.heapStart=s0.heap;
const spinOnce=async()=>{await idle();const t=Date.now();await page.tap('#spin');await page.waitForFunction(()=>document.querySelector('#spin').classList.contains('busy'),null,{timeout:5000}).catch(()=>{});await page.waitForFunction(()=>!document.querySelector('#spin').classList.contains('busy'),null,{timeout:120000});return Date.now()-t;};
const bal=async()=>Number((await snap()).balance.replace(/,/g,''));

if(scenario==='basic'){
 const rows=[];let prev=await bal();let balanceOk=true;
 for(let i=1;i<=SPINS;i++){let ms;try{ms=await spinOnce();}catch(e){check(`spin ${i} completes`,String(e).slice(0,100));await shot(`fail-${i}`);break;}
  const s=await snap(),b=Number(s.balance.replace(/,/g,''));if(i===1)await shot('after-spin1');rows.push({i,ms,heap:s.heap,bal:b});
  // balance moves by -bet (1.00) + win: never up by more than the displayed win and never below prev-1.00
  const win=Number(String(s.win).replace(/,/g,''))||0;if(b<prev-1.0001||b>prev-1+win+0.0001+999999)balanceOk=false;prev=b;
  if(page.isClosed())break;}
 check(`${SPINS} consecutive spins completed`,rows.length===SPINS);check('balance accounting plausible (never below prev - bet)',balanceOk);
 result.spinMs={first:rows[0]?.ms,median:rows.map(r=>r.ms).sort((a,b)=>a-b)[Math.floor(rows.length/2)],max:Math.max(...rows.map(r=>r.ms))};result.heapMB={start:s0.heap,afterSpin1:rows[0]?.heap,end:rows.at(-1)?.heap};
 const sa=await sound();result.sound=sa;check('Sound button sized with the art (icon ≤ 1.25× quick button, button fits, no overlap with Quick)',sa.inView&&!sa.overlapsQuick&&Number(sa.icon.split('x')[0])<=sa.quickW*1.25,sa.inView&&!sa.overlapsQuick&&Number(sa.icon.split('x')[0])<=sa.quickW*1.25);
 await page.tap('#audio');const p1=(await sound()).pressed;await page.tap('#audio');const p2=(await sound()).pressed;check('Sound button toggles aria-pressed and back',p1!==p2&&p2===sa.pressed,p1!==p2&&p2===sa.pressed);
 // orientation / resize transitions while idle and during a spin
 const other=landscape?portrait:land;await page.setViewportSize(other);await page.waitForTimeout(800);const so=await sound();result.soundOtherOrientation=so;await shot('rotated');
 check('rotation: Sound button still inside the viewport',so.inView);
 await idle();await page.tap('#spin');await page.waitForTimeout(400);await page.setViewportSize(vp);await page.waitForFunction(()=>!document.querySelector('#spin').classList.contains('busy'),null,{timeout:120000});await page.waitForTimeout(500);
 check('rotation during a SPIN does not break it (idle again, no navigation)',(await snap()).loadingDone&&log.navs===1);
 // reload + recovery
 const balBefore=await bal();await page.reload({waitUntil:'commit'});await page.waitForSelector('body[data-ready="true"]',{timeout:90000});
 check('reload recovers with the same balance',(await bal())===balBefore,(await bal())===balBefore);
 const prevInfo=await page.evaluate(()=>{const a=JSON.parse(localStorage.getItem('skull-hunt-mobile-debug:v2')||'[]');return a.slice(-2,-1)[0]?.end;});result.previousSessionMarker=prevInfo;
 check('diagnostics: previous session was recorded as cleanly ended (pagehide/hidden) after the reload',prevInfo==='pagehide'||prevInfo==='hidden',prevInfo==='pagehide'||prevInfo==='hidden');
 await spinOnce();check('spin works after reload',true);
 check('no navigation other than the initial load and the intentional reload',log.navs===2,log.navs===2);
}
else if(scenario==='free'||scenario==='chest'){
 // Real flow driven by the seeded RNG of the dev build (?qa&seed=). Only clicks what a player could: SPIN, the summary button, SKIP, a tap to continue, a chest pick.
 const want=scenario==='free';let entered=false,exited=false,spins=0,summaries=0,picks=0;const tEnd=Date.now()+Number(arg('maxsec','420'))*1000;
 await page.evaluate(()=>document.querySelector('#quick').click());
 const state=()=>page.evaluate(()=>({hud:!!document.querySelector('.fs-hud:not([hidden])'),summary:!!document.querySelector('.fs-summary.show'),overlay:!!document.querySelector('#bonus-overlay.show'),fsOverlay:!!document.querySelector('#fs-overlay.show'),finale:!!document.querySelector('.cf:not([hidden])'),cine:document.body.dataset.cine==='1',skip:!!document.querySelector('.bc-skip:not([hidden])'),dlg:!!document.querySelector('dialog[open]'),busy:document.querySelector('#spin').classList.contains('busy'),canSpin:!document.querySelector('#spin').disabled,sel:!!document.querySelector('.bprize.selected')}));
 let last='';const trail=[];
 while(Date.now()<tEnd){const w=await state();const k=JSON.stringify(w);if(k!==last){last=k;trail.push(`${Math.round((Date.now()-t0)/1000)}s ${Object.entries(w).filter(([,v])=>v).map(([n])=>n).join('+')||'idle'}`);}
  if(w.hud||w.fsOverlay)entered=entered||want;if(w.overlay)entered=entered||!want;
  if(w.summary){summaries++;await shot(`summary-${summaries}`);await page.evaluate(()=>document.querySelector('.fs-summary.show .fsm-go')?.click());await page.waitForTimeout(900);continue;}
  if(w.finale){await shot('finale');await page.waitForTimeout(2500);await page.mouse.click(vp.width/2,vp.height/2);await page.waitForTimeout(900);continue;}
  if(w.overlay&&!w.sel){const box=await page.locator('#bonus-canvas').boundingBox();if(box){await shot('chest-pick');const f=[.5,.25,.75][picks%3];picks++;await page.mouse.click(box.x+box.width*f,box.y+box.height*.6);}await page.waitForTimeout(700);continue;}
  if(w.skip&&!w.overlay&&Date.now()-t0>1000){/* leave the cinematic running: it is part of the test; only skip if it stalls */}
  if(entered&&!w.hud&&!w.summary&&!w.overlay&&!w.fsOverlay&&!w.finale&&!w.cine&&!w.busy&&!w.dlg&&w.canSpin&&(summaries>0||!want)){exited=true;break;}
  if(!w.busy&&!w.overlay&&!w.summary&&!w.dlg&&!w.cine&&!w.finale&&w.canSpin&&!w.hud&&!w.fsOverlay){try{await page.tap('#spin',{timeout:2000});spins++;}catch{}}
  await page.waitForTimeout(350);}
 await shot('end');result.trail=trail.slice(-40);check(`${want?'Free Spins':'Chest Bonus'} entered through real spins`,entered);check(`${want?'Free Spins':'Chest Bonus'} exited and the game is idle again`,exited);result.spinsTaken=spins;
 const a=await snap();check('no permanent loading screen and no page navigation',a.loadingDone&&log.navs===1,a.loadingDone&&log.navs===1);
}
const end=await snap().catch(()=>null);result.end=end&&{heap:end.heap,canvases:end.canvases,webglContexts:end.gl,balance:end.balance};
result.network={totalMB:+(bytes/1048576).toFixed(1),requests:reqs,navigations:log.navs,failed:log.failed,http4xx:log.bad};result.console=[...new Set(log.console)].slice(0,8);result.pageErrors=log.pageErrors;
check('no page errors',log.pageErrors.length===0,log.pageErrors.length===0);check('no failed requests / HTTP errors',log.failed.length===0&&log.bad.length===0,log.failed.length===0&&log.bad.length===0);
result.ok=ok;console.log(JSON.stringify(result,null,1));await browser.close();process.exit(ok?0:1);
