import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const files={'/':'index.html','/index.html':'index.html','/storage.js':'storage.js','/sync.js':'sync.js','/app.js':'app.js','/sw.js':'sw.js','/manifest.webmanifest':'manifest.webmanifest','/icon.svg':'icon.svg','/icon-apple.png':'icon-apple.png'};
const store=new Map();let version=0;
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data))};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/.auth/me')return json(res,200,{clientPrincipal:{identityProvider:'github',userId:'test-user-1',userDetails:'QE Test',userRoles:['authenticated']}});
 if(url.pathname==='/api/workouts'&&req.method==='GET'){
  return json(res,200,{version:1,workouts:[...store].map(([id,v])=>({id,...v}))});
 }
 if(url.pathname.startsWith('/api/workouts/')&&['PUT','DELETE'].includes(req.method)){
  const id=decodeURIComponent(url.pathname.slice('/api/workouts/'.length));
  let raw='';for await(const p of req)raw+=p;
  const body=JSON.parse(raw),old=store.get(id);
  if((old?.etag||null)!==body.expectedEtag)return json(res,409,{error:'workout_changed'});
  if(req.method==='DELETE'){store.delete(id);return json(res,200,{ok:true,id,deleted:true});}
  const etag='"'+(++version)+'"';
  store.set(id,{kind:id.split(':')[0],record:structuredClone(body.record),etag});
  return json(res,200,{ok:true,id,etag});
 }
 const file=files[url.pathname];if(!file){res.writeHead(404);return res.end('Not Found');}
 const ext=path.extname(file);
 res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'})[ext]||'text/plain'});
 res.end(fs.readFileSync(file));
});
await new Promise(res=>server.listen(0,'127.0.0.1',res));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const errors=[];
const context=()=>browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
const input=pg=>pg.locator('.set-row input[data-type="work"][data-field="kg"]').first();
const pause=ms=>new Promise(r=>setTimeout(r,ms));
async function until(f,label){
 for(let i=0;i<120;i++){if(f())return;await pause(100)}
 throw Error('Timed out: '+label+' remote '+JSON.stringify([...store]).slice(0,400));
}
const log=x=>console.log('PASS:',x);
let first,second;
try{
 first=await context();const p1=await first.newPage();p1.on('pageerror',e=>errors.push(e.message));
 await p1.goto(url,{waitUntil:'domcontentloaded'});
 await p1.locator('[data-day="2"]').click();await p1.locator('[data-item="1"]').click();
 await input(p1).fill('42.5');
 await p1.locator('.set-row input[data-type="work"][data-field="reps"]').first().fill('13');
 await p1.locator('.done-button[data-type="work"]').first().click();
 await until(()=>JSON.stringify([...store]).includes('"kg":"42.5"'),'upload first workout');
 assert.equal(store.size,1,'Only one modified workout may be created; not the entire journal');
 assert.ok([...store.keys()][0].startsWith('draft:'));
 log('Azure receives one workout record with real changes and an ETag');

 second=await context();
 await second.addInitScript(()=>{
  // Simulate previous application visits that generated blank local templates.
  const d='2026-11-01',record={date:d,day:0,started:'2000-01-01T01:01:01Z',notes:'',coreEnabled:{},exercises:{}};
  localStorage.setItem('zenek-gym-v1',JSON.stringify({version:2,sessions:{[d+'-0']:record},history:[],savedAt:42}));
 });
 const p2=await second.newPage();p2.on('pageerror',e=>errors.push(e.message));
 await p2.goto(url,{waitUntil:'domcontentloaded'});
 await p2.locator('[data-day="2"]').click();await p2.locator('[data-item="1"]').click();
 await p2.waitForFunction(()=>document.querySelector('.set-row input[data-type="work"][data-field="kg"]')?.value==='42.5');
 assert.equal(await input(p2).inputValue(),'42.5');
 log('Second device loads authoritative Azure data over blank local templates');

 await input(p1).fill('47.5');
 await until(()=>JSON.stringify([...store]).includes('"kg":"47.5"'),'update first workout');
 await input(p2).fill('50');
 await p2.locator('[data-view="settings"]').click();
 await p2.waitForFunction(()=>document.querySelector('#cloud-info')?.textContent?.includes('Równoczesna')||document.querySelector('#cloud-info')?.textContent?.includes('zmienił'));
 assert.ok(JSON.stringify([...store]).includes('"kg":"47.5"'));
 assert.equal(await p2.locator('#cloud-download').isDisabled(),true);
 log('Concurrent change to the same workout is blocked by per-row ETag');
 const pairDownload=p2.waitForEvent('download',{timeout:8000});
 await p2.locator('#cloud-backup-both').click();
 const pair=JSON.parse(fs.readFileSync(await (await pairDownload).path(),'utf8'));
 assert.equal(pair.format,'gym-tracker-safety-backup-v04');
 assert.ok(JSON.stringify(pair.local).includes('"kg":"50"'));
 assert.ok(JSON.stringify(pair.cloud).includes('"kg":"47.5"'));
 log('One downloaded JSON contains both complete workout copies');

 p2.once('dialog',d=>d.accept());
 const useCloud=await p2.locator('#cloud-download');
 await useCloud.click();
 await p2.locator('[data-view="train"]').click();
 assert.equal(await input(p2).inputValue(),'47.5');
 log('Explicit conflict resolution restores authoritative Azure workout');

 // Simulate a network outage. Offline changes must enter a persistent queue,
 // survive a reload, and upload when the network is restored.
 await p2.route('**/api/workouts**',route=>route.abort('internetdisconnected'));
 await input(p2).fill('51.5');
 await p2.locator('[data-view="settings"]').click();
 const ownerKey='zenek-gym-cloud-v04-'+encodeURIComponent('github:test-user-1');
 await p2.waitForFunction(key=>{
  const m=JSON.parse(localStorage.getItem(key)||'null');return !!m?.pending?.length;
 },ownerKey);
 assert.ok(JSON.parse(await p2.evaluate(key=>localStorage.getItem(key),ownerKey)).pending.length>0);
 await p2.reload({waitUntil:'domcontentloaded'});
 await p2.locator('[data-view="train"]').click();
 await p2.locator('[data-day="2"]').click();await p2.locator('[data-item="1"]').click();
 assert.equal(await input(p2).inputValue(),'51.5','Offline edit must survive reload');
 await p2.unroute('**/api/workouts**');
 await p2.locator('[data-view="settings"]').click();
 await p2.locator('#cloud-sync').click();
 await until(()=>JSON.stringify([...store]).includes('"kg":"51.5"'),'offline queue replay');
 log('Offline edit persisted across reload and uploaded when connection returned');

 // Distinct workouts should be independently writable even from stale devices.
 await p1.locator('[data-day="1"]').click();await p1.locator('[data-item="0"]').click();
 await input(p1).fill('61');
 await until(()=>JSON.stringify([...store]).includes('"kg":"61"'),'Tuesday workout');
 await p2.locator('[data-day="5"]').click();await p2.locator('[data-item="0"]').click();
 await input(p2).fill('54');
 await until(()=>JSON.stringify([...store]).includes('"kg":"54"'),'Friday workout');
 assert.ok(store.size>=3,'Three different workouts should be stored separately');
 log('Separate training days update independently without global journal conflicts');
 assert.deepEqual(errors,[],'Uncaught JS errors: '+errors.join(';'));
 log('No uncaught JavaScript errors');
 console.log('SUCCESS: 7 cloud-authoritative browser scenarios');
}finally{
 await browser.close();await new Promise(resolve=>server.close(resolve));
}
