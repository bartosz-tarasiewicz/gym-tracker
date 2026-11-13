'use strict';
/* Week-by-week date navigation; presentation only, never creates records. */
window.GymWeek=(()=>{
 const esc=x=>String(x??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const pad=x=>String(x).padStart(2,'0');
 const iso=date=>date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
 const parse=date=>/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))?new Date(date+'T12:00:00'):new Date();
 const shift=(date,days)=>{const d=parse(date);d.setDate(d.getDate()+days);return iso(d)};
 const dayIndex=date=>({1:0,2:1,3:2,4:3,5:5})[parse(date).getDay()]??-1;
 const monday=date=>shift(date,-((parse(date).getDay()+6)%7));
 const meaningful=r=>{
  if(!r)return false;
  if(String(r.notes||'').trim())return true;
  return Object.values(r.exercises||{}).some(log=>{
   const v=log.variants&&Object.keys(log.variants).length?Object.values(log.variants):[log];
   return v.some(part=>(part.sets||[]).some(row=>row.done));
  });
 };
 function html(state){
  const selected=state.selectedDate||iso(new Date()),first=monday(selected);
  const names=['Pn','Wt','Śr','Czw','Pt','Sob','Nd'];
  const all=[...(state.history||[]),...Object.values(state.sessions||{})];
  const dateCounts=new Map();
  for(const rec of all)if(meaningful(rec))dateCounts.set(rec.date,(dateCounts.get(rec.date)||0)+1);
  const cells=names.map((name,i)=>{
   const date=shift(first,i),count=dateCounts.get(date)||0,selectedNow=selected===date;
   return '<button type="button" class="week-day '+(selectedNow?'active':'')+(count?' has-data':'')+'" data-date="'+date+'" data-day="'+dayIndex(date)+'" aria-label="'+name+' '+date+(count?' — '+count+' treningów':'')+'" aria-pressed="'+selectedNow+'"><span class="week-name">'+name+'</span><span class="week-number">'+parse(date).getDate()+'</span><span class="week-dot">'+(count?'●':'')+'</span></button>';
  }).join('');
  const weekEnd=shift(first,6);
  const heading=parse(first).toLocaleDateString('pl-PL',{day:'numeric',month:'short'})+' – '+parse(weekEnd).toLocaleDateString('pl-PL',{day:'numeric',month:'short',year:'numeric'});
  return '<div class="panel week-panel"><div class="week-top"><div><div class="eyebrow">Wybierz dzień treningu</div><strong>'+esc(heading)+'</strong></div><div class="week-actions"><button type="button" data-week="-7" aria-label="Poprzedni tydzień">‹</button><button type="button" data-week="today">Dziś</button><button type="button" data-week="7" aria-label="Następny tydzień">›</button></div></div><div class="week-grid day-tabs">'+cells+'</div><div class="week-bottom"><span><span class="week-dot-legend">●</span> Dzień z zapisanymi seriami</span><label>Inna data <input type="date" id="week-date" value="'+esc(selected)+'" aria-label="Przejdź do daty"></label></div></div>';
 }
 return {html,iso,shift,dayIndex};
})();