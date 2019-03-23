const mc = require('minecraft-protocol');
const users = require('./users.json');
const startWebServer = require('./webserver.js');
const states = mc.states;

console.log('Starting...');

function printHelpAndExit(exitCode) {
  console.log('usage: node proxy.js <target_srv> <version>');

  process.exit(exitCode);
}

if (process.argv.length < 4) {
  console.log('Too few arguments!');
  printHelpAndExit(1);
}

process.argv.forEach(function (val) {
  if (val === '-h') {
    printHelpAndExit(0);
  }
});

const args = process.argv.slice(2);
let [host, version] = args;
let port = 25565;
let afker;



if (host.indexOf(':') !== -1) {
  port = host.substring(host.indexOf(':') + 1);
  host = host.substring(0, host.indexOf(':'));
}

function runCommand(command, client, targetClient) {
  console.log(command);
  client.write('title', {
    action: 2,
    text: JSON.stringify([
      {
        'text': 'Command proccecced: ',
        'bold': true, 'color': 'gold'
      },
      {
        'text': command,
        'bold': true,
        'color': 'red'
      },
    ]),
    position: 2
  });
  switch (command) {
    case '!afk':
      if (afker) {
        client.write("chat", {
          message: JSON.stringify({
            'text': 'Somebody is already AFK. Sorry.',
            'bold': true,
            'color': 'red'
          }),
          position: 0
        });
        return;
      }
      targetClient.on('keep_alive', (packet) => {
        targetClient.write('keep_alive', packet);
      });

      client.end('You have started to AFK. Check progress at localhost:3000');
      if (!afker) startWebServer(targetClient);
      afker = true;
      targetClient.afkMode = true;
      client.afkMode = true;
      break;
    case '!leave':
      console.log('leave');
      break;
    case '!exec':
      eval(command.substr(6));
      break;
    case '!test':
      console.log(startWebServer);
      break;
  }
}




const srv = mc.createServer({
  'online-mode': false,
  port: 25566,
  keepAlive: false,
  version: version
});

srv.on('login', function (client) {
  const addr = client.socket.remoteAddress;
  console.log('Incoming connection', '(' + addr + ')');
  let endedClient = false;
  let endedTargetClient = false;
  client.on('end', function () {
    endedClient = true;
    console.log('Connection closed by client', '(' + addr + ')');
    if (!endedTargetClient && !client.afkMode) { targetClient.end('End'); }
  });
  client.on('error', function (err) {
    endedClient = true;
    console.log('Connection error by client', '(' + addr + ')');
    console.log(err.stack);
    if (!endedTargetClient) { targetClient.end('Error'); }
  });
  const targetClient = mc.createClient({
    host: host,
    port: port,
    username: users[client.username].username,
    password: users[client.username].password,
    keepAlive: false,
    version: version
  });
  client.on('packet', function (data, meta) {
    if (meta.name === 'chat' && data.message[0] === '!') {
      runCommand(data.message, client, targetClient);
      return;
    }
    if (targetClient.state === states.PLAY && meta.state === states.PLAY) {
      if (!endedTargetClient) { targetClient.write(meta.name, data); }
    }
  });
  targetClient.on('packet', function (data, meta) {
    if (meta.state === states.PLAY && client.state === states.PLAY) {
      if (!endedClient && !client.afkMode) {
        client.write(meta.name, data);
        if (meta.name === 'set_compression') {
          client.compressionThreshold = data.threshold;
        } // Set compression
      }
    }
  });
  const bufferEqual = require('buffer-equal');
  targetClient.on('raw', function (buffer, meta) {
    if (client.state !== states.PLAY || meta.state !== states.PLAY) { return; }
    const packetData = targetClient.deserializer.parsePacketBuffer(buffer).data.params;
    const packetBuff = client.serializer.createPacketBuffer({ name: meta.name, params: packetData });
    if (!bufferEqual(buffer, packetBuff)) {
      console.log('client<-server: Error in packet ' + meta.state + '.' + meta.name);
      console.log('received buffer', buffer.toString('hex'));
      console.log('produced buffer', packetBuff.toString('hex'));
      console.log('received length', buffer.length);
      console.log('produced length', packetBuff.length);
    }
    /* if (client.state === states.PLAY && brokenPackets.indexOf(packetId.value) !=== -1)
     {
     console.log(`client<-server: raw packet);
     console.log(packetData);
     if (!endedClient)
     client.writeRaw(buffer);
     } */
  });
  client.on('raw', function (buffer, meta) {
    if (meta.state !== states.PLAY || targetClient.state !== states.PLAY) { return; }
    const packetData = client.deserializer.parsePacketBuffer(buffer).data.params;
    const packetBuff = targetClient.serializer.createPacketBuffer({ name: meta.name, params: packetData });
    if (!bufferEqual(buffer, packetBuff)) {
      console.log('client->server: Error in packet ' + meta.state + '.' + meta.name);
      console.log('received buffer', buffer.toString('hex'));
      console.log('produced buffer', packetBuff.toString('hex'));
      console.log('received length', buffer.length);
      console.log('produced length', packetBuff.length);
    }
  });
  targetClient.on('end', function () {
    endedTargetClient = true;
    console.log('Connection closed by server', '(' + addr + ')');
    if (!endedClient) { client.end('Server Ended Connection'); }
  });
  targetClient.on('error', function (err) {
    endedTargetClient = true;
    console.log('Connection error by server', '(' + addr + ') ', err);
    console.log(err.stack);
    if (!endedClient) { client.end('Error'); }
  });
});