import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
export async function startServer(){
const files={'/':'index.html','/index.html':'index.html','/storage.js':'storage.js','/sync.js':'sync.js',
 '/week-ui.js':'week-ui.js','/progress-ui.js':'progress-ui.js','/app.js':'app.js','/sw.js':'sw.js',
 '/manifest.webmanifest':'manifest.webmanifest','/icon.svg':'icon.svg','/icon-apple.png':'icon-apple.png'};
const store=new Map(),profileStores=new Map(),profileRegistry=[{id:'default',name:'Profil domyślny'}],profileSettings=new Map(),operations=[];let etagCounter=10;
const json=(res,status,data)=>{res.writeHead(status,{'content-type':'application/json','cache-control':'no-store'});res.end(JSON.stringify(data))};
const network={disconnected:false};
const server=http.createServer(async(req,res)=>{
 if(network.disconnected){req.socket.destroy();return;}
 const url=new URL(req.url,'http://localhost');
 const profile=url.searchParams.get('profile')||'default';
 if(!profileStores.has(profile))profileStores.set(profile,profile==='default'?store:new Map());
 const activeStore=profileStores.get(profile);
 if(url.pathname==='/api/profiles'){
  if(req.method==='POST'){let raw='';for await(const chunk of req)raw+=chunk;const p=JSON.parse(raw);if(!profileRegistry.some(x=>x.id===p.id))profileRegistry.push(p);return json(res,200,{profile:p});}
  return json(res,200,{profiles:profileRegistry});
 }
 if(url.pathname==='/api/profile-settings'){
  if(req.method==='PUT'){let raw='';for await(const chunk of req)raw+=chunk;const body=JSON.parse(raw);const old=profileSettings.get(profile);if((old?.etag||null)!==body.expectedEtag)return json(res,409,{});profileSettings.set(profile,{settings:body.settings,etag:'"'+(++etagCounter)+'"'});}
  return json(res,200,profileSettings.get(profile)||{settings:null,etag:null});
 }
 if(url.pathname==='/.auth/me')return json(res,200,{clientPrincipal:{
  identityProvider:'github',userId:'test-owner',userDetails:'Test User',userRoles:['authenticated']}});
 if(url.pathname==='/api/workouts'&&req.method==='GET'){
  return json(res,200,{version:1,workouts:[...activeStore].map(([id,value])=>({id,...value}))});
 }
 if(url.pathname.startsWith('/api/workouts/')&&url.pathname.endsWith('/versions')&&req.method==='GET'){const id=decodeURIComponent(url.pathname.slice('/api/workouts/'.length,-'/versions'.length)),old=activeStore.get(id);return old?json(res,200,{id,etag:old.etag,versions:old.versions||[]}):json(res,404,{});}
 if(url.pathname.startsWith('/api/workouts/')&&['PUT','DELETE'].includes(req.method)){
  const id=decodeURIComponent(url.pathname.slice('/api/workouts/'.length));
  let raw='';for await(const chunk of req)raw+=chunk;
  const body=JSON.parse(raw),old=activeStore.get(id);
  if((old?.etag||null)!==body.expectedEtag)return json(res,409,{error:'workout_changed'});
  if(req.method==='DELETE'){
   activeStore.delete(id);operations.push({id,method:'DELETE'});return json(res,200,{ok:true,deleted:true});
  }
  if(!old&&body.preserveRecords!==true&&[...activeStore].some(([key,value])=>key!==id&&value.record?.date===body.record?.date))
   return json(res,409,{error:'workout_date_exists'});
  const etag='"'+(++etagCounter)+'"';
  activeStore.set(id,{kind:id.split(':')[0],record:structuredClone(body.record),etag,versions:old?[{id:'v'+etagCounter,savedAt:new Date().toISOString(),record:structuredClone(old.record)},...(old.versions||[])].slice(0,10):[]});
  operations.push({id,method:'PUT'});
  return json(res,200,{ok:true,id,etag});
 }
 const file=files[url.pathname]||(['/rest-alert.js','/workout-conflicts.js','/profiles.js','/photos.js','/exercise-guides.js','/plans.js','/plan-editor.js','/results.js'].includes(url.pathname)?url.pathname.slice(1):url.pathname.startsWith('/assets/')&&!url.pathname.includes('..')?url.pathname.slice(1):null);if(!file){res.writeHead(404);return res.end('Not Found')}
 res.writeHead(200,{'content-type':({'.html':'text/html','.js':'application/javascript','.svg':'image/svg+xml',
  '.wav':'audio/wav','.jpg':'image/jpeg','.webp':'image/webp','.png':'image/png','.webmanifest':'application/manifest+json'})[path.extname(file)]||'text/plain'});
 res.end(fs.readFileSync(file));
});
await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
const base='http://127.0.0.1:'+server.address().port;
return {network,base,server,store,profileStores,profileRegistry,profileSettings,operations};
}
