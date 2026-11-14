'use strict';
/* V0.4: cloud is authoritative. One Azure Table entity per workout.
 * Legacy snapshot is migrated once and retained as a rollback copy.
 */
const {app}=require('@azure/functions');
const {TableClient}=require('@azure/data-tables');
const {createHash}=require('node:crypto');
const {gzipSync,gunzipSync}=require('node:zlib');
const TABLE='GymTrackerData', MARKER='meta-cloud-v04', PREFIX='workout-';
let client,prepared;
const reply=(status,body)=>({status,jsonBody:body,headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}});
function identity(request){
 const raw=request.headers.get('x-ms-client-principal');
 if(!raw)return null;
 try {
  const p=JSON.parse(Buffer.from(raw,'base64').toString('utf8'));
  if(!p.userId||!p.identityProvider||!p.userRoles?.includes('authenticated'))return null;
  if(p.userId.length>512||p.identityProvider.length>100)return null;
  return p;
 } catch{return null;}
}
const partition=p=>createHash('sha256').update(p.identityProvider+':'+p.userId).digest('hex');
const hash=x=>createHash('sha256').update(x).digest('hex');
const rowKey=id=>PREFIX+hash(id);
const identifier=id=>typeof id==='string'&&id.length>=5&&id.length<=200&&/^(draft|history):[a-zA-Z0-9:_-]+$/.test(id);
async function storage(){
 const cs=process.env.GYM_STORAGE_CONNECTION_STRING;
 if(!cs)return null;
 if(!client)client=TableClient.fromConnectionString(cs,TABLE);
 if(!prepared)prepared=client.createTable().catch(e=>{
  if(e.statusCode!==409 && e.code!=='TableAlreadyExists'){prepared=null;throw e;}
 });
 await prepared;
 return client;
}
function compressed(data){
 if(!data||typeof data!=='object'||Array.isArray(data))throw Object.assign(Error('invalid record'),{statusCode:400});
 const text=JSON.stringify(data);
 if(Buffer.byteLength(text)>400_000)throw Object.assign(Error('record too large'),{statusCode:413});
 const packed=gzipSync(Buffer.from(text,'utf8'),{level:6}).toString('base64');
 if(packed.length>60_000)throw Object.assign(Error('compressed record too large'),{statusCode:413});
 return packed;
}
function decompressed(packed){
 if(typeof packed!=='string'||packed.length>60_000)throw Error('bad stored row');
 return JSON.parse(gunzipSync(Buffer.from(packed,'base64'),{maxOutputLength:400_000}).toString('utf8'));
}
function legacySnapshot(row){
 if(row.format!=='gzip-base64-v1'||!(row.count>0&&row.count<=25))throw Error('unknown legacy format');
 let encoded='';
 for(let i=0;i<row.count;i++){
  const part=row['part'+String(i).padStart(2,'0')];
  if(typeof part!=='string')throw Error('legacy data missing part');
  encoded+=part;
 }
 return JSON.parse(gunzipSync(Buffer.from(encoded,'base64'),{maxOutputLength:3_000_000}).toString('utf8'));
}
const legacyId=(kind,index,data)=>kind+':legacy-'+index+'-'+hash(JSON.stringify(data)).slice(0,12);
async function migrateLegacy(t,part){
 try{await t.getEntity(part,MARKER);return;}catch(e){if(e.statusCode!==404)throw e;}
 let old;
 try{old=legacySnapshot(await t.getEntity(part,'snapshot'));}
 catch(e){if(e.statusCode!==404)throw e;}
 if(old){
  if(!Array.isArray(old.history)||!old.sessions||typeof old.sessions!=='object')throw Error('malformed legacy backup');
  const entries=[];
  for(const [key,value] of Object.entries(old.sessions)){
   const id='draft:'+key;
   if(identifier(id))entries.push({id,kind:'draft',data:value});
   else throw Error('invalid legacy session id');
  }
  for(let i=0;i<old.history.length;i++){
   const data=old.history[i],id=legacyId('history',i,data);
   entries.push({id,kind:'history',data});
  }
  for(const entry of entries){
   const entity={partitionKey:part,rowKey:rowKey(entry.id),
    entryId:entry.id,kind:entry.kind,packed:compressed(entry.data),updatedAt:new Date().toISOString()};
   try{await t.createEntity(entity)}
   catch(e){if(e.statusCode!==409)throw e;}
  }
 }
 try{await t.createEntity({partitionKey:part,rowKey:MARKER,completedAt:new Date().toISOString(),format:'per-workout-v1'})}
 catch(e){if(e.statusCode!==409)throw e;}
 // Intentionally keep rowKey='snapshot' as a read-only rollback backup.
}
async function list(t,part){
 const results=[];
 const opts={queryOptions:{filter:"PartitionKey eq '"+part+"'"}};
 for await(const entity of t.listEntities(opts)){
  if(typeof entity.rowKey!=='string'||!entity.rowKey.startsWith(PREFIX))continue;
  const {entryId,kind,packed,etag,updatedAt}=entity;
  if(!identifier(entryId)||!['draft','history'].includes(kind))throw Error('invalid entry');
  results.push({id:entryId,kind,record:decompressed(packed),etag:etag||null,updatedAt:updatedAt||null});
  if(results.length>2000)throw Error('too many workouts');
 }
 results.sort((a,b)=>a.id.localeCompare(b.id));
 return results;
}
async function handle(request,context){
 const p=identity(request);
 if(!p)return reply(401,{error:'authentication_required'});
 let t;
 try{t=await storage();if(!t)return reply(503,{error:'storage_not_configured'});}
 catch(e){context.error('Workouts storage unavailable',e?.code||e?.statusCode);return reply(503,{error:'storage_unavailable'});}
 const part=partition(p);
 try{
  if(request.method==='GET'){
   await migrateLegacy(t,part);
   return reply(200,{version:1,workouts:await list(t,part)});
  }
  const id=request.params?.id;
  if(!identifier(id))return reply(400,{error:'invalid_id'});
  const kind=id.split(':',1)[0],key=rowKey(id);
  let body;
  try{body=await request.json()}catch{return reply(400,{error:'invalid_json'});}
  if(!body||!Object.prototype.hasOwnProperty.call(body,'expectedEtag')||
      (body.expectedEtag!==null&&(typeof body.expectedEtag!=='string'||body.expectedEtag.length>255)))
    return reply(400,{error:'expected_etag_required'});
  if(request.method==='PUT'){
   if(!body.record||typeof body.record!=='object'||Array.isArray(body.record))return reply(400,{error:'invalid_record'});
   let packed;try{packed=compressed(body.record)}
   catch(e){return reply(e.statusCode===413?413:400,{error:e.statusCode===413?'record_too_large':'invalid_record'});}
   const entity={partitionKey:part,rowKey:key,entryId:id,kind,packed,updatedAt:new Date().toISOString()};
   try{
    if(body.expectedEtag===null){
     // Prevent a second ID being created for a date already present in Azure.
     // Normal updates target the pre-existing record's ID and ETag.
     const workouts=await list(t,part);
     if(workouts.some(x=>x.id!==id&&x.record?.date===body.record.date))
      return reply(409,{error:'workout_date_exists'});
     await t.createEntity(entity);
    }else await t.updateEntity(entity,'Replace',{etag:body.expectedEtag,matchConditions:'IfNotModified'});
    const saved=await t.getEntity(part,key);
    return reply(200,{ok:true,id,etag:saved.etag||null});
   }catch(e){
    if([404,409,412].includes(e.statusCode))return reply(409,{error:'workout_changed'});
    throw e;
   }
  }
  if(request.method==='DELETE'){
   try{
    if(body.expectedEtag===null)return reply(409,{error:'workout_changed'});
    await t.deleteEntity(part,key,{etag:body.expectedEtag,matchConditions:'IfNotModified'});
    return reply(200,{ok:true,id,deleted:true});
   }catch(e){
    if([404,409,412].includes(e.statusCode))return reply(409,{error:'workout_changed'});
    throw e;
   }
  }
  return reply(405,{error:'method_not_allowed'});
 }catch(e){
  context.error('Workout API operation failed',e?.code||e?.statusCode||e?.name||'error');
  return reply(503,{error:'workout_storage_failed'});
 }
}
/* Versioned read-only health probe for post-deployment runtime verification.
 * It never exposes user IDs, storage keys, workout data or connection strings. */
async function healthHandler(request,context){
 try{
  const t=await storage();if(!t)return reply(503,{status:'unavailable'});
  try{await t.getEntity('healthcheck','nonexistent-v04')}
  catch(e){if(e.statusCode!==404)throw e;}
  return reply(200,{status:'ok',runtime:'workouts-v04'});
 }catch(e){
  context.error('Workout API health failed',e?.code||e?.statusCode||e?.name||'error');
  return reply(503,{status:'unavailable'});
 }
}
app.http('workouts-health',{methods:['GET'],route:'workouts-health',authLevel:'anonymous',handler:healthHandler});
app.http('workouts-list',{methods:['GET'],route:'workouts',authLevel:'anonymous',handler:handle});
app.http('workouts-item',{methods:['PUT','DELETE'],route:'workouts/{id}',authLevel:'anonymous',handler:handle});
module.exports={handle,healthHandler,compressed,decompressed,identity,partition,rowKey,legacyId,migrateLegacy,list,identifier};
