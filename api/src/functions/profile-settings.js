'use strict';
const {app}=require('@azure/functions');
const {TableClient}=require('@azure/data-tables');
const {identity}=require('./workouts');
const {profileFrom,profilePartition}=require('../profile-scope');
const reply=(status,jsonBody)=>({status,jsonBody,headers:{'cache-control':'no-store'}});
async function handle(request,context){
 const p=identity(request);if(!p)return reply(401,{error:'authentication_required'});
 const id=profileFrom(request);if(!id)return reply(400,{error:'invalid_profile'});
 if(!process.env.GYM_STORAGE_CONNECTION_STRING)return reply(503,{error:'storage_not_configured'});
 try{
  const t=TableClient.fromConnectionString(process.env.GYM_STORAGE_CONNECTION_STRING,'GymTrackerData');
  await t.createTable().catch(e=>{if(e.statusCode!==409&&e.code!=='TableAlreadyExists')throw e;});
  const partitionKey=profilePartition(p,id),rowKey='profile-settings-v1';
  if(request.method==='GET'){
   try{const row=await t.getEntity(partitionKey,rowKey);return reply(200,{settings:JSON.parse(row.settings),etag:row.etag});}
   catch(e){if(e.statusCode===404)return reply(200,{settings:null,etag:null});throw e;}
  }
  let body;try{body=await request.json()}catch{return reply(400,{error:'invalid_json'});}
  if(!body?.settings||typeof body.settings!=='object'||Array.isArray(body.settings)||
    !Object.hasOwn(body,'expectedEtag')||(body.expectedEtag!==null&&(typeof body.expectedEtag!=='string'||body.expectedEtag.length>255)))return reply(400,{error:'invalid_settings'});
  const settings=JSON.stringify(body.settings);if(Buffer.byteLength(settings)>20000)return reply(413,{error:'settings_too_large'});
  try{
   const row={partitionKey,rowKey,settings};
   if(body.expectedEtag===null)await t.createEntity(row);
   else await t.updateEntity(row,'Replace',{etag:body.expectedEtag,matchConditions:'IfNotModified'});
   const stored=await t.getEntity(partitionKey,rowKey);return reply(200,{etag:stored.etag});
  }catch(e){if([404,409,412].includes(e.statusCode))return reply(409,{error:'settings_changed'});throw e;}
 }catch(e){context.error('Profile settings unavailable',e?.code||e?.statusCode);return reply(503,{error:'storage_unavailable'});}
}
app.http('profile-settings',{methods:['GET','PUT'],route:'profile-settings',authLevel:'anonymous',handler:handle});
module.exports={handle};
