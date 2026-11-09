import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';

// Browser-independent event-loop regression; this does not render WebGL.
const source=await readFile(new URL('../docs/app.js',import.meta.url),'utf8');
class Element {
  constructor(){this.events={};this.dataset={};this.style={};this.classList={add(){}};this.open=false;this.children=[];}
  addEventListener(name,fn){this.events[name]=fn;}
  setAttribute(){}
  append(...children){this.children.push(...children);}
  focus(){document.activeElement=this;}
  get isConnected(){return true;}
}
const nodes=new Map();const get=id=>{if(!nodes.has(id))nodes.set(id,new Element());return nodes.get(id);};
const document={hidden:false,body:new Element(),activeElement:null,events:{},querySelector:get,querySelectorAll:()=>[],createElement:()=>new Element(),addEventListener(name,fn){this.events[name]=fn;}};
const window={events:{},addEventListener(name,fn){this.events[name]=fn;}};
let frameId=0,frames=new Map(),renders=0,assetListener,loaded=0;
const city={camera:{position:{set(){}},lookAt(){},updateMatrixWorld(){}},resize(){},marker(){},project(){return {visible:false};},render(){renders++;},get loadedActors(){return {pedestrians:loaded,vehicles:loaded};}};
const context=vm.createContext({document,window,console,URLSearchParams,location:{search:''},matchMedia:()=>({matches:true}),localStorage:{getItem:()=>null,setItem(){}},requestAnimationFrame:fn=>{frames.set(++frameId,fn);return frameId;},cancelAnimationFrame:id=>frames.delete(id),IntersectionObserver:class{observe(){}},Math,Number,String,Boolean});
async function module(exports){const mod=new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context});await mod.link(()=>{});await mod.evaluate();return mod;}
const assets=await module({observeAssets:fn=>{assetListener=fn;},assetSnapshot:()=>({pending:loaded?0:1,failed:0})});
const navigation=await module({destinations:[],homePosition:{x:0,z:82},destinationPosition:d=>d,moveInStreet(){},routeTo:()=>[],CITY:{minX:-115,maxX:115,minZ:-190,maxZ:94}});
const cityModule=await module({createCity:()=>city});
const app=new vm.SourceTextModule(source,{context,importModuleDynamically:async()=>cityModule});
await app.link(spec=>spec.includes('asset-state')?assets:navigation);await app.evaluate();
function tick(time){const batch=[...frames.values()];frames.clear();for(const fn of batch)fn(time);}
tick(16);assert.equal(renders,1);assert.equal(frames.size,0,'Reduced-motion scene stops after its first frame');
loaded=22;assetListener();assert.equal(frames.size,1,'Async load completion requests a new frame');
tick(32);assert.equal(get('#city').dataset.pedestrians,'22');assert.equal(get('#city').dataset.assetState,'ready');assert.equal(renders,2);
let prevented=false;document.activeElement=new Element();window.events.keydown({key:'ArrowDown',preventDefault(){prevented=true;}});
assert.equal(prevented,false,'Keyboard navigation outside canvas remains available');
get('#city').focus();window.events.keydown({key:'w',preventDefault(){prevented=true;}});assert.equal(prevented,true);tick(48);assert.equal(frames.size,1);
document.hidden=true;document.events.visibilitychange();tick(64);assert.equal(frames.size,0);
document.hidden=false;document.events.visibilitychange();tick(80);assert.equal(frames.size,0,'Returning to tab does not keep stale movement keys pressed');
console.log('PASS: reduced-motion async redraw, actual loaded-count DOM, canvas-only keyboard controls and hidden-tab key reset (mock DOM).');
