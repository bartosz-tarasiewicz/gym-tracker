import {test,expect,date,done} from './fixtures.mjs';
test('light prototype stays readable on narrow phones and uses the same theme across views',async({app:p})=>{
 await date(p,'2026-11-09');
 for(const width of [320,390,1280]){
  await p.setViewportSize({width,height:844});
  const palette=await p.evaluate(()=>{
   const card=document.querySelector('.active-exercise');
   const input=document.querySelector('[data-type="work"][data-field="kg"]');
   return {card:getComputedStyle(card).backgroundColor,input:getComputedStyle(input).backgroundColor,ink:getComputedStyle(input).color,
    overflow:document.documentElement.scrollWidth>innerWidth,nav:document.querySelectorAll('.navitem svg').length};
  });
  expect(palette.card).toBe('rgb(255, 255, 255)');expect(palette.input).toBe('rgb(255, 255, 255)');
  expect(palette.ink).toBe('rgb(32, 34, 36)');expect(palette.overflow).toBe(false);expect(palette.nav).toBe(4);
 }
 await p.setViewportSize({width:390,height:844});
 await done(p).click();
 await expect(p.locator('.done-button[data-type="work"]').first()).toHaveCSS('background-color','rgb(32, 34, 36)');
 await p.locator('.exercise-queue>summary').click();
 await p.screenshot({path:'test-results/light-training-mobile.png',fullPage:true});
 for(const [view,title] of [['history','Progres'],['plans','Plany'],['settings','Dane']]){
  await p.locator('.navitem[data-view="'+view+'"]').click();await expect(p.locator('#screen-title')).toHaveText(title);
  await expect(p.locator('.panel').first()).toHaveCSS('background-color','rgb(255, 255, 255)');
  expect(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
  await p.screenshot({path:'test-results/light-'+view+'.png',fullPage:true});
 }
});
