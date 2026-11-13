import assert from 'node:assert/strict';
import fs from 'node:fs';
import { chromium } from 'playwright';

const URL = 'https://salmon-bush-06df5a710.8.azurestaticapps.net/';
const browser = await chromium.launch({headless:true});
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
 await page.locator('[data-day="2"]').click();
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
 await page.locator('#machine').selectOption('DUMBBELL');
 await input('kg').fill('15');
 await input('reps').fill('11');
 await done().click();
 await page.locator('#machine').selectOption('MG-PL23');
 assert.equal(await input('kg').inputValue(),'42.5');
 await page.locator('#machine').selectOption('DUMBBELL');
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
 assert.match(await page.locator('#report').inputValue(),/42.5 × 13/);
 assert.match(await page.locator('#report').inputValue(),/20 × 15/);
 pass('Emergency report contains actual completed series');
 const jsonDownload=page.waitForEvent('download');
 await page.locator('#export').click();
 const j=await jsonDownload;
 const backup=JSON.parse(fs.readFileSync(await j.path(),'utf8'));
 assert.ok(backup.sessions&&Array.isArray(backup.history));
 pass('JSON export generates a valid backup');
 const csvDownload=page.waitForEvent('download');
 await page.locator('#exportcsv').click();
 const c=await csvDownload;
 const csv=fs.readFileSync(await c.path(),'utf8');
 assert.ok(csv.includes('42.5')&&csv.includes('15')&&csv.includes('20'));
 pass('CSV contains all completed machine and core sets');
 await page.locator('[data-view="train"]').click();
 page.once('dialog',dialog=>dialog.accept());
 await page.locator('#finish').click();
 await page.locator('[data-view="history"]').click();
 assert.match(await page.locator('#app').innerText(),/42.5 × 13/);
 await page.reload({waitUntil:'domcontentloaded'});
 assert.match(await page.locator('#app').innerText(),/42.5 × 13/);
 pass('Finished workout remains in history after reload');
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
