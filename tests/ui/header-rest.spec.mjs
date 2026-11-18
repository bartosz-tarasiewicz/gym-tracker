import {test,expect,date} from './fixtures.mjs';
test('profile moves to header, status moves to footer, active rest stays visible across scroll and views',async({app:p})=>{
 await date(p,'2026-11-09');
 await expect(p.locator('#profile-badge')).toHaveAccessibleName(/Profil: Profil domyślny/);
 await expect(p.locator('.top #storage-status')).toHaveCount(0);
 await expect(p.locator('.save-status-footer #cloud-save-status')).toHaveCount(1);
 await expect(p.locator('#app')).not.toContainText('Profil:');
 await expect(p.locator('#active-rest-bar')).toBeHidden();
 await p.locator('#rest-quick-start').click();
 await expect(p.locator('#active-rest-remaining')).toHaveText(/1:[23]\d/);
 for(const width of [320,390]){
  await p.setViewportSize({width,height:844});
  await p.evaluate(()=>scrollTo(0,document.body.scrollHeight));
  const layout=await p.locator('#active-rest-bar').evaluate(el=>{
   const b=el.getBoundingClientRect();return {top:b.top,bottom:b.bottom,overflow:document.documentElement.scrollWidth>innerWidth};
  });
  expect(layout.top).toBeGreaterThanOrEqual(0);expect(layout.bottom).toBeLessThan(160);expect(layout.overflow).toBe(false);
 }
 await p.screenshot({path:'test-results/header-rest-mobile.png'});
 await p.locator('#profile-badge').click();
 await expect(p.locator('#active-profile')).toBeVisible();
 await expect(p.locator('#active-rest-bar')).toBeVisible();
 await p.reload();await expect(p.locator('#active-rest-bar')).toBeVisible();
 await p.locator('#active-rest-skip').click();await expect(p.locator('#active-rest-bar')).toBeHidden();
 await p.locator('[data-view="train"]').click();await expect(p.locator('#rest-remaining')).toHaveText('—');
});
test('rest banner disappears at zero and respects safe area',async({app:p})=>{
 await date(p,'2026-11-09');await p.clock.install();
 await p.evaluate(()=>document.documentElement.style.setProperty('--safe-top','59px'));
 await p.locator('#rest-quick-start').click();
 expect((await p.locator('#active-rest-bar').boundingBox()).y).toBeGreaterThan(59);
 await p.clock.fastForward(91000);await expect(p.locator('#active-rest-bar')).toBeHidden();
 await expect(p.locator('#toast')).toContainText('Koniec przerwy');
});
