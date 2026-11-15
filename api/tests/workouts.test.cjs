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
test('Different dates update independently, but same date cannot create duplicate ID',async()=>{
 const a='draft:2026-11-13-5',b='draft:2026-11-06-5';
 const pk=partition(who('separate'));
 const r1=await handle(req('separate','PUT',a,{record:{date:'2026-11-13',day:5,notes:'A'},expectedEtag:null}),context);
 const blocked=await handle(req('separate','PUT','history:duplicate-Nov-13',{
  record:{date:'2026-11-13',day:5,notes:'should-not-exist'},expectedEtag:null}),context);
 const r2=await handle(req('separate','PUT',b,{record:{date:'2026-11-06',day:5,notes:'B'},expectedEtag:null}),context);
 assert.equal(r1.status,200);assert.equal(blocked.status,409);assert.equal(blocked.jsonBody.error,'workout_date_exists');
 assert.equal(r2.status,200);
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

const scoped=(request,profile)=>({...request,query:new Map([['profile',profile]])});
const profileA='p-11111111-1111-4111-8111-111111111111';
const profileB='p-22222222-2222-4222-8222-222222222222';
test('Profiles isolate identical IDs/dates, ETags, deletes and legacy migration',async()=>{
 const user='profiles-owner',id='draft:2026-11-15-5';
 const request=(profile,method='GET',body=null)=>scoped(req(user,method,method==='GET'?null:id,body),profile);
 const data={date:'2026-11-15',day:5,notes:'original',planSnapshots:{0:{notes:'plan A'}},exercises:{}};
 const old=await handle(req(user,'PUT',id,{record:data,expectedEtag:null}),context);
 const legacy=await handle(request('default'),context);
 assert.equal(legacy.jsonBody.workouts[0].etag,old.jsonBody.etag);
 for(const profile of [profileA,profileB]){
  assert.deepEqual((await handle(request(profile),context)).jsonBody.workouts,[]);
  assert.equal((await handle(request(profile,'PUT',{record:{...data,notes:profile},expectedEtag:null}),context)).status,200);
 }
 const a=(await handle(request(profileA),context)).jsonBody.workouts[0];
 assert.equal((await handle(request(profileB,'PUT',{record:data,expectedEtag:a.etag}),context)).status,409);
 assert.equal((await handle(request(profileA,'DELETE',{expectedEtag:a.etag}),context)).status,200);
 assert.equal((await handle(request(profileB),context)).jsonBody.workouts[0].record.notes,profileB);
 assert.deepEqual((await handle(req(user),context)).jsonBody.workouts[0].record,data);
 assert.equal((await handle(request('../bad'),context)).status,400);
 assert.equal((await handle(scoped(req('other-owner'),profileB),context)).jsonBody.workouts.length,0);
});
test('Profile registry and settings persist per owner/profile with version protection',async()=>{
 const registry=require('../src/functions/profiles').handle;
 const settings=require('../src/functions/profile-settings').handle;
 assert.equal((await registry(req(null),context)).status,401);
 assert.equal((await registry(req('registry','POST',null,{id:profileA,name:'Anna'}),context)).status,200);
 assert.equal((await registry(req('registry','POST',null,{id:profileA,name:'Anna'}),context)).status,200);
 assert.equal((await registry(req('registry'),context)).jsonBody.profiles.length,2);
 assert.equal((await registry(req('other-registry'),context)).jsonBody.profiles.length,1);
 const data={preferences:{progress:{metric:'reps'}},plans:{week:{0:5}}};
 const a=await settings(scoped(req('registry','PUT',null,{settings:data,expectedEtag:null}),profileA),context);
 assert.equal(a.status,200);
 assert.deepEqual((await settings(scoped(req('registry'),profileA),context)).jsonBody.settings,data);
 assert.equal((await settings(scoped(req('registry'),profileB),context)).jsonBody.settings,null);
 assert.equal((await settings(scoped(req('registry','PUT',null,{settings:{},expectedEtag:null}),profileA),context)).status,409);
 assert.equal((await settings(scoped(req('registry','PUT',null,{settings:{},expectedEtag:a.jsonBody.etag}),profileA),context)).status,200);
});

test('Legacy snapshot endpoint also respects profile scope and retains default backup',async()=>{
 const snapshots=require('../src/functions/snapshot').handler;
 const data={history:[{date:'2026-11-15',notes:'old backup'}],sessions:{}};
 const write=await snapshots(req('snapshot-profiles','PUT',null,{snapshot:data,expectedEtag:null}),context);
 assert.equal(write.status,200);
 const empty=await snapshots(scoped(req('snapshot-profiles'),profileA),context);
 assert.equal(empty.jsonBody.snapshot,null);
 assert.equal((await snapshots(scoped(req('snapshot-profiles','PUT',null,{snapshot:{history:[],sessions:{}},expectedEtag:null}),profileA),context)).status,200);
 assert.deepEqual((await snapshots(req('snapshot-profiles'),context)).jsonBody.snapshot.history,data.history);
});

test('Explicit archive restore preserves multiple same-date records; ordinary saves still reject duplicates',async()=>{
 const user='restore-multiple',a='history:restore-a',b='history:restore-b';
 const record={date:'2026-11-09',day:0,exercises:{},notes:'first'};
 assert.equal((await handle(req(user,'PUT',a,{record,expectedEtag:null}),context)).status,200);
 assert.equal((await handle(req(user,'PUT',b,{record:{...record,notes:'second'},expectedEtag:null}),context)).status,409);
 const restored=await handle(req(user,'PUT',b,{record:{...record,notes:'second'},expectedEtag:null,preserveRecords:true}),context);
 assert.equal(restored.status,200);
 const stored=(await handle(req(user),context)).jsonBody.workouts;
 assert.equal(stored.length,2);assert.deepEqual(stored.map(x=>x.record.notes),['first','second']);
 assert.equal((await handle(req(user,'PUT',b,{record,expectedEtag:null,preserveRecords:true}),context)).status,409);
 assert.equal((await handle(req(user,'PUT',b,{record,expectedEtag:'stale',preserveRecords:true}),context)).status,409);
 assert.equal((await handle(req(null,'PUT',b,{record,expectedEtag:null,preserveRecords:true}),context)).status,401);
 assert.equal((await handle(scoped(req(user),profileA),context)).jsonBody.workouts.length,0);
});
