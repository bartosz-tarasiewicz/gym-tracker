import {test,expect,date,weight,done,seed,upload} from './fixtures.mjs';
const plan=()=>({id:'plan-test',name:'Mój trening A',dayType:5,items:[{id:'custom-test',title:'Moje przysiady',options:['DUMBBELL'],mode:'reps',tip:'Kontrolowany ruch',warm:[[5,8]],work:[[20,10],[20,10]]}]});
const library=()=>({version:1,plans:[plan()],weekdays:[null,null,null,null,'plan-test',null,null]});
async function loadPlans(p,db){db.profileSettings.set('default',{settings:{preferences:{},plans:library()},etag:'"plans"'});await p.reload();await expect.poll(()=>p.evaluate(()=>GymPlans.library().plans.length)).toBe(1);}
const action=(p,key)=>p.locator('[data-plan-action="'+key+'"]');
async function edit(p){await p.locator('.navitem[data-view="plans"]').click();await action(p,'edit').first().click();}
async function save(p){await p.locator('#plan-form [type="submit"]').click();await expect(p.locator('#plan-form')).toHaveCount(0);}
async function downloadJSON(p,locator){const event=p.waitForEvent('download');await locator.click();const stream=await (await event).createReadStream();let data='';for await(const chunk of stream)data+=chunk;return JSON.parse(data);}

test('plan editor: catalogue, custom exercise, defaults, ordering, remove, cancel and validation',async({app:p,db})=>{
 await p.locator('.navitem[data-view="plans"]').click();await action(p,'new').click();await p.locator('#plan-name').fill('Mój zestaw');
 await p.locator('[data-plan-item="0"] [data-plan-action="down"]').click();await expect(p.locator('[data-plan-item="0"] [data-plan-field="title"]')).toHaveValue('Wyciskanie na skosie');
 await p.locator('[data-plan-item="1"] [data-plan-action="remove"]').click();await expect(p.locator('.plan-item')).toHaveCount(3);
 await p.locator('#plan-catalog').selectOption('lat');await action(p,'add-catalog').click();await action(p,'add-custom').click();
 const custom=p.locator('.plan-item').last();await custom.locator('[data-plan-field="title"]').fill('Mój ruch');await custom.locator('[data-plan-field="machine"]').selectOption('BODY');await custom.locator('[data-plan-field="mode"]').selectOption('sec');
 await custom.locator('[data-plan-action="add-warm"]').click();await custom.locator('[data-plan-type="warm"] [data-plan-field="reps"]').fill('25');
 await custom.locator('[data-plan-type="work"] [data-plan-field="kg"]').first().fill('-2');await p.locator('#plan-form [type="submit"]').click();await expect(p.locator('#plan-form')).toBeVisible();expect(db.profileSettings.get('default')?.settings?.plans?.plans||[]).toEqual([]);
 await custom.locator('[data-plan-type="work"] [data-plan-field="kg"]').first().fill('0');await save(p);
 await expect.poll(()=>db.profileSettings.get('default')?.settings.plans.plans.length).toBe(1);const saved=db.profileSettings.get('default').settings.plans.plans[0];expect(saved.items.map(i=>i.id).slice(0,4)).toEqual(['incline','fly','pullover','lat']);expect(saved.items[4]).toMatchObject({title:'Mój ruch',mode:'sec',options:['BODY'],warm:[[0,25]]});
 await action(p,'edit').click();await p.locator('#plan-name').fill('Nie zapisuj');p.once('dialog',d=>d.accept());await action(p,'cancel').click();await expect(p.getByRole('heading',{name:'Mój zestaw',exact:true})).toBeVisible();
 expect(db.profileSettings.get('default').settings.plans.plans[0].name).toBe('Mój zestaw');
});

test('weekly plan, per-date selection, snapshots, undo and saved history survive later template changes',async({app:p,db})=>{
 const legacy=seed(db,'2026-11-13','60');await loadPlans(p,db);await date(p,'2026-11-20');await expect(p.getByRole('heading',{name:'Mój trening A',exact:true})).toBeVisible();await expect(weight(p)).toHaveValue('20');await done(p).click();await p.locator('#save-training').click();
 await expect.poll(()=>[...db.store.values()].find(x=>x.record.date==='2026-11-20')?.record.planDefinition?.name).toBe('Mój trening A');
 await edit(p);await p.locator('#plan-name').fill('Nowa wersja');await p.locator('[data-plan-field="title"]').fill('Nowa nazwa');await p.locator('[data-plan-type="work"] [data-plan-field="kg"]').first().fill('35');await save(p);
 await p.locator('[data-view="train"]').click();await expect(p.getByRole('heading',{name:'Mój trening A',exact:true})).toBeVisible();await expect(weight(p)).toHaveValue('20');await expect(done(p)).toHaveClass(/checked/);
 p.once('dialog',d=>d.accept());await p.locator('#workout-plan').selectOption('builtin-5');await expect(p.getByRole('heading',{name:'Nogi, pośladki i core',exact:true})).toBeVisible();await p.locator('#undo-training').click();await expect(p.getByRole('heading',{name:'Mój trening A',exact:true})).toBeVisible();await expect(done(p)).toHaveClass(/checked/);
 await date(p,'2026-11-27');await expect(weight(p)).toHaveValue('35');await expect(p.getByRole('heading',{name:'Nowa wersja',exact:true})).toBeVisible();
 await date(p,'2026-11-13');await expect(weight(p)).toHaveValue('60');await expect(p.getByRole('heading',{name:'Nogi, pośladki i core',exact:true})).toBeVisible();expect(db.store.get(legacy).record.planDefinition).toBeUndefined();
});

test('plan backups, custom workout export/import, progress and deletion preserve exercise metadata',async({app:p,db})=>{
 await loadPlans(p,db);await date(p,'2026-11-20');await done(p).click();await p.locator('#save-training').click();await expect.poll(()=>db.store.size).toBe(1);
 await p.locator('[data-view="history"]').click();await p.locator('#trend-exercise').selectOption('custom-test');await expect(p.locator('#trend-exercise option:checked')).toHaveText('Moje przysiady');await expect(p.locator('.trend-history')).toContainText('20');
 await p.locator('[data-view="settings"]').click();const backup=await downloadJSON(p,p.locator('#export'));expect(backup.workouts[0].record.planDefinition).toEqual(plan());
 await p.locator('.navitem[data-view="plans"]').click();const plans=await downloadJSON(p,action(p,'export'));expect(plans.library).toEqual(library());
 p.once('dialog',d=>d.accept());await action(p,'delete').click();await expect(action(p,'edit')).toHaveCount(0);await p.locator('[data-view="train"]').click();await expect(p.getByRole('heading',{name:'Mój trening A',exact:true})).toBeVisible();await expect(weight(p)).toHaveValue('20');
 await p.locator('.navitem[data-view="plans"]').click();p.once('dialog',d=>d.accept());await p.locator('#import-plans').setInputFiles({name:'plans.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify(plans))});await expect(action(p,'edit')).toHaveCount(1);
 backup.workouts[0].record.date='2026-12-04';backup.workouts[0].id='history:roundtrip';backup.workouts[0].kind='history';await p.locator('[data-view="settings"]').click();p.on('dialog',d=>d.accept());await upload(p,backup);await expect.poll(()=>[...db.store.values()].some(x=>x.record.date==='2026-12-04')).toBe(true);await p.locator('[data-view="train"]').click();await date(p,'2026-12-04');await expect(weight(p)).toHaveValue('20');await expect(done(p)).toHaveClass(/checked/);
});

test('plans and weekdays sync to another device and stay isolated by profile',async({app:p,db,browser})=>{
 await loadPlans(p,db);await p.locator('.navitem[data-view="plans"]').click();await p.locator('[data-plan-weekday="0"]').selectOption('plan-test');await expect.poll(()=>db.profileSettings.get('default')?.settings.plans.weekdays[0]).toBe('plan-test');
 const ctx=await browser.newContext(),other=await ctx.newPage();try{await other.goto(db.base);await expect.poll(()=>other.evaluate(()=>GymPlans.library().weekdays[0])).toBe('plan-test');await date(other,'2026-11-23');await expect(other.getByRole('heading',{name:'Mój trening A',exact:true})).toBeVisible();}finally{await ctx.close();}
 await p.locator('#add-profile').click();await p.locator('#profile-name').fill('Oddzielne plany');await p.locator('#profile-form [type="submit"]').click();await expect(p.locator('#active-profile option:checked')).toHaveText('Oddzielne plany');await p.locator('.navitem[data-view="plans"]').click();await expect(action(p,'edit')).toHaveCount(0);await expect(p.locator('[data-plan-weekday="0"]')).toHaveValue('');
});

test('unsaved plan survives background refresh and navigation requires discard; offline save synchronizes later',async({app:p,db,context})=>{
 await loadPlans(p,db);await edit(p);await p.locator('#plan-name').fill('Offline');await p.evaluate(()=>GymCloud.refreshAutomatically());await expect(p.locator('#plan-name')).toHaveValue('Offline');
 p.once('dialog',d=>d.dismiss());await p.locator('[data-view="train"]').click();await expect(p.locator('#plan-form')).toBeVisible();
 await context.setOffline(true);await save(p);expect(await p.evaluate(()=>GymPlans.library().plans[0].name)).toBe('Offline');await context.setOffline(false);await p.reload();await expect(action(p,'edit')).toHaveCount(1);await expect(p.getByRole('heading',{name:'Offline',exact:true})).toBeVisible();
 await context.setOffline(false);await p.evaluate(()=>GymProfiles.sync());await expect.poll(()=>db.profileSettings.get('default')?.settings.plans.plans[0].name,{timeout:15000}).toBe('Offline');
});

test('invalid plan import and capacity failure preserve current library and editor draft',async({app:p,db})=>{
 await loadPlans(p,db);await p.locator('.navitem[data-view="plans"]').click();const invalid=library();invalid.weekdays[0]='missing';await p.locator('#import-plans').setInputFiles({name:'invalid.json',mimeType:'application/json',buffer:Buffer.from(JSON.stringify({format:'gym-tracker-plans-v1',library:invalid}))});await expect(p.locator('#plan-error')).toContainText('nieistniejący');expect(await p.evaluate(()=>GymPlans.library())).toEqual(library());
 await action(p,'edit').click();await p.locator('#plan-name').fill('Nie utracę zmian');await p.evaluate(()=>GymProfiles.preference('testCapacity','x'.repeat(18000)));await p.locator('#plan-form [type="submit"]').click();await expect(p.locator('#plan-error')).toContainText('Brak miejsca');await expect(p.locator('#plan-name')).toHaveValue('Nie utracę zmian');expect(await p.evaluate(()=>GymPlans.library().plans[0].name)).toBe('Mój trening A');
});

test('duplicate and schedule changes preserve started unchecked workouts and type switching restores the original plan',async({app:p,db})=>{
 await loadPlans(p,db);const old=seed(db,'2026-11-13','60');await p.reload();await date(p,'2026-11-20');await weight(p).fill('23');await p.locator('#save-training').click();await expect.poll(()=>[...db.store.values()].find(x=>x.record.date==='2026-11-20')?.record.planDefinition?.id).toBe('plan-test');
 await p.locator('.navitem[data-view="plans"]').click();await action(p,'duplicate').click();await p.locator('#plan-name').fill('Plan B');await p.locator('[data-plan-field="dayType"]').selectOption('0');await save(p);const id=await p.evaluate(()=>GymPlans.library().plans[1].id);await p.locator('[data-plan-weekday="4"]').selectOption(id);
 await p.locator('[data-view="train"]').click();await expect(p.locator('#workout-type')).toHaveValue('5');await expect(weight(p)).toHaveValue('23');await expect(done(p)).not.toHaveClass(/checked/);await p.reload();await expect(p.locator('#workout-type')).toHaveValue('5');await expect(weight(p)).toHaveValue('23');
 await date(p,'2026-11-27');await expect(p.locator('#workout-type')).toHaveValue('0');await expect(p.getByRole('heading',{name:'Plan B',exact:true})).toBeVisible();
 await date(p,'2026-11-13');p.once('dialog',d=>d.accept());await p.locator('#workout-type').selectOption('0');await p.locator('#workout-type').selectOption('5');await expect(weight(p)).toHaveValue('60');await expect(p.getByRole('heading',{name:'Nogi, pośladki i core',exact:true})).toBeVisible();expect(db.store.get(old).record.planDefinition).toBeUndefined();
});

test('remote plan update cannot silently overwrite an open local editor draft',async({app:p,db})=>{
 await loadPlans(p,db);await edit(p);await p.locator('#plan-name').fill('Lokalna edycja');const remote=library();remote.plans[0].name='Z innego urządzenia';db.profileSettings.set('default',{settings:{preferences:{},plans:remote},etag:'"remote"'});await p.evaluate(()=>GymProfiles.sync());await expect.poll(()=>p.evaluate(()=>GymPlans.library().plans[0].name)).toBe('Z innego urządzenia');
 await p.locator('#plan-form [type="submit"]').click();await expect(p.locator('#plan-error')).toContainText('innym urządzeniu');await expect(p.locator('#plan-name')).toHaveValue('Lokalna edycja');expect(db.profileSettings.get('default').settings.plans.plans[0].name).toBe('Z innego urządzenia');
});
