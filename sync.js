/* Gym Tracker 0.4: Azure-authoritative records, durable offline write queue.
   Local storage is a cache + journal of unsent edits, not another master. */
'use strict';
window.GymCloud=(()=>{
 const META='zenek-gym-cloud-v04-',LAST_OWNER='zenek-gym-cloud-last-owner-v04';
 let getState=()=>({sessions:{},history:[]}),applySnapshot=async()=>{},backup=()=>{},onStatusChange=()=>{};
 let workoutRecords=()=>new Map(),cloudState=()=>({sessions:{},history:[]}),meaningfulSignature=()=>'',hasWorkoutData=()=>false,workoutDetails=()=>({});
 let principal=null,owner=null,base=new Map(),pending=new Map(),remote=new Map(),tombstones=new Set();
 let initialized=false,busy=false,blocked=false,backedUp=false,flushTimer=null,flushBusy=false,flag='offline',message='Zapis lokalny aktywny';
 let lastMergePreview=null;
 const clone=o=>JSON.parse(JSON.stringify(o));
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const key=()=>META+encodeURIComponent(owner||'');
 function status(next,label){
  flag=next;message=label;
  const el=document.getElementById('cloud-info');if(el)el.textContent=label;
  onStatusChange();
 }
 function persist(){
  if(!owner)return;
  try {
   localStorage.setItem(key(),JSON.stringify({version:4,
    base:[...base].map(([id,x])=>[id,{etag:x.etag,sig:x.sig,kind:x.kind}]),
    pending:[...pending].map(([id,x])=>[id,x]),tombstones:[...tombstones]}));
  }catch(e){status('offline','⚠ Brak miejsca na kolejkę zmian — pobierz kopię JSON');console.error('Cloud queue persistence',e);}
 }
 function restore(){
  base=new Map();pending=new Map();tombstones=new Set();
  if(!owner)return false;
  try{
   const raw=JSON.parse(localStorage.getItem(key())||'null');
   if(raw?.version!==4)return false;
   base=new Map(raw.base||[]);pending=new Map(raw.pending||[]);tombstones=new Set(raw.tombstones||[]);
   return true;
  }catch(e){console.warn('Invalid cloud sync cache',e);return false;}
 }
 async function request(method='GET',id=null,data=null){
  const ctrl=new AbortController(),timer=setTimeout(()=>ctrl.abort(),15000);
  try{
   const url=id===null?'/api/workouts':'/api/workouts/'+encodeURIComponent(id);
   const resp=await fetch(url,{method,credentials:'same-origin',cache:'no-store',signal:ctrl.signal,
    headers:{accept:'application/json',...(data?{'content-type':'application/json'}:{})},
    body:data?JSON.stringify(data):undefined});
   let body={};try{body=await resp.json()}catch{}
   if(resp.status===401||resp.status===403)throw Error('AUTH_REQUIRED');
   if(resp.status===409)throw Error('REVISION_CONFLICT');
   if(!resp.ok)throw Error('HTTP_'+resp.status+':'+(body.error||'server_error'));
   return body;
  }finally{clearTimeout(timer);}
 }
 function recordSignature(id,kind,record){
  const single=kind==='draft'
   ?{sessions:{[id.slice(6)]:record},history:[]}
   :{sessions:{},history:[{...record,syncId:id}]};
  return workoutRecords(single).get(id)?.sig||'';
 }
 function serverRows(data){
  if(!Array.isArray(data.workouts))throw Error('Invalid Azure reply');
  const map=new Map();
  for(const x of data.workouts){
   if(!x.id||!['draft','history'].includes(x.kind)||!x.record)throw Error('Invalid cloud workout');
   map.set(x.id,{...x,sig:recordSignature(x.id,x.kind,x.record),isEmpty:false});
  }
  return map;
 }
 function dataSignature(state){return meaningfulSignature(state);}
 function stats(state){
  const history=state?.history||[],drafts=Object.values(state?.sessions||{});
  let confirmed=0,rows=0;
  for(const session of [...history,...drafts])for(const log of Object.values(session?.exercises||{})){
   const variants=log?.variants&&Object.keys(log.variants).length?Object.values(log.variants):[log];
   for(const v of variants)for(const set of v?.sets||[]){rows++;if(set?.done)confirmed++;}
  }
  const d=workoutDetails(state);
  return {history:history.length,drafts:drafts.length,confirmed,modified:d.modifiedRows||0,
    notes:d.notes||0,equipment:d.equipment||0};
 }
 function preview(){
  const a=stats(getState()),b=stats(cloudState(remote));
  const card=(title,d)=>'<div class="panel" style="margin:0;padding:12px;flex:1;min-width:170px"><strong>'+title+'</strong>'+
    '<p class="hint">Zakończone: '+d.history+'<br>Rozpoczęte: '+d.drafts+
    '<br>Potwierdzone serie: '+d.confirmed+'<br>Zmodyfikowane wiersze: '+d.modified+
    '<br>Notatki: '+d.notes+'<br>Zmiany sprzętu: '+d.equipment+'</p></div>';
  return '<div class="flex flex-wrap" style="align-items:stretch;margin:10px 0">'+
   card('Lokalny dziennik',a)+card('Dane w Azure',b)+'</div>';
 }
 function describePending(){
  const n=pending.size;
  return n?('⏳ '+n+' trening'+(n===1?' czekający':'ów czekających')+' na wysłanie'):'✓ Dane w Azure aktualne';
 }
 // Read-only comparison. A record is safe to add only when neither its cloud ID
 // nor its workout date/day identifies different content on the other side.
 // Different records on the same day may be legitimate, but require manual review.
 function mergePlan(localRows,serverRowsMap){
  const byDate=(rows)=>{
   const idx=new Map();
   for(const [id,row] of rows){
    if(row.isEmpty)continue;
    const date=row.record?.date,day=row.record?.day;
    if(!date||day===undefined||day===null)continue;
    const key=date+'|'+day;
    if(!idx.has(key))idx.set(key,new Set());
    idx.get(key).add(id);
   }
   return idx;
  };
  const localDates=byDate(localRows),remoteDates=byDate(serverRowsMap);
  const missing=[],remoteOnly=[],conflicts=[];
  const conflicted=new Set();
  function collision(id,other,reason){
   const key=String(id)+'|'+String(other)+'|'+reason;
   if(!conflicted.has(key)){conflicted.add(key);conflicts.push({id,other,reason});}
  }
  for(const [id,l] of localRows){
   if(l.isEmpty)continue;
   const r=serverRowsMap.get(id);
   if(r){
    if(l.kind!==r.kind||l.sig!==r.sig)collision(id,id,'Różne wyniki tego samego rekordu');
    continue;
   }
   const dateKey=l.record?.date+'|'+l.record?.day;
   const others=remoteDates.get(dateKey);
   if(others?.size){for(const other of others)collision(id,other,'Dwa identyfikatory treningu z tego samego dnia');}
   else missing.push(l);
  }
  for(const [id,r] of serverRowsMap){
   if(r.isEmpty)continue;
   if(localRows.has(id))continue;
   const dateKey=r.record?.date+'|'+r.record?.day;
   const others=localDates.get(dateKey);
   if(others?.size){for(const other of others)collision(id,other,'Dwa identyfikatory treningu z tego samego dnia');}
   else remoteOnly.push(r);
  }
  return {missing,remoteOnly,conflicts};
 }
 function mergeSummary(plan){
  return '<div class="detail" style="margin:12px 0"><strong>Porównanie rekordów:</strong>'+
   '<p class="hint">Brakujące w Azure: '+plan.missing.length+
   '<br>Brakujące na urządzeniu: '+plan.remoteOnly.length+
   '<br>Wymagające ręcznej decyzji: '+plan.conflicts.length+'</p>'+
   (plan.conflicts.length?'<p class="warning" style="margin:8px 0">Nie scalę automatycznie różnych wyników tego samego treningu ani dwóch wpisów z tą samą datą. Zachowano obie kopie.</p>':'')+
   '</div>';
 }

 function pendingSnapshot(){
  const desired=workoutRecords(getState());
  // Workouts already written in Azure are compared by their meaningful
  // content, not by generated timestamps or navigation-created templates.
  const next=new Map();
  for(const [id,item] of desired){
   const known=base.get(id);
   if(!known&&item.isEmpty)continue; // opening an exercise is not a cloud write
   if(known?.sig===item.sig)continue;
   next.set(id,{id,kind:item.kind,method:'PUT',record:clone(item.record),
    sig:item.sig,expectedEtag:known?.etag||null});
  }
  // Never infer a destructive cloud delete merely because this browser has
  // an incomplete/stale cache. Only explicitly finished drafts are deleted.
  for(const id of tombstones){
   const known=base.get(id);
   if(known&&!desired.has(id))next.set(id,{id,kind:known.kind,method:'DELETE',
    sig:null,expectedEtag:known.etag});
  }
  // Edits made while the first request was still in flight may already be
  // waiting; use the newest local record and preserve its original ETag.
  pending=next;
  persist();
 }
 function markDeleted(id){
  if(!/^draft:[a-zA-Z0-9:_-]+$/.test(id))return;
  if(owner){
   tombstones.add(id);persist();
   if(initialized&&!blocked){
    pendingSnapshot();
    clearTimeout(flushTimer);flushTimer=setTimeout(()=>void sync(),1100);
   }
  }
 }
 function schedule(){
  if(!owner)return; // unpaired anonymous browser: local backup only
  if(initialized&&!blocked){
   pendingSnapshot();
   status(pending.size?'queued':'synced',describePending());
   clearTimeout(flushTimer);
   if(pending.size)flushTimer=setTimeout(()=>void sync(),1100);
  }
 }
 function rowVersions(map){
  base=new Map([...map].map(([id,x])=>[id,{etag:x.etag,sig:x.sig,kind:x.kind}]));
  persist();
 }
 function overlayState(server,pendingRecords=pending){
  const combined=new Map(server);
  for(const op of pendingRecords.values()){
   if(op.method==='DELETE')combined.delete(op.id);
   else combined.set(op.id,{id:op.id,kind:op.kind,record:clone(op.record),sig:op.sig,etag:op.expectedEtag});
  }
  return cloudState(combined);
 }
 async function hydrate(source){
  await applySnapshot(source);
 }
 async function flushQueue(){
  if(flushBusy||blocked||!principal||!pending.size)return;
  flushBusy=true;status('syncing','Wysyłanie zmian do Azure…');
  try {
   for(const operation of [...pending.values()].sort((a,b)=>(a.method==='DELETE')-(b.method==='DELETE'))){
    // A newer user edit may supersede this record while the network is busy.
    const latest=pending.get(operation.id);
    if(!latest||latest.sig!==operation.sig||latest.method!==operation.method)continue;
    const onServer=remote.get(operation.id);
    if(operation.method==='PUT'&&onServer?.sig===operation.sig){
     base.set(operation.id,{etag:onServer.etag,sig:operation.sig,kind:operation.kind});
     pending.delete(operation.id);persist();continue;
    }
    if(operation.method==='DELETE'&&!onServer){
     base.delete(operation.id);pending.delete(operation.id);tombstones.delete(operation.id);persist();continue;
    }
    if((onServer?.etag||null)!==(operation.expectedEtag||null)){
     blocked=true;status('conflict','⚠ Ten trening zmienił się w Azure — zachowano obie wersje');return;
    }
    let response;
    try{response=await request(operation.method,operation.id,
      operation.method==='PUT'?{record:operation.record,expectedEtag:operation.expectedEtag}:{expectedEtag:operation.expectedEtag});}
    catch(e){if(e.message==='REVISION_CONFLICT'){blocked=true;status('conflict','⚠ Równoczesna edycja treningu — bez nadpisywania');return;}throw e;}
    if(operation.method==='DELETE'){
     base.delete(operation.id);remote.delete(operation.id);tombstones.delete(operation.id);
    }else{
     base.set(operation.id,{etag:response.etag,sig:operation.sig,kind:operation.kind});
     remote.set(operation.id,{...operation,etag:response.etag});
    }
    const still=pending.get(operation.id);
    if(still&&still.sig===operation.sig&&still.method===operation.method)pending.delete(operation.id);
    else if(still)still.expectedEtag=response.etag||null;
    persist();
   }
   status('synced',describePending());
  }catch(e){
   status('offline','⚠ Azure niedostępny · zmiany zapisane lokalnie, czekają');
   console.warn('Workout upload deferred',e.message);
  }finally{
   flushBusy=false;
   if(pending.size&&!blocked&&flag!=='offline'){
    clearTimeout(flushTimer);flushTimer=setTimeout(()=>void sync(),900);
   }
  }
 }
 async function sync(){
  if(!principal||busy||blocked)return;
  busy=true;
  try {
   const snapshotBefore=dataSignature(getState());
   const response=await request();
   const now=serverRows(response);
   remote=now;
   if(!initialized){
    const hadMeta=restore();
    if(hadMeta){
     // Offline edits performed since the last completed read must be queued
     // against the previously known per-workout revisions.
     pendingSnapshot();
    } else {
     const own=getState(),cloud=cloudState(now);
     const ownSignature=dataSignature(own),cloudSignature=dataSignature(cloud);
     if(hasWorkoutData(own)&&hasWorkoutData(cloud)&&ownSignature!==cloudSignature){
      blocked=true;status('conflict','⚠ Pierwsze połączenie: dwa różne dzienniki — nic nie nadpisano');return;
     }
     if(hasWorkoutData(own)&&!hasWorkoutData(cloud)){
      rowVersions(now);initialized=true;pendingSnapshot();await flushQueue();return;
     }
     rowVersions(now);initialized=true;await hydrate(cloud);status('synced','✓ Dane treningowe odczytane z Azure');return;
    }
    initialized=true;
   } else {
    pendingSnapshot();
   }
   // If another device changed a record with no pending local changes, Azure
   // wins. Pending local changes stay overlaid until their per-row ETag passes.
   for(const [id,row] of now){if(!pending.has(id))base.set(id,{etag:row.etag,sig:row.sig,kind:row.kind});}
   for(const id of [...base.keys()])if(!now.has(id)&&!pending.has(id))base.delete(id);
   persist();
   if(snapshotBefore!==dataSignature(getState())){
    pendingSnapshot(); // incoming local edits won the race with the GET
   }
   const merged=overlayState(now);
   if(dataSignature(merged)!==dataSignature(getState()))await hydrate(merged);
   if(pending.size)await flushQueue();
   else status('synced','✓ Aktualne dane pobrane z Azure');
  }catch(e){
   status('offline',e.message==='AUTH_REQUIRED'
    ?'⚠ Zaloguj się ponownie; lokalne zmiany są zachowane'
    :'⚠ Brak połączenia z Azure — zmiany zapisują się lokalnie');
   console.warn('Gym Cloud:',e.message);
  }finally{busy=false;}
 }
 async function login(){
  try {
   const resp=await fetch('/.auth/me',{credentials:'same-origin',cache:'no-store'});
   if(!resp.ok)throw Error('auth');
   const p=(await resp.json()).clientPrincipal;
   if(!p?.userId)throw Error('anonymous');
   const id=p.identityProvider+':'+p.userId;
   if(owner&&owner!==id){
    blocked=true;status('conflict','⚠ Inne konto niż ostatnio: dane lokalne pozostają bez zmian');return;
   }
   principal=p;owner=id;
   localStorage.setItem(LAST_OWNER,owner);
   await sync();
  }catch{
   status('offline','Dane zapisane lokalnie · chmura niedostępna lub brak logowania');
  }
 }

 async function mergeNonConflicting(){
  if(!principal||!blocked){status('conflict','⚠ Najpierw zaloguj się i odczytaj dane Azure');return;}
  if(!backedUp){status('conflict','⚠ Przed scaleniem pobierz obie kopie JSON');return;}
  if(busy||flushBusy){status('conflict','⚠ Trwa synchronizacja — nie scalano danych');return;}
  if(pending.size||tombstones.size){
   status('conflict','⚠ Istnieje niezakończona kolejka zmian. Zabezpiecz obie kopie i nie wybieraj jednej jako głównej.');
   return;
  }
  try{
   const fresh=serverRows(await request());
   remote=fresh;
   const own=workoutRecords(getState()),plan=mergePlan(own,fresh);
   lastMergePreview=plan;
   if(plan.conflicts.length){
    status('conflict','⚠ '+plan.conflicts.length+' nakładających się treningów wymaga ręcznej decyzji. Nic nie nadpisano.');
    return;
   }
   const extra=plan.missing.length,received=plan.remoteOnly.length;
   if(!confirm('Po pobraniu obu kopii JSON scalić dane BEZ nadpisywania istniejących rekordów?'+
       '\nDodać do Azure: '+extra+
       '\nPobrać z Azure: '+received+
       '\nŻaden istniejący trening nie zostanie zastąpiony.'))return;
   const localSignature=dataSignature(getState());
   for(const item of plan.missing){
    // Null ETag = create only, even if another device races to this ID.
    const result=await request('PUT',item.id,{record:item.record,expectedEtag:null});
    fresh.set(item.id,{id:item.id,kind:item.kind,record:clone(item.record),
      sig:item.sig,etag:result.etag,isEmpty:false});
   }
   // Recheck the entire server after the write: it might have changed while
   // we were adding other records. Preserve both copies if anything diverged.
   const latest=serverRows(await request());
   remote=latest;
   if(dataSignature(getState())!==localSignature||
      mergePlan(workoutRecords(getState()),latest).conflicts.length){
    lastMergePreview=mergePlan(workoutRecords(getState()),latest);
    backedUp=false;
    status('conflict','⚠ Azure lub lokalne treningi zmieniły się w trakcie scalania. Nie nadpisano ich, pobierz nowe kopie.');
    return;
   }
   // All rows have identical IDs/signatures, or are present only on the cloud.
   // Set the exact ETags before hydrating; neither delete nor overwrite data.
   rowVersions(latest);
   initialized=true;blocked=false;backedUp=false;lastMergePreview=null;
   pending.clear();tombstones.clear();persist();
   await hydrate(cloudState(latest));
   status('synced','✓ Scalono dane bez nadpisywania: '+extra+' dodano do Azure, '+received+' pobrano na telefon.');
  }catch(e){
   backedUp=false;
   status('conflict','⚠ Nie udało się bezpiecznie scalić danych. Zachowano kopie; nie wybieraj nadpisywania.');
   console.warn('Safe merge failed',e);
  }
 }
 async function action(name){
  if(name==='cloud-sync'){
   if(!principal)await login();
   else if(blocked){ // refresh only the read-only preview
    try{remote=serverRows(await request());status('conflict','⚠ Wybierz sposób rozwiązania konfliktu');}
    catch{status('offline','Nie można odczytać Azure · lokalna kopia nadal istnieje');}
   }else await sync();
   return;
  }
  if(name==='cloud-merge-safe'){await mergeNonConflicting();return;}
  if(name==='cloud-backup-both'){
   backup('gym-tracker-obie-kopie-'+new Date().toISOString().slice(0,10)+'.json',{
    format:'gym-tracker-safety-backup-v04',time:new Date().toISOString(),
    local:getState(),cloud:cloudState(remote),pending:[...pending.values()]});
   backedUp=true;status('conflict',message);return;
  }
  if(!backedUp){status('conflict','⚠ Najpierw pobierz obie kopie JSON');return;}
  if(name==='cloud-download'){
   if(!confirm('Przyjąć dane z Azure? Kopia obu dzienników powinna być już pobrana.'))return;
   const recent=serverRows(await request());
   remote=recent;rowVersions(recent);pending.clear();tombstones.clear();persist();blocked=false;
   await hydrate(cloudState(remote));status('synced','✓ Przywrócono dane z Azure');return;
  }
  if(name==='cloud-upload'){
   if(!confirm('Przesłać lokalny dziennik do Azure? Dane, które zostaną zastąpione, są w pobranej kopii JSON.'))return;
   const recent=serverRows(await request());
   // Re-confirm if Azure was edited since the backup was downloaded.
   if([...recent].some(([id,x])=>remote.get(id)?.etag!==x.etag)||[...remote.keys()].some(id=>!recent.has(id))){
    remote=recent;backedUp=false;status('conflict','⚠ Azure zmieniło się po pobraniu kopii; pobierz aktualne kopie');return;
   }
   remote=recent;rowVersions(recent);initialized=true;blocked=false;
   pendingSnapshot();await flushQueue();return;
  }
 }
 function html(){
  const signed=!!principal,disabled=backedUp?'':'disabled';
  return '<div class="panel"><h2>☁️ Treningi w Azure</h2>'+
   '<p class="muted">Azure jest głównym źródłem danych. Urządzenie przechowuje cache i kolejkę zmian bez internetu; zapis pojedynczego treningu nie zastępuje całego dziennika.</p>'+
   '<div class="detail" id="cloud-info" role="status">'+esc(message)+'</div>'+
   (signed?'<p class="hint">Zalogowano: '+esc(principal.userDetails||principal.identityProvider)+'</p>'+
    '<div class="inline-actions"><button class="btn secondary" id="cloud-sync">↻ Odśwież Azure</button>'+
    '<a class="btn ghost" href="/.auth/logout?post_logout_redirect_uri=/" style="text-decoration:none">Wyloguj</a></div>':
    '<div class="inline-actions"><a class="btn" href="/.auth/login/github?post_login_redirect_uri=/" style="text-decoration:none">Zaloguj przez GitHub</a></div>')+
   (blocked?'<div class="warning" style="margin-top:12px"><strong>Rozbieżne dane.</strong> Żadne zmiany nie zostały automatycznie nadpisane. Porównaj i zapisz obie kopie, zanim wybierzesz źródło.</div>'+
    preview()+(lastMergePreview?mergeSummary(lastMergePreview):'')+
    '<div class="inline-actions"><button class="btn secondary" id="cloud-backup-both">↓ Pobierz obie kopie JSON</button></div>'+
    '<div class="inline-actions"><button class="btn" id="cloud-merge-safe" '+(backedUp?'':'disabled')+'>⇄ Scal bez nadpisywania</button></div>'+
    '<div class="inline-actions"><button class="btn secondary" id="cloud-download" '+disabled+'>Przyjmij z Azure</button>'+
    '<button class="btn ghost" id="cloud-upload" '+disabled+'>Wyślij lokalne zmiany</button></div>':
    '<p class="hint">'+(pending.size?'Lokalne zmiany oczekujące na wysłanie: '+pending.size+'.':'Brak oczekujących zmian.')+'</p>')+
   '<p class="hint">W przypadku błędu offline nadal zapisujemy każdą zmianę lokalnie. Eksport JSON pozostaje dostępny.</p></div>';
 }
 async function recoverPendingCache(){
  // The write-ahead journal is independent of IndexedDB/localStorage's
  // snapshot selection. If a stale IndexedDB snapshot wins on restart, replay
  // unsent changes before asking Azure for anything.
  if(!pending.size)return;
  const current=workoutRecords(getState());
  const recovered=new Map(current);
  let count=0;
  for(const op of pending.values()){
   const now=current.get(op.id),known=base.get(op.id);
   if(op.method==='PUT'){
    if(now?.sig===op.sig)continue;
    // If the local cache contains a *different* unsent user edit, keep it:
    // the write-ahead journal must never overwrite newer local input.
    if(now&&now.sig!==known?.sig&&!now.isEmpty)continue;
    recovered.set(op.id,{id:op.id,kind:op.kind,record:clone(op.record),sig:op.sig});
    count++;
   }else if(op.method==='DELETE'){
    if(now&&now.sig!==known?.sig&&!now.isEmpty)continue;
    recovered.delete(op.id);count++;
   }
  }
  if(count){
   await hydrate(cloudState(recovered));
   status('queued','⏳ Przywrócono '+count+' niewysłanych zmian z dziennika awaryjnego');
  }
 }
 async function init(options){
  ({getState,applySnapshot,backup,onStatusChange,workoutRecords,cloudState,
    meaningfulSignature,hasWorkoutData,workoutDetails}=options);
  owner=localStorage.getItem(LAST_OWNER)||null;
  if(owner){restore();await recoverPendingCache();}
  await login();
  window.addEventListener('online',()=>{if(principal)void sync();else void login();});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){if(principal)void sync();else void login();}});
 }
 async function prepareHistoryImport(){
  if(!principal)return {ready:false,reason:'Zaloguj się do Azure przez GitHub w sekcji chmury.'};
  if(blocked)return {ready:false,reason:'W Azure jest konflikt danych. Najpierw rozwiąż konflikt synchronizacji.'};
  if(!initialized||busy||flushBusy)return {ready:false,reason:'Trwa synchronizacja. Spróbuj ponownie, gdy zostanie zakończona.'};
  // Refresh from Azure before computing which dates are already present.
  await sync();
  if(!principal||blocked||!initialized||busy||flushBusy||pending.size||flag!=='synced')
   return {ready:false,reason:'Azure nie jest aktualnie zsynchronizowane. Nie importowano niczego.'};
  return {ready:true};
 }
 return {init,schedule,markDeleted,action,html,prepareHistoryImport,getStatus:()=>flag};
})();
