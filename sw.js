const version = 1;
const cacheName = `ulut0002-service-worker.${version}`;
let isOnline = true;

const cacheItems = [
  //css
  //TODO: add the css, fonts, html, and js links to the cache array
  //fonts

  //html
  "/",
  "./index.html",
  "./css/main.css",
  "./js/app.js",
  //all images and fetched json are to be dynamically be added to this array
];

self.addEventListener("install", (ev) => {
  ev.waitUntil(
    caches.open(cacheName).then((cache) => cache.addAll(cacheItems))
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
  let isImage =
    urlPath.includes(".png") ||
    urlPath.includes(".jpg") ||
    urlPath.includes(".svg") ||
    urlPath.includes(".gif") ||
    urlPath.includes(".webp") ||
    urlPath.includes(".jpeg") ||
    url.hostname.includes("picsum.photos"); //check file extension or location

  let isFont = urlPath.includes(".woff2");
  let isCSS = urlPath.includes(".css");

  let selfLocation = new URL(self.location);
  //determine if the requested file is from the same origin as your website
  let isRemote = selfLocation.origin !== url.origin;

  const inCacheList = cacheItems.indexOf(ev.request.url) >= 0;
  let forceCacheCheck = false;
  if (isFont || isCSS || isImage || inCacheList) {
    forceCacheCheck = true;
  }

  if (isOnline) {
    if (forceCacheCheck) {
      ev.respondWith(cacheFirst(ev));
    } else {
      ev.respondWith(networkOnly(ev));
    }
  } else {
    // not online
  }

  return;

  if (isOnline) {
    if (isRemote) {
      if (forceCacheCheck) {
        if (isFont) {
          console.log("font is here");
        }
        return ev.respondWith(staleWhileRevalidate(ev));
      } else {
        return ev.respondWith(networkFirst(ev));
      }
    } else {
      if (isFont) {
        console.log("font is here2");
      }
      if (forceCacheCheck) {
        return ev.respondWith(cacheFirst(ev));
      } else {
        return ev.respondWith(staleWhileRevalidate(ev));
      }
    }
  } else {
  }

  //TODO:
  //For html, css, fonts, js, and images check the cache first and return that
  //if not in the cache then do a fetch call to retrieve it
  //after a successful fetch, clone the response and put( ) it into the cache before returning the response.
  //use NetworkError when fetches fail.
  //For JSON requests attempt the fetch first. Then update the cache with the latest copy and return the response.
  //Check if the navigator is online for the JSON fetch. If offline then return the cached JSON.
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
  return caches.match(ev.request).then((cacheResponse) => {
    return cacheResponse || fetch(ev.request);
  });
}

function cacheOnly(ev) {
  //only the response from the cache
  return caches.match(ev.request);
}

function networkFirst(ev) {
  //try fetch then cache
  return fetch(ev.request).then((response) => {
    if (!response.ok) return caches.match(ev.request);
    return response;
  });
}

function networkOnly(ev) {
  //only the result of a fetch
  return fetch(ev.request);
}

// This returns the cached version first, and then do another fetch to get the latest data.
function staleWhileRevalidate(ev) {
  //return cache then fetch and save latest fetch
  return caches.match(ev.request).then((cacheResponse) => {
    let fetchResponse = fetch(ev.request).then((response) => {
      caches.open(cacheName).then((cache) => {
        cache.put(ev.request, response.clone());
        return response;
      });
    });
    return cacheResponse || fetchResult;
  });
}

function networkFirstAndRevalidate(ev) {
  //attempt fetch and cache result too
  return fetch(ev.request).then((response) => {
    if (!response.ok) return caches.match(ev.request);
    return response;
  });
}
