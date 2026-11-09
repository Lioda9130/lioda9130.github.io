// Use raw rAF intervals, never the simulation's clamped delta.
export function summarizeFrames(samples) {
  const ordered = samples.filter(n => Number.isFinite(n) && n > 0).sort((a,b) => a-b);
  if (!ordered.length) return { samples: 0, medianFps: null, onePercentLowFps: null };
  const middle = Math.floor(ordered.length/2);
  const median = ordered.length%2 ? ordered[middle] : (ordered[middle-1]+ordered[middle])/2;
  const worst = ordered.slice(-Math.max(1,Math.ceil(ordered.length*.01)));
  return { samples: ordered.length, medianFps: 1000/median,
    onePercentLowFps: 1000/(worst.reduce((a,b)=>a+b,0)/worst.length) };
}
export function createFrameSampler({ warmupMs=10000, durationMs=30000 }={}) {
  let previous=null, elapsed=0, samples=[], state='idle';
  return {
    start(){ previous=null;elapsed=0;samples=[];state='warming'; },
    interrupt(){ if(state==='warming'||state==='recording') state='interrupted'; previous=null; },
    frame(now, eligible){
      if(state!=='warming'&&state!=='recording')return;
      if(!eligible){this.interrupt();return;}
      if(previous===null){previous=now;return;}
      const delta=now-previous;previous=now;
      if(delta<=0)return;
      elapsed+=delta;
      if(elapsed>warmupMs){state='recording';samples.push(delta);}
      if(elapsed>=warmupMs+durationMs)state='complete';
    },
    snapshot(){return {state,elapsedMs:elapsed,warmupMs,durationMs,...summarizeFrames(samples),frameMs:[...samples]};}
  };
}
