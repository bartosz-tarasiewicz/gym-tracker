'use strict';
window.GymPlans=(()=>{
 let api,draft=null,original='',error='';
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const copy=x=>JSON.parse(JSON.stringify(x));
 const library=()=>GymProfiles.plans();
 const builtIn=day=>({id:'builtin-'+day,dayType:day,name:api.PLAN[day].name,items:copy(api.PLAN[day].items)});
 const scheduled=date=>{const lib=library(),id=lib.weekdays[(new Date(date+'T12:00:00').getDay()+6)%7];return lib.plans.find(p=>p.id===id)||null;};
 const dirty=()=>draft!==null&&JSON.stringify(draft)!==original;
 function leave(){if(dirty()&&!confirm('Odrzucić niezapisane zmiany w edytorze planu?'))return false;draft=null;error='';return true;}
 function saveLibrary(lib){const valid=GymPlanModel.library(lib);for(const p of valid.plans)for(const item of p.items)if(item.options.some(m=>!Object.hasOwn(api.MACHINE,m)))throw Error('Plan zawiera nieznany wariant sprzętu.');GymProfiles.plans(valid);}
 const button=(action,text,extra='')=>'<button type="button" class="btn secondary small" data-plan-action="'+action+'" '+extra+'>'+text+'</button>';
 const fieldHTML=(field,value,label,attrs='')=>'<label class="plan-field">'+label+'<input data-plan-field="'+field+'" value="'+esc(value)+'" '+attrs+'></label>';
 function rows(item,type){return '<fieldset><legend>'+(type==='work'?'Serie robocze':'Rozgrzewka')+'</legend>'+item[type].map((row,j)=>'<div class="plan-row" data-plan-row="'+j+'" data-plan-type="'+type+'"><span>'+(j+1)+'</span>'+fieldHTML('kg',row[0],'kg','type="number" min="0" max="100000" step="any" required')+fieldHTML('reps',row[1],'Powt. / czas','type="number" min="0" max="100000" step="any" required')+button('remove-row','Usuń','aria-label="Usuń '+(type==='work'?'serię':'rozgrzewkę')+' '+(j+1)+'" '+(type==='work'&&item[type].length===1?'disabled':''))+'</div>').join('')+button('add-'+type,'+ '+(type==='work'?'Seria robocza':'Rozgrzewka'),item[type].length>=15?'disabled':'')+'</fieldset>';}
 function itemHTML(item,i){return '<section class="panel plan-item" data-plan-item="'+i+'"><div class="inline-actions"><strong>Ćwiczenie '+(i+1)+'</strong>'+button('up','↑','aria-label="Przesuń ćwiczenie '+(i+1)+' w górę" '+(!i?'disabled':''))+button('down','↓','aria-label="Przesuń ćwiczenie '+(i+1)+' w dół" '+(i===draft.items.length-1?'disabled':''))+button('remove','Usuń ćwiczenie',draft.items.length===1?'disabled':'')+'</div>'+fieldHTML('title',item.title,'Nazwa ćwiczenia','maxlength="100" required')+'<label class="plan-field">Wskazówki<textarea data-plan-field="tip" maxlength="500">'+esc(item.tip||'')+'</textarea></label><label class="plan-field">Sposób liczenia<select data-plan-field="mode">'+Object.entries({reps:'Powtórzenia',side:'Powtórzenia na stronę',sec:'Sekundy',secSide:'Sekundy na stronę',stepsSide:'Kroki na stronę'}).map(([k,v])=>'<option value="'+k+'" '+((item.mode||'reps')===k?'selected':'')+'>'+v+'</option>').join('')+'</select></label><label class="plan-field">Domyślny sprzęt<select data-plan-field="machine">'+Object.entries(api.MACHINE).filter(([key])=>item.id.startsWith('custom-')||item.options.includes(key)).map(([k,m])=>'<option value="'+k+'" '+(item.options[0]===k?'selected':'')+'>'+esc(m.label)+'</option>').join('')+'</select></label>'+rows(item,'warm')+rows(item,'work')+'</section>';}
 function html(){
  const lib=library();
  if(draft)return '<section class="hero"><h1>Edytuj plan</h1><p class="muted">Zmiany dotyczą przyszłych treningów. Rozpoczęte i zapisane treningi zachowują swoją wersję.</p></section><form id="plan-form"><div class="panel">'+fieldHTML('name',draft.name,'Nazwa planu','id="plan-name" maxlength="80" required')+'<label class="plan-field">Rodzaj treningu<select data-plan-field="dayType">'+[0,1,2,5].map(d=>'<option value="'+d+'" '+(draft.dayType===d?'selected':'')+'>'+esc(api.PLAN[d].name)+'</option>').join('')+'</select></label></div>'+draft.items.map(itemHTML).join('')+'<div class="panel"><label class="plan-field">Dodaj ćwiczenie z katalogu<select id="plan-catalog">'+[...new Map(api.PLAN.flatMap(p=>p.items).map(i=>[i.id,i])).values()].filter(i=>!draft.items.some(x=>x.id===i.id)).map(i=>'<option value="'+esc(i.id)+'">'+esc(i.title)+'</option>').join('')+'</select></label><div class="inline-actions">'+button('add-catalog','+ Z katalogu')+button('add-custom','+ Własne ćwiczenie')+'</div><p id="plan-error" role="alert">'+esc(error)+'</p><div class="inline-actions"><button class="btn" type="submit">Zapisz plan</button>'+button('cancel','Anuluj zmiany')+'</div></div></form>';
  return '<section class="hero"><h1>Moje plany</h1><p class="muted">Plany i tydzień treningowy należą do aktywnego profilu.</p></section><div class="panel"><label class="plan-field">Zacznij od szablonu<select id="plan-base">'+[0,1,2,5].map(d=>'<option value="'+d+'">'+esc(api.PLAN[d].name)+'</option>').join('')+'</select></label>'+button('new','+ Nowy plan')+'</div>'+lib.plans.map(p=>'<div class="panel"><h2>'+esc(p.name)+'</h2><p>'+p.items.length+' ćwiczeń · '+p.items.reduce((n,i)=>n+i.work.length,0)+' serii roboczych</p><div class="inline-actions">'+button('edit','Edytuj','data-plan-id="'+esc(p.id)+'"')+button('duplicate','Duplikuj','data-plan-id="'+esc(p.id)+'"')+button('delete','Usuń plan','data-plan-id="'+esc(p.id)+'"')+'</div></div>').join('')+'<div class="panel"><h2>Tydzień treningowy</h2><p class="hint">Zmiana obowiązuje dla nierozpoczętych dni. Domyślny przywraca dotychczasowy rozkład.</p>'+['Poniedziałek','Wtorek','Środa','Czwartek','Piątek','Sobota','Niedziela'].map((name,i)=>'<label class="plan-field">'+name+'<select data-plan-weekday="'+i+'"><option value="">Domyślny</option>'+lib.plans.map(p=>'<option value="'+esc(p.id)+'" '+(lib.weekdays[i]===p.id?'selected':'')+'>'+esc(p.name)+'</option>').join('')+'</select></label>').join('')+'</div><div class="panel"><h2>Kopia planów</h2><p class="hint">Eksport planów obejmuje szablony i rozkład tygodnia. Treningi eksportujesz osobno w zakładce Dane.</p>'+button('export','↓ Eksportuj plany JSON')+'<label class="plan-field">Import planów<input type="file" id="import-plans" accept=".json,application/json"></label><p id="plan-error" role="alert">'+esc(error)+'</p></div>';
 }
 function show(){api.render();}
 function fail(e){error=e.message;const el=document.getElementById('plan-error');if(el)el.textContent=error;else api.toast(error);}
 function start(p,isNew=false){draft=copy(p);if(isNew){draft.id='plan-'+crypto.randomUUID();draft.name='Mój '+draft.name;}original=isNew?'':JSON.stringify(draft);error='';show();}
 function click(b){
  const action=b.dataset.planAction;if(!action)return false;
  const lib=library(),p=lib.plans.find(p=>p.id===b.dataset.planId),i=Number(b.closest('[data-plan-item]')?.dataset.planItem),item=draft?.items[i];
  try{
   if(action==='new')start(builtIn(Number(document.getElementById('plan-base').value)),true);
   else if(action==='edit')start(p);
   else if(action==='duplicate')start(p,true);
   else if(action==='cancel'){if(leave())show();}
   else if(action==='delete'){if(confirm('Usunąć plan „'+p.name+'”? Zapisane treningi zachowają ćwiczenia i wyniki.')){lib.plans=lib.plans.filter(x=>x.id!==p.id);lib.weekdays=lib.weekdays.map(id=>id===p.id?null:id);saveLibrary(lib);show();}}
   else if(action==='export')api.download('gym-tracker-plany.json',JSON.stringify({format:'gym-tracker-plans-v1',library:lib},null,2),'application/json');
   else if(action==='up'||action==='down'){const j=i+(action==='up'?-1:1);if(j>=0&&j<draft.items.length)[draft.items[i],draft.items[j]]=[draft.items[j],draft.items[i]];show();}
   else if(action==='remove'){if(draft.items.length>1)draft.items.splice(i,1);show();}
   else if(action==='add-catalog'||action==='add-custom'){
    if(draft.items.length>=30)throw Error('Plan może mieć najwyżej 30 ćwiczeń.');
    if(action==='add-custom')draft.items.push({id:'custom-'+crypto.randomUUID(),title:'Własne ćwiczenie',tip:'',options:['DUMBBELL'],mode:'reps',work:[[0,10],[0,10],[0,10]],warm:[]});
    else{const id=document.getElementById('plan-catalog').value,item=api.PLAN.flatMap(p=>p.items).find(x=>x.id===id);if(item&&!draft.items.some(x=>x.id===id))draft.items.push(copy(item));}
    show();
   }else if(action.startsWith('add-')){const type=action.slice(4);if(item[type].length<15)item[type].push([0,10]);show();}
   else if(action==='remove-row'){const row=b.closest('[data-plan-row]'),type=row.dataset.planType;if(type==='warm'||item[type].length>1)item[type].splice(Number(row.dataset.planRow),1);show();}
  }catch(e){fail(e);}return true;
 }
 function input(el){
  const field=el.dataset.planField;if(!field||!draft)return false;
  const section=el.closest('[data-plan-item]'),item=section?draft.items[Number(section.dataset.planItem)]:draft;
  if(field==='kg'||field==='reps'){const row=el.closest('[data-plan-row]');item[row.dataset.planType][Number(row.dataset.planRow)][field==='kg'?0:1]=el.value===''?null:Number(el.value);}
  else if(field==='machine')item.options=item.id.startsWith('custom-')?[el.value]:[el.value,...item.options.filter(x=>x!==el.value)];
  else item[field]=field==='dayType'?Number(el.value):el.value;
  return true;
 }
 async function change(el){
  if(input(el))return true;
  if(el.dataset.planWeekday!==undefined){try{const lib=library();lib.weekdays[Number(el.dataset.planWeekday)]=el.value||null;saveLibrary(lib);api.toast('Zapisano rozkład tygodnia.');}catch(e){show();fail(e);}return true;}
  if(el.id!=='import-plans')return false;
  try{const file=el.files?.[0];if(!file)return true;if(file.size>100000)throw Error('Plik planów jest zbyt duży.');const data=JSON.parse(await file.text());if(data.format!=='gym-tracker-plans-v1')throw Error('Wybierz eksport planów Gym Tracker.');const incoming=GymPlanModel.library(data.library);if(confirm('Zastąpić bibliotekę i tydzień '+incoming.plans.length+' planami z pliku? Treningi pozostaną bez zmian.')){saveLibrary(incoming);show();api.toast('Zaimportowano plany.');}}
  catch(e){fail(e);}finally{el.value='';}return true;
 }
 function submit(e){if(e.target.id!=='plan-form')return false;e.preventDefault();try{const plan=GymPlanModel.snapshot(draft),lib=library(),index=lib.plans.findIndex(p=>p.id===plan.id);if(original&&JSON.stringify(lib.plans[index])!==original)throw Error('Plan zmienił się na innym urządzeniu. Twoje zmiany pozostały w formularzu. Anuluj edycję, aby wczytać aktualny plan.');if(index<0)lib.plans.push(plan);else lib.plans[index]=plan;saveLibrary(lib);draft=null;error='';show();api.toast('Plan zapisany. Synchronizacja z chmurą trwa w tle.');}catch(e){fail(e);}return true;}
 return {init:value=>api=value,library,builtIn,scheduled,html,click,change,input,submit,leave,dirty,editing:()=>!!draft};
})();
