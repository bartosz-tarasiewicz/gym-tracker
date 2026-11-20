import {test,expect,date} from './fixtures.mjs';
async function controls(p){
 await date(p,'2026-11-09');await p.locator('.rest-timer>summary').click();
}
test('old audio opt-in is disabled; finite clip stops naturally and can be muted immediately',async({app:p,browserName})=>{
 await p.evaluate(()=>GymProfiles.preference('restTimer',{seconds:90,sound:true}));
 await p.reload();await controls(p);
 await expect(p.locator('#rest-sound')).not.toBeChecked();
 await expect(p.locator('#rest-sound-test')).toBeDisabled();
 test.skip(browserName==='webkit'&&process.platform==='win32','This WebKit build has no media decoder. Native playback is verified in Chromium; physical iPhone remains unverified.');
 await p.evaluate(()=>{
  const Native=window.Audio;window.alertMedia=null;
  window.Audio=function(...args){const media=new Native(...args);window.alertMedia=media;return media;};
  window.AudioContext=class{constructor(){throw Error('Oscillators must not be used')}};
 });
 await p.locator('#rest-sound').check();
 await p.locator('#rest-sound-test').click();
 await expect.poll(()=>p.evaluate(()=>alertMedia?.duration)).toBeGreaterThan(.8);
 expect(await p.evaluate(()=>alertMedia.duration)).toBeLessThan(1);
 expect(await p.evaluate(()=>alertMedia.loop)).toBe(false);
 await expect.poll(()=>p.evaluate(()=>GymRestAlert.isPlaying())).toBe(false);
 expect(await p.evaluate(()=>alertMedia.paused)).toBe(true);
 await p.locator('#rest-sound-test').click();await p.locator('#active-rest-skip').click();
 expect(await p.evaluate(()=>alertMedia.paused)).toBe(true);
 await expect(p.locator('#active-rest-bar')).toBeHidden();
 await p.locator('#rest-sound-test').click();await p.locator('#rest-sound').uncheck();
 expect(await p.evaluate(()=>alertMedia.paused)).toBe(true);
 await p.reload();await controls(p);await expect(p.locator('#rest-sound')).not.toBeChecked();
});
test('stalled playback has a hard deadline and late promises cannot restart it',async({app:p})=>{
 await controls(p);await p.clock.install();await p.locator('#rest-sound').check();
 await p.evaluate(()=>{
  window.mediaCalls=0;window.resolvePlayback=null;window.fakeMedia=null;
  window.Audio=class{
   paused=true;currentTime=0;loop=false;
   constructor(){window.fakeMedia=this;}
   addEventListener(){}
   pause(){this.paused=true;}
   play(){this.paused=false;window.mediaCalls++;return new Promise(resolve=>window.resolvePlayback=resolve);}
  };
 });
 await p.locator('#rest-sound-test').click();
 await p.clock.fastForward(1201);
 expect(await p.evaluate(()=>fakeMedia.paused)).toBe(true);
 await p.evaluate(()=>resolvePlayback());await p.clock.fastForward(5000);
 expect(await p.evaluate(()=>mediaCalls)).toBe(1);
 await p.locator('#rest-sound-test').click();await p.locator('#rest-sound-stop').click();
 expect(await p.evaluate(()=>fakeMedia.paused)).toBe(true);
 await p.locator('#rest-sound-test').click();await p.evaluate(()=>window.dispatchEvent(new Event('pagehide')));
 expect(await p.evaluate(()=>fakeMedia.paused)).toBe(true);
});
test('timer completion is consumed once and overdue background timers do not replay an alarm',async({app:p})=>{
 await controls(p);await p.clock.install();await p.locator('#rest-sound').check();
 await p.evaluate(()=>{window.alarmCalls=0;GymRestAlert.play=()=>{window.alarmCalls++;};});
 await p.locator('#rest-quick-start').click();
 await p.clock.fastForward(90000);
 expect(await p.evaluate(()=>alarmCalls)).toBe(1);
 await p.clock.fastForward(10000);expect(await p.evaluate(()=>alarmCalls)).toBe(1);
 await p.reload();await expect(p.locator('#toast')).toBeHidden();
 await p.evaluate(()=>{window.alarmCalls=0;GymRestAlert.play=()=>{window.alarmCalls++;};restUntil=Date.now()-60000;restAlerted=false;updateRestTimer();});
 expect(await p.evaluate(()=>alarmCalls)).toBe(0);
});
