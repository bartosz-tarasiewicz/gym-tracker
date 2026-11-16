const {test}=require('node:test');const assert=require('node:assert/strict');const {summary}=require('../results.js');
const set=(kg,reps,done=true)=>({kg:String(kg),reps:String(reps),done});
test('weekly summaries and personal records use only completed work and compare separate machines and units',()=>{
 const state={sessions:{},history:[
  {date:'2026-11-13',exercises:{x:{variants:{
   A:{sets:[set(20,10),set(999,99,false)],warmups:[set(999,99)]},
   B:{sets:[set(5,12)]}
  }}},planDefinition:{items:[{id:'x',title:'Ruch',mode:'reps'}]}},
  {date:'2026-11-15',exercises:{x:{machine:'A',sets:[set(30,15)]}},planDefinition:{items:[{id:'x',title:'Ruch',mode:'sec'}]}}
 ]};
 const data=summary(state,[],{A:{type:'perSide'},B:{type:'stack'}});assert.equal(data.bests.length,3);assert.deepEqual(data.weeks,[{week:'2026-11-09',workouts:2,sets:3,volume:460}]);assert.equal(data.bests.find(x=>x.machine==='A'&&x.mode==='reps').weight.value,20);assert.equal(data.bests.find(x=>x.mode==='sec').weight,null);assert.equal(data.bests.find(x=>x.mode==='sec').reps.value,15);
});
test('restoring a record does not double count a cloud ID and rest days are excluded',()=>{
 const history=[{syncId:'history:a',date:'2026-11-16',exercises:{x:{machine:'A',sets:[set(10,10)]}}},{date:'2026-11-17',notes:'rest',exercises:{}}];const sessions={restore:{...history[0],exercises:{x:{machine:'A',sets:[set(12,10)]}}}};
 const result=summary({history,sessions},[],{A:{type:'plates'}});assert.equal(result.weeks[0].workouts,1);assert.equal(result.weeks[0].sets,1);assert.equal(result.bests[0].weight.value,12);assert.deepEqual(summary({history:[],sessions:{}}),{weeks:[],bests:[]});
});
