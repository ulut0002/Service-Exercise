const version = 1;
const cacheName = `ulut0002-service-worker.${version}`;
let cacheRef = undefined;
let isOnline = true;

const cacheItems = ["/", "./index.html", "./css/main.css", "./js/app.js"];

//This function is here because of a failed test:
// 1. Run the app
// 2. Delete the cache manually
// getCache() will make sure that we create cache each time we call it
// so that cacheRef will never be undefined
async function getCache() {
  if (cacheRef && caches.has(cacheName)) return cacheRef;

  return caches.open(cacheName).then((cache) => {
    cacheRef = cache;
    return cache;
  });
}

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    getCache()
      .then((cache) => {
        return cache.addAll(cacheItems);
      })
      .then((added) => {
        // for this error: Uncaught (in promise) TypeError: Failed to execute 'addAll' on 'Cache': Request failed
        //do nothing
      })
      .catch((err) => {
        //do nothing
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

  //Anything else is JSON
  let isJSON = !(isFont || isCSS || isImage || inCacheList);

  let selfLocation = new URL(self.location);
  //determine if the requested file is from the same origin as your website
  let isRemote = selfLocation.origin !== url.origin;

  isJSON = true;

  if (isOnline) {
    if (isJSON) {
      ev.respondWith(networkFirst(ev));
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

// source: https://developer.chrome.com/docs/workbox/caching-strategies-overview/
// The request hits the cache. If the asset is in the cache, serve it from there.
// If the request is not in the cache, go to the network.
// Once the network request finishes, add it to the cache, then return the response from the network.
function cacheFirst(ev) {
  let cacheResponse = getCache()
    .then((cache) => {
      return cache.match(ev.request);
    })
    .then((result) => {
      if (result) {
        return result;
      }
      //the request is not in the cache
      // so fetch it, and record it in cache, and return it
      return fetch(ev.request.url).then((response) => {
        if (!response.ok) return createEmptyResponse();
        return getCache().then((cache) => {
          return cache.put(ev.request, response.clone());
        });
      });
    })
    .catch((err) => {
      return createEmptyResponse();
    });
}

//source: https://developer.chrome.com/docs/workbox/caching-strategies-overview/  "Network first, falling back to cache"
// You go to the network first for a request, and place the response in the cache.
// If you're offline at a later point, you fall back to the latest version of that response in the cache.

function networkFirst(ev) {
  // console.log("here");
  return fetch(ev.request.url).then((response) => {
    if (!response.ok) {
      //if fetch response is not good, return the cached version
      return getCache()
        .then((cache) => {
          if (!cache) return createEmptyResponse();
          return cache.match(ev);
        })
        .then((response) => {
          if (!response) return createEmptyResponse();
          return response;
        })
        .catch((err) => {
          return createEmptyResponse();
        });
    }
    // response is ok. Put the cloned version in cache and return it.
    const cloneVersion = response.clone();
    getCache()
      .then((cache) => {
        // console.log("right");
        return cache.put(ev.request, cloneVersion);
      })
      .catch((err) => {
        return createEmptyResponse();
      });
    return response;
  });
}

function networkOnly(ev) {
  return fetch(ev.request);
}

function cacheOnly(ev) {
  return getCache().then((cache) => {
    if (!cache) return createEmptyResponse();
    return cache.match(ev.request);
  });
}

//source: chatGPT
// question: in Vanilla JS, how can create a response object that has json data, that contains an empty array?
function createEmptyResponse() {
  const response = {
    statusCode: 200,
    headers: {
      "content-type": "application/json",
    },
    body: JSON.stringify([]),
  };
  return response;
}
