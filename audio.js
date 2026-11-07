// Synthesized ambience and feedback. No downloaded audio or autoplay.
export class SurvivalAudio {
  constructor() {
    this.context=null;
    this.enabled=false;
    this.volume=.45;
    this.stepTimer=0;
    this.heartTimer=0;
    this.growlTimer=0;
  }
  async enable() {
    const Audio=globalThis.AudioContext||globalThis.webkitAudioContext;
    if(!Audio) throw new Error('Audio unavailable');
    if(!this.context) {
      this.context=new Audio();
      const ctx=this.context;
      this.master=ctx.createGain();this.master.gain.value=this.volume;this.master.connect(ctx.destination);
      const buffer=ctx.createBuffer(1,ctx.sampleRate*2,ctx.sampleRate), samples=buffer.getChannelData(0);
      for(let i=0;i<samples.length;i++)samples[i]=Math.random()*2-1;
      this.noiseBuffer=buffer;
      this.ambience=ctx.createBufferSource();this.ambience.buffer=buffer;this.ambience.loop=true;
      this.wind=ctx.createBiquadFilter();this.wind.type='lowpass';this.wind.frequency.value=260;
      this.windGain=ctx.createGain();this.windGain.gain.value=.025;
      this.ambience.connect(this.wind);this.wind.connect(this.windGain);this.windGain.connect(this.master);this.ambience.start();
    }
    await this.context.resume();
    this.enabled=true;
    this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.15);
  }
  mute() {
    this.enabled=false;
    if(this.context)this.master.gain.setTargetAtTime(0,this.context.currentTime,.05);
  }
  setVolume(value) {
    this.volume=Math.max(0,Math.min(1,value));
    if(this.context&&this.enabled)this.master.gain.setTargetAtTime(this.volume,this.context.currentTime,.05);
  }
  tone(frequency,duration,volume=.1,type='sine',endFrequency=frequency) {
    if(!this.enabled||this.context.state!=='running')return;
    const ctx=this.context, start=ctx.currentTime;
    const oscillator=ctx.createOscillator(),gain=ctx.createGain();
    oscillator.type=type;oscillator.frequency.setValueAtTime(frequency,start);
    oscillator.frequency.exponentialRampToValueAtTime(Math.max(1,endFrequency),start+duration);
    gain.gain.setValueAtTime(.0001,start);gain.gain.exponentialRampToValueAtTime(volume,start+.012);
    gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    oscillator.connect(gain);gain.connect(this.master);oscillator.start(start);oscillator.stop(start+duration+.03);
    oscillator.onended=()=>{oscillator.disconnect();gain.disconnect();};
  }
  noise(duration,volume,frequency) {
    if(!this.enabled||this.context.state!=='running')return;
    const ctx=this.context, start=ctx.currentTime, source=ctx.createBufferSource();
    source.buffer=this.noiseBuffer;
    const filter=ctx.createBiquadFilter(),gain=ctx.createGain();
    filter.type='lowpass';filter.frequency.value=frequency;
    gain.gain.setValueAtTime(volume,start);gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
    source.connect(filter);filter.connect(gain);gain.connect(this.master);source.start();source.stop(start+duration);
    source.onended=()=>{source.disconnect();filter.disconnect();gain.disconnect();};
  }
  play(event) {
    if(event==='pickup') {this.tone(480,.13,.07,'sine',720);return;}
    if(event==='craft') {this.tone(260,.25,.1,'triangle',600);return;}
    if(event==='hit') {this.noise(.3,.32,550);this.tone(75,.35,.2,'triangle',30);return;}
    if(event==='flare') {this.noise(.6,.22,2100);return;}
    if(event==='thunder') {this.noise(2.8,.35,160);this.tone(38,2,.13,'sine',25);return;}
    if(event==='spotted') this.tone(135,.8,.12,'sawtooth',58);
  }
  tick(dt,{moving,sprinting,crouching,threat,storm,paused,health}) {
    if(!this.enabled||!this.context)return;
    this.master.gain.setTargetAtTime(paused?0:this.volume,this.context.currentTime,.12);
    if(paused)return;
    this.wind.frequency.setTargetAtTime(180+storm*1500,this.context.currentTime,.5);
    this.windGain.gain.setTargetAtTime(.025+storm*.08,this.context.currentTime,.5);
    this.stepTimer-=dt;this.heartTimer-=dt;this.growlTimer-=dt;
    if(moving&&this.stepTimer<=0) {
      this.noise(.09,crouching?.015:sprinting?.11:.055,220);
      this.stepTimer=sprinting?.28:crouching?.65:.42;
    }
    if((threat>.4||health<25)&&this.heartTimer<=0) {
      this.tone(52,.14,.12);this.tone(67,.22,.055);
      this.heartTimer=1.1-threat*.5;
    }
    if(threat>.15&&this.growlTimer<=0) {
      this.tone(49,.8,.045,'sawtooth',35);
      this.growlTimer=5;
    }
  }
}
