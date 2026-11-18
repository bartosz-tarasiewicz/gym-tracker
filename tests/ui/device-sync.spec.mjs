import {test,expect,date,weight,reps,done} from './fixtures.mjs';
const day='2026-11-13';
async function openPhone(browser,db){
 const phone=await browser.newPage();await phone.goto(db.base);await date(phone,day);return phone;
}
async function save(p){
 await p.locator('#save-training').click();await expect(p.locator('#toast')).toContainText('Zapisano w Azure');
}
test('two devices: viewed day refreshes, concurrent edits compare and stale decisions cannot overwrite',async({app:desk,db,browser})=>{
 await date(desk,day);
 const phone=await openPhone(browser,db);
 try{
  await weight(phone).fill('73');await done(phone).click();await save(phone);
  await desk.evaluate(()=>GymCloud.refreshAutomatically());
  await expect(weight(desk)).toHaveValue('73');
  await weight(desk).fill('81');
  await weight(phone).fill('79');await save(phone);
  await desk.evaluate(()=>GymCloud.refreshAutomatically());
  await expect(weight(desk)).toHaveValue('81');
  await desk.getByText('Porównaj zmiany',{exact:true}).click();
  await expect(desk.locator('.comparison-row').filter({hasText:'79 kg'})).toContainText('81 kg');
  await weight(phone).fill('80');await save(phone);
  desk.once('dialog',d=>d.accept());await desk.locator('#choose-local').click();
  await expect(desk.locator('.comparison-row').filter({hasText:'80 kg'})).toHaveCount(1);
  await desk.getByText('Porównaj zmiany',{exact:true}).click();
  desk.once('dialog',d=>d.accept());await desk.locator('#choose-cloud').click();
  await expect(weight(desk)).toHaveValue('80');await expect(desk.locator('.conflict-details')).toHaveCount(0);
  expect(db.operations.filter(op=>op.method==='PUT')).toHaveLength(3);
 }finally{await phone.close();}
});
test('offline explicit save survives reload and replays only its saved values',async({app:p,db})=>{
 await date(p,day);await weight(p).fill('83');await reps(p).fill('9');await done(p).click();
 await p.route('**/api/workouts**',r=>r.fulfill({status:503,body:'offline'}));
 p.once('dialog',d=>d.accept());await p.locator('#save-training').click();
 await expect(p.locator('#cloud-save-status')).toContainText('oczekuje');
 await weight(p).fill('85');await p.reload();await expect(weight(p)).toHaveValue('85');
 await p.unroute('**/api/workouts**');await p.evaluate(()=>GymCloud.refreshAutomatically());
 await expect.poll(()=>db.store.size).toBe(1);
 const saved=[...db.store.values()][0].record;expect(saved.exercises.legpress.variants['MG-PL70'].sets[0].kg).toBe('83');
 await expect(weight(p)).toHaveValue('85');await expect(p.locator('.conflict-details')).toHaveCount(0);
});
test('upgrade: a legacy dirty flag on an empty template cannot hide the phone workout',async({app:p,db})=>{
 await date(p,day);
 await p.evaluate(date=>{
  const key=date+'-5';
  state.sessions[key]={date,day:5,exercises:{},notes:'',coreEnabled:{},planDefinition:GymPlans.builtIn(5)};
  state.unsavedDates=[date+'|5'];save(false);
 },day);
 const saved={date:day,day:5,notes:'Z telefonu',exercises:{legpress:{machine:'MG-PL70',sets:[{kg:'73',reps:'12',done:true}]}}};
 db.store.set('draft:'+day+'-5',{kind:'draft',record:saved,etag:'"phone"'});
 await p.reload();await expect(weight(p)).toHaveValue('73');await expect(done(p)).toHaveClass(/checked/);
 await expect(p.locator('.conflict-details')).toHaveCount(0);
 expect(db.operations).toEqual([]);
});
