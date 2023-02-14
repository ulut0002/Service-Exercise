const APP = {
  isOnline: 'onLine' in navigator && navigator.onLine,
  init() {
    APP.registerWorker();
    APP.addListeners();
    APP.getTopScores();
  },
  addListeners() {
    //TODO: display a CURRENTLY OFFLINE message in the header span if the page is loaded offline
    //TODO: listen for the online and offline events and update the message in the header span
  },
  getTopScores() {
    let url = 'https://jsonplaceholder.typicode.com/users';
    fetch(url, {
      method: 'get',
      headers: { accept: 'application/json,text/json' },
    })
      .then((resp) => {
        if (!resp.ok) throw new Error(resp.statusText);
        return resp.json();
      })
      .then((users) => {
        //add scores to each person
        let scores = users
          .map((user) => {
            let score = Math.floor(Math.random() * 100000) + 100000;
            //only keep the name and id properties plus a random high score
            return { name: user.name, id: user.id, score };
          })
          .sort((a, b) => {
            return a.score - b.score;
          });

        const list = document.getElementById('scorelist');
        //TODO: build the list items inside scorelist with name and score plus a data- prop for the id
      })
      .catch(APP.handleError);
  },
  registerWorker() {
    //TODO: check if serviceworkers are supported
    //TODO: register the sw.js file
  },
  handleError(err) {
    //TODO: output fetch errors to the page somewhere
    console.warn(err.message);
  },
};

document.addEventListener('DOMContentLoaded', APP.init);
