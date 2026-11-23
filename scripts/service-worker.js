const CACHE='__CACHE__',FILES=__PRECACHE__;
self.addEventListener('install',event=>event.waitUntil(caches.open(CACHE).then(async cache=>{
 // Fail the install on sign-in redirects instead of caching an authentication page.
 await cache.addAll(FILES.map(url=>new Request(url,{credentials:'same-origin',redirect:'error'})));
})));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 for(const key of await caches.keys())if(key.startsWith('lawn-defense-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();
})()));
// Updates wait for open game windows to close so a running level keeps its assets.
self.addEventListener('fetch',event=>{
 const request=event.request,url=new URL(request.url);
 if(request.method!=='GET'||url.origin!==self.location.origin)return;
 if(request.mode==='navigate'&&url.pathname==='/'){
  event.respondWith(caches.open(CACHE).then(async cache=>await cache.match('/index.html')||fetch(request)));return;
 }
 if(!FILES.includes(url.pathname))return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),cached=await cache.match(url.pathname);
  const response=cached||await fetch(request);
  if(!cached||!request.headers.has('range'))return response;
  const bytes=await response.arrayBuffer(),range=request.headers.get('range').match(/^bytes=(\d*)-(\d*)$/);
  if(!range||!range[1]&&!range[2])return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+bytes.byteLength}});
  const start=range[1]?Number(range[1]):Math.max(0,bytes.byteLength-Number(range[2]));
  const end=range[1]&&range[2]?Math.min(Number(range[2]),bytes.byteLength-1):bytes.byteLength-1;
  if(start>end||start>=bytes.byteLength)return new Response(null,{status:416,headers:{'Content-Range':'bytes */'+bytes.byteLength}});
  return new Response(bytes.slice(start,end+1),{status:206,headers:{'Content-Type':response.headers.get('Content-Type')||'application/octet-stream','Content-Length':String(end-start+1),'Content-Range':`bytes ${start}-${end}/${bytes.byteLength}`,'Accept-Ranges':'bytes'}});
 })());
});
