// GOTHIC ISLAND — cinematic environmental art pass.
// Original procedural surfaces / meshes. Runtime only; no paid assets.
export function installCinematic({THREE,scene,renderer,M,cube,cylinder,ball,group,p,mobile,collisions}) {
  let seed=837421;
  const rand=()=>((seed=(Math.imul(seed,1664525)+1013904223)>>>0)/4294967296);
  const rnd=(a,b)=>a+(b-a)*rand();
  const block=(x,z,w,d)=>collisions.push({x,z,w,d});
  const add=(geom,mat,parent=scene,x=0,y=0,z=0)=>{const m=new THREE.Mesh(geom,mat);m.position.set(x,y,z);m.castShadow=false;m.receiveShadow=true;parent.add(m);return m};
  const darkWood=new THREE.MeshStandardMaterial({color:0x4b4436,roughness:1});
  const agedIron=new THREE.MeshStandardMaterial({color:0x474b43,metalness:.65,roughness:.73});
  const oldGlass=new THREE.MeshPhysicalMaterial({color:0x9b9f8e,roughness:.22,metalness:.18,transparent:true,opacity:.81});
  const wet=new THREE.MeshPhysicalMaterial({color:0x242d2c,metalness:.22,roughness:.19,transparent:true,opacity:.68,depthWrite:false,side:THREE.DoubleSide});
  const amber=new THREE.MeshStandardMaterial({color:0xffd69b,emissive:0xf6a752,emissiveIntensity:1.65,roughness:.6});

  // Low-bandwidth, authored, seamless procedural PBR colour surfaces.
  // No copyrighted image textures or expensive external image downloads.
  const mix=(a,b,t)=>a+(b-a)*t;
  function hash(x,y,s){let q=Math.sin(x*127.17+y*311.7+s*74.7)*43758.5453;return q-Math.floor(q)}
  function noise(x,y,s){let xi=Math.floor(x),yi=Math.floor(y),u=x-xi,v=y-yi;u=u*u*(3-2*u);v=v*v*(3-2*v);return mix(mix(hash(xi,yi,s),hash(xi+1,yi,s),u),mix(hash(xi,yi+1,s),hash(xi+1,yi+1,s),u),v)}
  function tex(rgb,kind,repeat=1,size=256){
    const cv=document.createElement('canvas');cv.width=cv.height=size;const ctx=cv.getContext('2d');
    const data=ctx.createImageData(size,size);let seedId=Math.round(rgb[0]*.3+rgb[1]*.5+rgb[2]*.1);
    for(let y=0;y<size;y++)for(let x=0;x<size;x++){
      let f=.48*noise(x/38,y/38,seedId)+.3*noise(x/13,y/13,seedId+17)+.22*noise(x/3,y/3,seedId+37);
      let grain=(hash(x,y,seedId+1)-.5)*28;
      let delta=(f-.5)*80+grain;
      if(kind==='timber'){delta=(f-.5)*43+grain*.65;let band=(y%33);if(band<2)delta-=50;if(band>30)delta-=14;delta+=Math.sin(x*.18+f*8)*8}
      if(kind==='roof'){let row=y%28;if(row<2)delta-=46;delta+=(Math.floor(x/47)%2)*9}
      if(kind==='stone'){let groutX=(x+Math.floor(y/41)%2*19)%67,groutY=y%41;if(groutX<2||groutY<2)delta-=25}
      if(kind==='rust'){let patch=noise(x/11,y/10,seedId+91);delta+=(patch>.63?28:-9)}
      if(kind==='soil'){delta+=(hash(x*3,y*7,seedId)>.982?34:0)}
      const n=4*(y*size+x);
      for(let c=0;c<3;c++)data.data[n+c]=Math.max(0,Math.min(255,rgb[c]+delta*(c===1?.82:c===2?.65:1)));
      data.data[n+3]=255;
    }
    ctx.putImageData(data,0,0);
    if(kind==='timber'||kind==='roof'){
      ctx.lineWidth=1;ctx.strokeStyle='rgba(12,16,13,.3)';
      for(let y=5;y<size;y+=33){ctx.beginPath();ctx.moveTo(0,y);ctx.lineTo(size,y);ctx.stroke()}
    }
    const t=new THREE.CanvasTexture(cv);t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeat,repeat);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=Math.min(renderer.capabilities.getMaxAnisotropy(),8);
    return t
  }
  function surf(material,rgb,kind,repeat){material.map=tex(rgb,kind,repeat,mobile?128:256);material.color.set(0xffffff);material.roughness=kind==='rust'?.81:kind==='stone'?.96:.99;material.needsUpdate=true}
  surf(M.soil,[65,69,49],'soil',24);
  surf(M.dirt,[107,90,70],'soil',4);surf(M.track,[123,105,78],'soil',6);
  surf(M.wall,[138,132,111],'stone',2);surf(M.white,[171,162,132],'timber',1.8);
  surf(M.wood,[96,79,58],'timber',1.7);surf(M.woodLight,[149,125,89],'timber',2);
  surf(M.roof,[52,57,53],'roof',2);surf(M.rust,[115,65,50],'rust',2.2);
  surf(M.stone,[105,110,100],'stone',1);surf(M.bark,[68,61,46],'timber',2);
  surf(M.fence,[120,99,70],'timber',2);surf(M.straw,[155,130,79],'soil',1);
  // Separate colour variation for forest plants and shaded pasture.
  M.grass.color.setHex(0x526040);M.grass2.color.setHex(0x404c3a);
  // Sky dome, warm low sun in constant conflict with the blue-grey storm front.
  const skyUniforms={uDay:{value:.55},uTime:{value:0}};
  const skyMat=new THREE.ShaderMaterial({
    uniforms:skyUniforms,side:THREE.BackSide,depthWrite:false,
    vertexShader:'varying vec3 worldPos;void main(){worldPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}',
    fragmentShader:'varying vec3 worldPos;uniform float uDay;uniform float uTime;float ns(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.545312);}void main(){float h=clamp(normalize(worldPos).y*.67+.45,0.,1.);vec3 low=mix(vec3(.025,.040,.055),vec3(.46,.36,.26),uDay);vec3 high=mix(vec3(.025,.037,.065),vec3(.24,.34,.36),uDay);float cloud=sin(worldPos.x*.024+worldPos.z*.027+uTime*.02)*sin(worldPos.z*.052-worldPos.x*.013);vec3 color=mix(low,high,pow(h,.72));color+=vec3(.028,.025,.02)*max(0.,cloud)*(1.-h);gl_FragColor=vec4(color,1.);}'
  });
  const sky=add(new THREE.SphereGeometry(235,32,20),skyMat);sky.material.fog=false;sky.renderOrder=-99;
  // Faint stars turn on after dark.
  const positions=[];for(let i=0;i<175;i++){let a=rnd(0,Math.PI*2),y=rnd(.16,.97),r=Math.sqrt(1-y*y);positions.push(Math.cos(a)*r*190,y*190,Math.sin(a)*r*190)}
  const sg=new THREE.BufferGeometry();sg.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));
  const starMat=new THREE.PointsMaterial({size:.65,sizeAttenuation:false,color:0xe0e5c8,transparent:true,opacity:0,depthWrite:false});
  scene.add(new THREE.Points(sg,starMat));
  // Sculpted moon, halo and thin crescent haze.
  const moon=add(new THREE.SphereGeometry(4.8,20,14),new THREE.MeshBasicMaterial({color:0xd9dbc3,fog:false}),scene,106,100,-137);
  const glowCanvas=document.createElement('canvas');glowCanvas.width=glowCanvas.height=128;
  const glowCtx=glowCanvas.getContext('2d'),grad=glowCtx.createRadialGradient(64,64,2,64,64,64);
  grad.addColorStop(0,'rgba(224,218,187,.25)');grad.addColorStop(.37,'rgba(210,216,190,.1)');grad.addColorStop(1,'rgba(190,211,191,0)');
  glowCtx.fillStyle=grad;glowCtx.fillRect(0,0,128,128);
  const halo=new THREE.Sprite(new THREE.SpriteMaterial({map:new THREE.CanvasTexture(glowCanvas),transparent:true,depthWrite:false,fog:false}));
  halo.position.copy(moon.position);halo.scale.set(49,49,1);scene.add(halo);
  // Dense cheap detail with instanced pasture blades: one draw call.
  let count=mobile?780:2100,grassGeom=new THREE.PlaneGeometry(.18,.89,1,2);
  grassGeom.translate(0,.45,0);
  const grassMat=new THREE.MeshStandardMaterial({color:0x87916b,side:THREE.DoubleSide,roughness:1,transparent:false,depthWrite:true});
  const inst=new THREE.InstancedMesh(grassGeom,grassMat,count);const dummy=new THREE.Object3D(),col=new THREE.Color();
  for(let i=0;i<count;i++){
    let x=rnd(-120,120),z=rnd(-120,120);
    if(Math.abs(x)<6&&z<74&&z>-85){x+=(x<0?-9:9)}
    dummy.position.set(x,-.14,z);dummy.rotation.set(0,rnd(0,Math.PI),rnd(-.18,.18));
    const sc=rnd(.54,1.45);dummy.scale.set(sc,sc,sc);dummy.updateMatrix();inst.setMatrixAt(i,dummy.matrix);
    col.setHSL(rnd(.18,.29),rnd(.12,.31),rnd(.15,.28));inst.setColorAt(i,col);
  }inst.instanceMatrix.needsUpdate=true;if(inst.instanceColor)inst.instanceColor.needsUpdate=true;inst.frustumCulled=false;scene.add(inst);
  // Gravel, clumped soil and fallen debris around pathways.
  const gravel=new THREE.InstancedMesh(new THREE.IcosahedronGeometry(.13,0),new THREE.MeshStandardMaterial({color:0x77796c,roughness:1}),mobile?160:570);
  for(let i=0;i<gravel.count;i++){
    let x=rnd(-105,105),z=rnd(-105,105);if(rand()<.7){x=rnd(-4.5,4.5);z=rnd(-80,75)}
    dummy.position.set(x,-.04,z);dummy.rotation.set(rnd(0,4),rnd(0,4),0);dummy.scale.set(rnd(.4,2.2),rnd(.2,.8),rnd(.4,2));dummy.updateMatrix();gravel.setMatrixAt(i,dummy.matrix);
  }gravel.instanceMatrix.needsUpdate=true;scene.add(gravel);
  for(let i=0;i<(mobile?11:30);i++){
    const x=rnd(-4.2,4.2),z=rnd(-72,52);const puddle=add(new THREE.CircleGeometry(rnd(.45,1.7),18),wet,scene,x,-.03,z);
    puddle.rotation.x=-Math.PI/2;puddle.scale.y=rnd(.27,.7);puddle.renderOrder=1
  }
  // Barn ambience: grain silo, farm water tower and collapsed fences.
  const silo=group(43,-44);
  cylinder(4.2,4.2,13,M.metal,0,7,0,silo,18);
  for(let j=0;j<9;j++)cylinder(4.24,4.24,.08,agedIron,0,j*1.35+1.2,0,silo,22);
  add(new THREE.ConeGeometry(4.55,3.1,18),M.roof,silo,0,15.1,0);
  const ladderMat=darkWood;for(let y=1;y<13;y+=.65)cube(1,.085,.14,ladderMat,3.94,y,0,silo);
  for(let z of [-.55,.55])cube(.1,12.4,.1,ladderMat,3.98,7,z,silo);
  block(43,-44,7,7);
  const tower=group(58,7);
  for(let x of [-2,2])for(let z of [-2,2])cylinder(.15,.18,10,agedIron,x,5,z,tower,5);
  cylinder(3.4,3.4,5.8,M.rust,0,13,0,tower,16);
  cylinder(3.55,3.55,.22,M.woodLight,0,16,0,tower,16);
  for(let h of [2.5,5.3,8.3])for(let x of [-2,2])cube(4.4,.14,.14,agedIron,0,h,x,tower);
  const towerSign=cube(2.7,.85,.08,M.white,0,15.3,3.48,tower);
  block(58,7,4,4);
  const wind=group(71,26);
  for(const x of [-1.4,1.4])for(const z of [-1.4,1.4]){
    const pole=cylinder(.07,.2,15,agedIron,x/2,7.7,z/2,wind,4);pole.rotation.z=-Math.sign(x)*.04
  }
  cylinder(.4,.56,1.5,agedIron,0,15.5,0,wind);
  const blades=new THREE.Group();blades.position.set(0,15.5,1.2);wind.add(blades);
  for(let a=0;a<7;a++){let blade=cube(.45,4.5,.13,M.metal,0,2.2,0,blades);blade.rotation.z=a*Math.PI*2/7;blade.position.set(-Math.sin(a*Math.PI*2/7)*2.2,Math.cos(a*Math.PI*2/7)*2.2,0)}
  const wheelHub=cylinder(.5,.5,.35,agedIron,0,0,.1,blades,12);wheelHub.rotation.x=Math.PI/2;
  block(71,26,3,3);
  // Scarecrow silhouette in dead corn field.
  const scare=group(7,57);cylinder(.10,.13,5,M.woodLight,0,2.5,0,scare);
  cube(3.6,.18,.26,M.woodLight,0,3.55,0,scare);ball(.51,M.straw,0,4.12,0,scare);cylinder(.64,.52,.39,M.dark,0,4.65,0,scare);
  for(const x of [-1,1]){let arm=cube(1.5,.7,.75,M.rust,x*1.38,3.2,0,scare);arm.rotation.z=x*.26}
  add(new THREE.ConeGeometry(.77,1.3,7),M.shirt,scare,0,2.5,0);
  // Crows perched on fenceposts and flying over the fields.
  const birds=[];const birdMat=new THREE.MeshBasicMaterial({color:0x191e1c,side:THREE.DoubleSide});
  for(let i=0;i<(mobile?5:11);i++){
    const b=new THREE.Group();scene.add(b);b.userData={a:rnd(0,6.28),h:rnd(16,32),rad:rnd(22,70),speed:rnd(.07,.17),phase:rnd(0,6.28)};
    ball(.27,birdMat,0,0,0,b);const left=add(new THREE.PlaneGeometry(2.2,.5),birdMat,b,-1.05,.05,0);left.rotation.z=-.17;
    const right=add(new THREE.PlaneGeometry(2.2,.5),birdMat,b,1.05,.05,0);right.rotation.z=.17;
    birds.push({b,left,right});
  }
  // Exterior trim, sagging porches, windows, abandoned farm equipment.
  const farmhouse=group(-28,-11);
  cube(18,.25,3.4,M.wood,0,.12,8,farmhouse);
  for(let x=-8;x<=8;x+=4){cylinder(.13,.15,3.4,M.woodLight,x,1.7,9.15,farmhouse);cube(.3,.22,1.8,M.woodLight,x,3.34,8.6,farmhouse)}
  for(let x of [-7.1,7.1]){cube(.29,3.4,.29,M.woodLight,x,1.7,6.15,farmhouse);cube(2.1,.13,.2,M.woodLight,x,3.38,6.15,farmhouse)}
  cube(5.6,.25,1.6,M.wood,0,.18,10.15,farmhouse);
  const litWindow=new THREE.MeshStandardMaterial({color:0xc3a172,emissive:0xc8864a,emissiveIntensity:.75,roughness:.5});
  cube(1.24,1.42,.05,litWindow,-4.95,4.55,6.73,farmhouse);
  cube(.13,1.7,.19,M.woodLight,-4.95,4.55,6.83,farmhouse);
  cube(1.43,.14,.17,M.woodLight,-4.95,4.55,6.85,farmhouse);
  cube(.82,2.6,.15,M.dark,0,1.5,6.77,farmhouse);
  cube(1.9,.15,.38,M.woodLight,0,2.78,6.84,farmhouse);
  const porchLamp=new THREE.PointLight(0xff9e5c,8,15,2);porchLamp.position.set(-24,4.1,-3.8);scene.add(porchLamp);
  ball(.11,amber,4,3.25,9.2,farmhouse);
  for(let i=0;i<10;i++){const x=15+i*1.45,z=-22+rnd(-.6,.6);const hay=group(x,z);cylinder(.72,.72,1.3,M.straw,0,.68,0,hay,10);cube(.15,1.4,.13,M.fence,0,.67,-.75,hay)}
  // Church architecture: bell and cross silhouette.
  const church=group(-39,34);
  for(let x of [-5.75,5.75])for(let z of [-9.8,9.8])cylinder(.2,.3,9.8,M.stone,x,5.1,z,church);
  cube(4.6,.35,5.4,M.stone,0,.18,11.6,church);
  const churchDoor=cube(2.4,4,.22,M.dark,0,2.1,10.18,church);
  cube(.13,3.75,.25,M.woodLight,0,2.1,10.35,church);
  cube(2.45,.14,.25,M.woodLight,0,3.8,10.35,church);
  // County road utility poles and power lines vanish in mist.
  for(let i=0;i<10;i++){let z=-89+i*19,x=-8.2+(i%3)*.5;
    const pole=group(x,z);cylinder(.15,.19,11,M.bark,0,5.5,0,pole);cube(5,.23,.25,M.bark2,0,10.5,0,pole);
    for(let a of [-1.65,0,1.65])ball(.13,M.white,a,10.65,0,pole);
    if(i<9)for(let a of [-1.65,1.65]){const x2=-8.2+((i+1)%3)*.5;
      const path=new THREE.CatmullRomCurve3([new THREE.Vector3(x+a,10.7,z),new THREE.Vector3((x+x2)/2+a,8.8,z+9.5),new THREE.Vector3(x2+a,10.7,z+19)]);
      add(new THREE.TubeGeometry(path,15,.028,3,false),agedIron)
    }
  }
  // Wind-blown dust and warm firefly motes.
  const dustCount=mobile?65:200;
  const dustPos=new Float32Array(dustCount*3),dustVel=new Float32Array(dustCount*3);
  for(let i=0;i<dustCount;i++){dustPos[i*3]=rnd(-105,105);dustPos[i*3+1]=rnd(.3,8);dustPos[i*3+2]=rnd(-105,105);dustVel[i*3]=rnd(.13,.42);dustVel[i*3+1]=rnd(-.09,.08);dustVel[i*3+2]=rnd(.04,.2)}
  const dustGeo=new THREE.BufferGeometry();dustGeo.setAttribute('position',new THREE.BufferAttribute(dustPos,3));
  const dustMat=new THREE.PointsMaterial({color:0xd6bb8e,size:mobile?.13:.18,transparent:true,opacity:.38,sizeAttenuation:true,depthWrite:false,blending:THREE.AdditiveBlending});
  const particles=new THREE.Points(dustGeo,dustMat);particles.frustumCulled=false;scene.add(particles);
  // More convincing traveller: leather rucksack, collar, scarf and sturdy boots.
  const bag=group(0,0);p.add(bag);
  cube(.75,.93,.38,darkWood,0,1.35,.54,bag);
  cube(.8,.2,.42,M.woodLight,0,1.8,.57,bag);
  for(let x of [-.23,.23]){cube(.12,1.3,.15,M.woodLight,x,1.55,.33,bag);cube(.43,.19,.54,M.black,x,.11,0,bag)}
  cylinder(.54,.57,.15,M.woodLight,0,2.06,0,bag,12);
  // Grounding: semi-transparent local ground shadow, dynamic with player.
  const shadow=add(new THREE.CircleGeometry(1.03,26),new THREE.MeshBasicMaterial({color:0x080e0a,transparent:true,opacity:.4,depthWrite:false}),scene,0,-.035,0);
  shadow.rotation.x=-Math.PI/2;
  for(const dynamic of [sky,moon,halo,inst,gravel,blades,particles,shadow,...birds.map(bird=>bird.b)])dynamic.userData.dynamic=true;
  const env={
    tick(time,dt,playerPosition,hour,reducedMotion=false){
      const day=Math.max(0,Math.sin((hour-5)/14*Math.PI));
      skyUniforms.uDay.value=day;skyUniforms.uTime.value=time*.0001;
      starMat.opacity=Math.max(0,1-day*2)*.85;
      moon.material.opacity=1-day;
      halo.material.opacity=Math.max(.04,1-day);
      blades.rotation.z+=dt*.6;
      for(const {b,left,right} of birds){
        const t=time*.001*b.userData.speed;
        const a=b.userData.a+t;
        b.position.set(Math.cos(a)*b.userData.rad, b.userData.h+Math.sin(t*7)*1.5, Math.sin(a)*b.userData.rad);
        b.rotation.y=-a+.4;let flutter=Math.sin(time*.006+b.userData.phase);
        left.rotation.y=flutter*.65;right.rotation.y=-flutter*.65;
      }
      for(let i=0;i<dustCount;i++){
        let k=i*3;dustPos[k]+=dt*dustVel[k];dustPos[k+1]+=dt*dustVel[k+1];dustPos[k+2]+=dt*dustVel[k+2];
        if(dustPos[k]>110)dustPos[k]=-110;if(dustPos[k+1]<.2)dustPos[k+1]=rnd(3,6);if(dustPos[k+1]>9)dustPos[k+1]=1.5;
        if(dustPos[k+2]>110)dustPos[k+2]=-110;
      }dustGeo.attributes.position.needsUpdate=true;
      dustMat.opacity=.12+day*.3;
      porchLamp.intensity=(7+(1-day)*9)*(1+(reducedMotion?0:Math.sin(time*.012)*.06));
      shadow.position.x=playerPosition.x;shadow.position.z=playerPosition.z;
    }
  };
  return env;
}