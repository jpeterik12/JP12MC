const out = document.getElementById("messagesDiv")
const skinRender = new SkinRender({
  controls: {
    enabled: false, // Toggle controls
    zoom: false, // Toggle zooming
    rotate: false, // Toggle rotation
    pan: false // Toggle panning
  },
}, document.getElementById("skin"));

$(function() {
  var socket = io();
  $('form')
    .submit(function(e) {
      e.preventDefault(); // prevents page reloading
      socket.emit('input', $('#m')
        .val());
      $('#m')
        .val('');
      return false;
    });
  socket.on('chat out', function(msg) {
    const isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 5

    $('#messages')
      .append($('<div>')
        .text(msg));

    if (isScrolledToBottom) {
      out.scrollTop = out.scrollHeight - out.clientHeight
    }
  });
  socket.on('health', function(health_update) {
    $('#health')
      .html('Health: ' + health_update.health + ', Food: ' + health_update.food)
  });
  socket.on('coords', function(coords) {
    $('#coords')
      .html('XYZ: ' + Math.floor(coords.x) + ' / ' + Math.floor(coords.y) + ' / ' + Math.floor(coords.z))
  });
  socket.on('username', function(username) {
    skinRender.render(username);
  });
  socket.on('serverping', function(ping) {
    $('#ping')
      .html('Ping: ' + ping.ping + 'ms \n TPS: ' + ping.tps)
  });
  socket.on('err', function(error) {
    const isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 5

    $('#messages')
      .append($('<div>')
        .text(error)
        .addClass('error'));

    if (isScrolledToBottom) {
      out.scrollTop = out.scrollHeight - out.clientHeight
    }
  }); 
  socket.on('info', function(info) {
    const isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 5

    $('#messages')
      .append($('<div>')
        .text(info)
        .addClass('info'));

    if (isScrolledToBottom) {
      out.scrollTop = out.scrollHeight - out.clientHeight
    }
  });
  socket.on('feedback', function(feedback) {
    const isScrolledToBottom = out.scrollHeight - out.clientHeight <= out.scrollTop + 5

    $('#messages')
      .append($('<div>')
        .text(feedback)
        .addClass('feedback'));

    if (isScrolledToBottom) {
      out.scrollTop = out.scrollHeight - out.clientHeight
    }
  }); 
});