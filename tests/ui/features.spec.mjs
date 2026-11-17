import {test,expect,date,reps,weight,done,seed,record,upload} from './fixtures.mjs';

async function openExerciseOptions(p){
 const details=p.locator('.exercise-options');
 if(!await details.evaluate(el=>el.open))await details.locator('summary').click();
}
async function openRestControls(p){
 const details=p.locator('.rest-timer');
 if(!await details.evaluate(el=>el.open))await details.locator('summary').click();
}

test('mobile training focus: one active exercise, progressive disclosure and save control',async({app:p})=>{
 await date(p,'2026-11-09');
 await expect(p.locator('.exercise-tab')).toHaveCount(4);
 await expect(p.locator('.active-exercise')).toHaveCount(1);
 await expect(p.locator('.exercise-options')).not.toHaveAttribute('open','');
 await expect(p.locator('.movement-img:visible')).toHaveCount(0);
 await expect(p.locator('#save-training')).toBeVisible();
 await expect(p.locator('.day-progress')).toContainText('serii wykonanych');
 await openExerciseOptions(p);
 await expect(p.locator('[data-machine="MG-PL13"]')).toBeVisible();
 await p.locator('[data-item="1"]').click();
 await expect(p.locator('.exercise-options')).not.toHaveAttribute('open','');
 await expect(p.locator('.active-exercise .title')).toContainText('Wyciskanie na skosie');
});

test('calendar: weeks, arbitrary date, today, no writes from navigation',async({app:p,db})=>{
 await date(p,'2026-12-31');await p.locator('[data-week="7"]').click();await expect(p.locator('#week-date')).toHaveValue('2027-01-07');
 await p.locator('[data-week="-7"]').click();await expect(p.locator('#week-date')).toHaveValue('2026-12-31');
 await p.locator('[data-week="today"]').click();const today=await p.evaluate(()=>GymWeek.iso(new Date()));await expect(p.locator('#week-date')).toHaveValue(today);
 await expect(p.locator('.week-day')).toHaveCount(7);expect(db.operations).toEqual([]);
});

test('sets: require reps, toggle completion, nudge floor, RIR and added set persist',async({app:p})=>{
 await date(p);await reps(p).fill('');await done(p).click();await expect(done(p)).not.toHaveClass(/checked/);await expect(p.locator('#toast')).toContainText('Uzupełnij');
 await reps(p).fill('0');await p.locator('[data-nudge="-1"][data-type="work"]').first().click();await expect(reps(p)).toHaveValue('0');
 await p.locator('[data-nudge="1"][data-type="work"]').first().click();await expect(reps(p)).toHaveValue('1');
 await done(p).click();await expect(done(p)).toHaveClass(/checked/);await done(p).click();await expect(done(p)).not.toHaveClass(/checked/);
 await p.locator('#rir').selectOption('3+');const n=await p.locator('.done-button[data-type="work"]').count();await p.locator('#addset').click();await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(n+1);
 await p.reload();await expect(p.locator('#rir')).toHaveValue('3+');await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(n+1);
});

test('sets: mark all skips empty rows and additional sets stop at fifteen',async({app:p})=>{
 await date(p);await p.locator('#addset').click();await p.locator('#markall').click();
 const rows=p.locator('.done-button[data-type="work"]');await expect(rows.last()).not.toHaveClass(/checked/);await expect(rows.first()).toHaveClass(/checked/);
 for(let n=await rows.count();n<16;n++)await p.locator('#addset').click();await expect(rows).toHaveCount(15);await expect(p.locator('#toast')).toContainText('Maksymalnie 15');
});

test('exercise navigation: previous/next boundaries and direct selection',async({app:p})=>{
 await date(p);await expect(p.locator('#prev')).toBeDisabled();await p.locator('#next').click();await expect(p.locator('[data-item="1"]')).toHaveClass(/active/);
 await p.locator('#prev').click();await expect(p.locator('[data-item="0"]')).toHaveClass(/active/);
 await p.locator('[data-item]').last().click();await expect(p.locator('#next')).toBeDisabled();
});

test('profiles: whitespace rejected, cancel clears form, HTML name rendered as text',async({app:p})=>{
 await p.locator('#add-profile').click();await p.locator('#profile-name').fill('   ');await p.locator('#profile-form [type="submit"]').click();await expect(p.locator('#profile-error')).toContainText('Wpisz nazwę');
 await p.locator('#cancel-profile').click();await expect(p.locator('#profile-form')).toHaveCount(0);await p.locator('#add-profile').click();await expect(p.locator('#profile-name')).toHaveValue('');
 await p.locator('#profile-name').fill('<b>Anna</b>');await p.locator('#profile-form [type="submit"]').click();await expect(p.locator('#active-profile option:checked')).toHaveText('<b>Anna</b>');await expect(p.locator('#profiles b')).toHaveCount(0);
});

for(const [name,payload] of [
 ['malformed JSON','{oops'],['unsupported format',{}],['empty export',{format:'gym-tracker-db-export-v1',workouts:[]}],
 ['impossible date',{format:'gym-tracker-db-export-v1',workouts:[{id:'history:x',kind:'history',record:record('2026-02-30')}]}],
 ['duplicate ID',{format:'gym-tracker-db-export-v1',workouts:[1,2].map(()=>({id:'history:x',kind:'history',record:record()}))}],
 ['mismatched record kind',{format:'gym-tracker-db-export-v1',workouts:[{id:'draft:x',kind:'history',record:record()}]}]
])test('import rejects '+name+' without writes',async({app:p,db})=>{
 await p.locator('[data-view="settings"]').click();const dialog=p.waitForEvent('dialog');await upload(p,payload);const d=await dialog;expect(d.type()).toBe('alert');await d.accept();expect(db.operations).toEqual([]);await expect(p.locator('#import-database')).toHaveValue('');
});

test('import cancellation keeps cloud and local training unchanged',async({app:p,db})=>{
 await p.locator('[data-view="settings"]').click();const dialog=p.waitForEvent('dialog');await upload(p,{format:'gym-tracker-db-export-v1',workouts:[{id:'history:x',kind:'history',record:record()}]});const d=await dialog;expect(d.type()).toBe('confirm');await d.dismiss();await expect(p.locator('#import-database')).toHaveValue('');expect(db.store.size).toBe(0);expect(db.operations).toEqual([]);
});

test('historical edit: reject leaving, discard leaving, source never changes',async({app:p,db})=>{
 const id=seed(db);await p.reload();await date(p);await weight(p).fill('77');
 p.once('dialog',d=>d.dismiss());await p.locator('[data-view="history"]').click();await expect(weight(p)).toHaveValue('77');
 p.once('dialog',d=>d.accept());await p.locator('[data-view="history"]').click();await expect(p.locator('#trend-exercise')).toBeVisible();await p.locator('[data-view="train"]').click();await expect(weight(p)).toHaveValue('60');expect(db.store.get(id).record.exercises.legpress.variants['MG-PL70'].sets[0].kg).toBe('60');expect(db.operations).toEqual([]);
});

test('failed cloud save retains edits through reload and succeeds on retry',async({app:p,db})=>{
 await date(p);await weight(p).fill('71');await reps(p).fill('12');await done(p).click();
 await p.route('**/api/workouts**',route=>route.fulfill({status:503,body:'unavailable'}));p.once('dialog',d=>d.accept());await p.locator('#save-training').click();await expect(p.locator('#save-training')).toBeEnabled();await p.reload();await expect(weight(p)).toHaveValue('71');await expect(done(p)).toHaveClass(/checked/);expect(db.store.size).toBe(0);
 await p.unroute('**/api/workouts**');await p.locator('#save-training').click();await expect.poll(()=>db.store.size).toBe(1);await expect(p.locator('#toast')).toContainText('Zapisano');
});

test('ETag conflict cannot overwrite another device and retains edited form',async({app:p,db})=>{
 const id=seed(db);await p.reload();await date(p);await weight(p).fill('72');
 await p.route('**/api/workouts/**',route=>route.request().method()==='PUT'?route.fulfill({status:409,json:{error:'workout_changed'}}):route.continue());
 p.once('dialog',d=>d.accept());await p.locator('#save-training').click();await expect(p.locator('#save-training')).toBeEnabled();await expect(weight(p)).toHaveValue('72');expect(db.store.get(id).record.exercises.legpress.variants['MG-PL70'].sets[0].kg).toBe('60');
});

test('progress: checked work only, metrics, range, chart, read-only source',async({app:p,db})=>{
 for(let i=1;i<=8;i++)seed(db,'2026-11-'+String(i).padStart(2,'0'),String(50+i));
 await p.reload();await p.locator('[data-view="history"]').click();await p.locator('#trend-exercise').selectOption('legpress');await p.locator('#trend-machine').selectOption('MG-PL70');
 const stats=p.locator('.trend-stats');await expect(stats).toContainText('58 kg');await expect(p.locator('.trend-point')).toHaveCount(8);
 await p.locator('[data-trend-metric="reps"]').click();await expect(stats).toContainText('12 powt.');await p.locator('[data-trend-metric="volume"]').click();await expect(stats).toContainText('696');
 await p.locator('#trend-range').selectOption('6');await expect(p.locator('.trend-point')).toHaveCount(6);await p.locator('#trend-range').selectOption('all');await expect(p.locator('.trend-point')).toHaveCount(8);
 await p.locator('#trend-machine').selectOption('G7-S70');await expect(p.locator('.empty')).toContainText('Brak wykonanych');expect(db.operations).toEqual([]);
});

test('mobile layout: safe area, horizontal overflow and bottom navigation',async({app:p})=>{
 await p.evaluate(()=>document.documentElement.style.setProperty('--safe-top','59px'));expect((await p.locator('#profiles').boundingBox()).y).toBeGreaterThanOrEqual(59);
 for(const view of ['train','history','settings']){await p.locator('[data-view="'+view+'"]').click();expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);await expect(p.locator('.bottomnav')).toBeVisible();}
});

test('warmups and core: independent completion, seconds nudge and enabled state survive reload',async({app:p})=>{
 await date(p);const warm=p.locator('.done-button[data-type="warm"]').first();await warm.click();await expect(warm).toHaveClass(/checked/);await expect(done(p)).not.toHaveClass(/checked/);
 await p.locator('[data-area="core"]').click();await p.locator('[data-core="4"]').click();await p.locator('#enable-core').check();await reps(p).fill('30');await p.locator('[data-nudge="1"][data-type="work"]').first().click();await expect(reps(p)).toHaveValue('35');
 await done(p).click();await p.reload();await expect(reps(p)).toHaveValue('35');await expect(p.locator('#enable-core')).toBeChecked();await expect(done(p)).toHaveClass(/checked/);await done(p).click();await p.locator('#enable-core').uncheck();await p.reload();await expect(p.locator('#enable-core')).not.toBeChecked();
});

test('images: failed download offers instruction and keeps workout usable',async({app:p})=>{
 await p.route('**/assets/guides/**',route=>route.abort());await date(p,'2026-11-09');await openExerciseOptions(p);await p.locator('[data-machine="DUMBBELL"]').click();await p.locator('.exercise-media > summary').click();await p.locator('.movement-photos').scrollIntoViewIfNeeded();await expect(p.locator('.movement-photos figcaption').first()).toContainText('Zdjęcie niedostępne');await expect(p.locator('.detail')).toContainText('Jak wykonać');await weight(p).fill('64');await expect(weight(p)).toHaveValue('64');
});

for(const type of ['0','1','2','5'])test('catalogue: every exercise and variant of workout '+type,async({app:p})=>{
 test.setTimeout(90000);await date(p);await p.locator('#workout-type').selectOption(type);
 const n=await p.locator('[data-item]').count();expect(n).toBeGreaterThan(0);
 for(let i=0;i<n;i++){
  await p.locator('[data-item="'+i+'"]').click();
  const machines=await p.locator('[data-machine]').evaluateAll(xs=>xs.map(x=>x.dataset.machine));expect(machines.length).toBeGreaterThanOrEqual(2);
  for(const m of machines){await openExerciseOptions(p);await p.locator('[data-machine="'+m+'"]').click();await expect(p.locator('[data-machine="'+m+'"]')).toHaveAttribute('aria-pressed','true');await expect(p.locator('.detail')).toContainText('Jak wykonać');
   await p.locator('.exercise-media > summary').click();for(const img of await p.locator('.movement-img').all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate(x=>x.complete&&x.naturalWidth>0)).toBe(true);}
  }
 }
});

test('signed out: login link and failed save retain local results',async({app:p,db})=>{
 await p.route('**/.auth/me',r=>r.fulfill({json:{clientPrincipal:null}}));await p.reload();await date(p);await weight(p).fill('66');await done(p).click();p.once('dialog',d=>d.accept());await p.locator('#save-training').click();await expect(weight(p)).toHaveValue('66');await p.locator('[data-view="settings"]').click();await expect(p.locator('a[href*="/.auth/login/github"]')).toBeVisible();expect(db.operations).toEqual([]);
});

test('offline PWA: cached shell, offline edits and persistence without caching private API responses',async({app:p,context,db,browserName})=>{
 // localhost is a secure context; production registers automatically on HTTPS.
 await p.evaluate(async()=>{await navigator.serviceWorker.register('/sw.js');await navigator.serviceWorker.ready});
 await expect.poll(()=>p.evaluate(()=>!!navigator.serviceWorker.controller)).toBe(true);
 await date(p);await weight(p).fill('67');await done(p).click();await p.evaluate(()=>GymStorage.flush());
 const privateUrls=await p.evaluate(async()=>{const urls=[];for(const key of await caches.keys())for(const r of await (await caches.open(key)).keys())if(/\/api\/|\/\.auth\//.test(r.url))urls.push(r.url);return urls});expect(privateUrls).toEqual([]);
 // Playwright WebKit can fail internally before dispatching offline navigations
 // to the service worker. Exercise offline editing + persistence there; Chromium
 // additionally verifies a complete offline navigation. Do not mask reload errors.
 if(browserName==='webkit'){
  test.info().annotations.push({type:'coverage',description:'WebKit: offline editing and cache verified; offline navigation is covered in Chromium because WebKit automation fails internally.'});
  const cachedScripts=await p.evaluate(async()=>{const names=['app.js','storage.js','sync.js','profiles.js'];return Promise.all(names.map(n=>caches.match(new URL(n,location.href)).then(Boolean)))});
  expect(cachedScripts).toEqual([true,true,true,true]);
  await context.setOffline(true);await weight(p).fill('68');await p.evaluate(()=>GymStorage.flush());await expect(weight(p)).toHaveValue('68');
  await context.setOffline(false);await p.reload();await expect(weight(p)).toHaveValue('68');await expect(done(p)).toHaveClass(/checked/);
 }else{
  await context.setOffline(true);
  try{await p.reload();await expect(weight(p)).toHaveValue('67');await expect(done(p)).toHaveClass(/checked/)}finally{await context.setOffline(false)}
 }
});

test('catalogue core: every optional exercise, variants and units',async({app:p})=>{
 test.setTimeout(90000);await date(p);await p.locator('[data-area="core"]').click();
 const n=await p.locator('[data-core]').count();expect(n).toBeGreaterThan(0);
 for(let i=0;i<n;i++){
  await p.locator('[data-core="'+i+'"]').click();await expect(p.locator('#enable-core')).toBeVisible();
  const machines=await p.locator('[data-machine]').evaluateAll(xs=>xs.map(x=>x.dataset.machine));expect(machines.length).toBeGreaterThanOrEqual(2);
  for(const m of machines){await openExerciseOptions(p);await p.locator('[data-machine="'+m+'"]').click();await expect(p.locator('.detail')).toContainText('Jak wykonać');await p.locator('.exercise-media > summary').click();for(const img of await p.locator('.movement-img').all()){await img.scrollIntoViewIfNeeded();await expect.poll(()=>img.evaluate(x=>x.complete&&x.naturalWidth>0)).toBe(true);}}
 }
});


test('import file picker survives background cloud refresh',async({app:p})=>{
 await p.locator('[data-view="settings"]').click();
 const picker=await p.locator('#import-database').elementHandle();
 await p.evaluate(()=>GymCloud.refreshAutomatically());
 await expect.poll(()=>p.evaluate(()=>GymCloud.isBusy())).toBe(false);
 expect(await picker.evaluate(el=>el.isConnected&&el===document.getElementById('import-database'))).toBe(true);
 const dialog=p.waitForEvent('dialog');await upload(p,{});const d=await dialog;expect(d.type()).toBe('alert');await d.accept();
});


test('uniform exercise layout: instructions and sets stay visible, media opens on demand',async({app:p})=>{
 await date(p,'2026-11-09');
 for(const machine of ['MG-PL13','DUMBBELL']){
  await openExerciseOptions(p);await p.locator('[data-machine="'+machine+'"]').click();
  await expect(p.locator('.movement-instruction')).toContainText('Oprzyj plecy');
  await expect(p.locator('.exercise-media')).not.toHaveAttribute('open','');
  await expect(p.locator('.movement-img:visible')).toHaveCount(0);
  await expect(p.locator('input[data-type="warm"][data-field="kg"]').first()).toBeVisible();
  await weight(p).fill(machine==='MG-PL13'?'70':'20');
  await p.locator('.exercise-media > summary').click();
  await expect(p.locator('.exercise-media')).toHaveAttribute('open','');
  if(machine==='MG-PL13')await expect(p.locator('.machine-reference')).toBeVisible();
  else await expect(p.locator('.movement-img')).toHaveCount(2);
  await p.locator('.exercise-media > summary').click();
  await expect(p.locator('.exercise-media')).not.toHaveAttribute('open','');
 }
 await openExerciseOptions(p);await p.locator('[data-machine="MG-PL13"]').click();await expect(weight(p)).toHaveValue('70');
 await p.locator('[data-machine="DUMBBELL"]').click();await expect(weight(p)).toHaveValue('20');
});

test('machine settings stay separate by profile, exercise and variant and sync to a second device',async({app:p,db,browser})=>{
 await date(p,'2026-11-13');await openExerciseOptions(p);await p.locator('#machine-note').fill('Siedzisko 4');
 await expect.poll(()=>db.profileSettings.get('default')?.settings.preferences.machineNotes?.['legpress|MG-PL70']).toBe('Siedzisko 4');
 await p.locator('[data-machine="G7-S70"]').click();await expect(p.locator('#machine-note')).toHaveValue('');await p.locator('#machine-note').fill('Siedzisko 2');
 await expect.poll(()=>db.profileSettings.get('default')?.settings.preferences.machineNotes?.['legpress|G7-S70']).toBe('Siedzisko 2');
 await p.locator('[data-item="1"]').click();await openExerciseOptions(p);await expect(p.locator('#machine-note')).toHaveValue('');
 const c=await browser.newContext({viewport:{width:390,height:844}}),other=await c.newPage();try{await other.goto(db.base);await expect(other.locator('#active-profile')).toBeEnabled();await date(other,'2026-11-13');await openExerciseOptions(other);await expect(other.locator('#machine-note')).toHaveValue('Siedzisko 4');}finally{await c.close()}
 await p.locator('#add-profile').click();await p.locator('#profile-name').fill('Nowy');await p.locator('#profile-form [type="submit"]').click();await expect(p.locator('#active-profile option:checked')).toHaveText('Nowy');await date(p,'2026-11-13');await openExerciseOptions(p);await expect(p.locator('#machine-note')).toHaveValue('');
});

test('previous results ignore empty newer sessions and copying never confirms work sets',async({app:p,db})=>{
 seed(db,'2026-11-13','60');const empty=record('2026-11-20','80');empty.exercises.legpress.variants['MG-PL70'].sets.forEach(s=>s.done=false);db.store.set('history:empty',{kind:'history',record:empty,etag:'"empty"'});
 await p.reload();await date(p,'2026-11-27');await expect(p.locator('.previous-compact')).toContainText('2026-11-13');await expect(p.locator('.previous-compact')).toContainText('60 kg × 12');
 p.once('dialog',d=>d.dismiss());await p.locator('#copy-previous').click();await expect(weight(p)).not.toHaveValue('60');expect(await p.evaluate(()=>Object.values(state.sessions).some(s=>s.date==='2026-11-27'))).toBe(false);
 p.once('dialog',d=>d.accept());await p.locator('#copy-previous').click();await expect(weight(p)).toHaveValue('60');await expect(reps(p)).toHaveValue('12');await expect(done(p)).not.toHaveClass(/checked/);await p.reload();await expect(weight(p)).toHaveValue('60');await expect(done(p)).not.toHaveClass(/checked/);
});

test('rest timer is optional, starts after completion, survives rerenders and counts real elapsed time',async({app:p,db})=>{
 await date(p);await openRestControls(p);await p.locator('#rest-duration').selectOption('60');await p.locator('#rest-auto').check();await expect.poll(()=>db.profileSettings.get('default')?.settings.preferences.restTimer?.auto).toBe(true);await p.clock.install();await p.clock.pauseAt(new Date());
 await done(p).click();await expect(p.locator('#rest-remaining')).toHaveText('1:00');await p.clock.fastForward(15000);await p.evaluate(()=>updateRestTimer());await expect(p.locator('#rest-remaining')).toHaveText('0:45');await p.locator('[data-rest-adjust="15"]').click();await expect(p.locator('#rest-remaining')).toHaveText('1:00');
 await p.locator('[data-item="1"]').click();await expect(p.locator('#rest-remaining')).toHaveText(/^(1:00|0:5[5-9])$/);await p.locator('#rest-skip').click();await expect(p.locator('#rest-remaining')).toHaveText('—');
});

test('machine note edited during synchronization is sent after the first save',async({app:p,db})=>{
 await date(p);let release;const gate=new Promise(resolve=>release=resolve);let first=true,startedResolve;const started=new Promise(resolve=>startedResolve=resolve);
 await p.route('**/api/profile-settings?*',async route=>{if(route.request().method()==='PUT'&&first){first=false;startedResolve();await gate}await route.continue()});
 await openExerciseOptions(p);await p.locator('#machine-note').fill('pierwsza');await started;await p.locator('#machine-note').fill('ostateczna');await p.waitForTimeout(650);release();
 await expect.poll(()=>db.profileSettings.get('default')?.settings.preferences.machineNotes?.['legpress|MG-PL70'],{timeout:10000}).toBe('ostateczna');
});
