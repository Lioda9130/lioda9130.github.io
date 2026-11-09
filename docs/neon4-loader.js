import * as THREE from './vendor/three.module.js';
import {trackAsset, fetchAsset} from './asset-state.js';

// Small, dependency-free glTF 2.0 binary loader for the original GLB assets in this release.
// Supports the attributes/materials exported by our model builder. Avoids CDN imports.
const cache = new Map();
const decoder = new TextDecoder();
const COMPONENTS = {5120:Int8Array,5121:Uint8Array,5122:Int16Array,5123:Uint16Array,5125:Uint32Array,5126:Float32Array};
const SIZE = {SCALAR:1,VEC2:2,VEC3:3,VEC4:4,MAT4:16};

function access(doc,bin,id) {
  const a=doc.accessors[id], view=doc.bufferViews[a.bufferView];
  const Type=COMPONENTS[a.componentType];
  if(!Type)throw new Error('Unsupported GLB componentType '+a.componentType);
  const count=a.count*SIZE[a.type];
  const stride=view.byteStride || SIZE[a.type]*Type.BYTES_PER_ELEMENT;
  const byteOffset=(view.byteOffset||0)+(a.byteOffset||0);
  if(stride===SIZE[a.type]*Type.BYTES_PER_ELEMENT && byteOffset % Type.BYTES_PER_ELEMENT===0){
    return new Type(bin,byteOffset,count).slice();
  }
  const output=new Type(count),data=new DataView(bin);
  const read={5120:'getInt8',5121:'getUint8',5122:'getInt16',5123:'getUint16',5125:'getUint32',5126:'getFloat32'}[a.componentType];
  for(let i=0;i<a.count;i++)for(let c=0;c<SIZE[a.type];c++){
    const offset=byteOffset+i*stride+c*Type.BYTES_PER_ELEMENT;
    output[i*SIZE[a.type]+c]=data[read](offset,true);
  }
  return output;
}

async function parse(buffer,url) {
  const images=[];
  const data=new DataView(buffer);
  if(data.getUint32(0,true)!==0x46546c67 || data.getUint32(4,true)!==2)throw new Error('Invalid GLB v2: '+url);
  const size=data.getUint32(8,true);
  if(size>buffer.byteLength)throw new Error('Truncated GLB: '+url);
  let offset=12, json=null, bin=null;
  while(offset+8<=size){
    const len=data.getUint32(offset,true),kind=data.getUint32(offset+4,true);
    const start=offset+8, end=start+len;
    if(end>size)break;
    if(kind===0x4e4f534a)json=JSON.parse(decoder.decode(new Uint8Array(buffer,start,len)));
    if(kind===0x004e4942)bin=buffer.slice(start,end);
    offset=end;
  }
  if(!json||!bin)throw new Error('GLB is missing JSON or binary payload: '+url);
  const textureCache=[];
  const imageTexture=id=>{
    if(textureCache[id])return textureCache[id];
    const image=json.images?.[id];if(!image)return null;
    const bufferView=json.bufferViews[image.bufferView];if(!bufferView)return null;
    const bytes=bin.slice(bufferView.byteOffset||0,(bufferView.byteOffset||0)+bufferView.byteLength);
    const objectURL=URL.createObjectURL(new Blob([bytes],{type:image.mimeType||'image/png'}));
    let tex;
    images.push(trackAsset(url+'#image-'+id,'image',()=>new Promise((resolve,reject)=>{
      let finished=false;
      const finish=(error)=>{if(finished)return;finished=true;clearTimeout(timer);URL.revokeObjectURL(objectURL);error?reject(new Error('Image decode failed: '+url+'#'+id)):resolve();};
      const timer=setTimeout(()=>finish(true),15000);
      tex=new THREE.TextureLoader().load(objectURL,()=>finish(),undefined,()=>finish(true));
    })));
    tex.colorSpace=THREE.SRGBColorSpace;
    tex.flipY=false;
    tex.anisotropy=4;
    textureCache[id]=tex;
    return tex;
  };
  const texByIndex=idx=>{
    const source=json.textures?.[idx]?.source;
    return source===undefined?null:imageTexture(source);
  };
  const material=(json.materials||[]).map(def=>{
    const p=def.pbrMetallicRoughness||{};
    const base=p.baseColorFactor||[1,1,1,1];
    const m=new THREE.MeshStandardMaterial({
      name:def.name||'GLB Material',
      color:new THREE.Color().setRGB(base[0],base[1],base[2]),
      roughness:p.roughnessFactor??.7,
      metalness:p.metallicFactor??.2,
      side:def.doubleSided?THREE.DoubleSide:THREE.FrontSide,
      transparent:def.alphaMode==='BLEND'||(base[3]<.95),
      opacity:base[3],
      depthWrite:def.alphaMode!=='BLEND',
    });
    if(p.baseColorTexture){m.map=texByIndex(p.baseColorTexture.index);m.needsUpdate=true;}
    if(def.emissiveTexture){
      m.emissiveMap=texByIndex(def.emissiveTexture.index);
      m.emissive.setRGB(...(def.emissiveFactor||[.5,.5,.5]));m.needsUpdate=true;
    } else if(def.emissiveFactor){m.emissive.setRGB(...def.emissiveFactor);}
    if(def.normalTexture){m.normalMap=texByIndex(def.normalTexture.index);m.normalScale.set(.35,.35);}
    return m;
  });
  const meshes=(json.meshes||[]).map(mesh=>{
    const parent=new THREE.Group();parent.name=mesh.name||'GLB mesh';
    for(let i=0;i<mesh.primitives.length;i++){
      const p=mesh.primitives[i];
      if(p.mode!==undefined&&p.mode!==4)continue;
      let geometry=new THREE.BufferGeometry();
      for(const [key,id] of Object.entries(p.attributes||{})){
        const name={POSITION:'position',NORMAL:'normal',TEXCOORD_0:'uv',COLOR_0:'color'}[key];
        if(!name)continue;
        const a=json.accessors[id];geometry.setAttribute(name,new THREE.BufferAttribute(access(json,bin,id),SIZE[a.type],!!a.normalized));
      }
      if(p.indices!==undefined)geometry.setIndex(new THREE.BufferAttribute(access(json,bin,p.indices),1));
      if(!geometry.getAttribute('normal')){
        geometry=geometry.toNonIndexed();geometry.computeVertexNormals();
      }
      const shape=new THREE.Mesh(geometry,material[p.material]||new THREE.MeshStandardMaterial({color:'#8b9eaa'}));
      shape.name=mesh.name||'GLB part';shape.frustumCulled=true;
      parent.add(shape);
    }
    return parent;
  });
  const nodes=(json.nodes||[]).map((node,i)=>{
    const group=new THREE.Group();group.name=node.name||('node_'+i);
    if(node.matrix)group.applyMatrix4(new THREE.Matrix4().fromArray(node.matrix));
    else{
      if(node.translation)group.position.fromArray(node.translation);
      if(node.rotation)group.quaternion.fromArray(node.rotation);
      if(node.scale)group.scale.fromArray(node.scale);
    }
    if(node.mesh!==undefined)group.add(meshes[node.mesh]);
    return group;
  });
  json.nodes?.forEach((node,i)=>node.children?.forEach(j=>nodes[i].add(nodes[j])));
  const scene=new THREE.Group();scene.name=url.split('/').pop()||'GLB asset';
  for(const rootIndex of json.scenes?.[json.scene??0]?.nodes||[]){scene.add(nodes[rootIndex]);}
  await Promise.all(images);
  return scene;
}

export async function loadModel(path) {
  if(!cache.has(path)){
    const promise=trackAsset(path,'model',async()=>parse(await fetchAsset(path),path)).catch(error=>{cache.delete(path);throw error;});
    cache.set(path,promise);
  }
  const base=await cache.get(path);
  return base.clone(true); // shares geometry/textures, new scene nodes for animation
}
export function modelPath(name){return `./assets/neon4/models/${name}.glb`;}
