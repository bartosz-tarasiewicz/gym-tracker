import assert from 'node:assert/strict';
const url='https://salmon-bush-06df5a710.8.azurestaticapps.net/api/snapshot';
const r=await fetch(url,{redirect:'manual',headers:{accept:'application/json'}});
console.log('Unauthenticated cloud API status:',r.status);
assert.ok([302,401,403].includes(r.status),'API should deny unauthenticated requests, got HTTP '+r.status);
console.log('PASS: API cannot be accessed without signing in');

const health=await fetch('https://salmon-bush-06df5a710.8.azurestaticapps.net/api/health',{redirect:'manual',headers:{accept:'application/json'}});
const healthBody=await health.text();
console.log('Live Azure Table Storage probe:',health.status,healthBody.slice(0,160));
assert.equal(health.status,200,'Azure Table Storage is not available (HTTP '+health.status+')');
const state=JSON.parse(healthBody);
assert.deepEqual(state,{status:'ok'},'Health endpoint should not expose secrets');
console.log('PASS: Live Azure Functions connects to Table Storage');

const v4Base='https://salmon-bush-06df5a710.8.azurestaticapps.net';
const protectedV4=await fetch(v4Base+'/api/workouts',{redirect:'manual',headers:{accept:'application/json'}});
assert.ok([302,401,403].includes(protectedV4.status),'New workout collection must reject anonymous reads');
console.log('PASS: Per-workout Azure API rejects anonymous reads, HTTP',protectedV4.status);
const v4Health=await fetch(v4Base+'/api/workouts-health',{cache:'no-store',headers:{accept:'application/json'}});
const v4Data=await v4Health.json();
assert.equal(v4Health.status,200,'Workout API v0.4 health failed HTTP '+v4Health.status);
assert.deepEqual(v4Data,{status:'ok',runtime:'workouts-v04'});
console.log('PASS: Live v0.4 Azure Functions runtime and Table Storage connection');
