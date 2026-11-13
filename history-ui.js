'use strict';
/* Non-destructive history editing and monthly calendar. No API or storage migration. */
window.GymHistoryUI=(()=>{
 let month=new Date(new Date().getFullYear(),new Date().getMonth(),1);
 let selectedDate='';
 let editor=null;
 const esc=value=>String(value??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
 const clone=value=>JSON.parse(JSON.stringify(value));
 const pad=n=>String(n).padStart(2,'0');
 const dateKey=(year,monthIndex,day)=>year+'-'+pad(monthIndex+1)+'-'+pad(day);
 const isDate=value=>/^\d{4}-\d{2}-\d{2}$/.test(value)&&!Number.isNaN(new Date(value+'T12:00:00').getTime());
 const countSets=record=>Object.values(record.exercises||{}).reduce((n,log)=>{
  const variants=log.variants&&Object.keys(log.variants).length?Object.values(log.variants):[log];
  return n+variants.reduce((sum,v)=>sum+(v.sets||[]).filter(x=>x.done).length,0);
 },0);
 function monthHTML(history){
  const year=month.getFullYear(),m=month.getMonth();
  const first=(new Date(year,m,1).getDay()+6)%7;
  const days=new Date(year,m+1,0).getDate();
  const counts=new Map();
  for(const record of history){if(isDate(record.date))counts.set(record.date,(counts.get(record.date)||0)+1);}
  const title=month.toLocaleDateString('pl-PL',{month:'long',year:'numeric'});
  const cells=[];
  for(let i=0;i<first;i++)cells.push('<span class="calendar-blank" aria-hidden="true"></span>');
  for(let day=1;day<=days;day++){
   const key=dateKey(year,m,day),count=counts.get(key)||0;
   const classes='calendar-day'+(count?' has-workout':'')+(selectedDate===key?' selected':'');
   cells.push('<button type="button" class="'+classes+'" data-history-date="'+key+'" aria-label="'+day+' '+title+(count?', treningi: '+count:'')+'" aria-pressed="'+(selectedDate===key?'true':'false')+'"><span>'+day+'</span>'+(count?'<small>'+count+'</small>':'')+'</button>');
  }
  return '<div class="panel calendar-panel"><div class="calendar-header"><strong>Kalendarz treningów</strong><div class="calendar-actions"><button type="button" data-history-month="-1" aria-label="Poprzedni miesiąc">‹</button><button type="button" data-history-today="1">Dziś</button><button type="button" data-history-month="1" aria-label="Następny miesiąc">›</button></div></div><div class="calendar-month">'+esc(title)+'</div><div class="calendar-grid">'+['Pn','Wt','Śr','Cz','Pt','So','Nd'].map(x=>'<span class="calendar-weekday">'+x+'</span>').join('')+cells.join('')+'</div><div class="calendar-footer"><span class="calendar-key"><i></i> Dzień z treningiem</span>'+(selectedDate?'<button type="button" class="btn secondary small" data-history-clear="1">Pokaż wszystkie</button>':'')+'</div></div>';
 }
 function listHTML(state,api){
  const all=state.history||[],records=[...all].reverse();
  const visible=selectedDate?records.filter(h=>h.date===selectedDate):records;
  const total=all.reduce((n,h)=>n+countSets(h),0);
  const sum=Object.keys(state.sessions||{}).length;
  const items=visible.map(record=>{
   const index=all.indexOf(record),dayName=api.PLAN[record.day]?.name||'Trening';
   return '<div class="history-item"><div class="flex"><strong>'+esc(dayName)+'</strong><span class="chip">'+esc(record.date)+'</span></div><p class="hint">'+esc(record.source||'Wpisane w aplikacji')+' · '+countSets(record)+' serii</p><button type="button" class="btn secondary small history-edit-button" data-history-edit="'+index+'">✎ Edytuj trening</button><details class="history-details"><summary>Pokaż wykonane serie</summary><pre class="history-report">'+esc(api.sessionReport(record))+'</pre></details></div>';
  });
  return '<section class="hero"><div class="eyebrow">Historia · Azure Primary</div><h1>Progres</h1><p class="muted">Wybierz dzień w kalendarzu, aby przejrzeć lub poprawić zakończony trening. Korekta zachowuje ten sam rekord w Azure.</p></section>'+
   '<div class="statgrid"><div class="stat"><strong>'+all.length+'</strong><span>Treningi</span></div><div class="stat"><strong>'+total+'</strong><span>Serie</span></div><div class="stat"><strong>'+sum+'</strong><span>Rozpoczęte</span></div></div>'+
   monthHTML(all)+
   '<div class="panel"><h2>'+(selectedDate?'Treningi · '+esc(selectedDate):'Ostatnie treningi')+'</h2>'+(visible.length?items.join(''):'<div class="empty">Brak treningów w tym dniu.</div>')+'</div>';
 }
 function entries(){return Object.entries(editor?.draft?.exercises||{});}
 function selection(){
  const pair=entries()[editor.exercise];
  if(!pair)return null;
  const [id,log]=pair;
  const variants=log.variants&&Object.keys(log.variants).length?log.variants:{[log.machine||'BODY']:log};
  const names=Object.keys(variants);
  const machine=names.includes(editor.machine)?editor.machine:names[0];
  editor.machine=machine;
  return {id,log,variants,names,machine,data:variants[machine]};
 }
 function setRows(rows,type,api,item){
  return (rows||[]).map((row,i)=>'<div class="set-row'+(row.done?' done':'')+'"><strong>'+(type==='warm'?'R'+(i+1):i+1)+'</strong>'+
   '<input type="number" inputmode="decimal" min="0" step="any" aria-label="Ciężar '+(i+1)+'" data-history-field="kg" data-history-type="'+type+'" data-history-set="'+i+'" value="'+esc(row.kg??'')+'">'+
   '<input type="number" inputmode="decimal" min="0" step="any" aria-label="Powtórzenia / czas '+(i+1)+'" data-history-field="reps" data-history-type="'+type+'" data-history-set="'+i+'" value="'+esc(row.reps??'')+'">'+
   '<button type="button" class="done-button'+(row.done?' checked':'')+'" data-history-toggle="'+i+'" data-history-type="'+type+'" aria-label="Seria '+(i+1)+(row.done?' wykonana':' niewykonana')+'">'+(row.done?'✓':'○')+'</button></div>').join('');
 }
 function editHTML(state,api){
  if(!editor)return listHTML(state,api);
  const record=editor.draft,all=entries(),sel=selection();
  const nav='<div class="history-editor-actions"><button class="btn secondary small" type="button" id="history-cancel">← Anuluj bez zapisywania</button></div>';
  let exercise='';
  if(sel){
   const item=api.allLogged(record).find(x=>x.item.id===sel.id)?.item||{title:sel.id,mode:'reps'};
   const v=sel.data,rir=String(v.rir||''),options=['','0','1','2','3+','Technika OK','Dyskomfort'];
   if(rir&&!options.includes(rir))options.push(rir);
   exercise='<div class="panel history-editor"><div class="eyebrow">Ćwiczenie '+(editor.exercise+1)+' / '+all.length+'</div>'+
    '<div class="title">'+esc(item.title)+'</div><div class="history-exercise-tabs">'+all.map(([id,log],i)=>'<button type="button" class="tab '+(i===editor.exercise?'active':'')+'" data-history-exercise="'+i+'" title="'+esc(api.allLogged(record).find(x=>x.item.id===id)?.item.title||id)+'">'+(i+1)+'</button>').join('')+'</div>'+
    (sel.names.length>1?'<div class="label">Zapisane warianty sprzętu</div><div class="history-variant-tabs">'+sel.names.map((key,i)=>'<button type="button" class="btn small '+(sel.machine===key?'':'secondary')+'" data-history-variant="'+i+'">'+esc(api.machineName(key))+'</button>').join('')+'</div>':'')+
    '<div class="label">Maszyna: '+esc(api.machineName(sel.machine))+' · '+esc(api.unit(sel.machine))+'</div>'+
    '<div class="section-header"><strong>Rozgrzewki</strong></div><div class="set-head"><span>R</span><span>Ciężar, kg</span><span>Powt./czas</span><span>OK</span></div>'+
    setRows(v.warmups||[],'warm',api,item)+'<button type="button" class="btn secondary small" data-history-add="warm">+ Rozgrzewka</button>'+
    '<div class="section-header"><strong>Serie robocze</strong><span class="smallcaps">'+(v.sets||[]).filter(x=>x.done).length+' wykonano</span></div>'+
    '<div class="set-head"><span>S</span><span>Ciężar, kg</span><span>Powt./czas</span><span>OK</span></div>'+
    setRows(v.sets||[],'work',api,item)+'<button type="button" class="btn secondary small" data-history-add="work">+ Seria</button>'+
    '<div class="label">RIR ostatniej serii / ocena</div><select id="history-edit-rir" class="rir-select">'+options.map(val=>'<option value="'+esc(val)+'" '+(rir===val?'selected':'')+'>'+(val?esc(val):'— nie podano —')+'</option>').join('')+'</select></div>';
  }else{
   exercise='<div class="panel"><p class="hint">Ten trening nie ma zapisanych ćwiczeń.</p></div>';
  }
  return '<section class="hero"><div class="eyebrow">Historia · korekta istniejącego wpisu</div><h1>Edytuj trening</h1><p class="muted">Zmiany trafiają do Azure dopiero po wybraniu „Zapisz zmiany”. Nie powstanie nowy trening.</p></section>'+
   nav+'<div class="panel"><div class="label">Data treningu</div><input id="history-edit-date" class="history-date-field" type="date" value="'+esc(record.date||'')+'"><div class="label">Dzień planu</div><strong>'+esc(api.PLAN[record.day]?.name||record.day)+'</strong></div>'+
   exercise+'<div class="panel"><div class="label">Notatki</div><textarea class="notes history-notes" id="history-edit-notes">'+esc(record.notes||'')+'</textarea><div class="inline-actions"><button type="button" id="history-save" class="btn full">✓ Zapisz zmiany w tym treningu</button></div><p class="hint">Zapis aktualizuje istniejący rekord. Jeśli ten trening zmieniono na innym urządzeniu, korekta zostanie wstrzymana.</p></div>';
 }
 function html(state,api){return state.view==='history-edit'&&editor?editHTML(state,api):listHTML(state,api);}
 const changed=()=>!!editor&&JSON.stringify(editor.draft)!==editor.original;
 function allowNavigate(){
  if(!editor)return true;
  if(changed()&&!confirm('Masz niezapisane zmiany w treningu. Odrzucić je?'))return false;
  editor=null;return true;
 }
 function currentRows(type){const sel=selection();if(!sel)return null;const key=type==='warm'?'warmups':'sets';return sel.data[key]||(sel.data[key]=[]);}
 async function handleClick(button,ctx){
  const {state,save,render,toast,GymStorage}=ctx;
  if(button.dataset.historyMonth!==undefined){
   month=new Date(month.getFullYear(),month.getMonth()+Number(button.dataset.historyMonth),1);
   selectedDate='';render();return true;
  }
  if(button.dataset.historyToday!==undefined){
   month=new Date(new Date().getFullYear(),new Date().getMonth(),1);
   selectedDate=dateKey(new Date().getFullYear(),new Date().getMonth(),new Date().getDate());
   render();return true;
  }
  if(button.dataset.historyDate!==undefined){selectedDate=button.dataset.historyDate;render();return true;}
  if(button.dataset.historyClear!==undefined){selectedDate='';render();return true;}
  if(button.dataset.historyEdit!==undefined){
   const index=Number(button.dataset.historyEdit),record=state.history[index];
   if(!record){toast('Trening nie jest już dostępny');return true;}
   editor={index,id:record.syncId||null,original:JSON.stringify(record),draft:clone(record),exercise:0,machine:null};
   state.view='history-edit';save(false);render();return true;
  }
  if(!editor)return false;
  if(button.id==='history-cancel'){
   if(!allowNavigate())return true;
   state.view='history';save(false);render();return true;
  }
  if(button.dataset.historyExercise!==undefined){
   editor.exercise=Number(button.dataset.historyExercise);editor.machine=null;render();return true;
  }
  if(button.dataset.historyVariant!==undefined){
   const sel=selection();editor.machine=sel?.names[Number(button.dataset.historyVariant)]||null;render();return true;
  }
  if(button.dataset.historyToggle!==undefined){
   const rows=currentRows(button.dataset.historyType),row=rows?.[Number(button.dataset.historyToggle)];
   if(!row)return true;
   if(!row.done&&String(row.reps??'').trim()===''){toast('Najpierw wpisz powtórzenia lub czas');return true;}
   row.done=!row.done;render();return true;
  }
  if(button.dataset.historyAdd!==undefined){
   const rows=currentRows(button.dataset.historyAdd);
   if(!rows)return true;
   if(rows.length>=15){toast('Maksymalnie 15 serii');return true;}
   rows.push({kg:'',reps:'',done:false});render();return true;
  }
  if(button.id==='history-save'){
   if(!isDate(editor.draft.date)){toast('Sprawdź datę treningu');return true;}
   const index=editor.id?state.history.findIndex(h=>h.syncId===editor.id):editor.index;
   const original=state.history[index];
   if(!original||JSON.stringify(original)!==editor.original){
    toast('Ten trening zmienił się w międzyczasie. Anuluj edycję i otwórz aktualny wpis.');return true;
   }
   const updated=clone(editor.draft);
   updated.syncId=original.syncId||updated.syncId;
   state.history[index]=updated;selectedDate=updated.date;
   const [year,monthIndex]=updated.date.split('-').map(Number);
   month=new Date(year,monthIndex-1,1);
   editor=null;state.view='history';
   save();await GymStorage.flush();render();toast('Zapisano korektę. Synchronizacja z Azure w toku.');return true;
  }
  return false;
 }
 function handleInput(target){
  if(!editor)return false;
  if(target.dataset.historyField!==undefined){
   const rows=currentRows(target.dataset.historyType),row=rows?.[Number(target.dataset.historySet)];
   if(row&&['kg','reps'].includes(target.dataset.historyField))row[target.dataset.historyField]=target.value;
   return true;
  }
  if(target.id==='history-edit-notes'){editor.draft.notes=target.value;return true;}
  if(target.id==='history-edit-date'){editor.draft.date=target.value;return true;}
  return false;
 }
 function handleChange(target){
  if(!editor)return false;
  if(target.id==='history-edit-rir'){const sel=selection();if(sel)sel.data.rir=target.value;return true;}
  if(target.id==='history-edit-date'){editor.draft.date=target.value;return true;}
  return false;
 }
 return {html,handleClick,handleInput,handleChange,allowNavigate};
})();
