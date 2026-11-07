// Low-cost original creature and weather art. One instanced rain draw call.
export function createAtmosphere({THREE, scene, cube, cylinder, ball, group, mobile}) {
  const cloth = new THREE.MeshStandardMaterial({color:0x242b26,roughness:1,flatShading:true});
  const bone = new THREE.MeshStandardMaterial({color:0xa69a78,roughness:.95});
  const eye = new THREE.MeshBasicMaterial({color:0xffbf6c});
  const dark = new THREE.MeshStandardMaterial({color:0x151c17,roughness:1});
  const enemies = [];
  for (let index=0;index<3;index++) {
    const root=group(0,0), torso=new THREE.Group();root.add(torso);
    const chest=cylinder(.38,.7,1.6,cloth,0,2.15,0,torso,5);
    chest.rotation.z=.08;
    cylinder(.15,.2,.65,bone,0,3.15,0,torso,5);
    const head=ball(.36,bone,0,3.5,0,torso,0);head.scale.set(.8,1.4,.85);
    cylinder(.55,.55,.09,dark,0,3.8,0,torso,8);
    cylinder(.28,.4,.46,dark,0,4,0,torso,6);
    for (const side of [-1,1]) {
      ball(.065,eye,side*.14,3.52,.28,torso,0);
      const horn=cylinder(.02,.065,1.1,bone,side*.35,3.97,0,torso,4);horn.rotation.z=-side*.6;
      const twig=cylinder(.01,.04,.5,bone,side*.62,4.15,0,torso,3);twig.rotation.z=-side*1.2;
    }
    const legs=[],arms=[];
    for (const side of [-1,1]) {
      const leg=new THREE.Group();leg.position.set(side*.27,1.5,0);root.add(leg);
      cube(.17,1.5,.2,dark,0,-.75,0,leg);legs.push(leg);
      const arm=new THREE.Group();arm.position.set(side*.55,2.75,0);torso.add(arm);
      const limb=cube(.15,1.7,.18,cloth,side*.13,-.8,0,arm);limb.rotation.z=side*.17;
      for(let finger=0;finger<3;finger++) {
        const claw=cylinder(.015,.035,.55,bone,side*.28+(finger-1)*.09,-1.85,.08,arm,3);
        claw.rotation.x=.25;
      }
      arms.push(arm);
    }
    enemies.push({root,torso,legs,arms});
  }
  const count=mobile?230:650;
  const rain=new THREE.InstancedMesh(new THREE.PlaneGeometry(.025,.85),
    new THREE.MeshBasicMaterial({color:0xadc1c4,transparent:true,opacity:.25,depthWrite:false,side:THREE.DoubleSide}),count);
  rain.frustumCulled=false;
  rain.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  scene.add(rain);
  const drops=Array.from({length:count},(_,index)=>({
    x:((index*17.391)%1-.5)*58, z:((index*29.173)%1-.5)*58, y:(index*3.71)%26
  }));
  const dummy=new THREE.Object3D();
  const flareMaterial=new THREE.MeshBasicMaterial({color:0xff4e27,transparent:true,depthWrite:false});
  const flareGeometry=new THREE.SphereGeometry(.22,6,4);
  const flares=Array.from({length:3},()=>{
    const root=new THREE.Group();scene.add(root);
    const core=new THREE.Mesh(flareGeometry,flareMaterial);core.position.y=.25;root.add(core);
    const glow=new THREE.PointLight(0xff3616,0,mobile?16:23,2);glow.position.y=1.3;root.add(glow);
    const sparks=new THREE.BufferGeometry();
    const positions=new Float32Array(24*3);sparks.setAttribute('position',new THREE.BufferAttribute(positions,3));
    const smoke=new THREE.Points(sparks,new THREE.PointsMaterial({color:0xff8d49,size:.12,transparent:true,opacity:.7,depthWrite:false}));
    root.add(smoke);
    return {root,core,glow,smoke,positions};
  });
  const flash=new THREE.DirectionalLight(0xc4d9ec,0);flash.position.set(-24,36,12);scene.add(flash);
  return {
    tick(world,player,dt,reducedMotion) {
      for(let index=0;index<enemies.length;index++) {
        const model=enemies[index], enemy=world.enemies[index];
        model.root.position.set(enemy.x,0,enemy.z);
        model.root.rotation.y=enemy.heading;
        model.torso.rotation.z=Math.sin(enemy.phase*.5)*.07;
        model.torso.rotation.x=enemy.mode==='chase'?.22:.06;
        model.legs[0].rotation.x=Math.sin(enemy.phase)*.45;
        model.legs[1].rotation.x=-Math.sin(enemy.phase)*.45;
        model.arms[0].rotation.x=-Math.sin(enemy.phase)*.2;
        model.arms[1].rotation.x=Math.sin(enemy.phase)*.2;
        model.torso.position.y=Math.sin(enemy.phase*2)*.045;
      }
      rain.visible=world.storm>.03;
      if(rain.visible) {
        rain.material.opacity=world.storm*.28;
        for(let index=0;index<count;index++) {
          const drop=drops[index];drop.y-=dt*(reducedMotion?8:23);
          if(drop.y<0)drop.y+=26;
          dummy.position.set(player.x+drop.x,drop.y,player.z+drop.z);
          dummy.rotation.set(0,.5,-.18);dummy.scale.setScalar(1);dummy.updateMatrix();
          rain.setMatrixAt(index,dummy.matrix);
        }
        rain.instanceMatrix.needsUpdate=true;
      }
      flash.intensity=reducedMotion?0:world.lightning*3.5;
      for(let index=0;index<flares.length;index++) {
        const view=flares[index],flare=world.flares[index];
        view.root.visible=!!flare;
        if(!flare) {view.glow.intensity=0;continue;}
        view.root.position.set(flare.x,0,flare.z);
        const strength=Math.min(1,flare.life/2);
        view.glow.intensity=(mobile&&index>0?0:55)*strength*(.9+Math.sin(world.elapsed*21)*.1);
        view.core.scale.setScalar((1+Math.sin(world.elapsed*15)*.15)*strength);
        for(let spark=0;spark<24;spark++) {
          const phase=(world.elapsed*.8+spark/24)%1;
          view.positions[spark*3]=Math.sin(spark*7+phase*2)*phase*.8;
          view.positions[spark*3+1]=.3+phase*3;
          view.positions[spark*3+2]=Math.cos(spark*3+phase*2)*phase*.8;
        }
        view.smoke.geometry.attributes.position.needsUpdate=true;
        view.smoke.material.opacity=strength*.7;
      }
    }
  };
}
