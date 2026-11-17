import {test,expect,date} from './fixtures.mjs';

test('extra work set has an icon-only trash button in the same row as its values',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await expect(p.locator('[data-remove-set]')).toHaveCount(0);
 await p.locator('#addset').click();
 const row=p.locator('[data-set-row="work-4"]'),trash=row.locator('[data-remove-set="4"]');
 await expect(row).toHaveClass(/has-remove/);
 await expect(trash).toBeVisible();
 await expect(trash).toHaveAttribute('aria-label','Usuń dodaną serię S5');
 await expect(trash.locator('svg')).toHaveCount(1);
 await expect(trash).toBeEmpty();
 await expect(p.locator('.extra-set-action')).toHaveCount(0);
 await expect(p.locator('[data-set-row="work-0"] [data-remove-set]')).toHaveCount(0);
 const coords=await row.evaluate(el=>{
  const elements=[...el.children];
  return {children:elements.length,top:elements.map(x=>x.getBoundingClientRect().top),end:elements.map(x=>x.getBoundingClientRect().right),
   rowRight:el.getBoundingClientRect().right,trashSize:{w:elements.at(-1).getBoundingClientRect().width,h:elements.at(-1).getBoundingClientRect().height}};
 });
 expect(coords.children).toBe(5);
 expect(Math.max(...coords.top)-Math.min(...coords.top)).toBeLessThan(2);
 expect(coords.end.at(-1)).toBeLessThanOrEqual(coords.rowRight+1);
 expect(coords.trashSize.w).toBeGreaterThanOrEqual(44);
 expect(coords.trashSize.h).toBeGreaterThanOrEqual(44);
 await trash.click();
 await expect(row).toHaveCount(0);
 expect(db.store.size).toBe(0);
});

test('compact set rows stay inside 320px iPhone viewport with inline trash icon',async({app:p})=>{
 await date(p,'2026-11-09');
 await p.locator('#addset').click();
 for(const width of [320,375,390,430]){
  await p.setViewportSize({width,height:790});
  const metrics=await p.evaluate(()=>{
   const row=document.querySelector('[data-set-row="work-4"]');
   const planned=document.querySelector('[data-set-row="work-0"]');
   const field=row.querySelector('input[data-field="kg"]');
   const trash=row.querySelector('.remove-set-btn');
   const r=row.getBoundingClientRect(),t=trash.getBoundingClientRect(),f=field.getBoundingClientRect();
   return {scroll:document.documentElement.scrollWidth,viewport:innerWidth,
    rowLeft:r.left,rowRight:r.right,trashLeft:t.left,trashRight:t.right,
    fieldWidth:f.width,gridColumns:getComputedStyle(row).gridTemplateColumns};
  });
  expect(metrics.scroll,'page overflow at '+width+'px').toBeLessThanOrEqual(metrics.viewport);
  expect(metrics.rowLeft).toBeGreaterThanOrEqual(0);
  expect(metrics.rowRight).toBeLessThanOrEqual(width);
  expect(metrics.trashLeft).toBeGreaterThan(metrics.rowLeft);
  expect(metrics.trashRight).toBeLessThanOrEqual(metrics.rowRight+1);
  expect(metrics.fieldWidth).toBeGreaterThanOrEqual(35);
  expect(metrics.gridColumns.trim().split(/\\s+/)).toHaveLength(5);
 }
});

test('populated extra work set still requires confirmation before inline trash delete',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await p.locator('#addset').click();
 await p.locator('[data-set-row="work-4"] input[data-field="kg"]').fill('77.5');
 const trash=p.locator('[data-set-row="work-4"] [data-remove-set="4"]');
 p.once('dialog',d=>{expect(d.message()).toContain('S5');d.dismiss();});
 await trash.click();
 await expect(trash).toBeVisible();
 p.once('dialog',d=>{expect(d.message()).toContain('S5');d.accept();});
 await trash.click();
 await expect(trash).toHaveCount(0);
 await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(4);
 expect(db.store.size).toBe(0);
});
