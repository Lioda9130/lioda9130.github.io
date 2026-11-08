import * as THREE from './vendor/three.module.js';
import { CITY, nearStreet } from './navigation.js?v=nd4';
import { createCityLife } from './city-life.js?v=nd4';
import { loadModel,modelPath } from './neon4-loader.js?v=nd4';

// Neon District 3.1 — detailed blue-hour street and unique facades. Procedural layouts are
// intentionally distinct at street level; six local PBR maps ship with the patch.
export function createCity(canvas) {
  const compact=window.innerWidth<760 || new URLSearchParams(window.location.search).get('quality')==='low';
  const renderer=new THREE.WebGLRenderer({canvas,antialias:true,powerPreference:'high-performance'});
  renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,compact?1.12:1.50));
  renderer.outputColorSpace=THREE.SRGBColorSpace;
  renderer.toneMapping=THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure=1.19;
  const scene=new THREE.Scene();
  scene.background=new THREE.Color(0x607c9d);
  scene.fog=new THREE.FogExp2(0x6c7f99,.0015);
  const camera=new THREE.PerspectiveCamera(65,1,.1,850);
  const fogPlane=new THREE.Mesh(new THREE.SphereGeometry(490,28,16),new THREE.ShaderMaterial({
    side:THREE.BackSide,depthWrite:false,fog:false,
    vertexShader:'varying vec3 dir; void main(){dir=position; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 dir; void main(){float h=clamp(normalize(dir).y*.5+.5,0.,1.); vec3 low=vec3(.70,.53,.62);vec3 high=vec3(.22,.37,.62);gl_FragColor=vec4(mix(low,high,smoothstep(.15,.95,h)),1.);}'
  }));scene.add(fogPlane);
  scene.add(new THREE.HemisphereLight('#d2e1f2','#45556b',1.3));
  const sun=new THREE.DirectionalLight('#f1cbab',1.65);sun.position.set(-100,125,65);scene.add(sun);
  const fill=new THREE.DirectionalLight('#93b8ea',.55);fill.position.set(85,55,-115);scene.add(fill);
  let seed=913031;const rnd=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const rand=(a,b)=>a+(b-a)*rnd(),choose=a=>a[Math.floor(rnd()*a.length)%a.length];
  const geom={box:new THREE.BoxGeometry(1,1,1),plane:new THREE.PlaneGeometry(1,1),cyl:new THREE.CylinderGeometry(1,1,1,12)};
  const std=(color,roughness=.7,metalness=.12,extra={})=>new THREE.MeshStandardMaterial({color,roughness,metalness,...extra});
  const mats={
    trim:std('#35445c',.52,.43), steel:std('#566a7e',.36,.62),dark:std('#263246',.78,.14),
    concrete:std('#7f8794',.94,.02),terra:std('#846f68',.88,.02),sand:std('#9ea3a7',.88,.04),
    glass:std('#526e82',.2,.55,{transparent:true,opacity:.84,depthWrite:true}),
    shopGlass:std('#7c9eab',.19,.32,{transparent:true,opacity:.57,depthWrite:false}),
    yellow:new THREE.MeshBasicMaterial({color:'#f5e1af'}),white:new THREE.MeshBasicMaterial({color:'#dfebee'}),
    cyan:new THREE.MeshBasicMaterial({color:'#83faff'}),pink:new THREE.MeshBasicMaterial({color:'#ff7cbd'}),
    amber:new THREE.MeshBasicMaterial({color:'#ffcc86'}),
    interior:new THREE.MeshBasicMaterial({color:'#c7dce2'}),
    concreteLite:std('#9aabb9',.91,.03), roof:std('#3f4d61',.84,.13),
  };
  const loader=new THREE.TextureLoader();
  function pbr(file,color,rough=.7,metal=.1,repeat=[2,2]){
    const t=loader.load(`./assets/${file}_color.jpg`);
    const n=loader.load(`./assets/${file}_normal.jpg`);
    for(const x of [t,n]){x.wrapS=x.wrapT=THREE.RepeatWrapping;x.repeat.set(...repeat);x.anisotropy=Math.min(8,renderer.capabilities.getMaxAnisotropy());}
    t.colorSpace=THREE.SRGBColorSpace;
    return new THREE.MeshStandardMaterial({color,map:t,normalMap:n,normalScale:new THREE.Vector2(.32,.32),roughness:rough,metalness:metal});
  }
  mats.road=pbr('asphalt','#919ca5',.48,.12,[16,20]);
  mats.sidewalk=pbr('paving','#c3ccd3',.87,.03,[15,18]);
  mats.panel=pbr('panel','#8a9caf',.56,.23,[2,4]);
  function add(parent,x,y,z,w,h,d,mat,geometry=geom.box){
    const o=new THREE.Mesh(geometry,mat);o.position.set(x,y,z);o.scale.set(w,h,d);parent.add(o);return o;
  }
  function plane(parent,x,y,z,w,d,mat){const m=add(parent,x,y,z,w,d,1,mat,geom.plane);m.rotation.x=-Math.PI/2;return m;}
  function tex(width,height,draw){const c=document.createElement('canvas');c.width=width;c.height=height;draw(c.getContext('2d'),width,height);const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
  const facades=[std('#465569',.7,.17),std('#56616f',.64,.22),std('#303b4a',.7,.18),std('#647281',.6,.22),std('#5d6374',.73,.12),std('#3a5661',.65,.19),std('#687586',.63,.27),std('#384354',.73,.14)];
  const labels=['KAIRO SYSTEMS','SORA 24','KINETIC','NEON MARKET','ORBITAL','NIGHTLINE','HIKARI','RADIUS','CITY LAB','ZENITH','METRO 9','KOWLOON','NOVA TECH','NEXUS','LUMEN','OKAMI','VOLT','BETA CAFE','YUZU','SKYLINK'];
  const colors=['#7cdde5','#e5a0ba','#e9c18c','#999fdf','#a0cfbb'];const signs=new Map();
  function signmat(str,color,vertical=false){const key=str+' '+color+' '+vertical;if(signs.has(key))return signs.get(key);
    const map=tex(vertical?256:512,vertical?512:128,(g,w,h)=>{
      g.fillStyle='#162137';g.fillRect(0,0,w,h);g.strokeStyle=color;g.lineWidth=9;g.strokeRect(6,6,w-12,h-12);
      g.fillStyle=color;g.shadowColor=color;g.shadowBlur=12;g.textAlign='center';g.font=`bold ${vertical?40:50}px Arial`;
      if(vertical){const lines=str.split(' ');lines.forEach((line,i)=>g.fillText(line,w/2,140+i*75,w-35));}else g.fillText(str,w/2,82,w-40);
      g.shadowBlur=0;g.fillStyle='#d9efff';g.fillRect(22,21,26,3);g.fillRect(w-49,h-23,27,3);
    });const mat=new THREE.MeshBasicMaterial({map,side:THREE.DoubleSide});signs.set(key,mat);return mat;
  }
  function sign(parent,text,color,x,y,z,w,h,rotation=0){const o=add(parent,x,y,z,w,h,1,signmat(text,color),geom.plane);o.rotation.y=rotation;return o;}
  const city=new THREE.Group();scene.add(city);const roadGroup=new THREE.Group();city.add(roadGroup);
  plane(roadGroup,0,-.22,-48,270,335,mats.sidewalk);
  // Remove the oppressive tunnel: 34-unit central avenue, 30-unit crossing and open plaza.
  CITY.xs.forEach((x,i)=>{const width=CITY.roadWidthsX[i];plane(roadGroup,x,.003,-48,width,298,mats.road);
    const stripe=(i===2?width*.26:0);
    for(let z=CITY.minZ+8;z<CITY.maxZ-5;z+=11){if(CITY.zs.some(k=>Math.abs(k-z)<20))continue;plane(roadGroup,x-stripe,.012,z,.20,4,mats.white);if(stripe>0)plane(roadGroup,x+stripe,.012,z,.2,4,mats.white);}
  });
  CITY.zs.forEach((z,i)=>{plane(roadGroup,0,.006,z,235,CITY.roadWidthsZ[i],mats.road);
    for(let x=CITY.minX+7;x<CITY.maxX-4;x+=12){if(CITY.xs.some(k=>Math.abs(k-x)<21))continue;plane(roadGroup,x,.016,z,4,.2,mats.yellow);}
  });
  // Main curb/sidewalk modules and believable lane markings.
  for(let x of CITY.xs){for(const z of CITY.zs){if(Math.abs(x)>98||z>85)continue;
    const cx=x,cz=z,half=CITY.roadWidthsX[CITY.xs.indexOf(x)]/2;
    for(let i=-4;i<=4;i++){plane(roadGroup,cx+i*2.4,.025,cz-22,1.3,4.2,mats.white);plane(roadGroup,cx+i*2.4,.025,cz+22,1.3,4.2,mats.white);}
    if(Math.abs(x)<97){for(let i=-4;i<=4;i++){
      plane(roadGroup,cx-22,.025,cz+i*2.3,4.2,1.25,mats.white);
      plane(roadGroup,cx+22,.025,cz+i*2.3,4.2,1.25,mats.white);
    }}
  }}
  // A raised pedestrian plaza leaves an open sky pocket among the towers.
  const plaza=new THREE.Group();city.add(plaza);
  add(plaza,28,.18,42,24,.32,32,mats.concreteLite);
  for(let i=0;i<3;i++){const f=new THREE.Mesh(new THREE.CylinderGeometry(2.7+i*.9,2.7+i*.9,.26,32),mats.steel);f.position.set(28,.5+i*.16,42);plaza.add(f);}
  const sculpture=new THREE.Mesh(new THREE.TorusGeometry(4.8,.4,12,56),mats.cyan);sculpture.position.set(28,7,42);sculpture.rotation.y=.25;plaza.add(sculpture);
  add(plaza,28,3.8,42,.5,7,.5,mats.steel);
  for(let a=0;a<8;a++){const theta=a*Math.PI/4;add(plaza,28+Math.sin(theta)*12,.65,42+Math.cos(theta)*12,3.2,.7,1,mats.concrete);}
  // Each lot has an architectural identity, rather than a grid of duplicate facade boxes.
  // Each visible building has an independently generated GLB: true geometry +
  // embedded facade/advertising textures, distinct silhouette, storefront and roof.
  const modelBuildings=new THREE.Group();city.add(modelBuildings);
  const placeholders=[];
  const manifestPath='./assets/neon4/manifest.json';
  const modelMetrics={loaded:0,total:15,failed:0};
  async function populateBuildings(){
    const result=await fetch(manifestPath);
    if(!result.ok)throw new Error(`Manifest HTTP ${result.status}`);
    const manifest=await result.json();
    modelMetrics.total=manifest.buildings.length;
    for(const b of manifest.buildings){
      const placeholder=add(modelBuildings,b.x,b.height*.38,b.z,b.width*.75,b.height*.76,b.depth*.75,mats.dark);
      placeholders.push(placeholder);
    }
    await Promise.all(manifest.buildings.map(async(b,i)=>{
      try {
        const model=await loadModel(modelPath(b.file.replace(/\.glb$/,'')));
        model.position.set(b.x,0,b.z);
        // Models are placed at 1:1 world scale to avoid stretched windows.
        modelBuildings.add(model);
        const placeholder=placeholders[i];placeholder.parent?.remove(placeholder);
        // Shared box geometry is reused by other city props; never dispose it here.
        modelMetrics.loaded++;
      } catch(error){console.warn('Building model load failed',b.file,error);modelMetrics.failed++;}
    }));
  }
  populateBuildings().catch(error=>console.error('GLB building district:',error));
  // Distant towers are architecturally varied and outside the walkable district.
  const skyline=new THREE.Group();scene.add(skyline);
  const towers=[
    [-190,-290,130,20,24],[-158,-268,98,18,17],[-124,-324,165,18,24],
    [-94,-284,88,22,19],[-55,-288,176,26,21],[-21,-310,122,15,18],
    [19,-297,196,20,20],[58,-321,141,18,24],[93,-293,172,25,21],
    [128,-284,108,19,23],[171,-307,155,19,24],[214,-326,97,23,19]
  ];
  for(let i=0;i<towers.length;i++){
    const [x,z,h,w,d]=towers[i],m=facades[i%facades.length];
    add(skyline,x,h*.32,z,w*.98,h*.64,d,m);
    add(skyline,x+(i%2?3:-3),h*.78,z,w*.76,h*.28,d*.77,m);
    add(skyline,x,h*.96,z,w*.49,h*.14,d*.5,m);
  }
  for(let i=0;i<3;i++){
    loadModel(modelPath(`landmark_0${i}`)).then(model=>{
      model.position.set([-142,0,125][i],0,[-268,-343,-289][i]);
      if(i===1)model.scale.setScalar(.92);
      skyline.add(model);
    }).catch(error=>console.warn('Landmark GLB:',error));
  }
  // Street features: visible at human scale and asymmetric shop districts.
  const props=new THREE.Group();city.add(props);
  function lamp(x,z,angle=0){
    const g=new THREE.Group();g.position.set(x,0,z);g.rotation.y=angle;props.add(g);
    add(g,0,4.25,0,.25,8.5,.25,mats.steel);
    add(g,.9,8.25,0,1.8,.18,.22,mats.steel);
    add(g,1.7,8.12,0,.95,.28,.60,mats.amber);
    if(rnd()>.85){const light=new THREE.PointLight('#ffe3c4',4.0,17,2);light.position.set(1.5,8,0);g.add(light);}
  }
  // Lighting near main sidewalks instead of every highrise emitting expensive point lights.
  for(let z=-170;z<=74;z+=22){lamp(-20,z);lamp(20,z,Math.PI);}
  for(let x=-102;x<=102;x+=25){lamp(x,-30,Math.PI/2);lamp(x,-66,-Math.PI/2);}
  function signal(x,z){
    add(props,x,3.0,z,.16,6,.18,mats.steel);
    add(props,x,5.24,z+.3,.6,1.65,.63,mats.dark);
    for(let i=0;i<3;i++)add(props,x,5.73-i*.48,z+.64,.34,.30,.07,[mats.pink,mats.amber,mats.cyan][i]);
  }
  for(const [x,z] of [[-20,12],[20,12],[-20,-48],[20,-48],[-20,-108],[20,-108],[-55,-48],[55,-48]])signal(x,z);
  function stop(x,z){
    const g=new THREE.Group();g.position.set(x,0,z);props.add(g);
    add(g,0,4,0,7,.34,3.2,mats.roof);
    for(let sx of [-3.2,3.2])add(g,sx,2,0,.22,4,.22,mats.steel);
    add(g,0,2.2,-1.4,6,3.5,.12,mats.shopGlass);
    add(g,0,1,1.2,3,.26,.7,mats.concreteLite);
    sign(g,'METRO BUS',colors[0],0,3.65,1.6,5,1.4);
  }
  stop(-24,-10);stop(24,-84);
  for(let i=0;i<18;i++){
    const side=i%2===0?-1:1,z=65-Math.floor(i/2)*27;
    add(props,side*21,.45,z,.43,.9,.43,mats.steel);
    add(props,side*21,.94,z,.48,.15,.48,mats.cyan);
    if(i%3===0){const x=side*26;
      add(props,x,.8,z+3,1.1,1.6,.8,mats.dark);
      add(props,x,1,z+3.45,.75,1,.06,mats.pink);
    }
  }
  for(let i=0;i<10;i++){
    const x=i%2?-35:35,z=55-Math.floor(i/2)*37;
    add(props,x,.6,z,1.4,1.2,1.2,mats.steel);
    add(props,x,1,z+.62,1.1,.7,.10,i%2?mats.cyan:mats.pink);
  }
  for(let x of [-65,65])for(let z of [-128,-10,62]){
    // Corner cafe seating and planters soften the endless rectilinear geometry.
    add(props,x,.60,z,3.0,1.0,1.0,mats.concreteLite);
    const plant=new THREE.Mesh(new THREE.IcosahedronGeometry(1.35,1),std('#507967',.95,.02));plant.position.set(x,1.85,z);props.add(plant);
  }
  // Street-level realism: printed advertising boxes, drains, wet patches,
  // guard rails and a small set of broadleaf trees at the open plaza.
  const roadDecals=new THREE.Group();city.add(roadDecals);
  const wetMat=new THREE.MeshBasicMaterial({color:'#8eacbb',transparent:true,opacity:.13,depthWrite:false});
  const wetMat2=new THREE.MeshBasicMaterial({color:'#738fa6',transparent:true,opacity:.10,depthWrite:false});
  for(let i=0;i<58;i++){
    const x=rand(-14,14),z=rand(-162,82);
    if(CITY.zs.some(v=>Math.abs(v-z)<16))continue;
    const w=rand(.6,2.3),d=rand(1.6,7);
    plane(roadDecals,x,.029,z,w,d,i%2?wetMat:wetMat2);
  }
  for(let i=0;i<30;i++){
    const x=i%2===0?-18.7:18.7,z=72-Math.floor(i/2)*17;
    add(props,x,.025,z,.45,.025,1.3,mats.dark);
    if(i%3===0)add(props,x,.03,z+2.7,.65,.025,.55,mats.steel);
  }
  const bark=std('#504b45',.97,.01);
  const foliage=[std('#34595b',.98,.01),std('#466358',.98,.01),std('#526c63',.98,.01)];
  for(let i=0;i<7;i++){
    const x=19+(i%3)*8, z=25+Math.floor(i/3)*15;
    add(props,x,.45,z,3.0,.9,2.7,mats.concreteLite);
    add(props,x,2.0,z,.26,3,.25,bark);
    const f=new THREE.Mesh(new THREE.IcosahedronGeometry(1.7,2),foliage[i%3]);f.scale.set(1.2,1.15,1.0);f.position.set(x,4.1,z);props.add(f);
  }
  // Some neon signs need physical housings: large displays at a few corners,
  // not the same brand repeated on every building.
  for(let i=0;i<4;i++){
    const x=i%2?-24:24,z=[48,-38,-116,70][i];
    add(props,x,5.2,z,2.1,6.1,1.6,mats.dark);
    sign(props,['NIGHT EXPRESS','KAIRO','AIRLINK','SORA'][i],colors[i],x,6.2,z+1.05,2.0,4.0);
  }
  // Original 3D street-furniture GLBs reused in small batches, no CDN.
  async function addStreetModels(name,placements){
    try{
      const base=await loadModel(modelPath(name));
      for(const item of placements){
        const inst=base.clone(true);
        inst.position.set(item[0],0,item[1]);
        inst.rotation.y=item[2]||0;
        if(item[3])inst.scale.setScalar(item[3]);
        scene.add(inst);
      }
    }catch(error){console.warn('Street object GLB:',name,error);}
  }
  addStreetModels('vending',[[21,74,Math.PI],[-21,17,0],[62,-15,Math.PI],[-61,-97,0],[-19,-154,0]]);
  addStreetModels('busstop',[[-23,65,Math.PI/2],[24,-83,-Math.PI/2]]);
  addStreetModels('planter',[[24,27],[30,52],[-21,41],[22,-8],[-20,-63],[29,-127]]);
  addStreetModels('bench',[[28,38],[28,52],[-23,25],[22,-128]]);
  addStreetModels('holo_ad',[[24,-47],[-21,-110],[28,71]]);
  // Distant elevated metro is a slim silhouette, not an overhead wall.
  add(props,0,17.5,-161,245,1.0,5.0,mats.steel);
  for(let x=-108;x<=110;x+=30)add(props,x,8.5,-161,.55,17,.55,mats.concrete);
  const train=new THREE.Group();props.add(train);
  for(let i=0;i<4;i++){
    add(train,i*9,1,0,8.5,2.4,4.1,mats.sand);
    add(train,i*9,1.25,2.08,6.8,.9,.10,mats.glass);
    add(train,i*9,1.25,-2.08,6.8,.9,.10,mats.glass);
  }
  train.position.set(-90,18.6,-161);
  const activity=createCityLife(scene,compact);
  const marker=new THREE.Mesh(new THREE.RingGeometry(.9,1.1,42),new THREE.MeshBasicMaterial({color:'#a1ffff',transparent:true,opacity:.8,side:THREE.DoubleSide,depthWrite:false}));
  marker.rotation.x=-Math.PI/2;marker.position.y=.16;marker.visible=false;scene.add(marker);
  const rainCount=compact?400:900,drop=new Float32Array(rainCount*3);
  for(let j=0;j<drop.length;j+=3){drop[j]=rand(-124,124);drop[j+1]=rand(1,55);drop[j+2]=rand(-195,100);}
  const rainGeo=new THREE.BufferGeometry();rainGeo.setAttribute('position',new THREE.BufferAttribute(drop,3));
  const rain=new THREE.Points(rainGeo,new THREE.PointsMaterial({color:'#d9f1ff',size:.036,transparent:true,opacity:.18,depthWrite:false}));scene.add(rain);
  const raycaster=new THREE.Raycaster(),mouse=new THREE.Vector2(),hit=new THREE.Vector3();
  const floor=new THREE.Plane(new THREE.Vector3(0,1,0),0);const projected=new THREE.Vector3();
  let width=1,height=1,clock=0;
  function resize(){const r=canvas.getBoundingClientRect();width=Math.max(1,r.width);height=Math.max(1,r.height);renderer.setSize(width,height,false);camera.aspect=width/height;camera.updateProjectionMatrix();}
  function render(dt,animated){
    if(animated){clock+=dt;activity.update(dt);sculpture.rotation.z+=dt*.08;
      train.position.x=-105+((clock*12)%210);
      for(let i=1;i<drop.length;i+=3){drop[i]-=dt*14;if(drop[i]<0)drop[i]=50;}
      rainGeo.attributes.position.needsUpdate=true;
      marker.scale.setScalar(1+Math.sin(clock*4)*.1);
    }
    fogPlane.position.copy(camera.position);renderer.render(scene,camera);
  }
  return {camera,resize,render,marker(x,z,visible){marker.position.set(x,.16,z);marker.visible=visible;},
    streetHit(clientX,clientY){const r=canvas.getBoundingClientRect();mouse.set((clientX-r.left)/width*2-1,-(clientY-r.top)/height*2+1);
      raycaster.setFromCamera(mouse,camera);if(!raycaster.ray.intersectPlane(floor,hit))return null;
      if(hit.distanceTo(camera.position)>165||!nearStreet(hit.x,hit.z))return null;return {x:hit.x,z:hit.z};
    },
    project(x,y,z){projected.set(x,y,z).project(camera);return {x:(projected.x*.5+.5)*width,y:(-projected.y*.5+.5)*height,visible:projected.z>-1&&projected.z<1&&Math.abs(projected.x)<1&&Math.abs(projected.y)<1};},
    stats:activity.stats,modelMetrics
  };
}
