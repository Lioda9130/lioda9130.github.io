import assert from 'node:assert/strict';
import {readFile,readdir,access} from 'node:fs/promises';
import {execFileSync} from 'node:child_process';
import * as THREE from '../docs/vendor/three.module.js';
import {loadModel} from '../docs/neon4-loader.js';
import {homePosition,destinations,routeTo,nearStreet,moveInStreet} from '../docs/navigation.js';
const docs=new URL('../docs/',import.meta.url);
for(const file of ['app.js','city.js','city-life.js','navigation.js','neon4-loader.js']){
  execFileSync(process.execPath,['--check',new URL(file,docs).pathname.replace(/^\/(\w:)/,'$1')]);
  const source=await readFile(new URL(file,docs),'utf8');
  for(const match of source.matchAll(/(?:from\s*|import\()['"](\.\/[^'"]+)/g))await access(new URL(match[1].split('?')[0],docs));
}
for(const name of ['asphalt','paving','panel'])for(const type of ['color','normal'])await access(new URL(`assets/${name}_${type}.jpg`,docs));
const originalFetch=globalThis.fetch, originalLoad=THREE.TextureLoader.prototype.load;
globalThis.fetch=async path=>{const data=await readFile(new URL(path,docs));return {ok:true,arrayBuffer:async()=>data.buffer.slice(data.byteOffset,data.byteOffset+data.byteLength)};};
THREE.TextureLoader.prototype.load=function(url,onLoad){const texture=new THREE.Texture();queueMicrotask(()=>onLoad?.(texture));return texture;};
try{
  const models=await readdir(new URL('assets/neon4/models/',docs));assert.equal(models.length,34);
  for(const name of models){const model=await loadModel(`./assets/neon4/models/${name}`);let meshes=0;model.traverse(o=>{if(o.isMesh){meshes++;assert.ok(o.geometry.attributes.position.count>0);assert.ok([...o.geometry.attributes.position.array].every(Number.isFinite));}});assert.ok(meshes>0,name);}
}finally{globalThis.fetch=originalFetch;THREE.TextureLoader.prototype.load=originalLoad;}
for(const start of [homePosition,...destinations])for(const end of destinations){
  const path=routeTo(start,end);assert.deepEqual(path.at(-1),{x:end.x,z:end.z});let prev=start;
  for(const p of path){const steps=Math.ceil(Math.hypot(p.x-prev.x,p.z-prev.z)/.2);for(let i=0;i<=steps;i++){const t=i/Math.max(1,steps);assert.ok(nearStreet(prev.x+(p.x-prev.x)*t,prev.z+(p.z-prev.z)*t,.55),'Route stays on road');}prev=p;}
}
const pos={x:0,z:-78};for(let i=0;i<200;i++)moveInStreet(pos,.3,0);assert.ok(nearStreet(pos.x,pos.z,.55));assert.ok(pos.x<20,'Walking cannot cross a building block');
console.log('PASS: JavaScript syntax, module/texture paths, all 34 GLB models, destination routes and walking collision.');
