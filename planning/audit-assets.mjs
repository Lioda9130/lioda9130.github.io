import {readFile,readdir,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
const root=new URL('../',import.meta.url);
const models=new URL('docs/assets/neon4/models/',root);
const sha=execFileSync('git',['-c',`safe.directory=${decodeURIComponent(root.pathname).replace(/^\/(\w:)/,'$1').replace(/\/$/,'')}`,'rev-parse','HEAD'],{cwd:root,encoding:'utf8'}).trim();
const report={baseline:sha,method:'GLB v2 JSON chunk inventory; primitive triangle totals are source mesh counts, not scene draw counts or FPS.',models:[]};
for(const file of (await readdir(models)).filter(f=>f.endsWith('.glb')).sort()){
  const b=await readFile(new URL(file,models));
  if(b.readUInt32LE(0)!==0x46546c67||b.readUInt32LE(4)!==2||b.readUInt32LE(8)!==b.length||b.readUInt32LE(16)!==0x4e4f534a)throw Error(`Invalid GLB: ${file}`);
  const j=JSON.parse(b.subarray(20,20+b.readUInt32LE(12)).toString());
  const ps=(j.meshes||[]).flatMap(m=>m.primitives);
  report.models.push({file,bytes:b.length,sha256:createHash('sha256').update(b).digest('hex'),nodes:j.nodes?.length||0,primitives:ps.length,triangles:ps.reduce((n,p)=>n+((p.mode??4)===4?j.accessors[p.indices??p.attributes.POSITION].count/3:0),0),skins:j.skins?.length||0,animations:j.animations?.length||0,images:j.images?.length||0,extensionsUsed:j.extensionsUsed||[],missingNormals:ps.filter(p=>p.attributes.NORMAL===undefined).length});
}
report.totals=Object.fromEntries(['models','bytes','triangles','primitives','skins','animations'].map(k=>[k,k==='models'?report.models.length:report.models.reduce((s,m)=>s+m[k],0)]));
await writeFile(new URL('planning/ASSET_AUDIT.json',root),JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify(report.totals));
