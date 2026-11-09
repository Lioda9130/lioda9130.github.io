import * as THREE from './vendor/three.module.js';

const sphere=new THREE.SphereGeometry(1,12,8),box=new THREE.BoxGeometry(1,1,1);
const cylinder=new THREE.CylinderGeometry(1,1,1,12);
const material=(color,roughness=.8,metalness=0)=>new THREE.MeshStandardMaterial({color,roughness,metalness});

// Bake static details by material within each articulated joint to limit draw calls.
const humanSurface=new THREE.MeshStandardMaterial({vertexColors:true,roughness:.8});
function builder(parent,vertexColors=false){
  const batches=new Map();
  return {
    part(geometry,mat,position,scale,rotation=[0,0,0]){
      const g=geometry.index?geometry.toNonIndexed():geometry.clone();
      g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(...position),new THREE.Quaternion().setFromEuler(new THREE.Euler(...rotation)),new THREE.Vector3(...scale)));
      if(vertexColors){const colors=new Float32Array(g.attributes.position.count*3);for(let i=0;i<colors.length;i+=3){colors[i]=mat.color.r;colors[i+1]=mat.color.g;colors[i+2]=mat.color.b;}g.setAttribute('color',new THREE.BufferAttribute(colors,3));mat=humanSurface;}
      if(!batches.has(mat))batches.set(mat,[]);batches.get(mat).push(g);
    },
    finish(){for(const [mat,geometries] of batches){
      const g=new THREE.BufferGeometry();
      for(const key of (vertexColors?['position','normal','uv','color']:['position','normal','uv'])){
        const arrays=geometries.map(x=>x.attributes[key]);const out=new Float32Array(arrays.reduce((n,a)=>n+a.array.length,0));let offset=0;
        for(const a of arrays){out.set(a.array,offset);offset+=a.array.length;}
        g.setAttribute(key,new THREE.BufferAttribute(out,arrays[0].itemSize));
      }
      parent.add(new THREE.Mesh(g,mat));geometries.forEach(g=>g.dispose());
    }}
  };
}
function joint(parent,name,x,y,z){const g=new THREE.Group();g.name=name;g.position.set(x,y,z);parent.add(g);return g;}

export function createPedestrian(variant=0){
  const humanBuilder=parent=>builder(parent,true);
  const root=new THREE.Group();root.name='adult-pedestrian';
  const coat=material(['#343e46','#574d46','#454b41','#36384a'][variant%4]);
  const trousers=material(['#252931','#303437','#282c34','#35302f'][variant%4]);
  const skin=material(['#af8063','#795540','#c2997c','#9b7056'][variant%4],.72);
  const shoes=material('#202125',.65),hair=material(['#29201c','#171719','#534236','#24201d'][variant%4]);
  const trim=material('#777b7a',.55,.15);
  const torso=joint(root,'torso',0,.94,0),b=humanBuilder(torso);
  b.part(sphere,coat,[0,.28,0],[.205,.31,.12]); // adult shoulders/waist, not a spherical body
  b.part(sphere,trousers,[0,-.015,0],[.158,.13,.105]);
  b.part(cylinder,skin,[0,.59,0],[.054,.11,.052]);
  b.part(box,trim,[0,.28,-.121],[.008,.43,.007]);
  for(const side of [-1,1]){
    b.part(box,coat,[side*.06,.49,-.105],[.065,.13,.022],[0,0,side*.4]);
    b.part(box,coat,[side*.1,.15,-.111],[.075,.09,.018]);
    b.part(box,trim,[side*.1,.19,-.124],[.06,.006,.006]);
  }
  b.finish();
  const head=joint(torso,'head',0,.69,0),h=humanBuilder(head);
  h.part(sphere,skin,[0,0,0],[.079,.116,.087]);
  h.part(sphere,skin,[0,-.045,-.03],[.063,.055,.061]); // jaw
  h.part(sphere,skin,[0,-.007,-.087],[.016,.026,.021]);
  for(const side of [-1,1])h.part(sphere,skin,[side*.079,-.01,.005],[.012,.025,.018]);
  h.part(sphere,hair,[0,.045,.012],[.082,.078,.079]);
  // Subtle brows rather than oversized painted cartoon eyes.
  for(const side of [-1,1])h.part(box,hair,[side*.032,.025,-.08],[.028,.004,.006]);
  h.finish();
  for(const side of [-1,1]){
    const suffix=side<0?'L':'R';
    const upper=joint(torso,'arm_'+suffix,side*.207,.48,0),a=humanBuilder(upper);
    a.part(sphere,coat,[side*.012,-.13,0],[.062,.175,.065]);a.finish();
    const fore=joint(upper,'elbow_'+suffix,side*.02,-.285,0),f=humanBuilder(fore);
    f.part(sphere,coat,[0,-.12,0],[.045,.14,.05]);
    f.part(cylinder,trim,[0,-.235,0],[.045,.018,.047]);
    f.part(sphere,skin,[0,-.285,-.004],[.034,.065,.024]);
    f.part(sphere,skin,[-side*.029,-.275,-.013],[.012,.033,.014],[0,0,side*.3]);f.finish();
    const thigh=joint(root,'leg_'+suffix,side*.086,.94,0),t=humanBuilder(thigh);
    t.part(sphere,trousers,[0,-.20,0],[.079,.245,.083]);t.finish();
    const shin=joint(thigh,'knee_'+suffix,0,-.44,0),k=humanBuilder(shin);
    k.part(sphere,trousers,[0,-.185,0],[.057,.215,.062]);
    k.part(sphere,shoes,[0,-.43,-.055],[.065,.06,.13]);
    k.part(box,shoes,[0,-.475,-.055],[.12,.022,.22]);k.finish();
  }
  return root;
}

export function pedestrianRig(model){
  return Object.fromEntries(['torso','head','arm_L','arm_R','elbow_L','elbow_R','leg_L','leg_R','knee_L','knee_R'].map(n=>[n,model.getObjectByName(n)]));
}
export function animatePedestrian(rig,distance,speed,phase=0){
  // One full stride covers 1.35m; animation follows travelled distance.
  const cycle=distance/1.35*Math.PI*2+phase, amplitude=Math.min(1,speed/1.45);
  for(const [side,offset] of [['L',0],['R',Math.PI]]){
    const angle=cycle+offset;
    rig['leg_'+side].rotation.x=Math.sin(angle)*.36*amplitude;
    rig['knee_'+side].rotation.x=-Math.max(0,-Math.cos(angle))*.65*amplitude;
    rig['arm_'+side].rotation.x=-Math.sin(angle)*.22*amplitude;
    rig['elbow_'+side].rotation.x=.16+Math.max(0,Math.sin(angle))*.15*amplitude;
  }
  rig.torso.position.y=.94+Math.cos(cycle*2)*.009*amplitude;
  rig.torso.rotation.y=Math.sin(cycle)*.035*amplitude;
  rig.head.rotation.y=-rig.torso.rotation.y*.5;
}

export function prepareVehicle(model){
  // Only the curved body shell gets shared normals; keep trim/door edges crisp.
  model.traverse(o=>{
    if(!o.isMesh||o.name!=='curved-monocoque-shell')return;
    const g=o.geometry.clone(),p=g.attributes.position,n=g.attributes.normal,sums=new Map(),keys=[];
    for(let i=0;i<p.count;i++){
      const key=[p.getX(i),p.getY(i),p.getZ(i)].map(v=>Math.round(v*100000)).join(',');keys.push(key);
      if(!sums.has(key))sums.set(key,new THREE.Vector3());sums.get(key).add(new THREE.Vector3().fromBufferAttribute(n,i));
    }
    for(const value of sums.values())value.normalize();
    for(let i=0;i<p.count;i++){const v=sums.get(keys[i]);n.setXYZ(i,v.x,v.y,v.z);}o.geometry=g;
  });
  const rubber=[];model.traverse(o=>{if(o.isMesh&&o.material.name==='rubber')rubber.push(o);});
  if(!rubber.length)return;
  const bounds=Array.from({length:4},()=>new THREE.Box3());const v=new THREE.Vector3();
  for(const mesh of rubber){const p=mesh.geometry.attributes.position;
    for(let i=0;i<p.count;i++){v.fromBufferAttribute(p,i);bounds[(v.x>0?2:0)+(v.z>0?1:0)].expandByPoint(v);}
    mesh.visible=false;
  }
  const wheels=bounds.filter(b=>!b.isEmpty()).map(b=>({center:b.getCenter(new THREE.Vector3()),size:b.getSize(new THREE.Vector3())}));
  // Remove original static wheel hubs while preserving the unrelated aluminium trim.
  model.traverse(o=>{
    if(!o.isMesh||o.material.name!=='alum')return;
    const g=o.geometry.index?o.geometry.toNonIndexed():o.geometry.clone(),p=g.attributes.position,keep=[];
    for(let i=0;i<p.count;i+=3){v.set(0,0,0);for(let j=0;j<3;j++)v.add(new THREE.Vector3().fromBufferAttribute(p,i+j));v.divideScalar(3);
      if(!wheels.some(w=>Math.abs(v.x-w.center.x)<.3&&Math.hypot(v.y-w.center.y,v.z-w.center.z)<w.size.y*.51))keep.push(i,i+1,i+2);
    }
    const result=new THREE.BufferGeometry();for(const [key,a] of Object.entries(g.attributes)){const array=new Float32Array(keep.length*a.itemSize);keep.forEach((index,j)=>{for(let k=0;k<a.itemSize;k++)array[j*a.itemSize+k]=a.array[index*a.itemSize+k];});result.setAttribute(key,new THREE.BufferAttribute(array,a.itemSize));}o.geometry=result;g.dispose();
  });
  const tyre=material('#17191c',.92),alloy=material('#8d959f',.32,.82),hub=material('#343940',.6,.5);
  for(const [i,w] of wheels.entries()){
    const radius=w.size.y/2,group=joint(model,'rolling-wheel-'+i,...w.center.toArray());group.userData.radius=radius;
    const b=builder(group),width=w.size.x;
    const torus=new THREE.TorusGeometry(radius*.79,radius*.21,8,24);
    b.part(torus,tyre,[0,0,0],[1,1,1],[0,Math.PI/2,0]);torus.dispose();
    b.part(cylinder,hub,[0,0,0],[radius*.57,width*.9,radius*.57],[0,0,Math.PI/2]);
    for(const side of [-1,1])for(let spoke=0;spoke<5;spoke++){
      const a=spoke/5*Math.PI*2;b.part(box,alloy,[side*width*.51,Math.cos(a)*radius*.29,Math.sin(a)*radius*.29],[.028,radius*.59,.045],[a,0,0]);
    }
    b.finish();
  }
}
export function vehicleWheels(model){const wheels=[];model.traverse(o=>{if(o.name.startsWith('rolling-wheel-'))wheels.push(o);});return wheels;}
export function rollWheels(wheels,distance){for(const wheel of wheels)wheel.rotation.x=-distance/wheel.userData.radius;}

export function addFacadeDetails(model,lot){
  const group=joint(model,'street-facade-details',0,0,0),b=builder(group);
  const metal=material('#4a545d',.48,.6),stone=material('#7b7c7a',.92),dark=material('#222b30',.8);
  const warm=material('#c4ac89',.8);warm.emissive.set('#a78354');warm.emissiveIntensity=.5;
  // Street-facing side elevations, visible from the main boulevard.
  const side=lot.x<0?1:-1,x=side*(lot.width/2+.06);
  for(let z=-lot.depth/2+3;z<lot.depth/2-1;z+=4.2){
    b.part(box,dark,[x,2,z],[.1,3.8,3.2]);
    b.part(box,warm,[x+side*.07,2,z],[.04,2.7,2.75]);
    for(const dz of [-1.52,0,1.52])b.part(box,metal,[x+side*.14,2,z+dz],[.18,3.8,.07]);
    for(const y of [.22,3.8])b.part(box,stone,[x+side*.15,y,z],[.3,.16,3.35]);
    b.part(box,metal,[x+side*.55,4.05,z],[1.2,.13,3.7]);
    b.part(box,metal,[x+side*.2,1.6,z+.15],[.1,.35,.04]);
    // Interior shelf silhouettes interrupt the flat luminous pane.
    for(const y of [1.05,2.5])b.part(box,dark,[x+side*.10,y,z],[.045,.07,2.7]);
  }
  b.finish();
}
