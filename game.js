import * as THREE from 'three';
import {GLTFLoader} from 'three/addons/loaders/GLTFLoader.js';
import {installCinematic} from './cinematic.js';
import {createSurvival, stepSurvival, snapshotSurvival, safeZone, DIFFICULTIES, JOURNAL, igniteFlare, dodge, respawnSurvival} from './survival.js';
import {createAtmosphere} from './atmosphere.js';
import {SurvivalAudio} from './audio.js';
import {FieldRenderer} from './field-renderer.js';
// GOTHIC ISLAND — original interactive survival game. Kenney CC0 models are optional.
const $=id=>document.getElementById(id), mobile=matchMedia('(pointer:coarse)').matches;
const preferencesKey = 'gothic-island-settings-v1';
const preferences = {quality: 'auto', volume: .45, reducedMotion: matchMedia('(prefers-reduced-motion: reduce)').matches};
try {
  const saved = JSON.parse(localStorage.getItem(preferencesKey));
  if (['auto', 'low', 'high'].includes(saved?.quality)) preferences.quality = saved.quality;
  if (Number.isFinite(saved?.volume)) preferences.volume = Math.max(0, Math.min(1, saved.volume));
  if (typeof saved?.reducedMotion === 'boolean') preferences.reducedMotion = saved.reducedMotion;
} catch {}
const audio = new SurvivalAudio();
audio.setVolume(preferences.volume);
const scene=new THREE.Scene();scene.background=new THREE.Color(0x71796a);scene.fog=new THREE.FogExp2(0x777c6c,.016);
const camera=new THREE.PerspectiveCamera(54,innerWidth/innerHeight,.1,320);
let renderer;
try {
  renderer=new THREE.WebGLRenderer({antialias:!mobile,powerPreference:'high-performance'});
} catch {
  renderer=new FieldRenderer();
  $('compatibilityNote').hidden=false;
  $('qualitySetting').disabled=true;
}
renderer.setPixelRatio(Math.min(devicePixelRatio,mobile?1.25:1.8));renderer.setSize(innerWidth,innerHeight);renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.23;renderer.outputColorSpace=THREE.SRGBColorSpace;
document.getElementById('game').prepend(renderer.domElement);
const hemi=new THREE.HemisphereLight(0xb9c7c0,0x332a1b,1.6);scene.add(hemi);const sunlight=new THREE.DirectionalLight(0xffc89d,2.55);sunlight.position.set(-36,44,-24);sunlight.castShadow=true;sunlight.shadow.mapSize.set(mobile?512:2048,mobile?512:2048);sunlight.shadow.camera.left=-90;sunlight.shadow.camera.right=90;sunlight.shadow.camera.top=90;sunlight.shadow.camera.bottom=-90;sunlight.shadow.bias=-.001;scene.add(sunlight);
const moon=new THREE.DirectionalLight(0x92b5ca,.2);moon.position.set(28,32,44);scene.add(moon);
const mat=(c,r=1,metal=0)=>new THREE.MeshStandardMaterial({color:c,roughness:r,metalness:metal,flatShading:true});
const M={soil:mat(0x414536),dirt:mat(0x655c49),track:mat(0x74664e),grass:mat(0x67704b),grass2:mat(0x535f46),bark:mat(0x4a4237),bark2:mat(0x625141),wood:mat(0x66543f),woodLight:mat(0x9d8869),wall:mat(0x8c8972),white:mat(0xa8a18a),dark:mat(0x252b29),roof:mat(0x343630),rust:mat(0x854b3d),metal:mat(0x5b615b,.77,.2),glass:mat(0xc0b58e,.23,.12),stone:mat(0x777a6d),straw:mat(0xa18d59),black:mat(0x1a1c1b),shirt:mat(0x6c7061),skin:mat(0xb79b83),trousers:mat(0x383f3c),berries:mat(0x8c493a),light:new THREE.MeshStandardMaterial({color:0xdcb77c,emissive:0xe6a45e,emissiveIntensity:2.1}),fence:mat(0x746149)};
function obj(g,m,x=0,y=0,z=0,p=scene,shadow=true){const o=new THREE.Mesh(g,m);o.position.set(x,y,z);o.castShadow=shadow;o.receiveShadow=true;p.add(o);return o}
// Reuse immutable geometry for repeated scenery and character parts.
const geometries = new Map();
function geometry(Type, dimensions) {
  const key = Type.name + ':' + dimensions.join(',');
  if (!geometries.has(key)) geometries.set(key, new Type(...dimensions));
  return geometries.get(key);
}
const cube = (w,h,d,m,x,y,z,p=scene) => obj(geometry(THREE.BoxGeometry,[w,h,d]),m,x,y,z,p);
const cylinder = (t,b,h,m,x,y,z,p=scene,n=7) => obj(geometry(THREE.CylinderGeometry,[t,b,h,n]),m,x,y,z,p);
const ball = (r,m,x,y,z,p=scene,s=1) => obj(geometry(THREE.IcosahedronGeometry,[r,s]),m,x,y,z,p);
const group=(x,z)=>{let g=new THREE.Group();g.position.set(x,0,z);scene.add(g);return g};
const random=((s)=>()=>{s=(s*1664525+1013904223)>>>0;return s/4294967296})(1931);
function R(a,b){return a+random()*(b-a)}
const groundGeo=new THREE.PlaneGeometry(260,260,64,64);groundGeo.rotateX(-Math.PI/2);let arr=groundGeo.attributes.position;for(let i=0;i<arr.count;i++){const x=arr.getX(i),z=arr.getZ(i);arr.setY(i,-.19+.2*Math.sin(x*.095)*Math.sin(z*.11)+.13*Math.sin(z*.22+x*.16))}groundGeo.computeVertexNormals();obj(groundGeo,M.soil,0,0,0,scene,false);
// Dirt tracks and worn ruts leading to the church, barn, farmhouse and truck.
cube(6,.08,164,M.dirt,0,-.075,-8);
for(let x of [-2,2])cube(.58,.09,163,M.track,x,-.025,-8);
cube(46,.07,4.2,M.dirt,11,-.06,-30);cube(34,.07,3.4,M.dirt,-14,-.06,-6);
const collisions=[];function blocker(x,z,w,d){collisions.push({x,z,w,d})}
function roof(g,w,d,h){for(const sign of [-1,1]){let panel=cube(w*.72,.28,d+.85,M.roof,sign*w*.28,h+1.65,0,g);panel.rotation.z=sign*.72}cube(.16,.18,d+1.1,M.woodLight,0,h+3.03,0,g)}
function building(x,z,w,d,h,wall,kind){const g=group(x,z);cube(w,h,d,wall,0,h/2,0,g);roof(g,w,d,h);for(let yy=.85;yy<h;yy+=1.4){for(let sx of [-w/2,w/2])cube(.17,1.2,.2,M.woodLight,sx,yy,0,g)}
cube(2.2,3,.18,M.dark,0,1.5,d/2+.08,g);cube(2.45,.12,.22,M.woodLight,0,3,d/2+.17,g);
for(let sx of [-w*.31,w*.31]){cube(1.48,1.68,.2,M.dark,sx,h*.58,d/2+.13,g);cube(1.53,.12,.24,M.woodLight,sx,h*.58,d/2+.26,g);cube(.12,1.7,.24,M.woodLight,sx,h*.58,d/2+.26,g);cube(.18,1.68,.14,M.woodLight,sx-.81,h*.58,d/2+.24,g);cube(.18,1.68,.14,M.woodLight,sx+.81,h*.58,d/2+.24,g)}
for(let i=0;i<Math.floor(w);i++){cube(.07,h,.11,kind==='barn'?M.woodLight:M.wood,x===999?0:-w/2+.4+i*.95,h/2,d/2+.14,g)} // vertical wall boards
blocker(x,z,w-2,d-2);return g}
const home=building(-28,-11,16,13,8,M.white,'home');const barn=building(25,-35,23,16,10,M.rust,'barn');const chapel=building(-39,34,12,20,10,M.wall,'chapel');building(27,24,11,9,6,M.wood,'shed');
const steeple=group(-39,34);cube(4,7,4,M.wall,0,13,-4,steeple);const spire=obj(new THREE.ConeGeometry(3.1,6,4),M.roof,0,19,-4,steeple);spire.rotation.y=Math.PI/4;cube(.23,2.4,.23,M.woodLight,0,22.5,-4,steeple);cube(1.6,.23,.23,M.woodLight,0,22.9,-4,steeple);
for(let i=0;i<5;i++){const x=-36+i*4.3;cube(.7,1.6,.7,M.stone,x,.8,46);if(i%2===0)cube(1.15,.19,.72,M.stone,x,1.43,46)}
for(let i=0;i<22;i++){let x=-51+(i%6)*4,z=50+Math.floor(i/6)*4;cube(.8,R(.8,1.5),.35,M.stone,x,.6,z);if(i%4===0)cube(1.3,.16,.4,M.stone,x,1.25,z)}
function fence(x,z,length,dir){for(let d=0;d<=length;d+=3){let px=x+(dir==='x'?d:0),pz=z+(dir==='z'?d:0);cube(.25,1.5,.25,M.fence,px,.75,pz)}for(let yy of [.49,1.13])cube(dir==='x'?length:.14,.16,dir==='z'?length:.14,M.fence,x+(dir==='x'?length/2:0),yy,z+(dir==='z'?length/2:0))}
fence(-51,43,30,'x');fence(-51,43,28,'z');fence(-5,-49,35,'x');fence(30,-49,32,'z');fence(-41,-21,26,'x');fence(-41,-21,19,'z');
function tree(x,z,s=1,withLeaves=false){const g=group(x,z);g.scale.setScalar(s);cylinder(.21,.57,7,M.bark,0,3.5,0,g);for(let a=0;a<4;a++){let angle=a*Math.PI*.52+.2;let branch=cylinder(.045,.22,5,M.bark2,Math.cos(angle)*1.2,7.2,Math.sin(angle)*1.2,g);branch.rotation.z=Math.sin(angle)*.72;branch.rotation.x=-Math.cos(angle)*.67}
if(withLeaves){for(let j=0;j<5;j++)ball(R(1.8,2.5),j%2?M.grass2:M.grass,R(-2,2),R(7,10),R(-2,2),g)}return g}
for(let i=0;i<100;i++){let a=i*2.39996,r=24+Math.sqrt((i+1)/100)*88,x=Math.cos(a)*r+R(-4,4),z=Math.sin(a)*r+R(-4,4);if(Math.abs(x)<6||Math.hypot(x-25,z+35)<21||Math.hypot(x+39,z-34)<19||Math.hypot(x+28,z+11)<19)continue;tree(x,z,R(.7,1.55),i%9===0)}
for(let i=0;i<220;i++){let x=R(-112,112),z=R(-112,112);if(Math.abs(x)<5||Math.hypot(x-25,z+35)<17||Math.hypot(x+28,z+11)<15)continue;let grass=cylinder(.02,.13,R(.3,.8),i%3?M.grass2:M.straw,x,.24,z,scene,3);grass.rotation.z=R(-.25,.25)}
for(let row=0;row<9;row++)for(let col=0;col<16;col++){let x=9+col*1.9,z=42+row*2.7;let g=group(x,z);cylinder(.03,.065,2.1,M.straw,0,1,0,g,4);for(let b=0;b<4;b++){let stem=cube(.08,.7,.14,M.grass2,(b%2?.2:-.2),1.3+b*.14,0,g);stem.rotation.z=b%2?-.8:.8}}
for(let i=0;i<45;i++){let x=R(-96,96),z=R(-96,96);if(Math.abs(x)<7)continue;const stone=ball(R(.35,.9),M.stone,x,.3,z);stone.scale.set(R(.7,1.5),R(.5,.9),R(.7,1.1))}
const truck=group(0,-63);cube(3.7,.9,6.8,M.rust,0,1.65,0,truck);cube(3.5,1.6,2.65,M.rust,0,2.55,-1.3,truck);cube(3.05,.92,.08,M.glass,0,2.7,.07,truck);cube(3.5,.14,.13,M.metal,0,1.15,-3.5,truck);for(const x of [-1.9,1.9])for(const z of [-2.3,2.25]){let wheel=cylinder(.76,.76,.45,M.black,x,.78,z,truck,14);wheel.rotation.z=Math.PI/2;cylinder(.31,.31,.48,M.metal,x,.78,z,truck,12).rotation.z=Math.PI/2}for(let x of [-1.25,1.25])ball(.25,M.light,x,1.8,-3.48,truck);
const light= new THREE.PointLight(0xffb872,13,23,2);light.position.set(-28,4,-3);scene.add(light);ball(.25,M.light,-28,4,-3);
const lanternLight=new THREE.PointLight(0xf8c177,0,17,2);scene.add(lanternLight);
const p=group(0,9),body=new THREE.Group();p.add(body);const coat=cylinder(.47,.64,1.46,M.shirt,0,1.42,0,body);ball(.39,M.skin,0,2.46,0,body);
const hat=cylinder(.49,.45,.39,M.black,0,2.84,0,body);cylinder(.73,.73,.09,M.black,0,2.64,0,body);
const armL=cube(.27,1.14,.36,M.shirt,-.64,1.48,0,body),armR=cube(.27,1.14,.36,M.shirt,.64,1.48,0,body),legL=cube(.34,.83,.39,M.trousers,-.25,.4,0,body),legR=cube(.34,.83,.39,M.trousers,.25,.4,0,body);
const cinematic=installCinematic({THREE,scene,renderer,M,cube,cylinder,ball,group,p,mobile,collisions});
// Static repeated scenery is instanced after its world transforms are authored.
// Dynamic roots are excluded by their adapters.
function batchScenery() {
  scene.updateMatrixWorld(true);
  const batches = new Map();
  scene.traverse(mesh => {
    if (!mesh.isMesh || mesh.isInstancedMesh || Array.isArray(mesh.material)) return;
    for (let parent=mesh; parent; parent=parent.parent) {
      if (parent === p || parent === truck || parent.userData.dynamic) return;
    }
    const key = mesh.geometry.uuid + mesh.material.uuid + mesh.castShadow + mesh.receiveShadow;
    if (!batches.has(key)) batches.set(key, []);
    batches.get(key).push(mesh);
  });
  for (const meshes of batches.values()) {
    if (meshes.length < 3) continue;
    const first=meshes[0], batch=new THREE.InstancedMesh(first.geometry,first.material,meshes.length);
    batch.castShadow=first.castShadow;batch.receiveShadow=first.receiveShadow;
    meshes.forEach((mesh,index) => {
      batch.setMatrixAt(index,mesh.matrixWorld);
      mesh.removeFromParent();
    });
    batch.instanceMatrix.needsUpdate=true;
    batch.computeBoundingSphere();
    scene.add(batch);
  }
}
batchScenery();
const collectibles=[];function loot(type,x,z,label){let g=group(x,z);g.userData.type=type;if(type==='wood'){cylinder(.33,.39,1.4,M.bark,0,.68,0,g);ball(.58,M.grass2,0,1.48,0,g)}else if(type==='stone'){let s=ball(.67,M.stone,0,.46,0,g);s.scale.set(1.2,.8,1)}else if(type==='scrap'){cube(1,.34,.7,M.rust,0,.36,0,g);cube(.65,.65,.3,M.metal,0,.6,0,g)}else if(type==='food'){cube(.76,.43,.67,M.wood,0,.3,0,g);for(let i=0;i<4;i++)ball(.18,M.berries,(i-1.5)*.16,.63,R(-.15,.15),g)}else{cube(.8,.65,.7,type==='fuel'?M.rust:M.woodLight,0,.5,0,g);cube(.35,.12,.35,M.metal,0,.88,0,g)}collectibles.push({type,label,group:g,active:true});return g}
for(const [type,coords] of Object.entries({wood:[[-15,8],[11,5],[24,9],[-45,-12],[41,13],[-17,39],[-15,63],[39,-13],[-6,-40],[50,-46]],stone:[[9,18],[-13,14],[18,-15],[-19,29],[42,27],[-48,-24],[7,-51],[-9,46]],scrap:[[12,-31],[29,-21],[39,-34],[8,-49],[-21,-5],[-28,25],[19,27],[-12,-59]],food:[[-19,-6],[9,28],[-34,18],[30,39],[-11,40],[-40,-3],[26,-2]]}))for(const [x,z] of coords)loot(type,x,z);
loot('fuel',25,-27,'燃料缶');loot('key',-39,23,'車の鍵');
for (const [type,coords] of Object.entries({
  scrap: [[-24,-1],[-31,3],[4,12],[-16,-26],[36,-22],[-46,18],[53,3],[16,49]],
  wood: [[5,17],[-23,3],[-8,-18],[43,8],[-32,19],[12,56]],
  food: [[-25,4],[4,19],[17,-17],[-43,17],[33,42],[57,2],[11,54]]
})) for (const [x,z] of coords) loot(type,x,z);
const journalPoints = JOURNAL.map(note => {
  const root=group(note.x,note.z);
  const paper=new THREE.MeshStandardMaterial({color:0xd5c394,emissive:0x8b6731,emissiveIntensity:.2});
  cube(.65,.08,.85,M.wood,0,.4,0,root);
  const sheet=cube(.48,.03,.65,paper,0,.46,0,root);sheet.rotation.y=.2;
  return {...note,group:root,journal:true};
});
const camp=group(-3,9);
for(const side of [-1,1]) {
  const log=cylinder(.18,.18,1.7,M.bark,0,.23,0,camp,6);
  log.rotation.z=Math.PI/2;log.rotation.y=side*.6;
}
const fireMaterial=new THREE.MeshBasicMaterial({color:0xe7a34b});
const campFlame=obj(new THREE.ConeGeometry(.35,1.25,5),fireMaterial,0,.8,0,camp,false);
const campLight=new THREE.PointLight(0xffac58,25,19,2);campLight.position.set(-3,2,9);scene.add(campLight);
cube(2.7,.18,.75,M.wood,-2,.5,0,camp);
for(const x of [-2.9,-1.1])cube(.15,.5,.5,M.wood,x,.2,0,camp);
const truckLight=new THREE.PointLight(0xffc88b,18,17,2);truckLight.position.set(0,2,-62);scene.add(truckLight);
const atmosphere=createAtmosphere({THREE,scene,cube,cylinder,ball,group,mobile});
const POI=[{x:0,z:-63,title:'STRANDED PICKUP',label:'壊れたトラック',action:'truck'},{x:25,z:-26,title:'OLD BARN',label:'古い納屋',action:'barn'},{x:-39,z:23,title:'ST. MARY CHAPEL',label:'廃教会',action:'chapel'},{x:-28,z:-3,title:'FARMHOUSE',label:'農場主の家',action:'house'},{x:27,z:18.5,title:'TOOL SHED',label:'工具小屋の物資棚',action:'salvage'}];
const modelLoader=new GLTFLoader(),assetRoot='https://cdn.jsdelivr.net/gh/Hidencod/tge-assets@main/packs/';
const assetCache=new Map();let modelInstances=0;
function freeModel(pack,name,x,z,scale=1,ry=0){
  const url=assetRoot+pack+'/'+name+'.glb';
  if(!assetCache.has(url))assetCache.set(url,new Promise(resolve=>modelLoader.load(url,g=>resolve(g.scene),undefined,()=>resolve(null))));
  assetCache.get(url).then(template=>{
    if(!template)return;
    const root=template.clone(true);root.position.set(x,0,z);root.rotation.y=ry;root.scale.setScalar(scale);
    root.traverse(n=>{if(n.isMesh){n.castShadow=!mobile;n.receiveShadow=true}});
    scene.add(root);modelInstances++;
  });
}
for(let i=0;i<8;i++)freeModel('graveyard-kit',i%3===0?'gravestone-round':'gravestone-cross',-48+(i%4)*3.5,50+Math.floor(i/4)*3.5,1.6,R(-.2,.2));
for(let i=0;i<7;i++)freeModel('graveyard-kit','hay-bale',18+(i%3)*2.6,-20+Math.floor(i/3)*2.2,1.35,R(-.3,.3));
for(let i=0;i<4;i++)freeModel('graveyard-kit','pine-fall-crooked',-62+i*12,65+i*4,2.3,R(0,6));
for(let i=0;i<5;i++)freeModel('nature-kit','rocks',44+i*4,-13+i*7,1.5,R(0,6));
for(let i=0;i<(mobile?10:24);i++)freeModel('nature-kit',i%2===0?'tree-oak-fall':'tree-detailed-fall',-96+i*8.1,-63+(i%5)*31,1.2+(i%3)*.3,i*.72);
for(let i=0;i<(mobile?7:16);i++)freeModel('nature-kit','rock-large'+String.fromCharCode(97+(i%6)),-73+i*9,20+(i%4)*15,1.15,i);
for(let i=0;i<(mobile?7:18);i++)freeModel('nature-kit','plant-bushdetailed',-65+i*6,-24+(i%3)*12,1.45,i*.33);
for(let i=0;i<6;i++)freeModel('nature-kit','log-stack',18+(i%3)*3,-12+Math.floor(i/3)*4,1.5,i*.8);
for(let i=0;i<8;i++)freeModel('nature-kit','crops-cornstaged',12+i*3.3,64,1.55,0);

const saveKey = 'gothic-island-1931-v2';
const inv = {wood: 0, stone: 0, scrap: 0, food: 0};
const state = {
  health: 100, hunger: 100, stamina: 100, time: 18.7, day: 1,
  hatchet: false, lantern: false, repairKit: false, fuel: false, key: false,
  escaped: false, started: false, flares: 2, medicine: 1, lanternOn: true
};
const panels = ['inventory', 'craft', 'mapPanel', 'pausePanel', 'journalPanel'];
let world=createSurvival();
let crouchToggle=false;
let dashDirection={x:0,z:-1};
let dashRemaining=0;
let cameraZoom=1;
let sprintExhausted=false;
let hitFlash=0;
let graphicsLost=false;
let activePanel = null;
let returnFocus = null;
const canPlay = () => state.started && !state.escaped && !activePanel && !document.hidden && !graphicsLost;
const clamp = THREE.MathUtils.clamp;

function readSave() {
  try {
    const data = JSON.parse(localStorage.getItem(saveKey));
    if (!data?.state || data.state.escaped) return false;
    world=createSurvival(data.world);
    for(const name of ['flares','medicine']) {
      if(Number.isFinite(data.state[name])) state[name]=Math.max(0,Math.min(99,Math.floor(data.state[name])));
    }
    for (const [name, fallback] of Object.entries(state)) {
      if (['started','flares','medicine'].includes(name)) continue;
      const value = data.state[name];
      if (typeof fallback === 'boolean') {
        if(typeof value==='boolean')state[name]=value;
      }
      else if (Number.isFinite(value)) {
        state[name] = name === 'day' ? Math.max(1, Math.floor(value))
          : clamp(value, 0, name === 'time' ? 23.999 : 100);
      }
    }
    for (const name of Object.keys(inv)) {
      if (Number.isFinite(data.inv?.[name])) inv[name] = Math.max(0, Math.floor(data.inv[name]));
    }
    if (Number.isFinite(data.x) && Number.isFinite(data.z)) {
      p.position.set(clamp(data.x, -112, 112), 0, clamp(data.z, -112, 112));
    }
    for (const index of Array.isArray(data.collected) ? data.collected : []) {
      const item = Number.isInteger(index) && collectibles[index];
      if (!item) continue;
      if ((item.type === 'fuel' || item.type === 'key') && !state[item.type]) continue;
      item.active = false;
      scene.remove(item.group);
    }
    return true;
  } catch {
    return false;
  }
}
const hasSave = readSave();
if(blocked(p.position.x,p.position.z))p.position.set(0,0,9);
if (hasSave) $('startLabel').textContent = 'CONTINUE THE NIGHT';

const itemLabels={wood:'WOOD',stone:'STONE',scrap:'SCRAP',food:'BERRIES'},icons={wood:'🪵',stone:'◈',scrap:'⚙',food:'●'};
const recipes=[{name:'STONE HATCHET',desc:'木材 ×2 · 石 ×2',cost:{wood:2,stone:2},flag:'hatchet',done:'石の斧を作った。木材を多く採れる。'},{name:'OIL LANTERN',desc:'スクラップ ×3 · 木材 ×1',cost:{scrap:3,wood:1},flag:'lantern',done:'ランタンを灯した。暗闇でも道が見える。'},{name:'REPAIR KIT',desc:'木材 ×4 · 石 ×2 · スクラップ ×4',cost:{wood:4,stone:2,scrap:4},flag:'repairKit',done:'トラック修理キットを作った。'}];
recipes.push(
  {name:'RED FLARE',desc:'木材 ×1 · スクラップ ×1 · 16秒間、追跡者を遠ざける',cost:{wood:1,scrap:1},item:'flares',done:'発炎筒を作った。Qで足元に設置できる。'},
  {name:'HERBAL DRESSING',desc:'ベリー ×2 · 体力を40回復する',cost:{food:2},item:'medicine',done:'薬草の湿布を作った。Rで手当てできる。'}
);
const repairCost = recipes.find(recipe => recipe.flag === 'repairKit').cost;
let toastTimeout;function toast(t){$('notice').textContent=t;$('notice').classList.add('show');clearTimeout(toastTimeout);toastTimeout=setTimeout(()=>$('notice').classList.remove('show'),2900)}
function save() {
  if (!state.started || state.escaped) return;
  try {
    localStorage.setItem(saveKey, JSON.stringify({
      state, inv, world: snapshotSurvival(world), x: p.position.x, z: p.position.z,
      collected: collectibles.flatMap((item, index) => item.active ? [] : [index])
    }));
  } catch {}
}
function restart() {
  try {
    localStorage.removeItem(saveKey);
  } catch {}
  state.started = false;
  location.reload();
}
addEventListener('pagehide', save);
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    clearInput();
    audio.tick(0,{paused:true});
    save();
  }
});

function updateUI(){for(const [id,v] of [['health',state.health],['hunger',state.hunger],['stamina',state.stamina]]){$(id+'Bar').style.width=Math.round(v)+'%';$(id+'Txt').textContent=Math.round(v)}
const minutes=Math.floor(state.time*60);
$('clock').textContent=String(Math.floor(minutes/60)%24).padStart(2,'0')+':'+String(minutes%60).padStart(2,'0');
$('day').textContent='DAY '+String(state.day).padStart(2,'0');
const materials = Object.entries(repairCost).map(([item, cost]) =>
  ({wood: '木材', stone: '石', scrap: 'スクラップ'})[item] + ' ' + Math.min(inv[item], cost) + '/' + cost
).join('・');
const task = !state.fuel ? '納屋を探索し、燃料缶を手に入れる。'
  : !state.key ? '教会へ向かい、トラックの鍵を探す。'
  : !state.repairKit ? '修理キットの素材を集める。' + materials
  : 'トラックに戻り、エンジンを修理して脱出する。';
$('questText').textContent = task;
$('questTitle').textContent = state.repairKit && state.key && state.fuel ? 'THE WAY OUT' : 'THE BROKEN ROAD';
$('questStatus').textContent = [state.fuel, state.key, state.repairKit].filter(Boolean).length + ' / 3 · ESCAPE SUPPLIES';
}
function updateItems() {
  const equipment = [
    ['発炎筒 · Q',state.flares],['薬草の湿布 · R',state.medicine],
    ...['hatchet','lantern','fuel','key','repairKit'].map(name => [
      {hatchet:'石の斧',lantern:'ランタン',fuel:'燃料缶',key:'車の鍵',repairKit:'修理キット'}[name],state[name]?'✓':'—'
    ])
  ];
  $('inventoryItems').innerHTML=Object.entries(inv).map(([name,count]) =>
    '<div class="item"><b>'+icons[name]+' '+count+'</b><span>'+itemLabels[name]+'</span></div>'
  ).join('')+equipment.map(([name,count]) =>
    '<div class="item"><b>'+count+'</b><span>'+name+'</span></div>'
  ).join('');
  $('recipes').replaceChildren();
  for (const recipe of recipes) {
    const row=document.createElement('div'),description=document.createElement('div'),button=document.createElement('button');
    row.className='recipe';
    description.innerHTML='<b>'+recipe.name+'</b><small>'+recipe.desc+'</small>';
    const crafted=recipe.flag && state[recipe.flag];
    button.textContent=crafted?'CRAFTED':'CRAFT';
    button.disabled=!!crafted || (recipe.item && state[recipe.item]>=99) || !Object.entries(recipe.cost).every(([name,count])=>inv[name]>=count);
    button.onclick=()=>{
      if(activePanel!=='craft' || button.disabled) return;
      for(const [name,count] of Object.entries(recipe.cost)) inv[name]-=count;
      if(recipe.item)state[recipe.item]++;else state[recipe.flag]=true;
      audio.play('craft');toast(recipe.done);save();updateUI();updateItems();
      ($('recipes').querySelector('button:not(:disabled)') || $('closeCraft')).focus();
    };
    row.append(description,button);$('recipes').append(row);
  }
  $('flareCount').textContent=state.flares;
  $('medicineCount').textContent=state.medicine;
}
function useFlare() {
  if(!canPlay())return;
  if(!state.flares){toast('発炎筒がない。クラフト画面で作ろう。');return;}
  if(!igniteFlare(world,p.position))return;
  state.flares--;audio.play('flare');toast('赤い火が、闇を押し戻す。');save();updateItems();
}
function useMedicine() {
  if(!canPlay())return;
  if(!state.medicine){toast('薬草の湿布がない。ベリー2つで作れる。');return;}
  if(state.health>=100){toast('今は手当ての必要がない。');return;}
  state.medicine--;state.health=Math.min(100,state.health+40);
  audio.play('craft');toast('傷を手当てした。体力 +40。');save();updateUI();updateItems();
}
function tryDodge() {
  if(!canPlay() || state.stamina<24 || !dodge(world))return;
  state.stamina-=24;dashRemaining=.24;
}
function toggleLantern() {
  if(!canPlay())return;
  if(!state.lantern){toast('ランタンはクラフトで作れる。');return;}
  state.lanternOn=!state.lanternOn;
  toast(state.lanternOn?'ランタンを灯した。遠くからも見つかりやすくなる。':'ランタンを消した。');save();
}
function updateJournal() {
  $('journalCount').textContent=world.records.length+' / '+JOURNAL.length;
  $('journalEntries').replaceChildren();
  for(const note of JOURNAL) {
    const entry=document.createElement('article');entry.className='journalEntry';
    const title=document.createElement('h3'),text=document.createElement('p');
    const discovered=world.records.includes(note.id);
    title.textContent=discovered?note.title:'未発見の記録';
    text.textContent=discovered?note.text:'農場に残された手紙や記録を探そう。地図の小さな点が手がかりになる。';
    entry.append(title,text);$('journalEntries').append(entry);
  }
}
function nearest(){let n=null,best=4;for(const note of journalPoints){if(world.records.includes(note.id))continue;const d=note.group.position.distanceTo(p.position);if(d<best){n=note;best=d}}for(const o of collectibles){if(!o.active)continue;let d=o.group.position.distanceTo(p.position);if(d<best){n=o;best=d}}for(const poi of POI){let d=Math.hypot(p.position.x-poi.x,p.position.z-poi.z);if(d<best){n=poi;best=d}}return n}
function interact(){if(!canPlay())return;const n=nearest();if(!n){toast('もう少し近づいて調べよう。');return}if(n.journal){world.records.push(n.id);audio.play('pickup');updateJournal();save();toggle('journalPanel');toast('記録を発見した。 '+world.records.length+' / '+JOURNAL.length);return}if(n.group){audio.play('pickup');if(n.type==='fuel'){state.fuel=true;toast('燃料缶を見つけた。トラックに使える。')}else if(n.type==='key'){state.key=true;toast('錆びた鍵を見つけた。車の鍵だ。')}else{inv[n.type]+=n.type==='wood'&&state.hatchet?2:1;toast(({wood:'木材',stone:'石',scrap:'スクラップ',food:'ベリー'})[n.type]+'を手に入れた。')}n.active=false;scene.remove(n.group)}
else if(n.action==='truck'){if(state.fuel&&state.key&&state.repairKit){state.escaped=true;showEnding();$('ending').hidden=false;toast('脱出成功！');try{localStorage.removeItem(saveKey)}catch{}$('restartButton').focus()}else toast('燃料・鍵・修理キットが必要だ。')}
else if(n.action==='barn')toast(state.fuel?'納屋は静まり返っている。':'納屋の裏に燃料がありそうだ。');
else if(n.action==='chapel')toast(state.key?'冷たい風だけが通り過ぎる。':'教会の入口の近くに鍵が落ちている。');
else if(n.action==='salvage') {
  const waiting=Math.ceil(world.salvageAt-world.elapsed);
  if(waiting>0)toast('使える部品を探している。あと'+waiting+'秒で再び調べられる。');
  else {
    inv.wood++;inv.stone++;inv.scrap+=2;inv.food++;
    world.salvageAt=world.elapsed+90;
    audio.play('pickup');toast('物資棚から木材・石・スクラップ2・ベリーを回収した。');
  }
}
else if (world.threat > .55) toast('追跡を振り切ってから休もう。');
else if (state.hunger < 20) toast('空腹で休めない。先にベリーを食べよう。');
else if (state.health === 100 && state.stamina === 100) toast('ここで体力とスタミナを回復できる。');
else {
  state.hunger -= 15;
  state.health = Math.min(100, state.health + 35);
  state.stamina = 100;
  advanceTime(1);
  toast('農家の軒先で休み、体力を回復した。');
}
save();updateUI();updateItems()}
function eat(){if(!canPlay())return;if(state.hunger===100&&state.health===100){toast('今は食べる必要がない。');return}if(inv.food<=0){toast('食べられるものを持っていない。');return}inv.food--;state.hunger=Math.min(100,state.hunger+32);state.health=Math.min(100,state.health+6);toast('ベリーを食べた。空腹が少し和らいだ。');save();updateUI();updateItems()}
function toggle(id) {
  if (!state.started || state.escaped) return;
  if (!activePanel) returnFocus = document.activeElement;
  activePanel = activePanel === id ? null : id;
  clearInput();
  for (const panel of panels) $(panel).classList.toggle('open', panel === activePanel);
  $('prompt').classList.remove('show');
  audio.tick(0,{paused:!!activePanel});
  $('game').classList.toggle('menuOpen',!!activePanel);
  if (activePanel) {
    save();
    if(activePanel==='journalPanel')updateJournal();
    if (activePanel === 'mapPanel') drawMap();
    $(activePanel).querySelector('button').focus();
  } else {
    returnFocus?.focus();
  }
}
for (const [id, buttons] of [
  ['inventory', ['bagButton', 'mobileBag', 'closeInventory']],
  ['craft', ['craftButton', 'mobileCraft', 'closeCraft']],
  ['mapPanel', ['mapButton', 'mobileMap', 'closeMap']],
  ['pausePanel', ['pauseButton', 'mobilePause', 'resumeButton']],
  ['journalPanel', ['journalButton','mobileJournal','closeJournal']]
]) {
  for (const button of buttons) $(button).onclick = () => toggle(id);
}
$('mobileUse').onclick = interact;
$('mobileEat').onclick = eat;
$('restartButton').onclick = restart;
$('newGameButton').onclick = () => {
  if (confirm('セーブを消して最初から遊びますか？')) restart();
};
$('newGameButton').hidden = !hasSave;

$('flareButton').onclick=useFlare;
$('medicineButton').onclick=useMedicine;
$('dodgeButton').onclick=tryDodge;
$('crouchButton').onclick=()=>{
  if(canPlay()){crouchToggle=!crouchToggle;$('crouchButton').setAttribute('aria-pressed',String(crouchToggle));}
};
$('lanternButton').onclick=toggleLantern;
async function toggleSound() {
  if(audio.enabled)audio.mute();
  else try {await audio.enable();}catch {toast('音声を開始できませんでした。');}
  for(const id of ['soundButton','settingsSound'])$(id).setAttribute('aria-pressed',String(audio.enabled));
  $('settingsSound').textContent=audio.enabled?'SOUND ON':'SOUND OFF';
}
$('soundButton').onclick=$('settingsSound').onclick=toggleSound;
function savePreferences() {
  try{localStorage.setItem(preferencesKey,JSON.stringify(preferences));}catch{}
}
function setQuality() {
  const low=preferences.quality==='low'||(preferences.quality==='auto'&&mobile);
  renderer.setPixelRatio(Math.min(devicePixelRatio,low?1:1.65));
  renderer.shadowMap.enabled=!low;
  renderer.shadowMap.needsUpdate=true;
  $('game').classList.toggle('reducedMotion',preferences.reducedMotion);
}
$('qualitySetting').value=preferences.quality;
$('qualitySetting').onchange=event=>{preferences.quality=event.target.value;setQuality();savePreferences();};
$('motionSetting').checked=preferences.reducedMotion;
$('motionSetting').onchange=event=>{preferences.reducedMotion=event.target.checked;setQuality();savePreferences();};
$('volumeSetting').value=Math.round(preferences.volume*100);
$('volumeSetting').oninput=event=>{preferences.volume=Number(event.target.value)/100;audio.setVolume(preferences.volume);savePreferences();};
$('difficultySetting').value=$('titleDifficulty').value=world.difficulty;
function setDifficulty(event) {
  world.difficulty=event.target.value;
  $('difficultySetting').value=$('titleDifficulty').value=world.difficulty;
  save();
}
$('difficultySetting').onchange=$('titleDifficulty').onchange=setDifficulty;
$('startButton').onclick=()=>{
  state.started=true;
  $('intro').style.display='none';
  $('game').classList.remove('titleScreen');
  (mobile?$('mobilePause'):$('pauseButton')).focus();
  toast(hasSave?'探索を再開した。Jで記録、Escで操作方法を確認できる。':'畑には何かがいる。Shiftで走る、Ctrlで隠れる、Qで発炎筒。');
  save();
};
function showEnding() {
  const seconds=Math.floor(world.elapsed), minutes=Math.floor(seconds/60);
  $('endingStats').textContent=minutes+'分'+String(seconds%60).padStart(2,'0')+'秒 · '+Math.round(world.stats.distance)+'m 探索 · 記録 '+world.records.length+'/'+JOURNAL.length+' · 生還までの負傷 '+world.stats.downed+'回';
  $('endingRank').textContent=world.records.length===JOURNAL.length?'THE COUNTY REMEMBERS':world.stats.downed===0?'UNBROKEN':'A SURVIVOR OF ASHCROFT';
  $('prompt').classList.remove('show');
  audio.tick(0,{paused:true});
}
setQuality();
const key = {};
const movementKeys = new Set([
  'KeyW', 'KeyA', 'KeyS', 'KeyD', 'ArrowUp', 'ArrowLeft', 'ArrowDown', 'ArrowRight',
  'ShiftLeft', 'ShiftRight', 'ControlLeft', 'ControlRight'
]);
addEventListener('keydown', event => {
  if (!state.started || state.escaped || event.metaKey || event.altKey) return;
  if (canPlay() && movementKeys.has(event.code)) {
    event.preventDefault();
    key[event.code] = true;
  }
  if (event.code === 'Tab' && activePanel) {
    const controls=[...$(activePanel).querySelectorAll('button:not(:disabled), select, input, summary')];
    if(controls.length) {
      const index=controls.indexOf(document.activeElement);
      const next=event.shiftKey?(index<=0?controls.length-1:index-1):(index+1)%controls.length;
      event.preventDefault();controls[next].focus();
    }
    return;
  }
  if (canPlay() && ['KeyE','KeyF','KeyI','KeyC','KeyM','KeyJ','KeyQ','KeyR','KeyL','Space'].includes(event.code))event.preventDefault();
  if (event.ctrlKey && activePanel && event.code!=='Escape')return;
  if (event.repeat) return;
  if (['SELECT','INPUT'].includes(event.target?.tagName) && event.code!=='Escape') return;
  if (event.code === 'Escape') toggle(activePanel || 'pausePanel');
  if (event.code === 'KeyE') interact();
  if (event.code === 'KeyF') eat();
  if (event.code === 'KeyI') toggle('inventory');
  if (event.code === 'KeyC') toggle('craft');
  if (event.code === 'KeyM') toggle('mapPanel');
  if (event.code === 'KeyJ') toggle('journalPanel');
  if (event.code === 'KeyQ') useFlare();
  if (event.code === 'KeyR') useMedicine();
  if (event.code === 'KeyL') toggleLantern();
  if (event.code === 'Space' && canPlay()) {event.preventDefault();tryDodge();}
});
addEventListener('keyup', event => delete key[event.code]);
addEventListener('blur',()=>{clearInput();if(canPlay())toggle('pausePanel');});
const axis = {x: 0, y: 0};
let stickPointer = null;
let runPointer = null;
const stick = $('stick'), knob = $('knob');
function clearInput() {
  for (const code of Object.keys(key)) delete key[code];
  stickPointer = runPointer = null;
  axis.x = axis.y = 0;
  knob.style.transform = 'none';
  dashRemaining=0;
}
function updateStick(e){const r=stick.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2;let x=(e.clientX-cx)/(r.width*.37),y=(e.clientY-cy)/(r.height*.37);let m=Math.max(1,Math.hypot(x,y));axis.x=x/m;axis.y=y/m;knob.style.transform='translate('+(axis.x*(r.width*.34))+'px,'+(axis.y*(r.height*.34))+'px)'}
stick.addEventListener('pointerdown', event => {
  if (!canPlay() || stickPointer !== null) return;
  event.preventDefault();
  stickPointer = event.pointerId;
  stick.setPointerCapture(event.pointerId);
  updateStick(event);
});
stick.addEventListener('pointermove', event => {
  if (event.pointerId === stickPointer) updateStick(event);
});
const runButton = $('mobileRun');
runButton.addEventListener('pointerdown', event => {
  if (!canPlay() || runPointer !== null) return;
  event.preventDefault();
  runPointer = event.pointerId;
  runButton.setPointerCapture(event.pointerId);
});
for (const event of ['pointerup', 'pointercancel', 'lostpointercapture']) {
  stick.addEventListener(event, ({pointerId}) => {
    if (pointerId !== stickPointer) return;
    stickPointer = null;
    axis.x = axis.y = 0;
    knob.style.transform = 'none';
  });
  runButton.addEventListener(event, ({pointerId}) => {
    if (pointerId === runPointer) runPointer = null;
  });
}

function advanceTime(hours) {
  state.time += hours;
  if (state.time >= 24) {
    state.day++;
    state.time -= 24;
  }
}
function objective() {
  if (!state.fuel) return POI[1];
  if (!state.key) return POI[2];
  if (state.repairKit) return POI[0];
  let target = null;
  let resource;
  let best = Infinity;
  for (const item of collectibles) {
    if (!item.active || !(inv[item.type] < repairCost[item.type])) continue;
    const distance = item.group.position.distanceToSquared(p.position);
    if (distance >= best) continue;
    best = distance;
    target = item.group.position;
    resource = item.type;
  }
  return target ? {x: target.x, z: target.z, title: itemLabels[resource]} : Object.entries(repairCost).some(([name,count])=>inv[name]<count)?POI.find(point=>point.action==='salvage'):null;
}

function drawMap() {
  const canvas=$('miniMap'),ctx=canvas.getContext('2d'),w=canvas.width,h=canvas.height;
  const at=(x,z)=>[(x+120)/240*w,(z+120)/240*h];
  ctx.fillStyle='#18251f';ctx.fillRect(0,0,w,h);
  ctx.strokeStyle='#a8966722';ctx.lineWidth=1;
  for(let n=0;n<=8;n++) {ctx.beginPath();ctx.moveTo(n*w/8,0);ctx.lineTo(n*w/8,h);ctx.moveTo(0,n*h/8);ctx.lineTo(w,n*h/8);ctx.stroke();}
  ctx.strokeStyle='#a28d5b55';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(...at(0,-88));ctx.lineTo(...at(0,78));ctx.stroke();
  ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(...at(-30,-6));ctx.lineTo(...at(0,-6));ctx.moveTo(...at(0,-30));ctx.lineTo(...at(40,-30));ctx.stroke();
  ctx.font='10px Arial';
  for(const box of collisions) {
    const [x,z]=at(box.x-box.w/2,box.z-box.d/2);ctx.fillStyle='#62705b';ctx.fillRect(x,z,box.w/240*w,box.d/240*h);
  }
  for(const zone of [{x:0,z:9},{x:-28,z:-3},{x:0,z:-63}]) {
    const [x,z]=at(zone.x,zone.z);ctx.strokeStyle='#8dac8b66';ctx.beginPath();ctx.arc(x,z,11,0,Math.PI*2);ctx.stroke();
  }
  for(const point of POI) {
    const [x,z]=at(point.x,point.z);ctx.fillStyle='#d2bf94';ctx.fillText('◇',x-4,z);ctx.font='8px Arial';ctx.fillText(point.title,Math.min(x+8,w-100),z-6);
  }
  for(const note of JOURNAL) {
    const [x,z]=at(note.x,note.z);ctx.fillStyle=world.records.includes(note.id)?'#71927a':'#dbc59a';ctx.fillRect(x-1,z-1,3,3);
  }
  const target=objective();
  if(target){const [x,z]=at(target.x,target.z);ctx.strokeStyle='#f1b85b';ctx.lineWidth=2;ctx.beginPath();ctx.arc(x,z,8,0,Math.PI*2);ctx.stroke();}
  const [x,z]=at(p.position.x,p.position.z);ctx.fillStyle='#eff4d8';ctx.beginPath();ctx.arc(x,z,4,0,Math.PI*2);ctx.fill();
  ctx.fillStyle='#d2bf94';ctx.font='bold 12px Georgia';ctx.fillText('N ↑',w-36,20);
}
let last=performance.now(),ui=0,saveTimer=0;
const v=new THREE.Vector3(),look=new THREE.Vector3(),introCamera=new THREE.Vector3(27,21,46);
let walkPhase=0;
function blocked(x,z) {
  return collisions.some(c=>Math.abs(x-c.x)<c.w/2+.7&&Math.abs(z-c.z)<c.d/2+.7);
}
function movePlayer(dx,dz) {
  const x=clamp(p.position.x+dx,-112,112),z=clamp(p.position.z+dz,-112,112);
  const beforeX=p.position.x,beforeZ=p.position.z;
  if(!blocked(x,p.position.z))p.position.x=x;
  if(!blocked(p.position.x,z))p.position.z=z;
  world.stats.distance+=Math.hypot(p.position.x-beforeX,p.position.z-beforeZ);
}
function updateNavigation() {
  const target=objective();
  $('markerLabel').textContent=target?.title??'WORKBENCH';
  if(target) {
    const dx=target.x-p.position.x,dz=target.z-p.position.z;
    const directions=['↑','↗','→','↘','↓','↙','←','↖'];
    const bearing=(Math.round(Math.atan2(dx,-dz)/(Math.PI/4))+8)%8;
    $('markerDist').textContent=directions[bearing]+' '+Math.round(Math.hypot(dx,dz))+'m';
  } else $('markerDist').textContent='修理キットを作る';
  $('compassText').textContent='N · '+(p.position.z>12?'SOUTH FIELDS':p.position.z<-22?'OLD FARM ROAD':'ASHCROFT FARM');
  const nearestItem=nearest();
  $('prompt').classList.toggle('show',!!nearestItem);
  if(nearestItem) {
    $('promptLabel').textContent=nearestItem.journal?'残された記録を読む':nearestItem.group?
      (nearestItem.type==='fuel'?'燃料缶を拾う':nearestItem.type==='key'?'車の鍵を拾う':'素材を集める'):
      nearestItem.action==='house'?'農家の軒先で休む':nearestItem.action==='salvage'?'物資棚を調べる':nearestItem.label+'を調べる';
    $('promptSub').textContent=nearestItem.journal?'Jで発見した記録を読み返す':nearestItem.group?'バックパックに入れる':nearestItem.action==='house'?'空腹度15・1時間で体力とスタミナを回復':nearestItem.action==='salvage'?'90秒ごとに素材を回収できる':'周囲を探索する';
  }
}
function updateSurvivalUI(crouching) {
  const refuge=safeZone(p.position),threat=world.threat;
  $('threatBar').style.width=Math.round(threat*100)+'%';
  $('threatLabel').textContent=refuge?'REFUGE · 安全な灯り':threat>.6?'DETECTED · 追跡されている':threat>.25?'LISTENING · 足音に気づいている':crouching?'HIDDEN · 身を低くしている':'KEEP QUIET · 音を立てるな';
  $('threatIndicator').dataset.level=refuge?'safe':threat>.6?'chase':threat>.25?'alert':'quiet';
  $('stanceLabel').textContent=crouching?'CROUCHING':'ON YOUR FEET';
  $('flareButton').disabled=!state.flares||world.flareCooldown>0;
  $('medicineButton').disabled=!state.medicine||state.health>=100;
  $('mobileRun').dataset.exhausted=String(sprintExhausted);
  $('dodgeButton').disabled=state.stamina<24||world.dodgeCooldown>0;
  $('lanternButton').setAttribute('aria-pressed',String(state.lantern&&state.lanternOn));
  $('lanternButton').disabled=!state.lantern;
  $('weather').textContent=world.storm>.35?'STORM OVER ASHCROFT':world.mist>.35?'THE WHITEOUT':state.time>20||state.time<6?'THE NIGHT IS WATCHING':'THE LAST LIGHT';
  $('dangerWash').style.opacity=String(preferences.reducedMotion?0:hitFlash*.65);
  $('game').style.setProperty('--threat',String(threat*.35));
}
function frame(now) {
  requestAnimationFrame(frame);
  const dt=Math.min(.05,Math.max(0,(now-last)/1000));last=now;
  if(activePanel||document.hidden||state.escaped||graphicsLost)return;
  if(canPlay()) {
    let x=Number(!!(key.KeyD||key.ArrowRight))-Number(!!(key.KeyA||key.ArrowLeft))+axis.x;
    let z=Number(!!(key.KeyS||key.ArrowDown))-Number(!!(key.KeyW||key.ArrowUp))+axis.y;
    const length=Math.hypot(x,z),moving=length>.12;
    const crouching=crouchToggle||!!(key.ControlLeft||key.ControlRight);
    if(state.stamina<=3)sprintExhausted=true;
    if(state.stamina>=24)sprintExhausted=false;
    const sprinting=!sprintExhausted&&moving&&!crouching&&(key.ShiftLeft||key.ShiftRight||runPointer!==null)&&state.stamina>3;
    if(moving) {
      x/=Math.max(1,length);z/=Math.max(1,length);dashDirection={x,z};
      const speed=crouching?2.65:sprinting?9:5.2;
      movePlayer(x*speed*dt,z*speed*dt);
      const heading=Math.atan2(-x,-z)-p.rotation.y;
      p.rotation.y+=Math.atan2(Math.sin(heading),Math.cos(heading))*Math.min(1,dt*13);
      walkPhase+=dt*(sprinting?14:crouching?5:9);
      armL.rotation.x=Math.sin(walkPhase)*.36;armR.rotation.x=-armL.rotation.x;
      legL.rotation.x=-Math.sin(walkPhase)*.38;legR.rotation.x=-legL.rotation.x;
      state.stamina=clamp(state.stamina+dt*(sprinting?-11:5),0,100);
    } else {
      state.stamina=Math.min(100,state.stamina+dt*12);
      const relax=Math.exp(-dt*12);
      armL.rotation.x*=relax;armR.rotation.x*=relax;legL.rotation.x*=relax;legR.rotation.x*=relax;
    }
    if(dashRemaining>0) {
      const dashDt=Math.min(dt,dashRemaining);
      movePlayer(dashDirection.x*17*dashDt,dashDirection.z*17*dashDt);dashRemaining-=dashDt;
    }
    body.position.y=moving?Math.abs(Math.sin(walkPhase))*.05:0;
    body.position.y-=crouching?.4:0;
    hitFlash=Math.max(0,hitFlash-dt*2);
    const input={x:p.position.x,z:p.position.z,moving,sprinting,crouching,lantern:state.lantern&&state.lanternOn};
    const events=stepSurvival(world,input,collisions,dt);
    for(const event of events) {
      audio.play(event.type);
      if(event.type==='hit') {state.health=Math.max(0,state.health-event.damage);hitFlash=1;toast('追跡者に襲われた。発炎筒か安全な灯りへ！');}
      if(event.type==='spotted'&&world.threat<.3)toast('見つかった。走って距離を取り、建物の陰へ。');
    }
    advanceTime(dt*.019);
    state.hunger=Math.max(0,state.hunger-dt*DIFFICULTIES[world.difficulty].hunger);
    if(state.hunger<10)state.health=Math.max(0,state.health-dt*.8);
    if(state.health<=0) {
      state.health=75;state.hunger=Math.max(45,state.hunger);state.stamina=100;
      p.position.set(0,0,9);dashRemaining=0;respawnSurvival(world);save();
      toast('道端の灯りで目覚めた。持ち物は無事だ。次は火を携えて行こう。');
    }
    const daylight=Math.max(0,Math.sin((state.time-5)/14*Math.PI));
    sunlight.intensity=(.18+daylight*2.6)*(1-world.storm*.55);
    moon.intensity=.2+(1-daylight)*.72;hemi.intensity=.6+daylight*1.2;
    scene.fog.density=.019+(1-daylight)*.009+world.mist*.017+world.storm*.004;
    light.intensity=8+(1-daylight)*9;
    lanternLight.intensity=state.lantern&&state.lanternOn?14:0;
    lanternLight.position.set(p.position.x,p.position.y+2.4,p.position.z+.3);
    v.set(p.position.x+15*cameraZoom,12.8*cameraZoom,p.position.z+21*cameraZoom);
    camera.position.lerp(v,1-Math.exp(-dt*3.5));
    look.set(p.position.x,1.2,p.position.z-4);camera.lookAt(look);
    if(!renderer.isFieldRenderer)atmosphere.tick(world,p.position,dt,preferences.reducedMotion);
    audio.tick(dt,{moving,sprinting,crouching,threat:world.threat,storm:world.storm,health:state.health,paused:false});
    ui+=dt;saveTimer+=dt;
    if(ui>.15){updateUI();updateNavigation();updateSurvivalUI(crouching);ui=0;}
    if(saveTimer>10){save();saveTimer=0;}
  } else {
    camera.position.lerp(introCamera,1-Math.exp(-dt*.8));camera.lookAt(0,2,-25);
    if(!renderer.isFieldRenderer)atmosphere.tick(world,p.position,0,preferences.reducedMotion);
  }
  campFlame.scale.y=preferences.reducedMotion?1:.9+Math.sin(now*.013)*.14;
  campLight.intensity=preferences.reducedMotion?25:24+Math.sin(now*.009)*2;
  cinematic.tick(now,dt,p.position,state.time,preferences.reducedMotion);
  renderer.render(scene,camera);
}
renderer.domElement.addEventListener('wheel',event=>{
  if(!canPlay())return;
  event.preventDefault();cameraZoom=clamp(cameraZoom+event.deltaY*.0007,.7,1.45);
},{passive:false});
renderer.domElement.addEventListener('webglcontextlost',event=>{
  event.preventDefault();save();
  const playing=canPlay();graphicsLost=true;
  if(playing)toggle('pausePanel');
  $('graphicsWarning').hidden=false;
});
renderer.domElement.addEventListener('webglcontextrestored',()=>{
  graphicsLost=false;
  $('graphicsWarning').hidden=true;
  toast('描画を復旧した。メニューを閉じると再開できる。');
});
addEventListener('resize',()=>{
  camera.aspect=innerWidth/innerHeight;camera.updateProjectionMatrix();
  renderer.setSize(innerWidth,innerHeight);setQuality();
  if(activePanel||state.escaped)renderer.render(scene,camera);
});
renderer.setView?.(()=>({
  player:{x:p.position.x,z:p.position.z},world,collisions,collectibles,notes:JOURNAL,
  started:state.started,zoom:cameraZoom,hour:state.time,
  crouching:crouchToggle||!!(key.ControlLeft||key.ControlRight),
  lantern:state.lantern&&state.lanternOn,reducedMotion:preferences.reducedMotion
}));
updateUI();updateItems();updateJournal();requestAnimationFrame(frame);
setTimeout(()=>$('loading').classList.add('done'),600);
setTimeout(()=>$('loading').remove(),1400);
