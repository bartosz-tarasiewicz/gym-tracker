import assert from 'node:assert/strict';
import fs from 'node:fs';
import {chromium} from 'playwright';

import {startServer} from './helpers/server.mjs';
const {base,server,store,profileStores,profileRegistry,profileSettings,operations}=await startServer();
let etagCounter=100;
const browser=await chromium.launch({headless:true,...(process.env.GYM_BROWSER_CHANNEL?{channel:process.env.GYM_BROWSER_CHANNEL}:{})});
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
async function reveal(page,selector){
 const details=page.locator(selector);
 if(await details.count()&&!(await details.evaluate(el=>el.open)))await details.locator('summary').click();
}
let first,second;
try{
 first=await context();const phone=await first.newPage();phone.on('pageerror',e=>errors.push(e.message));
 await phone.goto(base,{waitUntil:'domcontentloaded'});
 // Chromium does not emulate iOS safe-area env values; inject the measured inset.
 await phone.evaluate(()=>document.documentElement.style.setProperty('--safe-top','59px'));
 assert.ok((await phone.locator('#profiles').boundingBox()).y>=59,'Profile panel clears iPhone status bar');
 await phone.evaluate(()=>window.scrollTo(0,500));
 assert.ok((await phone.locator('.top').boundingBox()).y>=59,'Sticky header clears status bar after scrolling');
 assert.equal(await phone.evaluate(()=>getComputedStyle(document.body,'::before').height),'59px');
 await phone.evaluate(()=>{window.scrollTo(0,0);document.documentElement.style.removeProperty('--safe-top')});
 assert.ok((await phone.locator('#profiles').boundingBox()).y<30,'No extra inset in normal browser');
 log('Mobile safe area: profile and sticky header stay below status bar');
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
 const undoWrites=operations.length;
 await phone.locator('.set-row input[data-type="work"][data-field="kg"]').first().fill('99');
 await reveal(phone,'.train-additional');await phone.locator('#notes').fill('Przypadkowa zmiana');
 await reveal(phone,'.train-additional');await phone.locator('#undo-training').click();
 await phone.waitForFunction(()=>!window.GymCloud.isBusy());
 await phone.waitForTimeout(150);
 assert.equal(await phone.locator('.set-row input[data-type="work"][data-field="kg"]').first().inputValue(),'50');
 assert.equal(await phone.locator('#notes').inputValue(),'Old Azure note');
 assert.equal(operations.length,undoWrites,'Undo never writes or deletes Azure records');
 assert.equal(store.get(originalId).record.notes,'Old Azure note');
 phone.once('dialog',d=>void d.accept());await phone.locator('#workout-type').selectOption('0');
 await reveal(phone,'.train-additional');await phone.locator('#undo-training').click();
 await phone.waitForFunction(()=>!window.GymCloud.isBusy());
 await phone.waitForTimeout(150);
 assert.equal(await phone.locator('#workout-type').inputValue(),'5','Undo also restores original workout type');
 await phone.locator('#week-date').fill('2026-11-20');
 await phone.locator('.set-row input[data-type="work"][data-field="kg"]').first().fill('88');
 await phone.reload({waitUntil:'domcontentloaded'});
 await reveal(phone,'.train-additional');await phone.locator('#undo-training').click();
 await phone.waitForFunction(()=>!window.GymCloud.isBusy());
 await phone.waitForTimeout(150);
 assert.equal(await phone.locator('.set-row input[data-type="work"][data-field="kg"]').first().inputValue(),'50','Undo baseline survives offline form reload');
 assert.equal(await phone.evaluate(()=>Object.values(state.sessions).some(s=>s.date==='2026-11-20')),false,'New unsaved day is removed locally');
 await phone.locator('#week-date').fill('2026-11-13');
 log('Undo restores historical values, notes and plans, survives reload and never writes Azure');
 await phone.locator('#week-date').fill('2026-11-23');
 await phone.locator('[data-item="2"]').click();await reveal(phone,'.exercise-options');
 assert.match(await phone.locator('.movement-img').first().getAttribute('src'),/Dumbbell_Flyes/);
 await phone.locator('.exercise-media > summary').click();
 await phone.locator('.movement-img').first().scrollIntoViewIfNeeded();
 await phone.locator('.panel').filter({has:phone.locator('.movement-photos')}).screenshot({path:'exercise-preview.png'});
 await phone.locator('[data-item="0"]').click();await reveal(phone,'.exercise-options');
 await phone.locator('[data-machine="DUMBBELL"]').click();
 assert.match(await phone.locator('.movement-img').first().getAttribute('src'),/Dumbbell_Bench_Press/);
 assert.equal(await phone.locator('img[src*="photos/DUMBBELL"]').count(),0);
 await reveal(phone,'.train-additional');await phone.locator('#undo-training').click();
 await phone.locator('#week-date').fill('2026-11-13');
 assert.equal(await phone.locator('#machine').count(),0,'Variant selection uses buttons only');
 assert.equal(await phone.locator('[data-machine][aria-pressed="true"]').count(),1);
 log('Dumbbell photos demonstrate the selected movement and change per exercise');



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
 await reveal(phone,'.train-additional');await phone.locator('#notes').fill('Regeneracja po długim tygodniu');
 await phone.locator('#save-training').click();
 await waitFor(()=>[...store.values()].some(x=>x.record?.date==='2026-11-16'&&x.record.day===-1&&x.record.notes==='Regeneracja po długim tygodniu'),'saved rest day');
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
 const monitorDialog=d=>{console.log('DAY-SWITCH DIALOG:',d.type(),d.message());void d.accept()};
 phone.on('dialog',monitorDialog);
 await phone.locator('#save-training').click();
 try{await waitFor(()=>store.get(restId)?.record?.day===5,'Monday changed to legs')}
 catch(e){
  console.log('DAY-SWITCH STORE:',JSON.stringify([...store]).slice(-4200));
  console.log('DAY-SWITCH LOCAL:',await phone.evaluate(()=>localStorage.getItem('zenek-gym-v1')));
  throw e;
 }finally{phone.off('dialog',monitorDialog);}
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
 await reveal(phone,'.train-additional');await phone.locator('#notes').fill('Basen — 45 minut');
 await phone.locator('#save-training').click();
 await waitFor(()=>[...store.values()].some(x=>x.record?.date==='2026-11-15'&&x.record.day===-2),'other activity on Sunday');
 log('GRIT and weekends support alternative workouts and note-only activities');

 // A different device reads the per-date selection from Azure and gets the
 // same workout form, not the canonical weekly plan for that weekday.
 await pc.reload({waitUntil:'domcontentloaded'});
 await pc.waitForFunction(()=>[...(JSON.parse(localStorage.getItem('zenek-gym-v1')||'{}').sessions?Object.values(JSON.parse(localStorage.getItem('zenek-gym-v1')).sessions):[]),
  ...(JSON.parse(localStorage.getItem('zenek-gym-v1')||'{}').history||[])].some(s=>s.date==='2026-11-16'&&s.day===5));
 await pc.locator('[data-view="train"]').click();
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

 // Switching a historical, completed workout also reuses its existing history ID.
 await phone.locator('[data-view="train"]').click();
 await phone.locator('#week-date').fill('2026-11-13');
 assert.equal(await phone.locator('#workout-type').inputValue(),'5');
 const oldHistorySize=store.size;
 phone.once('dialog',d=>{assert.match(d.message(),/wykonane serie/);void d.accept();});
 await phone.locator('#workout-type').selectOption('0');
 assert.equal(await phone.locator('.exercise-tab').count(),4);
 await phone.locator('#save-training').click();
 await waitFor(()=>store.get(originalId)?.record?.day===0,'history workout switched from legs to chest');
 assert.equal(store.size,oldHistorySize,'Existing historical ID is reused for a changed type');
 assert.equal(store.get(originalId).record.planSnapshots['5'].exercises.legpress
  .variants['MG-PL70'].sets[0].kg,'55','Original historical legs data are preserved');
 await pc.reload({waitUntil:'domcontentloaded'});
 await pc.waitForFunction(()=>[...(JSON.parse(localStorage.getItem('zenek-gym-v1')||'{}').history||[])].some(s=>s.date==='2026-11-13'&&s.day===0));
 await pc.locator('[data-view="train"]').click();
 await pc.locator('#week-date').fill('2026-11-13');
 assert.equal(await pc.locator('#workout-type').inputValue(),'0',
  'Desktop receives historical training type edits from Azure');
 await pc.locator('#week-date').fill('2026-11-20');
 assert.equal(await pc.locator('#workout-type').inputValue(),'5',
  'Next Friday still uses the default leg workout');
 log('Historical session changes type using same cloud ID without altering next Friday');



 // Profile switch reloads its entire runtime, including unsubmitted drafts,
 // per-date plans and preferences. A second tab keeps its original scope.
 await phone.locator('#active-profile:not([disabled])').waitFor();
 const legacyBefore=JSON.stringify([...store]);
 // Embedded browsers may suppress native prompt dialogs entirely.
 await phone.evaluate(()=>{window.prompt=()=>null;});
 await phone.locator('#add-profile').click();
 await phone.locator('#profile-name').fill('Anna');
 await phone.locator('#cancel-profile').click();
 assert.equal(await phone.locator('#profile-form').count(),0);
 await phone.locator('#add-profile').click();
 await phone.locator('#profile-name').fill('Anna');
 await phone.locator('#profile-form button[type="submit"]').click();
 await phone.waitForFunction(()=>window.GymProfiles?.id().startsWith('p-')&&document.querySelector('#active-profile')?.disabled===false);
 const anna=await phone.evaluate(()=>GymProfiles.id());
 assert.equal(await phone.evaluate(()=>state.history.length+Object.keys(state.sessions).length),0);
 assert.equal(await pc.evaluate(()=>GymProfiles.id()),'default','other tab retains default scope');
 await phone.locator('#week-date').fill('2026-11-13');
 await phone.locator('#workout-type').selectOption('5');
 await phone.locator('.set-row input[data-type="work"][data-field="kg"]').first().fill('17');
 await phone.locator('.done-button[data-type="work"]').first().click();
 await phone.locator('#save-training').click();
 await waitFor(()=>profileStores.get(anna)?.size===1,'Anna workout saved');
 assert.equal(JSON.stringify([...store]),legacyBefore,'default cloud records unchanged');
 await phone.evaluate(()=>GymProfiles.preference('progress',{metric:'reps',range:'6'}));
 await waitFor(()=>profileSettings.get(anna)?.settings.preferences.progress.metric==='reps','Anna preferences persisted');
 await phone.locator('[data-view="settings"]').click();
 const scopedDownload=phone.waitForEvent('download');await phone.locator('#export').click();
 const scopedExport=JSON.parse(fs.readFileSync(await (await scopedDownload).path(),'utf8'));
 assert.equal(scopedExport.profileId,anna);assert.equal(scopedExport.workouts.length,1);
 await phone.locator('#active-profile').selectOption('default');
 await phone.waitForFunction(()=>window.GymProfiles?.id()==='default'&&document.querySelector('#active-profile')?.disabled===false);
 assert.equal(JSON.stringify([...store]),legacyBefore);
 assert.notEqual(await phone.evaluate(()=>GymProfiles.preference('progress')?.metric),'reps');
 await phone.locator('#active-profile').selectOption(anna);
 await phone.waitForFunction(()=>window.GymProfiles?.id().startsWith('p-')&&document.querySelector('#active-profile')?.disabled===false);
 assert.equal(await phone.evaluate(()=>GymProfiles.preference('progress').metric),'reps');
 assert.equal(await phone.evaluate(()=>Object.values(state.sessions)[0].exercises.legpress.variants['MG-PL70'].sets[0].kg),'17');
 await phone.locator('[data-view="train"]').click();await phone.locator('#week-date').fill('2026-11-13');
 await phone.locator('[data-item="1"]').click();await reveal(phone,'.exercise-options');
 assert.ok(await phone.locator('[data-machine="BAND-LEG-CURL"]').count());
 await phone.locator('[data-machine="BAND-LEG-CURL"]').click();
 assert.equal(await phone.locator('.movement-img').count(),0);
 assert.match(await phone.locator('.detail').first().textContent(),/Leżąc na brzuchu/);

 await phone.locator('[data-view="settings"]').click();
 const annaImport={format:'gym-tracker-db-export-v1',workouts:[row('2026-11-13',19,'Anna import')]};
 await uploadFile(phone,annaImport);
 await waitFor(()=>[...profileStores.get(anna).values()].some(x=>x.record.notes==='Anna import'),'profile import');
 await phone.waitForTimeout(100);
 assert.equal(JSON.stringify([...store]),legacyBefore,'profile import never touches default dates');
 await pc.reload({waitUntil:'domcontentloaded'});
 await pc.locator('#active-profile option[value="'+anna+'"]').waitFor({state:'attached'});
 await pc.locator('#active-profile:not([disabled])').selectOption(anna);
 await pc.waitForFunction(()=>window.GymProfiles?.id().startsWith('p-')&&document.querySelector('#active-profile')?.disabled===false);
 assert.ok(await pc.evaluate(()=>Object.values(state.sessions).some(x=>x.notes==='Anna import')||state.history.some(x=>x.notes==='Anna import')),'profile discovered and hydrated on second device');
 await phone.screenshot({path:'profile-preview.png',fullPage:true});
 log('Profiles isolate same-date workouts, plans, filters, export/import, cache and parallel tabs');

 // Full real export -> another profile, including legitimate legacy entries
 // sharing a date and an old note-only record without exercises.
 store.set('history:legacy-first',{kind:'history',record:session('2026-11-09',0,41,'Morning session'),etag:'"legacy-first"'});
 store.set('history:legacy-second',{kind:'history',record:session('2026-11-09',1,42,'Evening session'),etag:'"legacy-second"'});
 store.set('history:n',{kind:'history',record:{date:'2026-11-10',day:4,notes:'Legacy note only'},etag:'"legacy-note"'});
 const sourceBefore=JSON.stringify([...store]);
 const archiveContext=await context(),archivePage=await archiveContext.newPage();
 await archivePage.goto(base,{waitUntil:'domcontentloaded'});
 await archivePage.locator('[data-view="settings"]').click();
 const archiveDownload=archivePage.waitForEvent('download');await archivePage.locator('#export').click();
 const multiArchive=JSON.parse(fs.readFileSync(await (await archiveDownload).path(),'utf8'));
 assert.equal(multiArchive.workouts.filter(x=>x.record.date==='2026-11-09').length,2);
 await phone.locator('[data-view="settings"]').click();
 await uploadFile(phone,multiArchive);
 await waitFor(()=>profileStores.get(anna).has('history:legacy-second'),'same-date archive imported');
 await phone.waitForFunction(()=>!GymCloud.isBusy());
 assert.equal(profileStores.get(anna).get('history:legacy-first').record.notes,'Morning session');
 assert.equal(profileStores.get(anna).get('history:legacy-second').record.notes,'Evening session');
 assert.equal(profileStores.get(anna).get('history:n').record.notes,'Legacy note only');
 const repeatedSize=profileStores.get(anna).size,repeatedWrites=operations.length;
 await uploadFile(phone,multiArchive);
 await phone.waitForFunction(()=>!GymCloud.isBusy());await phone.waitForTimeout(150);
 assert.equal(profileStores.get(anna).size,repeatedSize);
 assert.equal(operations.length,repeatedWrites,'Reimporting multi-entry dates performs no writes');
 assert.equal(JSON.stringify([...store]),sourceBefore,'Source profile remains unchanged');
 const conflictArchive={format:'gym-tracker-db-export-v1',workouts:[row('2026-11-09',1,'foreign A','history:foreign-a'),row('2026-11-09',2,'foreign B','history:foreign-b')]};
 let conflictMessage='';phone.once('dialog',d=>{conflictMessage=d.message();void d.dismiss();});
 await uploadFile(phone,conflictArchive,false);
 await phone.waitForFunction(()=>!GymCloud.isBusy());await phone.waitForTimeout(150);
 assert.match(conflictMessage,/jednoznacznie/);assert.equal(operations.length,repeatedWrites);
 await archiveContext.close();
 log('Full export with multiple same-date records and legacy notes imports losslessly, idempotently and without modifying source');

 // Six legacy navigation templates on the reported date. Optionally exercise
 // the exact user-provided export locally, without checking personal data in.
 const regressionContext=await context(),regression=await regressionContext.newPage();
 await regression.goto(base,{waitUntil:'domcontentloaded'});
 let reportedRows;
 if(process.env.GYM_TEST_EXPORT){
  reportedRows=JSON.parse(fs.readFileSync(process.env.GYM_TEST_EXPORT,'utf8')).workouts.filter(x=>x.record.date==='2026-11-13');
 }else{
  reportedRows=await regression.evaluate(()=>[0,1,2,3,4,5].map(day=>{
   const exercises=Object.fromEntries([...(PLAN[day]?.items||[]),...CORE].map(item=>{
    const log=defaultLog(item);log.variants[log.machine]={sets:cloneWorkout(log.sets),warmups:cloneWorkout(log.warmups),rir:''};return [item.id,log];
   }));
   if(day===5)for(const id of ['legpress','legcurl','glute','extension','calf']){
    const log=exercises[id],v=log.variants[log.machine];for(const row of [...v.sets,...v.warmups])row.done=true;
    if(id==='legpress')for(const row of v.sets)row.kg='60';
   }
   return {id:'draft:2026-11-13-'+day,kind:'draft',record:{date:'2026-11-13',day,exercises,coreEnabled:{},notes:day===5?'Leg workout note':''}};
  }));
 }
 for(const [id,row] of [...store])if(row.record.date==='2026-11-13')store.delete(id);
 for(const row of reportedRows)store.set(row.id,{kind:row.kind,record:structuredClone(row.record),etag:'"fixture-'+(++etagCounter)+'"'});
 await regression.reload({waitUntil:'domcontentloaded'});
 await regression.locator('#week-date').fill('2026-11-13');
 assert.equal(await regression.locator('#workout-type').inputValue(),'5');
 assert.equal(await regression.locator('.done-button.checked[data-type="work"]').count(),3);
 assert.equal(await regression.locator('.done-button.checked[data-type="warm"]').count(),3);
 assert.equal(await regression.locator('.set-row input[data-field="kg"][data-type="work"]').first().inputValue(),'60');
 const meaningful=reportedRows.find(x=>x.record.day===5),savedId=meaningful.id;
 const untouched=JSON.stringify([...store].filter(([id])=>id!==savedId));
 const recordCount=store.size;
 await reveal(regression,'.train-additional');await regression.locator('#notes').fill('Updated regression note');
 await regression.locator('#save-training').click();
 await waitFor(()=>store.get(savedId).record.notes==='Updated regression note','save selected populated legacy draft');
 assert.equal(store.size,recordCount);assert.equal(JSON.stringify([...store].filter(([id])=>id!==savedId)),untouched);
 assert.equal(await regression.evaluate(()=>Object.values(state.sessions).filter(x=>x.date==='2026-11-13').length),6);
 await regression.reload({waitUntil:'domcontentloaded'});
 assert.equal(await regression.locator('#workout-type').inputValue(),'5');
 assert.equal(await regression.locator('.done-button.checked[data-type="warm"]').count(),3);
 assert.equal(await regression.locator('.done-button.checked[data-type="work"]').count(),3);
 await regressionContext.close();
 log('13 November selects confirmed leg workout over five empty templates and preserves every other record when saving');
 assert.deepEqual(errors,[],'Uncaught browser JavaScript errors: '+errors.join('; '));
 log('No JavaScript errors');
 console.log('SUCCESS: per-date workout overrides, rest/GRIT and cross-device persistence alongside full Azure import/export');
}finally{
 await browser.close();
 await new Promise(resolve=>server.close(resolve));
}
