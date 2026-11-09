import {assetSnapshot} from './asset-state.js';
import {createFrameSampler} from './frame-metrics.js';

export function createDiagnostics({readCity,readCamera,setView,setMotion,requestFrame}) {
  const sampler=createFrameSampler();
  const panel=document.createElement('aside');
  panel.id='diagnostics';panel.setAttribute('aria-label','City diagnostics');
  panel.style.cssText='position:fixed;z-index:100;top:90px;left:16px;width:min(345px,90vw);max-height:65vh;overflow:auto;padding:12px;background:#07101fed;color:#d9fcff;border:1px solid #5bcdd3;font:12px/1.5 monospace';
  const title=document.createElement('strong');title.textContent='ND5 · DIAGNOSTICS';panel.append(title);
  const presets={Spawn:{x:0,z:82},Crossing:{x:0,z:-20},Market:{x:-48,z:12},Skyrail:{x:0,z:-108}};
  const controls=document.createElement('div');panel.append(controls);
  function button(label,fn){const b=document.createElement('button');b.type='button';b.textContent=label;b.style.cssText='margin:5px 5px 5px 0;padding:5px;border:1px solid #587b89;background:#172436;color:white';b.addEventListener('click',fn);controls.append(b);return b;}
  for(const [name,point] of Object.entries(presets))button(name,()=>{sampler.interrupt();setView(point);refresh();});
  const benchmark=button('Measure 10s + 30s',()=>{
    if(assetSnapshot().pending)return;
    setMotion(true);sampler.start();requestFrame();refresh();
  });
  button('Export JSON',()=>{
    const blob=new Blob([JSON.stringify(report(),null,2)],{type:'application/json'});
    const url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download='neon-district-diagnostics.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  });
  const output=document.createElement('pre');output.style.cssText='white-space:pre-wrap;margin:6px 0';panel.append(output);
  const note=document.createElement('p');note.textContent='In-frustum is not occlusion-tested visibility. Texture count is not VRAM. Timing reflects this browser only. Presets freeze simulation at t=0. Keep the tab visible while measuring.';panel.append(note);
  document.body.append(panel);
  let latest=null, refreshed=-Infinity;
  function report(){
    return {version:'nd5-m0',capturedAt:new Date().toISOString(),url:location.href,userAgent:navigator.userAgent,hardware:'Not identified; record GPU/OS/power mode separately',camera:readCamera(),city:readCity(),assets:assetSnapshot(),timing:sampler.snapshot()};
  }
  function refresh(){
    latest=report();const {assets,city,timing}=latest;
    benchmark.disabled=assets.pending>0;
    output.textContent=[`Assets: ${assets.pending} pending / ${assets.loaded} loaded / ${assets.failed} failed`,
      `People: ${city.loaded.pedestrians}/${city.configured.pedestrians}`,
      `Vehicles: ${city.loaded.vehicles}/${city.configured.vehicles} · drones: ${city.loaded.drones}/${city.configured.drones}`,
      `Actors in frustum: ${city.inFrustum}`,
      `Draw calls: ${city.render.calls} · triangles: ${city.render.triangles}`,
      `Textures: ${city.memory.textures} · geometry: ${city.memory.geometries}`,
      `${timing.state} · ${(timing.elapsedMs/1000).toFixed(1)}s · ${timing.samples} frames`,
      `Median: ${timing.medianFps?.toFixed(1)??'—'} FPS · 1% low: ${timing.onePercentLowFps?.toFixed(1)??'—'} FPS`,
      ...assets.items.filter(a=>a.state==='failed').map(a=>a.error)].join('\n');
  }
  refresh();
  return {
    frame(now,eligible,force=false){sampler.frame(now,eligible&&assetSnapshot().pending===0);if(force||now-refreshed>=1000){refreshed=now;refresh();}},
    interrupt(){sampler.interrupt();refresh();},
    refresh,
  };
}
