import * as THREE from 'three';
import {PLANTS,ZOMBIES} from './data.js';
export const W=960,H=540;
export const BOARD={x:187,y:112,width:625,height:377};
// Measured from the generated backgrounds: pool strips and roof slope differ.
export const MAPS=[
 {edges:[102,184,260,335,411,492],left:[218,211,204,197,190],right:[791,797,804,811,817]},
 {edges:[102,184,260,335,411,492],left:[218,211,204,197,190],right:[791,797,804,811,817]},
 {edges:[90,143,196,277,359,446,522],left:[205,205,210,210,205,205],right:[836,836,850,850,836,836]},
 {edges:[90,143,196,277,359,446,522],left:[205,205,210,210,205,205],right:[836,836,850,850,836,836]},
 {edges:[119,189,260,333,408,483],left:[223,204,186,167,148],right:[806,824,841,860,879]}
];
export class Renderer {
 constructor(container){
  this.container=container;this.scene=new THREE.Scene();this.camera=new THREE.OrthographicCamera(0,W,H,0,-100,100);this.camera.position.z=50;this.renderer=new THREE.WebGLRenderer({antialias:true,alpha:false});this.renderer.setPixelRatio(Math.min(devicePixelRatio,2));this.renderer.outputColorSpace=THREE.SRGBColorSpace;this.renderer.setClearColor('#638f32');container.append(this.renderer.domElement);this.geometry=new THREE.PlaneGeometry(1,1,12,20);this.flatGeometry=new THREE.PlaneGeometry(1,1);this.views=new Map();this.textures={};this.portraits={};this.images={};this.background=null;this.hover=null;this.boardRows=5;this.fog=[];this.reduced=matchMedia('(prefers-reduced-motion:reduce)').matches;new ResizeObserver(()=>this.resize()).observe(container);this.resize();
 }
 resize(){const rect=this.container.getBoundingClientRect();this.renderer.setSize(rect.width,rect.height,false);const aspect=rect.width/Math.max(1,rect.height),bounds=this.currentGame?{x:110,y:45,width:850,height:495}:{x:0,y:0,width:W,height:H},spanX=Math.max(bounds.width,bounds.height*aspect),spanY=Math.max(bounds.height,bounds.width/aspect),cx=bounds.x+bounds.width/2,cy=H-bounds.y-bounds.height/2;this.camera.left=cx-spanX/2;this.camera.right=cx+spanX/2;this.camera.top=cy+spanY/2;this.camera.bottom=cy-spanY/2;this.camera.updateProjectionMatrix();}
 async load(){
  this.manifest=await fetch('/assets/manifest.json').then(r=>{if(!r.ok)throw new Error('Asset manifest could not load');return r.json();});
  for(const category of ['plants','zombies','environments','interface','props']){
   const sheet=this.manifest[category];if(!sheet)continue;const img=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error(`Missing art: ${sheet.file}`));im.src='/assets/'+sheet.file;});this.images[category]=img;this.textures[category]=[];this.portraits[category]=[];
   for(const entry of sheet.entries){const canvas=document.createElement('canvas');const[x,y,w,h]=entry.rect;canvas.width=Math.ceil(w);canvas.height=Math.ceil(h);const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,x,y,w,h,0,0,w,h);
    if(category!=='environments'){
     // Trim at runtime: atlas art remains intact on disk.
     const pixels=ctx.getImageData(0,0,canvas.width,canvas.height).data;let left=canvas.width,top=canvas.height,right=0,bottom=0;
     const seen=new Uint8Array(canvas.width*canvas.height),queue=new Int32Array(seen.length);let largest=0;
     // The generated layout is irregular: discard disconnected neighbor fragments.
     for(let index=0;index<seen.length;index++){
      if(seen[index]||pixels[index*4+3]<=70)continue;let head=0,tail=1;queue[0]=index;seen[index]=1;let l=canvas.width,r=0,t=canvas.height,b=0;
      while(head<tail){const p=queue[head++],xx=p%canvas.width,yy=Math.floor(p/canvas.width);l=Math.min(l,xx);r=Math.max(r,xx);t=Math.min(t,yy);b=Math.max(b,yy);for(const next of [xx>0?p-1:-1,xx<canvas.width-1?p+1:-1,p-canvas.width,p+canvas.width]){if(next>=0&&next<seen.length&&!seen[next]&&pixels[next*4+3]>70){seen[next]=1;queue[tail++]=next;}}}
      if(tail>largest){largest=tail;left=l;right=r;top=t;bottom=b;}
     }
     if(left<right&&top<bottom){const cut=document.createElement('canvas');cut.width=right-left+5;cut.height=bottom-top+5;cut.getContext('2d').drawImage(canvas,left,top,right-left+1,bottom-top+1,2,2,right-left+1,bottom-top+1);canvas.width=cut.width;canvas.height=cut.height;ctx.drawImage(cut,0,0);}
    }
    const tex=new THREE.CanvasTexture(canvas);tex.colorSpace=THREE.SRGBColorSpace;tex.minFilter=THREE.LinearFilter;tex.magFilter=THREE.LinearFilter;tex.generateMipmaps=false;tex.userData={width:canvas.width,height:canvas.height};this.textures[category][entry.id]=tex;this.portraits[category][entry.id]=canvas.toDataURL();
   }
  }
  const walkingImage=await new Promise((resolve,reject)=>{const im=new Image();im.onload=()=>resolve(im);im.onerror=()=>reject(new Error('Missing pole-free zombie sprite'));im.src='/assets/pole-vaulter-walking.png';});
  this.poleWalking=new THREE.Texture(walkingImage);this.poleWalking.needsUpdate=true;this.poleWalking.colorSpace=THREE.SRGBColorSpace;this.poleWalking.userData={width:walkingImage.width,height:walkingImage.height};
  this.shadowTexture=this.makeCanvas(80,32,(c)=>{const g=c.createRadialGradient(40,16,0,40,16,40);g.addColorStop(0,'rgba(18,30,7,.35)');g.addColorStop(1,'rgba(18,30,7,0)');c.fillStyle=g;c.fillRect(0,0,80,32);});
  this.particleTexture=this.makeCanvas(32,32,c=>{const g=c.createRadialGradient(16,16,1,16,16,16);g.addColorStop(0,'#fff9b5');g.addColorStop(.3,'#ffe05b');g.addColorStop(1,'rgba(255,120,20,0)');c.fillStyle=g;c.fillRect(0,0,32,32);});
  this.fogTexture=this.makeCanvas(256,64,c=>{const g=c.createLinearGradient(0,0,256,0);g.addColorStop(0,'rgba(152,181,182,0)');g.addColorStop(.25,'rgba(152,181,182,.4)');g.addColorStop(1,'rgba(133,174,180,.91)');c.fillStyle=g;c.fillRect(0,0,256,64);});
  this.setBackground(5);
 }
 makeCanvas(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'));return new THREE.CanvasTexture(c);}
 portrait(category,id){return this.portraits[category]?.[id]||this.portraits.plants?.[0];}
 mesh(texture,w,h,{animate=false,seed=0}={}){
  const mat=new THREE.MeshBasicMaterial({map:texture,transparent:true,depthWrite:false,depthTest:false,alphaTest:.01});
  const uniforms={uTime:{value:0},uWalk:{value:0},uAttack:{value:0},uSeed:{value:seed},uReduced:{value:0}};
  if(animate){mat.onBeforeCompile=shader=>{Object.assign(shader.uniforms,uniforms);shader.vertexShader='uniform float uTime; uniform float uWalk; uniform float uAttack; uniform float uSeed; uniform float uReduced;\n'+shader.vertexShader;shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`#include <begin_vertex>
      float root = position.y + .5;
      float upper = smoothstep(.18,.75,root);
      float idle = sin(uTime*2.5+uSeed)*.022;
      transformed.x += (idle*upper + sin(uTime*7.0+uSeed)*.025*upper*uWalk - uAttack*.075*upper)*(1.0-uReduced);
      float leg = 1.0-smoothstep(.02,.48,root);
      transformed.x += sin(uTime*8.0+uSeed+sign(position.x)*1.57)*.045*leg*uWalk*(1.0-uReduced);
      transformed.y += abs(sin(uTime*8.0+uSeed))*.018*uWalk*root*(1.0-uReduced);
      transformed.x *= 1.0 + uAttack*.04;
      transformed.y *= 1.0 - uAttack*.02;
    `);};mat.customProgramCacheKey=()=> 'cartoon-sway-v1';}
  const m=new THREE.Mesh(animate?this.geometry:this.flatGeometry,mat);m.scale.set(w,h,1);m.userData={uniforms,width:w,height:h};return m;
 }
 setBackground(id){if(this.background){this.scene.remove(this.background);this.background.material.dispose();}this.background=this.mesh(this.textures.environments[id],W,H);this.background.position.set(W/2,H/2,-10);this.background.renderOrder=-100;this.scene.add(this.background);}
 clear(){for(const v of this.views.values())this.disposeView(v);this.views.clear();this.fog.forEach(f=>{this.scene.remove(f);f.material.dispose();});this.fog=[];if(this.hover){this.scene.remove(this.hover);this.hover.material.dispose();this.hover=null;}}
 start(game){this.clear();this.currentGame=game;this.boardRows=game.rows;this.map=MAPS[game.config.stage];this.container.parentElement.classList.add('is-playing');this.resize();this.setBackground(game.config.stage);for(let i=0;i<3;i++){const f=this.mesh(this.fogTexture,340,220);f.position.set(755,210+i*90,9);f.renderOrder=600+i;this.scene.add(f);this.fog.push(f);}}
 point(x,row){const map=this.map||MAPS[0],r=Math.max(0,Math.min(map.left.length-1,row)),a=Math.floor(r),b=Math.min(map.left.length-1,a+1),t=r-a;const lerp=(list)=>list[a]+(list[b]-list[a])*t;const centers=map.edges.slice(0,-1).map((y,i)=>(y+map.edges[i+1])/2);const left=lerp(map.left),right=lerp(map.right);return {x:left+x*(right-left)/9,y:lerp(centers),width:(right-left)/9,height:map.edges[a+1]-map.edges[a]};}
 mouse(event){const r=this.container.getBoundingClientRect();const x=this.camera.left+(event.clientX-r.left)/r.width*(this.camera.right-this.camera.left),y=H-this.camera.top+(event.clientY-r.top)/r.height*(this.camera.top-this.camera.bottom),map=this.map||MAPS[0];let row=map.edges.slice(0,-1).findIndex((edge,i)=>y>=edge&&y<map.edges[i+1]);const point=this.point(0,Math.max(0,row));const col=Math.floor((x-point.x)/point.width);return {x,y,col,row,inside:col>=0&&col<9&&row>=0&&row<this.boardRows};}
 makeView(entity,category,type,kind){
  const texture=kind==='zombie'&&type===3&&(entity.poleLost||entity.jumped)?this.poleWalking:this.textures[category]?.[type]||this.textures.plants[0];let height=kind==='zombie'?98:63;
  if(kind==='zombie'&&[12,13,22].includes(type))height=90;if(kind==='zombie'&&type===23)height=121;if(kind==='zombie'&&type===24)height=65;if(kind==='zombie'&&type===25)height=230;
  if(kind==='plant'&&type===23)height=81;if(kind==='plant'&&type===47)height=71;
  if(kind==='prop')height=55;if(kind==='mower')height=44;if(kind==='drop')height=entity.kind==='sun'?45:30;if(kind==='shot')height=entity.kind==='melon'||entity.kind==='winter'?29:19;
  let width=height*(texture.userData.width/texture.userData.height);width=Math.min(width,kind==='zombie'&&type===25?225:kind==='plant'&&type===47?128:kind==='zombie'?135:85);
  const group=new THREE.Group(),mesh=this.mesh(texture,width,height,{animate:kind==='plant'||kind==='zombie',seed:entity.id*.73});group.add(mesh);let shadow=null;
  if(['plant','zombie','mower','prop'].includes(kind)){shadow=this.mesh(this.shadowTexture,Math.min(64,width*.9),18);shadow.position.y=-height/2+4;shadow.renderOrder=-1;group.add(shadow);}
  this.scene.add(group);return {group,mesh,shadow,category,type,kind,height,width,poleLost:!!(entity.poleLost||entity.jumped)};
 }
 disposeView(v){this.scene.remove(v.group);v.group.traverse(m=>{if(m.material)m.material.dispose();});}
 updateView(entity,category,type,kind,alpha,time){
  const key=kind+entity.id;let v=this.views.get(key);if(v&&(v.type!==type||kind==='zombie'&&type===3&&v.poleLost!==!!(entity.poleLost||entity.jumped))){this.disposeView(v);this.views.delete(key);v=null;}if(!v){v=this.makeView(entity,category,type,kind);this.views.set(key,v);}
  const x=entity.px!==undefined?entity.px+(entity.x-entity.px)*alpha:entity.x;let row=entity.py!==undefined?entity.py+(entity.row-entity.py)*alpha:entity.row;const point=this.point(x,row);let y=point.y+21-v.height/2;
  const phase=time*2.5+entity.id*.73;
  v.group.position.set(point.x,H-y,0);v.group.renderOrder=100+Math.round(row*20)+(kind==='drop'?300:kind==='shot'?250:0);v.mesh.scale.set(v.width,v.height,1);
  const un=v.mesh.userData.uniforms;un.uTime.value=kind==='zombie'&&entity.jumped?time*.55:time;un.uSeed.value=entity.id*.73;un.uReduced.value=this.reduced?1:0;un.uWalk.value=kind==='zombie'&&!entity.attack&&!entity.hover&&!entity.boss?1:0;un.uAttack.value=Math.max(0,(entity.attack||0)*4);
  v.mesh.rotation.z=kind==='plant'&&!this.reduced?Math.sin(phase)*.018:0;
  v.mesh.material.color.set(entity.flash>0?'#ffeecc':entity.slow>0&&entity.slow>time?'#95c7ff':entity.hypno?'#cb9fff':'#ffffff');v.mesh.material.opacity=entity.sleep?.68:entity.underground?.35:1;
  if(kind==='plant'){const def=PLANTS[type];if(def.kind==='base'){v.group.position.y-=18;v.group.renderOrder-=4;v.mesh.scale.y=v.height*.45;}if(type===30){v.group.position.y-=16;v.mesh.scale.y=v.height*.7;v.group.renderOrder+=4;}if(type===4&&entity.age<14){v.mesh.scale.y=v.height*.6;v.group.position.y-=10;}if(entity.hp<def.hp*.45)v.mesh.material.color.set('#bbae8a');if(entity.sleep)v.mesh.rotation.z=.08;}
  if(kind==='zombie'){
   if(type===16)v.group.position.y+=35+Math.sin(phase)*4;if(entity.hover)v.group.position.y+=Math.max(0,60-entity.age*15);if(entity.underground)v.group.position.y-=35;
   if(entity.submerged){v.mesh.scale.y=v.height*.55;v.group.position.y-=22;}
   if(entity.vault){const t=entity.vault.elapsed/entity.vault.duration;v.group.position.y+=Math.sin(Math.PI*t)*65;v.mesh.rotation.z=Math.sin(Math.PI*t)*-.35;un.uWalk.value=0;}
   if(type===18&&!this.reduced)v.group.position.y+=Math.abs(Math.sin(time*5))*18;
   if(kind==='zombie'&&entity.dir===1)v.mesh.scale.x=-v.width;else v.mesh.scale.x=v.width;
   if(this.currentGame?.config.challenge==='tiny'){v.mesh.scale.set(v.width*.6,v.height*.6,1);v.group.position.y-=20;}
   if(this.currentGame?.config.challenge==='invisible'&&entity.flash<=0)v.mesh.material.opacity=.035;
  }
  if(kind==='shot'){
   const plantView=this.views.get('plant'+entity.emitterId),height=plantView?.height||63,width=plantView?.width||60;const anchors={0:[.87,.29],5:[.90,.29],7:[.94,.28],18:[.88,.38],28:entity.dir<0?[.05,.38]:[.94,.38],40:[.89,.39],26:[.8,.35],43:[.7,.4]};const anchor=anchors[entity.emitter]||[.7,.38];
   const offsetX=(anchor[0]-.5)*width-(entity.dir||1)*.35*point.width;
   const launch=this.point(entity.sourceX,entity.sourceRow),lane=this.point(entity.sourceX,entity.startRow);let mouthY=launch.y+21-height*(1-anchor[1]);
   if(entity.emitter===18)mouthY+=(entity.startRow-entity.sourceRow)*17;
   const settle=Math.min(1,entity.age/.26);v.group.position.y=H-(mouthY+(lane.y-launch.y)*settle+(point.y-lane.y));v.group.position.x+=offsetX;
   if(entity.lob)v.group.position.y+=Math.sin(Math.min(1,entity.age/.7)*Math.PI)*90;v.mesh.rotation.z=entity.kind==='star'?time*5:0;
  }
  if(kind==='mower'){v.mesh.scale.x=-v.width;v.group.position.x=this.point(0,row).x-24+(entity.active?((entity.x+.5)*point.width):0);v.group.position.y=H-point.y+3;}
  if(kind==='drop'){
   const born=Math.min(1,entity.age/1.4);v.group.position.y=H-point.y+15+(1-born)*100+Math.sin(phase)*3;
   if(entity.collected){const t=Math.min(1,entity.age/.55);v.group.position.x=point.x+(43-point.x)*t;v.group.position.y=(H-point.y)+((H-38)-(H-point.y))*t;v.mesh.scale.multiplyScalar(1-t*.7);v.mesh.material.opacity=1-t;}
  }
  return key;
 }
 draw(game,alpha,time){
  this.currentGame=game;if(!game){this.renderer.render(this.scene,this.camera);return;}this.boardRows=game.rows;const alive=new Set();
  for(const p of game.plants)alive.add(this.updateView(p,'plants',p.type,'plant',alpha,time));
  for(const z of game.zombies)alive.add(this.updateView(z,'zombies',z.type,'zombie',alpha,time));
  for(const m of game.mowers)if(m.available&&(!m.used||m.active))alive.add(this.updateView(m,'zombies',game.water(m.row)?27:game.config.stage===4?28:26,'mower',alpha,time));
  for(const s of game.shots){const type={pea:4,ice:5,fire:6,star:7,cabbage:8,kernel:9,butter:10,melon:11,winter:11,spike:4,needle:4}[s.kind]??4;alive.add(this.updateView(s,'interface',type,'shot',alpha,time));}
  for(const d of game.drops)alive.add(this.updateView(d,'interface',d.kind==='sun'?0:d.value===1000?3:d.value>=50?2:1,'drop',alpha,time));
  for(const g of game.graves)alive.add(this.updateView(g,'props',2,'prop',alpha,time));
  for(const g of game.craters)alive.add(this.updateView(g,'props',3,'prop',alpha,time));
  for(const g of game.ice)alive.add(this.updateView(g,'props',13,'prop',alpha,time));
  if(game.starTargets)for(const [row,col]of game.starTargets){const id='starTarget'+row+'_'+col;alive.add(this.updateView({id,x:col+.5,row},'plants',29,'target',alpha,time));const v=this.views.get('target'+id);v.mesh.material.opacity=.25;v.group.renderOrder=1;}
  if(game.matchSelected){const p=game.plants.find(p=>p.id===game.matchSelected);if(p)this.highlight(p.row,p.col);}
  for(const v of game.vases)alive.add(this.updateView(v,'props',v.green?1:0,'prop',alpha,time));
  for(const ball of game.bowlingBalls){alive.add(this.updateView(ball,'plants',ball.type,'ball',alpha,time));const v=this.views.get('ball'+ball.id);v.mesh.rotation.z=-ball.age*5;}
  for(const f of game.fish){alive.add(this.updateView(f,'props',5,'fish',alpha,time));const v=this.views.get('fish'+f.id);v.mesh.scale.x=f.dir>0?-v.width:v.width;v.mesh.material.color.set(f.hunger>20?'#e49279':'white');}
  for(const f of game.food)alive.add(this.updateView(f,'props',6,'prop',alpha,time));
  if(game.config.challenge==='izombie')game.brains.forEach((brain,row)=>{if(brain)alive.add(this.updateView({id:'brain'+row,x:-.6,row},'props',4,'prop',alpha,time));});
  if(game.bossOrb)alive.add(this.updateView({...game.bossOrb,kind:game.bossOrb.kind==='fire'?'fire':'ice'},'interface',game.bossOrb.kind==='fire'?6:5,'orb',alpha,time));
  for(const e of game.effects){
   const key='effect'+e.id;alive.add(key);let v=this.views.get(key);if(!v){let texture=e.kind==='death'?this.textures.zombies[e.sprite]:this.particleTexture;const mesh=this.mesh(texture,e.kind==='death'?80:65,e.kind==='death'?95:65);const group=new THREE.Group();group.add(mesh);this.scene.add(group);v={mesh,group};this.views.set(key,v);}const p=this.point(e.x,e.row),t=e.age/e.duration;v.group.position.set(p.x,H-p.y+15,1);v.group.renderOrder=500;v.mesh.material.opacity=(1-t)*(e.kind==='death'?.8:1);if(e.kind==='death'){v.mesh.rotation.z=t*1.5;v.group.position.y-=t*15;}else {const scale=(e.kind==='boom'?1+(e.radius||1)*1.8:1)+t*1.5;v.mesh.scale.set(65*scale,65*scale,1);v.mesh.material.color.set(e.kind==='freeze'?'#95ddff':e.kind==='fume'?'#d36bff':e.kind==='plant'?'#adf56b':'#ffce55');}}
  for(const[key,v]of this.views)if(!alive.has(key)){this.disposeView(v);this.views.delete(key);}
  const fogged=game.config.stage===3&&game.fogClear<=game.time;this.fog.forEach((f,i)=>{f.visible=fogged;f.material.opacity=.65;f.position.x=760+Math.sin(time*.3+i)*15;});
  if(fogged){const lit=game.plants.filter(p=>p.type===25&&!p.sleep);if(lit.length)this.fog.forEach(f=>f.material.opacity=.35);}
  this.renderer.render(this.scene,this.camera);
 }
 highlight(row,col,valid=true,plant=null){
  if(!this.hover){this.hover=this.mesh(null,BOARD.width/9,BOARD.height/this.boardRows);this.hover.material.map=null;this.hover.material.transparent=true;this.hover.material.opacity=.18;this.hover.renderOrder=50;this.scene.add(this.hover);}this.hover.visible=row>=0&&row<this.boardRows&&col>=0&&col<9;const p=this.point(col+.5,Math.max(0,row));this.hover.position.set(p.x,H-p.y,-1);this.hover.scale.set(p.width,p.height,1);this.hover.material.color.set(valid?'#ffff8a':'#ff5142');
 }
}
