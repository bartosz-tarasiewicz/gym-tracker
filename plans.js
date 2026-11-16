'use strict';
// Pure plan snapshot validation: usable from browser and Node tests.
(function(root,factory){if(typeof module==='object'&&module.exports)module.exports=factory();else root.GymPlanModel=factory();})(typeof window!=='undefined'?window:globalThis,()=>{
 const text=(v,max)=>typeof v==='string'&&v.trim().length>0&&v.length<=max;
 const id=v=>text(v,100)&&/^[a-zA-Z0-9_-]+$/.test(v)&&!['__proto__','constructor','prototype'].includes(v);
 const validRow=row=>Array.isArray(row)&&row.length===2&&row.every(n=>typeof n==='number'&&Number.isFinite(n)&&n>=0&&n<=100000);
 function validate(plan){
  if(plan?.dayType!==undefined&&![0,1,2,5].includes(plan.dayType))throw Error('Nieprawidłowy rodzaj planu.');
  if(!plan||typeof plan!=='object'||Array.isArray(plan)||!id(plan.id)||!text(plan.name,80)||!Array.isArray(plan.items)||!plan.items.length||plan.items.length>30)throw Error('Nieprawidłowy plan treningowy.');
  const seen=new Set();
  for(const item of plan.items){
   if(!item||!id(item.id)||seen.has(item.id)||!text(item.title,100)||!Array.isArray(item.options)||!item.options.length||item.options.length>12||item.options.some(x=>!id(x))||new Set(item.options).size!==item.options.length||!Array.isArray(item.work)||!item.work.length||item.work.length>15||!item.work.every(validRow)||!Array.isArray(item.warm)||item.warm.length>15||!item.warm.every(validRow)||(item.tip!==undefined&&(typeof item.tip!=='string'||item.tip.length>500))||(item.mode!==undefined&&!['reps','side','secSide','sec','stepsSide'].includes(item.mode)))throw Error('Nieprawidłowe lub zduplikowane ćwiczenie w planie.');
   seen.add(item.id);
  }
  return plan;
 }
 // Persist an independent immutable-at-creation copy alongside a workout.
 // Legacy records without this field must continue to use legacy definitions.
 function snapshot(plan){validate(plan);return JSON.parse(JSON.stringify(plan));}
 function resolve(record,current,legacy){
  if(record&&Object.hasOwn(record,'planDefinition'))return snapshot(record.planDefinition);
  return snapshot(record?legacy:current);
 }
 function library(value){
  if(!value||value.version!==1||!Array.isArray(value.plans)||value.plans.length>12||!Array.isArray(value.weekdays)||value.weekdays.length!==7)throw Error('Nieprawidłowa biblioteka planów (maksymalnie 12 planów).');
  const ids=new Set();
  for(const plan of value.plans){validate(plan);if(![0,1,2,5].includes(plan.dayType)||ids.has(plan.id)||plan.id.startsWith('builtin-'))throw Error('Nieprawidłowy identyfikator lub rodzaj planu.');ids.add(plan.id);}
  if(value.weekdays.some(id=>id!==null&&!ids.has(id)))throw Error('Tydzień wskazuje nieistniejący plan.');
  return JSON.parse(JSON.stringify(value));
 }
 return {validate,snapshot,resolve,library};
});
