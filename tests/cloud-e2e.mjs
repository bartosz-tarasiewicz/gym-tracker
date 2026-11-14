import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import {chromium} from 'playwright';

const files={'/':'index.html','/index.html':'index.html','/storage.js':'storage.js','/sync.js':'sync.js',
 '/week-ui.js':'week-ui.js','/progress-ui.js':'progress-ui.js','/app.js':'app.js','/sw.js':'sw.js',
 '/manifest.webmanifest':'manifest.webmanifest','/icon.svg':'icon.svg','/icon-apple.png':'icon-apple.png'};
const store=new Map(),operations=[];let etagCounter=10;
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data))};
const server=http.createServer(async(req,res)=>{
 const url=new URL(req.url,'http://localhost');
 if(url.pathname==='/.auth/me')return json(res,200,{clientPrincipal:{
  identityProvider:'github',userId:'test-owner',userDetails:'Test User',userRoles:['authenticated']}});
 if(url.pathname==='/api/workouts'&&req.method==='GET'){
  return json(res,200,{version:1,workouts:[...store].map(([id,value])=>({id,...value}))});
 }
 if(url.pathname.startsWith('/api/workouts/')&&['PUT','DELETE'].includes(req.method)){
  const id=decodeURIComponent(url.pathname.slice('/api/workouts/'.length));
  let raw='';for await(const chunk of req)raw+=chunk;
  const body=JSON.parse(raw),old=store.get(id);
  if((old?.etag||null)!==body.expectedEtag)return json(res,409,{error:'workout_changed'});
  if(req.method==='DELETE'){
   store.delete(id);operations.push({id,method:'DELETE'});return json(res,200,{ok:true,deleted:true});
  }
  if(!old&&[...store].some(([key,value])=>key!==id&&value.record?.date===body.record?.date))
   return json(res,409,{error:'workout_date_exists'});
  const etag='"'+(++etagCounter)+'"';
  store.set(id,{kind:id.split(':')[0],record:structuredClone(body.record),etag});
  operations.push({id,method:'PUT'});
  return json(res,200,{ok:true,id,etag});
 }
 const file=files[url.pathname];if(!file){res.writeHead(404);return res.end('Not Found')}
 res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.svg':'image/svg+xml',
  '.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(file)]||'text/plain'});
 res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const context=()=>browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
const errors=[];
const waitFor=async(fn,label)=>{for(let i=0;i<140;i++){if(fn())return;await new Promise(r=>setTimeout(r,100))}
 throw Error('Timeout: '+label)};
const session=(date,day,kg,notes)=>({date,day,notes,coreEnabled:{},started:date+'T09:00:00Z',
 exercises:{legpress:{machine:'MG-PL70',variants:{'MG-PL70':{
  sets:[{kg:String(kg),reps:'12',done:true}],warmups:[{kg:'20',reps:'10',done:true}],rir:'1'
 }}}}});
const row=(date,kg,notes,id='history:import-'+date)=>({id,kind:'history',
 record:session(date,5,kg,notes)});
const uploadFile=async(page,data,confirm=true)=>{
 if(confirm)page.once('dialog',d=>{console.log('IMPORT DIALOG:',d.type(),d.message());void d.accept();});
 await page.locator('#import-database').setInputFiles({name:'data.json',mimeType:'application/json',
  buffer:Buffer.from(JSON.stringify(data))});
};
const log=label=>console.log('PASS:',label);
let first,second;
try{
 first=await context();const phone=await first.newPage();phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto(base,{waitUntil:'domcontentloaded'});
 await phone.locator('[data-view="settings"]').click();
 assert.equal(await phone.locator('#import-database').count(),1);
 assert.equal(await phone.locator('#export').count(),1);
 assert.equal(await phone.locator('#exportcsv').count(),1);
 assert.equal(await phone.locator('#report').count(),0,'Emergency text report is removed');
 assert.equal(await phone.locator('#cloud-sync').count(),0,'Manual Refresh Azure button is removed');
 assert.equal(await phone.locator('#cloud-merge-safe').count(),0,'Data tab is not a conflict-merging wizard');
 log('Simple two-function Data tab without legacy report or refresh controls');

 // Setup 3 dates in mock Azure. One will be updated, one preserved as omitted,
 // one will be appended. Existing IDs are intentionally different from imported IDs.
 const originalId='history:original-2026-11-13';
 store.set(originalId,{kind:'history',record:session('2026-11-13',5,50,'Old Azure note'),etag:'"old-1"'});
 const preservedId='history:omitted-2026-11-06';
 store.set(preservedId,{kind:'history',record:session('2026-11-06',5,45,'DO NOT DELETE'),etag:'"old-2"'});
 await phone.locator('[data-view="train"]').click();
 await phone.locator('#week-date').fill('2026-11-13');
 await phone.waitForFunction(()=>document.querySelector('#notes')?.value==='Old Azure note');
 log('Calendar initially loads existing Azure training');

 await phone.locator('[data-view="settings"]').click();
 const imported={
  format:'gym-tracker-db-export-v1',version:1,
  workouts:[row('2026-11-13',55,'Overwritten notes','history:different-identifier'),
            row('2026-10-30',60,'New training','history:new-2026-10-30')]
 };
 await uploadFile(phone,imported);
 console.log('AFTER IMPORT',JSON.stringify([...store]).slice(0,1500),await phone.locator('#cloud-info').innerText());
 await waitFor(()=>store.get(originalId)?.record?.notes==='Overwritten notes','upsert changed date');
 await waitFor(()=>[...store.values()].some(x=>x.record.date==='2026-10-30'),'add new date');
 assert.equal(store.size,3,'Existing date updated, missing date created, omitted date preserved');
 assert.equal(store.get(originalId).record.exercises.legpress.variants['MG-PL70'].sets[0].kg,'55');
 assert.equal(store.get(preservedId).record.notes,'DO NOT DELETE');
 assert.equal(store.has('history:different-identifier'),false,'Imported ID never duplicates existing date');
 assert.ok(operations.every(x=>x.method!=='DELETE'),'Import never issues DELETE');
 log('Import upserts existing date, adds new date, and leaves omitted date untouched');

 // Re-import identical file should not write, or duplicate records.
 const writes=operations.length;
 await uploadFile(phone,imported);
 await new Promise(resolve=>setTimeout(resolve,300));
 assert.equal(store.size,3);
 assert.equal(operations.length,writes,'Reimporting identical data is idempotent');
 log('Repeated import is idempotent');

 // Full database JSON export: it must contain the omitted date (not just imported dates),
 // and all nested fields including notes, RIR, warmups, and finished sets.
 const jsonEvent=phone.waitForEvent('download');
 await phone.locator('#export').click();
 const jsonFile=await jsonEvent;
 const jsonData=JSON.parse(fs.readFileSync(await jsonFile.path(),'utf8'));
 assert.equal(jsonData.format,'gym-tracker-db-export-v1');
 assert.equal(jsonData.workouts.length,3);
 const exportOld=jsonData.workouts.find(x=>x.id===originalId);
 assert.equal(exportOld.record.notes,'Overwritten notes');
 assert.equal(exportOld.record.exercises.legpress.variants['MG-PL70'].warmups[0].kg,'20');
 assert.equal(exportOld.record.exercises.legpress.variants['MG-PL70'].rir,'1');
 assert.ok(jsonData.workouts.some(x=>x.id===preservedId));
 log('JSON export reads full live Azure, preserving complete workout structure');

 const csvEvent=phone.waitForEvent('download');
 await phone.locator('#exportcsv').click();
 const csvFile=await csvEvent;const csv=fs.readFileSync(await csvFile.path(),'utf8');
 assert.match(csv,/Overwritten notes/);
 assert.match(csv,/DO NOT DELETE/);
 assert.match(csv,/warmup/);
 assert.match(csv,/work/);
 assert.match(csv,/MG-PL70/);
 assert.match(csv,/2026-11-06/);
 log('CSV export includes all workouts, warmups, work sets, notes and RIR');

 // Old addon archive remains importable: its previously exclusion of 13 Nov
 // is removed; records present in Azure are explicitly replaced.
 const archive={format:'gym-tracker-history-additive-v1',
  history:[{...session('2026-11-13',5,57,'Archive overrides again'),syncId:'history:other-old-file-id'}]};
 await uploadFile(phone,archive);
 await waitFor(()=>store.get(originalId)?.record?.notes==='Archive overrides again','legacy archive import');
 assert.equal(store.size,3);
 log('Legacy additive JSON now overwrites matching dates, including 13 November');

 // Export/import compatibility across devices: PC sees updates and only one row
 // per date. The saved JSON can be imported again with no deletion.
 second=await context();const pc=await second.newPage();pc.on('pageerror',e=>errors.push(e.message));
 await pc.goto(base,{waitUntil:'domcontentloaded'});
 await pc.locator('#week-date').fill('2026-11-13');
 await pc.waitForFunction(()=>document.querySelector('#notes')?.value==='Archive overrides again');
 await pc.locator('[data-view="settings"]').click();
 await uploadFile(pc,jsonData);
 await waitFor(()=>store.get(originalId)?.record?.notes==='Overwritten notes','full JSON roundtrip import');
 assert.equal(store.size,3);
 assert.ok(store.has(preservedId));
 log('Full JSON roundtrip can restore an existing date on desktop without dropping omitted data');


 // A particular date may override the standard weekday plan without changing
 // other weeks, and its selection persists as a normal Azure workout record.
 await phone.locator('[data-view="train"]').click();
 await phone.locator('#week-date').fill('2026-11-16');
 assert.equal(await phone.locator('#workout-type').inputValue(),'0','Monday defaults to chest');
 const beforeRest=store.size;
 await phone.locator('#workout-type').selectOption('-1');
 assert.match(await phone.locator('h1').first().innerText(),/Dzień wolny/);
 assert.equal(store.size,beforeRest,'Selecting rest without Save does not modify Azure');
 await phone.locator('#notes').fill('Regeneracja po długim tygodniu');
 await phone.locator('#save-training').click();
 await waitFor(()=>[...store.values()].some(x=>x.record?.date==='2026-11-16'&&x.record.day===-1),'saved rest day');
 const restId=[...store.keys()].find(id=>store.get(id).record.date==='2026-11-16');
 assert.equal(store.get(restId).record.planOverride,true);
 assert.equal(store.get(restId).record.notes,'Regeneracja po długim tygodniu');
 assert.equal(store.size,beforeRest+1);
 await phone.reload({waitUntil:'domcontentloaded'});
 await phone.locator('#week-date').fill('2026-11-16');
 assert.equal(await phone.locator('#workout-type').inputValue(),'-1','Rest day survives reload');

 // Replace the rest day with leg day, fill a set, and save under the SAME ID.
 await phone.locator('#workout-type').selectOption('5');
 assert.equal(await phone.locator('.exercise-tab').count(),5,'Leg day template appears on a Monday');
 assert.equal(await phone.locator('.set-row [data-type="work"][data-field="kg"]').first().inputValue(),'50');
 await phone.locator('.done-button[data-type="work"]').first().click();
 await phone.locator('#save-training').click();
 await waitFor(()=>store.get(restId)?.record?.day===5,'Monday changed to legs');
 assert.equal(store.size,beforeRest+1,'Switching workout does not create a second record for date');
 assert.equal(store.get(restId).record.exercises.legpress.variants['MG-PL70'].sets[0].done,true);
 assert.equal(store.get(restId).record.planOverride,true);
 log('Date-level rest and alternative leg plan survive reload and upsert a single Azure row');

 // Switching to another plan with confirmed sets requires consent. Previous
 // sets are retained in inactive snapshots and restored when switching back.
 phone.once('dialog',d=>{assert.match(d.message(),/wykonane serie/);void d.accept();});
 await phone.locator('#workout-type').selectOption('-1');
 assert.match(await phone.locator('#notes').inputValue(),/Regeneracja/);
 assert.equal(store.get(restId).record.day,5,'Switch remains local until Save');
 await phone.locator('#workout-type').selectOption('5');
 assert.match(await phone.locator('.done-button[data-type="work"]').first().getAttribute('class'),/checked/,
  'Previously recorded legs sets are restored after switching back');
 await phone.locator('#save-training').click();
 assert.equal(store.get(restId).record.day,5);
 log('Changing workout does not lose previously entered sets before Save');

 // Thursday originally GRIT with no standard logging. Selecting a regular
 // workout that date must expose the correct form and persist across devices.
 await phone.locator('#week-date').fill('2026-11-19');
 assert.equal(await phone.locator('#workout-type').inputValue(),'3','Thursday defaults to GRIT');
 await phone.locator('#workout-type').selectOption('0');
 assert.equal(await phone.locator('.exercise-tab').count(),4,'Thursday can host chest instead of GRIT');
 await phone.locator('#save-training').click();
 await waitFor(()=>[...store.values()].some(x=>x.record?.date==='2026-11-19'&&x.record.day===0),'Thursday chest save');
 const nov19Id=[...store.keys()].find(id=>store.get(id).record.date==='2026-11-19');
 assert.equal(store.get(nov19Id).record.planOverride,true);

 // Weekend can be used for another activity and keep notes.
 await phone.locator('#week-date').fill('2026-11-15');
 assert.equal(await phone.locator('#workout-type').inputValue(),'-1','Sunday defaults to rest');
 await phone.locator('#workout-type').selectOption('-2');
 await phone.locator('#notes').fill('Basen — 45 minut');
 await phone.locator('#save-training').click();
 await waitFor(()=>[...store.values()].some(x=>x.record?.date==='2026-11-15'&&x.record.day===-2),'other activity on Sunday');
 log('GRIT and weekends support alternative workouts and note-only activities');

 // A different device reads the per-date selection from Azure and gets the
 // same workout form, not the canonical weekly plan for that weekday.
 await pc.reload({waitUntil:'domcontentloaded'});
 await pc.locator('#week-date').fill('2026-11-16');
 assert.equal(await pc.locator('#workout-type').inputValue(),'5','PC shows legs on Monday');
 assert.match(await pc.locator('.done-button[data-type="work"]').first().getAttribute('class'),/checked/);
 await pc.locator('#week-date').fill('2026-11-19');
 assert.equal(await pc.locator('#workout-type').inputValue(),'0','PC shows chest on Thursday');
 await pc.locator('#week-date').fill('2026-11-23');
 assert.equal(await pc.locator('#workout-type').inputValue(),'0','Next Monday stays on standard chest plan');
 log('Workout overrides are specific to date and synchronized to another device');

 // Complete JSON export/import preserves rest-day metadata, switched plans and
 // the inactive per-plan set snapshots for lossless recovery.
 await phone.locator('[data-view="settings"]').click();
 const altExport=phone.waitForEvent('download');
 await phone.locator('#export').click();
 const altJson=JSON.parse(fs.readFileSync(await (await altExport).path(),'utf8'));
 assert.ok(altJson.workouts.some(x=>x.record?.date==='2026-11-16'&&x.record?.day===5));
 assert.ok(altJson.workouts.some(x=>x.record?.date==='2026-11-15'&&x.record?.day===-2));
 const legBackup=altJson.workouts.find(x=>x.record?.date==='2026-11-16');
 assert.equal(legBackup.record.planSnapshots['-1'].notes,'Regeneracja po długim tygodniu');
 log('Full database export preserves overrides, activity notes and plan snapshots');

 assert.deepEqual(errors,[],'Uncaught browser JavaScript errors: '+errors.join('; '));
 log('No JavaScript errors');
 console.log('SUCCESS: per-date workout overrides, rest/GRIT and cross-device persistence alongside full Azure import/export');
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
