import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import * as THREE from '../docs/vendor/three.module.js';
import {GLTFLoader} from '../docs/vendor/gltf/GLTFLoader.js';
import {createSkinnedCitizen,createHeroCar,animateHeroCar} from '../docs/realism-assets.js';
import {createArchitecture} from '../docs/architecture.js';
import {createCityLife} from '../docs/city-life.js';
const loader=new GLTFLoader();
// Decode actual mesh/skin/clip data. GPU/image decoding is a browser-only check.
loader.register(()=>({name:'TestTextures',loadTexture:()=>Promise.resolve(new THREE.Texture())}));
async function parse(name){const b=await readFile(new URL('../docs/assets/realism/'+name+'.glb',import.meta.url));return loader.parseAsync(b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength),'');}
const human=await parse('citizen-rig'),a=createSkinnedCitizen(human,0),b=createSkinnedCitizen(human,2);
let skinA,skinB;a.root.traverse(o=>{if(o.isSkinnedMesh)skinA=o;});b.root.traverse(o=>{if(o.isSkinnedMesh)skinB=o;});
assert.ok(skinA&&skinB);assert.notEqual(skinA.skeleton.bones[0],skinB.skeleton.bones[0]);
a.mixer.setTime(0);a.root.updateMatrixWorld(true);const start=skinA.skeleton.bones.map(b=>b.quaternion.toArray());
a.mixer.setTime(.4);a.root.updateMatrixWorld(true);assert.notDeepEqual(skinA.skeleton.bones.map(b=>b.quaternion.toArray()),start,'Official animation changes the skeleton');
b.mixer.setTime(0);assert.deepEqual(skinB.skeleton.bones.map(b=>b.quaternion.toArray()),start,'Other citizen remains independent');
assert.ok(skinA.geometry.attributes.skinWeight);assert.ok(skinA.geometry.attributes.normal);assert.ok(skinA.material.vertexColors);
const personSize=new THREE.Box3().setFromObject(b.root).getSize(new THREE.Vector3());assert.ok(personSize.y>1.6&&personSize.y<1.95);
const car=createHeroCar(await parse('concept-car'));assert.equal(car.userData.wheels.length,4);
const box=new THREE.Box3().setFromObject(car),size=box.getSize(new THREE.Vector3());assert.ok(Math.abs(size.z-4.8)<.01);assert.ok(size.y<2&&size.x<2.5);assert.ok(box.min.y>=0);
const centers=car.userData.wheels.map(w=>w.position.toArray());animateHeroCar(car,8);
assert.deepEqual(car.userData.wheels.map(w=>w.position.toArray()),centers);assert.ok(car.userData.wheels.every(w=>Number.isFinite(w.rotation.x)&&w.rotation.x>0));
const manifest=JSON.parse(await readFile(new URL('../docs/assets/neon4/manifest.json',import.meta.url)));
const styles=new Set();let instances=0;
for(const [i,lot]of manifest.buildings.entries()){
  const model=createArchitecture(lot,i);styles.add(model.userData.style);const lod=model.children[0];assert.equal(lod.levels.length,2);
  assert.ok(model.userData.stories>=4);
  model.traverse(o=>{if(o.isInstancedMesh){instances+=o.count;assert.ok([...o.instanceMatrix.array].every(Number.isFinite));}});
  const camera=new THREE.PerspectiveCamera();camera.position.set(0,3,200);camera.updateMatrixWorld();lod.update(camera);assert.equal(lod.levels[1].object.visible,true);
  camera.position.set(0,3,0);camera.updateMatrixWorld();lod.update(camera);assert.equal(lod.levels[0].object.visible,true);
}
assert.equal(styles.size,5);assert.ok(instances>10000);
const oldFetch=globalThis.fetch,oldLoad=THREE.TextureLoader.prototype.load;
globalThis.fetch=async path=>{const b=await readFile(new URL('../docs/'+path,import.meta.url));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};};
THREE.TextureLoader.prototype.load=function(url,ready){const texture=new THREE.Texture();queueMicrotask(()=>ready?.(texture));return texture;};
try{
  const scene=new THREE.Scene(),carAsset=await parse('concept-car');
  const life=createCityLife(scene,true,{loadCitizen:async()=>human,loadCar:async()=>carAsset});
  const deadline=Date.now()+10000;
  while((life.loadedVehicles!==9||life.loadedDrones!==2)&&Date.now()<deadline)await new Promise(r=>setTimeout(r,5));
  assert.equal(life.realism.skeletalPeople,22);assert.equal(life.loadedVehicles,9);
  const camera=new THREE.PerspectiveCamera();camera.position.set(0,3,82);life.updateDetail(camera);
  assert.equal(life.realism.heroCars,1,'Low quality enables at most one nearby detailed vehicle');
  life.setTime(.5);life.updateDetail(camera);assert.ok(life.actors.every(o=>o.position.toArray().every(Number.isFinite)));
  camera.position.set(1000,3,1000);life.updateDetail(camera);assert.equal(life.realism.heroCars,0,'Detailed traffic is hidden beyond its distance budget');
}finally{globalThis.fetch=oldFetch;THREE.TextureLoader.prototype.load=oldLoad;}
console.log(`PASS: true skeletal clips/independent clones, detailed car scale/axles, 15 architectural lots, five massing families, ${instances} batched instances and distance LOD.`);
