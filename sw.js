const version = 1;
const cacheName = `ulut0002-service-worker.${version}`;
let cacheRef = undefined;
let isOnline = true;

const cacheItems = [
  ".",
  "./index.html",
  "./css/main.css",
  "./js/app.js",
  "./img/favicon.png", // added to dismiss live server error
  "./img/background.jpg",
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches
      .open(cacheName)
      .then((cache) => {
        cacheRef = cache;
        cache.addAll(cacheItems).catch((err) => {
          console.warn("Did not save everything in the cache");
        });
      })
      .catch((err) => {
        console.warn("Error with cache open");
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

  const isFont =
    urlPath.includes(".woff2") ||
    urlPath.includes("fonts.gstatic.com") ||
    urlPath.includes("fonts.googleapis");

  const isCSS = urlPath.includes(".css");

  const inCacheList = cacheItems.indexOf(ev.request.url) >= 0;

  //Anything else is JSON, so it will be networkFirst by default
  let isJSON = !(isFont || isCSS || isImage || inCacheList);

  let selfLocation = new URL(self.location);
  //determine if the requested file is from the same origin as your website
  let isRemote = selfLocation.origin !== url.origin;

  if (isOnline) {
    if (isJSON) {
      ev.respondWith(networkFirst(ev));
    } else {
      ev.respondWith(cacheFirst(ev));
    }
  } else {
    // Check if the navigator is online for the JSON fetch. If offline then return the cached JSON.
    ev.respondWith(cacheFirst(ev));
  }
  return;
});

class NetworkError extends Error {
  constructor(msg, response) {
    super(msg);
    this.type = "NetworkError";
    this.response = response;
    this.message = msg;
  }
}

async function openCache() {
  return caches.open(cacheName).then((cache) => {
    return cache;
  });
}

// source: https://developer.chrome.com/docs/workbox/caching-strategies-overview/
// The request hits the cache. If the asset is in the cache, serve it from there.
// If the request is not in the cache, go to the network.
// Once the network request finishes, add it to the cache, then return the response from the network.
function cacheFirst(ev) {
  return caches.open(cacheName).then((cache) => {
    return cache.match(ev.request).then((cacheMatch) => {
      const fetchResult = fetch(ev.request.url)
        .then((response) => {
          if (!response.ok) {
            throw new NetworkError("Fetch has failed", response);
          }
          const clone = response.clone();
          caches.open(cacheName).then((cache2) => {
            return cache2.put(ev.request, clone).catch((err) => {});
          });
          return response;
        })
        .catch((err) => {
          return createEmptyResponse();
        });
      return cacheMatch || fetchResult;
    });
  });
}

//source: https://developer.chrome.com/docs/workbox/caching-strategies-overview/  "Network first, falling back to cache"
// You go to the network first for a request, and place the response in the cache.
// If you're offline at a later point, you fall back to the latest version of that response in the cache.
function networkFirst(ev) {
  return fetch(ev.request.url)
    .then((response) => {
      // if response is not ok, throw an error and seek the response in cache
      const clone = response.clone();
      if (!response.ok) throw new NetworkError("Fetch has failed.", response);
      caches.open(cacheName).then((cache) => {
        cache.put(ev.request, clone).catch((err) => {});
      });
      return response;
    })
    .catch((err) => {
      // fetch has failed. Check the cache and  test errors in each step
      // if there is an error condition, return an empty response
      // if a value is found in cache, return the found value

      cacheResult = caches.open(cacheName).then((cache) => {
        return cache
          .match(ev.request)
          .then((cacheMatch) => {
            if (cacheMatch) return cacheMatch;
          })
          .catch((err) => {
            return createEmptyResponse();
          });
      });
    });
}

function createEmptyResponse() {
  const headers = new Headers();
  headers.append("Content-Type", "application/json");

  let json = JSON.stringify({});
  let file = new File([json], "data.json", { type: "application/json" });
  return new Response(file, { status: 200, statusText: "Ok", headers });
}
