const version = 1;
const cacheName = `ulut0002-service-worker.${version}`;
let cacheRef = undefined;
let isOnline = true;

const cacheItems = ["/", "./index.html", "./css/main.css", "./js/app.js"];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(cacheName).then((cache) => {
      cacheRef = cache;
      cache.addAll(cacheItems);
    })
  );
});

self.addEventListener("activate", (ev) => {
  ev.waitUntil(
    caches.keys().then((keys) => {
      return Promise.all(
        keys
          .filter((key) => key != cacheName)
          .map((name) => caches.delete(name))
      );
    })
  );
});

self.addEventListener("fetch", (ev) => {
  //every HTTP request from the web pages that use the service worker

  let mode = ev.request.mode; // navigate, cors, no-cors
  let method = ev.request.method; //get the HTTP method
  let url = new URL(ev.request.url); //turn the url string into a URL object
  let queryString = new URLSearchParams(url.search); //turn query string into an Object
  let isOnline = navigator.onLine; //determine if the browser is currently offline
  let urlPath = url.pathname.toLowerCase();
  const isImage =
    urlPath.includes(".png") ||
    urlPath.includes(".jpg") ||
    urlPath.includes(".svg") ||
    urlPath.includes(".gif") ||
    urlPath.includes(".webp") ||
    urlPath.includes(".jpeg") ||
    url.hostname.includes("picsum.photos");

  const isFont = urlPath.includes(".woff2");
  const isCSS = urlPath.includes(".css");
  const inCacheList = cacheItems.indexOf(ev.request.url) >= 0;
  let forceCacheCheck = false;
  if (isFont || isCSS || isImage || inCacheList) {
    forceCacheCheck = true;
  }

  //Anything else is JSON
  const isJSON = !forceCacheCheck;

  let selfLocation = new URL(self.location);
  //determine if the requested file is from the same origin as your website
  let isRemote = selfLocation.origin !== url.origin;

  if (urlPath.includes("https")) {
    // console.log(urlPath);
  }
  console.log("request to: ", urlPath);

  if (isOnline) {
    if (isJSON) {
      //For JSON requests attempt the fetch first. Then update the cache with the latest copy and return the response.
      // console.log(url);
      ev.respondWith(networkFirst(ev));
    } else if (forceCacheCheck) {
      //For html, css, fonts, js, and images check the cache first and return that
      //if not in the cache then do a fetch call to retrieve it
      //after a successful fetch, clone the response and put( ) it into the cache before returning the response.
      ev.respondWith(staleWhileRevalidate(ev));
    } else {
      ev.respondWith(cacheFirst(ev));
    }
  } else {
    // not online
    // Check if the navigator is online for the JSON fetch. If offline then return the cached JSON.

    ev.respondWith(cacheFirst(ev));
  }

  return;
});

self.addEventListener("message", (ev) => {
  //message received from the web pages that use the service worker
  //this is optional
});

function sendMessage(msg, clientId) {
  //send a message to one or all clients
  //this is optional
}

class NetworkError extends Error {
  constructor(msg, response) {
    super(msg);
    this.type = "NetworkError";
    this.response = response;
    this.message = msg;
  }
}

function cacheFirst(ev) {
  //try cache then fetch
  let cacheResponse;
  if (cacheRef) cacheResponse = cacheRef.match(ev.request);
  return cacheResponse || fetch(ev.request);
}

function cacheOnly(ev) {
  if (cacheRef) return cacheRef.match(ev.request);
  return undefined;
}

function networkFirst(ev) {
  //try fetch then cache
  return fetch(ev.request).then((response) => {
    // if response is not ok, return cache value (if exists)
    if (!response.ok) {
      if (cacheRef) {
        return cacheRef.match(ev.request);
      }
      return undefined;
    }

    //update the cache
    if (cacheRef && response) cacheRef.put(ev.request, response.clone());

    return response;
  });
}

function networkOnly(ev) {
  return fetch(ev.request);
}

function staleWhileRevalidate(ev) {
  let cacheMatch = undefined;
  let fetchResponse = fetch(ev.request);

  if (cacheRef) {
    cacheMatch = cacheRef.match(ev.request).then((response) => {
      fetchResponse.then((res) => {
        cacheRef.put(ev.request, res.clone());
      });
      return response;
    });
  } else {
    // no operation
  }

  return cacheMatch || fetchResponse;
}

function networkFirstAndRevalidate(ev) {
  //attempt fetch and cache result too
  return fetch(ev.request).then((response) => {
    if (!response.ok) {
      if (cacheRef) return cacheRef.match(ev.request);
    }
    return response;
  });
}
