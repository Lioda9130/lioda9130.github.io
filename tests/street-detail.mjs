import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../docs/vendor/three.module.js';
import {loadModel} from '../docs/neon4-loader.js';
import {createPedestrian,pedestrianRig,animatePedestrian,prepareVehicle,vehicleWheels,rollWheels,addFacadeDetails} from '../docs/street-detail.js';
const oldFetch=globalThis.fetch,oldLoad=THREE.TextureLoader.prototype.load;
globalThis.fetch=async path=>{const b=await readFile(new URL('../docs/'+path,import.meta.url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
THREE.TextureLoader.prototype.load=function(url,ready){const t=new THREE.Texture();queueMicrotask(()=>ready?.(t));return t;};
const inventory=[];
function count(model){let triangles=0,meshes=0;model.traverse(o=>{if(o.isMesh&&o.visible){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3;assert.ok([...o.geometry.attributes.normal.array].every(Number.isFinite));}});return {triangles,meshes};}
try{
  for(const name of ['sedan','taxi','hatchback','delivery_van','bus','sport']){
    const model=await loadModel('./assets/neon4/models/'+name+'.glb');prepareVehicle(model);
    const wheels=vehicleWheels(model);assert.equal(wheels.length,4,name);
    const centers=wheels.map(w=>w.position.toArray());
    for(const w of wheels){assert.ok(w.userData.radius>.2&&w.userData.radius<.8);assert.ok(Math.abs(w.position.y-w.userData.radius)<.08,'Tyres meet the road');}
    rollWheels(wheels,1.5);for(const w of wheels)assert.equal(w.rotation.x,-1.5/w.userData.radius);
    assert.deepEqual(wheels.map(w=>w.position.toArray()),centers,'Wheels rotate around their axle rather than orbiting');
    const copy=model.clone(true);rollWheels(vehicleWheels(copy),3);assert.notEqual(vehicleWheels(copy)[0].rotation.x,wheels[0].rotation.x,'Cloned vehicles animate independently');
    rollWheels(wheels,0);assert.ok(wheels.every(w=>w.rotation.x===0));inventory.push({name,...count(model)});
  }
  for(let i=0;i<4;i++){
    const model=createPedestrian(i),rig=pedestrianRig(model);assert.ok(Object.values(rig).every(Boolean));
    const bounds=new THREE.Box3().setFromObject(model),size=bounds.getSize(new THREE.Vector3());
    assert.ok(size.y>1.65&&size.y<1.9);assert.ok(size.x<.7);assert.ok(bounds.min.y>=-.01);
    animatePedestrian(rig,.3,1.4);assert.notEqual(rig.knee_L.rotation.x,rig.knee_R.rotation.x);
    const pose=rig.leg_L.rotation.x;animatePedestrian(rig,.3,1.4);assert.equal(rig.leg_L.rotation.x,pose);
    animatePedestrian(rig,.3,0);assert.equal(rig.leg_L.rotation.x,0,'No walking swing at rest');
    inventory.push({name:'adult-'+i,...count(model)});
  }
  const model=new THREE.Group();addFacadeDetails(model,{x:-28,width:15.4,depth:34.2});
  assert.equal(model.getObjectByName('street-facade-details').children.length,4,'Static facade pieces are batched by material');
  inventory.push({name:'facade-13',...count(model)});
}finally{globalThis.fetch=oldFetch;THREE.TextureLoader.prototype.load=oldLoad;}
console.table(inventory);console.log('PASS: six vehicle wheel pivots/rolling, independent clones, adult dimensions/articulation, finite normals and facade batching.');
