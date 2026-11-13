'use strict';
/* Zenek Gym Tracker v0.2 — no framework, no server or required build step. */
const MACHINE={
 'MG-PL13':{label:'MG-PL13 · Supine Bench Press',type:'plates',image:'https://johnsonfitness.co.nz/cdn/shop/files/MX19_MAGNUMMG-PL13supinebenchpress_BlkMatte_hero_b1afdd1b-a22e-4889-830c-eb9735e93c32.jpg?v=1711426098&width=1000'},
 'MG-PL14':{label:'MG-PL14 · Incline Bench Press',type:'plates',image:'https://www.renewfit.com/photos_grd/ph1671796767836.jpg'},
 'MULTI-INCLINE':{label:'Multi Incline · stos',type:'stack'},'G3-S12':{label:'G3-S12 · Pectoral Fly',type:'stack'},
 'G7-S22':{label:'G7-S22 · Pec Fly / Rear Delt',type:'stack',image:'https://assets.jhtbrand.co/files/product/2c4c802b5b8cefffa9fc0844431bc47f22fafb03/'},
 'G3-S22':{label:'G3-S22 · Rear Delt',type:'stack'},'DUMBBELL':{label:'Hantle (jeden hantel)',type:'dumbbell'},
 'PULLOVER':{label:'Przenoszenie · jeden hantel',type:'single'},'MG-PL33':{label:'MG-PL33 · Lat Pulldown',type:'perSide'},
 'MG-PL34':{label:'MG-PL34 · Seated Row (jednostka do potwierdzenia)',type:'unknown'},
 'DIVERGING-ROW':{label:'Diverging Seated Row · stos',type:'stack'},
 'CABLE':{label:'Wyciąg / brama · stos',type:'stack'},'STRAIGHT-ARM':{label:'Straight-arm Pulldown · stos',type:'stack'},
 'BACK-EXT':{label:'Back Extension · stos',type:'stack'},'ROMAN':{label:'Ławka rzymska 45°',type:'extra'},
 'MG-PL23':{label:'MG-PL23 · Shoulder Press',type:'plates'},'G7-S21':{label:'G7-S21 · Lateral Raise',type:'stack'},
 'MG-PL41':{label:'MG-PL41 · Preacher Curl',type:'plates'},'G3-S45':{label:'G3-S45 · Triceps Preacher',type:'stack'},
 'TRICEPS-ROPE':{label:'Triceps Rope Pushdown',type:'stack'},'HAMMER':{label:'Hammer Curl · hantle',type:'dumbbell'},
 'MG-PL70':{label:'MG-PL70 · Leg Press',type:'plates'},'G7-S70':{label:'G7-S70 · Leg Press',type:'stack'},
 'MG-PL78':{label:'MG-PL78 · Glute Trainer',type:'plates'},'MG-PL77':{label:'MG-PL77 · Seated Calf Raise',type:'plates'},
 'G7-S71':{label:'G7-S71 · Leg Extension',type:'stack'},'LEG-CURL':{label:'Seated Leg Curl · stos',type:'stack'},
 'KB':{label:'Kettlebell · jeden odważnik',type:'kb'},'BODY':{label:'Masa ciała',type:'body'},'AB-WHEEL':{label:'Ab Wheel',type:'body'},
 'PLATE':{label:'Talerz (jeden)',type:'plate'},'BAND':{label:'Guma oporowa',type:'band'}
};
const make=(id,title,work,options,tip='',warm=[])=>({id,title,work,options,tip,warm});
const ARMS=[
 make('laterals','Lateral Raise',[[45,12],[45,12],[45,10]],['G7-S21','DUMBBELL','CABLE'],'RIR 1–2; z 50 kg przy RIR 0 schodzimy niżej.',[[32,12]]),
 make('shoulder','Shoulder Press',[[40,11],[37.5,12],[37.5,10]],['MG-PL23','DUMBBELL'],'Top set + back-off; talerze razem.',[[15,8],[25,5],[32.5,2]]),
 make('preacher','Preacher Curl',[[30,11],[30,10],[30,10]],['MG-PL41','DUMBBELL','CABLE'],'Kontroluj ekscentrykę, bez zrywania łokci.',[[15,8]]),
 make('triceps-rope','Triceps Rope Pushdown',[[36,11],[36,11],[36,10]],['TRICEPS-ROPE','CABLE'],'Łokcie przy tułowiu.',[[23,10]]),
 make('hammer','Hammer Curl',[[10,11],[10,11]],['HAMMER','CABLE'],'10 kg na JEDEN hantel, obie strony.'),
 make('triceps-preacher','Triceps Preacher',[[25,11],[25,11]],['G3-S45','CABLE'],'Nie blokuj gwałtownie łokci.')
];
const PLAN=[
 {day:'Pon',name:'Klatka',items:[
  make('flat','Wyciskanie na płasko',[[70,11],[65,11],[65,10],[60,10]],['MG-PL13','DUMBBELL'],'Talerze łącznie. Wartości orientacyjne po 09.11.',[[30,8],[45,5],[55,3]]),
  make('incline','Wyciskanie na skosie',[[50,12],[45,12],[43,12]],['MULTI-INCLINE','MG-PL14','DUMBBELL'],'Stos ≠ talerze. RIR 1–2.'),
  make('fly','Rozpiętki',[[12.5,12],[12.5,12],[12.5,12]],['DUMBBELL','G3-S12','G7-S22'],'Hantle: jeden hantel, nawet gdy trzymasz dwa.'),
  make('pullover','Przenoszenie hantla',[[20,13],[20,12]],['PULLOVER','CABLE'],'Jeden hantel; nie wymuszaj zakresu barków.')
 ]},
 {day:'Wt',name:'Plecy',items:[
  make('lat','Lat Pulldown',[[60,12],[60,11],[55,12],[55,12]],['MG-PL33','CABLE'],'MG-PL33 liczymy NA STRONĘ, do objętości ×2.',[[30,8],[45,5],[55,2]]),
  make('row','Seated Row',[[23,12],[27,12],[27,12]],['DIVERGING-ROW','MG-PL34','CABLE'],'Diverging Row: zapis stosu. Wynik 10.11: 23/27/27 ×12, RIR 1.'),
  make('straight','Straight-arm Pulldown',[[16.3,13],[16.3,12],[14,13]],['STRAIGHT-ARM','CABLE'],'Praca najszerszych, bez ruchu łokci.',[[12,8]]),
  make('rear','Reverse Pec Fly',[[39,13],[39,12],[39,12]],['G3-S22','G7-S22','DUMBBELL'],'Tylne barki, stabilny tułów.',[[25,10]]),
  make('back-extension','Back Extension',[[63,13],[63,13]],['BACK-EXT','ROMAN','BODY'],'Bez przeprostu lędźwi.',[[40,8]])
 ]},
 {day:'Śr',name:'Barki, biceps, triceps',items:ARMS},
 {day:'Czw',name:'Les Mills GRIT Strength',items:[make('grit','GRIT Strength — zajęcia',[[0,1]],['BODY'],'Zapisz 1 jako ukończoną jednostkę treningową; szczegóły w notatkach.')]},
 {day:'Czw siła',name:'Barki i ramiona zamiast GRIT',items:ARMS},
 {day:'Pt',name:'Nogi, pośladki i core',items:[
  make('legpress','Leg Press',[[50,12],[50,12],[50,12]],['MG-PL70','G7-S70'],'Talerze łącznie w MG-PL70; stos w G7-S70.',[[10,12],[20,6],[30,4]]),
  make('legcurl','Seated Leg Curl',[[70,12],[70,11],[70,11]],['LEG-CURL'],'Kontrolowana faza opuszczania.'),
  make('glute','Glute Trainer',[[30,14],[30,13],[30,13]],['MG-PL78'],'Talerze łącznie.'),
  make('extension','Leg Extension',[[50,13],[50,13],[50,12]],['G7-S71'],'Bez gwałtownego prostowania kolana.'),
  make('calf','Seated Calf Raise',[[30,15],[40,12]],['MG-PL77'],'Pełna kontrola; wcześniej 6.11 bez potwierdzonych serii.')
 ]}
];
const CORE=[
 {...make('core-crunch','Cable Crunch',[[18,12],[18,12]],['CABLE','PLATE'],'Zbliżaj żebra do miednicy.'),mode:'reps'},
 {...make('core-knees','Hanging Knee Raise',[[0,10],[0,10]],['BODY'],'Bez kołysania, podwijaj miednicę.'),mode:'reps'},
 {...make('core-woodchop','Cable Woodchop',[[9,10],[9,10]],['CABLE','BAND'],'Na każdą stronę, bez szarpania.'),mode:'side'},
 {...make('core-side-plank','Side Plank Hip Lift',[[0,10],[0,10]],['BODY'],'Kontrolowane unoszenie bioder.'),mode:'side'},
 {...make('core-rack','KB Front Rack Carry',[[12,30],[12,30]],['KB','DUMBBELL'],'Sekundy na stronę; ciężar pojedynczego KB/hantla.'),mode:'secSide'},
 {...make('core-drag','KB Plank Drag',[[8,6],[8,6]],['KB','DUMBBELL'],'Powtórzenia na stronę. Nie obracaj tułowia.'),mode:'side'},
 {...make('core-hollow','Hollow Body Hold',[[0,25],[0,25]],['BODY'],'Sekundy; utrzymuj lędźwie stabilne.'),mode:'sec'},
 {...make('core-wheel','Ab Wheel Rollout',[[0,6],[0,6]],['AB-WHEEL','BODY'],'Rollout z kolan, nie zapadaj lędźwi.'),mode:'reps'},
 {...make('core-pallof','Pallof Walkout',[[9,6],[9,6]],['CABLE','BAND'],'Kroki na stronę; 9 kg próbne.'),mode:'stepsSide'},
 {...make('core-bend','Cable Side Bend',[[9,12],[9,12]],['CABLE','DUMBBELL'],'Powtórzenia na stronę, bez skrętu.'),mode:'side'}
];
const dateKey=()=>{const d=new Date();const p=x=>String(x).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
const todayDay=()=>{const d=new Date().getDay();return {1:0,2:1,3:2,4:3,5:5}[d]??0};
const initial=()=>({version:2,activeDay:todayDay(),activeExercise:0,activeArea:'main',activeCore:0,view:'train',sessions:{},history:[],savedAt:0});
let state=initial();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const machineName=k=>MACHINE[k]?.label||k;
function normalize(data){if(!data||typeof data!=='object'||!Array.isArray(data.history)||!data.sessions||typeof data.sessions!=='object'||Array.isArray(data.sessions))return initial();
 const s={...initial(),...data};if(Number(s.version)<2){
  if(s.activeDay===4)s.activeDay=5;
  s.history=s.history.map(h=>({...h,day:h.day===4?5:h.day}));
  const moved={};for(const [key,x] of Object.entries(s.sessions)){const originalDay=x.day;if(originalDay===4)x.day=5;const newKey=originalDay===4&&key.endsWith('-4')?key.slice(0,-1)+'5':key;moved[newKey]=x} s.sessions=moved;
 }
 s.version=2;s.activeDay=Math.max(0,Math.min(PLAN.length-1,Number(s.activeDay)||0));s.activeExercise=Math.max(0,Number(s.activeExercise)||0);s.activeCore=Math.max(0,Math.min(9,Number(s.activeCore)||0));return s;
}
function activeSession(){const key=dateKey()+'-'+state.activeDay;if(!state.sessions[key])state.sessions[key]={date:dateKey(),day:state.activeDay,started:new Date().toISOString(),exercises:{},coreEnabled:{},notes:''};return state.sessions[key]}
function exerciseLog(item){const s=activeSession();if(!s.exercises[item.id])s.exercises[item.id]={machine:item.options[0],sets:item.work.map(([kg,reps])=>({kg:String(kg),reps:String(reps),done:false})),warmups:(item.warm||[]).map(([kg,reps])=>({kg:String(kg),reps:String(reps),done:false})),rir:'',variants:{}};
 const l=s.exercises[item.id];if(!l.warmups)l.warmups=(item.warm||[]).map(([kg,reps])=>({kg:String(kg),reps:String(reps),done:false}));if(!l.variants)l.variants={};if(!l.machine)l.machine=item.options[0];return l;
}
function currentVariant(item){const l=exerciseLog(item);if(!l.variants[l.machine]){
  // Legacy records' original sets are preserved when moving to variant-aware storage.
  l.variants[l.machine]={sets:l.sets||item.work.map(([kg,reps])=>({kg:String(kg),reps:String(reps),done:false})),warmups:l.warmups||[],rir:l.rir||''};
 }
 return l.variants[l.machine];
}
function switchVariant(item,newMachine){const l=exerciseLog(item);currentVariant(item);l.machine=newMachine;
 if(!l.variants[newMachine])l.variants[newMachine]={sets:item.work.map(([kg,reps])=>({kg:'',reps:String(reps),done:false})),warmups:(item.warm||[]).map(([,reps])=>({kg:'',reps:String(reps),done:false})),rir:''};
}
function counted(item){const l=exerciseLog(item);currentVariant(item);return Object.values(l.variants).reduce((n,v)=>n+(v.sets||[]).filter(x=>x.done).length,0)}
function isCoreEnabled(item){const s=activeSession();return !!(s.coreEnabled?.[item.id]||counted(item)>0)}
function summary(){const d=state.activeDay;const mainDone=PLAN[d].items.reduce((n,x)=>n+counted(x),0);const coreDone=CORE.reduce((n,x)=>n+counted(x),0);const planned=PLAN[d].items.reduce((n,x)=>n+x.work.length,0)+CORE.filter(isCoreEnabled).reduce((n,x)=>n+x.work.length,0);return {mainDone,coreDone,planned,done:mainDone+coreDone}}
// Extract only meaningful workout data. Navigation, timestamps and untouched
// exercise templates must never create conflicts or authorize overwrites.
function workoutProjection(data){
  const byId=new Map([...PLAN.flatMap(p=>p.items),...CORE].map(i=>[i.id,i]));
  const drafts=[];
  const changedRows=(rows,defaults)=>{
    const expected=defaults||[];
    const actual=Array.isArray(rows)?rows:[];
    const changed=[];
    if(actual.length!==expected.length)changed.push(['length',actual.length]);
    for(let j=0;j<actual.length;j++){
      const x=actual[j]||{};
      const kg=String(x.kg??''),reps=String(x.reps??''),done=!!x.done;
      const old=expected[j];
      if(!old||done||kg!==String(old[0])||reps!==String(old[1]))
        changed.push([j,kg,reps,done]);
    }
    return changed;
  };
  for(const [key,session] of Object.entries(data?.sessions||{}).sort(([x],[y])=>x.localeCompare(y))){
    if(!session||typeof session!=='object'){drafts.push({key,unknown:session});continue;}
    const record={key};
    if(String(session.notes||'').trim())record.notes=String(session.notes);
    const core=Object.entries(session.coreEnabled||{}).filter(([,enabled])=>!!enabled).map(([id])=>id).sort();
    if(core.length)record.core=core;
    const exerciseChanges=[];
    for(const [id,log] of Object.entries(session.exercises||{}).sort(([x],[y])=>x.localeCompare(y))){
      const item=byId.get(id);
      if(!item||!log||typeof log!=='object'){
        exerciseChanges.push({id,unknown:log});continue;
      }
      const machine=String(log.machine||item.options[0]);
      const variants=log.variants&&Object.keys(log.variants).length
        ?log.variants:{[machine]:log};
      const result={id};
      if(machine!==item.options[0])result.machine=machine;
      if(String(log.rir||'').trim())result.rir=String(log.rir);
      const edits=[];
      for(const [variantId,v] of Object.entries(variants).sort(([x],[y])=>x.localeCompare(y))){
        const setChanges=changedRows(v?.sets,item.work);
        const warmChanges=changedRows(v?.warmups||[],item.warm||[]);
        const rir=String(v?.rir||'').trim();
        if(variantId!==item.options[0]||setChanges.length||warmChanges.length||rir){
          const variant={variant:variantId};
          if(setChanges.length)variant.sets=setChanges;
          if(warmChanges.length)variant.warmups=warmChanges;
          if(rir)variant.rir=rir;
          edits.push(variant);
        }
      }
      if(edits.length)result.variants=edits;
      if(Object.keys(result).length>1)exerciseChanges.push(result);
    }
    if(exerciseChanges.length)record.exercises=exerciseChanges;
    if(Object.keys(record).length>1)drafts.push(record);
  }
  return {history:Array.isArray(data?.history)?data.history:[],drafts};
}
function hasWorkoutData(data){
  const p=workoutProjection(data);
  return !!(p.history.length||p.drafts.length);
}
function workoutSignature(data){return JSON.stringify(workoutProjection(data))}
function workoutDetails(data){
  const p=workoutProjection(data);
  let modified=0,notes=0,equipment=0,core=0;
  for(const session of p.drafts){
    if(session.notes)notes++;
    core+=(session.core||[]).length;
    for(const exercise of session.exercises||[]){
      const original=[...PLAN.flatMap(p=>p.items),...CORE].find(item=>item.id===exercise.id)?.options?.[0];
      const alternativeMachines=new Set(exercise.machine?[exercise.machine]:[]);
      for(const variant of exercise.variants||[]){
        modified+=(variant.sets||[]).filter(row=>row[0]!=='length').length;
        modified+=(variant.warmups||[]).filter(row=>row[0]!=='length').length;
        if(variant.variant!==original)alternativeMachines.add(variant.variant);
      }
      equipment+=alternativeMachines.size;
    }
  }
  return {draftsWithChanges:p.drafts.length,modifiedRows:modified,notes,equipment,core};
}

const stableHash=x=>{let h=2166136261;for(const c of String(x))h=Math.imul(h^c.charCodeAt(0),16777619);return (h>>>0).toString(16);};
function workoutRecords(data){
  const map=new Map();
  for(const [key,record] of Object.entries(data?.sessions||{})){
    const id='draft:'+key;
    const p=workoutProjection({sessions:{[key]:record},history:[]});
    const sig=JSON.stringify(p.drafts);
    map.set(id,{id,kind:'draft',record,sig,isEmpty:p.drafts.length===0});
  }
  for(let i=0;i<(data?.history||[]).length;i++){
    const record=data.history[i];
    if(!record.syncId)record.syncId='history:old-'+i+'-'+stableHash(JSON.stringify(record));
    const id=record.syncId;
    const {syncId,...withoutId}=record;
    map.set(id,{id,kind:'history',record,sig:JSON.stringify(withoutId),isEmpty:false});
  }
  return map;
}
function cloudState(rows){
  const sessions={},history=[];
  for(const entry of rows.values()){
    const copy=JSON.parse(JSON.stringify(entry.record));
    if(entry.kind==='draft')sessions[entry.id.slice(6)]=copy;
    else if(entry.kind==='history')history.push({...copy,syncId:entry.id});
  }
  history.sort((a,b)=>(String(a.date||'')+'|'+String(a.started||'')+'|'+a.syncId).localeCompare(String(b.date||'')+'|'+String(b.started||'')+'|'+b.syncId));
  return {sessions,history};
}
function meaningfulSignature(data){
  const p=workoutProjection(data);
  const h=p.history.map(({syncId,...record})=>JSON.stringify(record)).sort();
  return JSON.stringify({history:h,drafts:p.drafts});
}
function save(sync=true){state.savedAt=Date.now();GymStorage.save(state);if(sync)window.GymCloud?.schedule?.()}
function status(str,level){const n=document.getElementById('storage-status');if(n){n.textContent=str;n.classList.toggle('warn',level==='warn')}}
function toast(str){const t=document.getElementById('toast');t.textContent=str;t.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.style.display='none',2400)}
function measure(item){return {side:'Powt. / stronę',secSide:'Sekundy / stronę',sec:'Sekundy',stepsSide:'Kroki / stronę'}[item.mode]||'Powt.'}
function unit(machine){return {plates:'Talerze łącznie',perSide:'Talerze NA STRONĘ',stack:'Wskazanie stosu',dumbbell:'Jeden hantel',single:'Jeden hantel',body:'Masa ciała',kb:'Jeden kettlebell',plate:'Jeden talerz',band:'Guma',unknown:'Jednostka do ustalenia',extra:'Dodatkowy ciężar'}[MACHINE[machine]?.type]||'kg'}
function currentItem(){const list=state.activeArea==='core'?CORE:PLAN[state.activeDay].items;const index=state.activeArea==='core'?state.activeCore:state.activeExercise;return {item:list[Math.min(index,list.length-1)],index,list}}
function render(){document.getElementById('today').textContent=new Date().toLocaleDateString('pl-PL',{day:'numeric',month:'short'});document.querySelectorAll('.navitem').forEach(n=>n.classList.toggle('active',n.dataset.view===state.view));document.getElementById('app').innerHTML=state.view==='train'?trainHTML():state.view==='history'?historyHTML():settingsHTML()}
function setsHTML(list,type,item){const l=exerciseLog(item),machine=l.machine,v=currentVariant(item);return list.map((s,j)=>`<div class="set-row ${s.done?'done':''}"><strong>${type==='warm'?'R'+(j+1):j+1}</strong><input aria-label="Ciężar ${type} ${j+1}" inputmode="decimal" type="number" min="0" step="any" placeholder="kg" data-type="${type}" data-field="kg" data-set="${j}" value="${esc(s.kg)}"><input aria-label="${measure(item)} ${type} ${j+1}" inputmode="decimal" type="number" min="0" step="any" placeholder="${item.mode?.startsWith('sec')?'s': 'powt.'}" data-type="${type}" data-field="reps" data-set="${j}" value="${esc(s.reps)}"><button class="done-button ${s.done?'checked':''}" data-done="${j}" data-type="${type}" aria-label="Seria ${j+1} ${s.done?'wykonana':'niewykonana'}">${s.done?'✓':'○'}</button></div>`).join('')}
function trainHTML(){const s=activeSession(),d=state.activeDay,day=PLAN[d],{item,index,list}=currentItem(),log=exerciseLog(item),v=currentVariant(item),m=MACHINE[log.machine]||MACHINE.BODY,sum=summary();
 const mainTabs=day.items.map((e,i)=>`<button class="tab ${state.activeArea==='main'&&index===i?'active':''}" data-item="${i}">${i+1}</button>`).join('');
 const coreTabs=CORE.map((e,i)=>`<button class="core-choice ${state.activeArea==='core'&&index===i?'active':''}" data-core="${i}">${isCoreEnabled(e)?'✓ ':'＋ '}${esc(e.title)}</button>`).join('');
 const selected=item.options.map(k=>`<option value="${esc(k)}" ${log.machine===k?'selected':''}>${esc(machineName(k))}</option>`).join('');
 const photo=m.image?`<img class="machine-img" loading="lazy" alt="${esc(m.label)}" src="${esc(m.image)}" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="image-error" hidden>Zdjęcie niedostępne</div>`:`<div class="image-error">${esc(m.label)}<br>Zdjęcie tego wariantu nie jest jeszcze dostępne.</div>`;
 const last=[...state.history].reverse().find(h=>h.exercises?.[item.id]);const previous=last?.exercises[item.id];
 const preview=previous?`Poprzednio (${esc(last.date)}): ${(previous.sets||[]).filter(x=>x.done).map(x=>esc(x.kg)+' × '+esc(x.reps)).join(' · ')||'brak potwierdzonych serii'}`:'Wypełnione wartości to PROPOZYCJA, nie wykonany trening.';
 const coreActive=state.activeArea==='core',enabled=isCoreEnabled(item);
 return `<section class="hero"><div class="eyebrow">Gym Tracker · Azure-ready</div><h1>${esc(day.name)}</h1><p class="muted">Wpisy są automatycznie zapisywane lokalnie. Wszystkie serie zaczynają jako niewykonane.</p></section>
 <div class="tabs">${PLAN.map((p,i)=>`<button class="tab ${d===i?'active':''}" data-day="${i}">${esc(p.day)}</button>`).join('')}</div>
 <div class="panel"><div class="flex"><div><div class="eyebrow">Postęp</div><div class="title">${sum.done}<span class="muted"> / ${sum.planned} serii</span></div></div><span class="chip">${esc(dateKey())}</span></div><div class="meter"><div style="width:${sum.planned?Math.min(100,Math.round(sum.done/sum.planned*100)):0}%"></div></div><p class="hint">Główne: ${sum.mainDone} · CORE BONUS: ${sum.coreDone}</p></div>
 <div class="inline-actions"><button class="btn ${coreActive?'secondary':''}" data-area="main">🏋️ Trening</button><button class="btn ${!coreActive?'secondary':''}" data-area="core">🧱 CORE BONUS (${CORE.length})</button></div>
 ${coreActive?`<div class="panel"><div class="eyebrow">10 ćwiczeń do wyboru</div><p class="hint">Włącz 1–2. Pozostałe nie liczą się do planu.</p><div class="core-chooser">${coreTabs}</div></div>`:`<div class="tabs">${mainTabs}</div>`}
 <div class="panel"><div class="exercise-head"><div><div class="number">${coreActive?'CORE BONUS':'ĆWICZENIE'} ${index+1} / ${list.length}</div><div class="title">${esc(item.title)}</div><p class="hint">${item.work.length} serie robocze · ${esc(item.tip)}</p></div></div>
 ${coreActive?`<label class="core-toggle"><input type="checkbox" id="enable-core" ${enabled?'checked':''}><strong>Włącz do dzisiejszego treningu</strong></label>`:''}
 ${!coreActive||enabled?`<div class="label">Maszyna / wariant</div><select id="machine" class="equipment">${selected}</select><div class="img-frame">${photo}</div><p class="ex-note">Jednostka: <strong>${esc(unit(log.machine))}</strong> · ${esc(measure(item))}. Dla nowego sprzętu przechowujemy oddzielne serie.</p>
 ${preview?`<p class="hint">${preview}</p>`:''}
 ${(v.warmups||[]).length?`<div class="section-header"><strong>Rozgrzewka</strong><span class="smallcaps">Nie liczy się do roboczych</span></div><div class="set-head"><span>R</span><span>Ciężar, kg</span><span>Powt./czas</span><span>OK</span></div>${setsHTML(v.warmups,'warm',item)}`:''}
 <div class="section-header"><strong>Serie robocze</strong><span class="smallcaps">${(v.sets||[]).filter(x=>x.done).length} wykonano</span></div><div class="set-head"><span>S</span><span>Ciężar, kg</span><span>Powt./czas</span><span>OK</span></div>${setsHTML(v.sets,'work',item)}
 <div class="inline-actions"><button class="btn secondary small" id="addset">+ Dodaj serię</button><button class="btn secondary small" id="markall">✓ Potwierdź wszystkie wpisane</button></div>
 <div class="label">RIR ostatniej serii / ocena</div><select id="rir" class="rir-select"><option value="">— nie podano —</option>${['0','1','2','3+','Technika OK','Dyskomfort'].map(x=>`<option value="${x}" ${v.rir===x?'selected':''}>${esc(x)}</option>`).join('')}</select>`:`<p class="hint">Włącz ćwiczenie, aby uzupełnić serie. Pozostałe opcje core pozostają dostępne, ale nieobowiązkowe.</p>`}
 <div class="stepper"><button class="btn secondary" id="prev" ${index===0?'disabled':''}>← Wstecz</button><button class="btn" id="next" ${index===list.length-1?'disabled':''}>Następne →</button></div></div>
 <div class="panel"><div class="eyebrow">Notatka do treningu</div><textarea class="notes" id="notes" placeholder="Zmiana sprzętu, wykonane bonusy, RIR, ból, uwagi…">${esc(s.notes||'')}</textarea><div class="inline-actions"><button class="btn full" id="finish" ${!sum.done?'disabled':''}>✓ Zakończ i dodaj do historii (${sum.done} serii)</button></div><p class="hint">Dane zapisują się już w trakcie wpisywania. Zakończenie tworzy wpis w historii, ale nie jest wymagane do zachowania roboczego treningu.</p></div>`}
function allLogged(s){const items=[...(PLAN[s.day]?.items||[]),...CORE];return Object.entries(s.exercises||{}).map(([id,log])=>({item:items.find(x=>x.id===id)||{id,title:'Ćwiczenie archiwalne: '+id,mode:'reps'},log}));}
function sessionReport(s){const lines=[`Gym Tracker | ${s.date} | ${PLAN[s.day]?.name||s.day}`,`Źródło: ${s.source||'zapis użytkownika'}`];for(const {item,log} of allLogged(s)){
 lines.push(`\n${item.title}`);const vars=log.variants&&Object.keys(log.variants).length?log.variants:{[log.machine]:log};for(const [k,v] of Object.entries(vars)){
 const rows=(v.sets||[]).filter(x=>x.done);if(!rows.length)continue;lines.push(`  ${machineName(k)} (${unit(k)}): ${rows.map(x=>`${x.kg||'masa ciała'} × ${x.reps} ${measure(item)}`).join(' | ')}; RIR ${v.rir||'—'}`)}
 }if(s.notes)lines.push(`\nNotatka: ${s.notes}`);return lines.join('\n')}
function historyHTML(){const arr=[...state.history].reverse();const total=arr.reduce((n,h)=>n+allLogged(h).reduce((a,{log})=>a+(log.variants&&Object.keys(log.variants).length?Object.values(log.variants):[log]).reduce((b,v)=>b+(v.sets||[]).filter(x=>x.done).length,0),0),0);
 return `<section class="hero"><div class="eyebrow">Historia zapisana na urządzeniu</div><h1>Progres</h1><p class="muted">Przechowujemy wykonane serie i wybrane warianty sprzętu. Po skonfigurowaniu konta Azure historia będzie dostępna na wielu urządzeniach.</p></section><div class="statgrid"><div class="stat"><strong>${arr.length}</strong><span>Treningi</span></div><div class="stat"><strong>${total}</strong><span>Serie</span></div><div class="stat"><strong>${Object.keys(state.sessions).length}</strong><span>Rozpoczęte</span></div></div><div class="panel"><h2>Ostatnie treningi</h2>${arr.length?arr.map((h,i)=>`<div class="history-item"><div class="flex"><strong>${esc(PLAN[h.day]?.name||'Trening')}</strong><span class="chip">${esc(h.date)}</span></div><p class="hint">${esc(h.source||'Wprowadzone w aplikacji')}</p><pre style="white-space:pre-wrap;font:12px/1.5 system-ui;color:#b9d0d7">${esc(sessionReport(h))}</pre></div>`).join(''):'<div class="empty">Brak zakończonych treningów. Rozpocznij i potwierdź pierwszą serię.</div>'}</div>`}
function settingsHTML(){const draft=Object.values(state.sessions).map(s=>sessionReport(s)).join('\n\n')||'Brak rozpoczętych treningów';return `<section class="hero"><div class="eyebrow">Dane i kopie</div><h1>Bezpieczny zapis</h1><p class="muted">Każda zmiana jest automatycznie zapisywana lokalnie. IndexedDB + awaryjna kopia localStorage. Synchronizacja Azure jest dostępna w sekcji poniżej po zalogowaniu i konfiguracji bazy. Kopia JSON nadal jest zalecana.</p></section>
 <div class="panel"><h2>Eksport danych</h2><div class="inline-actions"><button class="btn" id="export">↓ Kopia JSON</button><button class="btn secondary" id="exportcsv">↓ Serie CSV</button></div><hr class="hr"><div class="label">Przywrócenie kopii JSON</div><input type="file" id="import" accept="application/json,.json" style="width:100%;margin:12px 0;color:#ccd8e1"><div class="warning">Import zastępuje dotychczasowe treningi na tym urządzeniu. Najpierw zrób kopię JSON.</div></div>
 <div class="panel"><h2>Awaryjny raport tekstowy</h2><p class="muted">Raport można zaznaczyć ręcznie, nawet jeśli funkcja kopiowania zawiedzie. Obejmuje potwierdzone serie z rozpoczętych treningów.</p><textarea readonly id="report" class="report">${esc(draft)}</textarea><div class="inline-actions"><button class="btn secondary" id="copy-report">Kopiuj raport</button></div></div>
 <div class="panel"><h2>iPhone i Azure</h2><p class="hint">Po wdrożeniu na HTTPS: Safari → Udostępnij → Dodaj do ekranu początkowego. Używaj stale tej samej instalacji / adresu. Brak backendu i logowania.</p><p class="hint">Hosting: Azure Static Web Apps Free. Do synchronizacji zaloguj się przez GitHub i połącz Azure Table Storage.</p></div>${window.GymCloud?.html?.()||''}`}
function csv(){const rows=[['date','day','exercise','machine','set','kg','reps_or_seconds','measure','rir','source','status']];for(const s of [...state.history,...Object.values(state.sessions)])for(const {item,log} of allLogged(s)){const variants=log.variants&&Object.keys(log.variants).length?log.variants:{[log.machine]:log};for(const [machine,v] of Object.entries(variants))(v.sets||[]).forEach((x,j)=>{if(x.done)rows.push([s.date,PLAN[s.day]?.name||s.day,item.title,machine,j+1,x.kg,x.reps,measure(item),v.rir||'',s.source||'aplikacja',state.history.includes(s)?'finished':'draft'])})}return rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\r\n')}
function download(name,content,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
function mutateSet(field,j,type,value){const {item}=currentItem(),v=currentVariant(item);const arr=type==='warm'?v.warmups:v.sets;arr[j][field]=value;save()}
function changeArea(area){state.activeArea=area;save(false);render()}
document.addEventListener('click',async event=>{
 const b=event.target.closest('button');if(!b)return;
  if(b.id&&b.id.startsWith('cloud-')){try{await GymCloud.action(b.id)}catch(e){console.warn('Cloud action:',e);toast('Błąd synchronizacji — lokalne dane zachowane')}render();return;}
 if(b.dataset.view){state.view=b.dataset.view;save(false);render();return}
 if(b.dataset.day!==undefined){state.activeDay=Number(b.dataset.day);state.activeArea='main';state.activeExercise=0;save(false);render();return}
 if(b.dataset.area){changeArea(b.dataset.area);return}
 if(b.dataset.item!==undefined){state.activeArea='main';state.activeExercise=Number(b.dataset.item);save(false);render();return}
 if(b.dataset.core!==undefined){state.activeArea='core';state.activeCore=Number(b.dataset.core);save(false);render();return}
 if(b.dataset.done!==undefined){const {item}=currentItem(),v=currentVariant(item),arr=b.dataset.type==='warm'?v.warmups:v.sets,s=arr[Number(b.dataset.done)];if(!s.done&&s.reps===''){toast('Uzupełnij powtórzenia lub sekundy');return}s.done=!s.done;if(state.activeArea==='core'&&s.done)activeSession().coreEnabled[item.id]=true;save();render();return}
 if(b.id==='next'||b.id==='prev'){const k=state.activeArea==='core'?'activeCore':'activeExercise';state[k]+=b.id==='next'?1:-1;save(false);render();return}
 if(b.id==='addset'){const {item}=currentItem(),v=currentVariant(item);if(v.sets.length>=15){toast('Maksymalnie 15 serii');return}v.sets.push({kg:'',reps:'',done:false});save();render();return}
 if(b.id==='markall'){const {item}=currentItem(),v=currentVariant(item);let n=0;for(const s of v.sets){if(!s.done&&s.reps!==''){s.done=true;n++}}if(state.activeArea==='core'&&n)activeSession().coreEnabled[item.id]=true;save();render();toast(`Potwierdzono ${n} serii`);return}
 if(b.id==='finish'){const s=activeSession(),sum=summary();if(!sum.done){toast('Najpierw potwierdź choć jedną serię');return}if(!confirm(`Zakończyć trening? Potwierdzone serie: ${sum.done}.`))return;
  state.history.push(JSON.parse(JSON.stringify({...s,source:'Wpisane w aplikacji',syncId:'history:'+(crypto.randomUUID?.()||Date.now()+'-'+Math.random().toString(36).slice(2))})));delete state.sessions[dateKey()+'-'+state.activeDay];state.view='history';save();window.GymCloud?.markDeleted?.('draft:'+dateKey()+'-'+state.activeDay);await GymStorage.flush();render();toast('Trening w historii, zapis lokalny wykonany');return}
 if(b.id==='export'){download('gym-tracker-backup-'+dateKey()+'.json',JSON.stringify(state,null,2),'application/json');return}
 if(b.id==='exportcsv'){download('gym-tracker-series-'+dateKey()+'.csv',csv(),'text/csv;charset=utf-8');return}
 if(b.id==='copy-report'){const t=document.getElementById('report');t.focus();t.select();try{await navigator.clipboard.writeText(t.value);toast('Skopiowano raport')}catch{toast('Raport zaznaczony — skopiuj ręcznie')}return}
});
document.addEventListener('change',async event=>{const el=event.target;
 if(el.id==='machine'){switchVariant(currentItem().item,el.value);save();render()}
 else if(el.id==='rir'){currentVariant(currentItem().item).rir=el.value;save()}
 else if(el.id==='enable-core'){activeSession().coreEnabled[currentItem().item.id]=el.checked;save();render()}
 else if(el.id==='import'){const file=el.files?.[0];if(!file)return;try{if(file.size>10*1024*1024)throw Error('Backup too large');const data=JSON.parse(await file.text());if(!data||!Array.isArray(data.history)||!data.sessions||typeof data.sessions!=='object')throw Error('Invalid structure');if(!confirm('Import zastąpi lokalny dziennik. Kontynuować?'))return;state=normalize(data);save();await GymStorage.flush();render();toast('Kopia przywrócona')}catch(e){console.error(e);toast('Błąd importu JSON')}}
});
document.addEventListener('input',event=>{const t=event.target;
 if(t.dataset.field){mutateSet(t.dataset.field,Number(t.dataset.set),t.dataset.type,t.value)}
 else if(t.id==='notes'){activeSession().notes=t.value;save()}
});
(async()=>{try{state=normalize(await GymStorage.load(status));}catch(e){console.error(e);status('⚠ Nie można wczytać danych','warn')}render();
  if(window.GymCloud)void GymCloud.init({getState:()=>state,hasWorkoutData,workoutRecords,cloudState,meaningfulSignature,workoutDetails,applySnapshot:async data=>{state=normalize({...state,history:data.history,sessions:data.sessions,savedAt:Date.now()});GymStorage.save(state);await GymStorage.flush();render()},backup:(name,data)=>download(name,JSON.stringify(data,null,2),'application/json'),onStatusChange:()=>{if(state.view==='settings')render()}});
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('SW:',e))})();
