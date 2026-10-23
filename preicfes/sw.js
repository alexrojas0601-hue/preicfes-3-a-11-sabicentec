/* SABI PREICFES · funciona sin internet tras la primera visita */
const V="sabi-preicfes-202610231020";
const SHELL=["./","index.html","manifest.json","assets/avatar_sabi.jpg","assets/avatar_face.jpg","assets/icono.png"];
self.addEventListener("install",e=>{e.waitUntil((async()=>{
  const c=await caches.open(V); await c.addAll(SHELL);
  try{ const r=await fetch("banco/indice.json",{cache:"no-store"}); const idx=await r.clone().json(); await c.put("banco/indice.json",r);
    await c.addAll(Object.keys(idx.files).map(k=>"banco/"+k+".json?v="+idx.version)); }catch(err){}
  self.skipWaiting(); })())});
self.addEventListener("activate",e=>{e.waitUntil((async()=>{for(const k of await caches.keys()) if(k!==V) await caches.delete(k); await self.clients.claim();})())});
self.addEventListener("fetch",e=>{
  const u=new URL(e.request.url); if(e.request.method!=="GET"||u.origin!==location.origin) return;
  const fresh=e.request.mode==="navigate"||u.pathname.endsWith("indice.json");
  e.respondWith((async()=>{
    const c=await caches.open(V);
    if(fresh){ try{ const r=await fetch(e.request,{cache:"no-store"}); if(r.ok) c.put(u.pathname.endsWith("indice.json")?"banco/indice.json":e.request,r.clone()); return r; }
      catch(err){ return (await c.match(u.pathname.endsWith("indice.json")?"banco/indice.json":e.request))||(await c.match("index.html")); } }
    const hit=await c.match(e.request); if(hit) return hit;
    try{ const r=await fetch(e.request); if(r.ok) c.put(e.request,r.clone()); return r; }catch(err){ return new Response("",{status:504}); }
  })());
});
