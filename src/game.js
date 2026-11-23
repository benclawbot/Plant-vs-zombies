import {PLANTS,ZOMBIES,LEVELS} from './data.js';
const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
export class Game {
 constructor(config,loadout=[0,1,3,4,5,7],saved=null){
  this.config={...LEVELS[0],...config};this.rows=this.config.rows;this.loadout=[...loadout];this.rng=23871+this.config.index*321+this.config.round*73||23871;this.nextId=1;this.time=0;this.sun=50;this.money=0;this.plants=[];this.zombies=[];this.shots=[];this.drops=[];this.effects=[];this.graves=[];this.craters=[];this.ice=[];this.vases=[];this.events=[];this.cooldowns={};this.mowers=Array.from({length:this.rows},(_,row)=>({id:this.id(),row,x:-.65,px:-.65,used:false,active:false,available:!this.water(row)&&this.config.stage!==4||!!this.config.cleaners}));this.status='playing';this.kills=0;this.collected=0;this.spawnIndex=0;this.sky=6;this.fogClear=0;this.matches=0;this.matchSelected=null;this.brains=Array(this.rows).fill(true);this.fish=[];this.food=[];this.conveyor=[];this.conveyorTimer=0;this.round=this.config.round||1;this.score=0;this.bowlingBalls=[];this.spawnClock=0;this.spawnCredit=0;this.setDifficulty(this.config.difficulty??3);this.setup();
  if(saved){const data=structuredClone(saved);Object.assign(this,data);this.events=[];this.status='playing';this.spawnClock=data.spawnClock??data.time??0;this.spawnCredit=data.spawnCredit??0;this.setDifficulty(data.difficulty??this.config.difficulty??3);}
 }
 setDifficulty(value){const level=Number(value);this.difficulty=clamp(Number.isFinite(level)?Math.round(level):3,1,10);this.config.difficulty=this.difficulty;return this.difficulty;}
 difficultyFactors(){const offset=this.difficulty-6;return {pace:1+offset*.1,density:1+offset*.12,movement:1+offset*.08};}
 id(){return this.nextId++;}
 random(){this.rng=(Math.imul(this.rng,1664525)+1013904223)>>>0;return this.rng/4294967296;}
 pick(list){return list[Math.floor(this.random()*list.length)];}
 water(row){return (this.config.stage===2||this.config.stage===3)&&[2,3].includes(row);}
 active(row){return !this.config.active||this.config.active.includes(row);}
 cell(row,col){return this.plants.filter(p=>p.row===row&&p.col===col&&p.hp>0);}
 main(row,col){return this.cell(row,col).find(p=>!['base','armor'].includes(PLANTS[p.type].kind));}
 protected(row,x){return this.plants.some(p=>p.type===37&&Math.abs(p.row-row)<=1&&Math.abs(p.x-x)<1.6);}
 setup(){
  const c=this.config,mode=c.challenge;
  if(c.stage===1||c.stage===3){for(let i=0;i<(c.stage===1?3:2)+Math.floor(c.n/3);i++){const row=this.pick(Array.from({length:this.rows},(_,r)=>r).filter(r=>!this.water(r))),col=5+Math.floor(this.random()*4);if(!this.graves.some(g=>g.row===row&&g.col===col))this.graves.push({id:this.id(),row,col,x:col+.5});}}
  this.sun=mode==='laststand'?5000:mode==='izombie'?175:mode==='match'||mode==='twist'?500:50;
  this.schedule=[];
  if(mode==='whack'){this.graves=[];for(let row=0;row<this.rows;row++)for(let col=3;col<9;col+=2)this.graves.push({id:this.id(),row,col,x:col+.5});}
  if(['vases','izombie','match','twist','aquarium'].includes(mode))this.graves=[];
  if(mode==='vases'){
   for(let row=0;row<this.rows;row++)for(let col=4;col<9;col++){
    const hostile=this.random()<.38;this.vases.push({id:this.id(),row,col,x:col+.5,hostile,type:hostile?this.pick([0,0,2,4,24]):this.pick([0,1,3,4,7,17,29]),green:!hostile&&this.random()<.18});
   }this.conveyor=[7,7,17];return;
  }
  if(mode==='izombie'){
   for(let row=0;row<this.rows;row++)for(let col=0;col<5;col++)this.addPlant(this.pick(col<2?[1,1,4,0]:[0,0,3,5,7,8,10]),row,col,true);
   return;
  }
  if(mode==='match'||mode==='twist'){for(let r=0;r<this.rows;r++)for(let col=0;col<8;col++)this.addPlant(this.pick([0,1,3,5,7]),r,col,true);this.resolveMatches(false);}
  if(mode==='aquarium'){this.sun=100;this.addFish();this.addFish();return;}
  const rows=Array.from({length:this.rows},(_,r)=>r).filter(r=>this.active(r));
  let t=18;const count=8+c.n*2+c.stage*3+(c.hard?18:0)+(c.survival?(this.round-1)*5:0);
  if(mode==='boss'){this.schedule.push({time:10,type:25,row:2});t=20;}
  for(let i=0;i<count;i++){
   t+=Math.max(2.5,(c.duration-25)/count)*(0.75+this.random()*.5);
   let row=this.pick(rows);let roster=c.roster||[0,2,4];let type=i<2?0:this.pick(roster);
   if(this.water(row))type=this.pick([10,10,11,...(c.n>4?[14]:[])]);
   if(mode==='sled'){row=this.pick(rows.filter(r=>!this.water(r)));type=i%3===0?12:13;}
   if(mode==='pogo')type=this.pick([18,18,7]);
   if(mode==='bungee'&&i%3===0)type=20;
   if(mode==='boss'){type=this.pick([0,2,4,20,23]);row=this.pick(rows);}
   this.schedule.push({time:t,type,row});
  }
  for(let flag=1;flag<=c.flags;flag++){
   const time=18+(t-18)*flag/c.flags;
   rows.forEach((row,i)=>this.schedule.push({time:time+i*.45,type:this.water(row)?10:this.pick(c.roster||[0,2]),row,flag:i===0}));
  }
  this.schedule.sort((a,b)=>a.time-b.time);
  if(mode==='laststand')this.schedule.forEach(s=>s.time+=18);
  if(mode==='stars')this.starTargets=[[0,4],[1,3],[1,5],[2,2],[2,3],[2,4],[2,5],[2,6],[3,3],[3,5],[4,4]];
 }
 addPlant(type,row,col,free=false){
  const def=PLANTS[type];const p={id:this.id(),type,row,col,x:col+.5,px:col+.5,hp:def.hp,age:0,timer:def.kind==='sun'?7:def.kind==='mine'?def.arm:.7,attack:0,flash:0,sleep:!!def.mushroom&&![1,3].includes(this.config.stage),ladder:false};this.plants.push(p);return p;
 }
 place(type,row,col,{free=false,imitate=0}={}){
  if(this.status!=='playing'||!Number.isInteger(row)||!Number.isInteger(col)||row<0||row>=this.rows||col<0||col>=9)return {ok:false,reason:'Choose a lawn square.'};
  if(type===48)type=imitate;
  const d=PLANTS[type];if(!d)return {ok:false,reason:'Unknown seed.'};
  const conveyor=['conveyor','storm','bowling','bowling2','rain','vases','boss'].includes(this.config.challenge);
  if(!free&&!this.loadout.includes(type)&&!conveyor)return {ok:false,reason:'That seed is not in your tray.'};
  if(!free&&!conveyor&&(this.cooldowns[type]||0)>0)return {ok:false,reason:'Seed is recharging.'};
  if(!free&&!conveyor&&this.sun<d.cost)return {ok:false,reason:'Not enough sun.'};
  const cell=this.cell(row,col),base=cell.find(p=>PLANTS[p.type].kind==='base'),main=this.main(row,col),armor=cell.find(p=>p.type===30);
  if(this.vases.some(v=>v.row===row&&v.col===col))return {ok:false,reason:'Break the vase first.'};
  if(this.ice.some(i=>i.row===row&&i.col===col&&i.until>this.time))return {ok:false,reason:'The ground is frozen.'};
  if(this.craters.some(i=>i.row===row&&i.col===col&&i.until>this.time))return {ok:false,reason:'Wait for the crater to fill.'};
  const grave=this.graves.find(g=>g.row===row&&g.col===col);
  if(d.kind==='grave'&&!grave)return {ok:false,reason:'Plant Grave Buster on a grave.'};
  if(grave&&d.kind!=='grave')return {ok:false,reason:'A grave blocks this square.'};
  if(d.kind==='coffee'){
   if(!main||!main.sleep)return {ok:false,reason:'Coffee wakes sleeping mushrooms.'};main.sleep=false;this.effect('wake',main.x,row);this.pay(d,free,conveyor);this.events.push({type:'sound',name:'plant'});return {ok:true};
  }
  let upgradeNext=null;
  if(d.upgrade!==undefined){
   if(d.wide){const next=this.main(row,col+1);if(!main||main.type!==34||!next||next.type!==34||col>=8)return {ok:false,reason:'Two adjacent Kernel-pults are required.'};upgradeNext=next;}
   if(d.upgrade===16){if(!base||base.type!==16||main)return {ok:false,reason:'Cattail upgrades an empty Lily Pad.'};}
   else if(!main||main.type!==d.upgrade)return {ok:false,reason:`Place over ${PLANTS[d.upgrade].name}.`};
  }else if(d.kind==='base'){
   if(cell.length)return {ok:false,reason:'This square is occupied.'};if(type===16&&!this.water(row))return {ok:false,reason:'Lily Pads belong in the pool.'};
  }else if(d.kind==='armor'){
   if(armor)return {ok:false,reason:'Pumpkin is already protecting this square.'};
  }else if(main){
   if(this.config.firstAid&&[3,23].includes(type)&&main.type===type){main.hp=d.hp;this.pay(d,free,conveyor);return {ok:true};}
   return {ok:false,reason:'This square is occupied.'};
  }
  if(this.water(row)&&!d.water&&!base&&d.upgrade!==16)return {ok:false,reason:'Plant a Lily Pad first.'};
  if(!this.water(row)&&d.water)return {ok:false,reason:'This plant needs water.'};
  if(this.config.stage===4&&!base&&d.kind!=='base')return {ok:false,reason:'Plant a Flower Pot first.'};
  if(d.wide&&this.cell(row,col+1).some(p=>PLANTS[p.type].kind!=='base'&&p.hp>0&&p!==upgradeNext))return {ok:false,reason:'The second square is occupied.'};
  if(d.upgrade!==undefined){if(main)main.hp=0;if(upgradeNext)upgradeNext.hp=0;if(d.upgrade===16)base.hp=0;}
  this.pay(d,free,conveyor);const p=this.addPlant(type,row,col);this.events.push({type:'sound',name:'plant'},{type:'achievement',key:'first'});this.effect('plant',p.x,row);return {ok:true,plant:p};
 }
 pay(d,free,conveyor){if(!free&&!conveyor){this.sun-=d.cost;this.cooldowns[d.id]=d.recharge;}if(conveyor&&!free){const i=this.conveyor.indexOf(d.id);if(i>=0)this.conveyor.splice(i,1);}}
 shovel(row,col){const cell=this.cell(row,col);const p=cell.find(p=>p.type===30)||this.main(row,col)||cell[0];if(!p)return false;p.hp=0;if(PLANTS[p.type].kind==='base')cell.forEach(v=>v.hp=0);this.effect('plant',col+.5,row);return true;}
 effect(kind,x,row,opts={}){this.effects.push({id:this.id(),kind,x,row,age:0,duration:.7,...opts});}
 drop(kind,x,row,value=25){this.drops.push({id:this.id(),kind,x,row,value,age:0,life:18,collected:false,phase:this.random()*6});}
 collect(id){const d=this.drops.find(d=>d.id===id&&!d.collected);if(!d)return false;d.collected=true;d.age=0;d.life=.55;if(d.kind==='sun'){this.sun+=d.value;this.collected+=d.value;if(this.collected>=8000)this.events.push({type:'achievement',key:'sun'});}else{this.money+=d.value;this.events.push({type:'money',value:d.value});}this.events.push({type:'sound',name:'sun'});return true;}
 spawn(type,row,x=9.5){
  const d=ZOMBIES[type];const z={id:this.id(),type,row,x,px:x,hp:d.hp,armor:d.armor||0,age:0,special:0,slow:0,stun:0,attack:0,flash:0,timer:0,hypno:false,dir:-1,jumped:false,submerged:false};
  if(d.type==='digger')z.underground=true;
  if(d.type==='boss'){z.x=8.5;z.px=8.5;z.boss=true;}
  if(d.type==='bungee'){z.x=2+this.random()*5;z.px=z.x;z.timer=4;z.hover=true;}
  this.zombies.push(z);return z;
 }
 eligible(z,{air=false,lob=false,ground=false}={}){const d=ZOMBIES[z.type];return z.hp>0&&!z.hypno&&!z.underground&&(!z.hover||air)&&(d.type!=='air'||air)&&(!z.submerged||lob)&&(!ground||!['air','bungee'].includes(d.type)&&!z.vault);}
 enemies(p,range=10,opts={}){return this.zombies.filter(z=>this.eligible(z,opts)&&Math.abs(z.row-p.row)<.6&&z.x>p.x-.3&&z.x-p.x<range).sort((a,b)=>a.x-b.x);}
 hit(z,damage,{pierce=false,slow=0,freeze=0,lob=false,fire=false,air=false}={}){
  if(!z||z.hp<=0)return;const d=ZOMBIES[z.type];z.flash=.14;
  if(fire){z.slow=0;z.stun=0;}
  if(slow&&!(d.type==='screen'&&z.armor>0&&!pierce&&!lob))z.slow=Math.max(z.slow,this.time+slow);
  if(freeze)z.stun=Math.max(z.stun,this.time+freeze);
  if(d.type==='air'&&air){z.type=0;this.effect('pop',z.x,z.row);}
  if(z.armor>0&&!(pierce||d.type==='screen'&&lob)){
   const absorbed=Math.min(z.armor,damage);z.armor-=absorbed;damage-=absorbed;if(z.armor<=0){this.effect('armor',z.x,z.row);if([2,4,6].includes(z.type))z.type=0;}
  }
  z.hp-=damage;if(z.hp<=0)this.kill(z);
 }
 kill(z){if(z.dead)return;z.dead=true;z.hp=0;this.kills++;this.effect('death',z.x,z.row,{sprite:z.type,duration:1.1});if(this.random()<.2)this.drop('coin',z.x,z.row,this.random()<.08?1000:10);if(z.boss)this.events.push({type:'sound',name:'boom'});}
 detonateMine(p){
  if(p.hp<=0||p.age<PLANTS[p.type].arm)return false;
  const contact=this.zombies.some(z=>this.eligible(z,{ground:true})&&z.row===p.row&&Math.abs(z.x-p.x)<=.56&&!(ZOMBIES[z.type].type==='jump'&&!z.jumped));
  if(!contact)return false;
  for(const z of this.zombies)if(this.eligible(z,{ground:true})&&z.row===p.row&&Math.abs(z.x-p.x)<.9)this.hit(z,PLANTS[p.type].power);
  p.hp=0;this.effect('boom',p.x,p.row,{radius:.9,duration:.8});this.events.push({type:'sound',name:'boom'},{type:'achievement',key:'spud'});return true;
 }
 blast(x,row,radius,damage=1800,opts={}){let killed=0;for(const z of this.zombies){if(z.hp<=0||opts.ground&&!this.eligible(z,{ground:true}))continue;if(opts.lane?z.row===row&&(!opts.ground||Math.abs(z.x-x)<radius):Math.hypot(z.x-x,(z.row-row)*.8)<radius){const was=z.hp;this.hit(z,damage,{air:true,...opts});if(was>0&&z.hp<=0)killed++;}}this.effect('boom',x,row,{radius,duration:.8});this.events.push({type:'sound',name:'boom'});if(killed>=10)this.events.push({type:'achievement',key:'boom'});}
 shoot(p,target,opts={}){
  const d=PLANTS[p.type],lob=d.kind==='lob',row=opts.row??p.row,dir=opts.dir??1;
  const butter=p.type===34&&this.random()<.25;
  const muzzleX=p.x+(lob?.05:.35)*dir;
  this.shots.push({id:this.id(),x:muzzleX,px:muzzleX,row,y:row,py:row,emitter:p.type,emitterId:p.id,sourceRow:p.row,sourceX:p.x,startX:muzzleX,startRow:row,targetId:target?.id,targetX:target?.x||9.5,targetRow:target?.row??row,age:0,speed:lob?3.6:5.2,damage:butter?40:d.power,slow:d.slow||0,freeze:butter?3:0,splash:d.splash||0,kind:lob?(butter?'butter':p.type===34?'kernel':p.type===32?'cabbage':p.type===44?'winter':'melon'):p.type===43?'spike':p.type===26?'needle':p.type===29?'star':d.slow?'ice':'pea',lob,homing:d.kind==='homing',dir,vrow:opts.vrow||0,air:!!d.air,heated:false});p.attack=.25;this.events.push({type:'sound',name:'shoot'});
 }
 clickCell(row,col,selected){
  const mode=this.config.challenge;
  if(mode==='aquarium'){if(selected==='fish')return this.buyFish();return this.feed(col+.5,row);}
  if(mode==='match'||mode==='twist')return this.matchClick(row,col);
  if(mode==='whack'){const z=this.zombies.find(z=>z.row===row&&Math.abs(z.x-col-.5)<.7);if(z){this.hit(z,5000,{pierce:true});this.score++;return {ok:true};}const g=this.graves.find(g=>g.row===row&&g.col===col);if(g){this.graves=this.graves.filter(v=>v!==g);this.sun+=25;return {ok:true};}return {ok:false};}
  const vase=this.vases.find(v=>v.row===row&&v.col===col);if(vase){this.vases=this.vases.filter(v=>v!==vase);this.effect('vase',col+.5,row);if(vase.hostile)this.spawn(vase.type,row,col+.5);else{this.conveyor.push(vase.type);this.events.push({type:'sound',name:'plant'});}return {ok:true};}
  if(mode==='izombie'){
   if(col<5)return {ok:false,reason:'Deploy zombies on the right.'};const d=ZOMBIES[selected];if(!d||this.sun<d.cost)return {ok:false,reason:'Not enough sun.'};this.sun-=d.cost;this.spawn(selected,row,col+.5);return {ok:true};
  }
  if(selected==='shovel')return {ok:this.shovel(row,col)};
  const cannon=this.main(row,col);if(cannon?.type===47&&cannon.timer<=0){this.aiming=cannon.id;return {ok:true,reason:'Choose a target square.'};}
  if(this.aiming){const p=this.plants.find(p=>p.id===this.aiming);this.aiming=null;if(p){this.blast(col+.5,row,2.5);p.timer=35;return {ok:true};}}
  if(['bowling','bowling2'].includes(mode)&&selected!==null){if(col>2)return {ok:false,reason:'Bowl from the left three columns.'};if(!this.conveyor.includes(selected))return {ok:false};this.conveyor.splice(this.conveyor.indexOf(selected),1);this.bowlingBalls.push({id:this.id(),type:selected,row,x:col+.5,px:col+.5,dir:1,age:0,hitIds:[]});return {ok:true};}
  if(selected===null||selected===undefined)return {ok:false,reason:'Choose a seed packet.'};
  const result=this.place(selected,row,col);if(result.ok&&mode==='columns'){for(let r=0;r<this.rows;r++){if(r!==row&&!this.water(r))this.place(selected,r,col,{free:true});}}return result;
 }
 matchClick(row,col){
  const p=this.main(row,col);if(!p)return {ok:false};
  if(this.config.challenge==='twist'){
   const a=[this.main(row,col),this.main(row,col+1),this.main(row+1,col+1),this.main(row+1,col)];if(a.some(v=>!v))return {ok:false,reason:'Choose the upper-left of a 2×2 group.'};const types=a.map(v=>v.type);a.forEach((v,i)=>v.type=types[(i+3)%4]);if(!this.resolveMatches())a.forEach((v,i)=>v.type=types[i]);return {ok:true};
  }
  if(!this.matchSelected){this.matchSelected=p.id;return {ok:true};}
  const first=this.plants.find(p=>p.id===this.matchSelected);this.matchSelected=null;if(!first||Math.abs(first.row-row)+Math.abs(first.col-col)!==1)return {ok:false,reason:'Swap neighboring plants.'};
  const type=first.type;first.type=p.type;p.type=type;if(!this.resolveMatches()){p.type=first.type;first.type=type;return {ok:false,reason:'Make a row of three matching plants.'};}return {ok:true};
 }
 resolveMatches(score=true){
  const found=new Set();for(const p of this.plants){for(const [dr,dc]of[[0,1],[1,0]]){const a=this.main(p.row+dr,p.col+dc),b=this.main(p.row+dr*2,p.col+dc*2);if(a&&b&&a.type===p.type&&b.type===p.type)[p,a,b].forEach(v=>found.add(v));}}
  if(!found.size)return false;
  if(score){this.matches+=found.size;this.score=this.matches;this.sun+=found.size*5;this.events.push({type:'sound',name:'sun'});}found.forEach(p=>{p.type=this.pick([0,1,3,5,7]);p.hp=PLANTS[p.type].hp;p.age=0;if(score)this.effect('plant',p.x,p.row);});return true;
 }
 addFish(){this.fish.push({id:this.id(),x:1+this.random()*7,row:1+this.random()*3,px:4,dir:this.random()<.5?-1:1,age:0,hunger:0,timer:8});}
 buyFish(){if(this.sun<100)return {ok:false,reason:'A new zombie fish costs 100 sun.'};this.sun-=100;this.addFish();return {ok:true};}
 feed(x,row){if(this.sun<5)return {ok:false,reason:'Fish food costs 5 sun.'};this.sun-=5;this.food.push({id:this.id(),x,row,age:0});return {ok:true};}
 step(dt){
  if(this.status!=='playing')return;this.time+=dt;this.events=this.events.slice(-100);
  for(const key in this.cooldowns)this.cooldowns[key]=Math.max(0,this.cooldowns[key]-dt);
  this.effects.forEach(e=>e.age+=dt);this.effects=this.effects.filter(e=>e.age<e.duration);
  this.drops.forEach(d=>d.age+=dt);this.drops=this.drops.filter(d=>d.age<d.life);
  this.craters=this.craters.filter(c=>c.until>this.time);this.ice=this.ice.filter(c=>c.until>this.time);
  const mode=this.config.challenge;
  if(mode==='aquarium'){this.updateAquarium(dt);return;}
  if(['conveyor','storm','bowling','bowling2','rain','boss'].includes(mode)){
   this.conveyorTimer-=dt;if(this.conveyorTimer<=0&&this.conveyor.length<9){this.conveyorTimer=4.5;let choices=this.loadout;
    if(mode.startsWith('bowling'))choices=[3,3,3,2,...(mode==='bowling2'?[23]:[])];
    if(this.config.stage===4)choices=[33,33,32,34,39,14,20];this.conveyor.push(this.pick(choices));}
  }else if(!['laststand','izombie','vases','whack'].includes(mode)){
   this.sky-=dt;if(this.sky<=0){this.sky=7.5+this.random()*2;this.drop('sun',1+this.random()*7,this.random()*(this.rows-1));}
  }
  const difficulty=this.difficultyFactors();this.spawnClock+=dt*difficulty.pace;
  while(this.spawnIndex<this.schedule.length&&this.schedule[this.spawnIndex].time<=this.spawnClock){
   const s=this.schedule[this.spawnIndex++],boss=ZOMBIES[s.type].type==='boss';
   this.spawnCredit+=boss?0:difficulty.density;
   const count=boss?1:s.flag?Math.max(1,Math.floor(this.spawnCredit+1e-9)):Math.floor(this.spawnCredit+1e-9);
   if(!boss)this.spawnCredit=Math.max(0,this.spawnCredit-count);
   for(let i=0;i<count;i++){const grave=mode==='whack'?this.pick(this.graves.filter(g=>g.row===s.row)):null;this.spawn(s.type,s.row,(grave?.x??9.5)+i*.65);}
   if(s.flag){this.events.push({type:'message',text:'A HUGE WAVE OF ZOMBIES IS APPROACHING!'},{type:'sound',name:'wave'});if(this.config.stage===1)this.graves.slice(0,Math.max(1,Math.round(this.graves.length*difficulty.density))).forEach(g=>this.spawn(0,g.row,g.x));}
  }
  this.updatePlants(dt);this.updateShots(dt);this.updateZombies(dt);this.updateMowers(dt);this.updateBowling(dt);
  this.plants=this.plants.filter(p=>p.hp>0);this.zombies=this.zombies.filter(z=>z.hp>0);
  if(this.status!=='playing')return;
  if(mode==='izombie'){
   if(this.brains.every(b=>!b))this.win();else if(!this.zombies.length&&!this.drops.some(d=>d.kind==='sun'&&!d.collected)&&this.sun<Math.min(...(this.config.zombieLoadout||[0]).map(i=>ZOMBIES[i].cost)))this.lose();
  }else if(mode==='vases'){
   if(!this.vases.length&&!this.zombies.length)this.win();
  }else if(mode==='match'||mode==='twist'){
   if(this.matches>=75)this.win();
  }else if(mode==='stars'){
   if(this.starTargets.every(([r,c])=>this.main(r,c)?.type===29))this.win();else if(this.spawnIndex>=this.schedule.length&&this.zombies.length===0){this.schedule.push({time:this.spawnClock+10,type:4,row:Math.floor(this.random()*this.rows)});}
  }else if(this.spawnIndex>=this.schedule.length&&this.zombies.length===0&&this.time>12)this.win();
 }
 updatePlants(dt){
  // ponytail: bounded linear enemy scans; spatial buckets if endless entity counts exceed 300.
  for(const p of this.plants){if(p.hp<=0)continue;const d=PLANTS[p.type];p.age+=dt;p.timer-=dt;p.attack=Math.max(0,p.attack-dt);p.flash=Math.max(0,p.flash-dt);if(p.sleep)continue;
   const nearby=this.enemies(p,d.range||10,{air:d.air,lob:d.kind==='lob'});
   switch(d.kind){
    case 'sun':if(p.timer<=0){p.timer=d.rate;const value=p.type===9&&p.age<120?15:25;for(let i=0;i<(d.amount||1);i++)this.drop('sun',p.x+i*.25,p.row,value);}break;
    case 'coins':if(p.timer<=0){p.timer=d.rate;this.drop('coin',p.x,p.row,50);}break;
    case 'bomb':if(p.age>.9){this.blast(p.x,p.row,d.radius,d.power);p.hp=0;if(p.type===15)this.craters.push({id:this.id(),col:p.col,row:p.row,x:p.x,until:this.time+90});}break;
    case 'fire':if(p.age>.9){this.blast(p.x,p.row,10,d.power,{lane:true,fire:true});p.hp=0;this.ice=this.ice.filter(i=>i.row!==p.row);}break;
    case 'freeze':if(p.age>.9){this.zombies.forEach(z=>this.hit(z,20,{pierce:true,freeze:4,slow:10,air:true}));this.effect('freeze',p.x,p.row,{duration:1});p.hp=0;}break;
    case 'wind':if(p.age>.5){this.zombies.filter(z=>ZOMBIES[z.type].type==='air').forEach(z=>this.kill(z));this.fogClear=this.time+25;this.effect('wind',p.x,p.row,{duration:1.2});p.hp=0;}break;
    case 'grave':if(p.age>4){this.graves=this.graves.filter(g=>!(g.row===p.row&&g.col===p.col));this.drop('coin',p.x,p.row,50);p.hp=0;}break;
    case 'mine':this.detonateMine(p);break;
    case 'squash':if(nearby.some(z=>Math.abs(z.x-p.x)<.85)){this.blast(p.x+.25,p.row,.9,d.power,{ground:true,lane:true});p.hp=0;}break;
    case 'kelp':{const z=this.zombies.find(z=>z.hp>0&&!z.hypno&&!z.hover&&!z.vault&&this.water(z.row)&&z.row===p.row&&Math.abs(z.x-p.x)<.85);if(z){this.kill(z);p.hp=0;this.effect('splash',p.x,p.row);}break;}
    case 'chomp':if(p.timer<=0){const z=nearby.find(z=>z.x-p.x<.9&&!z.boss);if(z){if(ZOMBIES[z.type].type==='giant')this.hit(z,40,{pierce:true});else this.kill(z);p.timer=d.rate;p.attack=.5;}}break;
    case 'shoot':case 'lob':case 'homing':case 'fume':case 'radial':case 'star':{
     if(d.scared&&nearby.some(z=>z.x-p.x<1.5))break;
     let targets=d.kind==='homing'?this.zombies.filter(z=>this.eligible(z,{air:true,lob:true})).sort((a,b)=>(ZOMBIES[b.type].type==='air')-(ZOMBIES[a.type].type==='air')||a.x-b.x):nearby;
     if(d.kind==='radial')targets=this.zombies.filter(z=>this.eligible(z)&&Math.hypot(z.x-p.x,z.row-p.row)<1.6);
     if(d.kind==='star')targets=this.zombies.filter(z=>this.eligible(z)&&Math.abs(z.x-p.x)<7);
     if(d.rear)targets=[...targets,...this.zombies.filter(z=>this.eligible(z)&&z.row===p.row&&z.x<p.x)];
     if(d.lanes===3)targets=this.zombies.filter(z=>this.eligible(z)&&Math.abs(z.row-p.row)<=1&&z.x>p.x);
     if(this.config.stage===4&&p.col<5&&d.kind==='shoot'&&!d.air)targets=[];
     if(p.timer<=0&&targets.length){
      p.timer=d.rate;if(d.kind==='radial'||d.kind==='fume'){targets.forEach(z=>this.hit(z,d.power,{pierce:['screen','ladder'].includes(ZOMBIES[z.type].type)}));p.attack=.25;this.effect('fume',p.x,p.row,{radius:d.kind==='radial'?1.6:3.5,duration:.35});}
      else if(d.kind==='star'){for(const [dir,vrow]of[[1,0],[-1,0],[1,1.4],[1,-1.4],[-1,-1.4]])this.shoot(p,targets[0],{dir,vrow});}
      else if(d.lanes===3){for(let row=p.row-1;row<=p.row+1;row++)if(row>=0&&row<this.rows)this.shoot(p,targets.find(z=>z.row===row),{row});}
      else {const front=targets.find(z=>z.x>=p.x);if(!d.rear||front)this.shoot(p,d.rear?front:targets[0]);if(d.burst)p.burstLeft=d.burst-1;if(d.rear){const rear=targets.find(z=>z.x<p.x);if(rear){this.shoot(p,rear,{dir:-1});this.shoot(p,rear,{dir:-1});}}}
     }
     if(p.burstLeft>0){p.burstTimer=(p.burstTimer||0)-dt;if(p.burstTimer<=0){this.shoot(p,targets[0]);p.burstLeft--;p.burstTimer=.13;}}
     break;}
    case 'spikes':for(const z of this.zombies.filter(z=>this.eligible(z,{ground:true})&&z.row===p.row&&Math.abs(z.x-p.x)<.45)){this.hit(z,(p.type===46?40:20)*dt);if(['vehicle','sled'].includes(ZOMBIES[z.type].type)){this.kill(z);p.hp-=p.type===46?500:1000;}}break;
    case 'magnet':if(p.timer<=0){const z=this.zombies.find(z=>z.hp>0&&Math.hypot(z.x-p.x,z.row-p.row)<3&&([4,6,7,17,18,21].includes(z.type)));if(z){z.armor=0;if(z.type===17)z.underground=false;z.type=0;p.timer=d.rate;p.attack=.5;this.effect('magnet',z.x,z.row);}}break;
    case 'gold':if(p.timer<=0){this.drops.filter(v=>v.kind==='coin'&&!v.collected).slice(0,5).forEach(v=>this.collect(v.id));p.timer=d.rate;}break;
   }
  }
 }
 updateShots(dt){
  for(const s of this.shots){s.px=s.x;s.py=s.row;s.age+=dt;
   if(s.homing){const target=this.zombies.find(z=>z.id===s.targetId&&z.hp>0)||this.zombies.find(z=>this.eligible(z,{air:true,lob:true}));if(target){s.targetId=target.id;const dx=target.x-s.x,dy=target.row-s.row,len=Math.hypot(dx,dy)||1;s.x+=dx/len*s.speed*dt;s.row+=dy/len*s.speed*dt;}else{s.x+=s.speed*dt;}}
   else if(s.lob){s.x+=(s.targetX-s.startX)*dt/.7;s.row+=(s.targetRow-s.startRow)*dt/.7;}
   else {s.x+=s.speed*dt*s.dir;s.row+=(s.vrow||0)*dt;}
   if(!s.lob&&!s.heated&&['pea','ice'].includes(s.kind)){const torch=this.plants.find(p=>p.type===22&&p.row===Math.round(s.row)&&p.x>=Math.min(s.px,s.x)&&p.x<=Math.max(s.px,s.x));if(torch){s.heated=true;if(s.kind==='ice'){s.kind='pea';s.slow=0;}else{s.kind='fire';s.damage*=2;s.splash=.5;}}}
   let target;
   if(s.lob&&s.age>=.7)target=this.zombies.find(z=>this.eligible(z,{lob:true})&&Math.hypot(z.x-s.targetX,z.row-s.targetRow)<.7);
   else if(!s.lob)target=this.zombies.filter(z=>this.eligible(z,{air:s.air})&&Math.abs(z.row-s.row)<.4&&z.x>=Math.min(s.x,s.px)-.3&&z.x<=Math.max(s.x,s.px)+.3).sort((a,b)=>s.dir*(a.x-b.x))[0];
   if(target){this.hit(target,s.damage,{slow:s.slow,freeze:s.freeze,lob:s.lob,fire:s.kind==='fire',air:s.air});if(s.splash)this.zombies.filter(z=>z!==target&&Math.hypot(z.x-target.x,(z.row-target.row)*.8)<s.splash).forEach(z=>this.hit(z,s.damage*.5,{slow:s.slow,lob:true}));this.effect('hit',target.x,target.row,{duration:.18});s.dead=true;}
   if(s.lob&&s.age>=.7)s.dead=true;
   if(s.x<-2||s.x>11||s.row<-.9||s.row>this.rows+.5||s.age>5)s.dead=true;
  }this.shots=this.shots.filter(s=>!s.dead);
 }
 updateZombies(dt){
  for(const z of [...this.zombies]){if(z.hp<=0)continue;const d=ZOMBIES[z.type];z.px=z.x;z.age+=dt;z.attack=Math.max(0,z.attack-dt);z.flash=Math.max(0,z.flash-dt);z.special+=dt;
   if(z.stun>this.time)continue;
   const slow=z.slow>this.time?.5:1;let speed=(d.type==='jump'&&z.jumped?ZOMBIES[0].speed:d.speed)*slow*this.difficultyFactors().movement;if(['quick','tiny'].includes(this.config.challenge))speed*=1.7;if(d.type==='news'&&z.armor<=0)speed*=2.8;
   if(z.vault){
    const v=z.vault;v.elapsed=Math.min(v.duration,v.elapsed+dt*slow);const t=v.elapsed/v.duration;z.x=v.from+(v.to-v.from)*t;
    if(t>=1){z.vault=null;z.jumped=true;z.poleLost=true;z.attack=0;for(const p of this.plants)if(p.type===4)this.detonateMine(p);}
    continue;
   }
   if(z.boss){this.updateBoss(z,dt);continue;}
   if(z.hover){if(z.special<2)continue;const victim=this.plants.filter(p=>p.row===z.row&&Math.abs(p.x-z.x)<1).at(-1);if(this.protected(z.row,z.x)){this.kill(z);continue;}if(victim&&z.special>4){victim.hp=0;this.effect('theft',victim.x,victim.row);}if(z.special>5)this.kill(z);continue;}
   if(d.type==='digger'&&z.underground&&z.x<.7){z.underground=false;z.dir=1;z.stun=this.time+2;}
   if(d.type==='yeti'&&z.age>18)z.dir=1;
   if(d.type==='dance'&&z.special>12){z.special=0;for(const row of[z.row-1,z.row,z.row+1])if(row>=0&&row<this.rows)this.spawn(9,row,z.x+.6);}
   if(d.type==='jack'&&z.age>12+z.id%5){this.plants.filter(p=>Math.hypot(p.x-z.x,p.row-z.row)<1.7).forEach(p=>p.hp=0);this.blast(z.x,z.row,1.7,0);this.kill(z);continue;}
   if(d.type==='catapult'&&z.x<8){z.x+=0;if(z.special>4){z.special=0;const p=this.plants.find(p=>p.row===z.row&&p.hp>0);if(p&&!this.protected(p.row,p.x)){p.hp-=80;this.effect('hit',p.x,p.row);}}continue;}
   if(d.type==='giant'&&z.hp<1500&&!z.thrown){z.thrown=true;this.spawn(24,z.row,Math.max(1,z.x-3));this.effect('throw',z.x,z.row);}
   if(z.hypno){const enemy=this.zombies.find(v=>!v.hypno&&v.hp>0&&v.row===z.row&&Math.abs(v.x-z.x)<.5);if(enemy){this.hit(enemy,100*dt,{pierce:true});z.hp-=100*dt;z.attack=.2;}else z.x+=speed*dt;if(z.x>10)this.kill(z);continue;}
   const candidates=this.plants.filter(p=>p.hp>0&&p.row===z.row&&Math.abs(p.x-z.x)<.55&&!['spikes','base'].includes(PLANTS[p.type].kind));
   let plant=candidates.find(p=>p.type===30)||candidates[0];
   if(!plant){plant=this.plants.find(p=>p.hp>0&&p.row===z.row&&Math.abs(p.x-z.x)<.48&&PLANTS[p.type].kind==='base');}
   z.submerged=d.type==='snorkel'&&!plant;
   if(z.underground||d.type==='air'){plant=null;}
   if(plant&&d.type==='jump'&&!z.jumped){
    const tall=candidates.find(p=>PLANTS[p.type].tall);
    const landing=plant.x-.65;const blocker=this.plants.find(p=>p.hp>0&&p.row===z.row&&PLANTS[p.type].tall&&p.x<=z.x&&p.x>=landing);
    if(tall||blocker){z.jumped=true;z.poleLost=true;z.stun=this.time+.7;this.effect('blocked',z.x,z.row);continue;}
    z.vault={from:z.x,to:landing,elapsed:0,duration:.9};z.attack=0;continue;
   }
   if(plant&&d.type==='pogo'&&!PLANTS[plant.type].tall){z.x-=1.2;this.effect('jump',z.x,z.row);plant=null;}
   if(plant?.type===4&&this.detonateMine(plant))continue;
   if(plant&&d.type==='ladder'&&[3,23,30].includes(plant.type)&&!z.ladderPlaced){plant.ladder=true;z.ladderPlaced=true;z.armor=0;}
   if(plant?.ladder){z.x-=speed*dt;continue;}
   if(plant&&['vehicle','sled','giant'].includes(d.type)){if(z.special>1){z.special=0;plant.hp=0;this.effect('crush',plant.x,plant.row);z.attack=.4;}}
   else if(plant){
    z.attack=.16;plant.hp-=100*dt*slow;plant.flash=.05;
    if(plant.hp<=0&&plant.type===1&&this.config.challenge==='izombie')this.sun+=50;
    if(plant.hp<=0&&plant.type===12&&!plant.sleep){z.hypno=true;z.dir=1;plant.hp=0;this.effect('hypno',z.x,z.row);}
    if(plant.type===36&&z.special>1.5){z.special=0;z.row=clamp(z.row+(this.random()<.5?-1:1),0,this.rows-1);if(this.water(z.row))z.row=z.row===2?1:4;}
   }else z.x+=speed*dt*z.dir;
   if(d.type==='vehicle'){const col=Math.floor(z.x);if(col>=0&&col<9&&!this.ice.some(i=>i.row===z.row&&i.col===col))this.ice.push({id:this.id(),row:z.row,col,x:col+.5,until:this.time+90});}
   if(['botany','botany2'].includes(this.config.challenge)&&z.special>2){z.special=0;const p=this.plants.filter(p=>p.row===z.row&&p.x<z.x).sort((a,b)=>b.x-a.x)[0];if(p){p.hp-=this.config.challenge==='botany2'?50:20;p.flash=.15;this.effect('enemyshot',p.x,p.row);}}
   if(this.config.challenge==='portals'&&z.x<5.4&&z.x>5.3&&!z.portaled){z.portaled=true;z.row=(z.row+2)%this.rows;z.x=3.5;this.effect('portal',z.x,z.row);}
   if(z.x<-.2){
    if(this.config.challenge==='izombie'){if(this.brains[z.row]){this.brains[z.row]=false;this.effect('brain',-.2,z.row);}this.kill(z);}
    else {const mower=this.mowers[z.row];if(mower&&!mower.used&&mower.available){mower.used=true;mower.active=true;mower.x=-.5;this.events.push({type:'sound',name:'mower'});}else if(!mower?.active){this.lose();return;}}
   }else if(z.x>11)this.kill(z);
  }
 }
 updateBoss(z,dt){
  z.timer+=dt;z.row=2+Math.sin(z.age*.3)*1.5;
  if(z.timer>6){z.timer=0;const row=Math.floor(this.random()*this.rows);const fire=this.random()<.5;this.effect(fire?'bossfire':'bossice',8,row,{duration:2});
   this.bossOrb={id:this.id(),x:8,row,kind:fire?'fire':'ice',age:0};
  }
  if(this.bossOrb){const orb=this.bossOrb;orb.x-=2.5*dt;orb.age+=dt;const counter=this.plants.find(p=>p.row===orb.row&&((orb.kind==='fire'&&p.type===14)||(orb.kind==='ice'&&p.type===20)));if(counter){counter.hp=0;this.bossOrb=null;this.effect('boom',orb.x,orb.row);return;}
   this.plants.filter(p=>p.row===orb.row&&Math.abs(p.x-orb.x)<.3).forEach(p=>p.hp=0);if(orb.x<-.5)this.bossOrb=null;
  }
  if(z.special>15){z.special=0;const row=Math.floor(this.random()*this.rows);this.plants.filter(p=>p.row===row&&p.col>5).forEach(p=>p.hp=0);this.effect('crush',7,row,{duration:1.5});}
 }
 updateMowers(dt){for(const m of this.mowers){m.px=m.x;if(m.active){m.x+=5*dt;this.zombies.filter(z=>z.row===m.row&&z.x<m.x+.5&&z.hp>0&&!z.boss).forEach(z=>this.kill(z));if(m.x>11)m.active=false;}}}
 updateBowling(dt){for(const ball of this.bowlingBalls){ball.px=ball.x;ball.age+=dt;ball.x+=4*dt;const z=this.zombies.find(z=>z.hp>0&&Math.abs(z.row-ball.row)<.4&&Math.abs(z.x-ball.x)<.5&&!ball.hitIds.includes(z.id));if(z){ball.hitIds.push(z.id);if(ball.type===2){this.blast(ball.x,Math.round(ball.row),1.6);ball.dead=true;}else{this.hit(z,ball.type===23?1500:500,{pierce:true});ball.row=clamp(ball.row+ball.dir,0,this.rows-1);if(ball.row===0||ball.row===this.rows-1)ball.dir*=-1;this.effect('hit',z.x,z.row);}}}this.bowlingBalls=this.bowlingBalls.filter(b=>!b.dead&&b.x<11);}
 updateAquarium(dt){for(const f of this.fish){f.px=f.x;f.age+=dt;f.hunger+=dt;f.timer-=dt;const food=this.food.find(v=>Math.hypot(v.x-f.x,v.row-f.row)<.45);if(food){f.hunger=0;this.food=this.food.filter(v=>v!==food);this.effect('sun',f.x,f.row);}const target=this.food[0];if(target){f.x+=Math.sign(target.x-f.x)*dt*.6;f.row+=Math.sign(target.row-f.row)*dt*.35;}else{f.x+=f.dir*dt*.4;if(f.x>8||f.x<1)f.dir*=-1;}if(f.timer<=0){f.timer=8;this.drop('sun',f.x,f.row,25);}if(f.hunger>30)f.dead=true;}
  this.fish=this.fish.filter(f=>!f.dead);this.food.forEach(f=>f.age+=dt);this.food=this.food.filter(f=>f.age<12);if(!this.fish.length)this.lose();if(this.sun>=1000)this.win();}
 win(){if(this.status!=='playing')return;this.status='won';this.events.push({type:'sound',name:'win'},{type:'win',kills:this.kills,score:this.score,money:this.mowers.filter(m=>!m.used&&m.available).length*50});}
 lose(){if(this.status!=='playing')return;this.status='lost';this.events.push({type:'sound',name:'lose'},{type:'lose'});}
 snapshot(){const data=structuredClone({...this});data.events=[];return data;}
}
