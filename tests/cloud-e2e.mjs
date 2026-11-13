import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import { chromium } from 'playwright';

const files={'/':'index.html','/index.html':'index.html','/storage.js':'storage.js','/sync.js':'sync.js','/app.js':'app.js','/sw.js':'sw.js','/manifest.webmanifest':'manifest.webmanifest','/icon.svg':'icon.svg','/icon-apple.png':'icon-apple.png'};
let remote=null,revision=0;
const responded=(res,code,obj)=>{res.writeHead(code,{'Content-Type':'application/json','Cache-Control':'no-store'});res.end(JSON.stringify(obj))};
const server=http.createServer(async(req,res)=>{
  const url=new URL(req.url,'http://localhost');
  if(url.pathname==='/.auth/me')return responded(res,200,{clientPrincipal:{identityProvider:'github',userId:'test-user-1',userDetails:'QE Test',userRoles:['authenticated']}});
  if(url.pathname==='/api/snapshot'){
    if(req.method==='GET')return responded(res,200,{snapshot:remote,etag:revision?'"'+revision+'"':null});
    if(req.method==='PUT'){
      let raw='';for await(const p of req)raw+=p;
      const payload=JSON.parse(raw);
      if(payload.expectedEtag!==(revision?'"'+revision+'"':null))return responded(res,409,{error:'cloud_conflict'});
      revision++;remote=structuredClone(payload.snapshot);
      return responded(res,200,{ok:true,etag:'"'+revision+'"'});
    }
  }
  const file=files[url.pathname];if(!file){res.writeHead(404);return res.end('Not Found');}
  const ext=path.extname(file);
  res.writeHead(200,{'Content-Type':({'.html':'text/html','.js':'application/javascript','.svg':'image/svg+xml','.png':'image/png','.webmanifest':'application/manifest+json'})[ext]||'text/plain'});
  res.end(fs.readFileSync(file));
});
await new Promise(res=>server.listen(0,'127.0.0.1',res));
const url='http://127.0.0.1:'+server.address().port;
const browser=await chromium.launch({headless:true});
const context=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
const page=await context.newPage();
const errors=[];page.on('pageerror',e=>errors.push(e.message));
const input=pg=>pg.locator('.set-row input[data-type="work"][data-field="kg"]').first();
async function waitForRemote(kg){
  for(let k=0;k<70;k++){
    if(remote && JSON.stringify(remote).includes('"kg":"'+kg+'"'))return;
    await new Promise(r=>setTimeout(r,100));
  }
  throw Error('Remote update not observed: '+kg+' remote='+JSON.stringify(remote).slice(0,500));
}
const pass=x=>console.log('PASS:',x);
try{
  await page.goto(url,{waitUntil:'domcontentloaded'});
  await page.locator('[data-day="2"]').click();
  await page.locator('[data-item="1"]').click();
  await input(page).fill('42.5');
  await page.locator('.set-row input[data-type="work"][data-field="reps"]').first().fill('13');
  await page.locator('.done-button[data-type="work"]').first().click();
  await waitForRemote('42.5');
  pass('First device authenticated and automatically uploads edited workout');
  const initialRevision=revision;
  assert.ok(initialRevision>0);
  const second=await browser.newContext({viewport:{width:390,height:844},acceptDownloads:true});
  await second.addInitScript(()=>{
    // Reproduce browser UI navigation from before login: savedAt and pristine
    // workout templates exist locally but no actual training was recorded.
    if(!localStorage.getItem('zenek-gym-v1')){
      const date='2026-11-01';
      const blank={
        version:2,savedAt:Date.now(),history:[],sessions:{
          [date+'-0']:{
            date,day:0,started:new Date().toISOString(),coreEnabled:{},notes:'',
            exercises:{
              flat:{
                machine:'MG-PL13',rir:'',
                sets:[{kg:'70',reps:'11',done:false},{kg:'65',reps:'11',done:false},
                      {kg:'65',reps:'10',done:false},{kg:'60',reps:'10',done:false}],
                warmups:[{kg:'30',reps:'8',done:false},{kg:'45',reps:'5',done:false},{kg:'55',reps:'3',done:false}],
                variants:{}
              }
            }
          }
        }
      };
      localStorage.setItem('zenek-gym-v1',JSON.stringify(blank));
    }
  });
  const p2=await second.newPage();p2.on('pageerror',e=>errors.push(e.message));
  await p2.goto(url,{waitUntil:'domcontentloaded'});
  await p2.locator('[data-day="2"]').click();
  await p2.locator('[data-item="1"]').click();
  await p2.waitForFunction(()=>document.querySelector('.set-row input[data-type="work"][data-field="kg"]')?.value==='42.5');
  assert.equal(await input(p2).inputValue(),'42.5');
  pass('Second device restores cloud data despite navigation-only local templates');
  await input(page).fill('47.5');
  await waitForRemote('47.5');
  pass('First device publishes a newer version');
  await input(p2).fill('50');
  await p2.locator('[data-view="settings"]').click();
  await p2.waitForFunction(()=>document.querySelector('#cloud-info')?.textContent?.includes('Konflikt'));
  assert.equal(await input(page).inputValue(),'47.5');
  assert.ok(JSON.stringify(remote).includes('"kg":"47.5"'));
  pass('Concurrent stale edit is protected by conflict, not overwritten');
  const info=await p2.locator('#cloud-info').textContent();
  assert.match(info,/Konflikt/);
  assert.match(await p2.locator('#app').innerText(),/Na tym urządzeniu/);
  assert.match(await p2.locator('#app').innerText(),/W Azure/);
  assert.equal(await p2.locator('#cloud-download').isDisabled(),true);
  assert.equal(await p2.locator('#cloud-upload').isDisabled(),true);
  pass('Conflict shows side-by-side journal summaries and disables destructive choices');
  const pairDownload=p2.waitForEvent('download',{timeout:8000});
  await p2.locator('#cloud-backup-both').click();
  const pairFile=await pairDownload;
  const pairBackup=JSON.parse(fs.readFileSync(await pairFile.path(),'utf8'));
  assert.equal(pairBackup.kind,'gym-tracker-compare-backup');
  assert.ok(JSON.stringify(pairBackup.local).includes('"kg":"50"'));
  assert.ok(JSON.stringify(pairBackup.cloud).includes('"kg":"47.5"'));
  assert.equal(await p2.locator('#cloud-download').isEnabled(),true);
  pass('Both local and cloud versions export in one JSON before overwriting');
  p2.once('dialog',dialog=>dialog.accept());
  const dl=p2.waitForEvent('download',{timeout:8000});
  await p2.locator('#cloud-download').click();
  const file=await dl;
  const backup=JSON.parse(fs.readFileSync(await file.path(),'utf8'));
  assert.ok(JSON.stringify(backup).includes('"kg":"50"'));
  await p2.locator('[data-view="train"]').click();
  assert.equal(await input(p2).inputValue(),'47.5');
  pass('Conflict resolution first exports local backup and then downloads cloud version');
  assert.deepEqual(errors,[]);
  pass('No uncaught page JavaScript errors on either device');
  console.log('SUCCESS: 6 browser sync checks passed');
} finally{
  await browser.close();await new Promise(res=>server.close(res));
}
