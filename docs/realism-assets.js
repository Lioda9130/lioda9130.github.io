import * as THREE from './vendor/three.module.js';
import {GLTFLoader} from './vendor/gltf/GLTFLoader.js';
import {clone as cloneRig} from './vendor/gltf/SkeletonUtils.js';
import {mergeGeometries} from './vendor/gltf/BufferGeometryUtils.js';
import {trackAsset,fetchAsset} from './asset-state.js';

const loader=new GLTFLoader(),cache=new Map();
function exactMeshBounds(object){
  object.updateWorldMatrix(true,true);
  const box=new THREE.Box3(),v=new THREE.Vector3();
  object.traverse(o=>{if(!o.isMesh)return;const p=o.geometry.attributes.position;
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i).applyMatrix4(o.matrixWorld);box.expandByPoint(v);}
  });
  return box;
}
export function loadRealismAsset(file){
  if(!cache.has(file)){
    const promise=trackAsset(file,'rigged-model',async()=>loader.parseAsync(await fetchAsset(file),new URL('.',new URL(file,location.href)).href))
      .catch(error=>{cache.delete(file);throw error;});
    cache.set(file,promise);
  }
  return cache.get(file);
}

export function createSkinnedCitizen(gltf,variant=0){
  const root=new THREE.Group();root.name='skinned-citizen';
  const model=cloneRig(gltf.scene);root.add(model);
  const colors=['#344450','#544d46','#2d3d36','#4b3f50','#415563','#63564b'];
  model.traverse(o=>{
    if(!o.isSkinnedMesh)return;
    // Original skin and animation are retained; the logo texture is replaced by
    // neutral cloth/skin vertex colours in the rest pose, without editing images.
    const geometry=o.geometry.clone(),p=geometry.attributes.position;
    const color=new Float32Array(p.count*3),cloth=new THREE.Color(colors[variant%colors.length]);
    const skin=new THREE.Color(['#ad8064','#795540','#c49b7e'][variant%3]);
    const dark=new THREE.Color('#20252b');
    for(let i=0;i<p.count;i++){
      const z=p.getZ(i);
      const c=z>1.32?skin:z<.12?dark:cloth;
      const variation=.94+.06*Math.sin(i*12.9898);
      color[i*3]=c.r*variation;color[i*3+1]=c.g*variation;color[i*3+2]=c.b*variation;
    }
    geometry.setAttribute('color',new THREE.BufferAttribute(color,3));o.geometry=geometry;
    o.material=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.88,metalness:0});
    o.castShadow=true;o.frustumCulled=false;
  });
  const bounds=new THREE.Box3().setFromObject(model),height=bounds.max.y-bounds.min.y;
  const scale=1.76/height;model.scale.multiplyScalar(scale);model.position.y-=bounds.min.y*scale;
  // Route actors face -Z; keep the glTF root's existing Y-up conversion.
  model.rotation.y=Math.PI;
  const mixer=new THREE.AnimationMixer(model),action=mixer.clipAction(gltf.animations[0]);action.play();
  root.userData.kind='skeletal';
  return {root,mixer,duration:gltf.animations[0].duration,model};
}

export function createHeroCar(gltf,variant=0){
  const root=new THREE.Group();root.name='detailed-car';
  const model=gltf.scene.clone(true);root.add(model);
  model.updateMatrixWorld(true);
  const wheels=[],staticMeshes=[],batches=new Map();
  const wheelNames=['WheelFrontL','WheelFrontR','WheelRearL','WheelRearR'];
  const wheelNodes=wheelNames.map(n=>model.getObjectByName(n));
  model.traverse(o=>{
    if(!o.isMesh)return;
    // Avoid expensive screen-space refraction for a street full of cars.
    o.material=o.material.clone();
    if(o.material.name?.startsWith('Paint 1'))o.material.color.set(['#667b86','#762e45','#b6b7ac'][variant%3]);
    if(o.material.transmission){o.material.transmission=0;o.material.transparent=false;o.material.color.set('#263b46');o.material.roughness=.13;o.material.metalness=.35;}
    o.castShadow=true;
    let parent=o;while(parent&&!wheelNodes.includes(parent))parent=parent.parent;
    if(parent)return;
    const key=o.material.name||String(o.material.id);
    if(!batches.has(key))batches.set(key,{mat:o.material,geometries:[]});
    const g=o.geometry.clone();g.applyMatrix4(o.matrixWorld);batches.get(key).geometries.push(g);staticMeshes.push(o);
  });
  // Flatten static sections by material; retain all wheel hierarchies and pivots.
  for(const {mat,geometries} of batches.values()){
    const normalized=geometries.map(g=>g.index?g.toNonIndexed():g);
    const keys=Object.keys(normalized[0].attributes).filter(key=>normalized.every(g=>g.attributes[key]));
    for(const g of normalized)for(const key of Object.keys(g.attributes))if(!keys.includes(key))g.deleteAttribute(key);
    const geometry=mergeGeometries(normalized,false);
    if(geometry){const mesh=new THREE.Mesh(geometry,mat);mesh.castShadow=true;model.add(mesh);}
    else for(const g of normalized)model.add(new THREE.Mesh(g,mat));
  }
  for(const o of staticMeshes)o.parent?.remove(o);
  model.updateMatrixWorld(true);
  for(const node of wheelNodes){
    if(!node)continue;
    const b=exactMeshBounds(node),center=b.getCenter(new THREE.Vector3());
    const pivot=new THREE.Group();pivot.name='hero-wheel';pivot.position.copy(center);model.add(pivot);
    pivot.attach(node);pivot.userData.radius=(b.max.y-b.min.y)/2;wheels.push(pivot);
  }
  // GLTFLoader has already applied the source asset's Y-up conversion.
  model.rotation.y=Math.PI;
  model.updateMatrixWorld(true);
  let bounds=new THREE.Box3().setFromObject(model);
  const scale=4.8/(bounds.max.z-bounds.min.z);model.scale.set(scale*.78,scale,scale);
  bounds=new THREE.Box3().setFromObject(model);model.position.y=-bounds.min.y+.025;
  root.userData.wheels=wheels;root.userData.scale=scale;
  return root;
}
export function animateHeroCar(root,distance){
  for(const wheel of root.userData.wheels)wheel.rotation.x=distance/(root.userData.scale*wheel.userData.radius);
}
