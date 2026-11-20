import {test,expect,date,seed,done,weight,reps} from './fixtures.mjs';

test('training shows essential controls and discloses rare actions deliberately',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await expect(p.locator('#app')).not.toContainText(/Wybierz dzień treningu|domyślnie|wykonano|serii wykonanych/);
 await expect(p.locator('.week-bottom,.exercise-set-progress,.quick-fill-offer')).toHaveCount(0);
 await expect(p.locator('#rest-duration,#rest-auto,#rest-sound')).toHaveCount(0);
 await expect(p.locator('.rest-timer-bar button')).toHaveCount(2);
 await expect(p.locator('.rest-timer-bar #show-previous')).toBeDisabled();
 await expect(p.locator('.rest-timer-bar details,.rest-timer-bar input,.rest-timer-bar select,#open-rest-settings')).toHaveCount(0);
 await expect(p.locator('.active-machine')).toBeVisible();
 await expect(p.locator('.active-machine')).toContainText('Talerze łącznie');
 await expect(p.locator('#markall')).toBeHidden();
 await expect(p.locator('[data-area="core"]')).toBeHidden();
 await expect(p.locator('.exercise-options>summary')).toHaveAccessibleName('Sprzęt, zamienniki, zdjęcia i notatka');
 await p.locator('.exercise-options>summary').click();
 await expect(p.locator('#machine-note')).toBeVisible();
 await p.locator('.exercise-options>summary').click();
 await p.locator('.training-more>summary').click();
 await expect(p.locator('#markall')).toBeVisible();
 await p.locator('[data-area="core"]').click();
 await expect(p.locator('.core-choice')).toHaveCount(10);
 await p.locator('[data-area="main"]').click();
 await expect(p.locator('#save-training')).toBeVisible();
 await expect(p.locator('.train-save-section #undo-training')).toBeVisible();
 expect(db.operations).toEqual([]);
});

test('rest preferences live in Data and drive training timer without changing workout',async({app:p,db})=>{
 await date(p,'2026-11-09');
 await p.locator('[data-view="settings"]').click();
 await expect(p.locator('#screen-title')).toHaveText('Dane');
 await p.locator('#rest-duration').selectOption('60');await p.locator('#rest-auto').check();
 await expect.poll(()=>db.profileSettings.get('default')?.settings.preferences.restTimer?.seconds).toBe(60);
 await p.locator('[data-view="train"]').click();
 await expect(p.locator('#rest-quick-start')).toHaveAccessibleName('Uruchom przerwę 60 sekund');
 await done(p).click();await expect(p.locator('#active-rest-remaining')).toHaveText(/^(1:00|0:5\d)$/);
 await p.locator('[data-view="settings"]').click();await expect(p.locator('#active-rest-bar')).toBeVisible();
 await p.locator('#active-rest-skip').click();await expect(p.locator('#active-rest-bar')).toBeHidden();
 await p.reload();await p.locator('[data-view="settings"]').click();
 await expect(p.locator('#rest-duration')).toHaveValue('60');await expect(p.locator('#rest-auto')).toBeChecked();
 expect(db.store.size).toBe(0);
});

test('previous results open from the button beside Start; copying requires review and never confirms sets',async({app:p,db})=>{
 seed(db);await p.reload();await date(p,'2026-11-20');
 await expect(p.locator('.previous-results')).toHaveCount(0);
 await expect(p.locator('.rest-timer-bar #show-previous')).toBeEnabled();
 await expect(p.locator('#previous-dialog')).toBeHidden();
 await expect(p.locator('#copy-previous')).toBeHidden();
 await p.locator('#show-previous').click();await expect(p.getByRole('dialog',{name:'Poprzedni trening'})).toBeVisible();
 await expect(p.locator('#previous-dialog')).toHaveCSS('background-color','rgb(255, 255, 255)');
 await expect(p.locator('.previous-values')).toContainText('60 kg × 12');
 await p.locator('#close-previous').click();await expect(p.locator('#previous-dialog')).toBeHidden();
 await p.locator('#show-previous').click();await p.keyboard.press('Escape');await expect(p.locator('#previous-dialog')).toBeHidden();
 await p.locator('#show-previous').click();await p.screenshot({path:'test-results/previous-results-dialog.png'});
 p.once('dialog',d=>d.accept());await p.locator('#copy-previous').click();
 await expect(weight(p)).toHaveValue('60');await expect(reps(p)).toHaveValue('12');await expect(done(p)).not.toHaveClass(/checked/);
 expect(db.operations).toEqual([]);
});
