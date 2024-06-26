const APP = {
  isOnline() {
    return "onLine" in navigator && navigator.onLine;
  },
  dom: {
    offlineEl: undefined,
    noticeContainerEl: undefined,
  },
  init() {
    APP.readDOM();
    APP.registerWorker();
    APP.addListeners();
    APP.getTopScores();
  },
  readDOM() {
    APP.dom.offlineEl = document.querySelector("h1 .offline");
    APP.dom.noticeContainerEl = document.getElementById("notice_container");
    // APP.handleError(new Error("Fetch has failed. Try again"));
  },
  addListeners() {
    //listen for the online and offline events and update the message in the header span
    addEventListener("offline", APP.updateOnlineStatus);
    addEventListener("online", APP.updateOnlineStatus);

    // display a CURRENTLY OFFLINE message in the header span if the page is loaded offline

    APP.updateOnlineStatus();
  },
  getTopScores() {
    let url = "https://jsonplaceholder.typicode.com/users";
    // url = "https://jsonplaceholder.typicode.com/userss";
    fetch(url, {
      method: "get",
      headers: { accept: "application/json,text/json" },
    })
      .then((resp) => {
        if (!resp.ok) {
          throw new Error(`Failed to fetch users..`);
        }
        return resp.json();
      })
      .then((users) => {
        //add scores to each person

        if (!Array.isArray(users)) throw new Error("Failed to fetch users..");

        let scores = users
          .map((user) => {
            let score = Math.floor(Math.random() * 100000) + 100000;
            //only keep the name and id properties plus a random high score
            return { name: user.name, id: user.id, score };
          })
          .sort((a, b) => {
            return a.score - b.score;
          });

        const list = document.getElementById("scorelist");

        //build the list items inside scorelist with name and score plus a data- prop for the id
        if (list) {
          list.innerHTML = scores
            .map((score) => {
              return `<li data-id="${score.id}">${score.name} : ${score.score} </li>`;
            })
            .join(" ");
        }
      })
      .catch(APP.handleError);
  },
  registerWorker() {
    if (navigator.serviceWorker) {
      navigator.serviceWorker.register("./sw.js");
    }
  },
  handleError(err) {
    //output fetch errors to the page somewhere
    // console.log("error caught", err.message);
    if (APP.dom.noticeContainerEl) {
      divEL = document.createElement("div");
      divEL.classList.add("notice");
      if (typeof err.text === "function") {
        err.text().then((errorMessage) => {
          divEL.innerHTML = errorMessage;
        });
      } else {
        divEL.innerHTML = err.message;
      }

      APP.dom.noticeContainerEl.insertAdjacentElement("beforeend", divEL);
    }
    // console.warn(err.message);
  },
  updateOnlineStatus() {
    if (APP.dom.offlineEl) {
      APP.dom.offlineEl.textContent = APP.isOnline() ? "" : "Offline";
    }
  },
  onMessage({ data }) {},
  sendMessage(msg) {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage(msg);
    }
  },
};

document.addEventListener("DOMContentLoaded", APP.init);
