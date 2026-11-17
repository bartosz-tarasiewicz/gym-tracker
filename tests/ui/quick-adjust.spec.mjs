import {test,expect,date,reps,weight,done,chooseExercise} from './fixtures.mjs';

async function openQuick(p,type='work',index=0){
 const toggle=p.locator('[data-quick-edit="'+type+'-'+index+'"]');
 await toggle.click();
 await expect(toggle).toHaveAttribute('aria-expanded','true');
 await expect(p.locator('.set-fast-edit')).toBeVisible();
}
const adjust=(p,field,dir)=>p.locator('.set-fast-edit [data-fast-field="'+field+'"][data-fast-dir="'+dir+'"]');

test('one-hand correction updates only selected row, persists after reload, and never requires keyboard',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await expect(p.locator('.set-fast-edit')).toHaveCount(0);
 await openQuick(p);
 await expect(p.locator('.fast-kg-step')).toHaveValue('2.5');
 await adjust(p,'kg','1').click();
 await expect(weight(p)).toHaveValue('72.5');
 await expect(p.locator('[data-fast-value="kg"]')).toHaveText('72.5');
 await adjust(p,'kg','-1').click();
 await expect(weight(p)).toHaveValue('70');
 await adjust(p,'reps','1').click();
 await expect(reps(p)).toHaveValue('12');
 await adjust(p,'reps','-1').click();
 await expect(reps(p)).toHaveValue('11');
 expect(await p.evaluate(()=>document.activeElement?.tagName)).not.toBe('INPUT');
 await expect(done(p)).not.toHaveClass(/checked/);
 await expect(p.locator('input[data-field="kg"][data-type="work"]').nth(1)).toHaveValue('65');
 await expect(p.locator('input[data-field="reps"][data-type="work"]').nth(1)).toHaveValue('11');
 expect(db.store.size).toBe(0);
 await p.reload();
 await expect(weight(p)).toHaveValue('70');
 await expect(reps(p)).toHaveValue('11');
 expect(db.store.size).toBe(0);
});

test('precision step is per machine, no floating point artifacts or negative values',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await openQuick(p);
 await p.locator('.fast-kg-step').selectOption('0.5');
 await adjust(p,'kg','1').click();
 await expect(weight(p)).toHaveValue('70.5');
 await p.locator('.fast-kg-step').selectOption('2.5');
 await adjust(p,'kg','1').click();
 await expect(weight(p)).toHaveValue('73');
 await p.locator('.exercise-options > summary').click();
 await p.locator('[data-machine="DUMBBELL"]').click();
 await openQuick(p);
 await expect(p.locator('.fast-kg-step')).toHaveValue('2.5');
 await p.locator('.exercise-options > summary').click();
 await p.locator('[data-machine="MG-PL13"]').click();
 await openQuick(p);
 await expect(p.locator('.fast-kg-step')).toHaveValue('2.5');
 await p.locator('.fast-kg-step').selectOption('0.5');
 await p.locator('input[data-type="work"][data-field="kg"]').first().fill('0');
 await adjust(p,'kg','-1').click();
 await expect(weight(p)).toHaveValue('0');
 await p.reload();
 await openQuick(p);
 await expect(p.locator('.fast-kg-step')).toHaveValue('0.5');
 expect(db.store.size).toBe(0);
});

test('stack defaults to a 1kg increment and manual keyboard edits update open quick panel',async({app:p})=>{
 await date(p,'2026-11-09');
 await chooseExercise(p,1);
 await expect(p.locator('.active-machine')).toContainText('Multi Incline');
 await openQuick(p);
 await expect(p.locator('.fast-kg-step')).toHaveValue('1');
 await weight(p).fill('44.5');
 await expect(p.locator('[data-fast-value="kg"]')).toHaveText('44.5');
 await adjust(p,'kg','1').click();
 await expect(weight(p)).toHaveValue('45.5');
 await reps(p).fill('9');
 await expect(p.locator('[data-fast-value="reps"]')).toHaveText('9');
});

test('warmup and timed CORE sets use the appropriate repetition increments',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await openQuick(p,'warm',0);
 await adjust(p,'kg','1').click();
 await expect(p.locator('input[data-field="kg"][data-type="warm"]').first()).toHaveValue('32.5');
 await adjust(p,'reps','1').click();
 await expect(p.locator('input[data-field="reps"][data-type="warm"]').first()).toHaveValue('9');
 await p.locator('[data-area="core"]').click();
 await p.locator('[data-core="4"]').click();
 await p.locator('#enable-core').check();
 await reps(p).fill('30');
 await openQuick(p);
 await adjust(p,'reps','1').click();
 await expect(reps(p)).toHaveValue('35');
 await adjust(p,'reps','-1').click();
 await expect(reps(p)).toHaveValue('30');
 expect(db.store.size).toBe(0);
});

test('adjusted completed series upserts the same Azure row only after Save',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await done(p).click();
 await p.locator('#save-training').click();
 await expect.poll(()=>db.store.size).toBe(1);
 const id=[...db.store.keys()][0];
 const first=()=>db.store.get(id).record.exercises.flat.variants['MG-PL13'].sets[0].kg;
 expect(first()).toBe('70');
 await openQuick(p);
 await adjust(p,'kg','1').click();
 await expect(weight(p)).toHaveValue('72.5');
 expect(first()).toBe('70');
 await p.locator('#save-training').click();
 await expect.poll(first).toBe('72.5');
 expect(db.store.size).toBe(1);
 await p.reload();
 await date(p,'2026-11-09');
 await expect(weight(p)).toHaveValue('72.5');
 await expect(done(p)).toHaveClass(/checked/);
});

test('quick correction buttons remain 44px or larger, do not overflow at 320px',async({app:p})=>{
 await date(p,'2026-11-09');
 for(const width of [320,375,390]){
  await p.setViewportSize({width,height:780});
  await openQuick(p);
  const result=await p.evaluate(()=>{
   const buttons=[...document.querySelectorAll('.set-fast-edit .fast-adjust-btn')];
   return {overflow:document.documentElement.scrollWidth>innerWidth,
    buttons:buttons.map(x=>({w:x.getBoundingClientRect().width,h:x.getBoundingClientRect().height})),
    panel:getComputedStyle(document.querySelector('.set-fast-edit')).position};
  });
  expect(result.overflow,'layout overflow at '+width+'px').toBe(false);
  expect(result.buttons.every(x=>x.w>=44&&x.h>=44)).toBe(true);
  expect(result.panel).not.toBe('fixed');
  await p.locator('[data-quick-edit="work-0"]').click();
 }
});
