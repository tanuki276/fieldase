import test from 'node:test';
import assert from 'node:assert/strict';
import {createSurvival,stepSurvival,lineBlocked,safeZone,igniteFlare,dodge,respawnSurvival,snapshotSurvival} from '../survival.js';

const player={x:28,z:-5,moving:false,sprinting:false,crouching:false,lantern:false};
function isolatedWorld() {
  const world=createSurvival();world.grace=0;
  world.enemies=world.enemies.slice(0,1);
  Object.assign(world.enemies[0],{x:28,z:-12,heading:0});
  return world;
}
function simulate(world,input,seconds,collisions=[]) {
  const events=[];
  for(let time=0;time<seconds;time+=.05)events.push(...stepSurvival(world,input,collisions,.05));
  return events;
}

test('legacy and malformed saves retain valid defaults',()=>{
  assert.equal(createSurvival().difficulty,'survivor');
  assert.equal(createSurvival(null).enemies.length,3);
  const world=createSurvival({elapsed:-10,difficulty:'__proto__',records:'arrival',enemies:[{x:NaN,z:Infinity}],flares:[null,{}, {x:0,z:0,life:100}]});
  assert.equal(world.elapsed,0);assert.equal(world.difficulty,'survivor');
  assert.deepEqual(world.records,[]);assert.equal(world.enemies[0].x,28);
  assert.deepEqual(world.flares,[{x:0,z:0,life:16}]);
});
test('buildings occlude sight for vertical, horizontal, and diagonal rays',()=>{
  const boxes=[{x:0,z:0,w:4,d:4}];
  assert.equal(lineBlocked({x:0,z:-8},{x:0,z:8},boxes),true);
  assert.equal(lineBlocked({x:-8,z:0},{x:8,z:0},boxes),true);
  assert.equal(lineBlocked({x:-8,z:-8},{x:8,z:8},boxes),true);
  assert.equal(lineBlocked({x:3,z:-8},{x:3,z:8},boxes),false);
  assert.equal(lineBlocked({x:0,z:5},{x:0,z:8},boxes),false);
});
test('visible players trigger pursuit, a wall hides a quiet player',()=>{
  const visible=isolatedWorld();simulate(visible,player,.3);
  assert.equal(visible.enemies[0].mode,'chase');
  const hidden=isolatedWorld();simulate(hidden,player,.3,[{x:28,z:-8.5,w:8,d:2}]);
  assert.equal(hidden.enemies[0].mode,'patrol');
});
test('crouching avoids detection beyond its sight radius',()=>{
  const crouched=isolatedWorld(),standing=isolatedWorld();
  const position={...player,z:4};
  simulate(crouched,{...position,crouching:true},.2);simulate(standing,position,.2);
  assert.equal(crouched.enemies[0].mode,'patrol');
  assert.equal(standing.enemies[0].mode,'chase');
});
test('sprinting is heard behind an enemy and through a wall',()=>{
  const world=isolatedWorld();world.enemies[0].heading=Math.PI;
  simulate(world,{...player,moving:true,sprinting:true},.2,[{x:28,z:-8.5,w:8,d:2}]);
  assert.equal(world.enemies[0].mode,'investigate');
});
test('safe lights prevent attacks, even when a pursuer is adjacent',()=>{
  const world=isolatedWorld();Object.assign(world.enemies[0],{x:0,z:10,mode:'chase'});
  const refuge={...player,x:0,z:9};
  assert.ok(safeZone(refuge));
  assert.equal(simulate(world,refuge,3).some(event=>event.type==='hit'),false);
  assert.ok(world.threat<.1);
});
test('flare repels a nearby pursuer and expires',()=>{
  const world=isolatedWorld();world.enemies[0].mode='chase';
  assert.equal(igniteFlare(world,player),true);
  assert.equal(igniteFlare(world,player),false);
  simulate(world,player,.2);assert.equal(world.enemies[0].mode,'flee');
  simulate(world,{...player,x:0,z:9},17);assert.equal(world.flares.length,0);
});
test('dodging grants a short invulnerability window and a cooldown',()=>{
  const world=isolatedWorld();Object.assign(world.enemies[0],{z:-6,mode:'chase',cooldown:0});
  assert.equal(dodge(world),true);assert.equal(dodge(world),false);
  assert.equal(simulate(world,player,.3).some(event=>event.type==='hit'),false);
  assert.equal(simulate(world,player,2).some(event=>event.type==='hit'),true);
});
test('enemy hits respect damage and cooldown',()=>{
  const world=isolatedWorld();Object.assign(world.enemies[0],{z:-6,mode:'chase',cooldown:0});
  const events=simulate(world,player,1);
  assert.equal(events.filter(event=>event.type==='hit').length,1);
  assert.equal(events.find(event=>event.type==='hit').damage,13);
});
test('pursuers lose a hidden player and return to patrol',()=>{
  const world=isolatedWorld();simulate(world,player,.2);
  simulate(world,{...player,x:-100,z:-100},14);
  assert.equal(world.enemies[0].mode,'patrol');
});
test('weather progresses and state survives JSON save/restore',()=>{
  const world=createSurvival();world.elapsed=90;world.records=['arrival'];
  igniteFlare(world,player);simulate(world,{...player,x:0,z:9},15);
  assert.ok(world.storm>.7);
  const restored=createSurvival(JSON.parse(JSON.stringify(snapshotSurvival(world))));
  assert.equal(restored.elapsed,world.elapsed);assert.equal(restored.records[0],'arrival');
  assert.equal(restored.stats.flares,1);assert.equal(restored.flares.length,1);
});
test('respawn resets threats and grants time to recover',()=>{
  const world=isolatedWorld();world.enemies[0].mode='chase';
  respawnSurvival(world);
  assert.equal(world.grace,15);assert.equal(world.stats.downed,1);
  assert.equal(world.enemies[0].mode,'patrol');
  assert.equal(simulate(world,player,1).some(event=>event.type==='hit'),false);
});
