import * as THREE from './vendor/three.module.js';
import {trackAsset} from './asset-state.js';
import {CITY} from './navigation.js?v=nd5-m0';
import {loadModel, modelPath} from './neon4-loader.js?v=nd5-m0';

// Dynamic actors using original character / vehicle GLBs, not cubes or sprites.
export function createCityLife(scene,compact=false){
  const people=[],vehicles=[],drones=[];
  const crowd=compact?22:54,traffic=compact?9:21;
  let clock=0;
  const names=['sedan','taxi','hatchback','delivery_van','bus','sport'];
  const pedModels=['pedestrian_0','pedestrian_1','pedestrian_2','pedestrian_3'];
  const routeSegments=[
    {axis:'z',value:-18.6,start:88,end:-179},
    {axis:'z',value:18.6,start:-179,end:88},
    {axis:'x',value:-29.1,start:-111,end:111},
    {axis:'x',value:-66.8,start:111,end:-111},
    {axis:'z',value:-63.0,start:-177,end:85},
    {axis:'z',value:62.3,start:85,end:-177},
  ];
  function prepBones(model){
    // Rebase baked vertices at the physical joints before rotating in place.
    const joints={arm_L:1.48,arm_R:1.48,leg_L:.82,leg_R:.82};
    for(const [name,pivot] of Object.entries(joints)){
      const bone=model.getObjectByName(name);if(!bone)continue;
      let adjusted=false;
      bone.traverse(child=>{if(child.isMesh){
        const geom=child.geometry.clone();geom.translate(0,-pivot,0);child.geometry=geom;adjusted=true;
      }});
      if(adjusted)bone.position.y=pivot;
    }
  }
  async function available(names){
    const results=await Promise.allSettled(names.map(name=>loadModel(modelPath(name))));
    const models=results.filter(r=>r.status==='fulfilled').map(r=>r.value);
    if(!models.length)throw new Error('No actor models available: '+names.join(', '));
    return models;
  }
  async function spawnPeople(){
    const base=await available(pedModels);
    base.forEach(prepBones);
    for(let i=0;i<crowd;i++){
      const p=base[i%base.length].clone(true);
      p.scale.setScalar(.88+(i%7)*.028);
      const r=routeSegments[i%routeSegments.length];
      scene.add(p);
      people.push({object:p,route:r,phase:(i*.071)%1,speed:0.0040+(i%9)*.0005,wait:0,
        arms:[p.getObjectByName('arm_L'),p.getObjectByName('arm_R')],legs:[p.getObjectByName('leg_L'),p.getObjectByName('leg_R')]});
    }
    // At least a dozen passersby visible at the entrance before walking anywhere.
    for(let i=0;i<Math.min(14,people.length);i++){
      const p=people[i];p.route=routeSegments[i%2];p.phase=i%2===0?.018+i*.009:.91+i*.005;
    }
    for(const p of people)p.startPhase=p.phase;
    update(0);
  }
  async function spawnCars(){
    const base=await available(names);
    for(let i=0;i<traffic;i++){
      const nameIndex=i%base.length;const car=base[nameIndex].clone(true);
      scene.add(car);vehicles.push({object:car,lane:i%4,phase:(.085+i*.083)%1,speed:.035+(i%4)*.009,type:nameIndex});
    }
    for(const v of vehicles)v.startPhase=v.phase;
    const airborne=base[base.length-1];
    for(let i=0;i<(compact?2:4);i++){
      const hover=airborne.clone(true);hover.scale.setScalar(.6);
      scene.add(hover);drones.push(hover);
    }
    update(0);
  }
  Promise.allSettled([trackAsset('actors:people','spawn',spawnPeople),trackAsset('actors:vehicles','spawn',spawnCars)]).then(outcomes=>{
    for(const o of outcomes)if(o.status==='rejected')console.warn('GLB actor initialization:',o.reason);
  });
  function update(delta){
    clock+=delta;
    for(let i=0;i<people.length;i++){
      const p=people[i];p.phase=(p.startPhase+clock*p.speed)%1;
      const r=p.route,t=p.phase;const progress=r.start+(r.end-r.start)*t;
      const sign=Math.sign(r.end-r.start);
      if(r.axis==='z'){
        p.object.position.set(r.value,0,progress);
        p.object.rotation.y=sign<0?0:Math.PI;
      }else{
        p.object.position.set(progress,0,r.value);
        p.object.rotation.y=sign>0?-Math.PI/2:Math.PI/2;
      }
      const gait=Math.sin(clock*(5+i%3)+i*.83);
      p.object.position.y=Math.abs(gait)*.026;
      p.arms[0]&&(p.arms[0].rotation.x=gait*.37);
      p.arms[1]&&(p.arms[1].rotation.x=-gait*.37);
      p.legs[0]&&(p.legs[0].rotation.x=-gait*.29);
      p.legs[1]&&(p.legs[1].rotation.x=gait*.29);
    }
    vehicles.forEach((v,i)=>{
      v.phase=(v.startPhase+clock*v.speed)%1;
      const t=v.phase;
      if(v.lane<2){
        const south=v.lane===0;
        const z=south?(95-t*286):(-191+t*286);
        v.object.position.set(south?-5.4:5.4,.02,z);
        v.object.rotation.y=south?0:Math.PI;
      }else{
        const east=v.lane===2;
        v.object.position.set(east?-112+t*224:112-t*224,.03,east?-44.7:-51.0);
        v.object.rotation.y=east?-Math.PI/2:Math.PI/2;
      }
    });
    drones.forEach((m,i)=>{
      const t=clock*.12+i*1.31;
      m.position.set(Math.sin(t)*95,22+i*5+Math.sin(clock*.9+i)*.45,-52+Math.cos(t*.7)*125);
      m.rotation.y=Math.sin(t)*.48;
      m.rotation.z=Math.sin(clock+i)*.04;
    });
  }
  return{update,setTime(t){clock=t;update(0);},get actors(){return [...people.map(p=>p.object),...vehicles.map(v=>v.object),...drones];},get loadedDrones(){return drones.length;},stats:{pedestrians:crowd,vehicles:traffic,drones:compact?2:4},get loadedPeople(){return people.length;},get loadedVehicles(){return vehicles.length;}};
}
