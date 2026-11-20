import {test,expect,date,done,weight,reps,seed,chooseExercise} from './fixtures.mjs';

test('one tap repeats the last completed set without marking the next set done',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await expect(p.locator('#quick-fill-set')).toHaveCount(0);
 await done(p).click();
 const offer=p.locator('#quick-fill-set');
 await expect(offer).toContainText('S2');
 await expect(offer).toContainText('70 kg × 11');
 await p.locator('.training-more>summary').click();await p.locator('#quick-fill-set').click();
 await expect(p.locator('input[data-type="work"][data-field="kg"]').nth(1)).toHaveValue('70');
 await expect(p.locator('input[data-type="work"][data-field="reps"]').nth(1)).toHaveValue('11');
 await expect(p.locator('.done-button[data-type="work"]').nth(1)).not.toHaveClass(/checked/);
 await expect(offer).toHaveCount(0);
 expect(db.store.size).toBe(0);
 await p.reload();
 await expect(p.locator('input[data-type="work"][data-field="kg"]').nth(1)).toHaveValue('70');
 await expect(p.locator('.done-button[data-type="work"]').nth(1)).not.toHaveClass(/checked/);
});

test('quick fill reuses only the matching exercise and equipment from a previous training',async({app:p,db})=>{
 seed(db,'2026-11-13','60');
 await p.reload();
 await date(p,'2026-11-20');
 await expect(p.locator('#quick-fill-set')).toHaveAttribute('title','Z treningu 2026-11-13');
 await expect(p.locator('#quick-fill-set')).toContainText('60 kg × 12');
 await p.locator('.training-more>summary').click();await p.locator('#quick-fill-set').click();
 await expect(weight(p)).toHaveValue('60');
 await expect(reps(p)).toHaveValue('12');
 await expect(done(p)).not.toHaveClass(/checked/);
 await p.locator('.exercise-options > summary').click();
 await p.locator('[data-machine="G7-S70"]').click();
 await expect(p.locator('#quick-fill-set')).toHaveCount(0);
 await p.locator('[data-machine="MG-PL70"]').click();
 await expect(weight(p)).toHaveValue('60');
 expect(db.store.size).toBe(1);
 expect(db.store.get('history:test-2026-11-13').record.exercises.legpress.variants['MG-PL70'].sets[0].kg).toBe('60');
});

test('finished exercise offers deliberate jump to next unfinished exercise, including wraparound',async({app:p,db})=>{
 await date(p,'2026-11-09');
 const rows=p.locator('.done-button[data-type="work"]');
 const count=await rows.count();
 for(let i=0;i<count;i++)await rows.nth(i).click();
 await expect(p.locator('.exercise-finish')).toContainText('Serie ukończone');
 await expect(p.locator('.next-unfinished')).toContainText('Wyciskanie na skosie');
 await p.locator('.next-unfinished').click();
 await expect(p.locator('[data-item="1"]')).toHaveClass(/active/);
 await chooseExercise(p,3);
 const lastRows=p.locator('.done-button[data-type="work"]');
 for(let i=0,n=await lastRows.count();i<n;i++)await lastRows.nth(i).click();
 await expect(p.locator('.next-unfinished')).toContainText('Wyciskanie na skosie');
 await p.locator('.next-unfinished').click();
 await expect(p.locator('[data-item="1"]')).toHaveClass(/active/);
 expect(db.store.size).toBe(0);
});

test('shortcuts remain usable at 320px without horizontal overflow',async({app:p})=>{
 await p.setViewportSize({width:320,height:720});
 await date(p,'2026-11-09');
 await done(p).click();
 await p.locator('.training-more>summary').click();await expect(p.locator('#quick-fill-set')).toBeVisible();
 await expect(p.locator('#save-training')).toBeVisible();
 expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
