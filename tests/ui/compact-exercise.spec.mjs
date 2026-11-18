import {test,expect,date,done} from './fixtures.mjs';
test('work sets are reachable in a compact exercise card with full-size controls',async({app:p})=>{
 await date(p,'2026-11-09');
 for(const width of [320,375,390]){
  await p.setViewportSize({width,height:844});
  const layout=await p.evaluate(()=>{
   const card=document.querySelector('.active-exercise').getBoundingClientRect();
   const first=document.querySelector('[data-set-row="work-0"]').getBoundingClientRect();
   const button=document.querySelector('.done-button[data-type="work"]').getBoundingClientRect();
   return {offset:first.top-card.top,overflow:document.documentElement.scrollWidth>innerWidth,target:button.height};
  });
  expect(layout.overflow).toBe(false);expect(layout.offset).toBeLessThan(600);expect(layout.target).toBeGreaterThanOrEqual(44);
  await expect(p.locator('.active-machine')).toContainText('Talerze łącznie');
  await expect(p.locator('.next-set-guide')).toContainText('Rozgrzewka R1');
 }
 await p.setViewportSize({width:390,height:844});
 await done(p).click();
 await expect(p.locator('.warmup-block')).not.toHaveAttribute('open','');
 await p.locator('.active-exercise').scrollIntoViewIfNeeded();
 await p.screenshot({path:'test-results/compact-exercise-mobile.png'});
});
