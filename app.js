'use strict';
/* Zenek Gym Tracker v0.5 — date-first, Azure-authoritative training. */
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
// Product photos are matched to specific Matrix models. Generic equipment is not
// represented as a different machine. These URLs are presentation-only data.
const MACHINE_PHOTOS={
 'MG-PL70':{image:'https://fitnesswarehousecommercial.com.au/cdn/shop/files/Matrix_Magnum_Leg_Press_419ed4c9-8ed7-4116-8a0d-c09c564045fc.png?v=1711060353'},
 'G7-S70':{image:'https://img.archiexpo.de/images_ae/photo-g/141371-20457171.webp'},
 'MG-PL78':{image:'https://images.jhtassets.com/85183176a238980371eff92b0ef5308d1b94be66/'},
 'MG-PL77':{image:'https://images.jhtassets.com/4c3ad01082f528c7c7e1db5c8211f27c2eb09cdf/'},
 'G7-S71':{image:'https://www.prfitnessequipment.com/sites/default/files/commerce/product/cool%20sh.jpg'},
 'LEG-CURL':{image:'https://cdn-next.cybassets.com/media/W1siZiIsIjMwNjI2L3Byb2R1Y3RzLzUyNDAxOTEzLzE3MzQ1OTQzMjNfNTlmMWVhOTVlYzEwNGNiMzU2NGMucG5nIl0sWyJwIiwidGh1bWIiLCIyMDQ4eDIwNDgiXV0.png?sha=65794504bb4234fd',imageNote:'Zdjęcie poglądowe Matrix G7-S72. Dokładny model maszyny na siłowni nie jest potwierdzony.'},
 'MG-PL33':{image:'https://images.jhtassets.com/48132d53452a8ff93195f2c486da00a579294af3/'},
 'MG-PL34':{image:'https://assets.jhtbrand.co/files/product/617ea4b9339f1319abc366b4534d9caff9232b1c/'},
 'MG-PL23':{image:'https://tshop.r10s.jp/ifitness-shop/cabinet/06830920/06908620/07010130/matrix-mg-pl23-1.jpg'},
 'G7-S21':{image:'https://www.renewfit.com/photos_grd/ph1671718286621.jpg'},
 'MG-PL41':{image:'https://gigaplus.makeshop.jp/ifitness/img/matrix-for-gym/strength/magnum/mg-pl41/mg-pl41-2.jpg'},
 'G3-S45':{image:'https://centraledachats.lorangebleue.fr/media/cache/main_image/assets/fileuploads/5a/85/5a85a1ac429a1.PNG'},
 'G3-S12':{image:'https://static-data2.manualslib.com/product-images/264/26383/2638217/raw.jpg'},
 'G3-S22':{image:'https://static-data2.manualslib.com/product-images/892/2340529/matrix-g3-s22.jpg'}
};
for(const [id,photo] of Object.entries(MACHINE_PHOTOS))Object.assign(MACHINE[id],photo);
// Exercise photos. Credit links are shown in the app; unverified models are never labeled as exact.
const CORE_PHOTOS={
 'core-crunch':{image:'https://images.ctfassets.net/3s5io6mnxfqz/7qb4qHUCjKe8j487NACvu3/f7fb4f5d7ce91ae86e57d707bcf875a9/AdobeStock_29077916_2.jpeg',credit:'MasterClass',source:'https://www.masterclass.com/articles/cable-crunches-guide'},
 'core-knees':{image:'https://www.living.fit/cdn/shop/files/ca-16-vertical-knee-raise-2_535x.jpg?v=1755653302',credit:'Living.Fit',source:'https://www.living.fit/products/leg-raise-captains-chair-with-dip-and-push-up-station'},
 'core-woodchop':{image:'https://app-media.fitbod.me/v2/79/images/angles/1.jpg',credit:'Fitbod',source:'https://fitbod.me/exercises/cable-wood-chop'},
 'core-side-plank':{image:'https://pilatesc.jp/wp-content/uploads/2025/10/hj%E3%80%81%EF%BD%88%EF%BD%8A.1-1024x724.jpeg',credit:'Pilates C',source:'https://pilatesc.jp/onomichi-pilates-side-plank-hiplift/'},
 'core-rack':{image:'https://images.squarespace-cdn.com/content/v1/5a5e65fe8dd0411461e901a2/1518203311717-MQRQMQ5LMKLVPCDCMVSV/KBFitBrit_222.jpg?format=2500w',credit:'KB Fit Britt',source:'https://www.kbfitbritt.com/shop/biathlon',imageNote:'Pozycja front rack — w carry poruszaj się spokojnie, bez przechylania tułowia.'},
 'core-drag':{image:'https://www.mensjournal.com/.image/NDI6MDAwMDAwMDAxMTQ2ODQx/plank-drags-header.jpg',credit:"Men's Journal",source:'https://www.mensjournal.com/health-fitness/strength-coach-reveals-the-best-anti-movement-abs-exercises-for-a-bulletproof-core-and-heavier-compound-lifts'},
 'core-hollow':{image:'https://static.nike.com/a/images/f_auto/dpr_1.0%2Ccs_srgb/w_1212%2Cc_limit/4d42fe90-cdff-41a5-acad-50acce27a12f/how-to-do-a-handstand-push-up-according-to-crossfit-coaches.jpg',credit:'Nike',source:'https://www.nike.com/au/a/how-to-do-handstand-pushups'},
 'core-wheel':{image:'https://i0.wp.com/www.muscleandfitness.com/wp-content/uploads/2018/05/1109-ab-wheel-rollout.jpg?quality=86&strip=all',credit:'Muscle & Fitness',source:'https://www.muscleandfitness.com/workouts/abs-and-core-exercises/11-hardest-abs-exercises-all-time/'},
 'core-pallof':{image:'https://i.vimeocdn.com/video/1025961123-863a0a9daf9b4b20223983416f965e68fb569473a35b2b54318afb22318febbf-d',credit:'Vimeo',source:'https://vimeo.com/495920365'},
 'core-bend':{image:'https://static.movimente.me/media/imgs/exercises/IMG_0751.jpg',credit:'Movimente.me',source:'https://movimente.me/exercicio/flexao-lateral-de-tronco-em-pe-c-polia-baixa/'}
};
const DISPLAY_DAYS=[0,1,2,3,5]; // Preserve Friday's existing day=5 IDs in Azure and backups.
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
 {day:'Czw',name:'Czwartek — poza dziennikiem',items:[]},
 // Kept only for reading existing day=4 records. Hidden from day navigation.
 {day:'Archiwum',name:'Archiwalny trening siłowy (czwartek)',items:ARMS},
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
const initial=()=>({version:2,selectedDate:dateKey(),selectedRecordId:'',activeDay:todayDay(),activeExercise:0,activeArea:'main',activeCore:0,view:'train',sessions:{},history:[],savedAt:0});
let state=initial();
const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const machineName=k=>MACHINE[k]?.label||k;
function normalize(data){if(!data||typeof data!=='object'||!Array.isArray(data.history)||!data.sessions||typeof data.sessions!=='object'||Array.isArray(data.sessions))return initial();
 const s={...initial(),...data};if(Number(s.version)<2){
  if(s.activeDay===4)s.activeDay=5;
  s.history=s.history.map(h=>({...h,day:h.day===4?5:h.day}));
  const moved={};for(const [key,x] of Object.entries(s.sessions)){const originalDay=x.day;if(originalDay===4)x.day=5;const newKey=originalDay===4&&key.endsWith('-4')?key.slice(0,-1)+'5':key;moved[newKey]=x} s.sessions=moved;
 }
 s.version=2;s.selectedDate=/^\d{4}-\d{2}-\d{2}$/.test(s.selectedDate||'')?s.selectedDate:dateKey();s.activeDay=GymWeek.dayIndex(s.selectedDate);s.selectedRecordId=String(s.selectedRecordId||'');s.activeExercise=Math.max(0,Number(s.activeExercise)||0);s.activeCore=Math.max(0,Math.min(9,Number(s.activeCore)||0));return s;
}
function selectDate(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+'T12:00:00').getTime()))return;
 state.selectedDate=date;state.selectedRecordId='';
 state.activeDay=GymWeek.dayIndex(date);state.activeExercise=0;state.activeCore=0;state.activeArea='main';
 save(false);render();
}
const sessionKey=()=>state.selectedDate+'-'+state.activeDay;
function storedDay(){
 const {selectedDate,activeDay,selectedRecordId}=state;
 const found=state.history.filter(h=>h.date===selectedDate&&h.day===activeDay);
 if(selectedRecordId){
  const selected=found.find(h=>h.syncId===selectedRecordId);
  if(selected)return selected;
 }
 if(found.length)return found[found.length-1];
 return state.sessions[sessionKey()]||null;
}
function activeSession(create=false){
 const existing=storedDay();if(existing)return existing;
 const fresh={date:state.selectedDate,day:state.activeDay,started:new Date().toISOString(),exercises:{},coreEnabled:{},notes:''};
 if(create)state.sessions[sessionKey()]=fresh;
 return fresh;
}
function defaultLog(item){return {machine:item.options[0],sets:item.work.map(([kg,reps])=>({kg:String(kg),reps:String(reps),done:false})),warmups:(item.warm||[]).map(([kg,reps])=>({kg:String(kg),reps:String(reps),done:false})),rir:'',variants:{}};}
function exerciseLog(item,create=false){
 const session=activeSession(create);
 if(!session.exercises[item.id]&&create)session.exercises[item.id]=defaultLog(item);
 return session.exercises[item.id]||defaultLog(item);
}
function currentVariant(item,create=false){
 const log=exerciseLog(item,create),id=log.machine||item.options[0];
 if(!log.variants&&create)log.variants={};
 if(log.variants?.[id])return log.variants[id];
 const variant={sets:log.sets||item.work.map(([kg,reps])=>({kg:String(kg),reps:String(reps),done:false})),warmups:log.warmups||(item.warm||[]).map(([kg,reps])=>({kg:String(kg),reps:String(reps),done:false})),rir:log.rir||''};
 if(create)log.variants[id]=variant;
 return variant;
}
function switchVariant(item,newMachine){
 if(!item.options.includes(newMachine))return;
 const log=exerciseLog(item,true);
 currentVariant(item,true);
 log.machine=newMachine;
 if(!log.variants[newMachine])log.variants[newMachine]={sets:item.work.map(([,reps])=>({kg:'',reps:String(reps),done:false})),warmups:(item.warm||[]).map(([,reps])=>({kg:'',reps:String(reps),done:false})),rir:''};
}
function counted(item){
 const log=exerciseLog(item);
 const versions=log.variants&&Object.keys(log.variants).length?Object.values(log.variants):[log];
 return versions.reduce((n,v)=>n+(v.sets||[]).filter(x=>x.done).length,0);
}
function isCoreEnabled(item){const s=activeSession();return !!(s.coreEnabled?.[item.id]||counted(item)>0)}
function summary(){
 const d=state.activeDay,mainDone=PLAN[d].items.reduce((n,x)=>n+counted(x),0);
 const coreDone=CORE.reduce((n,x)=>n+counted(x),0);
 const planned=PLAN[d].items.reduce((n,x)=>n+x.work.length,0)+CORE.filter(isCoreEnabled).reduce((n,x)=>n+x.work.length,0);
 return {mainDone,coreDone,planned,done:mainDone+coreDone};
}
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
function setsHTML(list,type,item){
 return (list||[]).map((s,j)=>{
  const head=type==='warm'?'R'+(j+1):String(j+1);
  return '<div class="set-row '+(s.done?'done':'')+'"><strong>'+head+'</strong>'+
   '<input aria-label="Ciężar '+type+' '+(j+1)+'" inputmode="decimal" type="number" min="0" step="any" placeholder="kg" data-type="'+type+'" data-field="kg" data-set="'+j+'" value="'+esc(s.kg??'')+'">'+
   '<div class="nudge-wrap"><button type="button" data-nudge="-1" data-type="'+type+'" data-set="'+j+'" aria-label="Odejmij powtórzenie">−</button><input aria-label="'+esc(measure(item))+' '+type+' '+(j+1)+'" inputmode="numeric" type="number" min="0" step="1" placeholder="'+(item.mode?.startsWith('sec')?'s':'powt.')+'" data-type="'+type+'" data-field="reps" data-set="'+j+'" value="'+esc(s.reps??'')+'"><button type="button" data-nudge="1" data-type="'+type+'" data-set="'+j+'" aria-label="Dodaj powtórzenie">+</button></div>'+
   '<button type="button" class="done-button '+(s.done?'checked':'')+'" data-done="'+j+'" data-type="'+type+'" aria-label="Seria '+(j+1)+(s.done?' wykonana':' niewykonana')+'">'+(s.done?'✓':'○')+'</button></div>';
 }).join('');
}
function selectedDayReports(){return state.history.filter(h=>h.date===state.selectedDate&&h.day===state.activeDay)}
function trainHTML(){
 const calendar=GymWeek.html(state),d=state.activeDay;
 if(d===-1)return calendar+'<section class="hero"><div class="eyebrow">Dzień bez planu</div><h1>Regeneracja</h1><p class="muted">Sobota i niedziela są wolne od rejestrowania treningów. Możesz wybrać dowolny dzień w kalendarzu.</p></section>';
 if(d===3)return calendar+'<section class="hero"><div class="eyebrow">Dzień poza dziennikiem</div><h1>Czwartek</h1><p class="muted">Les Mills GRIT Strength pozostaje poza Gym Trackerem. Nie tworzymy serii ani wpisu do Azure.</p></section>';
 const s=activeSession(),day=PLAN[d],{item,index,list}=currentItem(),log=exerciseLog(item),v=currentVariant(item),m=MACHINE[log.machine]||MACHINE.BODY,sum=summary();
 const old=selectedDayReports(),saved=storedDay(),coreActive=state.activeArea==='core',enabled=isCoreEnabled(item);
 const tabs=day.items.map((e,i)=>{
  const done=counted(e);
  return '<button type="button" class="exercise-tab '+(!coreActive&&i===index?'active':'')+'" data-item="'+i+'"><span>'+(done?'✓ ':'' )+(i+1)+'. '+esc(e.title)+'</span>'+(done?'<small>'+done+' serii</small>':'')+'</button>';
 }).join('');
 const coreTabs=CORE.map((e,i)=>'<button type="button" class="core-choice '+(coreActive&&index===i?'active':'')+'" data-core="'+i+'">'+(isCoreEnabled(e)?'✓ ':'＋ ')+esc(e.title)+'</button>').join('');
 const selected=item.options.map(k=>'<option value="'+esc(k)+'" '+(log.machine===k?'selected':'')+'>'+esc(machineName(k))+'</option>').join('');
 const choices=item.options.map(k=>'<button type="button" class="machine-choice '+(log.machine===k?'active':'')+'" data-machine="'+esc(k)+'" title="'+esc(machineName(k))+'">'+esc(machineName(k).split(' · ')[0])+(log.variants?.[k]?.sets?.some(x=>x.done)?' ✓':'')+'</button>').join('');
 const image=coreActive?CORE_PHOTOS[item.id]||m:m,src=image?.image;
 const photo=src?'<img class="machine-img" loading="lazy" decoding="async" alt="'+esc(item.title+' — '+(coreActive?'przykład ćwiczenia':machineName(log.machine)))+'" src="'+esc(src)+'" onerror="this.hidden=true;this.nextElementSibling.hidden=false"><div class="image-error" hidden>Zdjęcie chwilowo niedostępne</div>':
  '<div class="image-error">'+esc(machineName(log.machine))+'<p>Zdjęcie tego wariantu nie jest jeszcze dostępne.</p></div>';
 const credit=image?.source?'<a class="img-link" target="_blank" rel="noopener noreferrer" href="'+esc(image.source)+'">Źródło zdjęcia: '+esc(image.credit||'materiał demonstracyjny')+'</a>':'';
 const photoNote=image?.imageNote?'<p class="photo-note">'+esc(image.imageNote)+'</p>':'';
 const previous=[...state.history,...Object.values(state.sessions)].filter(h=>h.date<state.selectedDate&&h.exercises?.[item.id]).sort((a,b)=>a.date.localeCompare(b.date)).reverse().find(h=>{
  const l=h.exercises[item.id];return l?.variants?.[log.machine]||l?.machine===log.machine;
 });
 const oldLog=previous?.exercises[item.id],oldVariant=oldLog?.variants?.[log.machine]||(oldLog?.machine===log.machine?oldLog:null);
 const oldRows=(oldVariant?.sets||[]).filter(x=>x.done);
 const preview=oldRows.length?'<div class="previous-results"><strong>Poprzednio · '+esc(previous.date)+'</strong><span>'+oldRows.map(x=>esc(x.kg||'BW')+' × '+esc(x.reps)).join(' · ')+'</span></div>':
  '<p class="hint">Wpisane liczby są propozycją. Nie są zaliczone, dopóki nie potwierdzisz serii.</p>';
 const switcher=old.length>1?'<div class="panel"><label class="label" for="session-picker">Kilka treningów tego dnia — wybierz do edycji</label><select class="equipment" id="session-picker">'+old.map((h,i)=>'<option value="'+esc(h.syncId||'')+'" '+(s===h?'selected':'')+'>Sesja '+(i+1)+' · '+esc(h.started?.slice(11,16)||h.date)+'</option>').join('')+'</select></div>':'';
 const todayBlock='<section class="hero compact-hero"><div class="eyebrow">'+esc(state.selectedDate)+' · '+(saved?'Istniejący zapis':'Nowy trening')+'</div><h1>'+esc(day.name)+'</h1><p class="muted">'+(saved?'Edytujesz zapis z wybranego dnia. Zmiany są zapisywane automatycznie.':'Wartości startowe są podpowiedzią. Dopiero wpisana zmiana lub potwierdzona seria utworzy zapis.')+'</p></section>';
 const overview='<div class="panel workout-overview"><div class="flex"><div><div class="eyebrow">Wykonane serie</div><div class="title">'+sum.done+'<span class="muted"> / '+sum.planned+'</span></div></div><span class="chip">'+esc(state.selectedDate)+'</span></div><div class="meter"><div style="width:'+(sum.planned?Math.round(100*sum.done/sum.planned):0)+'%"></div></div><p class="hint">Główne: '+sum.mainDone+' · CORE: '+sum.coreDone+'</p></div>';
 const chooseArea='<div class="inline-actions"><button class="btn '+(coreActive?'secondary':'')+'" data-area="main">🏋️ Trening</button><button class="btn '+(!coreActive?'secondary':'')+'" data-area="core">🧱 CORE BONUS</button></div>';
 const chooser=coreActive?'<div class="panel"><div class="eyebrow">Wybierz ćwiczenie CORE</div><p class="hint">Ćwiczenia opcjonalne. Nieaktywne nie są liczone do planu.</p><div class="core-chooser">'+coreTabs+'</div></div>':'<div class="exercise-strip">'+tabs+'</div>';
 const photoSection='<div class="img-frame">'+photo+'</div>'+credit+photoNote;
 const selectedVariants='<div class="label">Maszyna / hantle / zamiennik</div><div class="machine-options">'+choices+'</div><select id="machine" class="equipment" aria-label="Wybierz wariant sprzętu">'+selected+'</select>';
 const sets='<p class="ex-note">Jednostka: <strong>'+esc(unit(log.machine))+'</strong> · '+esc(measure(item))+'. Każdy wariant sprzętu ma osobne wyniki.</p>'+preview+
  (v.warmups?.length?'<div class="section-header"><strong>Rozgrzewka</strong><span class="smallcaps">Poza licznikiem serii</span></div><div class="set-head"><span>R</span><span>Ciężar, kg</span><span>Powt./czas</span><span>OK</span></div>'+setsHTML(v.warmups,'warm',item):'')+
  '<div class="section-header"><strong>Serie robocze</strong><span class="smallcaps">'+v.sets.filter(x=>x.done).length+' wykonano</span></div><div class="set-head"><span>S</span><span>Ciężar, kg</span><span>Powt./czas</span><span>OK</span></div>'+setsHTML(v.sets,'work',item)+
  '<div class="inline-actions"><button type="button" class="btn secondary small" id="addset">+ Seria</button><button type="button" class="btn secondary small" id="markall">✓ Potwierdź wszystkie wpisane</button></div>'+
  '<div class="label">RIR ostatniej serii / ocena</div><select id="rir" class="rir-select"><option value="">— nie podano —</option>'+['0','1','2','3+','Technika OK','Dyskomfort'].map(x=>'<option value="'+x+'" '+(v.rir===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select>';
 const exercise='<div class="panel"><div class="exercise-head"><div><div class="number">'+(coreActive?'CORE BONUS':'ĆWICZENIE')+' '+(index+1)+' / '+list.length+'</div><div class="title">'+esc(item.title)+'</div><p class="hint">'+esc(item.tip)+'</p></div></div>'+
  (coreActive?'<label class="core-toggle"><input type="checkbox" id="enable-core" '+(enabled?'checked':'')+'><strong>Dodaj do treningu</strong></label>':'')+
  selectedVariants+photoSection+(coreActive&&!enabled?'<p class="hint">Zaznacz „Dodaj do treningu”, by wpisywać serie. Zdjęcie i warianty są widoczne bez włączania ćwiczenia.</p>':sets)+
  '<div class="stepper"><button class="btn secondary" id="prev" '+(index===0?'disabled':'')+'>← Wstecz</button><button class="btn" id="next" '+(index===list.length-1?'disabled':'')+'>Następne →</button></div></div>';
 const notes='<div class="panel"><div class="eyebrow">Notatki · '+esc(state.selectedDate)+'</div><textarea class="notes" id="notes" placeholder="Maszyna, RIR, samopoczucie, ból, uwagi…">'+esc(s.notes||'')+'</textarea><p class="hint">Zapis automatyczny w Azure po zmianach. Nie trzeba kończyć treningu ani tworzyć drugiego wpisu.</p></div>';
 return calendar+todayBlock+switcher+overview+chooseArea+chooser+exercise+notes;
}
function allLogged(s){const items=[...(PLAN[s.day]?.items||[]),...CORE];return Object.entries(s.exercises||{}).map(([id,log])=>({item:items.find(x=>x.id===id)||{id,title:'Ćwiczenie archiwalne: '+id,mode:'reps'},log}));}
function sessionReport(s){const lines=[`Gym Tracker | ${s.date} | ${PLAN[s.day]?.name||s.day}`,`Źródło: ${s.source||'zapis użytkownika'}`];for(const {item,log} of allLogged(s)){
 lines.push(`\n${item.title}`);const vars=log.variants&&Object.keys(log.variants).length?log.variants:{[log.machine]:log};for(const [k,v] of Object.entries(vars)){
 const rows=(v.sets||[]).filter(x=>x.done);if(!rows.length)continue;lines.push(`  ${machineName(k)} (${unit(k)}): ${rows.map(x=>`${x.kg||'masa ciała'} × ${x.reps} ${measure(item)}`).join(' | ')}; RIR ${v.rir||'—'}`)}
 }if(s.notes)lines.push(`\nNotatka: ${s.notes}`);return lines.join('\n')}
function historyHTML(){return GymProgress.html(state,{PLAN,CORE,MACHINE,allLogged,sessionReport,machineName,unit,measure})}
function settingsHTML(){const draft=Object.values(state.sessions).map(s=>sessionReport(s)).join('\n\n')||'Brak rozpoczętych treningów';return `<section class="hero"><div class="eyebrow">Dane i kopie</div><h1>Bezpieczny zapis</h1><p class="muted">Każda zmiana jest automatycznie zapisywana lokalnie. IndexedDB + awaryjna kopia localStorage. Synchronizacja Azure jest dostępna w sekcji poniżej po zalogowaniu i konfiguracji bazy. Kopia JSON nadal jest zalecana.</p></section>
 <div class="panel"><h2>Eksport danych</h2><div class="inline-actions"><button class="btn" id="export">↓ Kopia JSON</button><button class="btn secondary" id="exportcsv">↓ Serie CSV</button></div><hr class="hr"><div class="label">Przywrócenie kopii JSON</div><input type="file" id="import" accept="application/json,.json" style="width:100%;margin:12px 0;color:#ccd8e1"><div class="warning">Import zastępuje dotychczasowe treningi na tym urządzeniu. Najpierw zrób kopię JSON.</div></div>
 <div class="panel"><h2>Awaryjny raport tekstowy</h2><p class="muted">Raport można zaznaczyć ręcznie, nawet jeśli funkcja kopiowania zawiedzie. Obejmuje potwierdzone serie z rozpoczętych treningów.</p><textarea readonly id="report" class="report">${esc(draft)}</textarea><div class="inline-actions"><button class="btn secondary" id="copy-report">Kopiuj raport</button></div></div>
 <div class="panel"><h2>iPhone i Azure</h2><p class="hint">Po wdrożeniu na HTTPS: Safari → Udostępnij → Dodaj do ekranu początkowego. Używaj stale tej samej instalacji / adresu. Brak backendu i logowania.</p><p class="hint">Hosting: Azure Static Web Apps Free. Do synchronizacji zaloguj się przez GitHub i połącz Azure Table Storage.</p></div>${window.GymCloud?.html?.()||''}`}
function csv(){const rows=[['date','day','exercise','machine','set','kg','reps_or_seconds','measure','rir','source','status']];for(const s of [...state.history,...Object.values(state.sessions)])for(const {item,log} of allLogged(s)){const variants=log.variants&&Object.keys(log.variants).length?log.variants:{[log.machine]:log};for(const [machine,v] of Object.entries(variants))(v.sets||[]).forEach((x,j)=>{if(x.done)rows.push([s.date,PLAN[s.day]?.name||s.day,item.title,machine,j+1,x.kg,x.reps,measure(item),v.rir||'',s.source||'aplikacja',state.history.includes(s)?'finished':'draft'])})}return rows.map(r=>r.map(x=>'"'+String(x??'').replaceAll('"','""')+'"').join(',')).join('\r\n')}
function download(name,content,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
function mutateSet(field,j,type,value){const {item}=currentItem(),v=currentVariant(item,true);const arr=type==='warm'?v.warmups:v.sets;arr[j][field]=value;save()}
function changeArea(area){state.activeArea=area;save(false);render()}
document.addEventListener('click',async event=>{
 const b=event.target.closest('button');if(!b)return;
 if(window.GymProgress?.handleClick?.(b,render))return;
 if(b.dataset.week!==undefined){selectDate(b.dataset.week==='today'?dateKey():GymWeek.shift(state.selectedDate,Number(b.dataset.week)));return}
 if(b.dataset.date!==undefined){selectDate(b.dataset.date);return}
 if(b.dataset.machine!==undefined){switchVariant(currentItem().item,b.dataset.machine);save();render();return}
 if(b.dataset.nudge!==undefined){const {item}=currentItem(),v=currentVariant(item,true),row=(b.dataset.type==='warm'?v.warmups:v.sets)[Number(b.dataset.set)];if(!row)return;const n=Number(row.reps)||0;row.reps=String(Math.max(0,n+Number(b.dataset.nudge)*(item.mode?.startsWith('sec')?5:1)));save();render();return}
  if(b.id&&b.id.startsWith('cloud-')){try{await GymCloud.action(b.id)}catch(e){console.warn('Cloud action:',e);toast('Błąd synchronizacji — lokalne dane zachowane')}render();return;}
 if(b.dataset.view){state.view=b.dataset.view;save(false);render();return}
 if(b.dataset.day!==undefined){const date=b.dataset.date;if(date)selectDate(date);return}
 if(b.dataset.area){changeArea(b.dataset.area);return}
 if(b.dataset.item!==undefined){state.activeArea='main';state.activeExercise=Number(b.dataset.item);save(false);render();return}
 if(b.dataset.core!==undefined){state.activeArea='core';state.activeCore=Number(b.dataset.core);save(false);render();return}
 if(b.dataset.done!==undefined){const {item}=currentItem(),v=currentVariant(item,true),arr=b.dataset.type==='warm'?v.warmups:v.sets,s=arr[Number(b.dataset.done)];if(!s)return;if(!s.done&&s.reps===''){toast('Uzupełnij powtórzenia lub sekundy');return}s.done=!s.done;if(state.activeArea==='core'&&s.done)activeSession(true).coreEnabled[item.id]=true;save();render();return}
 if(b.id==='next'||b.id==='prev'){const k=state.activeArea==='core'?'activeCore':'activeExercise';state[k]+=b.id==='next'?1:-1;save(false);render();return}
 if(b.id==='addset'){const {item}=currentItem(),v=currentVariant(item,true);if(v.sets.length>=15){toast('Maksymalnie 15 serii');return}v.sets.push({kg:'',reps:'',done:false});save();render();return}
 if(b.id==='markall'){const {item}=currentItem(),v=currentVariant(item,true);let n=0;for(const s of v.sets){if(!s.done&&s.reps!==''){s.done=true;n++}}if(state.activeArea==='core'&&n)activeSession(true).coreEnabled[item.id]=true;save();render();toast(`Potwierdzono ${n} serii`);return}
 if(b.id==='export'){download('gym-tracker-backup-'+dateKey()+'.json',JSON.stringify(state,null,2),'application/json');return}
 if(b.id==='exportcsv'){download('gym-tracker-series-'+dateKey()+'.csv',csv(),'text/csv;charset=utf-8');return}
 if(b.id==='copy-report'){const t=document.getElementById('report');t.focus();t.select();try{await navigator.clipboard.writeText(t.value);toast('Skopiowano raport')}catch{toast('Raport zaznaczony — skopiuj ręcznie')}return}
});
document.addEventListener('change',async event=>{const el=event.target;
 if(window.GymProgress?.handleChange?.(el,render))return;
 if(el.id==='week-date'){selectDate(el.value);return}
 if(el.id==='session-picker'){state.selectedRecordId=el.value;save(false);render();return}
 if(el.id==='machine'){switchVariant(currentItem().item,el.value);save();render()}
 else if(el.id==='rir'){currentVariant(currentItem().item,true).rir=el.value;save()}
 else if(el.id==='enable-core'){activeSession(true).coreEnabled[currentItem().item.id]=el.checked;save();render()}
 else if(el.id==='import'){const file=el.files?.[0];if(!file)return;try{if(file.size>10*1024*1024)throw Error('Backup too large');const data=JSON.parse(await file.text());if(!data||!Array.isArray(data.history)||!data.sessions||typeof data.sessions!=='object')throw Error('Invalid structure');if(!confirm('Import zastąpi lokalny dziennik. Kontynuować?'))return;state=normalize(data);save();await GymStorage.flush();render();toast('Kopia przywrócona')}catch(e){console.error(e);toast('Błąd importu JSON')}}
});
document.addEventListener('input',event=>{const t=event.target;
 if(t.dataset.field){mutateSet(t.dataset.field,Number(t.dataset.set),t.dataset.type,t.value)}
 else if(t.id==='notes'){activeSession(true).notes=t.value;save()}
});
(async()=>{try{state=normalize(await GymStorage.load(status));}catch(e){console.error(e);status('⚠ Nie można wczytać danych','warn')}render();
  if(window.GymCloud)void GymCloud.init({getState:()=>state,hasWorkoutData,workoutRecords,cloudState,meaningfulSignature,workoutDetails,applySnapshot:async data=>{state=normalize({...state,history:data.history,sessions:data.sessions,savedAt:Date.now()});GymStorage.save(state);await GymStorage.flush();render()},backup:(name,data)=>download(name,JSON.stringify(data,null,2),'application/json'),onStatusChange:()=>{if(state.view==='settings')render()}});
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('SW:',e))})();
