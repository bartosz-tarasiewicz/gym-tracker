/* Azure sync: explicit authentication, optimistic concurrency, offline-first. */
'use strict';
window.GymCloud=(()=>{
  let getState=()=>({}),applySnapshot=async()=>{},backup=()=>{},onStatusChange=()=>{},hasWorkoutData=()=>true,workoutSignature=()=>null,workoutDetails=()=>({});
  let principal=null,flag='offline',label='Tylko zapis lokalny',remote=null,busy=false,dirty=false,timer=null,bothBackedUp=false;
  const META_PREFIX='zenek-gym-cloud-v1-';
  function dataset(data){
    return {version:2,history:Array.isArray(data.history)?data.history:[],sessions:data.sessions&&typeof data.sessions==='object'&&!Array.isArray(data.sessions)?data.sessions:{}};
  }
  // FNV-1a based fingerprint; for change detection only, never for security/authentication.
  function fingerprint(data){
    const str=JSON.stringify(dataset(data));let h=2166136261;
    for(let i=0;i<str.length;i++)h=Math.imul(h^str.charCodeAt(i),16777619);
    return str.length+':'+(h>>>0).toString(16);
  }
  function localMeta(){try{return JSON.parse(localStorage.getItem(META_PREFIX+principal.identityProvider+'-'+principal.userId)||'null')}catch{return null}}
  function storeMeta(etag,hash){localStorage.setItem(META_PREFIX+principal.identityProvider+'-'+principal.userId,JSON.stringify({etag,hash}));}
  function meaningful(d){return hasWorkoutData(d);}
  function stats(d){
    const h=Array.isArray(d?.history)?d.history:[];
    const drafts=d?.sessions&&typeof d.sessions==='object'?Object.values(d.sessions):[];
    const all=[...h,...drafts];
    let done=0,rows=0;
    for(const session of all)for(const log of Object.values(session?.exercises||{})){
      const vars=log?.variants&&Object.keys(log.variants).length?Object.values(log.variants):[log];
      for(const v of vars)for(const entry of (v?.sets||[])){
        rows++;if(entry?.done)done++;
      }
    }
    const dates=all.map(x=>x?.date).filter(x=>typeof x==='string').sort();
    return {finished:h.length,drafts:drafts.length,confirmed:done,entries:rows,lastDate:dates.at(-1)||'—',...workoutDetails(d)};
  }
  function conflictPanel(){
    const local=stats(getState()),cloud=stats(remote?.snapshot);
    const line=(title,d)=>'<div class="panel" style="margin:0;padding:12px;flex:1;min-width:165px"><strong>'+title+'</strong>'+
      '<div class="hint" style="margin-bottom:0">Zakończone treningi: '+d.finished+
      '<br>Rozpoczęte: '+d.drafts+
      '<br>Potwierdzone serie: '+d.confirmed+
      '<br>Zmodyfikowane wiersze: '+(d.modifiedRows||0)+
      '<br>Notatki: '+(d.notes||0)+
      '<br>Zmiany sprzętu: '+(d.equipment||0)+
      '<br>Aktywne CORE BONUS: '+(d.core||0)+
      '<br>Ostatnia data: '+enc(d.lastDate)+'</div></div>';
    return '<div class="flex flex-wrap" style="align-items:stretch;margin:10px 0">'+
      line('Na tym urządzeniu',local)+line('W Azure',cloud)+
      '</div><div class="inline-actions"><button class="btn secondary" id="cloud-backup-both">'+
      '↓ Pobierz obie kopie JSON (jeden plik)</button></div>'+
      (bothBackedUp?'<p class="hint" style="color:#83d9b2">✓ Kopia porównawcza została przygotowana. Możesz bezpieczniej zdecydować, którą wersję zachować.</p>':
      '<p class="hint">Najpierw pobierz obie kopie. Nie wybieraj wersji, dopóki nie porównasz liczby treningów i serii.</p>');
  }
  function viewStatus(f,s){flag=f;label=s;let n=document.getElementById('cloud-info');if(n)n.textContent=s;onStatusChange();}
  const enc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  async function api(method='GET',data){
    const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),12000);
    try {
      const res=await fetch('/api/snapshot',{method,credentials:'same-origin',cache:'no-store',
        headers:{'accept':'application/json',...(data?{'content-type':'application/json'}:{})},
        body:data?JSON.stringify(data):undefined,signal:controller.signal});
      let payload={};try{payload=await res.json()}catch{}
      if(res.status===503)throw Error(payload.error==='storage_not_configured'?'NOT_CONFIGURED':'SERVER_UNAVAILABLE');
      if(res.status===401||res.status===403)throw Error('NOT_AUTHENTICATED');
      if(res.status===409)throw Error('CONFLICT');
      if(!res.ok)throw Error(payload.error||('HTTP_'+res.status));
      return payload;
    }finally{clearTimeout(timeout)}
  }
  async function apply(cloud){
    const before=fingerprint(getState());await applySnapshot(cloud.snapshot);
    storeMeta(cloud.etag,fingerprint(cloud.snapshot));
    viewStatus('synced','✓ Chmura zsynchronizowana');
    // Rendering may instantiate an empty draft; it is not a user edit and should not write to cloud.
  }
  async function push(snapshot,etag){
    const hash=fingerprint(snapshot);
    const result=await api('PUT',{snapshot,expectedEtag:etag});
    if(!result.etag)throw Error('NO_CLOUD_REVISION');
    storeMeta(result.etag,hash);
    viewStatus('synced','✓ Chmura zsynchronizowana');
    if(fingerprint(getState())!==hash) schedule();
  }
  async function reconcile(){
    if(!principal || busy){dirty=true;return;}
    busy=true;dirty=false;viewStatus('syncing','Synchronizacja z Azure…');
    try{
      const before=getState(),local=dataset(before),hash=fingerprint(local),meta=localMeta();
      const cloud=await api();
      if(remote?.etag!==cloud?.etag)bothBackedUp=false;
      remote=cloud;
      if(!cloud.snapshot){
        if(meta&&meta.etag){viewStatus('conflict','⚠ Brak poprzedniej kopii w chmurze — wybierz sposób odzyskania');return;}
        if(meaningful(before))await push(local,null);
        else viewStatus('ready','Zalogowano · brak treningów w chmurze');
        return;
      }
      const cloudHash=fingerprint(cloud.snapshot);
      if(cloudHash===hash){storeMeta(cloud.etag,hash);viewStatus('synced','✓ Chmura zsynchronizowana');return;}
      // Two snapshots can differ by generated draft timestamps/navigation while
      // holding the very same user-entered training records. Only acknowledge
      // equivalence if no local edits occurred during the cloud request.
      if(workoutSignature(before)===workoutSignature(cloud.snapshot)){
        if(fingerprint(getState())!==hash){dirty=true;return;}
        storeMeta(cloud.etag,hash);
        viewStatus('synced','✓ Dane treningowe zgodne — pominięto różnice techniczne');
        return;
      }
      // A fresh browser can contain auto-created template exercises. They are not logged
      // workouts. Restore the cloud version rather than uploading blank templates or conflicting.
      if(!meaningful(before)){
        if(fingerprint(getState())!==hash){dirty=true;return;}
        await apply(cloud);return;
      }
      if(!meta){
        if(!meaningful(before)){if(fingerprint(getState())!==hash){viewStatus('conflict','⚠ Nowe zmiany lokalne — wymagane scalenie');return;}await apply(cloud);}
        else viewStatus('conflict','⚠ Dane lokalne i chmurowe różnią się — wybierz wersję');
        return;
      }
      if(meta.etag===cloud.etag){
        if(fingerprint(getState())!==hash){dirty=true;return;}
        await push(local,cloud.etag);
      } else if(meta.hash===hash) {
        if(fingerprint(getState())!==hash){dirty=true;return;}
        await apply(cloud);
      } else {
        viewStatus('conflict','⚠ Konflikt zmian na urządzeniach — dane pozostają lokalnie');
      }
    }catch(e){
      if(e.message==='CONFLICT'){viewStatus('conflict','⚠ Chmura zmieniła się podczas zapisu — wybierz wersję');}
      else if(e.message==='NOT_CONFIGURED')viewStatus('unconfigured','Azure Storage nie jest jeszcze skonfigurowany · lokalne dane są bezpieczne');
      else if(e.message==='NOT_AUTHENTICATED')viewStatus('offline','Zaloguj się ponownie, aby synchronizować');
      else {viewStatus('offline','⚠ Synchronizacja niedostępna · zapis lokalny działa');console.warn('Gym Tracker cloud:',e.message);}
    } finally {busy=false;if(dirty&&flag!=='conflict'&&flag!=='unconfigured'){dirty=false;schedule();}}
  }
  function schedule(){if(!principal)return;clearTimeout(timer);timer=setTimeout(()=>{if(flag==='conflict'||flag==='unconfigured')return;void reconcile()},1400)}
  async function action(name){
    if(name==='cloud-sync'){await reconcile();return;}
    if(name==='cloud-backup-both'){
      // One file, one user gesture. No silent remote overwrite, and no multiple-download permission required.
      const cloud=remote?.snapshot||null;
      const local=dataset(getState());
      backup('gym-tracker-dwie-kopie-'+new Date().toISOString().slice(0,10)+'.json',{
        kind:'gym-tracker-compare-backup',version:1,createdAt:new Date().toISOString(),
        local,cloud,
        cloudRevision:remote?.etag||null
      });
      bothBackedUp=true;viewStatus('conflict',label);return;
    }
    if(name==='cloud-download'){
      if(!bothBackedUp){viewStatus('conflict','⚠ Najpierw pobierz obie kopie JSON');return;}
      if(!confirm('Wczytać dane z Azure? Bieżące dane lokalne zostaną najpierw pobrane jako kopia JSON.'))return;
      // Download must be initiated synchronously from the user's click (browser activation).
      backup('gym-tracker-local-before-cloud.json',getState());
      const cloud=await api();
      if(!cloud.snapshot){viewStatus('conflict','Nie ma kopii w chmurze');return;}
      await apply(cloud);
      return;
    }
    if(name==='cloud-upload'){
      if(!bothBackedUp){viewStatus('conflict','⚠ Najpierw pobierz obie kopie JSON');return;}
      if(!confirm('Zastąpić dane w Azure lokalnym dziennikiem? Najpierw pobierzemy automatycznie kopię danych chmurowych.'))return;
      const previous=remote;
      if(previous?.snapshot)backup('gym-tracker-cloud-before-replace.json',previous.snapshot);
      const cloud=await api();
      if(previous?.snapshot && cloud.etag!==previous.etag){
        remote=cloud;viewStatus('conflict','⚠ Chmura ponownie się zmieniła — odśwież konflikt');return;
      }
      await push(dataset(getState()),cloud.etag||null);
      return;
    }
  }
  function html(){
    const signed=!!principal;
    return '<div class="panel"><h2>☁️ Synchronizacja Azure</h2>'+
      '<p class="muted">Zapis lokalny działa niezależnie od internetu. Po zalogowaniu synchronizujemy historię między urządzeniami. Przy konflikcie żadna kopia nie jest automatycznie nadpisywana.</p>'+
      '<div id="cloud-info" class="detail" role="status">'+enc(label)+'</div>'+
      (signed?'<p class="hint">Zalogowano: '+enc(principal.userDetails||principal.identityProvider)+'</p><div class="inline-actions"><button class="btn secondary" id="cloud-sync">↻ Synchronizuj teraz</button><a class="btn ghost" style="text-decoration:none" href="/.auth/logout?post_logout_redirect_uri=/">Wyloguj</a></div>':
       '<div class="inline-actions"><a class="btn" style="text-decoration:none" href="/.auth/login/github?post_login_redirect_uri=/">Zaloguj przez GitHub</a></div>')+
      (signed&&flag==='conflict'?'<div class="warning"><strong>Konflikt danych.</strong> Żadna wersja nie została nadpisana. Porównaj dzienniki i pobierz wspólną kopię JSON, zanim wybierzesz źródło.</div>'+
        conflictPanel()+
        '<div class="inline-actions"><button class="btn secondary" id="cloud-download" '+(!bothBackedUp?'disabled':'')+'>Użyj danych z Azure</button>'+
        '<button class="btn ghost" id="cloud-upload" '+(!bothBackedUp?'disabled':'')+'>Wyślij lokalne do Azure</button></div>':'')+
      '<p class="hint">Wszystkie treningi pozostają lokalnie do czasu potwierdzonego zapisu w Azure. Przy błędach nie usuwamy lokalnej kopii.</p></div>';
  }
  async function init(options){
    getState=options.getState;applySnapshot=options.applySnapshot;backup=options.backup;hasWorkoutData=options.hasWorkoutData||hasWorkoutData;workoutSignature=options.workoutSignature||workoutSignature;workoutDetails=options.workoutDetails||workoutDetails;onStatusChange=options.onStatusChange||onStatusChange;
    try{
      const response=await fetch('/.auth/me',{credentials:'same-origin',cache:'no-store'});
      if(!response.ok)throw Error('auth unavailable');
      const data=await response.json();principal=data.clientPrincipal?.userId?data.clientPrincipal:null;
      if(!principal){viewStatus('offline','Nie zalogowano · treningi są lokalne');return;}
      await reconcile();
    }catch(e){viewStatus('offline','Azure niedostępne · zapis lokalny nadal działa');}
    window.addEventListener('online',()=>schedule());
    document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible')schedule()});
  }
  return {init,schedule,action,html,getStatus:()=>flag};
})();
