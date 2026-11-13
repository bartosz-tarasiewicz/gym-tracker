/* Azure sync: explicit authentication, optimistic concurrency, offline-first. */
'use strict';
window.GymCloud=(()=>{
  let getState=()=>({}),applySnapshot=async()=>{},backup=()=>{};
  let principal=null,flag='offline',label='Tylko zapis lokalny',remote=null,busy=false,dirty=false,timer=null;
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
  function meaningful(d){return !!(d.history?.length||Number(d.savedAt)>0||Object.values(d.sessions||{}).some(s=>s.notes||Object.values(s.coreEnabled||{}).some(Boolean)))}
  function viewStatus(f,s){flag=f;label=s;let n=document.getElementById('cloud-info');if(n)n.textContent=s}
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
    if(fingerprint(getState())!==fingerprint(cloud.snapshot))schedule();
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
      remote=cloud;
      if(!cloud.snapshot){
        if(meta&&meta.etag){viewStatus('conflict','⚠ Brak poprzedniej kopii w chmurze — wybierz sposób odzyskania');return;}
        if(meaningful(before))await push(local,null);
        else viewStatus('ready','Zalogowano · brak treningów w chmurze');
        return;
      }
      const cloudHash=fingerprint(cloud.snapshot);
      if(cloudHash===hash){storeMeta(cloud.etag,hash);viewStatus('synced','✓ Chmura zsynchronizowana');return;}
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
    if(name==='cloud-download'){
      if(!confirm('Wczytać dane z Azure? Bieżące dane lokalne zostaną najpierw pobrane jako kopia JSON.'))return;
      const cloud=await api();
      if(!cloud.snapshot){viewStatus('conflict','Nie ma kopii w chmurze');return;}
      backup('gym-tracker-local-before-cloud.json',getState());
      await apply(cloud);
      return;
    }
    if(name==='cloud-upload'){
      if(!confirm('Zastąpić dane w Azure lokalnym dziennikiem? Najpierw pobierzemy automatycznie kopię danych chmurowych.'))return;
      const cloud=await api();
      if(cloud.snapshot)backup('gym-tracker-cloud-before-replace.json',cloud.snapshot);
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
      (signed&&flag==='conflict'?'<div class="warning"><strong>Konflikt danych.</strong> Pobierz kopie JSON przed wyborem źródła. Obie operacje tworzą kopię tego, co ma zostać zastąpione.</div><div class="inline-actions"><button class="btn secondary" id="cloud-download">Użyj danych z Azure</button><button class="btn ghost" id="cloud-upload">Wyślij lokalne do Azure</button></div>':'')+
      '<p class="hint">Azure wymaga skonfigurowania połączenia do Table Storage. Dopóki go nie ma, dane pozostają lokalnie — nie oznaczamy ich jako wysłane.</p></div>';
  }
  async function init(options){
    getState=options.getState;applySnapshot=options.applySnapshot;backup=options.backup;
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
