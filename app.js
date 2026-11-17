'use strict';
/* Zenek Gym Tracker v0.5 — date-first, Azure-authoritative training. */
const MACHINE={
 'MG-PL13':{label:'MG-PL13 · Supine Bench Press',type:'plates'},
 'MG-PL14':{label:'MG-PL14 · Incline Bench Press',type:'plates'},
 'MULTI-INCLINE':{label:'Multi Incline · stos',type:'stack'},'G3-S12':{label:'Matrix Pectoral Fly · G3-S12',type:'stack'},
 'G7-S22':{label:'G7-S22 · Pec Fly / Rear Delt',type:'stack'},
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
  make('legcurl','Seated Leg Curl',[[70,12],[70,11],[70,11]],['LEG-CURL','BAND-LEG-CURL'],'Kontrolowana faza opuszczania.'),
  make('glute','Glute Trainer',[[30,14],[30,13],[30,13]],['MG-PL78','DB-HIP-THRUST'],'Talerze łącznie.'),
  make('extension','Leg Extension',[[50,13],[50,13],[50,12]],['G7-S71','BAND-EXTENSION'],'Bez gwałtownego prostowania kolana.'),
  make('calf','Seated Calf Raise',[[30,15],[40,12]],['MG-PL77','DB-CALF'],'Pełna kontrola; wcześniej 6.11 bez potwierdzonych serii.')
 ]}
];
const CORE=[
 {...make('core-crunch','Cable Crunch',[[18,12],[18,12]],['CABLE','PLATE'],'Zbliżaj żebra do miednicy.'),mode:'reps'},
 {...make('core-knees','Hanging Knee Raise',[[0,10],[0,10]],['BODY','LYING-KNEES'],'Bez kołysania, podwijaj miednicę.'),mode:'reps'},
 {...make('core-woodchop','Cable Woodchop',[[9,10],[9,10]],['CABLE','BAND'],'Na każdą stronę, bez szarpania.'),mode:'side'},
 {...make('core-side-plank','Side Plank Hip Lift',[[0,10],[0,10]],['BODY','SIDE-PLANK-KNEES'],'Kontrolowane unoszenie bioder.'),mode:'side'},
 {...make('core-rack','KB Front Rack Carry',[[12,30],[12,30]],['KB','DUMBBELL'],'Sekundy na stronę; ciężar pojedynczego KB/hantla.'),mode:'secSide'},
 {...make('core-drag','KB Plank Drag',[[8,6],[8,6]],['KB','DUMBBELL'],'Powtórzenia na stronę. Nie obracaj tułowia.'),mode:'side'},
 {...make('core-hollow','Hollow Body Hold',[[0,25],[0,25]],['BODY','TUCK-HOLD'],'Sekundy; utrzymuj lędźwie stabilne.'),mode:'sec'},
 {...make('core-wheel','Ab Wheel Rollout',[[0,6],[0,6]],['AB-WHEEL','BODY'],'Rollout z kolan, nie zapadaj lędźwi.'),mode:'reps'},
 {...make('core-pallof','Pallof Walkout',[[9,6],[9,6]],['CABLE','BAND'],'Kroki na stronę; 9 kg próbne.'),mode:'stepsSide'},
 {...make('core-bend','Cable Side Bend',[[9,12],[9,12]],['CABLE','DUMBBELL'],'Powtórzenia na stronę, bez skrętu.'),mode:'side'}
];
Object.assign(MACHINE,{
 'BAND-LEG-CURL':{label:'Uginanie nóg z gumą — leżąc',type:'band'},
 'DB-HIP-THRUST':{label:'Hip thrust z hantlem (jeden hantel)',type:'single'},
 'BAND-EXTENSION':{label:'Prostowanie kolan z gumą — siedząc',type:'band'},
 'DB-CALF':{label:'Wspięcia siedząc z hantlem (jeden hantel)',type:'single'},
 'LYING-KNEES':{label:'Unoszenie kolan leżąc',type:'body'},
 'SIDE-PLANK-KNEES':{label:'Side plank z kolan — unoszenie bioder',type:'body'},
 'TUCK-HOLD':{label:'Hollow hold z ugiętymi kolanami',type:'body'}
});
const dateKey=()=>{const d=new Date();const p=x=>String(x).padStart(2,'0');return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())}`};
const todayDay=()=>{const d=new Date().getDay();return {1:0,2:1,3:2,4:3,5:5}[d]??0};
const initial=()=>({version:2,selectedDate:dateKey(),selectedRecordId:'',activeDay:todayDay(),activeExercise:0,activeArea:'main',activeCore:0,view:'train',sessions:{},history:[],savedAt:0});
const TRAINING_TYPES=[0,1,2,5,3,-1,-2];
const trainingName=day=>({0:'Klatka',1:'Plecy',2:'Barki, biceps, triceps',
  5:'Nogi, pośladki i core',3:'Les Mills GRIT Strength',
  '-1':'Dzień wolny / regeneracja','-2':'Inny trening'})[day]||'Inny trening';
function confirmedRows(record){
 return Object.values(record?.exercises||{}).reduce((sum,log)=>sum+
  Object.values(log?.variants&&Object.keys(log.variants).length?log.variants:{legacy:log})
   .reduce((n,v)=>n+[...(v?.sets||[]),...(v?.warmups||[])].filter(row=>row?.done===true).length,0),0);
}
function dayRecord(data,date){
 const sessions=Object.values(data.sessions||{}).filter(x=>x?.date===date);
 const historical=(data.history||[]).filter(x=>x?.date===date);
 const all=[...historical,...sessions];
 const pending=sessions.find(x=>x.restoreExpectedEtag!==undefined&&(data.unsavedDates||[]).includes(date+'|'+x.day))||sessions.find(x=>(data.unsavedDates||[]).includes(date+'|'+x.day));
 if(pending)return pending;
 const explicit=all.find(x=>x.syncId&&x.syncId===data.selectedRecordId);
 if(explicit)return explicit;
 // Older exports contain navigation-created templates for every workout type.
 // Confirmed work/warmups take precedence over those untouched templates.
 const completed=all.filter(x=>confirmedRows(x)>0);
 if(completed.length)return completed.sort((a,b)=>confirmedRows(b)-confirmedRows(a))[0];
 return all.find(x=>x.planOverride===true)||all.find(x=>x.planDefinition)||all.find(x=>String(x.notes||'').trim())||historical[historical.length-1]||null;
}
function trainingTypeForDate(date,data=state){
 const record=dayRecord(data,date);
 const day=Number(record?.day);
 return record&&TRAINING_TYPES.includes(day)?day:(GymPlans.scheduled(date)?.dayType??GymWeek.dayIndex(date));
}
let state=initial();
let pendingHistoryEdit=null;
// History edits are isolated from the Azure-synced state until explicit Save.
const cloneWorkout=value=>JSON.parse(JSON.stringify(value));
function dayCopy(date){return {
 sessions:Object.fromEntries(Object.entries(state.sessions).filter(([,r])=>r.date===date)),
 history:state.history.filter(r=>r.date===date),day:state.activeDay,selectedRecordId:state.selectedRecordId
};}
function rememberDay(){
 const date=state.selectedDate;
 const dirty=historyEditChanged()||(state.unsavedDates||[]).some(k=>k.startsWith(date+'|'));
 state.undoDays=state.undoDays||{};
 if(!dirty)state.undoDays[date]=cloneWorkout(dayCopy(date));
}
function undoDayHTML(){return '<button type="button" id="undo-training" class="btn secondary full" style="margin-top:8px" '+(!state.undoDays?.[state.selectedDate]?'disabled':'')+'>↶ Cofnij zmiany</button><p class="hint">Przywraca ostatni zapis wybranego dnia. Nie zmienia danych w Azure.</p>';}
async function undoSelectedDay(){
 if(savingWorkout)return;
 const requestedDate=state.selectedDate;
 if(window.GymCloud?.isBusy()){
  toast('Czekam na zakończenie synchronizacji…');
  for(let n=0;n<150&&window.GymCloud?.isBusy();n++)await new Promise(resolve=>setTimeout(resolve,100));
  if(window.GymCloud?.isBusy()||state.selectedDate!==requestedDate){toast('Ponów cofnięcie zmian po synchronizacji.');return;}
 }
 const date=state.selectedDate,original=state.undoDays?.[date];
 if(!original){toast('Brak zapisanej wersji do przywrócenia.');return;}
 state.sessions={...Object.fromEntries(Object.entries(state.sessions).filter(([,r])=>r.date!==date)),...cloneWorkout(original.sessions)};
 state.history=[...state.history.filter(r=>r.date!==date),...cloneWorkout(original.history)].sort((a,b)=>String(a.date).localeCompare(String(b.date)));
 state.unsavedDates=(state.unsavedDates||[]).filter(k=>!k.startsWith(date+'|'));
 pendingHistoryEdit=null;state.selectedRecordId=original.selectedRecordId||'';
 state.activeDay=original.day;state.activeExercise=0;state.activeCore=0;state.activeArea='main';
 save(false);await GymStorage.flush();render();toast('Przywrócono zapis z '+date+'.');
}
function historyEditChanged(){return !!pendingHistoryEdit&&JSON.stringify(pendingHistoryEdit.draft)!==pendingHistoryEdit.original}
function abandonHistoryEdit(){
 if(historyEditChanged()&&!confirm('Masz niezapisane zmiany w tym treningu. Odrzucić je?'))return false;
 pendingHistoryEdit=null;
 return true;
}
function savedHistoryRecord(){
 const {selectedDate,activeDay,selectedRecordId}=state;
 const options=state.history.filter(h=>h.date===selectedDate&&h.day===activeDay);
 return selectedRecordId?options.find(h=>h.syncId===selectedRecordId)||options[options.length-1]:options[options.length-1];
}
function editableHistoryRecord(){
 const originalRecord=savedHistoryRecord();
 if(!originalRecord){pendingHistoryEdit=null;return null;}
 const id=originalRecord.syncId||null,index=state.history.indexOf(originalRecord);
 const current=JSON.stringify(originalRecord);
 if(pendingHistoryEdit&&(id?pendingHistoryEdit.id===id:pendingHistoryEdit.index===index)&&
    pendingHistoryEdit.date===state.selectedDate&&pendingHistoryEdit.day===state.activeDay){
  // Refresh an untouched editor after authoritative Azure data loads.
  if(!historyEditChanged()&&pendingHistoryEdit.original!==current){
   pendingHistoryEdit.original=current;
   pendingHistoryEdit.draft=cloneWorkout(originalRecord);
  }
  return pendingHistoryEdit.draft;
 }
 pendingHistoryEdit={id,index,date:originalRecord.date,day:originalRecord.day,original:current,draft:cloneWorkout(originalRecord)};
 return pendingHistoryEdit.draft;
}

const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const machineName=k=>MACHINE[k]?.label||k;
// Catalogue alternatives remain available in older plan snapshots without rewriting them.
function availableMachineOptions(item){const current=[...PLAN.flatMap(p=>p.items),...CORE].find(x=>x.id===item.id);return [...new Set([...item.options,...(current?.options||[])])];}
GymPlans.init({PLAN,MACHINE,render:()=>render(true),toast,download});
function planFor(record,date=state.selectedDate,day=state.activeDay){
 if(![0,1,2,4,5].includes(Number(record?.day??day)))return null;
 const type=Number(record?.day??day),legacy=GymPlans.builtIn(type),configured=GymPlans.scheduled(date);
 return GymPlanModel.resolve(record,configured?.dayType===type?configured:legacy,legacy);
}
function activePlan(){return planFor(storedDay());}
function changeWorkoutPlan(id){
 const next=id==='builtin-'+state.activeDay?GymPlans.builtIn(state.activeDay):GymPlans.library().plans.find(p=>p.id===id&&p.dayType===state.activeDay);
 if(!next)return;const current=storedDay(),old=activePlan();if(old.id===id&&JSON.stringify(old)===JSON.stringify(next))return;
 if(current&&Object.keys(current.exercises||{}).length&&!confirm('Zmienić plan tego treningu? Wartości poprzedniego planu zostaną zachowane do przywrócenia.')){render();return;}
 rememberDay();const session=activeSession(true),choices=cloneWorkout(session.planChoices||{});
 choices[old.id]={planDefinition:old,exercises:cloneWorkout(session.exercises||{}),coreEnabled:cloneWorkout(session.coreEnabled||{}),notes:session.notes||''};
 const saved=choices[id]||{planDefinition:next,exercises:{},coreEnabled:{},notes:session.notes||''};
 Object.assign(session,cloneWorkout(saved),{planChoices:choices,planOverride:true});state.activeExercise=0;state.activeArea='main';save();render();
}
function planSelector(){
 const current=activePlan(),choices=[GymPlans.builtIn(state.activeDay),...GymPlans.library().plans.filter(p=>p.dayType===state.activeDay)];
 if(!choices.some(p=>p.id===current.id))choices.push(current);
 return '<div class="panel"><label class="label" for="workout-plan">Plan dla tego treningu</label><select class="equipment" id="workout-plan">'+choices.map(p=>'<option value="'+esc(p.id)+'" '+(p.id===current.id?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select><p class="hint">Rozpoczęty trening zachowuje swoją wersję planu.</p><button class="btn secondary" data-view="plans">Moje plany · edytuj</button></div>';
}
function normalize(data){if(!data||typeof data!=='object'||!Array.isArray(data.history)||!data.sessions||typeof data.sessions!=='object'||Array.isArray(data.sessions))return initial();
 const s={...initial(),...data};s.unsavedDates=Array.isArray(s.unsavedDates)?s.unsavedDates.filter(x=>/^\d{4}-\d{2}-\d{2}\|(?:[01235]|-1|-2)$/.test(x)):[];if(Number(s.version)<2){
  if(s.activeDay===4)s.activeDay=5;
  s.history=s.history.map(h=>({...h,day:h.day===4?5:h.day}));
  const moved={};for(const [key,x] of Object.entries(s.sessions)){const originalDay=x.day;if(originalDay===4)x.day=5;const newKey=originalDay===4&&key.endsWith('-4')?key.slice(0,-1)+'5':key;moved[newKey]=x} s.sessions=moved;
 }
 s.version=2;s.selectedDate=/^\d{4}-\d{2}-\d{2}$/.test(s.selectedDate||'')?s.selectedDate:dateKey();s.activeDay=trainingTypeForDate(s.selectedDate,s);s.selectedRecordId=String(s.selectedRecordId||'');s.activeExercise=Math.max(0,Number(s.activeExercise)||0);s.activeCore=Math.max(0,Math.min(9,Number(s.activeCore)||0));return s;
}
function selectDate(date){
 if(!/^\d{4}-\d{2}-\d{2}$/.test(date)||Number.isNaN(new Date(date+'T12:00:00').getTime()))return;
 if(date===state.selectedDate)return;
 if(!abandonHistoryEdit())return;
 state.selectedDate=date;state.selectedRecordId='';exerciseOptionsOpen=false;restControlsOpen=false;advancedOpen=false;exerciseQueueOpen=false;
 state.activeDay=trainingTypeForDate(date,state);state.activeExercise=0;state.activeCore=0;state.activeArea='main';
 save(false);render();
}
const sessionKey=()=>state.selectedDate+'-'+state.activeDay;
function storedDay(){
 const candidates=Object.values(state.sessions).filter(x=>
  x?.date===state.selectedDate&&Number(x.day)===state.activeDay);
 const candidate=candidates.find(x=>x.restoreExpectedEtag!==undefined)||candidates[0];
 const unsaved=(state.unsavedDates||[]).includes(state.selectedDate+'|'+state.activeDay);
 if(unsaved&&candidate)return candidate;
 return editableHistoryRecord()||candidate||null;
}
function activeSession(create=false){
 const existing=storedDay();if(existing){if(create&&!existing.planDefinition){const plan=planFor(existing);if(plan)existing.planDefinition=plan;}return existing;}
 const fresh={date:state.selectedDate,day:state.activeDay,started:new Date().toISOString(),exercises:{},coreEnabled:{},notes:''};
 if(create){const plan=planFor(null);if(plan)fresh.planDefinition=plan;state.sessions[sessionKey()]=fresh;}
 return fresh;
}
// Changing a calendar day chooses a different template, NOT a different
// global weekday plan. Old form values are kept as inactive per-plan snapshots.
function changeTrainingType(next){
 next=Number(next);
 if(!TRAINING_TYPES.includes(next)||next===state.activeDay)return;
 const previousDay=state.activeDay,date=state.selectedDate;
 const original=cloneWorkout(storedDay()||{
  date,day:previousDay,started:new Date().toISOString(),
  exercises:{},coreEnabled:{},notes:''
 });
 const snapshots=cloneWorkout(original.planSnapshots||{});
 snapshots[String(previousDay)]={exercises:cloneWorkout(original.exercises||{}),
  coreEnabled:cloneWorkout(original.coreEnabled||{}),notes:original.notes||'',planDefinition:original.planDefinition||([0,1,2,5].includes(previousDay)?activePlan():null),planChoices:original.planChoices||{}};
 const chosen=snapshots[String(next)]||{exercises:{},coreEnabled:{},notes:''};
 const hasSets=Object.values(original.exercises||{}).some(log=>
  Object.values(log?.variants&&Object.keys(log.variants).length?log.variants:{[log?.machine||'BODY']:log})
   .some(v=>(v?.sets||[]).some(x=>x.done)));
 if(hasSets&&!confirm('Ten dzień ma już wykonane serie. Zmienić trening na „'+trainingName(next)+'”?'+
  '\nPoprzednie wyniki pozostaną w kopii tego dnia i wrócą po wybraniu wcześniejszego rodzaju, dopóki ich nie zmienisz.'))return;
 const draft={...original,date,day:next,planOverride:true,planSnapshots:snapshots,
  exercises:cloneWorkout(chosen.exercises),coreEnabled:cloneWorkout(chosen.coreEnabled),
  notes:chosen.notes||''};
 delete draft.planDefinition;delete draft.planChoices;
 if(chosen.planDefinition)draft.planDefinition=cloneWorkout(chosen.planDefinition);
 else if([0,1,2,5].includes(next))draft.planDefinition=planFor(null,date,next);
 if(chosen.planChoices)draft.planChoices=cloneWorkout(chosen.planChoices);
 delete draft.syncId;
 // Pending editing is now represented by a persisted local form. The existing
 // Azure history row remains intact until the explicit Save button succeeds.
 pendingHistoryEdit=null;
 for(const [key,s] of Object.entries(state.sessions))if(s?.date===date)delete state.sessions[key];
 state.sessions[date+'-'+next]=draft;
 state.unsavedDates=(state.unsavedDates||[]).filter(x=>!x.startsWith(date+'|'));
 state.unsavedDates.push(date+'|'+next);
 state.activeDay=next;state.activeArea='main';state.activeExercise=0;state.activeCore=0;exerciseQueueOpen=false;
 state.selectedRecordId='';
 save(false);render();
 toast('Wybrano: '+trainingName(next)+'. Kliknij Zapisz, aby zatwierdzić.');
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
 if(!availableMachineOptions(item).includes(newMachine))return;
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
 const d=state.activeDay,mainDone=activePlan().items.reduce((n,x)=>n+counted(x),0);
 const coreDone=CORE.reduce((n,x)=>n+counted(x),0);
 const planned=activePlan().items.reduce((n,x)=>n+x.work.length,0)+CORE.filter(isCoreEnabled).reduce((n,x)=>n+x.work.length,0);
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
    if(session.planOverride===true)record.planOverride=session.day;
    if(session.planDefinition)record.planDefinition=session.planDefinition;
    if(session.planChoices)record.planChoices=session.planChoices;
    if(session.planSnapshots&&Object.keys(session.planSnapshots).length)record.planSnapshots=session.planSnapshots;
    if(String(session.notes||'').trim())record.notes=String(session.notes);
    const core=Object.entries(session.coreEnabled||{}).filter(([,enabled])=>!!enabled).map(([id])=>id).sort();
    if(core.length)record.core=core;
    const exerciseChanges=[];
    for(const [id,log] of Object.entries(session.exercises||{}).sort(([x],[y])=>x.localeCompare(y))){
      const item=session.planDefinition?.items.find(x=>x.id===id)||byId.get(id);
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
function save(sync=true){
 if(sync&&pendingHistoryEdit){renderSaveStatus();return;}
 // Form changes stay on the device until Save is clicked.
 if(sync&&state.view==='train'&&TRAINING_TYPES.includes(state.activeDay)){
  const key=state.selectedDate+'|'+state.activeDay;
  state.unsavedDates=[...new Set([...(state.unsavedDates||[]),key])];
  sync=false;
 }
 state.savedAt=Date.now();
 GymStorage.save(state);renderSaveStatus();
 if(sync)window.GymCloud?.schedule?.();
}
let savingWorkout=false;
async function saveSelectedWorkout(){
 if(savingWorkout)return;
 const date=state.selectedDate,day=state.activeDay;
 if(!TRAINING_TYPES.includes(day)){toast('Wybierz rodzaj treningu');return;}
 const previous=storedDay()||([-1,3,-2].includes(day)?activeSession(true):null);
 if(!previous){toast('Nie ma jeszcze wyników do zapisania');return;}
 const input=cloneWorkout(pendingHistoryEdit?.draft||previous);
 const draftEntry=Object.entries(state.sessions).find(([,record])=>record===previous);
 if(!input.syncId&&draftEntry)input.syncId='draft:'+draftEntry[0];
 if(!window.GymCloud?.saveWorkoutForDate){alert('Odśwież aplikację, żeby użyć nowego zapisu.');return;}
 savingWorkout=true;renderSaveStatus();
 const button=document.getElementById('save-training');
 if(button){button.disabled=true;button.textContent='Zapisywanie w Azure…';}
 try{
  const result=await GymCloud.saveWorkoutForDate(input);
  if(!result.ok){
   // Keep the form and pending edits on the device if the network fails.
   const draftKey=sessionKey();
   if(pendingHistoryEdit){
    const e=pendingHistoryEdit,at=e.id?state.history.findIndex(h=>h.syncId===e.id):e.index;
    if(at>=0){
     state.history[at]={...cloneWorkout(e.draft),syncId:state.history[at].syncId};
     state.selectedRecordId=state.history[at].syncId||'';
    }
    pendingHistoryEdit=null;
   }else{
    state.sessions[draftKey]=cloneWorkout(input);
   }
   state.unsavedDates=[...new Set([...(state.unsavedDates||[]),date+'|'+day])];
   save(false);await GymStorage.flush();
   render();
   alert(result.reason+'\nZachowałem wyniki na tym urządzeniu.');
   return;
  }
  // Keep only the canonical Azure record for this training day locally.
  state.history=state.history.filter(h=>result.preserveDateRecords?h.syncId!==result.id:h.date!==date);
  for(const [key,s] of Object.entries(state.sessions||{})){
   if(s.syncId===result.id||(result.preserveDateRecords?'draft:'+key===result.id:s.date===date&&Number(s.day)===day))delete state.sessions[key];
  }
  const record=cloneWorkout(result.record);
  if(result.kind==='history'){
   state.history.push({...record,syncId:result.id});
   state.history.sort((a,b)=>String(a.date).localeCompare(String(b.date))||
     String(a.started||'').localeCompare(String(b.started||'')));
   state.selectedRecordId=result.id;
  }else{
   state.sessions[result.id.slice(6)]=record;
   state.selectedRecordId='';
  }
  state.unsavedDates=(state.unsavedDates||[]).filter(k=>k!==date+'|'+day);
  pendingHistoryEdit=null;
  save(false);await GymStorage.flush();
  render();
  toast('Zapisano w Azure · '+date);
 }finally{
  savingWorkout=false;renderSaveStatus();
 }
}
function status(str,level){const n=document.getElementById('storage-status');if(n){n.textContent=str;n.classList.toggle('warn',level==='warn')}}
function toast(str){const t=document.getElementById('toast');t.textContent=str;t.style.display='block';clearTimeout(toast.timer);toast.timer=setTimeout(()=>t.style.display='none',2400)}
function measure(item){return {side:'Powt. / stronę',secSide:'Sekundy / stronę',sec:'Sekundy',stepsSide:'Kroki / stronę'}[item.mode]||'Powt.'}
function unit(machine){return {plates:'Talerze łącznie',perSide:'Talerze NA STRONĘ',stack:'Wskazanie stosu',dumbbell:'Jeden hantel',single:'Jeden hantel',body:'Masa ciała',kb:'Jeden kettlebell',plate:'Jeden talerz',band:'Guma',unknown:'Jednostka do ustalenia',extra:'Dodatkowy ciężar'}[MACHINE[machine]?.type]||'kg'}
function currentItem(){const list=state.activeArea==='core'?CORE:activePlan().items;const index=state.activeArea==='core'?state.activeCore:state.activeExercise;return {item:list[Math.min(index,list.length-1)],index,list}}
function render(force=false){renderSaveStatus();if(state.view==='plans'&&GymPlans.editing()&&document.getElementById('plan-form')&&!force)return;document.getElementById('today').textContent=new Date().toLocaleDateString('pl-PL',{day:'numeric',month:'short'});document.querySelectorAll('.navitem').forEach(n=>n.classList.toggle('active',n.dataset.view===state.view));if(state.view==='settings'&&document.getElementById('import-database')){window.GymProfiles?.render();renderCloudPanel();return}document.getElementById('app').innerHTML=state.view==='train'?trainHTML():state.view==='history'?historyHTML():state.view==='plans'?GymPlans.html():settingsHTML();window.GymProfiles?.render();updateRestTimer()}
// Warmups are optional once a work set has been started. Never drag the user
// back to an unfinished warmup while logging working sets.
function nextPendingSet(variant){
 const warm=variant.warmups||[],work=variant.sets||[];
 if(!work.some(row=>row.done)){
  const i=warm.findIndex(row=>!row.done);
  if(i!==-1)return {type:'warm',index:i};
 }
 const i=work.findIndex(row=>!row.done);
 return i===-1?null:{type:'work',index:i};
}
let warmupManual=null;
function warmupOpenFor(item,variant){
 const warm=variant.warmups||[],work=variant.sets||[];
 if(!warm.length)return false;
 if(warmupManual?.key===quickSetKey(item))return warmupManual.open;
 return warm.some(x=>!x.done)&&!work.some(x=>x.done);
}
function nextGuidedSet(item,variant){
 const candidate=nextPendingSet(variant);
 if(candidate?.type==='warm'&&!warmupOpenFor(item,variant)){
  const i=(variant.sets||[]).findIndex(x=>!x.done);
  return i<0?null:{type:'work',index:i};
 }
 return candidate;
}
function nextSetGuideHTML(item,variant){
 const next=nextGuidedSet(item,variant);
 if(!next)return '<strong>✓ Serie robocze zakończone</strong><span>Możesz przejść do następnego ćwiczenia.</span>';
 const row=(next.type==='warm'?variant.warmups:variant.sets)[next.index];
 const label=next.type==='warm'?'Rozgrzewka R':'Seria robocza S';
 const detail=String(row?.reps??'').trim();
 const kg=String(row?.kg??'').trim();
 return '<strong>Teraz: '+label+(next.index+1)+'</strong><span>'+
  (detail?esc((kg?kg+' kg · ':'')+detail+' '+measure(item)):'Wpisz wynik i zaznacz ✓')+'</span>';
}
function refreshGuidedSet(){
 if(state.view!=='train'||!document.querySelector('.active-exercise'))return;
 const {item}=currentItem(),variant=currentVariant(item),next=nextGuidedSet(item,variant);
 document.querySelectorAll('.active-exercise .set-row').forEach(el=>{
  const selected=el.dataset.setRow===(next?next.type+'-'+next.index:'');
  el.classList.toggle('is-next',selected);
  if(selected)el.setAttribute('aria-current','step');
  else el.removeAttribute('aria-current');
 });
 const guide=document.querySelector('.next-set-guide');
 if(guide)guide.innerHTML=nextSetGuideHTML(item,variant);
}
function revealNextSet(){
 const target=document.querySelector('.set-row.is-next')||document.querySelector('.exercise-finish');
 if(!target)return;
 const bounds=target.getBoundingClientRect();
 // Keep the next touch target out of the sticky header and the save dock.
 if(bounds.top<104||bounds.bottom>window.innerHeight-98)
  target.scrollIntoView({block:'center',behavior:'auto'});
}
function revealExercise(){
 const target=document.querySelector('.active-exercise');
 target?.scrollIntoView({block:'start',behavior:'auto'});
}
// Quick correction only changes UI selection; no workout record is created until editing.
let quickSetEdit=null;
function quickSetKey(item){return [state.selectedDate,state.activeDay,state.activeArea,item.id,exerciseLog(item).machine].join('|');}
const quickKgSteps=[0.5,1,2.5,5];
function quickKgStep(machine){
 const saved=Number(GymProfiles.preference('quickWeightSteps')?.[machine]);
 return quickKgSteps.includes(saved)?saved:(['stack','body','unknown','band'].includes(MACHINE[machine]?.type)?1:2.5);
}
function quickSetControls(type,index,item,row){
 const machine=exerciseLog(item).machine,step=quickKgStep(machine);
 const label=(type==='warm'?'R':'S')+(index+1);
 const repsIncrement=item.mode?.startsWith('sec')?5:1;
 const controls=(field,title,value,increment)=>{
  const button=(dir,symbol,verb)=>'<button type="button" class="fast-adjust-btn" data-fast-field="'+field+'" data-fast-dir="'+dir+'" data-type="'+type+'" data-set="'+index+'" aria-label="'+verb+' '+title.toLowerCase()+' w serii '+label+' o '+increment+'">'+symbol+'</button>';
  return '<div class="fast-adjust-group"><span class="fast-adjust-label">'+title+'</span><div class="fast-adjust-controls">'+
   button(-1,'−','Zmniejsz')+'<output class="fast-adjust-value" data-fast-value="'+field+'">'+esc(value===''?'—':value)+'</output>'+
   button(1,'+','Zwiększ')+'</div></div>';
 };
 const choices=quickKgSteps.map(n=>'<option value="'+n+'" '+(n===step?'selected':'')+'>'+String(n).replace('.',',')+' kg</option>').join('');
 return '<div class="set-fast-edit" data-fast-row="'+type+'-'+index+'" role="group" aria-label="Szybka korekta serii '+label+'">'+
  '<div class="fast-adjust-head"><strong>⚡ Szybka korekta '+label+'</strong><label>Skok ciężaru <select class="fast-kg-step" data-fast-step="'+esc(machine)+'" aria-label="Skok ciężaru">'+choices+'</select></label></div>'+
  '<div class="fast-adjust-grid">'+controls('kg','Ciężar (kg)',String(row.kg??''),String(step).replace('.',','))+
  controls('reps',esc(measure(item)),String(row.reps??''),String(repsIncrement))+'</div></div>';
}
function setsHTML(list,type,item){
 const next=nextGuidedSet(item,currentVariant(item));
 return (list||[]).map((s,j)=>{
  const head=(type==='warm'?'R':'S')+(j+1);
  const active=next?.type===type&&next.index===j;
  const selected=quickSetEdit?.key===quickSetKey(item)&&quickSetEdit.type===type&&quickSetEdit.index===j;
  const quick=selected?quickSetControls(type,j,item,s):'';
  // Keep planned sets intact; only extra work sets may be deleted.
  const remove=type==='work'&&j>=item.work.length
   ?'<button type="button" class="remove-set-btn" data-remove-set="'+j+'" aria-label="Usuń dodaną serię S'+(j+1)+'" title="Usuń serię S'+(j+1)+'">'+
    '<svg width="19" height="19" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">'+
    '<path d="M3 6h18M8 6V4h8v2m3 0-1 14H6L5 6m5 4v7m4-7v7"/></svg></button>':'';
  return '<div class="set-row '+(s.done?'done':'')+(active?' is-next':'')+(remove?' has-remove':'')+'" '+(active?'aria-current="step"':'')+' data-set-row="'+type+'-'+j+'"><button type="button" class="set-edit-toggle '+(selected?'selected':'')+'" data-quick-edit="'+type+'-'+j+'" aria-expanded="'+selected+'" aria-label="Szybka korekta serii '+head+'">'+head+'</button>'+
   '<input aria-label="Ciężar '+type+' '+(j+1)+'" inputmode="decimal" type="number" min="0" step="any" placeholder="kg" data-type="'+type+'" data-field="kg" data-set="'+j+'" value="'+esc(s.kg??'')+'">'+
   '<div class="nudge-wrap"><button type="button" data-nudge="-1" data-type="'+type+'" data-set="'+j+'" aria-label="Odejmij powtórzenie">−</button><input aria-label="'+esc(measure(item))+' '+type+' '+(j+1)+'" inputmode="numeric" type="number" min="0" step="1" placeholder="'+(item.mode?.startsWith('sec')?'s':'powt.')+'" data-type="'+type+'" data-field="reps" data-set="'+j+'" value="'+esc(s.reps??'')+'"><button type="button" data-nudge="1" data-type="'+type+'" data-set="'+j+'" aria-label="Dodaj powtórzenie">+</button></div>'+
   '<button type="button" class="done-button '+(s.done?'checked':'')+'" data-done="'+j+'" data-type="'+type+'" aria-label="Seria '+(j+1)+(s.done?' wykonana':' niewykonana')+'">'+(s.done?'✓':'○')+'</button>'+remove+'</div>'+quick;
 }).join('');
}
function exerciseMediaHTML(item,machine){
 const guide=window.GymExerciseGuides?.[item.id+'|'+machine];
 const tips={
  'BAND-LEG-CURL':'Leżąc na brzuchu zaczep gumę o stabilny punkt i kostkę. Zegnij kolano, utrzymując biodra nieruchomo, następnie powoli wyprostuj nogę.',
  'BAND-EXTENSION':'Siedząc zaczep gumę za sobą i na kostce. Prostuj kolano w kontrolowanym zakresie bez odrywania uda od siedziska.',
  'DB-HIP-THRUST':'Oprzyj górę pleców o stabilną ławkę. Przytrzymaj hantel na biodrach, unieś biodra do linii tułowia i powoli opuść.',
  'SIDE-PLANK-KNEES':'Oprzyj się bokiem na przedramieniu i ugiętych kolanach. Unieś biodra, utrzymując bark nad łokciem, potem kontrolowanie opuść.',
  'TUCK-HOLD':'Leżąc podwiń miednicę i dociśnij lędźwie do podłoża. Unieś łopatki oraz ugięte nogi; utrzymuj pozycję bez odrywania lędźwi.'
 };
 const product=window.GymPhotos?.[machine];
 const movementTips={
  flat:'Oprzyj plecy i ustabilizuj łopatki. Wypchnij ciężar przed klatkę, następnie powoli wróć do pozycji początkowej.',
  incline:'Oprzyj plecy o skośne oparcie. Wyciskaj ciężar w górę i powoli opuszczaj, utrzymując stabilne łopatki.',
  fly:'Lekko ugnij łokcie. Zbliż ramiona przed klatką, a następnie powoli je rozsuń bez wymuszania zakresu.',
  pullover:'Utrzymuj lekko ugięte łokcie. Prowadź ramiona kontrolowanym łukiem, bez wyginania dolnej części pleców.',
  lat:'Ustabilizuj tułów. Ściągnij łokcie w dół, następnie powoli pozwól ramionom wrócić w górę.',
  row:'Utrzymuj stabilny tułów. Przyciągnij uchwyty w stronę żeber i powoli wyprostuj ramiona.',
  straight:'Utrzymuj lekko ugięte, nieruchome łokcie. Ściągnij uchwyt w stronę ud i powoli wróć.',
  rear:'Ustabilizuj tułów i lekko ugnij łokcie. Rozsuń ramiona na boki, następnie powoli wróć.',
  'back-extension':'Zginaj i prostuj tułów w kontrolowanym zakresie. Zakończ ruch w neutralnym ustawieniu, bez przeprostu lędźwi.',
  laterals:'Lekko ugnij łokcie. Unieś ramiona na boki do wysokości barków i powoli opuść, bez kołysania tułowiem.',
  shoulder:'Ustabilizuj plecy. Wyciskaj ciężar nad barki, następnie powoli opuszczaj bez wyginania lędźwi.',
  preacher:'Oprzyj ramiona o podpórkę. Zegnij łokcie i powoli opuszczaj ciężar, nie odrywając ramion.',
  'triceps-rope':'Trzymaj łokcie przy tułowiu. Wyprostuj przedramiona w dół i powoli wróć bez poruszania barkami.',
  hammer:'Trzymaj dłonie skierowane do siebie. Zginaj łokcie bez kołysania tułowiem i powoli opuszczaj ciężar.',
  'triceps-preacher':'Ustabilizuj ramiona na podpórce lub przy tułowiu. Prostuj łokcie i powoli wracaj, bez gwałtownego blokowania.',
  legpress:'Oprzyj plecy i ustaw całe stopy na platformie. Prostuj nogi bez blokowania kolan i wracaj bez odrywania miednicy.',
  legcurl:'Ustabilizuj uda i biodra. Zginaj kolana, następnie powoli prostuj nogi bez szarpania.',
  glute:'Ustabilizuj plecy i stopy. Unieś biodra, napinając pośladki, następnie powoli opuść bez przeprostu lędźwi.',
  extension:'Oprzyj plecy i ustabilizuj uda. Prostuj kolana w kontrolowanym zakresie i powoli opuszczaj ciężar.',
  calf:'Oprzyj przodostopie i ustabilizuj kolana. Unieś pięty, następnie powoli opuść je bez odbijania.',
  'core-crunch':'Zbliżaj żebra do miednicy, napinając brzuch. Powoli wracaj bez ciągnięcia ciężaru samymi ramionami.',
  'core-knees':'Podwijaj miednicę i przyciągaj kolana do tułowia. Opuszczaj nogi powoli, bez kołysania.',
  'core-woodchop':'Prowadź uchwyt po skosie przez tułów. Kontroluj obrót i wracaj powoli, bez szarpania.',
  'core-side-plank':'Oprzyj się bokiem na przedramieniu. Kontrolowanie unoś i opuszczaj biodra, utrzymując bark nad łokciem.',
  'core-rack':'Trzymaj ciężar przy barku i napnij brzuch. Idź małymi krokami bez przechylania tułowia.',
  'core-drag':'W podporze przeciągaj ciężar pod tułowiem drugą ręką. Utrzymuj biodra stabilnie, bez obracania.',
  'core-hollow':'Dociśnij lędźwie do podłoża i unieś łopatki oraz nogi. Utrzymuj pozycję bez odrywania dolnej części pleców.',
  'core-wheel':'Z klęku przesuwaj kółko lub dłonie do przodu, napinając brzuch. Wróć bez zapadania lędźwi.',
  'core-pallof':'Trzymaj uchwyt przed tułowiem i napnij brzuch. Odchodź małymi krokami w bok, nie pozwalając na obrót.',
  'core-bend':'Wykonuj kontrolowany skłon boczny i wracaj do pionu. Nie skręcaj tułowia ani nie szarp ciężarem.'
 };
 const instruction='<div class="detail movement-instruction"><strong>Jak wykonać</strong><p>'+esc(tips[machine]||movementTips[item.id]||guide?.tip||item.tip)+'</p></div>';
 const movement=guide?'<div class="movement-photos">'+guide.images.map((src,i)=>'<figure><img class="movement-img" loading="lazy" src="'+esc(src)+'" alt="'+esc(guide.title)+' — pozycja '+(i+1)+'" onerror="this.hidden=true;this.nextElementSibling.textContent=\'Zdjęcie niedostępne — skorzystaj z instrukcji powyżej\'"><figcaption>Pozycja '+(i+1)+'</figcaption></figure>').join('')+'</div><a class="img-link" target="_blank" rel="noopener noreferrer" href="'+esc(guide.source)+'">Demonstracja: '+esc(guide.credit)+'</a>':'<p class="hint">Dla tego wariantu nie ma jeszcze zweryfikowanej fotografii wykonania. Skorzystaj z instrukcji powyżej.</p>';
 const reference=product?.local?'<section class="machine-reference"><strong>Rozpoznaj maszynę · '+esc(machineName(machine))+'</strong><p class="hint">Zdjęcie sprzętu, nie demonstracja ćwiczenia.</p><img class="machine-img" loading="lazy" src="'+esc(product.local)+'" alt="'+esc(machineName(machine))+'"><p class="hint">'+esc(product.note||'Porównaj oznaczenie modelu na maszynie.')+'</p><a class="img-link" target="_blank" rel="noopener noreferrer" href="'+esc(product.source)+'">Źródło: '+esc(product.credit)+'</a></section>':'';
 return instruction+'<details class="exercise-media"><summary>Pokaż wykonanie i sprzęt</summary>'+movement+(guide?.note?'<p class="hint">'+esc(guide.note)+'</p>':'')+reference+'</details>';
}
function selectedDayReports(){return state.history.filter(h=>h.date===state.selectedDate&&h.day===state.activeDay)}
let restUntil=0,restAlerted=false;
const restKey='gym-rest-timer'+GymProfiles.suffix();
try{restUntil=Number(sessionStorage.getItem(restKey))||0;}catch{}
function persistRestTimer(){try{sessionStorage.setItem(restKey,String(restUntil));}catch{}}
function restOptions(){return GymProfiles.preference('restTimer')||{seconds:90,auto:false};}
function restTimerHTML(){
 const options=restOptions();
 return '<div class="rest-timer-bar"><details class="rest-timer" '+(restControlsOpen?'open':'')+'><summary>⏱ Przerwa <strong id="rest-remaining">—</strong><span class="rest-hint">⌄</span></summary>'+
  '<div class="rest-controls"><label>Czas <select id="rest-duration" aria-label="Czas przerwy">'+[30,60,90,120,180,240].map(n=>'<option value="'+n+'" '+(n===Number(options.seconds)?'selected':'')+'>'+n+' s</option>').join('')+'</select></label>'+
  '<label><input type="checkbox" id="rest-auto" '+(options.auto?'checked':'')+'> Auto po serii</label>'+
  '<div class="inline-actions"><button type="button" class="btn secondary small" id="rest-start">Start</button>'+
  '<button type="button" class="btn secondary small" data-rest-adjust="-15">−15 s</button>'+
  '<button type="button" class="btn secondary small" data-rest-adjust="15">+15 s</button>'+
  '<button type="button" class="btn secondary small" id="rest-skip">Pomiń</button></div></div></details>'+
  '<button type="button" class="btn secondary small" id="rest-quick-start" aria-label="Uruchom przerwę '+Number(options.seconds||90)+' sekund">Start '+Number(options.seconds||90)+' s</button></div>';
}
function updateRestTimer(){const label=document.getElementById('rest-remaining');if(!label)return;const left=restUntil?Math.max(0,Math.ceil((restUntil-Date.now())/1000)):0;label.textContent=restUntil?Math.floor(left/60)+':'+String(left%60).padStart(2,'0'):'—';if(restUntil&&left===0&&!restAlerted){restAlerted=true;toast('Koniec przerwy');}}
setInterval(updateRestTimer,1000);
function lastCompletedVariant(item,machine){
 const records=[...state.history,...Object.values(state.sessions)].filter(h=>h.date<state.selectedDate&&h.exercises?.[item.id]).sort((a,b)=>b.date.localeCompare(a.date)||String(b.started||'').localeCompare(String(a.started||'')));
 for(const record of records){const definition=record.planDefinition?.items.find(x=>x.id===item.id)||[...PLAN.flatMap(p=>p.items),...CORE].find(x=>x.id===item.id);if((definition?.mode||'reps')!==(item.mode||'reps'))continue;const log=record.exercises[item.id],variant=log?.variants?.[machine]||(log?.machine===machine?log:null);const rows=(variant?.sets||[]).filter(row=>row.done===true);if(rows.length)return {record,rows};}
 return null;
}
// Suggest values, never confirmation: one tap reuses the last completed set
// for the SAME exercise and SAME equipment variant. Earlier sessions are
// considered only when the variant has no completed preceding work set.
function quickFillSuggestion(item,variant){
 const index=(variant.sets||[]).findIndex(row=>!row.done);
 if(index<0)return null;
 let candidate=null,source='';
 for(let i=index-1;i>=0;i--){
  const row=variant.sets[i];
  if(row?.done&&String(row.reps??'')!==''){candidate=row;source='serii S'+(i+1);break;}
 }
 if(!candidate){
  const previous=lastCompletedVariant(item,exerciseLog(item).machine);
  candidate=previous?.rows[index]||previous?.rows[previous.rows.length-1];
  if(previous&&candidate)source='treningu '+previous.record.date;
 }
 if(!candidate)return null;
 const kg=String(candidate.kg??''),reps=String(candidate.reps??'');
 if(!reps)return null;
 const row=variant.sets[index];
 if(String(row.kg??'')===kg&&String(row.reps??'')===reps)return null;
 return {index,kg,reps,source};
}
function nextUnfinishedExercise(){
 if(state.activeArea!=='main')return null;
 const items=activePlan().items,active=Math.min(state.activeExercise,items.length-1);
 for(let offset=1;offset<items.length;offset++){
  const index=(active+offset)%items.length,item=items[index];
  if(counted(item)<item.work.length)return {index,title:item.title};
 }
 return null;
}
function machineNoteKey(item,machine){return item.id+'|'+machine;}
let exerciseOptionsOpen=false;
let restControlsOpen=false;
let advancedOpen=false;
let exerciseQueueOpen=false;
function trainHTML(){
 rememberDay();
 const calendar=GymWeek.html(state),d=state.activeDay;
 const standard=GymPlans.scheduled(state.selectedDate)?.dayType??GymWeek.dayIndex(state.selectedDate);
 const selectedOptions=TRAINING_TYPES.map(x=>'<option value="'+x+'" '+(x===d?'selected':'')+'>'+esc(trainingName(x))+(x===standard?' (domyślnie)':'')+'</option>').join('');
 const dayProgress=[-1,3,-2].includes(d)?'':(()=>{
  const progress=summary(),percent=progress.planned?Math.round(progress.done/progress.planned*100):0;
  return '<div class="day-progress"><div class="flex"><span>'+progress.done+' / '+progress.planned+' serii wykonanych</span><strong>'+percent+'%</strong></div><div class="meter"><div style="width:'+percent+'%"></div></div></div>';
 })();
 const typeSelector='<section class="panel train-day-summary"><div class="train-day-header"><div class="day-title"><div class="eyebrow">'+esc(state.selectedDate)+'</div>'+
  '<h1>'+esc([-1,3,-2].includes(d)?trainingName(d):activePlan().name)+'</h1></div>'+
  '<label class="train-type-control"><span>Zmień trening</span><select id="workout-type" aria-label="Rodzaj treningu">'+selectedOptions+'</select></label></div>'+
  dayProgress+'</section>';
 if([-1,3,-2].includes(d)){
  const note=storedDay()?.notes||'';
  const details=d===-1?'Dzień bez treningu — regeneracja.':d===3?
   'Les Mills GRIT Strength — bez liczenia serii.':'Zapisz dowolną inną aktywność w notatkach.';
  return calendar+typeSelector+'<p class="hint">'+esc(details)+'</p>'+
   '<div class="panel training-notes"><label class="label" for="notes">Notatka do dnia</label>'+
   '<textarea class="notes" id="notes" placeholder="Opcjonalny opis dnia lub aktywności…">'+esc(note)+'</textarea>'+
   '<details class="train-additional" '+(advancedOpen?'open':'')+' ><summary>Cofnij zmiany i historia wersji</summary>'+undoDayHTML()+versionsHTML()+'</details></div>'+
   '<section class="panel train-save-section" aria-label="Zapis dnia"><button type="button" id="save-training" class="btn full save-training-btn">✓ Zapisz dzień w Azure</button><p class="hint">Zapisz dzień w bazie, gdy skończysz edycję.</p></section>';
 }
 const s=activeSession(),day=activePlan(),{item,index,list}=currentItem(),log=exerciseLog(item),v=currentVariant(item),m=MACHINE[log.machine]||MACHINE.BODY,sum=summary();
 const old=selectedDayReports(),saved=storedDay(),coreActive=state.activeArea==='core',enabled=isCoreEnabled(item);
 const tabs=day.items.map((e,i)=>{
  const done=counted(e);
  return '<button type="button" class="exercise-tab '+(!coreActive&&i===index?'active':'')+'" data-item="'+i+'" aria-current="'+(!coreActive&&i===index?'step':'false')+'">'+
   '<span class="exercise-list-number">'+(done>=e.work.length&&done?'✓':i+1)+'</span>'+
   '<span class="exercise-list-name">'+esc(e.title)+'</span><small>'+done+' / '+e.work.length+'</small>'+
   '<span class="exercise-list-chevron" aria-hidden="true">'+(!coreActive&&i===index?'▾':'›')+'</span></button>';
 }).join('');
 const coreTabs=CORE.map((e,i)=>'<button type="button" class="core-choice '+(coreActive&&index===i?'active':'')+'" data-core="'+i+'">'+(isCoreEnabled(e)?'✓ ':'＋ ')+esc(e.title)+'</button>').join('');
 const choices=availableMachineOptions(item).map(k=>'<button type="button" class="machine-choice '+(log.machine===k?'active':'')+'" data-machine="'+esc(k)+'" aria-pressed="'+(log.machine===k)+'" title="'+esc(machineName(k))+'">'+esc(machineName(k))+(log.variants?.[k]?.sets?.some(x=>x.done)?' ✓':'')+'</button>').join('');
 const previous=lastCompletedVariant(item,log.machine),oldRows=previous?.rows||[];
 const preview=oldRows.length?'<div class="previous-compact"><div><strong>Poprzednio · '+esc(previous.record.date)+'</strong><span>'+oldRows.slice(0,4).map(x=>esc(x.kg||'0')+' kg × '+esc(x.reps)).join(' · ')+(oldRows.length>4?' …':'')+'</span></div><button type="button" class="btn secondary small" id="copy-previous">Użyj</button></div>':
  '<p class="hint">Wartości są podpowiedzią — zaznacz ✓, aby zaliczyć serię.</p>';
 const machineNotes=window.GymProfiles?.preference('machineNotes')||{};
 const machineNote='<label class="label" for="machine-note">Ustawienia maszyny / notatka do wariantu</label><textarea id="machine-note" class="notes" maxlength="150" placeholder="Np. wysokość siedziska, ustawienie uchwytów">'+esc(machineNotes[machineNoteKey(item,log.machine)]||'')+'</textarea><p class="hint">Zapamiętywane dla tego profilu, ćwiczenia i wariantu.</p>';
 const switcher=old.length>1?'<div class="panel"><label class="label" for="session-picker">Kilka treningów tego dnia — wybierz do edycji</label><select class="equipment" id="session-picker">'+old.map((h,i)=>'<option value="'+esc(h.syncId||'')+'" '+(s===h?'selected':'')+'>Sesja '+(i+1)+' · '+esc(h.started?.slice(11,16)||h.date)+'</option>').join('')+'</select></div>':'';
 const todayBlock='<section class="hero compact-hero"><div class="eyebrow">'+esc(state.selectedDate)+' · '+(saved?'Istniejący zapis':'Nowy trening')+'</div><h1>'+esc(day.name)+'</h1><p class="muted">'+(savedHistoryRecord()?'Popraw wyniki i wybierz „Zapisz zmiany”. Zastąpisz istniejący wpis bez duplikatu.':saved?'Rozpoczęte serie zapisują się automatycznie.':'Wartości startowe są podpowiedzią. Dopiero wpisana zmiana lub potwierdzona seria utworzy zapis.')+'</p></section>';
 const overview='<div class="panel workout-overview"><div class="flex"><div><div class="eyebrow">Wykonane serie</div><div class="title">'+sum.done+'<span class="muted"> / '+sum.planned+'</span></div></div><span class="chip">'+esc(state.selectedDate)+'</span></div><div class="meter"><div style="width:'+(sum.planned?Math.round(100*sum.done/sum.planned):0)+'%"></div></div><p class="hint">Główne: '+sum.mainDone+' · CORE: '+sum.coreDone+'</p></div>';
 const chooseArea='<div class="train-area-switch" role="group" aria-label="Obszar treningu"><button class="btn '+(coreActive?'secondary':'')+'" data-area="main" aria-pressed="'+!coreActive+'">🏋️ Trening</button><button class="btn '+(!coreActive?'secondary':'')+'" data-area="core" aria-pressed="'+coreActive+'">🧱 CORE BONUS</button></div>';
 const completeExercises=day.items.filter(e=>counted(e)>=e.work.length).length;
 const queueDots=day.items.map((e,i)=>'<span class="queue-dot '+(counted(e)>=e.work.length?'complete':'')+(i===state.activeExercise?' selected':'')+'"></span>').join('');
 const queueSummary='<summary><span class="queue-summary-text"><strong>Lista ćwiczeń</strong><small>'+completeExercises+' z '+day.items.length+' ukończonych · wybrane '+(state.activeExercise+1)+'/'+day.items.length+'</small></span>'+
  '<span class="queue-dots" aria-hidden="true">'+queueDots+'</span><span class="queue-chevron" aria-hidden="true">⌄</span></summary>';
 const chooser=coreActive?'<div class="panel core-choice-panel"><div class="eyebrow">Wybierz ćwiczenie CORE</div><p class="hint">Ćwiczenia opcjonalne. Nieaktywne nie są liczone do planu.</p><div class="core-chooser">'+coreTabs+'</div></div>':
  '<details class="exercise-queue" '+(exerciseQueueOpen?'open':'')+'>'+queueSummary+'<div class="exercise-strip">'+tabs+'</div></details>';
 const photoSection=exerciseMediaHTML(item,log.machine);
 const selectedVariants='<div class="label" id="machine-label">Maszyna / hantle / zamiennik</div><div class="machine-options" role="group" aria-labelledby="machine-label">'+choices+'</div>';
 const quickFill=quickFillSuggestion(item,v);
 const quickFillHTML=quickFill?'<div class="quick-fill-offer"><span>Do serii S'+(quickFill.index+1)+' z '+esc(quickFill.source)+': <strong>'+esc(quickFill.kg||'0')+' kg × '+esc(quickFill.reps)+'</strong></span><button type="button" class="btn secondary small" id="quick-fill-set" data-target-set="'+quickFill.index+'" aria-label="Wstaw wartości do serii S'+(quickFill.index+1)+'">Wstaw</button></div>':'';
 const finishedWork=v.sets?.length>0&&v.sets.every(x=>x.done);
 const nextWork=finishedWork&&!coreActive?nextUnfinishedExercise():null;
 const completionHTML=finishedWork?'<div class="exercise-finish" role="status">✓ Serie robocze ukończone. Uzupełnij RIR lub popraw wynik.'+
  (nextWork?'<button type="button" class="btn full next-unfinished" data-next-unfinished="'+nextWork.index+'">Dalej: '+esc(nextWork.title)+' →</button>':
   (!coreActive?'<p>Wszystkie główne ćwiczenia ukończone. Zapisz trening w Azure.</p>':''))+'</div>':'';

 const sets=restTimerHTML()+'<p class="ex-note">Jednostka: <strong>'+esc(unit(log.machine))+'</strong> · '+esc(measure(item))+'. Każdy wariant sprzętu ma osobne wyniki.</p>'+preview+
  (v.warmups?.length?'<div class="section-header"><strong>Rozgrzewka</strong><span class="smallcaps">Poza licznikiem serii</span></div><div class="set-head"><span>R</span><span>Ciężar, kg</span><span>Powt./czas</span><span>OK</span></div>'+setsHTML(v.warmups,'warm',item):'')+
  '<div class="section-header"><strong>Serie robocze</strong><span class="smallcaps">'+v.sets.filter(x=>x.done).length+' wykonano</span></div><p class="fast-adjust-help">Dotknij numeru serii (S1, S2…) i zmieniaj ciężar lub powtórzenia bez klawiatury.</p>'+quickFillHTML+'<div class="set-head"><span>S</span><span>Ciężar, kg</span><span>Powt./czas</span><span>OK</span></div>'+setsHTML(v.sets,'work',item)+
  '<div class="inline-actions"><button type="button" class="btn secondary small" id="addset">+ Seria</button><button type="button" class="btn secondary small" id="markall">✓ Potwierdź wszystkie wpisane</button></div>'+
  '<div class="rir-quick-row"><span class="rir-short-label">RIR</span><div class="rir-shortcuts" role="group" aria-label="Szybki wybór RIR">'+
  ['0','1','2','3+'].map(x=>'<button type="button" class="rir-chip '+(v.rir===x?'active':'')+'" data-rir-quick="'+x+'" aria-pressed="'+(v.rir===x)+'">'+x+'</button>').join('')+
  '</div><select id="rir" class="rir-select" aria-label="RIR lub inna ocena"><option value="">Inna ocena…</option>'+
  ['0','1','2','3+','Technika OK','Dyskomfort'].map(x=>'<option value="'+x+'" '+(v.rir===x?'selected':'')+'>'+esc(x)+'</option>').join('')+'</select></div>'+
  completionHTML;
 const exercise='<div class="panel active-exercise"><div class="exercise-head"><div class="exercise-identity"><div class="number">'+(coreActive?'CORE BONUS':'ĆWICZENIE')+' '+(index+1)+' / '+list.length+'</div><h2 class="title">'+esc(item.title)+'</h2>'+
  '<p class="active-machine">'+esc(machineName(log.machine))+' · '+esc(unit(log.machine))+'</p></div><span class="exercise-set-progress">'+(v.sets||[]).filter(x=>x.done).length+' / '+(v.sets||[]).length+' serii</span></div>'+
  (coreActive?'<label class="core-toggle"><input type="checkbox" id="enable-core" '+(enabled?'checked':'')+'><strong>Dodaj do treningu</strong></label>':'')+
  '<details class="exercise-options" '+(exerciseOptionsOpen?'open':'')+'><summary>Sprzęt, zamienniki i zdjęcia</summary><div class="exercise-option-content">'+
  selectedVariants+photoSection+machineNote+'</div></details>'+
  (coreActive&&!enabled?'<p class="hint">Dodaj ćwiczenie do treningu, aby zapisywać serie.</p>':sets)+
  '<div class="stepper"><button class="btn secondary" id="prev" '+(index===0?'disabled':'')+'>← Poprzednie</button><button class="btn" id="next" '+(index===list.length-1?'disabled':'')+'>Następne →</button></div></div>';
 const isHistory=!!savedHistoryRecord();
 const notes='<div class="panel training-notes"><details class="train-additional" '+(advancedOpen?'open':'')+' ><summary>Notatki i historia zapisów</summary>'+
  '<label class="label" for="notes">Notatki do treningu</label><textarea class="notes" id="notes" placeholder="Maszyna, RIR, samopoczucie, uwagi…">'+esc(s.notes||'')+'</textarea>'+
  undoDayHTML()+versionsHTML()+'</details></div>';
 const saveSection='<section class="panel train-save-section" aria-label="Zapis treningu"><button type="button" id="save-training" class="btn full save-training-btn">'+(saved?'✓ Zapisz zmiany w Azure':'✓ Zapisz trening w Azure')+'</button><p class="hint">Zmiany są lokalne, dopóki nie zapiszesz ich w Azure.</p></section>';
 return calendar+typeSelector+switcher+
  '<details class="train-plan-choices"><summary>Plan na ten dzień · '+esc(day.name)+'</summary>'+planSelector()+'</details>'+
  chooseArea+chooser+exercise+notes+saveSection;
}
let versionHistory=null;
function selectedCloudId(){const record=storedDay();if(!record)return '';if(record.syncId)return record.syncId;const entry=Object.entries(state.sessions).find(([,r])=>r===record);return entry?'draft:'+entry[0]:'';}
function versionsHTML(){
 const id=selectedCloudId();if(!id)return '';
 const loaded=versionHistory?.id===id&&versionHistory.date===state.selectedDate?versionHistory:null;
 return '<details class="workout-versions"><summary>Historia zapisów</summary><p class="hint">Do 10 wcześniejszych wersji w Azure, w granicach rozmiaru rekordu. Historia zbiera się od wprowadzenia tej funkcji. Przywrócenie wymaga późniejszego zapisu.</p><button class="btn secondary" id="load-versions">Pobierz poprzednie wersje</button><div id="versions-list">'+(loaded?.error?'<p role="alert">'+esc(loaded.error)+'</p>':loaded?(loaded.versions.length?loaded.versions.map((v,i)=>'<details><summary>Wersja '+(i+1)+' · '+esc(v.savedAt?new Date(v.savedAt).toLocaleString('pl-PL'):'wcześniejszy zapis')+'</summary><pre>'+esc(sessionReport(v.record))+'</pre><button class="btn secondary" data-restore-version="'+esc(v.id)+'">Wczytaj tę wersję do formularza</button></details>').join(''):'<p>Brak wcześniejszych zapisów tego treningu.</p>'):'')+'</div></details>';
}
async function loadVersions(){const id=selectedCloudId(),date=state.selectedDate;if(!id)return;const button=document.getElementById('load-versions');button.disabled=true;const result=await GymCloud.versions(id);if(date!==state.selectedDate||id!==selectedCloudId())return;versionHistory={id,date,...(result.ok?{versions:result.versions,etag:result.etag}:{versions:[],error:result.reason})};render();const section=document.querySelector('.workout-versions');if(section)section.open=true;}
function restoreVersion(id){
 const loaded=versionHistory;if(!loaded||loaded.id!==selectedCloudId()||loaded.date!==state.selectedDate)return;
 const version=loaded.versions.find(v=>v.id===id);if(!version)return;
 if(!confirm('Wczytać poprzednią wersję do formularza? Zastąpi bieżące niezapisane zmiany. Azure zmieni się dopiero po kliknięciu Zapisz.'))return;
 rememberDay();const record=cloneWorkout(version.record);record.syncId=loaded.id;record.restoreExpectedEtag=loaded.etag;
 state.sessions['restore-'+stableHash(loaded.id)] = record;pendingHistoryEdit=null;state.activeDay=Number(record.day);state.activeExercise=0;state.activeCore=0;state.activeArea='main';state.selectedRecordId=loaded.id;
 state.unsavedDates=[...new Set([...(state.unsavedDates||[]),record.date+'|'+record.day])];save(false);render();toast('Wczytano wersję. Sprawdź wyniki i wybierz Zapisz lub Cofnij zmiany.');
}
function allLogged(s){const items=[...(s.planDefinition?.items||PLAN[s.day]?.items||[]),...CORE];const archived={'core-deadbug':'Dead Bug (archiwalne)','core-suitcase':'Suitcase Carry (archiwalne)'};return Object.entries(s.exercises||{}).map(([id,log])=>({item:items.find(x=>x.id===id)||{id,title:archived[id]||('Ćwiczenie archiwalne: '+id),mode:id==='core-suitcase'?'secSide':'reps'},log}));}
function sessionReport(s){const lines=[`Gym Tracker | ${s.date} | ${s.planDefinition?.name||PLAN[s.day]?.name||s.day}`,`Źródło: ${s.source||'zapis użytkownika'}`];for(const {item,log} of allLogged(s)){
 lines.push(`\n${item.title}`);const vars=log.variants&&Object.keys(log.variants).length?log.variants:{[log.machine]:log};for(const [k,v] of Object.entries(vars)){
 const rows=(v.sets||[]).filter(x=>x.done);if(!rows.length)continue;lines.push(`  ${machineName(k)} (${unit(k)}): ${rows.map(x=>`${x.kg||'masa ciała'} × ${x.reps} ${measure(item)}`).join(' | ')}; RIR ${v.rir||'—'}`)}
 }if(s.notes)lines.push(`\nNotatka: ${s.notes}`);return lines.join('\n')}
function historyHTML(){return GymProgress.html(state,{PLAN,CORE,MACHINE,allLogged,sessionReport,machineName,unit,measure})}
// Cloud refresh must not detach the file input while a native file picker is open.
function renderSaveStatus(){const el=document.getElementById('cloud-save-status');if(!el)return;const dirty=historyEditChanged()||(state.unsavedDates||[]).some(k=>k.startsWith(state.selectedDate+'|'));const cloud=window.GymCloud?.getStatus();el.textContent=savingWorkout?'Azure: zapisuję…':dirty?'Zmiany lokalne · wybierz Zapisz':cloud==='synced'?'Azure: aktualne dane':cloud==='syncing'?'Azure: synchronizacja…':cloud==='conflict'?'Azure: sprawdź konflikt w Danych':'Azure: brak potwierdzenia połączenia';el.classList.toggle('warn',dirty||cloud==='conflict');}
function renderCloudPanel(){const panel=document.getElementById('cloud-panel');if(panel)panel.innerHTML=window.GymCloud?.html?.()||'';}
function settingsHTML(){
 return '<section id="profiles" class="panel" aria-label="Profile użytkowników"></section>'+
  '<section class="hero"><div class="eyebrow">Dane</div><h1>Import i eksport</h1>'+
  '<p class="muted">Dane treningów przechowujemy w Azure. Poniższe operacje dotyczą wyłącznie bazy aktywnego profilu.</p></section>'+
  '<div class="panel"><h2>Import danych</h2>'+
  '<p class="muted">Treningi z pliku <strong>nadpiszą treningi o tych samych datach</strong>. Brakujące zostaną dodane. Daty, których nie ma w pliku, pozostaną bez zmian.</p>'+
  '<label class="label" for="import-database">Wybierz plik JSON</label>'+
  '<input type="file" id="import-database" accept="application/json,.json" style="width:100%;margin:12px 0;color:#ccd8e1">'+
  '<p class="hint">Przed importem zobaczysz liczbę aktualizowanych i dodawanych treningów. Import nigdy nie usuwa innych dat.</p></div>'+
  '<div class="panel"><h2>Eksport bazy aktywnego profilu</h2>'+
  '<p class="muted">Pobieramy aktualne rekordy bezpośrednio z Azure, a nie wyłącznie dane przechowywane na tym urządzeniu.</p>'+
  '<div class="inline-actions"><button class="btn" id="export">↓ Baza profilu JSON</button>'+
  '<button class="btn secondary" id="exportcsv">↓ Baza profilu CSV</button></div>'+
  '<p class="hint">JSON zachowuje bieżące treningi i nadaje się do późniejszego importu. CSV zawiera ćwiczenia, serie i notatki. Historia wcześniejszych zapisów pozostaje w Azure; kopię biblioteki planów pobierzesz w zakładce Plany.</p></div>'+
  '<div class="panel"><h2>Kopia z tego urządzenia</h2><p class="hint">Działa także offline. Zawiera zapisane lokalnie treningi i niezapisane zmiany nowych treningów. Otwarte poprawki historycznego treningu wymagają wcześniejszego zapisu.</p><button class="btn secondary" id="export-local">↓ Kopia lokalna JSON</button></div>'+
  '<div id="cloud-panel">'+(window.GymCloud?.html?.()||'')+'</div>';
}

function parseDatabaseImport(payload){
 const copy=x=>x===undefined?null:JSON.parse(JSON.stringify(x));
 let rows=[];
 if(payload?.format==='gym-tracker-db-export-v1'&&Array.isArray(payload.workouts)){
  rows=payload.workouts.map(x=>({id:x.id,kind:x.kind,record:copy(x.record)}));
 }else if(payload?.format==='gym-tracker-history-additive-v1'&&Array.isArray(payload.history)){
  rows=payload.history.map((x,i)=>({id:x.syncId||'history:import-'+x.date+'-'+x.day+'-'+i+'-'+stableHash(JSON.stringify(x)),
   kind:'history',record:copy(x)}));
 }else if(payload&&Array.isArray(payload.history)&&payload.sessions&&
    typeof payload.sessions==='object'&&!Array.isArray(payload.sessions)){
  // Previous Gym Tracker backups used {sessions,history}.
  rows=[
   ...Object.entries(payload.sessions).map(([key,x])=>({
    id:'draft:'+key,kind:'draft',record:copy(x)})),
   ...payload.history.map((x,i)=>({id:x.syncId||'history:import-'+x.date+'-'+x.day+'-'+i+'-'+stableHash(JSON.stringify(x)),
    kind:'history',record:copy(x)}))
  ];
 }else throw Error('Nieobsługiwany format JSON. Wybierz eksport Gym Tracker.');
 if(!rows.length)throw Error('Plik nie zawiera treningów.');
 if(rows.length>2000)throw Error('Zbyt wiele rekordów w imporcie.');
 const seenIds=new Set();
 for(const row of rows){
  const rec=row?.record;
  if(rec&&typeof rec==='object'&&!Array.isArray(rec)&&rec.exercises===undefined)rec.exercises={};
  if(!rec||typeof rec!=='object'||Array.isArray(rec)||
    !/^\d{4}-\d{2}-\d{2}$/.test(rec.date||'')||
    Number.isNaN(new Date(rec.date+'T12:00:00Z').getTime())||
    new Date(rec.date+'T12:00:00Z').toISOString().slice(0,10)!==rec.date||
    !Number.isInteger(Number(rec.day))||![-2,-1,0,1,2,3,4,5].includes(Number(rec.day))||
    !rec.exercises||typeof rec.exercises!=='object'||Array.isArray(rec.exercises)||
    !['draft','history'].includes(row.kind)||
    !/^(draft|history):[a-zA-Z0-9:_-]+$/.test(row.id||'')||row.id.length>200||
    row.id.split(':')[0]!==row.kind||
    seenIds.has(row.id))
   throw Error('Niepoprawny rekord '+String(row.id||'(bez ID)')+' dla daty '+String(rec?.date||'(brak daty)')+'. Sprawdź format danych i unikalność identyfikatorów.');
  if(Object.hasOwn(rec,'planDefinition'))GymPlanModel.validate(rec.planDefinition);
  for(const snapshot of [...Object.values(rec.planSnapshots||{}),...Object.values(rec.planChoices||{})])if(snapshot.planDefinition)GymPlanModel.validate(snapshot.planDefinition);
  seenIds.add(row.id);
  delete rec.restoreExpectedEtag;
  delete rec.syncId; // The cloud ID is stored in the row wrapper, not the record.
 }
 return rows;
}
async function importDatabaseFile(file){
 if(!file)return;
 if(file.size>12*1024*1024)throw Error('Plik przekracza 12 MB.');
 const rows=parseDatabaseImport(JSON.parse(await file.text()));
 const preview=await GymCloud.importDatabase(rows,false);
 if(!preview.ok)throw Error(preview.reason);
 const {added,updated,unchanged,total,repeatedDates}=preview.preview;
 if(!confirm('Zaimportować '+total+' treningów do Azure w aktywnym profilu?\n'+
   'Nadpisane istniejące: '+updated+'\n'+
   'Dodane nowe: '+added+'\n'+
   'Bez zmian: '+unchanged+'\n'+
   (repeatedDates?'Daty z kilkoma wpisami: '+repeatedDates+'. Zachowamy każdy wpis oddzielnie.\n':'')+'\n'+
   'Treningi z dat, których nie ma w pliku, pozostaną w bazie.'))return;
 const result=await GymCloud.importDatabase(rows,true);
 if(!result.ok)throw Error(result.reason);
 const updatedDates=new Set(result.saved.map(x=>x.record.date));
 if(updatedDates.size){
  // Keep unrelated local days intact; imported days adopt the Azure identity.
  state.history=state.history.filter(x=>!updatedDates.has(x.date));
  state.sessions=Object.fromEntries(Object.entries(state.sessions).filter(([,x])=>!updatedDates.has(x.date)));
  state.unsavedDates=(state.unsavedDates||[]).filter(key=>!updatedDates.has(key.split('|')[0]));
  for(const x of result.saved){
   const record=JSON.parse(JSON.stringify(x.record));
   if(x.kind==='history')state.history.push({...record,syncId:x.id});
   else state.sessions[x.id.slice(6)]=record;
  }
  state.history.sort((a,b)=>String(a.date).localeCompare(String(b.date)));
  pendingHistoryEdit=null;state.selectedRecordId='';
  save(false);await GymStorage.flush();
 }
 render();
 const stats=result.totals;
 const msg='Import: '+stats.updated+' nadpisanych, '+stats.added+' dodanych, '+stats.unchanged+' bez zmian.';
 if(result.failedDate)alert(msg+'\nNie udało się zapisać '+result.failedDate+
    '. Pozostałe dni nie zostały usunięte. Ponów import pliku.');
 else alert(msg+'\nPozostałe daty w bazie zostały zachowane.');
}

function csvDatabase(data){
 const rows=[['date','day','record_id','kind','exercise_id','exercise','machine','set_type',
 'set_no','kg','reps_or_seconds','done','rir','notes','source','started','core_enabled']];
 for(const row of data.workouts){
  const s=row.record||{},exercises=s.exercises||{};
  let wrote=false;
  const dayItems=[...(s.planDefinition?.items||PLAN[s.day]?.items||[]),...CORE];
  for(const [id,log] of Object.entries(exercises)){
   const item=dayItems.find(e=>e.id===id),label=item?.title||id;
   const variants=log?.variants&&Object.keys(log.variants).length?
    log.variants:{[log?.machine||'BODY']:log};
   for(const [machine,v] of Object.entries(variants)){
    let wroteSet=false;
    for(const [type,list] of [['warmup',v?.warmups||[]],['work',v?.sets||[]]]){
     list.forEach((set,j)=>{
      rows.push([s.date,s.day,row.id,row.kind,id,label,machine,type,j+1,
       set.kg??'',set.reps??'',set.done===true?'yes':'no',v?.rir||'',
       s.notes||'',s.source||'',s.started||'',s.coreEnabled?.[id]===true?'yes':'no']);
      wroteSet=true;wrote=true;
     });
    }
    if(!wroteSet){
     rows.push([s.date,s.day,row.id,row.kind,id,label,machine,'', '',
      '', '', '',v?.rir||'',s.notes||'',s.source||'',s.started||'',
      s.coreEnabled?.[id]===true?'yes':'no']);
     wrote=true;
    }
   }
  }
  if(!wrote)rows.push([s.date,s.day,row.id,row.kind,'','','','','','','','',
    '',s.notes||'',s.source||'',s.started||'','']);
 }
 // BOM for Excel's UTF-8 recognition. CSV is a reporting export; JSON is lossless.
 const quoted=x=>{
  const raw=String(x??'');
  return '"'+raw.replaceAll('"','""')+'"';
 };
 return '\uFEFF'+rows.map(r=>r.map(quoted).join(',')).join('\r\n');
}
async function exportDatabaseFile(format){
 const result=await GymCloud.exportDatabase();
 if(!result.ok){alert(result.reason);return}
 const db=result.data,day=dateKey();
 if(format==='json')download('gym-tracker-azure-'+day+'.json',
  JSON.stringify(db,null,2),'application/json');
 else download('gym-tracker-azure-'+day+'.csv',csvDatabase(db),'text/csv;charset=utf-8');
 toast('Wyeksportowano '+db.workouts.length+' rekordów z Azure.');
}

function download(name,content,mime){const blob=new Blob([content],{type:mime});const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000)}
function mutateSet(field,j,type,value){const {item}=currentItem(),v=currentVariant(item,true);const arr=type==='warm'?v.warmups:v.sets;arr[j][field]=value;save()}
function changeArea(area){state.activeArea=area;exerciseOptionsOpen=false;save(false);render()}
document.addEventListener('toggle',event=>{
 if(!event.target.isConnected)return;
 if(event.target.matches('.exercise-options'))exerciseOptionsOpen=event.target.open;
 if(event.target.matches('.rest-timer'))restControlsOpen=event.target.open;
 if(event.target.matches('.train-additional'))advancedOpen=event.target.open;
},true);
document.addEventListener('toggle',event=>{
 if(event.target?.classList?.contains('exercise-queue'))exerciseQueueOpen=event.target.open;
},true);
document.addEventListener('click',async event=>{
 const b=event.target.closest('button');if(!b)return;
 if(GymPlans.click(b))return;
 if(window.GymProgress?.handleClick?.(b,render))return;
 if(b.id==='rest-start'||b.id==='rest-quick-start'){restUntil=Date.now()+Number(restOptions().seconds||90)*1000;restAlerted=false;persistRestTimer();updateRestTimer();return;}
 if(b.id==='rest-skip'){restUntil=0;restAlerted=false;persistRestTimer();updateRestTimer();return;}
 if(b.dataset.restAdjust!==undefined){if(restUntil){restUntil=Math.max(Date.now(),restUntil+Number(b.dataset.restAdjust)*1000);restAlerted=false;persistRestTimer();updateRestTimer();}return;}
 if(b.id==='quick-fill-set'){
  const {item}=currentItem(),v=currentVariant(item),suggestion=quickFillSuggestion(item,v);
  // Re-evaluate from the current data before mutating; a stale button must
  // never replace another row, a completed set or a different machine.
  if(!suggestion||String(suggestion.index)!==b.dataset.targetSet)return;
  const editable=currentVariant(item,true),row=editable.sets[suggestion.index];
  if(!row||row.done)return;
  row.kg=suggestion.kg;row.reps=suggestion.reps;
  save();render();revealNextSet();
  return;
 }
 if(b.dataset.nextUnfinished!==undefined){
  const {item}=currentItem(),variant=currentVariant(item);
  const target=nextUnfinishedExercise();
  if(state.activeArea!=='main'||!variant.sets?.length||!variant.sets.every(row=>row.done)||!target||target.index!==Number(b.dataset.nextUnfinished))return;
  state.activeExercise=target.index;exerciseOptionsOpen=false;
  save(false);render();revealExercise();
  return;
 }
 if(b.id==='copy-previous'){
  const {item}=currentItem(),log=exerciseLog(item),previous=lastCompletedVariant(item,log.machine);
  if(!previous?.rows.length)return;
  if(!confirm('Wpisać poprzednie wyniki? Zastąpią wartości odpowiednich serii i usuną ich zaznaczenie wykonania.'))return;
  const variant=currentVariant(item,true);
  previous.rows.slice(0,15).forEach((row,i)=>{if(!variant.sets[i])variant.sets.push({kg:'',reps:'',done:false});Object.assign(variant.sets[i],{kg:String(row.kg??''),reps:String(row.reps??''),done:false});});
  save();render();return;
 }
 if(b.id==='load-versions'){await loadVersions();return;}
 if(b.dataset.restoreVersion){restoreVersion(b.dataset.restoreVersion);return;}
 if(b.id==='export-local'){download('gym-tracker-lokalne-'+dateKey()+'.json',JSON.stringify(state,null,2),'application/json');return;}
 if(b.id==='undo-training'){await undoSelectedDay();return;}
 if(b.id==='save-training'){await saveSelectedWorkout();return;}
 if(b.dataset.week!==undefined){selectDate(b.dataset.week==='today'?dateKey():GymWeek.shift(state.selectedDate,Number(b.dataset.week)));return}
 if(b.dataset.date!==undefined){selectDate(b.dataset.date);return}
 if(b.dataset.machine!==undefined){switchVariant(currentItem().item,b.dataset.machine);save();render();return}
 if(b.dataset.quickEdit!==undefined){
  const parts=b.dataset.quickEdit.split('-'),type=parts[0],index=Number(parts[1]);
  if(!['warm','work'].includes(type)||parts.length!==2||!Number.isInteger(index)||index<0)return;
  const {item}=currentItem(),variant=currentVariant(item),rows=type==='warm'?variant.warmups:variant.sets;
  if(index>=rows.length)return;
  const key=quickSetKey(item);
  quickSetEdit=quickSetEdit?.key===key&&quickSetEdit.type===type&&quickSetEdit.index===index?null:{key,type,index};
  render();return;
 }
 if(b.dataset.fastField!==undefined){
  const field=b.dataset.fastField,type=b.dataset.type,index=Number(b.dataset.set),dir=Number(b.dataset.fastDir);
  if(!['kg','reps'].includes(field)||!['work','warm'].includes(type)||!Number.isInteger(index)||index<0||![-1,1].includes(dir))return;
  const {item}=currentItem(),key=quickSetKey(item);
  if(quickSetEdit?.key!==key||quickSetEdit.type!==type||quickSetEdit.index!==index)return;
  const list=currentVariant(item,true)[type==='warm'?'warmups':'sets'],row=list?.[index];
  if(!row)return;
  const increment=field==='kg'?quickKgStep(exerciseLog(item).machine):(item.mode?.startsWith('sec')?5:1);
  row[field]=String(Math.max(0,Math.round(((Number(row[field])||0)+dir*increment)*100)/100));
  const input=document.querySelector('.set-row[data-set-row="'+type+'-'+index+'"] input[data-field="'+field+'"]');
  if(input)input.value=row[field];
  const output=document.querySelector('.set-fast-edit[data-fast-row="'+type+'-'+index+'"] [data-fast-value="'+field+'"]');
  if(output)output.textContent=row[field];
  save();return;
 }
 if(b.dataset.nudge!==undefined){const {item}=currentItem(),v=currentVariant(item,true),row=(b.dataset.type==='warm'?v.warmups:v.sets)[Number(b.dataset.set)];if(!row)return;const n=Number(row.reps)||0;row.reps=String(Math.max(0,n+Number(b.dataset.nudge)*(item.mode?.startsWith('sec')?5:1)));save();render();return}
  if(b.id&&b.id.startsWith('cloud-')){try{await GymCloud.action(b.id)}catch(e){console.warn('Cloud action:',e);toast('Błąd synchronizacji — lokalne dane zachowane')}render();return;}
 if(b.dataset.view){if(state.view==='plans'&&b.dataset.view!=='plans'&&!GymPlans.leave())return;if(state.view==='train'&&b.dataset.view!=='train'&&!abandonHistoryEdit())return;const previous=state.view;state.view=b.dataset.view;if(state.view==='train')state.activeDay=trainingTypeForDate(state.selectedDate);save(false);render();if(previous!==state.view&&window.GymCloud)void GymCloud.refreshAutomatically();return}
 if(b.dataset.day!==undefined){const date=b.dataset.date;if(date)selectDate(date);return}
 if(b.dataset.area){changeArea(b.dataset.area);return}
 if(b.dataset.item!==undefined){state.activeArea='main';state.activeExercise=Number(b.dataset.item);exerciseOptionsOpen=false;exerciseQueueOpen=false;save(false);render();revealExercise();return}
 if(b.dataset.core!==undefined){state.activeArea='core';state.activeCore=Number(b.dataset.core);exerciseOptionsOpen=false;save(false);render();revealExercise();return}
 if(b.dataset.done!==undefined){const {item}=currentItem(),v=currentVariant(item,true),arr=b.dataset.type==='warm'?v.warmups:v.sets,s=arr[Number(b.dataset.done)];if(!s)return;if(!s.done&&s.reps===''){toast('Uzupełnij powtórzenia lub sekundy');return}s.done=!s.done;if(s.done&&restOptions().auto){restUntil=Date.now()+Number(restOptions().seconds||90)*1000;restAlerted=false;persistRestTimer();}if(state.activeArea==='core'&&s.done)activeSession(true).coreEnabled[item.id]=true;save();render();revealNextSet();return}
 if(b.id==='next'||b.id==='prev'){const k=state.activeArea==='core'?'activeCore':'activeExercise';state[k]+=b.id==='next'?1:-1;exerciseOptionsOpen=false;save(false);render();revealExercise();return}
 if(b.dataset.removeSet!==undefined){
  const {item}=currentItem(),index=Number(b.dataset.removeSet),variant=currentVariant(item);
  if(!Number.isInteger(index)||index<item.work.length||index>=variant.sets.length)return;
  const removed=variant.sets[index];
  if((removed.done||String(removed.kg??'').trim()||String(removed.reps??'').trim())&&
    !confirm('Usunąć dodaną serię S'+(index+1)+'? Jej ciężar, powtórzenia i status wykonania zostaną usunięte z formularza.'))return;
  currentVariant(item,true).sets.splice(index,1);
  quickSetEdit=null;
  save();render();toast('Usunięto serię S'+(index+1)+'. Zapisz w Azure, aby zatwierdzić zmianę.');
  return;
 }
 if(b.id==='addset'){const {item}=currentItem(),v=currentVariant(item,true);if(v.sets.length>=15){toast('Maksymalnie 15 serii');return}v.sets.push({kg:'',reps:'',done:false});save();render();revealNextSet();return}
 if(b.id==='markall'){const {item}=currentItem(),v=currentVariant(item,true);let n=0;for(const s of v.sets){if(!s.done&&s.reps!==''){s.done=true;n++}}if(state.activeArea==='core'&&n)activeSession(true).coreEnabled[item.id]=true;save();render();revealNextSet();toast(`Potwierdzono ${n} serii`);return}
 if(b.dataset.rirQuick!==undefined){
  const value=b.dataset.rirQuick;
  if(!['0','1','2','3+'].includes(value))return;
  currentVariant(currentItem().item,true).rir=value;
  const select=document.getElementById('rir');
  if(select)select.value=value;
  document.querySelectorAll('[data-rir-quick]').forEach(chip=>{const active=chip.dataset.rirQuick===value;chip.classList.toggle('active',active);chip.setAttribute('aria-pressed',String(active));});
  save();return;
 }
 if(b.id==='export'){await exportDatabaseFile('json');return}
 if(b.id==='exportcsv'){await exportDatabaseFile('csv');return}
});
document.addEventListener('change',async event=>{const el=event.target;
 if(await GymPlans.change(el))return;
 if(el.id==='workout-plan'){changeWorkoutPlan(el.value);return;}
 if(window.GymProgress?.handleChange?.(el,render))return;
 if(el.id==='rest-duration'||el.id==='rest-auto'){const options=restOptions();if(el.id==='rest-duration')options.seconds=Number(el.value);else options.auto=el.checked;GymProfiles.preference('restTimer',options);const quick=document.getElementById('rest-quick-start');if(quick){quick.textContent='Start '+Number(options.seconds||90)+' s';quick.setAttribute('aria-label','Uruchom przerwę '+Number(options.seconds||90)+' sekund');}return;}
 if(el.dataset.fastStep!==undefined){
  const machine=exerciseLog(currentItem().item).machine,step=Number(el.value);
  if(machine!==el.dataset.fastStep||!quickKgSteps.includes(step))return;
  GymProfiles.preference('quickWeightSteps',{...(GymProfiles.preference('quickWeightSteps')||{}),[machine]:step});
  document.querySelectorAll('.set-fast-edit [data-fast-field="kg"]').forEach(btn=>btn.setAttribute('aria-label',(Number(btn.dataset.fastDir)>0?'Zwiększ':'Zmniejsz')+' ciężar w serii '+(btn.dataset.type==='warm'?'R':'S')+(Number(btn.dataset.set)+1)+' o '+step));
  return;
 }
 if(el.id==='week-date'){selectDate(el.value);return}
 if(el.id==='workout-type'){changeTrainingType(el.value);return}
 if(el.id==='session-picker'){if(!abandonHistoryEdit()){render();return}state.selectedRecordId=el.value;save(false);render();return}
 if(el.id==='rir'){currentVariant(currentItem().item,true).rir=el.value;document.querySelectorAll('[data-rir-quick]').forEach(chip=>{const active=chip.dataset.rirQuick===el.value;chip.classList.toggle('active',active);chip.setAttribute('aria-pressed',String(active));});save()}
 else if(el.id==='enable-core'){activeSession(true).coreEnabled[currentItem().item.id]=el.checked;save();render()}
 else if(el.id==='import-database'){
  const file=el.files?.[0];if(!file)return;
  try{await importDatabaseFile(file)}
  catch(e){console.error('Database import:',e);alert(e.message||'Nie udało się zaimportować pliku.')}
  finally{el.value=''}
 }
});
document.addEventListener('input',event=>{const t=event.target;
 if(GymPlans.input(t))return;
 if(t.dataset.field){
  mutateSet(t.dataset.field,Number(t.dataset.set),t.dataset.type,t.value);
  const fast=document.querySelector('.set-fast-edit[data-fast-row="'+t.dataset.type+'-'+t.dataset.set+'"] [data-fast-value="'+t.dataset.field+'"]');
  if(fast)fast.textContent=t.value===''?'—':t.value;
 }
 else if(t.id==='machine-note'){const {item}=currentItem(),machine=exerciseLog(item).machine,notes={...(GymProfiles.preference('machineNotes')||{})};if(t.value)notes[machineNoteKey(item,machine)]=t.value;else delete notes[machineNoteKey(item,machine)];GymProfiles.preference('machineNotes',notes);}
 else if(t.id==='notes'){activeSession(true).notes=t.value;save()}
});
window.addEventListener('gym-preferences-loaded',()=>{if(state.view==='plans'){if(!GymPlans.editing())render();return;}if(state.view==='train'&&!storedDay()){state.activeDay=trainingTypeForDate(state.selectedDate);render();}const input=document.getElementById('machine-note');if(input&&input!==document.activeElement){const {item}=currentItem();input.value=GymProfiles.preference('machineNotes')?.[machineNoteKey(item,exerciseLog(item).machine)]||'';}const duration=document.getElementById('rest-duration'),auto=document.getElementById('rest-auto');if(duration&&duration!==document.activeElement)duration.value=String(restOptions().seconds||90);if(auto&&auto!==document.activeElement)auto.checked=!!restOptions().auto;const quick=document.getElementById('rest-quick-start');if(quick){quick.textContent='Start '+Number(restOptions().seconds||90)+' s';quick.setAttribute('aria-label','Uruchom przerwę '+Number(restOptions().seconds||90)+' sekund');}});
document.addEventListener('submit',e=>GymPlans.submit(e));
window.addEventListener('beforeunload',e=>{if(GymPlans.dirty()){e.preventDefault();e.returnValue='';}});
window.gymProfileCanLeave=()=>!savingWorkout&&GymPlans.leave()&&abandonHistoryEdit();
(async()=>{try{state=normalize(await GymStorage.load(status));}catch(e){console.error(e);status('⚠ Nie można wczytać danych','warn')}try{if(sessionStorage.getItem('gym-profile-return-view')==='settings')state.view='settings';sessionStorage.removeItem('gym-profile-return-view');}catch{}render();
  if(window.GymCloud)await GymCloud.init({getState:()=>state,hasWorkoutData,workoutRecords,cloudState,meaningfulSignature,workoutDetails,applySnapshot:async data=>{
 const preserved={...data.sessions};
 const locallyUnsaved=new Set(state.unsavedDates||[]);
 for(const [key,entry] of Object.entries(state.sessions||{})){
  if(locallyUnsaved.has(entry.date+'|'+entry.day))preserved[key]=entry;
 }
 const retainedHistory=data.history.filter(entry=>!locallyUnsaved.has(entry.date+'|'+entry.day));
 for(const entry of state.history||[]){
  if(locallyUnsaved.has(entry.date+'|'+entry.day))retainedHistory.push(entry);
 }
 state=normalize({...state,history:retainedHistory,sessions:preserved,savedAt:Date.now()});
 GymStorage.save(state);await GymStorage.flush();render()
},backup:(name,data)=>download(name,JSON.stringify(data,null,2),'application/json'),onStatusChange:()=>{renderSaveStatus();if(state.view==='settings')renderCloudPanel()}});
  window.GymProfiles?.ready();
  if('serviceWorker' in navigator&&location.protocol==='https:')navigator.serviceWorker.register('./sw.js').catch(e=>console.warn('SW:',e))})();
