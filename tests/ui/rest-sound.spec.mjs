import {test,expect,date,done} from './fixtures.mjs';
async function observeAudio(p){
 await p.evaluate(()=>{
  window.playedTones=0;
  let Audio=window.AudioContext||window.webkitAudioContext;
  if(!Audio){
   // Playwright's Windows WebKit build omits Web Audio. Exercise event
   // handling there with a stub; Chromium exercises the native API.
   Audio=window.AudioContext=class{
    state='running';currentTime=0;destination={};
    createOscillator(){return {frequency:{},connect(){},disconnect(){},start(){},stop(){}}}
    createGain(){return {gain:{setValueAtTime(){},linearRampToValueAtTime(){}},connect(){},disconnect(){}}}
   };
  }
  const create=Audio.prototype.createOscillator;
  Audio.prototype.createOscillator=function(){window.playedTones++;return create.call(this);};
 });
}
test('manual timer plays one three-tone signal, reload cannot replay it, and mute persists',async({app:p})=>{
 await date(p,'2026-11-09');await observeAudio(p);await p.clock.install();
 await p.locator('#rest-quick-start').click();await expect.poll(()=>p.evaluate(()=>restAudio?.state)).toBe('running');
 await p.clock.fastForward(91000);await expect.poll(()=>p.evaluate(()=>playedTones)).toBe(3);
 await p.clock.fastForward(5000);expect(await p.evaluate(()=>playedTones)).toBe(3);
 await p.reload();await expect(p.locator('#toast')).toBeHidden();
 await observeAudio(p);
 await p.locator('.rest-timer>summary').click();await p.locator('#rest-sound').uncheck();
 await p.reload();await p.locator('.rest-timer>summary').click();await expect(p.locator('#rest-sound')).not.toBeChecked();
 await observeAudio(p);await p.locator('#rest-quick-start').click();await p.clock.fastForward(91000);
 await expect(p.locator('#toast')).toContainText('Koniec przerwy');expect(await p.evaluate(()=>playedTones)).toBe(0);
});
test('auto timer unlocks audio, cancellation stays silent, unavailable audio preserves countdown',async({app:p})=>{
 await date(p,'2026-11-09');await observeAudio(p);await p.clock.install();
 await p.locator('.rest-timer>summary').click();await p.locator('#rest-auto').check();
 await done(p).click();await expect.poll(()=>p.evaluate(()=>restAudio?.state)).toBe('running');
 await p.locator('#active-rest-skip').click();await p.clock.fastForward(91000);
 expect(await p.evaluate(()=>playedTones)).toBe(0);
 await p.evaluate(()=>{restAudio=null;window.AudioContext=class{constructor(){throw Error('unavailable')}};window.webkitAudioContext=undefined;});
 await p.locator('#rest-quick-start').click();await expect(p.locator('#active-rest-bar')).toBeVisible();
 await p.clock.fastForward(91000);await expect(p.locator('#active-rest-bar')).toBeHidden();
 await expect(p.locator('#toast')).toContainText('Koniec przerwy');
});
