const version = 1;
const cacheName = `some unique name for your cache.${version}`; //TODO: update your cache name
let isOnline = true;
const cacheItems = [
  //css
  //TODO: add the css, fonts, html, and js links to the cache array
  //fonts

  //html
  '/',
  './index.html',
  //js
  //all images and fetched json are to be dynamically be added to this array
];

self.addEventListener('install', (ev) => {
  //when installing the service worker install the new items
  ev
    .waitUntil
    //TODO: add all the items in cacheItems to your cache
    ();
});

self.addEventListener('activate', (ev) => {
  //when the service worker is activated delete the old cache
  ev
    .waitUntil
    //TODO: delete all caches that do not match the current cacheName
    ();
});

self.addEventListener('fetch', (ev) => {
  //every HTTP request from the web pages that use the service worker
  ev.respondWith();
  //TODO:
  //For html, css, fonts, js, and images check the cache first and return that
  //if not in the cache then do a fetch call to retrieve it
  //after a successful fetch, clone the response and put( ) it into the cache before returning the response.
  //use NetworkError when fetches fail.
  //For JSON requests attempt the fetch first. Then update the cache with the latest copy and return the response.
  //Check if the navigator is online for the JSON fetch. If offline then return the cached JSON.
});

self.addEventListener('message', (ev) => {
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
    this.type = 'NetworkError';
    this.response = response;
    this.message = msg;
  }
}
