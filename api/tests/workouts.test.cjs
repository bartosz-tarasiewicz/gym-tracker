const {test}=require('node:test');
const assert=require('node:assert/strict');
process.env.GYM_STORAGE_CONNECTION_STRING='UseDevelopmentStorage=true';
const {TableClient}=require('@azure/data-tables');
const rows=new Map();
let counter=0;
const key=(pk,rk)=>pk+'|'+rk;
const missing=()=>Object.assign(Error('not found'),{statusCode:404});
const conflict=(statusCode=409)=>Object.assign(Error('conflict'),{statusCode});
const fake={
 async createTable(){},
 async getEntity(pk,rk){const v=rows.get(key(pk,rk));if(!v)throw missing();return {...v}},
 async createEntity(v){const k=key(v.partitionKey,v.rowKey);if(rows.has(k))throw conflict();const row={...v,etag:'"'+(++counter)+'"'};rows.set(k,row);return {etag:row.etag}},
 async updateEntity(v,mode,options){
  const k=key(v.partitionKey,v.rowKey),old=rows.get(k);if(!old)throw missing();
  assert.equal(mode,'Replace');
  if(options?.etag!==old.etag||options?.matchConditions!=='IfNotModified')throw conflict(412);
  const row={...v,etag:'"'+(++counter)+'"'};rows.set(k,row);return {etag:row.etag};
 },
 async deleteEntity(pk,rk,options){
  const k=key(pk,rk),old=rows.get(k);if(!old)throw missing();
  if(options?.etag!==old.etag||options?.matchConditions!=='IfNotModified')throw conflict(412);
  rows.delete(k);
 },
 async *listEntities({queryOptions}={}){
  const pk=queryOptions?.filter?.match(/PartitionKey eq '([^']+)'/)?.[1];
  for(const v of rows.values())if(v.partitionKey===pk)yield {...v};
 }
};
TableClient.fromConnectionString=()=>fake;
const {handle,healthHandler,compressed,decompressed,identity,partition,rowKey,identifier}=require('../src/functions/workouts.js');
const {encode}=require('../src/functions/snapshot.js');
const who=x=>({userId:x,identityProvider:'github',userRoles:['authenticated']});
const req=(name,method='GET',id=null,body=null)=>({
 method,
 headers:{get:k=>k==='x-ms-client-principal'&&name?Buffer.from(JSON.stringify(who(name))).toString('base64'):null},
 params:id?{id}:{},json:async()=>body
});
const context={error:(...args)=>{throw Error('Unexpected backend exception '+args.join(' '))}};
test('User authentication, isolation and strict identifier validation',async()=>{
 assert.equal((await handle(req(null),context)).status,401);
 assert.equal((await handle(req('uA'),context)).status,200);
 assert.ok(identifier('draft:2026-11-13-5'));
 assert.ok(identifier('history:01234-abc'));
 assert.ok(!identifier('other:12345'));
 assert.ok(!identifier('draft:../../secret'));
 assert.notEqual(partition(who('uA')),partition(who('uB')));
});
test('Legacy snapshot safely migrates once, leaves original backup and multiple histories intact',async()=>{
 const old={version:2,sessions:{'2026-11-11-2':{date:'2026-11-11',day:2,notes:'siłownia',exercises:{}}},
 history:[{date:'2026-11-09',day:0,notes:'sesja 1'},{date:'2026-11-09',day:0,notes:'sesja 2'}]};
 const pk=partition(who('migrator'));
 await fake.createEntity({partitionKey:pk,rowKey:'snapshot',...encode(old)});
 let x=await handle(req('migrator'),context);
 assert.equal(x.status,200);
 assert.equal(x.jsonBody.workouts.length,3);
 assert.deepEqual(x.jsonBody.workouts.filter(w=>w.kind==='history').map(w=>w.record.notes),['sesja 1','sesja 2']);
 assert.equal(x.jsonBody.workouts.filter(w=>w.kind==='draft').length,1);
 assert.ok(rows.has(key(pk,'snapshot')),'never remove original legacy data');
 assert.ok(rows.has(key(pk,'meta-cloud-v04')),'migration marker');
 x=await handle(req('migrator'),context);
 assert.equal(x.jsonBody.workouts.length,3,'migration must be idempotent');
 assert.equal((await handle(req('another-user'),context)).jsonBody.workouts.length,0);
});
test('Per-workout create, optimistic update, stale conflict and deletion',async()=>{
 const id='draft:2026-11-13-2';
 const a={date:'2026-11-13',day:2,exercises:{x:{sets:[{kg:'40',reps:'10',done:true}]}}};
 const b={...a,notes:'nowy'};
 let x=await handle(req('uA','PUT',id,{record:a,expectedEtag:null}),context);
 assert.equal(x.status,200);const e1=x.jsonBody.etag;assert.ok(e1);
 assert.equal((await handle(req('uA','PUT',id,{record:a,expectedEtag:null}),context)).status,409);
 let all=await handle(req('uA'),context);assert.equal(all.jsonBody.workouts.length,1);
 assert.deepEqual(all.jsonBody.workouts[0].record,a);
 assert.equal(all.jsonBody.workouts[0].etag,e1);
 x=await handle(req('uA','PUT',id,{record:b,expectedEtag:e1}),context);
 assert.equal(x.status,200);const e2=x.jsonBody.etag;assert.notEqual(e2,e1);
 assert.equal((await handle(req('uA','PUT',id,{record:a,expectedEtag:e1}),context)).status,409);
 assert.equal((await handle(req('uA','DELETE',id,{expectedEtag:e1}),context)).status,409);
 assert.equal((await handle(req('uA','DELETE',id,{expectedEtag:e2}),context)).status,200);
 assert.equal((await handle(req('uA'),context)).jsonBody.workouts.length,0);
 assert.equal((await handle(req('uB'),context)).jsonBody.workouts.length,0);
});
test('Different workouts update independently and do not conflict',async()=>{
 const a='draft:2026-11-13-0',b='draft:2026-11-13-5';
 const pk=partition(who('separate'));
 const r1=await handle(req('separate','PUT',a,{record:{date:'2026-11-13',notes:'A'},expectedEtag:null}),context);
 const r2=await handle(req('separate','PUT',b,{record:{date:'2026-11-13',notes:'B'},expectedEtag:null}),context);
 assert.equal(r1.status,200);assert.equal(r2.status,200);
 assert.notEqual(rowKey(a),rowKey(b));
 const rowsNow=(await handle(req('separate'),context)).jsonBody.workouts;
 assert.equal(rowsNow.length,2);
 assert.ok(rows.has(key(pk,rowKey(a)))&&rows.has(key(pk,rowKey(b))));
});
test('Payload limits, compression and invalid requests',async()=>{
 const packed=compressed({notes:'cześć',set:[{kg:'42.5',reps:'10'}]});
 assert.deepEqual(decompressed(packed),{notes:'cześć',set:[{kg:'42.5',reps:'10'}]});
 assert.equal((await handle(req('uA','PUT','draft:../../',{record:{},expectedEtag:null}),context)).status,400);
 assert.equal((await handle(req('uA','PUT','draft:2026-11-13-2',{record:{}}),context)).status,400);
 assert.equal((await handle(req('uA','PUT','draft:2026-11-13-2',{record:{notes:'z'.repeat(450000)},expectedEtag:null}),context)).status,413);
});

test('v0.4 health probe contains no private workout data or storage credentials',async()=>{
 const r=await healthHandler(req(null),context);
 assert.equal(r.status,200);
 assert.deepEqual(r.jsonBody,{status:'ok',runtime:'workouts-v04'});
});
