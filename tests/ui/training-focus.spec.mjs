import {test,expect,date,done,chooseExercise} from './fixtures.mjs';

test('mobile focus: compact navigation keeps one active exercise visible',async({app:p,db})=>{
 await date(p,'2026-11-09');
 const queue=p.locator('.exercise-queue');
 await expect(queue).toBeVisible();
 await expect(queue).not.toHaveAttribute('open','');
 await expect(p.locator('.exercise-tab:visible')).toHaveCount(0);
 await expect(p.locator('.active-exercise')).toHaveCount(1);
 await expect(p.locator('.day-progress')).toContainText('0 / 12 serii');
 await expect(p.locator('.exercise-set-progress')).toHaveCount(0);
 await expect(queue.locator('summary')).toContainText('1 / 4');
 await chooseExercise(p,1);
 await expect(queue).not.toHaveAttribute('open','');
 await expect(p.locator('.active-exercise .title')).toContainText('Wyciskanie na skosie');
 await expect(queue.locator('summary')).toContainText('2 / 4');
 expect(db.store.size).toBe(0);
});

test('expanding the exercise list survives series completion but selecting a new exercise closes it',async({app:p,db})=>{
 await date(p,'2026-11-09');
 const queue=p.locator('.exercise-queue');
 await queue.locator('summary').click();
 await expect(queue).toHaveAttribute('open','');
 await done(p).click();
 await expect(queue).toHaveAttribute('open','');
 await expect(p.locator('.day-progress')).toContainText('1 / 12 serii');
 await p.locator('[data-item="2"]').click();
 await expect(queue).not.toHaveAttribute('open','');
 await expect(p.locator('.active-exercise .title')).toContainText('Rozpiętki');
 await queue.locator('summary').click();
 await expect(queue.locator('[aria-current="step"]')).toHaveCount(1);
 await date(p,'2026-11-10');
 await expect(queue).not.toHaveAttribute('open','');
 expect(db.store.size).toBe(0);
});

test('focus mode works with CORE and no overlaying Save button',async({app:p})=>{
 await date(p,'2026-11-09');
 await p.locator('.training-more>summary').click();await p.locator('[data-area="core"]').click();
 await expect(p.locator('.exercise-queue')).toHaveCount(0);
 await expect(p.locator('.core-choice')).toHaveCount(10);
 await expect(p.locator('.active-exercise')).toHaveCount(1);
 await expect(p.locator('.train-save-dock')).toHaveCount(0);
 await expect(p.locator('.train-save-section #save-training')).toBeVisible();
 await p.locator('[data-area="main"]').click();
 await expect(p.locator('.exercise-queue')).toBeVisible();
 await expect(p.locator('.exercise-queue')).not.toHaveAttribute('open','');
});

test('iPhone and narrow mobile focus remains within viewport and has reachable tap targets',async({app:p})=>{
 await date(p,'2026-11-09');
 for(const width of [320,375,390]){
  await p.setViewportSize({width,height:780});
  const layout=await p.evaluate(()=>{
   const queue=document.querySelector('.exercise-queue > summary');
   const save=document.querySelector('.train-save-section');
   const buttons=[...document.querySelectorAll('.train-area-switch button')];
   return {
    horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
    queueHeight:queue.getBoundingClientRect().height,
    buttonHeights:buttons.map(b=>b.getBoundingClientRect().height),
    savePosition:getComputedStyle(save).position
   };
  });
  expect(layout.horizontalOverflow,'overflow at '+width+' px').toBe(false);
  expect(layout.queueHeight).toBeGreaterThanOrEqual(44);
  expect(layout.buttonHeights.every(h=>h>=44)).toBe(true);
  expect(layout.savePosition).toBe('static');
  await p.locator('.exercise-queue > summary').click();
  expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await p.locator('.exercise-queue > summary').click();
 }
});
