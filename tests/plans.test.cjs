'use strict';
const {test}=require('node:test');
const assert=require('node:assert/strict');
const model=require('../plans.js');
const create=()=>({id:'plan-1',name:'Nogi',items:[{id:'legpress',title:'Suwnica',options:['MG-PL70','G7-S70'],work:[[60,12],[60,12]],warm:[[20,8]],tip:'Ruch kontrolowany'}]});
test('workout keeps an independent copy after the plan is edited or removed',()=>{
 const plan=create(),record={planDefinition:model.snapshot(plan)};plan.name='Nowy';plan.items[0].work[0][0]=80;plan.items.splice(0);
 assert.equal(record.planDefinition.name,'Nogi');assert.equal(record.planDefinition.items[0].work[0][0],60);
 const resolved=model.resolve(record,plan,create());resolved.items[0].title='Inna';assert.equal(record.planDefinition.items[0].title,'Suwnica');
});
test('old saved records use legacy plan while a new workout uses the active profile plan',()=>{
 const legacy=create(),current=create();current.name='Moja wersja';
 assert.equal(model.resolve({date:'2026-11-13'},current,legacy).name,'Nogi');
 assert.equal(model.resolve(null,current,legacy).name,'Moja wersja');
});
test('rejects invalid or ambiguous plans instead of silently losing exercises',()=>{
 const p=create();p.items.push(structuredClone(p.items[0]));assert.throws(()=>model.validate(p));
 const q=create();q.items[0].work[0][0]=NaN;assert.throws(()=>model.validate(q));
 const r=create();r.items[0].options=[];assert.throws(()=>model.validate(r));
 assert.throws(()=>model.resolve({planDefinition:{bad:true}},create(),create()));
});
test('library rejects duplicate IDs, invalid weekday references and prototype names',()=>{
 const p={...create(),dayType:5},lib={version:1,plans:[p],weekdays:[null,null,null,null,p.id,null,null]};
 assert.deepEqual(model.library(lib),lib);lib.plans.push(p);assert.throws(()=>model.library(lib));lib.plans.pop();lib.weekdays[0]='missing';assert.throws(()=>model.library(lib));
 p.items[0].id='__proto__';assert.throws(()=>model.snapshot(p));
});
