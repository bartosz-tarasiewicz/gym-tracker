'use strict';
const {createHash}=require('node:crypto');
const ownerPartition=p=>createHash('sha256').update(p.identityProvider+':'+p.userId).digest('hex');
const validProfile=id=>typeof id==='string'&&/^(default|p-[a-f0-9-]{36})$/.test(id);
function profileFrom(request){
 const id=request.query?.get('profile')??'default';
 return validProfile(id)?id:null;
}
// The legacy partition IS the default profile. No rewrite can lose old IDs/ETags.
function profilePartition(p,id){return id==='default'?ownerPartition(p):require('node:crypto').createHash('sha256').update(ownerPartition(p)+':profile:'+id).digest('hex');}
module.exports={validProfile,profileFrom,profilePartition};
