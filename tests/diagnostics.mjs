import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {summarizeFrames,createFrameSampler} from '../docs/frame-metrics.js';
import {trackAsset,assetSnapshot,observeAssets} from '../docs/asset-state.js';
import * as THREE from '../docs/vendor/three.module.js';
import {loadModel} from '../docs/neon4-loader.js';
import {createCityLife} from '../docs/city-life.js';

assert.equal(summarizeFrames([]).medianFps,null);
assert.equal(summarizeFrames([10,20]).medianFps,1000/15);
const frames=[...Array(99).fill(10),100];
assert.equal(summarizeFrames(frames).medianFps,100);
assert.equal(summarizeFrames(frames).onePercentLowFps,10);
const sampler=createFrameSampler({warmupMs:20,durationMs:30});
sampler.start();[0,10,20,30,40,50].forEach(t=>sampler.frame(t,true));
assert.equal(sampler.snapshot().state,'complete');assert.deepEqual(sampler.snapshot().frameMs,[10,10,10]);
sampler.start();sampler.frame(0,true);sampler.frame(10,false);sampler.frame(100,true);
assert.equal(sampler.snapshot().state,'interrupted');assert.equal(sampler.snapshot().samples,0);

let notices=0;const unsubscribe=observeAssets(()=>notices++);
await assert.rejects(trackAsset('test:failure','test',()=>Promise.reject(new Error('expected failure'))));
assert.equal(assetSnapshot().items.find(x=>x.key==='test:failure').state,'failed');
await trackAsset('test:failure','test',()=>Promise.resolve());
assert.equal(assetSnapshot().items.find(x=>x.key==='test:failure').state,'loaded');assert.equal(notices,4);unsubscribe();

const originalFetch=globalThis.fetch,originalTexture=THREE.TextureLoader.prototype.load;
const docs=new URL('../docs/',import.meta.url);
let failOnce=true,decodeFailure=false,held=[],holdImages=false;
globalThis.fetch=async path=>{
  if(path.includes('retry.glb')&&failOnce){failOnce=false;return {ok:false,status:503};}
  if(path.includes('pedestrian_1')||path.includes('taxi.glb'))return {ok:false,status:404};
  const actual=path.includes('retry.glb')||path.includes('decode.glb')||path.includes('hold.glb')?'./assets/neon4/models/building_00.glb':path;
  const b=await readFile(new URL(actual,docs));return {ok:true,arrayBuffer:async()=>b.buffer.slice(b.byteOffset,b.byteOffset+b.byteLength)};
};
THREE.TextureLoader.prototype.load=function(url,onLoad,progress,onError){
  const texture=new THREE.Texture();const done=()=>decodeFailure?onError?.(new Error('bad image')):onLoad?.(texture);
  if(holdImages)held.push(done);else queueMicrotask(done);return texture;
};
try{
  await assert.rejects(loadModel('./retry.glb'),/503/);
  assert.ok((await loadModel('./retry.glb')).isGroup,'A failed cache entry can be retried');
  decodeFailure=true;await assert.rejects(loadModel('./decode.glb'),/Image decode failed/);decodeFailure=false;
  assert.ok((await loadModel('./decode.glb')).isGroup);
  holdImages=true;let settled=false;const pending=loadModel('./hold.glb').then(()=>{settled=true;});
  while(!held.length)await new Promise(r=>setTimeout(r,5));
  assert.equal(settled,false,'Model readiness waits for image decode');
  holdImages=false;held.forEach(fn=>fn());await pending;assert.equal(settled,true);
  for(const compact of [true,false]){
    const scene=new THREE.Scene(),life=createCityLife(scene,compact);
    const deadline=Date.now()+5000;
    while((life.loadedPeople!==(compact?22:54)||life.loadedVehicles!==(compact?9:21))&&Date.now()<deadline)await new Promise(r=>setTimeout(r,5));
    assert.equal(life.loadedPeople,compact?22:54,'One missing pedestrian model does not remove all pedestrians');
    assert.equal(life.loadedVehicles,compact?9:21,'One missing vehicle model does not remove all traffic');
    assert.equal(life.loadedDrones,compact?2:4);
    life.setTime(0);const initial=life.actors.map(a=>a.position.toArray());
    life.update(1);assert.notDeepEqual(life.actors.map(a=>a.position.toArray()),initial);
    life.setTime(0);assert.deepEqual(life.actors.map(a=>a.position.toArray()),initial,'Fixed simulation snapshot is reproducible');
    assert.ok(life.actors.every(a=>a.position.toArray().every(Number.isFinite)));
  }
}finally{globalThis.fetch=originalFetch;THREE.TextureLoader.prototype.load=originalTexture;}
assert.equal(assetSnapshot().pending,0);
console.log('PASS: FPS statistics, interrupted samples, asset state, HTTP retry, decode failure/readiness, partial actor loading and deterministic actor poses.');
