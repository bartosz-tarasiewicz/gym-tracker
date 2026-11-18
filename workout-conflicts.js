'use strict';
// Compare the same machine variant that the workout editor displays.
function workoutFields(record){
 const fields=new Map();
 fields.set('Rodzaj treningu',trainingName(record.day));
 fields.set('Notatka do treningu',record.notes||'');
 fields.set('Plan',record.planDefinition?.name||trainingName(record.day));
 for(const {item,log} of allLogged(record)){
  const label=item.title;
  fields.set(label+' · sprzęt',machineName(log.machine||item.options?.[0]||''));
  if(log.notes)fields.set(label+' · notatka',log.notes);
  const variants=Object.keys(log.variants||{}).length?log.variants:{[log.machine||'']:log};
  for(const [machine,v] of Object.entries(variants)){
   const prefix=label+' · '+machineName(machine);
   if(v.rir)fields.set(prefix+' · RIR',String(v.rir));
   for(const [rows,type] of [[v.sets,'seria'],[v.warmups,'rozgrzewka']]){
    (rows||[]).forEach((row,i)=>fields.set(prefix+' · '+type+' '+(i+1),
     (row.kg||'0')+' kg × '+(row.reps||'0')+' · '+(row.done?'wykonana':'niewykonana')));
   }
  }
 }
 for(const [id,enabled] of Object.entries(record.coreEnabled||{}))if(enabled)fields.set('CORE · '+(CORE.find(x=>x.id===id)?.title||id),'włączone');
 return fields;
}
function comparisonHTML(cloud,local){
 const left=workoutFields(cloud),right=workoutFields(local);
 const differences=[...new Set([...left.keys(),...right.keys()])].filter(k=>left.get(k)!==right.get(k));
 return differences.map(key=>'<div class="comparison-row"><strong>'+esc(key)+'</strong><span><small>Zapisane w Azure</small>'+esc(left.get(key)??'Brak')+'</span><span><small>Szkic na tym urządzeniu</small>'+esc(right.get(key)??'Brak')+'</span></div>').join('')||'<p>Wartości serii i notatki są zgodne. Różnią się pozostałe dane treningu.</p>';
}
