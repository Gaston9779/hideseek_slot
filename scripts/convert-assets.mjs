import { chromium } from 'playwright';import {writeFileSync,mkdirSync} from 'node:fs';
const browser=await chromium.launch({executablePath:'/Applications/Google Chrome.app/Contents/MacOS/Google Chrome',headless:true,args:['--no-sandbox']});
const page=await browser.newPage();await page.route('**/@vite/client',route=>route.fulfill({contentType:'application/javascript',body:''}));page.on('console',m=>console.log(m.type(),m.text()));await page.goto('http://127.0.0.1:5173/scripts/convert.html',{waitUntil:'networkidle'});
const inventory=[];mkdirSync('public/assets/scenery',{recursive:true});
for(const name of ['gothic_mausoleum','gargoyle_3d_model','catgoyle_3d_model','Skull_Horned_Creature_Rigged']){try{const r=await page.evaluate(async name=>{const {convert}=await import('/scripts/asset-converter.ts');return convert(name);},name);inventory.push(r.audit);writeFileSync(`public/assets/scenery/${name}.glb`,Buffer.from(r.data));console.log(JSON.stringify(r.audit));}catch(e){inventory.push({name,error:e.message});console.error(e.message);}}
writeFileSync('05-docs/converted-assets.json',JSON.stringify(inventory,null,2));await browser.close();
