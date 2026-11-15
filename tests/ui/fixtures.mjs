import {test as base,expect} from '@playwright/test';
import {startServer} from '../helpers/server.mjs';
export {expect};
export const test=base.extend({
 db:async({},use)=>{const db=await startServer();try{await use(db)}finally{await new Promise(r=>{db.server.close(r);db.server.closeAllConnections()})}},
 app:async({page,db},use)=>{
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.goto(db.base);await expect(page.locator('#active-profile')).toBeEnabled();
  await expect.poll(()=>page.evaluate(()=>GymCloud.isBusy())).toBe(false);
  await use(page);expect(errors).toEqual([]);
 }
});
export async function date(page,value='2026-11-13'){
 await expect(page.locator('#active-profile')).toBeEnabled();
 await expect.poll(()=>page.evaluate(()=>GymCloud.isBusy())).toBe(false);
 await page.locator('#week-date').fill(value);await page.locator('#week-date').dispatchEvent('change');await expect(page.locator('#week-date')).toHaveValue(value);
}
export const reps=p=>p.locator('input[data-type="work"][data-field="reps"]').first();
export const weight=p=>p.locator('input[data-type="work"][data-field="kg"]').first();
export const done=p=>p.locator('.done-button[data-type="work"]').first();
export const record=(date='2026-11-13',kg='60')=>({date,day:5,notes:'Fixture',exercises:{legpress:{machine:'MG-PL70',variants:{'MG-PL70':{sets:[{kg,reps:'12',done:true},{kg:'999',reps:'99',done:false}],warmups:[{kg:'10',reps:'10',done:true}],rir:'2'}}}}});
export function seed(db,day='2026-11-13',kg='60'){
 const id='history:test-'+day;db.store.set(id,{kind:'history',record:record(day,kg),etag:'"seed"'});return id;
}
export async function upload(page,data){await page.locator('#import-database').setInputFiles({name:'test.json',mimeType:'application/json',buffer:Buffer.from(typeof data==='string'?data:JSON.stringify(data))})}
