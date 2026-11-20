import * as THREE from './vendor/three.module.js';
import {trackAsset} from './asset-state.js';

const unit=new THREE.BoxGeometry(1,1,1),dummy=new THREE.Object3D();
function addBuildingSign(parent,lot,index){
  if(typeof document==='undefined')return;
  const canvas=document.createElement('canvas');canvas.width=512;canvas.height=128;
  const ctx=canvas.getContext('2d'),accent=['#76dbdf','#dfa2b8','#e7bd86','#a7bae5','#acd2b8'][index%5];
  ctx.fillStyle='#101b21';ctx.fillRect(0,0,512,128);ctx.strokeStyle=accent;ctx.lineWidth=3;ctx.strokeRect(5,5,502,118);
  ctx.fillStyle=accent;ctx.font='500 44px Arial';ctx.textAlign='center';ctx.fillText(lot.brand||'NIGHT DISTRICT',256,64,475);
  ctx.fillStyle='#aebbc1';ctx.font='16px monospace';ctx.fillText(['OPEN LATE · LOCAL SERVICES','CITY EXCHANGE · LEVEL 01','RETAIL / RESIDENCES','AFTER HOURS / ARRIVALS','MARKET / TRANSIT'][index%5],256,99);
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const mat=new THREE.MeshStandardMaterial({map:texture,emissiveMap:texture,emissive:'#ffffff',emissiveIntensity:.65,roughness:.5});
  const sign=new THREE.Mesh(new THREE.BoxGeometry(.2,1.25,Math.min(lot.depth*.55,10)),mat);
  sign.position.set((lot.x<0?1:-1)*(lot.width/2+.63),6.15,0);parent.add(sign);
}
const materials={
  stone:new THREE.MeshStandardMaterial({color:'#646d75',roughness:.87}),
  concrete:new THREE.MeshStandardMaterial({color:'#9aa1a2',roughness:.9}),
  metal:new THREE.MeshStandardMaterial({color:'#414d55',roughness:.38,metalness:.7}),
  glass:new THREE.MeshStandardMaterial({color:'#263f50',roughness:.19,metalness:.5}),
  storefront:new THREE.MeshStandardMaterial({color:'#96b9c3',roughness:.12,metalness:.2,transparent:true,opacity:.26,depthWrite:false}),
  recess:new THREE.MeshStandardMaterial({color:'#10191e',roughness:.94}),
  warm:new THREE.MeshStandardMaterial({color:'#988c73',emissive:'#e1b87c',emissiveIntensity:.72,roughness:.5}),
  cool:new THREE.MeshStandardMaterial({color:'#65828e',emissive:'#7cbac9',emissiveIntensity:.4,roughness:.42}),
};
export function initializeArchitectureMaterials(renderer){
  const loader=new THREE.TextureLoader();
  const textures=['color','normal','roughness'].map(kind=>{
    const path=`./assets/realism/concrete-${kind}.jpg`;let texture;
    trackAsset(path,'surface',()=>new Promise((resolve,reject)=>{
      let done=false;
      const finish=error=>{if(done)return;done=true;clearTimeout(timer);error?reject(new Error('Facade texture failed: '+path)):resolve();};
      const timer=setTimeout(()=>finish(true),15000);
      texture=loader.load(path,()=>finish(),undefined,()=>finish(true));
    })).catch(error=>console.warn(error));
    texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,2);
    texture.anisotropy=Math.min(4,renderer.capabilities.getMaxAnisotropy());return texture;
  });
  textures[0].colorSpace=THREE.SRGBColorSpace;
  for(const mat of [materials.stone,materials.concrete]){
    mat.map=textures[0];mat.normalMap=textures[1];mat.normalScale.set(.25,.25);mat.roughnessMap=textures[2];mat.needsUpdate=true;
  }
}
function batches(parent){
  const groups=new Map();
  return {box(mat,x,y,z,w,h,d){
    if(!groups.has(mat))groups.set(mat,[]);groups.get(mat).push({x,y,z,w,h,d});
  },finish(){for(const [mat,items] of groups){
    const mesh=new THREE.InstancedMesh(unit,mat,items.length);
    for(let i=0;i<items.length;i++){const b=items[i];dummy.position.set(b.x,b.y,b.z);dummy.scale.set(b.w,b.h,b.d);dummy.rotation.set(0,0,0);dummy.updateMatrix();mesh.setMatrixAt(i,dummy.matrix);}
    mesh.castShadow=true;mesh.receiveShadow=true;mesh.computeBoundingSphere();parent.add(mesh);
  }}};
}

export function createArchitecture(lot,index=0){
  const root=new THREE.Group();root.name='architecture-'+index;
  const w=lot.width,d=lot.depth,h=lot.height,style=index%5;
  const near=new THREE.Group(),far=new THREE.Group(),lod=new THREE.LOD();root.add(lod);
  const b=batches(near),f=batches(far),m=materials;
  // Each footprint stays in the original lot; setbacks and crowns vary by family.
  b.box(m.stone,0,3,0,w,6,d);b.box(m.metal,0,6.15,0,w+.18,.3,d+.18);
  f.box(m.stone,0,3,0,w,6,d);
  const stories=Math.max(4,Math.floor((h-7)/3.5)),floorHeight=(h-7)/stories;
  for(let floor=0;floor<stories;floor++){
    const y=7+floor*floorHeight,progress=floor/stories;
    let width=w*.88,depth=d*.85,offset=0;
    if(style===0&&progress>.65){width*=.72;depth*=.86;offset=w*.08;}
    if(style===1){width*=1-progress*.23;depth*=1-progress*.14;}
    if(style===2&&progress>.45){width*=.77;offset=-w*.10;}
    if(style===3){width*=.82;offset=Math.sin(progress*Math.PI)*w*.1;}
    b.box(m.recess,offset,y+floorHeight*.5,0,width,floorHeight,depth);
    b.box(floor%6===0?m.concrete:m.metal,offset,y,0,width+.12,floor%6===0?.22:.10,depth+.12);
    const sideWindows=Math.max(3,Math.floor(depth/2.25)),frontWindows=Math.max(3,Math.floor(width/2.15));
    for(const side of [-1,1]){
      for(let k=0;k<frontWindows;k++){
        const x=offset-width/2+(k+.5)*width/frontWindows;
        const hash=(floor*31+k*17+index*13+side*7)%19;
        b.box(hash>14?m.warm:hash>11?m.cool:m.glass,x,y+floorHeight*.5,side*(depth/2+.025),width/frontWindows-.15,floorHeight-.45,.055);
      }
      for(let k=0;k<sideWindows;k++){
        const z=-depth/2+(k+.5)*depth/sideWindows,hash=(floor*19+k*7+index*23+side*3)%17;
        b.box(hash>13?m.warm:hash>10?m.cool:m.glass,offset+side*(width/2+.025),y+floorHeight*.5,z,.055,floorHeight-.45,depth/sideWindows-.15);
      }
    }
    // Tower family with exterior structural ribs rather than texture-only changes.
    if(style===3||style===4)for(const side of [-1,1])for(let k=0;k<3;k++)b.box(m.concrete,offset-width*.4+k*width*.4,y+floorHeight*.5,side*(depth/2+.16),.17,floorHeight,.28);
  }
  // Long service runs, roof plant, screens and irregular mechanical crowns.
  for(const side of [-1,1]){
    b.box(m.metal,side*w*.43,h*.48,0,.2,h*.85,.22);
    for(let y=10;y<h*.65;y+=10){
      b.box(m.stone,side*(w*.45+.15),y,d*.26,.8,.6,1.1);
      for(let j=0;j<3;j++)b.box(m.metal,side*(w*.45+.57),y-.2+j*.18,d*.26,.035,.055,.9);
    }
  }
  b.box(m.concrete,0,h+.5,0,w*.63,1,d*.6);
  for(let k=0;k<3;k++){
    b.box(m.metal,(k-1)*w*.19,h+1.5,k%2?d*.1:-d*.1,w*.13,1.7,d*.19);
    b.box(m.recess,(k-1)*w*.19,h+2.4,k%2?d*.1:-d*.1,w*.11,.07,d*.17);
  }
  if(style===1||style===4)b.box(m.metal,w*.1,h+5,0,.12,8,.12);

  // Actual recessed shop cavities, glass, counters and interior fixtures on all sides.
  const front=lot.x<0?1:-1,face=front*w/2;
  const count=Math.max(3,Math.floor(d/4.7));
  for(let k=0;k<count;k++){
    const z=-d/2+(k+.5)*d/count,span=d/count-.3;
    b.box(m.recess,face+front*.04,2.45,z,.12,4.8,span);
    // Rear wall is in front of the dark podium surface; shelf and ceiling sit at distinct depths.
    b.box(k%2?m.warm:m.cool,face+front*.08,2.4,z,.035,3.7,span-.2);
    b.box(m.recess,face+front*.23,.7,z,.38,1.1,span-.55);
    for(let shelf=0;shelf<3;shelf++)b.box(m.metal,face+front*.25,1.4+shelf*.65,z,.42,.06,span-.55);
    for(const dz of [-span/2,span/2])b.box(m.metal,face+front*.55,2.4,z+dz,1.05,4.8,.10);
    b.box(m.concrete,face+front*.5,4.9,z,1.2,.22,span+.3);
    b.box(m.metal,face+front*.45,.13,z,1.1,.18,span+.25);
    b.box(m.storefront,face+front*.5,2.4,z,.03,4.35,span-.22);
    b.box(m.metal,face+front*.54,2.2,z,.07,4.35,.07);
    b.box(m.stone,face+front*.68,1.65,z+.19,.06,.48,.05);
    // Canopy families alternate slim glass awnings and deep metal shades.
    b.box(k%2?m.metal:m.concrete,face+front*.75,5.25,z,1.65,.11,span+.25);
    b.box(k%2?m.cool:m.warm,face+front*.75,5.16,z,1.25,.025,span*.75);
  }
  // Distant proxy retains floor rhythm with a fraction of the windows.
  f.box(m.glass,0,h/2+3,0,w*.86,h-6,d*.84);
  for(let y=9;y<h;y+=7)f.box(m.metal,0,y,0,w*.88,.22,d*.86);
  f.box(m.concrete,0,h,0,w*.62,1,d*.6);
  b.finish();f.finish();lod.addLevel(near,0);lod.addLevel(far,125);
  addBuildingSign(near,lot,index);
  root.userData={stories,style,footprint:{width:w,depth:d},kind:'architectural-lod'};
  return root;
}

export function createReflectionEnvironment(renderer){
  const scene=new THREE.Scene();scene.background=new THREE.Color('#253346');
  const panel=(x,y,z,w,h,color,ry=0)=>{
    const mesh=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshBasicMaterial({color,side:THREE.DoubleSide}));
    mesh.position.set(x,y,z);mesh.rotation.y=ry;scene.add(mesh);
  };
  panel(-8,5,0,3,12,'#7994b5',Math.PI/2);panel(8,4,0,2,10,'#9c628e',Math.PI/2);
  panel(0,6,-9,4,9,'#b7c0c7');panel(-3,3,9,1,8,'#81bfc3');
  const ceiling=new THREE.Mesh(new THREE.PlaneGeometry(30,30),new THREE.MeshBasicMaterial({color:'#8e9aab',side:THREE.DoubleSide}));ceiling.position.y=12;ceiling.rotation.x=Math.PI/2;scene.add(ceiling);
  const pmrem=new THREE.PMREMGenerator(renderer),target=pmrem.fromScene(scene,.08,.1,40);
  scene.traverse(o=>{if(o.isMesh){o.geometry.dispose();o.material.dispose();}});pmrem.dispose();
  return target;
}
