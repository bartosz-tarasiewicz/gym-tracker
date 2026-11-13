const {test} = require('node:test');
const assert = require('node:assert/strict');
process.env.GYM_STORAGE_CONNECTION_STRING='UseDevelopmentStorage=true';

const {TableClient}=require('@azure/data-tables');
const data=new Map();
const fake={
  async createTable(){},
  async getEntity(partitionKey,rowKey) {
    const key=partitionKey+'/'+rowKey;
    if(!data.has(key))throw Object.assign(new Error('not found'),{statusCode:404});
    return {...data.get(key)};
  },
  async createEntity(entity) {
    const key=entity.partitionKey+'/'+entity.rowKey;
    if(data.has(key))throw Object.assign(new Error('duplicate'),{statusCode:409});
    data.set(key,{...entity,etag:'"1"'});return {};
  },
  async updateEntity(entity,mode,options) {
    const key=entity.partitionKey+'/'+entity.rowKey;
    if(!data.has(key))throw Object.assign(new Error('not found'),{statusCode:404});
    const old=data.get(key);
    if(options?.etag!==old.etag||options?.matchConditions!=='IfNotModified')
      throw Object.assign(new Error('stale'),{statusCode:412});
    data.set(key,{...entity,etag:'"'+(Number(old.etag.replaceAll('"',''))+1)+'"'});
    return {};
  }
};
TableClient.fromConnectionString=()=>fake;
const {handler,encode,decode,principalFrom,partitionFor}=require('../src/functions/snapshot.js');
const identity=(userId)=>({userId,identityProvider:'github',userDetails:userId,userRoles:['authenticated']});
const request=(user,method='GET',body)=>{
 const h=user?Buffer.from(JSON.stringify(identity(user))).toString('base64'):null;
 return {method,headers:{get:k=>k==='x-ms-client-principal'?h:null},json:async()=>body};
};
const context={error:(...x)=>{throw new Error('Unexpected server error: '+x.join(' '))}};
test('Authorization: unauthenticated requests always blocked', async()=>{
 assert.equal((await handler(request(null),context)).status,401);
 assert.equal(principalFrom(request(null)),null);
});
test('Encoding is compressed and lossless; rejects malformed data',()=>{
 const source={version:2,history:[{date:'2026-11-12',notes:'testąęść'}],sessions:{}};
 const row=encode(source);
 assert.deepEqual(decode(row),source);
 assert.equal(row.format,'gzip-base64-v1');
 assert.throws(()=>encode({history:[],sessions:[]}),/invalid/);
});
test('Snapshot lifecycle, ETag compare-and-swap and user isolation',async()=>{
 const a={version:2,history:[],sessions:{'2026-11-12-2':{notes:'42.5 kg'}}};
 const initial=await handler(request('bart'),context);
 assert.equal(initial.status,200);assert.equal(initial.jsonBody.snapshot,null);
 const created=await handler(request('bart','PUT',{snapshot:a,expectedEtag:null}),context);
 assert.equal(created.status,200);assert.equal(created.jsonBody.etag,'"1"');
 const current=await handler(request('bart'),context);
 assert.deepEqual(current.jsonBody.snapshot,a);
 const b={...a,history:[{notes:'nowe'}]};
 const updated=await handler(request('bart','PUT',{snapshot:b,expectedEtag:current.jsonBody.etag}),context);
 assert.equal(updated.status,200);assert.equal(updated.jsonBody.etag,'"2"');
 const stale=await handler(request('bart','PUT',{snapshot:a,expectedEtag:current.jsonBody.etag}),context);
 assert.equal(stale.status,409);
 assert.deepEqual((await handler(request('bart'),context)).jsonBody.snapshot,b);
 assert.equal((await handler(request('other'),context)).jsonBody.snapshot,null);
 const staleCreate=await handler(request('bart','PUT',{snapshot:a,expectedEtag:null}),context);
 assert.equal(staleCreate.status,409);
});
test('Validation and partition key isolates provider/user',async()=>{
 assert.equal((await handler(request('bart','PUT',{snapshot:{history:[],sessions:[]},expectedEtag:null}),context)).status,400);
 assert.equal((await handler(request('bart','PUT',{snapshot:{history:[],sessions:{} }},context)).status,400);
 assert.notEqual(partitionFor(identity('a')),partitionFor(identity('b')));
 assert.equal((await handler(request('bart','PUT',{snapshot:{history:new Array(6000).fill({}),sessions:{}},expectedEtag:null}),context)).status,413);
});
