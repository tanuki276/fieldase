import test from 'node:test';
import assert from 'node:assert/strict';
import {SurvivalAudio} from '../audio.js';

function parameter() {
  return {
    value:0,
    setTargetAtTime(value){assert.ok(Number.isFinite(value),'audio parameters must be finite');},
    setValueAtTime(value){assert.ok(Number.isFinite(value));},
    exponentialRampToValueAtTime(value){assert.ok(Number.isFinite(value));}
  };
}
class AudioContextMock {
  currentTime=0;sampleRate=100;state='running';destination={};
  createGain(){return {gain:parameter(),connect(){},disconnect(){}};}
  createBiquadFilter(){return {frequency:parameter(),connect(){},disconnect(){}};}
  createBuffer(channels,count){return {getChannelData:()=>new Float32Array(count)};}
  createBufferSource(){return {connect(){},start(){},stop(){},disconnect(){}};}
  createOscillator(){return {frequency:parameter(),connect(){},start(){},stop(){},disconnect(){}};}
  resume(){return Promise.resolve();}
}
test('sound remains off until enabled and can pause/resume without missing input values',async()=>{
  globalThis.AudioContext=AudioContextMock;
  const audio=new SurvivalAudio();
  audio.play('hit');assert.equal(audio.context,null);
  await audio.enable();assert.equal(audio.enabled,true);
  audio.tick(0,{paused:true});
  audio.tick(0,{paused:false});
  audio.tick(.016,{moving:true,sprinting:true,threat:.8,storm:1,health:15});
  audio.play('thunder');audio.play('hit');
  audio.mute();assert.equal(audio.enabled,false);
  audio.setVolume(2);assert.equal(audio.volume,1);
  delete globalThis.AudioContext;
});
