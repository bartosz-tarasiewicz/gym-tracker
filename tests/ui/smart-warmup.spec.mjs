import {test,expect,date,done,chooseExercise,weight} from './fixtures.mjs';

test('warmups start expanded and automatically collapse after the last warmup set',async({app:p,db})=>{
 await date(p,'2026-11-09');
 const warm=p.locator('.warmup-block'),guide=p.locator('.next-set-guide');
 await expect(warm).toBeVisible();
 await expect(warm).toHaveAttribute('open','');
 await expect(warm.locator('summary')).toContainText('0 / 3');
 await expect(guide).toContainText('Teraz: Rozgrzewka R1');
 await expect(p.locator('.set-row.is-next')).toHaveAttribute('data-set-row','warm-0');
 for(let i=0;i<3;i++){
  await p.locator('.done-button[data-type="warm"]').nth(i).click();
 }
 await expect(warm).not.toHaveAttribute('open','');
 await expect(warm.locator('summary')).toContainText('3 / 3');
 await expect(guide).toContainText('Teraz: Seria robocza S1');
 await expect(guide).toContainText('70 kg');
 await expect(p.locator('.set-row.is-next')).toHaveAttribute('data-set-row','work-0');
 await expect(p.locator('.done-button[data-type="warm"]:visible')).toHaveCount(0);
 expect(db.store.size).toBe(0);
 await p.reload();
 await expect(warm).not.toHaveAttribute('open','');
 await warm.locator('summary').click();
 await expect(warm).toHaveAttribute('open','');
 await expect(p.locator('.done-button[data-type="warm"]')).toHaveCount(3);
});

test('starting work without warmup closes optional warmups and keeps work sets in focus',async({app:p,db})=>{
 await date(p,'2026-11-09');
 const warm=p.locator('.warmup-block'),guide=p.locator('.next-set-guide');
 await expect(warm).toHaveAttribute('open','');
 await done(p).click();
 await expect(warm).not.toHaveAttribute('open','');
 await expect(warm.locator('summary')).toContainText('0 / 3');
 await expect(guide).toContainText('Teraz: Seria robocza S2');
 await expect(p.locator('.set-row.is-next')).toHaveAttribute('data-set-row','work-1');
 await expect(p.locator('.done-button[data-type="work"]').first()).toHaveClass(/checked/);
 await warm.locator('summary').click();
 await expect(warm).toHaveAttribute('open','');
 await p.locator('input[data-type="warm"][data-field="kg"]').first().fill('35');
 await expect(warm).toHaveAttribute('open','');
 expect(db.store.size).toBe(0);
 await p.reload();
 await expect(warm).not.toHaveAttribute('open','');
 await warm.locator('summary').click();
 await expect(p.locator('input[data-type="warm"][data-field="kg"]').first()).toHaveValue('35');
});

test('manual skip and reopen warmups updates the next set guidance without changing data',async({app:p,db})=>{
 await date(p,'2026-11-09');
 const warm=p.locator('.warmup-block'),guide=p.locator('.next-set-guide');
 await warm.locator('summary').click();
 await expect(warm).not.toHaveAttribute('open','');
 await expect(guide).toContainText('Teraz: Seria robocza S1');
 await expect(p.locator('.set-row.is-next')).toHaveAttribute('data-set-row','work-0');
 await warm.locator('summary').click();
 await expect(warm).toHaveAttribute('open','');
 await expect(guide).toContainText('Teraz: Rozgrzewka R1');
 await expect(p.locator('.set-row.is-next')).toHaveAttribute('data-set-row','warm-0');
 expect(db.store.size).toBe(0);
});

test('completion guide follows working sets, respects equipment and remains readable on 320px phone',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await done(p).click();
 await expect(p.locator('.next-set-guide')).toContainText('S2');
 await chooseExercise(p,1);
 await expect(p.locator('.next-set-guide')).toContainText('Seria robocza S1');
 await expect(p.locator('.warmup-block')).toHaveCount(0);
 await p.locator('.exercise-options > summary').click();
 await p.locator('[data-machine="DUMBBELL"]').click();
 await expect(p.locator('.next-set-guide')).toBeVisible();
 await chooseExercise(p,0);
 await expect(p.locator('.warmup-block')).toBeVisible();
 await p.setViewportSize({width:320,height:720});
 const metrics=await p.evaluate(()=>{
  const hint=document.querySelector('.next-set-guide').getBoundingClientRect();
  const summary=document.querySelector('.warmup-block > summary')?.getBoundingClientRect();
  return {overflow:document.documentElement.scrollWidth>innerWidth,tipHeight:hint.height,warmHeight:summary?.height??0};
 });
 expect(metrics.overflow).toBe(false);
 expect(metrics.tipHeight).toBeGreaterThanOrEqual(35);
 expect(metrics.warmHeight).toBeGreaterThanOrEqual(44);
 expect(db.store.size).toBe(0);
});
