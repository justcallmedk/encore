const Runner = require ('./runner');

exports.socketHandler = (io) => {
  //process data from api
  const runner = new Runner();

  runner.start(io);
  io.on('connection', (socket)=>{
    socket.on('ping', async (msg) => {
      io.to(socket.id).emit('pong', await runner.test());
    });
  });
};

