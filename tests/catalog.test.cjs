const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const src=fs.readFileSync('app.js','utf8');
const {MACHINE,PLAN,CORE}=vm.runInNewContext(src.slice(0,src.indexOf('const dateKey='))+';({MACHINE,PLAN,CORE})');
test('Every exercise has distinct alternatives with known units and offline fallback',()=>{
 const items=new Map([...PLAN.flatMap(p=>p.items),...CORE].map(x=>[x.id,x]));
 assert.equal(items.size,30);
 for(const item of items.values()){
  assert.ok(new Set(item.options).size>=2,item.id+' missing alternatives');
  for(const id of item.options){assert.ok(MACHINE[id]?.type,id);assert.ok(fs.existsSync('assets/equipment/'+id+'.svg'),id);}
 }
});
test('Cached catalogue photos are real image bytes, attributed and pre-cached',()=>{
 const photos=JSON.parse(fs.readFileSync('assets/photo-sources.json','utf8'));
 let count=0;
 for(const photo of Object.values(photos)){
  assert.ok(photo.source.startsWith('https://'));assert.ok(photo.credit);
  if(!photo.local)continue;
  const bytes=fs.readFileSync(photo.local);
  assert.ok(bytes[0]===0xff||bytes.subarray(0,4).toString()==='RIFF'||bytes[0]===0x89,photo.local);
  assert.ok(fs.readFileSync('sw.js','utf8').includes(photo.local));count++;
 }
 assert.equal(count,18);
 assert.ok(!photos['core-hollow'],'Unrelated handstand photo must never return');
});

test('Exercise demonstrations are keyed by both exercise and equipment, with two local photos',()=>{
 const guides=JSON.parse(fs.readFileSync('assets/exercise-guides.json','utf8'));
 assert.ok(!JSON.parse(fs.readFileSync('assets/photo-sources.json','utf8')).DUMBBELL,'No generic crate of dumbbells');
 assert.notEqual(guides['flat|DUMBBELL'].exerciseId,guides['fly|DUMBBELL'].exerciseId);
 assert.notEqual(guides['fly|DUMBBELL'].exerciseId,guides['laterals|DUMBBELL'].exerciseId);
 for(const [key,guide] of Object.entries(guides)){
  const [id,machine]=key.split('|');
  const item=[...PLAN.flatMap(p=>p.items),...CORE].find(x=>x.id===id);
  assert.ok(item?.options.includes(machine),key);
  assert.equal(guide.images.length,2);
  for(const file of guide.images){assert.ok(fs.existsSync(file),file);assert.ok(fs.readFileSync('sw.js','utf8').includes(file));}
 }
});
