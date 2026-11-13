'use strict';
const { app } = require('@azure/functions');
const { TableClient } = require('@azure/data-tables');
const { createHash } = require('node:crypto');
const { gzipSync, gunzipSync } = require('node:zlib');
const TABLE = 'GymTrackerData';
const ROW = 'snapshot';
const CHUNK = 28000;
const MAX_COMPRESSED = 560000;
let initPromise;
let client;

function result(status, value) {
  return {status, jsonBody:value, headers:{'cache-control':'no-store','x-content-type-options':'nosniff'}};
}
function principalFrom(request) {
  const header=request.headers.get('x-ms-client-principal');
  if(!header) return null;
  try {
    const p=JSON.parse(Buffer.from(header,'base64').toString('utf8'));
    if(!p.userId || !p.identityProvider || !Array.isArray(p.userRoles) || !p.userRoles.includes('authenticated')) return null;
    if(String(p.userId).length>512 || String(p.identityProvider).length>100) return null;
    return p;
  }catch{return null;}
}
async function table() {
  const connection=process.env.GYM_STORAGE_CONNECTION_STRING;
  if(!connection) return null;
  if(!client)client=TableClient.fromConnectionString(connection,TABLE);
  if(!initPromise)initPromise=client.createTable().catch(e=>{
    if(e.statusCode!==409 && e.code!=='TableAlreadyExists') {initPromise=null;throw e;}
  });
  await initPromise;
  return client;
}
const partitionFor=p=>createHash('sha256').update(String(p.identityProvider)+':'+String(p.userId)).digest('hex');
function encode(data){
  if(!data || typeof data!=='object' || Array.isArray(data) || !Array.isArray(data.history) ||
     !data.sessions || typeof data.sessions!=='object' || Array.isArray(data.sessions))throw Object.assign(new Error('invalid snapshot'),{statusCode:400});
  if(data.history.length>5000 || Object.keys(data.sessions).length>1500)throw Object.assign(new Error('too many records'),{statusCode:413});
  const plain=Buffer.from(JSON.stringify({version:2,history:data.history,sessions:data.sessions}),'utf8');
  if(plain.length>3_000_000)throw Object.assign(new Error('snapshot too large'),{statusCode:413});
  const packed=gzipSync(plain,{level:6}).toString('base64');
  if(packed.length>MAX_COMPRESSED)throw Object.assign(new Error('compressed snapshot too large'),{statusCode:413});
  const chunks=packed.match(new RegExp('.{1,'+CHUNK+'}','g'))||[];
  const fields={format:'gzip-base64-v1',count:chunks.length,updatedAt:new Date().toISOString()};
  chunks.forEach((x,i)=>fields['part'+String(i).padStart(2,'0')]=x);
  return fields;
}
function decode(entity){
  if(entity.format!=='gzip-base64-v1'||!(entity.count>=1&&entity.count<=25))throw Error('invalid stored format');
  const parts=[];
  for(let i=0;i<entity.count;i++){const chunk=entity['part'+String(i).padStart(2,'0')];if(typeof chunk!=='string')throw Error('missing chunk');parts.push(chunk);}
  return JSON.parse(gunzipSync(Buffer.from(parts.join(''),'base64'),{maxOutputLength:3_000_000}).toString('utf8'));
}
async function handler(request,context){
  const p=principalFrom(request);
  if(!p)return result(401,{error:'authentication_required'});
  let t;
  try{t=await table();}catch(e){context.error('Storage initialization failed',e);return result(503,{error:'storage_unavailable'});}
  if(!t)return result(503,{error:'storage_not_configured'});
  const partitionKey=partitionFor(p);
  if(request.method==='GET'){
    try{
      const row=await t.getEntity(partitionKey,ROW);
      return result(200,{snapshot:decode(row),etag:row.etag||null,updatedAt:row.updatedAt||null});
    }catch(e){
      if(e.statusCode===404)return result(200,{snapshot:null,etag:null});
      context.error('Snapshot fetch failed',e);
      return result(503,{error:'storage_read_failed'});
    }
  }
  if(request.method==='PUT'){
    let body;
    try{body=await request.json();}catch{return result(400,{error:'invalid_json'});}
    if(!body||!Object.prototype.hasOwnProperty.call(body,'expectedEtag') ||
       (body.expectedEtag!==null&&(typeof body.expectedEtag!=='string'||body.expectedEtag.length>255)))
      return result(400,{error:'expected_etag_required'});
    let entity;
    try{entity={partitionKey,rowKey:ROW,...encode(body.snapshot)}}catch(e){
      return result(e.statusCode||400,{error:e.statusCode===413?'snapshot_too_large':'invalid_snapshot'});
    }
    try {
      if(body.expectedEtag===null)await t.createEntity(entity);
      else await t.updateEntity(entity,'Replace',{etag:body.expectedEtag,matchConditions:'IfNotModified'});
      const stored=await t.getEntity(partitionKey,ROW);
      return result(200,{ok:true,etag:stored.etag||null,updatedAt:stored.updatedAt});
    }catch(e){
      if([409,412].includes(e.statusCode))return result(409,{error:'cloud_conflict'});
      context.error('Snapshot write failed',e);
      return result(503,{error:'storage_write_failed'});
    }
  }
  return result(405,{error:'method_not_allowed'});
}
app.http('snapshot',{methods:['GET','PUT'],authLevel:'anonymous',route:'snapshot',handler});
/* Public liveness probe. Returns only status, never secrets or user data. */
async function healthHandler(request,context) {
  try {
    const t=await table();
    if(!t)return result(503,{status:'unavailable'});
    // A missing row is expected; this verifies both table creation and read access.
    try {await t.getEntity('health-check','no-record');}
    catch(e){if(e.statusCode!==404)throw e;}
    return result(200,{status:'ok'});
  }catch(e){
    context.error('Table Storage health check failed',e?.code||e?.statusCode||e?.name||'error');
    return result(503,{status:'unavailable'});
  }
}
app.http('health',{methods:['GET'],authLevel:'anonymous',route:'health',handler:healthHandler});

module.exports={handler,healthHandler,encode,decode,principalFrom,partitionFor};
