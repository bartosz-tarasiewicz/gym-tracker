/* Durable offline storage. Immediate localStorage mirror + queued IndexedDB primary. */
'use strict';
window.GymStorage=(()=>{
  const KEY='zenek-gym-v1',DB='zenek-gym-database',STORE='snapshots';
  let db=null,pending=null,working=false,timer=null,onStatus=()=>{},mode='localStorage';
  function status(message,level='ok'){onStatus(message,level)}
  function localRead(){try{const raw=localStorage.getItem(KEY);return raw?JSON.parse(raw):null}catch{return null}}
  function localWrite(snapshot){try{localStorage.setItem(KEY,snapshot);return true}catch{return false}}
  function openDB(){return new Promise((resolve,reject)=>{
    if(!('indexedDB' in window))return reject(new Error('IndexedDB unavailable'));
    const request=indexedDB.open(DB,1);
    request.onupgradeneeded=()=>{if(!request.result.objectStoreNames.contains(STORE))request.result.createObjectStore(STORE)};
    request.onsuccess=()=>resolve(request.result);
    request.onerror=()=>reject(request.error||new Error('IndexedDB open failed'));
    request.onblocked=()=>reject(new Error('IndexedDB blocked'));
  })}
  function idbRead(){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readonly');const r=tx.objectStore(STORE).get('main');r.onsuccess=()=>{try{resolve(r.result?JSON.parse(r.result):null)}catch(e){reject(e)}};r.onerror=()=>reject(r.error)})}
  function idbWrite(value){return new Promise((resolve,reject)=>{const tx=db.transaction(STORE,'readwrite');tx.objectStore(STORE).put(value,'main');tx.oncomplete=resolve;tx.onerror=()=>reject(tx.error||new Error('IndexedDB write failed'));tx.onabort=()=>reject(tx.error||new Error('IndexedDB write aborted'))})}
  async function flush(){clearTimeout(timer);timer=null;if(working||pending===null)return;working=true;
    const data=pending;pending=null;
    if(db){try{await idbWrite(data);status('✓ Zapisano · IndexedDB')}catch(e){mode='localStorage';status('⚠ Błąd IndexedDB — sprawdź eksport','warn');console.error('Gym Tracker storage:',e)}}
    working=false;if(pending!==null)void flush();
  }
  async function load(handler){onStatus=handler||onStatus;const local=localRead();let stored=null;
    try{db=await openDB();mode='indexedDB';stored=await idbRead()}catch(e){mode='localStorage';status('⚠ Tylko localStorage — wykonuj kopie JSON','warn');console.warn('Gym Tracker IndexedDB unavailable:',e)}
    const chosen=!stored?local:!local?stored:Number(local.savedAt||0)>=Number(stored.savedAt||0)?local:stored;
    if(chosen&&db&&(stored!==chosen)){
      try{await idbWrite(JSON.stringify(chosen))}catch(e){mode='localStorage';status('⚠ Migracja IndexedDB nieudana','warn')}
    }
    if(db&&mode==='indexedDB')status('✓ Zapis lokalny · IndexedDB');
    return chosen;
  }
  function save(data){const serialized=JSON.stringify(data);const localOK=localWrite(serialized);
    if(!localOK)status('⚠ Nie można zapisać kopii lokalnej','warn');
    if(db){pending=serialized;status('Zapisywanie…');clearTimeout(timer);timer=setTimeout(()=>void flush(),100)}
    else if(localOK)status('✓ Zapisano · localStorage (kopia JSON zalecana)','warn');
  }
  window.addEventListener('pagehide',()=>{if(pending!==null)void flush()});
  document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='hidden'&&pending!==null)void flush()});
  return {load,save,flush,getMode:()=>mode};
})();
