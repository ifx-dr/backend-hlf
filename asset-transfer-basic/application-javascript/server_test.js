// create an express app
const express = require("express")
const app = express()
const { setTimeout: setTimeoutPromise } = require('node:timers/promises');
// use the express-static middleware
app.use(express.static("public"))

let ac = new AbortController();
let signal = ac.signal;
var value = 0;
// define the first route
app.get("/", function (req, res) {
  res.send("<h1>Hello World!</h1>")
})

app.get("/setTimer", function (req, res) {
  setTimeoutPromise(100000, ['foobar','123'], { signal })
    .then((input)=>{
      // time out: end proposal/voting
      console.log(`value=${value}`)
    })
    .catch((err) => {
      // lobe owner voted / all members voted, stop timer
      if (err.name === 'AbortError')
        value = 99;
    });

  res.send("<h1>timer set</h1>")
})

app.get("/sendSig", function (req, res) {
  ac.abort();
  res.send("receive signal")
})

app.get("/value", function (req, res) {
  console.log(`value=${value}`)
  res.send(`value=${value}`)
})

// start the server listening for requests
app.listen(process.env.PORT || 3000, 
	() => console.log("Server is running..."));