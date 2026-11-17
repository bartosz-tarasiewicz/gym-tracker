import {test,expect,date,done,weight} from './fixtures.mjs';

test('top date chip is removed and native calendar is next to the week arrows and Today',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await expect(p.locator('#today')).toHaveCount(0);
 await expect(p.locator('.top .chip')).toHaveCount(0);
 await expect(p.locator('.week-actions #week-date')).toBeVisible();
 await expect(p.locator('.week-bottom #week-date')).toHaveCount(0);
 await expect(p.locator('.week-date-picker input[type="date"]')).toHaveCount(1);
 await expect(p.locator('.week-actions button')).toHaveCount(3);
 const positions=await p.evaluate(()=>{
  const arrows=[...document.querySelectorAll('.week-actions button')];
  const picker=document.querySelector('.week-date-picker input');
  const a=arrows.at(-1).getBoundingClientRect(),b=picker.getBoundingClientRect();
  return {afterArrow:b.left>=a.right,nearArrow:Math.abs(b.top-a.top)<3,height:b.height};
 });
 expect(positions.afterArrow).toBe(true);
 expect(positions.nearArrow).toBe(true);
 expect(positions.height).toBeGreaterThanOrEqual(44);
 await p.locator('[data-week="7"]').click();
 await expect(p.locator('#week-date')).toHaveValue('2026-11-16');
 await p.locator('#week-date').fill('2026-11-20');
 await p.locator('#week-date').dispatchEvent('change');
 await expect(p.locator('#week-date')).toHaveValue('2026-11-20');
 await expect(p.locator('#workout-type')).toHaveValue('5');
 expect(db.store.size).toBe(0);
});

test('compact workout selector preserves per-date changes and has no separate default plan card',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await expect(p.locator('.train-day-summary h1')).toContainText('Klatka');
 await expect(p.locator('.train-day-summary .eyebrow')).toHaveCount(0);
 await expect(p.locator('.train-plan-choices')).toHaveCount(0);
 await expect(p.locator('#workout-plan')).toHaveCount(0);
 await expect(p.locator('.train-type-control select')).toBeVisible();
 await p.locator('#workout-type').selectOption('-1');
 await expect(p.locator('.train-day-summary h1')).toContainText('Dzień wolny');
 await expect(p.locator('.train-plan-choices')).toHaveCount(0);
 await p.locator('#workout-type').selectOption('5');
 await expect(p.locator('#workout-type')).toHaveValue('5');
 await date(p,'2026-11-10');
 await expect(p.locator('#workout-type')).toHaveValue('1');
 expect(db.store.size).toBe(0);
});

test('custom plan switcher appears only when a compatible alternative exists and stays inside header',async({app:p,db})=>{
 const library={version:1,plans:[{
  id:'compact-custom',name:'Własne nogi',dayType:5,items:[{
   id:'compact-leg',title:'Przysiady własne',options:['DUMBBELL'],
   mode:'reps',tip:'Powoli',warm:[[5,10]],work:[[20,10]]
  }]
 }],weekdays:Array(7).fill(null)};
 db.profileSettings.set('default',{settings:{preferences:{},plans:library},etag:'"compact-plan"'});
 await p.reload();
 await expect.poll(()=>p.evaluate(()=>GymPlans.library().plans.length)).toBe(1);
 await date(p,'2026-11-09');
 await expect(p.locator('.train-plan-choices')).toHaveCount(0);
 await date(p,'2026-11-13');
 const chooser=p.locator('.train-day-summary > .train-plan-choices');
 await expect(chooser).toBeVisible();
 await expect(chooser).not.toHaveAttribute('open','');
 await expect(chooser.locator('summary')).toContainText('Zmień zestaw ćwiczeń');
 await expect(p.locator('#workout-plan:visible')).toHaveCount(0);
 await chooser.locator('summary').click();
 await expect(chooser).toHaveAttribute('open','');
 await expect(p.locator('#workout-plan option')).toHaveCount(2);
 await p.locator('#workout-plan').selectOption('compact-custom');
 await expect(p.locator('.train-day-summary h1')).toHaveText('Własne nogi');
 await expect(p.locator('.active-exercise .title')).toContainText('Przysiady własne');
 expect(db.store.size).toBe(0);
});

test('date header and type switcher stay compact without overflow on small iPhones',async({app:p})=>{
 await date(p,'2026-11-13');
 for(const width of [320,375,390,430,620]){
  await p.setViewportSize({width,height:780});
  const geometry=await p.evaluate(()=>{
   const controls=[...document.querySelectorAll('.week-actions button, .week-date-picker input')];
   const week=document.querySelector('.week-panel').getBoundingClientRect();
   const card=document.querySelector('.train-day-summary').getBoundingClientRect();
   const select=document.querySelector('#workout-type').getBoundingClientRect();
   return {horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
    weekRight:week.right,cardRight:card.right,selectRight:select.right,
    headerHeight:card.height,
    tapHeights:controls.map(x=>x.getBoundingClientRect().height)};
  });
  expect(geometry.horizontalOverflow,'horizontal overflow at '+width+'px').toBe(false);
  expect(geometry.weekRight).toBeLessThanOrEqual(width);
  expect(geometry.cardRight).toBeLessThanOrEqual(width);
  expect(geometry.selectRight).toBeLessThanOrEqual(width);
  expect(geometry.tapHeights.every(h=>h>=44)).toBe(true);
  expect(geometry.headerHeight).toBeLessThan(132);
 }
});
