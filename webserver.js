/* global afker */

module.exports = function (client) {
  const mcChatFormat = require('mc-chat-format');
  var app = require('express')();
  var http = require('http')
    .Server(app);
  var io = require('socket.io')(http);

  app.use(require('express')
    .static('public'))

  app.get('/', function (req, res) {
    res.sendFile(__dirname + '/index.html');
  });

  http.listen(3000, function () {
    console.log('listening on *:3000');
  });

  io.on('connection', function (socket) {
    socket.emit('username', client.username);
    socket.emit('health', health);
    socket.emit('coords', position);

    socket.on('input', function (msg) {
      if (msg[0] == '!') {
        sendChat(msg);
        command(msg);
        return;
      };
      chat(msg);
    });
  });

  function command(command) {
    switch (command.substr(1).split(' ')[0]) {
      case 'logout':
        client.end();
        afker = false;
        console.log('Server Stopped');
        sendErr('Server Stopped');
        http.close();
        break;
      case 'stop':
        client.end();
        afker = false;
        console.log('Server Stopped');
        sendErr('Server Stopped');
        http.close();
        process.exit();
        break;
      case 'exec':
        eval(command.substr(6));
        break;
      case 'respawn':
        client.write('client_command', { actionID: 0 });
        break;
    }
  }

  var position = {
    x: 0,
    y: 0,
    z: 0,
    onGround: false,
    pitch: 0,
    yaw: 0,
  };
  var health = {
    health: 0,
    food: 0
  };
  var prevTime = 0;
  var tps;

  function sendChat() {
    let send = false;
    for (let arg of [...arguments])
      if (arg) send = true;
    if (send) io.emit('chat out', [...arguments].join(' '))
  }

  function sendInfo(info) { io.emit('info', info); }

  function sendErr(err) { io.emit('err', err); }

  function sendLog(feedback) { io.emit('feedback', feedback); }

  function chat(msg) {
    client.write('chat', {
      message: msg
    })
  }

  function refreshposition() {
    client.write('position_look', {
      x: position.x,
      y: position.y,
      z: position.z,
      onGround: position.onGround,
      pitch: position.pitch,
      yaw: position.yaw
    });
    io.emit('coords', position);
  }

  setInterval(() => {
    io.emit('serverping', { ping: client.latency, tps: tps })
  }, 5000);



  client.on('chat', function (packet) {
    sendChat(mcChatFormat.format(JSON.parse(packet.message))
      .replace(/§./g, ''));
  });

  client.on('position', function (packet) {
    client.write('teleport_confirm', { teleportId: packet.telportId });
    const flags = (packet.flags).toString(2) + '0000';
    position.x = packet.x + position.x * Number(flags[0]);
    position.y = packet.y + position.y * Number(flags[1]);
    position.z = packet.z + position.z * Number(flags[2]);
    position.onGround = packet.onGround;
    position.pitch = packet.pitch + position.pitch * Number(flags[3]);
    position.yaw = packet.yaw + position.yaw * Number(flags[4]);
    refreshposition();
    sendInfo(["Repositioned to:", packet.x, packet.y, packet.z, packet.onGround, packet.pitch, packet.yaw].join(' '));
  });

  client.on('update_time', function (packet) {
    const currentTime = Date.now();
    tps = Math.round(20 / ((currentTime - prevTime) / 1000))
    prevTime = currentTime
  });

  client.on('update_health', function (packet) {
    io.emit("health", packet)
    health = packet;
    if (packet.health < 5) client.end('Low Health')
  });

  client.on('disconnect', (packet) => {
    sendErr('Disconnected: ' + mcChatFormat.format(JSON.parse(packet.reason))
      .replace(/§./g, ''))
    console.error('Disconnected: ' + mcChatFormat.format(JSON.parse(packet.reason))
      .replace(/§./g, ''))
  });


  client.on('end', () => {
    http.close();
  });
};