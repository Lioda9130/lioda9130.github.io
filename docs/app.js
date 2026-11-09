import {observeAssets,assetSnapshot} from './asset-state.js';
import { destinations, homePosition, destinationPosition, moveInStreet, routeTo, CITY } from './navigation.js?v=nd5-m0';

const canvas=document.querySelector('#city');
const status=document.querySelector('#travel-status');
const intro=document.querySelector('#intro');
const dialog=document.querySelector('#destination-dialog');
const motionButton=document.querySelector('#motion-toggle');
const resetButton=document.querySelector('#reset-view');
const mapPlayer=document.querySelector('#map-player');
const coordinates=document.querySelector('#coordinates');
const markers=[];
const position={...homePosition};
let ready=false, city, frame=null, lastTime=0, inView=true, entered=false, travel=null, returnFocus=null;
let animated=!matchMedia('(prefers-reduced-motion: reduce)').matches;
try {const value=localStorage.getItem('neon-district-motion');if(value==='on'||value==='off')animated=value==='on';}catch{}
const keys=new Set();
const look={yaw:0,pitch:0,targetYaw:0,targetPitch:0};
const drag={active:false,moved:0,x:0,y:0,id:null};
let diagnostics=null, assetsDirty=true;
observeAssets(()=>{
  assetsDirty=true;
  // Asset callbacks finish in a microtask before the next animation frame.
  requestFrame();
});

function requestFrame(){if(ready&&inView&&!document.hidden&&frame===null)frame=requestAnimationFrame(tick);}
function enter(){entered=true;intro.classList.add('dismissed');}
document.querySelector('#enter-city').addEventListener('click',e=>{if(!ready)return;e.preventDefault();enter();canvas.focus({preventScroll:true});updateStatus('EXPLORE FREELY · DRAG TO LOOK · WASD TO WALK');requestFrame();});
function updateStatus(text){if(status.textContent!==text)status.textContent=text;}
function setMarker(){const end=travel?.path[travel.index];city.marker(end?.x||0,end?.z||0,Boolean(end));}
function travelTo(point,onArrival=null){
  if(!ready)return;
  enter();
  let path=routeTo(position,point);
  // Don't step back through the player while selecting an adjacent street section.
  path=path.filter((p,i)=>i===path.length-1||Math.hypot(p.x-position.x,p.z-position.z)>.8);
  travel={path,index:0,onArrival};setMarker();
  updateStatus('TRAVELLING TO SELECTED STREET');requestFrame();
}
function openDestination(destination){updateStatus(`${destination.name.toUpperCase()} · KEEP EXPLORING`);}
function goToDestination(id,trigger){const d=destinations.find(d=>d.id===id);if(!d)return;returnFocus=trigger;travelTo(destinationPosition(d),()=>openDestination(d));}
for(const control of document.querySelectorAll('[data-destination]')){
  control.addEventListener('click',e=>{
    if(!ready){if(control.tagName==='BUTTON')document.getElementById(control.dataset.destination)?.scrollIntoView();return;}
    e.preventDefault();goToDestination(control.dataset.destination,control);
  });
}
const close=()=>dialog.close();
document.querySelector('#close-dialog').addEventListener('click',close);
document.querySelector('#continue-exploring').addEventListener('click',close);
dialog.addEventListener('click',e=>{if(e.target===dialog)close();});
dialog.addEventListener('close',()=>{updateStatus('DRAG TO LOOK · CLICK ROAD TO MOVE');(returnFocus?.isConnected?returnFocus:canvas).focus({preventScroll:true});returnFocus=null;requestFrame();});
function syncMotion(){motionButton.textContent=`Motion: ${animated?'on':'off'}`;motionButton.setAttribute('aria-pressed',String(!animated));requestFrame();}
motionButton.addEventListener('click',()=>{animated=!animated;try{localStorage.setItem('neon-district-motion',animated?'on':'off');}catch{}syncMotion();});
syncMotion();
function reset(){
  Object.assign(position,homePosition);travel=null;keys.clear();
  look.yaw=look.targetYaw=0;look.pitch=look.targetPitch=0;
  entered=false;intro.classList.remove('dismissed');city?.marker(0,0,false);
  updateStatus('VIEW RESET · START EXPLORING');requestFrame();
}
resetButton.addEventListener('click',reset);
canvas.addEventListener('pointerdown',e=>{
  if(!ready||e.button!==0)return;
  canvas.focus({preventScroll:true});canvas.setPointerCapture(e.pointerId);
  drag.active=true;drag.moved=0;drag.x=e.clientX;drag.y=e.clientY;drag.id=e.pointerId;
});
canvas.addEventListener('pointermove',e=>{
  if(!ready||!drag.active||e.pointerId!==drag.id)return;
  const dx=e.clientX-drag.x,dy=e.clientY-drag.y;
  drag.x=e.clientX;drag.y=e.clientY;drag.moved+=Math.abs(dx)+Math.abs(dy);
  if(drag.moved>3){
    enter();
    // Drag to the right -> scenery moves left (both axes follow inverted cursor).
    look.targetYaw+=dx*.005;
    look.targetPitch=Math.max(-1.25,Math.min(1.25,look.targetPitch-dy*.004));
    requestFrame();
  }
});
canvas.addEventListener('pointerup',e=>{
  if(!drag.active||e.pointerId!==drag.id)return;
  drag.active=false;
  if(drag.moved<=3&&e.button===0){
    const hit=city.streetHit(e.clientX,e.clientY);
    if(hit)travelTo(hit);
    else updateStatus('CLICK A VISIBLE ROAD OR USE WASD');
  }
  requestFrame();
});
canvas.addEventListener('pointercancel',()=>{drag.active=false;});
window.addEventListener('keydown',e=>{
  if(!ready||dialog.open||document.activeElement!==canvas)return;
  const k=e.key.toLowerCase();
  if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright','shift'].includes(k)){
    keys.add(k);if(k!=='shift'){enter();e.preventDefault();}requestFrame();
  } else if(k==='r'&&document.activeElement===canvas){e.preventDefault();reset();}
  else if(k==='escape'){travel=null;city.marker(0,0,false);updateStatus('TRAVEL CANCELLED');requestFrame();}
});
window.addEventListener('keyup',e=>keys.delete(e.key.toLowerCase()));
window.addEventListener('blur',()=>{keys.clear();lastTime=0;diagnostics?.interrupt();});
function tick(now){
  frame=null;
  const dt=Math.min(.05,lastTime?(now-lastTime)/1000:1/60);lastTime=now;
  const movement={f:Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),s:Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft'))};
  const walking=Boolean(movement.f||movement.s)&&!dialog.open;
  if(walking){
    const sin=Math.sin(look.yaw),cos=Math.cos(look.yaw);
    const dx=sin*movement.f+cos*movement.s,dz=-cos*movement.f+sin*movement.s;
    const speed=keys.has('shift')?32:17,scale=speed*dt/(Math.hypot(dx,dz)||1);
    moveInStreet(position,dx*scale,dz*scale);
    if(travel){travel=null;city.marker(0,0,false);}
    updateStatus('EXPLORING THE DISTRICT');
  }
  if(travel&&!dialog.open){
    const target=travel.path[travel.index];
    if(target){
      const dx=target.x-position.x,dz=target.z-position.z;
      const len=Math.hypot(dx,dz),step=Math.min(len,72*dt);
      if(len>.001)moveInStreet(position,dx/len*step,dz/len*step);
      if(Math.hypot(target.x-position.x,target.z-position.z)<.8){
        position.x=target.x;position.z=target.z;travel.index++;
        if(travel.index>=travel.path.length){
          const done=travel.onArrival;travel=null;city.marker(0,0,false);updateStatus('ARRIVED');done?.();
        }else setMarker();
      }
    }else{travel=null;city.marker(0,0,false);}
  }
  const smooth=1-Math.exp(-dt*18);
  look.yaw+=(look.targetYaw-look.yaw)*smooth;
  look.pitch+=(look.targetPitch-look.pitch)*smooth;
  city.camera.position.set(position.x,2.75,position.z);
  const ahead=28*Math.cos(look.pitch);
  city.camera.lookAt(position.x+Math.sin(look.yaw)*ahead,2.75+Math.sin(look.pitch)*28,position.z-Math.cos(look.yaw)*ahead);
  city.camera.updateMatrixWorld();
  for(const {destination,element} of markers){
    const p=city.project(destination.x,3.7,destination.z);
    const visible=entered&&p.visible&&Math.hypot(position.x-destination.x,position.z-destination.z)<110;
    element.hidden=!visible;
    if(visible)element.style.transform=`translate(${p.x}px,${p.y}px) translate(-50%,-50%)`;
  }
  coordinates.textContent=`${Math.abs(position.z).toFixed(1)} ${position.z<0?'S':'N'} · ${Math.abs(position.x).toFixed(1)} ${position.x<0?'W':'E'}`;
  mapPlayer.style.left=`${((position.x-CITY.minX)/(CITY.maxX-CITY.minX)*100).toFixed(1)}%`;
  mapPlayer.style.top=`${((CITY.maxZ-position.z)/(CITY.maxZ-CITY.minZ)*100).toFixed(1)}%`;
  mapPlayer.style.transform=`translate(-50%,-50%) rotate(${look.yaw}rad)`;
  city.render(dt,animated&&!dialog.open);
  const assetsChanged=assetsDirty;
  if(assetsDirty){assetsDirty=false;const loaded=city.loadedActors;
    canvas.dataset.pedestrians=String(loaded.pedestrians);canvas.dataset.vehicles=String(loaded.vehicles);
    const assets=assetSnapshot();canvas.dataset.assetState=assets.pending?'loading':assets.failed?'partial':'ready';}
  diagnostics?.frame(now,animated&&inView&&!document.hidden&&!dialog.open,assetsChanged);
  if(animated||travel||walking||drag.active||Math.abs(look.yaw-look.targetYaw)>.0001||Math.abs(look.pitch-look.targetPitch)>.0001)requestFrame();
}
function unavailable(message){ready=false;travel=null;if(frame!==null)cancelAnimationFrame(frame);frame=null;document.body.classList.add('city-unavailable');updateStatus(message);}
try{
  const module=await import('./city.js?v=nd5-m0');city=module.createCity(canvas);city.resize();canvas.dataset.pedestrians='0';canvas.dataset.vehicles='0';canvas.dataset.glbModels='true';
  for(const destination of destinations){
    const element=document.createElement('button');element.className='world-marker';element.type='button';element.hidden=true;
    const diamond=document.createElement('span');diamond.className='diamond';diamond.setAttribute('aria-hidden','true');
    const label=document.createElement('span');const num=document.createElement('small');num.textContent=`DISTRICT ${destination.number}`;
    const name=document.createElement('strong');name.textContent=`${destination.name} ↗`;label.append(num,name);element.append(diamond,label);
    element.setAttribute('aria-label',`Travel to ${destination.name}`);
    element.addEventListener('click',()=>goToDestination(destination.id,element));document.querySelector('#world-markers').append(element);markers.push({destination,element});
  }
  ready=true;updateStatus('DRAG TO LOOK · CLICK ROAD TO MOVE · WASD TO WALK');
  window.addEventListener('resize',()=>{city.resize();requestFrame();});
  document.addEventListener('visibilitychange',()=>{lastTime=0;keys.clear();if(document.hidden)diagnostics?.interrupt();requestFrame();});
  new IntersectionObserver(entries=>{inView=entries[0].isIntersecting;if(!inView)diagnostics?.interrupt();if(!inView&&frame!==null){cancelAnimationFrame(frame);frame=null;}lastTime=0;requestFrame();},{threshold:.01}).observe(canvas);
  canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();unavailable('3D PAUSED. USE TEXT VIEW OR RELOAD.');});
  if(new URLSearchParams(location.search).get('debug')==='1'){
    const {createDiagnostics}=await import('./diagnostics.js');
    diagnostics=createDiagnostics({readCity:()=>city.diagnostics(),readCamera:()=>({position:{...position},yaw:look.yaw,pitch:look.pitch}),
      setMotion(value){animated=value;lastTime=0;syncMotion();},requestFrame,
      setView(point){Object.assign(position,point);travel=null;keys.clear();look.yaw=look.targetYaw=look.pitch=look.targetPitch=0;city.marker(0,0,false);city.setTime(0);animated=false;lastTime=0;enter();syncMotion();requestFrame();}});
  }
  requestFrame();
}catch(error){console.error('Failed to initialize Neon District 4.0',error);unavailable('3D UNAVAILABLE. TEXT VIEW REMAINS ACCESSIBLE.');}
