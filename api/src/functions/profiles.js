'use strict';
const {app}=require('@azure/functions');
const {TableClient}=require('@azure/data-tables');
const {identity,partition}=require('./workouts');
const {validProfile}=require('../profile-scope');
const reply=(status,jsonBody)=>({status,jsonBody,headers:{'cache-control':'no-store'}});
async function handle(request,context){
 const p=identity(request);if(!p)return reply(401,{error:'authentication_required'});
 if(!process.env.GYM_STORAGE_CONNECTION_STRING)return reply(503,{error:'storage_not_configured'});
 try{
  const t=TableClient.fromConnectionString(process.env.GYM_STORAGE_CONNECTION_STRING,'GymTrackerData');
  await t.createTable().catch(e=>{if(e.statusCode!==409&&e.code!=='TableAlreadyExists')throw e;});
  const part=partition(p);
  if(request.method==='GET'){
   const profiles=[{id:'default',name:'Profil domyślny'}];
   for await(const row of t.listEntities({queryOptions:{filter:"PartitionKey eq '"+part+"'"}})){
    if(row.rowKey?.startsWith('profile-')&&validProfile(row.profileId))profiles.push({id:row.profileId,name:row.name});
   }
   return reply(200,{profiles});
  }
  let body;try{body=await request.json()}catch{return reply(400,{error:'invalid_json'});}
  if(!validProfile(body?.id)||body.id==='default'||typeof body.name!=='string'||!body.name.trim()||body.name.trim().length>60)return reply(400,{error:'invalid_profile'});
  const entity={partitionKey:part,rowKey:'profile-'+body.id,profileId:body.id,name:body.name.trim()};
  try{await t.createEntity(entity)}catch(e){if(e.statusCode!==409)throw e;
   const existing=await t.getEntity(part,entity.rowKey);
   if(existing.name!==entity.name)return reply(409,{error:'profile_exists'});
  }
  return reply(200,{profile:{id:entity.profileId,name:entity.name}});
 }catch(e){context.error('Profiles storage unavailable',e?.code||e?.statusCode);return reply(503,{error:'storage_unavailable'});}
}
app.http('profiles',{methods:['GET','POST'],route:'profiles',authLevel:'anonymous',handler:handle});
module.exports={handle};
