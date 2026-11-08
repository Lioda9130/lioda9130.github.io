// Neon District 3 — deterministic pedestrian/road navigation.
// All coordinates are world units. No character may move through a building block.
export const CITY = Object.freeze({
  xs: [-96, -48, 0, 48, 96],
  zs: [-168, -108, -48, 12, 72],
  minX: -115, maxX: 115, minZ: -190, maxZ: 94,
  roadWidthsX: [16, 18, 34, 18, 16],
  roadWidthsZ: [16, 18, 30, 18, 16],
});
export const homePosition = {x: 0, z: 82};
export const destinations = [
  {id:'work',name:'The work',number:'01',x:-48,z:12},
  {id:'about',name:'The person',number:'02',x:48,z:12},
  {id:'connect',name:'The connection',number:'03',x:0,z:-108},
];
export function nearStreet(x,z,margin=0){
  if(!Number.isFinite(x)||!Number.isFinite(z)||x<CITY.minX||x>CITY.maxX||z<CITY.minZ||z>CITY.maxZ)return false;
  const vertical=CITY.xs.some((a,i)=>Math.abs(x-a)<CITY.roadWidthsX[i]/2+1.6-margin);
  const horizontal=CITY.zs.some((a,i)=>Math.abs(z-a)<CITY.roadWidthsZ[i]/2+1.6-margin);
  const plaza=x>=14+margin&&x<=44-margin&&z>=19+margin&&z<=66-margin;
  return vertical||horizontal||plaza;
}
export function moveInStreet(pos,dx,dz){
  let x=Math.min(CITY.maxX,Math.max(CITY.minX,pos.x+dx));
  let z=Math.min(CITY.maxZ,Math.max(CITY.minZ,pos.z+dz));
  if(nearStreet(x,z,.55)){pos.x=x;pos.z=z;return true;}
  let changed=false;
  if(nearStreet(x,pos.z,.55)){pos.x=x;changed=true;}
  if(nearStreet(pos.x,z,.55)){pos.z=z;changed=true;}
  return changed;
}
export const destinationPosition = d=>({x:d.x,z:d.z});
export function nearestStreet({x,z}){
  if(nearStreet(x,z,1))return {x,z};
  let best={x:0,z:72},dist=Infinity;
  function check(p){const d=(p.x-x)**2+(p.z-z)**2;if(d<dist){dist=d;best=p;}}
  CITY.xs.forEach((v,i)=>check({x:Math.min(CITY.maxX,Math.max(CITY.minX,v)),z:Math.min(CITY.maxZ,Math.max(CITY.minZ,z))}));
  CITY.zs.forEach(v=>check({x:Math.min(CITY.maxX,Math.max(CITY.minX,x)),z:Math.min(CITY.maxZ,Math.max(CITY.minZ,v))}));
  return best;
}
function lineWalkable(a,b){
  const distance=Math.hypot(b.x-a.x,b.z-a.z);
  const n=Math.ceil(distance/.4);
  for(let i=0;i<=n;i++){
    const t=i/Math.max(1,n);
    if(!nearStreet(a.x+(b.x-a.x)*t,a.z+(b.z-a.z)*t,.75))return false;
  }
  return true;
}
// A* over a coarse city grid; straight-line smoothing removes needless zig-zags.
const STEP=3;
const NX=Math.floor((CITY.maxX-CITY.minX)/STEP)+1;
const NZ=Math.floor((CITY.maxZ-CITY.minZ)/STEP)+1;
const COST=NX*NZ;
const cells=new Uint8Array(COST);
for(let j=0;j<NZ;j++)for(let i=0;i<NX;i++){
  const x=CITY.minX+i*STEP,z=CITY.minZ+j*STEP;
  cells[j*NX+i]=nearStreet(x,z,1)?1:0;
}
const ij=p=>({i:Math.max(0,Math.min(NX-1,Math.round((p.x-CITY.minX)/STEP))),j:Math.max(0,Math.min(NZ-1,Math.round((p.z-CITY.minZ)/STEP)))});
const coord=id=>({x:CITY.minX+(id%NX)*STEP,z:CITY.minZ+Math.floor(id/NX)*STEP});
function closestCell(p){
  const q=ij(p);let best=-1,dist=Infinity;
  for(let r=0;r<12;r++){
    for(let dj=-r;dj<=r;dj++)for(let di=-r;di<=r;di++){
      const i=q.i+di,j=q.j+dj;
      if(i<0||i>=NX||j<0||j>=NZ)continue;
      const id=j*NX+i;if(!cells[id])continue;
      const pos=coord(id),d=(pos.x-p.x)**2+(pos.z-p.z)**2;
      if(d<dist){dist=d;best=id;}
    }
    if(best>=0)return best;
  }
  return best;
}
class Heap{
  constructor(){this.a=[];}
  push(n,v){const a=this.a;let i=a.length;a.push([n,v]);while(i>0){const p=(i-1)>>1;if(a[p][0]<=n)break;a[i]=a[p];i=p;}a[i]=[n,v];}
  pop(){const a=this.a;const top=a[0],last=a.pop();if(a.length){let i=0;while(i*2+1<a.length){let j=i*2+1;if(j+1<a.length&&a[j+1][0]<a[j][0])j++;if(a[j][0]>=last[0])break;a[i]=a[j];i=j;}a[i]=last;}return top?.[1];}
  get length(){return this.a.length;}
}
export function routeTo(start,requested){
  const end=nearestStreet(requested);
  if(lineWalkable(start,end))return [end];
  const origin=closestCell(start),goal=closestCell(end);
  if(origin<0||goal<0)return [end];
  const cost=new Float32Array(COST).fill(Infinity);
  const prev=new Int32Array(COST).fill(-1);
  const seen=new Uint8Array(COST),heap=new Heap();
  cost[origin]=0;heap.push(0,origin);
  while(heap.length){
    const a=heap.pop();if(seen[a])continue;seen[a]=1;
    if(a===goal)break;
    const i=a%NX,j=Math.floor(a/NX);
    for(const [di,dj] of [[1,0],[-1,0],[0,1],[0,-1]]){
      const ni=i+di,nj=j+dj;if(ni<0||ni>=NX||nj<0||nj>=NZ)continue;
      const b=nj*NX+ni;if(!cells[b]||seen[b])continue;
      if(di&&dj&&(!cells[j*NX+ni]||!cells[nj*NX+i]))continue;
      const c=cost[a]+(di&&dj?1.4142:1);
      if(c<cost[b]){
        cost[b]=c;prev[b]=a;
        const h=Math.hypot((goal%NX)-ni,Math.floor(goal/NX)-nj);
        heap.push(c+h,b);
      }
    }
  }
  if(!Number.isFinite(cost[goal]))return [nearestStreet(start)];
  const raw=[];let v=goal,limit=COST;
  while(v>=0&&limit--){raw.push(coord(v));if(v===origin)break;v=prev[v];}
  raw.reverse();raw.unshift(start);raw.push(end);
  const result=[];let at=0;
  while(at<raw.length-1){
    let next=raw.length-1;
    while(next>at+1&&!lineWalkable(raw[at],raw[next]))next--;
    result.push(raw[next]);at=next;
  }
  return result;
}
