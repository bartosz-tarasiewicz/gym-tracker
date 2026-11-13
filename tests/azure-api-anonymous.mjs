import assert from 'node:assert/strict';
const url='https://salmon-bush-06df5a710.8.azurestaticapps.net/api/snapshot';
const r=await fetch(url,{redirect:'manual',headers:{accept:'application/json'}});
console.log('Unauthenticated cloud API status:',r.status);
assert.ok([302,401,403].includes(r.status),'API should deny unauthenticated requests, got HTTP '+r.status);
console.log('PASS: API cannot be accessed without signing in');
