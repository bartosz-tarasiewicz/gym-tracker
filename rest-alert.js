'use strict';
// A finite media clip replaces the oscillator-based alarm.
window.GymRestAlert=(()=>{
 let audio=null,generation=0,deadline=null,playing=false;
 const enabled=()=>{const settings=GymProfiles.preference('restTimer');return settings?.sound===true&&settings.soundFormat==='clip-v1';};
 function stop(){
  generation++;clearTimeout(deadline);deadline=null;playing=false;
  if(audio){try{audio.pause();audio.currentTime=0;}catch{}}
 }
 function player(){
  if(!audio){
   audio=new Audio('./assets/audio/rest-complete.wav');
   audio.preload='auto';audio.loop=false;audio.volume=.5;
   audio.addEventListener('ended',()=>{stop();window.updateRestTimer?.();});
   audio.addEventListener('error',stop);
  }
  return audio;
 }
 function start(prime=false){
  stop();
  if(!enabled()||document.visibilityState==='hidden')return;
  const token=generation;
  try{
   const media=player();
   media.loop=false;media.currentTime=0;
   playing=!prime;
   // This wall-clock limit also applies if playback stalls or ended never fires.
   deadline=setTimeout(()=>{stop();window.updateRestTimer?.();},1200);
   const result=media.play();
   Promise.resolve(result).then(()=>{
    if(token!==generation)return;
    // The clip starts with silence. Prime the same media element from a
    // gesture, then pause before the audible section begins.
    if(prime)stop();
   }).catch(()=>{if(token===generation)stop();});
  }catch{stop();}
 }
 document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden')stop();});
 window.addEventListener('pagehide',stop);
 return {enabled,prepare:()=>start(true),play:()=>start(),stop,isPlaying:()=>playing};
})();
