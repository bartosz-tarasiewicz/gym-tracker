import {test,expect,date,done} from './fixtures.mjs';

test('added blank work sets have their own remove controls and can be removed with one tap',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(4);
 await expect(p.locator('[data-remove-set]')).toHaveCount(0);
 await p.locator('#addset').click();
 await p.locator('#addset').click();
 await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(6);
 await expect(p.locator('[data-remove-set]')).toHaveCount(2);
 await expect(p.locator('[data-remove-set="4"]')).toHaveAttribute('aria-label','Usuń dodaną serię S5');
 await p.locator('[data-remove-set="4"]').click();
 await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(5);
 await expect(p.locator('[data-remove-set]')).toHaveCount(1);
 await expect(p.locator('[data-remove-set="4"]')).toBeVisible();
 await p.reload();
 await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(5);
 await p.locator('[data-remove-set="4"]').click();
 await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(4);
 await expect(p.locator('[data-remove-set]')).toHaveCount(0);
 expect(db.store.size).toBe(0);
});

test('removing completed or edited extra work sets asks confirmation and never deletes planned rows',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await p.locator('#addset').click();
 await p.locator('input[data-type="work"][data-field="kg"]').last().fill('75');
 await p.locator('input[data-type="work"][data-field="reps"]').last().fill('8');
 await p.locator('.done-button[data-type="work"]').last().click();
 await expect(p.locator('[data-set-row="work-4"]')).toHaveClass(/done/);
 p.once('dialog',dialog=>{expect(dialog.message()).toContain('S5');dialog.dismiss();});
 await p.locator('[data-remove-set="4"]').click();
 await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(5);
 p.once('dialog',dialog=>{expect(dialog.message()).toContain('S5');dialog.accept();});
 await p.locator('[data-remove-set="4"]').click();
 await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(4);
 await expect(p.locator('[data-remove-set="0"]')).toHaveCount(0);
 await expect(p.locator('[data-remove-set="3"]')).toHaveCount(0);
 await p.reload();
 await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(4);
 expect(db.store.size).toBe(0);
});

test('removing extra sets is scoped to the selected machine and does not touch its alternative',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await p.locator('#addset').click();
 await p.locator('.exercise-options > summary').click();
 await p.locator('[data-machine="DUMBBELL"]').click();
 await p.locator('#addset').click();
 await expect(p.locator('[data-remove-set]')).toHaveCount(1);
 await p.locator('[data-remove-set="4"]').click();
 await expect(p.locator('[data-remove-set]')).toHaveCount(0);
 await p.locator('[data-machine="MG-PL13"]').click();
 await expect(p.locator('[data-remove-set]')).toHaveCount(1);
 expect(db.store.size).toBe(0);
});

test('removing an extra set from a saved Azure workout upserts the same record after explicit Save',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await p.locator('#addset').click();
 await p.locator('input[data-type="work"][data-field="kg"]').last().fill('70');
 await p.locator('input[data-type="work"][data-field="reps"]').last().fill('9');
 await p.locator('.done-button[data-type="work"]').last().click();
 await p.locator('#save-training').click();
 await expect.poll(()=>db.store.size).toBe(1);
 const id=[...db.store.keys()][0];
 expect(db.store.get(id).record.exercises.flat.variants['MG-PL13'].sets).toHaveLength(5);
 p.once('dialog',dialog=>dialog.accept());
 await p.locator('[data-remove-set="4"]').click();
 await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(4);
 expect(db.store.get(id).record.exercises.flat.variants['MG-PL13'].sets).toHaveLength(5);
 await p.locator('#save-training').click();
 await expect.poll(()=>db.store.get(id).record.exercises.flat.variants['MG-PL13'].sets.length).toBe(4);
 expect(db.store.size).toBe(1);
 await p.reload();
 await date(p,'2026-11-09');
 await expect(p.locator('.done-button[data-type="work"]')).toHaveCount(4);
});
