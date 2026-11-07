import test from 'node:test';
import assert from 'node:assert/strict';
import {FieldRenderer} from '../field-renderer.js';
import {createSurvival,JOURNAL} from '../survival.js';

test('Canvas compatibility renders desktop, portrait and landscape without WebGL',()=>{
  let commands=0;
  const context=new Proxy({}, {
    get:(_,method)=>{
      if(method==='createRadialGradient')return (...values)=>{
        assert.ok(values.every(Number.isFinite));
        return {addColorStop(){}};
      };
      return (...values)=>{
        if(['setTransform','moveTo','lineTo','arc','ellipse','fillRect'].includes(method))assert.ok(values.every(Number.isFinite));
        commands++;
      };
    },set:()=>true
  });
  const canvas={style:{},setAttribute(){},getContext:()=>context};
  globalThis.document={createElement:()=>canvas};
  const renderer=new FieldRenderer(),world=createSurvival();
  world.storm=1;world.mist=.8;world.flares=[{x:0,z:9,life:12}];
  renderer.setView(()=>({
    player:{x:0,z:9},world,collisions:[{x:25,z:-35,w:21,d:14}],
    collectibles:[{active:true,type:'fuel',group:{position:{x:25,z:-27}}}],
    notes:JOURNAL,started:true,zoom:1,hour:22,crouching:false,lantern:true,reducedMotion:true
  }));
  renderer.setPixelRatio(2);
  for(const [width,height] of [[1363,936],[390,844],[844,390]]) {
    renderer.setSize(width,height);renderer.render();
    assert.equal(canvas.width,Math.round(width*1.5));
    assert.equal(canvas.height,Math.round(height*1.5));
  }
  assert.ok(commands>300);assert.equal(renderer.isFieldRenderer,true);
  delete globalThis.document;
});
