import test from 'node:test';
import assert from 'node:assert/strict';
import {Game} from '../src/game.js';
import {PLANTS,ZOMBIES,LEVELS,MINI_GAMES} from '../src/data.js';
import {Renderer,MAPS,W,H} from '../src/render.js';
import {Soundtrack} from '../src/music.js';
const make=(config={})=>{const g=new Game({...LEVELS[0],active:null,difficulty:6,...config},PLANTS.map(p=>p.id));g.sun=10000;return g;};
const step=(g,time)=>{for(let t=0;t<time;t+=1/60)g.step(1/60);};
test('supplied soundtrack switches cleanly, loops, and respects mute and pause',()=>{
 const music=new Soundtrack(src=>({src,paused:true,currentTime:0,plays:0,pause(){this.paused=true;},play(){this.paused=false;this.plays++;return Promise.resolve();}}));
 const {intro,garden}=music.tracks;assert.equal(intro.loop,true);assert.equal(garden.loop,true);music.unlock();assert.equal(intro.paused,false);
 intro.currentTime=12;music.set('garden',.4);assert.equal(intro.paused,true);assert.equal(intro.currentTime,0);assert.equal(garden.paused,false);assert.equal(garden.volume,.4);
 music.set('garden',0);assert.equal(garden.paused,true);music.set('garden',.4,true);assert.equal(garden.paused,true);music.set('garden',.4,false);assert.equal(garden.paused,false);
 const plays=garden.plays;music.set('garden',.4,false);assert.equal(garden.plays,plays);music.set('intro',.25);assert.equal(garden.paused,true);assert.equal(intro.paused,false);
});
test('every visible cell maps back to the same planting square on desktop, portrait and landscape phones',()=>{
 for(const map of MAPS)for(const [width,height] of [[1090,613],[844,246],[667,231],[320,400],[390,668]]){
  const view={map,boardRows:map.left.length,renderer:{setSize(){}},camera:{updateProjectionMatrix(){}},container:{getBoundingClientRect:()=>({left:10,top:20,width,height})},point:Renderer.prototype.point};
  Renderer.prototype.resize.call(view);
  assert.ok(view.camera.left<=0&&view.camera.right>=W&&view.camera.bottom<=0&&view.camera.top>=H);
  for(let row=0;row<view.boardRows;row++)for(let col=0;col<9;col++)for(const offset of [.1,.5,.9]){
   const p=view.point(col+offset,row),hit=Renderer.prototype.mouse.call(view,{clientX:10+(p.x-view.camera.left)/(view.camera.right-view.camera.left)*width,clientY:20+(p.y-H+view.camera.top)/(view.camera.top-view.camera.bottom)*height});
   assert.equal(hit.inside,true);assert.equal(hit.row,row);assert.equal(hit.col,col,`${width}x${height} row ${row} col ${col}`);
  }
 }
});
test('all 45 visible lawn cells accept plants, including tutorial side lanes',()=>{
 const g=make({active:[2]});for(let row=0;row<5;row++)for(let col=0;col<9;col++)assert.equal(g.place(0,row,col,{free:true}).ok,true,`row ${row} col ${col}`);assert.equal(g.plants.length,45);
});
test('all pool and roof cells accept planting with their correct supports',()=>{
 for(const stage of [2,3,4]){const g=make({stage,rows:stage===4?5:6});g.graves=[];for(let row=0;row<g.rows;row++)for(let col=0;col<9;col++){if(g.water(row))assert.equal(g.place(16,row,col,{free:true}).ok,true);if(stage===4)assert.equal(g.place(33,row,col,{free:true}).ok,true);assert.equal(g.place(0,row,col,{free:true}).ok,true,`stage ${stage} row ${row} col ${col}`);}}
});
test('shared shooter stores the muzzle origin and source for all pea variants',()=>{
 for(const type of [0,5,7,18,28,40]){const g=make();const p=g.addPlant(type,2,1);g.shoot(p,null);const s=g.shots[0];assert.equal(s.emitter,type);assert.equal(s.sourceRow,2);assert.equal(s.sourceX,1.5);assert.equal(s.x,1.85);assert.equal(s.startX,s.x);}
});
test('full catalog and campaign progression have reachable definitions',()=>{
 assert.equal(PLANTS.length,49);assert.equal(ZOMBIES.length,26);assert.equal(LEVELS.length,50);assert.equal(MINI_GAMES.length,20);
 assert.equal(LEVELS[0].reward,1);assert.equal(LEVELS[49].challenge,'boss');assert.equal(new Set(LEVELS.map(l=>l.label)).size,50);
 assert.equal(new Set([0,...LEVELS.map(l=>l.reward)]).size,40);
 for(const l of LEVELS){const g=make(l);assert.ok(g.schedule.length||l.challenge==='vases');for(const s of g.schedule)assert.ok(ZOMBIES[s.type]&&s.row>=0&&s.row<g.rows);}
});
test('failed placement is transactional; cost, occupancy and recharge',()=>{
 const g=make();g.sun=100;assert.equal(g.place(0,2,0).ok,true);assert.equal(g.sun,0);assert.equal(g.place(0,2,1).ok,false);assert.equal(g.plants.length,1);
 g.sun=1000;g.cooldowns[0]=0;assert.equal(g.place(0,2,0).ok,false);assert.equal(g.sun,1000);assert.equal(g.cooldowns[0],0);
});
test('water and roof require bases; layered protection and upgrades work',()=>{
 const g=make({stage:2,rows:6});assert.equal(g.place(0,2,0).ok,false);assert.equal(g.place(16,2,0).ok,true);assert.equal(g.place(0,2,0).ok,true);assert.equal(g.place(30,2,0).ok,true);assert.equal(g.cell(2,0).length,3);
 const roof=make({stage:4});assert.equal(roof.place(32,1,0).ok,false);assert.equal(roof.place(33,1,0).ok,true);assert.equal(roof.place(34,1,0).ok,true);roof.cooldowns[33]=0;roof.cooldowns[34]=0;assert.equal(roof.place(33,1,1).ok,true);assert.equal(roof.place(34,1,1).ok,true);assert.equal(roof.place(47,1,0).ok,true);assert.equal(roof.main(1,0).type,47);
});
test('invalid upgrades do not destroy their original plant',()=>{
 const g=make({stage:4});const p=g.addPlant(7,1,1);const sun=g.sun;assert.equal(g.place(40,1,1).ok,false);assert.equal(p.hp,300);assert.equal(g.sun,sun);
});
test('projectiles hit only their lane and handle crossing between frames',()=>{
 const g=make();g.schedule=[{time:999,type:0,row:0}];g.addPlant(0,2,0);const wrong=g.spawn(0,1,2),target=g.spawn(0,2,2);step(g,4);assert.equal(wrong.hp,200);assert.ok(target.hp<200);
});
test('armor, piercing, slowdown refresh and freeze expiration',()=>{
 const g=make();const z=g.spawn(4,2,7);g.hit(z,20,{slow:8});assert.equal(z.hp,200);assert.equal(z.armor,1080);g.hit(z,40,{pierce:true});assert.equal(z.hp,160);g.hit(z,0,{slow:8});assert.equal(z.slow,8);g.time=10;assert.ok(z.slow<g.time);
});
test('finite wave wins only after last scheduled spawn and all enemies',()=>{
 const g=make();g.schedule=[{time:20,type:0,row:2}];g.step(15);assert.equal(g.status,'playing');g.step(5);assert.equal(g.status,'playing');g.zombies.forEach(z=>g.kill(z));g.step(.1);assert.equal(g.status,'won');
});
test('mower sweeps once and later unprotected breach loses',()=>{
 const g=make();g.schedule=[{time:999,type:0,row:0}];g.spawn(0,2,-.25);g.step(.1);assert.equal(g.mowers[2].used,true);assert.equal(g.status,'playing');step(g,3);g.spawn(0,2,-.25);g.step(.1);assert.equal(g.status,'lost');
});
test('boss requires defeat; boss stage gives conveyor seeds',()=>{
 const g=make({...LEVELS[49]});g.step(13);const boss=g.zombies.find(z=>z.type===25);assert.ok(boss);assert.ok(g.conveyor.length);g.schedule=[];g.spawnIndex=0;g.step(.1);assert.equal(g.status,'playing');g.zombies.forEach(z=>g.kill(z));g.step(.1);assert.equal(g.status,'won');
});
test('save restoration preserves simulation and deterministic random sequence',()=>{
 const g=make({...LEVELS[23]});g.addPlant(16,2,0);g.spawn(10,2);step(g,3);const saved=JSON.parse(JSON.stringify(g.snapshot()));const loaded=new Game(g.config,g.loadout,saved);assert.equal(loaded.time,g.time);assert.deepEqual(loaded.plants,g.plants);assert.equal(loaded.random(),g.random());step(loaded,1);step(g,1);assert.equal(loaded.zombies[0].x,g.zombies[0].x);
});
test('every mini-game has a working simulation and input branch',()=>{
 for(const m of MINI_GAMES){const stage=m.challenge==='boss'?4:m.challenge==='aquarium'?2:0;const g=make({stage,rows:stage===2?6:5,challenge:m.challenge,active:null});step(g,.2);assert.ok(['playing','won','lost'].includes(g.status));assert.ok(g.time>0);if(m.challenge==='aquarium'){assert.equal(g.fish.length,2);assert.equal(g.feed(3,2).ok,true);}if(m.challenge==='match'){assert.ok(g.plants.length);assert.equal(g.matchClick(0,0).ok,true);}}
});
test('Vasebreaker reveals its payload and never uses the ordinary wave schedule',()=>{
 const g=make({challenge:'vases'});const v=g.vases[0];const old=g.vases.length;g.clickCell(v.row,v.col,null);assert.equal(g.vases.length,old-1);assert.equal(g.schedule.length,0);assert.ok(g.zombies.length||g.conveyor.length>3);
});
test('I Zombie spends sun and rewards eaten Sunflowers',()=>{
 const g=make({challenge:'izombie'});g.sun=175;const p=g.plants.find(p=>p.type===1);assert.ok(p);g.plants=g.plants.filter(v=>v===p);assert.equal(g.clickCell(p.row,6,0).ok,true);assert.equal(g.sun,125);const z=g.zombies[0];z.x=p.x;step(g,3.1);assert.ok(g.sun>=175);
});

test('armed mines detonate at bite contact and damage only nearby grounded enemies in their lane',()=>{
 const g=make();const p=g.addPlant(4,2,3);p.age=14;const z=g.spawn(4,2,p.x+.54),side=g.spawn(0,1,p.x),air=g.spawn(16,2,p.x),far=g.spawn(0,2,p.x+2);
 g.updatePlants(1/60);assert.equal(p.hp,0);assert.equal(z.hp,0);assert.equal(z.armor,0);assert.equal(side.hp,200);assert.equal(air.hp,200);assert.equal(far.hp,200);assert.ok(g.events.some(e=>e.key==='spud'));
});
test('unarmed mines can be eaten; mines arming under a biting zombie trigger once',()=>{
 const g=make();const p=g.addPlant(4,2,3),z=g.spawn(0,2,p.x+.54);g.updateZombies(.1);assert.equal(p.hp,290);assert.equal(z.hp,200);p.age=13.99;g.updatePlants(.02);assert.equal(p.hp,0);const booms=g.events.filter(e=>e.name==='boom').length;g.updateZombies(.1);assert.equal(g.events.filter(e=>e.name==='boom').length,booms);
});
test('pole vaulter follows a timed arc, keeps plant alive, loses pole and walks at normal speed',()=>{
 const g=make(),p=g.addPlant(3,2,4),z=g.spawn(3,2,p.x+.54);const start=z.x;g.updateZombies(.01);assert.ok(z.vault);assert.equal(z.x,start);g.updateZombies(.45);assert.ok(z.x<start&&z.x>p.x-.65);assert.equal(p.hp,4000);g.updateZombies(.45);assert.equal(z.vault,null);assert.equal(z.jumped,true);assert.equal(z.poleLost,true);const x=z.x;g.updateZombies(1);assert.ok(Math.abs(x-z.x-ZOMBIES[0].speed)<1e-9);p.hp=0;const next=g.addPlant(0,2,3);z.x=next.x+.54;g.updateZombies(.1);assert.equal(next.hp,290);assert.equal(z.vault,null);
});
test('pole vaulter clears armed mines, but detonates a mine after landing behind a blocker',()=>{
 const g=make(),mine=g.addPlant(4,2,4);mine.age=14;const z=g.spawn(3,2,mine.x+.54);g.updatePlants(.01);assert.equal(mine.hp,300);g.updateZombies(.01);assert.ok(z.vault);g.updateZombies(.9);assert.equal(z.hp,200);assert.equal(mine.hp,300);
 const h=make(),wall=h.addPlant(3,2,4),back=h.addPlant(4,2,3);back.age=14;const v=h.spawn(3,2,wall.x+.54);h.updateZombies(.01);h.updateZombies(.9);assert.equal(v.hp,0);assert.equal(back.hp,0);
});
test('Tall-nuts block a vault even inside Pumpkin, while spikes are walked over',()=>{
 const g=make(),p=g.addPlant(23,2,4);g.addPlant(30,2,4);const z=g.spawn(3,2,p.x+.54);g.updateZombies(.01);assert.equal(z.vault,undefined);assert.equal(z.jumped,true);assert.equal(z.poleLost,true);assert.ok(z.stun>g.time);assert.equal(p.hp,8000);
 const h=make(),spike=h.addPlant(21,2,4),v=h.spawn(3,2,spike.x+.54);h.updateZombies(.1);assert.equal(v.jumped,false);assert.ok(v.x<spike.x+.54);
});
test('freeze pauses vault progress, chill slows it, snapshot preserves midair state',()=>{
 const g=make(),p=g.addPlant(3,2,4),z=g.spawn(3,2,p.x+.54);g.updateZombies(.01);z.stun=5;g.updateZombies(.4);assert.equal(z.vault.elapsed,0);z.stun=0;z.slow=5;g.updateZombies(.4);assert.equal(z.vault.elapsed,.2);const restored=new Game(g.config,g.loadout,g.snapshot());restored.updateZombies(.2);g.updateZombies(.2);assert.deepEqual(restored.zombies[0].vault,z.vault);assert.equal(restored.zombies[0].x,z.x);
});
test('explosions spend damage on armor, fumes bypass shields but not helmets, football stays fast',()=>{
 const g=make(),z=g.spawn(7,2,4);g.blast(4,2,1,1800);assert.equal(z.armor,0);assert.equal(z.hp,0);
 const h=make(),f=h.addPlant(10,2,1);f.sleep=false;f.timer=0;const cone=h.spawn(2,2,3),door=h.spawn(6,2,3);h.updatePlants(.01);assert.equal(cone.armor,350);assert.equal(cone.hp,200);assert.equal(door.armor,1100);assert.equal(door.hp,180);const football=h.spawn(7,3,7);h.hit(football,1400);assert.equal(football.type,7);const x=football.x;h.updateZombies(1);assert.equal(football.x,x-ZOMBIES[7].speed);
});
test('kelp drowns one submerged zombie without harming other lanes',()=>{
 const g=make({stage:2,rows:6}),p=g.addPlant(19,2,4),z=g.spawn(11,2,p.x+.54),other=g.spawn(10,3,p.x);z.submerged=true;g.updatePlants(.01);assert.equal(z.hp,0);assert.equal(p.hp,0);assert.equal(other.hp,200);
});
test('enlarged play camera retains every cell and accurate taps',()=>{
 for(const map of MAPS)for(const [width,height] of [[844,298],[667,283],[320,520],[390,700],[1090,520]]){
 const view={currentGame:{},map,boardRows:map.left.length,renderer:{setSize(){}},camera:{updateProjectionMatrix(){}},container:{getBoundingClientRect:()=>({left:0,top:0,width,height})},point:Renderer.prototype.point};Renderer.prototype.resize.call(view);
 for(let row=0;row<view.boardRows;row++)for(let col=0;col<9;col++)for(const offset of [.01,.5,.99]){const p=view.point(col+offset,row);assert.ok(p.x>view.camera.left&&p.x<view.camera.right);assert.ok(H-p.y>view.camera.bottom&&H-p.y<view.camera.top);const hit=Renderer.prototype.mouse.call(view,{clientX:(p.x-view.camera.left)/(view.camera.right-view.camera.left)*width,clientY:(p.y-H+view.camera.top)/(view.camera.top-view.camera.bottom)*height});assert.equal(hit.col,col);assert.equal(hit.row,row);}
 }
});
test('Hypno-shroom converts only once eaten; Screen Door blocks icy pea chill',()=>{
 const g=make({stage:1});g.graves=[];const p=g.addPlant(12,2,4),z=g.spawn(0,2,p.x+.54);g.updateZombies(.1);assert.equal(z.hypno,false);g.updateZombies(3);assert.equal(z.hypno,true);assert.equal(z.dir,1);assert.equal(p.hp,0);
 const door=g.spawn(6,1,5);g.hit(door,20,{slow:8});assert.equal(door.slow,0);g.hit(door,0,{freeze:4});assert.equal(door.stun,4);
});
test('Torchwood heats only peas and thaws icy peas; Split Pea rear attacks do not fire forward',()=>{
 const g=make(),torch=g.addPlant(22,2,2);for(const kind of ['pea','ice','star','needle'])g.shots.push({id:g.id(),x:torch.x-.05,px:torch.x-.05,row:2,age:0,speed:1,dir:1,damage:20,slow:kind==='ice'?8:0,kind});g.updateShots(.1);assert.deepEqual(g.shots.map(s=>s.kind),['fire','pea','star','needle']);assert.deepEqual(g.shots.map(s=>s.damage),[40,20,20,20]);assert.equal(g.shots[1].slow,0);
 const h=make(),p=h.addPlant(28,2,4);p.timer=0;h.spawn(0,2,2);h.updatePlants(.01);assert.equal(h.shots.length,2);assert.ok(h.shots.every(s=>s.dir===-1));
});
test('rendered vaulter rises during jump and switches to pole-free art on landing',async()=>{
 const THREE=await import('three');const texture=new THREE.Texture();texture.userData={width:220,height:260};const walking=new THREE.Texture();walking.userData={width:250,height:350};const shadow=new THREE.Texture();
 const view=Object.create(Renderer.prototype);Object.assign(view,{scene:new THREE.Scene(),geometry:new THREE.PlaneGeometry(1,1,12,20),flatGeometry:new THREE.PlaneGeometry(1,1),textures:{zombies:{3:texture},plants:{0:texture}},poleWalking:walking,shadowTexture:shadow,views:new Map(),fog:[],map:MAPS[0],reduced:false,currentGame:{config:{challenge:'normal'}}});
 const z={id:99,type:3,row:2,x:4.5,px:4.5,hp:200};view.updateView(z,'zombies',3,'zombie',1,1);const y=view.views.get('zombie99').group.position.y;z.vault={elapsed:.45,duration:.9};view.updateView(z,'zombies',3,'zombie',1,1);assert.equal(view.views.get('zombie99').group.position.y,y+65);assert.ok(view.views.get('zombie99').mesh.rotation.z<0);z.vault=null;z.jumped=true;z.poleLost=true;view.updateView(z,'zombies',3,'zombie',1,2);const v=view.views.get('zombie99');assert.equal(v.mesh.material.map,walking);assert.equal(v.mesh.rotation.z,0);assert.equal(v.mesh.userData.uniforms.uTime.value,1.1);view.clear();
});

test('difficulty 1–10 scales wave count, arrival pace and live zombie movement monotonically',()=>{
 let previous={count:-1,clock:-1,distance:-1};
 for(let level=1;level<=10;level++){
  const g=make({difficulty:level});g.schedule=Array.from({length:40},(_,i)=>({time:1+i,row:2,type:0}));let count=0;g.spawn=()=>{count++;};g.step(40);const clock=g.spawnClock;
  const h=make({difficulty:level}),z=h.spawn(0,2,8);h.updateZombies(1);const distance=8-z.x;
  assert.ok(count>=previous.count);assert.ok(clock>previous.clock);assert.ok(distance>previous.distance);previous={count,clock,distance};
 }
});
test('difficulty adjustment applies immediately without resetting plants, zombies or wave progress',()=>{
 const g=make({difficulty:10});g.schedule=[{time:999,type:0,row:2}];const p=g.addPlant(0,2,1),z=g.spawn(0,2,7);g.step(1);const fastDistance=7-z.x,clock=g.spawnClock,x=z.x,age=p.age;
 g.setDifficulty(1);assert.equal(g.spawnClock,clock);assert.equal(g.plants[0],p);assert.equal(g.zombies[0],z);g.step(1);assert.ok(x-z.x<fastDistance);assert.ok(Math.abs(g.spawnClock-clock-.5)<1e-9);assert.ok(p.age>age);assert.equal(g.config.difficulty,1);
 g.setDifficulty(10);assert.equal(g.spawnClock,clock+.5);g.step(1);assert.ok(Math.abs(g.spawnClock-clock-1.9)<1e-9);
});
test('difficulty persists in checkpoints and old saves safely default to gentler pacing',()=>{
 const g=make({difficulty:2});g.step(3);g.setDifficulty(9);const saved=g.snapshot(),restored=new Game(g.config,g.loadout,saved);assert.equal(restored.difficulty,9);assert.equal(restored.spawnClock,g.spawnClock);assert.equal(restored.spawnCredit,g.spawnCredit);assert.equal(restored.random(),g.random());
 delete saved.difficulty;delete saved.spawnClock;delete saved.spawnCredit;delete saved.config.difficulty;const legacy=new Game(saved.config,g.loadout,saved);assert.equal(legacy.difficulty,3);assert.equal(legacy.spawnClock,saved.time);assert.equal(new Game(LEVELS[0]).difficulty,3);assert.equal(legacy.setDifficulty(0),1);assert.equal(legacy.setDifficulty(99),10);assert.equal(legacy.setDifficulty('bad'),3);
});
test('difficulty changes never duplicate mandatory bosses or prevent a cleared wave winning',()=>{
 const g=make({difficulty:1});g.schedule=[{time:1,type:25,row:2}];g.step(3);assert.equal(g.zombies.filter(z=>z.boss).length,1);g.setDifficulty(10);g.step(1);assert.equal(g.zombies.filter(z=>z.boss).length,1);g.zombies.forEach(z=>g.kill(z));g.step(10);assert.equal(g.status,'won');
});
test('default campaign opening is winnable with its unlocked Peashooter and collected sky sun',()=>{
 const g=new Game({...LEVELS[0],round:1},[0]);const row=2;
 for(let frame=0;frame<60*400&&g.status==='playing';frame++){
  for(const drop of g.drops)if(!drop.collected)g.collect(drop.id);
  if(g.sun>=100&&!(g.cooldowns[0]>0)){for(let col=2;col<5;col++)if(!g.main(row,col)){g.place(0,row,col);break;}}
  g.step(1/60);
 }
 assert.equal(g.status,'won');assert.equal(g.mowers[row].used,false);assert.ok(g.kills>0);
});


test('night and fog provide renewable sky sun, including resumed games with no producers',()=>{
 for(const stage of [1,3]){
  const g=new Game({...LEVELS[stage*10],difficulty:1},[0,1]);
  g.sun=0;
  step(g,6.1);
  const first=g.drops.find(d=>d.kind==='sun'&&!d.collected);
  assert.ok(first,`stage ${stage} must drop sun without a producer`);
  g.collect(first.id);
  assert.equal(g.sun,25);
  const resumed=new Game(g.config,g.loadout,g.snapshot());
  resumed.sun=0;
  resumed.schedule=[{time:9999,type:0,row:0}];resumed.spawnIndex=0;
  for(let i=0;i<4;i++){
   step(resumed,10);
   const suns=resumed.drops.filter(d=>d.kind==='sun'&&!d.collected);
   assert.ok(suns.length,'sun supply must continue after resuming');
   suns.forEach(d=>resumed.collect(d.id));
  }
  assert.ok(resumed.sun>=100);
  assert.equal(resumed.place(0,0,0).ok,true,'collected night sun can buy an attacker');
 }
});
test('night sky sun preserves resource restrictions in special modes',()=>{
 for(const challenge of ['laststand','izombie','vases','whack','conveyor','storm','rain','bowling','bowling2','boss']){
  const g=new Game({...LEVELS[10],challenge,difficulty:1},[0,1,3]);
  g.plants=[];g.drops=[];g.schedule=[{time:9999,type:0,row:0}];g.spawnIndex=0;
  g.step(7);
  assert.equal(g.drops.some(d=>d.kind==='sun'),false,challenge);
 }
});
