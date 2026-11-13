import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const files={'/':'index.html','/index.html':'index.html','/storage.js':'storage.js','/sync.js':'sync.js','/week-ui.js':'week-ui.js','/progress-ui.js':'progress-ui.js','/app.js':'app.js','/sw.js':'sw.js','/manifest.webmanifest':'manifest.webmanifest','/icon.svg':'icon.svg','/icon-apple.png':'icon-apple.png'};
const store=new Map();let version=0;const operations=[];
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
  if(req.method==='DELETE'){store.delete(id);operations.push({id,method:'DELETE'});return json(res,200,{ok:true,id,deleted:true});}
  const etag='"'+(++version)+'"';
  store.set(id,{kind:id.split(':')[0],record:structuredClone(body.record),etag});operations.push({id,method:'PUT'});
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
const context=options=>browser.newContext({viewport:{width:390,height:844},acceptDownloads:true,...options});
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
 const weekdays=await p1.locator('.week-grid [data-date]').evaluateAll(nodes=>nodes.map(node=>node.querySelector('.week-name')?.textContent));
 assert.deepEqual(weekdays,['Pn','Wt','Śr','Czw','Pt','Sob','Nd'],'Full Monday-to-Sunday calendar');
 assert.equal(await p1.locator('[data-day="4"]').count(),0,'Legacy Thursday strength tile must stay hidden');
 const tileWidths=await p1.locator('.week-day').evaluateAll(nodes=>nodes.map(node=>node.getBoundingClientRect().width));
 assert.ok(tileWidths.every(width=>width>25&&width<58),'Seven days should fit within iPhone viewport');
 await p1.locator('[data-day="3"]').click();
 assert.equal(await p1.locator('.set-row').count(),0,'GRIT must not be logged as sets');
 assert.equal(await p1.locator('#finish').count(),0,'GRIT must not be finished as a workout');
 await p1.locator('[data-day="5"]').click();
 assert.ok((await p1.locator('.machine-img').getAttribute('src')).includes('Matrix_Magnum_Leg_Press'),'Friday leg press photo must be mapped');
 assert.equal(await p1.locator('#machine').inputValue(),'MG-PL70','Friday workout remains at legacy Azure day index 5');
 assert.ok(await p1.locator('.machine-choice').count()>1,'Equipment alternatives should be visible');
 log('Seven-day calendar, non-tracked Thursday, Friday photo, and visible alternatives');
 await p1.locator('[data-day="2"]').click();await p1.locator('[data-item="1"]').click();
 await input(p1).fill('42.5');
 await p1.locator('.set-row input[data-type="work"][data-field="reps"]').first().fill('13');
 await p1.locator('.done-button[data-type="work"]').first().click();
 await until(()=>JSON.stringify([...store]).includes('"kg":"42.5"'),'upload first workout');
 assert.equal(store.size,1,'Only one modified workout may be created; not the entire journal');
 assert.ok([...store.keys()][0].startsWith('draft:'));
 log('Azure receives one workout record with real changes and an ETag');

 // Seed the old offline cache *once* as browser storageState. An addInitScript
 // on every navigation would repeatedly wipe real edits and invalidate the test.
 const seedDate='2026-11-01';
 const seedRecord={date:seedDate,day:0,started:'2000-01-01T01:01:01Z',notes:'',coreEnabled:{},exercises:{}};
 const seed={version:2,sessions:{[seedDate+'-0']:seedRecord},history:[],savedAt:42};
 second=await context({storageState:{cookies:[],origins:[{
  origin:url,localStorage:[{name:'zenek-gym-v1',value:JSON.stringify(seed)}]
 }]}});
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
 const beforeLocal=JSON.parse(await p2.evaluate(()=>localStorage.getItem('zenek-gym-v1')));
 console.log('BEFORE RELOAD:',JSON.stringify(beforeLocal).includes('"kg":"51.5"'),beforeLocal.savedAt);
 assert.ok(JSON.stringify(beforeLocal).includes('"kg":"51.5"'),'Local cache must reflect offline edit before reload');
 await p2.reload({waitUntil:'domcontentloaded'});
 const afterLocal=JSON.parse(await p2.evaluate(()=>localStorage.getItem('zenek-gym-v1')));
 console.log('AFTER RELOAD:',JSON.stringify(afterLocal).includes('"kg":"51.5"'),afterLocal.savedAt,'CLOUD:',(await p2.locator('#cloud-info').count())?(await p2.locator('#cloud-info').textContent()):'hidden');
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
 await p2.locator('[data-view="train"]').click();
 await p2.locator('[data-day="5"]').click();await p2.locator('[data-item="0"]').click();
 await input(p2).fill('54');
 await until(()=>JSON.stringify([...store]).includes('"kg":"54"'),'Friday workout');
 assert.ok(store.size>=3,'Three different workouts should be stored separately');
 log('Separate training days update independently without global journal conflicts');

 const fridayId=[...store.keys()].find(id=>id.startsWith('draft:')&&id.endsWith('-5'));
 assert.ok(fridayId,'Friday workout is stored under existing date/day draft ID');
 await p2.locator('.done-button[data-type="work"]').first().click();
 await until(()=>store.get(fridayId)?.record?.exercises?.legpress?.variants?.['MG-PL70']?.sets?.[0]?.done===true,
  'Friday auto-save set');
 const cursor=operations.length;
 await p2.locator('[data-week="-7"]').click();
 assert.equal(await input(p2).inputValue(),'50','Previous Friday without history shows default 50 kg');
 await p2.locator('[data-week="7"]').click();
 assert.equal(await input(p2).inputValue(),'54','Original Friday result loads after week navigation');
 assert.equal(await p2.locator('#finish').count(),0,'No mandatory finish control');
 assert.equal(operations.slice(cursor).filter(x=>x.method==='PUT').length,0,'Browsing other dates creates no cloud writes');
 log('Browsing dates does not create records; results auto-save on the original day');

 // Seed an actual finished workout from the prior Friday in the mock Azure API.
 const historicId='history:import-2026-11-06-5';
 const historicSet={kg:'50',reps:'12',done:true};
 const historic={date:'2026-11-06',day:5,started:'2026-11-06T10:00:00.000Z',source:'Imported training',notes:'',coreEnabled:{},
  exercises:{legpress:{machine:'MG-PL70',sets:[historicSet],warmups:[],rir:'1',
   variants:{'MG-PL70':{sets:[historicSet],warmups:[],rir:'1'}}}}};
 store.set(historicId,{kind:'history',record:structuredClone(historic),etag:'"seed-01"'});
 await p2.locator('[data-view="settings"]').click();
 await p2.locator('#cloud-sync').click();
 await p2.waitForFunction(id=>{
  const s=JSON.parse(localStorage.getItem('zenek-gym-v1')||'{}');
  return (s.history||[]).some(x=>x.syncId===id);
 },historicId);
 await p2.locator('[data-view="train"]').click();
 await p2.locator('#week-date').fill('2026-11-06');
 assert.equal(await input(p2).inputValue(),'50','Imported historic workout should open directly in Train');
 assert.match(await p2.locator('.done-button[data-type="work"]').first().getAttribute('class'),/checked/);
 const existingIds=[...store.keys()].sort();
 const beforeSave=JSON.stringify(store.get(historicId).record);
 assert.equal(await p2.locator('#save-training').innerText(),'✓ Zapisz zmiany');
 await input(p2).fill('56.5');
 await p2.locator('#rir').selectOption('2');
 await pause(1550);
 assert.equal(JSON.stringify(store.get(historicId).record),beforeSave,'Editing finished session must NOT upload before clicking Save');
 assert.deepEqual([...store.keys()].sort(),existingIds,'Editing cannot create a duplicate');
 p2.once('dialog',dialog=>{assert.match(dialog.message(),/niezapisane zmiany/);dialog.dismiss();});
 await p2.locator('[data-week="7"]').click();
 assert.equal(await input(p2).inputValue(),'56.5','Canceling navigation keeps the unsaved correction');
 await p2.locator('#save-training').click();
 await until(()=>JSON.stringify(store.get(historicId)?.record).includes('"kg":"56.5"'),'explicit Save overwrites historic training');
 assert.deepEqual([...store.keys()].sort(),existingIds,'Explicit Save updates same history record without extra rows');
 assert.ok(JSON.stringify(store.get(historicId).record).includes('"rir":"2"'));
 log('Existing history edits stay pending until Save, then overwrite original Azure syncId without duplicates');

 await p2.locator('[data-area="core"]').click();
 await p2.locator('[data-core="5"]').click();
 assert.ok((await p2.locator('.machine-img').getAttribute('src')).includes('plank-drags-header.jpg'),'CORE has an exercise photo');
 assert.ok(await p2.locator('.img-link').count(),'Exercise photo has a visible source link');
 log('CORE photos display for the selected exercise');

 await p2.locator('[data-view="history"]').click();
 assert.equal(await p2.locator('#trend-exercise').count(),1,'History is a trends dashboard');
 assert.equal(await p2.locator('.history-edit-button').count(),0,'History no longer has edit forms');
 await p2.locator('#trend-exercise').selectOption('legpress');
 await p2.locator('#trend-machine').selectOption('MG-PL70');
 assert.ok(await p2.locator('.trend-chart').count(),'Two Friday training dates provide a weight trend');
 assert.match(await p2.locator('.trend-chart').innerHTML(),/56,5/,'Historic 56.5 kg point is included in the graph');
 assert.match(await p2.locator('.trend-stats').innerText(),/54 kg/,'Most recent dated session is the last point');
 await p2.locator('[data-trend-metric="reps"]').click();
 assert.ok(await p2.locator('.trend-chart').count(),'Rep trend renders independently');
 log('History shows per-machine weight and rep trends from completed sets');

 // Additive history import must protect existing Azure workouts, even if the
 // imported file includes a conflicting date with a different cloud ID.
 const savedFriday=JSON.stringify(store.get(historicId).record);
 const sourceImport={
  format:'gym-tracker-history-additive-v1',
  history:[
   {syncId:'history:test-import-2026-10-26',date:'2026-10-26',day:0,
    source:'Test import',notes:'Import only new dates',coreEnabled:{},
    exercises:{flat:{machine:'MG-PL13',variants:{'MG-PL13':{sets:[{kg:'70',reps:'8',done:true}],warmups:[],rir:'1'}}}}},
   {syncId:'history:duplicate-should-not-be-created',date:'2026-11-06',day:5,
    source:'Test import',notes:'Do not overwrite',coreEnabled:{},
    exercises:{legpress:{machine:'MG-PL70',variants:{'MG-PL70':{sets:[{kg:'999',reps:'1',done:true}],warmups:[],rir:'0'}}}}}
  ]
 };
 await p2.locator('[data-view="settings"]').click();
 assert.equal(await p2.locator('#import-additive').count(),1);
 p2.once('dialog',dialog=>{assert.match(dialog.message(),/Dodać 1 brakujących treningów/);dialog.accept()});
 await p2.locator('#import-additive').setInputFiles({name:'import-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sourceImport))});
 await until(()=>store.has('history:test-import-2026-10-26'),'new history workout upload');
 assert.equal(JSON.stringify(store.get(historicId).record),savedFriday,'Existing 6 Nov workout is never overwritten');
 assert.equal(store.has('history:duplicate-should-not-be-created'),false,'Duplicate date cannot be imported under a different ID');
 const nBefore=store.size;
 await p2.locator('#import-additive').setInputFiles({name:'import-test-again.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sourceImport))});
 await pause(500);
 assert.equal(store.size,nBefore,'Repeating import is idempotent');
 log('Additive import uploads only missing dates, preserves existing Azure data and is idempotent');

 assert.deepEqual(errors,[],'Uncaught JS errors: '+errors.join(';'));
 log('No uncaught JavaScript errors');
 console.log('SUCCESS: date-first Azure, inherited workouts, auto-save, CORE photos, and progress trends');
}finally{
 await browser.close();await new Promise(resolve=>server.close(resolve));
}
