import {test,expect,date,weight,done} from './fixtures.mjs';

test('Matrix Pectoral Fly is visible in an older plan, has its own stack results and a cached product photo',async({app:p,db})=>{
 const definition={id:'old-chest',name:'Klatka',dayType:0,items:[{id:'fly',title:'Rozpiętki',options:['DUMBBELL'],work:[[12.5,12]],warm:[]}]};
 const record={date:'2026-11-16',day:0,planDefinition:definition,exercises:{fly:{machine:'DUMBBELL',variants:{DUMBBELL:{sets:[{kg:'12.5',reps:'12',done:true}],warmups:[]}}}}};
 db.store.set('history:fly',{kind:'history',record,etag:'"fly"'});await p.reload();await date(p,'2026-11-16');await p.locator('.exercise-options > summary').click();
 const button=p.locator('[data-machine="G3-S12"]');await expect(button).toHaveText('Matrix Pectoral Fly · G3-S12');await expect(button).toBeVisible();
 expect(await button.evaluate(el=>{const box=el.getBoundingClientRect(),container=el.closest('.machine-options').getBoundingClientRect();return box.left>=container.left&&box.right<=container.right+1;})).toBe(true);
 expect(db.operations).toHaveLength(0);expect(db.store.get('history:fly').record.planDefinition).toEqual(definition);
 await button.click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(p.locator('.ex-note').first()).toContainText('Wskazanie stosu');await expect(weight(p)).toHaveValue('');await expect(done(p)).not.toHaveClass(/checked/);
 await weight(p).fill('45');await done(p).click();await p.locator('.exercise-media > summary').click();const photo=p.locator('.machine-reference img');await photo.scrollIntoViewIfNeeded();await expect(photo).toHaveAttribute('src','assets/photos/G3-S12.jpg');await expect.poll(()=>photo.evaluate(img=>img.complete&&img.naturalWidth>0)).toBe(true);
 await p.locator('[data-machine="DUMBBELL"]').click();await expect(weight(p)).toHaveValue('12.5');await expect(done(p)).toHaveClass(/checked/);await button.click();await expect(weight(p)).toHaveValue('45');await p.locator('#save-training').click();
 await expect.poll(()=>db.store.get('history:fly').record.exercises.fly.variants['G3-S12']?.sets[0].kg).toBe('45');expect(db.store.get('history:fly').record.planDefinition).toEqual(definition);expect(db.store.get('history:fly').record.exercises.fly.variants.DUMBBELL.sets[0].kg).toBe('12.5');
 await expect.poll(()=>p.evaluate(()=>savingWorkout||GymCloud.isBusy())).toBe(false);await p.reload();await expect(p.locator('#active-profile')).toBeEnabled();await expect.poll(()=>p.evaluate(()=>GymCloud.isBusy())).toBe(false);await p.locator('.exercise-options > summary').click();await expect(button).toHaveAttribute('aria-pressed','true');await expect(weight(p)).toHaveValue('45');await expect(done(p)).toHaveClass(/checked/);
});
