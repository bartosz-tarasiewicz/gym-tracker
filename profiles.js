'use strict';
window.GymProfiles=(()=>{
 const KEY='gym-profiles-v1',ACTIVE='gym-active-profile-v1';
 const valid=id=>/^(default|p-[a-f0-9-]{36})$/.test(id||'');
 let active=sessionStorage.getItem(ACTIVE)||localStorage.getItem(ACTIVE)||'default',profiles=[{id:'default',name:'Profil domyślny'}],ready=false,changing=false;
 if(!valid(active))active='default';
 try{const saved=JSON.parse(localStorage.getItem(KEY)||'[]');for(const p of saved)if(valid(p.id)&&p.id!=='default'&&typeof p.name==='string')profiles.push(p);}catch{}
 if(!profiles.some(p=>p.id===active))active='default';
 sessionStorage.setItem(ACTIVE,active);
 const esc=x=>String(x).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const suffix=()=>active==='default'?'':':profile:'+active;
 function persist(){localStorage.setItem(KEY,JSON.stringify(profiles));}
 const settingsKey='gym-profile-settings-v1'+suffix();
 let settings={preferences:{},plans:{}},settingsEtag=null,settingsDirty=false,settingsBusy=false,settingsTimer,notice='',formOpen=false,profileName='',formError='';
 try{const cached=JSON.parse(localStorage.getItem(settingsKey)||'null');if(cached){settings=cached.settings;settingsEtag=cached.etag;settingsDirty=cached.dirty;}}catch{}
 function cacheSettings(){localStorage.setItem(settingsKey,JSON.stringify({settings,etag:settingsEtag,dirty:settingsDirty}));}
 async function syncSettings(){
  if(settingsBusy)return;settingsBusy=true;let completed=false;
  try{
   const url='/api/profile-settings?profile='+encodeURIComponent(active);
   if(settingsDirty){
    const sent=JSON.stringify(settings);
    const response=await fetch(url,{method:'PUT',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({settings,expectedEtag:settingsEtag}),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('Settings retained locally');
    settingsEtag=(await response.json()).etag;settingsDirty=JSON.stringify(settings)!==sent;cacheSettings();completed=true;
   }else{
    const response=await fetch(url,{credentials:'same-origin',cache:'no-store',signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw Error('Settings offline');const remote=await response.json();
    if(!settingsDirty){if(remote.settings)settings=remote.settings;settingsEtag=remote.etag;cacheSettings();window.dispatchEvent(new Event('gym-preferences-loaded'));}
   }
  }catch{if(settingsDirty)notice='Ustawienia zachowano lokalnie. Synchronizacja wymaga ponownego połączenia lub odświeżenia.';}finally{settingsBusy=false;if(completed&&settingsDirty){clearTimeout(settingsTimer);settingsTimer=setTimeout(()=>void syncSettings(),500);}render();}
 }
 function preference(key,value){
  if(value===undefined)return settings.preferences?.[key];
  settings.preferences={...settings.preferences,[key]:value};settingsDirty=true;cacheSettings();
  clearTimeout(settingsTimer);settingsTimer=setTimeout(()=>void syncSettings(),500);
 }
 function plans(value){
  if(value===undefined)return settings.plans?.version===1?JSON.parse(JSON.stringify(settings.plans)):{version:1,plans:[],weekdays:Array(7).fill(null)};
  const next={...settings,plans:value};
  if(new TextEncoder().encode(JSON.stringify(next)).length>18000)throw Error('Brak miejsca na kolejne plany w profilu. Wyeksportuj i usuń nieużywany plan lub skróć opisy. Treningi pozostaną w historii.');
  // Persist before replacing in-memory data: a quota failure keeps the editor draft.
  localStorage.setItem(settingsKey,JSON.stringify({settings:next,etag:settingsEtag,dirty:true}));
  settings=next;settingsDirty=true;clearTimeout(settingsTimer);settingsTimer=setTimeout(()=>void syncSettings(),500);
 }
 function render(){
  const root=document.getElementById('profiles');if(!root)return;
  root.innerHTML='<label class="label" for="active-profile">Profil użytkownika</label><div class="inline-actions"><select class="equipment" id="active-profile" '+(!ready||changing?'disabled':'')+'>'+profiles.map(p=>'<option value="'+p.id+'" '+(p.id===active?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select><button type="button" class="btn secondary" id="add-profile" aria-expanded="'+formOpen+'" '+(changing?'disabled':'')+'>+ Dodaj profil</button></div><p class="hint">Treningi, historia i ustawienia dotyczą wybranego profilu.</p><p class="hint" role="status">'+esc(notice)+'</p>'+(formOpen?'<form id="profile-form"><label class="label" for="profile-name">Nazwa nowego profilu</label><input class="equipment" id="profile-name" name="profile-name" maxlength="60" required autocomplete="off" value="'+esc(profileName)+'"><p class="hint" id="profile-error" role="status">'+esc(formError||(!ready?'Wczytywanie danych. Za chwilę będzie można utworzyć profil.':''))+'</p><div class="inline-actions"><button class="btn" type="submit" '+(!ready||changing?'disabled':'')+'>Utwórz profil</button><button class="btn secondary" type="button" id="cancel-profile">Anuluj</button></div></form>':'');
 }
 async function request(method='GET',body){
  const response=await fetch('/api/profiles',{method,credentials:'same-origin',cache:'no-store',headers:{'content-type':'application/json'},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('profiles unavailable');return response.json();
 }
 async function sync(){
  void syncSettings();
  try{
   const remote=await request();
   if(!Array.isArray(remote.profiles))return;
   // Upload offline-created profiles independently; names never identify data.
   for(const p of profiles.filter(p=>p.id!=='default'&&!remote.profiles.some(r=>r.id===p.id)))await request('POST',p);
   for(const p of remote.profiles)if(valid(p.id)&&typeof p.name==='string'&&!profiles.some(r=>r.id===p.id))profiles.push(p);
   persist();render();
  }catch(e){console.info('Profile list kept offline');}
 }
 async function switchTo(id){
  if(!valid(id)||!profiles.some(p=>p.id===id)||id===active)return;
  if(!ready||changing)return;
  if(window.gymProfileCanLeave?.()===false){render();return;}
  changing=true;
  const busy=()=>!!(window.GymCloud?.isBusy()||settingsBusy);
  notice=busy()?'Trwa synchronizacja — przełączę profil po jej zakończeniu.':'';
  render();
  // One user action survives a brief profile-settings or cloud refresh.
  // Never reload while callbacks scoped to the old profile are still running.
  try{
   for(let attempt=0;attempt<100&&busy();attempt++)await new Promise(resolve=>setTimeout(resolve,100));
   if(busy()){changing=false;notice='Synchronizacja nadal trwa. Spróbuj ponownie za chwilę.';render();return;}
   await window.GymStorage.flush();
   sessionStorage.setItem(ACTIVE,id);localStorage.setItem(ACTIVE,id);
   sessionStorage.setItem('gym-profile-return-view','settings');
   location.reload();
  }catch(e){changing=false;notice='Nie udało się przełączyć profilu. Dane zachowano.';render();alert(notice);}
 }
 document.addEventListener('change',e=>{if(e.target.id==='active-profile')void switchTo(e.target.value);});
 document.addEventListener('input',e=>{if(e.target.id==='profile-name')profileName=e.target.value;});
 document.addEventListener('click',e=>{
  if(e.target.closest('#add-profile')){formOpen=true;formError='';render();document.getElementById('profile-name')?.focus();}
  if(e.target.closest('#cancel-profile')){formOpen=false;profileName='';formError='';render();}
 });
 document.addEventListener('submit',async e=>{
  if(e.target.id!=='profile-form')return;e.preventDefault();
  if(!ready||changing)return;
  const name=profileName.trim();
  if(!name||name.length>60){formError='Wpisz nazwę od 1 do 60 znaków.';render();return;}
  if(window.GymCloud?.isBusy()||settingsBusy){formError='Trwa synchronizacja. Spróbuj za chwilę.';render();return;}
  if(window.gymProfileCanLeave?.()===false)return;
  const profile={id:'p-'+crypto.randomUUID(),name};
  try{profiles.push(profile);persist();}catch{profiles=profiles.filter(p=>p.id!==profile.id);formError='Brak miejsca na zapis profilu.';render();return;}
  // Switching starts synchronously, preventing duplicate submissions. Leave the
  // form available if the switch fails; the new profile is already in the list.
  await switchTo(profile.id);
 });
 window.addEventListener('online',()=>void sync());
 return {name:()=>profiles.find(p=>p.id===active)?.name||'Profil domyślny',preference,plans,id:()=>active,suffix,render,sync,ready:()=>{ready=true;render();void sync();}};
})();
