const version = 1;
const cacheName = `ulut0002-service-worker.${version}`;
let cacheRef = undefined;
let isOnline = true;

const cacheItems = [
  "/",
  "./index.html",
  "./css/main.css",
  "./js/app.js",
  "./img/favicon.png", // added to dismiss live server error
];

//This function is here because of a failed test during development:
// 1. Run the app
// 2. Delete the cache manually
// getCache() will make sure that a cache exists
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
        // Because of this error:
        // Uncaught (in promise) TypeError: Failed to execute 'addAll' on 'Cache': Request failed
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

  // isJSON = true;

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

// source: https://developer.chrome.com/docs/workbox/caching-strategies-overview/
// The request hits the cache. If the asset is in the cache, serve it from there.
// If the request is not in the cache, go to the network.
// Once the network request finishes, add it to the cache, then return the response from the network.
function cacheFirst(ev) {
  let cacheResult, fetchResult;

  // if cache returns nothing, then fetch will be initialized
  let initFetch = false;

  cacheResult = getCache()
    .then((cache) => {
      return cache.match(ev.request);
    })
    .then((result) => {
      if (!result) initFetch = true;
      return result;
    })
    .catch((err) => {
      //return undefined, and make sure "fetch" runs next in line
      initFetch = true;
      return undefined;
    });

  // init fetch only if the cache has failed
  if (initFetch) {
    fetchResult = fetch(ev.request.url).then((response) => {
      if (!response.ok) return undefined;
      return getCache().then((cache) => {
        const clone = response.clone();
        cache.put(ev.request, clone);
        return response;
      });
    });
  }

  return cacheResult || fetchResult || createEmptyResponse();
}

//source: https://developer.chrome.com/docs/workbox/caching-strategies-overview/  "Network first, falling back to cache"
// You go to the network first for a request, and place the response in the cache.
// If you're offline at a later point, you fall back to the latest version of that response in the cache.

function networkFirst(ev) {
  let fetchResult, cacheResult;

  fetchResult = fetch(ev.request.url)
    .then((response) => {
      // if response is not ok, throw an error and seek the response in cache
      if (!response.ok)
        throw new NetworkError(`Fetch to ${ev.request.url} failed`, response);

      //response is good, so save the clone in the cache for the next run
      getCache().then((cache) => {
        const clone = response.clone();
        cache.put(ev.request, clone);
      });

      // return the network response
      return response;
    })
    .catch((err) => {
      // fetch has failed. Check the cache and  test errors in each step
      // if there is an error condition, return an empty response
      // if a value is found in cache, return the found value

      cacheResult = getCache()
        .then((cache) => {
          if (!cache) return createEmptyResponse();
          return cache.match(ev.request);
        })
        .then((result) => {
          return result;
        })
        .catch((err) => {
          return createEmptyResponse();
        });
    });

  return fetchResult || cacheResult;
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

// source: chatGPT
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
