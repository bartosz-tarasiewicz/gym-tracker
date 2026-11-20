'use strict';
/* Native single-day selection in the header; navigation never creates records. */
window.GymWeek=(()=>{
 const pad=x=>String(x).padStart(2,'0');
 const iso=date=>date.getFullYear()+'-'+pad(date.getMonth()+1)+'-'+pad(date.getDate());
 const parse=date=>/^\d{4}-\d{2}-\d{2}$/.test(String(date||''))?new Date(date+'T12:00:00'):new Date();
 const shift=(date,days)=>{const d=parse(date);d.setDate(d.getDate()+days);return iso(d)};
 const dayIndex=date=>({1:0,2:1,3:2,4:3,5:5})[parse(date).getDay()]??-1;
 function renderHeader(state,busy=false){
  const control=document.getElementById('header-date-control'),input=document.getElementById('week-date');
  if(!control||!input)return;
  const selected=state.selectedDate||iso(new Date()),date=parse(selected);
  control.hidden=state.view!=='train';input.value=selected;input.disabled=busy;
  const full=date.toLocaleDateString('pl-PL',{weekday:'long',day:'numeric',month:'long',year:'numeric'});
  input.setAttribute('aria-label','Wybierz dzień treningu: '+full);control.title=full;
  document.getElementById('selected-date-label').textContent=date.toLocaleDateString('pl-PL',{day:'numeric',month:'short'});
 }
 return {renderHeader,iso,shift,dayIndex};
})();
