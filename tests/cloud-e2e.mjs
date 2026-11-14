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
 p2.once('dialog',dialog=>{assert.match(dialog.message(),/Dodać 1 wcześniejszych treningów/);dialog.accept()});
 await p2.locator('#import-additive').setInputFiles({name:'import-test.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sourceImport))});
 await until(()=>store.has('history:test-import-2026-10-26'),'new history workout upload');
 assert.equal(JSON.stringify(store.get(historicId).record),savedFriday,'Existing 6 Nov workout is never overwritten');
 assert.equal(store.has('history:duplicate-should-not-be-created'),false,'Duplicate date cannot be imported under a different ID');
 const nBefore=store.size;
 await p2.locator('#import-additive').setInputFiles({name:'import-test-again.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(sourceImport))});
 await pause(500);
 assert.equal(store.size,nBefore,'Repeating import is idempotent');
 log('Additive import uploads only missing dates, preserves existing Azure data and is idempotent');


 // A previously imported local history can be richer than Azure without
 // its own sync metadata. Merge must ADD missing records, never overwrite.
 const existingStoreSnapshot=new Map([...store].map(([id,v])=>[id,JSON.stringify(v.record)]));
 const extraId='history:local-preserved-2026-10-19';
 const recovered={date:'2026-10-19',day:0,source:'Recovered from iPhone',started:'2026-10-19T08:00:00.000Z',notes:'',coreEnabled:{},
  syncId:extraId,exercises:{flat:{machine:'MG-PL13',variants:{'MG-PL13':{sets:[{kg:'55',reps:'10',done:true}],warmups:[],rir:'2'}}}}};
 const localSeed={version:2,activeDay:0,selectedDate:'2026-10-19',view:'settings',sessions:{},history:[recovered],savedAt:12};
 const third=await context({storageState:{cookies:[],origins:[{origin:url,localStorage:[{name:'zenek-gym-v1',value:JSON.stringify(localSeed)}]}]}});
 const p3=await third.newPage();p3.on('pageerror',e=>errors.push(e.message));await p3.goto(url,{waitUntil:'domcontentloaded'});
 await p3.locator('[data-view="settings"]').click();
 await p3.waitForFunction(id=>{
  const local=JSON.parse(localStorage.getItem('zenek-gym-v1')||'{}');
  return !!document.querySelector('#cloud-merge-safe')&&(local.history||[]).some(h=>h.syncId===id);
 },historicId);
 assert.equal(await p3.locator('#cloud-sync').innerText(),'↻ Pobierz brakujące z Azure');
 assert.ok((await p3.locator('#cloud-info').innerText()).includes('Pobrano'),'Cloud-only history is added automatically on first mismatch');
 assert.equal(await p3.locator('#cloud-merge-safe').isDisabled(),true,'Safe merge requires both backups first');
 const safetyFile=p3.waitForEvent('download',{timeout:8000});
 await p3.locator('#cloud-backup-both').click();
 const safety=JSON.parse(fs.readFileSync(await (await safetyFile).path(),'utf8'));
 assert.equal(safety.format,'gym-tracker-safety-backup-v04');
 assert.ok(safety.local.history.some(h=>h.syncId===extraId),'Backup contains local-only record');
 assert.ok(safety.cloud.history.some(h=>h.syncId===historicId),'Backup contains Azure-only record');
 p3.once('dialog',d=>{assert.match(d.message(),/Dodać do Azure: 1/);d.accept();});
 await p3.locator('#cloud-merge-safe').click();
 await until(()=>store.has(extraId),'local missing history safe merge');
 await p3.waitForFunction(()=>document.querySelector('#cloud-info')?.textContent?.includes('Scalono dane'));
 for(const [id,record] of existingStoreSnapshot)assert.equal(JSON.stringify(store.get(id)?.record),record,'Previously stored record '+id+' remains unchanged');
 const combined=JSON.parse(await p3.evaluate(()=>localStorage.getItem('zenek-gym-v1')));
 assert.ok(combined.history.some(h=>h.syncId===extraId),'Local record remains in the device');
 assert.ok(combined.history.some(h=>h.syncId===historicId),'Azure record is downloaded to the device');
 assert.equal(store.size,existingStoreSnapshot.size+1,'Exactly one previously missing record is added');
 log('Safe merge unions independent local and Azure records without overwriting either');

 // If the same cloud ID was edited differently on two devices, merge must
 // explicitly refuse even after both backups were saved.
 const conflict=structuredClone(recovered);conflict.exercises.flat.variants['MG-PL13'].sets[0].kg='99';
 const conflictSeed={...localSeed,history:[conflict]};
 const fourth=await context({storageState:{cookies:[],origins:[{origin:url,localStorage:[{name:'zenek-gym-v1',value:JSON.stringify(conflictSeed)}]}]}});
 const p4=await fourth.newPage();p4.on('pageerror',e=>errors.push(e.message));await p4.goto(url,{waitUntil:'domcontentloaded'});
 await p4.locator('[data-view="settings"]').click();
 await p4.waitForFunction(id=>{
  const local=JSON.parse(localStorage.getItem('zenek-gym-v1')||'{}');
  return !!document.querySelector('#cloud-merge-safe')&&(local.history||[]).some(h=>h.syncId===id);
 },historicId);
 assert.equal(await p4.locator('#cloud-sync').innerText(),'↻ Pobierz brakujące z Azure');
 const backupConflict=p4.waitForEvent('download',{timeout:8000});
 await p4.locator('#cloud-backup-both').click();await backupConflict;
 const recordBeforeConflict=JSON.stringify(store.get(extraId).record);
 await p4.locator('#cloud-merge-safe').click();
 await p4.waitForFunction(()=>document.querySelector('#cloud-info')?.textContent?.includes('nakładających się'));
 assert.equal(JSON.stringify(store.get(extraId).record),recordBeforeConflict,'Safe merge refuses conflicting same-ID edits');
 assert.match(await p4.locator('#cloud-info').innerText(),/ręcznej decyzji/);
 log('Same-ID conflicting workout is preserved for manual review; no blind overwrite');

 // New imported workouts must appear on a PC without whole-journal merging.
 // Even when one existing cloud ID has conflicting edits, reads are safe.
 const pcStoreId='history:imported-after-desktop-login-2026-09-21';
 const pcStoreRecord={date:'2026-09-21',day:0,source:'Imported on iPhone',started:'2026-09-21T08:00:00Z',
  exercises:{flat:{machine:'MG-PL13',variants:{'MG-PL13':{sets:[{kg:'50',reps:'10',done:true}],warmups:[],rir:'2'}}}},coreEnabled:{},notes:''};
 store.set(pcStoreId,{kind:'history',record:pcStoreRecord,etag:'"new-iphone-import"'});
 const operationsBeforeRead=operations.length;
 await p4.locator('#cloud-sync').click();
 await p4.waitForFunction(id=>{
  const state=JSON.parse(localStorage.getItem('zenek-gym-v1')||'{}');
  return (state.history||[]).some(s=>s.syncId===id);
 },pcStoreId);
 assert.equal(operations.length,operationsBeforeRead,'Read-only refresh never uploads, edits, or deletes workouts');
 assert.equal(JSON.stringify(store.get(extraId).record),recordBeforeConflict,'Conflicting workouts stay unchanged');
 await p4.reload({waitUntil:'domcontentloaded'});
 await p4.locator('[data-view="settings"]').click();
 await p4.waitForFunction(()=>!!document.querySelector('#cloud-merge-safe'));
 assert.equal(operations.length,operationsBeforeRead,'Restarting with saved conflict does not upload local-only records');
 const pcState=JSON.parse(await p4.evaluate(()=>localStorage.getItem('zenek-gym-v1')));
 assert.ok(pcState.history.some(s=>s.syncId===pcStoreId),'Cloud imported session survives desktop reload');
 assert.ok(pcState.history.some(s=>s.syncId===extraId),'PC retains local edited training after reload');
 await p4.locator('[data-view="train"]').click();
 await p4.locator('#week-date').fill('2026-09-21');
 assert.equal(await p4.locator('h1').first().innerText(),'Klatka piersiowa');
 assert.match(await p4.locator('.done-button[data-type="work"]').first().getAttribute('class'),/checked/,
  'Cloud-imported results are available in workout calendar');
 log('Cloud-imported workouts show on desktop despite conflict, persist across reload, never write to Azure');


 // The user only wants to import previous training dates, not reconcile
 // the two journals and never touch 13 November 2026.
 const blockedImport={
  format:'gym-tracker-history-additive-v1',
  history:[
   {syncId:'history:old-2026-10-12',date:'2026-10-12',day:0,
    exercises:{flat:{machine:'MG-PL13',variants:{'MG-PL13':{sets:[{kg:'60',reps:'10',done:true}],warmups:[],rir:'2'}}}}},
   {syncId:'history:exclude-2026-11-13',date:'2026-11-13',day:5,
    exercises:{legpress:{machine:'MG-PL70',variants:{'MG-PL70':{sets:[{kg:'50',reps:'10',done:true}],warmups:[],rir:'1'}}}}},
   {syncId:'history:duplicate-date-2026-11-06',date:'2026-11-06',day:5,
    exercises:{legpress:{machine:'MG-PL70',variants:{'MG-PL70':{sets:[{kg:'99',reps:'10',done:true}],warmups:[],rir:'1'}}}}}
  ]
 };
 const remoteConflictSnapshot=JSON.stringify(store.get(extraId).record);
 const originalFriday=JSON.stringify(store.get(historicId).record);
 assert.match(await p4.locator('#cloud-info').innerText(),/ręcznej decyzji/,'Sync conflict is still visible');
 p4.once('dialog',d=>{assert.match(d.message(),/13\.11\.2026 NIE będzie importowany/);d.accept();});
 await p4.locator('#import-additive').setInputFiles({name:'older-only.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(blockedImport))});
 await until(()=>store.has('history:old-2026-10-12'),'older workouts import even with a separate sync conflict');
 assert.equal(store.has('history:exclude-2026-11-13'),false,'Yesterday must never be imported');
 assert.equal(store.has('history:duplicate-date-2026-11-06'),false,'Existing Friday is not duplicated');
 assert.equal(JSON.stringify(store.get(extraId).record),remoteConflictSnapshot,'Separate existing conflict remains untouched');
 assert.equal(JSON.stringify(store.get(historicId).record),originalFriday,'Existing 6 Nov training remains untouched');
 const phoneAfterImport=JSON.parse(await p4.evaluate(()=>localStorage.getItem('zenek-gym-v1')));
 assert.ok(phoneAfterImport.history.some(x=>x.syncId==='history:old-2026-10-12'),'Imported past date is visible locally');
 assert.ok(phoneAfterImport.history.some(x=>x.syncId===extraId),'Phone-specific unsynced workout remains untouched');
 const nAfterBlockedImport=store.size;
 await p4.locator('#import-additive').setInputFiles({name:'older-again.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(blockedImport))});
 await pause(450);
 assert.equal(store.size,nAfterBlockedImport,'Repeating import must not create a second entry');
 log('Historical import works while sync is blocked, excludes 13 Nov and never replaces existing workouts');


 assert.deepEqual(errors,[],'Uncaught JS errors: '+errors.join(';'));
 log('No uncaught JavaScript errors');
 console.log('SUCCESS: date-first Azure, import and read-only cross-device hydration without overwrites');
}finally{
 await browser.close();await new Promise(resolve=>server.close(resolve));
}
