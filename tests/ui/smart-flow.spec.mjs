import {test,expect,date,done} from './fixtures.mjs';

test('guided progression highlights warmups and work sets without opening the keyboard',async({app:p})=>{
 await date(p,'2026-11-09');
 const current=p.locator('.set-row.is-next');
 await expect(current).toHaveCount(1);
 await expect(current).toHaveAttribute('data-set-row','warm-0');
 for(const i of [0,1,2]){
  await p.locator('.done-button[data-type="warm"]').nth(i).click();
  await expect(current).toHaveAttribute('data-set-row',i===2?'work-0':'warm-'+(i+1));
 }
 expect(await p.evaluate(()=>document.activeElement?.tagName)).not.toBe('INPUT');
 await done(p).click();
 await expect(current).toHaveAttribute('data-set-row','work-1');
 await p.reload();
 await expect(current).toHaveAttribute('data-set-row','work-1');
 await p.locator('.done-button[data-type="work"]').first().click();
 await expect(current).toHaveAttribute('data-set-row','work-0');
});

test('starting work skips optional warmups and finishing preserves RIR and manual Azure save',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await done(p).click();
 await expect(p.locator('.set-row.is-next')).toHaveAttribute('data-set-row','work-1');
 const rows=p.locator('.done-button[data-type="work"]'),n=await rows.count();
 for(let i=1;i<n;i++)await rows.nth(i).click();
 await expect(p.locator('.set-row.is-next')).toHaveCount(0);
 await expect(p.locator('.exercise-finish')).toContainText('Serie robocze ukończone');
 await p.locator('[data-rir-quick="2"]').click();
 await expect(p.locator('[data-rir-quick="2"]')).toHaveAttribute('aria-pressed','true');
 await expect(p.locator('#rir')).toHaveValue('2');
 expect(db.store.size).toBe(0);
 await p.reload();
 await expect(p.locator('.exercise-finish')).toBeVisible();
 await expect(p.locator('#rir')).toHaveValue('2');
 await p.locator('#rir').selectOption('Dyskomfort');
 await expect(p.locator('[data-rir-quick="2"]')).toHaveAttribute('aria-pressed','false');
 await p.locator('#next').click();
 await expect(p.locator('.active-exercise .title')).toContainText('Wyciskanie na skosie');
 expect(db.store.size).toBe(0);
});

test('optional timer starts with one tap while settings remain collapsed',async({app:p})=>{
 await date(p,'2026-11-09');
 await expect(p.locator('.rest-timer')).not.toHaveAttribute('open','');
 await p.clock.install();
 await p.clock.pauseAt(new Date());
 await p.locator('#rest-quick-start').click();
 await expect(p.locator('#rest-remaining')).toHaveText('1:30');
 await expect(p.locator('.rest-timer')).not.toHaveAttribute('open','');
 await p.locator('.rest-timer > summary').click();
 await p.locator('#rest-duration').selectOption('60');
 await p.locator('#rest-skip').click();
 await p.locator('#rest-quick-start').click();
 await expect(p.locator('#rest-remaining')).toHaveText('1:00');
 await p.locator('[data-item="1"]').click();
 await expect(p.locator('#rest-remaining')).toHaveText('1:00');
});

test('quick controls fit a narrow phone viewport',async({app:p})=>{
 await p.setViewportSize({width:320,height:720});
 await date(p,'2026-11-09');
 await expect(p.locator('#rest-quick-start')).toBeVisible();
 await expect(p.locator('[data-rir-quick="3+"]')).toBeVisible();
 await expect(p.locator('#save-training')).toBeVisible();
 expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
});
