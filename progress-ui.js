'use strict';
/* Read-only exercise trends. Never mutate a workout; compare like-with-like machine variants. */
window.GymProgress=(()=>{
 let {exercise='',machine='',metric='weight',range='12',measureMode='reps'}=window.GymProfiles?.preference('progress')||{};
 const persist=()=>window.GymProfiles?.preference('progress',{exercise,machine,metric,range,measureMode});
 window.addEventListener('gym-preferences-loaded',()=>{({exercise='',machine='',metric='weight',range='12',measureMode='reps'}=window.GymProfiles?.preference('progress')||{});});
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const fmt=x=>new Intl.NumberFormat('pl-PL',{maximumFractionDigits:1}).format(x);
 const allRecords=state=>GymResults.records(state).filter(r=>r&&r.date);
 const variants=log=>log?.variants&&Object.keys(log.variants).length?log.variants:{[log?.machine||'BODY']:log};
 const numerical=x=>{const n=Number(x);return Number.isFinite(n)?n:0};
 function rows(state,id,variant,mode,api){
  const result=[];
  for(const workout of allRecords(state)){
   const definition=workout.planDefinition?.items.find(i=>i.id===id)||[...api.PLAN.flatMap(p=>p.items),...api.CORE].find(i=>i.id===id);if((definition?.mode||'reps')!==mode)continue;
   const log=workout.exercises?.[id];if(!log)continue;
   const selected=variants(log)[variant];if(!selected)continue;
   const done=(selected.sets||[]).filter(x=>x.done);
   if(!done.length)continue;
   const valid=done.filter(x=>Number.isFinite(Number(x.reps))&&Number(x.reps)>0);
   if(!valid.length)continue;
   const maxWeight=Math.max(...valid.map(x=>numerical(x.kg)));
   const maxReps=Math.max(...valid.map(x=>numerical(x.reps)));
   const volume=valid.reduce((n,row)=>n+numerical(row.kg)*numerical(row.reps)*(variant==='MG-PL33'?2:1),0);
   result.push({date:workout.date,started:workout.started||'',weight:maxWeight,reps:maxReps,volume,sets:done.length,rir:selected.rir||'',id:workout.syncId||''});
  }
  result.sort((a,b)=>a.date.localeCompare(b.date)||a.started.localeCompare(b.started)||a.id.localeCompare(b.id));
  return result;
 }
 function graph(points,key){
  if(!points.length)return '<div class="empty">Brak wykonanych serii dla tego ćwiczenia i wariantu sprzętu.</div>';
  if(points.length===1)return '<div class="trend-empty">Jest jeden trening. Drugi punkt pozwoli narysować trend.</div>';
  const width=344,height=208,left=38,top=22,right=10,bottom=39,plotWidth=width-left-right,plotHeight=height-top-bottom;
  const values=points.map(p=>p[key]),minValue=Math.min(...values),maxValue=Math.max(...values),span=maxValue-minValue||1,pad=span*.2;
  const low=Math.max(0,minValue-pad),high=maxValue+pad;
  const at=(p,i)=>({x:left+i*plotWidth/(points.length-1),y:top+plotHeight-(p[key]-low)/(high-low)*plotHeight});
  const coords=points.map(at);
  const labels=[0,.5,1].map(t=>{
   const y=top+t*plotHeight,v=high-t*(high-low);
   return '<line x1="'+left+'" y1="'+y+'" x2="'+(width-right)+'" y2="'+y+'" class="trend-grid"/><text x="'+(left-6)+'" y="'+(y+4)+'" text-anchor="end" class="trend-axis">'+fmt(v)+'</text>';
  }).join('');
  const path=coords.map((p,i)=>(i?'L':'M')+p.x.toFixed(1)+','+p.y.toFixed(1)).join(' ');
  const circles=coords.map((pos,i)=>{
   const p=points[i];return '<circle cx="'+pos.x.toFixed(1)+'" cy="'+pos.y.toFixed(1)+'" r="4" class="trend-point"><title>'+esc(p.date+' — '+fmt(p[key]))+'</title></circle>';
  }).join('');
  const start=points[0].date.slice(5),end=points[points.length-1].date.slice(5);
  return '<svg class="trend-chart" role="img" aria-label="Wykres '+esc(key)+' od '+esc(points[0].date)+' do '+esc(points[points.length-1].date)+'" viewBox="0 0 '+width+' '+height+'">'+labels+'<path d="'+path+'" class="trend-line"/>'+circles+'<text x="'+left+'" y="'+(height-9)+'" class="trend-axis">'+esc(start)+'</text><text x="'+(width-right)+'" y="'+(height-9)+'" text-anchor="end" class="trend-axis">'+esc(end)+'</text></svg>';
 }
 function summaryHTML(state,api){
  const data=GymResults.summary(state,[...api.PLAN.flatMap(p=>p.items),...api.CORE],api.MACHINE);
  return '<div class="panel" id="weekly-summary"><h2>Podsumowanie tygodni</h2><p class="hint">Tylko wykonane serie robocze. Rozgrzewka i dni wolne są poza zestawieniem.</p>'+(data.weeks.length?'<table class="results-table"><thead><tr><th>Tydzień od</th><th>Treningi</th><th>Serie</th><th>kg × powt.</th></tr></thead><tbody>'+data.weeks.slice(0,12).map(w=>'<tr><td>'+esc(w.week)+'</td><td>'+w.workouts+'</td><td>'+w.sets+'</td><td>'+fmt(w.volume)+'</td></tr>').join('')+'</tbody></table><p class="hint">Objętość jest orientacyjna; pomija ćwiczenia na czas, gumy, masę ciała i nieustaloną jednostkę maszyny.</p>':'<p>Brak wykonanych serii.</p>')+'</div><div class="panel" id="personal-records"><h2>Rekordy osobiste</h2><p class="hint">Każde ćwiczenie, wariant sprzętu i sposób liczenia mają osobny rekord. Większa liczba powtórzeń może pochodzić z lżejszej serii.</p>'+(data.bests.length?data.bests.map(b=>'<details class="record-best"><summary>'+esc(b.title)+' · '+esc(api.machineName(b.machine))+' · '+esc(api.measure({mode:b.mode}))+'</summary>'+(b.weight?'<p>Największy ciężar: <strong>'+fmt(b.weight.value)+' kg × '+fmt(b.weight.reps)+'</strong> · '+esc(b.weight.date)+'</p>':'')+'<p>Najwięcej '+(b.mode.startsWith('sec')?'sekund':b.mode==='stepsSide'?'kroków':'powtórzeń')+': <strong>'+fmt(b.reps.value)+(b.reps.kg?' przy '+fmt(b.reps.kg)+' kg':'')+'</strong> · '+esc(b.reps.date)+'</p></details>').join(''):'<p>Potwierdź serie, aby zobaczyć swoje rekordy.</p>')+'</div>';
 }
 function html(state,api){
  const records=allRecords(state);
  const exercises=new Map();
  const catalogue=[...api.PLAN.flatMap(p=>p.items),...api.CORE,...records.flatMap(r=>r.planDefinition?.items||[])];
  for(const e of catalogue)exercises.set(e.id,e.title);
  const archived={'core-deadbug':'Dead Bug (archiwalne)','core-suitcase':'Suitcase Carry (archiwalne)'};
  for(const rec of records)for(const id of Object.keys(rec.exercises||{}))if(!exercises.has(id))exercises.set(id,archived[id]||id);
  const ids=[...exercises].sort((a,b)=>a[1].localeCompare(b[1],'pl'));
  if(!exercises.has(exercise))exercise=ids[0]?.[0]||'';
  const usedMachines=new Set();
  for(const rec of records)for(const key of Object.keys(variants(rec.exercises?.[exercise]||{}))){
   if(rec.exercises?.[exercise]?.machine||rec.exercises?.[exercise]?.variants)usedMachines.add(key);
  }
  const modes=[...new Set(catalogue.filter(e=>e.id===exercise).map(e=>e.mode||'reps'))];if(!modes.includes(measureMode))measureMode=modes[0]||'reps';
  const reference=catalogue.find(e=>e.id===exercise&&(e.mode||'reps')===measureMode);
  for(const key of reference?.options||[])usedMachines.add(key);
  if(!usedMachines.has(machine))machine=usedMachines.values().next().value||'';
  const all=rows(state,exercise,machine,measureMode,api);
  const filtered=range==='all'?all:all.slice(-Number(range));
  const unit=api.unit(machine),kind=api.MACHINE[machine]?.type||'unknown';
  if((['body'].includes(kind)||measureMode.startsWith('sec')||measureMode==='stepsSide')&&metric!=='reps')metric='reps';
  const fields={weight:{label:'Maks. ciężar',unit:'kg'},reps:{label:'Maks. powtórzenia / czas',unit:reference?.mode?.startsWith('sec')?'s': 'powt.'},volume:{label:'Objętość orientacyjna',unit:'kg × powt.'}};
  const desc=fields[metric];
  const modeSelector=modes.length>1?'<label class="label" for="trend-mode">Sposób liczenia</label><select class="equipment" id="trend-mode">'+modes.map(mode=>'<option value="'+esc(mode)+'" '+(mode===measureMode?'selected':'')+'>'+esc(api.measure({mode}))+'</option>').join('')+'</select>':'';
  const first=filtered[0],last=filtered[filtered.length-1],diff=first&&last&&filtered.length>1?last[metric]-first[metric]:null;
  return '<section class="hero"><div class="eyebrow">Gym Tracker · analiza</div><h1>Progres</h1><p class="muted">Wykresy wyłącznie z potwierdzonych serii. Każdy wariant sprzętu jest analizowany oddzielnie.</p></section>'+
   '<div class="panel trend-filter"><label class="label" for="trend-exercise">Ćwiczenie</label><select class="equipment" id="trend-exercise">'+ids.map(([id,title])=>'<option value="'+esc(id)+'" '+(id===exercise?'selected':'')+'>'+esc(title)+'</option>').join('')+'</select>'+
   '<label class="label" for="trend-machine">Wariant sprzętu</label><select class="equipment" id="trend-machine">'+[...usedMachines].map(id=>'<option value="'+esc(id)+'" '+(id===machine?'selected':'')+'>'+esc(api.machineName(id))+'</option>').join('')+'</select><p class="ex-note">Jednostka: '+esc(unit)+'. Nie łączymy wyników z różnych maszyn ani hantli.</p>'+
   modeSelector+'<div class="trend-filter-row"><div class="trend-segments">'+Object.entries(fields).map(([key,f])=>'<button class="trend-segment '+(key===metric?'active':'')+'" data-trend-metric="'+key+'">'+(key==='weight'?'Ciężar':key==='reps'?'Powt. / czas':'Objętość')+'</button>').join('')+'</div><select id="trend-range" aria-label="Ile ostatnich treningów"><option value="6" '+(range==='6'?'selected':'')+'>6 ostatnich</option><option value="12" '+(range==='12'?'selected':'')+'>12 ostatnich</option><option value="all" '+(range==='all'?'selected':'')+'>Wszystkie</option></select></div>'+
   '<div class="trend-stats"><div><span>Ostatni wynik</span><strong>'+(last?fmt(last[metric])+' '+desc.unit:'—')+'</strong></div><div><span>Zmiana w okresie</span><strong>'+(diff===null?'—':(diff>0?'+':'')+fmt(diff)+' '+desc.unit)+'</strong></div><div><span>Treningi</span><strong>'+filtered.length+'</strong></div></div>'+
   graph(filtered,metric)+
   '<p class="hint">Ciężar: najcięższa wykonana seria. Powtórzenia/czas: najlepsza seria. Objętość: suma ciężar × powtórzenia (MG-PL33 ×2); ćwiczenia na czas nie są porównywane objętością.</p></div>'+
   (filtered.length?'<div class="panel"><h2>Ostatnie sesje</h2><div class="trend-history">'+[...filtered].reverse().slice(0,8).map(p=>'<div><span>'+esc(p.date)+'</span><strong>'+fmt(p[metric])+' '+desc.unit+'</strong><small>'+p.sets+' serii'+(p.rir?' · RIR '+esc(p.rir):'')+'</small></div>').join('')+'</div></div>':'')+summaryHTML(state,api);
 }
 function handleClick(button,render){if(button.dataset.trendMetric!==undefined){metric=button.dataset.trendMetric;persist();render();return true;}return false;}
 function handleChange(target,render){
  if(target.id==='trend-mode'){measureMode=target.value;metric='reps';persist();render();return true;}
  if(target.id==='trend-exercise'){exercise=target.value;machine='';metric='weight';persist();render();return true;}
  if(target.id==='trend-machine'){machine=target.value;persist();render();return true;}
  if(target.id==='trend-range'){range=target.value;persist();render();return true;}
  return false;
 }
 return {html,handleClick,handleChange};
})();
