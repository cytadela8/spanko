/* Game rules and hit-testing stay separate from animation and input. */
(function(root){
'use strict';
const LIMIT=5,DURATION=60;
class Game {
  constructor(random=Math.random){this.random=random;this.nextId=0;this.reset('ready')}
  reset(mode){this.mode=mode;this.people=[];this.elapsed=0;this.spawnIn=1;this.pending=null;this.score=0;this.saved=0;this.combo=0;this.comboUntil=0;this.dragId=null;this.events=[];this.endReason=null}
  practice(){this.reset('practice');this.people.push({id:++this.nextId,home:1,target:3,state:'wrong',slot:0,progress:0,lane:0})}
  start(){this.reset('playing')}
  get wrong(){return this.people.filter(p=>p.state==='wrong').length}
  get level(){return Math.min(3,1+Math.floor(this.elapsed/20))}
  plan(){const lanes=[0,1,2].filter(l=>!this.people.some(p=>p.state==='walking'&&p.lane===l));if(!lanes.length)return;const home=Math.floor(this.random()*4),target=(home+1+Math.floor(this.random()*3))%4;const windowRoute=this.level>=2&&!this.people.some(p=>p.state==='window')&&this.random()<.3;this.pending={home,target,lane:lanes[0],windowRoute,wait:.85};this.events.push({type:'warning',home})}
  spawn(){const p=this.pending;if(!p)return;this.people.push({id:++this.nextId,home:p.home,target:p.target,lane:p.lane,state:p.windowRoute?'window':'walking',progress:0,duration:p.windowRoute?6.5:[11,9,7][this.level-1]});this.pending=null;this.spawnIn=[3.2,2.4,1.65][this.level-1]}
  step(dt){if(this.mode!=='playing')return;this.elapsed+=dt;if(this.combo&&this.elapsed>this.comboUntil)this.combo=0;
    for(const p of this.people){if(!['walking','window'].includes(p.state)||p.id===this.dragId)continue;p.progress=Math.min(1,p.progress+dt/p.duration);if(p.progress===1){p.state='wrong';const used=new Set(this.people.filter(q=>q!==p&&q.state==='wrong'&&q.target===p.target).map(q=>q.slot));p.slot=[0,1,2,3,4].find(n=>!used.has(n));this.combo=0;this.events.push({type:'arrival',id:p.id});}}
    if(this.wrong>=LIMIT){this.end('lost');return}if(this.elapsed>=DURATION){this.elapsed=DURATION;this.end('won');return}
    if(this.pending){this.pending.wait-=dt;if(this.pending.wait<=0)this.spawn()}else{this.spawnIn-=dt;if(this.spawnIn<=0)this.plan()}
  }
  pickup(id){if(!['playing','practice'].includes(this.mode)||this.dragId!==null)return false;if(!this.people.some(p=>p.id===id&&p.state!=='window'))return false;this.dragId=id;return true}
  cancel(){this.dragId=null}
  release(room){const p=this.people.find(p=>p.id===this.dragId);this.dragId=null;if(!p||!['practice','playing'].includes(this.mode))return {ok:false,reason:'inactive'};if(room!==p.home){this.combo=0;return {ok:false,reason:room===null?'outside':'wrong',home:p.home}}
    this.people=this.people.filter(q=>q!==p);if(this.mode==='practice'){this.start();return {ok:true,practice:true,home:p.home,points:0}}
    this.saved++;this.combo++;this.comboUntil=this.elapsed+4;const multiplier=this.combo>=6?3:this.combo>=3?2:1,points=10*multiplier;this.score+=points;return {ok:true,points,home:p.home,multiplier};
  }
  pause(){if(this.mode==='playing'||this.mode==='practice'){this.beforePause=this.mode;this.cancel();this.mode='paused'}}
  resume(){if(this.mode==='paused')this.mode=this.beforePause}
  end(reason){this.mode='ended';this.endReason=reason;this.cancel();this.pending=null}
}
// Pointer/actor centre, not the element underneath it: occupied rooms are valid targets.
// A small edge allowance applies only to the correct room and never to another room's interior.
function dropRoom(point,centre,rooms,home){for(const p of [point,centre]){const inside=rooms.findIndex(r=>p.x>=r.left&&p.x<=r.right&&p.y>=r.top&&p.y<=r.bottom);if(inside>=0)return inside}const r=rooms[home],pad=16;return [point,centre].some(p=>p.x>=r.left-pad&&p.x<=r.right+pad&&p.y>=r.top-pad&&p.y<=r.bottom+pad)?home:null}
function position(p,width){const x=i=>(i+.5)*width/4;return p.state==='wrong'?{x:x(p.target),y:185+p.slot*54}:{x:x(p.home)+(x(p.target)-x(p.home))*p.progress,y:p.state==='window'?43:452+p.lane*58}}
const api={Game,dropRoom,position,LIMIT,DURATION};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.SleepGame=api;
})(globalThis);
