const VERSION="{{VERSION}}";
const PREFIX="{{NAME_SHORT}}";
const STATIC_CACHE=`${PREFIX}-static-${VERSION}`;
const RUNTIME_CACHE=`${PREFIX}-runtime-${VERSION}`;
const OFFLINE_URL="/";
const PRECACHE_URLS=JSON.parse(String.raw`{{PAGES_ARR}}`);

function isSameOrigin(url){ return url.origin===self.location.origin; }

async function fetchReload(request){
    const req = request instanceof Request ? new Request(request, {cache:"reload"}) : new Request(request, {cache:"reload"});
    return fetch(req);
}

async function cachePut(cacheName, request, response){
    try{
        if(!response || !response.ok) return;
        const cache = await caches.open(cacheName);
        await cache.put(request, response);
    }catch(_){}
}

async function cacheMatch(cacheName, request, ignoreSearch){
    try{
        const cache = await caches.open(cacheName);
        return await cache.match(request, {ignoreSearch: !!ignoreSearch});
    }catch(_){
        return null;
    }
}

async function matchAny(request, ignoreSearch){
    const r = await cacheMatch(RUNTIME_CACHE, request, ignoreSearch);
    if(r) return r;
    return cacheMatch(STATIC_CACHE, request, ignoreSearch);
}

async function precache(){
    const cache = await caches.open(STATIC_CACHE);
    const urls = Array.isArray(PRECACHE_URLS) ? PRECACHE_URLS : [];
    const set = new Set(urls.concat([OFFLINE_URL, "/index.html"]));
    for(const url of set){
        try{
            const req = new Request(url, {cache:"reload"});
            const res = await fetch(req);
            if(res && res.ok) await cache.put(req, res);
        }catch(_){}
    }
}

self.addEventListener("install",(event)=>{
    event.waitUntil((async()=>{
        await precache();
        await self.skipWaiting();
    })());
});

self.addEventListener("activate",(event)=>{
    event.waitUntil((async()=>{
        try{
            if(self.registration && self.registration.navigationPreload) await self.registration.navigationPreload.enable();
        }catch(_){}
        const keys = await caches.keys();
        await Promise.all(keys.map((key)=>{
            if(!key.startsWith(PREFIX+"-")) return;
            if(key===STATIC_CACHE || key===RUNTIME_CACHE) return;
            return caches.delete(key);
        }));
        await self.clients.claim();
    })());
});

self.addEventListener("message",(event)=>{
    if(event && event.data==="SKIP_WAITING") self.skipWaiting();
});

function isNavigation(req){
    const accept = req.headers.get("accept") || "";
    return req.mode==="navigate" || accept.includes("text/html");
}

function isCriticalAsset(req, url){
    const d = req.destination;
    if(d==="script" || d==="style" || d==="worker" || d==="manifest" || d==="font") return true;
    const p = url.pathname || "";
    if(p.endsWith(".js") || p.endsWith(".css") || p.endsWith(".json") || p.endsWith(".webmanifest")) return true;
    return false;
}

self.addEventListener("fetch",(event)=>{
    const req = event.request;
    if(req.method!=="GET") return;

    const url = new URL(req.url);
    if(!isSameOrigin(url)) return;

    if(isNavigation(req)){
        event.respondWith((async()=>{
            try{
                const preload = await event.preloadResponse;
                if(preload){
                    await cachePut(RUNTIME_CACHE, req, preload.clone());
                    return preload;
                }
            }catch(_){}
            try{
                const res = await fetchReload(req);
                if(res && res.ok){
                    await cachePut(RUNTIME_CACHE, req, res.clone());
                    return res;
                }
            }catch(_){}
            const cached = await matchAny(req, true);
            if(cached) return cached;
            const offline = await matchAny(OFFLINE_URL, true) || await matchAny("/index.html", true);
            if(offline) return offline;
            return new Response("Offline",{status:503,headers:{"Content-Type":"text/plain"}});
        })());
        return;
    }

    if(isCriticalAsset(req, url)){
        event.respondWith((async()=>{
            try{
                const res = await fetchReload(req);
                if(res && res.ok){
                    await cachePut(RUNTIME_CACHE, req, res.clone());
                    return res;
                }
            }catch(_){}
            const cached = await matchAny(req, false);
            return cached || new Response("",{status:504});
        })());
        return;
    }

    event.respondWith((async()=>{
        const cached = await matchAny(req, false);
        if(cached){
            event.waitUntil((async()=>{
                try{
                    const res = await fetchReload(req);
                    if(res && res.ok) await cachePut(RUNTIME_CACHE, req, res.clone());
                }catch(_){}
            })());
            return cached;
        }
        try{
            const res = await fetchReload(req);
            if(res && res.ok){
                await cachePut(RUNTIME_CACHE, req, res.clone());
                return res;
            }
        }catch(_){}
        return new Response("",{status:504});
    })());
});
