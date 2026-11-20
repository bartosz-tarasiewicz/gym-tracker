import {test,expect,date,done,weight} from './fixtures.mjs';

test('single-day calendar is next to profile with no week navigation or extra date controls',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await expect(p.locator('#today')).toHaveCount(0);
 await expect(p.locator('.top .chip')).toHaveCount(0);
 await expect(p.locator('.header-actions #week-date')).toBeVisible();
 await expect(p.locator('#app input[type="date"],.week-panel,[data-week],.week-day')).toHaveCount(0);
 await expect(p.locator('#selected-date-label')).toContainText('9 lis');
 const positions=await p.evaluate(()=>{
  const a=document.querySelector('#header-date-control').getBoundingClientRect(),b=document.querySelector('#profile-badge').getBoundingClientRect();
  return {adjacent:b.left>=a.right&&b.left-a.right<12,sameRow:Math.abs(b.top-a.top)<3,height:a.height};
 });
 expect(positions.adjacent).toBe(true);
 expect(positions.sameRow).toBe(true);
 expect(positions.height).toBeGreaterThanOrEqual(44);
 await p.locator('#week-date').fill('2026-11-20');
 await p.locator('#week-date').dispatchEvent('change');
 await expect(p.locator('#week-date')).toHaveValue('2026-11-20');
 await expect(p.locator('#selected-date-label')).toContainText('20 lis');
 await expect(p.locator('#week-date')).toHaveAccessibleName(/20 listopada 2026/);
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

test('header date cannot change while the selected workout is being saved',async({app:p,db})=>{
 await date(p,'2026-11-13');await weight(p).fill('73');await done(p).click();
 let release;const gate=new Promise(resolve=>release=resolve);
 await p.route('**/api/workouts/**',async route=>{if(route.request().method()==='PUT')await gate;await route.continue();});
 try{
  await p.locator('#save-training').click();await expect(p.locator('#week-date')).toBeDisabled();
  await expect(p.locator('#week-date')).toHaveValue('2026-11-13');
 }finally{release();}
 await expect(p.locator('#week-date')).toBeEnabled();await expect(p.locator('#toast')).toContainText('Zapisano w Azure');
 expect([...db.store.values()].every(row=>row.record.date==='2026-11-13')).toBe(true);
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
   const controls=[...document.querySelectorAll('#header-date-control,#profile-badge')];
   const week=document.querySelector('.header-actions').getBoundingClientRect();
   const card=document.querySelector('.train-day-summary').getBoundingClientRect();
   const select=document.querySelector('#workout-type').getBoundingClientRect();
   const all=[...document.querySelectorAll('body *')];
   const offenders=all.flatMap(el=>{
    const rect=el.getBoundingClientRect(),style=getComputedStyle(el);
    if(style.display==='none'||style.visibility==='hidden'||rect.width===0)return [];
    const out=rect.right>innerWidth+.5||rect.left<-.5;
    const spills=el.scrollWidth>el.clientWidth+2&&el.clientWidth>0;
    if(!out&&!spills)return [];
    return [{tag:el.tagName,id:el.id||'',className:typeof el.className==='string'?el.className.slice(0,64):'',
      left:Math.round(rect.left),right:Math.round(rect.right),client:el.clientWidth,scroll:el.scrollWidth,out,spills}];
   }).slice(0,16);
   return {horizontalOverflow:document.documentElement.scrollWidth>innerWidth,
    rootWidth:document.documentElement.scrollWidth,bodyWidth:document.body.scrollWidth,
    offenders,weekRight:week.right,cardRight:card.right,selectRight:select.right,
    headerHeight:card.height,selectAppearance:getComputedStyle(document.querySelector('#workout-type')).appearance,
    tapHeights:controls.map(x=>x.getBoundingClientRect().height)};
  });
  expect(geometry.horizontalOverflow,'horizontal overflow at '+width+'px: '+JSON.stringify({root:geometry.rootWidth,body:geometry.bodyWidth,offenders:geometry.offenders})).toBe(false);
  expect(geometry.selectAppearance,'native select should not use white WebKit styling').toBe('none');
  expect(geometry.weekRight).toBeLessThanOrEqual(width);
  expect(geometry.cardRight).toBeLessThanOrEqual(width);
  expect(geometry.selectRight).toBeLessThanOrEqual(width);
  expect(geometry.tapHeights.every(h=>h>=44)).toBe(true);
  expect(geometry.headerHeight).toBeLessThan(132);
 }
});
