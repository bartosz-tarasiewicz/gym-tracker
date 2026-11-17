import {test,expect,date,weight,done,seed,record} from './fixtures.mjs';
test('weekly totals and personal records ignore suggestions and warmups and stay separate by profile',async({app:p,db})=>{
 seed(db,'2026-11-13','60');seed(db,'2026-11-06','55');await p.reload();await p.locator('[data-view="history"]').click();await expect(p.locator('#weekly-summary tbody tr')).toHaveCount(2);await expect(p.locator('#weekly-summary tbody tr').first()).toContainText('2026-11-09');await expect(p.locator('#weekly-summary tbody tr').first()).toContainText('720');
 await p.locator('#personal-records summary').first().click();await expect(p.locator('#personal-records')).toContainText('60 kg × 12');await expect(p.locator('#personal-records')).not.toContainText('999');
 await p.locator('#add-profile').click();await p.locator('#profile-name').fill('Bez rekordów');await p.locator('#profile-form [type="submit"]').click();await expect(p.locator('#active-profile option:checked')).toHaveText('Bez rekordów');await p.locator('[data-view="history"]').click();await expect(p.locator('#weekly-summary')).toContainText('Brak wykonanych serii');await expect(p.locator('#personal-records')).toContainText('Potwierdź serie');
});

test('the same custom exercise measured in seconds and reps has separate records and charts',async({app:p,db})=>{
 for(const [date,mode,reps] of [['2026-11-13','reps',10],['2026-11-20','sec',40]]){const data={date,day:5,planDefinition:{id:'plan-test',name:'Plan',dayType:5,items:[{id:'custom-test',title:'Ruch własny',options:['DUMBBELL'],mode,work:[[10,reps]],warm:[]}]},exercises:{'custom-test':{machine:'DUMBBELL',sets:[{kg:'10',reps:String(reps),done:true}]}}};db.store.set('history:'+date,{kind:'history',record:data,etag:'"'+date+'"'});}
 await p.reload();await p.locator('[data-view="history"]').click();await p.locator('#trend-exercise').selectOption('custom-test');await expect(p.locator('#trend-mode')).toBeVisible();await p.locator('#trend-mode').selectOption('sec');await expect(p.locator('.trend-stats')).toContainText('40 s');await expect(p.locator('.trend-history')).toContainText('2026-11-20');await expect(p.locator('.trend-history')).not.toContainText('2026-11-13');await expect(p.locator('#personal-records details')).toHaveCount(2);
 await p.locator('#trend-mode').selectOption('reps');await expect(p.locator('.trend-history')).toContainText('2026-11-13');await expect(p.locator('.trend-history')).not.toContainText('2026-11-20');
});

test('timer survives reload, stops explicitly, and previous values appear beside each working set',async({app:p,db})=>{
 seed(db);await p.reload();await date(p,'2026-11-20');await expect(p.locator('.previous-compact')).toContainText('60 kg × 12');await p.locator('.rest-timer > summary').click();await p.locator('#rest-duration').selectOption('60');await p.locator('#rest-start').click();await p.reload();await expect(p.locator('#rest-remaining')).toHaveText(/^(1:00|0:5\d)$/);await p.locator('.rest-timer > summary').click();await p.locator('#rest-skip').click();await p.reload();await expect(p.locator('#rest-remaining')).toHaveText('—');
});
