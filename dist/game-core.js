/* Pure game rules, layout and hit testing, shared with regression tests. */
(function(root){
'use strict';
const LIMIT=5;
class Game {
  constructor(random=Math.random){this.random=random;this.nextId=0;this.reset('ready')}
  reset(mode){this.mode=mode;this.people=[];this.elapsed=0;this.spawnIn=.2;this.pending=null;this.score=0;this.saved=0;this.combo=0;this.comboUntil=0;this.dragId=null;this.events=[];this.endReason=null}
  practice(){this.reset('practice');this.people.push({id:++this.nextId,home:1,target:3,state:'wrong',slot:0,progress:0,lane:0})}
  start(){this.reset('playing');const home=Math.floor(this.random()*4);this.people.push({id:++this.nextId,home,target:(home+1)%4,state:'wrong',slot:0,progress:0,lane:0});for(let lane=0;lane<2;lane++){const h=(home+lane+1)%4;this.people.push({id:++this.nextId,home:h,target:(h+2)%4,state:'walking',progress:.08+lane*.13,lane,duration:6.4})}}
  get wrong(){return this.people.filter(p=>p.state==='wrong').length}
  get level(){return 1+Math.floor(this.elapsed/20)}
  get pace(){return 1+.9*(1-Math.exp(-this.elapsed/40))+.12*Math.log1p(this.elapsed/60)}
  get walkDuration(){return Math.max(2.2,6.4/this.pace)}
  get interval(){return Math.max(.24,1.05/this.pace)}
  plan(){const lanes=[0,1,2].filter(l=>!this.people.some(p=>p.state==='walking'&&p.lane===l));const windowRoute=!this.people.some(p=>p.state==='window')&&this.random()<(.18+.15*(1-Math.exp(-this.elapsed/50)));if(!windowRoute&&!lanes.length)return;const home=Math.floor(this.random()*4),target=(home+1+Math.floor(this.random()*3))%4;this.pending={home,target,lane:lanes[0]??0,windowRoute,wait:Math.max(.3,.45/this.pace)};this.events.push({type:'warning',home})}
  spawn(){const p=this.pending;if(!p)return;this.people.push({id:++this.nextId,home:p.home,target:p.target,lane:p.lane,state:p.windowRoute?'window':'walking',progress:0,duration:p.windowRoute?Math.max(2.8,5.5/this.pace):this.walkDuration});this.pending=null;this.spawnIn=this.interval}
  step(dt){if(this.mode!=='playing')return;this.elapsed+=dt;if(this.combo&&this.elapsed>this.comboUntil)this.combo=0;
    for(const p of this.people){if(!['walking','window'].includes(p.state)||p.id===this.dragId)continue;p.progress=Math.min(1,p.progress+dt/p.duration);if(p.progress===1){p.state='wrong';const used=new Set(this.people.filter(q=>q!==p&&q.state==='wrong'&&q.target===p.target).map(q=>q.slot));p.slot=[0,1,2,3,4].find(n=>!used.has(n));this.combo=0;this.events.push({type:'arrival',id:p.id});}}
    if(this.wrong>=LIMIT){this.end('lost');return}
    if(this.pending){this.pending.wait-=dt;if(this.pending.wait<=0)this.spawn()}else{this.spawnIn-=dt;if(this.spawnIn<=0)this.plan()}
  }
  pickup(id){if(!['playing','practice'].includes(this.mode)||this.dragId!==null)return false;if(!this.people.some(p=>p.id===id&&p.state!=='window'))return false;this.dragId=id;return true}
  cancel(){this.dragId=null}
  release(room){const p=this.people.find(p=>p.id===this.dragId);this.dragId=null;if(!p||!['practice','playing'].includes(this.mode))return {ok:false,reason:'inactive'};if(room!==p.home){this.combo=0;return {ok:false,reason:room===null?'outside':'wrong',home:p.home}}this.people=this.people.filter(q=>q!==p);if(this.mode==='practice'){return {ok:true,practice:true,home:p.home,points:0}}
    this.saved++;this.combo++;this.comboUntil=this.elapsed+4;const multiplier=this.combo>=6?3:this.combo>=3?2:1,points=10*multiplier;this.score+=points;return {ok:true,points,home:p.home,multiplier};
  }
  pause(){if(this.mode==='playing'||this.mode==='practice'){this.beforePause=this.mode;this.cancel();this.mode='paused'}}
  resume(){if(this.mode==='paused')this.mode=this.beforePause}
  end(reason){this.mode='ended';this.endReason=reason;this.cancel();this.pending=null}
}
function dropRoom(point,centre,rooms,home){for(const p of [point,centre]){const inside=rooms.findIndex(r=>p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom);if(inside>=0)return inside}const r=rooms[home],pad=16;return [point,centre].some(p=>p.x>=r.left-pad&&p.x<=r.right+pad&&p.y>=r.top-pad&&p.y<=r.bottom+pad)?home:null}
function layout(width,height){const wide=width/height>1.5&&width>=500,compact=!wide&&height<350;let size,rooms,windowBox,lanes;
if(wide){size=Math.min(50,Math.max(36,(height-50)/5));const gap=size+5,windowWidth=size+12,roomY=0,roomH=height-3*gap-8,roomW=(width-windowWidth)/4;rooms=Array.from({length:4},(_,i)=>({left:windowWidth+i*roomW,top:roomY,width:roomW,height:roomH}));windowBox={left:0,top:0,width:windowWidth-4,height};lanes=[0,1,2].map(i=>roomH+8+gap*(i+.5));}
else{size=compact?Math.min(40,(width/4-8)/2,(height-75)/6):Math.min(50,Math.max(34,(height-84)/8));const gap=size+5,windowH=size+22,roomH=height-windowH-3*gap-12;rooms=Array.from({length:4},(_,i)=>({left:i*width/4,top:windowH,width:width/4,height:roomH}));windowBox={left:0,top:0,width,height:windowH-4};lanes=[0,1,2].map(i=>windowH+roomH+12+gap*(i+.5));}
return {width,height,size,wide,columns:wide||compact?2:1,rooms,windowBox,lanes};}
function position(p,l){const room=l.rooms[p.state==='wrong'?p.target:p.home],centre=i=>l.rooms[i].left+l.rooms[i].width/2;if(p.state==='window'){if(l.wide){const a=(p.home+.5)*l.height/4,b=(p.target+.5)*l.height/4;return {x:l.windowBox.width/2,y:a+(b-a)*p.progress}}return {x:centre(p.home)+(centre(p.target)-centre(p.home))*p.progress,y:l.size/2+4}}
if(p.state==='wrong'){const cols=l.columns,row=Math.floor(p.slot/cols),col=p.slot%cols;return {x:room.left+room.width/2+(cols===2?(col-.5)*(l.size+4):0),y:room.top+22+l.size/2+row*(l.size+4)}}return {x:centre(p.home)+(centre(p.target)-centre(p.home))*p.progress,y:l.lanes[p.lane]};}
const api={Game,dropRoom,position,layout,LIMIT};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SleepGame=api;
})(globalThis);
