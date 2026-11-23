import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,existsSync} from 'node:fs';
import vm from 'node:vm';
const manifest=JSON.parse(readFileSync('public/manifest.webmanifest','utf8'));
test('offline bundle contains the runtime asset map, all atlases and both music files',()=>{
 const files=JSON.parse(readFileSync('dist/sw.js','utf8').match(/FILES=(\[[^\n]+\]);/)[1]);
 const art=JSON.parse(readFileSync('public/assets/manifest.json','utf8'));
 for(const path of ['/index.html','/manifest.webmanifest','/assets/manifest.json','/assets/splash.png','/assets/pole-vaulter-walking.png','/audio/crazy-dave.mp3','/audio/grasswalk.mp3',...Object.values(art).filter(v=>v.file).map(v=>'/assets/'+v.file),...manifest.icons.map(i=>i.src)])assert.ok(files.includes(path),'Missing offline file: '+path);
 for(const path of files)assert.ok(existsSync('dist'+path),'Missing packaged file: '+path);
});
test('PWA has fullscreen landscape launch metadata and correctly sized supplied-art icons',()=>{
 assert.equal(manifest.display,'fullscreen');assert.equal(manifest.orientation,'landscape');assert.equal(manifest.start_url,'/');assert.equal(manifest.scope,'/');
 for(const icon of manifest.icons){const png=readFileSync('public'+icon.src),[w,h]=icon.sizes.split('x').map(Number);assert.equal(png.subarray(1,4).toString(),'PNG');assert.equal(png.readUInt32BE(16),w);assert.equal(png.readUInt32BE(20),h);}
 assert.ok(manifest.icons.some(i=>i.sizes==='192x192'));assert.ok(manifest.icons.some(i=>i.sizes==='512x512'&&i.purpose==='maskable'));
 const html=readFileSync('index.html','utf8');assert.match(html,/<link\b[^>]*rel="manifest"[^>]*crossorigin="use-credentials"/,'Private Site manifest must include the signed-in session');assert.ok(html.includes('id="splash"'));assert.ok(existsSync('public/assets/splash.png'));
});
function worker(){
 const handlers={},stored=new Map([['/index.html',new Response('<main>Lawn defense game</main>')],['/audio/grasswalk.mp3',new Response(Uint8Array.from({length:10},(_,i)=>i),{headers:{'Content-Type':'audio/mpeg'}})]]);
 const state={installed:[],deleted:[],claimed:false,fetches:0};
 class WorkerRequest extends Request{constructor(url,options){super(new URL(url,'https://game.test'),options);}}
 const cache={match:async path=>stored.get(path)?.clone(),addAll:async requests=>{state.installed=requests;}};
 const caches={open:async()=>cache,keys:async()=>['lawn-defense-old','lawn-defense-test','another-app'],delete:async key=>state.deleted.push(key)};
 const self={location:{origin:'https://game.test'},clients:{claim:async()=>{state.claimed=true;}},addEventListener:(name,handler)=>{handlers[name]=handler;}};
 const files=['/index.html','/audio/grasswalk.mp3'];
 vm.runInNewContext(readFileSync('scripts/service-worker.js','utf8').replace('__CACHE__','lawn-defense-test').replace('__PRECACHE__',JSON.stringify(files)),{self,caches,Request:WorkerRequest,Response,URL,fetch:async()=>{state.fetches++;throw Error('Offline');}});
 async function request(path,options={}){let result;handlers.fetch({request:{method:'GET',url:'https://game.test'+path,mode:'same-origin',headers:new Headers(),...options},respondWith:value=>{result=value;}});return result;}
 return {handlers,state,request};
}
test('offline game navigation, assets and music ranges work without intercepting other routes',async()=>{
 const {request,state}=worker();const page=await request('/',{mode:'navigate'});assert.match(await page.text(),/Lawn defense game/);
 const audio=await request('/audio/grasswalk.mp3');assert.equal((await audio.arrayBuffer()).byteLength,10);
 const range=await request('/audio/grasswalk.mp3',{headers:new Headers({Range:'bytes=2-4'})});assert.equal(range.status,206);assert.equal(range.headers.get('Content-Range'),'bytes 2-4/10');assert.deepEqual([...new Uint8Array(await range.arrayBuffer())],[2,3,4]);
 const suffix=await request('/audio/grasswalk.mp3',{headers:new Headers({Range:'bytes=-3'})});assert.deepEqual([...new Uint8Array(await suffix.arrayBuffer())],[7,8,9]);
 assert.equal((await request('/audio/grasswalk.mp3',{headers:new Headers({Range:'bytes=99-'})})).status,416);
 assert.equal(await request('/sign-in',{mode:'navigate'}),undefined);assert.equal(await request('/index.html',{method:'POST'}),undefined);assert.equal(await request('/',{url:'https://another.test/',mode:'navigate'}),undefined);assert.equal(state.fetches,0);
});
test('offline installation rejects sign-in redirects and only removes previous game caches',async()=>{
 const {handlers,state}=worker();let result;handlers.install({waitUntil:value=>{result=value;}});await result;
 assert.equal(state.installed.length,2);assert.ok(state.installed.every(r=>r.redirect==='error'&&r.credentials==='same-origin'));
 handlers.activate({waitUntil:value=>{result=value;}});await result;assert.deepEqual(state.deleted,['lawn-defense-old']);assert.equal(state.claimed,true);
});
