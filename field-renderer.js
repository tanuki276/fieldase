// Canvas compatibility renderer. It shares the same simulation, collisions,
// interactions and saves as the WebGL view; only the scene presentation differs.
export class FieldRenderer {
  constructor() {
    this.domElement=document.createElement('canvas');
    this.context=this.domElement.getContext('2d');
    if(!this.context)throw new Error('Canvas rendering unavailable');
    this.domElement.setAttribute('aria-label','農場の互換表示');
    this.shadowMap={};
    this.capabilities={getMaxAnisotropy:()=>1};
    this.ratio=1;
    this.width=1;this.height=1;
    this.isFieldRenderer=true;
    this.trees=Array.from({length:120},(_,index)=>{
      const angle=index*2.39996,radius=27+Math.sqrt((index+1)/120)*86;
      return {x:Math.cos(angle)*radius,z:Math.sin(angle)*radius,height:4+(index%5)};
    });
  }
  setView(getView) {this.getView=getView;}
  setPixelRatio(ratio) {this.ratio=Math.min(1.5,ratio);this.resize();}
  setSize(width,height) {this.width=width;this.height=height;this.resize();}
  resize() {
    this.domElement.width=Math.round(this.width*this.ratio);
    this.domElement.height=Math.round(this.height*this.ratio);
    this.domElement.style.width=this.width+'px';this.domElement.style.height=this.height+'px';
  }
  render() {
    if(!this.getView)return;
    const view=this.getView(),ctx=this.context,w=this.width,h=this.height;
    const walking=this.previousPlayer&&Math.hypot(view.player.x-this.previousPlayer.x,view.player.z-this.previousPlayer.z)>.001;
    this.previousPlayer={...view.player};
    const focus=view.started?view.player:{x:0,z:-14};
    const scale=Math.max(8,Math.min(18,w/65))/view.zoom;
    const at=(x,z,y=0)=>[w*.5+(x-focus.x)*scale*.86-(z-focus.z)*scale*.51,
      h*.53+(x-focus.x)*scale*.33+(z-focus.z)*scale*.56-y*scale];
    const polygon=(points,color,stroke)=>{
      ctx.beginPath();ctx.moveTo(...points[0]);
      for(let index=1;index<points.length;index++)ctx.lineTo(...points[index]);
      ctx.closePath();ctx.fillStyle=color;ctx.fill();
      if(stroke){ctx.strokeStyle=stroke;ctx.lineWidth=1;ctx.stroke();}
    };
    const ground=(x,z,width,depth,color)=>polygon([
      at(x-width/2,z-depth/2),at(x+width/2,z-depth/2),at(x+width/2,z+depth/2),at(x-width/2,z+depth/2)
    ],color);
    ctx.setTransform(this.ratio,0,0,this.ratio,0,0);
    ctx.fillStyle='#343e30';ctx.fillRect(0,0,w,h);
    ground(0,0,240,240,'#3e4935');
    ground(24,54,36,31,'#504d32');
    for(let row=0;row<12;row++)ground(24,40+row*2.5,35,.25,'#80704a55');
    ground(0,-5,6,165,'#776b50');ground(11,-30,48,4,'#776b50');ground(-14,-6,34,3.5,'#776b50');
    for(const x of [-2,2])ground(x,-5,.35,164,'#9e8a5e55');
    for(let index=0;index<180;index++) {
      const x=(index*17.19)%220-110,z=(index*37.73)%220-110;
      if(Math.abs(x)<4)continue;
      const point=at(x,z);ctx.strokeStyle='#afab6b19';ctx.beginPath();ctx.moveTo(...point);ctx.lineTo(point[0]+4,point[1]-2);ctx.stroke();
    }
    const objects=[];
    const near=(x,z)=>Math.hypot(x-focus.x,z-focus.z)<75;
    const enqueue=(x,z,draw)=>{if(near(x,z))objects.push({depth:x*.33+z*.56,draw});};
    const box=(x,z,width,depth,height,wall,roof)=>{
      const a=at(x-width/2,z-depth/2),b=at(x+width/2,z-depth/2),c=at(x+width/2,z+depth/2),d=at(x-width/2,z+depth/2);
      const top=[at(x-width/2,z-depth/2,height),at(x+width/2,z-depth/2,height),at(x+width/2,z+depth/2,height),at(x-width/2,z+depth/2,height)];
      ground(x+1,z+1,width+2,depth+2,'#14221860');
      polygon([b,c,top[2],top[1]],wall);
      polygon([c,d,top[3],top[2]],wall,'#e7c79a22');
      polygon([top[0],top[1],at(x,z-depth/2,height+2),at(x-width/2,z-depth/2,height)],roof);
      polygon([top[3],top[2],at(x,z+depth/2,height+2)],roof);
      polygon([at(x,z-depth/2,height+2),at(x,z+depth/2,height+2),top[2],top[1]],roof,'#d4bf9333');
      polygon([at(x-width/2,z-depth/2,height),at(x,z-depth/2,height+2),at(x,z+depth/2,height+2),top[3]],'#414b3e');
      const doorX=x-width*.13;
      polygon([at(doorX,z+depth/2),at(doorX+width*.2,z+depth/2),at(doorX+width*.2,z+depth/2,2.5),at(doorX,z+depth/2,2.5)],'#1b251e');
      for(const offset of [-width*.3,width*.3]) {
        polygon([at(x+offset-.45,z+depth/2,2.4),at(x+offset+.45,z+depth/2,2.4),at(x+offset+.45,z+depth/2,3.4),at(x+offset-.45,z+depth/2,3.4)],'#a28b5a');
      }
    };
    const buildings=[
      {x:25,z:-35,w:23,d:16,h:8,wall:'#795044',roof:'#363d34'},
      {x:-28,z:-11,w:16,d:13,h:6.5,wall:'#9f9e7a',roof:'#3b463a'},
      {x:-39,z:34,w:12,d:20,h:9,wall:'#9b9981',roof:'#42493d'},
      {x:27,z:24,w:11,d:9,h:5,wall:'#78674d',roof:'#39473b'},
      {x:43,z:-44,w:7,d:7,h:13,wall:'#7a8170',roof:'#4e5a4c'},
      {x:58,z:7,w:4,d:4,h:15,wall:'#725645',roof:'#666c59'}
    ];
    for(const building of buildings)enqueue(building.x,building.z,()=>box(building.x,building.z,building.w,building.d,building.h,building.wall,building.roof));
    for(const tree of this.trees) {
      if(Math.abs(tree.x)<6||view.collisions.some(box=>Math.abs(tree.x-box.x)<box.w/2+2&&Math.abs(tree.z-box.z)<box.d/2+2))continue;
      enqueue(tree.x,tree.z,()=>{
        const bottom=at(tree.x,tree.z),top=at(tree.x,tree.z,tree.height);
        ctx.strokeStyle='#252e24';ctx.lineWidth=scale*.17;ctx.beginPath();ctx.moveTo(...bottom);ctx.lineTo(...top);ctx.stroke();
        for(const side of [-1,1]){ctx.beginPath();ctx.moveTo(...at(tree.x,tree.z,tree.height*.55));ctx.lineTo(...at(tree.x+side*1.7,tree.z,tree.height*.9));ctx.stroke();}
        if(tree.height<6)polygon([at(tree.x-2,tree.z,tree.height*.55),at(tree.x,tree.z,tree.height+1),at(tree.x+2,tree.z,tree.height*.55)],'#293d2d');
      });
    }
    const halo=(x,z,color,radius)=>{
      const point=at(x,z),gradient=ctx.createRadialGradient(point[0],point[1],0,point[0],point[1],scale*radius);
      gradient.addColorStop(0,color);gradient.addColorStop(1,'#f4bc6000');
      ctx.fillStyle=gradient;ctx.fillRect(point[0]-scale*radius,point[1]-scale*radius,scale*radius*2,scale*radius*2);
    };
    for(const zone of [{x:-3,z:9},{x:-28,z:-3},{x:0,z:-63}])halo(zone.x,zone.z,'#edb65b42',8);
    for(const item of view.collectibles) {
      if(!item.active)continue;
      const {x,z}=item.group.position;
      enqueue(x,z,()=>{
        const colors={wood:'#a78853',stone:'#b6b29a',scrap:'#a86c51',food:'#c48575',fuel:'#cb8a4e',key:'#f2d089'};
        const point=at(x,z,.5),size=scale*.36;
        polygon([[point[0],point[1]-size],[point[0]+size,point[1]],[point[0],point[1]+size*.6],[point[0]-size,point[1]]],colors[item.type],'#ecdfac55');
        if(item.type==='fuel'||item.type==='key') {ctx.strokeStyle='#e1be7d88';ctx.beginPath();ctx.arc(point[0],point[1],size*1.8,0,Math.PI*2);ctx.stroke();}
      });
    }
    for(const note of view.notes)if(!view.world.records.includes(note.id))enqueue(note.x,note.z,()=>{
      const point=at(note.x,note.z,.4);ctx.fillStyle='#decca1';ctx.fillRect(point[0]-4,point[1]-5,8,10);
      ctx.fillStyle='#665d43';ctx.fillRect(point[0]-2,point[1]-2,4,1);
    });
    enqueue(0,-63,()=>{
      box(0,-63,3.3,6,1.2,'#96644e','#9b7055');
      polygon([at(-1.4,-64,1.2),at(1.4,-64,1.2),at(1.4,-64,2.5),at(-1.4,-64,2.5)],'#c5bd89');
    });
    const person=(x,z,color,height,enemy=false)=>{
      const feet=at(x,z),head=at(x,z,height-.3),shoulders=at(x,z,height*.63);
      ctx.fillStyle='#0d1d1766';ctx.beginPath();ctx.ellipse(feet[0],feet[1],scale*.6,scale*.24,0,0,Math.PI*2);ctx.fill();
      const stride=enemy||walking?Math.sin(view.world.elapsed*(enemy?8:11))*scale*.2:0;
      ctx.strokeStyle=color;ctx.lineWidth=scale*(enemy?.16:.24);
      ctx.beginPath();ctx.moveTo(shoulders[0],shoulders[1]);ctx.lineTo(feet[0]-stride,feet[1]);ctx.moveTo(shoulders[0]+scale*.25,shoulders[1]);ctx.lineTo(feet[0]+stride,feet[1]);ctx.stroke();
      polygon([[shoulders[0]-scale*.35,shoulders[1]-scale*.2],[shoulders[0]+scale*.35,shoulders[1]-scale*.2],[feet[0]+scale*.4,feet[1]-scale*.7],[feet[0]-scale*.4,feet[1]-scale*.7]],color);
      ctx.fillStyle=enemy?'#b2a77c':'#d2bc8b';ctx.beginPath();ctx.arc(head[0],head[1],scale*.23,0,Math.PI*2);ctx.fill();
      ctx.fillStyle='#18291f';ctx.fillRect(head[0]-scale*.4,head[1]-scale*.25,scale*.8,scale*.12);
      if(enemy) {
        ctx.strokeStyle='#b9b08e';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(head[0]-scale*.12,head[1]);ctx.lineTo(head[0]-scale*.55,head[1]-scale*.8);ctx.moveTo(head[0]+scale*.12,head[1]);ctx.lineTo(head[0]+scale*.55,head[1]-scale*.8);ctx.stroke();
        ctx.fillStyle='#ffbc70';ctx.fillRect(head[0]-scale*.15,head[1],2,2);ctx.fillRect(head[0]+scale*.1,head[1],2,2);
      }
    };
    for(const enemy of view.world.enemies)enqueue(enemy.x,enemy.z,()=>person(enemy.x,enemy.z,'#202a24',4,true));
    enqueue(view.player.x,view.player.z,()=>person(view.player.x,view.player.z,'#bdaf80',view.crouching?2.1:2.9));
    objects.sort((a,b)=>a.depth-b.depth);
    for(const object of objects)object.draw();
    const fire=at(-3,9,.5);ctx.fillStyle='#efbd5e';ctx.beginPath();ctx.arc(fire[0],fire[1],scale*.27,0,Math.PI*2);ctx.fill();
    for(const flare of view.world.flares){halo(flare.x,flare.z,'#fa593d88',12);const point=at(flare.x,flare.z,.3);ctx.fillStyle='#ffd18f';ctx.fillRect(point[0]-3,point[1]-3,6,6);}
    if(view.lantern)halo(view.player.x,view.player.z,'#f4c37538',10);
    const darkness=Math.max(0,1-Math.max(0,Math.sin((view.hour-5)/14*Math.PI)))*.2;
    ctx.fillStyle='rgba(7,17,20,'+darkness+')';ctx.fillRect(0,0,w,h);
    const fog=ctx.createRadialGradient(w*.5,h*.53,scale*7,w*.5,h*.53,scale*(36-view.world.mist*13));
    fog.addColorStop(0,'#aeb7a200');fog.addColorStop(1,'#758b7bd9');ctx.fillStyle=fog;ctx.fillRect(0,0,w,h);
    if(view.world.storm>.1) {
      ctx.strokeStyle='rgba(194,211,204,'+(view.world.storm*.3)+')';ctx.lineWidth=1;ctx.beginPath();
      for(let index=0;index<90;index++) {
        const x=(index*97.1)%w,y=(index*73.71+view.world.elapsed*(view.reducedMotion?80:350))%h;
        ctx.moveTo(x,y);ctx.lineTo(x-3,y+12);
      }
      ctx.stroke();
    }
  }
}
