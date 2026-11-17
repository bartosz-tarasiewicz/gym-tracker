import assert from 'node:assert/strict';
import { chromium } from 'playwright';

const URL = 'https://salmon-bush-06df5a710.8.azurestaticapps.net/';
const browser = await chromium.launch({headless:true,channel:process.env.GYM_BROWSER_CHANNEL||undefined});
const context = await browser.newContext({viewport:{width:390,height:844}, deviceScaleFactor:2, isMobile:true, hasTouch:true, acceptDownloads:true});
const page = await context.newPage();
const errors=[];
page.on('pageerror', error=>errors.push(error.message));
let checks=0;
function pass(label){checks++; console.log('PASS',label)}
const input=(field)=>page.locator(`.set-row input[data-type="work"][data-field="${field}"]`).first();
const done=()=>page.locator('.done-button[data-type="work"][data-done="0"]');
async function idbSnapshot(){
 return page.evaluate(()=>new Promise((resolve,reject)=>{
  const open=indexedDB.open('zenek-gym-database');
  open.onerror=()=>reject(open.error);
  open.onsuccess=()=>{
   const tx=open.result.transaction('snapshots','readonly');
   const req=tx.objectStore('snapshots').get('main');
   req.onsuccess=()=>resolve(req.result?JSON.parse(req.result):null);
   req.onerror=()=>reject(req.error);
  };
 }));
}
try {
 await page.goto(URL,{waitUntil:'domcontentloaded',timeout:60000});
 await page.locator('[data-day="2"]').waitFor({timeout:20000});
 assert.match(await page.title(),/Gym Tracker/);
 pass('Public Azure site loads at the supplied URL');
 if(process.env.GYM_REQUIRE_LATEST_UI==='1'){
  await page.evaluate(()=>{window.prompt=()=>null;});
  assert.equal(await page.locator('#profiles').count(),0,'Profiles are hidden outside Data');
  await page.locator('[data-view="settings"]').click();
  await page.locator('#active-profile:not([disabled])').waitFor();
  await page.locator('#add-profile').click();
  await page.locator('#profile-name').fill('Test formularza');
  assert.equal(await page.locator('#profile-name').inputValue(),'Test formularza');
  await page.locator('#cancel-profile').click();
  assert.equal(await page.locator('#profile-form').count(),0);
  pass('Profiles are available only in Data, with an inline add form');
  await page.locator('.navitem[data-view="plans"]').click();
  await page.locator('[data-plan-action="new"]').click();
  await page.locator('#plan-name').fill('Test edytora');
  assert.equal(await page.locator('.plan-item').count(),4);
  assert.equal(await page.locator('#plan-name').inputValue(),'Test edytora');
  page.once('dialog',d=>d.accept());
  await page.locator('[data-plan-action="cancel"]').click();
  assert.equal(await page.locator('#plan-form').count(),0);
  await page.locator('.navitem[data-view="train"]').click();
  pass('Published plan editor opens, edits and cancels without saving test data');
 }
 await page.locator('[data-day="2"]').click();
 if(process.env.GYM_REQUIRE_LATEST_UI==='1'){
  assert.equal(await page.locator('.rest-timer-bar #rest-quick-start').isVisible(),true);
  assert.equal(await page.locator('[data-rir-quick="2"]').isVisible(),true);
  assert.equal(await page.locator('.set-row.is-next').count(),1);
  pass('Published v0.11 provides guided sets, one-tap RIR and quick rest timer');
 }
 await page.locator('[data-item="1"]').click();
 await input('kg').fill('42.5');
 await input('reps').fill('13');
 await done().click();
 assert.equal(await input('kg').inputValue(),'42.5');
 assert.equal(await input('reps').inputValue(),'13');
 assert.match(await done().getAttribute('class'),/checked/);
 pass('Edited work set and completion are visible');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('[data-item="1"]').waitFor();
 assert.equal(await input('kg').inputValue(),'42.5');
 assert.equal(await input('reps').inputValue(),'13');
 assert.match(await done().getAttribute('class'),/checked/);
 pass('Weight, reps and completion survive browser reload');
 await page.locator('.exercise-options > summary').click();await page.locator('[data-machine="DUMBBELL"]').click();
 await input('kg').fill('15');
 await input('reps').fill('11');
 await done().click();
 await page.locator('[data-machine="MG-PL23"]').click();
 assert.equal(await input('kg').inputValue(),'42.5');
 await page.locator('[data-machine="DUMBBELL"]').click();
 assert.equal(await input('kg').inputValue(),'15');
 pass('Changing machine preserves each variant separately');
 await page.locator('[data-area="core"]').click();
 await page.locator('[data-core="0"]').click();
 await page.locator('#enable-core').check();
 await input('kg').fill('20');
 await input('reps').fill('15');
 await done().click();
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#enable-core').waitFor();
 assert.equal(await page.locator('#enable-core').isChecked(),true);
 assert.equal(await input('kg').inputValue(),'20');
 assert.match(await done().getAttribute('class'),/checked/);
 pass('CORE BONUS selection and edited set survive reload');
 await page.waitForTimeout(350);
 const local=JSON.parse(await page.evaluate(()=>localStorage.getItem('zenek-gym-v1')));
 const fromIDB=await idbSnapshot();
 assert.ok(local&&fromIDB);
 assert.equal(fromIDB.sessions[Object.keys(fromIDB.sessions).find(k=>k.endsWith('-2'))].exercises['core-crunch'].variants.CABLE.sets[0].kg,'20');
 pass('Independent localStorage and IndexedDB copies exist');
 await page.locator('[data-view="settings"]').click();
 assert.equal(await page.locator('#import-database').count(),1,'Import JSON control is visible');
 assert.equal(await page.locator('#export').count(),1,'Full JSON export control exists');
 assert.equal(await page.locator('#exportcsv').count(),1,'Full CSV export control exists');
 assert.equal(await page.locator('#report').count(),0,'Emergency text report is removed');
 assert.equal(await page.locator('#cloud-sync').count(),0,'Manual refresh button removed');
 pass('Simplified Data tab renders Import, Export and a cloud connection status');
 await page.locator('[data-view="train"]').click();
 assert.equal(await page.locator('.week-grid .week-day').count(),7,'Seven-day calendar is available on Azure');
 assert.equal(await page.locator('#save-training').count(),1,'One explicit Save action is displayed');
 assert.equal(await page.locator('.train-save-dock').count(),0,'No fixed Save button overlays exercises');
 assert.equal(await page.locator('.train-save-section #save-training').count(),1,'Save is available inside the workout flow');
 if(process.env.GYM_REQUIRE_LATEST_UI==='1')
  assert.equal(await page.locator('#workout-type').count(),1,'Per-date workout type selection exists after deployment');
 await page.locator('[data-view="history"]').click();
 assert.equal(await page.locator('#trend-exercise').count(),1,'History contains trend filters');
 assert.equal(await page.locator('.history-edit-button').count(),0,'No editing in History');
 await page.locator('#trend-exercise').selectOption('shoulder');
 await page.locator('#trend-machine').selectOption('MG-PL23');
 assert.match(await page.locator('.trend-stats').innerText(),/42,5/,'Auto-saved exercise should appear in progress');
 await page.reload({waitUntil:'domcontentloaded'});
 await page.locator('#trend-exercise').selectOption('shoulder');
 await page.locator('#trend-machine').selectOption('MG-PL23');
 assert.match(await page.locator('.trend-stats').innerText(),/42,5/,'Trends survive reload');
 pass('Seven-day calendar and trends survive refresh on deployed Azure');
 if(process.env.GYM_REQUIRE_LATEST_UI==='1'){
  assert.equal(await page.locator('#weekly-summary').count(),1);
  assert.equal(await page.locator('#personal-records').count(),1);
  assert.ok(await page.locator('#cloud-save-status').innerText());
  await page.locator('[data-view="train"]').click();
  assert.equal(await page.locator('.workout-versions').count(),1);
  pass('Deployed app includes personal records, weekly summaries, save status and version history');
 }
 assert.equal(errors.length,0,'JavaScript errors: '+errors.join('; '));
 pass('No uncaught browser JavaScript errors');
 console.log('SUCCESS: '+checks+' real-browser checks against Azure');
} catch(e) {
 console.error('FAILED after '+checks+' checks:',e);
 await page.screenshot({path:'e2e-failure.png',fullPage:true}).catch(()=>{});
 process.exitCode=1;
} finally {
 await browser.close();
}
