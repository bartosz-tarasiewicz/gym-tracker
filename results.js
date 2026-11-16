'use strict';
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GymResults=factory();})(typeof window!=='undefined'?window:globalThis,()=>{
 function records(state){const map=new Map();for(const [i,r] of (state.history||[]).entries())map.set(r.syncId||'history:'+i,r);for(const [key,r] of Object.entries(state.sessions||{}))map.set(r.syncId||'draft:'+key,r);return [...map.values()];}
 function week(date){const d=new Date(date+'T12:00:00Z');if(Number.isNaN(d.getTime()))return null;d.setUTCDate(d.getUTCDate()-(d.getUTCDay()+6)%7);return d.toISOString().slice(0,10);}
 function summary(state,catalogue=[],machines={}){
  const weeks=new Map(),bests=new Map();
  for(const record of records(state)){
   const monday=week(record.date);if(!monday)continue;const definitions=new Map([...catalogue,...(record.planDefinition?.items||[])].map(i=>[i.id,i]));let sets=0,volume=0;
   for(const [id,log] of Object.entries(record.exercises||{})){
    const item=definitions.get(id)||{id,title:id},mode=item.mode||'reps';
    const variants=log.variants&&Object.keys(log.variants).length?log.variants:{[log.machine||'BODY']:log};
    for(const [machine,variant] of Object.entries(variants))for(const row of variant?.sets||[]){
     const kg=Number(row.kg||0),reps=Number(row.reps);
     if(row.done!==true||!Number.isFinite(kg)||!Number.isFinite(reps)||kg<0||reps<=0)continue;
     sets++;const type=machines[machine]?.type||'unknown',weighted=!['body','band','unknown'].includes(type)&&!mode.startsWith('sec')&&mode!=='stepsSide';
     if(weighted)volume+=kg*reps*(type==='perSide'?2:1);
     const key=id+'|'+machine+'|'+mode,best=bests.get(key)||{id,title:item.title,machine,mode,weight:null,reps:null};
     if(weighted&&kg>0&&(!best.weight||kg>best.weight.value))best.weight={value:kg,date:record.date,reps};
     if(!best.reps||reps>best.reps.value)best.reps={value:reps,date:record.date,kg};bests.set(key,best);
    }
   }
   if(sets){const current=weeks.get(monday)||{week:monday,workouts:0,sets:0,volume:0};current.workouts++;current.sets+=sets;current.volume+=volume;weeks.set(monday,current);}
  }
  return {weeks:[...weeks.values()].sort((a,b)=>b.week.localeCompare(a.week)),bests:[...bests.values()].sort((a,b)=>a.title.localeCompare(b.title,'pl')||a.machine.localeCompare(b.machine))};
 }
 return {records,summary};
});
