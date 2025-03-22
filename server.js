const express = require('express');
const socketIO = require('socket.io');
const http = require('http');

const { socketHandler } = require('./modules/socket-handler');

const app = express();


// set the view engine to ejs
app.set('view engine', 'ejs');

// index page
app.get('/', function(req, res) {
  res.render('pages/index');
});

app.use('/public', express.static('public'))

//socket io
let server = http.createServer(app)
let io = socketIO(server);

server.listen(8080);
console.log('Server is listening on port 8080');

//socket events handler
socketHandler(io);