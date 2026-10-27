// Dosya360 — kurulabilirlik icin asgari servis calisani.
// Onbellek YOK: her istek dogrudan aga gider, boylece siteyi
// guncelledigimizde kullanici eski surumde kalmaz.
self.addEventListener('install',  function(){ self.skipWaiting() })
self.addEventListener('activate', function(e){ e.waitUntil(self.clients.claim()) })
self.addEventListener('fetch', function(){ /* araya girme */ })
