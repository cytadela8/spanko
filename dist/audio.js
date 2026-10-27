// Audio starts inside a real user gesture, as required by browser autoplay rules.
const NightSounds=(()=>{
let context,ready=false,lastAmbient=0;
const tunes={hello:[[392,0,.12],[523,.13,.12],[659,.26,.2]],click:[[550,0,.065]],potato:[[150,0,.16],[110,.18,.24]],popup:[[740,0,.12],[587,.15,.12],[740,.3,.18]],no:[[330,0,.18],[247,.2,.3]],sleep:[[523,0,.22],[440,.25,.22],[349,.5,.4]],test:[[440,0,.1],[554,.12,.1],[659,.24,.1],[880,.36,.3]],return:[[330,0,.12],[440,.14,.17]],win:[[659,0,.1],[880,.12,.2]]};
function tone(freq,delay,duration,kind='sine',volume=.16){const time=context.currentTime+delay,o=context.createOscillator(),g=context.createGain();o.type=kind;o.frequency.setValueAtTime(freq,time);o.frequency.exponentialRampToValueAtTime(freq*.92,time+duration);g.gain.setValueAtTime(.001,time);g.gain.linearRampToValueAtTime(volume,time+.015);g.gain.exponentialRampToValueAtTime(.001,time+duration);o.connect(g);g.connect(context.destination);o.start(time);o.stop(time+duration+.03)}
function play(name='click'){if(!ready||context.state!=='running')return;for(const [f,d,t] of tunes[name]||tunes.click)tone(f,d,t,name==='no'?'triangle':'sine')}
function snore(){if(!ready||context.state!=='running')return;const t=context.currentTime;const o=context.createOscillator(),g=context.createGain(),filter=context.createBiquadFilter();o.type='sawtooth';o.frequency.setValueAtTime(65,t);o.frequency.linearRampToValueAtTime(95,t+.5);o.frequency.linearRampToValueAtTime(50,t+1.1);filter.type='lowpass';filter.frequency.value=380;g.gain.setValueAtTime(.001,t);g.gain.linearRampToValueAtTime(.12,t+.3);g.gain.exponentialRampToValueAtTime(.001,t+1.2);o.connect(filter);filter.connect(g);g.connect(context.destination);o.start(t);o.stop(t+1.25)}
async function unlock(){try{context??=new(window.AudioContext||window.webkitAudioContext)();await context.resume();if(!ready){ready=true;lastAmbient=Date.now();play('hello')}}catch{}}
document.addEventListener('pointerdown',unlock,{passive:true});document.addEventListener('keydown',unlock);
document.addEventListener('click',e=>{const b=e.target.closest('button');if(!b)return;const ids={potato:'potato',more:'no',sleep:'sleep',return:'return',excuse:'no'};play(ids[b.id]||'click')});
setInterval(()=>{if(!ready||document.hidden||document.querySelector('#bye[open]')||!document.querySelector('#game.hidden'))return;const late=document.body.classList.contains('night');if(Date.now()-lastAmbient>(late?7000:14000)){lastAmbient=Date.now();snore();if(late)setTimeout(()=>play('popup'),1500)}},1000);
return {play,snore};
})();
